export type WeaponId = 'rifle' | 'rocket' | 'grenade' | 'machinegun' | 'flamethrower';

// 'bullet'  = rechte impact, geen explosie
// 'rocket'  = explodeert bij impact (zombie of grond)
// 'grenade' = explodeert na fuseMs (delay), stuitert op de grond
export type ProjectileKind = 'bullet' | 'rocket' | 'grenade';

export interface WeaponDef {
  id: WeaponId;
  name: string;
  kind: ProjectileKind;
  texture: string;
  bodyRadius: number;
  speed: number;
  damage: number;
  gravityY: number;
  fireRateMs: number;
  lifetimeMs: number;
  fuseMs: number; // alleen relevant voor 'grenade'
  explodeRadius: number; // 0 = geen explosie
  auto: boolean; // true = vuren zolang muisknop ingedrukt is
  spread: number; // hoek-spreiding in radialen (0 = geen spreiding)
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  rifle: {
    id: 'rifle',
    name: 'Geweer',
    kind: 'bullet',
    texture: 'proj_bullet',
    bodyRadius: 4,
    speed: 1000,
    damage: 34,
    gravityY: 1300,
    fireRateMs: 260,
    lifetimeMs: 2500,
    fuseMs: 0,
    explodeRadius: 0,
    auto: false,
    spread: 0,
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket Launcher',
    kind: 'rocket',
    texture: 'proj_rocket',
    bodyRadius: 7,
    speed: 720,
    damage: 90,
    gravityY: 850,
    fireRateMs: 850,
    lifetimeMs: 4000,
    fuseMs: 0,
    explodeRadius: 130,
    auto: false,
    spread: 0,
  },
  grenade: {
    id: 'grenade',
    name: 'Granaat',
    kind: 'grenade',
    texture: 'proj_grenade',
    bodyRadius: 6,
    speed: 620,
    damage: 100,
    gravityY: 1700,
    fireRateMs: 700,
    lifetimeMs: 5000,
    fuseMs: 1400,
    explodeRadius: 150,
    auto: false,
    spread: 0,
  },
  machinegun: {
    id: 'machinegun',
    name: 'Mitrailleur',
    kind: 'bullet',
    texture: 'proj_bullet',
    bodyRadius: 4,
    speed: 900,
    damage: 15,
    gravityY: 1300,
    fireRateMs: 85,
    lifetimeMs: 2000,
    fuseMs: 0,
    explodeRadius: 0,
    auto: true,
    spread: 0.05,
  },
  flamethrower: {
    id: 'flamethrower',
    name: 'Vlammenwerper',
    kind: 'bullet',
    texture: 'proj_flame',
    bodyRadius: 8,
    speed: 430,
    damage: 7,
    gravityY: 180,
    fireRateMs: 32,
    lifetimeMs: 260, // korte levensduur -> korte dracht (vlammenkegel dichtbij)
    fuseMs: 0,
    explodeRadius: 0,
    auto: true,
    spread: 0.22, // brede kegel
  },
};

// Volgorde bepaalt de toetsen: 1 = geweer, 2 = rocket, 3 = granaat, 4 = mitrailleur, 5 = vlammenwerper
export const WEAPON_ORDER: WeaponId[] = ['rifle', 'rocket', 'grenade', 'machinegun', 'flamethrower'];
