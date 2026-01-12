DROP VIEW IF EXISTS view_fixture_status;

CREATE
    DEFINER = fixture_test@`%`
    VIEW view_fixture_status AS
SELECT
    f.id                             AS fixture_id,
    f.customer_id                    AS customer_id,
    f.fixture_name                   AS fixture_name,
    f.fixture_type                   AS fixture_type,
    f.storage_location               AS storage_location,
    f.status                         AS status,

    f.self_purchased_qty             AS self_purchased_qty,
    f.customer_supplied_qty          AS customer_supplied_qty,
    f.in_stock_qty                  AS in_stock_qty,
    f.deployed_qty                   AS deployed_qty,
    f.maintenance_qty                AS maintenance_qty,
    f.scrapped_qty                   AS scrapped_qty,
    f.returned_qty                   AS returned_qty,

    (f.self_purchased_qty + f.customer_supplied_qty)
                                     AS total_qty,

    /* 已部署序號 */
    GROUP_CONCAT(
        DISTINCT fs.id
        ORDER BY fs.id ASC
        SEPARATOR ', '
    )                                AS deployed_serials,

    /* datecode 庫存 */
    IFNULL(SUM(fdi.in_stock_qty), 0)
                                     AS datecode_in_stock_qty,

    /* serial + datecode */
    (f.in_stock_qty + IFNULL(SUM(fdi.in_stock_qty), 0))
                                     AS total_in_stock_qty,

    /* 更換週期 */
    f.last_replacement_date          AS last_replacement_date,
    f.replacement_cycle              AS replacement_cycle,
    f.cycle_unit                     AS cycle_unit,

    CASE
        WHEN f.cycle_unit = 'days'
         AND f.last_replacement_date IS NOT NULL
         AND (TO_DAYS(CURDATE()) - TO_DAYS(f.last_replacement_date))
             >= f.replacement_cycle
        THEN '需更換'
        ELSE '正常'
    END                              AS replacement_status,

    o.primary_user_id                AS primary_owner,
    o.secondary_user_id              AS secondary_owner,

    f.created_at                     AS created_at,
    f.updated_at                     AS updated_at

FROM fixtures f
LEFT JOIN fixture_serials fs
       ON fs.fixture_id = f.id
      AND fs.status = 'deployed'
LEFT JOIN fixture_datecode_inventory fdi
       ON fdi.fixture_id = f.id
LEFT JOIN owners o
       ON o.id = f.owner_id

GROUP BY
    f.id,
    f.customer_id,
    f.fixture_name,
    f.fixture_type,
    f.storage_location,
    f.status,
    f.self_purchased_qty,
    f.customer_supplied_qty,
    f.in_stock_qty,
    f.deployed_qty,
    f.maintenance_qty,
    f.scrapped_qty,
    f.returned_qty,
    f.last_replacement_date,
    f.replacement_cycle,
    f.cycle_unit,
    o.primary_user_id,
    o.secondary_user_id,
    f.created_at,
    f.updated_at;






DROP VIEW IF EXISTS view_model_max_stations;

CREATE
    DEFINER = fixture_test@`%`
    VIEW view_model_max_stations AS
SELECT
    mm.id           AS model_id,
    mm.model_name   AS model_name,
    ms.station_id   AS station_id,
    s.station_name  AS station_name,

    /* 可開站數 = 最小瓶頸 fixture */
    MIN(
        FLOOR(
            IFNULL(av.available_cnt, 0) / fr.required_qty
        )
    ) AS max_available_stations,

    /* 瓶頸 fixtures 說明 */
    GROUP_CONCAT(
        CONCAT(
            f.fixture_name,
            '(',
            IFNULL(av.available_cnt, 0),
            '/',
            fr.required_qty,
            ')'
        )
        ORDER BY
            (IFNULL(av.available_cnt, 0) / fr.required_qty) ASC
        SEPARATOR ', '
    ) AS limiting_fixtures

FROM machine_models mm
JOIN model_stations ms
    ON ms.model_id = mm.id
JOIN stations s
    ON s.id = ms.station_id
JOIN fixture_requirements fr
    ON fr.model_id   = mm.id
   AND fr.station_id = ms.station_id
JOIN fixtures f
    ON f.id = fr.fixture_id

LEFT JOIN (
    SELECT
        fixture_id,
        COUNT(*) AS available_cnt
    FROM fixture_serials
    WHERE status = 'available'
    GROUP BY fixture_id
) av
    ON av.fixture_id = fr.fixture_id

WHERE f.status = '正常'
  AND fr.required_qty > 0

GROUP BY
    mm.id,
    mm.model_name,
    ms.station_id,
    s.station_name;






DROP VIEW IF EXISTS view_serial_status;

CREATE
    DEFINER = fixture_test@`%`
    VIEW view_serial_status AS
SELECT
    fs.id             AS serial_id,
    fs.customer_id    AS customer_id,
    fs.serial_number  AS serial_number,
    fs.fixture_id     AS fixture_id,
    f.fixture_name    AS fixture_name,
    fs.source_type    AS source_type,
    fs.status         AS status,
    fs.receipt_date   AS receipt_date,
    fs.return_date    AS return_date,
    fs.note           AS note,
    fs.created_at     AS created_at,
    fs.updated_at     AS updated_at
FROM fixture_serials fs
JOIN fixtures f
    ON f.id = fs.fixture_id;








DROP VIEW IF EXISTS view_upcoming_fixture_replacements;

CREATE
    DEFINER = fixture_test@`%`
    VIEW view_upcoming_fixture_replacements AS
SELECT
    f.customer_id            AS customer_id,
    f.id                     AS fixture_id,
    f.fixture_name           AS fixture_name,

    f.cycle_unit             AS cycle_unit,
    f.replacement_cycle      AS replacement_cycle,

    fus.total_uses           AS total_uses,
    f.last_replacement_date  AS last_replacement_date,

    /* 已使用天數（days 模式） */
    (TO_DAYS(CURDATE()) - TO_DAYS(f.last_replacement_date))
                              AS used_days,

    /* 使用比例（>= 1 代表已達更換門檻） */
    CASE
        WHEN f.cycle_unit = 'uses'
         AND f.replacement_cycle > 0
        THEN fus.total_uses / f.replacement_cycle

        WHEN f.cycle_unit = 'days'
         AND f.replacement_cycle > 0
         AND f.last_replacement_date IS NOT NULL
        THEN (
            (TO_DAYS(CURDATE()) - TO_DAYS(f.last_replacement_date))
            / f.replacement_cycle
        )

        ELSE NULL
    END AS usage_ratio

FROM fixtures f
LEFT JOIN fixture_usage_summary fus
    ON fus.fixture_id  = f.id
   AND fus.customer_id = f.customer_id

WHERE f.replacement_cycle IS NOT NULL
  AND f.cycle_unit IN ('uses', 'days');
