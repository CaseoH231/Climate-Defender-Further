// ======================================================================
// POLICIES: programs for transport, buildings, farming, waste and adapting to climate change,
// plus the carbon tax and loans.
// ======================================================================

// "eff" says what each level does. city = less city-life pollution, demand = less electricity wanted,
// poll = pollution removed each month, and seawall/fire/heat/flood = protection from climate damage.
const PROGRAMS = [
  { id: "buses", group: "🚌 Transport", icon: "🚌", name: "Bus & Rail", desc: "Fewer cars on the road.", costs: [800, 1500, 2500], upkeep: 15, eff: { city: 0.1 } },
  { id: "ev", group: "🚌 Transport", icon: "🔌", name: "Electric Cars", desc: "Cars without tailpipes. Charging uses a bit more power.", costs: [1200, 2500, 4000], upkeep: 10, eff: { city: 0.1, demand: -0.02 } },
  { id: "insulation", group: "🏠 Buildings", icon: "🧱", name: "Insulation", desc: "Warm homes need less energy.", costs: [700, 1400, 2400], upkeep: 8, eff: { demand: 0.05 } },
  { id: "heatpumps", group: "🏠 Buildings", icon: "♨", name: "Heat Pumps", desc: "Efficient heating and cooling.", costs: [1500, 2800, 4500], upkeep: 12, eff: { demand: 0.04, city: 0.05 } },
  { id: "smartgrid", group: "🏠 Buildings", icon: "📡", name: "Smart Grid", desc: "Shares power around so less is wasted, and lets power lines carry more.", costs: [1000, 2000, 3500], upkeep: 12, eff: { demand: 0.06, grid: 0.15 } },
  { id: "farming", group: "🌾 Food & Waste", icon: "🌾", name: "Smart Farming", desc: "Farmers store carbon in healthy soil.", costs: [900, 1800, 3000], upkeep: 20, eff: { poll: 2 } },
  { id: "waste", group: "🌾 Food & Waste", icon: "♻", name: "Recycling & Compost", desc: "Less rubbish rotting and making methane.", costs: [600, 1300, 2200], upkeep: 15, eff: { poll: 2, approval: 0.2 } },
  { id: "seawall", group: "🛡 Be Ready", icon: "🧱", name: "Sea Walls", desc: "Holds back 2 levels of flooding each.", costs: [1500, 3000, 5000], upkeep: 18, eff: { seawall: 2 } },
  { id: "firebreaks", group: "🛡 Be Ready", icon: "🚒", name: "Fire Breaks", desc: "Bushfires do 25% less damage per level.", costs: [700, 1400, 2200], upkeep: 10, eff: { fire: 0.25 } },
  { id: "cooling", group: "🛡 Be Ready", icon: "❄", name: "Cooling Centres", desc: "Heatwaves do 25% less damage per level.", costs: [700, 1400, 2200], upkeep: 10, eff: { heat: 0.25 } },
  { id: "drains", group: "🛡 Be Ready", icon: "🌧", name: "Storm Drains", desc: "Floods and storms do 25% less damage per level.", costs: [700, 1400, 2200], upkeep: 10, eff: { flood: 0.25 } },
];

function programLevel(id) {
  return X.programs[id] || 0;
}

// Total effect of one kind across all programs (each program's effect times its level).
function programEffect(key) {
  let total = 0;

  for (const program of PROGRAMS) {
    if (program.eff[key]) total += program.eff[key] * programLevel(program.id);
  }

  return key === "approval" || key === "poll" || key === "seawall" ? total : Math.min(0.9, total);
}

function programUpkeep() {
  return PROGRAMS.reduce((sum, program) => sum + program.upkeep * programLevel(program.id), 0);
}

function upgradeProgram(id) {
  const program = PROGRAMS.find((item) => item.id === id);
  const level = programLevel(id);

  if (gamePaused || !program || level >= program.costs.length) return;

  const cost = program.costs[level];

  if (!canBuy(cost)) return;

  money -= cost;
  book("programs", -cost);
  X.programs[id] = level + 1;

  if (program.eff.demand > 0) learnTerm("efficiency");
  if (program.eff.seawall || program.eff.fire || program.eff.heat || program.eff.flood) learnTerm("adaptation");
  else learnTerm("mitigation");

  addNews(program.icon + " " + program.name + " is now level " + (level + 1) + ".");
  sfx("build");
  updateUI();
}

// ---------- Carbon tax and loans ----------

const TAX_NAMES = ["No tax", "Small tax", "Medium tax", "Big tax"];

function setCarbonTax(level) {
  if (gamePaused) return;

  X.carbonTax = Math.max(0, Math.min(3, level));
  if (X.carbonTax > 0) learnTerm("carbontax");

  addNews("💲 Carbon tax: " + TAX_NAMES[X.carbonTax] + ".");
  updateUI();
}

// The bank lends more to bigger cities: about $400 for every 1,000 residents (at least $2,000).
function creditLimit() {
  return Math.max(2000, Math.round((population * 0.4) / 500) * 500);
}

function borrow(amount) {
  if (gamePaused) return;

  const limit = creditLimit();

  if (X.loan + amount > limit) {
    addNews("🏦 The bank won't lend a city your size more than $" + limit.toLocaleString() + " in total.");
    return;
  }

  X.loan += amount;
  money += amount;
  book("loan", amount);
  learnTerm("interest");

  addNews("🏦 Borrowed $" + amount.toLocaleString() + ". You pay 1.5% interest every month.");
  sfx("click");
  updateUI();
}

function repay(amount) {
  if (gamePaused) return;

  const pay = Math.min(amount, X.loan, money);

  if (pay <= 0) return;

  X.loan -= pay;
  money -= pay;
  book("loan", -pay);

  addNews("🏦 Repaid $" + pay.toLocaleString() + ".");
  sfx("click");
  updateUI();
}

// Runs at the end of each month. If the city can't pay its bills, the bank pays them and adds
// them to the loan. Staying over the credit limit for too long means the city goes bankrupt.
function bankMonth() {
  if (money < 0) {
    const shortfall = -money;

    X.loan += shortfall;
    money = 0;
    book("loan", shortfall); // the bank paid the bills
    learnTerm("interest");
    addNews("🏦 The city couldn't pay its bills, so $" + shortfall.toLocaleString() + " was added to the bank loan.");
  }

  if (X.loan > creditLimit()) {
    X.bankruptMonths++;
    addNews("⚠ Debt is over the bank's limit ($" + X.loan.toLocaleString() + " of $" + creditLimit().toLocaleString() + "). " + X.bankruptMonths + "/" + LOW_APPROVAL_LIMIT + " months before bankruptcy.");
  } else {
    X.bankruptMonths = 0;
  }
}

// Pollution that taxes apply to: coal, gas and city life.
function grossEmissions(breakdown) {
  return Math.max(0, (breakdown.coal || 0) + (breakdown.gas || 0) + (breakdown.city || 0));
}

// Runs once a month: carbon tax income and loan interest.
function economyMonth(breakdown) {
  X.taxIncome = 0;

  if (X.carbonTax > 0) {
    X.taxIncome = Math.round(grossEmissions(breakdown) * 8 * X.carbonTax);
    money += X.taxIncome;
    book("carbonTax", X.taxIncome);
    // People notice higher prices, but only while there is something to tax.
    if (X.taxIncome > 0) approval -= 0.15 * X.carbonTax;
    if (X.taxIncome > 0) addNews("💲 Carbon tax raised $" + X.taxIncome + ".");
  }

  if (X.loan > 0) {
    const interest = Math.ceil(X.loan * 0.015);

    money -= interest;
    book("interest", -interest);
    addNews("🏦 Loan interest: -$" + interest);
  }
}

// Plain words for what one level of a policy does. Electric cars *add* a little power use
// (charging), which shows up here as a red "+2% power use".
const EFFECT_TEXT = {
  city: (v) => ["−" + Math.round(v * 100) + "% city pollution", true],
  demand: (v) => (v >= 0 ? ["−" + Math.round(v * 100) + "% power use", true] : ["+" + Math.round(-v * 100) + "% power use (charging)", false]),
  poll: (v) => ["−" + v + " pollution/month", true],
  approval: (v) => ["+" + v + " happiness/month", true],
  seawall: (v) => ["holds back " + v + " flood levels", true],
  fire: (v) => ["−" + Math.round(v * 100) + "% bushfire damage", true],
  heat: (v) => ["−" + Math.round(v * 100) + "% heatwave damage", true],
  flood: (v) => ["−" + Math.round(v * 100) + "% flood & storm damage", true],
  grid: (v) => ["+" + Math.round(v * 100) + "% power line capacity", true],
};

function programChips(p) {
  return (
    Object.entries(p.eff)
      .map(([key, value]) => {
        const [text, good] = EFFECT_TEXT[key](value);

        return `<span class="chip ${good ? "good" : "bad"}">${text}</span>`;
      })
      .join("") + `<span class="chip">$${p.upkeep}/month upkeep</span>`
  );
}

function setHTML(element, html) {
  if (element && element.innerHTML !== html) element.innerHTML = html;
}

function renderPolicies() {
  const box = document.getElementById("programList");

  if (!box) return;

  if (!box.dataset.ready) {
    let html = "";
    let group = "";

    for (const p of PROGRAMS) {
      if (p.group !== group) {
        if (group) html += "</div>";
        group = p.group;
        html += `<h3>${group}</h3><div class="program-grid">`;
      }

      html += `<div class="program" data-id="${p.id}">
        <div class="pg-top"><span class="ic">${p.icon}</span><b>${p.name}</b></div>
        <p>${p.desc}</p>
        <div class="chips" title="What each level does">${programChips(p)}</div>
        <div class="pips"></div>
        <button onclick="upgradeProgram('${p.id}')"></button>
      </div>`;
    }

    box.innerHTML = html + "</div>";
    box.dataset.ready = "1";
  }

  for (const card of box.querySelectorAll(".program")) {
    const p = PROGRAMS.find((item) => item.id === card.dataset.id);
    const level = programLevel(p.id);
    const button = card.querySelector("button");
    const maxed = level >= p.costs.length;

    setHTML(card.querySelector(".pips"), p.costs.map((_, i) => `<i class="${i < level ? "on" : ""}"></i>`).join(""));
    button.textContent = maxed ? "✅ Maxed" : (level === 0 ? "Start $" : "Upgrade $") + p.costs[level].toLocaleString();
    button.disabled = maxed || money < (p.costs[level] || 0);
  }

  setHTML(
    document.getElementById("taxBox"),
    `<h3>💲 Carbon tax</h3><p class="learn-note">Make polluters pay. It raises money and pushes the city toward clean power, but people grumble about prices.</p>` +
      `<div class="seg">${TAX_NAMES.map((name, i) => `<button class="${X.carbonTax === i ? "on" : ""}" onclick="setCarbonTax(${i})">${name}</button>`).join("")}</div>` +
      (X.carbonTax > 0 ? `<p class="learn-note">Last month: raised $${X.taxIncome}</p>` : ""),
  );

  const limit = creditLimit();

  setHTML(
    document.getElementById("loanBox"),
    `<h3>🏦 Bank</h3><p class="learn-note">Borrow now, pay 1.5% interest every month. Unpaid bills are added to the loan. ` +
      `Loan: <b>$${X.loan.toLocaleString()}</b> of the <b>$${limit.toLocaleString()}</b> the bank will lend a city your size.` +
      (X.bankruptMonths > 0 ? ` <b class="bad-text">Over the limit: ${X.bankruptMonths}/${LOW_APPROVAL_LIMIT} months before bankruptcy!</b>` : "") +
      `</p><div class="seg"><button onclick="borrow(1000)" ${X.loan + 1000 > limit ? "disabled" : ""}>Borrow $1,000</button>` +
      `<button onclick="borrow(3000)" ${X.loan + 3000 > limit ? "disabled" : ""}>Borrow $3,000</button>` +
      `<button onclick="repay(1000)" ${X.loan <= 0 || money < 1 ? "disabled" : ""}>Repay $1,000</button></div>`,
  );

  setHTML(document.getElementById("marketBox"), marketBoxHTML()); // budget.js
}
