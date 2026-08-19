import { createServer, type Server } from "node:http";
import { test, expect } from "@playwright/test";
import { assertVaries, type AxisDriver } from "./variance";
import { assertReducedMotion } from "./reduced";

// Self-test for the figure instrument (variance + reduced-motion). Serves a synthetic fixture —
// a figure whose background hue rotates with a --step custom property — and drives it through the
// reusable harnesses. No figures exist yet (they land in D and E); this proves the instrument
// discriminates now, per oracle 5 / coding.md (a check is evidence only if you have seen it fail).

const root = __dirname;

const fixtureHtml = `<!doctype html>
<html lang="en">
  <head>
    <style>
      body { margin: 0; padding: 24px; }
      .figure {
        width: 200px;
        height: 200px;
        background: hsl(calc(var(--step, 0) * 90deg), 70%, 50%);
        transition: background 0.3s ease;
      }
      @media (prefers-reduced-motion: reduce) {
        .figure { transition: none; }
      }
    </style>
  </head>
  <body>
    <div class="figure" id="fig"></div>
  </body>
</html>`;

let server: Server;
let url: string;

test.beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fixtureHtml);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no server port");
  url = `http://127.0.0.1:${address.port}/`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

// The axis driver: sets --step on the figure. To pin (mutation run), set the second arg to 0
// instead of step — every state renders the same hue, so the variance harness reds.
const driver: AxisDriver = async (page, step) => {
  await page.locator("#fig").evaluate((el, s) => el.style.setProperty("--step", String(s)), step);
};

const STEPS = 4;

test("variance: figure varies across its axis", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertVaries(page, "#fig", driver, STEPS);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});

test("reduced-motion: figure renders fully drawn at every state", async ({ page }) => {
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await assertReducedMotion(page, "#fig", driver, STEPS);
  expect(result.failures).toEqual([]);
  expect(result.pass).toBe(true);
});
