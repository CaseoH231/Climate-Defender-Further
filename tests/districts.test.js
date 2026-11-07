// ======================================================================
// DISTRICT TESTS: every tile is in a district, the district numbers add up to
// the city totals, smoke near homes hurts and old maps get districts.
// ======================================================================

async function runDistrictTests() {
  log("DISTRICTS");

  let w = await boot();

  w.startScenario("classic");
  w.eval("money = 50000; windUnlocked = true; researchProjects.hydro.unlocked = true");
  ["solar", "solar", "wind", "forest", "gas", "hydro", "factory", "office"].forEach((t) => w.autoBuild(t));

  const d = w.eval("X.map.d");
  const names = w.eval("X.map.dn");

  check("every tile belongs to a district", d.length === 256 && [...d].every((c) => Number(c) < names.length));
  check("there are several districts (" + names.length + ")", names.length >= 3 && names.length <= 6);
  check("the town hall is in Old Town", names[w.districtOf(w.eval("X.map.hall"))] === "Old Town");
  check("district names are all different", new Set(names).size === names.length);

  // The district numbers add up to the city's numbers.
  const stats = w.districtStats();
  const sum = (key) => stats.reduce((total, s) => total + s[key], 0);
  const buildingUse = w.eval("offices * OFFICE_MW + factories * FACTORY_MW + capturePlants * CAPTURE_MW");

  check("district power use adds up to the city's", Math.abs(sum("used") - (w.getPowerDemand() + buildingUse)) < 1, sum("used") + " vs " + (w.getPowerDemand() + buildingUse));
  check("district power made adds up to the city's supply", Math.abs(sum("made") - buildingUse - w.getPowerSupply()) < 1.5, sum("made") - buildingUse + " vs " + w.getPowerSupply());

  const expectedPollution = w.eval("coal * 2 + X.plants.gas * EXTRA_PLANTS.gas.pollution - solar - wind * 2 - forest - capturePlants * 4 + (lastBreakdown ? lastBreakdown.city : 0)");

  check("district pollution adds up to the buildings' pollution", Math.abs(sum("pollution") - expectedPollution) < 0.01, sum("pollution") + " vs " + expectedPollution);
  check("district people add up to the population", Math.abs(sum("people") - w.eval("population")) <= stats.length);

  // Smoke next to homes
  const before = w.neighbourhoodMood();
  const nextToHomes = [...Array(256).keys()].find((i) => !w.placeProblem("coal", i) && w.tilesOf("home").some((h) => w.tileDistance(h, i) === 1));

  check("a coal plant next to homes makes them unhappy", w.placeBuilding("coal", nextToHomes) && w.neighbourhoodMood() < before - 0.05, before + " -> " + w.neighbourhoodMood());
  w.removeBuildingAt(nextToHomes, "sell");
  check("closing it clears the air again", Math.abs(w.neighbourhoodMood() - before) < 1e-9);

  const nearHomes = [...Array(256).keys()].find((i) => !w.placeProblem("forest", i) && w.tilesOf("home").some((h) => w.tileDistance(h, i) === 1));

  w.placeBuilding("forest", nearHomes);
  check("a forest next to homes makes them happier", w.neighbourhoodMood() > before);

  // The map views draw without errors
  w.setMapView("districts");
  w.updateUI();
  check("the Districts view shows a name tag for each district", w.document.querySelectorAll(".district-tag").length >= 3);
  w.setMapView("air");
  w.updateUI();
  check("the Air view draws without errors", w.__errors.length === 0, w.__errors[0]);

  w.document.querySelector('[data-tab="tabDistricts"]').click();
  w.renderDistricts();
  check("the Districts tab shows a card per district", w.document.querySelectorAll("#districtList .district").length >= 3);

  // A map saved before districts existed
  w.eval("delete X.map.d; delete X.map.dn; saveGame()");
  w = await boot({ keepSave: true });
  check("an older map gets districts when loaded", typeof w.eval("X.map.d") === "string" && w.eval("X.map.dn.length") >= 3 && w.__errors.length === 0, w.__errors[0]);
}
