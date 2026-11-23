import { CLAY_COLOURS } from '../data/config';

function FormChips({ form }) {
  if (!form || form.length === 0) return <span className="form-chips form-chips--none">—</span>;
  return (
    <span className="form-chips" aria-label={`Form: ${form.join(', ')}`}>
      {form.map((f, i) => (
        <span key={i} className={`form-chip form-chip--${f.toLowerCase()}`}>{f}</span>
      ))}
    </span>
  );
}

export default function StandingsTable({ standings }) {
  if (!standings || standings.length === 0) {
    return <p className="empty">No finished matches yet. The table fills in as results come in.</p>;
  }
  return (
    <div className="table-wrap">
      <table className="standings">
        <caption className="sr-only">League standings, sorted by points, goal difference, goals scored, then head-to-head</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Team</th>
            <th scope="col"><abbr title="Played">P</abbr></th>
            <th scope="col"><abbr title="Won">W</abbr></th>
            <th scope="col"><abbr title="Drawn">D</abbr></th>
            <th scope="col"><abbr title="Lost">L</abbr></th>
            <th scope="col"><abbr title="Goals for">GF</abbr></th>
            <th scope="col"><abbr title="Goals against">GA</abbr></th>
            <th scope="col"><abbr title="Goal difference">GD</abbr></th>
            <th scope="col">Pts</th>
            <th scope="col">Form</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => {
            const colour = CLAY_COLOURS[row.team.colour] || CLAY_COLOURS.sky;
            return (
              <tr key={row.team.id} className={i < 2 ? 'standings__row--top' : ''}>
                <td className="standings__pos">{i + 1}</td>
                <td>
                  <span className="team-chip" style={{ background: colour.bg }}>{row.team.shortName}</span>
                  <span className="standings__name">{row.team.name}</span>
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.gf}</td>
                <td>{row.ga}</td>
                <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td className="standings__pts">{row.points}</td>
                <td><FormChips form={row.form} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="table-note">Tiebreakers: points → goal difference → goals scored → head-to-head points.</p>
    </div>
  );
}
