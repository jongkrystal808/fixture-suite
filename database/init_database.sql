
-- =========================
-- init_database.sql
-- =========================
-- 若表存在先刪除
DROP TABLE IF EXISTS customers;

-- 建立 customers table
CREATE TABLE customers
(
    id             VARCHAR(50)                          NOT NULL COMMENT '客戶名稱 (直接使用客戶名稱作為主鍵)'
        PRIMARY KEY,
    customer_abbr  VARCHAR(20)                          NULL COMMENT '客戶簡稱',
    contact_person VARCHAR(100)                         NULL COMMENT '聯絡人',
    contact_phone  VARCHAR(20)                          NULL COMMENT '聯絡電話',
    contact_email  VARCHAR(100)                         NULL COMMENT 'Email',
    address        TEXT                                 NULL COMMENT '地址',
    is_active      TINYINT(1) DEFAULT 1                 NULL COMMENT '是否啟用',
    note           TEXT                                 NULL COMMENT '備註',
    created_at     TIMESTAMP  DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at     TIMESTAMP  DEFAULT CURRENT_TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
)
COMMENT '客戶總表';

-- 建立 index
CREATE INDEX idx_is_active
    ON customers (is_active);







-- 若表存在先刪除
DROP TABLE IF EXISTS users;

-- 建立 users table
CREATE TABLE users
(
    id            INT AUTO_INCREMENT
        PRIMARY KEY,
    username      VARCHAR(50)                                      NOT NULL COMMENT '工號/帳號',
    password_hash VARCHAR(255)                                     NOT NULL COMMENT '密碼雜湊',
    role          ENUM ('admin', 'user') DEFAULT 'user'            NULL COMMENT '角色: admin=管理員, user=一般使用者',
    full_name     VARCHAR(100)                                     NULL COMMENT '姓名',
    email         VARCHAR(255)                                     NULL COMMENT 'Email',
    is_active     TINYINT(1)             DEFAULT 1                 NULL COMMENT '是否啟用',
    created_at    TIMESTAMP              DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at    TIMESTAMP              DEFAULT CURRENT_TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT username
        UNIQUE (username)
)
COMMENT '使用者表';

-- 建立 index
CREATE INDEX idx_role
    ON users (role);

CREATE INDEX idx_username
    ON users (username);







-- 若表存在先刪除
DROP TABLE IF EXISTS owners;

-- 建立 owners table
CREATE TABLE owners
(
    id                INT AUTO_INCREMENT
        PRIMARY KEY,
    customer_id       VARCHAR(50)                          NULL COMMENT 'NULL = 跨客戶共用',
    primary_user_id   INT                                  NOT NULL COMMENT '主負責人 (users.id)',
    secondary_user_id INT                                  NULL COMMENT '副負責人 (users.id)',
    note              TEXT                                 NULL,
    is_active         TINYINT(1) DEFAULT 1                 NULL,
    created_at        TIMESTAMP  DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT fk_owner_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id)
            ON DELETE SET NULL,
    CONSTRAINT fk_owner_primary_user
        FOREIGN KEY (primary_user_id) REFERENCES users (id),
    CONSTRAINT fk_owner_secondary_user
        FOREIGN KEY (secondary_user_id) REFERENCES users (id)
);







-- 若表存在先刪除
DROP TABLE IF EXISTS fixtures;

-- 建立 fixtures table
create table fixtures
(
    id                     varchar(50)                                                       not null comment '治具編號 (如: L-3000-STD)'
        primary key,
    customer_id            varchar(50)                                                       not null comment '客戶名稱',
    fixture_name           varchar(255)                                                      not null comment '治具名稱',
    fixture_type           varchar(50)                                                       null comment '治具類型',
    serial_number          varchar(100)                                                      null comment '序號 (已廢棄,建議使用 fixture_serials 表)',
    self_purchased_qty     int                                     default 0                 null comment '自購數量',
    customer_supplied_qty  int                                     default 0                 null comment '客供數量',
    in_stock_qty           int                                     default 0                 null comment '【v4.x】in_stock 數量（由 fixture_serials / datecode trigger 自動維護）',
    deployed_qty           int                                     default 0                 null comment '【v4.x】deployed 數量（由 trigger 維護）',
    maintenance_qty        int                                     default 0                 null comment '【v4.x】maintenance 數量（由 trigger 維護）',
    scrapped_qty           int                                     default 0                 null comment '【v4.x】scrapped 數量（由 trigger 維護）',
    returned_qty           int                                     default 0                 null comment '【v4.x】returned 數量（由 trigger 維護）',
    storage_location       varchar(100)                                                      null comment '儲存位置',
    replacement_cycle      decimal(10, 2)                                                    null comment '更換週期',
    cycle_unit             enum ('days', 'uses', 'none')           default 'uses'            null comment '週期單位',
    status                 enum ('normal', 'returned', 'scrapped') default 'normal'          null comment '【v4.x legacy】目前未使用，請勿作為狀態判斷',
    last_replacement_date  date                                                              null comment '最近更換日期',
    last_notification_time timestamp                                                         null comment '最後通知時間',
    owner_id               int                                                               null comment '負責人ID',
    note                   text                                                              null comment '備註',
    created_at             timestamp                               default CURRENT_TIMESTAMP null,
    updated_at             timestamp                               default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP,
    constraint fixtures_ibfk_1
        foreign key (customer_id) references customers (id),
    constraint fk_fixtures_owner
        foreign key (owner_id) references owners (id)
            on delete set null
)
    comment '治具主表';

create index idx_customer
    on fixtures (customer_id);

create index idx_customer_status
    on fixtures (customer_id, status);

create index idx_fixture_type
    on fixtures (fixture_type);

create index idx_owner
    on fixtures (owner_id);








-- 若表存在先刪除
DROP TABLE IF EXISTS stations;

-- 建立 stations table
CREATE TABLE stations
(
    id           VARCHAR(50)                         NOT NULL COMMENT '站點代碼 (如: T1_MP)'
        PRIMARY KEY,
    customer_id  VARCHAR(50)                         NOT NULL COMMENT '客戶名稱',
    station_name VARCHAR(100)                        NULL COMMENT '站點名稱',
    note         TEXT                                NULL COMMENT '備註',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT stations_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id)
)
COMMENT '站點表';

-- 建立 index
CREATE INDEX idx_customer
    ON stations (customer_id);







-- 若表存在先刪除
DROP TABLE IF EXISTS machine_models;

-- 建立 machine_models table
CREATE TABLE machine_models
(
    id          VARCHAR(50)                         NOT NULL COMMENT '機種代碼 (如: EDS-2008-LSFG)'
        PRIMARY KEY,
    customer_id VARCHAR(50)                         NOT NULL COMMENT '客戶名稱',
    model_name  VARCHAR(255)                        NOT NULL COMMENT '機種名稱',
    note        TEXT                                NULL COMMENT '備註',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT machine_models_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id)
)
COMMENT '機種表';

-- 建立 index
CREATE INDEX idx_customer
    ON machine_models (customer_id);







-- 若表存在先刪除
DROP TABLE IF EXISTS material_transactions;

-- 建立 material_transactions table
CREATE TABLE material_transactions
(
    id               INT AUTO_INCREMENT COMMENT '異動記錄ID'
        PRIMARY KEY,
    transaction_type ENUM ('receipt', 'return')                                               NOT NULL,
    record_type      ENUM ('individual', 'batch', 'datecode')                                 NOT NULL,
    quantity         INT                                                                      NULL COMMENT '當次交易輸入數量（receipt 為正，return 為負）',
    transaction_date DATE                                                                     NOT NULL COMMENT '異動日期',
    customer_id      VARCHAR(50)                                                              NOT NULL COMMENT '客戶名稱 (廠商=客戶)',
    order_no         VARCHAR(100)                                                             NULL COMMENT '僅供參考，不參與任何邏輯',
    fixture_id       VARCHAR(50)                                                              NOT NULL COMMENT '治具編號',
    source_type      ENUM ('self_purchased', 'customer_supplied') DEFAULT 'customer_supplied' NULL COMMENT '來源類型: self_purchased=自購, customer_supplied=客供',
    operator         VARCHAR(100)                                                             NULL COMMENT '操作人員',
    note             TEXT                                                                     NULL COMMENT '備註',
    created_at       TIMESTAMP                                    DEFAULT CURRENT_TIMESTAMP   NULL,
    created_by       INT                                                                      NULL COMMENT '建立人員ID',
    CONSTRAINT material_transactions_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT material_transactions_ibfk_2
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
)
COMMENT '物料異動主表';

-- 建立 index
CREATE INDEX created_by
    ON material_transactions (created_by);

CREATE INDEX idx_customer
    ON material_transactions (customer_id);

CREATE INDEX idx_customer_date
    ON material_transactions (customer_id, transaction_date);

CREATE INDEX idx_fixture
    ON material_transactions (fixture_id);

CREATE INDEX idx_transaction_date
    ON material_transactions (transaction_date);

CREATE INDEX idx_transaction_type
    ON material_transactions (transaction_type);





-- 若表存在先刪除
DROP TABLE IF EXISTS fixture_deployments;

-- 建立 fixture_deployments table
CREATE TABLE fixture_deployments
(
    id           INT AUTO_INCREMENT COMMENT '部署記錄ID'
        PRIMARY KEY,
    customer_id  VARCHAR(50)                         NOT NULL COMMENT '客戶名稱',
    fixture_id   VARCHAR(50)                         NOT NULL COMMENT '治具編號',
    station_id   VARCHAR(50)                         NOT NULL COMMENT '站點代碼',
    deployed_qty INT       DEFAULT 0                 NULL COMMENT '部署數量',
    note         TEXT                                NULL COMMENT '備註',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_customer_fixture_station
        UNIQUE (customer_id, fixture_id, station_id),
    CONSTRAINT fixture_deployments_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fixture_deployments_ibfk_2
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE,
    CONSTRAINT fixture_deployments_ibfk_3
        FOREIGN KEY (station_id) REFERENCES stations (id)
            ON DELETE CASCADE
)
COMMENT '治具-站點部署表';

-- 建立 index
CREATE INDEX idx_customer
    ON fixture_deployments (customer_id);

CREATE INDEX idx_fixture
    ON fixture_deployments (fixture_id);

CREATE INDEX idx_station
    ON fixture_deployments (station_id);

CREATE INDEX idx_station_fixture
    ON fixture_deployments (station_id, fixture_id);







-- 若表存在先刪除
DROP TABLE IF EXISTS fixture_serials;

-- 建立 fixture_serials table
CREATE TABLE fixture_serials
(
    id                     INT AUTO_INCREMENT COMMENT '序號記錄ID'
        PRIMARY KEY,
    customer_id            VARCHAR(50)                                                                                    NOT NULL COMMENT '客戶名稱',
    fixture_id             VARCHAR(50)                                                                                    NOT NULL COMMENT '治具編號',
    serial_number          VARCHAR(100)                                                                                   NOT NULL COMMENT '序號',
    source_type            ENUM ('self_purchased', 'customer_supplied')                                                   NOT NULL COMMENT '來源類型',
    status                 ENUM ('in_stock', 'deployed', 'maintenance', 'returned', 'scrapped') DEFAULT 'in_stock'        NULL,
    receipt_date           DATE                                                                                           NULL COMMENT '收料日期',
    return_date            DATE                                                                                           NULL COMMENT '退料日期',
    receipt_transaction_id INT                                                                                            NULL COMMENT '收料異動ID',
    return_transaction_id  INT                                                                                            NULL COMMENT '退料異動ID',
    deployment_id          INT                                                                                            NULL COMMENT '部署ID',
    current_station_id     VARCHAR(50)                                                                                    NULL COMMENT '目前所在站點',
    total_uses             INT                                                                  DEFAULT 0                 NULL COMMENT '累計使用次數',
    last_use_date          DATE                                                                                           NULL COMMENT '最後使用日期',
    note                   TEXT                                                                                           NULL COMMENT '備註',
    created_at             TIMESTAMP                                                            DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at             TIMESTAMP                                                            DEFAULT CURRENT_TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fixture_serials_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fixture_serials_ibfk_2
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_fixture_serials_current_station
        FOREIGN KEY (current_station_id) REFERENCES stations (id)
            ON DELETE SET NULL,
    CONSTRAINT fk_fixture_serials_deployment
        FOREIGN KEY (deployment_id) REFERENCES fixture_deployments (id)
            ON DELETE SET NULL,
    CONSTRAINT fk_fixture_serials_receipt_tx
        FOREIGN KEY (receipt_transaction_id) REFERENCES material_transactions (id)
            ON DELETE SET NULL,
    CONSTRAINT fk_fixture_serials_return_tx
        FOREIGN KEY (return_transaction_id) REFERENCES material_transactions (id)
            ON DELETE SET NULL
)
COMMENT '序號表';

-- 建立 index
CREATE INDEX idx_current_station
    ON fixture_serials (current_station_id);

CREATE INDEX idx_customer
    ON fixture_serials (customer_id);

CREATE INDEX idx_customer_fixture
    ON fixture_serials (customer_id, fixture_id);

CREATE INDEX idx_fixture
    ON fixture_serials (fixture_id);

CREATE INDEX idx_fixture_only
    ON fixture_serials (fixture_id);

CREATE INDEX idx_receipt_transaction
    ON fixture_serials (receipt_transaction_id);

CREATE INDEX idx_return_transaction
    ON fixture_serials (return_transaction_id);

CREATE INDEX idx_serial
    ON fixture_serials (serial_number);

CREATE INDEX idx_status
    ON fixture_serials (status);









-- 若表存在先刪除
DROP TABLE IF EXISTS deployment_history;

-- 建立 deployment_history table
CREATE TABLE deployment_history
(
    id         INT AUTO_INCREMENT COMMENT '歷史記錄ID'
        PRIMARY KEY,
    serial_id  INT                                 NOT NULL COMMENT '序號ID',
    station_id VARCHAR(50)                         NOT NULL COMMENT '站點代碼',
    action     ENUM ('deploy', 'undeploy')         NOT NULL COMMENT '動作',
    operator   VARCHAR(100)                        NULL COMMENT '操作人員',
    note       TEXT                                NULL COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT deployment_history_ibfk_1
        FOREIGN KEY (serial_id) REFERENCES fixture_serials (id)
            ON DELETE CASCADE,
    CONSTRAINT deployment_history_ibfk_2
        FOREIGN KEY (station_id) REFERENCES stations (id)
            ON DELETE CASCADE
)
COMMENT '部署歷史表';

-- 建立 index
CREATE INDEX idx_serial_date
    ON deployment_history (serial_id, created_at);

CREATE INDEX idx_station_date
    ON deployment_history (station_id, created_at);







-- 若表存在先刪除
DROP TABLE IF EXISTS fixture_requirements;

-- 建立 fixture_requirements table
CREATE TABLE fixture_requirements
(
    id           INT AUTO_INCREMENT COMMENT '需求記錄ID'
        PRIMARY KEY,
    customer_id  VARCHAR(50)                         NOT NULL COMMENT '客戶名稱',
    model_id     VARCHAR(50)                         NOT NULL COMMENT '機種代碼',
    station_id   VARCHAR(50)                         NOT NULL COMMENT '站點代碼',
    fixture_id   VARCHAR(50)                         NOT NULL COMMENT '治具編號',
    required_qty INT       DEFAULT 1                 NULL COMMENT '需求數量',
    note         TEXT                                NULL COMMENT '備註',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT uk_model_station_fixture
        UNIQUE (model_id, station_id, fixture_id),
    CONSTRAINT fixture_requirements_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fixture_requirements_ibfk_2
        FOREIGN KEY (model_id) REFERENCES machine_models (id)
            ON DELETE CASCADE,
    CONSTRAINT fixture_requirements_ibfk_3
        FOREIGN KEY (station_id) REFERENCES stations (id)
            ON DELETE CASCADE,
    CONSTRAINT fixture_requirements_ibfk_4
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE
)
COMMENT '治具-機種需求表';

-- 建立 index
CREATE INDEX idx_customer
    ON fixture_requirements (customer_id);

CREATE INDEX idx_fixture
    ON fixture_requirements (fixture_id);

CREATE INDEX idx_model
    ON fixture_requirements (model_id);

CREATE INDEX idx_station
    ON fixture_requirements (station_id);





-- 若表存在先刪除
DROP TABLE IF EXISTS fixture_usage_summary;

-- 建立 fixture_usage_summary table
CREATE TABLE fixture_usage_summary
(
    fixture_id        VARCHAR(50)   NOT NULL,
    total_use_count   INT DEFAULT 0 NULL,
    customer_id       VARCHAR(50)   NOT NULL,
    total_uses        INT DEFAULT 0 NULL,
    total_serial_uses INT DEFAULT 0 NULL,
    first_used_at     DATETIME      NULL,
    last_used_at      DATETIME      NULL,
    updated_at        DATETIME      NULL,
    last_station_id   VARCHAR(50)   NULL,
    last_model_id     VARCHAR(50)   NULL,
    last_operator     VARCHAR(100)  NULL,
    PRIMARY KEY (fixture_id, customer_id),
    CONSTRAINT fk_fus_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_fus_fixture
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE
);

-- 建立 index
CREATE INDEX idx_fus_customer_fixture
    ON fixture_usage_summary (customer_id, fixture_id);

CREATE INDEX idx_fus_last_used
    ON fixture_usage_summary (last_used_at);







-- 若表存在先刪除
DROP TABLE IF EXISTS inventory_snapshots;

-- 建立 inventory_snapshots table
CREATE TABLE inventory_snapshots
(
    id              INT AUTO_INCREMENT COMMENT '快照記錄ID'
        PRIMARY KEY,
    customer_id     VARCHAR(50)                         NOT NULL COMMENT '客戶名稱',
    fixture_id      VARCHAR(50)                         NOT NULL COMMENT '治具編號',
    snapshot_date   DATE                                NOT NULL COMMENT '快照日期',
    available_qty   INT       DEFAULT 0                 NULL COMMENT '可用數量',
    deployed_qty    INT       DEFAULT 0                 NULL COMMENT '已部署數量',
    maintenance_qty INT       DEFAULT 0                 NULL COMMENT '維護中數量',
    scrapped_qty    INT       DEFAULT 0                 NULL COMMENT '報廢數量',
    returned_qty    INT       DEFAULT 0                 NULL COMMENT '已返還數量',
    total_qty       INT       DEFAULT 0                 NULL COMMENT '總數量',
    note            TEXT                                NULL COMMENT '備註',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT uk_customer_fixture_date
        UNIQUE (customer_id, fixture_id, snapshot_date),
    CONSTRAINT inventory_snapshots_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT inventory_snapshots_ibfk_2
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE
)
COMMENT '庫存快照表';

-- 建立 index
CREATE INDEX fixture_id
    ON inventory_snapshots (fixture_id);

CREATE INDEX idx_customer
    ON inventory_snapshots (customer_id);

CREATE INDEX idx_snapshot_date
    ON inventory_snapshots (snapshot_date);







-- 若表存在先刪除
DROP TABLE IF EXISTS material_transaction_items;

-- 建立 material_transaction_items table
CREATE TABLE material_transaction_items
(
    id             INT AUTO_INCREMENT
        PRIMARY KEY,
    transaction_id INT                                 NOT NULL,
    customer_id    VARCHAR(50)                         NOT NULL,
    fixture_id     VARCHAR(50)                         NOT NULL,
    serial_number  VARCHAR(100)                        NULL COMMENT 'individual / batch 使用',
    datecode       VARCHAR(50)                         NULL COMMENT 'datecode 使用',
    quantity       INT       DEFAULT 1                 NOT NULL COMMENT 'datecode 才會 >1',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT fk_mti_transaction
        FOREIGN KEY (transaction_id) REFERENCES material_transactions (id)
            ON DELETE CASCADE
)
COMMENT '收退料實際項目（序號 / 日期碼）';

-- 建立 index
CREATE INDEX idx_customer_fixture
    ON material_transaction_items (customer_id, fixture_id);

CREATE INDEX idx_datecode
    ON material_transaction_items (datecode);

CREATE INDEX idx_fixture
    ON material_transaction_items (fixture_id);

CREATE INDEX idx_serial
    ON material_transaction_items (serial_number);







-- 若表存在先刪除
DROP TABLE IF EXISTS model_stations;

-- 建立 model_stations table
CREATE TABLE model_stations
(
    id          INT AUTO_INCREMENT COMMENT '關聯記錄ID'
        PRIMARY KEY,
    customer_id VARCHAR(50)                         NOT NULL COMMENT '客戶名稱',
    model_id    VARCHAR(50)                         NOT NULL COMMENT '機種代碼',
    station_id  VARCHAR(50)                         NOT NULL COMMENT '站點代碼',
    note        TEXT                                NULL COMMENT '備註',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT uk_model_station
        UNIQUE (model_id, station_id),
    CONSTRAINT model_stations_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT model_stations_ibfk_2
        FOREIGN KEY (model_id) REFERENCES machine_models (id)
            ON DELETE CASCADE,
    CONSTRAINT model_stations_ibfk_3
        FOREIGN KEY (station_id) REFERENCES stations (id)
            ON DELETE CASCADE
)
COMMENT '機種-站點關聯表';

-- 建立 index
CREATE INDEX idx_customer
    ON model_stations (customer_id);

CREATE INDEX idx_model
    ON model_stations (model_id);

CREATE INDEX idx_station
    ON model_stations (station_id);







-- 若表存在先刪除
DROP TABLE IF EXISTS replacement_logs;

-- 建立 replacement_logs table
CREATE TABLE replacement_logs
(
    id                        INT AUTO_INCREMENT COMMENT '更換記錄ID'
        PRIMARY KEY,
    customer_id               VARCHAR(50)                                          NOT NULL COMMENT '客戶名稱',
    fixture_id                VARCHAR(50)                                          NOT NULL COMMENT '治具編號',
    record_level              ENUM ('fixture', 'serial') DEFAULT 'fixture'         NOT NULL COMMENT '更換層級（fixture=整治具, serial=單一序號）',
    serial_number             VARCHAR(100)                                         NULL COMMENT '更換序號（若為 serial 模式使用）',
    usage_before              INT                                                  NULL COMMENT '更換前的使用次數（從 summary 自動帶入）',
    usage_after               INT                                                  NULL COMMENT '更換後重置使用次數（通常 0）',
    auto_predicted_life       INT                                                  NULL COMMENT '預估壽命（由系統自動計算）',
    auto_predicted_replace_at DATE                                                 NULL COMMENT '預估下一次更換日期（系統自動計算）',
    replacement_date          DATE                                                 NOT NULL COMMENT '更換日期',
    reason                    TEXT                                                 NULL COMMENT '更換原因',
    executor                  VARCHAR(100)                                         NULL COMMENT '執行人員',
    note                      TEXT                                                 NULL COMMENT '備註',
    created_at                TIMESTAMP                  DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT replacement_logs_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT replacement_logs_ibfk_2
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE
)
COMMENT '更換記錄表';

-- 建立 index
CREATE INDEX idx_customer
    ON replacement_logs (customer_id);

CREATE INDEX idx_fixture_date
    ON replacement_logs (fixture_id, replacement_date);







-- 若表存在先刪除
DROP TABLE IF EXISTS serial_usage_summary;

-- 建立 serial_usage_summary table
CREATE TABLE serial_usage_summary
(
    serial_number   VARCHAR(100)  NOT NULL
        PRIMARY KEY,
    total_use_count INT DEFAULT 0 NULL,
    fixture_id      VARCHAR(50)   NULL,
    customer_id     VARCHAR(50)   NULL,
    total_uses      INT DEFAULT 0 NULL,
    first_used_at   DATETIME      NULL,
    last_used_at    DATETIME      NULL,
    updated_at      DATETIME      NULL,
    last_station_id VARCHAR(50)   NULL,
    last_model_id   VARCHAR(50)   NULL,
    last_operator   VARCHAR(100)  NULL,
    CONSTRAINT fk_sus_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fk_sus_fixture
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE SET NULL
);

-- 建立 index
CREATE INDEX idx_sus_fixture
    ON serial_usage_summary (fixture_id);

CREATE INDEX idx_sus_last_used
    ON serial_usage_summary (last_used_at);









-- 若表存在先刪除
DROP TABLE IF EXISTS usage_logs;

-- 建立 usage_logs table
CREATE TABLE usage_logs
(
    id            INT AUTO_INCREMENT COMMENT '使用記錄ID'
        PRIMARY KEY,
    customer_id   VARCHAR(50)                                          NOT NULL COMMENT '客戶名稱',
    fixture_id    VARCHAR(50)                                          NOT NULL COMMENT '治具編號',
    serial_number VARCHAR(100)                                         NULL,
    record_level  ENUM ('fixture', 'serial') DEFAULT 'fixture'         NOT NULL,
    station_id    VARCHAR(50)                                          NULL COMMENT '站點代碼',
    model_id      VARCHAR(50)                                          NOT NULL,
    use_count     INT                                                  NOT NULL,
    operator      VARCHAR(100)                                         NULL COMMENT '操作人員',
    note          TEXT                                                 NULL COMMENT '備註',
    used_at       TIMESTAMP                  DEFAULT CURRENT_TIMESTAMP NULL COMMENT '使用時間',
    CONSTRAINT usage_logs_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT usage_logs_ibfk_2
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE,
    CONSTRAINT usage_logs_ibfk_4
        FOREIGN KEY (station_id) REFERENCES stations (id)
            ON DELETE SET NULL,
    CHECK (`use_count` > 0)
)
COMMENT '使用記錄表';

-- 建立 index
CREATE INDEX idx_customer
    ON usage_logs (customer_id);

CREATE INDEX idx_date_range
    ON usage_logs (used_at, fixture_id);

CREATE INDEX idx_fixture_time
    ON usage_logs (fixture_id, used_at);

CREATE INDEX idx_model_id
    ON usage_logs (model_id);

CREATE INDEX idx_operator
    ON usage_logs (operator);

CREATE INDEX idx_record_level
    ON usage_logs (record_level);

CREATE INDEX idx_serial_number
    ON usage_logs (serial_number);

CREATE INDEX idx_station
    ON usage_logs (station_id);









-- 若表存在先刪除
DROP TABLE IF EXISTS fixture_datecode_inventory;



CREATE TABLE fixture_datecode_inventory
(
    id            INT AUTO_INCREMENT COMMENT '日期碼庫存ID'
        PRIMARY KEY,
    customer_id   VARCHAR(50)                                                              NOT NULL COMMENT '客戶',
    fixture_id    VARCHAR(50)                                                              NOT NULL COMMENT '治具',
    datecode      VARCHAR(50)                                                              NOT NULL COMMENT '日期碼',
    available_qty INT                                          DEFAULT 0                   NOT NULL COMMENT '可用數量',
    returned_qty  INT                                          DEFAULT 0                   NOT NULL COMMENT '已退料數量',
    created_at    TIMESTAMP                                    DEFAULT CURRENT_TIMESTAMP   NULL,
    updated_at    TIMESTAMP                                    DEFAULT CURRENT_TIMESTAMP   NULL ON UPDATE CURRENT_TIMESTAMP,
    source_type   ENUM ('self_purchased', 'customer_supplied') DEFAULT 'customer_supplied' NOT NULL COMMENT '來源類型（與 fixture_serials 一致）',
    CONSTRAINT uk_fixture_datecode
        UNIQUE (customer_id, fixture_id, datecode),
    CONSTRAINT fixture_datecode_inventory_ibfk_1
        FOREIGN KEY (customer_id) REFERENCES customers (id),
    CONSTRAINT fixture_datecode_inventory_ibfk_2
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE
)
COMMENT '治具日期碼庫存（非序號）';

CREATE INDEX idx_datecode
    ON fixture_datecode_inventory (datecode);

CREATE INDEX idx_fixture
    ON fixture_datecode_inventory (fixture_id);







-- 若表存在先刪除
DROP TABLE IF EXISTS fixture_datecode_transactions;

-- auto-generated definition
CREATE TABLE fixture_datecode_transactions
(
    id               INT AUTO_INCREMENT COMMENT '日期碼庫存異動ID'
        PRIMARY KEY,
    transaction_id   INT                                 NOT NULL COMMENT '對應 material_transactions.id',
    customer_id      VARCHAR(50)                         NOT NULL COMMENT '客戶',
    fixture_id       VARCHAR(50)                         NOT NULL COMMENT '治具',
    datecode         VARCHAR(50)                         NOT NULL COMMENT '日期碼',
    transaction_type ENUM ('receipt', 'return')          NOT NULL COMMENT '異動類型',
    quantity         INT                                 NOT NULL COMMENT '異動數量',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL COMMENT '建立時間',
    CONSTRAINT fk_fdt_fixture
        FOREIGN KEY (fixture_id) REFERENCES fixtures (id)
            ON DELETE CASCADE,
    CONSTRAINT fk_fdt_transaction
        FOREIGN KEY (transaction_id) REFERENCES material_transactions (id)
            ON DELETE CASCADE
)
COMMENT '治具日期碼庫存異動明細（非序號 audit）';

-- 建立 index
CREATE INDEX idx_fixture_datecode
    ON fixture_datecode_transactions (fixture_id, datecode);

CREATE INDEX idx_tx
    ON fixture_datecode_transactions (transaction_id);







-- 若表存在先刪除
DROP TABLE IF EXISTS user_customers;

-- auto-generated definition
CREATE TABLE user_customers
(
    user_id     INT         NOT NULL COMMENT '使用者 ID',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶代碼',
    PRIMARY KEY (user_id, customer_id),
    CONSTRAINT fk_user_customers_user
        FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE
)
COMMENT '使用者可使用的客戶清單（多對多）';







