-- Add attack_speed and defense to monster_templates
ALTER TABLE monster_templates ADD COLUMN attack_speed DOUBLE PRECISION DEFAULT 1.5;
ALTER TABLE monster_templates ADD COLUMN defense INTEGER DEFAULT 0;
