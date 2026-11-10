// Seat layout helpers. Zones run front (VIP) to back (Standard); row
// labels are unique across the whole event (A, B, C, ...), so a seat id
// like "A1" or "F12" is unambiguous.
const DEFAULT_ZONES = [
  { name: 'VIP', price: 1499, rows: [{ label: 'A', count: 8 }, { label: 'B', count: 8 }] },
  { name: 'Premium', price: 899, rows: [{ label: 'C', count: 10 }, { label: 'D', count: 10 }, { label: 'E', count: 10 }] },
  { name: 'Standard', price: 499, rows: [{ label: 'F', count: 12 }, { label: 'G', count: 12 }, { label: 'H', count: 12 }, { label: 'I', count: 12 }] },
];

// Same layout with custom zone prices (used by the seed and the client
// when an organizer picks the default layout).
function zonesWithPrices(vip, premium, standard) {
  const clone = JSON.parse(JSON.stringify(DEFAULT_ZONES));
  clone[0].price = vip;
  clone[1].price = premium;
  clone[2].price = standard;
  return clone;
}

function allSeats(event) {
  const seats = [];
  for (const zone of event.zones || []) {
    for (const row of zone.rows || []) {
      for (let n = 1; n <= row.count; n += 1) {
        seats.push({ id: `${row.label}${n}`, zone: zone.name, price: zone.price, row: row.label, number: n });
      }
    }
  }
  return seats;
}

function seatMap(event) {
  const map = new Map();
  for (const s of allSeats(event)) map.set(s.id, s);
  return map;
}

function totalSeats(event) {
  return allSeats(event).length;
}

function validateZones(zones) {
  if (!Array.isArray(zones) || zones.length === 0) return 'At least one pricing zone is required';
  const labels = new Set();
  for (const z of zones) {
    if (!z.name || typeof z.name !== 'string') return 'Every zone needs a name';
    if (!Number.isFinite(z.price) || z.price < 0) return 'Every zone needs a price in rupees (0 or more)';
    if (!Array.isArray(z.rows) || z.rows.length === 0) return `Zone ${z.name} needs at least one row`;
    for (const r of z.rows) {
      if (!r.label || typeof r.label !== 'string' || r.label.length > 2) return 'Every row needs a short label (e.g. A)';
      if (labels.has(r.label)) return `Row label ${r.label} is used more than once`;
      labels.add(r.label);
      if (!Number.isInteger(r.count) || r.count < 1 || r.count > 30) return `Row ${r.label} needs 1–30 seats`;
    }
  }
  return null;
}

module.exports = { DEFAULT_ZONES, zonesWithPrices, allSeats, seatMap, totalSeats, validateZones };
