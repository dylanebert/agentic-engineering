import { build } from "@dylanebert/shallot/src/engine/app/index.ts";
import { Color, Transform } from "@dylanebert/shallot/src/standard/index.ts";
import { Part, PartPlugin } from "@dylanebert/shallot/src/standard/part/index.ts";
import { Camera, RenderPlugin } from "@dylanebert/shallot/src/standard/render/index.ts";
import { SearPlugin } from "@dylanebert/shallot/src/standard/sear/index.ts";
import { SlabPlugin } from "@dylanebert/shallot/src/standard/slab/index.ts";
import { TransformsPlugin } from "@dylanebert/shallot/src/standard/transforms/index.ts";

const scene = `<scene>
<a ambient-light="color: 0x404040" />
<a directional-light="direction: -0.4 -0.8 -0.45; intensity: 1" />
<a id="camera" camera sear transform />
<a id="box" part transform color="rgba: 0.85 0.55 0.35" />
</scene>`;

export async function mountHero() {
  const app = await build({
    plugins: [SlabPlugin, TransformsPlugin, RenderPlugin, PartPlugin, SearPlugin],
    defaults: false,
    scene,
  });
  const camera = [...app.state.query([Camera])][0];
  const box = [...app.state.query([Part])][0];
  const render = (phase: number) => {
    const yaw = phase * Math.PI * 2;
    const pitch = 0.55;
    Transform.pos.set(camera, 2.2 * Math.cos(pitch) * Math.sin(yaw), 2.2 * Math.sin(pitch), 2.2 * Math.cos(pitch) * Math.cos(yaw), 0);
    Color.rgba.set(box, 0.35 + phase * 0.35, 0.55, 0.7 - phase * 0.3, 1);
    app.state.step(0);
  };
  return { render, dispose: () => app.dispose() };
}
