import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { WeaponDef, ProjectileKind } from '../config/Weapons';

export type ExplodeCallback = (x: number, y: number, radius: number, damage: number) => void;

export class ProjectilePool {
  private group: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: GameConfig.projectiles.poolSize,
      runChildUpdate: false,
    });
  }

  get physicsGroup(): Phaser.Physics.Arcade.Group {
    return this.group;
  }

  fire(weapon: WeaponDef, x: number, y: number, angle: number, time: number): void {
    const proj = this.group.get(x, y, weapon.texture) as Phaser.Physics.Arcade.Image | null;
    if (!proj) return;

    const shotAngle = weapon.spread > 0 ? angle + (Math.random() * 2 - 1) * weapon.spread : angle;

    const body = proj.body as Phaser.Physics.Arcade.Body;
    proj.setActive(true).setVisible(true);
    proj.setTexture(weapon.texture);
    body.enable = true;
    body.reset(x, y);
    body.setAllowGravity(true);
    body.setGravityY(weapon.gravityY);
    body.setVelocity(Math.cos(shotAngle) * weapon.speed, Math.sin(shotAngle) * weapon.speed);

    proj.setData('kind', weapon.kind);
    proj.setData('damage', weapon.damage);
    proj.setData('explodeRadius', weapon.explodeRadius);
    proj.setData('expiresAt', time + weapon.lifetimeMs);
    proj.setData('fuseAt', weapon.fuseMs > 0 ? time + weapon.fuseMs : 0);
    proj.setRotation(shotAngle);
  }

  update(time: number, groundY: number, onExplode: ExplodeCallback): void {
    this.group.children.each((child) => {
      const proj = child as Phaser.Physics.Arcade.Image;
      if (!proj.active) return true;

      const body = proj.body as Phaser.Physics.Arcade.Body;
      const kind = proj.getData('kind') as ProjectileKind;
      const fuseAt = proj.getData('fuseAt') as number;
      const expiresAt = proj.getData('expiresAt') as number;

      // Oriëntatie: raket wijst mee met de vlucht, granaat tolt.
      if (kind === 'rocket') {
        proj.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
      } else if (kind === 'grenade') {
        proj.rotation += 0.25;
      }

      // Granaat-lont afgelopen -> exploderen.
      if (fuseAt > 0 && time >= fuseAt) {
        this.explode(proj, onExplode);
        return true;
      }

      // Levensduur voorbij.
      if (time >= expiresAt) {
        if (kind === 'rocket') {
          this.explode(proj, onExplode);
        } else {
          this.deactivate(proj);
        }
        return true;
      }

      // Grond-interactie.
      if (proj.y >= groundY) {
        if (kind === 'grenade') {
          proj.y = groundY;
          if (body.velocity.y > 0) body.setVelocityY(body.velocity.y * -0.42);
          body.setVelocityX(body.velocity.x * 0.7);
          if (Math.abs(body.velocity.y) < 40) body.setVelocityY(0);
        } else if (kind === 'rocket') {
          this.explode(proj, onExplode);
        } else {
          this.deactivate(proj);
        }
      }

      return true;
    });
  }

  /** True wanneer een directe treffer op een zombie de zombie moet raken. Granaten negeren dit (wachten op lont). */
  onZombieHit(proj: Phaser.Physics.Arcade.Image, onExplode: ExplodeCallback): number {
    const kind = proj.getData('kind') as ProjectileKind;
    if (kind === 'grenade') return 0; // geen directe schade; explodeert pas via lont
    if (kind === 'rocket') {
      this.explode(proj, onExplode);
      return 0; // schade komt via de explosie (area damage)
    }
    // gewone kogel
    const damage = proj.getData('damage') as number;
    this.deactivate(proj);
    return damage;
  }

  private explode(proj: Phaser.Physics.Arcade.Image, onExplode: ExplodeCallback): void {
    const radius = proj.getData('explodeRadius') as number;
    const damage = proj.getData('damage') as number;
    onExplode(proj.x, proj.y, radius, damage);
    this.deactivate(proj);
  }

  deactivate(proj: Phaser.Physics.Arcade.Image): void {
    proj.setActive(false).setVisible(false);
    const body = proj.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.enable = false;
  }
}
