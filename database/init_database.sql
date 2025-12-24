-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: fixture_management_test
-- ------------------------------------------------------
-- Server version	8.0.44

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱 (直接使用客戶名稱作為主鍵)',
  `customer_abbr` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客戶簡稱',
  `contact_person` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '聯絡人',
  `contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '聯絡電話',
  `contact_email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email',
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '地址',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否啟用',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客戶總表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '工號/帳號',
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密碼雜湊',
  `role` enum('admin','user') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'user' COMMENT '角色: admin=管理員, user=一般使用者',
  `full_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '姓名',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否啟用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者表';
/*!40101 SET character_set_client = @saved_cs_client */;




--
-- Table structure for table `owners`
--

DROP TABLE IF EXISTS `owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `owners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客戶名稱',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '對應客戶ID（NULL 表示跨客戶）',
  `primary_owner` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '主負責人',
  `secondary_owner` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '副負責人',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Email',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否啟用',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_owner_customer` (`customer_id`),

  CONSTRAINT `fk_owners_customer`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`)
    ON DELETE SET NULL

) ENGINE=InnoDB
  AUTO_INCREMENT=6
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='負責人表 (可跨客戶)';
/*!40101 SET character_set_client = @saved_cs_client */;





--
-- Table structure for table `fixtures`
--

DROP TABLE IF EXISTS `fixtures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixtures` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號 (如: L-3000-STD)',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `fixture_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具名稱',
  `fixture_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '治具類型',
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '序號 (已廢棄,建議使用 fixture_serials 表)',
  `self_purchased_qty` int DEFAULT '0' COMMENT '自購數量',
  `customer_supplied_qty` int DEFAULT '0' COMMENT '客供數量',
  `available_qty` int DEFAULT '0' COMMENT '可用數量',
  `deployed_qty` int DEFAULT '0' COMMENT '已部署數量',
  `maintenance_qty` int DEFAULT '0' COMMENT '維護中數量',
  `scrapped_qty` int DEFAULT '0' COMMENT '報廢數量',
  `returned_qty` int DEFAULT '0' COMMENT '已返還數量',
  `storage_location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '儲存位置',
  `replacement_cycle` decimal(10,2) DEFAULT NULL COMMENT '更換週期',
  `cycle_unit` enum('days','uses','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'uses' COMMENT '週期單位',
  `status` enum('normal','returned','scrapped') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'normal' COMMENT '狀態',
  `last_replacement_date` date DEFAULT NULL COMMENT '最近更換日期',
  `last_notification_time` timestamp NULL DEFAULT NULL COMMENT '最後通知時間',
  `owner_id` int DEFAULT NULL COMMENT '負責人ID',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_customer_status` (`customer_id`,`status`),
  KEY `idx_fixture_type` (`fixture_type`),
  KEY `idx_owner` (`owner_id`),
  CONSTRAINT `fixtures_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fixtures_ibfk_2` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stations`
--

DROP TABLE IF EXISTS `stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stations` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '站點代碼 (如: T1_MP)',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `station_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '站點名稱',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `stations_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站點表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `machine_models`
--

DROP TABLE IF EXISTS `machine_models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `machine_models` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '機種代碼 (如: EDS-2008-LSFG)',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `model_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '機種名稱',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `machine_models_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種表';
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `fixture_serials`
--

DROP TABLE IF EXISTS `fixture_serials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_serials` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '序號記錄ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '序號',
  `source_type` enum('self_purchased','customer_supplied') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '來源類型',
  `status` enum('available','deployed','maintenance','scrapped','returned') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'available' COMMENT '狀態',
  `receipt_date` date DEFAULT NULL COMMENT '收料日期',
  `return_date` date DEFAULT NULL COMMENT '退料日期',
  `receipt_transaction_id` int DEFAULT NULL COMMENT '收料異動ID',
  `return_transaction_id` int DEFAULT NULL COMMENT '退料異動ID',
  `deployment_id` int DEFAULT NULL COMMENT '部署ID',
  `current_station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目前所在站點',
  `total_uses` int DEFAULT '0' COMMENT '累計使用次數',
  `last_use_date` date DEFAULT NULL COMMENT '最後使用日期',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  KEY `idx_customer` (`customer_id`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_fixture_only` (`fixture_id`),
  KEY `idx_status` (`status`),
  KEY `idx_customer_fixture` (`customer_id`, `fixture_id`),
  KEY `idx_receipt_transaction` (`receipt_transaction_id`),
  KEY `idx_return_transaction` (`return_transaction_id`),
  KEY `idx_current_station` (`current_station_id`),

  CONSTRAINT `fixture_serials_ibfk_1`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`)
    ON DELETE RESTRICT,

  CONSTRAINT `fixture_serials_ibfk_2`
    FOREIGN KEY (`fixture_id`)
    REFERENCES `fixtures` (`id`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_fixture_serials_current_station`
    FOREIGN KEY (`current_station_id`)
    REFERENCES `stations` (`id`)
    ON DELETE SET NULL,

  CONSTRAINT `fk_fixture_serials_receipt_tx`
    FOREIGN KEY (`receipt_transaction_id`)
    REFERENCES `material_transactions` (`id`)
    ON DELETE SET NULL,

  CONSTRAINT `fk_fixture_serials_return_tx`
    FOREIGN KEY (`return_transaction_id`)
    REFERENCES `material_transactions` (`id`)
    ON DELETE SET NULL,

  CONSTRAINT `fk_fixture_serials_deployment`
    FOREIGN KEY (`deployment_id`)
    REFERENCES `fixture_deployments` (`id`)
    ON DELETE SET NULL

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='序號表';
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `deployment_history`
--

DROP TABLE IF EXISTS `deployment_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deployment_history` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '歷史記錄ID',
  `serial_id` int NOT NULL COMMENT '序號ID',
  `station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '站點代碼',
  `action` enum('deploy','undeploy') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '動作',
  `operator` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人員',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_serial_date` (`serial_id`,`created_at`),
  KEY `idx_station_date` (`station_id`,`created_at`),
  CONSTRAINT `deployment_history_ibfk_1` FOREIGN KEY (`serial_id`) REFERENCES `fixture_serials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `deployment_history_ibfk_2` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部署歷史表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fixture_deployments`
--

DROP TABLE IF EXISTS `fixture_deployments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_deployments` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '部署記錄ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '站點代碼',
  `deployed_qty` int DEFAULT '0' COMMENT '部署數量',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_fixture_station` (`customer_id`,`fixture_id`,`station_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_station` (`station_id`),
  KEY `idx_station_fixture` (`station_id`,`fixture_id`),
  CONSTRAINT `fixture_deployments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fixture_deployments_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fixture_deployments_ibfk_3` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具-站點部署表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fixture_requirements`
--

DROP TABLE IF EXISTS `fixture_requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_requirements` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '需求記錄ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `model_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '機種代碼',
  `station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '站點代碼',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `required_qty` int DEFAULT '1' COMMENT '需求數量',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_station_fixture` (`model_id`,`station_id`,`fixture_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_model` (`model_id`),
  KEY `idx_station` (`station_id`),
  KEY `idx_fixture` (`fixture_id`),
  CONSTRAINT `fixture_requirements_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fixture_requirements_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `machine_models` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fixture_requirements_ibfk_3` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fixture_requirements_ibfk_4` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=968 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具-機種需求表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `fixture_usage_summary`
--

DROP TABLE IF EXISTS `fixture_usage_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_usage_summary` (
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_use_count` int DEFAULT '0',
  `total_uses` int DEFAULT '0',
  `total_serial_uses` int DEFAULT '0',
  `first_used_at` datetime DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `last_station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_model_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_operator` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`fixture_id`, `customer_id`),

  KEY `idx_fus_last_used` (`last_used_at`),
  KEY `idx_fus_customer_fixture` (`customer_id`, `fixture_id`),

  CONSTRAINT `fk_fus_fixture`
    FOREIGN KEY (`fixture_id`)
    REFERENCES `fixtures` (`id`)
    ON DELETE CASCADE,

  CONSTRAINT `fk_fus_customer`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`)
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `inventory_snapshots`
--

DROP TABLE IF EXISTS `inventory_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '快照記錄ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `snapshot_date` date NOT NULL COMMENT '快照日期',
  `available_qty` int DEFAULT '0' COMMENT '可用數量',
  `deployed_qty` int DEFAULT '0' COMMENT '已部署數量',
  `maintenance_qty` int DEFAULT '0' COMMENT '維護中數量',
  `scrapped_qty` int DEFAULT '0' COMMENT '報廢數量',
  `returned_qty` int DEFAULT '0' COMMENT '已返還數量',
  `total_qty` int DEFAULT '0' COMMENT '總數量',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_fixture_date` (`customer_id`,`fixture_id`,`snapshot_date`),
  KEY `fixture_id` (`fixture_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_snapshot_date` (`snapshot_date`),
  CONSTRAINT `inventory_snapshots_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `inventory_snapshots_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='庫存快照表';
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `material_transactions`
--

DROP TABLE IF EXISTS `material_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_transactions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '異動記錄ID',
  `transaction_type` enum('receipt','return') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '異動類型',
  `record_type` enum('batch','individual','datecode') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'individual' COMMENT '記錄類型',
  `transaction_date` date NOT NULL COMMENT '異動日期',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱 (廠商=客戶)',
  `order_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '單號',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `source_type` enum('self_purchased','customer_supplied') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'customer_supplied' COMMENT '來源類型: self_purchased=自購, customer_supplied=客供',
  `datecode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日期碼',
  `quantity` int NOT NULL DEFAULT '0' COMMENT '異動數量',
  `operator` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人員',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL COMMENT '建立人員ID',
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_transaction_type` (`transaction_type`),
  KEY `idx_transaction_date` (`transaction_date`),
  KEY `idx_customer_date` (`customer_id`,`transaction_date`),
  KEY `idx_datecode` (`datecode`),
  KEY `idx_fixture` (`fixture_id`),
  CONSTRAINT `material_transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `material_transactions_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4733 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料異動主表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_transaction_details`
--

DROP TABLE IF EXISTS `material_transaction_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_transaction_details` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '明細記錄ID',
  `transaction_id` int NOT NULL COMMENT '異動主表ID',
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '序號（datecode 交易可為 NULL）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `datecode_qty` int DEFAULT NULL COMMENT '日期碼交易數量（不含序號）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transaction_serial` (`transaction_id`,`serial_number`),
  KEY `idx_serial` (`serial_number`),
  CONSTRAINT `material_transaction_details_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `material_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8271 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料異動明細表';
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Table structure for table `model_stations`
--

DROP TABLE IF EXISTS `model_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_stations` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '關聯記錄ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `model_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '機種代碼',
  `station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '站點代碼',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_station` (`model_id`,`station_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_model` (`model_id`),
  KEY `idx_station` (`station_id`),
  CONSTRAINT `model_stations_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `model_stations_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `machine_models` (`id`) ON DELETE CASCADE,
  CONSTRAINT `model_stations_ibfk_3` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=193 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種-站點關聯表';
/*!40101 SET character_set_client = @saved_cs_client */;



--
-- Table structure for table `replacement_logs`
--

DROP TABLE IF EXISTS `replacement_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `replacement_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '更換記錄ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `record_level` enum('fixture','serial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixture' COMMENT '更換層級（fixture=整治具, serial=單一序號）',
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '更換序號（若為 serial 模式使用）',
  `usage_before` int DEFAULT NULL COMMENT '更換前的使用次數（從 summary 自動帶入）',
  `usage_after` int DEFAULT NULL COMMENT '更換後重置使用次數（通常 0）',
  `auto_predicted_life` int DEFAULT NULL COMMENT '預估壽命（由系統自動計算）',
  `auto_predicted_replace_at` date DEFAULT NULL COMMENT '預估下一次更換日期（系統自動計算）',
  `replacement_date` date NOT NULL COMMENT '更換日期',
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '更換原因',
  `executor` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '執行人員',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_fixture_date` (`fixture_id`,`replacement_date`),
  CONSTRAINT `replacement_logs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `replacement_logs_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='更換記錄表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `serial_usage_summary`
--

DROP TABLE IF EXISTS `serial_usage_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `serial_usage_summary` (
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_use_count` int DEFAULT '0',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_uses` int DEFAULT '0',
  `first_used_at` datetime DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `last_station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_model_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_operator` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,

  PRIMARY KEY (`serial_number`),

  KEY `idx_sus_last_used` (`last_used_at`),
  KEY `idx_sus_fixture` (`fixture_id`),

  CONSTRAINT `fk_sus_fixture`
    FOREIGN KEY (`fixture_id`)
    REFERENCES `fixtures` (`id`)
    ON DELETE SET NULL,

  CONSTRAINT `fk_sus_customer`
    FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`)
    ON DELETE RESTRICT

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;




--
-- Table structure for table `usage_logs`
--

DROP TABLE IF EXISTS `usage_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usage_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '使用記錄ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_level` enum('fixture','serial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixture',
  `station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '站點代碼',
  `model_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `use_count` int NOT NULL,
  `operator` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人員',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `used_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '使用時間',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_fixture_time` (`fixture_id`,`used_at`),
  KEY `idx_station` (`station_id`),
  KEY `idx_operator` (`operator`),
  KEY `idx_date_range` (`used_at`,`fixture_id`),
  KEY `idx_serial_number` (`serial_number`),
  KEY `idx_record_level` (`record_level`),
  KEY `idx_model_id` (`model_id`),
  CONSTRAINT `usage_logs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `usage_logs_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `usage_logs_ibfk_4` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usage_logs_chk_1` CHECK ((`use_count` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用記錄表';
/*!40101 SET character_set_client = @saved_cs_client */;



DROP TABLE IF EXISTS `fixture_datecode_inventory`;
CREATE TABLE `fixture_datecode_inventory` (
    `id` int NOT NULL AUTO_INCREMENT COMMENT '日期碼庫存ID',
    `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶',
    `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具',
    `datecode` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日期碼',
    `available_qty` INT NOT NULL DEFAULT 0 COMMENT '可用數量',
    `returned_qty`  INT NOT NULL DEFAULT 0 COMMENT '已退料數量',
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_fixture_datecode` (
        `customer_id`,
        `fixture_id`,
        `datecode`
    ),

    FOREIGN KEY (`customer_id`)
        REFERENCES `customers`(`id`)
        ON DELETE RESTRICT,

    FOREIGN KEY (`fixture_id`)
        REFERENCES `fixtures`(`id`)
        ON DELETE CASCADE,

    PRIMARY KEY (`id`),
    KEY `idx_fixture` (`fixture_id`),
    KEY `idx_datecode` (`datecode`)
) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='治具日期碼庫存（非序號）';

ALTER TABLE fixture_datecode_inventory
ADD COLUMN source_type ENUM('self_purchased', 'customer_supplied')
NOT NULL DEFAULT 'customer_supplied'
COMMENT '來源類型（與 fixture_serials 一致）';



DROP TABLE IF EXISTS `fixture_datecode_transactions`;
CREATE TABLE `fixture_datecode_transactions` (
    `id` INT AUTO_INCREMENT COMMENT '日期碼庫存異動ID',
    `transaction_id` INT NOT NULL COMMENT '對應 material_transactions.id',
    `customer_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶',
    `fixture_id`  VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具',
    `datecode`    VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '日期碼',
    `transaction_type` ENUM('receipt', 'return') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '異動類型',
    `quantity` INT NOT NULL COMMENT '異動數量',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',

    PRIMARY KEY (`id`),
    KEY `idx_tx` (`transaction_id`),
    KEY `idx_fixture_datecode` (`fixture_id`, `datecode`),

    CONSTRAINT `fk_fdt_transaction`
        FOREIGN KEY (`transaction_id`)
        REFERENCES `material_transactions`(`id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_fdt_fixture`
        FOREIGN KEY (`fixture_id`)
        REFERENCES `fixtures`(`id`)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='治具日期碼庫存異動明細（非序號 audit）';

