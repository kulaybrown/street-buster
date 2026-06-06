# TODO - Street Buster (file organization)

- [ ] Step 0: Create data layer files under `src/game/data/` (characters/skills/stages) by extracting existing constants from `src/App.jsx`.
- [ ] Step 1: Create screen components under `src/game/ui/screens/` (Start, Character, Skill, Stage, Game) and wire them from `src/App.jsx`.
- [ ] Step 2: Create `src/game/ui/controls/ControlsOverlay.jsx` (render existing controls markup, move pointer-handler wiring out of `App.jsx`).
- [ ] Step 3: Extract game engine logic from `src/App.jsx` into `src/game/engine/createGameEngine.js` (keep DOM IDs/classes unchanged).
- [ ] Step 4: Update `src/App.jsx` to act as coordinator: owns global selections/persistence, instantiates engine, and passes callbacks to screens.
- [ ] Step 5: Smoke test: `npm run dev` and verify navigation + stage/game functionality.

