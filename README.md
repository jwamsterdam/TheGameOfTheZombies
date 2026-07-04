# The Game of the Zombies

A 2D side-scrolling zombie shooter that runs in the browser, built with **TypeScript + Phaser 3** and **Vite**.

Walk through an endlessly, procedurally generated ruined city, aim with the mouse, and blast the zombie hordes that close in from both sides.

## Getting started

```bash
npm install
npm run dev
```

Then open the URL that Vite prints (default http://localhost:5173).

## Controls

| Input | Action |
| --- | --- |
| `A` / `D` or `←` / `→` | Move left / right |
| `W` or `↑` | Jump |
| Mouse | Aim (360°) |
| Mouse button | Shoot |
| `1` – `5` | Switch weapon |

Weapons: **1** Rifle · **2** Rocket Launcher · **3** Grenade (fused) · **4** Machine Gun · **5** Flamethrower.
Projectiles are affected by gravity, so you have to lead and arc your shots.

## Project structure

```
src/
├── main.ts                 # Phaser game config + bootstrap
├── scenes/GameScene.ts     # main gameplay scene, HUD, collisions, background
├── entities/               # Player, Zombie, Projectile pool
├── systems/                # ZombieSpawner, WorldGenerator (endless chunks)
└── config/                 # GameConfig constants + Weapons definitions
```

## Credits

Character sprites from the CC0 "Platformer Characters" pack by [Kenney](https://kenney.nl).
