import { expect, setDefaultTimeout, test } from "bun:test";
import { Camera, MeshInstance, StandardRenderer } from "@dylanebert/shallot";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { Ascii, AsciiStyle } from "@dylanebert/shallot-ascii";
import { HeroCube, HeroCycle, heroScene } from "./hero-engine";

setDefaultTimeout(TIMEOUT.gpu);
test("hero installs one camera and cube and switches ASCII silhouette with treatment", async () => {
  const scene = heroScene({ human: "#915544", agentic: "#1f6f5c", vibe: "#774499" }, 0xfaf8f5);
  const app = await openGpuApp({ defaults: false, plugins: [scene.plugin] });
  try {
    const { world } = app;
    expect([...world.query([Camera])]).toHaveLength(1);
    const camera = world.only([Camera, StandardRenderer]);
    expect([...world.query([HeroCube, MeshInstance])]).toHaveLength(1);
    expect(world.has(camera, Ascii)).toBe(true);
    expect(world.storage(Ascii).style.get(camera)).toBe(AsciiStyle.Silhouette);
    const cycle = world.resource(HeroCycle);
    for (const [phase, treatment] of [[0.6, "human"], [0.1, "vibe"], [0.4, "agentic"]] as const) {
      cycle.phase = phase;
      world.step(0);
      expect(cycle.treatment).toBe(treatment);
      expect(world.has(camera, Ascii)).toBe(treatment === "agentic");
    }
    cycle.phase = 0.075;
    world.step(0);
    expect(cycle.veil).toBeCloseTo(1);
    expect(cycle.treatment).toBe("vibe");
    cycle.phase = 0;
    cycle.presented = true;
    world.step(0.05);
    expect(cycle.live).toBe(false);
    expect(cycle.phase).toBe(0);
    for (let i = 0; i < 3; i++) world.step(0.05);
    expect(cycle.live).toBe(true);
    expect(cycle.phase).toBe(0);
    world.step(0.1);
    expect(cycle.phase).toBeCloseTo(world.time.deltaTime / 12);
    cycle.reduced = true;
    cycle.phase = 1;
    world.step(0.1);
    expect(cycle.phase).toBe(1);
    expect(cycle.treatment).toBe("agentic");
    expect(cycle.veil).toBe(0);
  } finally { app.dispose(); }
});
