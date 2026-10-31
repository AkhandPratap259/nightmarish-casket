import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function api(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('chatwave-token') || '');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [onlineIds, setOnlineIds] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [draft, setDraft] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  async function loadRooms(currentToken) {
    const data = await api('/api/rooms', currentToken);
    setRooms(data);
    if (!activeRoom && data.length > 0) setActiveRoom(data[0]);
    return data;
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await api('/api/auth/me', token);
        if (cancelled) return;
        setUser(me);
        await loadRooms(token);
        const allUsers = await api('/api/users', token);
        if (!cancelled) setUsers(allUsers);
      } catch (err) {
        setToken('');
        localStorage.removeItem('chatwave-token');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    const socket = io(API, { auth: { token } });
    socketRef.current = socket;
    socket.on('presence', (ids) => setOnlineIds(ids));
    socket.on('message:new', (message) => {
      if (activeRoom && String(message.room) === String(activeRoom._id)) {
        setMessages((prev) => [...prev, message]);
      }
    });
    socket.on('typing', ({ user: typingUser, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) return prev.includes(typingUser) ? prev : [...prev, typingUser];
        return prev.filter((name) => name !== typingUser);
      });
    });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token, user, activeRoom]);

  useEffect(() => {
    if (!token || !activeRoom) return;
    let cancelled = false;
    (async () => {
      const history = await api(`/api/rooms/${activeRoom._id}/messages`, token);
      if (!cancelled) setMessages(history);
      if (socketRef.current) socketRef.current.emit('room:join', activeRoom._id);
    })();
    return () => {
      cancelled = true;
      if (socketRef.current) socketRef.current.emit('room:leave', activeRoom._id);
    };
  }, [token, activeRoom]);

  async function handleAuth(event) {
    event.preventDefault();
    setAuthError('');
    try {
      const path = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const data = await api(path, null, { method: 'POST', body: JSON.stringify(authForm) });
      localStorage.setItem('chatwave-token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim() || !activeRoom) return;
    socketRef.current?.emit('message:send', { roomId: activeRoom._id, text: draft });
    socketRef.current?.emit('typing', { roomId: activeRoom._id, isTyping: false });
    setDraft('');
  }

  function handleTyping(value) {
    setDraft(value);
    if (activeRoom) socketRef.current?.emit('typing', { roomId: activeRoom._id, isTyping: value.length > 0 });
  }

  async function createRoom(event) {
    event.preventDefault();
    if (!newRoom.trim()) return;
    const room = await api('/api/rooms', token, { method: 'POST', body: JSON.stringify({ name: newRoom.trim() }) });
    setRooms((prev) => [...prev, room]);
    setActiveRoom(room);
    setNewRoom('');
  }

  function logout() {
    localStorage.removeItem('chatwave-token');
    setToken('');
    setUser(null);
    setRooms([]);
    setMessages([]);
  }

  if (!token || !user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>ChatWave</h1>
          <p>Real-time rooms, live typing and online presence — built on the MERN stack with Socket.io.</p>
          <div className="tabs">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Log in</button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
          </div>
          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <input placeholder="Your name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />
            )}
            <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
            {authError && <p className="error">{authError}</p>}
            <button className="primary" type="submit">{authMode === 'register' ? 'Create account' : 'Log in'}</button>
          </form>
          <p className="hint">Seeded rooms: general, mern-devs, random. Register once, then open a second browser window and log in as another user to see messages arrive live.</p>
        </section>
      </main>
    );
  }

  const userById = Object.fromEntries(users.map((u) => [String(u._id), u.name]));

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>ChatWave</h1>
        <p className="me">Signed in as <strong>{user.name}</strong> <button onClick={logout}>Log out</button></p>
        <h2>Rooms</h2>
        <ul className="room-list">
          {rooms.map((room) => (
            <li key={room._id}>
              <button className={activeRoom?._id === room._id ? 'active' : ''} onClick={() => setActiveRoom(room)}>
                # {room.name}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={createRoom} className="new-room">
          <input placeholder="New room name" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} />
          <button type="submit">Create</button>
        </form>
        <h2>Online ({onlineIds.length})</h2>
        <ul className="online-list">
          {onlineIds.map((id) => (
            <li key={id}><span className="dot" /> {userById[id] || 'Someone'}</li>
          ))}
        </ul>
      </aside>
      <main className="chat">
        {activeRoom ? (
          <>
            <header>
              <h2># {activeRoom.name}</h2>
              <p>{activeRoom.description}</p>
            </header>
            <div className="messages">
              {messages.map((message) => (
                <div key={message._id} className={`message ${message.sender?._id === user.id || message.sender?.id === user.id ? 'own' : ''}`}>
                  <strong>{message.sender?.name || 'Someone'}</strong>
                  <span>{message.text}</span>
                  <time>{new Date(message.createdAt).toLocaleTimeString()}</time>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {typingUsers.length > 0 && <p className="typing">{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…</p>}
            <form onSubmit={sendMessage} className="composer">
              <input placeholder={`Message #${activeRoom.name}`} value={draft} onChange={(e) => handleTyping(e.target.value)} />
              <button className="primary" type="submit">Send</button>
            </form>
          </>
        ) : (
          <p className="empty">Pick a room to start chatting.</p>
        )}
      </main>
    </div>
  );
}
