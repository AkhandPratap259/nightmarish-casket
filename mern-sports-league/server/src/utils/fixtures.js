// Round-robin fixture generator (circle method). Every team plays every
// other team once. With an odd number of teams a bye is inserted, so each
// matchweek has one team resting. Matchweeks are one week apart, starting
// from the given first date (Saturday 16:00 local by default).

function roundRobin(teamIds) {
  const ids = [...teamIds];
  const odd = ids.length % 2 === 1;
  if (odd) ids.push(null); // bye
  const n = ids.length;
  const rounds = [];
  const fixed = ids[0];
  let rotating = ids.slice(1);
  for (let round = 0; round < n - 1; round += 1) {
    const roundTeams = [fixed, ...rotating];
    const fixtures = [];
    for (let i = 0; i < n / 2; i += 1) {
      const home = roundTeams[i];
      const away = roundTeams[n - 1 - i];
      if (!home || !away) continue; // bye week for the paired team
      // Alternate home/away across rounds so no team is always at home.
      if (round % 2 === 0) fixtures.push({ home, away });
      else fixtures.push({ home: away, away: home });
    }
    rounds.push(fixtures);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }
  return rounds;
}

function fixtureDates(firstDate, rounds) {
  const start = new Date(firstDate);
  return rounds.map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    return d;
  });
}

module.exports = { roundRobin, fixtureDates };
