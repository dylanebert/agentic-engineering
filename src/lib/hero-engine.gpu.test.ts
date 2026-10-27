import { expect, setDefaultTimeout, test } from "bun:test";
import { Camera, MeshInstance, StandardRenderer } from "@dylanebert/shallot";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { Ascii, AsciiStyle } from "@dylanebert/shallot-ascii";
import { HeroCube, heroScene } from "./hero-engine";

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
    for (const treatment of ["human", "vibe", "agentic"] as const) {
      scene.render(treatment, 0.2);
      world.step(0);
      expect(world.has(camera, Ascii)).toBe(treatment === "agentic");
    }
  } finally { app.dispose(); }
});
