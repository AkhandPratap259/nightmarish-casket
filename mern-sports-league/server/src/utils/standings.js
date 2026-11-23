// Standings engine: points, goal difference, goals for, then head-to-head
// points between tied teams, then alphabetical order as the final tiebreak.
// Form is the last five finished results for each team, most recent last.

function emptyRow(team) {
  return {
    team: { id: String(team._id), name: team.name, shortName: team.shortName, colour: team.colour },
    played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0, form: [],
  };
}

function computeStandings(teams, matches, pointsWin, pointsDraw) {
  const rows = new Map(teams.map((t) => [String(t._id), emptyRow(t)]));
  const finished = matches
    .filter((m) => m.status === 'finished')
    .sort((a, b) => new Date(a.finishedAt || a.scheduledAt) - new Date(b.finishedAt || b.scheduledAt));

  for (const m of finished) {
    const home = rows.get(String(m.homeTeam));
    const away = rows.get(String(m.awayTeam));
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.won += 1; away.lost += 1;
      home.points += pointsWin;
      home.form.push('W'); away.form.push('L');
    } else if (m.homeScore < m.awayScore) {
      away.won += 1; home.lost += 1;
      away.points += pointsWin;
      away.form.push('L'); home.form.push('W');
    } else {
      home.drawn += 1; away.drawn += 1;
      home.points += pointsDraw; away.points += pointsDraw;
      home.form.push('D'); away.form.push('D');
    }
  }

  for (const row of rows.values()) {
    row.gd = row.gf - row.ga;
    row.form = row.form.slice(-5);
  }

  const table = [...rows.values()];
  // Head-to-head points among teams tied on points, GD and GF.
  const h2h = new Map();
  for (const m of finished) {
    const h = String(m.homeTeam);
    const a = String(m.awayTeam);
    const key = [h, a].sort().join('|');
    if (!h2h.has(key)) h2h.set(key, { [h]: 0, [a]: 0 });
    const entry = h2h.get(key);
    if (m.homeScore > m.awayScore) entry[h] += pointsWin;
    else if (m.homeScore < m.awayScore) entry[a] += pointsWin;
    else { entry[h] += pointsDraw; entry[a] += pointsDraw; }
  }
  function h2hPoints(aId, bId) {
    const key = [aId, bId].sort().join('|');
    const entry = h2h.get(key);
    if (!entry) return 0;
    return (entry[aId] || 0) - (entry[bId] || 0);
  }

  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    const diff = h2hPoints(a.team.id, b.team.id);
    if (diff !== 0) return -diff;
    return a.team.name.localeCompare(b.team.name);
  });
  return table;
}

function topScorers(matches, limit = 10) {
  const map = new Map();
  for (const m of matches) {
    for (const e of m.events || []) {
      if (!['goal', 'penalty'].includes(e.type)) continue;
      const teamId = String(e.team);
      const key = `${teamId}|${(e.player || 'Unknown').trim()}`;
      const entry = map.get(key) || { player: e.player || 'Unknown', teamId, goals: 0, penalties: 0 };
      entry.goals += 1;
      if (e.type === 'penalty') entry.penalties += 1;
      map.set(key, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player)).slice(0, limit);
}

function goalsPerMatchweek(matches) {
  const map = new Map();
  for (const m of matches) {
    if (m.status !== 'finished') continue;
    const entry = map.get(m.matchweek) || { matchweek: m.matchweek, goals: 0, matches: 0 };
    entry.goals += m.homeScore + m.awayScore;
    entry.matches += 1;
    map.set(m.matchweek, entry);
  }
  return [...map.values()].sort((a, b) => a.matchweek - b.matchweek);
}

module.exports = { computeStandings, topScorers, goalsPerMatchweek };
