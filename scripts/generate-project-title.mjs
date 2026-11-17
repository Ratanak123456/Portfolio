// Usage: node scripts/generate-project-title.mjs <current-font.woff2> <fontkit-module>
// fontkit is a generation tool only; the site ships the seven outlines below.
import fs from 'node:fs';
const fontkit = await import(process.argv[3] || 'fontkit');
const font = fontkit.openSync(process.argv[2]).getVariation({ wght: 750 });
const run = font.layout('PROJECT');
let advance = 0;
const paths = run.glyphs.map((glyph, index) => {
  const path = glyph.path.scale(1, -1).translate(advance + run.positions[index].xOffset, -run.positions[index].yOffset);
  advance += run.positions[index].xAdvance - font.unitsPerEm * .055;
  return path;
});
const bounds = {
  x: Math.min(...paths.map(p => p.bbox.minX)), y: Math.min(...paths.map(p => p.bbox.minY)),
  right: Math.max(...paths.map(p => p.bbox.maxX)), bottom: Math.max(...paths.map(p => p.bbox.maxY)),
};
const e = paths[4];
// The E outline begins with its full-height rectangular stem.
const stem = e.commands.slice(0, 4).flatMap(command => command.args);
const xs = stem.filter((_, i) => i % 2 === 0), ys = stem.filter((_, i) => i % 2 === 1);
const stroke = { x: (Math.min(...xs) + Math.max(...xs)) / 2 - bounds.x,
  y: (Math.min(...ys) + Math.max(...ys)) / 2 - bounds.y, thickness: Math.max(...xs) - Math.min(...xs) };
const round = n => Math.round(n * 10000) / 10000;
const outlines = paths.map(p => p.translate(-bounds.x, -bounds.y).mapPoints((x,y) => [round(x),round(y)]).toSVG());
const source = `// Generated from the site's Bricolage Grotesque 96pt Latin font, weight 750.\n// Original tracking: -0.055em. Outlines retain the font's SIL Open Font License.\n// Regenerate with scripts/generate-project-title.mjs; do not hand-edit paths.\nexport const PROJECT_WORD = ${JSON.stringify({ width: round(bounds.right - bounds.x), height: round(bounds.bottom - bounds.y) })} as const;\nexport const PROJECT_STROKE = ${JSON.stringify(stroke)} as const;\nexport const PROJECT_PATHS = ${JSON.stringify(outlines, null, 2)} as const;\n`;
fs.writeFileSync('src/data/project-title-outlines.ts', source);
console.log({word:bounds,stroke,unitsPerEm:font.unitsPerEm});
