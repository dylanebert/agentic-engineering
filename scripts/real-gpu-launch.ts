import type { LaunchOptions } from "@playwright/test";

export const REAL_GPU_LAUNCH = {
  channel: "chromium",
  args: [
    "--enable-unsafe-webgpu",
    "--enable-features=WebGPUDeveloperFeatures",
    "--enable-webgpu-developer-features",
  ],
} satisfies LaunchOptions;
