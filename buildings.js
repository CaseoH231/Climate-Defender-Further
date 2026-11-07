// ======================================================================
// BUILDINGS: the one place that says what every building costs, where it can go
// and what it does. The build menu, the map, tooltips and upkeep all read from here.
//
//   cost / refund  money to build / money back when sold (a negative refund costs money)
//   upkeep         running cost each month (before difficulty and the big-city multiplier)
//   on             terrain types it can be placed on (see TERRAIN in map.js)
//   needsWater     must sit next to water (cooling for nuclear)
//   unlocked()     false until the research is done
//   lockText       shown while locked
//   add(tile)      called after it is placed. Returns the tile "level" (only solar uses it)
//   remove(tile)   called when it is sold or destroyed
//   effect()       short text for tooltips: what it makes and what it pollutes
// ======================================================================

const LAND = ["grass", "sand", "beach", "hills"];

const BUILDINGS = {
  solar: {
    icon: "☀", name: "Solar Farm", group: "power", cost: 200, refund: 100, upkeep: 8, on: LAND,
    effect: () => "+" + (advancedSolarUnlocked ? 45 : solarUpgrade ? 30 : 20) + " MW in sunshine · −1 pollution/month",
    add() {
      solar++;
      learnTerm("renewable");
      learnTerm("mitigation");
      addNews("☀ Solar Farm Built");
      if (advancedSolarUnlocked) return solarAdvanced++, 2;
      if (solarUpgrade) return solarBoosted++, 1;
      return 0;
    },
    remove(tile) {
      solar--;
      if (tile.lv === 2) solarAdvanced = Math.max(0, solarAdvanced - 1);
      else if (tile.lv === 1) solarBoosted = Math.max(0, solarBoosted - 1);
    },
  },
  wind: {
    icon: "🌬", name: "Wind Turbine", group: "power", cost: 350, refund: 175, upkeep: 12, on: LAND,
    unlocked: () => windUnlocked, lockText: "Research Wind Energy first",
    effect: () => "+" + WIND_MW + " MW when windy · −2 pollution/month",
    add() {
      wind++;
      pollution -= 2;
      learnTerm("renewable");
      addNews("🌬 Wind Turbine Built");
    },
    remove() {
      wind--;
    },
  },
  forest: {
    icon: "🌳", name: "Forest", group: "nature", cost: 50, refund: 25, upkeep: 3, on: ["grass", "hills", "sand"],
    effect: () => "Soaks up " + forestCleaning() + " pollution/month",
    add() {
      forest++;
      pollution -= 2;
      learnTerm("carbonsink");
      addNews("🌳 Forest Project Started");
    },
    remove() {
      forest--;
      pollution += 2;
    },
  },
  battery: {
    icon: "🔋", name: "Battery", group: "power", cost: 1200, refund: 600, upkeep: 8, on: LAND,
    unlocked: () => batteryUnlocked, lockText: "Research Battery Technology first",
    effect: () => "Stores " + Math.round(BATTERY_CAPACITY * (1 + techEffect("battery"))) + " MW of spare power",
    add() {
      batteries++;
      learnTerm("storage");
      addNews("🔋 Battery Storage Built. It saves spare electricity for later.");
    },
    remove() {
      batteries--;
      batteryCharge = Math.min(batteryCharge, batteryStore());
    },
  },
  nuclear: {
    icon: "⚛", name: "Nuclear Plant", group: "power", cost: NUCLEAR_COST, refund: -NUCLEAR_DECOMMISSION, upkeep: 120, on: LAND, needsWater: true,
    unlocked: () => nuclearUnlocked, lockText: "Research Nuclear Power first",
    effect: () => "+" + NUCLEAR_MW + " MW in any weather · radioactive waste · must be next to water",
    allowed() {
      if (nuclearPlants < getNuclearAllowed()) return "";
      return "Your city needs " + (NUCLEAR_MIN_POP + nuclearPlants * NUCLEAR_POP_PER_PLANT).toLocaleString() + " residents for another nuclear plant";
    },
    add() {
      nuclearPlants++;
      approval -= 3; // some residents are worried
      learnTerm("nuclear");
      learnTerm("baseload");
      addNews("⚛ Nuclear Power Plant built. It makes a steady " + NUCLEAR_MW + " MW in any weather, but it makes radioactive waste and some residents are worried (-3 approval).");
    },
    remove() {
      nuclearPlants--; // its waste stays and still has to be stored
    },
  },
  capture: {
    icon: "☁", name: "Carbon Capture", group: "nature", cost: 1500, refund: 750, upkeep: 25, on: LAND,
    unlocked: () => carbonCaptureUnlocked, lockText: "Research Carbon Capture first",
    effect: () => "Removes " + captureCleaning() + " pollution/month · uses " + CAPTURE_MW + " MW",
    add() {
      capturePlants++;
      learnTerm("carboncapture");
      addNews("🌎 Carbon Capture Plant Built. It removes 4 pollution a month.");
    },
    remove() {
      capturePlants--;
    },
  },
  office: {
    icon: "🏢", name: "Office", group: "city", cost: 1000, refund: 500, upkeep: 5, on: LAND,
    effect: () => "Grows the economy · +2 happiness · uses " + OFFICE_MW + " MW",
    add() {
      offices++;
      approval += 2;
      pollution += 1;
      addNews("🏢 Office Building Constructed");
    },
    remove() {
      offices--;
      approval -= 2;
      pollution -= 1;
    },
  },
  factory: {
    icon: "🏭", name: "Factory", group: "city", cost: 600, refund: 300, upkeep: 12, on: LAND,
    effect: () => "Boosts GDP · +8 pollution now, more each month · uses " + FACTORY_MW + " MW",
    add() {
      factories++;
      pollution += 8;
      addNews("🏭 Factory Built");
    },
    remove() {
      factories--;
      pollution -= 8;
      jobsLost(2);
    },
  },
  coal: {
    icon: "🛢", name: "Coal Plant", group: "power", cost: 100, refund: 50, upkeep: 30, on: LAND,
    effect: () => "+" + COAL_MW + " MW · +2 pollution/month",
    add() {
      coal++;
      pollution += 5;
      learnTerm("fossilfuel");
      learnTerm("emissions");
      addNews("🏭 Coal Plant Built");
    },
    remove() {
      coal--;
      approval -= X.mods.coalJobs; // in a mining town, closing a plant costs jobs
      jobsLost(2 + X.mods.coalJobs); // politics.js: workers remember
    },
  },
};

// The extra power plants keep their numbers in EXTRA_PLANTS (energy2.js).
const EXTRA_TERRAIN = { gas: LAND, hydro: ["rapids"], geo: ["vent"], offshore: ["shallow"], tidal: ["sea"], biogas: LAND };
const EXTRA_TERMS = { gas: ["gasplant", "fossilfuel"], hydro: ["hydro"], geo: ["geothermal"], offshore: ["renewable"], tidal: ["tidal"], biogas: ["biogas"] };
const EXTRA_HINTS = {
  gas: "+60 MW · +1 pollution/month · cheap, but still burns fossil fuel",
  hydro: "+80 MW, steady (less in heatwaves) · goes on 💧 river rapids",
  geo: "+50 MW, day and night · goes on a ♨ hot spring",
  offshore: "+90 MW when windy · goes on 🌊 shallow sea",
  tidal: "+45 MW, steady with the tides · goes in the sea right next to the shore",
  biogas: "+25 MW, steady · catches methane: −1 pollution/month",
};

for (const id in EXTRA_PLANTS) {
  const p = EXTRA_PLANTS[id];

  BUILDINGS[id] = {
    icon: p.icon, name: p.name, group: "power", cost: p.cost, refund: Math.floor(p.cost / 2), upkeep: p.upkeep,
    extra: true, on: EXTRA_TERRAIN[id], needsShore: id === "tidal",
    unlocked: p.needs ? () => researchProjects[p.needs].unlocked : undefined,
    lockText: p.needs ? "Research " + researchProjects[p.needs].name + " first" : "",
    effect: () => EXTRA_HINTS[id],
    add() {
      X.plants[id]++;
      EXTRA_TERMS[id].forEach(learnTerm);
      addNews(p.icon + " " + p.name + " built");
    },
    remove() {
      X.plants[id]--;
      if (id === "gas") jobsLost(1);
    },
  };
}

// Homes and the town hall are placed by the city itself, never by the player.
const CITY_PIECES = {
  home: { icon: "🏠", name: "Homes" },
  hall: { icon: "🏛", name: "Town Hall" },
};

const BUILD_GROUPS = [
  ["power", "⚡ Power"],
  ["nature", "🌳 Clean-up"],
  ["city", "🏙 City"],
];

// How many of a building the city has (the numbers the maths uses).
function buildingCount(type) {
  return {
    solar, wind, forest, battery: batteries, nuclear: nuclearPlants, capture: capturePlants,
    office: offices, factory: factories, coal,
  }[type] ?? X.plants[type] ?? 0;
}

function buildingCost(type) {
  return BUILDINGS[type].cost;
}

function isUnlocked(type) {
  const b = BUILDINGS[type];

  return !b.unlocked || b.unlocked();
}

// Monthly running costs of every building except the extra plants (energy2.js adds those, with the carbon tax).
function baseUpkeep() {
  let total = 0;

  for (const type in BUILDINGS) if (!BUILDINGS[type].extra) total += buildingCount(type) * BUILDINGS[type].upkeep;

  return total;
}

function totalBuildings() {
  let total = 0;

  for (const type in BUILDINGS) total += buildingCount(type);

  return total;
}

// ---------- The build menu ----------

let selectedTool = null; // a building type, "bulldoze", or null

function renderBuildMenu() {
  const box = document.getElementById("buildMenu");

  if (!box) return;

  if (!box.dataset.ready) {
    box.innerHTML =
      `<div class="tool-row">` +
      `<button class="tool" data-tool="bulldoze" onclick="selectTool('bulldoze')">🚜 Bulldoze</button>` +
      `<span class="tool-hint" id="toolHint">Pick a building, then click a tile on the map.</span>` +
      `</div>` +
      BUILD_GROUPS.map(
        ([group, title]) =>
          `<h3 class="build-sub">${title}</h3><div class="build-grid">` +
          Object.keys(BUILDINGS)
            .filter((type) => BUILDINGS[type].group === group)
            .map((type) => {
              const b = BUILDINGS[type];

              return `<div class="build-row" data-type="${type}">
                <button class="shop" onclick="selectTool('${type}')"><span class="own"></span><span class="ic">${b.icon}</span><span class="nm">${b.name}</span><span class="pr">$${b.cost.toLocaleString()}</span></button>
                <button class="sell" onclick="autoSell('${type}')">${b.refund < 0 ? "Shut down $" + -b.refund : "Sell +$" + b.refund}</button>
              </div>`;
            })
            .join("") +
          `</div>`,
      ).join("");
    box.dataset.ready = "1";
  }

  for (const row of box.querySelectorAll(".build-row")) {
    const type = row.dataset.type;
    const b = BUILDINGS[type];
    const [shop, sell] = row.querySelectorAll("button");
    const locked = !isUnlocked(type);
    const owned = buildingCount(type);
    const blocked = !locked && b.allowed ? b.allowed() : "";
    const room = locked ? 0 : freeTilesFor(type);

    shop.classList.toggle("locked", locked);
    shop.classList.toggle("selected", selectedTool === type);
    shop.disabled = locked || money < b.cost || !!blocked || room === 0;
    shop.querySelector(".own").textContent = owned > 0 ? owned : "";
    shop.title = locked
      ? b.lockText
      : blocked || (room === 0 ? "No free tiles where this can go" : money < b.cost ? "Not enough funds" : b.effect() + " · upkeep $" + b.upkeep + "/month");
    sell.disabled = owned <= 0 || (b.refund < 0 && money < -b.refund);
  }

  const hint = document.getElementById("toolHint");
  const extra = Math.round((upkeepMultiplier() - 1) * 100);

  if (hint) {
    hint.textContent =
      "Pick a building, then click a tile on the map. Building upkeep: $" + buildingUpkeep().toLocaleString() + "/month" +
      (extra > 0 ? " (big city: +" + extra + "% on everything, each new building adds 2%)" : "");
  }

  const bulldoze = box.querySelector('[data-tool="bulldoze"]');

  if (bulldoze) bulldoze.classList.toggle("selected", selectedTool === "bulldoze");
}

function selectTool(tool) {
  if (gamePaused) return;

  selectedTool = selectedTool === tool ? null : tool;
  sfx("click");
  renderBuildMenu();
  renderMapTools();
}
