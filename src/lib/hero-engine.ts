import {
  AlphaMode, Camera, component, DirectionalLight, GlobalAmbientLight, lookAtRotation,
  Materials, MeshInstance, MeshMaterial, type Plugin, runApp, shallotDark,
  StandardMaterial, StandardRenderer, Tonemapping, TonemappingMethod, Transform, type World,
} from "@dylanebert/shallot";
import { Ascii, AsciiPlugin, AsciiStyle } from "@dylanebert/shallot-ascii";

export type HeroTreatment = "human" | "agentic" | "vibe";
export type HeroColors = Record<HeroTreatment, string>;
export const HeroCube = component("HeroCube", {});
export interface HeroCycleState {
  phase: number;
  treatment: HeroTreatment;
  veil: number;
  presented: boolean;
  live: boolean;
  reveal: number;
  reduced: boolean;
}
export const HeroCycle = {
  create: (): HeroCycleState => ({
    phase: 0, treatment: "agentic", veil: 0, presented: false,
    live: false, reveal: 0, reduced: false,
  }),
};

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

/** The cycle and pose share runApp's world clock. */
export function heroScene(colors: HeroColors, clear: number, reduced = false) {
  let camera: number;
  let cube: number;
  let glow: number;
  let apply: ((world: World) => void) | undefined;
  const plugin: Plugin = {
    name: "HeroScene",
    dependencies: [AsciiPlugin],
    components: [HeroCube],
    initialize(world) {
      const cycle = world.resource(HeroCycle);
      cycle.reduced = reduced;
      cycle.phase = reduced ? 1 : 0;
      const ambient = world.resource(GlobalAmbientLight);
      ambient.color = 0xffffff;
      ambient.brightness = 380;
      const sun = world.create();
      world.add(sun, Transform, { rotation: lookAtRotation(0, 0, 0, 0.4, -0.8, -0.45) });
      world.add(sun, DirectionalLight, { color: 0xffffff, illuminance: 6000 });
      camera = world.create();
      world.add(camera, Camera, { clearColor: 0 });
      world.add(camera, StandardRenderer);
      world.add(camera, Tonemapping, { method: TonemappingMethod.None });
      world.add(camera, Transform);
      const materials = world.resource(Materials);
      const finishes = Object.fromEntries(Object.entries(colors).map(([name, hex]) => {
        const lift = name === "vibe" ? 0.08 : 0.35;
        const color = name === "agentic" ? [1, 1, 1] : rgb(hex).map(c => lift + c * (1 - lift));
        return [name, materials.add(StandardMaterial({ baseColor: [...color, 1] as [number, number, number, number], perceptualRoughness: 0.65 }))];
      }));
      cube = world.create();
      world.add(cube, HeroCube);
      world.add(cube, MeshInstance);
      world.add(cube, Transform);
      world.add(cube, MeshMaterial, finishes.agentic);
      glow = world.create();
      world.add(glow, MeshInstance);
      world.add(glow, Transform, { scale: [1.1, 1.1, 1.1] });
      world.add(glow, MeshMaterial, materials.add(StandardMaterial({
        baseColor: [...rgb(colors.vibe), 0.28], perceptualRoughness: 1,
      }), { alphaMode: AlphaMode.Blend }));
      apply = world => {
        const { treatment, phase } = world.resource(HeroCycle);
        world.storage(Camera).clearColor.set(camera, treatment === "agentic" ? 0 : clear);
        if (treatment === "agentic") {
          if (!world.has(camera, Ascii)) world.add(camera, Ascii, { style: AsciiStyle.Silhouette });
        } else world.remove(camera, Ascii);
        world.add(cube, MeshMaterial, finishes[treatment]);
        const transforms = world.storage(Transform);
        transforms.translation.set(glow, 0, treatment === "vibe" ? 0 : 100, 0);
        const yaw = (phase % 1) * Math.PI * 2 + 0.6;
        const pitch = 0.55;
        const x = 1.95 * Math.cos(pitch) * Math.sin(yaw);
        const y = 1.95 * Math.sin(pitch);
        const z = 1.95 * Math.cos(pitch) * Math.cos(yaw);
        transforms.translation.set(camera, x, y, z);
        transforms.rotation.set(camera, ...lookAtRotation(x, y, z, 0, -0.12, 0));
      };
      apply(world);
    },
    systems: [{ name: "Hero/Cycle", update(world) {
      const cycle = world.resource(HeroCycle);
      if (cycle.presented) {
        if (cycle.reduced) cycle.live = true;
        else if (!cycle.live) {
          cycle.reveal += world.time.deltaTime;
          if (cycle.reveal >= 0.2) cycle.live = true;
        } else cycle.phase = (cycle.phase + world.time.deltaTime / 12) % 1;
      }
      const segment = cycle.phase * 4;
      const landed = Math.floor(segment) + (segment % 1 >= 0.3 ? 1 : 0);
      cycle.treatment = cycle.reduced ? "agentic"
        : (["agentic", "vibe", "agentic", "human", "agentic"] as const)[landed];
      cycle.veil = cycle.reduced ? 0 : Math.max(0, 1 - Math.abs(segment % 1 - 0.3) / 0.06);
      apply?.(world);
    } }],
  };
  return { plugin };
}

export async function mountHero(
  canvas: HTMLCanvasElement, colors: HeroColors, background: string,
  reduced: boolean, present: (state: Readonly<HeroCycleState>) => void,
) {
  const frame = canvas.closest<HTMLElement>(".canvas-wrap")!;
  const loading = shallotDark({ container: frame });
  const fail = (error: unknown) => {
    console.error(error);
    if (frame.querySelector(":scope > [data-shallot-loading]")) return;
    const line = document.createElement("p");
    line.className = "frame-error";
    line.setAttribute("role", "alert");
    line.textContent = `Something went wrong: ${String(error)}`;
    frame.append(line);
  };
  const channels = background.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const scene = heroScene(colors, (channels[0] << 16) | (channels[1] << 8) | channels[2], reduced);
  let waiting = false;
  let disposed = false;
  const reveal: Plugin = {
    name: "HeroReveal",
    systems: [{ name: "first-frame", group: "draw", update(world) {
      if (waiting || disposed) return;
      waiting = true;
      world.onFrameSubmit(() => {
        const fence = world.frameFence ?? Promise.reject(new Error("the first frame had no WebGPU device"));
        void fence.then(() => {
          if (!disposed) world.resource(HeroCycle).presented = true;
        }).catch(error => { loading.error?.(error); fail(error); });
      });
    } }, {
      name: "Hero/Read", group: "draw",
      update(world) { present(world.resource(HeroCycle)); },
    }],
    dispose() { disposed = true; },
  };
  try {
    const app = await runApp({ plugins: [scene.plugin, reveal], loading, pixelRatio: "auto" });
    return { dispose: () => app.dispose() };
  } catch (error) { fail(error); throw error; }
}
