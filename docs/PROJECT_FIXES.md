# Project Fixes Log

This file records changes that affect the project behavior. Each entry notes:
- What was wrong (before).
- What changed (after).
- Where it was fixed (file/area).

---

## 2026-01-19 - Mirror/Facing Direction (Hats/Visual Layers)
Before:
- When the player moved to the right, the hat often pointed left (mirroring looked inverted).
- The facing direction was derived from movement but ended up inverted relative to the rendered X-axis.

After:
- Facing direction now uses the render-time X delta, and the sign is inverted to match the actual world orientation.
- Hats and other visual layers now flip correctly with movement direction.

Location:
- `packages/client/src/entities/Player.ts`
