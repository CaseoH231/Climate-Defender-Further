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
| `research2.js` | More research projects and the **shape of the tech tree** (`TECH_SHAPE`: branch and needs for every project), plus what each new project does when it finishes |
| `energy2.js` | Extra power plant numbers (gas, hydro, geothermal, offshore wind, tidal, biogas) and their power and upkeep maths |
| `programs.js` | Policies (transport, buildings, food/waste, adaptation), carbon tax, loans with a credit limit, bankruptcy, monthly economy hook |
| `scenarios.js` | Starting cities, goals, win/lose logic, scenario picker, Goals tab |
| `extras.js` | Toasts, sound (WebAudio, no files), achievements, history graph, settings window, speed control, `renderExtras()`, `initExtras()` |
| `script.js` | The core: money/people/pollution/approval, `nextMonth()`, UI drawing, save/load, difficulty |
| `buildings.js` | **`BUILDINGS`**: the one table of every building's cost, refund, upkeep, allowed terrain and effects. Generates the build menu |
| `map.js` | The 16×16 tile map: terrain generation, placing/selling on tiles, homes, coastal flooding, drawing and mouse input |
| `districts.js` | Districts (neighbourhoods): which district each tile is in, district power/pollution/happiness, smoke that drifts onto nearby homes, the Districts and Air map views, the Districts tab |
| `grid.js` | Power lines between districts (`X.grid`): monthly power flow (max-flow), local blackouts, line upgrades, storms knocking lines down, the Grid map view and the power line list |
| `politics.js` | Citizen groups (`X.politics`): each group's mood and reasons, protests, support actions, elections every 4 years, the People tab |
| `techtree.js` | The Research tab as a tree (branches, prerequisites) and `techEffect()`, which adds up the lasting bonuses of finished research |
| `budget.js` | The city's books (`X.budget`): every money change is booked on a budget line with `book(key, amount)`. Also the carbon market, green grants and the Budget tab |
| `main.js` | Starts the game. Loaded last, because `buildings.js` needs constants from `script.js` |
| `style.css` | Main look (light, playful) including the building art |
| `extras.css` | Styles for everything added in stage 1, plus the People tab, the tech tree and the Budget tab |
| `map.css` | The angled tile map, terrain, placement highlights, the Districts/Grid/Air views and art for the newer buildings |
| `tests/` | Automated tests and the balance bot (see section 5) |

**Conventions**
- New state goes in `X` (in `climate.js`) so it is saved automatically (`saveGame()` writes `x: X`, `loadGame()` calls `loadExtra()`). Give it a default that works with old saves (`ensureMap`, `ensureDistricts`, `ensureGrid`, `ensurePolitics` and `ensureBudget` in `main.js` fill in anything missing).
- **Money:** every `money += ...` / `money -= ...` must have a matching `book(line, amount)` (budget.js) on a line from `BUDGET_LINES`, or the Budget tab will be wrong. The budget test checks that each month's lines add up to the real change in money.
- New modules define functions and constants only; they are called from `script.js` hooks at run time. Top-level code in a file may only use things from files loaded *before* it.
- **Buildings:** add or change a building in `BUILDINGS` (`buildings.js`). Its `add()`/`remove()` update the counters (`solar`, `coal`, `X.plants.gas`...) that the maths uses. Only `placeBuilding` / `removeBuildingAt` (map.js) should change those counters, so the map and the numbers never disagree. `syncMapWithCounts()` repairs the map from the counters (used for new scenarios and old saves). A new power plant is easiest as an `EXTRA_PLANTS` entry (energy2.js) plus `EXTRA_TERRAIN` / `EXTRA_TERMS` / `EXTRA_HINTS` (buildings.js) and CSS art.
- **Bonuses from policies and research add up** through small helpers in `script.js`: `demandCut()`, `cityPollutionCut()`, `weatherShield(key)`, `forestCleaning()`, `captureCleaning()`, `batteryStore()`. Use these instead of reading `programEffect` or `techEffect` directly, so both always count.
- Balance numbers: difficulty scaling is in `applyDifficulty()` in `script.js` (`DIFF`). Land per difficulty is `mapLandTarget()` in `map.js`. The vote needed to win an election is `neededVote()` in `politics.js`. Scenario numbers are in `scenarios.js`. Building costs are only in `buildings.js` (and `EXTRA_PLANTS` in `energy2.js`).
- Save keys are `climateDefenderSave_dev1` and `climateDefenderSettings_dev1`, so the dev and school versions never clash. Bump the suffix when the save format changes in a breaking way. (Nothing so far has needed a bump: old saves are upgraded on load.)
- `settings` (difficulty year, quizzes, elections, sound, volume) is stored separately from the game save, so New Game doesn't reset it. Console commands still work: `difficulty = 12`, `quizzes = false`.

**Where the new systems hook into `script.js`** (search for these names)
`getPowerSupply` (adds `extraPower()`), `getPowerDemand` (climate heat, `demandCut()`), `getEnergyShares`, `upkeepMultiplier` / `buildingUpkeep` (big-city upkeep), `startResearch` (tech tree needs), `nextMonth` (income, upkeep from `baseUpkeep()` booked as separate budget lines, pollution breakdown, then `districtsMonth()`, `climateMonth()`, `economyMonth()`, `marketMonth()`, the power check then `gridMonth()`, `stormHitsGrid()` in the weather switch, `bankMonth()`, `updateHomes()`, `politicsMonth()`, and `budgetMonth()` to close the books), `runWeather` (uses `pickWeather()` and `scaledWeather()`), `checkGameOver` (4°C, missed goal, bankrupt; elections end the game from `politics.js`), `gameOver(title, reason, cause, extraHTML)`, `yearlyReport`, `saveGame`/`loadGame`, `updateUI` (calls `renderResearch()`, `renderBuildMenu()`, `updateCityView()` → `renderMap()`, `renderExtras()`, `renderDistricts()`, `renderPeople()`, `renderBudget()`), `tick()`/`startTicker()` (speed). Start-up is in `main.js`.

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
- **Hidden cost made visible:** big cities pay more upkeep on everything. The Build tab and Details tab show it.
- **Balance pass:** Year 12 penalties softened a little (events ×1.3 instead of ×1.4, blackouts −13 instead of −15, 5 months of low approval/blackouts instead of 4). Desert goal is 30,000 people (was 40,000). Island also needs 12,000 people. Scenarios show a difficulty rating (⭐ Easy to ⭐⭐⭐ Hard) in the picker.

### Stage 3: districts and the power grid (done)
- **Districts (Phase 2 item 2).** Each map is split into up to 6 named neighbourhoods (Old Town around the town hall, then names from the land: Harbour, Hilltop, Riverside, Sunvale...). Stored as `X.map.d` (one digit per tile) and `X.map.dn` (names), generated from the map seed; older maps get them on load. A district's type (Residential, Business, Industrial, Energy, Parkland, Open land) comes from what is built in it. The **🏘 Districts tab** shows each district's people, happiness, power made and used, pollution per month and air. These add up exactly to the city totals (the tests check this).
- **Local air pollution.** Coal, gas and factories blow smoke up to 2 tiles; forests and carbon capture clean the air 1 tile around them. Each home has a mood from its air, and each month the city's happiness moves by 0.4 × the average home mood (between −1.5 and +0.5). Placing a smoky building next to homes shows a warning, and the map has **🏘 Districts** and **💨 Air** views.
- **Power grid (Phase 2 item 3).** Every pair of neighbouring districts is joined by a power line (`X.grid.lines`, levels 1–4: 150 / 300 / 500 / 800 MW; upgrades cost $400 / $900 / $1,800). Each month `gridMonth()` works out how power flows from districts that make it to districts that use it (a max-flow on the district graph). If the city makes enough power but a full line can't deliver it, the districts behind it get a **local blackout**: happiness drops in proportion to the people affected (at least 2), and it counts towards the blackout streak. Batteries sit on the grid and cover local shortfalls first. Storms can knock a line down for a month (Storm Drains make that less likely), which is the "unconnected" case. Smart Grid adds 15% line capacity per level. Each scenario starts with lines big enough for 30% more demand. The **⚡ Grid** map view draws the lines, coloured by load, with moving dashes in the direction power flows. The Districts tab lists every line with an Upgrade button.
- New words (air quality, urban planning, power grid), quiz questions and coach tips.
- Sound waits for the player's first click or key press, so browsers no longer warn about the AudioContext.

### Stage 4: people and politics (done, Phase 3 item 5)
- **Five citizen groups** (`politics.js`): 👷 Workers, 👪 Families, 💼 Business owners, 🧑‍🎓 Young voters and 🌾 Farmers. Each has a share of the voters (Mining Town has more workers, Island more farmers and fishers, Desert more business owners). A group's happiness is the city's happiness plus the group's **mood**. Each month the mood moves a quarter of the way towards what the group thinks right now (`GROUP_REASONS`, between −20 and +20). Examples: workers want jobs and hate recent job losses; families want clean air near homes, no blackouts and cheap heating; businesses want growth and hate blackouts and the carbon tax; young voters want clean power, low warming and green policies, and *like* the carbon tax; farmers care about the weather, the warming climate and Smart Farming.
- **Jobs**: closing coal plants, gas plants and factories adds to `X.politics.jobLoss`, which fades over time (Mining Town's coal jobs count for more).
- **Protests**: a group below 25% happiness for 3 months protests (−1.5 happiness, −$150).
- **Support actions**: one per group, each usable once a year (Retrain workers, Help with bills, Small business grants, Youth climate council, Drought relief). They give a boost that fades, and retraining cancels job losses.
- **Elections every 4 years** (first in November 2028). Each group votes with its happiness, weighted by its share. The mayor needs 40% at Year 6 (46% at Year 12) or it's **🗳 Voted Out**, game over. Winning shows the results and gives +3 happiness. A chip next to the date counts down, and warnings come 3 months and 1 month before. Elections can be turned off in Settings (for classes that want the old game).
- **🗳 People tab**: the next election and today's vote, one card per group with its happiness, what it wants, its top reasons (green and red chips) and its support action.
- Achievements: Re-elected, Loved by All. New words (election, protest, just transition), quiz questions, coach tips and game-over tips.

### Stage 5: the tech tree (done, Phase 3 item 6)
- Research is a **tree with 5 branches**: ⚡ Clean energy, 🔋 Storage & grid, 🏙 Transport & buildings, 🛡 Adaptation and 🌳 Carbon removal. Projects can need others first (`needs`, in `TECH_SHAPE` in research2.js), and the Research tab draws each branch as columns joined by arrows.
- **13 new projects**: Solar Repowering (upgrades every existing farm to the newest panels), Tidal Power, Biogas, Grid-Scale Batteries (+60% storage), Smart Meters (−4% demand), High-Voltage Lines (+40% line capacity), Bike Lanes (−6% city pollution, +3 happiness), Green Building Code (−6% demand), Flood Warnings, Cool Roofs, Drought-Proof Crops (farmers happier, fewer bushfire losses), Direct Air Capture (capture plants remove 6), Forest Science (forests soak up 50% more).
- **Two new buildings in the build menu**: 🌀 Tidal Generator (45 MW steady; goes in the sea right next to the shore) and ♻ Biogas Plant (25 MW steady; removes 1 pollution a month; kept away from homes). Biogas has its own row in the Pollution Report.
- Some old projects now have prerequisites: Advanced Solar needs Solar Panels II, Offshore Wind needs Wind Energy, Geothermal needs Hydropower, Carbon Capture needs the Green City Program.
- New words (tidal power, biogas), quiz questions and a coach tip.

### Stage 6: budget and carbon market (done, most of Phase 3 item 8)
- **💰 Budget tab.** Every money change in the game is booked on a budget line (`book()` in `budget.js`). "Running" lines happen every month by themselves: residents' taxes, selling spare power, carbon tax, carbon credits, green grants, building upkeep, big-city extra upkeep, policy upkeep, nuclear waste, government tax, loan interest, floods and protests, events and quizzes. "Your choices" lines are the player's spending: building and selling, research, new policies, power lines, support for citizens, borrowing and repaying. The tab shows last month's money in and money out as bars, the running balance (did the city earn more than it spent, not counting new buildings?), a 24-month bar chart of that balance, and tips when something is wrong (losing money, big-city costs, loan interest).
- **Big-city upkeep is now visible** as its own budget line, so players can see what "too many small buildings" costs.
- **🌳 Carbon market** (Policy tab): join once for $600. After that, every month the city removes more pollution than it makes, it sells carbon credits for $5 per unit (scaled like power prices by difficulty).
- **🏛 Green grants**: the national government pays $1,000, $1,500 and $2,000 the first time clean power reaches 50%, 75% and 90% of the city's electricity. This rewards going clean early, when money is tightest.
- New words (subsidy, carbon credit, budget), quiz questions and two coach tips ("the city is losing money", "sell your clean-up").
- `tests/run.ps1` now closes the test browser after `-TimeoutMinutes` (default 90) instead of waiting forever. A long balance run once hung overnight.

### Balance changes in stages 3 to 5
- The big-city upkeep multiplier is gentler: it starts after 20 buildings (was 15), adds 2% per building (was 2.5%) and tops out at +100% (was +150%). A clean city needs many solar and wind farms, and the old numbers punished that hardest.
- Political numbers were tuned after the first bot runs: Mining Town fell from 90% to 30% wins at Year 6 when closing a coal plant cost 7 "jobs"; it is now 2 (3.5 in Mining Town) and job losses are capped.

---

## 3. Known gaps and rough edges

1. **Year 12 is still very hard** in most scenarios; money stays tight for years. The bot trace shows cities running for years with about $300 in the bank, so one bad spell (cloudy, still months or a storm) means blackouts it can't afford to fix, and then happiness collapses. Look at income vs upkeep (`DIFF.income`, `DIFF.maintenance`, coal upkeep of $30, the $150 cap on selling spare power) before anything else. The budget screen in Phase 3 item 8 is the natural place for this.
2. **Unlimited forests**: land is the only limit now. Forests are cheap, but each one adds to the big-city upkeep. Watch whether players fall into this trap.
3. Wind/solar output swings a lot with the weather, which causes surprise blackouts in an all-renewable city. The energy balance shown is for *this month's* weather. Consider showing a "worst case" number, or making batteries more visible.
4. Homes only fill tiles near the town hall. If the player fills all the land, homes stop spreading (the population still grows).
5. Map tiles are small on phones (the map scrolls sideways under 640px). Zoom/pan would help.
6. Wild woods and farmland can't be cleared. Clearing woods (losing a carbon sink) would make a good trade-off.
7. Districts are fixed regions; the player can't draw or rezone them. Homes always spread from the town hall, so the city can grow into its own industry. That is realistic, but players may want a way to steer it (zoning).
8. Power lines run between whole districts, not along tiles, and batteries count as one shared store rather than sitting in a particular district. Fine for now; tile-by-tile lines would be a big UI job.
9. Group moods are mostly small (a few points), so elections mainly follow overall happiness. That keeps them fair, but the groups could pull further apart (for example a bigger worker reaction in Mining Town) once the economy is less tight.
10. The tech tree has more research than one game can finish (about 360 research months in a game of about 240). That is deliberate (choices matter), but the "Scientist" achievement (finish all research) is now very hard.

---

## 4. Roadmap (in the order I'd do it)

### Phase 2: make it a real map
1. ~~Tile map with placeable buildings.~~ **Done.**
2. ~~Districts.~~ **Done** (stage 3).
3. ~~Power grid.~~ **Done** (stage 3).
4. ~~Flooding on the map.~~ **Done.**

### Phase 3: depth
5. ~~People and politics.~~ **Done** (stage 4).
6. ~~Tech tree.~~ **Done** (stage 5).
7. **More sectors with real numbers**: transport (cars/buses/rail/EV share), buildings (insulation, heat pumps), agriculture and waste, instead of fixed policy levels. Show a per-sector emissions pie chart.
8. **Economy**: ~~a budget screen, subsidies, carbon credits~~ **done** (stage 6). Still to do: jobs and unemployment (the `jobLoss` number in politics.js is the seed), so closing coal has a real economic cost and new clean industry creates work.
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
- `powershell -File tests/run.ps1`: all the automated tests (smoke, map, districts, grid, politics, tech tree, budget). The game loads, every scenario plays, save/reload round-trips, old saves load, placement rules hold, the map matches the building counts, district numbers add up to the city's, 125 generated maps all fit their special sites, flooding, local blackouts, elections, protests and research bonuses work, and the budget lines add up to the real change in money every month.
- `powershell -File tests/run.ps1 -Suite balance -Games 10`: the bot plays every scenario at Years 6, 9 and 12 and prints win rates and causes of defeat. Add `-Scenario desert -Diff 12` to run one cell. Use 20+ games when comparing small changes: 10 games swing by ±15%.
- `powershell -File tests/run.ps1 -Suite trace -Scenario classic -Diff 6`: one game, logged month by month (money, loan, happiness, pollution, power, buildings, group happiness twice a year), for working out *why* games are won or lost.
- You can also open `tests/runner.html?suite=smoke` in Live Server to watch it run.

**Manual:**
- Open the game, pick a scenario, place a few buildings, press **End Month** a few times, check the browser console (F12) for red errors.
- Save, reload the page and confirm everything comes back (`X.*`, buildings and the map).
- Use `difficulty = 12` and `quizzes = false` in the console for quick playtests.
- Any new state in `X` must be saved/loaded correctly and must not crash on an old save (use defaults).

**Balance targets:** Year 6 forgiving, Year 12 hard but possible.

BALANCE_TABLE_PLACEHOLDER
