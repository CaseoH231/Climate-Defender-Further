// ======================================================================
// MORE POWER: gas, hydro, geothermal and offshore wind.
// ======================================================================

const EXTRA_PLANTS = {
  gas: { icon: "🔥", name: "Gas Plant", cost: 400, mw: 60, upkeep: 25, pollution: 1, needs: null, site: null, tip: "60 MW. Cheap, but still makes greenhouse gas." },
  hydro: { icon: "💧", name: "Hydro Dam", cost: 2500, mw: 80, upkeep: 20, pollution: 0, needs: "hydro", site: "hydro", tip: "80 MW. Needs a river site." },
  geo: { icon: "🌋", name: "Geothermal", cost: 2000, mw: 50, upkeep: 30, pollution: 0, needs: "geothermal", site: "geo", tip: "50 MW, steady day and night." },
  offshore: { icon: "🌊", name: "Offshore Wind", cost: 1800, mw: 90, upkeep: 35, pollution: 0, needs: "offshore", site: "offshore", tip: "90 MW, depends on wind." },
  tidal: { icon: "🌀", name: "Tidal Generator", cost: 2200, mw: 45, upkeep: 30, pollution: 0, needs: "tidal", site: null, tip: "45 MW, steady with the tides." },
  biogas: { icon: "♻", name: "Biogas Plant", cost: 900, mw: 25, upkeep: 15, pollution: -1, needs: "biogas", site: null, tip: "25 MW from waste, and it catches methane." },
};

function extraMW(id) {
  const plant = EXTRA_PLANTS[id];
  let mw = X.plants[id] * plant.mw;

  if (id === "offshore") mw *= (currentWeather.wind ?? 1) * X.mods.windMul;
  if (id === "hydro" && currentWeather.name === "Heatwave") mw *= 0.7; // less water in a heatwave

  return mw;
}

// All electricity from the new plants (plus any change to the base grid in this city).
function extraPower() {
  let total = X.mods.baseDelta;

  for (const id in EXTRA_PLANTS) total += extraMW(id);

  return total;
}

function extraCleanMW() {
  return extraMW("hydro") + extraMW("geo") + extraMW("offshore") + extraMW("tidal") + extraMW("biogas");
}

function extraMaintenance() {
  let total = 0;

  for (const id in EXTRA_PLANTS) {
    const plant = EXTRA_PLANTS[id];
    // A carbon tax makes fossil plants dearer to run.
    const taxed = plant.pollution > 0 ? 1 + X.carbonTax * 0.25 : 1;

    total += X.plants[id] * plant.upkeep * taxed;
  }

  return total;
}
