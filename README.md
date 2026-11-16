[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kombattan/lanternkeeper/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kombattan/lanternkeeper/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Lanternkeeper

**Keep the last light alive until dawn.**

Lanternkeeper is an original arena-survival game for the browser, built for
[make.fun](https://make.fun)'s **best-game-01** bounty. You are the keeper of
the last lantern in a drowning dark. The Hollow — drifters, darts and brutes —
comes out of the night to drink its flame. Banish them with your sparkler
staff, gather the embers they drop, and feed the flame: it burns down on its
own, the Hollow drinks it faster, and only embers push back the dark. If the
flame dies, or the keeper falls, the night wins. Survive ten waves and dawn
breaks.

## Play

Serve the `game/` folder with any static file server and open `index.html`
in a desktop browser — no build step, no network requests, every asset is a
file in the repo (the sounds are synthesised live with WebAudio):

```sh
node serve.ts          # then open http://localhost:8080
```

- **WASD / arrow keys** — move
- **Mouse** — aim · **hold click** — fire
- **Walk over embers** to feed the flame
- **P** — pause · **M** — sound on/off · **R** — restart after a run

## How it is built

Plain ES modules under `game/js/`, one clear job each:

- `main.js` — game state, the run loop, and the hooks (banish, hurt, feed)
- `world.js` — constants, palette, seeded RNG
- `player.js` — the keeper: movement, aim, bolts
- `enemies.js` — the three Hollow kinds and the embers they drop
- `waves.js` — wave composition and the spawn director
- `render.js` — the lit scene, the darkness mask, HUD and panels
- `particles.js` — bursts, sparks and floating score text
- `audio.js` — a small WebAudio synth; the game ships no audio files
- `input.js` — keyboard and mouse
- `shots.js` — deterministic staged scenes behind the screenshots

`main.ts` at the root hands the entry in: it copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
kit's vendored library.

## License

MIT — see `LICENSE`.
