-- Zone tilemaps
CREATE TABLE IF NOT EXISTS zone_tiles (
    id SERIAL PRIMARY KEY,
    zone_id VARCHAR(50) NOT NULL,
    layer VARCHAR(20) NOT NULL,
    tile_path VARCHAR(255) NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_zone_tiles_zone ON zone_tiles(zone_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_zone_tile ON zone_tiles(zone_id, layer, x, y);
