// ======================================================================
// SCENARIOS: different starting cities, each with a goal to reach.
// start = starting numbers, mods = how this place is different, goal = what you need to achieve.
// You win by keeping every check true for 12 months in a row before the deadline year.
// ======================================================================

const GOAL_HOLD_MONTHS = 12;

const SCENARIOS = [
  {
    id: "classic", icon: "🏙", name: "Classic City", stars: 2, blurb: "The standard start. Can you reach net zero by 2045?",
    start: {}, mods: {},
    goal: {
      from: 2036, year: 2045, text: "Reach net zero by 2045",
      checks: [
        { text: "Pollution 10 or less", test: () => pollution <= 10 },
        { text: "90% clean electricity", test: () => getCleanShare() >= 90 },
        { text: "25,000 people", test: () => population >= 25000 },
        { text: "Warming under 1.7°C", test: () => X.temp < 1.7 },
      ],
    },
  },
  {
    id: "coastal", icon: "🌊", name: "Coastal City", stars: 2, blurb: "Rising seas will flood you. Build sea walls and cut emissions.",
    start: { money: 2500, population: 20000, pollution: 55 },
    mods: { coastal: 1.2, sites: { hydro: 1, geo: 2, offshore: 10 } },
    goal: {
      from: 2034, year: 2044, text: "Grow to 30,000 people and keep warming low by 2044",
      checks: [
        { text: "30,000 people", test: () => population >= 30000 },
        { text: "70% clean electricity", test: () => getCleanShare() >= 70 },
        { text: "Warming under 1.8°C", test: () => X.temp < 1.8 },
      ],
    },
  },
  {
    id: "desert", icon: "🏜", name: "Desert Boomtown", stars: 3, blurb: "Hot and sunny. Great for solar, but air conditioning eats power.",
    start: { money: 3000, population: 18000, pollution: 60, coal: 10 },
    mods: { heat: 0.1, solarMul: 1.15, windMul: 0.8, sites: { hydro: 0, geo: 5, offshore: 0 } },
    goal: {
      from: 2034, year: 2044, text: "Become a clean 30,000-person city by 2044",
      checks: [
        { text: "30,000 people", test: () => population >= 30000 },
        { text: "90% clean electricity", test: () => getCleanShare() >= 90 },
        { text: "Pollution 15 or less", test: () => pollution <= 15 },
      ],
    },
  },
  {
    id: "mining", icon: "⛏", name: "Mining Town", stars: 3, blurb: "Coal built this town. Closing plants upsets the workers.",
    start: { money: 1500, population: 12000, pollution: 70, approval: 60, coal: 14 },
    mods: { coalJobs: 1.5 },
    goal: {
      from: 2030, year: 2040, text: "Close every coal and gas plant by 2040 and keep people happy",
      checks: [
        { text: "No coal plants", test: () => coal === 0 },
        { text: "No gas plants", test: () => X.plants.gas === 0 },
        { text: "15,000 people", test: () => population >= 15000 },
        { text: "Happiness 50% or more", test: () => approval >= 50 },
      ],
    },
  },
  {
    id: "island", icon: "🏝", name: "Island Nation", stars: 1, blurb: "Small, windy and low-lying. The sea is coming for you.",
    start: { money: 2500, population: 9000, pollution: 30, coal: 3, forest: 5 },
    mods: { coastal: 1.5, windMul: 1.2, baseDelta: -60, sites: { hydro: 0, geo: 1, offshore: 10 } },
    unlocks: ["wind"],
    goal: {
      from: 2030, year: 2040, text: "Grow to 12,000 people on clean power and survive the sea rise by 2040",
      checks: [
        { text: "95% clean electricity", test: () => getCleanShare() >= 95 },
        { text: "12,000 people", test: () => population >= 12000 },
        { text: "No coal or gas", test: () => coal === 0 && X.plants.gas === 0 },
        { text: "Happiness 60% or more", test: () => approval >= 60 },
      ],
    },
  },
  {
    id: "sandbox", icon: "🎈", name: "Free Play", blurb: "No goal. Build whatever you like and see how long you last.",
    start: {}, mods: {}, goal: null,
  },
];

function currentScenario() {
  return SCENARIOS.find((item) => item.id === X.scenario) || SCENARIOS[0];
}

function startScenario(id) {
  const scenario = SCENARIOS.find((item) => item.id === id) || SCENARIOS[0];
  const s = scenario.start;

  if (s.money !== undefined) money = s.money;
  if (s.population !== undefined) population = s.population;
  if (s.pollution !== undefined) pollution = s.pollution;
  if (s.approval !== undefined) approval = s.approval;
  if (s.coal !== undefined) coal = s.coal;
  if (s.forest !== undefined) forest = s.forest;

  Object.assign(X.mods, scenario.mods);
  X.scenario = scenario.id;
  generateMap(scenario.id, Math.floor(Math.random() * 1e9));
  syncMapWithCounts();
  X.grid = null;
  ensureGrid(); // lines sized for the starting city
  X.politics = null;
  ensurePolitics(); // politics.js
  X.budget = null;
  ensureBudget(); // fresh books (budget.js)
  X.started = true;
  X.goalStreak = 0;

  for (const research of scenario.unlocks || []) {
    researchProjects[research].unlocked = true;
    if (research === "wind") windUnlocked = true;
  }

  el.scenarioModal.style.display = "none";
  updatePaused();

  addNews(scenario.icon + " " + scenario.name + ": " + (scenario.goal ? scenario.goal.text : "Free play. No goal."));
  updateCoach(true);
  updateUI();
}

const STAR_NAMES = ["", "Easy", "Medium", "Hard"]; // scenario difficulty shown in the picker

function showScenarioPicker() {
  document.getElementById("scenarioList").innerHTML = SCENARIOS.map(
    (item) => `<button class="scenario-card" onclick="startScenario('${item.id}')">
      <span class="sc-ic">${item.icon}</span><b>${item.name}</b><small>${item.blurb}</small>
      <em>${item.goal ? "🎯 " + item.goal.text : "🎈 No goal"}</em>
      ${item.stars ? `<span class="stars">${"⭐".repeat(item.stars)} ${STAR_NAMES[item.stars]}</span>` : ""}</button>`,
  ).join("");

  el.scenarioModal.style.display = "block";
  updatePaused();
}

function goalChecks() {
  const goal = currentScenario().goal;

  return goal ? goal.checks.map((check) => ({ text: check.text, ok: !!check.test() })) : [];
}

// Called every month. Win when every check has held for a whole year.
function goalsMonth() {
  const goal = currentScenario().goal;

  if (!goal || X.won || X.endless || gameEnded) return;

  if (year < goal.from) {
    X.goalStreak = 0; // the targets only start counting from the "from" year
    return;
  }

  X.goalStreak = goalChecks().every((check) => check.ok) ? X.goalStreak + 1 : 0;

  if (X.goalStreak >= GOAL_HOLD_MONTHS) winGame();
}

function goalMissed() {
  const goal = currentScenario().goal;

  return !!goal && !X.won && !X.endless && year > goal.year;
}

function winGame() {
  X.won = true;
  sfx("win");

  const scenario = currentScenario();
  const months = totalMonths();
  const score = Math.max(0, 5000 - months * 4) + Math.floor(population / 20) + getClimateScore() * 10 + Math.round((2 - Math.min(2, X.temp)) * 500);
  const rows = [
    ["Scenario", scenario.icon + " " + scenario.name],
    ["Time taken", Math.floor(months / 12) + " years " + (months % 12) + " months"],
    ["Population", population.toLocaleString()],
    ["Global warming", "+" + X.temp.toFixed(1) + "°C"],
    ["Clean electricity", getCleanShare() + "%"],
    ["Score", score.toLocaleString()],
  ];

  document.getElementById("winText").innerHTML =
    `<h3>🎉 You did it!</h3><p>${scenario.goal.text}. Your city is a climate defender.</p>` +
    rows.map(([name, value]) => `<div class="kv"><span>${name}</span><strong>${value}</strong></div>`).join("");

  el.winModal.style.display = "block";
  updatePaused();
}

function keepPlaying() {
  X.endless = true;
  el.winModal.style.display = "none";
  updatePaused();
  updateUI();
}

// Shows the goal and its checks on the Goals tab.
function renderGoals() {
  const box = document.getElementById("goalBox");

  if (!box) return;

  const scenario = currentScenario();
  const goal = scenario.goal;

  if (!goal) {
    box.innerHTML = `<div class="goal-card"><b>${scenario.icon} ${scenario.name}</b><p>Free play. There is no goal, so build whatever you like.</p></div>`;
    return;
  }

  const checks = goalChecks();
  const left = goal.year - year + 1;

  box.innerHTML =
    `<div class="goal-card"><b>${scenario.icon} ${goal.text}</b>` +
    (X.endless ? `<p>Goal finished. You are playing for fun now.</p>` : `<p>${year < goal.from ? "Targets start counting in " + goal.from + ". " : ""}Keep every check true for ${GOAL_HOLD_MONTHS} months in a row before the end of ${goal.year} (${left} year${left === 1 ? "" : "s"} left).</p>`) +
    checks.map((c) => `<div class="check ${c.ok ? "ok" : ""}">${c.ok ? "✅" : "⬜"} ${c.text}</div>`).join("") +
    `<progress value="${X.goalStreak}" max="${GOAL_HOLD_MONTHS}"></progress><small>Holding: ${X.goalStreak}/${GOAL_HOLD_MONTHS} months</small></div>`;
}
