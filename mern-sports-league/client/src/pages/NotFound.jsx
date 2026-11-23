import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page notfound">
      <div className="notfound__bug" aria-hidden="true">
        <span>PP</span><span className="notfound__digits">4–0–4</span><span>NF</span>
      </div>
      <h1>404 — no match found</h1>
      <p className="page-head__lead">This page is not on the fixture list. Head back to the leagues and find a game that is actually happening.</p>
      <div className="hero__ctas">
        <Link className="btn btn--primary" to="/">Back home</Link>
        <Link className="btn btn--secondary" to="/leagues">Browse leagues</Link>
      </div>
    </div>
  );
}
