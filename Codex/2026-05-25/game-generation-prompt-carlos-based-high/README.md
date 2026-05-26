# Carlos: Simulation Wars

A complete playable JavaScript game demo based on the fictional Carlos universe:
a Spanish scientist with impossible strength, the defyn 2x000 ring, a cursed
notepad equation, collapsing simulation layers, and the red core entity Rickr.

The project is built as a stylized 2.5D canvas game so it runs without Unity,
npm packages, or external assets. It uses depth, parallax, glow, camera shake,
particles, animated geometry, glitch overlays, and WebAudio hooks to create the
feel of an indie sci-fi action demo.

## Game Design Overview

### Story Premise

Carlos discovers that physics is being managed by hidden systems inside a
simulation. After his house is swallowed by a black hole and the notepad
equation splits reality, he enters three layers of the collapsing simulation to
rewrite the physics nodes, survive hostile AI defenses, and destabilize Rickr.

### Core Loop

1. Explore each simulation layer.
2. Rewrite all physics nodes.
3. Fight or dodge simulation defenders.
4. Use the defyn 2x000 ring to blast enemies and damage Rickr.
5. Manage ring charge, glitch power, dashes, jumps, and time distortion.
6. Enter the portal once the layer is stable enough to leave.

### Playable Systems

- Smooth top-down movement with acceleration, friction, and camera follow.
- Carlos idle, run, dash, jump, combat, hurt, and glitch-form animations.
- Defyn ring pulse attack with directional targeting and enemy knockback.
- Time distortion that slows enemies, projectiles, and hazards.
- Glitch transformation that triggers when Carlos reaches full glitch power.
- Interactive physics nodes and zone portals.
- Enemy AI with pursuit, spacing, contact damage, and projectile attacks.
- Rickr boss encounter in the final layer.
- Particle bursts, energy trails, glow rings, screen glitching, and camera shake.
- Responsive HUD with health, ring charge, glitch form, objectives, and prompts.
- Synthesized UI and combat sound hooks through WebAudio.

## Levels

### Stable Simulation Zone

A clean, structured, cyan-lit grid layer. It introduces physics nodes, simple
hazards, sentinels, the portal objective, and Carlos' basic abilities.

### Corrupted Zone

A magenta and red broken-reality layer with jittering grid lines, more hazards,
faster enemies, floating shards, and more aggressive simulation behavior.

### Core System Layer

The final high-intensity red and gold system layer. Carlos must wake every core
node, survive projectile waves, break Rickr with ring pulses, and escape through
the last portal.

## Controls

- Move: `WASD` or arrow keys
- Dash: `Shift`
- Jump: `Space`
- Interact: `E` or `Enter`
- Ring pulse: `J` or left mouse button
- Time distortion: `Q`
- Aim ring pulse: mouse pointer

## Folder Structure

```text
carlos-simulation-wars/
  index.html          Main game shell and HUD
  package.json        Project metadata and optional start script
  README.md           Game design overview and run instructions
  server.js           Tiny static file server
  src/
    game.js           Complete game code, loop, rendering, AI, combat, levels
    styles.css        Fullscreen layout, HUD, title, ending, glow styling
```

## Run Instructions

### Option 1: Open Directly

Open `index.html` in a browser. The game does not require a build step.

### Option 2: Run Local Server

If you have Node.js on your PATH:

```bash
node server.js
```

Then open:

```text
http://127.0.0.1:5173
```

Inside this Codex workspace, the bundled Node runtime can run it with:

```powershell
& 'C:\Users\turtl\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

## Expansion Notes

- Add save checkpoints between layers.
- Replace procedural canvas sprites with hand-painted sprite sheets.
- Add more Carlos abilities, such as gravity inversion or notebook equations.
- Add NPC Earthians and army encounters as story beats.
- Turn Rickr into a multi-phase boss with shield nodes and arena hazards.
- Add a dialogue system for the notepad, facility workers, and system AI.
- Add controller support and remappable controls.
- Move level data into JSON files once the world gets larger.
- Add music stems that intensify by zone, node count, and boss health.
- Port the rendering layer to Three.js or Unity if full 3D assets become a goal.
