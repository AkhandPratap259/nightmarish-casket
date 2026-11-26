import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="wrap page">
      <div className="notfound">
        <div className="huge" aria-hidden="true">404</div>
        <h1 style={{ fontSize: '2.4rem' }}>This plot is empty</h1>
        <p className="lede" style={{ margin: '12px auto' }}>
          Nothing was ever sown at this address. Head back to the garden and try another path.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          <Link className="btn primary" to="/">Back to the garden</Link>
          <Link className="btn" to="/dashboard">My dashboard</Link>
        </div>
      </div>
    </div>
  );
}
