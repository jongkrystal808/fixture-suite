SET GLOBAL log_bin_trust_function_creators = 1;

DROP TRIGGER IF EXISTS trg_fixture_serial_insert;
DELIMITER $$

CREATE TRIGGER trg_fixture_serial_insert
AFTER INSERT ON fixture_serials
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET
        self_purchased_qty =
            self_purchased_qty
            + (NEW.source_type = 'self_purchased'),

        customer_supplied_qty =
            customer_supplied_qty
            + (NEW.source_type = 'customer_supplied'),

        available_qty =
            available_qty
            + (NEW.status = 'in_stock'),

        deployed_qty =
            deployed_qty
            + (NEW.status = 'deployed'),

        maintenance_qty =
            maintenance_qty
            + (NEW.status = 'maintenance'),

        scrapped_qty =
            scrapped_qty
            + (NEW.status = 'scrapped'),

        returned_qty =
            returned_qty
            + (NEW.status = 'returned')
    WHERE id = NEW.fixture_id;
END$$

DELIMITER ;


DROP TRIGGER IF EXISTS trg_fixture_serial_update;
DELIMITER $$

CREATE TRIGGER trg_fixture_serial_update
AFTER UPDATE ON fixture_serials
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        UPDATE fixtures
        SET
            available_qty =
                available_qty
                - (OLD.status = 'in_stock')
                + (NEW.status = 'in_stock'),

            deployed_qty =
                deployed_qty
                - (OLD.status = 'deployed')
                + (NEW.status = 'deployed'),

            maintenance_qty =
                maintenance_qty
                - (OLD.status = 'maintenance')
                + (NEW.status = 'maintenance'),

            scrapped_qty =
                scrapped_qty
                - (OLD.status = 'scrapped')
                + (NEW.status = 'scrapped'),

            returned_qty =
                returned_qty
                - (OLD.status = 'returned')
                + (NEW.status = 'returned')
        WHERE id = NEW.fixture_id;
    END IF;
END$$

DELIMITER ;


DROP TRIGGER IF EXISTS trg_datecode_inventory_insert;
DELIMITER $$

CREATE TRIGGER trg_datecode_inventory_insert
AFTER INSERT ON fixture_datecode_inventory
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET
        available_qty = available_qty + NEW.available_qty,

        self_purchased_qty =
            self_purchased_qty
            + (NEW.source_type = 'self_purchased') * NEW.available_qty,

        customer_supplied_qty =
            customer_supplied_qty
            + (NEW.source_type = 'customer_supplied') * NEW.available_qty
    WHERE id = NEW.fixture_id;
END$$

DELIMITER ;


DROP TRIGGER IF EXISTS trg_datecode_inventory_update;
DELIMITER $$

CREATE TRIGGER trg_datecode_inventory_update
AFTER UPDATE ON fixture_datecode_inventory
FOR EACH ROW
BEGIN
    DECLARE delta_available INT;
    DECLARE delta_returned INT;

    SET delta_available = NEW.available_qty - OLD.available_qty;
    SET delta_returned  = NEW.returned_qty  - OLD.returned_qty;

    UPDATE fixtures
    SET
        available_qty = available_qty + delta_available,
        returned_qty  = returned_qty  + delta_returned,

        self_purchased_qty =
            self_purchased_qty
            + (NEW.source_type = 'self_purchased') * delta_available
            - (NEW.source_type = 'self_purchased') * delta_returned,

        customer_supplied_qty =
            customer_supplied_qty
            + (NEW.source_type = 'customer_supplied') * delta_available
            - (NEW.source_type = 'customer_supplied') * delta_returned
    WHERE id = NEW.fixture_id;
END$$

DELIMITER ;



DROP TRIGGER IF EXISTS trg_replacement_insert;
DROP TRIGGER IF EXISTS trg_replacement_update;
DROP TRIGGER IF EXISTS trg_replacement_delete;

DELIMITER $$

CREATE TRIGGER trg_replacement_insert
AFTER INSERT ON replacement_logs
FOR EACH ROW
BEGIN
    UPDATE fixtures
    SET last_replacement_date = NEW.replacement_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.fixture_id;
END$$

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
END$$

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
END$$

DELIMITER ;



