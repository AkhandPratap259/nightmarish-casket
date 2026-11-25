import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container notfound ink-bleed">
      <div className="big">404</div>
      <h1>This room doesn't exist</h1>
      <p>The page you asked for isn't on the plan. Head back to the dashboard and pick a project that is.</p>
      <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
    </div>
  );
}
