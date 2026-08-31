import { existsSync } from "node:fs";

const isWsl =
  process.platform === "linux" && existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");

function hasDisplay(): boolean {
  if (process.env.KEX_SIMULATE_NO_DISPLAY === "1") return false;
  if (isWsl || process.platform !== "linux") return true;
  return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
}

/** Refuses displayless execution unless the caller explicitly permits a skip. */
export function requireDisplay(gate: string): boolean {
  if (hasDisplay()) return true;

  const allowSkip =
    process.env.KEX_ALLOW_DISPLAY_SKIP === "1" ||
    process.argv.includes("--allow-display-skip");
  if (allowSkip) {
    console.log(`${gate}: no display detected — explicit display skip allowed (exit 0)`);
    return false;
  }

  console.error(
    `${gate}: no display detected — display is required by default; pass --allow-display-skip only when a skipped run is intended (exit 1)`,
  );
  process.exit(1);
}
