-- Migration: Adicionar campos de equipamento
ALTER TABLE item_templates 
ADD COLUMN IF NOT EXISTS equip_slot VARCHAR(20),
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'material',
ADD COLUMN IF NOT EXISTS is_equipable BOOLEAN DEFAULT false;

-- Criar constraint para validar slots
ALTER TABLE item_templates
ADD CONSTRAINT check_equip_slot 
CHECK (equip_slot IN ('weapon', 'head', 'chest', 'legs', 'boots', 'ring1', 'ring2', 'amulet') OR equip_slot IS NULL);

-- Criar constraint para validar tipos
ALTER TABLE item_templates
ADD CONSTRAINT check_item_type
CHECK (item_type IN ('material', 'weapon', 'armor', 'accessory', 'consumable'));

-- Atualizar itens existentes
UPDATE item_templates SET 
  item_type = 'weapon',
  is_equipable = true,
  equip_slot = 'weapon'
WHERE id LIKE 'weapon_%';

UPDATE item_templates SET 
  item_type = 'armor',
  is_equipable = true,
  equip_slot = 'chest'
WHERE id LIKE 'armor_%';

-- Criar índice para busca rápida
CREATE INDEX idx_item_templates_equipable ON item_templates(is_equipable, equip_slot);