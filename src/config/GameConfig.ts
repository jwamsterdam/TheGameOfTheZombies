export const GameConfig = {
  world: {
    // Begrensd level: coördinaten van (0,0) linksboven tot (levelWidth, levelHeight).
    levelWidth: 2600,
    levelHeight: 1700,
    groundY: 1450, // hoogte van het grondoppervlak (onderin het level)
  },
  level: {
    // Procedureel klimpad naar de deur.
    topMargin: 240, // hoogte waarop de bovenste platform/deur ongeveer komt
    // Sprong-apex is ~264px; op grote verticale stappen is het horizontale bereik kleiner.
    // Deze grenzen houden elk volgend platform gegarandeerd binnen sprongbereik.
    verticalStep: { min: 140, max: 190 }, // verticale afstand tussen opeenvolgende platforms
    horizontalStep: { min: 90, max: 150 }, // horizontale verspringing (ruim binnen sprongbereik)
    platformTiles: { min: 3, max: 6 }, // breedte van een platform in tegels
    extraPlatforms: 6, // losse extra platforms voor variatie
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
    baseSpeed: 55,
    baseHealth: 50,
    gravityY: 1200,
    maxAlive: 34,
  },
  spawner: {
    graceMs: 2500,
    initialIntervalMs: 1600,
    minIntervalMs: 450,
    // Moeilijkheid per level: sneller spawnen en meer zombies.
    intervalDecreasePerLevel: 130,
    speedIncreasePerLevel: 6,
  },
} as const;
