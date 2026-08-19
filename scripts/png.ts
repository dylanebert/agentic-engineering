import { inflateSync } from "node:zlib";

// Dependency-free PNG decoder + perceptual helpers for the figure instrument. Playwright's
// `locator.screenshot()` returns a PNG buffer; to compute a perceptual delta (fix 1) and a
// non-triviality check (fix 4) we decode those PNGs without pulling in a native image dep —
// Node's zlib handles the IDAT inflate, and we un-filter the scanlines by hand. Only the
// shapes Playwright emits are supported: 8-bit, color types 0/2/4/6 (gray, RGB, gray+alpha, RGBA).

export interface DecodedPng {
  width: number;
  height: number;
  data: Uint8Array; // RGBA, 8-bit, row-major
}

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export function decodePng(buf: Buffer): DecodedPng {
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== PNG_SIG[i]) throw new Error("png: bad signature");
  }
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    off += 4;
    const type = buf.toString("ascii", off, off + 4);
    off += 4;
    const data = buf.subarray(off, off + len);
    off += len;
    off += 4; // CRC
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (bitDepth !== 8) throw new Error(`png: unsupported bit depth ${bitDepth}`);
  const channels =
    colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : -1;
  if (channels < 0) throw new Error(`png: unsupported color type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = channels;
  const stride = width * bpp;
  const out = new Uint8Array(width * height * 4);
  const prev = new Uint8Array(stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const row = raw.subarray(rp, rp + stride);
    rp += stride;
    const recon = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const f = row[x];
      const a = x >= bpp ? recon[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v: number;
      switch (filter) {
        case 0:
          v = f;
          break;
        case 1:
          v = (f + a) & 0xff;
          break;
        case 2:
          v = (f + b) & 0xff;
          break;
        case 3:
          v = (f + ((a + b) >> 1)) & 0xff;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          v = (f + pred) & 0xff;
          break;
        }
        default:
          throw new Error(`png: bad filter ${filter}`);
      }
      recon[x] = v;
    }
    for (let x = 0; x < width; x++) {
      const si = x * bpp;
      const di = (y * width + x) * 4;
      if (channels === 4) {
        out[di] = recon[si];
        out[di + 1] = recon[si + 1];
        out[di + 2] = recon[si + 2];
        out[di + 3] = recon[si + 3];
      } else if (channels === 3) {
        out[di] = recon[si];
        out[di + 1] = recon[si + 1];
        out[di + 2] = recon[si + 2];
        out[di + 3] = 255;
      } else if (channels === 2) {
        out[di] = recon[si];
        out[di + 1] = recon[si];
        out[di + 2] = recon[si];
        out[di + 3] = recon[si + 1];
      } else {
        out[di] = recon[si];
        out[di + 1] = recon[si];
        out[di + 2] = recon[si];
        out[di + 3] = 255;
      }
    }
    prev.set(recon);
  }
  return { width, height, data: out };
}

// Just-noticeable difference for 8-bit sRGB. Perceptual literature puts a JND at roughly 1-3
// levels per channel under typical viewing; 3 is the conservative end. A pixel counts as
// "noticeably different" when its max-channel RGB delta exceeds this. Grounded in JND, not tuned
// to any fixture.
const JND = 3;

export interface PerceptualDelta {
  meanDelta: number; // mean over pixels of the max-channel RGB delta
  maxDelta: number; // max over pixels of the max-channel RGB delta
  extent: number; // fraction of pixels whose max-channel RGB delta exceeds the JND
}

export function perceptualDelta(a: Buffer, b: Buffer): PerceptualDelta {
  const da = decodePng(a);
  const db = decodePng(b);
  if (da.width !== db.width || da.height !== db.height) {
    // Different dimensions → different states → fully varying.
    return { meanDelta: Infinity, maxDelta: Infinity, extent: 1 };
  }
  const n = da.width * da.height;
  if (n === 0) return { meanDelta: 0, maxDelta: 0, extent: 0 };
  let sum = 0;
  let max = 0;
  let above = 0;
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const dr = Math.abs(da.data[j] - db.data[j]);
    const dg = Math.abs(da.data[j + 1] - db.data[j + 1]);
    const dbb = Math.abs(da.data[j + 2] - db.data[j + 2]);
    const d = Math.max(dr, dg, dbb);
    sum += d;
    if (d > max) max = d;
    if (d > JND) above++;
  }
  return { meanDelta: sum / n, maxDelta: max, extent: above / n };
}

