import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Player } from '../entities/Player';
import { Zombie } from '../entities/Zombie';
import { ProjectilePool } from '../entities/Projectile';
import { ZombieSpawner } from '../systems/ZombieSpawner';
import { WorldGenerator } from '../systems/WorldGenerator';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private zombies!: Phaser.Physics.Arcade.Group;
  private projectiles!: ProjectilePool;
  private spawner!: ZombieSpawner;
  private worldGenerator!: WorldGenerator;
  private healthBar!: Phaser.GameObjects.Rectangle;
  private weaponText!: Phaser.GameObjects.Text;
  private skyline!: Phaser.GameObjects.TileSprite;
  private pointerWasDown = false;
  private isGameOver = false;

  constructor() {
    super('GameScene');
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
    this.isGameOver = false;
    this.pointerWasDown = false;
    this.generateTextures();

    // Lucht: schermvast, vult de hele viewport.
    this.add
      .image(0, 0, 'sky')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-110)
      .setDisplaySize(this.scale.width, this.scale.height);

    // Skyline: wereld-gebonden strook waarvan de onderkant precies op groundY staat,
    // met horizontale parallax (zie updateBackground()).
    this.skyline = this.add
      .tileSprite(0, GameConfig.world.groundY, this.scale.width, 260, 'skylineStrip')
      .setOrigin(0, 1)
      .setDepth(-100);

    this.player = new Player(this, 0, GameConfig.world.groundY);

    // Onzichtbare, zeer brede statische vloer: bovenkant op groundY.
    const floor = this.add.rectangle(0, GameConfig.world.groundY + 500, 8_000_000, 1000, 0x000000, 0);
    this.physics.add.existing(floor, true);
    this.physics.add.collider(this.player, floor);

    this.worldGenerator = new WorldGenerator(this);
    this.worldGenerator.update(this.player.x);

    this.zombies = this.physics.add.group();
    this.projectiles = new ProjectilePool(this);
    this.spawner = new ZombieSpawner(this, this.zombies);

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

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(120, 600);

    this.createHud();
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

    // grond: bovenste 40px is de looplaag, daaronder donkere aarde die doorloopt tot onder beeld
    const cw = GameConfig.world.chunkWidth;
    const groundH = 300;
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

    // lucht: schemergradient over de hele viewport
    const skyW = 960;
    const skyH = 600;
    g.fillGradientStyle(0x140a24, 0x140a24, 0x5c3a52, 0xc97a4a, 1);
    g.fillRect(0, 0, skyW, skyH);
    g.generateTexture('sky', skyW, skyH);
    g.clear();

    // skyline-strook: silhouetten van gebouwen met hun onderkant exact op de onderrand,
    // transparant erboven -> wordt met onderkant op groundY geplaatst.
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
      // een paar verlichte raampjes
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

  private createHud(): void {
    this.add.rectangle(16, 16, 204, 20, 0x333333).setScrollFactor(0).setOrigin(0, 0);
    this.healthBar = this.add.rectangle(18, 18, 200, 16, 0xe53935).setScrollFactor(0).setOrigin(0, 0);
    this.weaponText = this.add
      .text(16, 44, '', { fontSize: '18px', color: '#ffd54a' })
      .setScrollFactor(0);
    this.add
      .text(16, 70, '1 Geweer  2 Rocket  3 Granaat  4 Mitrailleur  5 Vlammenwerper', {
        fontSize: '13px',
        color: '#bbbbbb',
      })
      .setScrollFactor(0);
  }

  private updateBackground(): void {
    // Volg de camera horizontaal, verticaal vast op groundY. tilePositionX geeft parallax.
    const scrollX = this.cameras.main.scrollX;
    this.skyline.x = scrollX;
    this.skyline.tilePositionX = scrollX * 0.5;
  }

  update(time: number): void {
    if (this.isGameOver) return;

    const pointer = this.input.activePointer;

    this.player.update(time);
    this.player.faceTowards(pointer.worldX);
    this.updateBackground();
    this.worldGenerator.update(this.player.x);
    this.spawner.update(time, this.player.x);
    this.projectiles.update(time, GameConfig.world.groundY, this.explode.bind(this));

    this.handleShooting(time, pointer);

    this.zombies.children.each((child) => {
      const zombie = child as Zombie;
      if (zombie.active) {
        zombie.update(this.player.x, time);
        if (Math.abs(zombie.x - this.player.x) > GameConfig.zombie.spawnMarginX * 2) {
          zombie.destroy();
        }
      }
      return true;
    });

    this.healthBar.width = 200 * (this.player.health / GameConfig.player.maxHealth);
    this.weaponText.setText(this.player.currentWeapon.name);

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

    const mx = this.player.getMuzzleX();
    const my = this.player.getMuzzleY();
    const angle = Math.atan2(pointer.worldY - my, pointer.worldX - mx);
    this.projectiles.fire(weapon, mx, my, angle, time);
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

    this.input.once('pointerdown', () => {
      this.scene.restart();
    });
  }
}
