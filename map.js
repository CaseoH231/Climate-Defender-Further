// ======================================================================
// MAP: a 16×16 tile map drawn at an angle (isometric).
// Terrain is generated from a seed for each scenario. Every building sits on a tile,
// homes spread as the population grows, and low coastal tiles flood as the sea rises.
// All map state lives in X.map so it saves with the rest of the game:
//   X.map.t      terrain, one letter per tile (see TERRAIN)
//   X.map.b      building on each tile: null or { t: type, lv: level, n: build order }
//   X.map.flood  how many "flood levels" of coast are under water right now
// ======================================================================

const MAP_W = 16;
const MAP_H = 16;
const MAP_N = MAP_W * MAP_H;
const HOME_PEOPLE = 1500; // residents per home tile
const LAND_TARGET = 100; // buildable tiles at Year 6. Harder years get less land.

const TERRAIN = {
  g: { id: "grass", name: "Grass" },
  s: { id: "sand", name: "Desert sand" },
  b: { id: "beach", name: "Beach" },
  h: { id: "hills", name: "Hills" },
  v: { id: "vent", name: "Hot spring", site: "♨", siteText: "Geothermal site" },
  m: { id: "rock", name: "Mountain", note: "Too steep to build on" },
  f: { id: "farm", name: "Farmland", note: "Farms feed the city, so you can't build here" },
  w: { id: "woods", name: "Wild woods", note: "Protected nature, so you can't build here" },
  i: { id: "river", name: "River" },
  p: { id: "rapids", name: "River rapids", site: "💧", siteText: "Hydro dam site" },
  o: { id: "sea", name: "Sea" },
  l: { id: "shallow", name: "Shallow sea", site: "🌊", siteText: "Offshore wind site" },
  k: { id: "lake", name: "Lake" },
};
const TERRAIN_CODE = Object.fromEntries(Object.entries(TERRAIN).map(([code, t]) => [t.id, code]));
const WATER = new Set(["river", "rapids", "sea", "shallow", "lake"]);
const SEA = new Set(["sea", "shallow"]);
const TERRAIN_WORDS = { grass: "grass", sand: "desert", beach: "beach", hills: "hills", vent: "a ♨ hot spring", rapids: "a 💧 dam site", shallow: "a 🌊 shallow-sea site" };

const tileCol = (i) => i % MAP_W;
const tileRow = (i) => Math.floor(i / MAP_W);
const tileIndex = (c, r) => r * MAP_W + c;
const onMap = (c, r) => c >= 0 && r >= 0 && c < MAP_W && r < MAP_H;

function terrainAt(i) {
  return TERRAIN[X.map.t[i]].id;
}

function neighbours(i, diagonal) {
  const c = tileCol(i);
  const r = tileRow(i);
  const steps = diagonal
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]];

  return steps.filter(([dc, dr]) => onMap(c + dc, r + dr)).map(([dc, dr]) => tileIndex(c + dc, r + dr));
}

function tileDistance(a, b) {
  return Math.abs(tileCol(a) - tileCol(b)) + Math.abs(tileRow(a) - tileRow(b));
}

// ---------- Map generation ----------

// Small seeded random number generator, so the same seed always makes the same map.
function seededRandom(seed) {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth random bumps (0 to 1) across the map.
function makeNoise(rand, cells = 4) {
  const grid = [];

  for (let i = 0; i < (cells + 1) * (cells + 1); i++) grid.push(rand());

  const at = (x, y) => grid[y * (cells + 1) + x];
  const smooth = (t) => t * t * (3 - 2 * t);

  return (c, r) => {
    const x = (c / (MAP_W - 1)) * cells;
    const y = (r / (MAP_H - 1)) * cells;
    const x0 = Math.min(cells - 1, Math.floor(x));
    const y0 = Math.min(cells - 1, Math.floor(y));
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
    const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;

    return top * (1 - fy) + bottom * fy;
  };
}

const dist2 = (c, r, x, y) => Math.hypot(c - x, r - y);

// How each kind of city is laid out. c runs to the lower right of the screen, r to the lower left.
const MAP_LAYOUTS = {
  classic: { base: "grass", sea: (c, r, n) => c + r * 0.12 + (n - 0.5) * 3 > 13.4, hills: (c, r, n) => c + r + n * 6 < 9, river: { from: [5, 0], to: "sea" } },
  coastal: { base: "grass", sea: (c, r, n) => c + (n - 0.5) * 3 > 10.6, hills: (c, r, n) => r + c * 0.4 + n * 5 < 6.5, river: { from: [2, 0], to: "sea" } },
  desert: { base: "sand", sea: () => false, hills: (c, r, n) => 15 - c + r + n * 6 < 11, lake: [5, 10] },
  mining: { base: "grass", sea: (c, r, n) => c + r + (n - 0.5) * 4 > 24.5, hills: (c, r, n) => c + n * 6 < 9.5, river: { from: [11, 0], to: "sea" } },
  island: { base: "grass", sea: (c, r, n) => dist2(c, r, 7.5, 7.5) + (n - 0.5) * 3.5 > 6.8, hills: (c, r, n) => dist2(c, r, 7.5, 6.5) + n * 3 < 3.2 },
};

function mapLandTarget() {
  const t = (settings.difficulty - 6) / 6;

  return Math.round(LAND_TARGET * (1 - 0.22 * t));
}

function generateMap(scenarioId, seed) {
  const layout = MAP_LAYOUTS[scenarioId] || MAP_LAYOUTS.classic;
  const rand = seededRandom(seed);
  const noise = makeNoise(rand);
  const noise2 = makeNoise(rand, 5);
  const t = new Array(MAP_N).fill(layout.base);
  const sites = X.mods.sites || { hydro: 3, geo: 4, offshore: 6 };

  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      const n = noise(c, r);
      const i = tileIndex(c, r);

      if (layout.sea(c, r, n)) t[i] = "sea";
      else if (layout.hills(c, r, n)) t[i] = noise2(c, r) > 0.72 ? "rock" : "hills";
    }
  }

  // A desert oasis
  if (layout.lake) {
    const [lc, lr] = layout.lake;

    for (let i = 0; i < MAP_N; i++) {
      const d = dist2(tileCol(i), tileRow(i), lc, lr);

      if (d < 1.3) t[i] = "lake";
      else if (d < 2.6 && t[i] === "sand") t[i] = "grass";
    }
  }

  // A river that winds down towards the sea
  if (layout.river && sites.hydro > 0) {
    let [c, r] = layout.river.from;
    let drift = 1;

    for (let step = 0; step < 60 && onMap(c, r); step++) {
      const i = tileIndex(c, r);

      if (SEA.has(t[i])) break;
      t[i] = "river";

      if (rand() < 0.55) r++;
      else {
        if (rand() < 0.25) drift = -drift;
        c = Math.max(0, Math.min(MAP_W - 1, c + drift));
      }
    }
  }

  // Beaches where land meets the sea, and shallow water where offshore wind can go
  const isSea = (i) => t[i] === "sea";

  for (let i = 0; i < MAP_N; i++) {
    if (!WATER.has(t[i]) && t[i] !== "rock" && neighbours(i).some(isSea)) t[i] = "beach";
  }

  const pick = (candidates, count, spacing) => {
    const chosen = [];
    const pool = candidates.map((i) => [i, rand()]).sort((a, b) => a[1] - b[1]).map((pair) => pair[0]);

    for (const i of pool) {
      if (chosen.length >= count) break;
      if (chosen.every((j) => tileDistance(i, j) >= spacing)) chosen.push(i);
    }

    // Not enough room to spread them out: fill the rest anywhere.
    for (const i of pool) if (chosen.length < count && !chosen.includes(i)) chosen.push(i);

    return chosen;
  };

  const coastalSea = [...Array(MAP_N).keys()].filter((i) => isSea(i) && neighbours(i).some((j) => t[j] === "beach"));

  pick(coastalSea, sites.offshore || 0, 2).forEach((i) => (t[i] = "shallow"));

  const riverTiles = [...Array(MAP_N).keys()].filter((i) => t[i] === "river" && !neighbours(i).some(isSea));

  pick(riverTiles, sites.hydro || 0, 3).forEach((i) => (t[i] = "rapids"));

  // Hot springs in the hills (make more hills if there aren't enough)
  let hills = [...Array(MAP_N).keys()].filter((i) => t[i] === "hills");

  while (hills.length < (sites.geo || 0) * 2) {
    const spot = [...Array(MAP_N).keys()].find((i) => t[i] === layout.base && neighbours(i).some((j) => t[j] === "hills" || t[j] === "rock")) ?? [...Array(MAP_N).keys()].find((i) => t[i] === layout.base);

    if (spot === undefined) break;
    t[spot] = "hills";
    hills = [...Array(MAP_N).keys()].filter((i) => t[i] === "hills");
  }

  pick(hills, sites.geo || 0, 2).forEach((i) => (t[i] = "vent"));

  // The town hall goes where there is the most open land nearby.
  const buildable = (i) => LAND.includes(t[i]);
  let hall = -1;
  let best = -1;

  for (let i = 0; i < MAP_N; i++) {
    if (t[i] !== layout.base) continue;

    let room = 0;

    for (let j = 0; j < MAP_N; j++) if (tileDistance(i, j) <= 3 && buildable(j)) room++;

    const score = room - Math.abs(tileCol(i) + tileRow(i) - 15) * 0.4 + rand() * 0.5;

    if (score > best) {
      best = score;
      hall = i;
    }
  }

  // Farms and wild woods use up land, so there is less space on harder years.
  const target = mapLandTarget();
  const spare = [...Array(MAP_N).keys()]
    .filter((i) => (t[i] === layout.base || t[i] === "hills") && tileDistance(i, hall) >= 4)
    .sort((a, b) => noise2(tileCol(b), tileRow(b)) - noise2(tileCol(a), tileRow(a)));
  let land = [...Array(MAP_N).keys()].filter(buildable).length;

  for (const i of spare) {
    if (land <= target) break;
    t[i] = t[i] === "hills" ? "woods" : layout.base === "sand" ? "rock" : noise(tileCol(i), tileRow(i)) > 0.5 ? "farm" : "woods";
    land--;
  }

  X.map = { seed, t: t.map((id) => TERRAIN_CODE[id]).join(""), b: new Array(MAP_N).fill(null), n: 0, flood: 0, hall };
  X.map.b[hall] = { t: "hall", lv: 0, n: 0 };
  mapChanged();
}

// ---------- Elevation and flooding ----------

let elevationCache = { key: null, e: null };

// Steps from the sea for land tiles (beach = 1). Tiles far inland, rivers and mountains never flood.
function elevation() {
  if (elevationCache.key === X.map.t) return elevationCache.e;

  const e = new Array(MAP_N).fill(Infinity);
  const queue = [];

  for (let i = 0; i < MAP_N; i++) if (SEA.has(terrainAt(i))) {
    e[i] = 0;
    queue.push(i);
  }

  while (queue.length) {
    const i = queue.shift();

    for (const j of neighbours(i)) {
      const type = terrainAt(j);

      if (e[j] !== Infinity || WATER.has(type) || type === "rock") continue;
      e[j] = e[i] + 1;
      if (e[j] < 5) queue.push(j);
    }
  }

  elevationCache = { key: X.map.t, e };
  return e;
}

function isFlooded(i) {
  const e = elevation()[i];

  return e > 0 && e <= X.map.flood;
}

// Called every month from coastalFlooding(). Destroys whatever is on newly flooded tiles.
function mapFloodMonth() {
  if (!X.map) return;

  const level = floodLevel();

  if (level === X.map.flood) return;

  const rising = level > X.map.flood;

  X.map.flood = level;

  if (rising) {
    const lost = [];

    for (let i = 0; i < MAP_N; i++) {
      const b = X.map.b[i];

      if (b && isFlooded(i)) {
        lost.push(b.t === "home" ? "homes" : (BUILDINGS[b.t] || CITY_PIECES[b.t]).name);
        removeBuildingAt(i, "flood");
      }
    }

    addNews("🌊 The sea has flooded the lowest coast." + (lost.length ? " Lost: " + lost.join(", ") + "." : "") + " Sea Walls hold the water back.");
    if (lost.length) toast("🌊 Flooding destroyed " + lost.length + " tile" + (lost.length === 1 ? "" : "s"), "bad");
  } else {
    addNews("🧱 Sea walls pushed the water back. Some flooded coast is dry land again.");
  }

  mapChanged();
}

// ---------- Placing and removing buildings ----------

function mapChanged() {
  X.map.rev = (X.map.rev || 0) + 1;
}

function tileBuilding(i) {
  return X.map.b[i];
}

function pieceName(type) {
  return (BUILDINGS[type] || CITY_PIECES[type]).name;
}

// Why a building can't go on a tile, or "" if it can.
function placeProblem(type, i) {
  const b = BUILDINGS[type];
  const terrain = terrainAt(i);
  const taken = X.map.b[i];

  if (taken) return "This tile already has " + (taken.t === "home" ? "homes" : "a " + pieceName(taken.t)) + " on it";
  if (isFlooded(i)) return "This tile is under flood water";
  if (!b.on.includes(terrain)) {
    const info = TERRAIN[TERRAIN_CODE[terrain]];
    const wants = b.on.map((id) => TERRAIN_WORDS[id] || id);

    return (info.note || b.name + " can't go on " + info.name.toLowerCase()) + ". " + b.name + " needs " + wants.join(", ").replace(/, ([^,]*)$/, " or $1");
  }
  if (b.needsWater && !neighbours(i, true).some((j) => WATER.has(terrainAt(j)))) return b.name + " must be next to water for cooling";

  return "";
}

function freeTilesFor(type) {
  if (!X.map) return 0;

  let count = 0;

  for (let i = 0; i < MAP_N; i++) if (!placeProblem(type, i)) count++;

  return count;
}

// Puts a piece on a tile with no checks and no side effects (used when setting up the map).
function setTile(i, type, lv = 0) {
  X.map.n = (X.map.n || 0) + 1;
  X.map.b[i] = { t: type, lv, n: X.map.n };
  mapChanged();
}

// The player builds something on a tile. Returns true if it was built.
function placeBuilding(type, i) {
  const b = BUILDINGS[type];

  if (gamePaused || !b || !X.map) return false;

  if (!isUnlocked(type)) {
    addNews("🔒 " + b.lockText + ".");
    return false;
  }

  const blocked = b.allowed ? b.allowed() : "";

  if (blocked) {
    addNews("👥 " + blocked + ".");
    return false;
  }

  const problem = placeProblem(type, i);

  if (problem) {
    addNews("🗺 " + problem + ".");
    return false;
  }

  if (!canBuy(b.cost)) return false;

  money -= b.cost;
  setTile(i, type, b.add() || 0);
  learnTerm("landuse");
  sfx("build");
  updateUI();
  return true;
}

// mode: "sell" (refund), "flood" or "fire" (destroyed, no refund) or "quiet" (map clean-up, no side effects).
function removeBuildingAt(i, mode = "sell") {
  const piece = X.map.b[i];

  if (!piece) return false;

  const b = BUILDINGS[piece.t];

  if (!b) {
    // Homes and the town hall can't be sold, only washed away.
    if (mode === "sell") return false;
    X.map.b[i] = null;
    mapChanged();
    return true;
  }

  if (mode === "sell") {
    if (gamePaused) return false;
    if (b.refund < 0 && money < -b.refund) {
      addNews("💸 Shutting down a " + b.name + " costs $" + -b.refund + ".");
      return false;
    }
    money += b.refund;
  }

  X.map.b[i] = null;
  mapChanged();

  if (mode !== "quiet") b.remove(piece);
  if (mode === "sell") {
    addNews(b.icon + " " + b.name + (b.refund < 0 ? " shut down for $" + -b.refund : " sold for $" + b.refund));
    sfx("sell");
    updateUI();
  } else if (mode === "flood" || mode === "fire") {
    addNews((mode === "fire" ? "🔥 " : "🌊 ") + "A " + b.name + " was destroyed.");
  }

  return true;
}

function tilesOf(type) {
  const list = [];

  for (let i = 0; i < MAP_N; i++) if (X.map.b[i] && X.map.b[i].t === type) list.push(i);

  return list;
}

// Picks a sensible tile: industry away from homes, offices near the town hall.
const FAR_FROM_TOWN = ["coal", "gas", "factory", "capture", "nuclear"];

function bestTileFor(type, ignoreRules) {
  const hall = X.map.hall;
  let best = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < MAP_N; i++) {
    if (ignoreRules ? X.map.b[i] || !LAND.includes(terrainAt(i)) || isFlooded(i) : placeProblem(type, i)) continue;

    const d = tileDistance(i, hall);
    const low = elevation()[i] <= 2 && !SEA.has(terrainAt(i)) ? 8 : 0; // keep off the low coast if possible
    const score = (FAR_FROM_TOWN.includes(type) ? d : type === "office" || type === "home" ? -d : -Math.abs(d - 5)) - low;

    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }

  return best;
}

// Build one of a type wherever it fits best (used by the quick-build shortcut and the test bot).
function autoBuild(type) {
  const i = bestTileFor(type);

  if (i < 0) {
    if (!gamePaused) addNews("🗺 There is no free tile where a " + BUILDINGS[type].name + " can go.");
    return false;
  }

  return placeBuilding(type, i);
}

// Sell the most recently built one of a type.
function autoSell(type) {
  const list = tilesOf(type).sort((a, b) => X.map.b[b].n - X.map.b[a].n);

  return list.length ? removeBuildingAt(list[0], "sell") : false;
}

// Destroy a random one of a type (bushfires, events).
function destroyRandom(type, mode) {
  const list = tilesOf(type);

  if (!list.length) return false;

  return removeBuildingAt(list[Math.floor(Math.random() * list.length)], mode);
}

// Makes the map match the building counts (new scenarios, and saves from before the map existed).
function syncMapWithCounts() {
  for (const type in BUILDINGS) {
    const want = buildingCount(type);
    let have = tilesOf(type);

    while (have.length > want) {
      removeBuildingAt(have.pop(), "quiet");
    }

    for (let k = have.length; k < want; k++) {
      let i = bestTileFor(type);

      if (i < 0) i = bestTileFor(type, true); // squeeze it in somewhere

      if (i < 0) break;
      setTile(i, type);
    }

    have = tilesOf(type);
  }

  // Solar farms remember which research level they were built with.
  const farms = tilesOf("solar");

  farms.forEach((i, k) => (X.map.b[i].lv = k < solarAdvanced ? 2 : k < solarAdvanced + solarBoosted ? 1 : 0));
  updateHomes();
}

// Homes spread out from the town hall as people move in, and empty out when they leave.
function updateHomes() {
  if (!X.map) return;

  const target = Math.max(3, Math.ceil(population / HOME_PEOPLE));
  const homes = tilesOf("home");
  const hall = X.map.hall;

  if (homes.length < target) {
    const free = [];

    for (let i = 0; i < MAP_N; i++) {
      if (!X.map.b[i] && LAND.includes(terrainAt(i)) && !isFlooded(i)) free.push(i);
    }

    free.sort((a, b) => tileDistance(a, hall) - tileDistance(b, hall) || a - b);
    free.slice(0, target - homes.length).forEach((i) => setTile(i, "home"));
  } else if (homes.length > target + 1) {
    homes.sort((a, b) => tileDistance(b, hall) - tileDistance(a, hall));
    homes.slice(0, homes.length - target).forEach((i) => removeBuildingAt(i, "quiet"));
  }
}

// Builds a map for the current scenario if there isn't one yet.
function ensureMap() {
  if (X.map && typeof X.map.t === "string" && X.map.t.length === MAP_N && Array.isArray(X.map.b)) return;

  generateMap(X.scenario, Math.floor(Math.random() * 1e9));
  syncMapWithCounts();
}

// ---------- Drawing ----------

// The board is 16 tiles wide and 8 tall (each diamond is twice as wide as it is tall),
// with a strip on top so tall buildings in the back row still fit.
const ISO = { w: 16, h: 9.5, pad: 1 };

function tileCenter(i) {
  const c = tileCol(i);
  const r = tileRow(i);

  return { x: (c - r) * 0.5 + 8, y: (c + r) * 0.25 + 0.25 + ISO.pad };
}

const pct = (value, of) => +((value / of) * 100).toFixed(3) + "%";

let mapDom = null;
let hoverTile = -1;
let pickedTile = -1;

function buildMapDom() {
  const scene = el.mapScene;
  const skirt = [[0, 4], [8, 8], [16, 4], [16, 4.45], [8, 8.45], [0, 4.45]]
    .map(([x, y]) => pct(x, ISO.w) + " " + pct(y + ISO.pad, ISO.h))
    .join(", ");

  let tiles = "";

  for (let i = 0; i < MAP_N; i++) {
    const { x, y } = tileCenter(i);
    const type = terrainAt(i);
    const site = TERRAIN[X.map.t[i]].site;

    tiles +=
      `<div class="tile-cell tr-${type}${(tileCol(i) + tileRow(i)) % 2 ? " alt" : ""}" data-i="${i}" ` +
      `style="left:${pct(x - 0.5, ISO.w)};top:${pct(y - 0.25, ISO.h)}">` +
      (site ? `<span class="site-mark">${site}</span>` : type === "woods" ? `<span class="deco">🌲</span>` : type === "farm" ? `<span class="deco">🌾</span>` : "") +
      `</div>`;
  }

  scene.innerHTML =
    `<div class="iso" id="iso" style="aspect-ratio:${ISO.w}/${ISO.h}">` +
    `<div class="iso-skirt" style="clip-path:polygon(${skirt})"></div>` +
    `<div class="iso-tiles">${tiles}</div>` +
    `<div class="iso-objects"></div>` +
    `<div class="map-object iso-ghost" hidden><span class="object-art"><span class="object-details"></span><span class="object-icon"></span></span></div>` +
    `</div>` +
    `<div class="map-badges" id="mapBadges"></div>`;

  mapDom = {
    t: X.map.t,
    tiles: [...scene.querySelectorAll(".tile-cell")],
    objects: scene.querySelector(".iso-objects"),
    ghost: scene.querySelector(".iso-ghost"),
    badges: scene.querySelector("#mapBadges"),
    rev: -1,
    tool: undefined,
  };
}

function objectHTML(i, piece, extraClass = "") {
  const { x, y } = tileCenter(i);
  const art = { home: "house", hall: "hall", offshore: "wind offshore" }[piece.t] || piece.t;
  const icon = (BUILDINGS[piece.t] || CITY_PIECES[piece.t]).icon;

  return (
    `<div class="map-object ${art}${extraClass}" data-i="${i}" title="${pieceName(piece.t)}" ` +
    `style="left:${pct(x, ISO.w)};top:${pct(y + 0.12, ISO.h)};z-index:${tileCol(i) + tileRow(i) + 10}">` +
    `<span class="object-art"><span class="object-details" aria-hidden="true"></span><span class="object-icon">${icon}</span></span></div>`
  );
}

function renderMap() {
  if (!X.map || !el.mapScene) return;
  if (!mapDom || mapDom.t !== X.map.t || !el.mapScene.contains(mapDom.objects)) buildMapDom();

  const tool = selectedTool;
  const walled = programLevel("seawall") > 0;

  if (mapDom.rev !== X.map.rev || mapDom.tool !== tool || mapDom.walled !== walled) {
    const placing = tool && tool !== "bulldoze";

    mapDom.tiles.forEach((cell, i) => {
      const flooded = isFlooded(i);
      const ok = placing && !placeProblem(tool, i);

      cell.classList.toggle("flooded", flooded);
      // Sea walls show on the coast they protect (at least the beach).
      cell.classList.toggle("walled", walled && !flooded && elevation()[i] > 0 && elevation()[i] <= Math.max(1, Math.floor(X.sea / 12)));
      cell.classList.toggle("can", !!ok);
      cell.classList.toggle("cant", !!placing && !ok);
      cell.classList.toggle("doze", tool === "bulldoze" && !!X.map.b[i] && !!BUILDINGS[X.map.b[i].t]);
      cell.classList.toggle("picked", i === pickedTile);
      cell.querySelector(".site-mark")?.toggleAttribute("hidden", !!X.map.b[i]);
    });
  }

  if (mapDom.rev !== X.map.rev) {
    let html = "";

    for (let i = 0; i < MAP_N; i++) if (X.map.b[i]) html += objectHTML(i, X.map.b[i]);

    mapDom.objects.innerHTML = html;
  }

  mapDom.objects.classList.toggle("passthrough", !!tool && tool !== "bulldoze");
  mapDom.rev = X.map.rev;
  mapDom.tool = tool;
  mapDom.walled = walled;

  renderMapBadges();
  renderMapInfo();
}

// Policies show up as badges on the map.
function renderMapBadges() {
  const active = PROGRAMS.filter((p) => programLevel(p.id) > 0);
  const html =
    active.map((p) => `<span class="badge" title="${p.name} level ${programLevel(p.id)}">${p.icon}<i>${"●".repeat(programLevel(p.id))}</i></span>`).join("") +
    (X.carbonTax > 0 ? `<span class="badge" title="Carbon tax: ${TAX_NAMES[X.carbonTax]}">💲<i>${"●".repeat(X.carbonTax)}</i></span>` : "");

  if (mapDom.badges.innerHTML !== html) mapDom.badges.innerHTML = html;
}

// The line under the map: what the tool would do, or what is on the chosen tile.
function renderMapInfo() {
  const box = document.getElementById("mapInfo");

  if (!box) return;

  const i = hoverTile >= 0 ? hoverTile : pickedTile;
  let html = "";

  if (selectedTool && selectedTool !== "bulldoze") {
    const b = BUILDINGS[selectedTool];
    const problem = i >= 0 ? placeProblem(selectedTool, i) : "";

    html =
      `<b>${b.icon} ${b.name}</b> $${b.cost.toLocaleString()} · ${b.effect()} · upkeep $${b.upkeep}/month` +
      (i < 0 ? ` <span class="hint">Click a glowing tile to build. Esc to stop.</span>` : problem ? ` <span class="bad">✖ ${problem}.</span>` : ` <span class="good">✔ Click to build here.</span>`);
  } else if (i >= 0) {
    const info = TERRAIN[X.map.t[i]];
    const piece = X.map.b[i];
    const where = isFlooded(i) ? "🌊 Flooded " + info.name.toLowerCase() : info.name + (info.siteText && !piece ? " · " + info.site + " " + info.siteText : "");

    if (piece) {
      const b = BUILDINGS[piece.t];

      html = `<b>${(b || CITY_PIECES[piece.t]).icon} ${pieceName(piece.t)}</b> on ${where.toLowerCase()}`;
      if (b) {
        html += ` · ${b.effect()}`;
        if (selectedTool === "bulldoze" || i === pickedTile) {
          html += ` <button class="mini" onclick="removeBuildingAt(${i}, 'sell')">${b.refund < 0 ? "Shut down $" + -b.refund : "Sell +$" + b.refund}</button>`;
        }
      } else {
        html += piece.t === "home" ? " · About " + HOME_PEOPLE.toLocaleString() + " people live here" : " · The heart of your city";
      }
    } else {
      html = `<b>${where}</b>` + (info.note ? " · " + info.note : "") + (elevation()[i] <= 3 && !isFlooded(i) ? " · 🌊 Low coast: may flood as the sea rises" : "");
    }
  } else {
    html = `<span class="hint">Click a tile to see what's there. Pick a building in the Build tab to place it.</span>`;
  }

  if (box.innerHTML !== html) box.innerHTML = html;
}

// Highlights shown while choosing a building (called when the tool changes).
function renderMapTools() {
  if (!mapDom) return;
  mapDom.tool = undefined; // force the tile classes to refresh
  hideGhost();
  renderMap();
}

function showGhost(i) {
  const ghost = mapDom && mapDom.ghost;

  if (!ghost || !selectedTool || selectedTool === "bulldoze") return hideGhost();

  const { x, y } = tileCenter(i);
  const type = selectedTool;

  ghost.className = "map-object iso-ghost " + (type === "offshore" ? "wind offshore" : type) + (placeProblem(type, i) ? " bad" : "");
  ghost.style.left = pct(x, ISO.w);
  ghost.style.top = pct(y + 0.12, ISO.h);
  ghost.querySelector(".object-icon").textContent = BUILDINGS[type].icon;
  ghost.hidden = false;
}

function hideGhost() {
  if (mapDom && mapDom.ghost) mapDom.ghost.hidden = true;
}

function tileFromEvent(event) {
  const target = event.target.closest("[data-i]");

  return target ? Number(target.dataset.i) : -1;
}

function initMapInput() {
  const scene = el.mapScene;

  scene.addEventListener("pointermove", (event) => {
    const i = tileFromEvent(event);

    if (i === hoverTile) return;
    if (mapDom) mapDom.tiles.forEach((cell, k) => cell.classList.toggle("hover", k === i));
    hoverTile = i;
    if (i >= 0) showGhost(i);
    else hideGhost();
    renderMapInfo();
  });

  scene.addEventListener("pointerleave", () => {
    hoverTile = -1;
    if (mapDom) mapDom.tiles.forEach((cell) => cell.classList.remove("hover"));
    hideGhost();
    renderMapInfo();
  });

  scene.addEventListener("click", (event) => {
    const i = tileFromEvent(event);

    if (i < 0 || gamePaused) return;

    if (selectedTool === "bulldoze") {
      removeBuildingAt(i, "sell");
    } else if (selectedTool) {
      placeBuilding(selectedTool, i);
      showGhost(i);
    } else {
      pickedTile = pickedTile === i ? -1 : i;
      mapDom.tool = undefined;
      renderMap();
    }
  });

  // Right-click or Esc puts the tool down.
  scene.addEventListener("contextmenu", (event) => {
    if (!selectedTool) return;
    event.preventDefault();
    selectTool(selectedTool);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selectedTool) selectTool(selectedTool);
  });
}
