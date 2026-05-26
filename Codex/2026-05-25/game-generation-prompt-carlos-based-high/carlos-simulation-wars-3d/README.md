# Carlos: Simulation Wars 3D

This is a separate Three.js project from the earlier canvas version. It keeps the
same Carlos universe but upgrades the demo into a real 3D scene with perspective
camera movement, fog, lighting, animated meshes, floating broken geometry,
particles, enemies, physics nodes, portals, time distortion, glitch form, and a
Rickr core encounter.

## Run

This project loads Three.js from a CDN, so the browser needs internet access the
first time it runs.

PowerShell:

```powershell
& 'C:\Users\turtl\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\turtl\Documents\Codex\2026-05-25\game-generation-prompt-carlos-based-high\carlos-simulation-wars-3d\server.js'
```

Command Prompt:

```cmd
"C:\Users\turtl\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "C:\Users\turtl\Documents\Codex\2026-05-25\game-generation-prompt-carlos-based-high\carlos-simulation-wars-3d\server.js"
```

Then open:

```text
http://127.0.0.1:5175
```

## Controls

- Move: `WASD` or arrow keys
- Dash: `Shift`
- Jump: `Space`
- Interact: `E` or `Enter`
- Defyn ring pulse: `J` or left mouse button
- Time distortion: `Q`
- Aim: mouse position on the ground

## Files

```text
carlos-simulation-wars-3d/
  index.html
  package.json
  README.md
  server.js
  src/
    main.js
    styles.css
```

## Expand Later

- Add imported GLB character and enemy models.
- Add proper skeletal animations for Carlos.
- Add post-processing bloom and chromatic aberration.
- Add multi-phase Rickr attacks.
- Add checkpoints and story dialogue.
- Add controller support.
