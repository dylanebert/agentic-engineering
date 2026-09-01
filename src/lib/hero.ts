import { minimalLight, OrbitPlugin, run } from "@dylanebert/shallot";

const scene = `<scene>
  <a ambient-light="color: 0xffffff; intensity: 0.8" />
  <a directional-light="direction: -0.4 -1 -0.55; color: 0xffffff; intensity: 1.1" />
  <a id="camera" camera="clear-color: 0xfbfcfd" sear glaze="tonemap: 1" transform orbit="distance: 8; yaw: 0.6; pitch: 0.3; target: @cube" />
  <a id="cube" part transform color="rgba: 0.55 0.38 0.25" />
</scene>`;

export function startHero(container: HTMLElement) {
  return run({
    scene,
    plugins: [OrbitPlugin],
    loading: minimalLight(container),
    pixelRatio: "auto",
  });
}
