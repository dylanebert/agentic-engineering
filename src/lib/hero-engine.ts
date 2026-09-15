import {
  AmbientLight,
  aim,
  build,
  Camera,
  cells,
  cellsGridFor,
  Color,
  Compute,
  Glaze,
  GlazePlugin,
  Part,
  PartPlugin,
  RenderPlugin,
  Resolution,
  SearPlugin,
  SlabPlugin,
  Tonemap,
  Transform,
  TransformsPlugin,
} from "@dylanebert/shallot";
import { captureFrame, type Capture } from "@dylanebert/shallot/harness/capture";
import { attachCanvas } from "@dylanebert/shallot/render";

export type HeroTreatment = "human" | "agentic" | "vibe";
export type HeroColors = Record<HeroTreatment, string>;

// Instrument mutations may park the renderer-authored subject; this remains false in production.
const hideAgenticPixels = false;

const scene = `<scene>
<a ambient-light="color: 0x404040" />
<a directional-light="direction: -0.4 -0.8 -0.45; intensity: 1" />
<a id="camera" camera resolution="width: 1280; height: 720" sear glaze transform />
<a id="box" part transform color="rgba: 0.85 0.55 0.35" />
<a id="glow" part transform="scale: 1.1 1.1 1.1" color="rgba: 0.42 0.25 0.63 0.28" />
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
    defaults: false, scene, pixelRatio: 2,
  });
  const camera = [...app.state.query([Camera])][0];
  Resolution.width.set(camera, 1280);
  Resolution.height.set(camera, 720);
  const parts = [...app.state.query([Part])];
  const box = parts[0];
  const glow = parts[1];
  const ambient = [...app.state.query([AmbientLight])][0];
  // The CSS hero remains a compact square, while the bound final canvas is pinned to Shallot's
  // public 1280x720 capture contract. Cells stay fixed in CSS pixels across displays.
  Object.assign(canvas, { cellWidth: 18, cellHeight: 18 });
  try { attachCanvas(camera, canvas, app.state); }
  catch (error) { app.dispose(); throw error; }
  // Sear's unpackColor linearizes these sRGB bytes; Glaze.None only re-encodes them.
  const channels = background.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const clear = (channels[0] << 16) | (channels[1] << 8) | channels[2];
  const render = (next: HeroTreatment, phase: number, dt = 0) => {
    treatment = next;
    // The shared poster/canvas tint maps black to transparent and glyph luminance to green ink.
    Camera.clearColor.set(camera, next === "agentic" ? 0 : clear);
    Glaze.tonemap.set(camera, Tonemap.None);
    const yaw = (phase % 1) * Math.PI * 2 + 0.6;
    const pitch = 0.55;
    const x = 1.95 * Math.cos(pitch) * Math.sin(yaw);
    const y = 1.95 * Math.sin(pitch);
    const z = 1.95 * Math.cos(pitch) * Math.cos(yaw);
    // Aim slightly below the origin so the cube sits centered in the frame despite the downward pitch.
    const rotation = aim(x, y, z, 0, -0.12, 0);
    // The glow shell only exists in vibe; elsewhere it parks far outside the view so Cells never samples it.
    Transform.pos.set(glow, 0, next === "vibe" ? 0 : 100, 0, 0);
    Transform.pos.set(box, hideAgenticPixels && next === "agentic" ? 100 : 0, 0, 0, 0);
    Transform.pos.set(camera, x, y, z, 0);
    Transform.rot.set(camera, rotation.x, rotation.y, rotation.z, rotation.w);
    const color = rgb(colors[next]);
    // Cells selects glyph density from the white cube's lighting; the shared tint carries its ink.
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
  const capture = (): Promise<Capture> => captureFrame(canvas);
  (globalThis as typeof globalThis & { __heroCapture?: typeof capture }).__heroCapture = capture;
  (canvas as HTMLCanvasElement & { __heroCapture?: typeof capture }).__heroCapture = capture;
  return { render, presented: () => Compute.device.queue.onSubmittedWorkDone(), capture, dispose: () => app.dispose() };
}
