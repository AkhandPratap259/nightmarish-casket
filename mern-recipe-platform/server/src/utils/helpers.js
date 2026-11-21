function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Scale an ingredient quantity by a serving factor, rounded sensibly:
// integers stay integers, everything else keeps at most 2 decimals.
function scaleQuantity(quantity, factor) {
  const scaled = (Number(quantity) || 0) * factor;
  const rounded = round2(scaled);
  return Number.isInteger(rounded) ? rounded : rounded;
}

function normaliseName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normaliseUnit(unit) {
  const u = String(unit || '').trim().toLowerCase();
  const map = { grams: 'g', gram: 'g', kilograms: 'kg', kilogram: 'kg', millilitres: 'ml', milliliter: 'ml', millilitre: 'ml', pieces: 'piece', pcs: 'piece', cloves: 'clove', cups: 'cup', tablespoons: 'tbsp', tablespoon: 'tbsp', teaspoons: 'tsp', teaspoon: 'tsp' };
  return map[u] || u;
}

// Monday (ISO week start) of a YYYY-MM-DD date.
function weekStartOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

module.exports = { round2, scaleQuantity, normaliseName, normaliseUnit, weekStartOf, addDays };
