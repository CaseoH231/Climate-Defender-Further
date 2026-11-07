// More research, and the shape of the tech tree.
// branch = which row of the Research tab it sits in, needs = projects to finish first,
// eff = lasting bonuses once finished (added up by techEffect in techtree.js).

Object.assign(researchProjects, {
  hydro: { id: "hydro", icon: "💧", name: "Hydropower", description: "Unlocks Hydro Dams: 80 MW of steady clean power each, but they need a river site.", cost: 1500, monthsRequired: 14, unlocked: false },
  geothermal: { id: "geothermal", icon: "🌋", name: "Geothermal", description: "Unlocks Geothermal plants: 50 MW of steady clean power, day and night, in any weather. Builds on the turbine know-how from hydropower.", cost: 2000, monthsRequired: 20, unlocked: false },
  offshore: { id: "offshore", icon: "🌊", name: "Offshore Wind", description: "Unlocks Offshore Wind farms: 90 MW each, but they depend on wind.", cost: 2200, monthsRequired: 20, unlocked: false },

  // New in the tech tree
  solarRepower: { id: "solarRepower", icon: "🔆", name: "Solar Repowering", description: "Swaps the old panels on every solar farm you already own for the newest ones, so they all make as much as a new farm.", cost: 1500, monthsRequired: 10, unlocked: false },
  tidal: { id: "tidal", icon: "🌀", name: "Tidal Power", description: "Unlocks Tidal Generators: 45 MW of steady power from the tides. They go in the sea right next to the shore.", cost: 2500, monthsRequired: 20, unlocked: false },
  biogas: { id: "biogas", icon: "♻", name: "Biogas", description: "Unlocks Biogas Plants: 25 MW from rotting food and farm waste. They catch methane that would leak anyway, so they remove 1 pollution a month.", cost: 900, monthsRequired: 10, unlocked: false },
  gridBatteries: { id: "gridBatteries", icon: "🔋", name: "Grid-Scale Batteries", description: "Every battery stores 60% more electricity.", cost: 1400, monthsRequired: 14, unlocked: false, eff: { battery: 0.6 } },
  smartMeters: { id: "smartMeters", icon: "📟", name: "Smart Meters", description: "Homes see their power use and save a bit. The city uses 4% less electricity.", cost: 700, monthsRequired: 8, unlocked: false, eff: { demand: 0.04 } },
  hvLines: { id: "hvLines", icon: "🗼", name: "High-Voltage Lines", description: "Every power line carries 40% more electricity.", cost: 1600, monthsRequired: 14, unlocked: false, eff: { grid: 0.4 } },
  bikeLanes: { id: "bikeLanes", icon: "🚲", name: "Bike Lanes", description: "Safe cycling across the city: 6% less city-life pollution, and people love it (+3 happiness).", cost: 600, monthsRequired: 8, unlocked: false, eff: { city: 0.06 } },
  greenBuildings: { id: "greenBuildings", icon: "🏡", name: "Green Building Code", description: "All new buildings must be well insulated and efficient. The city uses 6% less electricity.", cost: 1500, monthsRequired: 16, unlocked: false, eff: { demand: 0.06 } },
  floodWarning: { id: "floodWarning", icon: "📡", name: "Flood Warnings", description: "Early warnings get people to safety. Floods and storms do 30% less damage.", cost: 600, monthsRequired: 8, unlocked: false, eff: { flood: 0.3 } },
  coolRoofs: { id: "coolRoofs", icon: "🏠", name: "Cool Roofs", description: "Pale roofs and street trees keep the city cooler. Heatwaves do 30% less damage.", cost: 700, monthsRequired: 10, unlocked: false, eff: { heat: 0.3 } },
  droughtCrops: { id: "droughtCrops", icon: "🌾", name: "Drought-Proof Crops", description: "Crops that survive heat and dry spells. Farmers are much happier and bushfires do 15% less damage.", cost: 800, monthsRequired: 12, unlocked: false, eff: { farm: 6, fire: 0.15 } },
  directAir: { id: "directAir", icon: "🌀", name: "Direct Air Capture", description: "Carbon Capture Plants pull CO₂ straight out of the air: each removes 6 pollution a month instead of 4.", cost: 2200, monthsRequired: 20, unlocked: false, eff: { capture: 2 } },
  forestScience: { id: "forestScience", icon: "🌲", name: "Forest Science", description: "Planting the right mix of native trees: every forest soaks up 50% more carbon.", cost: 900, monthsRequired: 12, unlocked: false, eff: { forest: 0.5 } },
});

// Where each project sits in the tree.
const TECH_SHAPE = {
  solar2: { branch: "energy" },
  advancedSolar: { branch: "energy", needs: ["solar2"] },
  solarRepower: { branch: "energy", needs: ["advancedSolar"] },
  wind: { branch: "energy" },
  offshore: { branch: "energy", needs: ["wind"] },
  tidal: { branch: "energy", needs: ["offshore"] },
  hydro: { branch: "energy" },
  geothermal: { branch: "energy", needs: ["hydro"] },
  nuclear: { branch: "energy" },
  biogas: { branch: "energy" },
  battery: { branch: "storage" },
  gridBatteries: { branch: "storage", needs: ["battery"] },
  smartMeters: { branch: "storage" },
  hvLines: { branch: "storage", needs: ["smartMeters"] },
  electricBuses: { branch: "city" },
  bikeLanes: { branch: "city", needs: ["electricBuses"] },
  greenCity: { branch: "city" },
  greenBuildings: { branch: "city", needs: ["greenCity"] },
  floodWarning: { branch: "adapt" },
  coolRoofs: { branch: "adapt", needs: ["floodWarning"] },
  droughtCrops: { branch: "adapt" },
  forestScience: { branch: "removal" },
  carbonCapture: { branch: "removal", needs: ["greenCity"] },
  directAir: { branch: "removal", needs: ["carbonCapture"] },
};

for (const id in TECH_SHAPE) Object.assign(researchProjects[id], TECH_SHAPE[id]);

const researchNews = {
  hydro: "💧 RESEARCH COMPLETE: Hydro Dams unlocked! Falling water makes steady, clean electricity.",
  geothermal: "🌋 RESEARCH COMPLETE: Geothermal unlocked! Heat from underground makes power day and night.",
  offshore: "🌊 RESEARCH COMPLETE: Offshore Wind unlocked! Wind is stronger and steadier out at sea.",
  solarRepower: "🔆 RESEARCH COMPLETE: Every solar farm now has the newest panels!",
  tidal: "🌀 RESEARCH COMPLETE: Tidal Generators unlocked! Build them in the sea next to the shore.",
  biogas: "♻ RESEARCH COMPLETE: Biogas Plants unlocked! Waste becomes power instead of methane.",
  gridBatteries: "🔋 RESEARCH COMPLETE: Every battery now stores 60% more.",
  smartMeters: "📟 RESEARCH COMPLETE: Smart meters cut the city's power use by 4%.",
  hvLines: "🗼 RESEARCH COMPLETE: Power lines now carry 40% more.",
  bikeLanes: "🚲 RESEARCH COMPLETE: Bike lanes are open! Less traffic, cleaner air and happier people.",
  greenBuildings: "🏡 RESEARCH COMPLETE: The Green Building Code cuts power use by 6%.",
  floodWarning: "📡 RESEARCH COMPLETE: Flood warnings will keep people safer.",
  coolRoofs: "🏠 RESEARCH COMPLETE: Cool roofs make heatwaves easier to live through.",
  droughtCrops: "🌾 RESEARCH COMPLETE: Farmers are planting drought-proof crops.",
  directAir: "🌀 RESEARCH COMPLETE: Carbon Capture Plants now remove 6 pollution a month.",
  forestScience: "🌲 RESEARCH COMPLETE: Forests now soak up 50% more carbon.",
};

const RESEARCH_TERMS = { offshore: "renewable", tidal: "tidal", biogas: "biogas", solarRepower: "renewable", hvLines: "grid", gridBatteries: "storage", smartMeters: "efficiency", greenBuildings: "efficiency", bikeLanes: "transport", floodWarning: "adaptation", coolRoofs: "adaptation", droughtCrops: "adaptation", directAir: "carboncapture", forestScience: "carbonsink" };

for (const id in researchNews) {
  upgrades[id] = {
    name: researchProjects[id].name,
    apply() {
      learnTerm(RESEARCH_TERMS[id] || id);
      if (id === "bikeLanes") approval += 3;
      if (id === "solarRepower") repowerSolar();
      addNews(researchNews[id]);
      updateUI();
    },
  };
}

// Solar Repowering: every farm becomes the best kind the city can build.
function repowerSolar() {
  const best = advancedSolarUnlocked ? 2 : solarUpgrade ? 1 : 0;

  solarAdvanced = best === 2 ? solar : 0;
  solarBoosted = best === 1 ? solar : 0;
  if (X.map) tilesOf("solar").forEach((i) => (X.map.b[i].lv = best));
}
