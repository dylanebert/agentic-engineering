import { build } from "@dylanebert/shallot/src/engine/app/index.ts";
import { aim } from "@dylanebert/shallot/src/engine/utils/index.ts";
import { GlazePlugin } from "@dylanebert/shallot/src/standard/glaze/index.ts";
import { Color, Part, PartPlugin } from "@dylanebert/shallot/src/standard/part/index.ts";
import { attachCanvas } from "@dylanebert/shallot/src/standard/render/core.ts";
import { Camera, RenderPlugin } from "@dylanebert/shallot/src/standard/render/index.ts";
import { SearPlugin } from "@dylanebert/shallot/src/standard/sear/index.ts";
import { SlabPlugin } from "@dylanebert/shallot/src/standard/slab/index.ts";
import { Transform, TransformsPlugin } from "@dylanebert/shallot/src/standard/transforms/index.ts";

const scene = `<scene>
<a ambient-light="color: 0x404040" />
<a directional-light="direction: -0.4 -0.8 -0.45; intensity: 1" />
<a id="camera" camera sear transform />
<a id="box" part transform color="rgba: 0.85 0.55 0.35" />
</scene>`;

export async function mountHero(canvas: HTMLCanvasElement) {
  const app = await build({
    plugins: [SlabPlugin, TransformsPlugin, RenderPlugin, PartPlugin, SearPlugin, GlazePlugin],
    defaults: false,
    scene,
  });
  const camera = [...app.state.query([Camera])][0];
  const box = [...app.state.query([Part])][0];
  attachCanvas(camera, canvas, app.state);
  const render = (phase: number, dt = 0) => {
    const yaw = phase * Math.PI * 2;
    const pitch = 0.55;
    const x = 2.2 * Math.cos(pitch) * Math.sin(yaw);
    const y = 2.2 * Math.sin(pitch);
    const z = 2.2 * Math.cos(pitch) * Math.cos(yaw);
    const rotation = aim(x, y, z, 0, 0, 0);
    Transform.pos.set(camera, x, y, z, 0);
    Transform.rot.set(camera, rotation.x, rotation.y, rotation.z, rotation.w);
    Color.rgba.set(box, 0.35 + phase * 0.35, 0.55, 0.7 - phase * 0.3, 1);
    app.state.step(dt);
  };
  return { render, dispose: () => app.dispose() };
}
