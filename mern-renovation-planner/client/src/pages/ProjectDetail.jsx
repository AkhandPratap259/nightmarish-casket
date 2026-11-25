import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { connectSocket } from '../socket';
import FloorPlan from '../components/FloorPlan';
import BudgetChart from '../components/BudgetChart';
import TaskBoard from '../components/TaskBoard';
import Modal from '../components/Modal';

const PHASES = ['Demolition', 'Structural', 'Electrical', 'Plumbing', 'Plaster & Paint', 'Flooring', 'Fixtures', 'Finishing'];
const ROOM_TYPES = ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Dining', 'Balcony', 'Study', 'Utility', 'Other'];
const ROOM_COLOURS = ['#FFD400', '#2E6BFF', '#FF3B30', '#00C2A8', '#FF8A00'];

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [takeoffs, setTakeoffs] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({ name: '', type: 'Kitchen', length: '', width: '', height: 3, x: 0, y: 0, colour: '#FFD400' });
  const [taskForm, setTaskForm] = useState({ phase: 'Demolition', title: '', estimatedCost: '', actualCost: '', dueDate: '', assignedContractor: '', dependsOn: '' });
  const [takeoffForm, setTakeoffForm] = useState({ roomId: '', materialId: '', coats: 2 });
  const [quoteTask, setQuoteTask] = useState(null);
  const [quoteForm, setQuoteForm] = useState({ contractor: '', amount: '', note: '' });
  const [quotes, setQuotes] = useState([]);

  const load = useCallback(async () => {
    try {
      const [p, r, t, tf, m, c, s] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/rooms`),
        api.get(`/projects/${id}/tasks`),
        api.get(`/projects/${id}/takeoffs`),
        api.get('/materials'),
        api.get('/contractors'),
        api.get(`/projects/${id}/stats`),
      ]);
      setProject(p.data); setRooms(r.data); setTasks(t.data); setTakeoffs(tf.data);
      setMaterials(m.data); setContractors(c.data); setStats(s.data);
    } catch (e) { setError(e.response?.data?.message || 'Could not load this project.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = connectSocket();
    socket.emit('join-project', id);
    const onActivity = (a) => setActivity((prev) => [{ ...a, at: a.at || new Date() }, ...prev].slice(0, 12));
    const onTask = () => load();
    socket.on('activity', onActivity);
    socket.on('task-updated', onTask);
    socket.on('quote-added', onTask);
    return () => { socket.emit('leave-project', id); socket.off('activity', onActivity); socket.off('task-updated', onTask); socket.off('quote-added', onTask); };
  }, [id, load]);

  const onRoomChange = useCallback(async (roomId, patch) => {
    setRooms((prev) => prev.map(r => (r._id === roomId ? { ...r, ...patch } : r)));
    try { await api.put(`/projects/${id}/rooms/${roomId}`, patch); }
    catch { setNotice('Room change could not be saved — check your connection.'); }
  }, [id]);

  async function addRoom(e) {
    e.preventDefault();
    setNotice('');
    if (!roomForm.name.trim()) { setNotice('Give the room a name.'); return; }
    const length = Number(roomForm.length), width = Number(roomForm.width);
    if (!(length >= 0.5) || !(width >= 0.5)) { setNotice('Length and width must each be at least 0.5 m.'); return; }
    try {
      const { data } = await api.post(`/projects/${id}/rooms`, { ...roomForm, length, width, height: Number(roomForm.height) || 3 });
      setRooms([...rooms, data]);
      setRoomForm({ name: '', type: 'Kitchen', length: '', width: '', height: 3, x: 0, y: 0, colour: '#FFD400' });
      setNotice(`Room "${data.name}" added — floor area ${data.floorArea} m², wall area ${data.wallArea} m².`);
    } catch (err) { setNotice(err.response?.data?.message || 'Could not add the room.'); }
  }

  async function deleteRoom(roomId, name) {
    if (!window.confirm(`Delete room "${name}"?`)) return;
    await api.delete(`/projects/${id}/rooms/${roomId}`);
    setRooms(rooms.filter(r => r._id !== roomId));
  }

  async function addTask(e) {
    e.preventDefault();
    setNotice('');
    if (!taskForm.title.trim()) { setNotice('Give the task a title.'); return; }
    try {
      const payload = { ...taskForm, estimatedCost: Number(taskForm.estimatedCost) || 0, actualCost: Number(taskForm.actualCost) || 0 };
      if (!payload.assignedContractor) delete payload.assignedContractor;
      if (!payload.dependsOn) delete payload.dependsOn;
      if (!payload.dueDate) delete payload.dueDate;
      const { data } = await api.post(`/projects/${id}/tasks`, payload);
      setTasks([...tasks, data]);
      setTaskForm({ phase: 'Demolition', title: '', estimatedCost: '', actualCost: '', dueDate: '', assignedContractor: '', dependsOn: '' });
      setNotice(`Task "${data.title}" added.`);
    } catch (err) { setNotice(err.response?.data?.message || 'Could not add the task.'); }
  }

  async function changeTaskStatus(task, status) {
    try {
      const { data } = await api.put(`/projects/${id}/tasks/${task._id}`, { status });
      setTasks(tasks.map(t => (t._id === task._id ? data : t)));
      load();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not move the task.');
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    await api.delete(`/projects/${id}/tasks/${task._id}`);
    setTasks(tasks.filter(t => t._id !== task._id));
  }

  async function addTakeoff(e) {
    e.preventDefault();
    setNotice('');
    if (!takeoffForm.roomId || !takeoffForm.materialId) { setNotice('Pick a room and a material.'); return; }
    try {
      const { data } = await api.post(`/projects/${id}/takeoffs`, { ...takeoffForm, coats: Number(takeoffForm.coats) || 1 });
      setTakeoffs([data, ...takeoffs]);
      const mat = materials.find(m => m._id === takeoffForm.materialId);
      const room = rooms.find(r => r._id === takeoffForm.roomId);
      setNotice(`Take-off saved: ${data.quantity} ${mat?.unit || ''} of ${mat?.name} for ${room?.name} — ₹${data.totalCost.toLocaleString('en-IN')}.`);
      load();
    } catch (err) { setNotice(err.response?.data?.message || 'Could not compute the take-off.'); }
  }

  async function openQuotes(task) {
    const { data } = await api.get(`/quotes/task/${task._id}`);
    setQuotes(data); setQuoteTask(task);
    setQuoteForm({ contractor: contractors[0]?._id || '', amount: '', note: '' });
  }

  async function addQuote(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/quotes', { task: quoteTask._id, contractor: quoteForm.contractor, amount: Number(quoteForm.amount), note: quoteForm.note });
      setQuotes([data, ...quotes]);
    } catch (err) { setNotice(err.response?.data?.message || 'Could not add the quote.'); }
  }

  if (loading) return (
    <div className="container page">
      <div className="skeleton" style={{ width: '50%' }} /><div className="skeleton" /><div className="skeleton" style={{ width: '80%' }} />
      <p aria-live="polite">Loading the project plan…</p>
    </div>
  );
  if (error || !project) return <div className="container page"><div className="state-box" role="alert"><h2>Project not found</h2><p>{error || 'This project does not exist or is not yours.'}</p></div></div>;

  return (
    <div className="container page ink-bleed">
      <p className="kicker">{project.propertyType}{project.isSample ? ' · Sample project' : ''}</p>
      <h1>{project.name}</h1>
      <p>{project.address} · Budget <strong>₹{(project.totalBudget || 0).toLocaleString('en-IN')}</strong> · Status <strong>{project.status}</strong></p>

      {stats && (
        <div className="stat-strip">
          <div className="stat"><b>₹{(stats.estimatedTotal || 0).toLocaleString('en-IN')}</b>Estimated total</div>
          <div className="stat"><b>₹{(stats.actualTotal || 0).toLocaleString('en-IN')}</b>Actual spent</div>
          <div className="stat" style={stats.overBudget ? { background: '#FFE3E1' } : {}}>
            <b>₹{(stats.remaining || 0).toLocaleString('en-IN')}</b>
            {stats.overBudget ? 'Over budget — review costs' : 'Remaining budget'}
          </div>
        </div>
      )}

      {notice && <div className="form-success" role="status" aria-live="polite">{notice}</div>}

      <section aria-label="Floor plan">
        <h2>Floor plan</h2>
        {rooms.length === 0 ? (
          <div className="state-box"><h3>No rooms yet</h3><p>Add your first room below — it will appear on the blueprint canvas.</p></div>
        ) : (
          <FloorPlan rooms={rooms} onRoomChange={onRoomChange} onSelect={setSelectedRoom} selectedId={selectedRoom?._id} />
        )}
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Add a room</h3>
          <form onSubmit={addRoom}>
            <div className="form-row">
              <div className="field"><label htmlFor="room-name">Room name</label><input id="room-name" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. Kitchen" required /></div>
              <div className="field"><label htmlFor="room-type">Type</label><select id="room-type" value={roomForm.type} onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}>{ROOM_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="room-length">Length (m)</label><input id="room-length" type="number" step="0.1" min="0.5" value={roomForm.length} onChange={(e) => setRoomForm({ ...roomForm, length: e.target.value })} required /></div>
              <div className="field"><label htmlFor="room-width">Width (m)</label><input id="room-width" type="number" step="0.1" min="0.5" value={roomForm.width} onChange={(e) => setRoomForm({ ...roomForm, width: e.target.value })} required /></div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="room-height">Height (m)</label><input id="room-height" type="number" step="0.1" min="2" value={roomForm.height} onChange={(e) => setRoomForm({ ...roomForm, height: e.target.value })} /></div>
              <div className="field"><label htmlFor="room-colour">Colour</label><select id="room-colour" value={roomForm.colour} onChange={(e) => setRoomForm({ ...roomForm, colour: e.target.value })}>{ROOM_COLOURS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <button className="btn btn-primary" type="submit">Add room</button>
          </form>
          <div className="table-wrap" style={{ marginTop: 16, boxShadow: 'none' }}>
            <table>
              <thead><tr><th>Room</th><th>Size (m)</th><th>Floor</th><th>Walls</th><th>Volume</th><th></th></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r._id}>
                    <td><strong>{r.name}</strong> <span className="tag">{r.type}</span></td>
                    <td>{r.length} × {r.width} × {r.height}</td>
                    <td>{r.floorArea} m²</td>
                    <td>{r.wallArea} m²</td>
                    <td>{r.volume} m³</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => deleteRoom(r._id, r.name)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 40 }} aria-label="Tasks">
        <h2>Tasks by phase</h2>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Add a task</h3>
          <form onSubmit={addTask}>
            <div className="form-row">
              <div className="field"><label htmlFor="task-title">Title</label><input id="task-title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Lay vitrified floor tiles" required /></div>
              <div className="field"><label htmlFor="task-phase">Phase</label><select id="task-phase" value={taskForm.phase} onChange={(e) => setTaskForm({ ...taskForm, phase: e.target.value })}>{PHASES.map(p => <option key={p}>{p}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="task-est">Estimated cost (₹)</label><input id="task-est" type="number" min="0" value={taskForm.estimatedCost} onChange={(e) => setTaskForm({ ...taskForm, estimatedCost: e.target.value })} /></div>
              <div className="field"><label htmlFor="task-due">Due date</label><input id="task-due" type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="task-contractor">Assigned contractor</label><select id="task-contractor" value={taskForm.assignedContractor} onChange={(e) => setTaskForm({ ...taskForm, assignedContractor: e.target.value })}><option value="">Unassigned</option>{contractors.map(c => <option key={c._id} value={c._id}>{c.name} — {c.trade}</option>)}</select></div>
              <div className="field"><label htmlFor="task-dep">Depends on (must finish first)</label><select id="task-dep" value={taskForm.dependsOn} onChange={(e) => setTaskForm({ ...taskForm, dependsOn: e.target.value })}><option value="">No dependency</option>{tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}</select></div>
            </div>
            <button className="btn btn-primary" type="submit">Add task</button>
          </form>
        </div>
        {tasks.length === 0 ? (
          <div className="state-box"><h3>No tasks yet</h3><p>Break the renovation into phases and add the first task above.</p></div>
        ) : (
          <TaskBoard tasks={tasks} onStatusChange={changeTaskStatus} onDelete={deleteTask} onQuote={openQuotes} />
        )}
      </section>

      <section style={{ marginTop: 40 }} aria-label="Quantity take-off">
        <h2>Quantity take-off</h2>
        <p>Pick a room and a material — HomeDraft computes the quantity from the room's real dimensions, including waste. Paint uses wall area; flooring and tiles use floor or wall area as applicable.</p>
        <div className="card">
          <form onSubmit={addTakeoff}>
            <div className="form-row">
              <div className="field"><label htmlFor="to-room">Room</label><select id="to-room" value={takeoffForm.roomId} onChange={(e) => setTakeoffForm({ ...takeoffForm, roomId: e.target.value })}><option value="">Choose a room</option>{rooms.map(r => <option key={r._id} value={r._id}>{r.name} — {r.length}×{r.width} m</option>)}</select></div>
              <div className="field"><label htmlFor="to-material">Material</label><select id="to-material" value={takeoffForm.materialId} onChange={(e) => setTakeoffForm({ ...takeoffForm, materialId: e.target.value })}><option value="">Choose a material</option>{materials.filter(m => m.coverage).map(m => <option key={m._id} value={m._id}>{m.name} — ₹{m.unitPrice}/{m.unit}</option>)}</select></div>
              <div className="field"><label htmlFor="to-coats">Coats / layers</label><input id="to-coats" type="number" min="1" value={takeoffForm.coats} onChange={(e) => setTakeoffForm({ ...takeoffForm, coats: e.target.value })} /></div>
            </div>
            <button className="btn btn-primary" type="submit">Compute take-off</button>
          </form>
        </div>
        {takeoffs.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead><tr><th>Room</th><th>Material</th><th>Area used</th><th>Qty</th><th>Cost</th></tr></thead>
              <tbody>
                {takeoffs.map(l => (
                  <tr key={l._id}>
                    <td>{l.room?.name}</td>
                    <td>{l.material?.name} ({l.coats} coat{l.coats > 1 ? 's' : ''})</td>
                    <td>{l.areaUsed} m² ({l.basis})</td>
                    <td>{l.quantity} {l.material?.unit}</td>
                    <td><strong>₹{l.totalCost.toLocaleString('en-IN')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 40 }} aria-label="Budget">
        <h2>Budget dashboard</h2>
        <BudgetChart data={stats?.byCategory} totalBudget={project.totalBudget} />
      </section>

      {activity.length > 0 && (
        <section style={{ marginTop: 40 }} aria-label="Live activity">
          <h2>Live activity</h2>
          <ul className="activity-feed" aria-live="polite">
            {activity.map((a, i) => (
              <li key={i}>{a.type === 'quote-added' ? `New quote ₹${a.amount} from ${a.contractor} for a task` : `Task "${a.title}" moved to ${a.status || 'updated'}`} · {new Date(a.at).toLocaleTimeString('en-IN')}</li>
            ))}
          </ul>
        </section>
      )}

      {quoteTask && (
        <Modal title={`Quotes — ${quoteTask.title}`} onClose={() => setQuoteTask(null)}>
          <form onSubmit={addQuote}>
            <div className="form-row">
              <div className="field"><label htmlFor="q-contractor">Contractor</label><select id="q-contractor" value={quoteForm.contractor} onChange={(e) => setQuoteForm({ ...quoteForm, contractor: e.target.value })}>{contractors.map(c => <option key={c._id} value={c._id}>{c.name} — {c.trade}</option>)}</select></div>
              <div className="field"><label htmlFor="q-amount">Amount (₹)</label><input id="q-amount" type="number" min="0" value={quoteForm.amount} onChange={(e) => setQuoteForm({ ...quoteForm, amount: e.target.value })} required /></div>
            </div>
            <div className="field"><label htmlFor="q-note">Note</label><input id="q-note" value={quoteForm.note} onChange={(e) => setQuoteForm({ ...quoteForm, note: e.target.value })} placeholder="e.g. Includes labour and material" /></div>
            <button className="btn btn-primary" type="submit">Add quote</button>
          </form>
          {quotes.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {quotes.map(q => (
                <p key={q._id}><strong>₹{(q.amount || 0).toLocaleString('en-IN')}</strong> — {q.contractor?.name} ({q.contractor?.trade}) · {q.status}{q.note ? ` — ${q.note}` : ''}</p>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
