import { expect, setDefaultTimeout, test } from "bun:test";
import { Camera } from "@dylanebert/shallot";
import { attachTexture, captureTexture } from "@dylanebert/shallot/rendering";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { HeroCycle, heroScene } from "./hero-engine";

setDefaultTimeout(TIMEOUT.gpu);
test("untonemapped human and vibe faces retain colour below display clipping", async () => {
  const app = await openGpuApp({ plugins: [heroScene({ human: "#363c44", agentic: "#1f6f5c", vibe: "#6b3fa0" }, 0xfaf8f5).plugin] });
  try {
    const { world } = app;
    const camera = world.only([Camera]);
    attachTexture(world, camera, { width: 128, height: 128 });
    for (const treatment of ["human", "vibe"] as const) {
      // Sweep each treatment's visible arc, including its top face and both sides.
      for (let i = 0; i <= 8; i++) {
        world.resource(HeroCycle).phase = (treatment === "human" ? 0.58 : 0.08) + i * 0.03;
        world.step(0);
        world.step(0);
        const { rgba } = await captureTexture(world, camera);
        // Interior samples avoid the clear and silhouette edges.
        let peak = 0;
        let tint = 255;
        for (let y = 32; y < 80; y++) for (let x = 48; x < 80; x++) {
          const rgb = [...rgba.slice((y * 128 + x) * 4, (y * 128 + x) * 4 + 3)];
          peak = Math.max(peak, ...rgb);
          tint = Math.min(tint, Math.max(...rgb) - Math.min(...rgb));
        }
        expect(peak, `${treatment} face at arc ${i}`).toBeLessThan(250);
        expect(tint, `${treatment} face tint`).toBeGreaterThan(treatment === "human" ? 2 : 15);
      }
    }
  } finally { app.dispose(); }
});
