# Climate Defender: Roadmap (hand-off for the next developer / Claude)

This is the **dev version** of Climate Defender. The school version is a separate repository and must not be changed.
The game is plain HTML/CSS/JS (no build step, no modules, no libraries). Open `index.html` or use VS Code Live Server.

---

## 1. How the code is organised

All scripts are classic `<script>` tags that share one global scope. **Load order matters** (see the bottom of `index.html`):

| File | What it holds |
|---|---|
| `facts.js`, `events.js`, `weather.js`, `research.js`, `upgrades.js`, `learning.js` | Content data (facts, random events, weather types, research list, glossary, quiz questions, coach tips, game-over tips) |
| `climate.js` | **`X`**: the object that holds all new-version state. CO₂, temperature, sea level, tipping points, weather weighting, flooding. Also adds glossary words and game-over tips |
| `research2.js` | Extra research projects (hydro, geothermal, offshore wind), added to `researchProjects` and `upgrades` |
| `energy2.js` | Extra power plant numbers (gas, hydro, geothermal, offshore wind) and their power, pollution and upkeep maths |
| `programs.js` | Policies (transport, buildings, food/waste, adaptation), carbon tax, loans with a credit limit, bankruptcy, monthly economy hook |
| `scenarios.js` | Starting cities, goals, win/lose logic, scenario picker, Goals tab |
| `extras.js` | Toasts, sound (WebAudio, no files), achievements, history graph, settings window, speed control, `renderExtras()`, `initExtras()` |
| `script.js` | The core: money/people/pollution/approval, `nextMonth()`, UI drawing, save/load, difficulty |
| `buildings.js` | **`BUILDINGS`**: the one table of every building's cost, refund, upkeep, allowed terrain and effects. Generates the build menu |
| `map.js` | The 16×16 tile map: terrain generation, placing/selling on tiles, homes, coastal flooding, drawing and mouse input |
| `main.js` | Starts the game. Loaded last, because `buildings.js` needs constants from `script.js` |
| `style.css` | Main look (light, playful) including the building art |
| `extras.css` | Styles for everything added in stage 1 |
| `map.css` | The angled tile map, terrain, placement highlights and art for the newer buildings |
| `tests/` | Automated tests and the balance bot (see section 5) |

**Conventions**
- New state goes in `X` (in `climate.js`) so it is saved automatically (`saveGame()` writes `x: X`, `loadGame()` calls `loadExtra()`).
- New modules define functions and constants only; they are called from `script.js` hooks at run time. Top-level code in a file may only use things from files loaded *before* it.
- **Buildings:** add or change a building in `BUILDINGS` (`buildings.js`). Its `add()`/`remove()` update the counters (`solar`, `coal`, `X.plants.gas`...) that the maths uses. Only `placeBuilding` / `removeBuildingAt` (map.js) should change those counters, so the map and the numbers never disagree. `syncMapWithCounts()` repairs the map from the counters (used for new scenarios and old saves).
- Balance numbers: difficulty scaling is in `applyDifficulty()` in `script.js` (`DIFF`). Land per difficulty is `mapLandTarget()` in `map.js`. Scenario numbers are in `scenarios.js`. Building costs are only in `buildings.js` (and `EXTRA_PLANTS` in `energy2.js`).
- Save keys are `climateDefenderSave_dev1` and `climateDefenderSettings_dev1`, so the dev and school versions never clash. Bump the suffix when the save format changes in a breaking way. (Adding the map did not need a bump: old saves get a map built around their buildings.)
- `settings` (difficulty year, quizzes on/off, sound, volume) is stored separately from the game save, so New Game doesn't reset it. Console commands still work: `difficulty = 12`, `quizzes = false`.

**Where the new systems hook into `script.js`** (search for these names)
`getPowerSupply` (adds `extraPower()`), `getPowerDemand` (climate heat + policy cuts), `getEnergyShares`, `upkeepMultiplier` / `buildingUpkeep` (big-city upkeep), `nextMonth` (income factor, upkeep from `baseUpkeep()`, pollution breakdown, then `climateMonth()`, `economyMonth()`, `bankMonth()`, `updateHomes()`), `runWeather` (uses `pickWeather()` and `scaledWeather()`), `checkGameOver` (4°C, missed goal, bankrupt), `yearlyReport`, `saveGame`/`loadGame`, `updateUI` (calls `renderBuildMenu()`, `updateCityView()` → `renderMap()`, `renderExtras()`), `tick()`/`startTicker()` (speed). Start-up is in `main.js`.

---

## 2. What has been done

### Stage 1 (done)
- **Climate model**: CO₂ ppm rises with net pollution, temperature follows slowly (delay), sea level rises, 4 tipping points (1.5/2/2.5/3 °C) with real effects, 4°C = game over. Weather gets worse when it is hotter.
- **Coastal flooding** that scales with sea level and the scenario, reduced by Sea Walls.
- **New power**: Gas, Hydro, Geothermal, Offshore Wind.
- **Policies** (3 levels each), **carbon tax** (4 levels) and **bank loans**.
- **Scenarios with goals and win condition**: Classic, Coastal, Desert, Mining Town, Island, Free Play. Win = keep every target true for 12 months in a row, from a start year to a deadline.
- **Settings window**, **speed button**, **18 achievements**, **toasts**, **sound effects**, **Stats tab** with graphs.

### Stage 2 (done)
- **Tile map (Phase 2 item 1).** A 16×16 angled map, generated from a seed per scenario (`X.map`). Terrain: grass, desert, beach, hills, mountains, farmland, wild woods, river, lake, sea. Special sites: 💧 river rapids (hydro), ♨ hot springs (geothermal), 🌊 shallow sea (offshore wind); their numbers come from each scenario's `mods.sites`. Nuclear must be next to water. Pick a building in the Build tab, then click a tile (valid tiles glow, a ghost shows the building, the bar under the map explains why a tile is not allowed). Bulldoze tool, click a building to sell it, right-click / Esc to put the tool down. Homes spread out from the town hall as the population grows (1 home per 1,500 people). Land replaces the old fixed solar/wind/forest caps; harder years have more farmland and woods, so less free land. Every plant type has map art, and active policies show as badges on the map.
- **Flooding on the map (Phase 2 item 4).** Each land tile knows how many steps it is from the sea. As `X.sea` rises, the lowest coast floods and whatever is on it is destroyed. Sea Walls push the water back (and show as stone on the coast).
- **Known gaps from stage 1, fixed:** the map shows every building; the click sound only plays on actions and Settings has a volume slider; building costs live in one table; loans have a credit limit based on city size, unpaid bills go onto the loan, and staying over the limit for too long is a 💸 Bankrupt game over; policy cards list what each level does (Electric Cars shows "+2% power use (charging)" in red); the 7 HUD tiles fit on one row (4 + 3 on medium screens); quiz questions, coach tips and dictionary words cover the new features and the map; automated tests are in `tests/`.
- **Hidden cost made visible:** every building past the 15th adds 2.5% to *all* upkeep (up to +150%). The Build tab and Details tab now show this.
- **Balance pass:** Year 12 penalties softened a little (events ×1.3 instead of ×1.4, blackouts −13 instead of −15, 5 months of low approval/blackouts instead of 4). Desert goal is 30,000 people (was 40,000). Island also needs 12,000 people (it was a free win). Scenarios show a difficulty rating (⭐ Easy to ⭐⭐⭐ Hard) in the picker. Latest results are in section 5.

---

## 3. Known gaps and rough edges

1. **Year 12 is still very hard** in most scenarios; money stays tight for years. Look at income vs upkeep at Year 12 (`DIFF.income`, `DIFF.maintenance`, coal upkeep of $30) before touching anything else. The bot is cautious, so a good human may do better.
2. **Unlimited forests**: land is the only limit now. Forests are cheap, but each one raises all upkeep by 2.5%. Watch whether players fall into this trap.
3. Wind/solar output swings a lot with the weather, which causes surprise blackouts in an all-renewable city. The energy balance shown is for *this month's* weather. Consider showing a "worst case" number, or making batteries more visible.
4. Homes only fill tiles near the town hall. If the player fills all the land, homes stop spreading (the population still grows).
5. Map tiles are small on phones (the map scrolls sideways under 640px). Zoom/pan would help.
6. Wild woods and farmland can't be cleared. Clearing woods (losing a carbon sink) would make a good trade-off.

---

## 4. Roadmap (in the order I'd do it)

### Phase 2: make it a real map
1. ~~Tile map with placeable buildings.~~ **Done.**
2. **Districts** (residential, industrial, commercial, park, energy). Each district has its own pollution, happiness and power use. Rolled up into the existing city totals so the current maths still works. (The tile map is ready for this: each tile can get a district.)
3. **Power grid**: plants connect to districts with power lines. Overloaded or unconnected lines cause local blackouts instead of one city-wide one. Batteries sit on the grid.
4. ~~Flooding on the map.~~ **Done.**

### Phase 3: depth
5. **People and politics**: citizen groups (workers, families, business owners, young voters, farmers) each with their own happiness. Policies please some and upset others. **Elections every 4 years**: lose and it's game over. Protests when a group is very unhappy. (The Mining Town `coalJobs` mechanic is the seed for this.)
6. **Tech tree** with branches and prerequisites instead of a flat research list (energy, storage, transport, adaptation, carbon removal). Some techs should change the build menu.
7. **More sectors with real numbers**: transport (cars/buses/rail/EV share), buildings (insulation, heat pumps), agriculture and waste, instead of fixed policy levels. Show a per-sector emissions pie chart.
8. **Economy**: jobs and unemployment (coal workers retraining), a budget screen (income vs spending), subsidies, carbon credits/trading. (Loans with a credit limit are done.)
9. **Other cities and countries** as simple scripted AIs. They pollute and can be pressured or helped (climate treaties, aid, tech sharing). Global CO₂ should combine all of them.
10. **More tipping points and climate hits**: droughts and food shortages, climate refugees (population pressure), ocean acidification.

### Phase 4: polish and structure
11. **Presentation**: animated map (smoke, rain, flooding, solar glints), music, a "world health" meter, mobile-friendly layout, accessibility (colour-blind-safe, keyboard play on the map).
12. **Technical**: split `script.js` into modules (economy, energy, ui, save), put the remaining balance numbers in one `config.js`, write a README, and add GitHub Actions to run the tests. (The tests folder and the balance bot are done.)
13. **Meta game**: unlockable scenarios and cosmetics, a score screen, shared seeds so friends can compare the same city and weather (maps are already generated from `X.map.seed`).
14. **Real-data mode**: optional real facts and numbers (real emissions per energy source, real costs) in the "In real life" boxes.

---

## 5. How to test changes

**Automated (headless Edge or Chrome, nothing to install):**
- `powershell -File tests/run.ps1`: smoke + map tests. The game loads, every scenario plays, save/reload round-trips, old saves load, placement rules hold, the map matches the building counts, flooding works.
- `powershell -File tests/run.ps1 -Suite balance -Games 10`: the bot plays every scenario at Years 6, 9 and 12 and prints win rates and causes of defeat. Add `-Scenario desert -Diff 12` to run one cell.
- `powershell -File tests/run.ps1 -Suite trace -Scenario classic -Diff 6`: one game, logged month by month, for working out *why* games are won or lost.
- You can also open `tests/runner.html?suite=smoke` in Live Server to watch it run.

**Manual:**
- Open the game, pick a scenario, place a few buildings, press **End Month** a few times, check the browser console (F12) for red errors.
- Save, reload the page and confirm everything comes back (`X.*`, buildings and the map).
- Use `difficulty = 12` and `quizzes = false` in the console for quick playtests.
- Any new state in `X` must be saved/loaded correctly and must not crash on an old save (use defaults).

**Balance targets:** Year 6 forgiving, Year 12 hard but possible. Bot win rates (10 games each), after the stage 2 balance pass:

| Scenario | Year 6 | Year 9 | Year 12 | Usual win year | Usual defeat |
|---|---|---|---|---|---|
| 🏙 Classic (⭐⭐) | 90% | 30% | 10% | 2036 | Government Collapse |
| 🌊 Coastal (⭐⭐) | 80% | 40% | 0% | 2034 | Government Collapse |
| 🏜 Desert (⭐⭐⭐) | 70% | 40% | 0% | 2034 | Government Collapse |
| ⛏ Mining Town (⭐⭐⭐) | 70% | 60% | 0% | 2031 | Government Collapse |
| 🏝 Island (⭐) | 100% | 100% | 100% | 2030 | none |

Before stage 2, Desert and Mining Town were never won (0% at every year), partly because the old bot was too slow to close coal. Year 12 Classic was already 0% then, so Year 12 being too hard is older than the map.

Next balance steps: make Year 12 "hard but possible" (aim for about 20–35% for the bot) by looking at the Year 12 economy, and give Island a reason to be harder on high years, or accept it as the easy scenario. Use `-Suite trace` to see how games are lost before changing numbers.
