export const GameConfig = {
  world: {
    groundY: 500,
    chunkWidth: 400,
    chunksAhead: 4,
    chunksBehindToKeep: 2,
  },
  player: {
    moveSpeed: 220,
    jumpSpeed: 920,
    gravityY: 1600,
    maxHealth: 100,
    contactDamage: 10,
    contactDamageIntervalMs: 500,
  },
  projectiles: {
    poolSize: 80,
  },
  zombie: {
    baseSpeed: 60,
    baseHealth: 50,
    spawnMarginX: 500,
  },
  spawner: {
    graceMs: 3000,
    initialIntervalMs: 1800,
    minIntervalMs: 500,
    intervalDecreasePerPixel: 0.15,
    speedRampPerPixel: 0.0004,
  },
} as const;
