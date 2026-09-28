import { expect, test } from "bun:test";
import { CAPTURE_CONTRACT } from "@dylanebert/shallot/rendering";

test(
  "public Shallot frame contract stays fixed, so changed capture geometry cannot pass",
  () => {
    expect(CAPTURE_CONTRACT).toEqual({
      width: 1280,
      height: 720,
      deviceScale: 1,
      surface: "final-canvas",
      encoding: "rgba8-tight",
    });
  },
  250,
);
