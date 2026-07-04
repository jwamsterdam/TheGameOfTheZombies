import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class WorldGenerator {
  private scene: Phaser.Scene;
  private chunks = new Map<number, Phaser.GameObjects.Image>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(playerX: number): void {
    const { chunkWidth, chunksAhead, chunksBehindToKeep } = GameConfig.world;
    const centerIndex = Math.floor(playerX / chunkWidth);

    for (let i = centerIndex - 1; i <= centerIndex + chunksAhead; i++) {
      this.ensureChunk(i);
    }

    for (const [index, chunk] of this.chunks) {
      if (index < centerIndex - chunksBehindToKeep || index > centerIndex + chunksAhead + 1) {
        chunk.destroy();
        this.chunks.delete(index);
      }
    }
  }

  private ensureChunk(index: number): void {
    if (this.chunks.has(index)) return;
    const x = index * GameConfig.world.chunkWidth;
    const image = this.scene.add.image(x, GameConfig.world.groundY, 'groundChunk').setOrigin(0, 0);
    this.chunks.set(index, image);
  }
}
