-- Create VisualType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VisualType') THEN
        CREATE TYPE "VisualType" AS ENUM ('EYE', 'HAT', 'MASK', 'WEAPON', 'ARMOR', 'PET');
    END IF;
END$$;

-- Create visual_configs table if missing
CREATE TABLE IF NOT EXISTS "visual_configs" (
    "id" SERIAL NOT NULL,
    "type" "VisualType" NOT NULL,
    "target_id" INTEGER NOT NULL,
    "layers" JSONB NOT NULL,
    "overrides" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(6) DEFAULT now(),
    "updated_at" TIMESTAMP(6) DEFAULT now(),
    CONSTRAINT "visual_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "visual_configs_type_target_id_key"
    ON "visual_configs"("type", "target_id");
CREATE INDEX IF NOT EXISTS "visual_configs_type_idx"
    ON "visual_configs"("type");
