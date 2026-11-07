// ======================================================================
// BALANCE BOT: plays the game the way a sensible player would.
// It builds clean power before closing coal, plants forests, researches
// and buys policies when it has spare money. Used by the balance suite.
// All game access goes through `g` (eval inside the game frame), so the bot
// works on top-level `let` variables as well as window functions.
// ======================================================================

const RESEARCH_ORDER = ["wind", "solar2", "smartMeters", "battery", "greenCity", "electricBuses", "bikeLanes", "hydro", "biogas", "geothermal", "offshore", "advancedSolar", "solarRepower", "forestScience", "gridBatteries", "hvLines", "greenBuildings", "tidal", "floodWarning", "carbonCapture", "nuclear", "droughtCrops", "coolRoofs", "directAir"];
const PROGRAM_ORDER = ["waste", "buses", "insulation", "farming", "smartgrid", "ev", "heatpumps"];

// Counts that work on every version of the game.
const COUNT_EXPR = {
  solar: "solar", wind: "wind", coal: "coal", forest: "forest", battery: "batteries",
  capture: "capturePlants", nuclear: "nuclearPlants", office: "offices", factory: "factories",
  gas: "X.plants.gas", hydro: "X.plants.hydro", geo: "X.plants.geo", offshore: "X.plants.offshore",
  tidal: "X.plants.tidal", biogas: "X.plants.biogas",
};

const LEGACY_BUILD = {
  solar: "buildSolar()", wind: "buildWind()", coal: "buildCoal()", forest: "buildForest()", battery: "buildBattery()",
  capture: "buildCapture()", nuclear: "buildNuclear()", office: "buildOffice()", factory: "buildFactory()",
  gas: "buildExtra('gas')", hydro: "buildExtra('hydro')", geo: "buildExtra('geo')", offshore: "buildExtra('offshore')",
};
const LEGACY_SELL = {
  solar: "sellSolar()", wind: "sellWind()", coal: "sellCoal()", forest: "sellForest()", battery: "sellBattery()",
  gas: "sellExtra('gas')",
};

function makeBot(w) {
  const g = (expr) => w.eval(expr);
  const count = (type) => g(COUNT_EXPR[type]);
  const hasAutoBuild = typeof w.autoBuild === "function";

  // Returns true if a building was actually added.
  function build(type) {
    const before = count(type);

    if (hasAutoBuild) w.autoBuild(type);
    else g(LEGACY_BUILD[type]);

    return count(type) > before;
  }

  function sell(type) {
    const before = count(type);

    if (hasAutoBuild) w.autoSell(type);
    else g(LEGACY_SELL[type]);

    return count(type) < before;
  }

  const cost = (type) => (hasAutoBuild ? w.buildingCost(type) : { solar: 200, wind: 350, forest: 50, battery: 1200, nuclear: 4000, capture: 1500, coal: 100, gas: 400, hydro: 2500, geo: 2000, offshore: 1800 }[type]);

  function chooseEvent() {
    const ev = g("currentEvent");
    const a = w.scaledOutcome(ev.accept, true);
    const d = w.scaledOutcome(ev.decline, false);
    const score = (o) => o.money / 40 + o.approval * 2 - o.pollution * 1.5 + o.population / 150;
    const canAfford = g("money") + a.money >= 0;

    if (canAfford && score(a) >= score(d)) w.acceptEvent();
    else w.declineEvent();
  }

  // Clears any window that pauses the game. Returns "won", "lost" or null.
  function handleModals() {
    for (let guard = 0; guard < 10; guard++) {
      const open = (id) => w.document.getElementById(id).style.display === "block";

      if (open("gameOverModal")) return "lost";
      if (open("winModal")) return "won";
      if (w.document.getElementById("electionModal") && open("electionModal")) {
        w.closeElection();
        continue;
      }
      if (open("eventModal")) chooseEvent();
      else if (open("reportModal")) w.closeReport();
      else if (open("quizModal")) w.closeQuiz();
      else return null;
    }

    return null;
  }

  function actions() {
    const reserve = 250;
    const money = () => g("money");

    // Research
    if (g("activeResearch") === null) {
      for (const id of RESEARCH_ORDER) {
        const p = g("researchProjects")[id];

        if (!p || p.unlocked) continue;
        if ({ hydro: "hydro", geothermal: "geo", offshore: "offshore" }[id] && !g("X.mods.sites")[{ hydro: "hydro", geothermal: "geo", offshore: "offshore" }[id]]) continue; // no sites in this city
        if (p.requires && g("population") < p.requires.population) continue;
        if (typeof w.missingNeeds === "function" && w.missingNeeds(id).length) continue; // tech tree: do the earlier project first
        if (id === "tidal" && w.freeTilesFor("tidal") === 0) continue; // no coast
        if (money() >= p.cost + reserve) w.startResearch(id);
        break;
      }
    }

    // Power: keep a safety margin (bigger when lots of power depends on the weather),
    // then swap coal out once there is spare clean power.
    const demand = () => w.getPowerDemand();
    const weatherPower = () => g("getSolarOutput() + wind * WIND_MW + X.plants.offshore * EXTRA_PLANTS.offshore.mw");
    const margin = () => Math.max(40, demand() * 0.12) + weatherPower() * 0.3 - g("batteryStore()") * 0.5;
    const balance = () => w.getEnergyBalance();
    const steady = ["hydro", "geo", "tidal", "biogas", "offshore", "nuclear", "wind", "solar"];
    const cheap = ["wind", "solar", "offshore", "hydro", "geo"];

    const buildPower = (options) => {
      for (const type of options) {
        if (money() >= cost(type) + reserve && build(type)) return true;
      }
      return false;
    };

    for (let i = 0; i < 6 && balance() < margin(); i++) {
      let built = buildPower(steady);

      if (!built && balance() < 0 && money() >= cost("gas") + 50) built = build("gas");
      if (!built) break;
    }

    // Pollution emergency: pollution is high, or rising while already noticeable.
    const pollution = g("pollution");
    const last = g("lastBreakdown");
    const trend = last ? Object.keys(last).reduce((sum, k) => sum + (k === "weather" ? 0 : last[k]), 0) : 1;
    const danger = pollution > g("POLLUTION_LIMIT") * 0.4 || (trend > 0 && pollution > 25);
    const canCloseCoal = () => g("approval") > 35;

    // Close coal while there is spare power (several at once if needed).
    for (let i = 0; i < 6 && count("coal") > 0 && balance() > margin() + 45 && canCloseCoal(); i++) sell("coal");

    // In an emergency, build cheap clean power so more coal can close.
    if (danger) {
      for (let i = 0; i < 4 && count("coal") > 0 && canCloseCoal() && buildPower(cheap); i++) {
        while (count("coal") > 0 && balance() > margin() + 45 && canCloseCoal()) {
          if (!sell("coal")) break;
        }
      }
    }

    if (count("gas") > 0 && balance() > margin() + 65) sell("gas");

    // Cheap carbon sinks: plant lots in an emergency, one a month while pollution is still there.
    const forests = danger ? 8 : pollution > 8 || trend > 0 ? 1 : 0;

    for (let i = 0; i < forests && money() > reserve + (danger ? 50 : 300); i++) {
      if (!build("forest")) break;
    }

    // Power lines: upgrade the busiest one when it is nearly full (or caused a blackout).
    if (typeof w.gridLines === "function") {
      const busy = w.gridLines().find((line) => line.level < 4 && (line.load >= 0.8 || g("Object.keys(X.grid.short).length") > 0 && line.load >= 0.6));

      if (busy && money() >= g("LINE_COST")[busy.level + 1] + reserve) w.upgradeLine(busy.key);
    }

    // Storage: more batteries as more power depends on the weather.
    if (g("batteryUnlocked") && count("battery") < 1 + weatherPower() / 250 && money() > 1500 + reserve) build("battery");

    // Policies when there is spare cash
    if (money() > 2600) {
      const coastal = g("X.mods.coastal") >= 1;
      const order = coastal ? ["seawall", ...PROGRAM_ORDER] : PROGRAM_ORDER;

      for (const id of order) {
        const p = g("PROGRAMS").find((item) => item.id === id);
        const level = w.programLevel(id);

        if (level < p.costs.length && money() >= p.costs[level] + 1500) {
          w.upgradeProgram(id);
          break;
        }
      }
    }

    if (g("year") >= 2029 && g("X.carbonTax") === 0) w.setCarbonTax(1);

    // Carbon market: join once the city cleans up more than it makes (the coach tip says so too).
    if (typeof w.joinMarket === "function" && !g("X.budget.market")) {
      const net = g("lastBreakdown ? Object.keys(lastBreakdown).reduce((s, k) => s + (k === 'weather' ? 0 : lastBreakdown[k]), 0) : 1");

      if (net < 0 && money() >= g("MARKET_JOIN_COST") + reserve + 300) w.joinMarket();
    }

    // People: help unhappy groups, especially when an election is coming.
    if (typeof w.supportGroup === "function" && g("X.politics")) {
      const soon = w.monthsUntilElection() <= 8;
      const groups = g("GROUPS").map((grp) => ({ id: grp.id, happy: w.groupHappiness(grp.id) })).sort((a, b) => a.happy - b.happy);

      for (const grp of groups) {
        const cost = g("SUPPORT")[grp.id].cost;

        if ((grp.happy < 40 || (soon && grp.happy < 60)) && !g("X.politics.cooldown")[grp.id] && money() >= cost + reserve) w.supportGroup(grp.id);
      }
    }
  }

  return { handleModals, actions, g };
}
