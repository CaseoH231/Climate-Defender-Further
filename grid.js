// ======================================================================
// POWER GRID: power lines join neighbouring districts.
// Each month electricity flows from districts that make it to districts that use it.
// A line can only carry so much: if it is overloaded (or knocked down by a storm),
// the districts behind it get a local blackout, even when the city makes enough power.
// Batteries sit on the grid and can cover those shortfalls.
//
//   X.grid.lines   level of each line, keyed "a-b" (district numbers, a < b)
//   X.grid.down    lines knocked out by a storm: months left until fixed
//   X.grid.short   MW each district was short last month
//   X.grid.d       the district layout the lines were built for
// ======================================================================

const LINE_MW = [0, 150, 300, 500, 800]; // what a line carries at each level
const LINE_COST = [0, 0, 400, 900, 1800]; // price to upgrade to each level
const STORM_LINE_CHANCE = 0.35; // chance a storm knocks a line down

function lineKey(a, b) {
  return Math.min(a, b) + "-" + Math.max(a, b);
}

function lineEnds(key) {
  return key.split("-").map(Number);
}

// District pairs that touch (land or sea), so a line could run between them.
function districtPairs() {
  const pairs = new Set();

  for (let i = 0; i < MAP_N; i++) {
    for (const j of neighbours(i)) {
      const a = districtOf(i);
      const b = districtOf(j);

      if (a !== b) pairs.add(lineKey(a, b));
    }
  }

  return [...pairs];
}

// Builds a basic line between every pair of neighbouring districts, then makes the
// starting lines big enough that nobody starts the game in a blackout.
function ensureGrid() {
  if (!X.map) return;
  ensureDistricts();

  if (X.grid && X.grid.d === X.map.d && X.grid.lines) return;

  X.grid = { d: X.map.d, lines: {}, down: {}, short: {} };
  districtPairs().forEach((key) => (X.grid.lines[key] = 1));
  gridSetup();
}

// Upgrades the busiest lines until the city could use 30% more power without a local blackout.
function gridSetup() {
  for (let step = 0; step < 30; step++) {
    const flow = gridFlow(1.3);

    if (flow.localShort <= 0.5) return;

    const busiest = Object.entries(flow.lines)
      .filter(([key, line]) => line.load >= 0.99 && X.grid.lines[key] < LINE_MW.length - 1)
      .sort((a, b) => b[1].flow - a[1].flow)[0];

    if (!busiest) return;
    X.grid.lines[busiest[0]]++;
  }
}

function lineCapacity(key) {
  if (!X.grid || X.grid.down[key]) return 0;

  return Math.round(LINE_MW[X.grid.lines[key] || 0] * (1 + programEffect("grid") + techEffect("grid")));
}

// ---------- How power flows ----------

// Max-flow (Edmonds-Karp) on a tiny network: start → districts that make power →
// lines → districts that use power → end. useScale lets gridSetup plan for growth.
function gridFlow(useScale = 1) {
  const stats = districtStats();
  const n = stats.length;
  const S = n;
  const T = n + 1;
  const size = n + 2;
  const cap = Array.from({ length: size }, () => new Array(size).fill(0));

  stats.forEach((s, k) => {
    cap[S][k] = Math.max(0, s.made);
    cap[k][T] = Math.max(0, s.used * useScale);
  });

  const keys = X.grid ? Object.keys(X.grid.lines) : [];

  for (const key of keys) {
    const [a, b] = lineEnds(key);

    if (a >= n || b >= n) continue;

    const c = lineCapacity(key);

    cap[a][b] += c;
    cap[b][a] += c;
  }

  const left = cap.map((row) => row.slice()); // what can still flow
  let total = 0;

  for (;;) {
    const from = new Array(size).fill(-1);
    const queue = [S];

    from[S] = S;

    while (queue.length && from[T] < 0) {
      const u = queue.shift();

      for (let v = 0; v < size; v++) {
        if (from[v] < 0 && left[u][v] > 1e-9) {
          from[v] = u;
          queue.push(v);
        }
      }
    }

    if (from[T] < 0) break;

    let push = Infinity;

    for (let v = T; v !== S; v = from[v]) push = Math.min(push, left[from[v]][v]);
    for (let v = T; v !== S; v = from[v]) {
      left[from[v]][v] -= push;
      left[v][from[v]] += push;
    }

    total += push;
  }

  const used = stats.reduce((sum, s) => sum + s.used * useScale, 0);
  const made = stats.reduce((sum, s) => sum + Math.max(0, s.made), 0);
  const short = stats.map((s, k) => Math.max(0, s.used * useScale - (cap[k][T] - left[k][T])));
  const lines = {};

  for (const key of keys) {
    const [a, b] = lineEnds(key);

    if (a >= n || b >= n) continue;

    const c = lineCapacity(key);
    const flowAB = cap[a][b] - left[a][b];
    const flowBA = cap[b][a] - left[b][a];
    const net = (flowAB - flowBA) / 2; // the two directions share the line

    lines[key] = { flow: Math.abs(net), from: net >= 0 ? a : b, cap: c, load: c > 0 ? Math.abs(net) / c : Math.abs(net) > 0.5 ? 1 : 0 };
  }

  // Shortfall that is the lines' fault (not just the city making too little power).
  const localShort = Math.max(0, used - total - Math.max(0, used - made));

  return { stats, total, used, made, short, localShort, lines };
}

// Runs once a month after the city-wide power check. Returns true if there was a local blackout.
function gridMonth(cityShort) {
  ensureGrid();

  const flow = gridFlow();
  let blackout = false;

  X.grid.short = {};
  flow.short.forEach((mw, k) => {
    if (mw > 0.5) X.grid.short[k] = Math.round(mw);
  });

  if (!cityShort && flow.localShort > 0.5) {
    learnTerm("grid");

    // Batteries on the grid help first.
    const fromBatteries = Math.min(flow.localShort, batteryCharge);
    const missing = flow.localShort - fromBatteries;

    batteryCharge -= Math.round(fromBatteries);

    if (missing > 0.5) {
      const hit = flow.stats.filter((s, k) => X.grid.short[k]);
      const people = hit.reduce((sum, s) => sum + s.people, 0);
      const share = population > 0 ? people / population : 0;
      const loss = Math.max(2, Math.round(DIFF.blackoutHit * share));

      blackout = true;
      blackoutMonths++;
      approval -= loss;
      addNews(
        "🔌 Power lines overloaded! " + hit.map((s) => s.name).join(", ") + " had a blackout (" + people.toLocaleString() + " people, −" + loss + " happiness). " +
          "Upgrade the lines in the Districts tab. Blackout streak: " + blackoutMonths + "/" + BLACKOUT_LIMIT,
      );
    } else if (fromBatteries > 0) {
      addNews("🔋 The power lines were full, but batteries kept the lights on (" + Math.round(fromBatteries) + " MW).");
    }
  }

  // Lines knocked down by storms get fixed.
  for (const key in X.grid.down) {
    if (--X.grid.down[key] <= 0) delete X.grid.down[key];
  }

  return blackout;
}

// Storms can knock a line down for a month (Storm Drains make it less likely).
function stormHitsGrid() {
  if (!X.grid || Math.random() > STORM_LINE_CHANCE * (1 - weatherShield("flood"))) return;

  const keys = Object.keys(X.grid.lines).filter((key) => X.grid.lines[key] > 0 && !X.grid.down[key]);

  if (!keys.length) return;

  const key = keys[Math.floor(Math.random() * keys.length)];
  const [a, b] = lineEnds(key);

  X.grid.down[key] = 1;
  addNews("⛈ The storm knocked down the power line between " + X.map.dn[a] + " and " + X.map.dn[b] + ". Crews will fix it next month.");
}

// ---------- Upgrading lines ----------

function upgradeLine(key) {
  if (gamePaused || !X.grid || !(key in X.grid.lines)) return false;

  const level = X.grid.lines[key];

  if (level >= LINE_MW.length - 1) return false;

  const cost = LINE_COST[level + 1];

  if (!canBuy(cost)) return false;

  const [a, b] = lineEnds(key);

  money -= cost;
  book("grid", -cost);
  X.grid.lines[key] = level + 1;
  learnTerm("grid");
  addNews("⚡ Power line " + X.map.dn[a] + " ↔ " + X.map.dn[b] + " upgraded to " + LINE_MW[level + 1] + " MW.");
  sfx("build");
  if (mapDom) mapDom.overlayView = null;
  updateUI();
  return true;
}

// Every line with its numbers, busiest first (for the Districts tab and the test bot).
function gridLines() {
  ensureGrid();

  const flow = gridFlow();

  return Object.keys(X.grid.lines)
    .map((key) => {
      const [a, b] = lineEnds(key);
      const line = flow.lines[key] || { flow: 0, cap: 0, load: 0, from: a };

      return { key, a, b, level: X.grid.lines[key], down: !!X.grid.down[key], ...line };
    })
    .sort((x, y) => y.load - x.load || y.flow - x.flow);
}

function loadColor(load, down) {
  return down ? "#8a94a0" : load >= 0.99 ? "#ff4d4d" : load >= 0.75 ? "#ffa62b" : "#35c767";
}

// ---------- Drawing ----------

function districtCentre(k) {
  const tiles = [...Array(MAP_N).keys()].filter((i) => districtOf(i) === k && !SEA.has(terrainAt(i)));
  const list = tiles.length ? tiles : [...Array(MAP_N).keys()].filter((i) => districtOf(i) === k);
  const c = list.reduce((sum, i) => sum + tileCol(i), 0) / list.length;
  const r = list.reduce((sum, i) => sum + tileRow(i), 0) / list.length;

  return { x: (c - r) * 0.5 + 8, y: (c + r) * 0.25 + 0.25 + ISO.pad };
}

// The ⚡ Grid map view: a line between district centres, thicker when upgraded, coloured by load.
function gridOverlayHTML() {
  const lines = gridLines();
  const flow = gridFlow();
  const centres = X.map.dn.map((_, k) => districtCentre(k));
  const svg =
    `<svg class="grid-svg" viewBox="0 0 ${ISO.w * 100} ${ISO.h * 100}" preserveAspectRatio="none">` +
    lines
      .map((line) => {
        // Drawn from the sending district, so the moving dashes show which way power flows.
        const p = centres[line.from === line.b ? line.b : line.a];
        const q = centres[line.from === line.b ? line.a : line.b];

        return `<line x1="${p.x * 100}" y1="${p.y * 100}" x2="${q.x * 100}" y2="${q.y * 100}" stroke="${loadColor(line.load, line.down)}" stroke-width="${4 + line.level * 4}" stroke-linecap="round"${line.down ? ' stroke-dasharray="14 14"' : line.flow > 0.5 ? ' class="flowing"' : ""}/>`;
      })
      .join("") +
    `</svg>`;

  const tags = flow.stats
    .map((s, k) => {
      const net = Math.round(s.made - s.used);
      const p = centres[k];
      const short = X.grid.short[k];

      return `<span class="district-tag grid-tag${short ? " short" : ""}" style="left:${pct(p.x, ISO.w)};top:${pct(p.y, ISO.h)};--dc:${DISTRICT_COLORS[k % DISTRICT_COLORS.length]}">${s.name} ${net >= 0 ? "+" : ""}${net} MW${short ? " 🔌" : ""}</span>`;
    })
    .join("");

  return svg + tags;
}

// The power line list in the Districts tab.
function gridPanelHTML() {
  const lines = gridLines();
  const bonus = Math.round((programEffect("grid") + techEffect("grid")) * 100);

  return (
    `<h3 class="build-sub">⚡ Power lines</h3>` +
    `<p class="learn-note">Power flows along these lines from districts that make it to districts that use it. A full line (red) means a local blackout behind it. ` +
    (bonus ? `Smart Grid and research add ${bonus}% to every line.` : `The Smart Grid policy makes every line carry more.`) +
    ` Press ⚡ Grid on the map to see them.</p>` +
    `<div class="line-list">` +
    lines
      .map((line) => {
        const next = line.level + 1;
        const maxed = next >= LINE_MW.length;
        const pctFull = Math.min(100, Math.round(line.load * 100));

        return (
          `<div class="line-row">` +
          `<span class="ln-name">${X.map.dn[line.a]} ↔ ${X.map.dn[line.b]}</span>` +
          `<span class="ln-bar"><i style="width:${pctFull}%;background:${loadColor(line.load, line.down)}"></i></span>` +
          `<span class="ln-num">${line.down ? "⛈ down" : Math.round(line.flow) + " / " + line.cap + " MW"}</span>` +
          (maxed
            ? `<span class="ln-max">✅ Biggest</span>`
            : `<button class="mini" onclick="upgradeLine('${line.key}')" ${money < LINE_COST[next] ? "disabled" : ""}>Upgrade to ${LINE_MW[next]} MW $${LINE_COST[next].toLocaleString()}</button>`) +
          `</div>`
        );
      })
      .join("") +
    `</div>`
  );
}
