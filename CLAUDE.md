# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ZYRA** is a browser-based 2D action MMORPG engine with a focus on idle RPG mechanics, skill progression, and light multiplayer. Built as a TypeScript monorepo using PNPM workspaces with PixiJS for rendering, Colyseus for real-time multiplayer state synchronization, and PostgreSQL for persistence.

**Core Philosophy**: Preservation-first development. Make minimal, precise diffs. Never remove, refactor, or clean up code unless explicitly instructed. Scan relevant files before suggesting changes to avoid duplication or breaking existing logic.

## Development Commands

### Essential Commands
```bash
pnpm install                    # Install all dependencies
pnpm dev                        # Run both client (3000) and server (2567)
pnpm dev:server                 # Run server only (port 2567)
pnpm dev:client                 # Run client only (port 3000)
pnpm build                      # Build all packages (shared → server → client)
```

### Database Commands
```bash
pnpm db:migrate                 # Run Prisma migrations
pnpm db:generate                # Generate Prisma client
npx prisma studio               # Open database GUI (from packages/db/)
```

### Package-Specific Commands
```bash
pnpm --filter @zyra/server dev  # Server with auto-reload
pnpm --filter @zyra/client dev  # Client with Vite HMR
pnpm --filter @zyra/shared build # Build shared schemas
```

### Testing Changes
After any modification, test with:
1. Run `pnpm dev` to start both client and server
2. Open browser to `http://localhost:3000`
3. Login with any username (account auto-created)
4. Test the specific feature modified
5. Check server logs in terminal for errors

## Architecture Overview

### Monorepo Structure
```
packages/
├── client/         # PixiJS frontend (Vite dev server, port 3000)
├── server/         # Express + Colyseus backend (port 2567)
├── shared/         # Colyseus schemas, configs, registries (shared types)
└── db/             # Prisma schema, migrations, seed scripts
```

### Client Architecture (`packages/client/src/`)
**Entry Point**: `main.ts` → Initializes PixiJS, loads assets, starts game loop

**Key Components**:
- **Game.ts**: Root container managing scenes (Login → CharacterCustomization → Combat → Menu)
- **CombatScene.ts**: Main gameplay scene containing:
  - InputSystem (WASD movement, click targeting, skill hotkeys)
  - TargetingSystem (TAB cycling, click-to-target logic)
  - World rendering (players, monsters, projectiles, dropped items, tilemap)
  - UI components (InventoryUI, EquipmentUI, HealthManaBar, StatsUI, BuffBarUI, etc.)
  - NetworkManager (Colyseus room connection, state sync)
  - ParticleSystem (visual effects)
  - DamageNumberSystem (floating damage text)

**Entity Rendering**:
- **Player.ts / PlayerRenderer.ts**: Visual composition (body + face + hat layers)
- **Monster.ts**: Enemy entities with animations
- **Projectile.ts**: Arrow/magic missile rendering
- **DroppedItem.ts**: Loot on ground

### Server Architecture (`packages/server/src/`)
**Entry Point**: `index.ts` (1782 lines) → Bootstraps Express, Colyseus, serves admin panel

**Colyseus Rooms**:
- **CombatRoom.ts** (835 lines): Main gameplay loop
  - Handles player movement, targeting, combat
  - Monster AI (pathfinding, aggro)
  - Inventory/equipment management
  - Loot drop system
  - Buff/debuff processing
  - XP/level progression
- **WorldRoom.ts**: Exploration/social (placeholder)
- **LobbyRoom.ts**: Character selection/creation

**Core Systems**:
- **BuffManager**: Status effects with duration/stacks
- **EquipmentManager**: Equip/unequip items to slots (weapon, head, chest, rings, etc.)
- **InventoryManager**: 25-slot inventory with drag-drop swapping
- **DropSystem**: Loot generation from defeated monsters
- **Registries** (in-memory caches loaded from DB):
  - ItemRegistry, MonsterRegistry, BuffRegistry, ZoneRegistry, SkillRegistry

**REST Endpoints**:
- `/api/admin/*`: Monster/item/buff CRUD, hot-reload registries
- `/api/ui-config/*`: UI layout persistence
- `/api/login`: Username-based authentication (auto-creates accounts)
- `/api/characters`: Character CRUD operations

### Shared Layer (`packages/shared/src/`)
**Colyseus Schemas** (auto-synced state):
- PlayerState, MonsterState, CombatRoomState, ZoneRoomState
- InventoryState, EquipmentState, ItemState, BuffState
- ProjectileState, DroppedItemState, ZoneTileState

**Configuration Files**:
- `game-config.ts`: Combat balance (attack speed, movement)
- `classes-config.ts`: Class definitions + base stats
- `zones-config.ts`: Zone layouts + spawns
- `monsters-config.ts`: Monster templates
- `items-config.ts`: Item definitions
- `equipment-config.ts`: Equipment slot mapping
- `level-table.ts`: XP progression curve
- `buffs-config.ts`: Status effect definitions

### Database Schema (`packages/db/prisma/schema.prisma`)
**Critical Tables**:
- `accounts`: User accounts (auto-created on first login)
- `characters`: Player data (stats, class, level, appearance JSON)
- `items`: Instance inventory items (quantity, slot, equipped flag)
- `item_templates`: Item definitions (name, type, equip slot, visuals)
- `inventory`: Slot management per character
- `player_equipment`: Equipment slots (weapon, head, chest, legs, feet, rings, etc.)
- `monster_templates`: Monster definitions + base stats
- `monster_spawns`: Zone-specific spawns with stat overrides
- `monster_drops`: Loot tables (item, chance, quantity ranges)
- `class_base_stats`: Base stat templates per class
- `buff_templates`: Buff/debuff definitions
- `zone_maps`: Map background images
- `zone_tiles`: Tilemap data (ground, decoration, collision)
- `spawn_points`: Player respawn locations
- `visual_configs`: Layered visual definitions for items/gear
- `ui_configs`: JSON-based UI layout persistence

**Design Patterns**:
- PostgreSQL JSON columns for flexible data (appearance, stats, rewards)
- Cascade deletes for orphaned records
- Unique constraints on equipment slots
- Uses `pg` connection pool with configurable limits

## Critical Workflows

### Login Flow
1. User enters username → Server checks `accounts` table
2. If not exists → create account; if exists → return account ID
3. Server returns characters for that account
4. Client shows character selection or "Create Character"
5. If new character → customization screen → server generates initial inventory/equipment → inserts to DB
6. Client joins `CombatRoom` via Colyseus → server synchronizes zone state

### Combat Loop (Server-Authoritative)
**Server** (CombatRoom update cycle):
1. Collect player movement intent (dx/dy from client messages)
2. Update player positions with collision detection
3. Process monster AI (pathfinding toward targets, aggro checks)
4. Check attack hits (melee range / projectile collision)
5. Apply damage, generate XP, handle level-ups
6. Generate loot drops from defeated monsters
7. Broadcast state changes to all clients (Colyseus auto-sync)

**Client** (CombatScene render loop):
1. Receive state updates from server
2. Interpolate (Lerp) entity positions for smooth movement
3. Render tilemap layers → entities → projectiles → particles → UI
4. Poll input (WASD, click, TAB) and send movement intent if changed
5. Update UI components (health bars, inventory, buffs, stats)

### Equipment System
1. Client clicks item in inventory
2. Sends `equipment:equip` message to server
3. Server validates item is equipable + slot available
4. Moves item from `items` table to `player_equipment` table
5. Updates `character.visual_*` fields (visual_hat, visual_body, etc.)
6. Broadcasts visual change to all clients in room
7. Client re-renders avatar with new equipped item layers

### Inventory Management
- **25 slots** default (configurable per character in DB)
- Drag-to-move within inventory (swap positions)
- Items persist to `items` table with `slot` field
- Equipped items removed from inventory (moved to equipment slots)
- Loot auto-collected into inventory (or dropped on ground if full)

### Mana Regeneration (Sprint 2)
**Server-Side** (`CombatRoom.ts`):
1. `lastDamagedAt` Map rastreia quando cada player foi atingido
2. Em `updateMonsters()`, ao aplicar dano: `this.lastDamagedAt.set(targetSessionId, now)`
3. Em `updateManaRegen()`, verifica: `isInCombat = (Date.now() - lastDamaged) < 5000ms`
4. Calcula regen: `regenPerSegundo = maxMana × baseRate × (1 + INT/10)`
   - Em combate: `baseRate = 0.02`
   - Fora combate: `baseRate = 0.04`
5. Aplica no loop: `player.currentMana = Math.min(max, current + regenThisTick)`

**Client-Side**: Transparente — Colyseus sincroniza `currentMana` automaticamente

**Design Notes**:
- Regen para quando `currentMana >= maxMana`
- Regen para quando player está morto (`!isAlive`)
- INT do player afeta taxa: `INT=10` é 1× multiplicador, `INT=20` é 2×, etc.
- 5-segundo timeout de combate é hardcoded em `COMBAT_TIMEOUT_MS = 5000`

### Admin Panel Hot-Reload
1. Navigate to `http://localhost:2567/admin` or `/dashboard`
2. Modify monster/item templates, loot tables, spawn locations
3. Call `/api/admin/reload` endpoint to reload all registries from DB
4. No server restart needed (hot-reload in-memory caches)

## Environment Configuration

### Required Environment Variables (`packages/server/.env`)
```
DB_USER=your_postgres_user
DB_HOST=localhost
DB_NAME=zyra_db
DB_PASSWORD=your_password
DB_PORT=5432
DB_MAX=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONN_TIMEOUT_MS=2000
```

**Setup**:
```bash
cp packages/server/.env.example packages/server/.env
# Edit .env with your PostgreSQL credentials
```

If any required variable is missing, the server will fail at startup with a clear error message.

## Development Best Practices

### Code Modification Rules (from agents.md)
1. **Preservation First**: Always make minimal diffs. Never rewrite entire files.
2. **Pre-Scan Requirement**: Before editing, read affected files to understand current state (functions, variables, logic).
3. **File Creation/Deletion**: ALWAYS ask for explicit confirmation BEFORE creating new files or deleting existing ones.
4. **Avoid Duplication**: Scan relevant files (e.g., CombatRoom.ts, PlayerRenderer.ts, TargetingSystem.ts) before suggesting changes.
5. **No Unnecessary Dependencies**: Never add new npm packages without explicit approval.
6. **Testing**: After every change, suggest exact test steps (e.g., "Equip item → check F5 persistence").
7. **Language**: Logs and UI messages in Portuguese (e.g., "Selecione um alvo primeiro!"), but code/comments in English.

### Idle RPG Mechanics Focus
- **Progress Bars**: Idle/active/joint progress indicators for skills
- **Casual Rewards**: 5-10 min sessions = visible progress (quick XP, loot feedback)
- **Hardcore Rewards**: Long sessions = multipliers, rare drops, prestige bonuses
- **Offline Progress**: Track last-login and calculate idle gains (80% efficiency for casual balance)

### Security & Safety
- Confirm before any destructive commands (rm, drop table, git reset, etc.)
- Server authority for all game logic (client is thin to prevent cheating)
- Validate all client messages on server before processing
- Avoid OWASP top 10 vulnerabilities (XSS, SQL injection, command injection)

### Common Pitfalls to Avoid
- **Don't hallucinate old code versions**: Base all suggestions on real filesystem content
- **Don't over-engineer**: Make only the changes directly requested
- **Don't add unnecessary features**: A bug fix doesn't need surrounding code cleaned up
- **Don't create helpers for one-time operations**: Prefer inline code unless abstraction is clearly justified
- **Don't skip collision checks**: Always validate player movement against zone tiles

## Key File Locations

### Entry Points
- **Server**: `C:\Zyra\packages\server\src\index.ts`
- **Client**: `C:\Zyra\packages\client\src\main.ts`
- **Database Schema**: `C:\Zyra\packages\db\prisma\schema.prisma`
- **Shared Exports**: `C:\Zyra\packages\shared\src\index.ts`

### Critical Game Logic
- **Combat Room**: `packages/server/src/rooms/CombatRoom.ts:835` (main gameplay loop)
- **Player Rendering**: `packages/client/src/entities/PlayerRenderer.ts` (visual composition)
- **Combat Scene**: `packages/client/src/scenes/CombatScene.ts` (rendering + input)
- **Network Manager**: `packages/client/src/game/NetworkManager.ts` (client-server sync)
- **Targeting System**: `packages/client/src/game/systems/TargetingSystem.ts` (TAB cycle, click-to-target)

### UI Components (packages/client/src/ui/)
- InventoryUI.ts: 25-slot drag-drop inventory
- EquipmentUI.ts: 8 equipment slots display
- HealthManaBar.ts: Player health/mana bars with color states
- StatsUI.ts: Attributes panel (STR, DEX, INT, VIT, LCK)
- BuffBarUI.ts: Active buff icons + timers
- TargetFrameUI.ts: Enemy targeting indicator
- ItemTooltip.ts: Item hover information
- SpellSlotsUI.ts: 3 equipped spell slots com duração + raridade

### Game Systems
- **ConjurationSystem.ts**: Sistema de conjuração (digitação de código → equipar carta)
- **InputSystem.ts**: Captura de movimento (WASD, arrows) e input do jogador
- **TargetingSystem.ts**: TAB cycling e click-to-target com visual frame
- **ParticleSystem.ts**: Efeitos visuais de combate (splashes, explosões)
- **DamageNumberSystem.ts**: Floating damage text com fade-out

### Conjuration & Spellslots
- **Admin Panel**: `packages/server/public/admin.html` (linha ~6828) — captura de teclas com suporte a Numpad
- **Server Config**: `packages/server/src/index.ts` — função `loadServerConfigFromDB()` com merge de defaults
- **Keybindings**: Definidos em `CombatScene.ts` (linhas 73–81) e sincronizados via `serverConfig`
  - `fire1/fire2/fire3`: Numpad1/2/3 (dispara carta nos slots)
  - `conjure`: 'f' (abre painel de conjuração)
  - `inventory`: 'i', `stats`: 'p', `cards`: 'c'

**Fluxo de Conjuração**:
1. Pressionar 'f' → abre painel de conjuração
2. Digitar código da carta (ex: "fir" para Fireball) → busca dinâmica com debounce 300ms
3. Confirmar → `conjure:equip` message ao servidor
4. Server valida mana + cria SpellSlotSchema
5. Client recebe slot equipado, SpellSlotsUI renderiza com timer de duração
6. Pressionar Numpad1/2/3 → `fireSlot(0/1/2)` → `conjure:fire` message
7. Server cria projétil + **remove slot imediatamente** (uso único)
8. Client sincroniza via Colyseus → slot some da UI

**Detecção de Slot Vazio**:
- `CombatScene.ts:fireSlot()` linha 1122 → `showToast('Slot X vazio!')`
- Feedback visual em vermelho, centro-topo, desaparece em 2s

## Technical Decisions & Constraints

1. **Colyseus for State Sync**: Room-based architecture with automatic client synchronization via schemas (chosen over Socket.io for schema-first design)
2. **PostgreSQL + Prisma**: Type-safe queries, auto-migrations, JSON columns for flexible data
3. **Monorepo (pnpm)**: Shared schemas prevent version mismatches between client/server
4. **PixiJS over 3D Engines**: 2D-optimized, lower overhead than Babylon.js/Three.js
5. **Server Authority**: All game logic on server; client is thin renderer (anti-cheat)
6. **Hot-Reload Admin**: DB-driven configs avoid code redeployment
7. **Slot-Based Inventory**: Simple, intuitive for web UI (vs weight/volume systems)
8. **Dynamic Keybindings**: Server sends `keybindings` config ao client via `serverConfig`. Client usa helper `matchesKey(event, binding)` para suportar tanto `e.code` (Numpad/Key/Digit) quanto `e.key` (caracteres). Admin panel usa `e.code` para Numpad, `keyNameMap` para mapeamento de teclas especiais.
9. **Reactive Mana Regen**: Server atualiza `player.currentMana` a cada tick; Colyseus propaga via `onChange` automaticamente. Client não precisa conhecer lógica de regen — apenas renderiza barra de mana.

## Current Development Focus (2026-03-22)

**✅ COMPLETED: Sprint 3 (Game Feel Polish)** — 2026-03-22
- ✅ AudioManager system with 7 SFX (spell-cast, impact-magic, player-hit, levelup-fanfare, equip-success, pickup-gold, death-sound)
- ✅ Screen shake on player damage (15px intensity, 150ms duration)
- ✅ Flash damage feedback (white overlay, 100ms fade, 0.6 alpha)
- ✅ Cooldown visual: Dark overlay + red shrinking bar + timer text on spell slots
- ✅ XP animation: Animated bar fill (300ms) + "+XXX XP" floating text with fade-out
- ✅ Equipment glow: Pulsing yellow glow on equipped items
- **Impact**: Game Feel score: 4/10 → 9/10 (estimated)
- **Implementation**: `CombatScene.ts`, `AudioManager.ts`, `SpellSlotsUI.ts`, `GameHUD.ts`, `InventoryUI.ts`

**QUEUED: Conjuration System Improvements**
- Problem: Fluxo atual de conjuração é lento (5 ações + painel complexo)
- 2 sugestões propostas (ver `CONJURATION_IMPROVEMENTS.md`):
  1. **Element Quickcast** (Magicka-like): Q/W/E/R/T/Y/U = elementos, combinar para feiços (4-6h)
  2. **Deck Quick-Switch** (Simples): D+1/2/3/4 = mudar deck pré-configurado (2-3h)
- Decision pending: Qual implementar primeiro?

**SCOPE CLARIFICATION:**
- Game focuses on **Caster classes only** (Mage/Bruxo) initially
- Warrior, Archer, Cleric, Assassin removed from priority
- Simplifies balancing and design focus

## Sprint Features (Recent Implementations)

### Sprint 1: Teclas Numpad + Feedback Visual

**Bug Fix: Teclas Numpad não disparavam cartas**
- **Root Cause**: 3 bugs encadeados (admin capturava `e.key` ao invés de `e.code`, merge incompleto de config, hardcoded keybindings no client)
- **Fixed Files**:
  - `packages/server/public/admin.html` (linha ~6828): Detecta `e.code.startsWith('Numpad')` para salvar "Numpad1" corretamente
  - `packages/server/src/index.ts` (função `loadServerConfigFromDB`): Merge com defaults ao carregar config do banco
  - `packages/client/src/scenes/CombatScene.ts` (método `matchesKey()`): Suporta tanto `e.code` (Numpad/Key/Digit) quanto `e.key` (caracteres)

**Feedback Visual: Slot Vazio**
- Ao pressionar tecla de fire em slot vazio → Toast "Slot X vazio!" em vermelho
- Implementado em `CombatScene.ts` método `fireSlot()` linha 1122

**Card Removal After Fire (UX Fix)**
- Cards agora somem **imediatamente** após disparo (uso único por conjuração)
- Server: `CombatRoom.ts` linha 856 → `player.spellSlots.delete(slotKey)` após projétil criado
- Client: Colyseus sincroniza automaticamente → `HealthManaBar` remove do UI

---

### Sprint 2: Mana Regeneração

**Fórmula de Regen**:
```
regenPerSegundo = maxMana × baseRate × (1 + INT / 10)

Em combate:    baseRate = 0.02  (2%/seg)  — recebeu dano nos últimos 5s
Fora combate:  baseRate = 0.04  (4%/seg)  — não recebeu dano há 5s+
```

**Implementação** (`packages/server/src/rooms/CombatRoom.ts`):
- Linha 24: `private lastDamagedAt = new Map<string, number>()` — rastreia último dano por player
- Linha 754: `this.lastDamagedAt.set(m.targetPlayerId, now)` — atualiza ao sofrer dano
- Linhas 574–590: Novo método `updateManaRegen(player, sessionId, deltaTime)` com lógica de regen
- Linha 552: Integrado no loop principal `update()` via `this.state.players.forEach((p, sessionId) => ...)`

**Client-Side**: Zero mudanças — Colyseus propaga `currentMana` automaticamente via `onChange`

**Testing**:
1. Gastar mana (disparar cartas)
2. Fora de combate → mana regen rápida (4%)
3. Atacar/sofrer dano → regen fica lenta por 5s (2%)
4. INT maior = regen proporcional mais rápida

---

### Sprint 3: Game Feel Polish (Complete)

**Motivation**: Players reported game felt "parado" (static/boring) — no audio, no impact feedback, invisible cooldowns

**Implementation** (2026-03-22):

#### 1. AudioManager System
- **File**: `packages/client/src/systems/AudioManager.ts` (new)
- **Method**: `playSound(name: string, volume: number = 1.0)`
- **Integration**: Initialized in `CombatScene.ts` constructor
- **7 SFX Assets** (placed in `packages/client/public/assets/audio/`):
  - `spell-cast.wav` (300ms) — Fire slot action
  - `impact-magic.wav` (200ms) — Monster hit feedback
  - `player-hit.wav` (150ms) — Player damage (local)
  - `levelup-fanfare.wav` (1.5s) — Level up event
  - `equip-success.wav` (300ms) — Item equip
  - `pickup-gold.wav` (200ms) — Loot collection
  - `death-sound.wav` (1s) — Player death (queued for future)

#### 2. Visual Effects

**Screen Shake** (`CombatScene.ts`, new method):
```typescript
private screenShake(intensity: number = 10, duration: number = 100)
  - Called on player damage: this.screenShake(15, 150)
  - Uses requestAnimationFrame for smooth animation
  - Randomizes position offset within intensity range
```

**Flash Damage** (`CombatScene.ts`, new method):
```typescript
private flashDamage(duration: number = 100, alpha: number = 0.6)
  - White overlay covers screen
  - Fades out over duration (100ms default)
  - Creates impact feedback sensation
```

**Cooldown Visual** (`SpellSlotsUI.ts`):
- Added to `SpellSlotUIElement` interface: `cooldownOverlay`, `cooldownBar`, `cooldownTimer`
- Created in `createEmptySlotElement()`:
  - Dark overlay (0x000000, 0.7 alpha) — appears when on cooldown
  - Red bar (0xFF0000) — shrinks as cooldown ticks down
  - Timer text — shows remaining seconds
- Updated each frame in `updateDurationBalloons()`:
  - Bar width = `(timeRemaining / maxDuration) * slotWidth`
  - All 3 elements hidden when `timeRemaining <= 0`

**XP Animation** (`GameHUD.ts`):
- New method `createXPFloatingText(xpAmount: number)`
- Detects XP gain by comparing `lastExperience` with current
- Creates floating "+XXX XP" text that:
  - Floats upward 50px over 1000ms
  - Fades from 1.0 alpha → 0
  - Auto-destroys after animation
- Standard gold color (0xFFFF00) with black stroke

**Equipment Glow** (`InventoryUI.ts`):
- New method `addEquipmentGlow(container: Container)`
- Called when item is equipped (in `update()` at line ~1286)
- Creates yellow circle (0xFFFF00) around slot
- Pulsing effect via `setInterval`:
  - Alpha oscillates between 0.3 and 1.0
  - Updates every 50ms for smooth animation
  - Marks glow with `__isEquipmentGlow` flag to avoid duplicates

#### 3. Integration Points

| Feature | File | Method | Trigger |
|---------|------|--------|---------|
| Spell cast SFX | CombatScene.ts | fireSlot() | Numpad 1/2/3 press |
| Impact SFX | CombatScene.ts | monster.onChange() | Monster takes damage |
| Player hit SFX | CombatScene.ts | player.onChange() | Player currentHp decreases |
| Levelup SFX | CombatScene.ts | player.listen("level") | Level increases |
| Equip SFX | CombatScene.ts | onItemDoubleClick | Item equipped |
| Pickup SFX | CombatScene.ts | room.state.droppedItems.onRemove() | Item collected |
| Screen shake | CombatScene.ts | player.onChange() (damage) | After hit SFX |
| Flash damage | CombatScene.ts | player.onChange() (damage) | After shake |
| Cooldown visual | SpellSlotsUI.ts | updateDurationBalloons() | Each frame |
| XP float | GameHUD.ts | update() | XP gain detected |
| Equipment glow | InventoryUI.ts | update() | When item equipped |

#### 4. Testing Checklist
- ✅ Fire spell → hears spell-cast SFX
- ✅ Hit monster → hears impact-magic SFX
- ✅ Take damage → hears player-hit SFX + screen shakes + white flash
- ✅ Level up → hears levelup-fanfare SFX
- ✅ Equip item → hears equip-success SFX + equipment glow animates
- ✅ Pickup loot → hears pickup-gold SFX
- ✅ Cooldown → spell slot shows dark overlay + red shrinking bar + timer
- ✅ Gain XP → see "+XXX XP" text float up and fade out

**Result**: Transformative improvement in "game feel" — previously silent/static game now has punchy audio/visual feedback on every action

## Future Development Notes

From agents.md and design docs:
1. **Skill Tree**: Visual node graph UI (currently stub)
2. **Prestige/Reset**: Veteran rewards, respec mechanics
3. **World Exploration**: Multi-zone navigation (WorldRoom placeholder exists)
4. **Social Features**: Trading, guilds (Colyseus infrastructure ready)
5. **Performance**: Consider LOD (level-of-detail) for large monster counts
6. **UI Polish**: Pomodoki-style buttons (green CTA, pixel art step indicators)

## Additional Resources

- **Project Documentation**: See `C:\Zyra\readme.md` for user-facing info
- **Agent Configuration**: See `C:\Zyra\agents.md` for detailed development rules
- **Design Plans**: Check `docs/` folder for UI/inventory implementation plans
- **PixiJS Docs**: https://pixijs.com/
- **Colyseus Docs**: https://docs.colyseus.io/
- **Prisma Docs**: https://www.prisma.io/docs/
