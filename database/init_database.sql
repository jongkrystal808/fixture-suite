
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
DROP TABLE IF EXISTS `deployment_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deployment_history` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '歷史記錄ID',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_id` int NOT NULL COMMENT '序號ID',
  `station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '站點代碼',
  `action` enum('deploy','undeploy') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '動作',
  `operator` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人員',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_serial_date` (`serial_id`,`created_at`),
  KEY `idx_station_date` (`station_id`,`created_at`),
  KEY `idx_deployment_customer` (`customer_id`),
  CONSTRAINT `deployment_history_ibfk_1` FOREIGN KEY (`serial_id`) REFERENCES `fixture_serials` (`id`) ON DELETE CASCADE,
  CONSTRAINT `deployment_history_ibfk_2` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deployment_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部署歷史表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fixture_datecode_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_datecode_inventory` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '日期碼庫存ID',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '客戶',
  `fixture_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '治具',
  `datecode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日期碼',
  `in_stock_qty` int NOT NULL COMMENT '可用數量（在庫數量，與 fixtures.in_stock_qty 語意一致）',
  `returned_qty` int NOT NULL DEFAULT '0' COMMENT '已退料數量',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `source_type` enum('self_purchased','customer_supplied') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer_supplied' COMMENT '來源類型（與 fixture_serials 一致）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_fixture_datecode` (`customer_id`,`fixture_id`,`datecode`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_datecode` (`datecode`),
  KEY `idx_fdi_customer_stock` (`customer_id`,`in_stock_qty`),
  KEY `idx_fdi_fixture_qty` (`fixture_id`,`in_stock_qty`),
  CONSTRAINT `fixture_datecode_inventory_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fixture_datecode_inventory_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_returned_non_negative` CHECK ((`returned_qty` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='æ²»å…·æ—¥æœŸç¢¼åº«å­˜ï¼ˆéžåºè™Ÿï¼‰';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_datecode_inventory_bi_validate` BEFORE INSERT ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
    IF NEW.in_stock_qty IS NULL OR NEW.in_stock_qty < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode in_stock_qty 不可為 NULL 或負數';
    END IF;

    -- fixture 必須存在
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_datecode_inventory_bi_guard_cycle_unit` BEFORE INSERT ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
    DECLARE v_cycle_unit VARCHAR(10);

    SELECT cycle_unit INTO v_cycle_unit
    FROM fixtures
    WHERE id = NEW.fixture_id
      AND customer_id = NEW.customer_id
    LIMIT 1;

    IF v_cycle_unit <> 'days' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode 只允許用於 cycle_unit=days';
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_datecode_inventory_ai_sync` AFTER INSERT ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_datecode_inventory_bu_validate` BEFORE UPDATE ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
    -- 實際庫存不可為負
    IF NEW.in_stock_qty IS NULL OR NEW.in_stock_qty < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode in_stock_qty 不可為 NULL 或負數';
    END IF;

    -- returned_qty 僅允許累加，不可為負
    IF NEW.returned_qty IS NOT NULL AND NEW.returned_qty < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'datecode returned_qty 不可為負數';
    END IF;

    -- 【方案 2 語意防呆】
    -- 若 returned_qty 增加，in_stock_qty 必須同步減少
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_datecode_inventory_au_sync` AFTER UPDATE ON `fixture_datecode_inventory` FOR EACH ROW BEGIN
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
) ENGINE=InnoDB AUTO_INCREMENT=199 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='æ²»å…·æ—¥æœŸç¢¼åº«å­˜ç•°å‹•æ˜Žç´°ï¼ˆéžåºè™Ÿ auditï¼‰';
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `fixture_quantity_repairs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_quantity_repairs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fixture_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `repair_type` enum('auto','manual') COLLATE utf8mb4_unicode_ci DEFAULT 'manual',
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
  `repair_reason` text COLLATE utf8mb4_unicode_ci,
  `repaired_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `repaired_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_repaired_at` (`repaired_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3457 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具數量修復記錄表';
/*!40101 SET character_set_client = @saved_cs_client */;
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
) ENGINE=InnoDB AUTO_INCREMENT=996 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具-機種需求表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fixture_serials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixture_serials` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '序號記錄ID',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `fixture_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號',
  `serial_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '序號',
  `source_type` enum('self_purchased','customer_supplied') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '來源類型',
  `receipt_date` date DEFAULT NULL COMMENT '收料日期',
  `return_date` date DEFAULT NULL COMMENT '退料日期',
  `receipt_transaction_id` int DEFAULT NULL COMMENT '收料異動ID',
  `return_transaction_id` int DEFAULT NULL COMMENT '退料異動ID',
  `deployment_id` int DEFAULT NULL COMMENT '部署ID',
  `current_station_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '目前所在站點',
  `total_uses` int DEFAULT '0' COMMENT '累計使用次數',
  `last_use_date` date DEFAULT NULL COMMENT '最後使用日期',
  `first_use_date` date DEFAULT NULL COMMENT '第一次使用日期（cache，可由 usage_logs 重算）',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '備註',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `existence_status` enum('in_stock','returned','scrapped') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'in_stock' COMMENT '是否仍存在於庫存',
  `scrapped_at` datetime DEFAULT NULL COMMENT '序號報廢時間（用於判斷 premature failure）',
  `usage_status` enum('idle','deployed','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'idle' COMMENT '使用狀態',
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_customer_fixture` (`customer_id`,`fixture_id`),
  KEY `idx_receipt_transaction` (`receipt_transaction_id`),
  KEY `idx_return_transaction` (`return_transaction_id`),
  KEY `idx_fixture_only` (`fixture_id`),
  KEY `idx_current_station` (`current_station_id`),
  KEY `fk_fixture_serials_deployment` (`deployment_id`),
  KEY `idx_fs_customer_fixture` (`customer_id`,`fixture_id`),
  KEY `idx_fs_fixture_status` (`fixture_id`),
  KEY `idx_fixture_status_source` (`fixture_id`,`source_type`),
  CONSTRAINT `fixture_serials_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fixture_serials_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fixture_serials_current_station` FOREIGN KEY (`current_station_id`) REFERENCES `stations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fixture_serials_deployment` FOREIGN KEY (`deployment_id`) REFERENCES `fixture_deployments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fixture_serials_receipt_tx` FOREIGN KEY (`receipt_transaction_id`) REFERENCES `material_transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_fixture_serials_return_tx` FOREIGN KEY (`return_transaction_id`) REFERENCES `material_transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5600 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='序號表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixture_serial_no_validate_ins` BEFORE INSERT ON `fixture_serials` FOR EACH ROW BEGIN
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixture_serial_no_duplicate_check` BEFORE INSERT ON `fixture_serials` FOR EACH ROW BEGIN
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixture_serials_audit_insert` AFTER INSERT ON `fixture_serials` FOR EACH ROW BEGIN
    INSERT INTO fixture_serials_history (
        serial_id,
        action,
        new_data
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixture_serial_no_validate_upd` BEFORE UPDATE ON `fixture_serials` FOR EACH ROW BEGIN
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixture_serial_usage_existence_validate_upd` BEFORE UPDATE ON `fixture_serials` FOR EACH ROW BEGIN
    /* =====================================================
     * usage_status × existence_status 防呆
     * ===================================================== */

    -- 已退料者，不可為 deployed / maintenance
    IF NEW.existence_status = 'returned'
        AND NEW.usage_status <> 'idle' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '已退料序號不可為 deployed 或 maintenance';
    END IF;

    -- 已報廢者，只能是 idle
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixture_serial_status_validate_upd` BEFORE UPDATE ON `fixture_serials` FOR EACH ROW BEGIN

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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixture_serials_audit_update` AFTER UPDATE ON `fixture_serials` FOR EACH ROW BEGIN
    IF (OLD.existence_status <> NEW.existence_status)
        OR (OLD.usage_status <> NEW.usage_status)
        OR (OLD.source_type <> NEW.source_type)
        OR (OLD.fixture_id <> NEW.fixture_id)
    THEN
        INSERT INTO fixture_serials_history (
            serial_id,
            action,
            old_data,
            new_data
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixture_serials_audit_delete` AFTER DELETE ON `fixture_serials` FOR EACH ROW BEGIN
    INSERT INTO fixture_serials_history (
        serial_id,
        action,
        old_data
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
) ENGINE=InnoDB AUTO_INCREMENT=5078 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `fixtures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixtures` (
  `id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具編號 (如: L-3000-STD)',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱',
  `fixture_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具名稱',
  `fixture_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '治具類型',
  `self_purchased_qty` int NOT NULL DEFAULT '0',
  `customer_supplied_qty` int NOT NULL DEFAULT '0',
  `in_stock_qty` int NOT NULL DEFAULT '0',
  `deployed_qty` int NOT NULL DEFAULT '0',
  `maintenance_qty` int NOT NULL DEFAULT '0',
  `scrapped_qty` int NOT NULL DEFAULT '0',
  `returned_qty` int NOT NULL DEFAULT '0',
  `storage_location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '儲存位置',
  `replacement_cycle` decimal(10,2) DEFAULT NULL COMMENT '更換週期',
  `cycle_unit` enum('days','uses','none') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `lifecycle_mode` enum('serial','fixture') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'serial' COMMENT '壽命計算模式（serial=序號獨立壽命，fixture=整批共用壽命）',
  `warning_ratio` decimal(5,2) NOT NULL DEFAULT '0.80' COMMENT '壽命預警比例（例如 0.8 = 80%）',
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixtures_cycle_mode_guard_bi` BEFORE INSERT ON `fixtures` FOR EACH ROW BEGIN
    IF NEW.cycle_unit = 'uses'
        AND NEW.lifecycle_mode <> 'serial' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '規則：cycle_unit=uses 只能 lifecycle_mode=serial';
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_block_lifecycle_mode_change` BEFORE UPDATE ON `fixtures` FOR EACH ROW BEGIN
    DECLARE v_usage_count INT DEFAULT 0;

    IF OLD.lifecycle_mode <> NEW.lifecycle_mode THEN

        SELECT COUNT(*) INTO v_usage_count
        FROM usage_logs
        WHERE fixture_id = OLD.id
          AND customer_id = OLD.customer_id;

        IF v_usage_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = '已有 usage_logs 壽命紀錄，禁止修改 lifecycle_mode';
        END IF;

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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixtures_cycle_mode_guard_bu` BEFORE UPDATE ON `fixtures` FOR EACH ROW BEGIN
    IF NEW.cycle_unit = 'uses'
        AND NEW.lifecycle_mode <> 'serial' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '規則：cycle_unit=uses 只能 lifecycle_mode=serial';
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_fixtures_audit_update` AFTER UPDATE ON `fixtures` FOR EACH ROW BEGIN
    INSERT INTO fixtures_history (
        fixture_id,
        customer_id,
        fixture_name,
        change_type,
        old_values,
        new_values
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
DROP TABLE IF EXISTS `fixtures_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixtures_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `fixture_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fixture_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_type` enum('INSERT','UPDATE','DELETE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` int DEFAULT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `idx_fixture_id` (`fixture_id`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB AUTO_INCREMENT=83776 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `material_transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_transaction_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fixture_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'individual / batch 使用',
  `datecode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'datecode 使用',
  `quantity` int NOT NULL DEFAULT '1' COMMENT 'datecode 才會 >1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mti_transaction` (`transaction_id`),
  KEY `idx_serial` (`serial_number`),
  KEY `idx_datecode` (`datecode`),
  KEY `idx_fixture` (`fixture_id`),
  KEY `idx_customer_fixture` (`customer_id`,`fixture_id`),
  CONSTRAINT `fk_mti_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `material_transactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5429 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收退料實際項目（序號 / 日期碼）';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `material_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_transactions` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '異動記錄ID',
  `transaction_type` enum('receipt','return') COLLATE utf8mb4_unicode_ci NOT NULL,
  `record_type` enum('individual','batch','datecode') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int DEFAULT NULL COMMENT '交易數量（永遠為正數，方向由 transaction_type 判斷）',
  `transaction_date` date NOT NULL COMMENT '異動日期',
  `customer_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶名稱 (廠商=客戶)',
  `order_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '僅供參考，不參與任何邏輯',
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
  KEY `idx_mt_customer_date_id` (`customer_id`,`transaction_date`,`id`),
  CONSTRAINT `material_transactions_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `material_transactions_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_material_tx_quantity_positive` CHECK ((`quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=5271 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物料異動主表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_material_transactions_no_update` BEFORE UPDATE ON `material_transactions` FOR EACH ROW BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'material_transactions is immutable (UPDATE is forbidden)';
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
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_material_transactions_no_delete` BEFORE DELETE ON `material_transactions` FOR EACH ROW BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'material_transactions is immutable (DELETE is forbidden)';
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
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
) ENGINE=InnoDB AUTO_INCREMENT=220 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='機種-站點關聯表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `owners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULL = 跨客戶共用',
  `primary_user_id` int NOT NULL COMMENT '主負責人 (users.id)',
  `secondary_user_id` int DEFAULT NULL COMMENT '副負責人 (users.id)',
  `note` text COLLATE utf8mb4_unicode_ci,
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
DROP TABLE IF EXISTS `replacement_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `replacement_logs` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '更換事件 ID',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶 ID',
  `fixture_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '治具 ID',
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '序號（record_level = serial）',
  `record_level` enum('fixture','serial') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'fixture' COMMENT '事件層級（與 usage_logs 對齊）',
  `event_type` enum('normal_replacement','premature_failure','maintenance','manual_scrap') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal_replacement' COMMENT '事件類型',
  `operator` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人員（與 usage_logs.operator 對齊）',
  `note` text COLLATE utf8mb4_unicode_ci COMMENT '事件備註（可含 individual / batch 語意）',
  `occurred_at` date NOT NULL COMMENT '事件發生日期（YYYY-MM-DD）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  `scrap_qty` int DEFAULT NULL COMMENT '報廢數量（fixture level 使用）',
  PRIMARY KEY (`id`),
  KEY `fk_replacement_customer` (`customer_id`),
  KEY `fk_replacement_fixture` (`fixture_id`),
  CONSTRAINT `fk_replacement_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_replacement_fixture` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='治具更換事件記錄（v4.x，對齊 usage_logs）';
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `trigger_error_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trigger_error_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `trigger_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Trigger 名稱',
  `table_name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '觸發的資料表',
  `error_sqlstate` char(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SQL 狀態碼',
  `error_message` text COLLATE utf8mb4_unicode_ci COMMENT '錯誤訊息',
  `context_data` json DEFAULT NULL COMMENT '觸發時的上下文資料',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '發生時間',
  PRIMARY KEY (`id`),
  KEY `idx_trigger_name` (`trigger_name`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=183 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Trigger 錯誤日誌表';
/*!40101 SET character_set_client = @saved_cs_client */;
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
  KEY `fk_usage_logs_model` (`customer_id`,`model_id`),
  CONSTRAINT `fk_usage_logs_model` FOREIGN KEY (`customer_id`, `model_id`) REFERENCES `machine_models` (`customer_id`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `usage_logs_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `usage_logs_ibfk_2` FOREIGN KEY (`fixture_id`) REFERENCES `fixtures` (`id`) ON DELETE CASCADE,
  CONSTRAINT `usage_logs_ibfk_4` FOREIGN KEY (`station_id`) REFERENCES `stations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `usage_logs_chk_1` CHECK ((`use_count` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用記錄表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`fixture_test`@`%`*/ /*!50003 TRIGGER `trg_usage_logs_mode_guard_bi` BEFORE INSERT ON `usage_logs` FOR EACH ROW BEGIN
    DECLARE v_cycle_unit VARCHAR(10);

    SELECT cycle_unit INTO v_cycle_unit
    FROM fixtures
    WHERE id = NEW.fixture_id
      AND customer_id = NEW.customer_id
    LIMIT 1;

    IF v_cycle_unit = 'uses' THEN

        IF NEW.record_level <> 'serial'
            OR NEW.serial_number IS NULL
            OR NEW.serial_number = '' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'uses 型壽命必須使用 serial';
        END IF;

    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
DROP TABLE IF EXISTS `user_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_customers` (
  `user_id` int NOT NULL COMMENT '使用者 ID',
  `customer_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '客戶代碼',
  PRIMARY KEY (`user_id`,`customer_id`),
  CONSTRAINT `fk_user_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用者可使用的客戶清單（多對多）';
/*!40101 SET character_set_client = @saved_cs_client */;
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
DROP TABLE IF EXISTS `view_datecode_days_lifecycle_v1`;
/*!50001 DROP VIEW IF EXISTS `view_datecode_days_lifecycle_v1`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_datecode_days_lifecycle_v1` AS SELECT
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `fixture_name`,
 1 AS `datecode`,
 1 AS `replacement_cycle`,
 1 AS `cycle_unit`,
 1 AS `warning_ratio`,
 1 AS `lifecycle_start_at`,
 1 AS `actual_value`,
 1 AS `remaining_value`,
 1 AS `lifecycle_status`*/;
SET character_set_client = @saved_cs_client;
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
DROP TABLE IF EXISTS `view_fixture_lifecycle_v1`;
/*!50001 DROP VIEW IF EXISTS `view_fixture_lifecycle_v1`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_fixture_lifecycle_v1` AS SELECT
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `lifecycle_mode`,
 1 AS `replacement_cycle`,
 1 AS `cycle_unit`,
 1 AS `warning_ratio`,
 1 AS `is_scrapped`,
 1 AS `scrapped_at`,
 1 AS `total_use_count`,
 1 AS `first_used_at`,
 1 AS `last_used_at`,
 1 AS `lifecycle_start_at`,
 1 AS `actual_value`,
 1 AS `remaining_value`,
 1 AS `lifecycle_status`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `view_fixture_lifespan_status`;
/*!50001 DROP VIEW IF EXISTS `view_fixture_lifespan_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_fixture_lifespan_status` AS SELECT
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `fixture_name`,
 1 AS `replacement_cycle`,
 1 AS `warning_ratio`,
 1 AS `total_uses`,
 1 AS `status`*/;
SET character_set_client = @saved_cs_client;
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
DROP TABLE IF EXISTS `view_fixture_status`;
/*!50001 DROP VIEW IF EXISTS `view_fixture_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_fixture_status` AS SELECT
 1 AS `fixture_id`,
 1 AS `customer_id`,
 1 AS `fixture_name`,
 1 AS `fixture_type`,
 1 AS `storage_location`,
 1 AS `self_purchased_qty`,
 1 AS `customer_supplied_qty`,
 1 AS `in_stock_qty`,
 1 AS `deployed_qty`,
 1 AS `maintenance_qty`,
 1 AS `scrapped_qty`,
 1 AS `returned_qty`,
 1 AS `total_qty`,
 1 AS `deployed_serials`,
 1 AS `datecode_available_qty`,
 1 AS `total_available_qty`,
 1 AS `last_replacement_date`,
 1 AS `replacement_cycle`,
 1 AS `cycle_unit`,
 1 AS `replacement_status`,
 1 AS `primary_owner`,
 1 AS `secondary_owner`,
 1 AS `created_at`,
 1 AS `updated_at`*/;
SET character_set_client = @saved_cs_client;
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
DROP TABLE IF EXISTS `view_lifecycle_status_v1`;
/*!50001 DROP VIEW IF EXISTS `view_lifecycle_status_v1`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_lifecycle_status_v1` AS SELECT
 1 AS `entity_type`,
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `serial_number`,
 1 AS `lifecycle_mode`,
 1 AS `cycle_unit`,
 1 AS `replacement_cycle`,
 1 AS `warning_ratio`,
 1 AS `lifecycle_start_at`,
 1 AS `actual_value`,
 1 AS `remaining_value`,
 1 AS `lifecycle_status`,
 1 AS `existence_status`,
 1 AS `usage_status`,
 1 AS `scrapped_at`,
 1 AS `last_used_at`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `view_lifecycle_status_v2`;
/*!50001 DROP VIEW IF EXISTS `view_lifecycle_status_v2`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_lifecycle_status_v2` AS SELECT
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `lifecycle_mode`,
 1 AS `replacement_cycle`,
 1 AS `cycle_unit`,
 1 AS `warning_ratio`,
 1 AS `is_scrapped`,
 1 AS `scrapped_at`,
 1 AS `total_use_count`,
 1 AS `first_used_at`,
 1 AS `last_used_at`,
 1 AS `lifecycle_start_at`,
 1 AS `actual_value`,
 1 AS `remaining_value`,
 1 AS `lifecycle_status`,
 1 AS `datecode`*/;
SET character_set_client = @saved_cs_client;
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
DROP TABLE IF EXISTS `view_serial_lifecycle_v1`;
/*!50001 DROP VIEW IF EXISTS `view_serial_lifecycle_v1`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_serial_lifecycle_v1` AS SELECT
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `serial_number`,
 1 AS `lifecycle_mode`,
 1 AS `replacement_cycle`,
 1 AS `cycle_unit`,
 1 AS `warning_ratio`,
 1 AS `existence_status`,
 1 AS `usage_status`,
 1 AS `scrapped_at`,
 1 AS `total_use_count`,
 1 AS `first_used_at`,
 1 AS `last_used_at`,
 1 AS `lifecycle_start_at`,
 1 AS `actual_value`,
 1 AS `remaining_value`,
 1 AS `lifecycle_status`*/;
SET character_set_client = @saved_cs_client;
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
DROP TABLE IF EXISTS `view_upcoming_fixture_replacements`;
/*!50001 DROP VIEW IF EXISTS `view_upcoming_fixture_replacements`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_upcoming_fixture_replacements` AS SELECT
 1 AS `customer_id`,
 1 AS `fixture_id`,
 1 AS `fixture_name`,
 1 AS `lifecycle_mode`,
 1 AS `cycle_unit`,
 1 AS `replacement_cycle`,
 1 AS `total_uses`,
 1 AS `last_replacement_date`,
 1 AS `used_days`,
 1 AS `usage_ratio`*/;
SET character_set_client = @saved_cs_client;
/*!50001 DROP VIEW IF EXISTS `v_active_fixtures`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_active_fixtures` AS select `f`.`id` AS `id`,`f`.`customer_id` AS `customer_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`fixture_type` AS `fixture_type`,`f`.`self_purchased_qty` AS `self_purchased_qty`,`f`.`customer_supplied_qty` AS `customer_supplied_qty`,`f`.`in_stock_qty` AS `in_stock_qty`,`f`.`deployed_qty` AS `deployed_qty`,`f`.`maintenance_qty` AS `maintenance_qty`,`f`.`scrapped_qty` AS `scrapped_qty`,`f`.`returned_qty` AS `returned_qty`,`f`.`storage_location` AS `storage_location`,`f`.`replacement_cycle` AS `replacement_cycle`,`f`.`cycle_unit` AS `cycle_unit`,`f`.`last_replacement_date` AS `last_replacement_date`,`f`.`last_notification_time` AS `last_notification_time`,`f`.`owner_id` AS `owner_id`,`f`.`note` AS `note`,`f`.`created_at` AS `created_at`,`f`.`updated_at` AS `updated_at`,`f`.`deleted_at` AS `deleted_at` from `fixtures` `f` where (`f`.`deleted_at` is null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_invalid_fixture_serial_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_invalid_fixture_serial_status` AS select `fixture_serials`.`id` AS `serial_id`,`fixture_serials`.`customer_id` AS `customer_id`,`fixture_serials`.`fixture_id` AS `fixture_id`,`fixture_serials`.`serial_number` AS `serial_number`,`fixture_serials`.`existence_status` AS `existence_status`,`fixture_serials`.`usage_status` AS `usage_status`,`fixture_serials`.`updated_at` AS `updated_at` from `fixture_serials` where (((`fixture_serials`.`existence_status` in ('returned','scrapped')) and (`fixture_serials`.`usage_status` <> 'idle')) or ((`fixture_serials`.`existence_status` <> 'in_stock') and (`fixture_serials`.`usage_status` in ('deployed','maintenance')))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_inventory_history`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_inventory_history` AS select `mt`.`id` AS `id`,`mt`.`customer_id` AS `customer_id`,`mt`.`fixture_id` AS `fixture_id`,`mt`.`transaction_type` AS `transaction_type`,`mt`.`record_type` AS `record_type`,`mt`.`transaction_date` AS `transaction_date`,`mt`.`order_no` AS `order_no`,`mt`.`source_type` AS `source_type`,`mt`.`operator` AS `operator`,`mt`.`quantity` AS `quantity`,`mt`.`note` AS `note`,group_concat((case when (`mt`.`record_type` in ('individual','batch')) then `mti`.`serial_number` end) order by `mti`.`serial_number` ASC separator ', ') AS `serials`,max((case when (`mt`.`record_type` = 'datecode') then `mti`.`datecode` end)) AS `datecode`,max((case when (`mt`.`record_type` = 'datecode') then `mti`.`quantity` end)) AS `datecode_qty` from (`material_transactions` `mt` left join `material_transaction_items` `mti` on((`mti`.`transaction_id` = `mt`.`id`))) group by `mt`.`id`,`mt`.`customer_id`,`mt`.`fixture_id`,`mt`.`transaction_type`,`mt`.`record_type`,`mt`.`transaction_date`,`mt`.`order_no`,`mt`.`source_type`,`mt`.`operator`,`mt`.`quantity`,`mt`.`note` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_material_transactions_event`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_material_transactions_event` AS select `t`.`id` AS `transaction_id`,`t`.`transaction_date` AS `transaction_date`,`t`.`transaction_type` AS `transaction_type`,`t`.`record_type` AS `record_type`,`t`.`customer_id` AS `customer_id`,`t`.`fixture_id` AS `fixture_id`,`t`.`order_no` AS `order_no`,`fdt`.`datecode` AS `datecode`,`t`.`source_type` AS `source_type`,`t`.`operator` AS `operator`,`t`.`note` AS `note`,`t`.`quantity` AS `display_quantity`,concat((case when (`t`.`transaction_type` = 'return') then '-' else '' end),abs(`t`.`quantity`),' 件') AS `display_quantity_text` from (`material_transactions` `t` left join `fixture_datecode_transactions` `fdt` on((`fdt`.`transaction_id` = `t`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_material_transactions_query`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_material_transactions_query` AS select `t`.`id` AS `transaction_id`,`t`.`customer_id` AS `customer_id`,`t`.`fixture_id` AS `fixture_id`,`t`.`order_no` AS `order_no`,`t`.`transaction_type` AS `transaction_type`,`t`.`record_type` AS `record_type`,`t`.`quantity` AS `quantity`,`t`.`source_type` AS `source_type`,`t`.`transaction_date` AS `transaction_date`,`t`.`operator` AS `operator`,`t`.`note` AS `note`,`t`.`created_at` AS `created_at`,`t`.`created_by` AS `created_by` from `material_transactions` `t` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_recent_trigger_errors`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_recent_trigger_errors` AS select `trigger_error_logs`.`id` AS `id`,`trigger_error_logs`.`trigger_name` AS `trigger_name`,`trigger_error_logs`.`table_name` AS `table_name`,`trigger_error_logs`.`error_message` AS `error_message`,json_unquote(json_extract(`trigger_error_logs`.`context_data`,'$.fixture_id')) AS `fixture_id`,json_unquote(json_extract(`trigger_error_logs`.`context_data`,'$.serial_number')) AS `serial_number`,`trigger_error_logs`.`created_at` AS `created_at` from `trigger_error_logs` order by `trigger_error_logs`.`created_at` desc limit 100 */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_datecode_days_lifecycle_v1`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_datecode_days_lifecycle_v1` AS select `fdi`.`customer_id` AS `customer_id`,`fdi`.`fixture_id` AS `fixture_id`,`f`.`fixture_name` AS `fixture_name`,`fdi`.`datecode` AS `datecode`,`f`.`replacement_cycle` AS `replacement_cycle`,`f`.`cycle_unit` AS `cycle_unit`,coalesce(`f`.`warning_ratio`,0.80) AS `warning_ratio`,cast(`fdi`.`created_at` as datetime) AS `lifecycle_start_at`,(to_days(coalesce(`f`.`scrapped_at`,now())) - to_days(cast(`fdi`.`created_at` as datetime))) AS `actual_value`,(coalesce(`f`.`replacement_cycle`,0) - (to_days(now()) - to_days(cast(`fdi`.`created_at` as datetime)))) AS `remaining_value`,(case when (`f`.`is_scrapped` = 1) then (case when ((to_days(coalesce(`f`.`scrapped_at`,now())) - to_days(cast(`fdi`.`created_at` as datetime))) < coalesce(`f`.`replacement_cycle`,0)) then 'premature_failure' else 'normal_expired' end) when ((coalesce(`f`.`replacement_cycle`,0) > 0) and ((to_days(now()) - to_days(cast(`fdi`.`created_at` as datetime))) >= coalesce(`f`.`replacement_cycle`,0))) then 'expired' when ((coalesce(`f`.`replacement_cycle`,0) > 0) and ((to_days(now()) - to_days(cast(`fdi`.`created_at` as datetime))) >= (coalesce(`f`.`replacement_cycle`,0) * coalesce(`f`.`warning_ratio`,0.80)))) then 'warning' else 'normal' end) AS `lifecycle_status` from (`fixture_datecode_inventory` `fdi` join `fixtures` `f` on(((`f`.`id` = `fdi`.`fixture_id`) and (`f`.`customer_id` = `fdi`.`customer_id`)))) where ((`f`.`cycle_unit` = 'days') and (`f`.`deleted_at` is null)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_fixture_dashboard_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_dashboard_stats` AS select `fixtures`.`customer_id` AS `customer_id`,count(0) AS `total_fixtures`,sum((`fixtures`.`in_stock_qty` > 0)) AS `fixtures_in_stock`,sum((`fixtures`.`deployed_qty` > 0)) AS `fixtures_deployed`,sum((`fixtures`.`maintenance_qty` > 0)) AS `fixtures_maintenance`,sum(((`fixtures`.`in_stock_qty` = 0) and (`fixtures`.`deployed_qty` = 0) and (`fixtures`.`maintenance_qty` = 0) and (`fixtures`.`scrapped_qty` > 0))) AS `fixtures_scrapped` from `fixtures` where (`fixtures`.`deleted_at` is null) group by `fixtures`.`customer_id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_fixture_lifecycle_v1`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_lifecycle_v1` AS select `f`.`customer_id` AS `customer_id`,`f`.`id` AS `fixture_id`,`f`.`lifecycle_mode` AS `lifecycle_mode`,`f`.`replacement_cycle` AS `replacement_cycle`,`f`.`cycle_unit` AS `cycle_unit`,coalesce(`f`.`warning_ratio`,0.80) AS `warning_ratio`,`f`.`is_scrapped` AS `is_scrapped`,`f`.`scrapped_at` AS `scrapped_at`,`fus`.`total_use_count` AS `total_use_count`,`fus`.`first_used_at` AS `first_used_at`,`fus`.`last_used_at` AS `last_used_at`,coalesce(`fus`.`first_used_at`,`f`.`created_at`) AS `lifecycle_start_at`,(case when (`f`.`cycle_unit` = 'uses') then coalesce(`fus`.`total_use_count`,0) when (`f`.`cycle_unit` = 'days') then (to_days(coalesce(`f`.`scrapped_at`,now())) - to_days(coalesce(`fus`.`first_used_at`,`f`.`created_at`))) else NULL end) AS `actual_value`,(case when (`f`.`cycle_unit` = 'uses') then (coalesce(`f`.`replacement_cycle`,0) - coalesce(`fus`.`total_use_count`,0)) when (`f`.`cycle_unit` = 'days') then (coalesce(`f`.`replacement_cycle`,0) - (to_days(now()) - to_days(coalesce(`fus`.`first_used_at`,`f`.`created_at`)))) else NULL end) AS `remaining_value`,(case when (`f`.`is_scrapped` = 1) then (case when ((`f`.`cycle_unit` = 'uses') and (coalesce(`fus`.`total_use_count`,0) < coalesce(`f`.`replacement_cycle`,0))) then 'premature_failure' when ((`f`.`cycle_unit` = 'days') and ((to_days(coalesce(`f`.`scrapped_at`,now())) - to_days(coalesce(`fus`.`first_used_at`,`f`.`created_at`))) < coalesce(`f`.`replacement_cycle`,0))) then 'premature_failure' else 'normal_expired' end) when ((`f`.`cycle_unit` = 'uses') and (coalesce(`fus`.`total_use_count`,0) >= coalesce(`f`.`replacement_cycle`,0))) then 'expired' when ((`f`.`cycle_unit` = 'days') and ((to_days(now()) - to_days(coalesce(`fus`.`first_used_at`,`f`.`created_at`))) >= coalesce(`f`.`replacement_cycle`,0))) then 'expired' when ((`f`.`cycle_unit` = 'uses') and (coalesce(`f`.`replacement_cycle`,0) > 0) and (coalesce(`fus`.`total_use_count`,0) >= (coalesce(`f`.`replacement_cycle`,0) * coalesce(`f`.`warning_ratio`,0.80)))) then 'warning' when ((`f`.`cycle_unit` = 'days') and (coalesce(`f`.`replacement_cycle`,0) > 0) and ((to_days(now()) - to_days(coalesce(`fus`.`first_used_at`,`f`.`created_at`))) >= (coalesce(`f`.`replacement_cycle`,0) * coalesce(`f`.`warning_ratio`,0.80)))) then 'warning' else 'normal' end) AS `lifecycle_status` from (`fixtures` `f` left join `fixture_usage_summary` `fus` on(((`fus`.`customer_id` = `f`.`customer_id`) and (`fus`.`fixture_id` = `f`.`id`)))) where (`f`.`deleted_at` is null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_fixture_lifespan_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_lifespan_status` AS select `f`.`customer_id` AS `customer_id`,`f`.`id` AS `fixture_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`replacement_cycle` AS `replacement_cycle`,`f`.`warning_ratio` AS `warning_ratio`,ifnull(sum(`ul`.`use_count`),0) AS `total_uses`,(case when (`f`.`cycle_unit` <> 'uses') then 'no_cycle' when (`f`.`replacement_cycle` is null) then 'no_cycle' when (ifnull(sum(`ul`.`use_count`),0) >= `f`.`replacement_cycle`) then 'expired' when (ifnull(sum(`ul`.`use_count`),0) >= (`f`.`replacement_cycle` * `f`.`warning_ratio`)) then 'warning' else 'normal' end) AS `status` from (`fixtures` `f` left join `usage_logs` `ul` on(((`f`.`customer_id` = `ul`.`customer_id`) and (`f`.`id` = `ul`.`fixture_id`)))) group by `f`.`customer_id`,`f`.`id`,`f`.`fixture_name`,`f`.`replacement_cycle`,`f`.`warning_ratio`,`f`.`cycle_unit` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_fixture_quantity_mismatch_v6`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_quantity_mismatch_v6` AS select `f`.`id` AS `fixture_id`,`f`.`customer_id` AS `customer_id`,`f`.`fixture_name` AS `fixture_name`,(sum((`fs`.`existence_status` = 'in_stock')) + ifnull(sum(`fdi`.`in_stock_qty`),0)) AS `expected_in_stock_qty`,`f`.`in_stock_qty` AS `actual_in_stock_qty`,(`f`.`in_stock_qty` - (sum((`fs`.`existence_status` = 'in_stock')) + ifnull(sum(`fdi`.`in_stock_qty`),0))) AS `diff_in_stock_qty` from ((`fixtures` `f` left join `fixture_serials` `fs` on(((`fs`.`fixture_id` = `f`.`id`) and (`fs`.`customer_id` = `f`.`customer_id`) and (`fs`.`deleted_at` is null)))) left join `fixture_datecode_inventory` `fdi` on(((`fdi`.`fixture_id` = `f`.`id`) and (`fdi`.`customer_id` = `f`.`customer_id`)))) group by `f`.`id`,`f`.`customer_id`,`f`.`fixture_name`,`f`.`in_stock_qty` having (`diff_in_stock_qty` <> 0) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_fixture_serials`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_serials` AS select `fs`.`customer_id` AS `customer_id`,`fs`.`fixture_id` AS `fixture_id`,`fs`.`serial_number` AS `serial_number`,`fs`.`existence_status` AS `existence_status`,`fs`.`usage_status` AS `usage_status` from `fixture_serials` `fs` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_fixture_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_fixture_status` AS select `f`.`id` AS `fixture_id`,`f`.`customer_id` AS `customer_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`fixture_type` AS `fixture_type`,`f`.`storage_location` AS `storage_location`,`f`.`self_purchased_qty` AS `self_purchased_qty`,`f`.`customer_supplied_qty` AS `customer_supplied_qty`,`f`.`in_stock_qty` AS `in_stock_qty`,`f`.`deployed_qty` AS `deployed_qty`,`f`.`maintenance_qty` AS `maintenance_qty`,`f`.`scrapped_qty` AS `scrapped_qty`,`f`.`returned_qty` AS `returned_qty`,((`f`.`in_stock_qty` + `f`.`deployed_qty`) + `f`.`maintenance_qty`) AS `total_qty`,group_concat(distinct `fs`.`serial_number` order by `fs`.`serial_number` ASC separator ', ') AS `deployed_serials`,ifnull(`dc`.`datecode_available_qty`,0) AS `datecode_available_qty`,(`f`.`in_stock_qty` + ifnull(`dc`.`datecode_available_qty`,0)) AS `total_available_qty`,`f`.`last_replacement_date` AS `last_replacement_date`,`f`.`replacement_cycle` AS `replacement_cycle`,`f`.`cycle_unit` AS `cycle_unit`,(case when ((`f`.`cycle_unit` = 'days') and (`f`.`last_replacement_date` is not null) and ((to_days(curdate()) - to_days(`f`.`last_replacement_date`)) >= `f`.`replacement_cycle`)) then '需更換' else '正常' end) AS `replacement_status`,`o`.`primary_user_id` AS `primary_owner`,`o`.`secondary_user_id` AS `secondary_owner`,`f`.`created_at` AS `created_at`,`f`.`updated_at` AS `updated_at` from (((`fixtures` `f` left join `fixture_serials` `fs` on(((`f`.`id` = `fs`.`fixture_id`) and (`fs`.`usage_status` = 'deployed') and (`fs`.`existence_status` <> 'scrapped')))) left join (select `fixture_datecode_inventory`.`fixture_id` AS `fixture_id`,sum(`fixture_datecode_inventory`.`in_stock_qty`) AS `datecode_available_qty` from `fixture_datecode_inventory` group by `fixture_datecode_inventory`.`fixture_id`) `dc` on((`dc`.`fixture_id` = `f`.`id`))) left join `owners` `o` on((`f`.`owner_id` = `o`.`id`))) group by `f`.`id`,`f`.`customer_id`,`f`.`fixture_name`,`f`.`fixture_type`,`f`.`storage_location`,`f`.`self_purchased_qty`,`f`.`customer_supplied_qty`,`f`.`in_stock_qty`,`f`.`deployed_qty`,`f`.`maintenance_qty`,`f`.`scrapped_qty`,`f`.`returned_qty`,`dc`.`datecode_available_qty`,`f`.`last_replacement_date`,`f`.`replacement_cycle`,`f`.`cycle_unit`,`o`.`primary_user_id`,`o`.`secondary_user_id`,`f`.`created_at`,`f`.`updated_at` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_inventory_mismatch_v6`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_inventory_mismatch_v6` AS select `f`.`id` AS `fixture_id`,`f`.`customer_id` AS `customer_id`,`f`.`fixture_name` AS `fixture_name`,sum((`fs`.`existence_status` = 'in_stock')) AS `serial_in_stock`,sum(((`fs`.`existence_status` = 'in_stock') and (`fs`.`usage_status` = 'deployed'))) AS `serial_deployed`,ifnull(sum(`fdi`.`in_stock_qty`),0) AS `datecode_in_stock`,`f`.`in_stock_qty` AS `cache_in_stock`,`f`.`deployed_qty` AS `cache_deployed`,(`f`.`in_stock_qty` - (sum((`fs`.`existence_status` = 'in_stock')) + ifnull(sum(`fdi`.`in_stock_qty`),0))) AS `diff_in_stock`,(`f`.`deployed_qty` - sum(((`fs`.`existence_status` = 'in_stock') and (`fs`.`usage_status` = 'deployed')))) AS `diff_deployed` from ((`fixtures` `f` left join `fixture_serials` `fs` on(((`fs`.`fixture_id` = `f`.`id`) and (`fs`.`customer_id` = `f`.`customer_id`) and (`fs`.`deleted_at` is null)))) left join `fixture_datecode_inventory` `fdi` on(((`fdi`.`fixture_id` = `f`.`id`) and (`fdi`.`customer_id` = `f`.`customer_id`)))) group by `f`.`id`,`f`.`customer_id`,`f`.`fixture_name`,`f`.`in_stock_qty`,`f`.`deployed_qty` having ((`diff_in_stock` <> 0) or (`diff_deployed` <> 0)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_lifecycle_status_v1`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_lifecycle_status_v1` AS select 'serial' AS `entity_type`,`view_serial_lifecycle_v1`.`customer_id` AS `customer_id`,`view_serial_lifecycle_v1`.`fixture_id` AS `fixture_id`,`view_serial_lifecycle_v1`.`serial_number` AS `serial_number`,`view_serial_lifecycle_v1`.`lifecycle_mode` AS `lifecycle_mode`,`view_serial_lifecycle_v1`.`cycle_unit` AS `cycle_unit`,`view_serial_lifecycle_v1`.`replacement_cycle` AS `replacement_cycle`,`view_serial_lifecycle_v1`.`warning_ratio` AS `warning_ratio`,`view_serial_lifecycle_v1`.`lifecycle_start_at` AS `lifecycle_start_at`,`view_serial_lifecycle_v1`.`actual_value` AS `actual_value`,`view_serial_lifecycle_v1`.`remaining_value` AS `remaining_value`,`view_serial_lifecycle_v1`.`lifecycle_status` AS `lifecycle_status`,`view_serial_lifecycle_v1`.`existence_status` AS `existence_status`,`view_serial_lifecycle_v1`.`usage_status` AS `usage_status`,`view_serial_lifecycle_v1`.`scrapped_at` AS `scrapped_at`,`view_serial_lifecycle_v1`.`last_used_at` AS `last_used_at` from `view_serial_lifecycle_v1` union all select 'fixture' AS `entity_type`,`view_fixture_lifecycle_v1`.`customer_id` AS `customer_id`,`view_fixture_lifecycle_v1`.`fixture_id` AS `fixture_id`,NULL AS `serial_number`,`view_fixture_lifecycle_v1`.`lifecycle_mode` AS `lifecycle_mode`,`view_fixture_lifecycle_v1`.`cycle_unit` AS `cycle_unit`,`view_fixture_lifecycle_v1`.`replacement_cycle` AS `replacement_cycle`,`view_fixture_lifecycle_v1`.`warning_ratio` AS `warning_ratio`,`view_fixture_lifecycle_v1`.`lifecycle_start_at` AS `lifecycle_start_at`,`view_fixture_lifecycle_v1`.`actual_value` AS `actual_value`,`view_fixture_lifecycle_v1`.`remaining_value` AS `remaining_value`,`view_fixture_lifecycle_v1`.`lifecycle_status` AS `lifecycle_status`,NULL AS `existence_status`,NULL AS `usage_status`,`view_fixture_lifecycle_v1`.`scrapped_at` AS `scrapped_at`,`view_fixture_lifecycle_v1`.`last_used_at` AS `last_used_at` from `view_fixture_lifecycle_v1` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_lifecycle_status_v2`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_lifecycle_status_v2` AS select `v`.`customer_id` AS `customer_id`,`v`.`fixture_id` AS `fixture_id`,`v`.`lifecycle_mode` AS `lifecycle_mode`,`v`.`replacement_cycle` AS `replacement_cycle`,`v`.`cycle_unit` AS `cycle_unit`,`v`.`warning_ratio` AS `warning_ratio`,`v`.`is_scrapped` AS `is_scrapped`,`v`.`scrapped_at` AS `scrapped_at`,`v`.`total_use_count` AS `total_use_count`,`v`.`first_used_at` AS `first_used_at`,`v`.`last_used_at` AS `last_used_at`,`v`.`lifecycle_start_at` AS `lifecycle_start_at`,`v`.`actual_value` AS `actual_value`,`v`.`remaining_value` AS `remaining_value`,`v`.`lifecycle_status` AS `lifecycle_status`,NULL AS `datecode` from `view_fixture_lifecycle_v1` `v` where (`v`.`lifecycle_mode` = 'serial') union all select `fdi`.`customer_id` AS `customer_id`,`fdi`.`fixture_id` AS `fixture_id`,'fixture' AS `lifecycle_mode`,`f`.`replacement_cycle` AS `replacement_cycle`,`f`.`cycle_unit` AS `cycle_unit`,coalesce(`f`.`warning_ratio`,0.8) AS `COALESCE(f.warning_ratio,0.8)`,0 AS `is_scrapped`,NULL AS `scrapped_at`,NULL AS `total_use_count`,NULL AS `first_used_at`,NULL AS `last_used_at`,`fdi`.`created_at` AS `lifecycle_start_at`,(to_days(now()) - to_days(`fdi`.`created_at`)) AS `actual_value`,(`f`.`replacement_cycle` - (to_days(now()) - to_days(`fdi`.`created_at`))) AS `remaining_value`,(case when ((to_days(now()) - to_days(`fdi`.`created_at`)) >= `f`.`replacement_cycle`) then 'expired' when ((to_days(now()) - to_days(`fdi`.`created_at`)) >= (`f`.`replacement_cycle` * coalesce(`f`.`warning_ratio`,0.8))) then 'warning' else 'normal' end) AS `lifecycle_status`,`fdi`.`datecode` AS `datecode` from (`fixture_datecode_inventory` `fdi` join `fixtures` `f` on(((`f`.`id` = `fdi`.`fixture_id`) and (`f`.`customer_id` = `fdi`.`customer_id`)))) where (`f`.`cycle_unit` = 'days') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_material_transaction_details`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_material_transaction_details` AS select `t`.`id` AS `transaction_id`,`t`.`transaction_type` AS `transaction_type`,`t`.`record_type` AS `record_type`,`t`.`transaction_date` AS `transaction_date`,`t`.`customer_id` AS `customer_id`,`t`.`fixture_id` AS `fixture_id`,`t`.`order_no` AS `order_no`,`t`.`source_type` AS `source_type`,`t`.`operator` AS `operator`,`t`.`note` AS `note`,`t`.`quantity` AS `total_quantity`,`t`.`created_at` AS `created_at`,`i`.`id` AS `item_id`,`i`.`serial_number` AS `serial_number`,`i`.`datecode` AS `datecode`,`i`.`quantity` AS `item_quantity`,`fs`.`existence_status` AS `serial_existence_status`,`fs`.`usage_status` AS `serial_usage_status`,(case when (`t`.`record_type` in ('individual','batch')) then concat('序號：',`i`.`serial_number`) when (`t`.`record_type` = 'datecode') then concat('Datecode：',`i`.`datecode`,' × ',`i`.`quantity`) else NULL end) AS `hover_item_text` from ((`material_transactions` `t` left join `material_transaction_items` `i` on((`i`.`transaction_id` = `t`.`id`))) left join `fixture_serials` `fs` on(((`fs`.`serial_number` = `i`.`serial_number`) and (`fs`.`fixture_id` = `t`.`fixture_id`) and (`fs`.`customer_id` = `t`.`customer_id`)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_model_max_stations`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_model_max_stations` AS select `mm`.`customer_id` AS `customer_id`,`mm`.`id` AS `model_id`,`mm`.`model_name` AS `model_name`,`ms`.`station_id` AS `station_id`,`s`.`station_name` AS `station_name`,min(floor((ifnull(`f`.`in_stock_qty`,0) / `fr`.`required_qty`))) AS `max_available_stations`,group_concat(concat(`f`.`fixture_name`,'(',ifnull(`f`.`in_stock_qty`,0),'/',`fr`.`required_qty`,')') order by (ifnull(`f`.`in_stock_qty`,0) / `fr`.`required_qty`) ASC separator ', ') AS `limiting_fixtures` from ((((`machine_models` `mm` join `model_stations` `ms` on(((`ms`.`model_id` = `mm`.`id`) and (`ms`.`customer_id` = `mm`.`customer_id`)))) join `stations` `s` on(((`s`.`id` = `ms`.`station_id`) and (`s`.`customer_id` = `mm`.`customer_id`)))) join `fixture_requirements` `fr` on(((`fr`.`model_id` = `mm`.`id`) and (`fr`.`station_id` = `ms`.`station_id`) and (`fr`.`customer_id` = `mm`.`customer_id`)))) join `fixtures` `f` on(((`f`.`id` = `fr`.`fixture_id`) and (`f`.`customer_id` = `mm`.`customer_id`)))) where ((`f`.`deleted_at` is null) and (`fr`.`required_qty` > 0)) group by `mm`.`customer_id`,`mm`.`id`,`mm`.`model_name`,`ms`.`station_id`,`s`.`station_name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_serial_lifecycle_v1`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_serial_lifecycle_v1` AS select `fs`.`customer_id` AS `customer_id`,`fs`.`fixture_id` AS `fixture_id`,`fs`.`serial_number` AS `serial_number`,`f`.`lifecycle_mode` AS `lifecycle_mode`,`f`.`replacement_cycle` AS `replacement_cycle`,`f`.`cycle_unit` AS `cycle_unit`,coalesce(`f`.`warning_ratio`,0.80) AS `warning_ratio`,`fs`.`existence_status` AS `existence_status`,`fs`.`usage_status` AS `usage_status`,`fs`.`scrapped_at` AS `scrapped_at`,`sus`.`total_use_count` AS `total_use_count`,`sus`.`first_used_at` AS `first_used_at`,`sus`.`last_used_at` AS `last_used_at`,coalesce(`sus`.`first_used_at`,cast(`fs`.`receipt_date` as datetime),`fs`.`created_at`) AS `lifecycle_start_at`,(case when (`f`.`cycle_unit` = 'uses') then coalesce(`sus`.`total_use_count`,0) when (`f`.`cycle_unit` = 'days') then (to_days(coalesce(`fs`.`scrapped_at`,now())) - to_days(coalesce(`sus`.`first_used_at`,cast(`fs`.`receipt_date` as datetime),`fs`.`created_at`))) else NULL end) AS `actual_value`,(case when (`f`.`cycle_unit` = 'uses') then (coalesce(`f`.`replacement_cycle`,0) - coalesce(`sus`.`total_use_count`,0)) when (`f`.`cycle_unit` = 'days') then (coalesce(`f`.`replacement_cycle`,0) - (to_days(now()) - to_days(coalesce(`sus`.`first_used_at`,cast(`fs`.`receipt_date` as datetime),`fs`.`created_at`)))) else NULL end) AS `remaining_value`,(case when (`fs`.`existence_status` = 'scrapped') then (case when ((`f`.`cycle_unit` = 'uses') and (coalesce(`sus`.`total_use_count`,0) < coalesce(`f`.`replacement_cycle`,0))) then 'premature_failure' when ((`f`.`cycle_unit` = 'days') and ((to_days(coalesce(`fs`.`scrapped_at`,now())) - to_days(coalesce(`sus`.`first_used_at`,cast(`fs`.`receipt_date` as datetime),`fs`.`created_at`))) < coalesce(`f`.`replacement_cycle`,0))) then 'premature_failure' else 'normal_expired' end) when ((`f`.`cycle_unit` = 'uses') and (coalesce(`sus`.`total_use_count`,0) >= coalesce(`f`.`replacement_cycle`,0))) then 'expired' when ((`f`.`cycle_unit` = 'days') and ((to_days(now()) - to_days(coalesce(`sus`.`first_used_at`,cast(`fs`.`receipt_date` as datetime),`fs`.`created_at`))) >= coalesce(`f`.`replacement_cycle`,0))) then 'expired' when ((`f`.`cycle_unit` = 'uses') and (coalesce(`f`.`replacement_cycle`,0) > 0) and (coalesce(`sus`.`total_use_count`,0) >= (coalesce(`f`.`replacement_cycle`,0) * coalesce(`f`.`warning_ratio`,0.80)))) then 'warning' when ((`f`.`cycle_unit` = 'days') and (coalesce(`f`.`replacement_cycle`,0) > 0) and ((to_days(now()) - to_days(coalesce(`sus`.`first_used_at`,cast(`fs`.`receipt_date` as datetime),`fs`.`created_at`))) >= (coalesce(`f`.`replacement_cycle`,0) * coalesce(`f`.`warning_ratio`,0.80)))) then 'warning' else 'normal' end) AS `lifecycle_status` from ((`fixture_serials` `fs` join `fixtures` `f` on(((`f`.`id` = `fs`.`fixture_id`) and (`f`.`customer_id` = `fs`.`customer_id`)))) left join `serial_usage_summary` `sus` on(((`sus`.`customer_id` = `fs`.`customer_id`) and (`sus`.`fixture_id` = `fs`.`fixture_id`) and (`sus`.`serial_number` = `fs`.`serial_number`)))) where (`fs`.`deleted_at` is null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_serial_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_serial_status` AS select `fs`.`id` AS `serial_id`,`fs`.`customer_id` AS `customer_id`,`fs`.`serial_number` AS `serial_number`,`fs`.`fixture_id` AS `fixture_id`,`f`.`fixture_name` AS `fixture_name`,`fs`.`source_type` AS `source_type`,`fs`.`existence_status` AS `existence_status`,`fs`.`usage_status` AS `usage_status`,(case when ((`fs`.`existence_status` = 'in_stock') and (`fs`.`usage_status` = 'idle')) then 1 else 0 end) AS `is_available`,`fs`.`receipt_date` AS `receipt_date`,`fs`.`return_date` AS `return_date`,`fs`.`note` AS `note`,`fs`.`created_at` AS `created_at`,`fs`.`updated_at` AS `updated_at` from (`fixture_serials` `fs` join `fixtures` `f` on(((`f`.`id` = `fs`.`fixture_id`) and (`f`.`customer_id` = `fs`.`customer_id`)))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `view_upcoming_fixture_replacements`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`fixture_test`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `view_upcoming_fixture_replacements` AS select `f`.`customer_id` AS `customer_id`,`f`.`id` AS `fixture_id`,`f`.`fixture_name` AS `fixture_name`,`f`.`lifecycle_mode` AS `lifecycle_mode`,`f`.`cycle_unit` AS `cycle_unit`,`f`.`replacement_cycle` AS `replacement_cycle`,(case when (`f`.`lifecycle_mode` = 'fixture') then `fus`.`total_use_count` when (`f`.`lifecycle_mode` = 'serial') then `fus`.`total_use_count` else 0 end) AS `total_uses`,`f`.`last_replacement_date` AS `last_replacement_date`,(to_days(curdate()) - to_days(`f`.`last_replacement_date`)) AS `used_days`,(case when ((`f`.`cycle_unit` = 'uses') and (`f`.`replacement_cycle` > 0)) then (case when (`f`.`lifecycle_mode` in ('fixture','serial')) then (`fus`.`total_use_count` / `f`.`replacement_cycle`) else NULL end) when ((`f`.`cycle_unit` = 'days') and (`f`.`replacement_cycle` > 0) and (`f`.`last_replacement_date` is not null)) then ((to_days(curdate()) - to_days(`f`.`last_replacement_date`)) / `f`.`replacement_cycle`) else NULL end) AS `usage_ratio` from (`fixtures` `f` left join `fixture_usage_summary` `fus` on(((`fus`.`fixture_id` = `f`.`id`) and (`fus`.`customer_id` = `f`.`customer_id`)))) where ((`f`.`replacement_cycle` is not null) and (`f`.`cycle_unit` in ('uses','days'))) */;
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

