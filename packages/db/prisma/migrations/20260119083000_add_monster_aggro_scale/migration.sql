-- Add aggro_type and scale to monster_templates
ALTER TABLE monster_templates ADD COLUMN IF NOT EXISTS aggro_type VARCHAR(20) DEFAULT 'aggressive';
ALTER TABLE monster_templates ADD COLUMN IF NOT EXISTS scale DOUBLE PRECISION DEFAULT 1.0;
