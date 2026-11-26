import { useEffect, useState } from 'react';
import { api } from '../api';
import SeedDeck from '../components/SeedDeck';
import Modal from '../components/Modal';
import SeedShape from '../components/SeedShape';

export default function Plants({ user, toast }) {
  const [plants, setPlants] = useState([]);
  const [gardens, setGardens] = useState([]);
  const [beds, setBeds] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [season, setSeason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null); // { plant, companions, antagonists }
  const [sow, setSow] = useState(null); // { plant }
  const [sowGarden, setSowGarden] = useState('');
  const [sowBed, setSowBed] = useState('');
  const [sowQty, setSowQty] = useState(1);
  const [sowError, setSowError] = useState('');
  const [sowing, setSowing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, g] = await Promise.all([api.listPlants({ q: query, category, season }), api.listGardens()]);
        setPlants(p.plants || []);
        setGardens(g.gardens || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Could not load the seed library');
      } finally {
        setLoading(false);
      }
    })();
  }, [query, category, season]);

  useEffect(() => {
    if (!sowGarden) { setBeds([]); setSowBed(''); return; }
    api.listBeds(sowGarden).then((res) => {
      setBeds((res.beds || []).map((e) => e.bed || e));
    }).catch(() => setBeds([]));
  }, [sowGarden]);

  async function openDetail(plant) {
    try {
      const res = await api.getPlantCompanions(plant._id);
      setDetail(res);
    } catch {
      setDetail({ plant, companions: [], antagonists: [] });
    }
  }

  function openSow(plant) {
    setSowError('');
    setSowQty(1);
    setSowGarden(gardens[0]?._id || '');
    setSowBed('');
    setSow({ plant });
  }

  async function submitSow(e) {
    e.preventDefault();
    if (!sowBed) { setSowError('Pick a bed first.'); return; }
    setSowing(true);
    setSowError('');
    try {
      const res = await api.sowPlanting(sowBed, { plantId: sow.plant._id, quantity: sowQty });
      toast(`${sow.plant.name} sown — bed harmony ${res.harmony}.`, 'success');
      setSow(null);
    } catch (err) {
      setSowError(err.data?.conflicts ? `${err.message}. Harmony would drop to ${err.data.harmony}.` : err.message);
    } finally {
      setSowing(false);
    }
  }

  return (
    <div className="wrap page">
      <span className="eyebrow">Seed library</span>
      <h1 style={{ fontSize: '3rem' }}>Pick a packet. Throw it.</h1>
      <p className="lede">Every plant carries its real companions and antagonists. Drag a card onto a bed in a garden, or tap Sow and choose where it goes.</p>

      <form
        role="search"
        aria-label="Search the seed library"
        onSubmit={(e) => e.preventDefault()}
        style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '22px 0' }}
      >
        <div className="field" style={{ flex: '1 1 240px', margin: 0 }}>
          <label htmlFor="plant-search">Search</label>
          <input id="plant-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tomato, basil, carrot…" />
        </div>
        <div className="field" style={{ flex: '0 1 180px', margin: 0 }}>
          <label htmlFor="plant-category">Category</label>
          <select id="plant-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            <option value="vegetable">Vegetable</option>
            <option value="herb">Herb</option>
            <option value="flower">Flower</option>
            <option value="fruit">Fruit</option>
            <option value="legume">Legume</option>
          </select>
        </div>
        <div className="field" style={{ flex: '0 1 160px', margin: 0 }}>
          <label htmlFor="plant-season">Season</label>
          <select id="plant-season" value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">All seasons</option>
            <option value="cool">Cool</option>
            <option value="warm">Warm</option>
            <option value="all">All year</option>
          </select>
        </div>
      </form>

      {loading ? (
        <div className="skeleton" aria-label="Loading plants"><div className="bar" style={{ width: '50%' }} /><div className="bar" style={{ width: '70%' }} /></div>
      ) : error ? (
        <p className="status error" role="alert">{error}</p>
      ) : plants.length === 0 ? (
        <div className="empty">
          <p><strong>No plants match that search.</strong></p>
          <p className="muted">Try a different name, category or season.</p>
        </div>
      ) : (
        <SeedDeck plants={plants} onThrow={(plant) => openSow(plant)} onOpen={openDetail} />
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? detail.plant.name : ''}>
        {detail && (
          <div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
              <SeedShape shape={detail.plant.shape} colour={detail.plant.colour} label={detail.plant.name} />
              <p style={{ margin: 0 }}>
                <strong>{detail.plant.family}</strong> · {detail.plant.category} · {detail.plant.daysToMaturity} days to maturity
                <br /><span className="muted">{detail.plant.notes}</span>
              </p>
            </div>
            <p><strong>Spacing:</strong> {detail.plant.spacingCm} cm · <strong>Sun:</strong> {detail.plant.sun} · <strong>Water:</strong> {detail.plant.waterNeed === 3 ? 'thirsty — every day' : detail.plant.waterNeed === 2 ? 'moderate — every 2 days' : 'light — every 4 days'}</p>
            <h3 style={{ marginTop: 16 }}>Grows well with</h3>
            {detail.companions.length === 0 ? <p className="muted">No recorded companions in the library.</p> : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{detail.companions.map((p) => <span key={p._id} className="pill green">{p.name}</span>)}</div>
            )}
            <h3 style={{ marginTop: 16 }}>Keep away from</h3>
            {detail.antagonists.length === 0 ? <p className="muted">No recorded antagonists in the library.</p> : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{detail.antagonists.map((p) => <span key={p._id} className="pill red">{p.name}</span>)}</div>
            )}
            <div style={{ marginTop: 20 }}>
              <button className="btn primary block" type="button" onClick={() => { const p = detail.plant; setDetail(null); openSow(p); }}>Sow this plant</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!sow} onClose={() => setSow(null)} title={sow ? `Sow ${sow.plant.name}` : ''}>
        {sow && (
          <form onSubmit={submitSow}>
            <p><strong>{sow.plant.name}</strong> · {sow.plant.daysToMaturity} days to maturity · {sow.plant.season} season</p>
            {gardens.length === 0 ? (
              <p className="status error">You have no gardens yet — create one from your dashboard first.</p>
            ) : (
              <>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="sow-garden">Garden <span className="req" aria-hidden="true">*</span></label>
                    <select id="sow-garden" required value={sowGarden} onChange={(e) => setSowGarden(e.target.value)}>
                      {gardens.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="sow-bed">Bed <span className="req" aria-hidden="true">*</span></label>
                    <select id="sow-bed" required value={sowBed} onChange={(e) => setSowBed(e.target.value)}>
                      <option value="">Choose a bed…</option>
                      {beds.map((b) => <option key={b._id} value={b._id}>{b.name} — ring {b.ring}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="sow-qty">Quantity</label>
                  <input id="sow-qty" type="number" min="1" max="20" value={sowQty} onChange={(e) => setSowQty(Number(e.target.value))} />
                </div>
              </>
            )}
            {sowError && <p className="status error" role="alert" aria-live="assertive">{sowError}</p>}
            <button className="btn primary block" type="submit" disabled={sowing || gardens.length === 0}>{sowing ? 'Sowing…' : 'Sow it'}</button>
          </form>
        )}
      </Modal>
    </div>
  );
}
