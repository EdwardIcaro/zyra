-- CreateEnum
CREATE TYPE "VisualType" AS ENUM ('EYE', 'HAT', 'MASK', 'WEAPON', 'ARMOR', 'PET');

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" SERIAL NOT NULL,
    "account_id" INTEGER NOT NULL,
    "char_name" TEXT NOT NULL,
    "class_type" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "eye_type_id" INTEGER,
    "body_color" TEXT DEFAULT '#FF6B6B',
    "eye_color" TEXT DEFAULT '#FFFFFF',
    "visual_body" TEXT DEFAULT 'ball_red',
    "visual_face" TEXT DEFAULT 'eyes_determined',
    "visual_hat" TEXT DEFAULT 'none',
    "face_offset_x" INTEGER DEFAULT 0,
    "face_offset_y" INTEGER DEFAULT 5,
    "face_scale" DOUBLE PRECISION DEFAULT 1.0,
    "face_rotation" INTEGER DEFAULT 0,
    "face_width" INTEGER DEFAULT 35,
    "face_height" INTEGER DEFAULT 18,
    "hat_offset_x" INTEGER DEFAULT 0,
    "hat_offset_y" INTEGER DEFAULT -20,
    "hat_scale" DOUBLE PRECISION DEFAULT 1.0,
    "hat_rotation" INTEGER DEFAULT 0,
    "hat_width" INTEGER DEFAULT 60,
    "hat_height" INTEGER DEFAULT 45,
    "experience" BIGINT NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "max_hp" INTEGER NOT NULL DEFAULT 100,
    "current_hp" INTEGER NOT NULL DEFAULT 100,
    "max_mana" INTEGER NOT NULL DEFAULT 50,
    "current_mana" INTEGER NOT NULL DEFAULT 50,
    "damage" INTEGER NOT NULL DEFAULT 10,
    "defense" INTEGER NOT NULL DEFAULT 0,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "item_id" TEXT NOT NULL,
    "visual_config_id" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "slot_position" INTEGER NOT NULL,
    "is_equipped" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" SERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "max_slots" INTEGER NOT NULL DEFAULT 40,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visual_configs" (
    "id" SERIAL NOT NULL,
    "type" "VisualType" NOT NULL,
    "target_id" INTEGER NOT NULL,
    "layers" JSONB NOT NULL,
    "overrides" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visual_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_templates" (
    "id" SERIAL NOT NULL,
    "item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "grade" TEXT,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monster_templates" (
    "id" SERIAL NOT NULL,
    "monster_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "type" TEXT NOT NULL,
    "appearance" JSONB NOT NULL DEFAULT '{}',
    "stats" JSONB NOT NULL DEFAULT '{}',
    "behavior" JSONB NOT NULL DEFAULT '{}',
    "rewards" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monster_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monster_drops" (
    "id" SERIAL NOT NULL,
    "monster_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "chance" DOUBLE PRECISION NOT NULL,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monster_drops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_username_key" ON "accounts"("username");

-- CreateIndex
CREATE UNIQUE INDEX "characters_char_name_key" ON "characters"("char_name");

-- CreateIndex
CREATE INDEX "characters_account_id_idx" ON "characters"("account_id");

-- CreateIndex
CREATE INDEX "characters_session_id_idx" ON "characters"("session_id");

-- CreateIndex
CREATE INDEX "items_player_id_idx" ON "items"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "items_player_id_item_id_slot_position_key" ON "items"("player_id", "item_id", "slot_position");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_player_id_key" ON "inventory"("player_id");

-- CreateIndex
CREATE INDEX "visual_configs_type_idx" ON "visual_configs"("type");

-- CreateIndex
CREATE UNIQUE INDEX "visual_configs_type_target_id_key" ON "visual_configs"("type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_templates_item_id_key" ON "item_templates"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "monster_templates_monster_id_key" ON "monster_templates"("monster_id");

-- CreateIndex
CREATE INDEX "monster_drops_monster_id_idx" ON "monster_drops"("monster_id");

-- CreateIndex
CREATE UNIQUE INDEX "monster_drops_monster_id_item_id_key" ON "monster_drops"("monster_id", "item_id");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
