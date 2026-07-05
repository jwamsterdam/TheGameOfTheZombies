import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

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
    this.configureBody();
  }

  /**
   * Zet de hitbox strak rond het zichtbare poppetje (het 80x110-frame heeft transparante
   * marges) en (her)activeert de zwaartekracht. Moet ook ná group.add() aangeroepen worden,
   * want dat reset de per-body instellingen.
   */
  configureBody(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Bron-frame is 80x110; personage vult ~x[13..67], y[19..109].
    body.setSize(46, 88);
    body.setOffset(17, 22);
    body.setAllowGravity(true);
    body.setGravityY(GameConfig.zombie.gravityY);
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
