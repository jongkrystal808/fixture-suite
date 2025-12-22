-- =====================================
-- 治具管理系統 - 資料庫初始化腳本 v4.0
-- =====================================
-- 執行前請務必備份資料庫!
--
-- v4.0 更新內容 (2025-12-08):
-- 1. Datecode 模式不再產生序號
-- 2. Datecode 模式不寫入 material_transaction_details
-- 3. Datecode 模式不操作 fixture_serials / 不觸發序號 Trigger
-- 4. Datecode 收料 / 退料僅更新:
--    - material_transactions.quantity / datecode / record_type
--    - fixtures 匯總數量 (收料: 自購/客供 + available；退料: available 減少, returned 增加)
--
-- v3.2 更新內容 (2025-01-21):
-- 1. material_transactions 增加 record_type 欄位 (batch/individual/datecode)
-- 2. material_transactions 增加 datecode 欄位
-- 3. sp_material_receipt 支援日期碼模式 (已於 v4.0 調整行為)
-- 4. sp_material_return 支援日期碼模式 (已於 v4.0 調整行為)
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
-- 2. 新增客戶總表, 所有表按客戶分類
-- 3. 統一使用代理主鍵 (id) + 簡單外鍵
-- 4. 收料/退料的廠商欄位統一為 customer_id
-- =====================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================
-- 清理舊結構
-- =====================================
DROP VIEW IF EXISTS view_fixture_status;
DROP VIEW IF EXISTS view_serial_status;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES ('bng','BNG',NULL,NULL,NULL,NULL,1,NULL,'2025-12-05 03:17:09','2025-12-05 03:17:09'),('moxa','MOXA',NULL,NULL,NULL,NULL,1,NULL,'2025-11-19 09:16:08','2025-11-19 09:16:08'),('test','test',NULL,NULL,NULL,NULL,1,NULL,'2025-12-05 03:17:09','2025-12-05 03:17:09');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;


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

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9','admin','系統管理員',NULL,1,'2025-11-18 11:59:03','2025-11-18 11:59:03'),(2,'godric','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','admin',NULL,NULL,1,'2025-11-19 09:25:25','2025-11-26 10:58:06'),(3,'100182','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','admin',NULL,NULL,1,'2025-11-19 09:25:25','2025-11-26 10:58:06'),(4,'100983','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','admin',NULL,NULL,1,'2025-11-19 09:25:25','2025-11-26 10:58:06'),(5,'100950','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','admin',NULL,NULL,1,'2025-11-19 09:25:25','2025-11-26 10:58:06'),(6,'101014','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','admin','claire','Claire_Huang@diamondnpi.com',1,'2025-11-27 00:46:40','2025-11-27 00:46:40'),(7,'101015','03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4','admin',NULL,NULL,1,'2025-11-19 09:25:25','2025-11-27 00:46:40');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

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
    serial_number VARCHAR(100) COMMENT '序號 (已廢棄, 建議使用 fixture_serials 表)',
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
    receipt_date DATE COMMENT '收料日期',
    return_date DATE COMMENT '退料日期',
    receipt_transaction_id INT COMMENT '收料交易ID',  -- ⭐ v3.1 新增
    return_transaction_id INT COMMENT '退料交易ID',   -- ⭐ v3.1 新增
    deployment_id INT COMMENT '部署ID',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture (fixture_id),
    INDEX idx_serial (serial_number),
    INDEX idx_status (status),
    INDEX idx_customer_fixture (customer_id, fixture_id),
    INDEX idx_receipt_transaction (receipt_transaction_id),
    INDEX idx_return_transaction (return_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='序號表 (支援序號重複使用)';

-- =====================================
-- 8. 機種站點關聯表 (v3.1 更新)
-- =====================================
CREATE TABLE model_stations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    model_id VARCHAR(50) NOT NULL COMMENT '機種代碼',
    station_id VARCHAR(50) NOT NULL COMMENT '站點代碼',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (model_id) REFERENCES machine_models(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    UNIQUE KEY uk_model_station (model_id, station_id),  -- ⭐ v3.1 新增複合唯一鍵
    INDEX idx_customer (customer_id),
    INDEX idx_model (model_id),
    INDEX idx_station (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種站點關聯表';

-- =====================================
-- 9. 治具需求表 (v3.1 更新)
-- =====================================
CREATE TABLE fixture_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    model_id VARCHAR(50) NOT NULL COMMENT '機種代碼',
    station_id VARCHAR(50) NOT NULL COMMENT '站點代碼',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    required_qty INT DEFAULT 1 COMMENT '需求數量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (model_id) REFERENCES machine_models(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    UNIQUE KEY uk_model_station_fixture (model_id, station_id, fixture_id),  -- ⭐ v3.1 新增複合唯一鍵
    INDEX idx_customer (customer_id),
    INDEX idx_model (model_id),
    INDEX idx_station (station_id),
    INDEX idx_fixture (fixture_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具需求表';

-- =====================================
-- 10. 治具部署表
-- =====================================
CREATE TABLE fixture_deployments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    serial_number VARCHAR(100) COMMENT '序號',
    model_id VARCHAR(50) COMMENT '機種',
    station_id VARCHAR(50) COMMENT '站點',
    deployment_date DATETIME NOT NULL COMMENT '部署時間',
    recall_date DATETIME COMMENT '召回時間',
    status ENUM('active', 'recalled') DEFAULT 'active' COMMENT '狀態',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES machine_models(id) ON DELETE SET NULL,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture (fixture_id),
    INDEX idx_serial (serial_number),
    INDEX idx_status (status),
    INDEX idx_deployment_date (deployment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具部署表';

-- =====================================
-- 11. 收退料交易表 (v3.1 + v3.2)
-- =====================================
CREATE TABLE material_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('receipt', 'return') NOT NULL COMMENT '交易類型',
    record_type ENUM('batch', 'individual', 'datecode') DEFAULT 'individual' COMMENT '記錄類型',
    transaction_date DATE NOT NULL COMMENT '交易日期',
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    order_no VARCHAR(100) COMMENT '工單號',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    source_type ENUM('self_purchased', 'customer_supplied') COMMENT '來源類型',
    datecode VARCHAR(50) COMMENT '日期碼',
    quantity INT DEFAULT 0 COMMENT '數量',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    created_by INT COMMENT '建立人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture (fixture_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_datecode (datecode),
    INDEX idx_customer_date (customer_id, transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收退料交易表';

-- =====================================
-- 12. 交易明細表 (僅序號制使用)
-- =====================================
CREATE TABLE material_transaction_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL COMMENT '交易ID',
    serial_number VARCHAR(100) NOT NULL COMMENT '序號',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES material_transactions(id) ON DELETE CASCADE,
    INDEX idx_transaction (transaction_id),
    INDEX idx_serial (serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易明細表 (僅序號制使用)';

-- =====================================
-- 13. 使用記錄表
-- =====================================
CREATE TABLE usage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    serial_number VARCHAR(100) COMMENT '序號',
    model_id VARCHAR(50) COMMENT '機種',
    station_id VARCHAR(50) COMMENT '站點',
    start_time DATETIME COMMENT '開始使用時間',
    end_time DATETIME COMMENT '結束使用時間',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES machine_models(id) ON DELETE SET NULL,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture (fixture_id),
    INDEX idx_serial (serial_number),
    INDEX idx_start_time (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用記錄表';

-- =====================================
-- 14. 更換記錄表
-- =====================================
CREATE TABLE replacement_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    old_serial VARCHAR(100) COMMENT '舊序號',
    new_serial VARCHAR(100) COMMENT '新序號',
    model_id VARCHAR(50) COMMENT '機種',
    station_id VARCHAR(50) COMMENT '站點',
    replacement_date DATETIME NOT NULL COMMENT '更換時間',
    reason VARCHAR(255) COMMENT '更換原因',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES machine_models(id) ON DELETE SET NULL,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture (fixture_id),
    INDEX idx_replacement_date (replacement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='更換記錄表';

-- =====================================
-- 15. 部署歷史表
-- =====================================
CREATE TABLE deployment_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    serial_number VARCHAR(100) COMMENT '序號',
    model_id VARCHAR(50) COMMENT '機種',
    station_id VARCHAR(50) COMMENT '站點',
    deployment_date DATETIME NOT NULL COMMENT '部署時間',
    recall_date DATETIME COMMENT '召回時間',
    operator VARCHAR(100) COMMENT '操作人員',
    note TEXT COMMENT '備註',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (model_id) REFERENCES machine_models(id) ON DELETE SET NULL,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE SET NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_fixture (fixture_id),
    INDEX idx_serial (serial_number),
    INDEX idx_deployment_date (deployment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部署歷史表';

-- =====================================
-- 16. 庫存快照表
-- =====================================
CREATE TABLE inventory_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL COMMENT '客戶名稱',
    fixture_id VARCHAR(50) NOT NULL COMMENT '治具編號',
    snapshot_date DATE NOT NULL COMMENT '快照日期',
    available_qty INT DEFAULT 0 COMMENT '可用數量',
    deployed_qty INT DEFAULT 0 COMMENT '已部署數量',
    maintenance_qty INT DEFAULT 0 COMMENT '維護中數量',
    scrapped_qty INT DEFAULT 0 COMMENT '報廢數量',
    returned_qty INT DEFAULT 0 COMMENT '已返還數量',
    total_qty INT DEFAULT 0 COMMENT '總數量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    UNIQUE KEY uk_snapshot (customer_id, fixture_id, snapshot_date),
    INDEX idx_customer (customer_id),
    INDEX idx_fixture (fixture_id),
    INDEX idx_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='庫存快照表';

-- =====================================
-- 觸發器 (v3.1 更新) - 序號制專用
-- =====================================

DELIMITER //

-- 觸發器1: 序號新增時自動更新 fixtures 數量
DROP TRIGGER IF EXISTS trg_serial_insert//
CREATE TRIGGER trg_serial_insert
    AFTER INSERT ON fixture_serials
    FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET
        self_purchased_qty = self_purchased_qty + (NEW.source_type = 'self_purchased'),
        customer_supplied_qty = customer_supplied_qty + (NEW.source_type = 'customer_supplied'),
        available_qty = available_qty + (NEW.status = 'available'),
        deployed_qty = deployed_qty + (NEW.status = 'deployed'),
        maintenance_qty = maintenance_qty + (NEW.status = 'maintenance'),
        scrapped_qty = scrapped_qty + (NEW.status = 'scrapped'),
        returned_qty = returned_qty + (NEW.status = 'returned')
    WHERE id = NEW.fixture_id
      AND customer_id = NEW.customer_id;
END//

-- 觸發器2: 序號狀態更新時自動更新 fixtures 數量
DROP TRIGGER IF EXISTS trg_serial_update//
CREATE TRIGGER trg_serial_update
    AFTER UPDATE ON fixture_serials
    FOR EACH ROW
BEGIN
    -- 先減去舊狀態的數量
    UPDATE fixtures
    SET
        available_qty = available_qty - (OLD.status = 'available'),
        deployed_qty = deployed_qty - (OLD.status = 'deployed'),
        maintenance_qty = maintenance_qty - (OLD.status = 'maintenance'),
        scrapped_qty = scrapped_qty - (OLD.status = 'scrapped'),
        returned_qty = returned_qty - (OLD.status = 'returned')
    WHERE id = OLD.fixture_id
      AND customer_id = OLD.customer_id;

    -- 再加上新狀態的數量
    UPDATE fixtures
    SET
        available_qty = available_qty + (NEW.status = 'available'),
        deployed_qty = deployed_qty + (NEW.status = 'deployed'),
        maintenance_qty = maintenance_qty + (NEW.status = 'maintenance'),
        scrapped_qty = scrapped_qty + (NEW.status = 'scrapped'),
        returned_qty = returned_qty + (NEW.status = 'returned')
    WHERE id = NEW.fixture_id
      AND customer_id = NEW.customer_id;
END//

-- 觸發器3: 序號刪除時自動更新 fixtures 數量
DROP TRIGGER IF EXISTS trg_serial_delete//
CREATE TRIGGER trg_serial_delete
    AFTER DELETE ON fixture_serials
    FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET
        self_purchased_qty = self_purchased_qty - (OLD.source_type = 'self_purchased'),
        customer_supplied_qty = customer_supplied_qty - (OLD.source_type = 'customer_supplied'),
        available_qty = available_qty - (OLD.status = 'available'),
        deployed_qty = deployed_qty - (OLD.status = 'deployed'),
        maintenance_qty = maintenance_qty - (OLD.status = 'maintenance'),
        scrapped_qty = scrapped_qty - (OLD.status = 'scrapped'),
        returned_qty = returned_qty - (OLD.status = 'returned')
    WHERE id = OLD.fixture_id
      AND customer_id = OLD.customer_id;
END//

-- =====================================
-- 存儲過程 (v4.0)
-- =====================================

-- 存儲過程1: 收料 (v4.0 - datecode 不產生序號)
DROP PROCEDURE IF EXISTS sp_material_receipt//
CREATE PROCEDURE sp_material_receipt(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_order_no VARCHAR(100),
    IN p_source_type ENUM('self_purchased', 'customer_supplied'),
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_created_by INT,
    IN p_record_type ENUM('batch', 'individual', 'datecode'),
    IN p_datecode VARCHAR(50),
    IN p_serials_csv TEXT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(500)
)
sp_material_receipt:
BEGIN
    DECLARE v_qty INT DEFAULT 0;
    DECLARE v_transaction_date DATE;
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;
    DECLARE v_remaining TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = '收料失敗 (SQL 異常)';
        SET p_transaction_id = NULL;
    END;

    SET v_transaction_date = CURDATE();
    START TRANSACTION;

    -- 計算數量
    IF p_record_type = 'datecode' THEN
        SET v_qty = CAST(p_serials_csv AS UNSIGNED);
    ELSE
        SET v_qty = LENGTH(p_serials_csv) - LENGTH(REPLACE(p_serials_csv, ',', '')) + 1;
        IF TRIM(p_serials_csv) = '' THEN
            SET v_qty = 0;
        END IF;
    END IF;

    IF v_qty <= 0 THEN
        SET p_message = '數量必須大於 0';
        SET p_transaction_id = NULL;
        ROLLBACK;
        LEAVE sp_material_receipt;
    END IF;

    -- 插入交易記錄
    INSERT INTO material_transactions (
        transaction_type, record_type, transaction_date,
        customer_id, order_no, fixture_id, source_type, datecode,
        quantity, operator, note, created_by, created_at
    ) VALUES (
        'receipt', p_record_type, v_transaction_date,
        p_customer_id, p_order_no, p_fixture_id, p_source_type, p_datecode,
        v_qty, p_operator, p_note, p_created_by, NOW()
    );

    SET p_transaction_id = LAST_INSERT_ID();

    -- v4.0: 日期碼模式不產生序號、不寫明細，只更新匯總數量
    IF p_record_type = 'datecode' THEN
        UPDATE fixtures
        SET
            available_qty = available_qty + v_qty,
            self_purchased_qty = self_purchased_qty + (p_source_type = 'self_purchased') * v_qty,
            customer_supplied_qty = customer_supplied_qty + (p_source_type = 'customer_supplied') * v_qty
        WHERE id = p_fixture_id
          AND customer_id = p_customer_id;

        COMMIT;
        SET p_message = 'OK';
        LEAVE sp_material_receipt;
    END IF;

    -- 一般序號模式 (batch / individual): 寫入明細 + fixture_serials (觸發器自動更新統計)
    SET v_remaining = p_serials_csv;

    WHILE LENGTH(v_remaining) > 0 DO
        SET v_pos = LOCATE(',', v_remaining);

        IF v_pos = 0 THEN
            SET v_serial = TRIM(v_remaining);
            SET v_remaining = '';
        ELSE
            SET v_serial = TRIM(SUBSTRING(v_remaining, 1, v_pos - 1));
            SET v_remaining = SUBSTRING(v_remaining, v_pos + 1);
        END IF;

        IF LENGTH(v_serial) > 0 THEN
            -- 新增明細
            INSERT INTO material_transaction_details (
                transaction_id, serial_number, created_at
            ) VALUES (
                p_transaction_id, v_serial, NOW()
            );

            -- 新增序號 (觸發器會自動更新 fixtures 數量)
            INSERT INTO fixture_serials (
                customer_id, fixture_id, serial_number, source_type,
                status, receipt_date, receipt_transaction_id, created_at
            ) VALUES (
                p_customer_id, p_fixture_id, v_serial, p_source_type,
                'available', v_transaction_date, p_transaction_id, NOW()
            );
        END IF;
    END WHILE;

    SET p_message = 'OK';
    COMMIT;
END//

-- 存儲過程2: 退料 (v4.0 - datecode 不操作序號)
DROP PROCEDURE IF EXISTS sp_material_return//
CREATE PROCEDURE sp_material_return(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_order_no VARCHAR(100),
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_created_by INT,
    IN p_record_type ENUM('batch', 'individual', 'datecode'),
    IN p_datecode VARCHAR(50),
    IN p_serials_csv TEXT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(500)
)
sp_material_return:
BEGIN
    DECLARE v_qty INT DEFAULT 0;
    DECLARE v_transaction_date DATE;
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT;
    DECLARE v_remaining TEXT;
    DECLARE v_available INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = '退料失敗 (SQL 異常)';
        SET p_transaction_id = NULL;
    END;

    SET v_transaction_date = CURDATE();
    START TRANSACTION;

    -- 計算數量
    IF p_record_type = 'datecode' THEN
        SET v_qty = CAST(p_serials_csv AS UNSIGNED);
    ELSE
        SET v_qty = LENGTH(p_serials_csv) - LENGTH(REPLACE(p_serials_csv, ',', '')) + 1;
        IF TRIM(p_serials_csv) = '' THEN
            SET v_qty = 0;
        END IF;
    END IF;

    IF v_qty <= 0 THEN
        SET p_message = '數量必須大於 0';
        SET p_transaction_id = NULL;
        ROLLBACK;
        LEAVE sp_material_return;
    END IF;

    -- v4.0: 日期碼退料不使用序號，只按數量扣帳
    IF p_record_type = 'datecode' THEN
        -- 檢查可用數量是否足夠
        SELECT available_qty INTO v_available
        FROM fixtures
        WHERE id = p_fixture_id
          AND customer_id = p_customer_id
        FOR UPDATE;

        IF v_available IS NULL OR v_available < v_qty THEN
            SET p_message = CONCAT('可用數量不足: 需要 ', v_qty, '，目前可用 ', IFNULL(v_available, 0));
            SET p_transaction_id = NULL;
            ROLLBACK;
            LEAVE sp_material_return;
        END IF;

        -- 插入交易記錄 (source_type 置為 NULL)
        INSERT INTO material_transactions (
            transaction_type, record_type, transaction_date,
            customer_id, order_no, fixture_id, source_type, datecode,
            quantity, operator, note, created_by, created_at
        ) VALUES (
            'return', 'datecode', v_transaction_date,
            p_customer_id, p_order_no, p_fixture_id, NULL, p_datecode,
            v_qty, p_operator, p_note, p_created_by, NOW()
        );

        SET p_transaction_id = LAST_INSERT_ID();

        -- 更新治具統計量
        UPDATE fixtures
        SET
            available_qty = available_qty - v_qty,
            returned_qty = returned_qty + v_qty
        WHERE id = p_fixture_id
          AND customer_id = p_customer_id;

        COMMIT;
        SET p_message = 'OK';
        LEAVE sp_material_return;
    END IF;

    -- 一般序號模式 (batch / individual): 按序號退料
    -- 先插入交易記錄 (source_type 仍為 NULL，由序號層面統計)
    INSERT INTO material_transactions (
        transaction_type, record_type, transaction_date,
        customer_id, order_no, fixture_id, source_type, datecode,
        quantity, operator, note, created_by, created_at
    ) VALUES (
        'return', p_record_type, v_transaction_date,
        p_customer_id, p_order_no, p_fixture_id, NULL, p_datecode,
        v_qty, p_operator, p_note, p_created_by, NOW()
    );

    SET p_transaction_id = LAST_INSERT_ID();

    SET v_remaining = p_serials_csv;

    WHILE LENGTH(v_remaining) > 0 DO
        SET v_pos = LOCATE(',', v_remaining);

        IF v_pos = 0 THEN
            SET v_serial = TRIM(v_remaining);
            SET v_remaining = '';
        ELSE
            SET v_serial = TRIM(SUBSTRING(v_remaining, 1, v_pos - 1));
            SET v_remaining = SUBSTRING(v_remaining, v_pos + 1);
        END IF;

        IF LENGTH(v_serial) > 0 THEN
            -- 新增明細
            INSERT INTO material_transaction_details (
                transaction_id, serial_number, created_at
            ) VALUES (
                p_transaction_id, v_serial, NOW()
            );

            -- 更新序號狀態 (觸發器會自動更新 fixtures 數量)
            UPDATE fixture_serials
            SET status = 'returned',
                return_date = v_transaction_date,
                return_transaction_id = p_transaction_id,
                updated_at = NOW()
            WHERE customer_id = p_customer_id
              AND fixture_id = p_fixture_id
              AND serial_number = v_serial
              AND status = 'available';
        END IF;
    END WHILE;

    SET p_message = 'OK';
    COMMIT;
END//

-- 存儲過程3: 每日庫存快照 (沿用 v3.2)
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
-- 完成訊息
-- =====================================
SELECT '✅ 資料庫初始化 v4.0 完成！' AS message;
SELECT '========================================' AS line;
SELECT '📋 v4.0 主要更新:' AS info;
SELECT '  1. ✅ Datecode 模式不產生序號' AS update1;
SELECT '  2. ✅ Datecode 模式不寫入明細與序號表' AS update2;
SELECT '  3. ✅ 序號制 (batch/individual) 繼續使用 fixture_serials + 觸發器' AS update3;
SELECT '========================================' AS line;
SELECT '📋 v3.2 / v3.1 主要更新已合併於本腳本' AS info2;
SELECT '🔑 預設管理員: admin / admin123' AS admin_info;
SELECT '⚠️  請修改範例客戶和站點資料!' AS warning;
SELECT '========================================' AS line;
