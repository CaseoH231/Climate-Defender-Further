// ======================================================================
// TECH TREE: research is split into branches, and some projects need others first.
// The projects themselves (name, cost, months, branch, needs, eff) are in research.js
// and research2.js. This file draws the tree and adds up what finished research does.
//
//   needs   ids of projects that must be finished first
//   eff     lasting bonuses once finished, added up by techEffect(key):
//           demand (less electricity wanted), city (less city-life pollution),
//           grid (power lines carry more), battery (batteries store more),
//           capture / forest (they clean more), flood / heat / fire (less damage),
//           farm (farmers are happier)
// ======================================================================

const TECH_BRANCHES = [
  { id: "energy", icon: "⚡", name: "Clean energy" },
  { id: "storage", icon: "🔋", name: "Storage & grid" },
  { id: "city", icon: "🏙", name: "Transport & buildings" },
  { id: "adapt", icon: "🛡", name: "Adaptation" },
  { id: "removal", icon: "🌳", name: "Carbon removal" },
];

function techDone(id) {
  return !!(researchProjects[id] && researchProjects[id].unlocked);
}

// Total of one kind of bonus from all finished research.
function techEffect(key) {
  let total = 0;

  for (const id in researchProjects) {
    const p = researchProjects[id];

    if (p.unlocked && p.eff && p.eff[key]) total += p.eff[key];
  }

  return total;
}

// Projects that must be finished before this one, and aren't yet.
function missingNeeds(id) {
  return (researchProjects[id].needs || []).filter((need) => !techDone(need));
}

function needsText(id) {
  return missingNeeds(id).map((need) => researchProjects[need].icon + " " + researchProjects[need].name).join(" and ");
}

// How far along its branch a project is (0 = no needs inside the branch).
function techDepth(id, seen = new Set()) {
  const p = researchProjects[id];

  if (seen.has(id)) return 0;
  seen.add(id);

  const inBranch = (p.needs || []).filter((need) => researchProjects[need] && researchProjects[need].branch === p.branch);

  return inBranch.length ? 1 + Math.max(...inBranch.map((need) => techDepth(need, seen))) : 0;
}

// ---------- Drawing the Research tab ----------

function techState(id) {
  const p = researchProjects[id];

  if (p.unlocked) return "done";
  if (activeResearch === id) return "busy";
  if (missingNeeds(id).length) return "locked";
  if (p.requires && population < p.requires.population) return "locked";
  return "open";
}

function techCard(id) {
  const p = researchProjects[id];
  const state = techState(id);
  const tooSmall = p.requires && population < p.requires.population;
  let note;

  if (state === "done") note = "✅ Done";
  else if (state === "busy") note = "🔬 " + Math.min(100, Math.floor((researchProgress / p.monthsRequired) * 100)) + "%";
  else if (missingNeeds(id).length) note = "🔒 Needs " + needsText(id);
  else if (tooSmall) note = "🔒 Needs " + p.requires.population.toLocaleString() + " people";
  else note = "$" + p.cost.toLocaleString() + " · " + p.monthsRequired + " months";

  const canStart = state === "open" && activeResearch === null && money >= p.cost;

  return (
    `<button class="tech ${state}" onclick="startResearch('${id}')" ${canStart ? "" : "disabled"} title="${p.description.replace(/"/g, "&quot;")}">` +
    `<span class="ic">${p.icon}</span><span class="nm">${p.name}</span><span class="pr">${note}</span>` +
    `<span class="ds">${p.description}</span></button>`
  );
}

function renderResearch() {
  const box = el.researchButtons;

  if (!box) return;

  const html = TECH_BRANCHES.map((branch) => {
    const ids = Object.keys(researchProjects).filter((id) => (researchProjects[id].branch || "energy") === branch.id);
    const columns = [];

    ids.forEach((id) => {
      const depth = techDepth(id);

      (columns[depth] = columns[depth] || []).push(id);
    });

    const done = ids.filter(techDone).length;

    return (
      `<div class="branch"><div class="branch-head">${branch.icon} ${branch.name} <small>${done}/${ids.length}</small></div>` +
      `<div class="branch-row">` +
      columns.map((col, depth) => `<div class="tech-col${depth ? " after" : ""}">${col.map(techCard).join("")}</div>`).join("") +
      `</div></div>`
    );
  }).join("");

  setHTML(box, html);
}
