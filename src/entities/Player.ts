import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { WeaponDef, WEAPONS, WEAPON_ORDER } from '../config/Weapons';

const WALK_FRAME_INTERVAL_MS = 150;

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: 1 | -1 = 1;
  grounded = true;
  health: number;
  private weaponIndex = 0;
  private lastDamageAt = -Infinity;
  private lastFireAt = -Infinity;
  private walkFrame: 0 | 1 = 0;
  private lastWalkFrameAt = 0;
  private jumpWasDown = false;
  private weaponWasDown = [false, false, false, false, false];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private keyW: Phaser.Input.Keyboard.Key;
  private weaponKeys: Phaser.Input.Keyboard.Key[];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(false);
    this.setOrigin(0.5, 1);
    this.setScale(0.55);
    this.health = GameConfig.player.maxHealth;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setGravityY(GameConfig.player.gravityY);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.weaponKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
    ];
  }

  get currentWeapon(): WeaponDef {
    return WEAPONS[WEAPON_ORDER[this.weaponIndex]];
  }

  update(time: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors.left?.isDown || this.keyA.isDown;
    const right = this.cursors.right?.isDown || this.keyD.isDown;
    const moving = left !== right;

    if (left && !right) {
      this.setVelocityX(-GameConfig.player.moveSpeed);
    } else if (right && !left) {
      this.setVelocityX(GameConfig.player.moveSpeed);
    } else {
      this.setVelocityX(0);
    }

    // Grond-status komt van de Arcade-collider met de vloer.
    this.grounded = body.blocked.down || body.touching.down;

    // Springen met W of pijl-omhoog (edge-detectie op de vorige frame-status).
    const jumpDown = this.keyW.isDown || (this.cursors.up?.isDown ?? false);
    if (jumpDown && !this.jumpWasDown && this.grounded) {
      body.setVelocityY(-GameConfig.player.jumpSpeed);
    }
    this.jumpWasDown = jumpDown;

    // Wapen wisselen met 1..4 (edge-detectie).
    for (let i = 0; i < this.weaponKeys.length; i++) {
      const down = this.weaponKeys[i].isDown;
      if (down && !this.weaponWasDown[i]) {
        this.weaponIndex = i;
      }
      this.weaponWasDown[i] = down;
    }

    // Animatieframe.
    if (!this.grounded) {
      this.setTexture('player_walk2');
    } else if (moving) {
      if (time - this.lastWalkFrameAt >= WALK_FRAME_INTERVAL_MS) {
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
        this.lastWalkFrameAt = time;
      }
      this.setTexture(this.walkFrame === 0 ? 'player_walk1' : 'player_walk2');
    } else {
      this.setTexture('player_idle');
    }
  }

  /** Laat de speler naar de muis/richtpunt kijken. */
  faceTowards(worldX: number): void {
    this.facing = worldX < this.x ? -1 : 1;
    this.setFlipX(this.facing < 0);
  }

  /** Positie waar projectielen vertrekken (ongeveer op borsthoogte). */
  getMuzzleX(): number {
    return this.x;
  }

  getMuzzleY(): number {
    return this.y - this.displayHeight * 0.6;
  }

  tryFire(time: number): boolean {
    if (time - this.lastFireAt < this.currentWeapon.fireRateMs) return false;
    this.lastFireAt = time;
    return true;
  }

  canTakeDamageAt(time: number): boolean {
    return time - this.lastDamageAt >= GameConfig.player.contactDamageIntervalMs;
  }

  takeDamage(amount: number, time: number): void {
    this.lastDamageAt = time;
    this.health = Math.max(0, this.health - amount);
  }

  isDead(): boolean {
    return this.health <= 0;
  }
}
