import { build } from "@dylanebert/shallot/src/engine/app/index.ts";
import { aim } from "@dylanebert/shallot/src/engine/utils/index.ts";
import { cells, cellsGridFor } from "@dylanebert/shallot/src/extras/cells/index.ts";
import { GlazePlugin } from "@dylanebert/shallot/src/standard/glaze/index.ts";
import { Color, Part, PartPlugin } from "@dylanebert/shallot/src/standard/part/index.ts";
import { attachCanvas } from "@dylanebert/shallot/src/standard/render/core.ts";
import { Camera, DirectionalLight, RenderPlugin } from "@dylanebert/shallot/src/standard/render/index.ts";
import { SearPlugin } from "@dylanebert/shallot/src/standard/sear/index.ts";
import { SlabPlugin } from "@dylanebert/shallot/src/standard/slab/index.ts";
import { Transform, TransformsPlugin } from "@dylanebert/shallot/src/standard/transforms/index.ts";

export type HeroTreatment = "human" | "agentic" | "vibe";
export type HeroColors = Record<HeroTreatment, string>;

const scene = `<scene>
<a ambient-light="color: 0x404040" />
<a directional-light="direction: -0.4 -0.8 -0.45; intensity: 1" />
<a id="camera" camera sear transform />
<a id="box" part transform color="rgba: 0.85 0.55 0.35" />
</scene>`;

function rgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { packed: value, r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 };
}

export async function mountHero(canvas: HTMLCanvasElement, colors: HeroColors, initial: HeroTreatment) {
  let app: Awaited<ReturnType<typeof build>>;
  let camera = 0;
  let box = 0;
  let light = 0;
  let treatment = initial;

  const start = async (next: HeroTreatment) => {
    const plugins = [SlabPlugin, TransformsPlugin, RenderPlugin, PartPlugin, SearPlugin];
    if (next === "agentic") plugins.push(cells("/agentic-engineering/fonts/jetbrains-mono.ttf"));
    plugins.push(GlazePlugin);
    app = await build({ plugins, defaults: false, scene });
    camera = [...app.state.query([Camera])][0];
    box = [...app.state.query([Part])][0];
    light = [...app.state.query([DirectionalLight])][0];
    attachCanvas(camera, canvas, app.state);
    treatment = next;
  };
  await start(initial);

  const render = async (next: HeroTreatment, phase: number, dt = 0) => {
    if ((next === "agentic") !== (treatment === "agentic")) {
      app.dispose();
      await start(next);
    }
    treatment = next;
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
    DirectionalLight.color.set(light, color.packed);
    app.state.step(dt);
    const grid = next === "agentic" ? cellsGridFor(camera) : undefined;
    return grid ? `${grid.cols}x${grid.rows}` : undefined;
  };
  return { render, dispose: () => app.dispose() };
}
