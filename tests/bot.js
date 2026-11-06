// ======================================================================
// BALANCE BOT: plays the game the way a sensible player would.
// It builds clean power before closing coal, plants forests, researches
// and buys policies when it has spare money. Used by the balance suite.
// All game access goes through `g` (eval inside the game frame), so the bot
// works on top-level `let` variables as well as window functions.
// ======================================================================

const RESEARCH_ORDER = ["wind", "solar2", "battery", "greenCity", "electricBuses", "hydro", "geothermal", "offshore", "advancedSolar", "carbonCapture", "nuclear"];
const PROGRAM_ORDER = ["waste", "buses", "insulation", "farming", "smartgrid", "ev", "heatpumps"];

// Counts that work on every version of the game.
const COUNT_EXPR = {
  solar: "solar", wind: "wind", coal: "coal", forest: "forest", battery: "batteries",
  capture: "capturePlants", nuclear: "nuclearPlants", office: "offices", factory: "factories",
  gas: "X.plants.gas", hydro: "X.plants.hydro", geo: "X.plants.geo", offshore: "X.plants.offshore",
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
        if (money() >= p.cost + reserve) w.startResearch(id);
        break;
      }
    }

    // Power: keep a safety margin (bigger when lots of power depends on the weather),
    // then swap coal out once there is spare clean power.
    const demand = () => w.getPowerDemand();
    const weatherPower = () => g("getSolarOutput() + wind * WIND_MW + X.plants.offshore * EXTRA_PLANTS.offshore.mw");
    const margin = () => Math.max(40, demand() * 0.12) + weatherPower() * 0.3 - g("batteries * BATTERY_CAPACITY") * 0.5;
    const balance = () => w.getEnergyBalance();
    const steady = ["hydro", "geo", "offshore", "nuclear", "wind", "solar"];
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
  }

  return { handleModals, actions, g };
}
