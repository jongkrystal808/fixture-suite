SET GLOBAL log_bin_trust_function_creators = 1;

-- SERIAL INSERT TRIGGER
DROP TRIGGER IF EXISTS trg_serial_insert;
CREATE TRIGGER trg_serial_insert
AFTER INSERT ON fixture_serials
FOR EACH ROW
BEGIN
    UPDATE fixtures SET
        self_purchased_qty    = self_purchased_qty    + (NEW.source_type = 'self_purchased'),
        customer_supplied_qty = customer_supplied_qty + (NEW.source_type = 'customer_supplied'),
        available_qty         = available_qty         + (NEW.status = 'available'),
        deployed_qty          = deployed_qty          + (NEW.status = 'deployed'),
        maintenance_qty       = maintenance_qty       + (NEW.status = 'maintenance'),
        scrapped_qty          = scrapped_qty           + (NEW.status = 'scrapped'),
        returned_qty          = returned_qty           + (NEW.status = 'returned')
    WHERE id = NEW.fixture_id;
END;

-- SERIAL STATUS UPDATE TRIGGER
DROP TRIGGER IF EXISTS trg_serial_update;
CREATE TRIGGER trg_serial_update
AFTER UPDATE ON fixture_serials
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        UPDATE fixtures
        SET
            available_qty   = available_qty
                              - (OLD.status = 'available')
                              + (NEW.status = 'available'),
            deployed_qty    = deployed_qty
                              - (OLD.status = 'deployed')
                              + (NEW.status = 'deployed'),
            maintenance_qty = maintenance_qty
                              - (OLD.status = 'maintenance')
                              + (NEW.status = 'maintenance'),
            scrapped_qty    = scrapped_qty
                              - (OLD.status = 'scrapped')
                              + (NEW.status = 'scrapped'),
            returned_qty    = returned_qty
                              - (OLD.status = 'returned')
                              + (NEW.status = 'returned')
        WHERE id = NEW.fixture_id;
    END IF;
END;

-- SERIAL DELETE TRIGGER
DROP TRIGGER IF EXISTS trg_serial_delete;
CREATE TRIGGER trg_serial_delete
AFTER DELETE ON fixture_serials
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET
        self_purchased_qty    = self_purchased_qty    - (OLD.source_type = 'self_purchased'),
        customer_supplied_qty = customer_supplied_qty - (OLD.source_type = 'customer_supplied'),
        available_qty         = available_qty         - (OLD.status = 'available'),
        deployed_qty          = deployed_qty          - (OLD.status = 'deployed'),
        maintenance_qty       = maintenance_qty       - (OLD.status = 'maintenance'),
        scrapped_qty          = scrapped_qty           - (OLD.status = 'scrapped'),
        returned_qty          = returned_qty           - (OLD.status = 'returned')
    WHERE id = OLD.fixture_id;
END;

-- replacement triggers（不變）
DROP TRIGGER IF EXISTS trg_replacement_insert;
CREATE TRIGGER trg_replacement_insert
AFTER INSERT ON replacement_logs
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET last_replacement_date = NEW.replacement_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.fixture_id;
END;

DROP TRIGGER IF EXISTS trg_replacement_update;
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
END;

DROP TRIGGER IF EXISTS trg_replacement_delete;
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
END;

-- usage trigger
DROP TRIGGER IF EXISTS trg_update_serial_usage;
CREATE TRIGGER trg_update_serial_usage
AFTER INSERT ON usage_logs
FOR EACH ROW
BEGIN
    IF NEW.serial_number IS NOT NULL THEN
        UPDATE fixture_serials
        SET total_uses    = total_uses + NEW.use_count,
            last_use_date = CURRENT_DATE,
            updated_at    = CURRENT_TIMESTAMP
        WHERE serial_number = NEW.serial_number;
    END IF;
END;
