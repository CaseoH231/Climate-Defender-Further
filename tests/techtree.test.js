// ======================================================================
// TECH TREE TESTS: every project has a branch and valid needs, needs are enforced,
// research bonuses work and the new buildings can be built in the right places.
// ======================================================================

async function runTechTreeTests() {
  log("TECH TREE");

  let w = await boot();

  w.startScenario("classic");

  const projects = w.eval("researchProjects");
  const ids = Object.keys(projects);
  const branches = w.eval("TECH_BRANCHES").map((b) => b.id);

  check("every project is in a branch", ids.every((id) => branches.includes(projects[id].branch)), ids.find((id) => !branches.includes(projects[id].branch)));
  check("every need is a real project", ids.every((id) => (projects[id].needs || []).every((n) => projects[n])));
  check("every project has an upgrade to run when it finishes", ids.every((id) => w.eval("upgrades")[id]), ids.find((id) => !w.eval("upgrades")[id]));
  check("no project needs itself in a loop", ids.every((id) => w.techDepth(id) < 10));

  // Needs are enforced
  w.eval("money = 50000");
  w.startResearch("offshore");
  check("can't start Offshore Wind before Wind Energy", w.eval("activeResearch") === null);
  w.startResearch("wind");
  check("can start Wind Energy", w.eval("activeResearch") === "wind");
  w.eval("researchProgress = 99; processResearch()");
  check("finished research unlocks", w.eval("researchProjects.wind.unlocked && windUnlocked"));
  w.startResearch("offshore");
  check("then Offshore Wind can start", w.eval("activeResearch") === "offshore");

  // Bonuses
  const demandBefore = w.getPowerDemand();

  w.eval("researchProjects.smartMeters.unlocked = true");
  check("Smart Meters cut demand", w.getPowerDemand() < demandBefore);

  const storeBefore = w.eval("batteries = 2; batteryStore()");

  w.eval("researchProjects.gridBatteries.unlocked = true");
  check("Grid-Scale Batteries store more", w.eval("batteryStore()") > storeBefore);

  const key = Object.keys(w.eval("X.grid.lines"))[0];
  const lineBefore = w.lineCapacity(key);

  w.eval("researchProjects.hvLines.unlocked = true");
  check("High-Voltage Lines carry more", w.lineCapacity(key) > lineBefore);

  const forestBefore = w.forestCleaning();

  w.eval("researchProjects.forestScience.unlocked = true");
  check("Forest Science makes forests clean more", w.forestCleaning() > forestBefore);

  // Solar repowering
  w.eval("solarUpgrade = true; advancedSolarUnlocked = true; researchProjects.solar2.unlocked = true; researchProjects.advancedSolar.unlocked = true");
  w.autoBuild("solar");
  w.autoBuild("solar");

  const outputBefore = w.getSolarOutput();

  w.eval("solarAdvanced = 0; solarBoosted = 0; tilesOf('solar').forEach((i) => (X.map.b[i].lv = 0))");
  w.eval("repowerSolar()");
  check("Solar Repowering upgrades every farm", w.getSolarOutput() >= outputBefore && w.tilesOf("solar").every((i) => w.tileBuilding(i).lv === 2));

  // New buildings
  check("Tidal Generators are locked before research", !w.isUnlocked("tidal"));
  w.eval("researchProjects.tidal.unlocked = true; researchProjects.biogas.unlocked = true");

  const sea = [...Array(256).keys()];
  const shore = sea.find((i) => w.terrainAt(i) === "sea" && !w.placeProblem("tidal", i));
  const deep = sea.find((i) => w.terrainAt(i) === "sea" && w.placeProblem("tidal", i));

  check("tidal can't go in deep sea", deep === undefined || !w.placeBuilding("tidal", deep));
  check("tidal goes in the sea next to the shore", shore !== undefined && w.placeBuilding("tidal", shore) && w.eval("X.plants.tidal") === 1);
  check("biogas can be built", w.autoBuild("biogas") && w.eval("X.plants.biogas") === 1);

  w.eval("nextMonth()");
  check("biogas shows in the pollution report as a clean-up", w.eval("lastBreakdown.biogas") < 0);
  check("tidal and biogas count as clean power", w.getCleanShare() > 0);

  // The tree draws
  w.document.querySelector('[data-tab="tabResearch"]').click();
  w.updateUI();
  check("the Research tab shows every project", w.document.querySelectorAll("#researchButtons .tech").length === ids.length);
  check("the Research tab shows the branches", w.document.querySelectorAll("#researchButtons .branch").length === branches.length);
  check("no errors in the tech tree", w.__errors.length === 0, w.__errors[0]);

  // Saves keep finished research
  w.eval("saveGame()");
  w = await boot({ keepSave: true });
  check("save and reload keeps research and the new plants", w.eval("researchProjects.smartMeters.unlocked") && w.eval("X.plants.tidal") === 1 && w.tilesOf("tidal").length === 1);
}
