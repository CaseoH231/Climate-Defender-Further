// ======================================================================
// EXTRAS: toasts, sound, achievements, graphs, settings and speed.
// ======================================================================

// ---------- Toasts (little pop-up messages) ----------

function toast(message, kind) {
  const box = document.getElementById("toasts");

  if (!box) return;

  const item = document.createElement("div");

  item.className = "toast " + (kind || "");
  item.textContent = message;
  box.append(item);

  sfx(kind === "bad" ? "bad" : "good");
  setTimeout(() => item.remove(), 4500);
}

// ---------- Sound (tiny beeps made in the browser, no sound files needed) ----------

let audioCtx = null;

function sfx(kind) {
  if (settings.sound === false || settings.volume === 0) return;

  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();

    const notes = { click: [520], build: [392, 587], sell: [440, 330], good: [523, 659], bad: [220, 165], win: [523, 659, 784, 1047], alert: [330, 330] }[kind] || [440];
    const volume = 0.12 * (settings.volume ?? 0.5); // 0.06 at the default 50%

    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const start = audioCtx.currentTime + i * 0.11;

      osc.type = kind === "bad" ? "sawtooth" : "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(Math.max(0.0002, volume), start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch (e) {
    // Sound is optional. The game works fine without it.
  }
}

// ---------- Achievements ----------

const ACHIEVEMENTS = [
  { id: "solar1", icon: "☀", name: "First Light", text: "Build a solar farm", test: () => solar >= 1 },
  { id: "solar10", icon: "🔆", name: "Solar Valley", text: "Own 10 solar farms", test: () => solar >= 10 },
  { id: "wind5", icon: "🌬", name: "Wind Whisperer", text: "Own 5 wind turbines", test: () => wind >= 5 },
  { id: "clean50", icon: "🍃", name: "Going Green", text: "50% clean electricity", test: () => getCleanShare() >= 50 && totalMonths() > 0 },
  { id: "coalfree", icon: "🚫", name: "Coal-Free", text: "Close every coal plant", test: () => coal === 0 && totalMonths() > 6 },
  { id: "forest20", icon: "🌲", name: "Tree Hugger", text: "Grow 20 forests", test: () => forest >= 20 },
  { id: "nuclear", icon: "⚛", name: "Atomic Age", text: "Build a nuclear plant", test: () => nuclearPlants >= 1 },
  { id: "netzero", icon: "🌱", name: "Net Zero", text: "Get pollution to 5 or less", test: () => pollution <= 5 && totalMonths() > 6 },
  { id: "pop30", icon: "🏘", name: "Big City", text: "30,000 people", test: () => population >= 30000 },
  { id: "rich", icon: "💎", name: "Rolling In It", text: "Have $20,000", test: () => money >= 20000 },
  { id: "decade", icon: "⏳", name: "A Decade", text: "Lead for 10 years", test: () => totalMonths() >= 120 },
  { id: "cool", icon: "🧊", name: "Keeping Cool", text: "Stay under 1.5°C for 10 years", test: () => totalMonths() >= 120 && X.temp < 1.5 },
  { id: "ready", icon: "🛡", name: "Prepared", text: "Max out a Be Ready policy", test: () => ["seawall", "firebreaks", "cooling", "drains"].some((id) => programLevel(id) >= 3) },
  { id: "policy", icon: "📜", name: "Policy Maker", text: "Start every policy", test: () => PROGRAMS.every((p) => programLevel(p.id) >= 1) },
  { id: "tax", icon: "💲", name: "Polluter Pays", text: "Use the big carbon tax", test: () => X.carbonTax === 3 },
  { id: "allsci", icon: "🔬", name: "Scientist", text: "Finish all research", test: () => Object.values(researchProjects).every((p) => p.unlocked) },
  { id: "quiz5", icon: "🧠", name: "Quiz Whiz", text: "Answer 5 quiz questions right", test: () => quizCorrect >= 5 },
  { id: "winner", icon: "🏆", name: "Climate Defender", text: "Reach a scenario goal", test: () => X.won },
];

function checkAchievements() {
  if (!X.started) return;

  for (const a of ACHIEVEMENTS) {
    if (!X.achieved[a.id] && a.test()) {
      X.achieved[a.id] = true;
      toast(a.icon + " Achievement: " + a.name, "good");
      addNews("🏆 Achievement unlocked: " + a.name + " (" + a.text + ")");
    }
  }
}

function renderAchievements() {
  const box = document.getElementById("achievementList");

  if (!box) return;

  const done = ACHIEVEMENTS.filter((a) => X.achieved[a.id]).length;

  box.innerHTML =
    `<h3>🏆 Achievements (${done}/${ACHIEVEMENTS.length})</h3><div class="ach-grid">` +
    ACHIEVEMENTS.map((a) => `<div class="ach ${X.achieved[a.id] ? "on" : ""}" title="${a.text}"><span>${X.achieved[a.id] ? a.icon : "🔒"}</span><b>${a.name}</b><small>${a.text}</small></div>`).join("") +
    `</div>`;
}

// ---------- History and graphs ----------

const CHART_SERIES = {
  temp: { name: "Temperature", unit: "°C", color: "#e8573c" },
  co2: { name: "CO₂", unit: " ppm", color: "#8a6bd6" },
  pollution: { name: "Pollution", unit: "", color: "#6b6f7a" },
  money: { name: "Money", unit: "$", color: "#2bb673" },
  pop: { name: "People", unit: "", color: "#3b9cf2" },
  approval: { name: "Happiness", unit: "%", color: "#f2a93b" },
};
let chartSeries = "temp";

function recordHistory() {
  X.history.push({
    m: totalMonths(),
    temp: X.temp,
    co2: Math.round(X.co2),
    pollution: Math.round(pollution),
    money: Math.round(money),
    pop: population,
    approval: Math.round(approval),
  });

  if (X.history.length > 600) X.history.shift();
}

function setChartSeries(key) {
  chartSeries = key;
  renderStats();
}

function renderStats() {
  const panel = document.getElementById("tabStats");

  if (!panel || !panel.classList.contains("active")) return;

  document.getElementById("climateStats").innerHTML =
    `<div class="stat-row"><span>🌡 Warming</span><b>+${X.temp.toFixed(1)}°C</b></div>` +
    `<div class="stat-row"><span>🌫 CO₂ in the air</span><b>${Math.round(X.co2)} ppm</b></div>` +
    `<div class="stat-row"><span>🌊 Sea level rise</span><b>${Math.round(X.sea)} cm</b></div>` +
    `<div class="stat-row"><span>⚠ Tipping points</span><b>${TIPPING_POINTS.filter((p) => X.tipped[p.id]).map((p) => p.icon).join(" ") || "None yet"}</b></div>` +
    `<p class="learn-note">Warming lags behind pollution by years. Tipping points at 1.5°, 2°, 2.5° and 3°C. At 4°C it's game over.</p>`;

  document.getElementById("chartTabs").innerHTML = Object.keys(CHART_SERIES)
    .map((key) => `<button class="${key === chartSeries ? "on" : ""}" onclick="setChartSeries('${key}')">${CHART_SERIES[key].name}</button>`)
    .join("");

  drawChart();
}

function drawChart() {
  const canvas = document.getElementById("historyChart");

  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const series = CHART_SERIES[chartSeries];
  const data = X.history.map((row) => row[chartSeries]);

  ctx.clearRect(0, 0, w, h);
  ctx.font = "12px Nunito, sans-serif";
  ctx.fillStyle = "#6b7a90";

  if (data.length < 2) {
    ctx.fillText("Play a few months to see the graph.", 16, h / 2);
    return;
  }

  let min = Math.min(...data);
  let max = Math.max(...data);

  if (chartSeries === "temp") { min = Math.min(min, 1); max = Math.max(max, 2); }
  if (max === min) max = min + 1;

  const left = 48, right = 10, top = 12, bottom = 22;
  const px = (i) => left + (i / (data.length - 1)) * (w - left - right);
  const py = (v) => top + (1 - (v - min) / (max - min)) * (h - top - bottom);

  ctx.strokeStyle = "#e3edf7";
  for (let i = 0; i <= 4; i++) {
    const y = top + (i / 4) * (h - top - bottom);
    const value = max - (i / 4) * (max - min);

    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w - right, y); ctx.stroke();
    ctx.fillText(chartSeries === "temp" ? value.toFixed(1) : Math.round(value).toLocaleString(), 4, y + 4);
  }

  ctx.strokeStyle = series.color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  data.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
  ctx.stroke();

  ctx.fillStyle = "#6b7a90";
  ctx.fillText("Year " + (2025 + Math.floor(X.history[0].m / 12)), left, h - 6);
  ctx.fillText("Year " + (2025 + Math.floor(X.history[X.history.length - 1].m / 12)), w - 70, h - 6);
}

// ---------- Settings and speed ----------

function openSettings() {
  document.getElementById("setDiff").value = settings.difficulty;
  document.getElementById("setQuiz").checked = settings.quizzes;
  document.getElementById("setSound").checked = settings.sound !== false;
  document.getElementById("setVolume").value = Math.round((settings.volume ?? 0.5) * 100);
  el.settingsModal.style.display = "block";
  updatePaused();
}

function closeSettings() {
  el.settingsModal.style.display = "none";
  updatePaused();
}

function applySetting(kind) {
  if (kind === "diff") setDifficulty(Number(document.getElementById("setDiff").value));
  if (kind === "quiz") setQuizzes(document.getElementById("setQuiz").checked);
  if (kind === "sound") {
    settings.sound = document.getElementById("setSound").checked;
    saveSettings();
    sfx("click");
  }
  if (kind === "volume") {
    settings.volume = Number(document.getElementById("setVolume").value) / 100;
    saveSettings();
    sfx("click");
  }
}

function cycleSpeed() {
  X.speed = X.speed === 1 ? 2 : X.speed === 2 ? 4 : 1;
  startTicker();
  renderSpeed();
  sfx("click");
}

function renderSpeed() {
  const button = document.getElementById("speedButton");

  if (button) button.textContent = "⏩ " + X.speed + "×";
}

// ---------- Saving and drawing everything new ----------

function loadExtra(saved) {
  for (const key in X) {
    if (saved[key] === undefined) continue;

    if (X[key] && typeof X[key] === "object" && !Array.isArray(X[key])) Object.assign(X[key], saved[key]);
    else X[key] = saved[key];
  }
}

function renderExtras() {
  const temp = document.getElementById("tempValue");

  if (temp) {
    temp.textContent = "+" + X.temp.toFixed(1) + "°C";
    temp.parentElement.parentElement.className = "tile t-temp " + tempClass();
  }

  renderPolicies();
  renderGoals();
  renderAchievements();
  renderStats();
  renderSpeed();
  checkAchievements();
}

function initExtras() {
  MODAL_IDS.push("scenarioModal", "settingsModal", "winModal");

  // Redraw the graph when its tab is opened.
  document.getElementById("tabs").addEventListener("click", () => setTimeout(renderStats, 0));
}
