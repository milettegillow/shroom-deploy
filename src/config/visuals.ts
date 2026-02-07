import * as THREE from "three";

export const Color = {
  WHITE: "#ffffff",
  BLACK: "#000000",
  BRICK: "#c0392b",
  CREAM: "#e8d5b7",
  CHARCOAL: "#2c3e50",
  PLUM: "#7a5890",
  SILVER: "#c0b8b8",
  LAVENDER: "#d8c8e0",
  SCARLET: "#ff3030",
  VIOLET: "#c060ff",
  CRIMSON: "#ff2222",
  AMBER: "#ffaa00",
  TAN: "#d4c5a9",
  SIENNA: "#8b5e3c",
  SAGE: "#a0a898",
  SLATE_GREEN: "#506058",
  FERN: "#4a8b3f",
  NEON_GREEN: "#7bff6b",
  PINE: "#2a5848",
  CYAN: "#40eebb",
  BARK: "#5a3a1a",
  FOREST: "#2d6b1e",
  ESPRESSO: "#3a2818",
  EVERGREEN: "#1a3a18",
  MIDNIGHT: "#101830",
  NAVY: "#1e3058",
  STEEL: "#2a3850",
  OBSIDIAN: "#081018",
  DEEP_NAVY: "#122030",
  DARK_TEAL: "#1a3040",
  MOSS: "#2d5a27",
  DARK_MOSS: "#1a3028",
  VOID: "#0a1a0a",
  OLIVE: "#558855",
  HUNTER: "#2a4838",
  IVORY: "#e8e4d8",
  ASH: "#c8c4b8",
  PERIWINKLE: "#c8d8ff",
  PEWTER: "#80b0b8",
  INDIGO: "#7b68ee",
  TEAL: "#40a898",
  PEACH: "#ffe8c0",
  CADET: "#5090a0",
  SKY_BLUE: "#a0d8ff",
  SEAFOAM: "#60c8b0",
  GOLD: "#c8a850",
  BRONZE: "#a08040",
  SUNFLOWER: "#ffcc44",
  TANGERINE: "rgba(255, 153, 68, 0.95)",
  COCOA: "#2a1800",
  CORAL: "#e05555",
  MARIGOLD: "#e0a030",
  EMERALD: "#55b060",
  CORNFLOWER: "#5588cc",
  AZURE: "#4498dd",
  CERULEAN: "#33aaee",
  ROSE: "#cc6699",
  HONEY: "#cc9944",
} as const;

export const Mushroom = {
  colors: {
    normal: {
      cap: new THREE.Color(Color.BRICK),
      stem: new THREE.Color(Color.CREAM),
      spots: new THREE.Color(Color.WHITE),
      eyes: new THREE.Color(Color.CHARCOAL),
    },
    dark: {
      cap: new THREE.Color(Color.PLUM),
      stem: new THREE.Color(Color.SILVER),
      spots: new THREE.Color(Color.LAVENDER),
      eyes: new THREE.Color(Color.SCARLET),
    },
  },
  emissive: {
    normal: {
      spots: new THREE.Color(Color.BLACK),
      eyes: new THREE.Color(Color.BLACK),
    },
    dark: {
      spots: new THREE.Color(Color.VIOLET),
      eyes: new THREE.Color(Color.CRIMSON),
    },
  },
  faceColor: Color.CHARCOAL,
  capEmissive: Color.AMBER,
  capRadius: 0.55,
  capTilt: -0.25,
  spotSizes: [
    0.07, 0.04, 0.05, 0.07, 0.035, 0.06, 0.04, 0.07, 0.05, 0.035, 0.06,
  ],
  spotCount: 22,
  spotCoverage: 0.65,
  stemArgs: [0.25, 0.3, 0.8, 16] as const,
  eyeOffsetX: 0.12,
  eyeY: 0.25,
  eyeZ: 0.26,
  eyeRadius: 0.06,
  browY: 0.34,
  browSize: [0.1, 0.02, 0.02] as const,
  mouthPos: [0, 0.12, 0.28] as const,
  mouthArgs: [0.06, 0.015, 8, 16, Math.PI] as const,
  face: {
    mouth: { normal: 1, dark: -1 },
    brow: { normal: 0.3, dark: -0.4 },
  } as const,
  anim: {
    happy: {
      bounceSpeed: 2,
      bounceAmt: 0.05,
      baseY: 0,
      swaySpeed: 1.5,
      swayAmt: 0.03,
    },
    hungry: {
      bounceSpeed: 1.2,
      bounceAmt: 0.02,
      baseY: -0.05,
      swaySpeed: 0.8,
      swayAmt: 0.01,
    },
  } as const,
  decay: {
    feedBounce: 0.95,
    mistShimmy: 0.94,
    pokeJolt: 0.88,
    giftGlow: 0.96,
  } as const,
};

export const Env = {
  decoColors: {
    normal: {
      stem: new THREE.Color(Color.TAN),
      cap: new THREE.Color(Color.SIENNA),
    },
    dark: {
      stem: new THREE.Color(Color.SAGE),
      cap: new THREE.Color(Color.SLATE_GREEN),
    },
  },
  plantColors: {
    normal: {
      stem: new THREE.Color(Color.FERN),
      bulb: new THREE.Color(Color.NEON_GREEN),
    },
    dark: {
      stem: new THREE.Color(Color.PINE),
      bulb: new THREE.Color(Color.CYAN),
    },
  },
  treeColors: {
    normal: {
      trunk: new THREE.Color(Color.BARK),
      canopy: new THREE.Color(Color.FOREST),
    },
    dark: {
      trunk: new THREE.Color(Color.ESPRESSO),
      canopy: new THREE.Color(Color.EVERGREEN),
    },
  },
  skyColors: {
    normal: {
      top: new THREE.Color(Color.MIDNIGHT),
      mid: new THREE.Color(Color.NAVY),
      bot: new THREE.Color(Color.STEEL),
    },
    dark: {
      top: new THREE.Color(Color.OBSIDIAN),
      mid: new THREE.Color(Color.DEEP_NAVY),
      bot: new THREE.Color(Color.DARK_TEAL),
    },
  },
  groundColors: {
    normal: new THREE.Color(Color.MOSS),
    dark: new THREE.Color(Color.DARK_MOSS),
  },
  fogColor: Color.VOID,
  fogDensity: { normal: 0.02, dark: 0.04 },
  smokeColor: { normal: Color.OLIVE, dark: Color.HUNTER },
  smokeOpacity: { normal: 0.15, dark: 0.25 },
  moonColor: new THREE.Color(Color.IVORY),
  moonLightColor: Color.ASH,
  moonOpacity: { normal: 0.9, dark: 0.3 },
  moonLightIntensity: { normal: 1.0, dark: 0.1 },
  moonPosition: [4, 5, -6] as const,
  moonRadius: 1.5,
  skyRadius: 50,
  groundRadius: 10,
  glowLightThreshold: 0.5,
  sparkles: {
    count: 40,
    size: 12,
    scale: new THREE.Vector3(10, 0.8, 10),
    speed: 0.15,
    noise: 2,
  },
};

export const Lighting = {
  colors: {
    ambient: { normal: { intensity: 0.7 }, dark: { intensity: 0.6 } },
    directional: {
      normal: { intensity: 1.6, color: new THREE.Color(Color.PERIWINKLE) },
      dark: { intensity: 1.2, color: new THREE.Color(Color.PEWTER) },
    },
    accent: {
      normal: { intensity: 0.5, color: new THREE.Color(Color.INDIGO) },
      dark: { intensity: 1.5, color: new THREE.Color(Color.TEAL) },
    },
    fill: {
      normal: { intensity: 0.9, color: new THREE.Color(Color.PEACH) },
      dark: { intensity: 0.8, color: new THREE.Color(Color.CADET) },
    },
    rim: {
      normal: { intensity: 0.7, color: new THREE.Color(Color.SKY_BLUE) },
      dark: { intensity: 1.0, color: new THREE.Color(Color.SEAFOAM) },
    },
  } as const,
  positions: {
    directional: [5, 8, 3],
    accent: [-3, 2, -2],
    fill: [3, 3, 2],
    rim: [-2, 4, 4],
  } as const,
  shadowMapSize: [1024, 1024] as const,
};

export const Jar = {
  colors: {
    body: Color.GOLD,
    emissive: Color.AMBER,
    cap: Color.BRONZE,
    light: Color.SUNFLOWER,
    badge: Color.TANGERINE,
    text: Color.COCOA,
  },
};

export const Meter = {
  colors: {
    hunger: { low: Color.CORAL, mid: Color.MARIGOLD, high: Color.EMERALD },
    thirst: { low: Color.CORNFLOWER, mid: Color.AZURE, high: Color.CERULEAN },
    boredom: { low: Color.ROSE, mid: Color.HONEY, high: Color.EMERALD },
  },
  thresholds: { low: 30, mid: 60 } as const,
};
