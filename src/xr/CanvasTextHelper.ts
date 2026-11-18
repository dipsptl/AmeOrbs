import * as THREE from 'three';

/**
 * Draws a crisp rounded pill or card onto a 2D canvas and updates a THREE.CanvasTexture.
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export class DynamicCanvasPanel {
  public readonly canvas: HTMLCanvasElement;
  public readonly ctx: CanvasRenderingContext2D;
  public readonly texture: THREE.CanvasTexture;
  public readonly mesh: THREE.Mesh;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly geo: THREE.PlaneGeometry;

  constructor(
    widthPx: number,
    heightPx: number,
    worldWidth: number,
    worldHeight: number,
    maxAnisotropy = 4
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = widthPx;
    this.canvas.height = heightPx;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = maxAnisotropy;

    this.geo = new THREE.PlaneGeometry(worldWidth, worldHeight);
    this.mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
  }

  public markUpdated(): void {
    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
    this.texture.dispose();
  }
}
