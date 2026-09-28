export function updateSnapshotsRequested(
  argv: readonly string[],
  env: Readonly<{ UPDATE_SNAPSHOTS?: string }>,
): boolean {
  return env.UPDATE_SNAPSHOTS === "1" || argv.includes("--update-snapshots");
}

export function capturePlaywrightArgs(updateSnapshots: boolean): string[] {
  return [
    "bunx",
    "playwright",
    "test",
    "--config",
    "playwright.config.ts",
    ...(updateSnapshots ? ["--update-snapshots"] : []),
  ];
}
