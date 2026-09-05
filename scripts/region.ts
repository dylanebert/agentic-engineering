import type { DecodedPng } from "./png";

// Four times the conservative 3-level sRGB JND used by the PNG instrument.
const CONTRAST = 4 * 3;
const PERIMETER = 4;

export interface Region {
  pass: boolean;
  failures: string[];
  background: [number, number, number];
  pixels: number;
  bounds: { x: number; y: number; width: number; height: number } | null;
  rows: number;
  columns: number;
  perimeter: { pixels: number; outliers: number; fraction: number };
}

/**
 * Classify a bounded contrasting RGB region, not cube identity or treatment.
 * Alpha is not composited: supply decoded screenshot pixels, not an uncomposited texture.
 * Bounds are canvas-relative, never fitted to a captured or repaired cube.
 */
export function classifyRegion({ width, height, data }: DecodedPng): Region {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 || !Number.isSafeInteger(width * height * 4) ||
      data.length !== width * height * 4) {
    throw new Error("region: expected positive integer dimensions and complete RGBA data");
  }
  const onPerimeter = (x: number, y: number) =>
    x < PERIMETER || y < PERIMETER || x >= width - PERIMETER || y >= height - PERIMETER;
  const channels: number[][] = [[], [], []];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!onPerimeter(x, y)) continue;
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) channels[c].push(data[i + c]);
    }
  }
  const background = channels.map((values) => {
    values.sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    return (values[middle] + values[Math.floor((values.length - 1) / 2)]) / 2;
  }) as Region["background"];
  const rows = new Set<number>();
  const columns = new Set<number>();
  let pixels = 0;
  let outliers = 0;
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const delta = Math.max(...background.map((channel, c) => Math.abs(data[i + c] - channel)));
      if (delta <= CONTRAST) continue;
      pixels++;
      if (onPerimeter(x, y)) outliers++;
      rows.add(y);
      columns.add(x);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  const bounds = pixels ? { x: left, y: top, width: right - left + 1, height: bottom - top + 1 } : null;
  const perimeter = { pixels: channels[0].length, outliers, fraction: outliers / channels[0].length };
  const failures: string[] = [];
  // A 20×20 two-dimensional footprint with at least 1/4 occupancy; sparse glyphs need
  // not be connected. Margins exclude edge artifacts; fractional caps exclude fields.
  if (pixels < 100) failures.push("pixels < 100");
  if (!bounds || bounds.width < 20) failures.push("width < 20");
  if (!bounds || bounds.height < 20) failures.push("height < 20");
  if (rows.size < 20) failures.push("occupied rows < 20");
  if (columns.size < 20) failures.push("occupied columns < 20");
  if (!bounds || left < 5 || top < 5 || width - 1 - right < 5 || height - 1 - bottom < 5) {
    failures.push("margin < 5");
  }
  if (bounds && bounds.width > width * 0.8) failures.push("width > 80%");
  if (bounds && bounds.height > height * 0.9) failures.push("height > 90%");
  if (perimeter.fraction >= 0.01) failures.push("perimeter outliers >= 1%");
  return { pass: failures.length === 0, failures, background, pixels, bounds,
    rows: rows.size, columns: columns.size, perimeter };
}
