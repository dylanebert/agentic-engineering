import { build } from "@dylanebert/shallot/src/engine/app/index.ts";
import { aim } from "@dylanebert/shallot/src/engine/utils/index.ts";
import { cells, cellsGridFor } from "@dylanebert/shallot/src/extras/cells/index.ts";
import { Glaze, GlazePlugin, Tonemap } from "@dylanebert/shallot/src/standard/glaze/index.ts";
import { Color, Part, PartPlugin } from "@dylanebert/shallot/src/standard/part/index.ts";
import { attachCanvas } from "@dylanebert/shallot/src/standard/render/core.ts";
import { Camera, RenderPlugin } from "@dylanebert/shallot/src/standard/render/index.ts";
import { SearPlugin } from "@dylanebert/shallot/src/standard/sear/index.ts";
import { SlabPlugin } from "@dylanebert/shallot/src/standard/slab/index.ts";
import { Transform, TransformsPlugin } from "@dylanebert/shallot/src/standard/transforms/index.ts";

export type HeroTreatment = "human" | "agentic" | "vibe";
export type HeroColors = Record<HeroTreatment, string>;

const scene = `<scene>
<a ambient-light="color: 0x808080" />
<a directional-light="direction: -0.4 -0.8 -0.45; intensity: 1" />
<a id="camera" camera sear glaze transform />
<a id="box" part transform color="rgba: 0.85 0.55 0.35" />
</scene>`;

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
    plugins: [SlabPlugin, TransformsPlugin, RenderPlugin, PartPlugin, SearPlugin, gated, GlazePlugin],
    defaults: false, scene,
  });
  const camera = [...app.state.query([Camera])][0];
  const box = [...app.state.query([Part])][0];
  try { attachCanvas(camera, canvas, app.state); }
  catch (error) { app.dispose(); throw error; }
  // Sear's unpackColor linearizes these sRGB bytes; Glaze.None only re-encodes them.
  const channels = background.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const clear = (channels[0] << 16) | (channels[1] << 8) | channels[2];
  const render = (next: HeroTreatment, phase: number, dt = 0) => {
    treatment = next;
    Camera.clearColor.set(camera, next === "agentic" ? 0 : clear);
    Glaze.tonemap.set(camera, next === "agentic" ? Tonemap.Neutral : Tonemap.None);
    const yaw = phase * Math.PI * 2;
    const pitch = 0.55;
    const x = 2.2 * Math.cos(pitch) * Math.sin(yaw);
    const y = 2.2 * Math.sin(pitch);
    const z = 2.2 * Math.cos(pitch) * Math.cos(yaw);
    const rotation = aim(x, y, z, 0, 0, 0);
    Transform.pos.set(camera, x, y, z, 0);
    Transform.rot.set(camera, rotation.x, rotation.y, rotation.z, rotation.w);
    const color = rgb(colors[next]);
    Color.rgba.set(box, color.r, color.g, color.b, 1);
    app.state.step(dt / 1000);
    const grid = next === "agentic" ? cellsGridFor(camera) : undefined;
    return grid ? `${grid.cols}x${grid.rows}` : undefined;
  };
  return { render, dispose: () => app.dispose() };
}
