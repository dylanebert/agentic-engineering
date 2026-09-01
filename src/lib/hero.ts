import { minimalLight, OrbitPlugin, run } from "@dylanebert/shallot";

export function startHero(container: HTMLElement) {
  return run({
    scene: `${import.meta.env.BASE_URL}scenes/hero.scene`,
    plugins: [OrbitPlugin],
    loading: minimalLight(container),
    pixelRatio: "auto",
  });
}
