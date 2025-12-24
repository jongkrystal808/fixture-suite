
-- This file contains SQL code to create views for fixture and serial status reporting.
CREATE OR REPLACE VIEW view_fixture_status AS
SELECT
    f.id                    AS fixture_id,
    f.customer_id           AS customer_id,
    f.fixture_name          AS fixture_name,
    f.fixture_type          AS fixture_type,
    f.storage_location      AS storage_location,
    f.status                AS status,

    /* 序號相關數量（原有語意，不變） */
    f.self_purchased_qty    AS self_purchased_qty,
    f.customer_supplied_qty AS customer_supplied_qty,
    f.available_qty         AS available_qty,        -- serial available
    f.deployed_qty          AS deployed_qty,
    f.maintenance_qty       AS maintenance_qty,
    f.scrapped_qty          AS scrapped_qty,
    f.returned_qty          AS returned_qty,

    (f.self_purchased_qty + f.customer_supplied_qty)
                            AS total_qty,

    /* 目前部署中的序號（serial） */
    GROUP_CONCAT(
        DISTINCT fs.id
        ORDER BY fs.id ASC
        SEPARATOR ', '
    ) AS deployed_serials,

    /* ===== v4.x 新增：datecode 庫存 ===== */
    IFNULL(SUM(fdi.available_qty), 0)
                            AS datecode_available_qty,

    /* ===== v4.x 新增：總可用庫存 ===== */
    f.available_qty + IFNULL(SUM(fdi.available_qty), 0)
                            AS total_available_qty,

    /* 更換判斷（僅 days 模式，符合你現有模型） */
    f.last_replacement_date AS last_replacement_date,
    f.replacement_cycle     AS replacement_cycle,
    f.cycle_unit            AS cycle_unit,
    CASE
        WHEN f.cycle_unit = 'days'
         AND f.last_replacement_date IS NOT NULL
         AND (TO_DAYS(CURDATE()) - TO_DAYS(f.last_replacement_date))
                >= f.replacement_cycle
        THEN '需更換'
        ELSE '正常'
    END AS replacement_status,

    o.primary_owner         AS primary_owner,
    o.secondary_owner       AS secondary_owner,

    f.created_at            AS created_at,
    f.updated_at            AS updated_at

FROM fixtures f
LEFT JOIN fixture_serials fs
       ON f.id = fs.fixture_id
      AND fs.status = 'deployed'
LEFT JOIN fixture_datecode_inventory fdi
       ON fdi.fixture_id = f.id
LEFT JOIN owners o
       ON f.owner_id = o.id

GROUP BY
    f.id,
    f.customer_id,
    f.fixture_name,
    f.fixture_type,
    f.storage_location,
    f.status,
    f.self_purchased_qty,
    f.customer_supplied_qty,
    f.available_qty,
    f.deployed_qty,
    f.maintenance_qty,
    f.scrapped_qty,
    f.returned_qty,
    f.last_replacement_date,
    f.replacement_cycle,
    f.cycle_unit,
    o.primary_owner,
    o.secondary_owner,
    f.created_at,
    f.updated_at;



--
DROP VIEW IF EXISTS view_model_max_stations;
CREATE VIEW view_model_max_stations AS
SELECT
    mm.id                    AS model_id,
    mm.model_name            AS model_name,
    ms.station_id            AS station_id,
    s.station_name           AS station_name,

    /* 每種治具可支撐的 station 數量，取最小值 */
    MIN(
        FLOOR(
            IFNULL(av.available_cnt, 0) / fr.required_qty
        )
    ) AS max_available_stations,

    /* 限制瓶頸治具 */
    GROUP_CONCAT(
        CONCAT(
            f.fixture_name,
            '(',
            IFNULL(av.available_cnt, 0),
            '/',
            fr.required_qty,
            ')'
        )
        ORDER BY IFNULL(av.available_cnt, 0) / fr.required_qty ASC
        SEPARATOR ', '
    ) AS limiting_fixtures

FROM machine_models mm
JOIN model_stations ms
  ON mm.id = ms.model_id
JOIN stations s
  ON ms.station_id = s.id
JOIN fixture_requirements fr
  ON fr.model_id = mm.id
 AND fr.station_id = ms.station_id
JOIN fixtures f
  ON fr.fixture_id = f.id

/* 預先算每種 fixture 的 available 數量 */
LEFT JOIN (
    SELECT
        fixture_id,
        COUNT(*) AS available_cnt
    FROM fixture_serials
    WHERE status = 'available'
    GROUP BY fixture_id
) av
  ON av.fixture_id = fr.fixture_id

WHERE f.status = 'normal'
  AND fr.required_qty > 0

GROUP BY
    mm.id,
    mm.model_name,
    ms.station_id,
    s.station_name;


DROP VIEW IF EXISTS view_serial_status;
CREATE VIEW view_serial_status AS
SELECT
    fs.id              AS serial_id,
    fs.customer_id     AS customer_id,
    fs.serial_number   AS serial_number,
    fs.fixture_id      AS fixture_id,
    f.fixture_name     AS fixture_name,
    fs.source_type     AS source_type,
    fs.status          AS status,

    fs.receipt_date    AS receipt_date,
    fs.return_date     AS return_date,

    fs.note            AS note,
    fs.created_at      AS created_at,
    fs.updated_at      AS updated_at
FROM fixture_serials fs
JOIN fixtures f
  ON fs.fixture_id = f.id;


-- Stored Procedure: sp_create_daily_snapshot
DROP PROCEDURE IF EXISTS sp_create_daily_snapshot
CREATE PROCEDURE sp_create_daily_snapshot(
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

-- ============================================================
-- View: view_upcoming_fixture_replacements
-- 用途: 即將更換治具清單（Dashboard / 通知共用）
-- 規則: 使用率或時間達 80%
-- ============================================================

DROP VIEW IF EXISTS view_upcoming_fixture_replacements;

CREATE VIEW view_upcoming_fixture_replacements AS
SELECT
    f.customer_id,
    f.id AS fixture_id,
    f.fixture_name,
    f.cycle_unit,
    f.replacement_cycle,

    -- 使用次數模式
    fus.total_uses,

    -- 天數模式
    f.last_replacement_date,
    DATEDIFF(CURDATE(), f.last_replacement_date) AS used_days,

    -- 計算使用率（統一成 ratio）
    CASE
        WHEN f.cycle_unit = 'uses'
             AND f.replacement_cycle > 0
        THEN fus.total_uses / f.replacement_cycle

        WHEN f.cycle_unit = 'days'
             AND f.replacement_cycle > 0
             AND f.last_replacement_date IS NOT NULL
        THEN DATEDIFF(CURDATE(), f.last_replacement_date) / f.replacement_cycle

        ELSE NULL
    END AS usage_ratio

FROM fixtures f
LEFT JOIN fixture_usage_summary fus
  ON fus.fixture_id = f.id
 AND fus.customer_id = f.customer_id

WHERE
    f.replacement_cycle IS NOT NULL
    AND f.cycle_unit IN ('uses', 'days');
