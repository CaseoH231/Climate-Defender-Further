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

`tests/runner.html` loads `../index.html` in an iframe (needs `--allow-file-access-from-files`, which `run.ps1` passes) and drives it through `w.eval(...)`, because top-level `let`/`const` game variables are not properties of `window`. Add new test groups to `tests/smoke.js`, `tests/map.test.js`, `tests/districts.test.js`, `tests/grid.test.js`, `tests/politics.test.js`, `tests/techtree.test.js` or `tests/budget.test.js` (each needs a `<script>` tag in `tests/runner.html` and a call at the end of `runSmoke()`). When the bot plays a new mechanic badly, teach it to play like a sensible player rather than tuning the game to the bot. The bot (`tests/bot.js`) should play like a sensible human, so balance numbers measure the game rather than the bot.

Only launch Edge to run these scripts; don't take screenshots (the user checks visuals themselves). `run.ps1` closes the browser after `-TimeoutMinutes` (default 90). A full balance run (all scenarios and difficulties) is long, and the tests read the game files from disk, so don't edit game files while one is running.

## Architecture

- **One shared global scope.** Every file is a classic `<script>`, and load order in `index.html` matters: content data → `climate.js` (defines `X`) → feature modules → `script.js` (core) → `buildings.js` → `map.js` → `districts.js` → `grid.js` → `politics.js` → `techtree.js` → `budget.js` → `main.js` (start-up, last). Top-level code may only use things from earlier files; function bodies can use anything.
- **State:** the original game state is loose `let` variables in `script.js` (`money`, `population`, `pollution`, `approval`, building counters like `solar`, `coal`, `batteries`...). Everything added since lives in the `X` object (`climate.js`), which is saved wholesale. Put new state in `X`, and give it a default that still works when loading an old save (`loadExtra` merges saved objects into the defaults).
- **Monthly loop:** `nextMonth()` in `script.js` runs the economy, pollution breakdown, `climateMonth()` (CO₂ → temperature → sea level → tipping points → `coastalFlooding()` → `mapFloodMonth()`), `economyMonth()`, power balance and blackouts, growth, research, weather, events, `bankMonth()`, `updateHomes()`, goals, then `checkGameOver()` and `updateUI()`. `updateUI()` saves the game every time it runs.
- **Buildings and the map:** `BUILDINGS` in `buildings.js` is the single source of costs, refunds, upkeep, allowed terrain and effects. Each entry's `add()`/`remove()` changes the counters the maths reads. All placing and selling goes through `placeBuilding(type, tile)` / `removeBuildingAt(tile, mode)` in `map.js`, so `X.map.b` (one entry per tile) always matches the counters. `syncMapWithCounts()` repairs the map from the counters (new scenarios, saves from before the map). The map tests check that they match.
- **Map:** `X.map.t` is one terrain letter per tile (see `TERRAIN`). It is generated from a seed by `generateMap()` using the scenario's `MAP_LAYOUTS` entry and `X.mods.sites`. Rendering is DOM-based isometric diamonds (`clip-path`) with building art reused from the CSS classes in `style.css`. `renderMap()` only rebuilds when `X.map.rev` changes; call `mapChanged()` after editing `X.map`.
- **Districts:** `districts.js` splits the map into named neighbourhoods (`X.map.d`, `X.map.dn`). District stats are *views* of the city numbers: their power, pollution and people must add up to the city totals (tested), so change the core maths first and keep `tileMW` / `tilePollution` in step with it. The only new effect on the game is `districtsMonth()`: smoke near homes (`SMOKE`, `airMap()`) nudges happiness.
- **Power grid:** `grid.js` joins neighbouring districts with lines (`X.grid`). `gridFlow()` is a max-flow from each district's `made` to its `used` (from `districtStats()`), and `gridMonth()` turns any shortfall caused by full lines into a local blackout. `X.grid` is rebuilt whenever the district layout changes (`X.grid.d !== X.map.d`), and `gridSetup()` sizes the starting lines so no scenario begins in a blackout (tested).
- **Politics:** `politics.js` keeps five citizen groups in `X.politics`. A group's happiness is `approval` plus its mood, and the mood drifts towards the sum of its `GROUP_REASONS`. Elections (every 4 years, `holdElection()`) end the game through `gameOver(...)` when the weighted vote is below `neededVote()`. `checkGameOver()` returns early once `gameEnded`, so nothing overwrites that screen.
- **Tech tree:** research data lives in `research.js` and `research2.js` (`TECH_SHAPE` gives each project a `branch` and `needs`; `eff` holds lasting bonuses). `techtree.js` draws the tree and sums bonuses with `techEffect(key)`. Read bonuses through the helpers in `script.js` (`demandCut()`, `cityPollutionCut()`, `weatherShield()`, `forestCleaning()`, `captureCleaning()`, `batteryStore()`) so policies and research always both count, and keep `tilePollution` / `tileMW` in `districts.js` using the same helpers.
- **Budget:** every change to `money` must be booked with `book(line, amount)` (`budget.js`, lines in `BUDGET_LINES`) right next to it. `budgetMonth()` closes the books at the end of `nextMonth()`, and a test checks that each month's lines add up to the real change in money. The carbon market (`marketMonth()`) and green grants live there too.
- **Difficulty:** "Year 3–12" (`settings.difficulty`) scales everything through `applyDifficulty()` (`DIFF`, limits) and `mapLandTarget()` (free land). Scenario starting numbers and goals are in `scenarios.js`.
- **Saving:** save keys end in `_dev1` so they don't clash with the school version. Bump the suffix only for breaking save changes.

## Conventions

- The audience is school students: in-game text is short, friendly and plain English, and new mechanics should teach a climate idea (add a glossary word, a quiz question or a coach tip in `learning.js`).
- The look is light and playful (Roblox-tycoon style). Colours come from the CSS variables in `style.css`.
- Code comments explain *why* in plain language, matching the existing style.
