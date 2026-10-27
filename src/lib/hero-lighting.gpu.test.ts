import { expect, setDefaultTimeout, test } from "bun:test";
import { Camera, DirectionalLight, GlobalAmbientLight } from "@dylanebert/shallot";
import { attachTexture, captureTexture } from "@dylanebert/shallot/rendering";
import { TIMEOUT } from "@dylanebert/shallot/testing";
import { openGpuApp } from "@dylanebert/shallot/testing/gpu";
import { HeroCycle, heroScene } from "./hero-engine";

setDefaultTimeout(TIMEOUT.gpu);
test("agentic glyph coverage matches the 55a79e6 lighting", async () => {
  let reference = false;
  const scene = heroScene({ human: "#363c44", agentic: "#1f6f5c", vibe: "#6b3fa0" }, 0xfaf8f5);
  const app = await openGpuApp({ plugins: [{
    ...scene.plugin,
    systems: [...scene.plugin.systems!, {
      name: "ReferenceLighting",
      update(world) {
        if (!reference) return;
        world.resource(GlobalAmbientLight).brightness = 380;
        world.storage(DirectionalLight).illuminance.set(world.only([DirectionalLight]), 6000);
      },
    }],
  }] });
  try {
    const { world } = app;
    const camera = world.only([Camera]);
    attachTexture(world, camera, { width: 280, height: 280 });
    const coverage = async () => {
      world.step(0);
      world.step(0);
      const { rgba } = await captureTexture(world, camera);
      let ink = 0;
      for (let i = 0; i < rgba.length; i += 4) if (rgba[i] > 128) ink++;
      return ink;
    };
    for (const phase of [0, 0.4, 0.5, 0.9]) {
      world.resource(HeroCycle).phase = phase;
      reference = false;
      const actual = await coverage();
      reference = true;
      const baseline = await coverage();
      expect(baseline).toBeGreaterThan(100);
      expect(actual / baseline, `agentic lit glyph coverage at phase ${phase}`).toBeCloseTo(1, 2);
    }
  } finally { app.dispose(); }
});
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
        let luminance = 255;
        for (let y = 32; y < 80; y++) for (let x = 48; x < 80; x++) {
          const rgb = [...rgba.slice((y * 128 + x) * 4, (y * 128 + x) * 4 + 3)];
          peak = Math.max(peak, ...rgb);
          luminance = Math.min(luminance, 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]);
          tint = Math.min(tint, Math.max(...rgb) - Math.min(...rgb));
        }
        expect(peak, `${treatment} face at arc ${i}`).toBeLessThan(250);
        expect(tint, `${treatment} face tint`).toBeGreaterThan(treatment === "human" ? 2 : 15);
        expect(luminance, `${treatment} face brightness at arc ${i}`).toBeGreaterThan(140);
      }
    }
  } finally { app.dispose(); }
});
