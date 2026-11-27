import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

const MAX_BYTES = 8 * 1024 * 1024;
const authHeaders = token => ({ Authorization: `Bearer ${token}` });
const asBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
  reader.onabort = () => reject(new Error('File reading cancelled'));
  reader.readAsDataURL(file);
});
const fileSize = n => n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.ceil(n / 1024))} KB`;
function LinkedText({ text }) {
  return text.split(/(https?:\/\/[^\s<>"']+)/gi).map((part, i) => /^https?:\/\//i.test(part)
    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : part);
}

export default function CardChat({ taskId, token, userId }) {
  const endpoint = `/api/tasks/${taskId}/chat`;
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [postError, setPostError] = useState('');
  const [text, setText] = useState('');
  const [kind, setKind] = useState('message');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [denied, setDenied] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const picker = useRef(null);
  const history = useRef(null);
  const follow = useRef(true);
  const generation = useRef(0);
  const accessDenied = useRef(false);
  const sendLock = useRef(false);

  useEffect(() => {
    let active = true, timer, controller;
    async function refresh() {
      controller = new AbortController();
      const startedAt = generation.current;
      try {
        const res = await fetch(endpoint, { headers: authHeaders(token), signal: controller.signal, cache: 'no-store' });
        const data = await res.json();
        if (!active) return;
        if ([401, 403, 404].includes(res.status)) {
          accessDenied.current = true;
          generation.current++;
          setDenied(true); setMessages([]); setLoaded(true);
          setSyncError(data.error || 'Card chat is not accessible');
          return;
        }
        if (!res.ok) throw new Error(data.error || 'Unable to load chat');
        // A poll started before a successful post must not erase that post.
        if (startedAt === generation.current) setMessages(data.messages);
        setLoaded(true); setSyncError('');
      } catch (err) {
        if (active && err.name !== 'AbortError') setSyncError('Could not sync chat. Retrying automatically.');
      } finally {
        if (active && !accessDenied.current) timer = setTimeout(refresh, 3000);
      }
    }
    refresh();
    return () => { active = false; clearTimeout(timer); controller?.abort(); };
  }, [endpoint, token]);

  useEffect(() => {
    if (follow.current && history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [messages, loaded]);

  function chooseFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    const next = [...files, ...picked];
    if (next.length > 5 || next.reduce((sum, f) => sum + f.size, 0) > MAX_BYTES) {
      setPostError('Attach up to 5 files, 8 MB total per post.'); return;
    }
    if (next.some(f => !f.size || f.name.length > 255)) { setPostError('Empty files or filenames over 255 characters are not supported.'); return; }
    setFiles(next); setPostError('');
  }

  async function send(e) {
    e.preventDefault();
    if (sendLock.current || accessDenied.current || (!text.trim() && !files.length)) return;
    sendLock.current = true; setSending(true); setPostError('');
    try {
      const attachments = await Promise.all(files.map(async f => ({ name: f.name, data: await asBase64(f) })));
      const { message } = await api(endpoint, token, { method: 'POST', body: JSON.stringify({ text, kind, attachments }) });
      if (accessDenied.current) return;
      generation.current++;
      follow.current = true;
      setMessages(old => [...old.filter(m => m._id !== message._id), message].sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a._id.localeCompare(b._id)));
      setText(''); setFiles([]); setKind('message'); setLoaded(true);
    } catch (err) { setPostError(err.message); }
    finally { sendLock.current = false; setSending(false); }
  }

  async function download(message, file) {
    setDownloading(file._id); setPostError('');
    try {
      const res = await fetch(`${endpoint}/${message._id}/files/${file._id}`, { headers: authHeaders(token), cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Unable to download file');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setPostError(err.message); }
    finally { setDownloading(null); }
  }

  return <section className="card-chat" aria-label="Card group chat">
    <h3>Card group chat <span className="chat-count">{messages.length}</span></h3>
    <p className="chat-note">Shared with every project member · Saved in this card</p>
    <div className="chat-sync" role="status">{syncError || (loaded ? 'Synced · refreshes every 3 seconds' : 'Loading conversation…')}</div>
    <div ref={history} className="chat-history" role="log" aria-label="Chat history" aria-live="polite" onScroll={e => { const el = e.currentTarget; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {loaded && !messages.length && !denied && <p className="chat-empty">No messages yet. Share a progress update or a file to start this card’s conversation.</p>}
      {messages.map(m => <article key={m._id} className={`chat-message${String(m.author) === String(userId) ? ' chat-own' : ''}`}>
        <header><strong>{m.authorName}{String(m.author) === String(userId) ? ' (you)' : ''}</strong><time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString()}</time></header>
        {m.kind === 'work' && <span className="chat-work-label">WORK UPDATE</span>}
        {m.text && <div className="chat-text"><LinkedText text={m.text}/></div>}
        {!!m.attachments?.length && <div className="chat-files">{m.attachments.map(f => <button type="button" className="chat-file" key={f._id} disabled={downloading !== null} onClick={() => download(m, f)} aria-label={`Download ${f.name}`}><span><strong>{f.name}</strong><small>{fileSize(f.size)}</small></span><span>{downloading === f._id ? '…' : '↓'}</span></button>)}</div>}
      </article>)}
    </div>
    {!denied && <form className="chat-composer" onSubmit={send}>
      <label className="chat-kind">Post as <select value={kind} disabled={sending} onChange={e => setKind(e.target.value)}><option value="message">Message</option><option value="work">Work update</option></select></label>
      <textarea aria-label="Message or work update" placeholder="Write a message, share a link or post your work…" rows={3} maxLength={12000} value={text} disabled={sending} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }}/>
      {files.length > 0 && <ul className="chat-pending">{files.map((f,i) => <li key={`${i}-${f.name}`}><span>{f.name} · {fileSize(f.size)}</span><button type="button" disabled={sending} aria-label={`Remove ${f.name}`} onClick={() => setFiles(old => old.filter((_,n) => n !== i))}>×</button></li>)}</ul>}
      <input type="file" ref={picker} multiple hidden onChange={chooseFiles}/>
      <div className="chat-actions"><button type="button" disabled={sending} onClick={() => picker.current?.click()}>＋ Attach files</button><button type="submit" className="primary" disabled={sending || (!text.trim() && !files.length)}>{sending ? 'Sending…' : 'Send →'}</button></div>
      <small className="chat-note">Up to 5 files / 8 MB total per post.</small>
    </form>}
    {postError && <p className="chat-error" role="alert">{postError}</p>}
  </section>;
}
