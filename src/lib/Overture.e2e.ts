import { pipelineWarnings } from "@dylanebert/shallot/testing";
import { expect, test as base } from "@playwright/test";

const test = base.extend(pipelineWarnings);
test.use({ deviceScaleFactor: 2 });

test("the hero draws into a canvas whose backing size follows its CSS box ratio", async ({ page }) => {
  await page.goto("/agentic-engineering/");
  const hero = page.locator('[data-hero-gpu="drawn"]');
  await hero.waitFor();
  await expect(hero.locator("[data-hero-poster]")).toBeHidden();
  const canvas = hero.locator("canvas");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const box = canvas.getBoundingClientRect();
      return Math.abs(canvas.width / canvas.height - box.width / box.height);
    })).toBeLessThan(0.01);
    await expect.poll(() => canvas.evaluate(element => {
      const canvas = element as HTMLCanvasElement;
      return [canvas.width, canvas.height];
    })).toEqual([560, 560]);
    const png = await canvas.screenshot();
    const ink = await page.evaluate(async (encoded) => {
      const image = await createImageBitmap(new Blob([
        Uint8Array.from(atob(encoded), (value) => value.charCodeAt(0)),
      ], { type: "image/png" }));
      const surface = document.createElement("canvas");
      surface.width = image.width;
      surface.height = image.height;
      const context = surface.getContext("2d")!;
      context.drawImage(image, 0, 0);
      image.close();
      const rgba = context.getImageData(0, 0, surface.width, surface.height).data;
      let pixels = 0;
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 1] > rgba[i] * 1.3 && rgba[i + 1] > rgba[i + 2] * 1.1) pixels++;
      }
      return pixels;
    }, png.toString("base64"));
    expect(ink, "the presented canvas contains green hero ink, not just its clear").toBeGreaterThan(100);
  }
});
