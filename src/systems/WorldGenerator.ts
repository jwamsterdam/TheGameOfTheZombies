import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class WorldGenerator {
  private scene: Phaser.Scene;
  private chunks = new Map<number, Phaser.GameObjects.Image>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Genereert grond-chunks die het volledige zichtbare camerabereik dekken (plus marge). */
  update(viewLeft: number, viewRight: number): void {
    const { chunkWidth } = GameConfig.world;
    const first = Math.floor((viewLeft - chunkWidth) / chunkWidth);
    const last = Math.floor((viewRight + chunkWidth) / chunkWidth);

    for (let i = first; i <= last; i++) {
      this.ensureChunk(i);
    }

    for (const [index, chunk] of this.chunks) {
      if (index < first - 1 || index > last + 1) {
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
