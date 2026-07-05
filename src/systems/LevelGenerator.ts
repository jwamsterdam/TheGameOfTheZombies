import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

const TILE = 40; // breedte van één platform-tegel
const PLATFORM_H = 28;

export interface GeneratedLevel {
  platforms: Phaser.GameObjects.GameObject[];
  door: Phaser.Physics.Arcade.Image;
  ground: Phaser.GameObjects.GameObject;
  spawnX: number;
  spawnY: number;
}

/** Eenvoudige, deterministische RNG zodat een level-nummer altijd dezelfde layout geeft. */
function makeRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class LevelGenerator {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  generate(level: number): GeneratedLevel {
    const { levelWidth, levelHeight, groundY } = GameConfig.world;
    const cfg = GameConfig.level;
    const rng = makeRng(level * 7919 + 1);
    const between = (a: number, b: number) => a + rng() * (b - a);

    // Grond over de volle breedte.
    const ground = this.scene.add
      .tileSprite(0, groundY, levelWidth, levelHeight - groundY + 60, 'groundChunk')
      .setOrigin(0, 0)
      .setDepth(-10);
    this.scene.physics.add.existing(ground, true);

    const platforms: Phaser.GameObjects.GameObject[] = [];

    const addPlatform = (leftX: number, topY: number, tiles: number): Phaser.GameObjects.TileSprite => {
      const width = tiles * TILE;
      const clampedX = Phaser.Math.Clamp(leftX, 40, levelWidth - width - 40);
      const plat = this.scene.add
        .tileSprite(clampedX, topY, width, PLATFORM_H, 'platformTile')
        .setOrigin(0, 0)
        .setDepth(-1);
      this.scene.physics.add.existing(plat, true);
      platforms.push(plat);
      return plat;
    };

    // Klimpad: van net boven de grond zigzaggend omhoog tot bij de bovenkant.
    let x = between(200, 500);
    let y = groundY - between(cfg.verticalStep.min, cfg.verticalStep.max);
    let topPlatform = addPlatform(x, y, 5);

    while (y > cfg.topMargin + 60) {
      const tiles = Math.round(between(cfg.platformTiles.min, cfg.platformTiles.max));
      const dir = rng() < 0.5 ? -1 : 1;
      x += dir * between(cfg.horizontalStep.min, cfg.horizontalStep.max);
      x = Phaser.Math.Clamp(x, 60, levelWidth - tiles * TILE - 60);
      y -= between(cfg.verticalStep.min, cfg.verticalStep.max);
      topPlatform = addPlatform(x, y, tiles);
    }

    // Wat losse extra platforms voor variatie (niet nodig voor het pad).
    for (let i = 0; i < cfg.extraPlatforms; i++) {
      const tiles = Math.round(between(cfg.platformTiles.min, cfg.platformTiles.max));
      const px = between(80, levelWidth - tiles * TILE - 80);
      const py = between(cfg.topMargin + 40, groundY - 120);
      addPlatform(px, py, tiles);
    }

    // Deur bovenop het hoogste platform.
    const topBody = topPlatform.body as Phaser.Physics.Arcade.StaticBody;
    const doorX = topBody.x + topBody.width / 2;
    const doorY = topBody.y; // onderkant van de deur op het platform
    const door = this.scene.physics.add.staticImage(doorX, doorY, 'door').setOrigin(0.5, 1).setDepth(0);
    (door.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    return {
      platforms,
      door,
      ground,
      spawnX: 150,
      spawnY: groundY - 20,
    };
  }
}
