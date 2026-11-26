// SproutPlot garden engine — pure, testable domain logic.
// Companion-planting harmony, growth stages and watering schedules are all
// computed here from the plant library and the planting's own dates.

const ACTIVE = ['sown', 'sprouted', 'growing', 'ready'];

function norm(name) {
  return String(name || '').trim().toLowerCase();
}

// Score one candidate plant against the plants already active in a bed.
// Returns { score, conflicts, boosts } where score is 0-100.
// A conflict is an antagonist pairing (either direction); a boost is a
// companion pairing. Neutral neighbours neither help nor hurt.
function scoreAgainst(candidate, neighbours) {
  const conflicts = [];
  const boosts = [];
  const candName = norm(candidate.name);
  const candAntagonists = (candidate.antagonists || []).map(norm);
  const candCompanions = (candidate.companions || []).map(norm);

  for (const n of neighbours) {
    const nName = norm(n.name);
    if (candAntagonists.includes(nName) || (n.antagonists || []).map(norm).includes(candName)) {
      conflicts.push(n.name);
    } else if (candCompanions.includes(nName) || (n.companions || []).map(norm).includes(candName)) {
      boosts.push(n.name);
    }
  }

  // Start at 60 (neutral bed). Each companion +12, each conflict -35.
  const score = Math.max(0, Math.min(100, 60 + boosts.length * 12 - conflicts.length * 35));
  return { score, conflicts: [...new Set(conflicts)], boosts: [...new Set(boosts)] };
}

// Bed harmony: average of every active planting's score against the rest of
// the bed. Empty beds score null (no data, not a zero).
function bedHarmony(plantingsWithPlants) {
  const active = plantingsWithPlants.filter((p) => ACTIVE.includes(p.status));
  if (active.length === 0) return null;
  if (active.length === 1) return 60;
  let total = 0;
  for (const p of active) {
    const others = active.filter((o) => o !== p).map((o) => o.plant);
    total += scoreAgainst(p.plant, others).score;
  }
  return Math.round(total / active.length);
}

// Growth stage from days since sowing vs days to maturity.
// Stage boundaries: 0-15% sown, 15-35% sprouted, 35-85% growing, 85%+ ready.
function growthStage(planting, plant) {
  if (!planting || !plant) return 'sown';
  if (planting.status === 'harvested' || planting.status === 'lost') return planting.status;
  const sown = new Date(planting.sownDate).getTime();
  const days = Math.max(0, (Date.now() - sown) / 86400000);
  const ratio = days / Math.max(1, plant.daysToMaturity);
  if (ratio < 0.15) return 'sown';
  if (ratio < 0.35) return 'sprouted';
  if (ratio < 0.85) return 'growing';
  return 'ready';
}

function daysUntilHarvest(planting, plant) {
  const sown = new Date(planting.sownDate).getTime();
  const days = Math.max(0, (Date.now() - sown) / 86400000);
  return Math.max(0, Math.ceil(plant.daysToMaturity - days));
}

// Watering interval in days from the plant's water need:
// thirsty = every day, moderate = every 2 days, drought-tolerant = every 4.
function wateringIntervalDays(plant) {
  return plant.waterNeed === 3 ? 1 : plant.waterNeed === 2 ? 2 : 4;
}

function nextWateringDate(planting, plant) {
  const base = planting.lastWatered ? new Date(planting.lastWatered) : new Date(planting.sownDate);
  const next = new Date(base.getTime() + wateringIntervalDays(plant) * 86400000);
  return next;
}

function wateringDue(planting, plant) {
  return nextWateringDate(planting, plant).getTime() <= Date.now();
}

module.exports = {
  ACTIVE,
  scoreAgainst,
  bedHarmony,
  growthStage,
  daysUntilHarvest,
  wateringIntervalDays,
  nextWateringDate,
  wateringDue,
};
