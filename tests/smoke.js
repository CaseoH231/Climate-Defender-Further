// ======================================================================
// SMOKE TESTS: the game loads, every scenario plays without errors,
// saving and loading round-trips, and old saves still load.
// ======================================================================

const SNAPSHOT_EXPR = "JSON.stringify({ money, population, pollution, approval, month, year, solar, wind, coal, forest, batteries, offices, factories, x: X })";

async function runSmoke() {
  log("SMOKE");

  // 1. Loads cleanly and asks for a scenario
  let w = await boot();

  check("game loads without errors", w.__errors.length === 0, w.__errors[0]);
  check("scenario picker is shown on a new game", w.document.getElementById("scenarioModal").style.display === "block");

  // 2. Every scenario plays two years
  for (const s of w.eval("SCENARIOS")) {
    w = await boot();
    w.startScenario(s.id);

    let error = null;

    try {
      play(w, 24);
    } catch (e) {
      error = e.message;
    }

    check("scenario " + s.id + " plays 24 months", !error && w.__errors.length === 0, error || w.__errors[0]);
  }

  // 3. Save and reload
  w = await boot();
  w.startScenario("coastal");
  play(w, 15);
  // Close anything open so the snapshot is taken from a calm state.
  makeBot(w).handleModals();
  w.updateUI();

  const before = w.eval(SNAPSHOT_EXPR);

  w = await boot({ keepSave: true });

  const after = w.eval(SNAPSHOT_EXPR);

  check("save and reload keeps the game state", before === after, diffJSON(before, after));
  check("reloaded game does not show the scenario picker", w.document.getElementById("scenarioModal").style.display !== "block");

  // 4. An old save with missing fields still loads
  w = await boot({ save: { money: 1234, population: 16000, month: 4, year: 2027, coal: 5, x: { co2: 425, scenario: "classic", started: true } } });
  check("old save loads", w.eval("money") === 1234 && w.eval("coal") === 5 && w.__errors.length === 0, w.__errors[0]);

  let error = null;

  try {
    play(w, 6);
  } catch (e) {
    error = e.message;
  }

  check("old save plays on", !error && w.__errors.length === 0, error || w.__errors[0]);

  // 5. Console commands
  w = await boot();
  w.startScenario("classic");
  w.difficulty = 12;
  w.quizzes = false;
  check("console: difficulty = 12", w.eval("settings.difficulty") === 12 && w.eval("DIFF.income") < 1);
  check("console: quizzes = false", w.eval("settings.quizzes") === false);

  if (typeof runMapTests === "function") await runMapTests();
}

// Shows the first differing key between two JSON snapshots.
function diffJSON(a, b) {
  const x = JSON.parse(a);
  const y = JSON.parse(b);
  const walk = (p, u, v) => {
    if (JSON.stringify(u) === JSON.stringify(v)) return null;
    if (u && v && typeof u === "object" && typeof v === "object") {
      for (const k of new Set([...Object.keys(u), ...Object.keys(v)])) {
        const d = walk(p + "." + k, u[k], v[k]);
        if (d) return d;
      }
    }
    return p + ": " + JSON.stringify(u)?.slice(0, 60) + " vs " + JSON.stringify(v)?.slice(0, 60);
  };

  return walk("state", x, y);
}
