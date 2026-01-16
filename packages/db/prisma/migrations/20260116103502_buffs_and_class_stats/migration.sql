-- Buff templates
CREATE TABLE IF NOT EXISTS buff_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(10) NOT NULL DEFAULT 'buff',
    description TEXT,
    duration_ms INTEGER DEFAULT 0,
    stackable BOOLEAN DEFAULT FALSE,
    max_stacks INTEGER DEFAULT 1,
    effects JSONB DEFAULT '{}'::jsonb,
    visual_color INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Active character buffs
CREATE TABLE IF NOT EXISTS character_buffs (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    buff_id VARCHAR(50) NOT NULL REFERENCES buff_templates(id) ON DELETE CASCADE,
    stacks INTEGER DEFAULT 1,
    started_at TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE (character_id, buff_id)
);

CREATE INDEX IF NOT EXISTS idx_character_buffs_character ON character_buffs(character_id);

-- Class base stats
CREATE TABLE IF NOT EXISTS class_base_stats (
    class_type VARCHAR(50) PRIMARY KEY,
    max_hp INTEGER DEFAULT 100,
    max_mana INTEGER DEFAULT 50,
    strength INTEGER DEFAULT 10,
    dexterity INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,
    vitality INTEGER DEFAULT 10,
    luck INTEGER DEFAULT 5,
    base_damage INTEGER DEFAULT 10,
    base_defense INTEGER DEFAULT 0,
    attack_speed DOUBLE PRECISION DEFAULT 1.0,
    move_speed DOUBLE PRECISION DEFAULT 4.0
);
