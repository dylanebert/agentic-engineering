import { build } from "@dylanebert/shallot/src/engine/app/index.ts";
import { aim } from "@dylanebert/shallot/src/engine/utils/index.ts";
import { cells, cellsGridFor } from "@dylanebert/shallot/src/extras/cells/index.ts";
import { Glaze, GlazePlugin, Tonemap } from "@dylanebert/shallot/src/standard/glaze/index.ts";
import { Color, Part, PartPlugin } from "@dylanebert/shallot/src/standard/part/index.ts";
import { attachCanvas } from "@dylanebert/shallot/src/standard/render/core.ts";
import { AmbientLight, Camera, RenderPlugin } from "@dylanebert/shallot/src/standard/render/index.ts";
import { SearPlugin } from "@dylanebert/shallot/src/standard/sear/index.ts";
import { SlabPlugin } from "@dylanebert/shallot/src/standard/slab/index.ts";
import { Transform, TransformsPlugin } from "@dylanebert/shallot/src/standard/transforms/index.ts";
import { fsCtxSchema, registerSurface, surfaceLayout } from "@dylanebert/shallot/src/standard/render/contract.ts";
import { unpackLdrColor, Xform } from "@dylanebert/shallot/src/engine/utils/core.ts";
import type { Plugin } from "@dylanebert/shallot/src/engine/app/index.ts";
import tgpu from "typegpu";
import * as d from "typegpu/data";

export type HeroTreatment = "human" | "agentic" | "vibe";
export type HeroColors = Record<HeroTreatment, string>;

const scene = `<scene>
<a ambient-light="color: 0x404040" />
<a directional-light="direction: -0.4 -0.8 -0.45; intensity: 1" />
<a id="camera" camera sear glaze transform />
<a id="box" part transform color="rgba: 0.85 0.55 0.35" />
<a id="glow" part="surface: glow" transform="scale: 1.1 1.1 1.1" color="rgba: 0.42 0.25 0.63 0.28" />
</scene>`;

// An unlit, alpha-blended surface for the vibe glow shell: Part color straight through, alpha kept.
const glowLayout = surfaceLayout({
  eids: { type: "storage", element: d.u32 },
  transforms: { type: "storage", element: Xform },
  color: { type: "storage", element: d.u32 },
});
const glowFs = tgpu.fn([fsCtxSchema()], d.vec4f)((ctx) => {
  "use gpu";
  const color = unpackLdrColor(glowLayout.$.color[ctx.eid]);
  return d.vec4f(color.xyz, color.w);
});
const GlowPlugin: Plugin = {
  name: "HeroGlow",
  dependencies: [SearPlugin],
  initialize(state) { registerSurface(state, { name: "glow", layout: glowLayout, fs: glowFs, blend: "alpha" }); },
};

function rgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { packed: value, r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 };
}

export async function mountHero(canvas: HTMLCanvasElement, colors: HeroColors, background: string) {
  let treatment: HeroTreatment = "agentic";
  const ascii = cells("/agentic-engineering/fonts/jetbrains-mono.ttf");
  // Gate only update; preserve the font/resource hooks, dependencies and draw-order edges.
  const gated = { ...ascii, systems: ascii.systems?.map(system => ({
    ...system,
    update: (...args: Parameters<NonNullable<typeof system.update>>) => {
      if (treatment === "agentic") system.update?.(...args);
    },
  })) };
  const app = await build({
    plugins: [SlabPlugin, TransformsPlugin, RenderPlugin, PartPlugin, SearPlugin, GlowPlugin, gated, GlazePlugin],
    defaults: false, scene,
  });
  const camera = [...app.state.query([Camera])][0];
  const parts = [...app.state.query([Part])];
  const box = parts[0];
  const glow = parts[1];
  const ambient = [...app.state.query([AmbientLight])][0];
  // Cells slightly finer than the 11 px default so the glyph field reveals more of the cube's geometry.
  Object.assign(canvas, { cellWidth: 9, cellHeight: 9 });
  try { attachCanvas(camera, canvas, app.state); }
  catch (error) { app.dispose(); throw error; }
  // Sear's unpackColor linearizes these sRGB bytes; Glaze.None only re-encodes them.
  const channels = background.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const clear = (channels[0] << 16) | (channels[1] << 8) | channels[2];
  const render = (next: HeroTreatment, phase: number, dt = 0) => {
    treatment = next;
    // Cells fixes its cell background at black. The article inverts the agentic canvas in CSS
    // (Overture.svelte), so draw the ASCII pre-inverted: black becomes the page, glyphs land on
    // the real agentic color.
    Camera.clearColor.set(camera, next === "agentic" ? 0 : clear);
    Glaze.tonemap.set(camera, Tonemap.None);
    const yaw = phase * Math.PI * 2;
    const pitch = 0.55;
    const x = 1.95 * Math.cos(pitch) * Math.sin(yaw);
    const y = 1.95 * Math.sin(pitch);
    const z = 1.95 * Math.cos(pitch) * Math.cos(yaw);
    // Aim slightly below the origin so the cube sits centered in the frame despite the downward pitch.
    const rotation = aim(x, y, z, 0, -0.12, 0);
    // The glow shell only exists in vibe; elsewhere it parks far outside the view so Cells never samples it.
    Transform.pos.set(glow, 0, next === "vibe" ? 0 : 100, 0, 0);
    Transform.pos.set(camera, x, y, z, 0);
    Transform.rot.set(camera, rotation.x, rotation.y, rotation.z, rotation.w);
    const color = rgb(colors[next]);
    // ASCII renders a white cube: Cells picks glyph density from luma, and the CSS chain in
    // Overture.svelte (brightness, invert, tint matrix) maps every glyph onto the agentic green.
    // Shading faces get a lighter, pastel albedo so the solid cube reads soft against the page.
    if (next === "agentic") Color.rgba.set(box, 1, 1, 1, 1);
    else {
      const lift = next === "vibe" ? 0.08 : 0.35;
      Color.rgba.set(box, lift + color.r * (1 - lift), lift + color.g * (1 - lift), lift + color.b * (1 - lift), 1);
    }
    AmbientLight.intensity.set(ambient, next === "agentic" ? 1 : 1.6);
    app.state.step(dt / 1000);
    const grid = next === "agentic" ? cellsGridFor(camera) : undefined;
    return grid ? `${grid.cols}x${grid.rows}` : undefined;
  };
  return { render, dispose: () => app.dispose() };
}
