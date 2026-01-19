-- Spawn points (player initial spawn per zone)
CREATE TABLE IF NOT EXISTS spawn_points (
    zone_id VARCHAR(50) PRIMARY KEY,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
