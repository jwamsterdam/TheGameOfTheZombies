import Phaser from 'phaser';

const WALK_FRAME_INTERVAL_MS = 220;

export class Zombie extends Phaser.Physics.Arcade.Sprite {
  health: number;
  speed: number;
  private walkFrame: 0 | 1 = 0;
  private lastWalkFrameAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, speed: number, health: number) {
    super(scene, x, y, 'zombie_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setScale(0.5);
    this.speed = speed;
    this.health = health;
  }

  update(targetX: number, time: number): void {
    if (!this.active) return;
    const dir: 1 | -1 = targetX < this.x ? -1 : 1;
    this.setVelocityX(dir * this.speed);
    this.setFlipX(dir < 0);

    if (time - this.lastWalkFrameAt >= WALK_FRAME_INTERVAL_MS) {
      this.walkFrame = this.walkFrame === 0 ? 1 : 0;
      this.lastWalkFrameAt = time;
    }
    this.setTexture(this.walkFrame === 0 ? 'zombie_walk1' : 'zombie_walk2');
  }

  hit(damage: number): boolean {
    this.health -= damage;
    return this.health <= 0;
  }

  die(): void {
    this.destroy();
  }
}
