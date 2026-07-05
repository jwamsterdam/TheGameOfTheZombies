import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { ProjectilePool } from '../entities/Projectile';
import { ZombieSpawner } from '../systems/ZombieSpawner';
import { LevelGenerator } from '../systems/LevelGenerator';

export class GameScene extends Phaser.Scene {
  private level = 1;
  private player!: Player;
  private zombies!: Phaser.Physics.Arcade.Group;
  private projectiles!: ProjectilePool;
  private spawner!: ZombieSpawner;
  private levelGen!: LevelGenerator;
  private door!: Phaser.Physics.Arcade.Image;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private weaponText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private sky!: Phaser.GameObjects.Image;
  private skyline!: Phaser.GameObjects.TileSprite;
  private pointerWasDown = false;
  private isGameOver = false;
  private isComplete = false;

  constructor() {
    super('GameScene');
  }

  init(data: { level?: number }): void {
    this.level = data.level ?? 1;
    this.isGameOver = false;
    this.isComplete = false;
    this.pointerWasDown = false;
  }

  preload(): void {
    this.load.image('player_idle', 'assets/sprites/player_idle.png');
    this.load.image('player_walk1', 'assets/sprites/player_walk1.png');
    this.load.image('player_walk2', 'assets/sprites/player_walk2.png');
    this.load.image('zombie_idle', 'assets/sprites/zombie_idle.png');
    this.load.image('zombie_walk1', 'assets/sprites/zombie_walk1.png');
    this.load.image('zombie_walk2', 'assets/sprites/zombie_walk2.png');
  }

  create(): void {
    this.generateTextures();

    const { levelWidth, levelHeight } = GameConfig.world;

    // Achtergrond: schermvaste lucht + wereld-gebonden skyline met parallax.
    this.sky = this.add.image(0, 0, 'sky').setOrigin(0, 0).setScrollFactor(0).setDepth(-110);
    this.skyline = this.add
      .tileSprite(0, GameConfig.world.groundY, this.scale.width, 260, 'skylineStrip')
      .setOrigin(0, 1)
      .setDepth(-100);

    // Procedureel level: grond, klimpad van platforms, deur bovenaan.
    this.levelGen = new LevelGenerator(this);
    const generated = this.levelGen.generate(this.level);
    this.door = generated.door;

    this.player = new Player(this, generated.spawnX, generated.spawnY);
    this.zombies = this.physics.add.group();
    this.projectiles = new ProjectilePool(this);
    this.spawner = new ZombieSpawner(this, this.zombies, this.level);

    // Botsingen: grond is massief, platforms zijn one-way (van onderaf erdoorheen).
    this.physics.add.collider(this.player, generated.ground);
    this.physics.add.collider(this.zombies, generated.ground);
    this.physics.add.collider(this.player, generated.platforms, undefined, this.oneWay, this);
    this.physics.add.collider(this.zombies, generated.platforms, undefined, this.oneWay, this);

    this.physics.add.overlap(
      this.projectiles.physicsGroup,
      this.zombies,
      this.handleProjectileHitsZombie as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.zombies,
      this.handleZombieHitsPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
    this.physics.add.overlap(this.player, this.door, this.completeLevel, undefined, this);

    // Camera volgt de speler in beide richtingen, geclampt op de level-grenzen.
    this.cameras.main.setBounds(0, 0, levelWidth, levelHeight);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.centerOn(this.player.x, this.player.y);

    this.updateBackground();
    this.createHud();
  }

  /**
   * One-way platform: alleen botsen als het bewegende object van bovenaf (dalend)
   * op de bovenkant landt. Volgorde-onafhankelijk, want Phaser wisselt de argumenten
   * om bij groep-vs-array botsingen. Null-veilig tegen net vernietigde bodies.
   */
  private oneWay(
    objA:
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
      | Phaser.Types.Physics.Arcade.GameObjectWithBody,
    objB:
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
  ): boolean {
    const ba = (objA as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as
      | (Phaser.Physics.Arcade.Body & { prev?: Phaser.Math.Vector2 })
      | undefined;
    const bb = (objB as Phaser.Types.Physics.Arcade.GameObjectWithBody).body as
      | (Phaser.Physics.Arcade.Body & { prev?: Phaser.Math.Vector2 })
      | undefined;
    if (!ba || !bb) return false;

    // De dynamische (bewegende) body heeft een 'prev'-positie; het platform is statisch.
    const mover = ba.prev ? ba : bb;
    const platform = ba.prev ? bb : ba;
    if (!mover.prev) return false;

    const prevBottom = mover.prev.y + mover.height;
    return mover.velocity.y >= 0 && prevBottom <= platform.top + 8;
  }

  private generateTextures(): void {
    if (this.textures.exists('groundChunk')) return;
    const g = this.add.graphics();

    g.fillStyle(0xffe082, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('proj_bullet', 8, 8);
    g.clear();

    // raket: langwerpig met oranje punt
    g.fillStyle(0x9e9e9e, 1);
    g.fillRect(0, 3, 16, 6);
    g.fillStyle(0xff5722, 1);
    g.fillRect(14, 2, 6, 8);
    g.generateTexture('proj_rocket', 22, 12);
    g.clear();

    // granaat: donkergroen bolletje met lont
    g.fillStyle(0x2e4d2e, 1);
    g.fillCircle(6, 7, 6);
    g.fillStyle(0x6d4c41, 1);
    g.fillRect(5, 0, 2, 3);
    g.generateTexture('proj_grenade', 12, 14);
    g.clear();

    // vlam: warme kern met zachtere buitenrand
    g.fillStyle(0xff6d00, 0.85);
    g.fillCircle(9, 9, 9);
    g.fillStyle(0xffca28, 0.95);
    g.fillCircle(9, 9, 5);
    g.generateTexture('proj_flame', 18, 18);
    g.clear();

    this.generateGunTextures(g);

    // grond: bovenste 40px is de looplaag, daaronder donkere aarde
    const cw = 400;
    const groundH = 1000;
    g.fillStyle(0x3b2a20, 1);
    g.fillRect(0, 0, cw, groundH);
    g.fillStyle(0x5d4037, 1);
    g.fillRect(0, 0, cw, 40);
    g.fillStyle(0x6d4c41, 1);
    for (let i = 0; i < cw; i += 40) {
      g.fillRect(i + 2, 2, 36, 36);
    }
    g.generateTexture('groundChunk', cw, groundH);
    g.clear();

    // platform-tegel (40x28), horizontaal getegeld tot een platform
    g.fillStyle(0x6d4c41, 1);
    g.fillRect(0, 0, 40, 28);
    g.fillStyle(0x7a5a48, 1);
    g.fillRect(2, 2, 17, 11);
    g.fillRect(21, 2, 17, 11);
    g.fillRect(2, 15, 17, 11);
    g.fillRect(21, 15, 17, 11);
    g.generateTexture('platformTile', 40, 28);
    g.clear();

    // deur: houten uitgang met groen "EXIT"-randje en gouden knop
    g.fillStyle(0x2e2116, 1);
    g.fillRect(0, 0, 48, 74);
    g.fillStyle(0x5a3d24, 1);
    g.fillRect(4, 6, 40, 68);
    g.fillStyle(0x3a2817, 1);
    g.fillRect(9, 12, 13, 26);
    g.fillRect(26, 12, 13, 26);
    g.fillRect(9, 42, 13, 26);
    g.fillRect(26, 42, 13, 26);
    g.fillStyle(0xffd54a, 1);
    g.fillCircle(37, 40, 3);
    g.fillStyle(0x00e676, 1);
    g.fillRect(4, 0, 40, 6);
    g.generateTexture('door', 48, 74);
    g.clear();

    // lucht: schemergradient
    const skyW = 960;
    const skyH = 600;
    g.fillGradientStyle(0x140a24, 0x140a24, 0x5c3a52, 0xc97a4a, 1);
    g.fillRect(0, 0, skyW, skyH);
    g.generateTexture('sky', skyW, skyH);
    g.clear();

    // skyline-strook: gebouw-silhouetten met de onderkant op de onderrand
    const stripW = 900;
    const stripH = 260;
    let seed = 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    let bx = 0;
    while (bx < stripW) {
      const bw = 45 + Math.floor(rand() * 55);
      const bh = 90 + Math.floor(rand() * 150);
      g.fillStyle(rand() < 0.5 ? 0x1a1420 : 0x241a2e, 1);
      g.fillRect(bx, stripH - bh, bw, bh);
      g.fillStyle(0xffcc66, 0.5);
      for (let wy = stripH - bh + 10; wy < stripH - 8; wy += 22) {
        for (let wx = bx + 6; wx < bx + bw - 6; wx += 16) {
          if (rand() < 0.25) g.fillRect(wx, wy, 5, 7);
        }
      }
      bx += bw + 8;
    }
    g.generateTexture('skylineStrip', stripW, stripH);

    g.destroy();
  }

  /** Genereert per wapen een sprite dat de speler in de hand houdt (loop wijst naar rechts). */
  private generateGunTextures(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x6d4c41, 1);
    g.fillRect(0, 2, 12, 10);
    g.fillStyle(0x2b2b2b, 1);
    g.fillRect(8, 3, 32, 6);
    g.fillStyle(0x111111, 1);
    g.fillRect(40, 4, 8, 4);
    g.generateTexture('gun_rifle', 48, 12);
    g.clear();

    g.fillStyle(0x37474f, 1);
    g.fillRect(0, 3, 8, 12);
    g.fillStyle(0x5d6d5d, 1);
    g.fillRect(2, 4, 44, 10);
    g.fillStyle(0xff5722, 1);
    g.fillRect(44, 2, 8, 14);
    g.generateTexture('gun_rocket', 52, 18);
    g.clear();

    g.fillStyle(0xe8b48c, 1);
    g.fillRect(0, 5, 20, 7);
    g.fillCircle(20, 9, 5);
    g.fillStyle(0x2e4d2e, 1);
    g.fillCircle(26, 9, 5);
    g.generateTexture('gun_grenade', 30, 16);
    g.clear();

    g.fillStyle(0x2b2b2b, 1);
    g.fillRect(0, 5, 8, 7);
    g.fillStyle(0x1c1c1c, 1);
    g.fillRect(6, 4, 32, 7);
    g.fillStyle(0x333333, 1);
    g.fillRect(18, 11, 8, 5);
    g.fillStyle(0x111111, 1);
    g.fillRect(38, 6, 8, 3);
    g.generateTexture('gun_machinegun', 46, 16);
    g.clear();

    g.fillStyle(0x37474f, 1);
    g.fillRect(2, 3, 32, 10);
    g.fillStyle(0x546e7a, 1);
    g.fillRect(34, 6, 6, 4);
    g.fillStyle(0xd32f2f, 1);
    g.fillRect(40, 5, 6, 6);
    g.fillStyle(0xffca28, 1);
    g.fillCircle(46, 8, 3);
    g.generateTexture('gun_flamethrower', 50, 16);
    g.clear();
  }

  private createHud(): void {
    this.add.rectangle(16, 16, 204, 20, 0x333333).setScrollFactor(0).setOrigin(0, 0);
    this.healthBar = this.add.rectangle(18, 18, 200, 16, 0xe53935).setScrollFactor(0).setOrigin(0, 0);
    this.weaponText = this.add.text(16, 44, '', { fontSize: '18px', color: '#ffd54a' }).setScrollFactor(0);
    this.levelText = this.add
      .text(16, 70, '', { fontSize: '15px', color: '#80d8ff' })
      .setScrollFactor(0);
    this.add
      .text(16, 92, '1 Geweer  2 Rocket  3 Granaat  4 Mitrailleur  5 Vlammenwerper', {
        fontSize: '13px',
        color: '#bbbbbb',
      })
      .setScrollFactor(0);
  }

  private updateBackground(): void {
    const cam = this.cameras.main;
    this.sky.setDisplaySize(cam.width, cam.height);
    this.skyline.width = cam.width;
    this.skyline.x = cam.scrollX;
    this.skyline.tilePositionX = cam.scrollX * 0.5;
  }

  update(time: number): void {
    if (this.isGameOver || this.isComplete) return;

    const pointer = this.input.activePointer;

    this.player.update(time);
    this.player.aimAt(pointer.worldX, pointer.worldY);
    this.updateBackground();
    this.spawner.update(time);
    this.projectiles.update(time, GameConfig.world.groundY, this.explode.bind(this));

    this.handleShooting(time, pointer);

    this.zombies.children.each((child) => {
      const zombie = child as Zombie;
      if (zombie.active) {
        zombie.update(this.player.x, time);
        if (zombie.y > GameConfig.world.levelHeight + 200) {
          zombie.destroy();
        }
      }
      return true;
    });

    this.healthBar.width = 200 * (this.player.health / GameConfig.player.maxHealth);
    this.weaponText.setText(this.player.currentWeapon.name);
    this.levelText.setText(`Level ${this.level}  —  bereik het deurtje`);

    if (this.player.isDead()) {
      this.handleGameOver();
    }
  }

  private handleShooting(time: number, pointer: Phaser.Input.Pointer): void {
    const weapon = this.player.currentWeapon;
    const justDown = pointer.isDown && !this.pointerWasDown;
    this.pointerWasDown = pointer.isDown;

    const wantsToFire = weapon.auto ? pointer.isDown : justDown;
    if (!wantsToFire || !this.player.tryFire(time)) return;

    this.projectiles.fire(weapon, this.player.getMuzzleX(), this.player.getMuzzleY(), this.player.aimAngle, time);
  }

  private handleProjectileHitsZombie(
    projObj: Phaser.GameObjects.GameObject,
    zombieObj: Phaser.GameObjects.GameObject
  ): void {
    const proj = projObj as Phaser.Physics.Arcade.Image;
    const zombie = zombieObj as Zombie;
    if (!proj.active || !zombie.active) return;

    const damage = this.projectiles.onZombieHit(proj, this.explode.bind(this));
    if (damage > 0 && zombie.hit(damage)) {
      zombie.die();
    }
  }

  private explode(x: number, y: number, radius: number, damage: number): void {
    if (radius <= 0) return;

    this.zombies.children.each((child) => {
      const zombie = child as Zombie;
      if (zombie.active && Phaser.Math.Distance.Between(x, y, zombie.x, zombie.y) <= radius) {
        if (zombie.hit(damage)) zombie.die();
      }
      return true;
    });

    const blast = this.add.circle(x, y, radius, 0xff9800, 0.55).setScale(0.3).setDepth(50);
    this.tweens.add({
      targets: blast,
      scale: 1,
      alpha: 0,
      duration: 300,
      onComplete: () => blast.destroy(),
    });
  }

  private handleZombieHitsPlayer(
    _playerObj: Phaser.GameObjects.GameObject,
    zombieObj: Phaser.GameObjects.GameObject
  ): void {
    const zombie = zombieObj as Zombie;
    if (!zombie.active) return;
    const time = this.time.now;
    if (this.player.canTakeDamageAt(time)) {
      this.player.takeDamage(GameConfig.player.contactDamage, time);
    }
  }

  private completeLevel(): void {
    if (this.isComplete || this.isGameOver) return;
    this.isComplete = true;

    this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, `LEVEL ${this.level} VOLTOOID!`, {
        fontSize: '34px',
        color: '#00e676',
        align: 'center',
      })
      .setScrollFactor(0)
      .setOrigin(0.5);

    this.time.delayedCall(1200, () => this.scene.restart({ level: this.level + 1 }));
  }

  private handleGameOver(): void {
    this.isGameOver = true;
    this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'GAME OVER\nKlik om opnieuw te starten', {
        fontSize: '32px',
        color: '#ffffff',
        align: 'center',
      })
      .setScrollFactor(0)
      .setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.restart({ level: this.level }));
  }
}
