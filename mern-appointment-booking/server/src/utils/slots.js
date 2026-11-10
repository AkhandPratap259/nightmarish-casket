// Slot-generation engine: turns a doctor's weekly schedule into concrete
// bookable slots for a calendar day, honouring working days, sessions,
// slot length, past times, and already-booked appointments.

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function dateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function isWorkingDay(profile, date) {
  return profile.days.includes(date.getDay());
}

// All slot start times the doctor's schedule produces for a date.
function generateSlots(profile, date, now = new Date()) {
  if (!isWorkingDay(profile, date)) return [];
  const slots = [];
  const today = dateStr(now);
  const target = dateStr(date);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const session of profile.sessions) {
    const start = toMinutes(session.start);
    const end = toMinutes(session.end);
    for (let t = start; t + profile.slotMinutes <= end; t += profile.slotMinutes) {
      // Do not offer slots that have already started today.
      if (target === today && t <= nowMin) continue;
      slots.push(toHHMM(t));
    }
  }
  return slots;
}

// Annotate generated slots with their booking state for one date.
function slotsWithStatus(profile, date, bookedTimes, now = new Date()) {
  const booked = new Set(bookedTimes);
  return generateSlots(profile, date, now).map((time) => ({
    time,
    available: !booked.has(time),
  }));
}

// Next N calendar days on which the doctor consults.
function workingDaysAhead(profile, days = 14, from = new Date()) {
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const d = addDays(from, i);
    if (isWorkingDay(profile, d)) out.push(dateStr(d));
  }
  return out;
}

module.exports = { toMinutes, toHHMM, dateStr, addDays, isWorkingDay, generateSlots, slotsWithStatus, workingDaysAhead };
