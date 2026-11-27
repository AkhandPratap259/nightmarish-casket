import { useEffect, useRef, useState } from 'react';
import { COLUMNS, PRIORITIES, api } from '../api';
import CardChat from './CardChat.jsx';

/* Task-detail modal — checklist, comments, move, delete. Escape and backdrop
   close; focus returns to the card that opened it. Opens with the glitch-cut
   transition (E8); reduced-motion users get a plain fade. */

export default function TaskModal({ task, token, members, userId, onClose, onReload, showToast }) {
  const [checkText, setCheckText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = [...(dialogRef.current?.querySelectorAll('button:not(:disabled),input:not(:disabled):not([hidden]),select:not(:disabled),textarea:not(:disabled),a[href]') || [])];
        if (!items.length) return;
        const first = items[0], last = items[items.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; };
  }, [onClose]);

  async function move(status) {
    setBusy(true);
    try {
      const { task: updated } = await api(`/api/tasks/${task._id}/move`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
      onReload(updated);
    } catch (err) { showToast(err.message); }
    setBusy(false);
  }

  async function toggleChecklist(item) {
    try {
      const { task: updated } = await api(`/api/tasks/${task._id}/checklist/${item._id}`, token, { method: 'PATCH', body: JSON.stringify({ done: !item.done }) });
      onReload(updated);
    } catch (err) { showToast(err.message); }
  }

  async function addChecklist(e) {
    e.preventDefault();
    if (!checkText.trim()) return;
    try {
      const { task: updated } = await api(`/api/tasks/${task._id}/checklist`, token, { method: 'POST', body: JSON.stringify({ text: checkText }) });
      onReload(updated);
      setCheckText('');
    } catch (err) { showToast(err.message); }
  }

  async function addComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { task: updated } = await api(`/api/tasks/${task._id}/comments`, token, { method: 'POST', body: JSON.stringify({ text: commentText }) });
      onReload(updated);
      setCommentText('');
    } catch (err) { showToast(err.message); }
  }

  async function removeTask() {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try {
      await api(`/api/tasks/${task._id}`, token, { method: 'DELETE' });
      onClose();
      onReload(null);
    } catch (err) { showToast(err.message); }
  }

  function startEdit() {
    setDraft({title: task.title, description: task.description || '', priority: task.priority, labels: (task.labels || []).join(', '), dueDate: task.dueDate ? task.dueDate.slice(0,10) : '', assignee: task.assignee?._id || task.assignee || ''});
    setEditing(true);
  }
  async function saveEdit(e) {
    e.preventDefault(); setBusy(true);
    try {
      const {task: updated} = await api(`/api/tasks/${task._id}`, token, {method:'PATCH',body:JSON.stringify({...draft, dueDate: draft.dueDate || null, assignee: draft.assignee || null})});
      onReload(updated); setEditing(false); showToast('Task updated');
    } catch(err) {showToast(err.message);} finally {setBusy(false);}
  }
  const total = task.checklist?.length || 0;
  const done = task.checklist?.filter((c) => c.done).length || 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" ref={closeRef} onClick={onClose} aria-label="Close task details">✕</button>
        <p className="eyebrow">TASK / DETAILS</p><span className={`priority pri-${task.priority}`}>{task.priority}</span>
        <h2>{task.title}</h2>
        <p>{task.description || 'No description.'}</p>
        {task.labels?.length > 0 && (
          <div className="labels">{task.labels.map((l) => <span key={l} className="label">{l}</span>)}</div>
        )}
        <div className="modal-row"><span className="muted">Assigned to {task.assignee?.name || 'Unassigned'}</span><button type="button" onClick={startEdit} disabled={editing}>Edit task ↗</button></div>
        {editing && <form className="edit-form" onSubmit={saveEdit}>
          <label>Title<input value={draft.title} required onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
          <label>Description<textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
          <label>Priority<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></label>
          <label>Labels<input value={draft.labels} onChange={e=>setDraft({...draft,labels:e.target.value})}/></label>
          <label>Due date<input type="date" value={draft.dueDate} onChange={e=>setDraft({...draft,dueDate:e.target.value})}/></label>
          <label>Assignee<select value={draft.assignee} onChange={e=>setDraft({...draft,assignee:e.target.value})}><option value="">Unassigned</option>{members.map(m=><option key={m._id || m} value={m._id || m}>{m.name || 'Member'}</option>)}</select></label>
          <div className="edit-actions"><button className="primary" disabled={busy} type="submit">Save changes</button><button type="button" onClick={()=>setEditing(false)}>Cancel</button></div>
        </form>}
        <div className="modal-row">
          <label htmlFor="modal-move">Move to</label>
          <select id="modal-move" value={task.status} disabled={busy} onChange={(e) => move(e.target.value)}>
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <h3>Checklist {total > 0 && <span className="check-count">{done}/{total}</span>}</h3>
        <ul className="checklist">
          {task.checklist?.map((item) => (
            <li key={item._id}>
              <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(item)} aria-label={item.text} />
              <span className={item.done ? 'done-item' : ''}>{item.text}</span>
            </li>
          ))}
          {total === 0 && <li className="muted">No checklist items yet.</li>}
        </ul>
        <form className="mini-form" onSubmit={addChecklist}>
          <input placeholder="Add checklist item…" value={checkText} onChange={(e) => setCheckText(e.target.value)} aria-label="New checklist item" />
          <button type="submit">Add</button>
        </form>
        <h3>Comments</h3>
        <ul className="comments">
          {task.comments?.map((c) => <li key={c._id}><strong>{c.author?.name}</strong>: {c.text}</li>)}
          {(!task.comments || task.comments.length === 0) && <li className="muted">No comments yet.</li>}
        </ul>
        <form className="mini-form" onSubmit={addComment}>
          <input placeholder="Write a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} aria-label="Write a comment" />
          <button type="submit">Post</button>
        </form>
        <CardChat key={`${task._id}-${userId}`} taskId={task._id} token={token} userId={userId}/>
        <button className="danger" onClick={removeTask}>Delete task</button>
      </div>
    </div>
  );
}
