import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Zombie } from '../entities/Zombie';

export class ZombieSpawner {
  private scene: Phaser.Scene;
  private zombies: Phaser.Physics.Arcade.Group;
  private nextSpawnAt: number | null = null;
  private maxDistance = 0;

  constructor(scene: Phaser.Scene, zombies: Phaser.Physics.Arcade.Group) {
    this.scene = scene;
    this.zombies = zombies;
  }

  update(time: number, playerX: number): void {
    if (this.nextSpawnAt === null) {
      this.nextSpawnAt = time + GameConfig.spawner.graceMs;
    }

    this.maxDistance = Math.max(this.maxDistance, Math.abs(playerX));

    if (time < this.nextSpawnAt) return;

    this.spawn(playerX);

    const interval = Math.max(
      GameConfig.spawner.minIntervalMs,
      GameConfig.spawner.initialIntervalMs - this.maxDistance * GameConfig.spawner.intervalDecreasePerPixel
    );
    this.nextSpawnAt = time + interval;
  }

  private spawn(playerX: number): void {
    const side: 1 | -1 = Math.random() < 0.5 ? -1 : 1;
    const x = playerX + side * GameConfig.zombie.spawnMarginX;
    const speed = GameConfig.zombie.baseSpeed * (1 + this.maxDistance * GameConfig.spawner.speedRampPerPixel);
    const zombie = new Zombie(this.scene, x, GameConfig.world.groundY, speed, GameConfig.zombie.baseHealth);
    this.zombies.add(zombie);
  }
}
