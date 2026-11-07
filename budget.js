// ======================================================================
// BUDGET: where the city's money comes from and where it goes.
// Every money change in the game is "booked" on a budget line with book(key, amount)
// (positive = money in, negative = money out). A month's lines are kept in
// X.budget.now while the month runs, then moved to X.budget.last by budgetMonth().
//
// Also here: the carbon market (sell credits when the city removes more pollution
// than it makes) and green grants from the national government.
//
//   X.budget.now / last   { line: amount } for this month / last month
//   X.budget.history      [{ m, running, invest }] for the last 24 months
//   X.budget.market       true once the city has joined the carbon market
//   X.budget.credits      money from credits last month, creditsTotal all time
//   X.budget.grants       clean-power grants already paid ({ 50: true, ... })
// ======================================================================

// "run" lines happen every month by themselves; "invest" lines are the player's choices.
const BUDGET_LINES = {
  residents: { icon: "👥", name: "Residents' taxes", group: "run" },
  power: { icon: "⚡", name: "Selling spare power", group: "run" },
  carbonTax: { icon: "💲", name: "Carbon tax", group: "run" },
  credits: { icon: "🌳", name: "Carbon credits", group: "run" },
  grants: { icon: "🏛", name: "Green grants", group: "run" },
  upkeep: { icon: "🏗", name: "Building upkeep", group: "run" },
  bigCity: { icon: "🏙", name: "Big-city extra upkeep", group: "run" },
  policies: { icon: "🌱", name: "Policy upkeep", group: "run" },
  waste: { icon: "☢", name: "Nuclear waste storage", group: "run" },
  govTax: { icon: "🏛", name: "Government tax", group: "run" },
  interest: { icon: "🏦", name: "Loan interest", group: "run" },
  damage: { icon: "🌊", name: "Floods and protests", group: "run" },
  events: { icon: "📰", name: "Events and quizzes", group: "run" },
  build: { icon: "🔨", name: "Building and selling", group: "invest" },
  research: { icon: "🔬", name: "Research", group: "invest" },
  programs: { icon: "📜", name: "New policies", group: "invest" },
  grid: { icon: "🗼", name: "Power line upgrades", group: "invest" },
  support: { icon: "🤝", name: "Support for citizens", group: "invest" },
  loan: { icon: "🏦", name: "Borrowing and repaying", group: "invest" },
};

const CREDIT_PRICE = 5; // $ per unit of pollution removed beyond what the city makes
const MARKET_JOIN_COST = 600;
const GREEN_GRANTS = [
  [50, 1000],
  [75, 1500],
  [90, 2000],
]; // [clean share %, grant]

function ensureBudget() {
  if (X.budget && X.budget.now) return;

  X.budget = { now: {}, last: {}, history: [], market: false, credits: 0, creditsTotal: 0, grants: {} };
}

// Records a money change on a budget line. Call it next to every `money +=` / `money -=`.
function book(key, amount) {
  if (!amount) return;
  ensureBudget();
  X.budget.now[key] = Math.round(((X.budget.now[key] || 0) + amount) * 100) / 100;
}

function budgetTotals(lines) {
  let running = 0;
  let invest = 0;
  let income = 0;
  let spending = 0;

  for (const key in lines) {
    const value = lines[key];
    const line = BUDGET_LINES[key];

    if (!line) continue;
    if (line.group === "run") {
      running += value;
      if (value > 0) income += value;
      else spending -= value;
    } else {
      invest += value;
    }
  }

  return { running: Math.round(running), invest: Math.round(invest), income: Math.round(income), spending: Math.round(spending) };
}

// ---------- Every month ----------

// Carbon credits and green grants. Called from nextMonth with the pollution breakdown.
function marketMonth(breakdown) {
  ensureBudget();

  let net = 0;

  for (const key in breakdown) if (key !== "weather") net += breakdown[key];

  X.budget.credits = 0;

  if (X.budget.market && net < 0) {
    const credits = Math.round(-net * CREDIT_PRICE * DIFF.price);

    money += credits;
    book("credits", credits);
    X.budget.credits = credits;
    X.budget.creditsTotal += credits;
    addNews("🌳 The city removed more pollution than it made and sold carbon credits for $" + credits + ".");
  }

  const clean = getCleanShare();

  for (const [share, grant] of GREEN_GRANTS) {
    if (clean >= share && !X.budget.grants[share]) {
      X.budget.grants[share] = true;
      money += grant;
      book("grants", grant);
      learnTerm("subsidy");
      addNews("🏛 Green grant! The national government paid $" + grant.toLocaleString() + " because " + share + "% of your electricity is now clean.");
      toast("🏛 Green grant: +$" + grant.toLocaleString(), "good");
    }
  }
}

// Closes the month's books. Called at the very end of nextMonth.
function budgetMonth() {
  ensureBudget();

  const totals = budgetTotals(X.budget.now);

  X.budget.last = X.budget.now;
  X.budget.now = {};
  X.budget.history.push({ m: totalMonths(), running: totals.running, invest: totals.invest });

  if (X.budget.history.length > 24) X.budget.history.shift();
}

// ---------- Joining the carbon market ----------

function joinMarket() {
  ensureBudget();

  if (gamePaused || X.budget.market) return false;
  if (!canBuy(MARKET_JOIN_COST)) return false;

  money -= MARKET_JOIN_COST;
  book("programs", -MARKET_JOIN_COST);
  X.budget.market = true;
  learnTerm("carboncredit");
  addNews("🌳 The city joined the carbon market. Every month you remove more pollution than you make, you sell carbon credits.");
  sfx("build");
  updateUI();
  return true;
}

function marketBoxHTML() {
  ensureBudget();

  return (
    `<h3>🌳 Carbon market</h3>` +
    `<p class="learn-note">Companies elsewhere pay for proof that pollution was taken out of the air. ` +
    (X.budget.market
      ? `You're in the market. When your forests, solar, wind and other clean-ups remove more pollution than the city makes, you earn $${CREDIT_PRICE} per unit. ` +
        `Last month: <b>$${X.budget.credits}</b>. So far: <b>$${X.budget.creditsTotal.toLocaleString()}</b>.</p>`
      : `Join once and earn $${CREDIT_PRICE} for every unit of pollution your city removes beyond what it makes.</p>` +
        `<div class="seg"><button onclick="joinMarket()" ${money < MARKET_JOIN_COST ? "disabled" : ""}>Join for $${MARKET_JOIN_COST}</button></div>`)
  );
}

// ---------- The Budget tab ----------

function budgetBar(value, max, good) {
  return `<span class="bud-bar"><i style="width:${max > 0 ? Math.min(100, Math.round((Math.abs(value) / max) * 100)) : 0}%;background:${good ? "#35c767" : "#ff6b6b"}"></i></span>`;
}

function renderBudget() {
  const box = document.getElementById("budgetList");
  const panel = document.getElementById("tabBudget");

  if (!box || !panel || !panel.classList.contains("active")) return;

  ensureBudget();

  const last = X.budget.last;
  const totals = budgetTotals(last);
  const lines = Object.keys(BUDGET_LINES).filter((key) => last[key]);
  const run = lines.filter((key) => BUDGET_LINES[key].group === "run");
  const invest = lines.filter((key) => BUDGET_LINES[key].group === "invest");
  const max = Math.max(1, ...run.map((key) => Math.abs(last[key])));
  const row = (key) => {
    const value = Math.round(last[key]);
    const line = BUDGET_LINES[key];

    return `<div class="bud-row"><span>${line.icon} ${line.name}</span>${budgetBar(value, max, value > 0)}<strong class="${value > 0 ? "good-text" : "bad-text"}">${value > 0 ? "+" : "−"}$${Math.abs(value).toLocaleString()}</strong></div>`;
  };

  const income = run.filter((key) => last[key] > 0).sort((a, b) => last[b] - last[a]);
  const spending = run.filter((key) => last[key] < 0).sort((a, b) => last[a] - last[b]);

  // Tips for a city that spends more than it earns.
  const tips = [];
  const bigCity = -(last.bigCity || 0);
  const upkeepAll = -(last.upkeep || 0) + bigCity;

  if (totals.running < 0) tips.push("📉 Your city spends more each month than it earns. That can't last: sell buildings you don't need, or grow the city so it pays more taxes.");
  if (bigCity > 0 && bigCity > upkeepAll * 0.25) tips.push("🏙 Big-city costs add $" + Math.round(bigCity) + " a month. Fewer, bigger power stations (or newer panels) cost less to run than lots of small ones.");
  if (!X.budget.market) tips.push("🌳 Join the carbon market (Policy tab) to earn money when your city removes more pollution than it makes.");
  if (X.loan > 0 && (last.interest || 0) < -50) tips.push("🏦 Interest costs $" + Math.round(-last.interest) + " a month. Paying off the loan saves that money.");

  // The last 24 months: did the city earn more than it spent?
  const history = X.budget.history;
  const peak = Math.max(1, ...history.map((h) => Math.abs(h.running)));
  const chart = history.length
    ? `<div class="bud-chart" title="Each bar is one month: green = earned more than it spent, red = spent more than it earned (not counting new buildings)">` +
      history.map((h) => `<i class="${h.running >= 0 ? "up" : "down"}" style="height:${Math.max(4, Math.round((Math.abs(h.running) / peak) * 50))}%"></i>`).join("") +
      `</div><small class="learn-note">The last ${history.length} months. Green bars: the city earned more than it spent.</small>`
    : "";

  setHTML(
    box,
    (lines.length
      ? `<div class="goal-card"><b>📒 Last month the city earned $${totals.income.toLocaleString()} and spent $${totals.spending.toLocaleString()}</b>` +
        `<p>Running balance: <b class="${totals.running >= 0 ? "good-text" : "bad-text"}">${totals.running >= 0 ? "+" : "−"}$${Math.abs(totals.running).toLocaleString()} a month</b>` +
        (totals.invest ? ` · New spending you chose: <b>${totals.invest >= 0 ? "+" : "−"}$${Math.abs(totals.invest).toLocaleString()}</b>` : "") +
        `</p>${chart}</div>`
      : `<p class="learn-note">Finish a month to see your city's budget.</p>`) +
      tips.map((t) => `<p class="d-tip">${t}</p>`).join("") +
      (income.length ? `<h3 class="build-sub">💵 Money in</h3>${income.map(row).join("")}` : "") +
      (spending.length ? `<h3 class="build-sub">💸 Money out</h3>${spending.map(row).join("")}` : "") +
      (invest.length
        ? `<h3 class="build-sub">🧾 Your choices this month</h3>` +
          invest.map((key) => {
            const value = Math.round(last[key]);

            return `<div class="bud-row"><span>${BUDGET_LINES[key].icon} ${BUDGET_LINES[key].name}</span><span></span><strong>${value > 0 ? "+" : "−"}$${Math.abs(value).toLocaleString()}</strong></div>`;
          }).join("")
        : ""),
  );
}
