// ======================================================================
// MAP TESTS: the tile map stays in step with the building counts, placement
// rules hold, flooding destroys low coastal buildings, and old saves get a map.
// ======================================================================

// Every building type has exactly as many tiles as the maths thinks it has.
function countsMatch(w) {
  for (const type of Object.keys(w.eval("BUILDINGS"))) {
    const tiles = w.tilesOf(type).length;
    const count = w.buildingCount(type);

    if (tiles !== count) return type + ": " + tiles + " tiles but count " + count;
  }

  return "";
}

const firstTile = (w, terrain) => [...Array(256).keys()].find((i) => w.terrainAt(i) === terrain && !w.tileBuilding(i));

async function runMapTests() {
  log("MAP");

  let w = await boot();

  check("main.js finished starting the game", w.eval("typeof loadedSave") === "boolean");

  for (const s of w.eval("SCENARIOS")) {
    w = await boot();
    w.startScenario(s.id);

    const sites = w.eval("X.mods.sites");
    const count = (terrain) => [...Array(256).keys()].filter((i) => w.terrainAt(i) === terrain).length;

    check(s.id + ": map matches starting buildings", countsMatch(w) === "", countsMatch(w));
    check(s.id + ": special sites match the scenario", count("rapids") === sites.hydro && count("vent") === sites.geo && count("shallow") === sites.offshore,
      "rapids " + count("rapids") + "/" + sites.hydro + ", vents " + count("vent") + "/" + sites.geo + ", shallow " + count("shallow") + "/" + sites.offshore);
    check(s.id + ": homes follow the population", w.tilesOf("home").length >= Math.ceil(w.eval("population") / w.eval("HOME_PEOPLE")));

    play(w, 36);
    check(s.id + ": still matches after 3 years of play", countsMatch(w) === "", countsMatch(w));
  }

  // Placement rules
  w = await boot();
  w.startScenario("classic");
  w.eval("money = 50000; researchProjects.hydro.unlocked = true; researchProjects.offshore.unlocked = true; windUnlocked = true");

  const grass = firstTile(w, "grass");
  const sea = firstTile(w, "sea");
  const rapids = firstTile(w, "rapids");
  const shallow = firstTile(w, "shallow");

  check("solar can't go on the sea", !w.placeBuilding("solar", sea) && !w.tileBuilding(sea));
  check("hydro can't go on grass", !w.placeBuilding("hydro", grass));
  check("hydro goes on rapids", w.placeBuilding("hydro", rapids) && w.eval("X.plants.hydro") === 1);
  check("offshore wind goes on shallow sea", w.placeBuilding("offshore", shallow) && w.eval("X.plants.offshore") === 1);
  check("a taken tile can't be built on", !w.placeBuilding("solar", rapids));

  const moneyBefore = w.eval("money");

  check("building costs the table price", w.placeBuilding("solar", grass) && w.eval("money") === moneyBefore - w.buildingCost("solar"));
  check("selling a tile refunds and frees it", w.removeBuildingAt(grass, "sell") && !w.tileBuilding(grass) && w.eval("money") === moneyBefore - 200 + 100);
  check("locked buildings can't be placed", !w.placeBuilding("nuclear", firstTile(w, "grass")));
  check("counts still match after placing and selling", countsMatch(w) === "", countsMatch(w));

  // Flooding
  w = await boot();
  w.startScenario("coastal");

  const beach = [...Array(256).keys()].filter((i) => w.terrainAt(i) === "beach" && !w.tileBuilding(i));

  w.eval("money = 5000");
  beach.slice(0, 3).forEach((i) => w.placeBuilding("solar", i));

  const solarBefore = w.eval("solar");

  w.eval("X.sea = 13; coastalFlooding()");
  check("rising sea floods the beach", beach.slice(0, 3).every((i) => w.isFlooded(i)));
  check("flooding destroys what was on the beach", w.eval("solar") === solarBefore - 3 && countsMatch(w) === "", countsMatch(w));
  check("you can't build on flooded tiles", !w.placeBuilding("solar", beach[0]));

  w.eval("X.programs.seawall = 1; coastalFlooding()");
  check("sea walls push the water back", !w.isFlooded(beach[0]));

  // Saves from before the map existed
  w = await boot({ save: { money: 3000, population: 18000, month: 2, year: 2028, coal: 6, solar: 4, forest: 2, offices: 2, factories: 1, x: { scenario: "classic", started: true, plants: { gas: 2 } } } });
  check("an old save gets a map with its buildings", w.eval("X.map") && countsMatch(w) === "" && w.tilesOf("gas").length === 2, countsMatch(w));
  check("no errors while loading the old save", w.__errors.length === 0, w.__errors[0]);

  // Land on harder years
  w = await boot({ difficulty: 12 });
  w.startScenario("classic");

  const land12 = [...Array(256).keys()].filter((i) => w.eval("LAND").includes(w.terrainAt(i))).length;

  w = await boot({ difficulty: 6 });
  w.startScenario("classic");

  const land6 = [...Array(256).keys()].filter((i) => w.eval("LAND").includes(w.terrainAt(i))).length;

  check("Year 12 has less land than Year 6 (" + land12 + " vs " + land6 + ")", land12 < land6);
}
