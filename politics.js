// ======================================================================
// PEOPLE AND POLITICS: five groups of citizens, each with its own happiness.
// A group's happiness is the city's happiness plus its own "mood", which drifts
// towards what that group thinks of the city right now (see GROUP_REASONS).
// Policies please some groups and upset others.
//
// Every 4 years there is an election. Each group votes with its happiness, weighted
// by how many voters it has. Below the needed share of the vote, the mayor loses.
// A group that stays very unhappy protests. Support actions win groups back.
//
//   X.politics.mood       each group's mood (about −20 to +20)
//   X.politics.boost      extra goodwill from support actions (fades over time)
//   X.politics.jobLoss    how many jobs were lost recently (fades over time)
//   X.politics.cooldown   months until each support action can be used again
//   X.politics.low        months each group has been very unhappy
//   X.politics.next       when the next election is ({ year, month })
//   X.politics.history    past election results
// ======================================================================

const GROUPS = [
  { id: "workers", icon: "👷", name: "Workers", share: 0.3, wants: "Jobs. Closing coal plants and factories without helping workers makes them angry." },
  { id: "families", icon: "👪", name: "Families", share: 0.3, wants: "Clean air, reliable power, safe homes and low prices." },
  { id: "business", icon: "💼", name: "Business owners", share: 0.15, wants: "A growing economy, offices, reliable power and low taxes." },
  { id: "young", icon: "🧑‍🎓", name: "Young voters", share: 0.15, wants: "Real action on climate change: clean power, less pollution and green policies." },
  { id: "farmers", icon: "🌾", name: "Farmers", share: 0.1, wants: "Good growing weather, help with smart farming, and a cool, steady climate." },
];

// Some cities have more of one kind of voter.
const SCENARIO_SHARES = {
  mining: { workers: 0.42, families: 0.25, business: 0.1, young: 0.13, farmers: 0.1 },
  desert: { workers: 0.28, families: 0.3, business: 0.22, young: 0.12, farmers: 0.08 },
  island: { workers: 0.22, families: 0.3, business: 0.12, young: 0.16, farmers: 0.2 },
};

const ELECTION_EVERY = 4; // years
const FIRST_ELECTION = { year: 2028, month: 11 };
const PROTEST_AFTER = 3; // months a group stays very unhappy before it protests
const PROTEST_BELOW = 25; // "very unhappy"

// Things a mayor can do to win a group back. Each can be used once a year.
const SUPPORT = {
  workers: { icon: "🎓", name: "Retrain workers", cost: 800, text: "Training for clean-energy jobs", term: "justtransition" },
  families: { icon: "🏠", name: "Help with bills", cost: 600, text: "Help families with energy bills" },
  business: { icon: "🤝", name: "Small business grants", cost: 700, text: "Grants for local shops and start-ups" },
  young: { icon: "🗣", name: "Youth climate council", cost: 300, text: "Give young people a say in climate plans" },
  farmers: { icon: "💧", name: "Drought relief", cost: 500, text: "Water tanks and help in dry seasons" },
};
const SUPPORT_BOOST = 9;
const SUPPORT_COOLDOWN = 12;

const BAD_WEATHER = ["Heatwave", "Bushfire Season", "Flooding Conditions", "Storm System"];

// The election results window pauses the game like the other windows.
el.electionModal = document.getElementById("electionModal");
MODAL_IDS.push("electionModal");

ACHIEVEMENTS.push(
  { id: "reelected", icon: "🗳", name: "Re-elected", text: "Win an election", test: () => !!X.politics && X.politics.history.some((h) => h.won) },
  { id: "beloved", icon: "💖", name: "Loved by All", text: "Every group 60% happy or more", test: () => !!X.politics && totalMonths() > 6 && GROUPS.every((g) => groupHappiness(g.id) >= 60) },
);

gameOverTips.election = [
  "Check the People tab before each election. It shows how each group would vote today.",
  "Different groups want different things. Support actions (like retraining workers) win them back.",
  "Closing coal plants costs workers their jobs. Retrain them, or close plants slowly, well before an election.",
  "Blackouts make families and businesses angry. Keep spare power and upgrade full power lines.",
];

function ensurePolitics() {
  if (X.politics && X.politics.mood) return;

  X.politics = {
    mood: {}, boost: {}, cooldown: {}, low: {},
    jobLoss: 0,
    next: { ...FIRST_ELECTION },
    history: [],
  };

  for (const g of GROUPS) {
    X.politics.mood[g.id] = 0;
    X.politics.boost[g.id] = 0;
  }
}

function groupShare(id) {
  const special = SCENARIO_SHARES[X.scenario];

  return special ? special[id] : GROUPS.find((g) => g.id === id).share;
}

function cleanPlantCount() {
  return solar + wind + nuclearPlants + X.plants.hydro + X.plants.geo + X.plants.offshore;
}

// What each group thinks about the city right now: a list of [reason, points].
const GROUP_REASONS = {
  workers: () => [
    ["Jobs", Math.min(12, factories * 1.5 + offices + (coal + X.plants.gas) * 0.6 + cleanPlantCount() * 0.25) - 6],
    ["Jobs lost recently", -Math.min(15, X.politics.jobLoss)],
    ["Carbon tax raises prices", -X.carbonTax * 2],
    ["Better buses and trains", programLevel("buses") * 1.5],
  ],
  families: () => [
    ["Air near homes", typeof neighbourhoodMood === "function" && X.map ? neighbourhoodMood() * 6 : 0],
    ["Blackouts", blackoutMonths > 0 ? -8 : 0],
    ["Smog", pollution > 60 ? -4 : 0],
    ["Cheaper heating", (programLevel("insulation") + programLevel("heatpumps")) * 1],
    ["Carbon tax raises prices", -X.carbonTax * 1.5],
    ["Flooding", X.map && X.map.flood > 0 ? -3 * Math.min(3, X.map.flood) : 0],
    ["Sea walls", programLevel("seawall") * (X.mods.coastal >= 1 ? 1.5 : 0.5)],
  ],
  business: () => [
    ["Economy", gdpGrowth > 1 ? 4 : gdpGrowth < 0 ? -4 : 0],
    ["Offices", Math.min(5, offices) - 2],
    ["Blackouts", blackoutMonths > 0 ? -10 : 0],
    ["Carbon tax", -X.carbonTax * 3],
    ["City debt", X.loan > creditLimit() * 0.8 ? -4 : 0],
  ],
  young: () => [
    ["Clean power", (getCleanShare() - 40) / 6],
    ["Global warming", X.temp < 1.5 ? 2 : -(X.temp - 1.5) * 10],
    ["Pollution", -Math.min(8, pollution / 15)],
    ["Coal plants", -Math.min(6, coal * 0.6)],
    ["Carbon tax", X.carbonTax * 2],
    ["Green policies", Math.min(5, PROGRAMS.filter((p) => programLevel(p.id) > 0).length * 0.6)],
  ],
  farmers: () => [
    ["This month's weather", BAD_WEATHER.includes(currentWeather.name) ? -6 : currentWeather.name === "Perfect Growing Season" ? 5 : 0],
    ["Warming climate", X.temp > 1.5 ? -(X.temp - 1.5) * 8 : 1],
    ["Smart Farming help", programLevel("farming") * 2.5],
    ["Drought-proof crops", techEffect("farm")],
    ["Fuel costs (carbon tax)", -X.carbonTax * 1],
  ],
};

function groupReasons(id) {
  return GROUP_REASONS[id]().map(([text, value]) => [text, Math.round(value * 10) / 10]);
}

function groupTarget(id) {
  return Math.max(-20, Math.min(20, groupReasons(id).reduce((sum, r) => sum + r[1], 0)));
}

function groupHappiness(id) {
  ensurePolitics();

  return Math.round(Math.max(0, Math.min(100, approval + X.politics.mood[id] + X.politics.boost[id])));
}

// The share of the vote the mayor would get if the election were today.
function voteShare() {
  return Math.round(GROUPS.reduce((sum, g) => sum + groupShare(g.id) * groupHappiness(g.id), 0));
}

// Harder years have a stronger opposition.
function neededVote() {
  const t = (settings.difficulty - 6) / 6;

  return Math.round(40 + 6 * t);
}

function electionsOn() {
  return settings.elections !== false;
}

function monthsUntilElection() {
  ensurePolitics();

  return (X.politics.next.year - year) * 12 + X.politics.next.month - month;
}

// Called when coal plants, gas plants or factories close (from buildings.js).
function jobsLost(amount) {
  if (!X.politics) return;
  X.politics.jobLoss += amount;
}

// ---------- Every month ----------

function politicsMonth() {
  ensurePolitics();

  const p = X.politics;

  for (const g of GROUPS) {
    p.mood[g.id] += (groupTarget(g.id) - p.mood[g.id]) * 0.25;
    p.mood[g.id] = Math.round(p.mood[g.id] * 10) / 10;
    p.boost[g.id] = Math.round(p.boost[g.id] * 0.9 * 10) / 10;
    if (p.cooldown[g.id] > 0) p.cooldown[g.id]--;
  }

  p.jobLoss = Math.round(p.jobLoss * 0.93 * 10) / 10;

  // Protests
  for (const g of GROUPS) {
    if (groupHappiness(g.id) < PROTEST_BELOW) {
      p.low[g.id] = (p.low[g.id] || 0) + 1;

      if (p.low[g.id] >= PROTEST_AFTER) {
        p.low[g.id] = 0;
        approval -= 1.5;
        money -= 150;
        book("damage", -150);
        learnTerm("protest");
        addNews("📣 " + g.icon + " " + g.name + " are protesting in the streets! (−1.5 happiness, −$150 for clean-up). " + g.wants);
        toast("📣 " + g.name + " are protesting", "bad");
      }
    } else {
      p.low[g.id] = 0;
    }
  }

  if (!electionsOn()) return;

  const left = monthsUntilElection();

  if (left === 3 || left === 1) {
    learnTerm("election");
    addNews("🗳 The election is in " + left + " month" + (left === 1 ? "" : "s") + ". If it were today, " + voteShare() + "% would vote for you (you need " + neededVote() + "%). Check the People tab.");
  }

  if (left <= 0) holdElection();
}

// ---------- Elections ----------

function holdElection() {
  const p = X.politics;
  const results = GROUPS.map((g) => ({ id: g.id, happiness: groupHappiness(g.id), share: groupShare(g.id) }));
  const vote = voteShare();
  const needed = neededVote();
  const won = vote >= needed;

  learnTerm("election");
  p.history.push({ year, vote, needed, won });
  p.next = { year: p.next.year + ELECTION_EVERY, month: p.next.month };

  const rows = results
    .map((r) => {
      const g = GROUPS.find((item) => item.id === r.id);

      return (
        `<div class="vote-row"><span>${g.icon} ${g.name} <small>(${Math.round(r.share * 100)}% of voters)</small></span>` +
        `<span class="vote-bar"><i style="width:${r.happiness}%"></i><b style="left:${needed}%"></b></span><strong>${r.happiness}%</strong></div>`
      );
    })
    .join("");

  const summary =
    `<p>You won <b>${vote}%</b> of the vote. You needed <b>${needed}%</b>.</p>` + rows +
    `<p class="learn-note">Each group votes with its happiness. Bigger groups count for more.</p>`;

  if (!won) {
    gameOver("🗳 Voted Out", "The city held an election in " + monthNames[month - 1] + " " + year + " and chose a new mayor.", "election", summary);
    return;
  }

  approval += 3; // a fresh mandate
  sfx("win");
  addNews("🗳 You won the election with " + vote + "% of the vote! Next election: " + monthNames[p.next.month - 1] + " " + p.next.year + ".");

  document.getElementById("electionText").innerHTML = `<h3>🎉 Re-elected!</h3>` + summary + `<p>Next election: ${monthNames[p.next.month - 1]} ${p.next.year}.</p>`;
  el.electionModal.style.display = "block";
  updatePaused();
}

function closeElection() {
  el.electionModal.style.display = "none";
  updatePaused();
  updateUI();
}

// ---------- Support actions ----------

function supportGroup(id) {
  ensurePolitics();

  const action = SUPPORT[id];
  const g = GROUPS.find((item) => item.id === id);

  if (gamePaused || !action || X.politics.cooldown[id] > 0) return false;
  if (!canBuy(action.cost)) return false;

  money -= action.cost;
  book("support", -action.cost);
  X.politics.boost[id] += SUPPORT_BOOST;
  X.politics.cooldown[id] = SUPPORT_COOLDOWN;

  if (id === "workers") X.politics.jobLoss = Math.max(0, X.politics.jobLoss - 8);
  if (action.term) learnTerm(action.term);

  addNews(action.icon + " " + action.name + ": " + action.text + ". " + g.icon + " " + g.name + " are happier.");
  sfx("good");
  updateUI();
  return true;
}

// ---------- The People tab ----------

function happyColor(value) {
  return value >= 60 ? "#35c767" : value >= 40 ? "#ffd23f" : value >= PROTEST_BELOW ? "#ffa62b" : "#ff4d4d";
}

function renderPeople() {
  const box = document.getElementById("peopleList");
  const panel = document.getElementById("tabPeople");

  if (!box || !panel || !panel.classList.contains("active")) return;

  ensurePolitics();

  const vote = voteShare();
  const needed = neededVote();
  const left = monthsUntilElection();
  const p = X.politics;

  const election = electionsOn()
    ? `<div class="goal-card election-card">` +
      `<b>🗳 Next election: ${monthNames[p.next.month - 1]} ${p.next.year} (${left} month${left === 1 ? "" : "s"} away)</b>` +
      `<p>If the election were today, <b>${vote}%</b> would vote for you. You need <b>${needed}%</b>.</p>` +
      `<div class="vote-bar big"><i style="width:${vote}%;background:${vote >= needed ? "#35c767" : "#ff6b6b"}"></i><b style="left:${needed}%"></b></div>` +
      (p.history.length ? `<small>Past elections: ${p.history.map((h) => h.year + " " + (h.won ? "✅" : "❌") + " " + h.vote + "%").join(" · ")}</small>` : "") +
      `</div>`
    : `<div class="goal-card"><b>🗳 Elections are turned off</b><p>Turn them on in ⚙ Settings.</p></div>`;

  const cards = GROUPS.map((g) => {
    const happy = groupHappiness(g.id);
    const reasons = groupReasons(g.id)
      .filter((r) => Math.abs(r[1]) >= 0.5)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 4);
    const action = SUPPORT[g.id];
    const wait = p.cooldown[g.id] || 0;

    return (
      `<div class="group-card">` +
      `<div class="d-top"><b>${g.icon} ${g.name}</b><span class="d-kind">${Math.round(groupShare(g.id) * 100)}% of voters</span></div>` +
      `<div class="vote-bar"><i style="width:${happy}%;background:${happyColor(happy)}"></i></div>` +
      `<div class="kv"><span>😊 Happiness</span><strong>${happy}%${happy < PROTEST_BELOW ? " 📣" : ""}</strong></div>` +
      `<p class="d-tip">${g.wants}</p>` +
      `<div class="chips">${reasons.map(([text, v]) => `<span class="chip ${v > 0 ? "good" : "bad"}">${v > 0 ? "+" : "−"} ${text}</span>`).join("") || `<span class="chip">Nothing special</span>`}</div>` +
      `<button class="mini support" onclick="supportGroup('${g.id}')" ${wait > 0 || money < action.cost ? "disabled" : ""}>` +
      `${action.icon} ${action.name} $${action.cost}${wait > 0 ? " (in " + wait + " mo)" : ""}</button>` +
      `</div>`
    );
  }).join("");

  setHTML(
    box,
    election +
      `<p class="learn-note">Different people want different things. A carbon tax pleases young voters but costs families and businesses. Closing coal cleans the air but costs workers their jobs, unless you help them retrain.</p>` +
      `<div class="district-grid">${cards}</div>`,
  );
}

// A small chip next to the date showing when the next election is.
function renderElectionChip() {
  const chip = document.getElementById("electionChip");

  if (!chip) return;

  chip.hidden = !electionsOn() || !X.started;
  if (chip.hidden) return;

  const left = monthsUntilElection();
  const vote = voteShare();

  chip.textContent = "🗳 " + (left <= 12 ? left + " mo · " + vote + "%" : X.politics.next.year);
  chip.title = "Next election: " + monthNames[X.politics.next.month - 1] + " " + X.politics.next.year + ". You'd get " + vote + "% (need " + neededVote() + "%).";
  chip.classList.toggle("warn", left <= 12 && vote < neededVote() + 5);
}
