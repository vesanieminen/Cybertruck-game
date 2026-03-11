export interface WorldColors {
  skyTop: number;
  skyHorizon: number;
  fogColor: number;
  groundLow: number;
  groundMid: number;
  groundHigh: number;
  treeTrunk: number;
  treeLeaves: number;
  rockColor: number;
  sunColor: number;
  ambientColor: number;
  hemisphereTop: number;
  hemisphereBottom: number;
}

export type TreeStyle = 'conifer' | 'deciduous' | 'palm' | 'cactus' | 'snow-conifer' | 'none';

export interface WorldConfig {
  id: string;
  label: string;
  subtitle: string;

  // Terrain
  terrainSize: number;
  terrainSegments: number;
  terrainMaxHeight: number;
  terrainNoiseScale: number;
  terrainNoiseOctaves: number;
  terrainFlatRadius: number;
  edgeWallHeight: number;

  // Colors
  colors: WorldColors;

  // Fog
  fogNear: number;
  fogFar: number;

  // Environment
  treeCount: number;
  rockCount: number;
  treeStyle: TreeStyle;

  // Lighting
  sunIntensity: number;
  ambientIntensity: number;
  hemisphereIntensity: number;

  // Structures
  stuntDensity: number;
  hasBuildings: boolean;
  buildingStyle?: 'downtown' | 'suburban';
  buildingCount?: number;
}

export type WorldId =
  | 'countryside'
  | 'downtown'
  | 'suburbs'
  | 'stunt-arena'
  | 'snow-peaks'
  | 'mountain-pass'
  | 'desert'
  | 'coastal';

export const WORLD_IDS: WorldId[] = [
  'countryside',
  'downtown',
  'suburbs',
  'stunt-arena',
  'snow-peaks',
  'mountain-pass',
  'desert',
  'coastal',
];

const WORLD_CONFIGS: Record<WorldId, WorldConfig> = {
  countryside: {
    id: 'countryside',
    label: 'COUNTRYSIDE',
    subtitle: 'ROLLING GREEN HILLS',
    terrainSize: 1500,
    terrainSegments: 384,
    terrainMaxHeight: 15,
    terrainNoiseScale: 0.006,
    terrainNoiseOctaves: 4,
    terrainFlatRadius: 30,
    edgeWallHeight: 40,
    colors: {
      skyTop: 0x4488cc,
      skyHorizon: 0xaaccee,
      fogColor: 0xccddee,
      groundLow: 0x4a7a3a,
      groundMid: 0x8b7355,
      groundHigh: 0x888888,
      treeTrunk: 0x664422,
      treeLeaves: 0x337733,
      rockColor: 0x888888,
      sunColor: 0xffffdd,
      ambientColor: 0x668899,
      hemisphereTop: 0x88bbdd,
      hemisphereBottom: 0x445533,
    },
    fogNear: 400,
    fogFar: 1000,
    treeCount: 800,
    rockCount: 400,
    treeStyle: 'conifer',
    sunIntensity: 2.5,
    ambientIntensity: 1.0,
    hemisphereIntensity: 1.5,
    stuntDensity: 1,
    hasBuildings: false,
  },

  downtown: {
    id: 'downtown',
    label: 'DOWNTOWN',
    subtitle: 'CONCRETE JUNGLE',
    terrainSize: 1500,
    terrainSegments: 384,
    terrainMaxHeight: 2,
    terrainNoiseScale: 0.003,
    terrainNoiseOctaves: 2,
    terrainFlatRadius: 40,
    edgeWallHeight: 30,
    colors: {
      skyTop: 0x5577aa,
      skyHorizon: 0x99aabb,
      fogColor: 0xaabbcc,
      groundLow: 0x666666,
      groundMid: 0x555555,
      groundHigh: 0x444444,
      treeTrunk: 0x554433,
      treeLeaves: 0x2a6a2a,
      rockColor: 0x666666,
      sunColor: 0xffeedd,
      ambientColor: 0x889999,
      hemisphereTop: 0x8899aa,
      hemisphereBottom: 0x555555,
    },
    fogNear: 200,
    fogFar: 800,
    treeCount: 80,
    rockCount: 30,
    treeStyle: 'deciduous',
    sunIntensity: 2.0,
    ambientIntensity: 1.2,
    hemisphereIntensity: 1.2,
    stuntDensity: 0.3,
    hasBuildings: true,
    buildingStyle: 'downtown',
    buildingCount: 150,
  },

  suburbs: {
    id: 'suburbs',
    label: 'SUBURBS',
    subtitle: 'QUIET NEIGHBORHOODS',
    terrainSize: 1500,
    terrainSegments: 384,
    terrainMaxHeight: 5,
    terrainNoiseScale: 0.004,
    terrainNoiseOctaves: 3,
    terrainFlatRadius: 35,
    edgeWallHeight: 35,
    colors: {
      skyTop: 0x4488cc,
      skyHorizon: 0xbbccdd,
      fogColor: 0xccddee,
      groundLow: 0x5a9a4a,
      groundMid: 0x7a8a55,
      groundHigh: 0x777777,
      treeTrunk: 0x664422,
      treeLeaves: 0x2a7a2a,
      rockColor: 0x777777,
      sunColor: 0xffffdd,
      ambientColor: 0x778899,
      hemisphereTop: 0x88bbdd,
      hemisphereBottom: 0x446633,
    },
    fogNear: 300,
    fogFar: 900,
    treeCount: 500,
    rockCount: 100,
    treeStyle: 'deciduous',
    sunIntensity: 2.5,
    ambientIntensity: 1.0,
    hemisphereIntensity: 1.5,
    stuntDensity: 0.5,
    hasBuildings: true,
    buildingStyle: 'suburban',
    buildingCount: 80,
  },

  'stunt-arena': {
    id: 'stunt-arena',
    label: 'STUNT ARENA',
    subtitle: 'RAMP PARADISE',
    terrainSize: 1500,
    terrainSegments: 384,
    terrainMaxHeight: 1,
    terrainNoiseScale: 0.002,
    terrainNoiseOctaves: 1,
    terrainFlatRadius: 50,
    edgeWallHeight: 20,
    colors: {
      skyTop: 0x222244,
      skyHorizon: 0x445566,
      fogColor: 0x556677,
      groundLow: 0x555555,
      groundMid: 0x606060,
      groundHigh: 0x6a6a6a,
      treeTrunk: 0x444444,
      treeLeaves: 0x444444,
      rockColor: 0x555555,
      sunColor: 0xffeedd,
      ambientColor: 0x667788,
      hemisphereTop: 0x556677,
      hemisphereBottom: 0x333344,
    },
    fogNear: 500,
    fogFar: 1200,
    treeCount: 0,
    rockCount: 0,
    treeStyle: 'none',
    sunIntensity: 3.0,
    ambientIntensity: 1.5,
    hemisphereIntensity: 1.0,
    stuntDensity: 3,
    hasBuildings: false,
  },

  'snow-peaks': {
    id: 'snow-peaks',
    label: 'SNOW PEAKS',
    subtitle: 'FROZEN WILDERNESS',
    terrainSize: 1500,
    terrainSegments: 384,
    terrainMaxHeight: 25,
    terrainNoiseScale: 0.005,
    terrainNoiseOctaves: 5,
    terrainFlatRadius: 30,
    edgeWallHeight: 50,
    colors: {
      skyTop: 0x4466aa,
      skyHorizon: 0xccddee,
      fogColor: 0xddeeff,
      groundLow: 0xddeeff,
      groundMid: 0xbbccdd,
      groundHigh: 0x99aabb,
      treeTrunk: 0x443322,
      treeLeaves: 0x2a5a2a,
      rockColor: 0x8899aa,
      sunColor: 0xffffff,
      ambientColor: 0x8899bb,
      hemisphereTop: 0xaabbdd,
      hemisphereBottom: 0x778899,
    },
    fogNear: 300,
    fogFar: 900,
    treeCount: 400,
    rockCount: 600,
    treeStyle: 'snow-conifer',
    sunIntensity: 3.0,
    ambientIntensity: 1.2,
    hemisphereIntensity: 1.8,
    stuntDensity: 0.5,
    hasBuildings: false,
  },

  'mountain-pass': {
    id: 'mountain-pass',
    label: 'MOUNTAIN PASS',
    subtitle: 'DRAMATIC PEAKS',
    terrainSize: 1500,
    terrainSegments: 384,
    terrainMaxHeight: 40,
    terrainNoiseScale: 0.004,
    terrainNoiseOctaves: 6,
    terrainFlatRadius: 30,
    edgeWallHeight: 60,
    colors: {
      skyTop: 0x3366aa,
      skyHorizon: 0x99bbdd,
      fogColor: 0xbbccdd,
      groundLow: 0x5a7a3a,
      groundMid: 0x8b7355,
      groundHigh: 0x999999,
      treeTrunk: 0x554422,
      treeLeaves: 0x2a5a2a,
      rockColor: 0x888888,
      sunColor: 0xffffdd,
      ambientColor: 0x667788,
      hemisphereTop: 0x7799bb,
      hemisphereBottom: 0x445533,
    },
    fogNear: 250,
    fogFar: 800,
    treeCount: 300,
    rockCount: 800,
    treeStyle: 'conifer',
    sunIntensity: 2.5,
    ambientIntensity: 0.8,
    hemisphereIntensity: 1.5,
    stuntDensity: 0.3,
    hasBuildings: false,
  },

  desert: {
    id: 'desert',
    label: 'DESERT',
    subtitle: 'ENDLESS DUNES',
    terrainSize: 1500,
    terrainSegments: 384,
    terrainMaxHeight: 12,
    terrainNoiseScale: 0.003,
    terrainNoiseOctaves: 3,
    terrainFlatRadius: 30,
    edgeWallHeight: 35,
    colors: {
      skyTop: 0x5599cc,
      skyHorizon: 0xeeddbb,
      fogColor: 0xddccaa,
      groundLow: 0xd4a860,
      groundMid: 0xc49850,
      groundHigh: 0xbb8840,
      treeTrunk: 0x668844,
      treeLeaves: 0x557733,
      rockColor: 0xaa8866,
      sunColor: 0xffeecc,
      ambientColor: 0x998877,
      hemisphereTop: 0x88aacc,
      hemisphereBottom: 0x886644,
    },
    fogNear: 400,
    fogFar: 1100,
    treeCount: 150,
    rockCount: 200,
    treeStyle: 'cactus',
    sunIntensity: 3.5,
    ambientIntensity: 1.0,
    hemisphereIntensity: 1.2,
    stuntDensity: 0.7,
    hasBuildings: false,
  },

  coastal: {
    id: 'coastal',
    label: 'COASTAL',
    subtitle: 'BEACHES & CLIFFS',
    terrainSize: 1500,
    terrainSegments: 384,
    terrainMaxHeight: 10,
    terrainNoiseScale: 0.005,
    terrainNoiseOctaves: 4,
    terrainFlatRadius: 60,
    edgeWallHeight: 25,
    colors: {
      skyTop: 0x3388cc,
      skyHorizon: 0xaaddee,
      fogColor: 0x88bbdd,
      groundLow: 0xe8d8a8,
      groundMid: 0x5a8a3a,
      groundHigh: 0x888888,
      treeTrunk: 0x886633,
      treeLeaves: 0x339933,
      rockColor: 0x888888,
      sunColor: 0xffffdd,
      ambientColor: 0x779999,
      hemisphereTop: 0x88ccee,
      hemisphereBottom: 0x558844,
    },
    fogNear: 350,
    fogFar: 950,
    treeCount: 400,
    rockCount: 300,
    treeStyle: 'palm',
    sunIntensity: 3.0,
    ambientIntensity: 1.0,
    hemisphereIntensity: 1.5,
    stuntDensity: 0.8,
    hasBuildings: false,
  },
};

export function getWorldConfig(id: WorldId): WorldConfig {
  return WORLD_CONFIGS[id];
}

export function getWorldLabel(id: WorldId): string {
  return WORLD_CONFIGS[id].label;
}
