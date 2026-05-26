# Carlos: Simulation Wars

A playable 3D browser game demo about Carlos, the Defyn 2x000 ring, the split notepad equation, Rickr, and a simulation that is collapsing into weaponized physics.

## Game Design Overview

Carlos is a Spanish scientist and impossible physical force trapped inside a cosmic AI simulation. After the notepad equation breaks reality, he moves through three simulation layers to stabilize nodes, fight AI constructs, bend time, phase reality, and survive Rickr at the core.

The demo is built for a 5+ minute first run:

- Stable Simulation Zone: clean, structured grid city with clean geometry and early enemies.
- Corrupted Zone: broken platforms, glitch fields, phase bridges, higher verticality.
- Core System Layer: red/blue high-intensity core space with Rickr, spawning enemies, and an 80 second final survival breach.

Core mechanics:

- Third-person movement, jump, dash, and dynamic chase camera.
- Defyn ring energy pulse attack.
- Time distortion that slows enemies and enemy projectiles.
- Reality phase shift that reveals glitch platforms and powers Carlos up.
- Hold-to-sync simulation nodes, portals, hazards, enemies, and a final survival phase.
- Web Audio hooks for UI feedback, attacks, portal tones, damage, and ambient drone.

## Folder Structure

```text
carlos-simulation-wars/
  index.html          Browser shell and HUD markup
  README.md           Design overview and run notes
  src/
    main.js           Full Three.js game code
    styles.css        Cinematic UI, overlays, meters, and visual polish
```

## Controls

- Move: W/A/S/D or arrow keys
- Camera: mouse
- Jump: Space
- Dash: Shift
- Defyn ring pulse: left mouse button or J
- Time distortion: Q
- Reality phase shift: F
- Interact / sync / enter portal: E
- Release mouse: Escape

## Run

From this folder:

```powershell
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

The game uses Three.js through a CDN import in `index.html`, so the first load needs internet access.

## Expansion Notes

- Replace Carlos' procedural mesh with a rigged GLB character and map the same animation state names.
- Add authored levels by moving level definitions from `src/main.js` into JSON files.
- Add real music stems by connecting them to the existing Web Audio lifecycle.
- Add boss attack patterns to Rickr during the final breach.
- Add collectible notepad pages that unlock alternate dialogue and modifiers.
- Add checkpoints at each completed portal for longer campaign structure.
