-- =====================================
-- 治具管理系統 - 資料庫重構腳本 v3.1
-- =====================================
-- 執行前請務必備份資料庫!
--
-- v3.1 更新內容 (2025-12-03):
-- 1. material_transactions 增加 source_type 欄位
-- 2. fixture_serials 移除 UNIQUE 約束，支援序號重複使用
-- 3. fixture_serials 增加 receipt_transaction_id, return_transaction_id
-- 4. fixture_serials 觸發器更新為自動同步 fixtures 數量
-- 5. 收料/退料存儲過程更新，同步更新 fixture_serials
-- 6. model_stations 與 fixture_requirements 增加複合唯一鍵
--
-- v3.0 主要變更:
-- 1. 所有業務主鍵改為 VARCHAR(50)
-- 2. 新增客戶總表,所有表按客戶分類
-- 3. 統一使用代理主鍵 (id) + 簡單外鍵
-- 4. 收料/退料的廠商欄位統一為 customer_id
-- =====================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================
-- 清理舊結構
-- =====================================
DROP VIEW IF EXISTS view_serial_status;
DROP VIEW IF EXISTS view_fixture_status;
DROP VIEW IF EXISTS view_model_max_stations;

DROP TABLE IF EXISTS deployment_history;
DROP TABLE IF EXISTS inventory_snapshots;
DROP TABLE IF EXISTS material_transaction_details;
DROP TABLE IF EXISTS material_transactions;
DROP TABLE IF EXISTS fixture_deployments;
DROP TABLE IF EXISTS fixture_requirements;
DROP TABLE IF EXISTS model_stations;
DROP TABLE IF EXISTS fixture_serials;
DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS replacement_logs;
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS returns_table;
DROP TABLE IF EXISTS fixtures;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS machine_models;
DROP TABLE IF EXISTS owners;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS customers;

-- =====================================
-- 1. 客戶總表
-- =====================================
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY COMMENT '客戶名稱 (直接使用客戶名稱作為主鍵)',
    customer_abbr VARCHAR(20) COMMENT '客戶簡稱',
    contact_person VARCHAR(100) COMMENT '聯絡人',
    contact_phone VARCHAR(20) COMMENT '聯絡電話',
    contact_email VARCHAR(100) COMMENT 'Email',
    address TEXT COMMENT '地址',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否啟用',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客戶總表';

-- =====================================
-- 2. 使用者表
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
-- 3. 負責人表
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='負責人表 (可跨客戶)';

-- =====================================
-- 4. 機種表
-- =====================================
CREATE TABLE machine_models (
    id VARCHAR(50) PRIMARY KEY COMMENT '機種代碼 (如: EDS-2008-LSFG)',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    model_name VARCHAR(255) NOT NULL COMMENT '機種名稱',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種表';

-- =====================================
-- 5. 站點表
-- =====================================
CREATE TABLE stations (
    id VARCHAR(50) PRIMARY KEY COMMENT '站點代碼 (如: T1_MP)',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    station_name VARCHAR(100) COMMENT '站點名稱',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站點表';

-- =====================================
-- 6. 治具主表
-- =====================================
CREATE TABLE fixtures (
    id VARCHAR(50) PRIMARY KEY COMMENT '治具編號 (如: L-3000-STD)',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_name VARCHAR(255) NOT NULL COMMENT '治具名稱',
    fixture_type VARCHAR(50) COMMENT '治具類型',
    serial_number VARCHAR(100) COMMENT '序號 (已廢棄,建議使用 fixture_serials 表)',
    self_purchased_qty INT DEFAULT 0 COMMENT '自購數量',
    customer_supplied_qty INT DEFAULT 0 COMMENT '客供數量',
    available_qty INT DEFAULT 0 COMMENT '可用數量',
    deployed_qty INT DEFAULT 0 COMMENT '已部署數量',
    maintenance_qty INT DEFAULT 0 COMMENT '維護中數量',
    scrapped_qty INT DEFAULT 0 COMMENT '報廢數量',
    returned_qty INT DEFAULT 0 COMMENT '已返還數量',
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
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_customer_status (customer_id, status),
    INDEX idx_fixture_type (fixture_type),
    INDEX idx_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具主表';

-- =====================================
-- 7. 序號表 (v3.1 更新)
-- =====================================
CREATE TABLE fixture_serials (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '序號記錄ID',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    serial_number VARCHAR(100) NOT NULL COMMENT '序號',  -- ⭐ 移除 UNIQUE，允許重複使用
    source_type ENUM('self_purchased', 'customer_supplied') NOT NULL COMMENT '來源類型',
    status ENUM('available', 'deployed', 'maintenance', 'scrapped', 'returned')
        DEFAULT 'available' COMMENT '狀態',
    current_station_id VARCHAR(50) COMMENT '當前部署站點',
    receipt_date DATE COMMENT '收料日期',
    return_date DATE COMMENT '退料日期',  -- ⭐ 新增
    receipt_transaction_id INT COMMENT '收料異動ID',  -- ⭐ 新增
    return_transaction_id INT COMMENT '退料異動ID',  -- ⭐ 新增
    last_use_date DATE COMMENT '最後使用日期',
    total_uses INT DEFAULT 0 COMMENT '累計使用次數',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ⭐ 複合唯一鍵：同一序號在同一收料記錄中只能出現一次
    UNIQUE KEY uk_serial_receipt (serial_number, receipt_transaction_id),

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (current_station_id) REFERENCES stations(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture_status (fixture_id, status),
    INDEX idx_serial (serial_number),  -- ⭐ 改為普通索引
    INDEX idx_serial_status (serial_number, status),
    INDEX idx_station (current_station_id),
    INDEX idx_source (source_type),
    INDEX idx_receipt_txn (receipt_transaction_id),  -- ⭐ 新增
    INDEX idx_return_txn (return_transaction_id)  -- ⭐ 新增
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='序號表';

-- =====================================
-- 8. 機種-站點關聯表 (v3.1 更新)
-- =====================================
CREATE TABLE model_stations (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '關聯記錄ID',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    model_id VARCHAR(50) NOT NULL COMMENT '機種代碼',
    station_id VARCHAR(50) NOT NULL COMMENT '站點代碼',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_customer_model_station (customer_id, model_id, station_id),  -- ⭐ 複合唯一鍵
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (model_id) REFERENCES machine_models(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_model (model_id),
    INDEX idx_station (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種-站點關聯表';

-- =====================================
-- 9. 治具-機種需求表
-- =====================================
CREATE TABLE fixture_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '需求記錄ID',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    model_id VARCHAR(50) NOT NULL COMMENT '機種代碼',
    station_id VARCHAR(50) NOT NULL COMMENT '站點代碼',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    required_qty INT DEFAULT 1 COMMENT '需求數量',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_customer_model_station_fixture (customer_id, model_id, station_id, fixture_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (model_id) REFERENCES machine_models(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_model (model_id),
    INDEX idx_station (station_id),
    INDEX idx_fixture (fixture_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具-機種需求表';

-- =====================================
-- 10. 治具-站點部署表
-- =====================================
CREATE TABLE fixture_deployments (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '部署記錄ID',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    station_id VARCHAR(50) NOT NULL COMMENT '站點代碼',
    deployed_qty INT DEFAULT 0 COMMENT '部署數量',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_customer_fixture_station (customer_id, fixture_id, station_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture (fixture_id),
    INDEX idx_station (station_id),
    INDEX idx_station_fixture (station_id, fixture_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具-站點部署表';

-- =====================================
-- 11. 使用記錄表
-- =====================================
CREATE TABLE usage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '使用記錄ID',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    serial_id INT COMMENT '序號ID',
    station_id VARCHAR(50) COMMENT '站點代碼',
    use_count INT DEFAULT 1 COMMENT '使用次數',
    abnormal_status VARCHAR(255) COMMENT '異常狀態',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '使用時間',
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (serial_id) REFERENCES fixture_serials(id) ON DELETE SET NULL,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture_time (fixture_id, used_at),
    INDEX idx_serial (serial_id),
    INDEX idx_station (station_id),
    INDEX idx_operator (operator),
    INDEX idx_date_range (used_at, fixture_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用記錄表';

-- =====================================
-- 12. 更換記錄表
-- =====================================
CREATE TABLE replacement_logs (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '更換記錄ID',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    replacement_date DATE NOT NULL COMMENT '更換日期',
    reason TEXT COMMENT '更換原因',
    executor VARCHAR(100) COMMENT '執行人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture_date (fixture_id, replacement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='更換記錄表';

-- =====================================
-- 13. 物料異動主表 (v3.1 更新)
-- =====================================
CREATE TABLE material_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '異動記錄ID',
    transaction_type ENUM('receipt', 'return', 'adjustment') NOT NULL COMMENT '異動類型',
    transaction_date DATE NOT NULL COMMENT '異動日期',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱 (廠商=客戶)',
    order_no VARCHAR(100) COMMENT '單號',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    source_type ENUM('self_purchased', 'customer_supplied')
        DEFAULT 'customer_supplied' COMMENT '來源類型: self_purchased=自購, customer_supplied=客供',  -- ⭐ 新增
    quantity INT NOT NULL DEFAULT 0 COMMENT '異動數量',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT COMMENT '建立人員ID',
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture_date (fixture_id, transaction_date),
    INDEX idx_order (order_no),
    INDEX idx_type_date (transaction_type, transaction_date),
    INDEX idx_operator (operator),
    INDEX idx_source (source_type)  -- ⭐ 新增
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料異動主表';

-- =====================================
-- 14. 物料異動明細表
-- =====================================
CREATE TABLE material_transaction_details (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '明細記錄ID',
    transaction_id INT NOT NULL COMMENT '異動主表ID',
    serial_number VARCHAR(100) NOT NULL COMMENT '序號',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_transaction_serial (transaction_id, serial_number),
    FOREIGN KEY (transaction_id) REFERENCES material_transactions(id) ON DELETE CASCADE,
    INDEX idx_serial (serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料異動明細表';

-- =====================================
-- 15. 庫存快照表
-- =====================================
CREATE TABLE inventory_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '快照記錄ID',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    snapshot_date DATE NOT NULL COMMENT '快照日期',
    available_qty INT DEFAULT 0 COMMENT '可用數量',
    deployed_qty INT DEFAULT 0 COMMENT '已部署數量',
    maintenance_qty INT DEFAULT 0 COMMENT '維護中數量',
    scrapped_qty INT DEFAULT 0 COMMENT '報廢數量',
    returned_qty INT DEFAULT 0 COMMENT '已返還數量',
    total_qty INT DEFAULT 0 COMMENT '總數量',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    UNIQUE KEY uk_customer_fixture_date (customer_id, fixture_id, snapshot_date),
    INDEX idx_customer (customer_id),
    INDEX idx_snapshot_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='庫存快照表';

-- =====================================
-- 16. 部署歷史表
-- =====================================
CREATE TABLE deployment_history (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '歷史記錄ID',
    serial_id INT NOT NULL COMMENT '序號ID',
    station_id VARCHAR(50) NOT NULL COMMENT '站點代碼',
    action ENUM('deploy', 'undeploy') NOT NULL COMMENT '動作',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (serial_id) REFERENCES fixture_serials(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    INDEX idx_serial_date (serial_id, created_at),
    INDEX idx_station_date (station_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部署歷史表';

-- =====================================
-- 觸發器 (Triggers) - v3.1 更新
-- =====================================

DELIMITER //

-- 觸發器1: 新增更換記錄時自動更新治具最近更換日期
DROP TRIGGER IF EXISTS trg_replacement_insert//
CREATE TRIGGER trg_replacement_insert
AFTER INSERT ON replacement_logs
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET last_replacement_date = NEW.replacement_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.fixture_id;
END//

-- 觸發器2: 刪除更換記錄時重新計算最近更換日期
DROP TRIGGER IF EXISTS trg_replacement_delete//
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
    WHERE id = OLD.fixture_id;
END//

-- 觸發器3: 修改更換記錄時重新計算最近更換日期
DROP TRIGGER IF EXISTS trg_replacement_update//
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
    WHERE id = NEW.fixture_id;
END//

-- ⭐ 觸發器4: 新增序號時更新統計 (v3.1 更新)
DROP TRIGGER IF EXISTS trg_serial_insert//
CREATE TRIGGER trg_serial_insert
AFTER INSERT ON fixture_serials
FOR EACH ROW
BEGIN
    UPDATE fixtures SET
        available_qty = available_qty + IF(NEW.status = 'available', 1, 0),
        deployed_qty = deployed_qty + IF(NEW.status = 'deployed', 1, 0),
        maintenance_qty = maintenance_qty + IF(NEW.status = 'maintenance', 1, 0),
        scrapped_qty = scrapped_qty + IF(NEW.status = 'scrapped', 1, 0),
        returned_qty = returned_qty + IF(NEW.status = 'returned', 1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.fixture_id;

    -- 更新來源數量
    IF NEW.source_type = 'self_purchased' THEN
        UPDATE fixtures
        SET self_purchased_qty = self_purchased_qty + 1
        WHERE id = NEW.fixture_id;
    ELSE
        UPDATE fixtures
        SET customer_supplied_qty = customer_supplied_qty + 1
        WHERE id = NEW.fixture_id;
    END IF;
END//

-- ⭐ 觸發器5: 序號狀態變更時更新統計 (v3.1 更新)
DROP TRIGGER IF EXISTS trg_serial_status_update//
CREATE TRIGGER trg_serial_status_update
AFTER UPDATE ON fixture_serials
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        UPDATE fixtures SET
            available_qty = (
                SELECT COUNT(*) FROM fixture_serials
                WHERE fixture_id = NEW.fixture_id AND status = 'available'
            ),
            deployed_qty = (
                SELECT COUNT(*) FROM fixture_serials
                WHERE fixture_id = NEW.fixture_id AND status = 'deployed'
            ),
            maintenance_qty = (
                SELECT COUNT(*) FROM fixture_serials
                WHERE fixture_id = NEW.fixture_id AND status = 'maintenance'
            ),
            scrapped_qty = (
                SELECT COUNT(*) FROM fixture_serials
                WHERE fixture_id = NEW.fixture_id AND status = 'scrapped'
            ),
            returned_qty = (
                SELECT COUNT(*) FROM fixture_serials
                WHERE fixture_id = NEW.fixture_id AND status = 'returned'
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.fixture_id;
    END IF;
END//

-- ⭐ 觸發器6: 刪除序號時更新統計 (v3.1 更新)
DROP TRIGGER IF EXISTS trg_serial_delete//
CREATE TRIGGER trg_serial_delete
AFTER DELETE ON fixture_serials
FOR EACH ROW
BEGIN
    UPDATE fixtures SET
        available_qty = available_qty - IF(OLD.status = 'available', 1, 0),
        deployed_qty = deployed_qty - IF(OLD.status = 'deployed', 1, 0),
        maintenance_qty = maintenance_qty - IF(OLD.status = 'maintenance', 1, 0),
        scrapped_qty = scrapped_qty - IF(OLD.status = 'scrapped', 1, 0),
        returned_qty = returned_qty - IF(OLD.status = 'returned', 1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.fixture_id;

    -- 更新來源數量
    IF OLD.source_type = 'self_purchased' THEN
        UPDATE fixtures
        SET self_purchased_qty = self_purchased_qty - 1
        WHERE id = OLD.fixture_id;
    ELSE
        UPDATE fixtures
        SET customer_supplied_qty = customer_supplied_qty - 1
        WHERE id = OLD.fixture_id;
    END IF;
END//

-- 觸發器7: 記錄部署歷史
DROP TRIGGER IF EXISTS trg_record_deployment//
CREATE TRIGGER trg_record_deployment
AFTER UPDATE ON fixture_serials
FOR EACH ROW
BEGIN
    -- 記錄部署動作
    IF OLD.status != 'deployed' AND NEW.status = 'deployed' THEN
        INSERT INTO deployment_history (serial_id, station_id, action, created_at)
        VALUES (NEW.id, NEW.current_station_id, 'deploy', CURRENT_TIMESTAMP);
    END IF;

    -- 記錄取消部署動作
    IF OLD.status = 'deployed' AND NEW.status != 'deployed' THEN
        INSERT INTO deployment_history (serial_id, station_id, action, created_at)
        VALUES (NEW.id, OLD.current_station_id, 'undeploy', CURRENT_TIMESTAMP);
    END IF;
END//

-- 觸發器8: 使用記錄更新序號使用次數
DROP TRIGGER IF EXISTS trg_update_serial_usage//
CREATE TRIGGER trg_update_serial_usage
AFTER INSERT ON usage_logs
FOR EACH ROW
BEGIN
    IF NEW.serial_id IS NOT NULL THEN
        UPDATE fixture_serials SET
            total_uses = total_uses + NEW.use_count,
            last_use_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.serial_id;
    END IF;
END//

DELIMITER ;

-- =====================================
-- 視圖 (Views)
-- =====================================

-- 視圖1: 治具狀況總覽
CREATE VIEW view_fixture_status AS
SELECT
    f.id AS fixture_id,
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
    (f.self_purchased_qty + f.customer_supplied_qty) AS total_qty,
    GROUP_CONCAT(DISTINCT s.id ORDER BY s.id SEPARATOR ', ') AS deployed_stations,
    f.last_replacement_date,
    f.replacement_cycle,
    f.cycle_unit,
    CASE
        WHEN f.cycle_unit = 'uses' THEN
            CASE
                WHEN (SELECT SUM(total_uses) FROM fixture_serials WHERE fixture_id = f.id) >= f.replacement_cycle
                THEN '需更換'
                ELSE '正常'
            END
        WHEN f.cycle_unit = 'days' AND f.last_replacement_date IS NOT NULL THEN
            CASE
                WHEN DATEDIFF(CURDATE(), f.last_replacement_date) >= f.replacement_cycle
                THEN '需更換'
                ELSE '正常'
            END
        ELSE '正常'
    END AS replacement_status,
    o.primary_owner,
    o.secondary_owner,
    f.note,
    f.created_at,
    f.updated_at
FROM fixtures f
LEFT JOIN fixture_serials fs
    ON f.id = fs.fixture_id AND fs.status = 'deployed'
LEFT JOIN stations s
    ON fs.current_station_id = s.id
LEFT JOIN owners o ON f.owner_id = o.id
GROUP BY f.id, f.customer_id, f.fixture_name, f.fixture_type, f.storage_location,
         f.status, f.self_purchased_qty, f.customer_supplied_qty,
         f.available_qty, f.deployed_qty, f.maintenance_qty, f.scrapped_qty, f.returned_qty,
         f.last_replacement_date, f.replacement_cycle, f.cycle_unit,
         o.primary_owner, o.secondary_owner, f.note, f.created_at, f.updated_at;

-- 視圖2: 機種最大開站數
CREATE VIEW view_model_max_stations AS
SELECT
    mm.id AS model_id,
    mm.customer_id,
    mm.model_name,
    ms.station_id,
    s.station_name,
    MIN(
        FLOOR(
            (SELECT COUNT(*)
             FROM fixture_serials fs
             WHERE fs.fixture_id = fr.fixture_id
               AND fs.status = 'available')
            /
            fr.required_qty
        )
    ) AS max_available_stations,
    GROUP_CONCAT(
        CONCAT(ft.fixture_name, '(', f.available_qty, '/', fr.required_qty, ')')
        ORDER BY f.available_qty / fr.required_qty
        SEPARATOR ', '
    ) AS limiting_fixtures
FROM machine_models mm
JOIN model_stations ms
    ON mm.id = ms.model_id
JOIN stations s
    ON ms.station_id = s.id
JOIN fixture_requirements fr
    ON mm.id = fr.model_id
   AND ms.station_id = fr.station_id
JOIN fixtures f
    ON fr.fixture_id = f.id
LEFT JOIN fixtures ft
    ON fr.fixture_id = ft.id
WHERE f.status = '正常' AND f.available_qty > 0
GROUP BY
    mm.id,
    mm.customer_id,
    mm.model_name,
    ms.station_id,
    s.station_name;

-- 視圖3: 序號狀態總覽
CREATE VIEW view_serial_status AS
SELECT
    fs.id AS serial_id,
    fs.customer_id,
    fs.serial_number,
    fs.fixture_id,
    f.fixture_name,
    fs.source_type,
    fs.status,
    s.id AS current_station,
    s.station_name,
    fs.receipt_date,
    fs.return_date,
    fs.last_use_date,
    fs.total_uses,
    f.replacement_cycle,
    f.cycle_unit,
    CASE
        WHEN f.cycle_unit = 'uses' AND fs.total_uses >= f.replacement_cycle THEN '需更換'
        WHEN f.cycle_unit = 'days' AND fs.last_use_date IS NOT NULL
             AND DATEDIFF(CURDATE(), fs.last_use_date) >= f.replacement_cycle THEN '需更換'
        ELSE '正常'
    END AS usage_status,
    fs.note,
    fs.created_at,
    fs.updated_at
FROM fixture_serials fs
JOIN fixtures f ON fs.fixture_id = f.id
LEFT JOIN stations s ON fs.current_station_id = s.id;

-- =====================================
-- 存儲過程 (Stored Procedures) - v3.1 更新
-- =====================================

DELIMITER //

-- ⭐ 存儲過程1: 收料作業 (v3.1 更新 - 同步 fixture_serials)
DROP PROCEDURE IF EXISTS sp_material_receipt//
CREATE PROCEDURE sp_material_receipt(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_transaction_date DATE,
    IN p_order_no VARCHAR(100),
    IN p_source_type ENUM('self_purchased', 'customer_supplied'),
    IN p_serials TEXT,
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_user_id INT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;
    DECLARE v_count INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = '收料作業失敗,已回滾';
        SET p_transaction_id = NULL;
    END;

    START TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id) THEN
        SET p_message = '客戶不存在';
        SET p_transaction_id = NULL;
        ROLLBACK;
    ELSEIF NOT EXISTS (SELECT 1 FROM fixtures WHERE id = p_fixture_id AND customer_id = p_customer_id) THEN
        SET p_message = '治具編號不存在或不屬於該客戶';
        SET p_transaction_id = NULL;
        ROLLBACK;
    ELSE
        -- 創建異動記錄 (包含 source_type)
        INSERT INTO material_transactions (
            transaction_type, transaction_date, customer_id, order_no,
            fixture_id, source_type, quantity, operator, note, created_by
        ) VALUES (
            'receipt', p_transaction_date, p_customer_id, p_order_no,
            p_fixture_id, p_source_type, 0, p_operator, p_note, p_user_id
        );

        SET p_transaction_id = LAST_INSERT_ID();

        -- 處理序號
        IF p_serials IS NOT NULL AND LENGTH(TRIM(p_serials)) > 0 THEN
            SET p_serials = CONCAT(TRIM(p_serials), ',');

            WHILE LENGTH(p_serials) > 0 DO
                SET v_pos = LOCATE(',', p_serials);
                SET v_serial = TRIM(SUBSTRING(p_serials, 1, v_pos - 1));
                SET p_serials = SUBSTRING(p_serials, v_pos + 1);

                IF LENGTH(v_serial) > 0 THEN
                    -- ⭐ 新增到 fixture_serials (觸發器會自動更新 fixtures)
                    INSERT INTO fixture_serials (
                        customer_id, fixture_id, serial_number,
                        source_type, status, receipt_date, receipt_transaction_id
                    ) VALUES (
                        p_customer_id, p_fixture_id, v_serial,
                        p_source_type, 'available', p_transaction_date, p_transaction_id
                    );

                    -- 新增異動明細
                    INSERT INTO material_transaction_details (transaction_id, serial_number)
                    VALUES (p_transaction_id, v_serial);

                    SET v_count = v_count + 1;
                END IF;
            END WHILE;
        END IF;

        -- 更新異動數量
        UPDATE material_transactions
        SET quantity = v_count
        WHERE id = p_transaction_id;

        COMMIT;
        SET p_message = CONCAT('收料成功,共 ', v_count, ' 個序號 (',
            CASE p_source_type WHEN 'self_purchased' THEN '自購' ELSE '客供' END, ')');
    END IF;
END//

-- ⭐ 存儲過程2: 退料作業 (v3.1 更新 - 同步 fixture_serials)
DROP PROCEDURE IF EXISTS sp_material_return//
CREATE PROCEDURE sp_material_return(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_transaction_date DATE,
    IN p_order_no VARCHAR(100),
    IN p_serials TEXT,
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_user_id INT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_self_purchased_count INT DEFAULT 0;
    DECLARE v_customer_supplied_count INT DEFAULT 0;
    DECLARE v_source_type ENUM('self_purchased', 'customer_supplied');
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = '退料作業失敗,已回滾';
        SET p_transaction_id = NULL;
    END;

    START TRANSACTION;

    -- 創建退料記錄
    INSERT INTO material_transactions (
        transaction_type, transaction_date, customer_id, order_no,
        fixture_id, quantity, operator, note, created_by
    ) VALUES (
        'return', p_transaction_date, p_customer_id, p_order_no,
        p_fixture_id, 0, p_operator, p_note, p_user_id
    );

    SET p_transaction_id = LAST_INSERT_ID();

    -- 處理序號
    IF p_serials IS NOT NULL AND LENGTH(TRIM(p_serials)) > 0 THEN
        SET p_serials = CONCAT(TRIM(p_serials), ',');

        WHILE LENGTH(p_serials) > 0 DO
            SET v_pos = LOCATE(',', p_serials);
            SET v_serial = TRIM(SUBSTRING(p_serials, 1, v_pos - 1));
            SET p_serials = SUBSTRING(p_serials, v_pos + 1);

            IF LENGTH(v_serial) > 0 THEN
                -- ⭐ 從 fixture_serials 查詢來源類型
                SELECT source_type INTO v_source_type
                FROM fixture_serials
                WHERE serial_number = v_serial
                  AND fixture_id = p_fixture_id
                  AND customer_id = p_customer_id
                  AND status = 'available'
                ORDER BY receipt_date DESC, id DESC
                LIMIT 1;

                IF v_source_type IS NOT NULL THEN
                    -- ⭐ 更新 fixture_serials 狀態 (觸發器會自動更新 fixtures)
                    UPDATE fixture_serials
                    SET status = 'returned',
                        return_date = p_transaction_date,
                        return_transaction_id = p_transaction_id,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE serial_number = v_serial
                      AND fixture_id = p_fixture_id
                      AND customer_id = p_customer_id
                      AND status = 'available'
                    ORDER BY receipt_date DESC, id DESC
                    LIMIT 1;

                    -- 新增退料明細
                    INSERT INTO material_transaction_details (transaction_id, serial_number)
                    VALUES (p_transaction_id, v_serial);

                    -- 統計
                    IF v_source_type = 'self_purchased' THEN
                        SET v_self_purchased_count = v_self_purchased_count + 1;
                    ELSE
                        SET v_customer_supplied_count = v_customer_supplied_count + 1;
                    END IF;

                    SET v_count = v_count + 1;
                END IF;

                SET v_source_type = NULL;
            END IF;
        END WHILE;
    END IF;

    -- 更新異動數量
    UPDATE material_transactions
    SET quantity = v_count
    WHERE id = p_transaction_id;

    COMMIT;
    SET p_message = CONCAT('退料成功,共 ', v_count, ' 個序號 (自購:',
        v_self_purchased_count, ', 客供:', v_customer_supplied_count, ')');
END//

-- 存儲過程3: 每日庫存快照
DROP PROCEDURE IF EXISTS sp_create_daily_snapshot//
CREATE PROCEDURE sp_create_daily_snapshot(
    IN p_snapshot_date DATE,
    IN p_customer_id VARCHAR(50)
)
BEGIN
    IF p_customer_id IS NULL THEN
        INSERT INTO inventory_snapshots (
            customer_id, fixture_id, snapshot_date,
            available_qty, deployed_qty, maintenance_qty, scrapped_qty, returned_qty, total_qty
        )
        SELECT
            customer_id,
            id,
            p_snapshot_date,
            available_qty,
            deployed_qty,
            maintenance_qty,
            scrapped_qty,
            returned_qty,
            (self_purchased_qty + customer_supplied_qty) AS total_qty
        FROM fixtures
        ON DUPLICATE KEY UPDATE
            available_qty = VALUES(available_qty),
            deployed_qty = VALUES(deployed_qty),
            maintenance_qty = VALUES(maintenance_qty),
            scrapped_qty = VALUES(scrapped_qty),
            returned_qty = VALUES(returned_qty),
            total_qty = VALUES(total_qty);
    ELSE
        INSERT INTO inventory_snapshots (
            customer_id, fixture_id, snapshot_date,
            available_qty, deployed_qty, maintenance_qty, scrapped_qty, returned_qty, total_qty
        )
        SELECT
            customer_id,
            id,
            p_snapshot_date,
            available_qty,
            deployed_qty,
            maintenance_qty,
            scrapped_qty,
            returned_qty,
            (self_purchased_qty + customer_supplied_qty) AS total_qty
        FROM fixtures
        WHERE customer_id = p_customer_id
        ON DUPLICATE KEY UPDATE
            available_qty = VALUES(available_qty),
            deployed_qty = VALUES(deployed_qty),
            maintenance_qty = VALUES(maintenance_qty),
            scrapped_qty = VALUES(scrapped_qty),
            returned_qty = VALUES(returned_qty),
            total_qty = VALUES(total_qty);
    END IF;
END//

DELIMITER ;

-- =====================================
-- 初始資料
-- =====================================

-- 插入預設管理員帳號 (密碼: admin123, SHA-256)
INSERT INTO users (username, password_hash, role, full_name) VALUES
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', '系統管理員');

-- 插入範例客戶 (請根據實際情況修改)
INSERT INTO customers (id, customer_abbr, is_active) VALUES
('範例客戶A', '客戶A', TRUE),
('範例客戶B', '客戶B', TRUE);

-- 插入範例站點 (請根據實際情況修改客戶)
INSERT INTO stations (id, customer_id, station_name) VALUES
('T1_MP', '範例客戶A', 'T1_MP站'),
('T2_STD', '範例客戶A', 'T2(標溫)站'),
('T2_WIDE', '範例客戶A', 'T2(寬溫)站'),
('T3_MAC', '範例客戶A', 'T3_MAC站'),
('T3_ASQC', '範例客戶A', 'T3_ASQC站'),
('T3_STG', '範例客戶A', 'T3_STG站');

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================
-- 完成訊息
-- =====================================
SELECT '✅ 資料庫重構 v3.1 完成！' AS message;
SELECT '========================================' AS line;
SELECT '📋 v3.1 主要更新:' AS info;
SELECT '  1. ✅ material_transactions 增加 source_type' AS update1;
SELECT '  2. ✅ fixture_serials 支援序號重複使用' AS update2;
SELECT '  3. ✅ 觸發器自動同步數量' AS update3;
SELECT '  4. ✅ 存儲過程同步 fixture_serials' AS update4;
SELECT '  5. ✅ model_stations 增加複合唯一鍵' AS update5;
SELECT '========================================' AS line;
SELECT '🔑 預設管理員: admin / admin123' AS admin_info;
SELECT '⚠️  請修改範例客戶和站點資料!' AS warning;
SELECT '========================================' AS line;