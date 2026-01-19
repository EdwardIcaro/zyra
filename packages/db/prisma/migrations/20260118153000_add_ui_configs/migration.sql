CREATE TABLE "ui_configs" (
    "ui_name" VARCHAR(100) NOT NULL,
    "config_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ui_configs_pkey" PRIMARY KEY ("ui_name")
);
