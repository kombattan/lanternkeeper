// Lanternkeeper's hand-in program (Node 22, standard library only).
// The game itself is the game/ folder beside this file: plain static files a
// desktop browser loads fully offline. This program copies game/ and
// screenshots/ into the output directory and writes dossier.json there with
// the kit's vendored buildDossier, then verifies what it handed in — file
// and byte counts for the game tree and the size of every screenshot — and
// prints a one-line summary, so a bad hand-in is loud in the run log instead
// of silent at the gate.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Lanternkeeper's own post-hand-in verification: walk the copied game tree
// and the screenshots, and report their shape. This only reads the output;
// the dossier above is the entry, byte for byte what buildDossier wrote.
function survey(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const inner = survey(path);
      files += inner.files;
      bytes += inner.bytes;
    } else {
      files += 1;
      bytes += stats.size;
    }
  }
  return { files, bytes };
}

const gameSurvey = survey(join(out, 'game'));
const shotDir = join(out, 'screenshots');
const shotSizes = existsSync(shotDir)
  ? readdirSync(shotDir).map((name) => `${name} ${(statSync(join(shotDir, name)).size / 1024).toFixed(1)} KiB`)
  : [];
console.log(
  `lanternkeeper: handed in ${gameSurvey.files} game files (${gameSurvey.bytes} bytes), ` +
    `${shotSizes.length} screenshots [${shotSizes.join(', ')}], dossier ${statSync(join(out, 'dossier.json')).size} bytes`,
);
