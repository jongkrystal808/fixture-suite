DELIMITER $$

DROP PROCEDURE IF EXISTS sp_create_daily_snapshot $$

CREATE
    DEFINER = fixture_test@`%`
    PROCEDURE sp_create_daily_snapshot(
        IN p_snapshot_date DATE,
        IN p_customer_id VARCHAR(50)
    )
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
            f.available_qty,
            f.deployed_qty,
            f.maintenance_qty,
            f.scrapped_qty,
            f.returned_qty,
            f.available_qty + IFNULL(dc.datecode_available_qty, 0) AS total_qty
        FROM fixtures f
        LEFT JOIN (
            SELECT
                fixture_id,
                SUM(available_qty) AS datecode_available_qty
            FROM fixture_datecode_inventory
            GROUP BY fixture_id
        ) dc ON dc.fixture_id = f.id
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
            f.available_qty + IFNULL(dc.datecode_available_qty, 0) AS total_qty
        FROM fixtures f
        LEFT JOIN (
            SELECT
                fixture_id,
                SUM(available_qty) AS datecode_available_qty
            FROM fixture_datecode_inventory
            GROUP BY fixture_id
        ) dc ON dc.fixture_id = f.id
        WHERE f.customer_id = p_customer_id
        ON DUPLICATE KEY UPDATE
            available_qty   = VALUES(available_qty),
            deployed_qty    = VALUES(deployed_qty),
            maintenance_qty = VALUES(maintenance_qty),
            scrapped_qty    = VALUES(scrapped_qty),
            returned_qty    = VALUES(returned_qty),
            total_qty       = VALUES(total_qty);

    END IF;
END $$

DELIMITER ;





DELIMITER $$

DROP PROCEDURE IF EXISTS sp_material_receipt_v4 $$

CREATE
    DEFINER = fixture_test@`%`
    PROCEDURE sp_material_receipt_v4(
        IN p_customer_id VARCHAR(50),
        IN p_fixture_id VARCHAR(50),
        IN p_order_no VARCHAR(100),
        IN p_operator VARCHAR(100),
        IN p_note TEXT,
        IN p_created_by INT,
        IN p_record_type ENUM ('batch', 'individual', 'datecode'),
        IN p_source_type ENUM ('self_purchased', 'customer_supplied'),
        IN p_serials_csv TEXT,
        IN p_datecode VARCHAR(50),
        IN p_quantity INT
    )
proc_end:
BEGIN
    DECLARE v_transaction_id INT DEFAULT NULL;
    DECLARE v_quantity INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT
            NULL AS transaction_id,
            '收料失敗（資料庫異常）' AS message;
    END;

    /* ========= 基本驗證 ========= */

    IF p_record_type NOT IN ('batch','individual','datecode') THEN
        SELECT NULL AS transaction_id, 'record_type 不合法' AS message;
        LEAVE proc_end;
    END IF;

    IF p_source_type NOT IN ('self_purchased','customer_supplied') THEN
        SELECT NULL AS transaction_id, 'source_type 不合法' AS message;
        LEAVE proc_end;
    END IF;

    IF p_record_type = 'datecode' THEN
        IF p_datecode IS NULL OR p_datecode = '' THEN
            SELECT NULL AS transaction_id, 'datecode 模式需要 datecode' AS message;
            LEAVE proc_end;
        END IF;

        IF p_quantity IS NULL OR p_quantity <= 0 THEN
            SELECT NULL AS transaction_id, 'datecode 模式需要 quantity > 0' AS message;
            LEAVE proc_end;
        END IF;

        IF p_serials_csv IS NOT NULL AND p_serials_csv <> '' THEN
            SELECT NULL AS transaction_id, 'datecode 模式不可傳入 serials' AS message;
            LEAVE proc_end;
        END IF;

        SET v_quantity = p_quantity;
    ELSE
        IF p_serials_csv IS NULL OR p_serials_csv = '' THEN
            SELECT NULL AS transaction_id, 'serial 模式需要 serials_csv' AS message;
            LEAVE proc_end;
        END IF;

        SET v_quantity = 0;
    END IF;

    START TRANSACTION;

    /* ========= 1️⃣ 建立交易主表 ========= */

    INSERT INTO material_transactions (
        transaction_type,
        record_type,
        quantity,
        transaction_date,
        customer_id,
        order_no,
        fixture_id,
        source_type,
        operator,
        note,
        created_by
    ) VALUES (
        'receipt',
        p_record_type,
        CASE
            WHEN p_record_type = 'datecode' THEN p_quantity
            ELSE (
                LENGTH(p_serials_csv) - LENGTH(REPLACE(p_serials_csv, ',', '')) + 1
            )
        END,
        CURRENT_DATE,
        p_customer_id,
        p_order_no,
        p_fixture_id,
        p_source_type,
        p_operator,
        p_note,
        p_created_by
    );

    SET v_transaction_id = LAST_INSERT_ID();

    /* ========= 2️⃣ 分流處理 ========= */

    IF p_record_type = 'datecode' THEN

        INSERT INTO fixture_datecode_inventory (
            customer_id,
            fixture_id,
            datecode,
            available_qty,
            source_type
        ) VALUES (
            p_customer_id,
            p_fixture_id,
            p_datecode,
            p_quantity,
            p_source_type
        )
        ON DUPLICATE KEY UPDATE
            available_qty = available_qty + VALUES(available_qty);

        INSERT INTO fixture_datecode_transactions (
            transaction_id,
            customer_id,
            fixture_id,
            datecode,
            transaction_type,
            quantity
        ) VALUES (
            v_transaction_id,
            p_customer_id,
            p_fixture_id,
            p_datecode,
            'receipt',
            p_quantity
        );

        INSERT INTO material_transaction_items (
            transaction_id,
            customer_id,
            fixture_id,
            datecode,
            quantity
        ) VALUES (
            v_transaction_id,
            p_customer_id,
            p_fixture_id,
            p_datecode,
            p_quantity
        );

    ELSE

        CALL sp_receipt_fixture_serials(
            p_customer_id,
            p_fixture_id,
            p_serials_csv,
            v_transaction_id
        );

        UPDATE material_transactions
        SET quantity = (
            SELECT COUNT(*)
            FROM material_transaction_items
            WHERE transaction_id = v_transaction_id
        )
        WHERE id = v_transaction_id;

    END IF;

    COMMIT;

    /* ========= 最終回傳 ========= */
    SELECT
        v_transaction_id AS transaction_id,
        'OK' AS message;

END $$

DELIMITER ;








DELIMITER $$

DROP PROCEDURE IF EXISTS sp_material_return_v4 $$

CREATE
    DEFINER = fixture_test@`%`
    PROCEDURE sp_material_return_v4(
        IN p_customer_id VARCHAR(50),
        IN p_fixture_id VARCHAR(50),
        IN p_order_no VARCHAR(100),
        IN p_operator VARCHAR(100),
        IN p_note TEXT,
        IN p_created_by INT,
        IN p_record_type ENUM ('batch', 'individual', 'datecode'),
        IN p_source_type ENUM ('self_purchased', 'customer_supplied'),
        IN p_serials_csv TEXT,
        IN p_datecode VARCHAR(50),
        IN p_quantity INT
    )
proc_end:
BEGIN
    DECLARE v_transaction_id INT DEFAULT NULL;
    DECLARE v_quantity INT DEFAULT 0;

    /* ================= 錯誤處理 ================= */
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SELECT
            NULL AS transaction_id,
            '退料失敗（資料庫異常）' AS message;
    END;

    /* ================= 基本驗證 ================= */

    IF p_record_type NOT IN ('batch','individual','datecode') THEN
        SELECT NULL AS transaction_id, 'record_type 不合法' AS message;
        LEAVE proc_end;
    END IF;

    IF p_source_type NOT IN ('self_purchased','customer_supplied') THEN
        SELECT NULL AS transaction_id, 'source_type 不合法' AS message;
        LEAVE proc_end;
    END IF;

    /* ---------- datecode 模式 ---------- */
    IF p_record_type = 'datecode' THEN

        IF p_datecode IS NULL OR p_datecode = '' THEN
            SELECT NULL AS transaction_id, 'datecode 模式需要 datecode' AS message;
            LEAVE proc_end;
        END IF;

        IF p_quantity IS NULL OR p_quantity <= 0 THEN
            SELECT NULL AS transaction_id, 'datecode 模式需要 quantity > 0' AS message;
            LEAVE proc_end;
        END IF;

        IF p_serials_csv IS NOT NULL AND p_serials_csv <> '' THEN
            SELECT NULL AS transaction_id, 'datecode 模式不可傳入 serials' AS message;
            LEAVE proc_end;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM fixture_datecode_inventory
            WHERE customer_id = p_customer_id
              AND fixture_id  = p_fixture_id
              AND datecode    = p_datecode
              AND available_qty >= p_quantity
        ) THEN
            SELECT NULL AS transaction_id, 'datecode 庫存不足，無法退料' AS message;
            LEAVE proc_end;
        END IF;

        SET v_quantity = p_quantity;

    ELSE
        /* ---------- batch / individual ---------- */

        IF p_serials_csv IS NULL OR p_serials_csv = '' THEN
            SELECT NULL AS transaction_id, 'serial 模式需要 serials_csv' AS message;
            LEAVE proc_end;
        END IF;

        SET v_quantity = 0;
    END IF;

    START TRANSACTION;

    /* ================= 1️⃣ 建立交易主表 ================= */

    INSERT INTO material_transactions (
        transaction_type,
        record_type,
        quantity,
        transaction_date,
        customer_id,
        order_no,
        fixture_id,
        source_type,
        operator,
        note,
        created_by
    ) VALUES (
        'return',
        p_record_type,
        CASE
            WHEN p_record_type = 'datecode' THEN p_quantity
            ELSE (
                LENGTH(p_serials_csv) - LENGTH(REPLACE(p_serials_csv, ',', '')) + 1
            )
        END,
        CURRENT_DATE,
        p_customer_id,
        p_order_no,
        p_fixture_id,
        p_source_type,
        p_operator,
        p_note,
        p_created_by
    );

    SET v_transaction_id = LAST_INSERT_ID();

    /* ================= 2️⃣ 分流處理 ================= */

    IF p_record_type = 'datecode' THEN

        UPDATE fixture_datecode_inventory
        SET available_qty = available_qty - p_quantity
        WHERE customer_id = p_customer_id
          AND fixture_id  = p_fixture_id
          AND datecode    = p_datecode;

        INSERT INTO fixture_datecode_transactions (
            transaction_id,
            customer_id,
            fixture_id,
            datecode,
            transaction_type,
            quantity
        ) VALUES (
            v_transaction_id,
            p_customer_id,
            p_fixture_id,
            p_datecode,
            'return',
            p_quantity
        );

        INSERT INTO material_transaction_items (
            transaction_id,
            customer_id,
            fixture_id,
            datecode,
            quantity
        ) VALUES (
            v_transaction_id,
            p_customer_id,
            p_fixture_id,
            p_datecode,
            p_quantity
        );

    ELSE

        CALL sp_return_fixture_serials(
            p_customer_id,
            p_fixture_id,
            p_serials_csv,
            v_transaction_id
        );

        UPDATE material_transactions
        SET quantity = (
            SELECT COUNT(*)
            FROM material_transaction_items
            WHERE transaction_id = v_transaction_id
        )
        WHERE id = v_transaction_id;

    END IF;

    COMMIT;

    /* ================= 最終回傳 ================= */
    SELECT
        v_transaction_id AS transaction_id,
        'OK' AS message;

END $$

DELIMITER ;









DROP PROCEDURE IF EXISTS sp_receipt_fixture_serials;
DELIMITER $$

CREATE
    DEFINER = fixture_test@`%`
PROCEDURE sp_receipt_fixture_serials(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_serials_csv TEXT,
    IN p_transaction_id INT
)
proc_end: BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT DEFAULT 0;
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_msg VARCHAR(255);

    DECLARE v_source_type ENUM('self_purchased','customer_supplied');
    DECLARE v_tx_date DATE;

    /* =========================================================
     * 0️⃣ 先從交易主表取 source_type（唯一真相）
     * ========================================================= */
    SELECT
        source_type,
        transaction_date
    INTO
        v_source_type,
        v_tx_date
    FROM material_transactions
    WHERE id = p_transaction_id
      AND customer_id = p_customer_id
      AND fixture_id  = p_fixture_id
    FOR UPDATE;

    IF v_source_type IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '交易不存在或 source_type 為 NULL';
    END IF;

    serial_loop:
    WHILE p_serials_csv IS NOT NULL AND LENGTH(p_serials_csv) > 0 DO

        SET v_pos = LOCATE(',', p_serials_csv);

        IF v_pos = 0 THEN
            SET v_serial = TRIM(p_serials_csv);
            SET p_serials_csv = '';
        ELSE
            SET v_serial = TRIM(SUBSTRING(p_serials_csv, 1, v_pos - 1));
            SET p_serials_csv = SUBSTRING(p_serials_csv, v_pos + 1);
        END IF;

        IF v_serial = '' THEN
            ITERATE serial_loop;
        END IF;

        /* =========================================================
         * 1️⃣ 驗證：序號不可重複
         * ========================================================= */
        SELECT COUNT(*)
        INTO v_exists
        FROM fixture_serials
        WHERE customer_id   = p_customer_id
          AND fixture_id    = p_fixture_id
          AND serial_number = v_serial
        FOR UPDATE;

        IF v_exists > 0 THEN
            SET v_msg = CONCAT('序號已存在，無法重複收料: ', v_serial);
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
        END IF;

        /* =========================================================
         * 2️⃣ 新增序號（source_type 從交易帶入）
         * ========================================================= */
        INSERT INTO fixture_serials (
            customer_id,
            fixture_id,
            serial_number,
            source_type,              -- ⭐ 關鍵修正
            status,
            receipt_date,
            receipt_transaction_id
        ) VALUES (
            p_customer_id,
            p_fixture_id,
            v_serial,
            v_source_type,             -- ⭐ 不再是 ENUM default
            'in_stock',
            v_tx_date,
            p_transaction_id
        );

        /* =========================================================
         * 3️⃣ 寫入交易明細
         * ========================================================= */
        INSERT INTO material_transaction_items (
            transaction_id,
            customer_id,
            fixture_id,
            serial_number
        ) VALUES (
            p_transaction_id,
            p_customer_id,
            p_fixture_id,
            v_serial
        );

    END WHILE;

END$$
DELIMITER ;







DROP PROCEDURE IF EXISTS sp_return_fixture_serials;
DELIMITER $$

CREATE
    DEFINER = fixture_test@`%`
PROCEDURE sp_return_fixture_serials(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id  VARCHAR(50),
    IN p_serials_csv TEXT,
    IN p_transaction_id INT
)
proc_end:
BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT DEFAULT 0;
    DECLARE v_status VARCHAR(50);
    DECLARE v_msg VARCHAR(255);

    DECLARE v_tx_date DATE;

    /* =========================================================
     * 0️⃣ 先鎖定交易（確保存在）
     * ========================================================= */
    SELECT transaction_date
    INTO v_tx_date
    FROM material_transactions
    WHERE id = p_transaction_id
      AND customer_id = p_customer_id
      AND fixture_id  = p_fixture_id
    FOR UPDATE;

    IF v_tx_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '退料交易不存在';
    END IF;

    serial_loop:
    WHILE p_serials_csv IS NOT NULL AND LENGTH(p_serials_csv) > 0 DO

        SET v_pos = LOCATE(',', p_serials_csv);

        IF v_pos = 0 THEN
            SET v_serial = TRIM(p_serials_csv);
            SET p_serials_csv = '';
        ELSE
            SET v_serial = TRIM(SUBSTRING(p_serials_csv, 1, v_pos - 1));
            SET p_serials_csv = SUBSTRING(p_serials_csv, v_pos + 1);
        END IF;

        IF v_serial = '' THEN
            ITERATE serial_loop;
        END IF;

        /* =========================================================
         * 1️⃣ 驗證：序號必須存在，且狀態允許退料
         * ========================================================= */
        SELECT status
        INTO v_status
        FROM fixture_serials
        WHERE customer_id   = p_customer_id
          AND fixture_id    = p_fixture_id
          AND serial_number = v_serial
        FOR UPDATE;

        IF v_status IS NULL THEN
            SET v_msg = CONCAT('序號不存在，無法退料: ', v_serial);
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
        END IF;

        IF v_status <> 'in_stock' THEN
            SET v_msg = CONCAT('序號狀態不可退料: ', v_serial, ' (', v_status, ')');
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_msg;
        END IF;

        /* =========================================================
         * 2️⃣ 更新序號狀態（補齊 return 欄位）
         * ========================================================= */
        UPDATE fixture_serials
        SET
            status = 'returned',
            return_date = v_tx_date,
            return_transaction_id = p_transaction_id
        WHERE customer_id   = p_customer_id
          AND fixture_id    = p_fixture_id
          AND serial_number = v_serial;

        /* =========================================================
         * 3️⃣ 寫入交易明細（audit）
         * ========================================================= */
        INSERT INTO material_transaction_items (
            transaction_id,
            customer_id,
            fixture_id,
            serial_number
        ) VALUES (
            p_transaction_id,
            p_customer_id,
            p_fixture_id,
            v_serial
        );

    END WHILE;

END$$
DELIMITER ;



