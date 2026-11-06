// More research. These are added to the lists in research.js and upgrades.js.
Object.assign(researchProjects, {
  hydro: { id: "hydro", icon: "💧", name: "Hydropower", description: "Unlocks Hydro Dams: 80 MW of steady clean power each, but they need a river site.", cost: 1500, monthsRequired: 14, unlocked: false },
  geothermal: { id: "geothermal", icon: "🌋", name: "Geothermal", description: "Unlocks Geothermal plants: 50 MW of steady clean power, day and night, in any weather.", cost: 2000, monthsRequired: 20, unlocked: false },
  offshore: { id: "offshore", icon: "🌊", name: "Offshore Wind", description: "Unlocks Offshore Wind farms: 90 MW each, but they depend on wind.", cost: 2200, monthsRequired: 20, unlocked: false },
});

const researchNews = {
  hydro: "💧 RESEARCH COMPLETE: Hydro Dams unlocked! Falling water makes steady, clean electricity.",
  geothermal: "🌋 RESEARCH COMPLETE: Geothermal unlocked! Heat from underground makes power day and night.",
  offshore: "🌊 RESEARCH COMPLETE: Offshore Wind unlocked! Wind is stronger and steadier out at sea.",
};

for (const id in researchNews) {
  upgrades[id] = {
    name: researchProjects[id].name,
    apply() {
      learnTerm(id === "offshore" ? "renewable" : id);
      addNews(researchNews[id]);
      updateUI();
    },
  };
}
