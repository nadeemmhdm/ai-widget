# Character packs — Phase 2

Phase 2 ships four fully functional procedural 3D characters so the project runs without downloading proprietary or third-party models:

- Bear
- Panda
- Snake
- Moose

They share the logical animation contract in `src/pet/core/animationContract.ts`.

## Artist-authored GLB drop-in contract

A future Blender/artist model can replace any procedural character without changing the AI/tool layer. Put the optimized model in the matching folder:

```text
assets/characters/bear/bear.glb
assets/characters/panda/panda.glb
assets/characters/snake/snake.glb
assets/characters/moose/moose.glb
```

Recommended clips/aliases:

```text
Idle
Walk / Slither / Trot
Dance
Hurt
Angry
Sleep
Happy
Eat
Play
Wave
Surprised
```

Recommended desktop target per character: <= 5 MB compressed GLB, <= 35k triangles, one atlas where practical, 1K textures, no unnecessary lights/cameras in the exported file.

The procedural models remain the guaranteed fallback and development models.
