-- Add visual_config_id to item_templates (template-level visuals)
ALTER TABLE "item_templates"
ADD COLUMN IF NOT EXISTS "visual_config_id" INTEGER;

-- Global visual layers (single global config for all players)
CREATE TABLE "global_visual_layers" (
    "id" SERIAL NOT NULL,
    "layer_type" VARCHAR(20) NOT NULL,
    "asset_file" VARCHAR(100) NOT NULL,
    "x_offset" INTEGER DEFAULT 0,
    "y_offset" INTEGER DEFAULT 0,
    "scale" DECIMAL(4, 2) DEFAULT 1.0,
    "rotation" DECIMAL(5, 2) DEFAULT 0,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 58,
    "height" INTEGER NOT NULL DEFAULT 58,
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "updated_at" TIMESTAMP(6) DEFAULT now(),
    CONSTRAINT "global_visual_layers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_global_visual_layers_type" ON "global_visual_layers"("layer_type");
