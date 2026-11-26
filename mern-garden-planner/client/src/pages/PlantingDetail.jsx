import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import SeedShape from '../components/SeedShape';
import HarmonyMeter from '../components/HarmonyMeter';

const STAGES = ['sown', 'sprouted', 'growing', 'ready'];

export default function PlantingDetail({ toast }) {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await api.getPlanting(id);
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load this planting');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function act(fn, okMsg) {
    setBusy(true);
    try {
      await fn();
      toast(okMsg, 'success');
      load();
    } catch (err) {
      toast(err.message || 'That did not work', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="wrap page">
        <div className="skeleton" aria-label="Loading planting"><div className="bar" style={{ width: '45%' }} /><div className="bar" style={{ width: '65%' }} /></div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="wrap page">
        <p className="status error" role="alert">{error || 'Planting not found'}</p>
        <Link className="btn" to="/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  const { planting, neighbours, harmony } = data;
  const plant = planting.plant || {};
  const stageIdx = STAGES.indexOf(planting.stage);
  const active = ['sown', 'sprouted', 'growing', 'ready'].includes(planting.status);

  return (
    <div className="wrap page">
      <Link to={planting.bed?.garden ? `/gardens/${planting.bed.garden._id || planting.bed.garden}` : '/dashboard'} style={{ fontWeight: 800 }}>← Back to the garden</Link>
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div className="seed-hero">
            <SeedShape shape={plant.shape} colour={plant.colour} label={plant.name} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontSize: '2.8rem' }}>{plant.name} ×{planting.quantity}</h1>
            <p className="muted" style={{ margin: '4px 0 12px' }}>
              {planting.bed?.garden?.name} · {planting.bed?.name} · sown by {planting.gardener?.name || 'a gardener'} on{' '}
              {new Date(planting.sownDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p><span className={`pill${planting.status === 'harvested' ? ' green' : planting.status === 'lost' ? ' red' : ' yellow'}`}>{planting.status}</span></p>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <strong>Growth stage</strong>
          <div className="stage-strip" style={{ marginTop: 6 }} role="img" aria-label={`Growth stage: ${planting.stage}`}>
            {STAGES.map((s, i) => (
              <span key={s} className={i < stageIdx ? 'on' : i === stageIdx ? 'current' : ''}>{s}</span>
            ))}
          </div>
          <p style={{ fontWeight: 700, marginTop: 10 }}>
            {planting.daysUntilHarvest === 0 ? 'Ready to harvest now.' : `${planting.daysUntilHarvest} day${planting.daysUntilHarvest === 1 ? '' : 's'} until harvest.`}
            {' '}Next watering: {planting.nextWatering ? new Date(planting.nextWatering).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
            {planting.wateringDue && <span className="pill red" style={{ marginLeft: 8 }}>Water due</span>}
          </p>
          {plant.notes && <p className="muted">{plant.notes}</p>}
          {planting.notes && <p><strong>Your note:</strong> {planting.notes}</p>}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <button className="btn blue" type="button" disabled={!active || busy} onClick={() => act(() => api.waterPlanting(planting._id), 'Watered — next watering moved on.')}>Water now</button>
          <button className="btn primary" type="button" disabled={!active || busy} onClick={() => act(() => api.harvestPlanting(planting._id), 'Harvested — nice work.')}>Mark harvested</button>
          <button className="btn danger" type="button" disabled={!active || busy} onClick={() => act(() => api.markLost(planting._id), 'Marked as lost — the bed frees up for something new.')}>Mark as lost</button>
        </div>
      </div>

      <section className="section" aria-label="Neighbours and harmony">
        <h2 style={{ fontSize: '2rem' }}>Neighbours in this bed</h2>
        <div style={{ margin: '14px 0' }}>
          <HarmonyMeter score={harmony ? harmony.score : null} label={neighbours.length === 0 ? 'No neighbours yet — this plant has the bed to itself.' : undefined} />
        </div>
        {harmony && harmony.boosts.length > 0 && (
          <p><strong>Companions here:</strong> {harmony.boosts.map((b) => <span key={b} className="pill green" style={{ marginRight: 6 }}>{b}</span>)}</p>
        )}
        {harmony && harmony.conflicts.length > 0 && (
          <p><strong>Conflicts here:</strong> {harmony.conflicts.map((c) => <span key={c} className="pill red" style={{ marginRight: 6 }}>{c}</span>)}</p>
        )}
        {neighbours.length === 0 ? (
          <p className="muted">No other active plantings share this bed.</p>
        ) : (
          <div className="grid cols-3">
            {neighbours.map((n) => (
              <article key={n._id} className="card hoverable">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <SeedShape shape={n.plant?.shape} colour={n.plant?.colour} label={n.plant?.name} />
                  <div>
                    <h3>{n.plant?.name}</h3>
                    <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>{n.stage} · {n.daysUntilHarvest} days to harvest</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
