import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = async (path, token, opts = {}) => {
  const res = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const Avatar = ({ user, size = 40 }) => (
  <span className="avatar" style={{ width: size, height: size, background: user?.color || '#e4572e' }}>{(user?.name || '?')[0]}</span>
);
const timeAgo = (d) => {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return m + 'm';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h'; return Math.floor(h / 24) + 'd';
};

function PostCard({ post, token, onLike, onOpenProfile, onDelete, me }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState('');
  const [burst, setBurst] = useState(0);
  const loadComments = async () => {
    if (!showComments) setComments(await api('/posts/' + post._id + '/comments', token));
    setShowComments(!showComments);
  };
  const sendComment = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const c = await api('/posts/' + post._id + '/comments', token, { method: 'POST', body: JSON.stringify({ text: draft }) });
    setComments([...comments, c]); setDraft('');
  };
  return (
    <article className="post-card reveal">
      <div className="post-head">
        <button className="bare row" onClick={() => onOpenProfile(post.author._id)}><Avatar user={post.author} /><span><b>{post.author.name}</b><small>{timeAgo(post.createdAt)}</small></span></button>
        {me && String(post.author._id) === String(me._id) && <button className="text-btn danger" onClick={() => onDelete(post._id)}>Delete</button>}
      </div>
      <p className="post-text">{post.text}</p>
      <div className="tags">{post.tags.map((t) => <span key={t}>#{t}</span>)}</div>
      {post.breakdown && <p className="score-line">Feed score {post.score} — {post.breakdown.likes} likes × 3, {post.breakdown.comments} comments × 5, freshness {post.breakdown.decay}{post.breakdown.affinity ? ', +20 you follow them' : ''}</p>}
      <div className="post-actions">
        <button className={post.likedByMe ? 'like-btn liked' : 'like-btn'} key={burst} onClick={() => { if (!post.likedByMe) setBurst(burst + 1); onLike(post._id); }}>
          <span className="heart">{post.likedByMe ? '♥' : '♡'}</span> {post.likeCount}
        </button>
        <button className="action-btn" onClick={loadComments}>💬 {post.commentCount} {showComments ? 'Hide' : 'Comments'}</button>
      </div>
      {showComments && (
        <div className="comments drawer">
          {comments.map((c) => <div className="comment" key={c._id}><Avatar user={c.author} size={28} /><span><b>{c.author.name}</b> {c.text}</span></div>)}
          <form onSubmit={sendComment} className="comment-form"><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment…" maxLength={300} /><button>Reply</button></form>
        </div>
      )}
    </article>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('orbit-token') || '');
  const [me, setMe] = useState(null);
  const [view, setView] = useState('feed');
  const [tab, setTab] = useState('foryou');
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showBell, setShowBell] = useState(false);
  const [composer, setComposer] = useState('');
  const [composerFocus, setComposerFocus] = useState(false);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', bio: '' });
  const [authMode, setAuthMode] = useState('login');
  const [error, setError] = useState('');
  const socketRef = useRef(null);

  const loadFeed = useCallback(async () => {
    if (!token) return;
    setPosts(await api('/feed?tab=' + tab, token));
    setTrending(await api('/feed/trending', token));
    setSuggestions(await api('/users/suggestions', token));
    setNotifications(await api('/notifications', token));
  }, [token, tab]);
  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Reveal-on-scroll: cards fade and rise in as they enter the viewport.
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } }), { threshold: 0.1 });
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [posts, view]);

  // Live notifications + new posts over Socket.io.
  useEffect(() => {
    if (!token || !me) return;
    const socket = io(API.replace('/api', ''), { query: { userId: me._id } });
    socketRef.current = socket;
    socket.on('notification', (n) => setNotifications((prev) => [{ ...n, actor: n.actor }, ...prev]));
    socket.on('post:new', () => loadFeed());
    return () => socket.disconnect();
  }, [token, me, loadFeed]);

  useEffect(() => { if (token) api('/auth/me', token).then(setMe).catch(() => { setToken(''); localStorage.removeItem('orbit-token'); }); }, [token]);

  const submitAuth = async (e) => {
    e.preventDefault(); setError('');
    try {
      const data = await api('/auth/' + authMode, null, { method: 'POST', body: JSON.stringify(authForm) });
      setToken(data.token); localStorage.setItem('orbit-token', data.token); setMe(data.user);
    } catch (err) { setError(err.message); }
  };
  const publish = async (e) => {
    e.preventDefault(); if (!composer.trim()) return;
    await api('/posts', token, { method: 'POST', body: JSON.stringify({ text: composer }) });
    setComposer(''); loadFeed();
  };
  const toggleLike = async (id) => {
    await api('/posts/' + id + '/like', token, { method: 'POST' }); loadFeed();
  };
  const openProfile = async (id) => { setProfile(await api('/users/' + id, token)); setView('profile'); };
  const toggleFollow = async (id) => {
    await api('/users/' + id + '/follow', token, { method: 'POST' });
    if (view === 'profile') setProfile(await api('/users/' + id, token)); else loadFeed();
  };
  const runSearch = async (e) => { e.preventDefault(); setSearchResults(await api('/users/search?q=' + encodeURIComponent(search), token)); };
  const unread = notifications.filter((n) => !n.read).length;

  if (!token || !me) return (
    <div className="auth-wrap">
      <header className="masthead"><h1>ORBIT</h1><p>A social app that shows its maths.</p></header>
      <main className="auth-card">
        <h2>{authMode === 'login' ? 'Welcome back' : 'Join the orbit'}</h2>
        <p className="muted">Posts are ranked by a visible score — likes, comments, freshness and who you follow — never a black box.</p>
        <form onSubmit={submitAuth}>
          {authMode === 'register' && <input placeholder="Your name" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />}
          <input placeholder="Email" type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
          <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} required />
          {authMode === 'register' && <input placeholder="Bio (optional)" value={authForm.bio} onChange={(e) => setAuthForm({ ...authForm, bio: e.target.value })} />}
          {error && <p className="error">{error}</p>}
          <button className="primary">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <p className="muted">Demo account: demo@orbit.example / Orbit123!</p>
        <button className="text-btn" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>{authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}</button>
      </main>
    </div>
  );

  return (
    <div className="layout">
      <header className="masthead"><h1 onClick={() => setView('feed')}>ORBIT</h1><p>Every post shows why it ranks where it does.</p></header>
      {trending.length > 0 && <div className="ticker"><div className="ticker-track">{[...trending, ...trending].map((t, i) => <span key={i}>#{t.tag} · {t.score} ✦ </span>)}</div></div>}
      <div className="columns">
        <nav className="rail left-rail">
          <button className={view === 'feed' ? 'nav-btn active' : 'nav-btn'} onClick={() => setView('feed')}>📰 Feed</button>
          <button className={view === 'explore' ? 'nav-btn active' : 'nav-btn'} onClick={() => setView('explore')}>🧭 Explore</button>
          <button className={view === 'profile' ? 'nav-btn active' : 'nav-btn'} onClick={() => openProfile(me._id)}>👤 My profile</button>
          <div className="me-card"><Avatar user={me} size={48} /><b>{me.name}</b><small>{me.followersCount} followers · {me.followingCount} following</small></div>
          <button className="text-btn" onClick={() => { setToken(''); setMe(null); localStorage.removeItem('orbit-token'); }}>Sign out</button>
        </nav>
        <main className="feed-col">
          {view === 'feed' && <>
            <div className="bell-row">
              <h2>Your feed</h2>
              <button className="bell" onClick={async () => { setShowBell(!showBell); if (!showBell && unread) { await api('/notifications/read', token, { method: 'POST' }); loadFeed(); } }}>🔔 {unread > 0 && <span className="badge">{unread}</span>}</button>
            </div>
            {showBell && <div className="notif-panel">{notifications.length === 0 ? <p className="muted">No notifications yet.</p> : notifications.map((n) => <p key={n._id}><b>{n.actor?.name || 'Someone'}</b> {n.type === 'like' ? 'liked your post' : n.type === 'comment' ? 'commented on your post' : 'started following you'}{n.post ? ': "' + n.post.text.slice(0, 60) + '"' : ''}</p>)}</div>}
            <div className="tabs">
              {[['foryou', 'For You'], ['following', 'Following'], ['trending', 'Most active']].map(([key, label]) => (
                <button key={key} className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)}>{label}</button>
              ))}
            </div>
            <form onSubmit={publish} className={composerFocus ? 'composer focused' : 'composer'}>
              <Avatar user={me} />
              <textarea value={composer} onFocus={() => setComposerFocus(true)} onBlur={() => setComposerFocus(false)} onChange={(e) => setComposer(e.target.value)} placeholder="What is on your mind? Use #hashtags…" maxLength={500} rows={composerFocus ? 4 : 2} />
              <button className="primary" disabled={!composer.trim()}>Post</button>
            </form>
            {posts.length === 0 ? <p className="muted">Nothing here yet — follow people in Explore, or be the first to post.</p> :
              posts.map((p) => <PostCard key={p._id} post={p} token={token} onLike={toggleLike} onOpenProfile={openProfile} me={me} onDelete={async (id) => { await api('/posts/' + id, token, { method: 'DELETE' }); loadFeed(); }} />)}
          </>}
          {view === 'explore' && <>
            <h2>Explore</h2>
            <form onSubmit={runSearch} className="search-row"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people by name…" /><button className="primary">Search</button></form>
            {searchResults.map((u) => <div className="person-row" key={u._id}><Avatar user={u} /><span><b>{u.name}</b><small>{u.bio}</small></span><button className="primary small" onClick={() => openProfile(u._id)}>View</button></div>)}
            <h3>People to follow</h3>
            {suggestions.map((u) => <div className="person-row" key={u._id}><Avatar user={u} /><span><b>{u.name}</b><small>{u.bio} · {u.followersCount} followers</small></span><button className="primary small" onClick={() => toggleFollow(u._id)}>Follow</button></div>)}
          </>}
          {view === 'profile' && profile && <>
            <div className="profile-head"><Avatar user={profile} size={72} /><div><h2>{profile.name}</h2><p>{profile.bio}</p><p className="muted">{profile.followersCount} followers · {profile.followingCount} following</p></div>
              {String(profile._id) !== String(me._id) && <button className="primary" onClick={() => toggleFollow(profile._id)}>{profile.followedByMe ? 'Unfollow' : 'Follow'}</button>}</div>
            {profile.posts.map((p) => <PostCard key={p._id} post={p} token={token} onLike={toggleLike} onOpenProfile={openProfile} me={me} onDelete={async (id) => { await api('/posts/' + id, token, { method: 'DELETE' }); setProfile(await api('/users/' + profile._id, token)); }} />)}
          </>}
        </main>
        <aside className="rail right-rail">
          <h3>Trending this week</h3>
          {trending.map((t, i) => <div className="trend-row" key={t.tag}><span className="trend-rank">{i + 1}</span><span><b>#{t.tag}</b><small>heat {t.score}</small></span><span className="trend-bar" style={{ width: Math.min(100, t.score * 12) + '%' }} /></div>)}
          <h3>How the feed ranks</h3>
          <p className="muted small">Score = (likes × 3 + comments × 5) × freshness decay + 20 if you follow the author. Fresh posts outrank old ones; following someone always lifts them. The maths is printed under every post.</p>
        </aside>
      </div>
    </div>
  );
}
