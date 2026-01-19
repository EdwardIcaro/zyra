-- Monster spawns per zone
CREATE TABLE IF NOT EXISTS monster_spawns (
    id SERIAL PRIMARY KEY,
    zone_id VARCHAR(50) NOT NULL,
    monster_id VARCHAR(50) NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    level_override INTEGER,
    respawn_time INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monster_spawns_zone ON monster_spawns(zone_id);

-- Zone map image URLs
CREATE TABLE IF NOT EXISTS zone_maps (
    zone_id VARCHAR(50) PRIMARY KEY,
    image_url VARCHAR(255),
    updated_at TIMESTAMP DEFAULT NOW()
);
