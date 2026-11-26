import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { getSocket } from '../socket';
import OrbitMap from '../components/OrbitMap';
import SeedDeck from '../components/SeedDeck';
import HarmonyMeter from '../components/HarmonyMeter';
import HarvestChart from '../components/HarvestChart';
import Modal from '../components/Modal';
import SeedShape from '../components/SeedShape';

export default function GardenDetail({ user, toast }) {
  const { id } = useParams();
  const [garden, setGarden] = useState(null);
  const [beds, setBeds] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [plants, setPlants] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedBed, setSelectedBed] = useState(null);
  const [dragOverBed, setDragOverBed] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sow, setSow] = useState(null); // { plant, bedId }
  const [sowQty, setSowQty] = useState(1);
  const [sowBedId, setSowBedId] = useState('');
  const [sowing, setSowing] = useState(false);
  const [sowError, setSowError] = useState('');
  const [sideWidth, setSideWidth] = useState(300);
  const [newBed, setNewBed] = useState({ name: '', ring: 1, angle: 0, slots: 6 });
  const [addingBed, setAddingBed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [g, a, p, t] = await Promise.all([
        api.getGarden(id),
        api.gardenAnalytics(id),
        api.listPlants(),
        api.listTasks(id, { status: 'open' }),
      ]);
      setGarden(g.garden);
      setBeds(g.beds || []);
      setAnalytics(a);
      setPlants(p.plants || []);
      setTasks(t.tasks || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load this garden');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket(user?.id);
    socket.emit('join-garden', id);
    const refresh = () => load();
    socket.on('planting:sown', refresh);
    socket.on('planting:watered', refresh);
    socket.on('planting:harvested', refresh);
    socket.on('task:created', refresh);
    socket.on('task:updated', refresh);
    return () => {
      socket.off('planting:sown', refresh);
      socket.off('planting:watered', refresh);
      socket.off('planting:harvested', refresh);
      socket.off('task:created', refresh);
      socket.off('task:updated', refresh);
    };
  }, [id, user, load]);

  useEffect(() => {
    if (beds.length > 0 && !selectedBed) setSelectedBed(beds[0]);
    else if (selectedBed) {
      const fresh = beds.find((b) => String((b.bed || b)._id) === String((selectedBed.bed || selectedBed)._id));
      if (fresh && fresh !== selectedBed) setSelectedBed(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beds]);

  function startResize(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sideWidth;
    function move(ev) { setSideWidth(Math.max(240, Math.min(420, startW + (ev.clientX - startX)))); }
    function up() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  function openSow(plant, bedId) {
    setSowError('');
    setSowQty(1);
    setSowBedId(bedId || (selectedBed ? String((selectedBed.bed || selectedBed)._id) : ''));
    setSow({ plant, bedId: bedId || null });
  }

  async function submitSow(e) {
    e.preventDefault();
    if (!sow || !sowBedId) {
      setSowError('Pick a bed first.');
      return;
    }
    setSowing(true);
    setSowError('');
    try {
      const res = await api.sowPlanting(sowBedId, { plantId: sow.plant._id, quantity: sowQty });
      const boostText = res.boosts && res.boosts.length > 0 ? ` It likes ${res.boosts.join(', ')} here.` : '';
      toast(`${sow.plant.name} sown — bed harmony ${res.harmony}.${boostText}`, 'success');
      setSow(null);
      load();
    } catch (err) {
      const msg = err.data?.conflicts
        ? `${err.message}. Harmony would drop to ${err.data.harmony}.`
        : err.message;
      setSowError(msg || 'Could not sow that plant');
    } finally {
      setSowing(false);
    }
  }

  async function addBed(e) {
    e.preventDefault();
    if (!newBed.name.trim()) return;
    setAddingBed(true);
    try {
      await api.createBed(id, newBed);
      setNewBed({ name: '', ring: 1, angle: 0, slots: 6 });
      toast('Bed added to the orbit map.', 'success');
      load();
    } catch (err) {
      toast(err.message || 'Could not add the bed', 'error');
    } finally {
      setAddingBed(false);
    }
  }

  async function waterPlanting(plantingId) {
    try {
      await api.waterPlanting(plantingId);
      toast('Watered.', 'success');
      load();
    } catch (err) {
      toast(err.message || 'Could not water that planting', 'error');
    }
  }

  if (loading) {
    return (
      <div className="wrap page">
        <div className="skeleton" aria-label="Loading garden"><div className="bar" style={{ width: '45%' }} /><div className="bar" style={{ width: '80%' }} /><div className="bar" style={{ width: '60%' }} /></div>
      </div>
    );
  }
  if (error || !garden) {
    return (
      <div className="wrap page">
        <p className="status error" role="alert">{error || 'Garden not found'}</p>
        <Link className="btn" to="/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  const selected = selectedBed || beds[0];
  const selBed = selected ? (selected.bed || selected) : null;
  const selPlantings = selected ? (selected.plantings || []) : [];
  const canManage = user && (String(garden.coordinator?._id || garden.coordinator) === String(user.id) || user.role === 'admin');
  const nextAngle = beds.length === 0 ? 0 : (Math.max(...beds.map((b) => (b.bed || b).angle)) + 60) % 360;

  return (
    <div className="wrap page">
      <Link to="/dashboard" style={{ fontWeight: 800 }}>← My gardens</Link>
      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', marginTop: 10 }}>
        <h1 style={{ fontSize: '3rem' }}>{garden.name}</h1>
        {garden.coordinator && <span className="pill blue">Coordinated by {garden.coordinator.name}</span>}
      </div>
      <p className="lede">{garden.description || garden.location || 'A shared garden.'}</p>

      <div className="workspace" style={{ '--side-w': `${sideWidth}px`, marginTop: 24 }}>
        <aside className="workspace-side" aria-label="Beds">
          <h2 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Beds · {beds.length}</h2>
          {beds.length === 0 ? (
            <div className="empty"><p><strong>No beds yet.</strong></p><p className="muted">Add the first bed below — it lands on the orbit map.</p></div>
          ) : (
            beds.map((entry) => {
              const b = entry.bed || entry;
              const active = String(b._id) === String(selBed?._id);
              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => setSelectedBed(entry)}
                  className="card"
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', marginBottom: 10, padding: 12,
                    background: active ? 'var(--yellow)' : 'var(--white)', cursor: 'pointer',
                  }}
                  aria-pressed={active}
                >
                  <strong style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem' }}>{b.name}</strong>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                    Ring {b.ring} · {entry.usedSlots}/{b.slots} slots
                    {entry.harmony != null && ` · harmony ${entry.harmony}`}
                  </div>
                </button>
              );
            })
          )}
          {canManage && (
            <form onSubmit={addBed} style={{ marginTop: 18 }}>
              <h3 style={{ marginBottom: 10 }}>Add a bed</h3>
              <div className="field">
                <label htmlFor="bed-name">Bed name <span className="req" aria-hidden="true">*</span></label>
                <input id="bed-name" required value={newBed.name} onChange={(e) => setNewBed({ ...newBed, name: e.target.value })} placeholder="e.g. Bed C1" />
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="bed-ring">Ring</label>
                  <select id="bed-ring" value={newBed.ring} onChange={(e) => setNewBed({ ...newBed, ring: Number(e.target.value), angle: nextAngle })}>
                    {Array.from({ length: garden.rings || 2 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Ring {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="bed-slots">Slots</label>
                  <input id="bed-slots" type="number" min="1" max="24" value={newBed.slots} onChange={(e) => setNewBed({ ...newBed, slots: Number(e.target.value) })} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="bed-angle">Angle on the ring (degrees)</label>
                <input id="bed-angle" type="number" min="0" max="359" value={newBed.angle} onChange={(e) => setNewBed({ ...newBed, angle: Number(e.target.value) })} />
                <span className="hint">Next free angle: {nextAngle}°</span>
              </div>
              <button className="btn primary block" type="submit" disabled={addingBed}>{addingBed ? 'Adding…' : 'Add bed'}</button>
            </form>
          )}
        </aside>
        <div
          className="workspace-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSideWidth((w) => Math.max(240, w - 20));
            if (e.key === 'ArrowRight') setSideWidth((w) => Math.min(420, w + 20));
          }}
        />
        <div className="workspace-main">
          <div className="drop-hint" role="status">
            {dragOverBed ? 'Drop to sow here — the harmony engine checks the neighbours first.' : 'Drag a seed packet onto a bed, or tap Sow and pick a bed.'}
          </div>
          <OrbitMap
            beds={beds}
            rings={garden.rings || 2}
            onSelectBed={(entry) => setSelectedBed(entry)}
            dragOverBed={dragOverBed}
            onDropOnBed={(bed) => setDragOverBed(null)}
          />

          {selected && selBed && (
            <section aria-label={`${selBed.name} details`} style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: '2rem' }}>{selBed.name} <span className="muted" style={{ fontSize: '1rem', fontFamily: 'Karla, sans-serif', fontWeight: 700 }}>· Ring {selBed.ring} · {selBed.soil} soil · {selBed.sunHours}h sun</span></h2>
              <div style={{ margin: '12px 0 20px' }}>
                <HarmonyMeter score={selected.harmony} />
              </div>
              {selPlantings.length === 0 ? (
                <div className="empty"><p><strong>This bed is empty.</strong></p><p className="muted">Throw a seed packet onto it from the deck below.</p></div>
              ) : (
                <div className="grid cols-2">
                  {selPlantings.map((p) => (
                    <article key={p._id} className="card hoverable">
                      <div style={{ display: 'flex', gap: 12 }}>
                        <SeedShape shape={p.plant?.shape} colour={p.plant?.colour} label={p.plant?.name} />
                        <div>
                          <h3>{p.plant?.name} ×{p.quantity}</h3>
                          <p className="muted" style={{ margin: '2px 0', fontSize: '0.9rem' }}>
                            Sown {new Date(p.sownDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {p.gardener?.name || 'a gardener'}
                          </p>
                          <p style={{ fontWeight: 700, fontSize: '0.92rem', margin: '4px 0' }}>
                            {p.daysUntilHarvest === 0 ? 'Ready to harvest' : `${p.daysUntilHarvest} days to harvest`}
                            {p.wateringDue && <span className="pill red" style={{ marginLeft: 8 }}>Needs water</span>}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <Link className="btn small" to={`/plantings/${p._id}`}>Details</Link>
                        <button className="btn small blue" type="button" onClick={() => waterPlanting(p._id)}>Water now</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section aria-label="Seed deck" style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: 4 }}>Seed deck — throw one onto a bed</h2>
            <p className="muted" style={{ marginTop: 0 }}>Drag a card onto the orbit map, or tap Sow and choose a bed. Antagonists are refused on the spot.</p>
            <SeedDeck plants={plants} onThrow={(plant, bedId) => openSow(plant, bedId)} onOpen={(plant) => openSow(plant, null)} onDragOverBed={setDragOverBed} />
          </section>

          {analytics && (
            <section aria-label="Garden analytics" style={{ marginTop: 32 }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: 12 }}>Harvest forecast</h2>
              <div className="card">
                <HarvestChart items={analytics.harvestSoon} />
              </div>
              <div className="grid cols-3" style={{ marginTop: 18 }}>
                <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem' }}>{analytics.totals.activePlantings}</b><div className="muted">growing plantings</div></div>
                <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem' }}>{analytics.wateringDue.length}</b><div className="muted">need water now</div></div>
                <div className="card"><b style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem' }}>{analytics.totals.overdueTasks}</b><div className="muted">overdue tasks</div></div>
              </div>
              <h3 style={{ marginTop: 24 }}>Bed utilisation</h3>
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table className="table">
                  <thead><tr><th>Bed</th><th>Ring</th><th>Slots</th><th>Use</th><th>Harmony</th></tr></thead>
                  <tbody>
                    {(analytics.bedStats || []).map((b) => (
                      <tr key={b.bedId}>
                        <td><strong>{b.name}</strong></td>
                        <td>{b.ring}</td>
                        <td>{b.used}/{b.slots}</td>
                        <td>{b.utilisation}%</td>
                        <td>{b.harmony == null ? '—' : b.harmony}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tasks.length > 0 && (
                <>
                  <h3 style={{ marginTop: 24 }}>Open tasks</h3>
                  {tasks.slice(0, 6).map((t) => (
                    <div key={t._id} className="task-row">
                      <div className="task-body">
                        <div className="task-title">{t.title}</div>
                        <div className="muted" style={{ fontSize: '0.88rem' }}>{t.kind} · due {new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <Link className="btn small" to="/tasks">All tasks</Link>
                    </div>
                  ))}
                </>
              )}
            </section>
          )}
        </div>
      </div>

      <Modal open={!!sow} onClose={() => setSow(null)} title={sow ? `Sow ${sow.plant.name}` : ''}>
        {sow && (
          <form onSubmit={submitSow}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
              <SeedShape shape={sow.plant.shape} colour={sow.plant.colour} label={sow.plant.name} />
              <p style={{ margin: 0 }}>
                <strong>{sow.plant.name}</strong> · {sow.plant.daysToMaturity} days to maturity · {sow.plant.season} season
                <br /><span className="muted">{sow.plant.notes}</span>
              </p>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="sow-bed">Bed <span className="req" aria-hidden="true">*</span></label>
                <select id="sow-bed" required value={sowBedId} onChange={(e) => setSowBedId(e.target.value)}>
                  <option value="">Choose a bed…</option>
                  {beds.map((entry) => {
                    const b = entry.bed || entry;
                    return <option key={b._id} value={b._id}>{b.name} — {entry.usedSlots}/{b.slots} slots{entry.harmony != null ? `, harmony ${entry.harmony}` : ''}</option>;
                  })}
                </select>
              </div>
              <div className="field">
                <label htmlFor="sow-qty">Quantity</label>
                <input id="sow-qty" type="number" min="1" max="20" value={sowQty} onChange={(e) => setSowQty(Number(e.target.value))} />
              </div>
            </div>
            {sowError && <p className="status error" role="alert" aria-live="assertive">{sowError}</p>}
            <p className="hint" style={{ fontSize: '0.9rem' }}>The harmony engine checks this plant against the bed&apos;s current neighbours before sowing. Antagonists are refused and the conflict is named.</p>
            <button className="btn primary block" type="submit" disabled={sowing}>{sowing ? 'Sowing…' : 'Sow it'}</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
