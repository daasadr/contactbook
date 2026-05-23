-- Migrace: přechod svátku (name_day) z full date na month_day (pouze den a měsíc)
-- Idempotentní — bezpečné pro opakované spuštění

UPDATE field_definitions
SET field_type = 'month_day'
WHERE name = 'name_day' AND field_type = 'date';
