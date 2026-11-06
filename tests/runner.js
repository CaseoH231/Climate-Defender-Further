// ======================================================================
// TEST RUNNER: loads the real game (../index.html) in an iframe and drives it.
// Results are written into #out between ===RESULTS=== markers so run.ps1 can read them.
// ======================================================================

const params = new URLSearchParams(location.search);
const out = document.getElementById("out");
const lines = [];
let failures = 0;

function log(text) {
  lines.push(text);
  out.textContent = lines.join("\n");
}

function check(name, ok, detail) {
  if (!ok) failures++;
  log((ok ? "  PASS " : "  FAIL ") + name + (detail && !ok ? "  (" + detail + ")" : ""));
}

const SAVE_KEYS = ["climateDefenderSave_dev1", "climateDefenderSettings_dev1"];

// Loads a fresh copy of the game. keepSave = true reloads without wiping the save.
function boot({ difficulty = 6, keepSave = false, save = null } = {}) {
  if (!keepSave) SAVE_KEYS.forEach((k) => localStorage.removeItem(k));
  localStorage.setItem("climateDefenderSettings_dev1", JSON.stringify({ difficulty, quizzes: false, sound: false }));
  if (save) localStorage.setItem("climateDefenderSave_dev1", JSON.stringify(save));

  document.querySelectorAll("iframe").forEach((f) => f.remove());

  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");

    frame.src = "../index.html";
    frame.onload = () => {
      const w = frame.contentWindow;

      w.__errors = [];
      w.addEventListener("error", (e) => w.__errors.push(e.message));
      try {
        w.eval("clearInterval(tickHandle)"); // the test drives the months itself
        resolve(w);
      } catch (e) {
        reject(new Error("Game did not finish loading: " + e.message));
      }
    };
    document.body.append(frame);
  });
}

// Plays up to `months` months with the bot. Returns { result, months, cause }.
function play(w, months) {
  const bot = makeBot(w);

  for (let i = 0; i < months; i++) {
    let state = bot.handleModals();

    if (state) return finish(w, state, i);
    bot.actions();
    w.nextMonth();
    state = bot.handleModals();
    if (state) return finish(w, state, i + 1);
  }

  return finish(w, "running", months);
}

function finish(w, result, months) {
  const h3 = w.document.querySelector("#gameOverText h3");

  return { result, months, cause: result === "lost" && h3 ? h3.textContent : "", year: w.eval("year") };
}

async function runBalance() {
  const games = Number(params.get("games") || 10);
  const diffs = (params.get("diff") || "6,9,12").split(",").map(Number);
  const scenarios = (params.get("scenario") || "classic,coastal,desert,mining,island").split(",");

  log("BALANCE: " + games + " games per cell");
  log("scenario   diff  win%   avg win year  losses");

  const table = [];

  for (const scenario of scenarios) {
    for (const difficulty of diffs) {
      let wins = 0;
      const winYears = [];
      const causes = {};

      for (let i = 0; i < games; i++) {
        const w = await boot({ difficulty });

        w.startScenario(scenario);

        const r = play(w, 12 * 25);

        if (w.__errors.length) {
          failures++;
          log("  JS ERROR in " + scenario + ": " + w.__errors[0]);
        }

        if (r.result === "won") {
          wins++;
          winYears.push(r.year);
        } else {
          const cause = r.cause || r.result;
          causes[cause] = (causes[cause] || 0) + 1;
        }
      }

      const avg = winYears.length ? (winYears.reduce((a, b) => a + b, 0) / winYears.length).toFixed(1) : "-";
      const row = { scenario, difficulty, winRate: Math.round((wins / games) * 100), avgWinYear: avg, causes };

      table.push(row);
      log(scenario.padEnd(10) + " " + String(difficulty).padEnd(5) + " " + (row.winRate + "%").padEnd(6) + " " + String(avg).padEnd(13) + " " + JSON.stringify(causes));
    }
  }

  return table;
}

// One game, logged month by month (for working out why games are won or lost).
async function runTrace() {
  const scenario = (params.get("scenario") || "classic").split(",")[0];
  const difficulty = Number((params.get("diff") || "6").split(",")[0]);
  const w = await boot({ difficulty });
  const bot = makeBot(w);
  const g = (e) => w.eval(e);

  w.startScenario(scenario);
  log("TRACE " + scenario + " Year " + difficulty);
  log("date      money  loan  appr  poll  power  coal solar wind forest gas  news");

  for (let i = 0; i < 12 * 20; i++) {
    if (bot.handleModals()) break;
    bot.actions();
    w.nextMonth();

    const news = g("newsLog").slice(0, 12).filter((n) => /Approval|approval|SHORTAGE|bills|TIPPING|Flood|flood|destroyed/.test(n)).map((n) => n.slice(0, 50));

    log(
      (g("year") + "-" + g("month")).padEnd(9) + " " + String(g("money")).padStart(5) + " " + String(g("X.loan")).padStart(5) + " " +
        String(g("approval")).padStart(5) + " " + String(g("pollution")).padStart(5) + " " + String(w.getEnergyBalance()).padStart(6) + " " +
        String(g("coal")).padStart(4) + " " + String(g("solar")).padStart(5) + " " + String(g("wind")).padStart(4) + " " + String(g("forest")).padStart(6) + " " +
        String(g("X.plants.gas")).padStart(4) + "  " + news.join(" | "),
    );

    const state = bot.handleModals();

    if (state) {
      log("END: " + state + " " + (w.document.querySelector("#gameOverText h3")?.textContent || ""));
      break;
    }
  }
}

(async () => {
  const suite = params.get("suite") || "smoke";

  try {
    if (suite === "trace") await runTrace();
    if (suite === "smoke" || suite === "all") await runSmoke();
    if (suite === "balance" || suite === "all") await runBalance();
  } catch (e) {
    failures++;
    log("CRASH: " + (e && e.stack ? e.stack : e));
  }

  log("");
  log(failures ? "FAILED: " + failures : "ALL PASSED");
  out.textContent = "===RESULTS===\n" + lines.join("\n") + "\n===END===";
  document.title = "DONE";
})();
