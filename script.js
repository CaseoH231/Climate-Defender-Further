// ======================================
// SETTINGS (change these numbers to rebalance the game)
// ======================================

const MONTH_SECONDS = 8; // seconds per month
const SAVE_KEY = "climateDefenderSave_dev1";

const BASE_POWER = 170; // existing grid (imports and old plants) that is always there
const COAL_MW = 40;
const WIND_MW = 35;
const OFFICE_MW = 50; // electricity used by each office
const FACTORY_MW = 80; // electricity used by each factory
const CAPTURE_MW = 40; // electricity used by each carbon capture plant
const NUCLEAR_MW = 300; // steady electricity from each nuclear plant, in any weather
const NUCLEAR_COST = 4000;
const NUCLEAR_DECOMMISSION = 800; // cost to shut a nuclear plant down
const NUCLEAR_MIN_POP = 20000; // residents needed for the first plant
const NUCLEAR_POP_PER_PLANT = 10000; // each extra plant needs this many more residents
const BATTERY_CAPACITY = 100; // MW each battery can store
const MAX_SOLD_MW = 100; // most spare electricity that can be sold per month
const COACH_GAP = 3; // months between Climate Coach tip changes
const FACT_EVERY = 3; // months between new climate facts

// ======================================
// DIFFICULTY (set from the console: difficulty = 12, or quizzes = false)
// ======================================
// The game is balanced for Year 6. A higher year makes money tighter, pollution and demand
// bigger, events nastier and the "game over" limits shorter. Lower years (down to 3) go easier.

const SETTINGS_KEY = "climateDefenderSettings_dev1"; // kept separate so New Game doesn't reset it
const settings = { difficulty: 6, quizzes: true, sound: true, volume: 0.5, elections: true };

try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));

  if (saved && typeof saved.difficulty === "number") settings.difficulty = Math.min(12, Math.max(3, Math.round(saved.difficulty)));
  if (saved && typeof saved.quizzes === "boolean") settings.quizzes = saved.quizzes;
  if (saved && typeof saved.sound === "boolean") settings.sound = saved.sound;
  if (saved && typeof saved.volume === "number") settings.volume = Math.min(1, Math.max(0, saved.volume));
  if (saved && typeof saved.elections === "boolean") settings.elections = saved.elections;
} catch (e) {}

let DIFF = {}; // multipliers, filled in by applyDifficulty()
let EVENT_CHANCE, QUIZ_REWARD;
let LOW_APPROVAL_LIMIT, BLACKOUT_LIMIT, POLLUTION_LIMIT;

function applyDifficulty() {
  const t = (settings.difficulty - 6) / 6; // 0 at Year 6, 1 at Year 12, negative below Year 6

  DIFF = {
    income: 1 - 0.06 * t, // money from residents
    maintenance: 1 + 0.12 * t, // building running costs
    tax: 1 + 0.3 * t, // government tax
    price: 1 - 0.2 * t, // price of spare electricity
    cityPollution: 1 + 0.3 * t, // pollution from everyday city life
    demand: 1 + 0.15 * t, // electricity the city wants
    growth: 1 - 0.2 * t, // how fast people move in
    penalty: 1 + 0.3 * t, // how hard bad events hit
    blackoutHit: Math.round(10 + 3 * t), // approval lost in a blackout
  };

  EVENT_CHANCE = 0.12 + 0.06 * t;
  QUIZ_REWARD = Math.round(300 * (1 - 0.4 * t));
  // Land is limited by the map instead (harder years have less of it, see mapLandTarget in map.js).
  LOW_APPROVAL_LIMIT = Math.max(3, Math.round(6 - 1.5 * t));
  BLACKOUT_LIMIT = Math.max(3, Math.round(6 - 1.5 * t));
  POLLUTION_LIMIT = Math.round(150 - 15 * t);
}

applyDifficulty();

function setDifficulty(value) {
  const match = String(value).match(/\d+/);
  const level = match ? Number(match[0]) : NaN;

  if (!(level >= 3 && level <= 12)) {
    console.warn("Pick a year from 3 to 12, for example: difficulty = 12");
    return settings.difficulty;
  }

  settings.difficulty = level;
  saveSettings();
  applyDifficulty();

  if (typeof updateUI === "function") updateUI();

  console.log("Difficulty is now Year " + level + (level === 6 ? " (normal)" : "") + ". It starts working from the next month.");
  return level;
}

function setQuizzes(value) {
  const off = value === false || /^(off|no|false|0|hide|none)$/i.test(String(value).trim());

  settings.quizzes = !off;
  saveSettings();

  console.log("Quiz pop-ups are now " + (settings.quizzes ? "ON" : "OFF") + ".");
  return settings.quizzes;
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
}

// Type these in the browser console (F12): difficulty = 12   |   difficulty = "year 9"   |   quizzes = false
Object.defineProperty(window, "difficulty", { get: () => settings.difficulty, set: setDifficulty, configurable: true });
Object.defineProperty(window, "quizzes", { get: () => settings.quizzes, set: setQuizzes, configurable: true });

// ======================================
// GAME VARIABLES
// ======================================

let money = 2000;
let population = 15000;
let pollution = 50;
let approval = 70;

let month = 1;
let year = 2025;

let solar = 0;
let wind = 0;
let coal = 8;
let forest = 3;
let batteries = 0;
let offices = 1;
let factories = 1;
let capturePlants = 0;
let nuclearPlants = 0;
let nuclearWaste = 0; // radioactive waste stays even after a plant is shut down

let batteryCharge = 0; // electricity saved in batteries
let solarBoosted = 0; // farms built after Solar Panels II (30 MW each)
let solarAdvanced = 0; // farms built after Advanced Solar Farms (45 MW each)

let windUnlocked = false;
let batteryUnlocked = false;
let solarUpgrade = false;
let carbonCaptureUnlocked = false;
let advancedSolarUnlocked = false;
let nuclearUnlocked = false;

let activeResearch = null;
let researchProgress = 0;

let currentEvent = null;
let lastEventId = null;
let gamePaused = false; // true while any pop-up window is open
let userPaused = false; // true when the player pressed Pause
let gameEnded = false;
let countdown = MONTH_SECONDS;

let blackoutMonths = 0;
let gdpPerCapita = 20000;
let totalGDP = 300000000;
// GDP Growth is the percentage change in total GDP since the start of the current year.
let gdpGrowth = 0;
let yearStartGDP = 300000000;
let lastYearGDPGrowth = 0;
let lowApprovalMonths = 0;
let confirmSkip = false;

let currentWeather = weatherEvents.find((w) => w.name === "Mild Weather") || weatherEvents[0];
let lastBreakdown = null; // where last month's pollution came from

// Learning
let glossaryUnlocked = [];
let quizAsked = [];
let quizCorrect = 0;
let quizTotal = 0;
let currentQuiz = null;
let pendingQuiz = false;
let coachShown = {};
let lastCoachMonth = -99;
let lastFactIndex = -1;

// ======================================
// CACHED DOM ELEMENTS (looked up once instead of on every update)
// ======================================

const el = Object.fromEntries(
  [
    "news", "ticker", "fact", "coachTitle", "coachText", "countdown", "weather", "weatherInfo",
    "date", "money", "population", "approval", "pollution", "gdpPerCapita", "gdpGrowth",
    "totalGDP", "power", "energyMix", "energyBalance", "solar", "wind", "coal", "forest",
    "battery", "capture", "nuclear", "nuclearWaste", "offices", "factories", "climateBar", "climateScore",
    "researchBar", "researchStatus", "researchButtons", "pollutionReport",
    "glossaryList", "glossaryCount", "buildMenu",
    "eventModal", "eventTitle", "eventDescription", "eventEducation", "eventRealLife",
    "eventAccept", "eventDecline", "eventAcceptStats", "eventDeclineStats", "reportModal", "reportText", "scenarioModal", "settingsModal", "winModal",
    "quizModal", "quizQuestion", "quizOptions", "quizFeedback", "quizContinue",
    "gameOverModal", "gameOverText", "endMonthButton", "pauseButton", "mapScene", "cityStatus",
  ].map((id) => [id, document.getElementById(id)]),
);

const MODAL_IDS = ["eventModal", "reportModal", "quizModal", "gameOverModal"]; // initExtras() adds the new windows

// The game is paused whenever any pop-up window is showing.
function updatePaused() {
  gamePaused = MODAL_IDS.some((id) => el[id].style.display === "block");
}

// ======================================
// DATE
// ======================================

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Months since the game began (0 on the first month).
function totalMonths() {
  return (year - 2025) * 12 + month - 1;
}

// ======================================
// NEWS SYSTEM
// ======================================

const NEWS_LIMIT = 15;
// Kept as an array so the feed never has to be re-read from (and re-split out of) the page.
const newsLog = [el.news.textContent.trim()];

function renderNews() {
  el.ticker.textContent = newsLog[0];

  el.news.replaceChildren(
    ...newsLog.map((message) => {
      const item = document.createElement("div");

      item.className = "news-item";
      item.textContent = message;

      return item;
    }),
  );
}

function addNews(message) {
  newsLog.unshift(message);

  if (newsLog.length > NEWS_LIMIT) newsLog.pop();

  renderNews();
}

// ======================================
// LEARNING: FACTS, DICTIONARY, COACH, QUIZ
// ======================================

function randomFact() {
  let index;

  do {
    index = Math.floor(Math.random() * facts.length);
  } while (index === lastFactIndex && facts.length > 1);

  lastFactIndex = index;
  el.fact.textContent = facts[index];
}

function renderGlossary() {
  el.glossaryCount.textContent = glossaryUnlocked.length + " / " + glossary.length + " words found";

  const found = glossary.filter((entry) => glossaryUnlocked.includes(entry.id));

  el.glossaryList.innerHTML = found.length
    ? found.map((entry) => `<p><strong>${entry.icon} ${entry.term}:</strong> ${entry.definition}</p>`).join("")
    : "<p>Words you discover while playing will appear here.</p>";
}

function learnTerm(id) {
  if (glossaryUnlocked.includes(id)) return;

  const entry = glossary.find((item) => item.id === id);

  if (!entry) return;

  glossaryUnlocked.push(id);
  addNews("📖 New word: " + entry.term + ". " + entry.definition);
  renderGlossary();
}

// Picks the first coach tip that fits the city right now (and hasn't been shown recently).
function updateCoach(force) {
  const now = totalMonths();

  if (!force && now - lastCoachMonth < COACH_GAP) return;

  const tip = coachTips.find(
    (item) => (coachShown[item.id] === undefined || now - coachShown[item.id] >= 12) && item.when(),
  );

  if (!tip) return;

  coachShown[tip.id] = now;
  lastCoachMonth = now;

  el.coachTitle.textContent = tip.title;
  el.coachText.textContent = tip.text;
}

function renderPollutionReport() {
  if (!lastBreakdown) {
    el.pollutionReport.textContent = "Finish a month to see where your pollution comes from.";
    return;
  }

  const rows = [
    ["🏭 Coal plants", lastBreakdown.coal],
    ["☀ Solar farms", lastBreakdown.solar],
    ["🌬 Wind turbines", lastBreakdown.wind],
    ["🌳 Forests", lastBreakdown.forest],
    ["🌎 Carbon capture", lastBreakdown.capture],
    ["🏙 City life", lastBreakdown.city || 0],
    ["🔥 Gas plants", lastBreakdown.gas || 0],
    ["♻ Biogas plants", lastBreakdown.biogas || 0],
    ["🌱 Policies", lastBreakdown.programs || 0],
    ["🌦 Weather", lastBreakdown.weather],
  ].filter((row) => row[1] !== 0);

  const net = rows.reduce((sum, row) => sum + row[1], 0);
  const format = (value) => (value > 0 ? "+" : "−") + Math.abs(value);

  el.pollutionReport.innerHTML =
    `<p class="report-note">Last month. Red adds pollution, green takes it away.</p>` +
    rows.map((row) => `<div class="report-row ${row[1] > 0 ? "bad" : "good"}"><span>${row[0]}</span><strong>${format(row[1])}</strong></div>`).join("") +
    `<div class="report-row total ${net > 0 ? "bad" : "good"}"><span>Total change</span><strong>${net === 0 ? "0" : format(net)}</strong></div>` +
    (nuclearPlants > 0 ? `<p class="report-note">⚛ Nuclear plants add no greenhouse gas, but they make radioactive waste (see Infrastructure).</p>` : "") +
    `<p class="report-note">${net > 0 ? "The city made more greenhouse gas than it removed, so pollution went up." : "The city removed at least as much greenhouse gas as it made. Well done!"}</p>`;
}

function showQuiz() {
  if (!settings.quizzes) return;

  let pool = quizQuestions.filter((item) => !quizAsked.includes(item.id));

  if (!pool.length) {
    quizAsked = [];
    pool = quizQuestions;
  }

  const question = pool[Math.floor(Math.random() * pool.length)];

  quizAsked.push(question.id);

  // Shuffle the answers so the right one isn't always in the same place.
  const order = question.options.map((_, i) => i).sort(() => Math.random() - 0.5);

  currentQuiz = { question, order, answered: false };

  el.quizQuestion.textContent = question.q;
  el.quizOptions.innerHTML = order
    .map((optionIndex, i) => `<button onclick="answerQuiz(${i})">${question.options[optionIndex]}</button>`)
    .join("");
  el.quizFeedback.textContent = "";
  el.quizContinue.style.display = "none";
  el.quizModal.style.display = "block";

  updatePaused();
}

function answerQuiz(choice) {
  if (!currentQuiz || currentQuiz.answered) return;

  currentQuiz.answered = true;

  const { question, order } = currentQuiz;
  const correct = order[choice] === question.answer;

  quizTotal++;

  [...el.quizOptions.children].forEach((button, i) => {
    button.disabled = true;

    if (order[i] === question.answer) button.classList.add("quiz-correct");
    else if (i === choice) button.classList.add("quiz-wrong");
  });

  if (correct) {
    quizCorrect++;
    money += QUIZ_REWARD;
    book("events", QUIZ_REWARD);
    el.quizFeedback.textContent = "✅ Correct! The city earned a $" + QUIZ_REWARD + " education bonus. " + question.explain;
    addNews("🧠 Quiz answered correctly! +$" + QUIZ_REWARD);
  } else {
    el.quizFeedback.textContent = "❌ Not quite. The answer was: " + question.options[question.answer] + ". " + question.explain;
    addNews("🧠 Quiz: not quite, but now you know!");
  }

  el.quizContinue.style.display = "inline-block";
  updateUI();
}

function closeQuiz() {
  el.quizModal.style.display = "none";
  currentQuiz = null;

  updatePaused();
}

// ======================================
// ENERGY
// ======================================

// Electricity made by solar farms (newer farms make more).
function getSolarOutput() {
  return (solar - solarBoosted - solarAdvanced) * 20 + solarBoosted * 30 + solarAdvanced * 45;
}

// Total electricity the city is making, including the effect of this month's weather.
function getPowerSupply() {
  const base = BASE_POWER + coal * COAL_MW - offices * OFFICE_MW - factories * FACTORY_MW - capturePlants * CAPTURE_MW + nuclearPlants * NUCLEAR_MW;
  const solarOutput = getSolarOutput() * (currentWeather.solar ?? 1) * X.mods.solarMul;
  const windOutput = wind * WIND_MW * (currentWeather.wind ?? 1) * X.mods.windMul;

  return Math.max(0, Math.round(base + solarOutput + windOutput + extraPower()));
}

function getPowerDemand() {
  // Prosperity increases demand, but diminishing returns prevent GDP from making it explode.
  const prosperityDemand = Math.pow(Math.max(0.5, gdpPerCapita / 20000), 0.55);
  // Demand also creeps up over time (more gadgets, more air conditioning), so standing still falls behind.
  const creep = 1 + totalMonths() * 0.003;

  return Math.floor((population / 50) * prosperityDemand * creep * DIFF.demand * (currentWeather.demand ?? 1) * climateDemandFactor() * (1 - demandCut()));
}

function getEnergyBalance() {
  return getPowerSupply() - getPowerDemand();
}

// What share of the electricity from power stations is renewable, nuclear or fossil.
function getEnergyShares() {
  const renewable = getSolarOutput() + wind * WIND_MW + extraCleanMW();
  const nuclear = nuclearPlants * NUCLEAR_MW;
  const total = renewable + nuclear + coal * COAL_MW + X.plants.gas * EXTRA_PLANTS.gas.mw;

  if (total <= 0) return { renewable: 0, nuclear: 0, fossil: 0 };

  const renewableShare = Math.round((renewable / total) * 100);
  const nuclearShare = Math.round((nuclear / total) * 100);

  return {
    renewable: renewableShare,
    nuclear: nuclearShare,
    fossil: Math.max(0, 100 - renewableShare - nuclearShare),
  };
}

// Low-carbon electricity: renewables plus nuclear.
function getCleanShare() {
  const shares = getEnergyShares();

  return shares.renewable + shares.nuclear;
}

// How many nuclear plants the city is big enough for (none until 20,000 residents).
function getNuclearAllowed() {
  if (population < NUCLEAR_MIN_POP) return 0;

  return 1 + Math.floor((population - NUCLEAR_MIN_POP) / NUCLEAR_POP_PER_PLANT);
}

// Big cities cost more to run: every building past the 20th adds 2% to ALL upkeep (up to +100%).
// The extra power plants (gas, hydro, geothermal, offshore) are not counted.
function upkeepMultiplier() {
  const count = solar + wind + coal + forest + batteries + offices + factories + capturePlants + nuclearPlants;

  return 1 + Math.min(1, Math.max(0, count - 20) * 0.02);
}

// Policies and finished research add up. Each cut is capped at 90%.
function demandCut() {
  return Math.min(0.9, programEffect("demand") + techEffect("demand"));
}

function cityPollutionCut() {
  return Math.min(0.9, programEffect("city") + techEffect("city"));
}

// Protection from one kind of bad weather ("heat", "fire" or "flood").
function weatherShield(key) {
  return Math.min(0.9, programEffect(key) + techEffect(key));
}

// Pollution one forest / one carbon capture plant removes each month.
function forestCleaning() {
  return (X.tipped.dieback ? 0.5 : 1) * (1 + techEffect("forest"));
}

function captureCleaning() {
  return 4 + techEffect("capture");
}

// How much electricity all the batteries can hold.
function batteryStore() {
  return Math.round(batteries * BATTERY_CAPACITY * (1 + techEffect("battery")));
}

// Upkeep for every building this month, before the policies and nuclear waste.
function buildingUpkeep() {
  return Math.floor(baseUpkeep() * upkeepMultiplier() * DIFF.maintenance + extraMaintenance() * DIFF.maintenance);
}

// ======================================
// CLIMATE SCORE
// ======================================

function getClimateScore() {
  return Math.max(0, Math.min(100, 100 - pollution));
}

// ======================================
// BUYING CHECKS
// ======================================

// Tells the player why they can't build something, instead of silently doing nothing.
function canBuy(cost, unlocked = true, lockedMessage = "") {
  if (gamePaused) return false;

  if (!unlocked) {
    addNews("🔒 " + lockedMessage);
    return false;
  }

  if (money < cost) {
    addNews("💸 Not enough funds. You need $" + cost + ".");
    return false;
  }

  return true;
}

// ======================================
// RESEARCH
// ======================================

function startResearch(type) {
  if (gamePaused) return;

  if (activeResearch !== null) {
    addNews("🔬 Another research project is already in progress.");
    return;
  }

  const project = researchProjects[type];

  if (!project || project.unlocked) return;

  if (missingNeeds(type).length) {
    addNews("🔒 " + project.name + " needs " + needsText(type) + " first.");
    return;
  }

  if (project.requires && population < project.requires.population) {
    addNews("👥 " + project.name + " needs a population of " + project.requires.population.toLocaleString() + ".");
    return;
  }

  if (money < project.cost) {
    addNews("💸 Not enough funds. You need $" + project.cost + " for " + project.name + ".");
    return;
  }

  money -= project.cost;
  book("research", -project.cost);
  activeResearch = type;
  researchProgress = 0;

  addNews("🔬 Research Started: " + project.name);
  sfx("click");
  updateUI();
}

function processResearch() {
  if (activeResearch === null) return;

  const project = researchProjects[activeResearch];
  const upgrade = upgrades[activeResearch];

  // Recover safely if a research ID was renamed or removed.
  if (!project || !upgrade) {
    activeResearch = null;
    researchProgress = 0;
    addNews("Research was cancelled because its project data could not be found.");
    return;
  }

  researchProgress++;

  if (researchProgress >= project.monthsRequired) {
    project.unlocked = true;
    activeResearch = null;
    researchProgress = 0;
    upgrade.apply();
  }
}

// The Research tab is drawn as a tech tree by renderResearch() in techtree.js.

// ======================================
// BUILDINGS
// ======================================

// Building, selling and placing live in buildings.js (the data) and map.js (the tiles).

// ======================================
// EVENTS
// ======================================

const CLIMATE_EVENT_IDS = ["bushfire", "heatwave", "flood", "oceanWarning", "oilspill"];

// Random, but never the same event twice in a row, and more likely to fit how the city is doing.
function pickEvent() {
  const weights = events.map((item) => {
    if (item.id === lastEventId) return 0;

    let weight = 1;

    if (CLIMATE_EVENT_IDS.includes(item.id)) weight += pollution / 60; // dirtier city, more disasters
    if (item.id === "populationloss" && approval < 40) weight += 1;
    if (item.id === "populationboom" && approval >= 70) weight += 1;
    if (item.id === "governmentGrant" && money < 500) weight += 1;
    if (item.id === "nuclearDebate" && !nuclearUnlocked) return 0; // only once nuclear power exists
    if (item.id === "nuclearInspection" && nuclearPlants === 0) return 0;

    return weight;
  });

  let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);

  for (let i = 0; i < events.length; i++) {
    roll -= weights[i];

    if (roll < 0) return events[i];
  }

  return events[events.length - 1];
}

// Bad things hurt more on higher difficulties. Costs written on the buttons (like "$300") never change.
function scaledOutcome(outcome, isAccept) {
  const hit = (value, badIfPositive) => ((badIfPositive ? value > 0 : value < 0) ? Math.round(value * DIFF.penalty) : value);

  return {
    ...outcome,
    money: isAccept ? outcome.money : hit(outcome.money, false),
    approval: hit(outcome.approval, false),
    pollution: hit(outcome.pollution, true),
    population: hit(outcome.population, false),
  };
}

function showEvent(eventData) {
  currentEvent = eventData;
  lastEventId = eventData.id;

  const accept = scaledOutcome(eventData.accept, true);
  const decline = scaledOutcome(eventData.decline, false);

  el.eventTitle.textContent = eventData.title;

  el.eventDescription.textContent = eventData.description;

  // Each choice shows what it does as small coloured chips.
  const chips = (outcome) =>
    [
      ["Money", outcome.money, "$"],
      ["Approval", outcome.approval, ""],
      ["Pollution", outcome.pollution, ""],
      ["Population", outcome.population, ""],
    ]
      .filter((row) => row[1] !== 0)
      .map(([name, value, unit]) => {
        // For pollution, a drop is the good direction.
        const good = name === "Pollution" ? value < 0 : value > 0;
        const text = (value > 0 ? "+" : "−") + unit + Math.abs(value);

        return `<span class="chip ${good ? "good" : "bad"}">${name} ${text}</span>`;
      })
      .join("") || `<span class="chip">No change</span>`;

  el.eventAcceptStats.innerHTML = chips(accept);
  el.eventDeclineStats.innerHTML = chips(decline);

  el.eventEducation.textContent = eventData.education;
  el.eventRealLife.textContent = eventData.realLife || "";
  el.eventRealLife.parentElement.open = false;
  el.eventDecline.textContent = eventData.declineText;

  // Accepting an event you cannot afford would be free, so the button is locked instead.
  const canAfford = money + accept.money >= 0;

  el.eventAccept.disabled = !canAfford;
  el.eventAccept.textContent = canAfford ? eventData.acceptText : eventData.acceptText + " (not enough funds)";

  (eventData.learns || []).forEach(learnTerm);

  el.eventModal.style.display = "block";
  updatePaused();
}

function acceptEvent() {
  const outcome = scaledOutcome(currentEvent.accept, true);

  money += outcome.money;
  book("events", outcome.money);
  pollution += outcome.pollution;
  approval += outcome.approval;
  population += outcome.population;

  if (currentEvent.acceptTerm) learnTerm(currentEvent.acceptTerm);

  addNews(outcome.news);
  closeEvent();
}

function declineEvent() {
  const outcome = scaledOutcome(currentEvent.decline, false);

  money += outcome.money;
  book("events", outcome.money);
  pollution += outcome.pollution;
  approval += outcome.approval;
  population += outcome.population;

  addNews(outcome.news);
  closeEvent();
}

function closeEvent() {
  el.eventModal.style.display = "none";

  currentEvent = null;
  updatePaused(); // stays paused if the report, quiz or game-over window is still showing

  updateUI(); // updateUI clamps values before drawing
}

// ======================================
// WEATHER
// ======================================

function runWeather() {
  const weather = pickWeather(); // hotter worlds get nastier weather

  currentWeather = weather;

  const effect = scaledWeather(weather);

  pollution += effect.pollution;
  approval += effect.approval;
  population += effect.population;

  el.weather.textContent = weatherLabel(weather.name);
  el.weatherInfo.textContent = "💡 " + weather.education;

  addNews(weather.news);

  return { ...weather, pollution: effect.pollution };
}

// ======================================
// REPORTS
// ======================================

function yearlyReport() {
  const rows = [
    ["Year", year - 1],
    ["Population", population.toLocaleString()],
    ["Funds", "$" + money.toLocaleString()],
    ["GDP growth for the year", lastYearGDPGrowth + "%"],
    ["GDP per capita", "$" + gdpPerCapita.toLocaleString()],
    ["Climate score", getClimateScore() + "/100"],
    ["Clean energy", getCleanShare() + "% of power station electricity"],
  ];

  if (quizTotal > 0) rows.splice(7, 0, ["Quiz", quizCorrect + " of " + quizTotal + " correct"]);

  if (nuclearUnlocked) rows.push(["Nuclear waste stored", nuclearWaste]);

  rows.push(["Approval", approval + "%"]);
  rows.push(...extraReportRows());

  el.reportText.innerHTML = rows.map(([name, value]) => `<div class="kv"><span>${name}</span><strong>${value}</strong></div>`).join("");

  el.reportModal.style.display = "block";
  updatePaused();
}

function closeReport() {
  el.reportModal.style.display = "none";

  // A quiz question follows every yearly report (unless the game just ended).
  if (pendingQuiz) {
    pendingQuiz = false;

    if (settings.quizzes && el.gameOverModal.style.display !== "block") showQuiz();
  }

  updatePaused(); // stays paused if the event, quiz or game-over window is still showing
}

// ======================================
// GAME OVERS
// ======================================

function gameOver(title, reason, cause, extraHTML = "") {
  gameEnded = true;

  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {}

  const monthsSurvived = totalMonths();
  const years = Math.floor(monthsSurvived / 12);
  const months = monthsSurvived % 12;
  const score =
    monthsSurvived * 10 + Math.floor(population / 100) + getClimateScore() * 5 + quizCorrect * 50;

  const rows = [
    ["You led the city for", years + " year" + (years === 1 ? "" : "s") + " and " + months + " month" + (months === 1 ? "" : "s")],
    ["Population", population.toLocaleString()],
    ["Climate score", getClimateScore() + "/100"],
    ["Clean energy", getCleanShare() + "%"],
    ...(quizTotal > 0 ? [["Quiz", quizCorrect + " of " + quizTotal + " correct"]] : []),
    ["Climate words found", glossaryUnlocked.length + " of " + glossary.length],
  ];

  el.gameOverText.innerHTML =
    `<h3>${title}</h3><p>${reason}</p>` + extraHTML +
    rows.map(([name, value]) => `<div class="kv"><span>${name}</span><strong>${value}</strong></div>`).join("") +
    `<p class="final-score">⭐ Final score: ${score.toLocaleString()}</p>` +
    `<h4>💡 What could you try next time?</h4>` +
    `<ul>${(gameOverTips[cause] || []).map((tip) => `<li>${tip}</li>`).join("")}</ul>`;

  el.gameOverModal.style.display = "block";
  updatePaused();
}

function checkGameOver() {
  if (gameEnded) return; // already over (for example after losing an election)

  if (pollution >= POLLUTION_LIMIT) {
    gameOver("🌎 Climate Crisis", "Pollution reached catastrophic levels.", "pollution");
  } else if (X.temp >= 4) {
    gameOver("🌡 Climate Catastrophe", "The world warmed by 4°C. Heat, fires, floods and failing crops overwhelmed the city.", "climate");
  } else if (goalMissed()) {
    gameOver("🎯 Missed the Target", "The deadline passed before the city reached its goal: " + currentScenario().goal.text + ".", "goal");
  } else if (blackoutMonths >= BLACKOUT_LIMIT) {
    gameOver(
      "⚡ Energy Collapse",
      "The city experienced major long-term power shortages.",
      "energy",
    );
  } else if (X.bankruptMonths >= LOW_APPROVAL_LIMIT) {
    gameOver("💸 Bankrupt", "The city owed the bank more than its credit limit for " + LOW_APPROVAL_LIMIT + " months in a row. The bank took over the city's budget.", "bankrupt");
  } else if (lowApprovalMonths >= LOW_APPROVAL_LIMIT) {
    gameOver(
      "🏛 Government Collapse",
      "Public approval stayed below 20% for " + LOW_APPROVAL_LIMIT + " months in a row. The government lost its mandate and the city management game ended.",
      "approval",
    );
  }
}

// ======================================
// SAVING AND LOADING
// ======================================

function saveGame() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        money, population, pollution, approval, month, year,
        solar, wind, coal, forest, batteries, offices, factories, capturePlants, nuclearPlants, nuclearWaste,
        batteryCharge, solarBoosted, solarAdvanced,
        windUnlocked, batteryUnlocked, solarUpgrade, carbonCaptureUnlocked, advancedSolarUnlocked, nuclearUnlocked,
        activeResearch, researchProgress,
        researchDone: Object.keys(researchProjects).filter((id) => researchProjects[id].unlocked),
        blackoutMonths, gdpPerCapita, totalGDP, gdpGrowth, yearStartGDP, lastYearGDPGrowth, lowApprovalMonths,
        weather: currentWeather.name,
        lastEventId, currentEventId: currentEvent ? currentEvent.id : null,
        lastBreakdown, news: newsLog,
        glossaryUnlocked, quizAsked, quizCorrect, quizTotal, pendingQuiz,
        x: X,
        coachShown, lastCoachMonth,
        coachTitle: el.coachTitle.textContent, coachText: el.coachText.textContent,
      }),
    );
  } catch (e) {
    // Saving can fail (for example in private browsing). The game still works without it.
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);

    if (!raw) return false;

    const s = JSON.parse(raw);
    const num = (value, fallback) => (typeof value === "number" && isFinite(value) ? value : fallback);

    money = num(s.money, money);
    population = num(s.population, population);
    pollution = num(s.pollution, pollution);
    approval = num(s.approval, approval);
    month = num(s.month, month);
    year = num(s.year, year);
    solar = num(s.solar, solar);
    wind = num(s.wind, wind);
    coal = num(s.coal, coal);
    forest = num(s.forest, forest);
    batteries = num(s.batteries, batteries);
    offices = num(s.offices, offices);
    factories = num(s.factories, factories);
    capturePlants = num(s.capturePlants, capturePlants);
    nuclearPlants = num(s.nuclearPlants, 0);
    nuclearWaste = num(s.nuclearWaste, 0);
    batteryCharge = num(s.batteryCharge, 0);
    solarBoosted = num(s.solarBoosted, 0);
    solarAdvanced = num(s.solarAdvanced, 0);

    windUnlocked = !!s.windUnlocked;
    batteryUnlocked = !!s.batteryUnlocked;
    solarUpgrade = !!s.solarUpgrade;
    carbonCaptureUnlocked = !!s.carbonCaptureUnlocked;
    advancedSolarUnlocked = !!s.advancedSolarUnlocked;
    nuclearUnlocked = !!s.nuclearUnlocked;

    activeResearch = researchProjects[s.activeResearch] ? s.activeResearch : null;
    researchProgress = num(s.researchProgress, 0);
    (s.researchDone || []).forEach((id) => {
      if (researchProjects[id]) researchProjects[id].unlocked = true;
    });

    blackoutMonths = num(s.blackoutMonths, 0);
    gdpPerCapita = num(s.gdpPerCapita, gdpPerCapita);
    totalGDP = num(s.totalGDP, totalGDP);
    gdpGrowth = num(s.gdpGrowth, 0);
    yearStartGDP = num(s.yearStartGDP, yearStartGDP);
    lastYearGDPGrowth = num(s.lastYearGDPGrowth, 0);
    lowApprovalMonths = num(s.lowApprovalMonths, 0);
    if (s.x) loadExtra(s.x);

    currentWeather = weatherEvents.find((w) => w.name === s.weather) || currentWeather;
    lastEventId = s.lastEventId || null;
    lastBreakdown = s.lastBreakdown || null;

    if (Array.isArray(s.news) && s.news.length) {
      newsLog.splice(0, newsLog.length, ...s.news.slice(0, NEWS_LIMIT));
    }

    glossaryUnlocked = Array.isArray(s.glossaryUnlocked) ? s.glossaryUnlocked : [];
    quizAsked = Array.isArray(s.quizAsked) ? s.quizAsked : [];
    quizCorrect = num(s.quizCorrect, 0);
    quizTotal = num(s.quizTotal, 0);
    pendingQuiz = !!s.pendingQuiz;
    coachShown = s.coachShown || {};
    lastCoachMonth = num(s.lastCoachMonth, -99);

    if (s.coachTitle) el.coachTitle.textContent = s.coachTitle;
    if (s.coachText) el.coachText.textContent = s.coachText;

    el.weather.textContent = weatherLabel(currentWeather.name);
    el.weatherInfo.textContent = "💡 " + currentWeather.education;

    // An event that was open when the page closed comes back, so it can't be skipped.
    const savedEvent = events.find((item) => item.id === s.currentEventId);

    if (savedEvent) showEvent(savedEvent);

    return true;
  } catch (e) {
    return false;
  }
}

function newGame(skipConfirm) {
  if (!skipConfirm && !confirm("Start a new game? Your saved progress will be deleted.")) return;

  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {}

  gameEnded = true; // stops the game saving itself again before the page reloads
  location.reload();
}

// ======================================
// SAFETY
// ======================================

function clampValues() {
  money = Math.max(0, money);
  pollution = Math.max(0, pollution);
  population = Math.max(1000, population);
  approval = Math.round(Math.max(0, Math.min(100, approval)) * 10) / 10;
}

// ======================================
// MONTH PROCESSING
// ======================================

function nextMonth() {
  // Prevent manual or accidental month advances while a modal pauses the game.
  if (gamePaused) return;

  addNews("📅 " + monthNames[month - 1] + " " + year + " ended.");

  learnTerm("greenhouse");
  learnTerm("climateweather");

  // Every nuclear plant adds waste each month, and the stored waste costs money to look after.
  nuclearWaste += nuclearPlants;

  if (nuclearWaste > 0) learnTerm("radwaste");

  const income = Math.floor((population / 32) * DIFF.income * climateIncomeFactor());

  const lateGameMaintenanceMultiplier = upkeepMultiplier();
  const maintenance = Math.floor(
    baseUpkeep() * lateGameMaintenanceMultiplier * DIFF.maintenance, // upkeep numbers are in buildings.js
  ) + nuclearWaste + Math.floor(extraMaintenance() * DIFF.maintenance + programUpkeep()); // waste storage: $1 per unit each month

  money += income;
  money -= maintenance;

  // The same maintenance split into budget lines (budget.js), so players can see what the big-city extra costs.
  const bigCityExtra = Math.floor(baseUpkeep() * lateGameMaintenanceMultiplier * DIFF.maintenance) - Math.floor(baseUpkeep() * DIFF.maintenance);

  book("residents", income);
  book("bigCity", -bigCityExtra);
  book("policies", -programUpkeep());
  book("waste", -nuclearWaste);
  book("upkeep", -(maintenance - bigCityExtra - programUpkeep() - nuclearWaste));

  if (year > 2025 || (year === 2025 && month >= 3)) {
    const governmentTax = Math.floor((totalGDP / 5000000) ** 0.72 * DIFF.tax);

    money -= governmentTax;
    book("govTax", -governmentTax);

    addNews("🏛 Government Tax: -$" + governmentTax);
  }

  // Where this month's pollution comes from (shown in the Pollution Report).
  const breakdown = {
    coal: coal * 2,
    solar: -solar,
    wind: -wind * 2,
    forest: -Math.round(forest * forestCleaning()),
    capture: -capturePlants * captureCleaning(),
    city: Math.round((population / 7000 + factories * 0.5) * DIFF.cityPollution * (1 - cityPollutionCut()) * (1 - X.carbonTax * 0.03)), // cars, rubbish, heating, factories
    gas: X.plants.gas * EXTRA_PLANTS.gas.pollution,
    biogas: X.plants.biogas * EXTRA_PLANTS.biogas.pollution,
    programs: -programEffect("poll"),
    weather: 0,
  };

  pollution += breakdown.coal + breakdown.solar + breakdown.wind + breakdown.forest + breakdown.capture + breakdown.city + breakdown.gas + breakdown.biogas + breakdown.programs;
  approval += programEffect("approval");
  districtsMonth(); // smoky or leafy neighbourhoods (districts.js)

  climateMonth(breakdown); // CO2, temperature, sea level, tipping points
  economyMonth(breakdown); // carbon tax and loan interest
  marketMonth(breakdown); // carbon credits and green grants (budget.js)

  // Electricity: spare power charges the batteries, then gets sold. Shortages draw from the batteries first.
  const energyBalance = getEnergyBalance();

  if (energyBalance > 0) {
    const stored = Math.min(energyBalance, batteryStore() - batteryCharge);
    const sold = Math.min(energyBalance - stored, MAX_SOLD_MW);
    const electricityIncome = Math.round(sold * 1.5 * DIFF.price);

    batteryCharge += stored;
    money += electricityIncome;
    book("power", electricityIncome);
    blackoutMonths = 0;

    if (stored > 0) addNews("🔋 Batteries saved " + stored + " MW of spare electricity.");

    addNews("⚡ Sold electricity for $" + electricityIncome + (energyBalance - stored > MAX_SOLD_MW ? " (the grid can only buy " + MAX_SOLD_MW + " MW a month)" : ""));
  } else if (energyBalance < 0) {
    const fromBatteries = Math.min(-energyBalance, batteryCharge);
    const shortage = -energyBalance - fromBatteries;

    batteryCharge -= fromBatteries;

    if (fromBatteries > 0) addNews("🔋 Batteries covered " + fromBatteries + " MW of the shortage.");

    if (shortage > 0) {
      blackoutMonths++;
      approval -= DIFF.blackoutHit;
      learnTerm("blackout");

      addNews("⚡ POWER SHORTAGE! Approval -" + DIFF.blackoutHit + ". Blackout Streak: " + blackoutMonths + "/" + BLACKOUT_LIMIT);
    } else {
      blackoutMonths = 0;
    }
  } else {
    blackoutMonths = 0;
  }

  // Even with enough power overall, full power lines can black out some districts (grid.js).
  gridMonth(energyBalance < 0);

  let growth = 0;

  if (approval >= 90) growth += 120;
  else if (approval >= 70) growth += 80;
  else if (approval >= 50) growth += 40;
  else if (approval >= 30) growth += 10;
  else growth -= 50;

  if (pollution <= 20) growth += 50;
  else if (pollution <= 50) growth += 20;
  else if (pollution <= 100) growth -= 20;
  else growth -= 100;

  population += Math.round(growth > 0 ? growth * DIFF.growth : growth);

  // Dirty air makes people unhappy, even when the lights stay on.
  if (pollution > 80) approval -= 1;
  else if (pollution > 60) approval -= 0.5;

  // High-income cities still grow, but each additional dollar becomes harder to earn.
  const gdpDifficulty = Math.pow(Math.max(1, gdpPerCapita / 20000), 1.6);

  // Calculate this month's economic momentum separately from the year-to-date display.
  const monthlyGDPGrowth =
    Math.round(((approval / 25 + energyBalance / 60 - pollution / 30) / gdpDifficulty) * 10) / 10;

  // Each office helps the economy grow a little faster (up to 10 offices count).
  const previousGDPPerCapita = gdpPerCapita;
  gdpPerCapita += gdpPerCapita * (monthlyGDPGrowth / 100) * (0.05 + Math.min(offices, 10) * 0.01);
  gdpPerCapita = Math.max(1000, Math.round(gdpPerCapita));

  totalGDP = population * gdpPerCapita + factories * 500000;

  // Keep approval connected to both prosperity and whether GDP per person is improving.
  // The effects are intentionally small so power, pollution and events still matter more.
  const perCapitaChangePercent =
    previousGDPPerCapita > 0
      ? ((gdpPerCapita - previousGDPPerCapita) / previousGDPPerCapita) * 100
      : 0;
  const prosperityEffect = Math.max(
    -0.75,
    Math.min(0.75, ((gdpPerCapita - 20000) / 20000) * 0.75),
  );
  const growthEffect = Math.max(-0.4, Math.min(0.4, perCapitaChangePercent * 2));
  approval += prosperityEffect + growthEffect;
  approval = Math.round(approval * 10) / 10;

  // Display GDP growth as the percentage change in total GDP since this year's start.
  gdpGrowth =
    yearStartGDP > 0
      ? Math.round(((totalGDP - yearStartGDP) / yearStartGDP) * 1000) / 10
      : 0;

  processResearch();

  const weather = runWeather();

  breakdown.weather = weather.pollution;
  lastBreakdown = breakdown;

  switch (weather.name) {
    case "Heatwave":
      approval -= 3;
      addNews("🌡 Heatwave: the city needs about 15% more electricity this month.");
      break;

    case "Windy Conditions": {
      const bonus = wind * 20;

      money += bonus;
      book("power", bonus);
      addNews("🌬 Wind turbines earned $" + bonus);
      break;
    }

    case "Perfect Growing Season":
      population += 100;
      addNews("🌱 Population growth increased.");
      break;

    case "Bushfire Season":
      if (forest > 0 && Math.random() < 0.3 * (1 - weatherShield("fire"))) destroyRandom("forest", "fire");
      break;

    case "Storm System":
      stormHitsGrid(); // a power line may go down for a month
      break;
  }

  if (Math.random() < EVENT_CHANCE) {
    showEvent(pickEvent());
  }

  if (++month > 12) {
    month = 1;

    // Save the completed year's result, then start the next year's growth baseline.
    lastYearGDPGrowth = gdpGrowth;
    yearStartGDP = totalGDP;
    gdpGrowth = 0;

    year++;

    pendingQuiz = settings.quizzes; // the quiz appears after the player closes the report
    yearlyReport();
  } else if (month === 7) {
    showQuiz(); // a mid-year quiz question too
  }

  bankMonth(); // unpaid bills go onto the loan (programs.js)
  clampValues();
  updateHomes();
  politicsMonth(); // group moods, protests and elections (politics.js)
  goalsMonth();
  recordHistory();
  budgetMonth(); // close this month's books (budget.js)

  if (approval < 20) {
    lowApprovalMonths++;
    addNews("⚠ Approval is critically low (" + lowApprovalMonths + "/" + LOW_APPROVAL_LIMIT + " months before government collapse).");
  } else {
    lowApprovalMonths = 0;
  }

  checkGameOver();

  if (totalMonths() % FACT_EVERY === 0) randomFact();

  updateCoach();
  updateUI();
}

// ======================================
// AUTO TICK SYSTEM
// ======================================

function tick() {
  if (gamePaused || userPaused) return;

  if (--countdown <= 0) {
    countdown = MONTH_SECONDS;

    nextMonth();
  }

  el.countdown.textContent = "Next Month: " + countdown + "s";
}

// Runs once a second, or faster when the speed button is set to 2x or 4x.
let tickHandle = null;

function startTicker() {
  clearInterval(tickHandle);
  tickHandle = setInterval(tick, 1000 / (X.speed || 1));
}

// ======================================
// MANUAL MONTH ADVANCE AND PAUSE
// ======================================

function manualAdvanceMonth() {
  if (gamePaused) return;

  const button = el.endMonthButton;

  if (!confirmSkip) {
    confirmSkip = true;

    button.textContent = "⚠ Click again to confirm";
    button.classList.add("confirm-button");

    // Not { once: true }: this same click would use it up before anything else is clicked.
    document.addEventListener("click", cancelConfirm);

    return;
  }

  confirmSkip = false;
  document.removeEventListener("click", cancelConfirm);

  button.textContent = "▶ End Month";
  button.classList.remove("confirm-button");

  countdown = MONTH_SECONDS;
  el.countdown.textContent = userPaused ? "⏸ Paused" : "Next Month: " + countdown + "s";

  nextMonth();
}

function cancelConfirm(event) {
  const button = el.endMonthButton;

  if (event.target === button) return;

  confirmSkip = false;
  document.removeEventListener("click", cancelConfirm);

  button.textContent = "▶ End Month";
  button.classList.remove("confirm-button");
}

// Lets the player stop the clock to read or think. Builds and research still work while paused.
function togglePause() {
  userPaused = !userPaused;

  el.pauseButton.textContent = userPaused ? "▶ Resume" : "⏸ Pause";
  el.countdown.textContent = userPaused ? "⏸ Paused" : "Next Month: " + countdown + "s";
}

document.addEventListener("click", (event) => {
  const banner = event.target.closest(".clamp");

  if (banner) banner.classList.toggle("open");

  const tab = event.target.closest(".tab");

  if (tab) {
    document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tab.dataset.tab));
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && el.reportModal.style.display === "block") closeReport();
  else if ((event.key === "p" || event.key === "P") && !gamePaused) togglePause();
});

// ======================================
// UI
// ======================================


const WEATHER_ICONS = {
  "Clear Skies": "☀️", "Light Rain": "🌦", "Mild Weather": "🌤", "Heavy Rain": "🌧", "Heatwave": "🌡",
  "Bushfire Season": "🔥", "Storm System": "⛈", "Flooding Conditions": "🌊", "Perfect Growing Season": "🌱",
  "Windy Conditions": "🌬", "Ocean Warming Alert": "🌊",
};

function weatherLabel(name) {
  return (WEATHER_ICONS[name] || "🌤") + " " + name;
}

function setTileState(id, state) {
  el[id].closest(".tile").dataset.state = state;
}

function updateUI() {
  // Keep displayed stats valid even immediately after event/research button actions.
  clampValues();

  const supply = getPowerSupply();
  const demand = getPowerDemand();
  const balance = supply - demand;
  const climateScore = getClimateScore();
  const batteryCapacity = batteryStore();

  el.date.textContent = "📅 " + monthNames[month - 1] + " " + year;
  el.money.textContent = "$" + money.toLocaleString();
  el.population.textContent = population.toLocaleString();

  const face = approval >= 80 ? "😄" : approval >= 60 ? "🙂" : approval >= 40 ? "😐" : approval >= 20 ? "😟" : "😡";

  el.approval.textContent =
    approval + "%" + (approval < 20 ? " ⚠ " + lowApprovalMonths + "/" + LOW_APPROVAL_LIMIT : "");
  el.approval.parentElement.previousElementSibling.textContent = face;
  el.pollution.textContent = pollution;
  el.gdpPerCapita.textContent = "💰 GDP per person: $" + gdpPerCapita.toLocaleString();
  el.gdpGrowth.textContent = "📈 GDP growth this year: " + gdpGrowth + "%";
  el.totalGDP.textContent = "🏛 Total GDP: $" + totalGDP.toLocaleString();
  document.getElementById("upkeepInfo").textContent = "🏗 Building upkeep: $" + buildingUpkeep().toLocaleString() + " a month" + (upkeepMultiplier() > 1 ? " (big-city costs +" + Math.round((upkeepMultiplier() - 1) * 100) + "%)" : "");
  el.power.textContent = supply + " / " + demand;

  setTileState("money", money < 150 ? "bad" : money < 400 ? "warn" : "");
  setTileState("approval", approval < 20 ? "bad" : approval < 45 ? "warn" : "");
  setTileState("pollution", pollution > 100 ? "bad" : pollution > 50 ? "warn" : "");
  setTileState("power", balance < 0 ? "bad" : "");
  const shares = getEnergyShares();

  el.energyMix.textContent =
    "🌱 Renewable: " + shares.renewable + "%  |  " +
    (nuclearUnlocked ? "⚛ Nuclear: " + shares.nuclear + "%  |  " : "") +
    "🏭 Fossil: " + shares.fossil + "%";

  el.energyBalance.textContent =
    "Energy Balance: " + (balance > 0 ? "+" : "") + balance + " MW" +
    (batteries > 0 ? " | 🔋 " + batteryCharge + "/" + batteryCapacity + " MW saved" : "") +
    (blackoutMonths > 0 ? " | Blackout: " + blackoutMonths + "/" + BLACKOUT_LIMIT : "");
  el.energyBalance.className = balance >= 0 ? "energy-good" : "energy-bad";

  el.solar.textContent = "☀ Solar Farms: " + solar + " (free land: " + freeTilesFor("solar") + " tiles)";
  el.wind.textContent = "🌬 Wind Turbines: " + wind;
  el.coal.textContent = "🏭 Coal Plants: " + coal;
  el.forest.textContent = "🌳 Forest Projects: " + forest;
  el.battery.textContent = "🔋 Batteries: " + batteries;
  el.capture.textContent = "🌎 Carbon Capture Plants: " + capturePlants;
  el.nuclear.hidden = !nuclearUnlocked;
  el.nuclearWaste.hidden = !nuclearUnlocked;
  el.nuclear.textContent = "⚛ Nuclear Plants: " + nuclearPlants + " (city has room for " + getNuclearAllowed() + ")";
  el.nuclearWaste.textContent = "☢ Radioactive waste stored: " + nuclearWaste + " (costs $" + nuclearWaste + " a month)";
  el.offices.textContent = "🏢 Offices: " + offices;
  el.factories.textContent = "🏭 Factories: " + factories;

  el.climateBar.value = climateScore;
  el.climateScore.textContent = climateScore + " / 100";

  if (activeResearch === null) {
    el.researchStatus.textContent = "No Active Research";
    el.researchBar.value = 0;
  } else {
    const project = researchProjects[activeResearch];
    const progressPercent = Math.min(
      100,
      Math.floor((researchProgress / project.monthsRequired) * 100),
    );

    el.researchStatus.textContent = project.name + " (" + progressPercent + "%)";
    el.researchBar.value = progressPercent;
  }

  renderResearch(); // the tech tree (techtree.js)
  renderBuildMenu(); // buildings.js
  updateCityView();
  renderPollutionReport();
  renderExtras();
  renderDistricts();
  renderPeople();
  renderElectionChip();
  renderBudget();

  if (!gameEnded) saveGame();
}

// The map itself is drawn by map.js. This adds the one-line summary under it.
function updateCityView() {
  renderMap();

  const homes = X.map ? tilesOf("home").length : 0;
  const cityDevelopment = population / 1000 + totalBuildings();
  let cityTitle = "Settlement";
  if (cityDevelopment >= 80) cityTitle = "Mega City";
  else if (cityDevelopment >= 55) cityTitle = "City";
  else if (cityDevelopment >= 35) cityTitle = "Town";
  else if (cityDevelopment >= 20) cityTitle = "Village";

  let cityStatus = "ECO FRIENDLY";
  if (pollution > 100) cityStatus = "POLLUTION CRISIS";
  else if (pollution > 50) cityStatus = "POLLUTION RISING";
  else if (pollution > 20) cityStatus = "STABLE";

  if (el.cityStatus) {
    el.cityStatus.textContent =
      cityTitle + "  •  " + cityStatus + "  •  " +
      "Homes: " + homes + "  |  Clean energy: " + (solar + wind + nuclearPlants + X.plants.hydro + X.plants.geo + X.plants.offshore) + "  |  Industry: " + (coal + X.plants.gas + factories);
  }
}
