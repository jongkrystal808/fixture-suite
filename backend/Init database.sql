-- =====================================
-- 治具管理系統 - 資料庫初始化腳本
-- =====================================

-- 設定字元集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 防止重複執行時出錯
DROP VIEW IF EXISTS view_fixture_status;
DROP VIEW IF EXISTS view_model_max_stations;

DROP TABLE IF EXISTS fixture_deployments;
DROP TABLE IF EXISTS fixture_requirements;
DROP TABLE IF EXISTS model_stations;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS replacement_logs;
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS returns_table;
DROP TABLE IF EXISTS fixtures;
DROP TABLE IF EXISTS machine_models;
DROP TABLE IF EXISTS owners;
DROP TABLE IF EXISTS users;

-- =====================================
-- 1. 使用者表 (users)
-- =====================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '工號/帳號',
    password_hash VARCHAR(255) NOT NULL COMMENT '密碼雜湊',
    role ENUM('admin', 'user') DEFAULT 'user' COMMENT '角色: admin=管理員, user=一般使用者',
    full_name VARCHAR(100) COMMENT '姓名',
    email VARCHAR(255) COMMENT 'Email',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者表';

-- =====================================
-- 2. 負責人表 (owners)
-- =====================================
CREATE TABLE owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) COMMENT '客戶名稱',
    primary_owner VARCHAR(100) NOT NULL COMMENT '主負責人',
    secondary_owner VARCHAR(100) COMMENT '副負責人',
    email VARCHAR(255) COMMENT 'Email',
    note TEXT COMMENT '備註',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='負責人表';

-- =====================================
-- 3. 治具主表 (fixtures)
-- =====================================
CREATE TABLE fixtures (
    fixture_id VARCHAR(50) PRIMARY KEY COMMENT '治具編號',
    fixture_name VARCHAR(255) NOT NULL COMMENT '治具名稱',
    fixture_type VARCHAR(50) COMMENT '治具類型',
    serial_number VARCHAR(100) UNIQUE COMMENT '序號',
    self_purchased_qty INT DEFAULT 0 COMMENT '自購數量',
    customer_supplied_qty INT DEFAULT 0 COMMENT '客供數量',
    total_qty INT GENERATED ALWAYS AS (self_purchased_qty + customer_supplied_qty) STORED COMMENT '總數量',
    storage_location VARCHAR(100) COMMENT '儲存位置',
    replacement_cycle DECIMAL(10,2) COMMENT '更換週期',
    cycle_unit ENUM('days', 'uses', 'none') DEFAULT 'uses' COMMENT '週期單位',
    status ENUM('正常', '返還', '報廢') DEFAULT '正常' COMMENT '狀態',
    last_replacement_date DATE COMMENT '最近更換日期',
    last_notification_time TIMESTAMP NULL COMMENT '最後通知時間',
    owner_id INT COMMENT '負責人ID',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL,
    INDEX idx_fixture_status (status),
    INDEX idx_fixture_owner (owner_id),
    INDEX idx_fixture_type (fixture_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具主表';

-- =====================================
-- 4. 機種表 (machine_models)
-- =====================================
CREATE TABLE machine_models (
    model_id VARCHAR(50) PRIMARY KEY COMMENT '機種代碼',
    model_name VARCHAR(255) NOT NULL COMMENT '機種名稱',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種表';

-- =====================================
-- 5. 站點表 (stations)
-- =====================================
CREATE TABLE stations (
    station_id INT AUTO_INCREMENT PRIMARY KEY,
    station_code VARCHAR(50) UNIQUE NOT NULL COMMENT '站點代碼',
    station_name VARCHAR(100) COMMENT '站點名稱',
    note TEXT COMMENT '備註'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站點表';

-- =====================================
-- 6. 機種-站點關聯表 (model_stations)
-- =====================================
CREATE TABLE model_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id VARCHAR(50) NOT NULL,
    station_id INT NOT NULL,
    UNIQUE KEY uk_model_station (model_id, station_id),
    FOREIGN KEY (model_id) REFERENCES machine_models(model_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種-站點關聯表';

-- =====================================
-- 7. 治具-機種需求表 (fixture_requirements)
-- =====================================
CREATE TABLE fixture_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id VARCHAR(50) NOT NULL COMMENT '機種代碼',
    station_id INT NOT NULL COMMENT '站點ID',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    required_qty INT DEFAULT 1 COMMENT '需求數量',
    UNIQUE KEY uk_model_station_fixture (model_id, station_id, fixture_id),
    FOREIGN KEY (model_id) REFERENCES machine_models(model_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id) ON DELETE CASCADE,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(fixture_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具-機種需求表';

    -- =====================================
    -- 8. 治具-站點部署表 (fixture_deployments)
    -- =====================================
    CREATE TABLE fixture_deployments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
        station_id INT NOT NULL COMMENT '站點ID',
        deployed_qty INT DEFAULT 0 COMMENT '部署數量',
        UNIQUE KEY uk_fixture_station (fixture_id, station_id),
        FOREIGN KEY (fixture_id) REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
        FOREIGN KEY (station_id) REFERENCES stations(station_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具-站點部署表';

-- =====================================
-- 9. 使用記錄表 (usage_logs)
-- =====================================
CREATE TABLE usage_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    station_id INT COMMENT '站點ID',
    use_count INT DEFAULT 1 COMMENT '使用次數',
    abnormal_status VARCHAR(255) COMMENT '異常狀態',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '使用時間',
    FOREIGN KEY (fixture_id) REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(station_id) ON DELETE SET NULL,
    INDEX idx_fixture_time (fixture_id, used_at),
    INDEX idx_station (station_id),
    INDEX idx_operator (operator)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用記錄表';

-- =====================================
-- 10. 更換記錄表 (replacement_logs)
-- =====================================
CREATE TABLE replacement_logs (
    replacement_id INT AUTO_INCREMENT PRIMARY KEY,
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    replacement_date DATE NOT NULL COMMENT '更換日期',
    reason TEXT COMMENT '更換原因',
    executor VARCHAR(100) COMMENT '執行人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    INDEX idx_fixture_date (fixture_id, replacement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='更換記錄表';

-- =====================================
-- 11. 收料記錄表 (receipts)
-- =====================================
CREATE TABLE receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('batch', 'individual') DEFAULT 'batch' COMMENT '類型: batch=批量, individual=少量',
    vendor VARCHAR(100) COMMENT '廠商',
    order_no VARCHAR(100) COMMENT '單號',
    fixture_code VARCHAR(50) COMMENT '治具編號',
    serial_start VARCHAR(100) COMMENT '流水號起始',
    serial_end VARCHAR(100) COMMENT '流水號結束',
    serials TEXT COMMENT '序號列表(逗號分隔)',
    operator VARCHAR(100) COMMENT '收料人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fixture (fixture_code),
    INDEX idx_order (order_no),
    INDEX idx_operator (operator)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收料記錄表';

-- =====================================
-- 12. 退料記錄表 (returns_table)
-- =====================================
CREATE TABLE returns_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('batch', 'individual') DEFAULT 'batch' COMMENT '類型: batch=批量, individual=少量',
    vendor VARCHAR(100) COMMENT '廠商',
    order_no VARCHAR(100) COMMENT '單號',
    fixture_code VARCHAR(50) COMMENT '治具編號',
    serial_start VARCHAR(100) COMMENT '流水號起始',
    serial_end VARCHAR(100) COMMENT '流水號結束',
    serials TEXT COMMENT '序號列表(逗號分隔)',
    operator VARCHAR(100) COMMENT '退料人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fixture (fixture_code),
    INDEX idx_order (order_no),
    INDEX idx_operator (operator)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退料記錄表';

-- =====================================
-- 觸發器 (Triggers)
-- =====================================

DELIMITER //

-- 觸發器1: 新增更換記錄時自動更新治具最近更換日期
CREATE TRIGGER trg_replacement_insert
AFTER INSERT ON replacement_logs
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET last_replacement_date = NEW.replacement_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE fixture_id = NEW.fixture_id;
END;
//

-- 觸發器2: 刪除更換記錄時重新計算最近更換日期
CREATE TRIGGER trg_replacement_delete
AFTER DELETE ON replacement_logs
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET last_replacement_date = (
        SELECT MAX(replacement_date)
        FROM replacement_logs
        WHERE fixture_id = OLD.fixture_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE fixture_id = OLD.fixture_id;
END;
//

-- 觸發器3: 修改更換記錄時重新計算最近更換日期
CREATE TRIGGER trg_replacement_update
AFTER UPDATE ON replacement_logs
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET last_replacement_date = (
        SELECT MAX(replacement_date)
        FROM replacement_logs
        WHERE fixture_id = NEW.fixture_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE fixture_id = NEW.fixture_id;
END;
//

DELIMITER ;

-- =====================================
-- 視圖 (Views)
-- =====================================

-- 視圖1: 治具狀況總覽
CREATE VIEW view_fixture_status AS
SELECT
    f.fixture_id,
    f.fixture_name,
    f.serial_number,
    f.storage_location,
    f.status,
    GROUP_CONCAT(DISTINCT s.station_code ORDER BY s.station_code) AS deployed_stations,
    COALESCE(SUM(ul.use_count), 0) AS total_uses,
    f.last_replacement_date,
    f.last_notification_time,
    f.replacement_cycle,
    f.cycle_unit,
    CASE
        WHEN f.cycle_unit = 'uses' AND COALESCE(SUM(ul.use_count), 0) >= f.replacement_cycle THEN '需更換'
        WHEN f.cycle_unit = 'days' AND f.last_replacement_date IS NOT NULL
             AND DATEDIFF(NOW(), f.last_replacement_date) >= f.replacement_cycle THEN '需更換'
        ELSE '正常'
    END AS replacement_status,
    o.primary_owner AS owner,
    f.note
FROM fixtures f
LEFT JOIN fixture_deployments fd ON f.fixture_id = fd.fixture_id
LEFT JOIN stations s ON fd.station_id = s.station_id
LEFT JOIN usage_logs ul ON f.fixture_id = ul.fixture_id
LEFT JOIN owners o ON f.owner_id = o.id
GROUP BY f.fixture_id, f.fixture_name, f.serial_number, f.storage_location,
         f.status, f.last_replacement_date, f.last_notification_time,
         f.replacement_cycle, f.cycle_unit, o.primary_owner, f.note;

-- 視圖2: 機種最大開站數
CREATE VIEW view_m  odel_max_stations AS
SELECT
    mm.model_id,
    mm.model_name,
    ms.station_id,
    s.station_code,
    MIN(
        FLOOR(
            (f.self_purchased_qty + f.customer_supplied_qty) / fr.required_qty
        )
    ) AS max_stations_for_this_station
FROM machine_models mm
JOIN model_stations ms ON mm.model_id = ms.model_id
JOIN stations s ON ms.station_id = s.station_id
JOIN fixture_requirements fr ON mm.model_id = fr.model_id AND ms.station_id = fr.station_id
JOIN fixtures f ON fr.fixture_id = f.fixture_id
WHERE f.status = '正常'
GROUP BY mm.model_id, mm.model_name, ms.station_id, s.station_code;

-- =====================================
-- 初始資料
-- =====================================

-- 插入預設管理員帳號 (密碼: admin123, SHA-256)
INSERT INTO users (username, password_hash, role, full_name) VALUES
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', '系統管理員');

-- 插入預設站點
INSERT INTO stations (station_code, station_name) VALUES
('T1_MP', 'T1_MP站'),
('T2_STD', 'T2(標溫)站'),
('T2_WIDE', 'T2(寬溫)站'),
('T3_MAC', 'T3_MAC站'),
('T3_ASQC', 'T3_ASQC站'),
('T3_STG', 'T3_STG站');

SET FOREIGN_KEY_CHECKS = 1;

-- 顯示完成訊息
SELECT '✅ 資料庫初始化完成！' AS message;
SELECT '🔑 預設管理員帳號: admin / 密碼: admin123' AS info;