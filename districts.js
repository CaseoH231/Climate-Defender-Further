// ======================================================================
// DISTRICTS: the map is split into a few named neighbourhoods.
// Each district gets a type from what is built in it (homes = residential,
// factories and coal = industrial, and so on) and shows its own power use,
// pollution and happiness. Those add up to the city totals the game already uses.
//
// Smoke also drifts to nearby tiles: homes next to coal plants and factories are
// unhappy, homes next to forests are happier. That nudges city happiness each month.
//
//   X.map.d   which district each tile belongs to (one digit per tile)
//   X.map.dn  the district names
// ======================================================================

const DISTRICT_COUNT = 6;
const DISTRICT_COLORS = ["#ff8a5c", "#3fa4ff", "#a77bff", "#22c39a", "#ffc23d", "#ff6fa8"];

const DISTRICT_KINDS = {
  residential: { icon: "🏘", name: "Residential" },
  commercial: { icon: "🏢", name: "Business" },
  industrial: { icon: "🏭", name: "Industrial" },
  energy: { icon: "⚡", name: "Energy" },
  park: { icon: "🌳", name: "Parkland" },
  empty: { icon: "🌾", name: "Open land" },
};

const KIND_OF = {
  home: "residential", hall: "residential", office: "commercial",
  factory: "industrial", coal: "industrial", gas: "industrial", capture: "industrial",
  solar: "energy", wind: "energy", battery: "energy", nuclear: "energy", hydro: "energy", geo: "energy", offshore: "energy", tidal: "energy", biogas: "energy",
  forest: "park",
};

// Names that fit the land each district is built on.
const DISTRICT_NAMES = {
  coast: ["Harbour", "Seaside", "Bayview"],
  hills: ["Hilltop", "Highlands", "Stonecliff"],
  river: ["Riverside", "Millbrook", "Lakeside"],
  sand: ["Sunvale", "Dunes", "Red Rock"],
  farm: ["Farmside", "Wheatfield", "Barnhill"],
  woods: ["Woodlands", "Pinewood", "Oakdale"],
  grass: ["Greenfield", "Meadowbrook", "Eastgate", "Westbury", "Northfield", "Southvale"],
};

// ---------- Making the districts ----------

function generateDistricts() {
  const rand = seededRandom((X.map.seed || 1) + 7);
  const hall = X.map.hall;
  const land = [...Array(MAP_N).keys()].filter((i) => !SEA.has(terrainAt(i)));
  const seeds = [hall >= 0 ? hall : land[0]];

  // Spread the district centres out: each new one is as far as possible from the others.
  while (seeds.length < Math.min(DISTRICT_COUNT, land.length)) {
    let best = -1;
    let bestScore = -1;

    for (const i of land) {
      const score = Math.min(...seeds.map((s) => tileDistance(i, s))) + rand() * 0.5;

      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }

    seeds.push(best);
  }

  // Every tile (sea included, so offshore wind has a home) joins the nearest centre.
  const d = [];

  for (let i = 0; i < MAP_N; i++) {
    let nearest = 0;

    seeds.forEach((s, k) => {
      if (tileDistance(i, s) < tileDistance(i, seeds[nearest])) nearest = k;
    });

    d.push(nearest);
  }

  // Names from the land each district covers. The town hall's district is always Old Town.
  const used = new Set(["Old Town"]);
  const names = seeds.map((_, k) => {
    if (k === 0) return "Old Town";

    const score = { coast: 0, hills: 0, river: 0, sand: 0, farm: 0, woods: 0, grass: 0 };

    d.forEach((dk, i) => {
      if (dk !== k) return;

      const t = terrainAt(i);

      if (t === "beach" || t === "shallow") score.coast += 2;
      else if (t === "sea") score.coast += 0.4;
      else if (t === "hills" || t === "rock" || t === "vent") score.hills += 1;
      else if (t === "river" || t === "rapids" || t === "lake") score.river += 1.5;
      else if (t in score) score[t] += t === "grass" ? 0.6 : 1;
    });

    const order = Object.keys(score).sort((a, b) => score[b] - score[a]);

    for (const kind of [...order, "grass"]) {
      const name = DISTRICT_NAMES[kind].find((n) => !used.has(n));

      if (name) {
        used.add(name);
        return name;
      }
    }

    return "District " + (k + 1);
  });

  X.map.d = d.join("");
  X.map.dn = names;
  mapChanged();
}

// Maps made before districts existed get them now.
function ensureDistricts() {
  if (X.map && (typeof X.map.d !== "string" || X.map.d.length !== MAP_N || !Array.isArray(X.map.dn))) generateDistricts();
}

function districtOf(i) {
  return Number(X.map.d[i]);
}

// ---------- Smoke and parks ----------

// How much smoke each building blows over the tiles around it (negative cleans the air).
const SMOKE = { coal: 3, gas: 1.5, factory: 2.5, capture: -1, forest: -1.2 };
const SMOKE_FADE = [1, 0.6, 0.3]; // at 0, 1 and 2 tiles away

let airCache = { rev: -1, air: null };

// Local air for every tile: above 0 is smoky, below 0 is extra fresh.
function airMap() {
  if (airCache.rev === X.map.rev && airCache.air) return airCache.air;

  const air = new Array(MAP_N).fill(0);

  for (let i = 0; i < MAP_N; i++) {
    const piece = X.map.b[i];
    const smoke = piece && SMOKE[piece.t];

    if (!smoke) continue;

    const reach = smoke > 0 ? 2 : 1;

    for (let j = 0; j < MAP_N; j++) {
      const dist = tileDistance(i, j);

      if (dist <= reach) air[j] += smoke * SMOKE_FADE[dist];
    }
  }

  airCache = { rev: X.map.rev, air };
  return air;
}

// How happy the people in one home tile are with their neighbourhood (about −3 to +1).
function homeMood(i) {
  const air = airMap()[i];

  return Math.max(-3, Math.min(1, air > 0 ? -air * 0.5 : -air * 0.4));
}

// The whole city's neighbourhood feeling: the average home mood.
function neighbourhoodMood() {
  const homes = X.map ? tilesOf("home") : [];

  if (!homes.length) return 0;

  return homes.reduce((sum, i) => sum + homeMood(i), 0) / homes.length;
}

// Runs once a month: smoky neighbourhoods cost a little happiness, leafy ones add a little.
function districtsMonth() {
  if (!X.map) return;

  const effect = Math.max(-1.5, Math.min(0.5, neighbourhoodMood() * 0.4));

  approval += effect;

  if (effect <= -0.4) {
    learnTerm("airquality");
    addNews("😷 People living next to smoky plants and factories are unhappy (" + effect.toFixed(1) + " happiness). Keep industry away from homes, or plant forests between them.");
  }
}

// ---------- District numbers ----------

// Electricity each building makes right now (the same numbers getPowerSupply uses).
function tileMW(piece) {
  const weatherSolar = (currentWeather.solar ?? 1) * X.mods.solarMul;
  const weatherWind = (currentWeather.wind ?? 1) * X.mods.windMul;

  switch (piece.t) {
    case "coal": return COAL_MW;
    case "solar": return [20, 30, 45][piece.lv || 0] * weatherSolar;
    case "wind": return WIND_MW * weatherWind;
    case "nuclear": return NUCLEAR_MW;
    default:
      // gas, hydro, geothermal, offshore wind, tidal and biogas
      return EXTRA_PLANTS[piece.t] && X.plants[piece.t] > 0 ? extraMW(piece.t) / X.plants[piece.t] : 0;
  }
}

// Electricity each building uses.
const TILE_USE = { office: OFFICE_MW, factory: FACTORY_MW, capture: CAPTURE_MW };

// Pollution each building adds (or removes) every month, as in nextMonth's breakdown.
function tilePollution(piece) {
  switch (piece.t) {
    case "coal": return 2;
    case "solar": return -1;
    case "wind": return -2;
    case "forest": return -forestCleaning();
    case "capture": return -captureCleaning();
    default: return EXTRA_PLANTS[piece.t] ? EXTRA_PLANTS[piece.t].pollution : 0;
  }
}

function districtStats() {
  ensureDistricts();

  const homesAll = tilesOf("home").length || 1;
  const peopleDemand = getPowerDemand();
  const cityLife = lastBreakdown ? lastBreakdown.city || 0 : 0;
  const air = airMap();
  const list = X.map.dn.map((name, k) => ({
    k, name, tiles: 0, land: 0, homes: 0, kinds: {}, made: 0, used: 0, pollution: 0, air: 0, mood: 0, people: 0,
  }));

  for (let i = 0; i < MAP_N; i++) {
    const s = list[districtOf(i)];
    const piece = X.map.b[i];

    s.tiles++;

    if (!SEA.has(terrainAt(i))) {
      s.land++;
      s.air += air[i];
    }

    if (!piece) continue;

    const kind = KIND_OF[piece.t];

    if (kind) s.kinds[kind] = (s.kinds[kind] || 0) + (piece.t === "hall" ? 0.5 : 1);
    s.made += tileMW(piece);
    s.used += TILE_USE[piece.t] || 0;
    s.pollution += tilePollution(piece);

    if (piece.t === "home") {
      s.homes++;
      s.mood += homeMood(i);
    }
  }

  const hall = list[districtOf(X.map.hall)];

  hall.made += BASE_POWER + X.mods.baseDelta; // the old grid and imports come in at the town hall

  for (const s of list) {
    const share = s.homes / homesAll;

    s.used += peopleDemand * share;
    s.pollution += cityLife * share;
    s.people = Math.round(population * share);
    s.air = s.land ? s.air / s.land : 0;
    s.mood = s.homes ? s.mood / s.homes : 0;
    s.happiness = s.homes ? Math.round(Math.max(0, Math.min(100, approval + s.mood * 6))) : null;

    const top = Object.entries(s.kinds).sort((a, b) => b[1] - a[1])[0];

    s.kind = top ? top[0] : "empty";
  }

  return list;
}

function airWord(value) {
  return value >= 2 ? "😷 Smoky" : value >= 0.7 ? "🌫 Hazy" : value <= -0.5 ? "🍃 Fresh" : "🙂 Clean";
}

// ---------- Map views ----------

let mapView = "normal"; // "normal", "districts", "air" or "grid" (grid.js)

function setMapView(view) {
  mapView = mapView === view ? "normal" : view;
  mapDom.overlayView = null; // redraw the overlay
  renderMapViews();
  renderMap();
}

function renderMapViews() {
  const box = document.getElementById("mapViews");

  if (!box) return;

  const html = [["normal", "🗺 Map"], ["districts", "🏘 Districts"], ["grid", "⚡ Grid"], ["air", "💨 Air"]]
    .map(([id, label]) => `<button class="${mapView === id ? "on" : ""}" onclick="setMapView('${id}')">${label}</button>`)
    .join("");

  if (box.innerHTML !== html) box.innerHTML = html;
}

// Colours the tiles for the Districts or Air view and places the district name tags.
function renderDistrictOverlay() {
  if (!mapDom || !X.map) return;

  ensureDistricts();

  // The grid view changes every month (power flows with the weather), so it is redrawn each time.
  if (mapView === "grid" && mapDom.labels) setHTML(mapDom.labels, gridOverlayHTML());

  const key = mapView + ":" + (mapView === "air" ? X.map.rev : X.map.d);

  if (mapDom.overlayView === key) return;
  mapDom.overlayView = key;

  const air = mapView === "air" ? airMap() : null;

  mapDom.tiles.forEach((cell, i) => {
    let color = "";

    if (mapView === "districts" && !SEA.has(terrainAt(i))) {
      color = DISTRICT_COLORS[districtOf(i) % DISTRICT_COLORS.length] + "88";

      // A stronger edge where two districts meet
      if (neighbours(i).some((j) => districtOf(j) !== districtOf(i) && !SEA.has(terrainAt(j)))) color = DISTRICT_COLORS[districtOf(i) % DISTRICT_COLORS.length] + "cc";
    } else if (air) {
      const a = air[i];

      if (a > 0.2) color = "rgba(96, 72, 52, " + Math.min(0.7, a * 0.18).toFixed(2) + ")";
      else if (a < -0.2) color = "rgba(40, 200, 110, " + Math.min(0.45, -a * 0.2).toFixed(2) + ")";
    }

    cell.style.setProperty("--ov", color || "transparent");
  });

  const labels = mapDom.labels;

  if (!labels || mapView === "grid") return;

  if (mapView !== "districts") {
    labels.innerHTML = "";
    return;
  }

  // Each tag sits in the middle of its district's land.
  labels.innerHTML = X.map.dn
    .map((name, k) => {
      const tiles = [...Array(MAP_N).keys()].filter((i) => districtOf(i) === k && !SEA.has(terrainAt(i)));

      if (!tiles.length) return "";

      const c = tiles.reduce((sum, i) => sum + tileCol(i), 0) / tiles.length;
      const r = tiles.reduce((sum, i) => sum + tileRow(i), 0) / tiles.length;
      const x = (c - r) * 0.5 + 8;
      const y = (c + r) * 0.25 + 0.25 + ISO.pad;

      return `<span class="district-tag" style="left:${pct(x, ISO.w)};top:${pct(y, ISO.h)};--dc:${DISTRICT_COLORS[k % DISTRICT_COLORS.length]}">${name}</span>`;
    })
    .join("");
}

// ---------- The Districts tab ----------

function renderDistricts() {
  const box = document.getElementById("districtList");
  const panel = document.getElementById("tabDistricts");

  if (!box || !panel || !panel.classList.contains("active") || !X.map) return;

  const list = districtStats();
  const mood = neighbourhoodMood();

  const html =
    `<p class="learn-note">Your city is split into neighbourhoods. Smoke from coal, gas and factories drifts about two tiles, ` +
    `so homes next to them are unhappy. Forests clean the air nearby. Use the 🏘 and 💨 buttons on the map to see them.</p>` +
    `<div class="stat-row"><span>🏘 Neighbourhood feeling</span><b>${mood >= 0.2 ? "🙂 Leafy and fresh" : mood <= -0.5 ? "😷 Too much smoke near homes" : "😐 OK"} (${mood >= 0 ? "+" : ""}${(Math.max(-1.5, Math.min(0.5, mood * 0.4))).toFixed(1)} happiness a month)</b></div>` +
    `<div class="district-grid">` +
    list
      .filter((s) => s.land > 0)
      .map((s) => {
        const kind = DISTRICT_KINDS[s.kind];
        const net = Math.round(s.made - s.used);
        const tips = [];

        if (s.homes && s.mood <= -0.8) tips.push("😷 Homes here breathe smoke. Move industry away or plant forests.");
        if (s.homes && s.mood >= 0.3) tips.push("🌳 Forests nearby make people happier.");
        if (!s.homes && s.kind === "empty") tips.push("🗺 Free land to plan with.");
        if (X.grid && X.grid.short[s.k]) tips.unshift("🔌 Blackout last month: the power lines couldn't bring in " + X.grid.short[s.k] + " MW. Upgrade a line below.");

        return (
          `<div class="district" style="--dc:${DISTRICT_COLORS[s.k % DISTRICT_COLORS.length]}">` +
          `<div class="d-top"><b>${s.name}</b><span class="d-kind">${kind.icon} ${kind.name}</span></div>` +
          `<div class="kv"><span>👥 People</span><strong>${s.people.toLocaleString()}</strong></div>` +
          `<div class="kv"><span>😊 Happiness</span><strong>${s.happiness === null ? "Nobody lives here" : s.happiness + "%"}</strong></div>` +
          `<div class="kv"><span>⚡ Power</span><strong class="${net >= 0 ? "good-text" : "bad-text"}">makes ${Math.round(s.made)} · uses ${Math.round(s.used)} MW</strong></div>` +
          `<div class="kv"><span>🏭 Pollution</span><strong class="${s.pollution > 0.5 ? "bad-text" : "good-text"}">${s.pollution > 0 ? "+" : ""}${s.pollution.toFixed(1)} a month</strong></div>` +
          `<div class="kv"><span>💨 Air</span><strong>${airWord(s.air)}</strong></div>` +
          tips.map((t) => `<p class="d-tip">${t}</p>`).join("") +
          `</div>`
        );
      })
      .join("") +
    `</div>` +
    gridPanelHTML(); // grid.js

  setHTML(box, html);
}
