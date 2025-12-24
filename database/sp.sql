
-- Stored Procedure: sp_material_receipt
DROP PROCEDURE IF EXISTS sp_material_receipt
CREATE PROCEDURE sp_material_receipt(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_order_no VARCHAR(100),
    IN p_source_type VARCHAR(30),
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_created_by INT,
    IN p_record_type VARCHAR(30),   -- batch / individual / datecode
    IN p_datecode VARCHAR(50),
    IN p_serials_csv TEXT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(500)
)
BEGIN
    DECLARE v_qty INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = '收料失敗 (SQL 異常)';
    END;

    START TRANSACTION;

    -- 計算數量
    IF p_record_type = 'datecode' THEN
        SET v_qty = CAST(p_serials_csv AS UNSIGNED);
    ELSE
        SET v_qty = LENGTH(p_serials_csv) - LENGTH(REPLACE(p_serials_csv, ',', '')) + 1;
    END IF;

    IF v_qty <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '數量必須大於 0';
    END IF;

    -- 建立交易主檔
    INSERT INTO material_transactions (
        transaction_type, record_type, transaction_date,
        customer_id, order_no, fixture_id,
        source_type, datecode, quantity,
        operator, note, created_by
    ) VALUES (
        'receipt', p_record_type, CURRENT_DATE,
        p_customer_id, p_order_no, p_fixture_id,
        p_source_type, p_datecode, v_qty,
        p_operator, p_note, p_created_by
    );

    SET p_transaction_id = LAST_INSERT_ID();

    -- 分流處理
    IF p_record_type = 'datecode' THEN

        INSERT INTO fixture_datecode_inventory
            (customer_id, fixture_id, datecode, available_qty)
        VALUES
            (p_customer_id, p_fixture_id, p_datecode, v_qty)
        ON DUPLICATE KEY UPDATE
            available_qty = available_qty + v_qty;

        INSERT INTO fixture_datecode_transactions
            (transaction_id, customer_id, fixture_id, datecode, transaction_type, quantity)
        VALUES
            (p_transaction_id, p_customer_id, p_fixture_id, p_datecode, 'receipt', v_qty);

    ELSE
        CALL sp_insert_fixture_serials(
            p_customer_id,
            p_fixture_id,
            p_serials_csv,
            p_source_type,
            p_transaction_id
        );
    END IF;

    COMMIT;
    SET p_message = 'OK';
END;

-- Stored Procedure: sp_material_return
DROP PROCEDURE IF EXISTS sp_material_return
CREATE PROCEDURE sp_material_return(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_order_no VARCHAR(100),
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_created_by INT,
    IN p_record_type VARCHAR(30),
    IN p_datecode VARCHAR(50),
    IN p_serials_csv TEXT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(500)
)
BEGIN
    DECLARE v_qty INT DEFAULT 0;
    DECLARE v_available INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = '退料失敗 (SQL 異常)';
    END;

    START TRANSACTION;

    IF p_record_type = 'datecode' THEN
        SET v_qty = CAST(p_serials_csv AS UNSIGNED);
    ELSE
        SET v_qty = LENGTH(p_serials_csv) - LENGTH(REPLACE(p_serials_csv, ',', '')) + 1;
    END IF;

    IF v_qty <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '數量必須大於 0';
    END IF;

    INSERT INTO material_transactions (
        transaction_type, record_type, transaction_date,
        customer_id, order_no, fixture_id,
        datecode, quantity,
        operator, note, created_by
    ) VALUES (
        'return', p_record_type, CURRENT_DATE,
        p_customer_id, p_order_no, p_fixture_id,
        p_datecode, v_qty,
        p_operator, p_note, p_created_by
    );

    SET p_transaction_id = LAST_INSERT_ID();

    IF p_record_type = 'datecode' THEN

        SELECT available_qty
        INTO v_available
        FROM fixture_datecode_inventory
        WHERE customer_id = p_customer_id
          AND fixture_id = p_fixture_id
          AND datecode = p_datecode
        FOR UPDATE;

        IF v_available < v_qty THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '日期碼庫存不足';
        END IF;

        UPDATE fixture_datecode_inventory
        SET available_qty = available_qty - v_qty,
            returned_qty  = returned_qty  + v_qty
        WHERE customer_id = p_customer_id
          AND fixture_id = p_fixture_id
          AND datecode = p_datecode;

        INSERT INTO fixture_datecode_transactions
            (transaction_id, customer_id, fixture_id, datecode, transaction_type, quantity)
        VALUES
            (p_transaction_id, p_customer_id, p_fixture_id, p_datecode, 'return', v_qty);

    ELSE
        CALL sp_return_fixture_serials(
            p_customer_id,
            p_fixture_id,
            p_serials_csv,
            p_transaction_id
        );
    END IF;

    COMMIT;
    SET p_message = 'OK';
END;



-- Stored Procedure: sp_insert_fixture_serials
DROP PROCEDURE IF EXISTS sp_insert_fixture_serials;
CREATE PROCEDURE sp_insert_fixture_serials(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_serials_csv TEXT,
    IN p_source_type VARCHAR(30),
    IN p_transaction_id INT
)
BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;

    WHILE LENGTH(p_serials_csv) > 0 DO
        SET v_pos = LOCATE(',', p_serials_csv);

        IF v_pos = 0 THEN
            SET v_serial = p_serials_csv;
            SET p_serials_csv = '';
        ELSE
            SET v_serial = SUBSTRING(p_serials_csv, 1, v_pos - 1);
            SET p_serials_csv = SUBSTRING(p_serials_csv, v_pos + 1);
        END IF;

        INSERT INTO fixture_serials (
            customer_id, fixture_id, serial_number,
            source_type, status,
            receipt_date, receipt_transaction_id
        ) VALUES (
            p_customer_id, p_fixture_id, v_serial,
            p_source_type, 'available',
            CURRENT_DATE, p_transaction_id
        );
    END WHILE;
END;


-- Stored Procedure: sp_return_fixture_serials
DROP PROCEDURE IF EXISTS sp_return_fixture_serials;

CREATE PROCEDURE sp_return_fixture_serials(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_serials_csv TEXT,
    IN p_transaction_id INT
)
BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;

    WHILE LENGTH(p_serials_csv) > 0 DO
        SET v_pos = LOCATE(',', p_serials_csv);

        IF v_pos = 0 THEN
            SET v_serial = p_serials_csv;
            SET p_serials_csv = '';
        ELSE
            SET v_serial = SUBSTRING(p_serials_csv, 1, v_pos - 1);
            SET p_serials_csv = SUBSTRING(p_serials_csv, v_pos + 1);
        END IF;

        UPDATE fixture_serials
        SET status = 'returned',
            return_date = CURRENT_DATE,
            return_transaction_id = p_transaction_id
        WHERE customer_id = p_customer_id
          AND fixture_id = p_fixture_id
          AND serial_number = v_serial;
    END WHILE;
END;