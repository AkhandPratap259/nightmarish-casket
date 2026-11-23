import { Link } from 'react-router-dom';

// Broadcast-style score bug: black bar, team codes, score digits that flip
// with a mechanical stepped tick whenever the score changes.
export default function ScoreBug({ match, size = 'md', link = true }) {
  if (!match) return null;
  const inner = (
    <div className={`scorebug scorebug--${size}`} role="group" aria-label={`${match.homeTeam?.shortName || 'Home'} ${match.homeScore} — ${match.awayScore} ${match.awayTeam?.shortName || 'Away'}`}>
      <span className="scorebug__team scorebug__team--home">{match.homeTeam?.shortName || 'HOM'}</span>
      <span className="scorebug__digits" aria-hidden="true">
        <span className="scorebug__digit" key={`h-${match.homeScore}`}>{match.homeScore}</span>
        <span className="scorebug__dash">–</span>
        <span className="scorebug__digit" key={`a-${match.awayScore}`}>{match.awayScore}</span>
      </span>
      <span className="scorebug__team scorebug__team--away">{match.awayTeam?.shortName || 'AWY'}</span>
      {match.status === 'live' && <span className="scorebug__live"><span className="live-dot" />LIVE</span>}
      {match.status === 'finished' && <span className="scorebug__ft">FT</span>}
    </div>
  );
  if (link) {
    return <Link className="scorebug-link" to={`/matches/${match.id}`}>{inner}</Link>;
  }
  return inner;
}
