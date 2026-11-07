// ======================================================================
// POLITICS TESTS: groups, votes, elections, protests and support actions.
// ======================================================================

async function runPoliticsTests() {
  log("POLITICS");

  let w = await boot();

  w.startScenario("classic");

  const groups = w.eval("GROUPS");
  const shares = groups.reduce((sum, g) => sum + w.groupShare(g.id), 0);

  check("voter shares add up to 100%", Math.abs(shares - 1) < 1e-9);
  w.eval("X.scenario = 'mining'");
  check("mining town voter shares add up to 100%", Math.abs(groups.reduce((sum, g) => sum + w.groupShare(g.id), 0) - 1) < 1e-9);
  check("mining town has more workers", w.groupShare("workers") > 0.3);
  w.eval("X.scenario = 'classic'");

  // Happiness follows the city's happiness plus each group's mood
  w.eval("approval = 60; GROUPS.forEach((g) => { X.politics.mood[g.id] = 0; X.politics.boost[g.id] = 0; })");
  check("with no moods every group is as happy as the city", groups.every((g) => w.groupHappiness(g.id) === 60));
  check("the vote is the weighted happiness", w.voteShare() === 60);

  // Closing coal upsets workers
  w.eval("X.politics.jobLoss = 0");

  const workersBefore = w.groupTarget("workers");

  w.autoSell("coal");
  check("closing a coal plant costs jobs", w.eval("X.politics.jobLoss") > 0 && w.groupTarget("workers") < workersBefore);

  // A carbon tax pleases young voters and upsets businesses
  const youngBefore = w.groupTarget("young");
  const businessBefore = w.groupTarget("business");

  w.eval("X.carbonTax = 2");
  check("a carbon tax pleases young voters", w.groupTarget("young") > youngBefore);
  check("a carbon tax upsets business owners", w.groupTarget("business") < businessBefore);
  w.eval("X.carbonTax = 0");

  // Support actions
  w.eval("money = 5000");

  const boostBefore = w.groupHappiness("young");

  check("a support action makes the group happier", w.supportGroup("young") && w.groupHappiness("young") > boostBefore);
  check("it can't be used again straight away", !w.supportGroup("young"));
  w.eval("X.politics.jobLoss = 10");
  w.supportGroup("workers");
  check("retraining workers cancels job losses", w.eval("X.politics.jobLoss") < 10);

  // Protests
  w.eval("approval = 10; X.politics.low = {}; for (let k = 0; k < PROTEST_AFTER; k++) politicsMonth()");
  check("very unhappy groups protest", w.eval("newsLog").some((n) => n.includes("protesting")));

  // Winning an election
  w = await boot();
  w.startScenario("classic");
  w.eval("approval = 80; X.politics.next = { year, month }; politicsMonth()");
  check("a popular mayor wins the election", w.document.getElementById("electionModal").style.display === "block" && w.eval("X.politics.history[0].won"));
  check("the next election is 4 years later", w.eval("X.politics.next.year") === w.eval("year") + 4);
  w.closeElection();
  check("closing the results un-pauses the game", !w.eval("gamePaused"));

  // Losing one
  w = await boot();
  w.startScenario("classic");
  w.eval("approval = 25; X.politics.next = { year, month }; politicsMonth()");
  check("an unpopular mayor is voted out", w.document.getElementById("gameOverModal").style.display === "block" && w.document.querySelector("#gameOverText h3").textContent.includes("Voted Out"));
  check("the game over screen shows the vote", w.document.querySelectorAll("#gameOverText .vote-row").length === groups.length);

  // Elections can be turned off
  w = await boot();
  w.startScenario("classic");
  w.eval("settings.elections = false; approval = 25; X.politics.next = { year, month }; politicsMonth()");
  check("no election when elections are turned off", w.document.getElementById("gameOverModal").style.display !== "block" && w.eval("X.politics.history.length") === 0);

  // The People tab draws
  w.document.querySelector('[data-tab="tabPeople"]').click();
  w.renderPeople();
  check("the People tab shows a card per group", w.document.querySelectorAll("#peopleList .group-card").length === groups.length);
  check("no errors in politics", w.__errors.length === 0, w.__errors[0]);

  // Older saves get politics
  w.eval("X.politics = null; saveGame()");
  w = await boot({ keepSave: true });
  check("an older save gets citizen groups", !!w.eval("X.politics && X.politics.mood.workers !== undefined") && w.__errors.length === 0, w.__errors[0]);
}
