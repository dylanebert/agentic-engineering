import {
  arrow,
  box,
  GlazePlugin,
  InputPlugin,
  LinesPlugin,
  OrbitPlugin,
  PartPlugin,
  type Plugin,
  RenderPlugin,
  run,
  SearPlugin,
  segment,
  SlabPlugin,
  type System,
  TransformsPlugin,
} from "@dylanebert/shallot";

const points = [-8, -4, 0, 4, 8] as const;

function feed(step: () => number): Plugin {
  const system: System = {
    group: "simulation",
    update() {
      const active = step();

      points.forEach((x, index) => {
        const color = index <= active ? 0x5b8daf : 0x9aa5ad;
        const width = index === active ? 3 : 1.5;
        box([x - 0.8, -0.8, -0.8], [x + 0.8, 0.8, 0.8], color, width);

        if (index < points.length - 1) {
          arrow([x + 1, 0, 0], [points[index + 1] - 1, 0, 0], color, 1.5, 0.8);
        }
      });

      if (active === points.length - 1) {
        segment([8, -1.4, 0], [8, -3, 0], 0x5b8daf, 1.5);
        segment([8, -3, 0], [-8, -3, 0], 0x5b8daf, 1.5);
        arrow([-8, -3, 0], [-8, -1.4, 0], 0x5b8daf, 1.5, 0.8);
      }
    },
  };

  return {
    name: "AgenticWalkthrough",
    systems: [system],
    dependencies: [LinesPlugin],
  };
}

export function startHero(step: () => number) {
  return run({
    defaults: false,
    scene: `${import.meta.env.BASE_URL}scenes/hero.scene`,
    plugins: [
      SlabPlugin,
      TransformsPlugin,
      InputPlugin,
      OrbitPlugin,
      RenderPlugin,
      PartPlugin,
      SearPlugin,
      GlazePlugin,
      LinesPlugin,
      feed(step),
    ],
    pixelRatio: "auto",
  });
}
