// ======================================================================
// CLIMATE: CO2 in the air, global temperature, sea level and tipping points.
// All of the "new version" state lives in the X object so it saves in one go.
// ======================================================================

const X = {
  co2: 420, // parts per million in the air (about 420 today)
  temp: 1.1, // degrees C warmer than before factories
  sea: 0, // sea level rise in cm since the game began
  floodShown: 0,
  tipped: {}, // tipping points already crossed
  plants: { gas: 0, hydro: 0, geo: 0, offshore: 0, tidal: 0, biogas: 0 },
  programs: {}, // program id -> level
  carbonTax: 0, // 0 to 3
  loan: 0,
  achieved: {},
  history: [],
  scenario: "classic",
  started: false,
  won: false,
  endless: false,
  speed: 1,
  taxIncome: 0,
  goalStreak: 0,
  map: null, // the tile map (map.js)
  grid: null, // power lines between districts (grid.js)
  politics: null, // citizen groups and elections (politics.js)
  budget: null, // budget lines, carbon market and green grants (budget.js)
  bankruptMonths: 0,
  mods: { coastal: 0.5, heat: 0, solarMul: 1, windMul: 1, baseDelta: 0, coalJobs: 0, sites: { hydro: 3, geo: 4, offshore: 6 } },
};

const TIPPING_POINTS = [
  { id: "coral", temp: 1.5, icon: "🪸", name: "Coral reefs are dying", text: "Warm oceans bleach coral. Tourism and fishing suffer, so the city earns 3% less.", term: "tipping" },
  { id: "ice", temp: 2.0, icon: "🧊", name: "Ice sheets are melting faster", text: "Meltwater from Greenland and Antarctica is speeding up. Sea level now rises twice as fast." },
  { id: "permafrost", temp: 2.5, icon: "🥶", name: "Permafrost is thawing", text: "Frozen ground in the Arctic releases extra greenhouse gas. CO₂ now rises faster on its own." },
  { id: "dieback", temp: 3.0, icon: "🌲", name: "Forests are dying back", text: "Hot, dry forests burn and die. Your forests only soak up half as much carbon now." },
];

function climateWorldDrift() {
  // The rest of the world keeps polluting a little. It is worse on higher difficulties.
  return 0.1 + Math.max(0, settings.difficulty - 6) * 0.015;
}

// Called once a month with this month's pollution breakdown.
function climateMonth(breakdown) {
  let net = 0;

  for (const key in breakdown) if (key !== "weather") net += breakdown[key];

  // Adding gas to the air is easier than taking it out again.
  X.co2 += (net > 0 ? net * 0.18 : net * 0.08) + climateWorldDrift() + (X.tipped.permafrost ? 0.4 : 0);
  X.co2 = Math.max(370, Math.round(X.co2 * 100) / 100);

  // The air warms slowly, so today's choices show up years later.
  const target = 1.1 + (X.co2 - 420) * 0.011;

  X.temp += (target - X.temp) * 0.04;
  X.temp = Math.round(X.temp * 1000) / 1000;

  X.sea += Math.max(0, X.temp - 1.0) * 0.2 * (X.tipped.ice ? 2 : 1);

  for (const point of TIPPING_POINTS) {
    if (!X.tipped[point.id] && X.temp >= point.temp) {
      X.tipped[point.id] = true;
      approval -= 3;
      addNews("🚨 TIPPING POINT (" + point.temp + "°C): " + point.name + ". " + point.text);
      if (typeof toast === "function") toast(point.icon + " " + point.name, "bad");
      learnTerm("tipping");
    }
  }

  coastalFlooding();
}

// How many "flood levels" the sea has risen (each is about 12 cm), minus what seawalls hold back.
function floodLevel() {
  return Math.max(0, Math.floor(X.sea / 12) - programEffect("seawall"));
}

function coastalFlooding() {
  const rawLevel = Math.floor(X.sea / 12);

  mapFloodMonth(); // low tiles on the map go under water

  if (rawLevel > X.floodShown) {
    X.floodShown = rawLevel;
    if (X.mods.coastal > 0) addNews("🌊 Sea level has risen " + Math.round(X.sea) + " cm. Low streets near the coast are flooding.");
    learnTerm("sealevel");
  }

  const level = floodLevel();

  if (level <= 0 || X.mods.coastal <= 0) return;

  const hit = X.mods.coastal;

  population -= Math.round(level * 25 * hit);
  approval -= Math.min(2, level * 0.2 * hit);
  money -= Math.round(level * 40 * hit);
  book("damage", -Math.round(level * 40 * hit));
}

// Hotter worlds have nastier weather: choose bad weather more often.
function pickWeather() {
  const heat = Math.max(0, X.temp - 1.1);
  const bad = ["Heatwave", "Bushfire Season", "Storm System", "Flooding Conditions"];
  const nice = ["Mild Weather", "Perfect Growing Season", "Clear Skies"];
  const weights = weatherEvents.map((item) => {
    if (bad.includes(item.name)) return 1 + heat * 1.6;
    if (nice.includes(item.name)) return Math.max(0.3, 1 - heat * 0.25);
    return 1;
  });
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < weatherEvents.length; i++) {
    roll -= weights[i];
    if (roll < 0) return weatherEvents[i];
  }

  return weatherEvents[weatherEvents.length - 1];
}

// Bad weather hurts more when the world is warmer, and less if you've adapted.
function scaledWeather(weather) {
  const severity = 1 + Math.max(0, X.temp - 1.1) * 0.3;
  const shield = {
    Heatwave: weatherShield("heat"),
    "Bushfire Season": weatherShield("fire"),
    "Flooding Conditions": weatherShield("flood"),
    "Storm System": weatherShield("flood") / 2,
  }[weather.name] || 0;
  const k = (value, badIfPositive) => ((badIfPositive ? value > 0 : value < 0) ? Math.round(value * severity * (1 - shield)) : value);

  return {
    pollution: k(weather.pollution, true),
    approval: k(weather.approval, false),
    population: k(weather.population, false),
  };
}

function climateIncomeFactor() {
  return X.tipped.coral ? 0.97 : 1;
}

function climateDemandFactor() {
  // Hot places use more air conditioning.
  return 1 + Math.max(0, X.temp - 1.1) * 0.03 + X.mods.heat;
}

function tempClass() {
  return X.temp >= 3 ? "t-hot3" : X.temp >= 2 ? "t-hot2" : X.temp >= 1.5 ? "t-hot1" : "t-ok";
}

function extraReportRows() {
  return [
    ["Global temperature", "+" + X.temp.toFixed(1) + "°C"],
    ["CO₂ in the air", Math.round(X.co2) + " ppm"],
  ];
}

// New dictionary words for the new ideas.
glossary.push(
  { id: "co2ppm", icon: "🌫", term: "CO₂ level (ppm)", definition: "How many parts of every million parts of air are carbon dioxide. It was about 280 before factories and is over 420 today." },
  { id: "tipping", icon: "⚠", term: "Tipping point", definition: "A point where a small change tips a natural system into a big change that is very hard to undo, like coral reefs dying." },
  { id: "sealevel", icon: "🌊", term: "Sea level rise", definition: "Oceans rise because water expands as it warms and ice on land melts into the sea." },
  { id: "carbontax", icon: "💲", term: "Carbon tax", definition: "A price on pollution. Polluters pay for every tonne of greenhouse gas, so clean options become cheaper." },
  { id: "gasplant", icon: "🔥", term: "Natural gas", definition: "A fossil fuel that makes about half the greenhouse gas of coal, but still adds to climate change. Some call it a 'bridge fuel'." },
  { id: "hydro", icon: "💧", term: "Hydropower", definition: "Electricity made from falling water. It is reliable, but dams change rivers and need a lot of space." },
  { id: "geothermal", icon: "🌋", term: "Geothermal energy", definition: "Heat from deep underground used to make steady electricity, day and night." },
  { id: "efficiency", icon: "💡", term: "Energy efficiency", definition: "Doing the same job with less energy, for example with better insulation. The cleanest power is the power you never need." },
);

gameOverTips.climate = [
  "The air warms slowly, so pollution from years ago is still heating the planet. Cut emissions early.",
  "Forests, solar and wind all push CO₂ down. Check the Stats tab to watch the temperature.",
  "A carbon tax makes coal and gas more expensive, so the city switches to clean power faster.",
  "Past 2°C the world hits tipping points that make everything harder. Try to stay under 1.5°C.",
];
gameOverTips.goal = [
  "Check the Goals tab early so you know what the target is, then plan backwards from the deadline.",
  "Cutting power from coal and gas is usually the biggest step. Replace it before you close it down.",
  "Policies like transport and insulation lower pollution and demand without more power stations.",
];
