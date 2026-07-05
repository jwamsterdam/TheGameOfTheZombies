import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Zombie } from '../entities/Zombie';

export class ZombieSpawner {
  private scene: Phaser.Scene;
  private zombies: Phaser.Physics.Arcade.Group;
  private level: number;
  private nextSpawnAt: number | null = null;

  constructor(scene: Phaser.Scene, zombies: Phaser.Physics.Arcade.Group, level: number) {
    this.scene = scene;
    this.zombies = zombies;
    this.level = level;
  }

  update(time: number): void {
    if (this.nextSpawnAt === null) {
      this.nextSpawnAt = time + GameConfig.spawner.graceMs;
    }
    if (time < this.nextSpawnAt) return;

    if (this.zombies.countActive(true) < GameConfig.zombie.maxAlive) {
      this.spawn();
    }

    const interval = Math.max(
      GameConfig.spawner.minIntervalMs,
      GameConfig.spawner.initialIntervalMs - (this.level - 1) * GameConfig.spawner.intervalDecreasePerLevel
    );
    this.nextSpawnAt = time + interval;
  }

  private get speed(): number {
    return GameConfig.zombie.baseSpeed + (this.level - 1) * GameConfig.spawner.speedIncreasePerLevel;
  }

  /** Spawnt een zombie ergens in het level: aan de randen op de grond, of vallend boven een platform. */
  private spawn(): void {
    const { levelWidth, groundY, levelHeight } = GameConfig.world;

    let x: number;
    let y: number;
    const roll = Math.random();
    if (roll < 0.5) {
      // Vanaf een van de zijkanten, op de grond, het level in lopend.
      x = Math.random() < 0.5 ? 40 : levelWidth - 40;
      y = groundY - 10;
    } else {
      // Ergens boven het level laten vallen -> landt op een platform of de grond.
      x = Phaser.Math.Between(80, levelWidth - 80);
      y = Phaser.Math.Between(60, levelHeight - 400);
    }

    const zombie = new Zombie(this.scene, x, y, this.speed, GameConfig.zombie.baseHealth);
    this.zombies.add(zombie);
  }
}
