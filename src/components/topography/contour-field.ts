// Seeded scalar terrain. Idle motion evolves the heights at fixed world points;
// the same field is then deformed by the pointer and traced into contour paths.
const SEED = 0x5a17c9;
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1], [.7071, .7071], [-.7071, .7071], [.7071, -.7071], [-.7071, -.7071]];
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function gradient(x: number, y: number, dx: number, dy: number) {
  let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ SEED;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  const direction = DIRECTIONS[(hash ^ (hash >>> 16)) & 7];
  return direction[0] * dx + direction[1] * dy;
}

function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  return mix(
    mix(gradient(ix, iy, fx, fy), gradient(ix + 1, iy, fx - 1, fy), smooth(fx)),
    mix(gradient(ix, iy + 1, fx, fy - 1), gradient(ix + 1, iy + 1, fx - 1, fy - 1), smooth(fx)),
    smooth(fy),
  ) * 1.4142;
}

// A fixed spatial domain sampled through a third (time) dimension. The
// coordinates never translate, rotate, or zoom; saddles evolve so loops can
// stretch, pinch, join, and split instead of merely inflating together.
const GRADIENTS_3D = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1],
];

export type TemporalLayer = {
  coordinates: Float32Array; lower: Float32Array; upper: Float32Array;
  plane: number; amplitude: number; speed: number; phase: number;
};
export type TerrainGrid = {
  columns: number; rows: number; step: number;
  base: Float32Array; values: Float32Array; detail: Float32Array; layers: TemporalLayer[];
};
export type TerrainPointer = { x: number; y: number; radius: number; strength: number };

// At fixed x/y, a gradient-noise plane is linear in the time fraction. Cache
// its intercept and slope; only a new time slab requires new spatial hashes.
function fillPlane(layer: TemporalLayer, plane: number, output: Float32Array) {
  const coordinates = layer.coordinates;
  for (let i = 0; i < coordinates.length; i += 2) {
    const x = coordinates[i], y = coordinates[i + 1];
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = smooth(fx), sy = smooth(fy);
    let intercept = 0, slope = 0;
    for (let corner = 0; corner < 4; corner++) {
      const ox = corner & 1, oy = corner >> 1;
      let hash = Math.imul(ix + ox, 374761393) ^ Math.imul(iy + oy, 668265263)
        ^ Math.imul(plane, 1442695041) ^ SEED;
      hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
      const g = GRADIENTS_3D[(hash ^ (hash >>> 16)) & 15];
      const weight = (ox ? sx : 1 - sx) * (oy ? sy : 1 - sy);
      intercept += weight * (g[0] * (fx - ox) + g[1] * (fy - oy));
      slope += weight * g[2];
    }
    output[i] = intercept; output[i + 1] = slope;
  }
}

function prepareLayer(layer: TemporalLayer, plane: number) {
  if (layer.plane === plane) return;
  if (layer.plane + 1 === plane) {
    const reusable = layer.lower;
    layer.lower = layer.upper; layer.upper = reusable;
    fillPlane(layer, plane + 1, layer.upper);
  } else {
    fillPlane(layer, plane, layer.lower);
    fillPlane(layer, plane + 1, layer.upper);
  }
  layer.plane = plane;
}

function sampleLayers(grid: TerrainGrid, seconds: number) {
  const { values, layers } = grid;
  values.fill(0);
  for (const layer of layers) {
    const z = layer.phase + seconds * layer.speed, plane = Math.floor(z), t = z - plane;
    prepareLayer(layer, plane);
    const fade = smooth(t), amplitude = layer.amplitude * 1.2;
    for (let i = 0; i < values.length; i++) {
      const k = i * 2;
      const lower = layer.lower[k] + layer.lower[k + 1] * t;
      const upper = layer.upper[k] + layer.upper[k + 1] * (t - 1);
      values[i] += amplitude * mix(lower, upper, fade);
    }
  }
  return values;
}

export function createTerrain(width: number, height: number): TerrainGrid {
  const step = Math.max(7, Math.sqrt(width * height / 28000));
  const columns = Math.ceil(width / step) + 1, rows = Math.ceil(height / step) + 1;
  const base = new Float32Array(columns * rows), detail = new Float32Array(base.length);
  // Broad primary formations with a quieter second octave for small islands.
  // Spatial periods, not canvas dimensions or stroke width, set their size.
  const specifications = [
    { frequency: 1, amplitude: .9, speed: .16, phase: .45, x: 4.7, y: -2.3 },
    { frequency: 1.73, amplitude: .23, speed: .23, phase: 7.715, x: 11.6, y: -8.2 },
    { frequency: 2.91, amplitude: .035, speed: .12, phase: 13.26, x: -21.3, y: 14.7 },
  ];
  const layers: TemporalLayer[] = specifications.map(spec => ({
    coordinates: new Float32Array(base.length * 2), lower: new Float32Array(base.length * 2),
    upper: new Float32Array(base.length * 2), plane: NaN,
    amplitude: spec.amplitude, speed: spec.speed, phase: spec.phase,
  }));
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const x = column * step, y = row * step, index = row * columns + column;
    const u = (x + 72 * noise(x / 600 + 13.4, y / 600 - 7.2)) / 280;
    const v = (y + 66 * noise(x / 560 - 3.8, y / 560 + 19.1)) / 280;
    layers.forEach((layer, i) => {
      layer.coordinates[index * 2] = u * specifications[i].frequency + specifications[i].x;
      layer.coordinates[index * 2 + 1] = v * specifications[i].frequency + specifications[i].y;
    });
    detail[index] = noise(x / 150 + 9.2, y / 150 - 4.6);
  }
  const grid = { columns, rows, step, base, detail, layers, values: base.slice() };
  sampleLayers(grid, 0); base.set(grid.values);
  return grid;
}

export function evolveTerrain(grid: TerrainGrid, seconds: number) {
  if (seconds === 0) { grid.values.set(grid.base); return grid.values; }
  return sampleLayers(grid, seconds);
}

export function deformTerrain(grid: TerrainGrid, pointer: TerrainPointer, seconds = 0) {
  const { values, columns, rows, step, detail } = grid;
  evolveTerrain(grid, seconds);
  if (pointer.strength <= 0) return values;
  const { x, y, radius, strength } = pointer;
  const left = Math.max(0, Math.floor((x - radius) / step));
  const right = Math.min(columns - 1, Math.ceil((x + radius) / step));
  const top = Math.max(0, Math.floor((y - radius) / step));
  const bottom = Math.min(rows - 1, Math.ceil((y + radius) / step));
  for (let row = top; row <= bottom; row++) for (let column = left; column <= right; column++) {
    const index = row * columns + column;
    const dx = (column * step - x) / radius, dy = (row * step - y) / radius;
    const distance = dx * dx + dy * dy;
    if (distance >= 1) continue;
    // Compact support and a smooth boundary leave the distant field unchanged.
    // Uneven shoulders inherit the original terrain, forming irregular islands
    // and tighter nested contours rather than concentric decorative circles.
    const shoulder = 1 - distance;
    // A shallow surrounding trough creates loose returning ridges in the
    // actual terrain, rather than drawing an independent ripple on top.
    values[index] += strength * shoulder * shoulder * shoulder * (1 - 2.7 * distance)
      * (1 + .34 * detail[index] + .22 * dx - .16 * dy);
  }
  return values;
}

export const CONTOUR_START = -1.4;
export const CONTOUR_INTERVAL = .1;
export const CONTOUR_COUNT = 34;
type Segment = (level: number, ax: number, ay: number, bx: number, by: number) => void;
const CASES: number[][] = [[], [3, 0], [0, 1], [3, 1], [1, 2], [], [0, 2], [3, 2], [2, 3], [0, 2], [], [1, 2], [1, 3], [0, 1], [3, 0], []];

export function traceContours(grid: TerrainGrid, emit: Segment) {
  const { columns, rows, step, values } = grid;
  // Reuse corner/edge storage across cells and contour levels.
  const corners = new Float64Array(4), edges = new Float64Array(8);
  for (let row = 0; row < rows - 1; row++) for (let column = 0; column < columns - 1; column++) {
    const index = row * columns + column;
    corners[0] = values[index]; corners[1] = values[index + 1];
    corners[2] = values[index + columns + 1]; corners[3] = values[index + columns];
    const low = Math.max(0, Math.ceil((Math.min(corners[0], corners[1], corners[2], corners[3]) - CONTOUR_START) / CONTOUR_INTERVAL));
    const high = Math.min(CONTOUR_COUNT - 1, Math.floor((Math.max(corners[0], corners[1], corners[2], corners[3]) - CONTOUR_START) / CONTOUR_INTERVAL));
    for (let level = low; level <= high; level++) {
      const height = CONTOUR_START + level * CONTOUR_INTERVAL;
      const code = (corners[0] >= height ? 1 : 0) | (corners[1] >= height ? 2 : 0)
        | (corners[2] >= height ? 4 : 0) | (corners[3] >= height ? 8 : 0);
      let pairs = CASES[code];
      if (code === 5 || code === 10) {
        // Bilinear saddle decider keeps shared boundaries consistent.
        const determinant = (corners[0] - height) * (corners[2] - height)
          - (corners[1] - height) * (corners[3] - height);
        pairs = determinant >= 0 ? [0, 1, 2, 3] : [3, 0, 1, 2];
      }
      if (!pairs.length) continue;
      const x = column * step, y = row * step;
      for (const edge of pairs) {
        const a = edge === 2 ? 3 : edge === 3 ? 0 : edge;
        const b = edge === 0 ? 1 : edge === 3 ? 3 : 2;
        const t = (height - corners[a]) / (corners[b] - corners[a]);
        edges[edge * 2] = x + (edge === 1 ? step : edge === 3 ? 0 : t * step);
        edges[edge * 2 + 1] = y + (edge === 0 ? 0 : edge === 2 ? step : t * step);
      }
      for (let pair = 0; pair < pairs.length; pair += 2) {
        const a = pairs[pair] * 2, b = pairs[pair + 1] * 2;
        emit(level, edges[a], edges[a + 1], edges[b], edges[b + 1]);
      }
    }
  }
}
