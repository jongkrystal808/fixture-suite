-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: fixture_management_test
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

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
-- Table structure for table `fixture_datecode_inventory`
--

DROP TABLE IF EXISTS `fixture_datecode_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_datecode_inventory` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '日期碼庫存ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客戶',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '治具',
  `datecode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日期碼',
  `in_stock_qty` int NOT NULL COMMENT '可用數量（在庫數量，與 fixtures.in_stock_qty 語意一致）',
  `returned_qty` int DEFAULT NULL COMMENT '已退料數量',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `source_type` enum('self_purchased','customer_supplied') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer_supplied' COMMENT '來源類型（與 fixture_serials 一致）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fixture_datecode` (`customer_id`,`fixture_id`,`datecode`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_datecode` (`datecode`),
  KEY `idx_fdi_customer_stock` (`customer_id`,`in_stock_qty`),
  KEY `idx_fdi_fixture_qty` (`fixture_id`,`in_stock_qty`),
  CONSTRAINT `fixture_datecode_inventory_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fixture_datecode_inventory_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_returned_non_negative` CHECK ((`returned_qty` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=996 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='æ²»å…·æ—¥æœŸç¢¼åº«å­˜ï¼ˆéžåºè™Ÿï¼‰';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_datecode_inventory_bi_validate */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_datecode_inventory_bi_validate` BEFORE INSERT ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
    IF NEW.in_stock_qty IS NULL OR NEW.in_stock_qty < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode in_stock_qty 不可為 NULL 或負數';
    END IF;

    IF (SELECT COUNT(*) FROM fixtures WHERE id = NEW.fixture_id) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '找不到治具 fixture_id';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_datecode_inventory_ai_sync */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_datecode_inventory_ai_sync` AFTER INSERT ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
    UPDATE fixtures
    SET
        in_stock_qty = in_stock_qty + NEW.in_stock_qty,
        self_purchased_qty =
            self_purchased_qty + IF(NEW.source_type='self_purchased', NEW.in_stock_qty, 0),
        customer_supplied_qty =
            customer_supplied_qty + IF(NEW.source_type='customer_supplied', NEW.in_stock_qty, 0)
    WHERE id = NEW.fixture_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_datecode_inventory_bu_validate */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_datecode_inventory_bu_validate` BEFORE UPDATE ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
    IF NEW.in_stock_qty IS NULL OR NEW.in_stock_qty < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode in_stock_qty 不可為 NULL 或負數';
    END IF;

    IF NEW.returned_qty IS NOT NULL AND NEW.returned_qty < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode returned_qty 不可為負數';
    END IF;

    IF NEW.returned_qty > OLD.returned_qty
        AND NEW.in_stock_qty >= OLD.in_stock_qty THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode 退料時，in_stock_qty 必須同步減少';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_datecode_inventory_au_sync */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_datecode_inventory_au_sync` AFTER UPDATE ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
    DECLARE delta INT;

    SET delta = NEW.in_stock_qty - OLD.in_stock_qty;

    UPDATE fixtures
    SET
        in_stock_qty = in_stock_qty + delta,
        self_purchased_qty =
            self_purchased_qty + IF(NEW.source_type='self_purchased', delta, 0),
        customer_supplied_qty =
            customer_supplied_qty + IF(NEW.source_type='customer_supplied', delta, 0)
    WHERE id = NEW.fixture_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `fixture_datecode_transactions`
--

DROP TABLE IF EXISTS `fixture_datecode_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_datecode_transactions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'æ—¥æœŸç¢¼åº«å­˜ç•°å‹•ID',
  `transaction_id` int NOT NULL COMMENT 'å°æ‡‰ material_transactions.id',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'å®¢æˆ¶',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'æ²»å…·',
  `datecode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'æ—¥æœŸç¢¼',
  `transaction_type` enum('receipt','return') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'ç•°å‹•é¡žåž‹',
  `quantity` int NOT NULL COMMENT 'ç•°å‹•æ•¸é‡',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'å»ºç«‹æ™‚é–“',
  PRIMARY KEY (`id`),
  KEY `idx_tx` (`transaction_id`),
  KEY `idx_fixture_datecode` (`fixture_id`,`datecode`),
  CONSTRAINT `fk_fdt_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fdt_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `material_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1605 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='æ²»å…·æ—¥æœŸç¢¼åº«å­˜ç•°å‹•æ˜Žç´°ï¼ˆéžåºè™Ÿ auditï¼‰';
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
-- Table structure for table `fixture_quantity_repairs`
--

DROP TABLE IF EXISTS `fixture_quantity_repairs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_quantity_repairs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `repair_type` enum('auto','manual') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
  `old_in_stock_qty` int DEFAULT NULL,
  `old_deployed_qty` int DEFAULT NULL,
  `old_self_purchased_qty` int DEFAULT NULL,
  `old_customer_supplied_qty` int DEFAULT NULL,
  `new_in_stock_qty` int DEFAULT NULL,
  `new_deployed_qty` int DEFAULT NULL,
  `new_self_purchased_qty` int DEFAULT NULL,
  `new_customer_supplied_qty` int DEFAULT NULL,
  `diff_in_stock` int DEFAULT NULL,
  `diff_deployed` int DEFAULT NULL,
  `repair_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `repaired_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `repaired_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_repaired_at` (`repaired_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3457 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具數量修復記錄表';
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
) ENGINE=InnoDB AUTO_INCREMENT=1413 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具-機種需求表';
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
  `status` enum('in_stock','deployed','maintenance','returned','scrapped') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'in_stock',
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
  `deleted_at` timestamp NULL DEFAULT NULL,
  `existence_status` enum('in_stock','returned','scrapped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_stock' COMMENT '是否仍存在於庫存',
  `usage_status` enum('idle','deployed','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'idle' COMMENT '使用狀態',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_status` (`status`),
  KEY `idx_customer_fixture` (`customer_id`,`fixture_id`),
  KEY `idx_receipt_transaction` (`receipt_transaction_id`),
  KEY `idx_return_transaction` (`return_transaction_id`),
  KEY `idx_fixture_only` (`fixture_id`),
  KEY `idx_current_station` (`current_station_id`),
  KEY `fk_fixture_serials_deployment` (`deployment_id`),
  KEY `idx_fs_customer_fixture` (`customer_id`,`fixture_id`),
  KEY `idx_fs_fixture_status` (`fixture_id`,`status`),
  KEY `idx_fixture_status_source` (`fixture_id`,`status`,`source_type`),
  CONSTRAINT `fixture_serials_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fixture_serials_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fixture_serials_current_station` FOREIGN KEY (`current_station_id`) REFERENCES `stations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fixture_serials_deployment` FOREIGN KEY (`deployment_id`) REFERENCES `fixture_deployments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fixture_serials_receipt_tx` FOREIGN KEY (`receipt_transaction_id`) REFERENCES `material_transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fixture_serials_return_tx` FOREIGN KEY (`return_transaction_id`) REFERENCES `material_transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4796 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='序號表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serial_no_validate_ins */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serial_no_validate_ins` BEFORE INSERT ON `fixture_serials` FOR EACH ROW BEGIN
    IF NEW.serial_number LIKE '%.%' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'serial_no 不得包含小數點 (.)';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serial_no_duplicate_check */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serial_no_duplicate_check` BEFORE INSERT ON `fixture_serials` FOR EACH ROW BEGIN
    DECLARE v_exists INT;

    SELECT COUNT(*)
    INTO v_exists
    FROM fixture_serials
    WHERE fixture_id = NEW.fixture_id
      AND serial_number = NEW.serial_number
      AND existence_status = 'in_stock';

    IF v_exists > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '該治具序號仍在庫存中，不可重複收料';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serials_audit_insert */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serials_audit_insert` AFTER INSERT ON `fixture_serials` FOR EACH ROW BEGIN
    INSERT INTO fixture_serials_history (
        serial_id, action, new_data
    ) VALUES (
                 NEW.id,
                 'INSERT',
                 JSON_OBJECT(
                         'fixture_id', NEW.fixture_id,
                         'serial_number', NEW.serial_number,
                         'existence_status', NEW.existence_status,
                         'usage_status', NEW.usage_status,
                         'source_type', NEW.source_type,
                         'created_at', NEW.created_at
                 )
             );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serial_no_validate_upd */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serial_no_validate_upd` BEFORE UPDATE ON `fixture_serials` FOR EACH ROW BEGIN
    IF NEW.serial_number LIKE '%.%' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'serial_no 不得包含小數點 (.)';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serial_usage_existence_validate_upd */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serial_usage_existence_validate_upd` BEFORE UPDATE ON `fixture_serials` FOR EACH ROW BEGIN
    IF NEW.existence_status = 'returned'
        AND NEW.usage_status <> 'idle' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '已退料序號不可為 deployed 或 maintenance';
    END IF;

    IF NEW.existence_status = 'scrapped'
        AND NEW.usage_status <> 'idle' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '已報廢序號不可為 deployed 或 maintenance';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serial_status_validate_upd */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serial_status_validate_upd` BEFORE UPDATE ON `fixture_serials` FOR EACH ROW BEGIN

    IF OLD.existence_status = 'scrapped'
        AND NEW.existence_status <> 'scrapped' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '已報廢序號不可變更狀態';
    END IF;

END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serial_status_sync_au */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serial_status_sync_au` AFTER UPDATE ON `fixture_serials` FOR EACH ROW BEGIN
    IF OLD.existence_status = 'in_stock'
        AND NEW.existence_status <> 'in_stock' THEN

        UPDATE fixtures
        SET
            in_stock_qty = in_stock_qty - 1,
            self_purchased_qty =
                self_purchased_qty - IF(OLD.source_type='self_purchased',1,0),
            customer_supplied_qty =
                customer_supplied_qty - IF(OLD.source_type='customer_supplied',1,0)
        WHERE id = OLD.fixture_id;
    END IF;

    IF OLD.existence_status <> 'in_stock'
        AND NEW.existence_status = 'in_stock'
        AND OLD.fixture_id = NEW.fixture_id THEN

        UPDATE fixtures
        SET
            in_stock_qty = in_stock_qty + 1,
            self_purchased_qty =
                self_purchased_qty + IF(NEW.source_type='self_purchased',1,0),
            customer_supplied_qty =
                customer_supplied_qty + IF(NEW.source_type='customer_supplied',1,0)
        WHERE id = NEW.fixture_id;
    END IF;

    IF OLD.usage_status <> NEW.usage_status
        AND OLD.existence_status='in_stock'
        AND NEW.existence_status='in_stock' THEN

        UPDATE fixtures
        SET
            deployed_qty =
                deployed_qty
                    + IF(NEW.usage_status='deployed',1,0)
                    - IF(OLD.usage_status='deployed',1,0),

            maintenance_qty =
                maintenance_qty
                    + IF(NEW.usage_status='maintenance',1,0)
                    - IF(OLD.usage_status='maintenance',1,0)
        WHERE id = OLD.fixture_id;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serials_audit_update */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serials_audit_update` AFTER UPDATE ON `fixture_serials` FOR EACH ROW BEGIN
    IF (OLD.existence_status <> NEW.existence_status)
        OR (OLD.usage_status <> NEW.usage_status)
        OR (OLD.source_type <> NEW.source_type)
        OR (OLD.fixture_id <> NEW.fixture_id)
    THEN
        INSERT INTO fixture_serials_history (
            serial_id, action, old_data, new_data
        ) VALUES (
                     NEW.id,
                     'UPDATE',
                     JSON_OBJECT(
                             'fixture_id', OLD.fixture_id,
                             'serial_number', OLD.serial_number,
                             'existence_status', OLD.existence_status,
                             'usage_status', OLD.usage_status,
                             'source_type', OLD.source_type
                     ),
                     JSON_OBJECT(
                             'fixture_id', NEW.fixture_id,
                             'serial_number', NEW.serial_number,
                             'existence_status', NEW.existence_status,
                             'usage_status', NEW.usage_status,
                             'source_type', NEW.source_type
                     )
                 );
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixture_serials_audit_delete */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixture_serials_audit_delete` AFTER DELETE ON `fixture_serials` FOR EACH ROW BEGIN
    INSERT INTO fixture_serials_history (
        serial_id, action, old_data
    ) VALUES (
                 OLD.id,
                 'DELETE',
                 JSON_OBJECT(
                         'fixture_id', OLD.fixture_id,
                         'serial_number', OLD.serial_number,
                         'existence_status', OLD.existence_status,
                         'usage_status', OLD.usage_status,
                         'source_type', OLD.source_type
                 )
             );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `fixture_serials_history`
--

DROP TABLE IF EXISTS `fixture_serials_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_serials_history` (
  `history_id` bigint NOT NULL AUTO_INCREMENT,
  `serial_id` bigint DEFAULT NULL,
  `action` enum('INSERT','UPDATE','DELETE') NOT NULL,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `changed_by` varchar(100) DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_fsh_serial_id` (`serial_id`),
  KEY `idx_fsh_changed_at` (`changed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4864 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `fixture_usage_summary`
--

DROP TABLE IF EXISTS `fixture_usage_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_usage_summary` (
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_use_count` int DEFAULT '0',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_uses` int DEFAULT '0',
  `total_serial_uses` int DEFAULT '0',
  `first_used_at` datetime DEFAULT NULL,
  `last_used_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `last_station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_model_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_operator` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`fixture_id`,`customer_id`),
  KEY `idx_fus_last_used` (`last_used_at`),
  KEY `idx_fus_customer_fixture` (`customer_id`,`fixture_id`),
  CONSTRAINT `fk_fus_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_fus_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `fixture_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '治具名稱',
  `fixture_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '治具類型',
  `self_purchased_qty` int DEFAULT '0' COMMENT '目前仍在庫(in_stock)的「自購」治具數量 = serial(in_stock,self) + datecode(in_stock,self)，非歷史累計',
  `customer_supplied_qty` int DEFAULT '0' COMMENT '目前仍在庫(in_stock)的「客供」治具數量 = serial(in_stock,customer) + datecode(in_stock,customer)，非歷史累計',
  `in_stock_qty` int DEFAULT '0' COMMENT '目前仍在庫且可用的治具數量 = serial(status=in_stock) + datecode(in_stock_qty)，可 rebuild',
  `deployed_qty` int DEFAULT '0' COMMENT '已出借/使用中的治具數量，僅來自 serial(status=deployed)，可 rebuild',
  `maintenance_qty` int DEFAULT '0' COMMENT '維修中/暫停使用的治具數量，僅來自 serial(status=maintenance)，可 rebuild',
  `scrapped_qty` int DEFAULT '0' COMMENT '已報廢且不可再用的治具數量，僅來自 serial(status=scrapped)，可 rebuild',
  `returned_qty` int DEFAULT '0' COMMENT '已退料(returned)的治具數量，僅來自 serial(status=returned)，不可視為在庫',
  `storage_location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '儲存位置',
  `replacement_cycle` decimal(10,2) DEFAULT NULL COMMENT '更換週期',
  `cycle_unit` enum('days','uses','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'uses' COMMENT '週期單位',
  `last_replacement_date` date DEFAULT NULL COMMENT '最近一次更換日期（cache，由 replacement_logs 聚合，可重算）',
  `last_notification_time` timestamp NULL DEFAULT NULL COMMENT '最後通知時間',
  `owner_id` int DEFAULT NULL COMMENT '負責人ID',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `is_scrapped` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已報廢',
  `scrapped_at` datetime DEFAULT NULL COMMENT '報廢時間',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_customer_status` (`customer_id`),
  KEY `idx_fixture_type` (`fixture_type`),
  KEY `idx_owner` (`owner_id`),
  KEY `idx_customer_storage` (`customer_id`,`storage_location`),
  CONSTRAINT `fixtures_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_fixtures_owner` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_fixtures_quantities_non_negative` CHECK (((`in_stock_qty` >= 0) and (`deployed_qty` >= 0) and (`maintenance_qty` >= 0) and (`returned_qty` >= 0) and (`scrapped_qty` >= 0) and (`self_purchased_qty` >= 0) and (`customer_supplied_qty` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具主表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_fixtures_audit_update */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_fixtures_audit_update` AFTER UPDATE ON `fixtures` FOR EACH ROW BEGIN
    INSERT INTO fixtures_history (
        fixture_id, customer_id, fixture_name,
        change_type, old_values, new_values
    ) VALUES (
                 NEW.id,
                 NEW.customer_id,
                 NEW.fixture_name,
                 'UPDATE',
                 JSON_OBJECT(
                         'fixture_name', OLD.fixture_name,
                         'in_stock_qty', OLD.in_stock_qty,
                         'deployed_qty', OLD.deployed_qty
                 ),
                 JSON_OBJECT(
                         'fixture_name', NEW.fixture_name,
                         'in_stock_qty', NEW.in_stock_qty,
                         'deployed_qty', NEW.deployed_qty
                 )
             );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `fixtures_history`
--

DROP TABLE IF EXISTS `fixtures_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixtures_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fixture_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_type` enum('INSERT','UPDATE','DELETE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` int DEFAULT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `idx_fixture_id` (`fixture_id`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=122034 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `in_stock_qty` int DEFAULT '0' COMMENT '在庫數量（serial in_stock）',
  `deployed_qty` int DEFAULT '0' COMMENT '已部署數量',
  `maintenance_qty` int DEFAULT '0' COMMENT '維護中數量',
  `scrapped_qty` int DEFAULT '0' COMMENT '報廢數量',
  `returned_qty` int DEFAULT '0' COMMENT '已返還數量',
  `total_qty` int DEFAULT '0' COMMENT '總數量',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `serial_in_stock_qty` int DEFAULT '0' COMMENT 'serial existence_status=in_stock',
  `serial_available_qty` int DEFAULT '0' COMMENT 'serial in_stock AND usage=idle',
  `serial_deployed_qty` int DEFAULT '0' COMMENT 'serial in_stock AND usage=deployed',
  `serial_maintenance_qty` int DEFAULT '0' COMMENT 'serial in_stock AND usage=maintenance',
  `serial_returned_qty` int DEFAULT '0' COMMENT 'serial existence_status=returned',
  `serial_scrapped_qty` int DEFAULT '0' COMMENT 'serial existence_status=scrapped',
  `datecode_in_stock_qty` int DEFAULT '0' COMMENT 'datecode in_stock_qty',
  `total_available_qty` int DEFAULT '0' COMMENT 'serial_available + datecode',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customer_fixture_date` (`customer_id`,`fixture_id`,`snapshot_date`),
  KEY `fixture_id` (`fixture_id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_snapshot_date` (`snapshot_date`),
  CONSTRAINT `inventory_snapshots_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `inventory_snapshots_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4112 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='庫存快照表';
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
  `model_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '機種名稱',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `machine_models_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_transaction_items`
--

DROP TABLE IF EXISTS `material_transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_transaction_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'individual / batch 使用',
  `datecode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'datecode 使用',
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'datecode 才會 >1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mti_transaction` (`transaction_id`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_datecode` (`datecode`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_customer_fixture` (`customer_id`,`fixture_id`),
  CONSTRAINT `fk_mti_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `material_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6386 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收退料實際項目（序號 / 日期碼）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_transactions`
--

DROP TABLE IF EXISTS `material_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_transactions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '異動記錄ID',
  `transaction_type` enum('receipt','return') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_type` enum('individual','batch','datecode') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int DEFAULT NULL COMMENT '交易數量（永遠為正數，方向由 transaction_type 判斷）',
  `transaction_date` date NOT NULL COMMENT '異動日期',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱 (廠商=客戶)',
  `order_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '僅供參考，不參與任何邏輯',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `source_type` enum('self_purchased','customer_supplied') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'customer_supplied' COMMENT '來源類型: self_purchased=自購, customer_supplied=客供',
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
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_customer_fixture_date` (`customer_id`,`fixture_id`,`transaction_date`),
  CONSTRAINT `material_transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `material_transactions_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_material_tx_quantity_positive` CHECK ((`quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=10507 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料異動主表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_material_transactions_no_update */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_material_transactions_no_update` BEFORE UPDATE ON `material_transactions` FOR EACH ROW BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'material_transactions is immutable (UPDATE is forbidden)';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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
) ENGINE=InnoDB AUTO_INCREMENT=571 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種-站點關聯表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `owners`
--

DROP TABLE IF EXISTS `owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `owners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULL = 跨客戶共用',
  `primary_user_id` int NOT NULL COMMENT '主負責人 (users.id)',
  `secondary_user_id` int DEFAULT NULL COMMENT '副負責人 (users.id)',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_owner_primary_user` (`primary_user_id`),
  KEY `fk_owner_secondary_user` (`secondary_user_id`),
  KEY `fk_owner_customer` (`customer_id`),
  CONSTRAINT `fk_owner_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_owner_primary_user` FOREIGN KEY (`primary_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_owner_secondary_user` FOREIGN KEY (`secondary_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `replacement_logs`
--

DROP TABLE IF EXISTS `replacement_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `replacement_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '更換事件 ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶 ID',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具 ID',
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '序號（record_level = serial）',
  `record_level` enum('fixture','serial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixture' COMMENT '事件層級（與 usage_logs 對齊）',
  `operator` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人員（與 usage_logs.operator 對齊）',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '事件備註（可含 individual / batch 語意）',
  `occurred_at` date NOT NULL COMMENT '事件發生日期（YYYY-MM-DD）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  PRIMARY KEY (`id`),
  KEY `fk_replacement_customer` (`customer_id`),
  KEY `fk_replacement_fixture` (`fixture_id`),
  CONSTRAINT `fk_replacement_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_replacement_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具更換事件記錄（v4.x，對齊 usage_logs）';
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
  KEY `fk_sus_customer` (`customer_id`),
  KEY `idx_sus_last_used` (`last_used_at`),
  KEY `idx_sus_fixture` (`fixture_id`),
  CONSTRAINT `fk_sus_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sus_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
-- Table structure for table `trigger_error_logs`
--

DROP TABLE IF EXISTS `trigger_error_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trigger_error_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trigger_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Trigger 名稱',
  `table_name` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '觸發的資料表',
  `error_sqlstate` char(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SQL 狀態碼',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '錯誤訊息',
  `context_data` json DEFAULT NULL COMMENT '觸發時的上下文資料',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '發生時間',
  PRIMARY KEY (`id`),
  KEY `idx_trigger_name` (`trigger_name`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=203 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trigger 錯誤日誌表';
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
  KEY `idx_usage_used_at` (`used_at`),
  KEY `idx_usage_fixture_date` (`fixture_id`,`used_at`),
  KEY `idx_customer_fixture_used` (`customer_id`,`fixture_id`,`used_at`),
  CONSTRAINT `usage_logs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `usage_logs_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `usage_logs_ibfk_4` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usage_logs_chk_1` CHECK ((`use_count` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用記錄表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS trg_update_serial_usage */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 /*!50003 TRIGGER `trg_update_serial_usage` AFTER INSERT ON `usage_logs` FOR EACH ROW BEGIN
    IF NEW.serial_number IS NOT NULL THEN
        UPDATE fixture_serials
        SET
            total_uses    = total_uses + NEW.use_count,
            last_use_date = CURRENT_DATE,
            updated_at    = CURRENT_TIMESTAMP
        WHERE serial_number = NEW.serial_number
          AND fixture_id   = NEW.fixture_id
          AND customer_id  = NEW.customer_id;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `user_customers`
--

DROP TABLE IF EXISTS `user_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_customers` (
  `user_id` int NOT NULL COMMENT '使用者 ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶代碼',
  PRIMARY KEY (`user_id`,`customer_id`),
  CONSTRAINT `fk_user_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者可使用的客戶清單（多對多）';
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
) ENGINE=InnoDB AUTO_INCREMENT=101016 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_active_fixtures`
--

DROP TABLE IF EXISTS `v_active_fixtures`;
/*!50001 DROP VIEW IF EXISTS `v_active_fixtures`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_active_fixtures` AS SELECT 
 1 AS `id`,
 1 AS `customer_id`,
 1 AS `fixture_name`,
 1 AS `fixture_type`,
 1 AS `self_purchased_qty`,
 1 AS `customer_supplied_qty`,
 1 AS `in_stock_qty`,
 1 AS `deployed_qty`,
 1 AS `maintenance_qty`,
 1 AS `scrapped_qty`,
 1 AS `returned_qty`,
 1 AS `storage_location`,
 1 AS `replacement_cycle`,
 1 AS `cycle_unit`,
 1 AS `last_replacement_date`,
 1 AS `last_notification_time`,
 1 AS `owner_id`,
 1 AS `note`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `deleted_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_inconsistent_fixtures`
--

DROP TABLE IF EXISTS `v_inconsistent_fixtures`;
/*!50001 DROP VIEW IF EXISTS `v_inconsistent_fixtures`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_inconsistent_fixtures` AS SELECT 
 1 AS `fixture_id`,
 1 AS `customer_id`,
 1 AS `fixture_name`,
 1 AS `trigger_in_stock`,
 1 AS `trigger_deployed`,
 1 AS `actual_in_stock`,
 1 AS `actual_deployed`,
 1 AS `diff_in_stock`,
 1 AS `diff_deployed`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_invalid_fixture_serial_status`
--

DROP TABLE IF EXISTS `v_invalid_fixture_serial_status`;
/*!50001 DROP VIEW IF EXISTS `v_invalid_fixture_serial_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_invalid_fixture_serial_status` AS SELECT 
 1 AS `serial_id`,
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `serial_number`,
 1 AS `existence_status`,
 1 AS `usage_status`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_inventory_history`
--

DROP TABLE IF EXISTS `v_inventory_history`;
/*!50001 DROP VIEW IF EXISTS `v_inventory_history`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_inventory_history` AS SELECT 
 1 AS `id`,
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `transaction_type`,
 1 AS `record_type`,
 1 AS `transaction_date`,
 1 AS `order_no`,
 1 AS `source_type`,
 1 AS `operator`,
 1 AS `quantity`,
 1 AS `note`,
 1 AS `serials`,
 1 AS `datecode`,
 1 AS `datecode_qty`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_material_transactions_event`
--

DROP TABLE IF EXISTS `v_material_transactions_event`;
/*!50001 DROP VIEW IF EXISTS `v_material_transactions_event`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_material_transactions_event` AS SELECT 
 1 AS `transaction_id`,
 1 AS `transaction_date`,
 1 AS `transaction_type`,
 1 AS `record_type`,
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `order_no`,
 1 AS `datecode`,
 1 AS `source_type`,
 1 AS `operator`,
 1 AS `note`,
 1 AS `display_quantity`,
 1 AS `display_quantity_text`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_material_transactions_query`
--

DROP TABLE IF EXISTS `v_material_transactions_query`;
/*!50001 DROP VIEW IF EXISTS `v_material_transactions_query`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_material_transactions_query` AS SELECT 
 1 AS `transaction_id`,
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `order_no`,
 1 AS `transaction_type`,
 1 AS `record_type`,
 1 AS `quantity`,
 1 AS `source_type`,
 1 AS `transaction_date`,
 1 AS `operator`,
 1 AS `note`,
 1 AS `created_at`,
 1 AS `created_by`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_recent_trigger_errors`
--

DROP TABLE IF EXISTS `v_recent_trigger_errors`;
/*!50001 DROP VIEW IF EXISTS `v_recent_trigger_errors`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_recent_trigger_errors` AS SELECT 
 1 AS `id`,
 1 AS `trigger_name`,
 1 AS `table_name`,
 1 AS `error_message`,
 1 AS `fixture_id`,
 1 AS `serial_number`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_fixture_dashboard_stats`
--

DROP TABLE IF EXISTS `view_fixture_dashboard_stats`;
/*!50001 DROP VIEW IF EXISTS `view_fixture_dashboard_stats`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_fixture_dashboard_stats` AS SELECT 
 1 AS `customer_id`,
 1 AS `total_fixtures`,
 1 AS `fixtures_in_stock`,
 1 AS `fixtures_deployed`,
 1 AS `fixtures_maintenance`,
 1 AS `fixtures_scrapped`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_fixture_lifespan_status`
--

DROP TABLE IF EXISTS `view_fixture_lifespan_status`;
/*!50001 DROP VIEW IF EXISTS `view_fixture_lifespan_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_fixture_lifespan_status` AS SELECT 
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `fixture_name`,
 1 AS `cycle_unit`,
 1 AS `replacement_cycle`,
 1 AS `total_uses`,
 1 AS `usage_ratio`,
 1 AS `remaining_uses`,
 1 AS `lifespan_status`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_fixture_quantity_mismatch_v6`
--

DROP TABLE IF EXISTS `view_fixture_quantity_mismatch_v6`;
/*!50001 DROP VIEW IF EXISTS `view_fixture_quantity_mismatch_v6`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_fixture_quantity_mismatch_v6` AS SELECT 
 1 AS `fixture_id`,
 1 AS `customer_id`,
 1 AS `fixture_name`,
 1 AS `expected_in_stock_qty`,
 1 AS `actual_in_stock_qty`,
 1 AS `diff_in_stock_qty`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_fixture_serials`
--

DROP TABLE IF EXISTS `view_fixture_serials`;
/*!50001 DROP VIEW IF EXISTS `view_fixture_serials`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_fixture_serials` AS SELECT 
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `serial_number`,
 1 AS `existence_status`,
 1 AS `usage_status`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_fixture_status`
--

DROP TABLE IF EXISTS `view_fixture_status`;
/*!50001 DROP VIEW IF EXISTS `view_fixture_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_fixture_status` AS SELECT 
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `fixture_name`,
 1 AS `in_stock_qty`,
 1 AS `customer_supplied_qty`,
 1 AS `self_purchased_qty`,
 1 AS `returned_qty`,
 1 AS `deployed_qty`,
 1 AS `maintenance_qty`,
 1 AS `scrapped_qty`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_inventory_mismatch_v6`
--

DROP TABLE IF EXISTS `view_inventory_mismatch_v6`;
/*!50001 DROP VIEW IF EXISTS `view_inventory_mismatch_v6`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_inventory_mismatch_v6` AS SELECT 
 1 AS `fixture_id`,
 1 AS `customer_id`,
 1 AS `fixture_name`,
 1 AS `serial_in_stock`,
 1 AS `serial_deployed`,
 1 AS `datecode_in_stock`,
 1 AS `cache_in_stock`,
 1 AS `cache_deployed`,
 1 AS `diff_in_stock`,
 1 AS `diff_deployed`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_material_transaction_details`
--

DROP TABLE IF EXISTS `view_material_transaction_details`;
/*!50001 DROP VIEW IF EXISTS `view_material_transaction_details`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_material_transaction_details` AS SELECT 
 1 AS `transaction_id`,
 1 AS `transaction_type`,
 1 AS `record_type`,
 1 AS `transaction_date`,
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `order_no`,
 1 AS `source_type`,
 1 AS `operator`,
 1 AS `note`,
 1 AS `total_quantity`,
 1 AS `created_at`,
 1 AS `item_id`,
 1 AS `serial_number`,
 1 AS `datecode`,
 1 AS `item_quantity`,
 1 AS `serial_existence_status`,
 1 AS `serial_usage_status`,
 1 AS `hover_item_text`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_model_max_stations`
--

DROP TABLE IF EXISTS `view_model_max_stations`;
/*!50001 DROP VIEW IF EXISTS `view_model_max_stations`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_model_max_stations` AS SELECT 
 1 AS `customer_id`,
 1 AS `model_id`,
 1 AS `model_name`,
 1 AS `station_id`,
 1 AS `station_name`,
 1 AS `max_available_stations`,
 1 AS `limiting_fixtures`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_serial_status`
--

DROP TABLE IF EXISTS `view_serial_status`;
/*!50001 DROP VIEW IF EXISTS `view_serial_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_serial_status` AS SELECT 
 1 AS `serial_id`,
 1 AS `customer_id`,
 1 AS `serial_number`,
 1 AS `fixture_id`,
 1 AS `fixture_name`,
 1 AS `source_type`,
 1 AS `existence_status`,
 1 AS `usage_status`,
 1 AS `is_available`,
 1 AS `receipt_date`,
 1 AS `return_date`,
 1 AS `note`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_upcoming_fixture_replacements`
--

DROP TABLE IF EXISTS `view_upcoming_fixture_replacements`;
/*!50001 DROP VIEW IF EXISTS `view_upcoming_fixture_replacements`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_upcoming_fixture_replacements` AS SELECT 
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `fixture_name`,
 1 AS `cycle_unit`,
 1 AS `replacement_cycle`,
 1 AS `total_uses`,
 1 AS `last_replacement_date`,
 1 AS `used_days`,
 1 AS `usage_ratio`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'fixture_management_test'
--
/*!50106 SET @save_time_zone= @@TIME_ZONE */ ;
/*!50106 DROP EVENT IF EXISTS `evt_validate_daily` */;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 /*!50106 EVENT `evt_validate_daily` ON SCHEDULE EVERY 1 DAY STARTS '2026-01-27 02:00:00' ON COMPLETION NOT PRESERVE ENABLE DO CALL sp_validate_fixture_quantities() */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
DELIMITER ;
/*!50106 SET TIME_ZONE= @save_time_zone */ ;

--
-- Dumping routines for database 'fixture_management_test'
--
/*!50003 DROP PROCEDURE IF EXISTS `sp_create_daily_snapshot` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_create_daily_snapshot`(IN p_snapshot_date date, IN p_customer_id varchar(50))
BEGIN
    /*
      DAILY INVENTORY SNAPSHOT (v6 FINAL)

      Snapshot 粒度：
        customer_id + fixture_id + snapshot_date

      設計原則：
        - serial 狀態：以 fixture_serials 為唯一真相
        - datecode：來自 fixture_datecode_inventory
        - 不使用 fixtures cache
        - 可重跑（ON DUPLICATE KEY UPDATE）
        - 不觸發任何 ledger / trigger
    */

    -- =====================================================
    -- Guard
    -- =====================================================
    IF p_customer_id IS NULL OR p_customer_id = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'customer_id is required';
    END IF;

    IF p_snapshot_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'snapshot_date is required';
    END IF;

    -- =====================================================
    -- Snapshot
    -- =====================================================
    INSERT INTO inventory_snapshots (
        customer_id,
        fixture_id,
        snapshot_date,

        -- serial 狀態
        serial_in_stock_qty,
        serial_available_qty,
        serial_deployed_qty,
        serial_maintenance_qty,
        serial_returned_qty,
        serial_scrapped_qty,

        -- datecode
        datecode_in_stock_qty,

        -- 彙總
        total_available_qty
    )
    SELECT
        f.customer_id,
        f.id AS fixture_id,
        p_snapshot_date,

        -- =================================================
        -- serial 狀態（existence / usage）
        -- =================================================
        IFNULL(ss.serial_in_stock_qty, 0)        AS serial_in_stock_qty,
        IFNULL(ss.serial_available_qty, 0)       AS serial_available_qty,
        IFNULL(ss.serial_deployed_qty, 0)        AS serial_deployed_qty,
        IFNULL(ss.serial_maintenance_qty, 0)     AS serial_maintenance_qty,
        IFNULL(ss.serial_returned_qty, 0)        AS serial_returned_qty,
        IFNULL(ss.serial_scrapped_qty, 0)        AS serial_scrapped_qty,

        -- =================================================
        -- datecode
        -- =================================================
        IFNULL(dc.datecode_in_stock_qty, 0)      AS datecode_in_stock_qty,

        -- =================================================
        -- total available
        -- =================================================
        IFNULL(ss.serial_available_qty, 0)
            + IFNULL(dc.datecode_in_stock_qty, 0)
            AS total_available_qty

    FROM fixtures f

             -- -----------------------------------------------------
             -- serial 聚合（唯一真相）
             -- -----------------------------------------------------
             LEFT JOIN (
        SELECT
            customer_id,
            fixture_id,

            SUM(existence_status = 'in_stock')                                   AS serial_in_stock_qty,
            SUM(existence_status = 'in_stock' AND usage_status = 'idle')        AS serial_available_qty,
            SUM(existence_status = 'in_stock' AND usage_status = 'deployed')    AS serial_deployed_qty,
            SUM(existence_status = 'in_stock' AND usage_status = 'maintenance') AS serial_maintenance_qty,
            SUM(existence_status = 'returned')                                   AS serial_returned_qty,
            SUM(existence_status = 'scrapped')                                   AS serial_scrapped_qty

        FROM fixture_serials
        WHERE customer_id = p_customer_id
        GROUP BY customer_id, fixture_id
    ) ss
                       ON ss.customer_id = f.customer_id
                           AND ss.fixture_id  = f.id

        -- -----------------------------------------------------
        -- datecode 聚合
        -- -----------------------------------------------------
             LEFT JOIN (
        SELECT
            customer_id,
            fixture_id,
            SUM(in_stock_qty) AS datecode_in_stock_qty
        FROM fixture_datecode_inventory
        GROUP BY customer_id, fixture_id
    ) dc
                       ON dc.customer_id = f.customer_id
                           AND dc.fixture_id  = f.id

    WHERE f.customer_id = p_customer_id
      AND f.deleted_at IS NULL

    ON DUPLICATE KEY UPDATE
                         serial_in_stock_qty        = VALUES(serial_in_stock_qty),
                         serial_available_qty       = VALUES(serial_available_qty),
                         serial_deployed_qty        = VALUES(serial_deployed_qty),
                         serial_maintenance_qty     = VALUES(serial_maintenance_qty),
                         serial_returned_qty        = VALUES(serial_returned_qty),
                         serial_scrapped_qty        = VALUES(serial_scrapped_qty),
                         datecode_in_stock_qty      = VALUES(datecode_in_stock_qty),
                         total_available_qty        = VALUES(total_available_qty);

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_insert_usage_log` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_insert_usage_log`(IN p_customer_id varchar(50), IN p_fixture_id varchar(50),
                                                             IN p_record_level varchar(20),
                                                             IN p_serial_number varchar(100),
                                                             IN p_station_id varchar(50), IN p_model_id varchar(50),
                                                             IN p_use_count int, IN p_operator varchar(100),
                                                             IN p_note text, OUT o_inserted_count int,
                                                             OUT o_message varchar(255))
proc: BEGIN
    DECLARE v_now   DATETIME DEFAULT NOW();
    DECLARE v_exist VARCHAR(20);
    DECLARE v_usage VARCHAR(20);
    DECLARE v_msg   VARCHAR(255);

    SET o_inserted_count = 0;
    SET o_message = NULL;

    -- =====================================================
    -- Guard
    -- =====================================================
    IF p_use_count IS NULL OR p_use_count <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'use_count must be > 0';
    END IF;

    -- =====================================================
    -- fixture-level usage（僅統計，不影響 serial 狀態）
    -- =====================================================
    IF p_record_level = 'fixture' THEN

        INSERT INTO usage_logs (
            customer_id,
            fixture_id,
            record_level,
            serial_number,
            station_id,
            model_id,
            use_count,
            operator,
            note,
            used_at
        ) VALUES (
                     p_customer_id,
                     p_fixture_id,
                     'fixture',
                     NULL,
                     p_station_id,
                     p_model_id,
                     p_use_count,
                     p_operator,
                     p_note,
                     v_now
                 );

        INSERT INTO fixture_usage_summary (
            customer_id,
            fixture_id,
            total_use_count,
            last_used_at,
            updated_at
        )
        VALUES (
                   p_customer_id,
                   p_fixture_id,
                   p_use_count,
                   v_now,
                   v_now
               )
        ON DUPLICATE KEY UPDATE
                             total_use_count = total_use_count + VALUES(total_use_count),
                             last_used_at    = GREATEST(last_used_at, VALUES(last_used_at)),
                             updated_at      = v_now;

        SET o_inserted_count = 1;
        SET o_message = 'fixture usage inserted';
        LEAVE proc;
    END IF;

    -- =====================================================
    -- serial-level usage（狀態敏感）
    -- =====================================================
    IF p_record_level = 'serial' THEN

        IF p_serial_number IS NULL OR p_serial_number = '' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'serial_number is required for serial usage';
        END IF;

        -- 鎖定並檢查序號狀態
        SELECT existence_status, usage_status
        INTO v_exist, v_usage
        FROM fixture_serials
        WHERE customer_id   = p_customer_id
          AND fixture_id    = p_fixture_id
          AND serial_number = p_serial_number
            FOR UPDATE;

        IF v_exist IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'serial not found';
        END IF;

        IF NOT (v_exist = 'in_stock' AND v_usage = 'idle') THEN
            SET v_msg = CONCAT('serial not available: ', v_exist, '/', v_usage);
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = v_msg;
        END IF;

        -- 1️⃣ 寫 usage log
        INSERT INTO usage_logs (
            customer_id,
            fixture_id,
            record_level,
            serial_number,
            station_id,
            model_id,
            use_count,
            operator,
            note,
            used_at
        ) VALUES (
                     p_customer_id,
                     p_fixture_id,
                     'serial',
                     p_serial_number,
                     p_station_id,
                     p_model_id,
                     p_use_count,
                     p_operator,
                     p_note,
                     v_now
                 );

        -- 2️⃣ 更新 serial 狀態（進入 deployed）
        UPDATE fixture_serials
        SET
            usage_status       = 'deployed',
            current_station_id = p_station_id,
            last_use_date      = DATE(v_now),
            total_uses         = total_uses + p_use_count,
            updated_at         = v_now
        WHERE customer_id   = p_customer_id
          AND fixture_id    = p_fixture_id
          AND serial_number = p_serial_number;

        -- 3️⃣ fixture usage summary
        INSERT INTO fixture_usage_summary (
            customer_id,
            fixture_id,
            total_use_count,
            last_used_at,
            updated_at
        )
        VALUES (
                   p_customer_id,
                   p_fixture_id,
                   p_use_count,
                   v_now,
                   v_now
               )
        ON DUPLICATE KEY UPDATE
                             total_use_count = total_use_count + VALUES(total_use_count),
                             last_used_at    = GREATEST(last_used_at, VALUES(last_used_at)),
                             updated_at      = v_now;

        -- 4️⃣ serial usage summary
        INSERT INTO serial_usage_summary (
            customer_id,
            fixture_id,
            serial_number,
            total_use_count,
            last_used_at,
            updated_at
        )
        VALUES (
                   p_customer_id,
                   p_fixture_id,
                   p_serial_number,
                   p_use_count,
                   v_now,
                   v_now
               )
        ON DUPLICATE KEY UPDATE
                             total_use_count = total_use_count + VALUES(total_use_count),
                             last_used_at    = GREATEST(last_used_at, VALUES(last_used_at)),
                             updated_at      = v_now;

        SET o_inserted_count = 1;
        SET o_message = 'serial usage inserted and deployed';
        LEAVE proc;
    END IF;

    -- ✅ 修正：SIGNAL 不直接 CONCAT
    SET v_msg = CONCAT('unknown record_level: ', p_record_level);
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = v_msg;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_material_receipt_v6` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_material_receipt_v6`(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_order_no VARCHAR(100),
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_created_by INT,
    IN p_record_type ENUM ('batch','individual','datecode'),
    IN p_source_type ENUM ('self_purchased','customer_supplied'),
    IN p_serials_csv TEXT,
    IN p_datecode VARCHAR(50),
    IN p_quantity INT,
    OUT o_transaction_id INT,
    OUT o_message VARCHAR(100)
)
BEGIN

    DECLARE v_transaction_id INT DEFAULT NULL;
    DECLARE v_qty INT DEFAULT 0;

    DECLARE v_tmp TEXT;
    DECLARE v_pos INT DEFAULT 0;
    DECLARE v_serial VARCHAR(100);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            RESIGNAL;
        END;

    SET o_transaction_id = NULL;
    SET o_message = NULL;

    /* =========================================================
       1️⃣ 基本驗證
    ========================================================= */

    IF p_record_type NOT IN ('batch','individual','datecode') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='record_type 不合法';
    END IF;

    IF p_source_type NOT IN ('self_purchased','customer_supplied') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='source_type 不合法';
    END IF;

    /* =========================================================
       2️⃣ 計算 quantity
    ========================================================= */

    IF p_record_type = 'datecode' THEN

        IF p_datecode IS NULL OR TRIM(p_datecode)='' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='datecode 必填';
        END IF;

        IF p_quantity IS NULL OR p_quantity<=0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='quantity 必須 > 0';
        END IF;

        SET v_qty = p_quantity;

    ELSE

        IF p_serials_csv IS NULL OR TRIM(p_serials_csv)='' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='serials_csv 必填';
        END IF;

        SET v_tmp = p_serials_csv;
        SET v_qty = 0;

        serial_count_loop:
        WHILE v_tmp IS NOT NULL AND LENGTH(v_tmp) > 0 DO
                SET v_pos = LOCATE(',', v_tmp);

                IF v_pos = 0 THEN
                    SET v_serial = TRIM(v_tmp);
                    SET v_tmp = '';
                ELSE
                    SET v_serial = TRIM(SUBSTRING(v_tmp,1,v_pos-1));
                    SET v_tmp = SUBSTRING(v_tmp,v_pos+1);
                END IF;

                IF v_serial <> '' THEN
                    SET v_qty = v_qty + 1;
                END IF;

            END WHILE;

        IF v_qty <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='沒有有效序號';
        END IF;

    END IF;

    /* =========================================================
       3️⃣ 開始交易
    ========================================================= */

    START TRANSACTION;

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
    )
    VALUES (
               'receipt',
               p_record_type,
               v_qty,
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

    /* =========================================================
       4️⃣ 實體寫入
    ========================================================= */

    IF p_record_type = 'datecode' THEN

        INSERT INTO fixture_datecode_inventory (
            customer_id,
            fixture_id,
            datecode,
            in_stock_qty,
            source_type
        )
        VALUES (
                   p_customer_id,
                   p_fixture_id,
                   p_datecode,
                   p_quantity,
                   p_source_type
               )
        ON DUPLICATE KEY UPDATE
            in_stock_qty = in_stock_qty + VALUES(in_stock_qty);

        INSERT INTO material_transaction_items (
            transaction_id,
            customer_id,
            fixture_id,
            datecode,
            quantity
        )
        VALUES (
                   v_transaction_id,
                   p_customer_id,
                   p_fixture_id,
                   p_datecode,
                   p_quantity
               );

    ELSE

        /* serial receipt 必須強制設定狀態 */
        CALL sp_receipt_fixture_serials(
                p_customer_id,
                p_fixture_id,
                p_serials_csv,
                v_transaction_id
             );

    END IF;

    COMMIT;

    /* =========================================================
       5️⃣ rebuild cache
    ========================================================= */

    CALL sp_rebuild_fixture_quantities_v2(
            p_customer_id,
            p_fixture_id
         );

    SET o_transaction_id = v_transaction_id;
    SET o_message = 'OK';

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_material_return_v6` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_material_return_v6`(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id  VARCHAR(50),
    IN p_order_no    VARCHAR(100),
    IN p_operator    VARCHAR(100),
    IN p_note        TEXT,
    IN p_created_by  INT,
    IN p_record_type ENUM ('batch','individual','datecode'),
    IN p_source_type ENUM ('self_purchased','customer_supplied'),
    IN p_serials_csv TEXT,
    IN p_datecode    VARCHAR(50),
    IN p_quantity    INT,
    OUT o_transaction_id INT,
    OUT o_message VARCHAR(100)
)
BEGIN
    /* =========================================================
     * 0. DECLARE（順序不可動）
     * ========================================================= */
    DECLARE v_transaction_id INT DEFAULT NULL;
DECLARE v_qty INT DEFAULT 0;

DECLARE v_tmp TEXT;
DECLARE v_pos INT DEFAULT 0;
DECLARE v_serial VARCHAR(100);

    /* =========================================================
     * 全域錯誤處理
     * ========================================================= */
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
ROLLBACK;
RESIGNAL;
END;

    /* =========================================================
     * 1. 初始化 OUT
     * ========================================================= */
SET o_transaction_id = NULL;
SET o_message = NULL;

/* =========================================================
 * 2. 基本參數驗證
 * ========================================================= */
IF p_record_type NOT IN ('batch','individual','datecode') THEN
        SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'record_type 不合法';
END IF;

IF p_source_type NOT IN ('self_purchased','customer_supplied') THEN
        SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'source_type 不合法';
END IF;

    /* =========================================================
     * 3. record_type 驗證 + 數量計算（validate-first）
     * ========================================================= */
IF p_record_type = 'datecode' THEN

        IF p_datecode IS NULL OR TRIM(p_datecode) = '' THEN
            SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'datecode 模式需要 datecode';
END IF;

IF p_quantity IS NULL OR p_quantity <= 0 THEN
            SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'datecode 模式需要 quantity > 0';
END IF;

IF p_serials_csv IS NOT NULL AND TRIM(p_serials_csv) <> '' THEN
            SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'datecode 模式不可傳入 serials';
END IF;

SET v_qty = p_quantity;

CALL sp_validate_datecode_can_return(
        p_customer_id,
        p_fixture_id,
        p_datecode,
        p_source_type,
        p_quantity
     );

ELSE

        IF p_serials_csv IS NULL OR TRIM(p_serials_csv) = '' THEN
            SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'serial 模式需要 serials_csv';
END IF;

SET v_tmp = p_serials_csv;
SET v_qty = 0;

serial_count_loop:
        WHILE v_tmp IS NOT NULL AND LENGTH(v_tmp) > 0 DO
SET v_pos = LOCATE(',', v_tmp);

IF v_pos = 0 THEN
SET v_serial = TRIM(v_tmp);
SET v_tmp = '';
ELSE
SET v_serial = TRIM(SUBSTRING(v_tmp, 1, v_pos - 1));
SET v_tmp = SUBSTRING(v_tmp, v_pos + 1);
END IF;

IF v_serial = '' THEN
                ITERATE serial_count_loop;
END IF;

SET v_qty = v_qty + 1;
END WHILE;

IF v_qty <= 0 THEN
            SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'serials_csv 解析後沒有有效序號';
END IF;

CALL sp_validate_serials_can_return(
        p_customer_id,
        p_fixture_id,
        p_serials_csv
     );

END IF;

    /* =========================================================
     * 4. 開始交易
     * ========================================================= */
START TRANSACTION;

/* =========================================================
 * 5. INSERT immutable ledger
 * ========================================================= */
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
             v_qty,
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

/* =========================================================
 * 6. 實體資料異動（v6 真相）
 * ========================================================= */
IF p_record_type = 'datecode' THEN

        /* 防止扣到負數：in_stock_qty 必須足夠 */
UPDATE fixture_datecode_inventory
SET
    in_stock_qty = in_stock_qty - v_qty,
    returned_qty = IFNULL(returned_qty, 0) + v_qty,
    updated_at   = NOW()
WHERE customer_id = p_customer_id
  AND fixture_id  = p_fixture_id
  AND datecode    = p_datecode
  AND source_type = p_source_type
  AND in_stock_qty >= v_qty;

IF ROW_COUNT() = 0 THEN
            SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'datecode 庫存不足或找不到對應列，無法退料';
END IF;

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
             v_qty
         );

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
             v_qty
         );

ELSE

        /* ✅ 序號退料：必須更新 fixture_serials.existence_status='returned' */
CALL sp_return_fixture_serials(
        p_customer_id,
        p_fixture_id,
        p_serials_csv,
        v_transaction_id
     );

END IF;

COMMIT;

/* =========================================================
 * 7. 退料後同步 cache
 * ========================================================= */
CALL sp_rebuild_fixture_quantities_v2(
        p_customer_id,
        p_fixture_id
     );

SET o_transaction_id = v_transaction_id;
SET o_message = 'OK';

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_material_transactions_count` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_material_transactions_count`(IN p_customer_id varchar(50), IN p_date_from date, IN p_date_to date)
BEGIN
    SELECT COUNT(*) AS total_count
    FROM material_transactions t
    WHERE
        (p_customer_id IS NULL OR t.customer_id = p_customer_id)
      AND (p_date_from IS NULL OR t.transaction_date >= p_date_from)
      AND (p_date_to   IS NULL OR t.transaction_date <= p_date_to);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_material_transactions_page` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_material_transactions_page`(IN p_customer_id varchar(50),
                                                                       IN p_date_from date, IN p_date_to date,
                                                                       IN p_page int, IN p_page_size int)
BEGIN
    DECLARE v_offset INT;

    -- 防呆
    IF p_page < 1 THEN SET p_page = 1; END IF;
    IF p_page_size < 1 THEN SET p_page_size = 20; END IF;
    IF p_page_size > 200 THEN SET p_page_size = 200; END IF;

    SET v_offset = (p_page - 1) * p_page_size;

    SELECT
        t.id               AS transaction_id,
        t.customer_id,
        t.fixture_id,
        t.order_no,
        t.transaction_type,
        t.record_type,
        t.quantity,
        t.source_type,
        t.transaction_date,
        t.operator,
        t.note,
        t.created_at
    FROM material_transactions t
    WHERE
        (p_customer_id IS NULL OR t.customer_id = p_customer_id)
      AND (p_date_from IS NULL OR t.transaction_date >= p_date_from)
      AND (p_date_to   IS NULL OR t.transaction_date <= p_date_to)
    ORDER BY t.transaction_date DESC, t.id DESC
    LIMIT p_page_size OFFSET v_offset;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rebuild_all_fixtures_v2` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_rebuild_all_fixtures_v2`()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_fixture_id VARCHAR(50);
    DECLARE v_customer_id VARCHAR(50);

    DECLARE cur CURSOR FOR
        SELECT id, customer_id
        FROM fixtures
        WHERE deleted_at IS NULL;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;

    read_loop:
    LOOP
        FETCH cur INTO v_fixture_id, v_customer_id;
        IF done = 1 THEN
            LEAVE read_loop;
        END IF;

        CALL sp_rebuild_fixture_quantities_v2(
                v_customer_id,
                v_fixture_id
             );
    END LOOP;

    CLOSE cur;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_rebuild_fixture_quantities_v2` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_rebuild_fixture_quantities_v2`(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id  VARCHAR(50)
)
BEGIN
    /* =========================================================
     * v6 rebuild 原則：
     * - serial：以 existence_status / usage_status 為唯一真相
     * - datecode：以 fixture_datecode_inventory 為唯一真相
     * - fixtures 僅為 cache，這裡是唯一寫入點
     * ========================================================= */

    /* ---------- serial 統計 ---------- */
    DECLARE v_serial_in_stock        INT DEFAULT 0;
    DECLARE v_serial_available       INT DEFAULT 0;
    DECLARE v_serial_deployed        INT DEFAULT 0;
    DECLARE v_serial_maintenance     INT DEFAULT 0;
    DECLARE v_serial_returned        INT DEFAULT 0;
    DECLARE v_serial_scrapped        INT DEFAULT 0;

    DECLARE v_serial_self_in_stock   INT DEFAULT 0;
    DECLARE v_serial_cust_in_stock   INT DEFAULT 0;

    /* ---------- datecode 統計 ---------- */
    DECLARE v_dc_in_stock            INT DEFAULT 0;
    DECLARE v_dc_returned            INT DEFAULT 0;
    DECLARE v_dc_self_in_stock       INT DEFAULT 0;
    DECLARE v_dc_cust_in_stock       INT DEFAULT 0;

    /* =========================================================
     * 1️⃣ Serial rebuild
     * ========================================================= */
    SELECT
        IFNULL(SUM(fs.existence_status = 'in_stock'), 0),
        IFNULL(SUM(fs.existence_status = 'returned'), 0),
        IFNULL(SUM(fs.existence_status = 'scrapped'), 0),

        IFNULL(SUM(fs.existence_status = 'in_stock' AND fs.usage_status = 'deployed'), 0),
        IFNULL(SUM(fs.existence_status = 'in_stock' AND fs.usage_status = 'maintenance'), 0),
        IFNULL(SUM(fs.existence_status = 'in_stock' AND fs.usage_status = 'idle'), 0),

        IFNULL(SUM(fs.existence_status = 'in_stock' AND fs.source_type = 'self_purchased'), 0),
        IFNULL(SUM(fs.existence_status = 'in_stock' AND fs.source_type = 'customer_supplied'), 0)

    INTO
        v_serial_in_stock,
        v_serial_returned,
        v_serial_scrapped,
        v_serial_deployed,
        v_serial_maintenance,
        v_serial_available,
        v_serial_self_in_stock,
        v_serial_cust_in_stock

    FROM fixture_serials fs
    WHERE fs.customer_id = p_customer_id
      AND fs.fixture_id  = p_fixture_id
      AND fs.deleted_at IS NULL;


    /* =========================================================
     * 2️⃣ Datecode rebuild（修正重點：加 returned_qty）
     * ========================================================= */
    SELECT
        IFNULL(SUM(in_stock_qty), 0),
        IFNULL(SUM(returned_qty), 0),

        IFNULL(SUM(
                       CASE WHEN source_type = 'self_purchased'
                                THEN in_stock_qty ELSE 0 END
               ), 0),

        IFNULL(SUM(
                       CASE WHEN source_type = 'customer_supplied'
                                THEN in_stock_qty ELSE 0 END
               ), 0)

    INTO
        v_dc_in_stock,
        v_dc_returned,
        v_dc_self_in_stock,
        v_dc_cust_in_stock

    FROM fixture_datecode_inventory
    WHERE customer_id = p_customer_id
      AND fixture_id  = p_fixture_id;


    /* =========================================================
     * 3️⃣ 回寫 fixtures cache（已包含 datecode returned）
     * ========================================================= */
    UPDATE fixtures
    SET
        /* 總庫存（serial + datecode） */
        in_stock_qty =
            IFNULL(v_serial_in_stock,0)
                + IFNULL(v_dc_in_stock,0),

        /* 來源別 */
        self_purchased_qty =
            IFNULL(v_serial_self_in_stock,0)
                + IFNULL(v_dc_self_in_stock,0),

        customer_supplied_qty =
            IFNULL(v_serial_cust_in_stock,0)
                + IFNULL(v_dc_cust_in_stock,0),

        /* serial 使用狀態 */
        deployed_qty    = IFNULL(v_serial_deployed,0),
        maintenance_qty = IFNULL(v_serial_maintenance,0),

        /*  existence（修正關鍵） */
        returned_qty =
            IFNULL(v_serial_returned,0)
                + IFNULL(v_dc_returned,0),

        scrapped_qty =
            IFNULL(v_serial_scrapped,0)

    WHERE id = p_fixture_id
      AND customer_id = p_customer_id;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_receipt_fixture_serials` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_receipt_fixture_serials`(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_serials_csv TEXT,
    IN p_transaction_id INT
)
BEGIN

    DECLARE v_serial       VARCHAR(100);
    DECLARE v_pos          INT DEFAULT 0;
    DECLARE v_tmp          TEXT;
    DECLARE v_tx_date      DATE;
    DECLARE v_source_type  VARCHAR(30);
    DECLARE v_exist        VARCHAR(20);
    DECLARE v_usage        VARCHAR(20);
    DECLARE v_msg          TEXT;

    /* =========================================================
       0️⃣ 交易主表（唯一可信來源）
    ========================================================= */
    SELECT
        t.transaction_date,
        t.source_type
    INTO
        v_tx_date,
        v_source_type
    FROM material_transactions t
    WHERE t.id = p_transaction_id
      AND t.customer_id = p_customer_id
      AND t.fixture_id  = p_fixture_id
      AND t.transaction_type = 'receipt'
        FOR UPDATE;

    IF v_tx_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '收料交易不存在或不匹配';
    END IF;

    SET v_tmp = p_serials_csv;

    /* =========================================================
       1️⃣ 逐筆處理
    ========================================================= */
    serial_loop:
    WHILE v_tmp IS NOT NULL AND LENGTH(v_tmp) > 0 DO

            SET v_pos = LOCATE(',', v_tmp);

            IF v_pos = 0 THEN
                SET v_serial = TRIM(v_tmp);
                SET v_tmp = '';
            ELSE
                SET v_serial = TRIM(SUBSTRING(v_tmp,1,v_pos-1));
                SET v_tmp = SUBSTRING(v_tmp,v_pos+1);
            END IF;

            IF v_serial = '' THEN
                ITERATE serial_loop;
            END IF;

            /* =====================================================
               2️⃣ 查詢是否已存在
            ===================================================== */
            SET v_exist = NULL;
            SET v_usage = NULL;

            SELECT existence_status, usage_status
            INTO v_exist, v_usage
            FROM fixture_serials
            WHERE customer_id   = p_customer_id
              AND fixture_id    = p_fixture_id
              AND serial_number = v_serial
              AND deleted_at IS NULL
            LIMIT 1
            FOR UPDATE;

            /* =====================================================
               3️⃣ 狀態判斷邏輯（v6 正式版）
            ===================================================== */

            IF v_exist IS NOT NULL THEN

                /* 已存在且還在庫 → 禁止 */
                IF v_exist = 'in_stock' THEN
                    SET v_msg = CONCAT('序號已在庫中，禁止重複收料: ', v_serial);
                    SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = v_msg;
                END IF;

                /* 已報廢 → 禁止 */
                IF v_exist = 'scrapped' THEN
                    SET v_msg = CONCAT('序號已報廢，不可再收料: ', v_serial);
                    SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = v_msg;
                END IF;

                /* 已退料 → 允許重新收料（復活） */
                IF v_exist = 'returned' THEN

                    UPDATE fixture_serials
                    SET
                        existence_status        = 'in_stock',
                        usage_status            = 'idle',
                        receipt_date            = v_tx_date,
                        receipt_transaction_id  = p_transaction_id,
                        source_type             = v_source_type,
                        updated_at              = NOW()
                    WHERE customer_id   = p_customer_id
                      AND fixture_id    = p_fixture_id
                      AND serial_number = v_serial;

                END IF;

            ELSE

                /* =====================================================
                   4️⃣ 新序號 → 正常 INSERT
                ===================================================== */
                INSERT INTO fixture_serials (
                    customer_id,
                    fixture_id,
                    serial_number,
                    source_type,
                    existence_status,
                    usage_status,
                    receipt_date,
                    receipt_transaction_id
                ) VALUES (
                             p_customer_id,
                             p_fixture_id,
                             v_serial,
                             v_source_type,
                             'in_stock',
                             'idle',
                             v_tx_date,
                             p_transaction_id
                         );

            END IF;

            /* =====================================================
               5️⃣ 寫入交易明細
            ===================================================== */
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

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_restore_fixture` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_restore_fixture`(IN p_customer_id varchar(50), IN p_fixture_id varchar(50))
BEGIN
    /* ===============================
     * 1) 還原 fixture（限本客戶）
     * =============================== */
    UPDATE fixtures
    SET deleted_at = NULL
    WHERE id = p_fixture_id
      AND customer_id = p_customer_id;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '找不到可還原的 fixture（或客戶不匹配）';
    END IF;

    /* ===============================
     * 2) 還原 serial（僅限仍存在者）
     * =============================== */
    UPDATE fixture_serials
    SET deleted_at = NULL
    WHERE customer_id = p_customer_id
      AND fixture_id  = p_fixture_id
      AND existence_status = 'in_stock';
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_return_fixture_serials` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_return_fixture_serials`(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_serials_csv TEXT,
    IN p_transaction_id INT
)
BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT DEFAULT 0;
    DECLARE v_tx_date DATE;
    DECLARE v_exists_id VARCHAR(50);
    DECLARE v_msg TEXT;
    DECLARE v_tmp TEXT;

    /* =========================================================
     * 0) 驗證交易主表（唯一可信來源）
     * ========================================================= */
    SELECT t.transaction_date
    INTO v_tx_date
    FROM material_transactions t
    WHERE t.id = p_transaction_id
      AND t.customer_id = p_customer_id
      AND t.fixture_id  = p_fixture_id
      AND t.transaction_type = 'return'
        FOR UPDATE;

    IF v_tx_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '退料交易不存在或不匹配';
    END IF;

    SET v_tmp = p_serials_csv;

    /* =========================================================
     * 1) CSV 逐筆處理
     * ========================================================= */
    serial_loop:
    WHILE v_tmp IS NOT NULL AND LENGTH(v_tmp) > 0 DO

            SET v_pos = LOCATE(',', v_tmp);

            IF v_pos = 0 THEN
                SET v_serial = TRIM(v_tmp);
                SET v_tmp = '';
            ELSE
                SET v_serial = TRIM(SUBSTRING(v_tmp, 1, v_pos - 1));
                SET v_tmp = SUBSTRING(v_tmp, v_pos + 1);
            END IF;

            IF v_serial = '' THEN
                ITERATE serial_loop;
            END IF;

            /* =====================================================
             * 2) 驗證 serial（只檢查 existence）
             * ===================================================== */
            SET v_exists_id = NULL;

            SELECT fs.id
            INTO v_exists_id
            FROM fixture_serials fs
            WHERE fs.customer_id   = p_customer_id
              AND fs.fixture_id    = p_fixture_id
              AND fs.serial_number = v_serial
              AND fs.deleted_at IS NULL
              AND fs.existence_status = 'in_stock'
            LIMIT 1
            FOR UPDATE;

            IF v_exists_id IS NULL THEN
                SET v_msg = CONCAT('序號不存在或已退/報廢: ', v_serial);
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = v_msg;
            END IF;

            /* =====================================================
             * 3) 更新 serial 狀態
             * ===================================================== */
            UPDATE fixture_serials
            SET
                existence_status      = 'returned',
                usage_status          = 'idle',
                current_station_id    = NULL,
                return_date           = v_tx_date,
                return_transaction_id = p_transaction_id,
                updated_at            = NOW()
            WHERE id = v_exists_id;

            /* =====================================================
             * 4) 寫入交易明細
             * ===================================================== */
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

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_show_usage_guide` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_show_usage_guide`()
BEGIN
SELECT '=== Trigger 優化系統使用指南 ===' AS title;

SELECT '1. 查看最近的 Trigger 錯誤' AS step,
       'SELECT * FROM v_recent_trigger_errors;' AS sql_command;

SELECT '2. 查看數據不一致的治具' AS step,
       'SELECT * FROM v_inconsistent_fixtures;' AS sql_command;

SELECT '3. 驗證所有治具數量' AS step,
       'CALL sp_validate_fixture_quantities();' AS sql_command;

SELECT '4. 修復單一治具' AS step,
       'CALL sp_rebuild_fixture_quantities(''治具ID'', ''客戶ID'', ''操作人'');' AS sql_command;

SELECT '5. 批次修復所有治具' AS step,
       'CALL sp_rebuild_all_fixtures(''操作人'');' AS sql_command;

SELECT '6. 查看修復記錄' AS step,
       'SELECT * FROM fixture_quantity_repairs ORDER BY repaired_at DESC LIMIT 20;' AS sql_command;

SELECT '7. 統計 Trigger 錯誤頻率' AS step,
       'SELECT trigger_name, COUNT(*) AS error_count FROM trigger_error_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY trigger_name;' AS sql_command;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_soft_delete_fixture` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_soft_delete_fixture`(IN p_customer_id varchar(50), IN p_fixture_id varchar(50))
BEGIN
    /* ===============================
     * 1) soft delete fixture（限本客戶）
     * =============================== */
    UPDATE fixtures
    SET deleted_at = NOW()
    WHERE id = p_fixture_id
      AND customer_id = p_customer_id;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '找不到可刪除的 fixture（或客戶不匹配）';
    END IF;

    /* ===============================
     * 2) soft delete serial（僅限仍存在者）
     * =============================== */
    UPDATE fixture_serials
    SET deleted_at = NOW()
    WHERE customer_id = p_customer_id
      AND fixture_id  = p_fixture_id
      AND existence_status = 'in_stock';
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_sync_model_stations_from_requirements` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_sync_model_stations_from_requirements`(
    IN p_customer_id VARCHAR(50)
)
BEGIN
    INSERT INTO model_stations (
        customer_id,
        model_id,
        station_id,
        note
    )
    SELECT DISTINCT
        fr.customer_id,
        fr.model_id,
        fr.station_id,
        '由 fixture_requirements 同步建立'
    FROM fixture_requirements fr
             LEFT JOIN model_stations ms
                       ON ms.model_id = fr.model_id
                           AND ms.station_id = fr.station_id
    WHERE fr.customer_id = p_customer_id
      AND ms.id IS NULL;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_validate_datecode_can_receipt` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_validate_datecode_can_receipt`(IN p_datecode varchar(50), IN p_quantity int)
BEGIN
    IF p_datecode IS NULL OR p_datecode = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode 模式需要 datecode';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode 模式需要 quantity > 0';
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_validate_datecode_can_return` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_validate_datecode_can_return`(IN p_customer_id varchar(50),
                                                                         IN p_fixture_id varchar(50),
                                                                         IN p_datecode varchar(50),
                                                                         IN p_source_type enum ('self_purchased', 'customer_supplied'),
                                                                         IN p_quantity int)
BEGIN
    DECLARE v_stock INT DEFAULT NULL;

    IF p_datecode IS NULL OR TRIM(p_datecode) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode 模式需要 datecode';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode 模式需要 quantity > 0';
    END IF;

    SELECT in_stock_qty
    INTO v_stock
    FROM fixture_datecode_inventory
    WHERE customer_id = p_customer_id
      AND fixture_id  = p_fixture_id
      AND datecode    = p_datecode
      AND source_type = p_source_type;

    IF v_stock IS NULL OR v_stock < p_quantity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode 庫存不足或不存在';
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_validate_fixture_quantities` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_validate_fixture_quantities`()
BEGIN
    
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_validation_results (
                                                                     fixture_id VARCHAR(50),
                                                                     customer_id VARCHAR(50),
                                                                     fixture_name VARCHAR(255),
                                                                     issue_type VARCHAR(50),
                                                                     expected_value INT,
                                                                     actual_value INT,
                                                                     difference INT
    );

    
    TRUNCATE TABLE temp_validation_results;

    
    INSERT INTO temp_validation_results
    SELECT
        f.id,
        f.customer_id,
        f.fixture_name,
        'in_stock_qty' AS issue_type,
        COUNT(CASE WHEN fs.status = 'in_stock' THEN 1 END)
            + IFNULL(SUM(fdi.in_stock_qty), 0) AS expected_value,
        f.in_stock_qty AS actual_value,
        f.in_stock_qty - (
            COUNT(CASE WHEN fs.status = 'in_stock' THEN 1 END)
                + IFNULL(SUM(fdi.in_stock_qty), 0)
            ) AS difference
    FROM fixtures f
             LEFT JOIN fixture_serials fs ON fs.fixture_id = f.id
             LEFT JOIN fixture_datecode_inventory fdi ON fdi.fixture_id = f.id
    GROUP BY f.id, f.customer_id, f.fixture_name, f.in_stock_qty
    HAVING difference != 0;

    
    INSERT INTO temp_validation_results
    SELECT
        f.id,
        f.customer_id,
        f.fixture_name,
        'deployed_qty' AS issue_type,
        COUNT(CASE WHEN fs.status = 'deployed' THEN 1 END) AS expected_value,
        f.deployed_qty AS actual_value,
        f.deployed_qty - COUNT(CASE WHEN fs.status = 'deployed' THEN 1 END) AS difference
    FROM fixtures f
             LEFT JOIN fixture_serials fs ON fs.fixture_id = f.id
    GROUP BY f.id, f.customer_id, f.fixture_name, f.deployed_qty
    HAVING difference != 0;

    
    INSERT INTO temp_validation_results
    SELECT
        f.id,
        f.customer_id,
        f.fixture_name,
        'self_purchased_qty' AS issue_type,
        COUNT(CASE WHEN fs.source_type = 'self_purchased' THEN 1 END)
            + IFNULL(SUM(CASE WHEN fdi.source_type = 'self_purchased'
                                  THEN fdi.in_stock_qty ELSE 0 END), 0) AS expected_value,
        f.self_purchased_qty AS actual_value,
        f.self_purchased_qty - (
            COUNT(CASE WHEN fs.source_type = 'self_purchased' THEN 1 END)
                + IFNULL(SUM(CASE WHEN fdi.source_type = 'self_purchased'
                                      THEN fdi.in_stock_qty ELSE 0 END), 0)
            ) AS difference
    FROM fixtures f
             LEFT JOIN fixture_serials fs ON fs.fixture_id = f.id
             LEFT JOIN fixture_datecode_inventory fdi ON fdi.fixture_id = f.id
    GROUP BY f.id, f.customer_id, f.fixture_name, f.self_purchased_qty
    HAVING difference != 0;

    
    SELECT * FROM temp_validation_results;

    
    IF EXISTS (SELECT 1 FROM temp_validation_results) THEN
        INSERT INTO trigger_error_logs (
            trigger_name,
            table_name,
            error_message,
            context_data
        )
        SELECT
            'sp_validate_fixture_quantities',
            'fixtures',
            '數據不一致',
            JSON_OBJECT(
                    'fixture_id', fixture_id,
                    'issue_type', issue_type,
                    'difference', difference
            )
        FROM temp_validation_results;
    END IF;

END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_validate_inventory_consistency` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_validate_inventory_consistency`()
BEGIN
    
    SELECT
        f.id,
        f.customer_id,
        f.in_stock_qty,
        COUNT(CASE WHEN fs.status = 'in_stock' THEN 1 END) AS actual_in_stock,
        f.deployed_qty,
        COUNT(CASE WHEN fs.status = 'deployed' THEN 1 END) AS actual_deployed
    FROM fixtures f
             LEFT JOIN fixture_serials fs ON fs.fixture_id = f.id AND fs.customer_id = f.customer_id
    GROUP BY f.id, f.customer_id
    HAVING
        f.in_stock_qty != actual_in_stock OR
        f.deployed_qty != actual_deployed;

    
    SELECT
        f.id,
        f.in_stock_qty AS fixture_in_stock,
        IFNULL(SUM(fdi.in_stock_qty), 0) AS datecode_in_stock,
        COUNT(CASE WHEN fs.status = 'in_stock' THEN 1 END) AS serial_in_stock
    FROM fixtures f
             LEFT JOIN fixture_datecode_inventory fdi ON fdi.fixture_id = f.id
             LEFT JOIN fixture_serials fs ON fs.fixture_id = f.id
    GROUP BY f.id
    HAVING fixture_in_stock != (serial_in_stock + datecode_in_stock);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_validate_serials_can_receipt` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_validate_serials_can_receipt`(IN p_customer_id varchar(50),
                                                                         IN p_fixture_id varchar(50),
                                                                         IN p_serials_csv text)
BEGIN
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos INT DEFAULT 0;
    DECLARE v_exists INT;
    DECLARE v_msg TEXT;

    IF p_serials_csv IS NULL OR TRIM(p_serials_csv) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'serial 模式需要 serials_csv';
    END IF;

    /* =========================================================
     * v6 語意說明：
     * - serial 只要「曾存在於系統中」，即不可再次收料
     * - 包含 soft delete / returned / scrapped
     * - 併發保護由 receipt SP + UNIQUE constraint 負責
     * ========================================================= */

    serial_loop:
    WHILE LENGTH(p_serials_csv) > 0 DO

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

            SELECT COUNT(*)
            INTO v_exists
            FROM fixture_serials
            WHERE customer_id   = p_customer_id
              AND fixture_id    = p_fixture_id
              AND serial_number = v_serial;

            IF v_exists > 0 THEN
                SET v_msg = CONCAT(
                        '序號曾存在於系統中，不可再次收料: ',
                        v_serial
                            );
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = v_msg;
            END IF;

        END WHILE;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_validate_serials_can_return` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE PROCEDURE `sp_validate_serials_can_return`(IN p_customer_id varchar(50),
                                                                        IN p_fixture_id varchar(50),
                                                                        IN p_serials_csv text)
BEGIN
    DECLARE v_csv    TEXT;
    DECLARE v_serial VARCHAR(100);
    DECLARE v_pos    INT DEFAULT 0;
    DECLARE v_exists INT DEFAULT 0;
    DECLARE v_msg    TEXT;

    IF p_serials_csv IS NULL OR TRIM(p_serials_csv) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'serial 模式需要 serials_csv';
    END IF;

    SET v_csv = p_serials_csv;

    /* =========================================================
     * v6 規則：
     * - serial 必須存在
     * - existence_status = in_stock
     * - usage_status IN ('idle','maintenance')
     * ========================================================= */

    serial_loop:
    WHILE v_csv IS NOT NULL AND LENGTH(v_csv) > 0 DO

            SET v_pos = LOCATE(',', v_csv);

            IF v_pos = 0 THEN
                SET v_serial = TRIM(v_csv);
                SET v_csv = '';
            ELSE
                SET v_serial = TRIM(SUBSTRING(v_csv, 1, v_pos - 1));
                SET v_csv = SUBSTRING(v_csv, v_pos + 1);
            END IF;

            IF v_serial = '' THEN
                ITERATE serial_loop;
            END IF;

            SELECT COUNT(*)
            INTO v_exists
            FROM fixture_serials
            WHERE customer_id        = p_customer_id
              AND fixture_id         = p_fixture_id
              AND serial_number      = v_serial
              AND deleted_at IS NULL
              AND existence_status   = 'in_stock'
              AND usage_status      IN ('idle','maintenance');

            IF v_exists = 0 THEN
                SET v_msg = CONCAT(
                        '序號不存在或狀態不允許退料: ',
                        v_serial
                            );
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = v_msg;
            END IF;

        END WHILE;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `v_active_fixtures`
--

/*!50001 DROP VIEW IF EXISTS `v_active_fixtures`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `v_active_fixtures` AS select `f`.`id` AS `id`,`f`.`customer_id` AS `customer_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`fixture_type` AS `fixture_type`,`f`.`self_purchased_qty` AS `self_purchased_qty`,`f`.`customer_supplied_qty` AS `customer_supplied_qty`,`f`.`in_stock_qty` AS `in_stock_qty`,`f`.`deployed_qty` AS `deployed_qty`,`f`.`maintenance_qty` AS `maintenance_qty`,`f`.`scrapped_qty` AS `scrapped_qty`,`f`.`returned_qty` AS `returned_qty`,`f`.`storage_location` AS `storage_location`,`f`.`replacement_cycle` AS `replacement_cycle`,`f`.`cycle_unit` AS `cycle_unit`,`f`.`last_replacement_date` AS `last_replacement_date`,`f`.`last_notification_time` AS `last_notification_time`,`f`.`owner_id` AS `owner_id`,`f`.`note` AS `note`,`f`.`created_at` AS `created_at`,`f`.`updated_at` AS `updated_at`,`f`.`deleted_at` AS `deleted_at` from `fixtures` `f` where (`f`.`deleted_at` is null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_inconsistent_fixtures`
--

/*!50001 DROP VIEW IF EXISTS `v_inconsistent_fixtures`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `v_inconsistent_fixtures` AS select `f`.`id` AS `fixture_id`,`f`.`customer_id` AS `customer_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`in_stock_qty` AS `trigger_in_stock`,`f`.`deployed_qty` AS `trigger_deployed`,(count((case when (`fs`.`status` = 'in_stock') then 1 end)) + ifnull(sum(`fdi`.`in_stock_qty`),0)) AS `actual_in_stock`,count((case when (`fs`.`status` = 'deployed') then 1 end)) AS `actual_deployed`,(`f`.`in_stock_qty` - (count((case when (`fs`.`status` = 'in_stock') then 1 end)) + ifnull(sum(`fdi`.`in_stock_qty`),0))) AS `diff_in_stock`,(`f`.`deployed_qty` - count((case when (`fs`.`status` = 'deployed') then 1 end))) AS `diff_deployed` from ((`fixtures` `f` left join `fixture_serials` `fs` on((`fs`.`fixture_id` = `f`.`id`))) left join `fixture_datecode_inventory` `fdi` on((`fdi`.`fixture_id` = `f`.`id`))) group by `f`.`id`,`f`.`customer_id`,`f`.`fixture_name`,`f`.`in_stock_qty`,`f`.`deployed_qty` having ((`diff_in_stock` <> 0) or (`diff_deployed` <> 0)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_invalid_fixture_serial_status`
--

/*!50001 DROP VIEW IF EXISTS `v_invalid_fixture_serial_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `v_invalid_fixture_serial_status` AS select `fixture_serials`.`id` AS `serial_id`,`fixture_serials`.`customer_id` AS `customer_id`,`fixture_serials`.`fixture_id` AS `fixture_id`,`fixture_serials`.`serial_number` AS `serial_number`,`fixture_serials`.`existence_status` AS `existence_status`,`fixture_serials`.`usage_status` AS `usage_status`,`fixture_serials`.`updated_at` AS `updated_at` from `fixture_serials` where (((`fixture_serials`.`existence_status` in ('returned','scrapped')) and (`fixture_serials`.`usage_status` <> 'idle')) or ((`fixture_serials`.`existence_status` <> 'in_stock') and (`fixture_serials`.`usage_status` in ('deployed','maintenance')))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_inventory_history`
--

/*!50001 DROP VIEW IF EXISTS `v_inventory_history`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `v_inventory_history` AS select `mt`.`id` AS `id`,`mt`.`customer_id` AS `customer_id`,`mt`.`fixture_id` AS `fixture_id`,`mt`.`transaction_type` AS `transaction_type`,`mt`.`record_type` AS `record_type`,`mt`.`transaction_date` AS `transaction_date`,`mt`.`order_no` AS `order_no`,`mt`.`source_type` AS `source_type`,`mt`.`operator` AS `operator`,`mt`.`quantity` AS `quantity`,`mt`.`note` AS `note`,group_concat((case when (`mt`.`record_type` in ('individual','batch')) then `mti`.`serial_number` end) order by `mti`.`serial_number` ASC separator ', ') AS `serials`,max((case when (`mt`.`record_type` = 'datecode') then `mti`.`datecode` end)) AS `datecode`,max((case when (`mt`.`record_type` = 'datecode') then `mti`.`quantity` end)) AS `datecode_qty` from (`material_transactions` `mt` left join `material_transaction_items` `mti` on((`mti`.`transaction_id` = `mt`.`id`))) group by `mt`.`id`,`mt`.`customer_id`,`mt`.`fixture_id`,`mt`.`transaction_type`,`mt`.`record_type`,`mt`.`transaction_date`,`mt`.`order_no`,`mt`.`source_type`,`mt`.`operator`,`mt`.`quantity`,`mt`.`note` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_material_transactions_event`
--

/*!50001 DROP VIEW IF EXISTS `v_material_transactions_event`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `v_material_transactions_event` AS select `t`.`id` AS `transaction_id`,`t`.`transaction_date` AS `transaction_date`,`t`.`transaction_type` AS `transaction_type`,`t`.`record_type` AS `record_type`,`t`.`customer_id` AS `customer_id`,`t`.`fixture_id` AS `fixture_id`,`t`.`order_no` AS `order_no`,`fdt`.`datecode` AS `datecode`,`t`.`source_type` AS `source_type`,`t`.`operator` AS `operator`,`t`.`note` AS `note`,`t`.`quantity` AS `display_quantity`,concat((case when (`t`.`transaction_type` = 'return') then '-' else '' end),abs(`t`.`quantity`),' 件') AS `display_quantity_text` from (`material_transactions` `t` left join `fixture_datecode_transactions` `fdt` on((`fdt`.`transaction_id` = `t`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_material_transactions_query`
--

/*!50001 DROP VIEW IF EXISTS `v_material_transactions_query`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `v_material_transactions_query` AS select `t`.`id` AS `transaction_id`,`t`.`customer_id` AS `customer_id`,`t`.`fixture_id` AS `fixture_id`,`t`.`order_no` AS `order_no`,`t`.`transaction_type` AS `transaction_type`,`t`.`record_type` AS `record_type`,`t`.`quantity` AS `quantity`,`t`.`source_type` AS `source_type`,`t`.`transaction_date` AS `transaction_date`,`t`.`operator` AS `operator`,`t`.`note` AS `note`,`t`.`created_at` AS `created_at`,`t`.`created_by` AS `created_by` from `material_transactions` `t` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_recent_trigger_errors`
--

/*!50001 DROP VIEW IF EXISTS `v_recent_trigger_errors`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `v_recent_trigger_errors` AS select `trigger_error_logs`.`id` AS `id`,`trigger_error_logs`.`trigger_name` AS `trigger_name`,`trigger_error_logs`.`table_name` AS `table_name`,`trigger_error_logs`.`error_message` AS `error_message`,json_unquote(json_extract(`trigger_error_logs`.`context_data`,'$.fixture_id')) AS `fixture_id`,json_unquote(json_extract(`trigger_error_logs`.`context_data`,'$.serial_number')) AS `serial_number`,`trigger_error_logs`.`created_at` AS `created_at` from `trigger_error_logs` order by `trigger_error_logs`.`created_at` desc limit 100 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_fixture_dashboard_stats`
--

/*!50001 DROP VIEW IF EXISTS `view_fixture_dashboard_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_dashboard_stats` AS select `fixtures`.`customer_id` AS `customer_id`,count(0) AS `total_fixtures`,sum((`fixtures`.`in_stock_qty` > 0)) AS `fixtures_in_stock`,sum((`fixtures`.`deployed_qty` > 0)) AS `fixtures_deployed`,sum((`fixtures`.`maintenance_qty` > 0)) AS `fixtures_maintenance`,sum(((`fixtures`.`in_stock_qty` = 0) and (`fixtures`.`deployed_qty` = 0) and (`fixtures`.`maintenance_qty` = 0) and (`fixtures`.`scrapped_qty` > 0))) AS `fixtures_scrapped` from `fixtures` where (`fixtures`.`deleted_at` is null) group by `fixtures`.`customer_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_fixture_lifespan_status`
--

/*!50001 DROP VIEW IF EXISTS `view_fixture_lifespan_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_lifespan_status` AS select `f`.`customer_id` AS `customer_id`,`f`.`id` AS `fixture_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`cycle_unit` AS `cycle_unit`,`f`.`replacement_cycle` AS `replacement_cycle`,coalesce(sum(`ul`.`use_count`),0) AS `total_uses`,(case when ((`f`.`cycle_unit` = 'uses') and (`f`.`replacement_cycle` > 0)) then round((sum(`ul`.`use_count`) / `f`.`replacement_cycle`),4) else NULL end) AS `usage_ratio`,(case when ((`f`.`cycle_unit` = 'uses') and (`f`.`replacement_cycle` > 0)) then greatest((`f`.`replacement_cycle` - sum(`ul`.`use_count`)),0) else NULL end) AS `remaining_uses`,(case when ((`f`.`cycle_unit` is null) or (`f`.`replacement_cycle` is null)) then 'no_cycle' when (sum(`ul`.`use_count`) >= `f`.`replacement_cycle`) then 'expired' when (sum(`ul`.`use_count`) >= (`f`.`replacement_cycle` * 0.9)) then 'warning' else 'normal' end) AS `lifespan_status` from (`fixtures` `f` left join `usage_logs` `ul` on(((`ul`.`fixture_id` = `f`.`id`) and (`ul`.`customer_id` = `f`.`customer_id`)))) where (`f`.`deleted_at` is null) group by `f`.`customer_id`,`f`.`id`,`f`.`fixture_name`,`f`.`cycle_unit`,`f`.`replacement_cycle` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_fixture_quantity_mismatch_v6`
--

/*!50001 DROP VIEW IF EXISTS `view_fixture_quantity_mismatch_v6`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_quantity_mismatch_v6` AS select `f`.`id` AS `fixture_id`,`f`.`customer_id` AS `customer_id`,`f`.`fixture_name` AS `fixture_name`,(sum((`fs`.`existence_status` = 'in_stock')) + ifnull(sum(`fdi`.`in_stock_qty`),0)) AS `expected_in_stock_qty`,`f`.`in_stock_qty` AS `actual_in_stock_qty`,(`f`.`in_stock_qty` - (sum((`fs`.`existence_status` = 'in_stock')) + ifnull(sum(`fdi`.`in_stock_qty`),0))) AS `diff_in_stock_qty` from ((`fixtures` `f` left join `fixture_serials` `fs` on(((`fs`.`fixture_id` = `f`.`id`) and (`fs`.`customer_id` = `f`.`customer_id`) and (`fs`.`deleted_at` is null)))) left join `fixture_datecode_inventory` `fdi` on(((`fdi`.`fixture_id` = `f`.`id`) and (`fdi`.`customer_id` = `f`.`customer_id`)))) group by `f`.`id`,`f`.`customer_id`,`f`.`fixture_name`,`f`.`in_stock_qty` having (`diff_in_stock_qty` <> 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_fixture_serials`
--

/*!50001 DROP VIEW IF EXISTS `view_fixture_serials`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_serials` AS select `fs`.`customer_id` AS `customer_id`,`fs`.`fixture_id` AS `fixture_id`,`fs`.`serial_number` AS `serial_number`,`fs`.`existence_status` AS `existence_status`,`fs`.`usage_status` AS `usage_status` from `fixture_serials` `fs` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_fixture_status`
--

/*!50001 DROP VIEW IF EXISTS `view_fixture_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_status` AS select `f`.`customer_id` AS `customer_id`,`f`.`id` AS `fixture_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`in_stock_qty` AS `in_stock_qty`,`f`.`customer_supplied_qty` AS `customer_supplied_qty`,`f`.`self_purchased_qty` AS `self_purchased_qty`,`f`.`returned_qty` AS `returned_qty`,`f`.`deployed_qty` AS `deployed_qty`,`f`.`maintenance_qty` AS `maintenance_qty`,`f`.`scrapped_qty` AS `scrapped_qty` from `fixtures` `f` where (`f`.`is_scrapped` = 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_inventory_mismatch_v6`
--

/*!50001 DROP VIEW IF EXISTS `view_inventory_mismatch_v6`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_inventory_mismatch_v6` AS select `f`.`id` AS `fixture_id`,`f`.`customer_id` AS `customer_id`,`f`.`fixture_name` AS `fixture_name`,sum((`fs`.`existence_status` = 'in_stock')) AS `serial_in_stock`,sum(((`fs`.`existence_status` = 'in_stock') and (`fs`.`usage_status` = 'deployed'))) AS `serial_deployed`,ifnull(sum(`fdi`.`in_stock_qty`),0) AS `datecode_in_stock`,`f`.`in_stock_qty` AS `cache_in_stock`,`f`.`deployed_qty` AS `cache_deployed`,(`f`.`in_stock_qty` - (sum((`fs`.`existence_status` = 'in_stock')) + ifnull(sum(`fdi`.`in_stock_qty`),0))) AS `diff_in_stock`,(`f`.`deployed_qty` - sum(((`fs`.`existence_status` = 'in_stock') and (`fs`.`usage_status` = 'deployed')))) AS `diff_deployed` from ((`fixtures` `f` left join `fixture_serials` `fs` on(((`fs`.`fixture_id` = `f`.`id`) and (`fs`.`customer_id` = `f`.`customer_id`) and (`fs`.`deleted_at` is null)))) left join `fixture_datecode_inventory` `fdi` on(((`fdi`.`fixture_id` = `f`.`id`) and (`fdi`.`customer_id` = `f`.`customer_id`)))) group by `f`.`id`,`f`.`customer_id`,`f`.`fixture_name`,`f`.`in_stock_qty`,`f`.`deployed_qty` having ((`diff_in_stock` <> 0) or (`diff_deployed` <> 0)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_material_transaction_details`
--

/*!50001 DROP VIEW IF EXISTS `view_material_transaction_details`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_material_transaction_details` AS select `t`.`id` AS `transaction_id`,`t`.`transaction_type` AS `transaction_type`,`t`.`record_type` AS `record_type`,`t`.`transaction_date` AS `transaction_date`,`t`.`customer_id` AS `customer_id`,`t`.`fixture_id` AS `fixture_id`,`t`.`order_no` AS `order_no`,`t`.`source_type` AS `source_type`,`t`.`operator` AS `operator`,`t`.`note` AS `note`,`t`.`quantity` AS `total_quantity`,`t`.`created_at` AS `created_at`,`i`.`id` AS `item_id`,`i`.`serial_number` AS `serial_number`,`i`.`datecode` AS `datecode`,`i`.`quantity` AS `item_quantity`,`fs`.`existence_status` AS `serial_existence_status`,`fs`.`usage_status` AS `serial_usage_status`,(case when (`t`.`record_type` in ('individual','batch')) then concat('序號：',`i`.`serial_number`) when (`t`.`record_type` = 'datecode') then concat('Datecode：',`i`.`datecode`,' × ',`i`.`quantity`) else NULL end) AS `hover_item_text` from ((`material_transactions` `t` left join `material_transaction_items` `i` on((`i`.`transaction_id` = `t`.`id`))) left join `fixture_serials` `fs` on(((`fs`.`serial_number` = `i`.`serial_number`) and (`fs`.`fixture_id` = `t`.`fixture_id`) and (`fs`.`customer_id` = `t`.`customer_id`)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_model_max_stations`
--

/*!50001 DROP VIEW IF EXISTS `view_model_max_stations`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_model_max_stations` AS select `mm`.`customer_id` AS `customer_id`,`mm`.`id` AS `model_id`,`mm`.`model_name` AS `model_name`,`ms`.`station_id` AS `station_id`,`s`.`station_name` AS `station_name`,min(floor((ifnull(`f`.`in_stock_qty`,0) / `fr`.`required_qty`))) AS `max_available_stations`,group_concat(concat(`f`.`fixture_name`,'(',ifnull(`f`.`in_stock_qty`,0),'/',`fr`.`required_qty`,')') order by (ifnull(`f`.`in_stock_qty`,0) / `fr`.`required_qty`) ASC separator ', ') AS `limiting_fixtures` from ((((`machine_models` `mm` join `model_stations` `ms` on(((`ms`.`model_id` = `mm`.`id`) and (`ms`.`customer_id` = `mm`.`customer_id`)))) join `stations` `s` on(((`s`.`id` = `ms`.`station_id`) and (`s`.`customer_id` = `mm`.`customer_id`)))) join `fixture_requirements` `fr` on(((`fr`.`model_id` = `mm`.`id`) and (`fr`.`station_id` = `ms`.`station_id`) and (`fr`.`customer_id` = `mm`.`customer_id`)))) join `fixtures` `f` on(((`f`.`id` = `fr`.`fixture_id`) and (`f`.`customer_id` = `mm`.`customer_id`)))) where ((`f`.`deleted_at` is null) and (`fr`.`required_qty` > 0)) group by `mm`.`customer_id`,`mm`.`id`,`mm`.`model_name`,`ms`.`station_id`,`s`.`station_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_serial_status`
--

/*!50001 DROP VIEW IF EXISTS `view_serial_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_serial_status` AS select `fs`.`id` AS `serial_id`,`fs`.`customer_id` AS `customer_id`,`fs`.`serial_number` AS `serial_number`,`fs`.`fixture_id` AS `fixture_id`,`f`.`fixture_name` AS `fixture_name`,`fs`.`source_type` AS `source_type`,`fs`.`existence_status` AS `existence_status`,`fs`.`usage_status` AS `usage_status`,(case when ((`fs`.`existence_status` = 'in_stock') and (`fs`.`usage_status` = 'idle')) then 1 else 0 end) AS `is_available`,`fs`.`receipt_date` AS `receipt_date`,`fs`.`return_date` AS `return_date`,`fs`.`note` AS `note`,`fs`.`created_at` AS `created_at`,`fs`.`updated_at` AS `updated_at` from (`fixture_serials` `fs` join `fixtures` `f` on(((`f`.`id` = `fs`.`fixture_id`) and (`f`.`customer_id` = `fs`.`customer_id`)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_upcoming_fixture_replacements`
--

/*!50001 DROP VIEW IF EXISTS `view_upcoming_fixture_replacements`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 SQL SECURITY DEFINER */
/*!50001 VIEW `view_upcoming_fixture_replacements` AS select `f`.`customer_id` AS `customer_id`,`f`.`id` AS `fixture_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`cycle_unit` AS `cycle_unit`,`f`.`replacement_cycle` AS `replacement_cycle`,`fus`.`total_uses` AS `total_uses`,`f`.`last_replacement_date` AS `last_replacement_date`,(to_days(curdate()) - to_days(`f`.`last_replacement_date`)) AS `used_days`,(case when ((`f`.`cycle_unit` = 'uses') and (`f`.`replacement_cycle` > 0)) then (`fus`.`total_uses` / `f`.`replacement_cycle`) when ((`f`.`cycle_unit` = 'days') and (`f`.`replacement_cycle` > 0) and (`f`.`last_replacement_date` is not null)) then ((to_days(curdate()) - to_days(`f`.`last_replacement_date`)) / `f`.`replacement_cycle`) else NULL end) AS `usage_ratio` from (`fixtures` `f` left join `fixture_usage_summary` `fus` on(((`fus`.`fixture_id` = `f`.`id`) and (`fus`.`customer_id` = `f`.`customer_id`)))) where ((`f`.`replacement_cycle` is not null) and (`f`.`cycle_unit` in ('uses','days'))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-13 10:06:41
