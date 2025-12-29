create
    definer = fixture_test@`%` procedure sp_material_receipt(IN p_customer_id varchar(50), IN p_fixture_id varchar(50),
                                                             IN p_order_no varchar(100), IN p_source_type varchar(30),
                                                             IN p_operator varchar(100), IN p_note text,
                                                             IN p_created_by int, IN p_record_type varchar(30),
                                                             IN p_datecode varchar(50), IN p_serials_csv text,
                                                             OUT p_transaction_id int, OUT p_message varchar(500))
proc_end: BEGIN
    DECLARE v_qty INT DEFAULT 0;

    /* -------------------------------
       SQL 異常處理（只處理真的 SQL 壞掉）
    -------------------------------- */
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            SET p_transaction_id = NULL;
            SET p_message = '收料失敗 (資料庫異常)';
        END;

    /* -------------------------------
       預設為失敗
    -------------------------------- */
    SET p_transaction_id = NULL;
    SET p_message = '';

    /* -------------------------------
       基本檢查
    -------------------------------- */
    IF p_record_type NOT IN ('batch', 'individual', 'datecode') THEN
        SET p_message = 'record_type 不合法';
        LEAVE proc_end;
    END IF;

    START TRANSACTION;

    /* -------------------------------
       計算數量
    -------------------------------- */
    IF p_record_type = 'datecode' THEN
        SET v_qty = CAST(p_serials_csv AS UNSIGNED);
    ELSE
        SET v_qty =
                LENGTH(p_serials_csv)
                    - LENGTH(REPLACE(p_serials_csv, ',', ''))
                    + 1;
    END IF;

    IF v_qty <= 0 THEN
        ROLLBACK;
        SET p_message = '數量必須大於 0';
        LEAVE proc_end;
    END IF;

    /* -------------------------------
       建立交易主檔
    -------------------------------- */
    INSERT INTO material_transactions (
        transaction_type,
        record_type,
        transaction_date,
        customer_id,
        order_no,
        fixture_id,
        source_type,
        datecode,
        quantity,
        operator,
        note,
        created_by
    ) VALUES (
                 'receipt',
                 p_record_type,
                 CURRENT_DATE,
                 p_customer_id,
                 p_order_no,
                 p_fixture_id,
                 p_source_type,
                 p_datecode,
                 v_qty,
                 p_operator,
                 p_note,
                 p_created_by
             );

    SET p_transaction_id = LAST_INSERT_ID();

    /* -------------------------------
       分流處理
    -------------------------------- */
    IF p_record_type = 'datecode' THEN

        INSERT INTO fixture_datecode_inventory (
            customer_id,
            fixture_id,
            datecode,
            available_qty
        ) VALUES (
                     p_customer_id,
                     p_fixture_id,
                     p_datecode,
                     v_qty
                 )
        ON DUPLICATE KEY UPDATE
            available_qty = available_qty + v_qty;

        INSERT INTO fixture_datecode_transactions (
            transaction_id,
            customer_id,
            fixture_id,
            datecode,
            transaction_type,
            quantity
        ) VALUES (
                     p_transaction_id,
                     p_customer_id,
                     p_fixture_id,
                     p_datecode,
                     'receipt',
                     v_qty
                 );

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

END proc_end;



create
    definer = fixture_test@`%` procedure sp_material_return(IN p_customer_id varchar(50), IN p_fixture_id varchar(50),
                                                            IN p_order_no varchar(100), IN p_operator varchar(100),
                                                            IN p_note text, IN p_created_by int,
                                                            IN p_record_type varchar(30), IN p_datecode varchar(50),
                                                            IN p_serials_csv text, OUT p_transaction_id int,
                                                            OUT p_message varchar(500))
proc_end: BEGIN
    DECLARE v_qty INT DEFAULT 0;
    DECLARE v_available INT DEFAULT 0;

    /* -------------------------------
       SQL 異常（只處理真正 DB 錯）
    -------------------------------- */
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            SET p_transaction_id = NULL;
            SET p_message = '退料失敗 (資料庫異常)';
        END;

    /* -------------------------------
       預設失敗
    -------------------------------- */
    SET p_transaction_id = NULL;
    SET p_message = '';

    /* -------------------------------
       基本檢查
    -------------------------------- */
    IF p_record_type NOT IN ('batch', 'individual', 'datecode') THEN
        SET p_message = 'record_type 不合法';
        LEAVE proc_end;
    END IF;

    START TRANSACTION;

    /* -------------------------------
       計算數量
    -------------------------------- */
    IF p_record_type = 'datecode' THEN
        SET v_qty = CAST(p_serials_csv AS UNSIGNED);
    ELSE
        SET v_qty =
                LENGTH(p_serials_csv)
                    - LENGTH(REPLACE(p_serials_csv, ',', ''))
                    + 1;
    END IF;

    IF v_qty <= 0 THEN
        ROLLBACK;
        SET p_message = '數量必須大於 0';
        LEAVE proc_end;
    END IF;

    /* -------------------------------
       建立交易主檔
    -------------------------------- */
    INSERT INTO material_transactions (
        transaction_type,
        record_type,
        transaction_date,
        customer_id,
        order_no,
        fixture_id,
        datecode,
        quantity,
        operator,
        note,
        created_by
    ) VALUES (
                 'return',
                 p_record_type,
                 CURRENT_DATE,
                 p_customer_id,
                 p_order_no,
                 p_fixture_id,
                 p_datecode,
                 v_qty,
                 p_operator,
                 p_note,
                 p_created_by
             );

    SET p_transaction_id = LAST_INSERT_ID();

    /* -------------------------------
       分流處理
    -------------------------------- */
    IF p_record_type = 'datecode' THEN

        SELECT available_qty
        INTO v_available
        FROM fixture_datecode_inventory
        WHERE customer_id = p_customer_id
          AND fixture_id = p_fixture_id
          AND datecode = p_datecode
            FOR UPDATE;

        IF v_available IS NULL OR v_available < v_qty THEN
            ROLLBACK;
            SET p_transaction_id = NULL;
            SET p_message = '日期碼庫存不足';
            LEAVE proc_end;
        END IF;

        UPDATE fixture_datecode_inventory
        SET available_qty = available_qty - v_qty,
            returned_qty  = returned_qty  + v_qty
        WHERE customer_id = p_customer_id
          AND fixture_id = p_fixture_id
          AND datecode = p_datecode;

        INSERT INTO fixture_datecode_transactions (
            transaction_id,
            customer_id,
            fixture_id,
            datecode,
            transaction_type,
            quantity
        ) VALUES (
                     p_transaction_id,
                     p_customer_id,
                     p_fixture_id,
                     p_datecode,
                     'return',
                     v_qty
                 );

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

END proc_end;


DROP PROCEDURE IF EXISTS sp_insert_fixture_serials;
CREATE
    DEFINER = fixture_test@`%`
PROCEDURE sp_return_fixture_serials(
    IN p_customer_id varchar(50),
    IN p_fixture_id varchar(50),
    IN p_serials_csv text,
    IN p_transaction_id int
)
proc_end: BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;

    IF p_serials_csv IS NULL OR p_serials_csv = '' THEN
        LEAVE proc_end;
    END IF;

    WHILE LENGTH(p_serials_csv) > 0 DO
        SET v_pos = LOCATE(',', p_serials_csv);

        IF v_pos = 0 THEN
            SET v_serial = TRIM(p_serials_csv);
            SET p_serials_csv = '';
        ELSE
            SET v_serial = TRIM(SUBSTRING(p_serials_csv, 1, v_pos - 1));
            SET p_serials_csv = SUBSTRING(p_serials_csv, v_pos + 1);
        END IF;

        IF v_serial <> '' THEN
            -- ① 更新序號狀態
            UPDATE fixture_serials
            SET status = 'returned',
                return_date = CURRENT_DATE,
                return_transaction_id = p_transaction_id
            WHERE customer_id = p_customer_id
              AND fixture_id  = p_fixture_id
              AND serial_number = v_serial
              AND status = 'available';

            -- ⭐ ② 寫入交易明細（退料也要有紀錄）
            INSERT INTO material_transaction_details (
                transaction_id,
                serial_number
            ) VALUES (
                p_transaction_id,
                v_serial
            );
        END IF;
    END WHILE;
END;



DROP PROCEDURE IF EXISTS sp_return_fixture_serials;
CREATE
    DEFINER = fixture_test@`%`
    PROCEDURE sp_return_fixture_serials(
    IN p_customer_id varchar(50),
    IN p_fixture_id varchar(50),
    IN p_serials_csv text,
    IN p_transaction_id int
)
proc_end: BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;

    IF p_serials_csv IS NULL OR p_serials_csv = '' THEN
        LEAVE proc_end;
    END IF;

    WHILE LENGTH(p_serials_csv) > 0 DO
            SET v_pos = LOCATE(',', p_serials_csv);

            IF v_pos = 0 THEN
                SET v_serial = TRIM(p_serials_csv);
                SET p_serials_csv = '';
            ELSE
                SET v_serial = TRIM(SUBSTRING(p_serials_csv, 1, v_pos - 1));
                SET p_serials_csv = SUBSTRING(p_serials_csv, v_pos + 1);
            END IF;

            IF v_serial <> '' THEN
                -- ① 更新序號狀態（只允許 available → returned）
                UPDATE fixture_serials
                SET status = 'returned',
                    return_date = CURRENT_DATE,
                    return_transaction_id = p_transaction_id
                WHERE customer_id = p_customer_id
                  AND fixture_id  = p_fixture_id
                  AND serial_number = v_serial
                  AND status = 'available';

                -- ② ⭐ 關鍵：寫入交易明細（退料也要留下紀錄）
                INSERT INTO material_transaction_details (
                    transaction_id,
                    serial_number
                ) VALUES (
                             p_transaction_id,
                             v_serial
                         );
            END IF;
        END WHILE;
END;



create
    definer = fixture_test@`%` procedure sp_create_daily_snapshot(IN p_snapshot_date date, IN p_customer_id varchar(50))
BEGIN
    /*
      v4.x 定義：
      - available_qty   = serial available
      - total_qty       = serial + datecode available
    */

    IF p_customer_id IS NULL THEN

        INSERT INTO inventory_snapshots (
            customer_id,
            fixture_id,
            snapshot_date,

            available_qty,
            deployed_qty,
            maintenance_qty,
            scrapped_qty,
            returned_qty,
            total_qty
        )
        SELECT
            f.customer_id,
            f.id,
            p_snapshot_date,

            /* serial available */
            f.available_qty,

            /* 其他狀態仍只存在於 serial 世界 */
            f.deployed_qty,
            f.maintenance_qty,
            f.scrapped_qty,
            f.returned_qty,

            /* total available = serial + datecode */
            f.available_qty + IFNULL(dc.datecode_available_qty, 0)
                AS total_qty

        FROM fixtures f
                 LEFT JOIN (
            SELECT
                fixture_id,
                SUM(available_qty) AS datecode_available_qty
            FROM fixture_datecode_inventory
            GROUP BY fixture_id
        ) dc
                           ON dc.fixture_id = f.id

        ON DUPLICATE KEY UPDATE
                             available_qty   = VALUES(available_qty),
                             deployed_qty    = VALUES(deployed_qty),
                             maintenance_qty = VALUES(maintenance_qty),
                             scrapped_qty    = VALUES(scrapped_qty),
                             returned_qty    = VALUES(returned_qty),
                             total_qty       = VALUES(total_qty);

    ELSE

        INSERT INTO inventory_snapshots (
            customer_id,
            fixture_id,
            snapshot_date,

            available_qty,
            deployed_qty,
            maintenance_qty,
            scrapped_qty,
            returned_qty,
            total_qty
        )
        SELECT
            f.customer_id,
            f.id,
            p_snapshot_date,

            f.available_qty,
            f.deployed_qty,
            f.maintenance_qty,
            f.scrapped_qty,
            f.returned_qty,

            f.available_qty + IFNULL(dc.datecode_available_qty, 0)
                AS total_qty

        FROM fixtures f
                 LEFT JOIN (
            SELECT
                fixture_id,
                SUM(available_qty) AS datecode_available_qty
            FROM fixture_datecode_inventory
            GROUP BY fixture_id
        ) dc
                           ON dc.fixture_id = f.id
        WHERE f.customer_id = p_customer_id

        ON DUPLICATE KEY UPDATE
                             available_qty   = VALUES(available_qty),
                             deployed_qty    = VALUES(deployed_qty),
                             maintenance_qty = VALUES(maintenance_qty),
                             scrapped_qty    = VALUES(scrapped_qty),
                             returned_qty    = VALUES(returned_qty),
                             total_qty       = VALUES(total_qty);

    END IF;
END;

