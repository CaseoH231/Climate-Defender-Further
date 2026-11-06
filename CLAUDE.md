# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Climate Defender (dev version): an educational city/climate management game for school students, being grown from a school project into a full game. The school version lives in a separate repository and must not be changed. `ROADMAP.md` is the plan and hand-off document: read it before starting a feature, and update it (sections 2–5) when you finish one.

Plain HTML/CSS/JS: no build step, no modules, no libraries, no package manager. Run it by opening `index.html` or with VS Code Live Server.

## Tests

The tests drive the real game in headless Edge/Chrome from PowerShell (there is no Node or Python on this machine):

- `powershell -File tests/run.ps1`: smoke and map tests (exit code 0 = all passed)
- `powershell -File tests/run.ps1 -Suite balance -Games 10 [-Scenario classic,desert] [-Diff 6,12]`: balance bot win rates per scenario and difficulty
- `powershell -File tests/run.ps1 -Suite trace -Scenario classic -Diff 6`: one bot game logged month by month

`tests/runner.html` loads `../index.html` in an iframe (needs `--allow-file-access-from-files`, which `run.ps1` passes) and drives it through `w.eval(...)`, because top-level `let`/`const` game variables are not properties of `window`. Add new test groups to `tests/smoke.js` / `tests/map.test.js`. The bot (`tests/bot.js`) should play like a sensible human, so balance numbers measure the game rather than the bot.

Only launch Edge to run these scripts; don't take screenshots (the user checks visuals themselves).

## Architecture

- **One shared global scope.** Every file is a classic `<script>`, and load order in `index.html` matters: content data → `climate.js` (defines `X`) → feature modules → `script.js` (core) → `buildings.js` → `map.js` → `main.js` (start-up, last). Top-level code may only use things from earlier files; function bodies can use anything.
- **State:** the original game state is loose `let` variables in `script.js` (`money`, `population`, `pollution`, `approval`, building counters like `solar`, `coal`, `batteries`...). Everything added since lives in the `X` object (`climate.js`), which is saved wholesale. Put new state in `X`, and give it a default that still works when loading an old save (`loadExtra` merges saved objects into the defaults).
- **Monthly loop:** `nextMonth()` in `script.js` runs the economy, pollution breakdown, `climateMonth()` (CO₂ → temperature → sea level → tipping points → `coastalFlooding()` → `mapFloodMonth()`), `economyMonth()`, power balance and blackouts, growth, research, weather, events, `bankMonth()`, `updateHomes()`, goals, then `checkGameOver()` and `updateUI()`. `updateUI()` saves the game every time it runs.
- **Buildings and the map:** `BUILDINGS` in `buildings.js` is the single source of costs, refunds, upkeep, allowed terrain and effects. Each entry's `add()`/`remove()` changes the counters the maths reads. All placing and selling goes through `placeBuilding(type, tile)` / `removeBuildingAt(tile, mode)` in `map.js`, so `X.map.b` (one entry per tile) always matches the counters. `syncMapWithCounts()` repairs the map from the counters (new scenarios, saves from before the map). The map tests check that they match.
- **Map:** `X.map.t` is one terrain letter per tile (see `TERRAIN`). It is generated from a seed by `generateMap()` using the scenario's `MAP_LAYOUTS` entry and `X.mods.sites`. Rendering is DOM-based isometric diamonds (`clip-path`) with building art reused from the CSS classes in `style.css`. `renderMap()` only rebuilds when `X.map.rev` changes; call `mapChanged()` after editing `X.map`.
- **Difficulty:** "Year 3–12" (`settings.difficulty`) scales everything through `applyDifficulty()` (`DIFF`, limits) and `mapLandTarget()` (free land). Scenario starting numbers and goals are in `scenarios.js`.
- **Saving:** save keys end in `_dev1` so they don't clash with the school version. Bump the suffix only for breaking save changes.

## Conventions

- The audience is school students: in-game text is short, friendly and plain English, and new mechanics should teach a climate idea (add a glossary word, a quiz question or a coach tip in `learning.js`).
- The look is light and playful (Roblox-tycoon style). Colours come from the CSS variables in `style.css`.
- Code comments explain *why* in plain language, matching the existing style.
