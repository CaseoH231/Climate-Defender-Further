// ======================================================================
// BUDGET TESTS: the budget lines add up to the real change in money, player
// choices land on the right lines, and the carbon market and green grants pay out.
// ======================================================================

const sumLines = (lines) => Object.values(lines).reduce((sum, value) => sum + value, 0);

async function runBudgetTests() {
  log("BUDGET");

  let w = await boot();

  w.startScenario("classic");
  check("a new game starts with empty books", w.eval("X.budget && Object.keys(X.budget.now).length === 0 && X.budget.history.length === 0"));

  // Every month, last month's lines add up to how much money actually changed.
  // Events and quizzes answered between months land in the next month's books, so
  // compare from one month's end to the next. The bot plays meanwhile, so its choices are booked too.
  const bot = makeBot(w);
  let worst = "";

  w.eval("money = 50000");
  bot.handleModals();
  w.nextMonth();

  for (let i = 0; i < 24 && !w.eval("gameEnded"); i++) {
    const before = w.eval("money");

    bot.handleModals();
    bot.actions();
    w.nextMonth();

    const diff = w.eval("money") - before;
    const booked = sumLines(w.eval("X.budget.last"));

    if (Math.abs(diff - booked) > 0.5 && !worst) worst = "month " + (i + 2) + ": money changed by " + diff + " but the books say " + booked;
  }

  check("every month the budget adds up to the change in money", worst === "", worst);
  check("the budget keeps a month-by-month history", w.eval("X.budget.history.length") >= 12 && w.eval("X.budget.history.length") <= 24, w.eval("X.budget.history.length + ' months, ended: ' + gameEnded + ', month ' + totalMonths()"));
  check("residents' taxes are booked", w.eval("X.budget.last.residents") > 0);
  check("upkeep is booked as spending", w.eval("X.budget.last.upkeep") < 0);

  // The player's choices go on their own lines.
  w = await boot();
  w.startScenario("classic");
  w.eval("money = 50000; windUnlocked = true");

  const grass = [...Array(256).keys()].find((i) => w.terrainAt(i) === "grass" && !w.tileBuilding(i));

  w.placeBuilding("solar", grass);
  check("building is booked under building", w.eval("X.budget.now.build") === -w.buildingCost("solar"));
  w.removeBuildingAt(grass, "sell");
  check("selling refunds onto the same line", w.eval("X.budget.now.build") === -w.buildingCost("solar") + w.eval("BUILDINGS.solar.refund"));
  w.borrow(1000);
  check("borrowing is booked", w.eval("X.budget.now.loan") === 1000);
  w.upgradeProgram(w.eval("PROGRAMS[0].id"));
  check("new policies are booked", w.eval("X.budget.now.programs") === -w.eval("PROGRAMS[0].costs[0]"));

  // Big cities pay extra upkeep, and the books show how much.
  w.eval("for (let i = 0; i < 30; i++) autoBuild('forest')");
  w.nextMonth();
  check("big-city upkeep gets its own line", w.eval("X.budget.last.bigCity") < 0, w.eval("X.budget.last.bigCity"));

  // Carbon market: nothing is paid until the city joins, then it sells its clean-up.
  w = await boot();
  w.startScenario("classic");
  w.eval("money = 5000");

  const cleanCity = { coal: 0, solar: -10, wind: 0, forest: -20, capture: 0, city: 5, gas: 0, biogas: 0, programs: 0, weather: 0 };

  w.marketMonth(cleanCity);
  check("no credits before joining the market", w.eval("X.budget.credits") === 0);
  check("joining the market costs money", w.joinMarket() && w.eval("money") === 5000 - w.eval("MARKET_JOIN_COST") && w.eval("X.budget.market"));
  check("you can only join once", !w.joinMarket());
  check("joining teaches the word 'carbon credit'", w.eval("glossaryUnlocked.includes('carboncredit')"));

  const moneyBefore = w.eval("money");

  w.marketMonth(cleanCity);
  check("a city that removes more than it makes sells credits", w.eval("X.budget.credits") > 0 && w.eval("money") === moneyBefore + w.eval("X.budget.credits"));
  check("credits are worth the clean-up times the price", w.eval("X.budget.credits") === Math.round(25 * w.eval("CREDIT_PRICE * DIFF.price")));
  w.marketMonth({ ...cleanCity, coal: 40 });
  check("a polluting city sells no credits", w.eval("X.budget.credits") === 0);

  // Green grants: paid once at each clean-power milestone.
  w = await boot();
  w.startScenario("classic");
  w.eval("getCleanShare = () => 80");

  const grantMoney = w.eval("money");

  w.marketMonth({ coal: 10 });
  check("reaching 50% and 75% clean power pays two grants", w.eval("money") === grantMoney + 1000 + 1500 && w.eval("X.budget.grants[50] && X.budget.grants[75] && !X.budget.grants[90]"));
  w.marketMonth({ coal: 10 });
  check("each grant is only paid once", w.eval("money") === grantMoney + 2500);

  // The Budget tab draws without errors once a month has finished.
  w = await boot();
  w.startScenario("coastal");
  w.nextMonth();
  w.document.querySelector('[data-tab="tabBudget"]').click();
  w.renderBudget();
  check("the Budget tab shows money in and out", /Money in/.test(w.document.getElementById("budgetList").textContent) && /Money out/.test(w.document.getElementById("budgetList").textContent));
  w.renderPolicies();
  check("the Policy tab shows the carbon market", /Carbon market/.test(w.document.getElementById("marketBox").textContent));

  // Saves from before the budget get empty books.
  w = await boot({ save: { money: 3000, population: 18000, month: 2, year: 2028, coal: 6, solar: 4, x: { scenario: "classic", started: true } } });
  check("an old save gets a budget", w.eval("X.budget && X.budget.market === false && Array.isArray(X.budget.history)"));
  w.nextMonth();
  check("no errors in the first month of an old save", w.__errors.length === 0, w.__errors[0]);
}
