// ======================================================================
// MORE POWER: gas, hydro, geothermal and offshore wind.
// ======================================================================

const EXTRA_PLANTS = {
  gas: { icon: "🔥", name: "Gas Plant", cost: 400, mw: 60, upkeep: 25, pollution: 1, needs: null, site: null, tip: "60 MW. Cheap, but still makes greenhouse gas." },
  hydro: { icon: "💧", name: "Hydro Dam", cost: 2500, mw: 80, upkeep: 20, pollution: 0, needs: "hydro", site: "hydro", tip: "80 MW. Needs a river site." },
  geo: { icon: "🌋", name: "Geothermal", cost: 2000, mw: 50, upkeep: 30, pollution: 0, needs: "geothermal", site: "geo", tip: "50 MW, steady day and night." },
  offshore: { icon: "🌊", name: "Offshore Wind", cost: 1800, mw: 90, upkeep: 35, pollution: 0, needs: "offshore", site: "offshore", tip: "90 MW, depends on wind." },
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
  return extraMW("hydro") + extraMW("geo") + extraMW("offshore");
}

function extraPollution() {
  let total = 0;

  for (const id in EXTRA_PLANTS) total += X.plants[id] * EXTRA_PLANTS[id].pollution;

  return total;
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
