// ======================================================================
// GRID TESTS: lines join neighbouring districts, no scenario starts in a local
// blackout, full lines black out the districts behind them, upgrades and storms work.
// ======================================================================

async function runGridTests() {
  log("GRID");

  for (const id of ["classic", "coastal", "desert", "mining", "island"]) {
    const w = await boot();

    w.startScenario(id);

    const flow = w.gridFlow();

    check(id + ": starts with no overloaded lines", flow.localShort <= 0.5, "short " + flow.localShort.toFixed(1) + " MW");
    check(id + ": every district can be reached by power lines", connected(w), "some districts are cut off");
  }

  let w = await boot();

  w.startScenario("classic");

  const lines = w.eval("X.grid.lines");

  check("there is a line between each pair of neighbouring districts", Object.keys(lines).length === w.districtPairs().length);

  // With every line cut, districts without their own power black out.
  w.eval("Object.keys(X.grid.lines).forEach((k) => (X.grid.down[k] = 5))");

  const cut = w.gridFlow();

  check("cut lines leave some districts short", cut.localShort > 0);

  const approvalBefore = w.eval("approval");
  const streakBefore = w.eval("blackoutMonths");
  const blackout = w.eval("batteryCharge = 0; gridMonth(false)");

  check("a local blackout costs happiness and counts as a blackout month", blackout && w.eval("approval") < approvalBefore && w.eval("blackoutMonths") === streakBefore + 1);
  check("the Districts tab knows which districts were short", Object.keys(w.eval("X.grid.short")).length > 0);

  // Batteries on the grid cover a local shortfall
  w.eval("Object.keys(X.grid.lines).forEach((k) => (X.grid.down[k] = 5)); batteryCharge = 100000");
  check("batteries cover a local shortfall", !w.eval("gridMonth(false)") && w.eval("batteryCharge") < 100000);

  // Repairs and upgrades
  w.eval("X.grid.down = {}; money = 10000");

  const key = Object.keys(lines)[0];
  const capBefore = w.lineCapacity(key);
  const moneyBefore = w.eval("money");

  check("upgrading a line makes it carry more", w.upgradeLine(key) && w.lineCapacity(key) > capBefore);
  check("upgrading costs the listed price", w.eval("money") === moneyBefore - w.eval("LINE_COST[2]"));

  w.eval("X.programs.smartgrid = 2");
  check("Smart Grid makes lines carry more", w.lineCapacity(key) > w.eval("LINE_MW")[w.eval("X.grid.lines")[key]]);

  // Storms
  w.eval("Math.random = () => 0; stormHitsGrid()");
  check("a storm can knock a line down", Object.keys(w.eval("X.grid.down")).length === 1);
  w.eval("gridMonth(false)");
  check("a downed line is fixed the month after", Object.keys(w.eval("X.grid.down")).length === 0);

  // The views and the panel draw
  w.setMapView("grid");
  w.updateUI();
  check("the Grid view draws a line for each power line", w.document.querySelectorAll(".grid-svg line").length === Object.keys(lines).length);
  w.document.querySelector('[data-tab="tabDistricts"]').click();
  w.renderDistricts();
  check("the Districts tab lists the power lines", w.document.querySelectorAll(".line-row").length === Object.keys(lines).length);
  check("no errors in the grid", w.__errors.length === 0, w.__errors[0]);

  // Save and reload keeps the lines
  const saved = JSON.stringify(w.eval("X.grid.lines"));

  w.eval("saveGame()");
  w = await boot({ keepSave: true });
  check("save and reload keeps the power lines", JSON.stringify(w.eval("X.grid.lines")) === saved);
}

// Every district can reach Old Town through lines that are up.
function connected(w) {
  const n = w.eval("X.map.dn.length");
  const lines = Object.keys(w.eval("X.grid.lines")).map((k) => k.split("-").map(Number));
  const start = w.districtOf(w.eval("X.map.hall"));
  const seen = new Set([start]);
  const queue = [start];

  while (queue.length) {
    const a = queue.shift();

    for (const [x, y] of lines) {
      const b = x === a ? y : y === a ? x : -1;

      if (b >= 0 && !seen.has(b)) {
        seen.add(b);
        queue.push(b);
      }
    }
  }

  return seen.size === n;
}
