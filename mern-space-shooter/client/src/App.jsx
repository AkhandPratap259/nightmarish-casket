import { useCallback, useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const W = 720;
const H = 540;
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function loadAuth() {
  try { return JSON.parse(localStorage.getItem('space-shooter-auth') || 'null'); } catch { return null; }
}

// ---------- Synthesized sound (Web Audio, no audio files) ----------
function createSound() {
  let ctx = null;
  let humOsc = null;
  let humGain = null;
  let muted = false;
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(freq, endFreq, dur, type, vol) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }
  return {
    setMuted(v) { muted = v; if (humGain) humGain.gain.value = v ? 0 : 0.02; },
    laser() { tone(880, 320, 0.12, 'square', 0.06); },
    explosion() { tone(220, 40, 0.35, 'sawtooth', 0.12); },
    powerup() { tone(520, 520, 0.09, 'sine', 0.1); setTimeout(() => tone(780, 780, 0.09, 'sine', 0.1), 80); },
    hit() { tone(160, 60, 0.3, 'triangle', 0.14); },
    startHum() {
      if (muted) return;
      const c = ensure(); if (!c || humOsc) return;
      humOsc = c.createOscillator(); humGain = c.createGain();
      humOsc.type = 'sine'; humOsc.frequency.value = 55; humGain.gain.value = 0.02;
      humOsc.connect(humGain); humGain.connect(c.destination); humOsc.start();
    },
    stopHum() { try { humOsc && humOsc.stop(); } catch {} humOsc = null; humGain = null; },
  };
}

function makeStars() {
  const stars = [];
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 40; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, layer, size: layer + 1 });
    }
  }
  return stars;
}

export default function App() {
  const canvasRef = useRef(null);
  const soundRef = useRef(null);
  if (!soundRef.current) soundRef.current = createSound();
  const [screen, setScreen] = useState('menu');
  const screenRef = useRef('menu');
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1, combo: 0, weapon: 'single', shield: false });
  const [muted, setMuted] = useState(false);
  const [auth, setAuth] = useState(loadAuth);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authMsg, setAuthMsg] = useState('');
  const [scores, setScores] = useState([]);
  const [scoresMsg, setScoresMsg] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const g = useRef(null);
  const keysRef = useRef({});
  const pointerRef = useRef({ active: false, x: W / 2, y: H - 80 });
  const firingRef = useRef(false);

  const setScreenBoth = (s) => { screenRef.current = s; setScreen(s); };

  const syncHud = useCallback(() => {
    const s = g.current; if (!s) return;
    setHud({ score: s.score, lives: s.player.lives, wave: s.wave, combo: s.combo, weapon: s.player.weapon, shield: s.player.shield });
  }, []);

  const loadScores = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/scores/top?limit=10`);
      const data = await r.json();
      setScores(Array.isArray(data) ? data : []);
    } catch { setScoresMsg('Leaderboard unavailable — is the server running on port 5000?'); }
  }, []);

  useEffect(() => { loadScores(); }, [loadScores]);
  useEffect(() => { if (auth?.user?.name) setPlayerName(auth.user.name); }, [auth]);

  function buildWave(n) {
    const queue = [];
    if (n % 5 === 0) {
      queue.push('boss');
      for (let i = 0; i < 4; i++) queue.push('drone');
      return queue;
    }
    const drones = 5 + n;
    const weavers = n >= 2 ? 2 + Math.floor(n / 2) : 0;
    const tanks = n >= 3 ? Math.floor(n / 3) : 0;
    for (let i = 0; i < drones; i++) queue.push('drone');
    for (let i = 0; i < weavers; i++) queue.push('weaver');
    for (let i = 0; i < tanks; i++) queue.push('tank');
    // Interleave so waves do not arrive as one type at a time.
    return queue.sort(() => Math.random() - 0.5);
  }

  function spawnEnemy(type, wave) {
    const base = {
      drone: { hp: 1, maxHp: 1, r: 14, speed: 65 + wave * 6, score: 100, color: '#22d3ee' },
      weaver: { hp: 2, maxHp: 2, r: 15, speed: 55 + wave * 5, score: 150, color: '#e879f9' },
      tank: { hp: 6, maxHp: 6, r: 24, speed: 32 + wave * 3, score: 300, color: '#fb923c' },
      boss: { hp: 40 + wave * 5, maxHp: 40 + wave * 5, r: 52, speed: 26, score: 2000, color: '#f43f5e' },
    }[type];
    const x = type === 'boss' ? W / 2 : 30 + Math.random() * (W - 60);
    return { ...base, type, x, y: type === 'boss' ? -60 : -30, baseX: x, t: Math.random() * 6, shootTimer: 2, phase: Math.random() * 6.28 };
  }

  function startGame() {
    soundRef.current.startHum();
    g.current = {
      player: { x: W / 2, y: H - 70, lives: 3, weapon: 'single', weaponUntil: 0, shield: false, fireCooldown: 0 },
      bullets: [], enemyBullets: [], enemies: [], particles: [], powerups: [],
      stars: makeStars(), score: 0, combo: 0, wave: 1, queue: buildWave(1),
      spawnTimer: 0.4, shake: 0, time: 0, over: false,
    };
    setSubmitted(false); setFinalScore(null); setScoresMsg('');
    setScreenBoth('playing');
    syncHud();
  }

  const endGame = useCallback(() => {
    const s = g.current; if (!s) return;
    s.over = true;
    soundRef.current.stopHum();
    setFinalScore({ score: s.score, wave: s.wave });
    setScreenBoth('gameover');
    loadScores();
  }, [loadScores]);

  const togglePause = useCallback(() => {
    if (screenRef.current === 'playing') { soundRef.current.stopHum(); setScreenBoth('paused'); }
    else if (screenRef.current === 'paused') { soundRef.current.startHum(); setScreenBoth('playing'); }
  }, []);

  // Keyboard controls (attached once).
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') { e.preventDefault(); firingRef.current = true; }
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') togglePause();
    };
    const up = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
      if (e.key === ' ') firingRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [togglePause]);

  // Main game loop — runs only while playing.
  useEffect(() => {
    if (screen !== 'playing') return undefined;
    const canvas = canvasRef.current; if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0; let last = performance.now();
    const step = (now) => {
      const s = g.current; if (!s) return;
      const dt = Math.min((now - last) / 1000, 0.05); last = now; s.time += dt;
      const p = s.player;
      // --- Player movement ---
      const speed = 320;
      if (keysRef.current.arrowleft || keysRef.current.a) p.x -= speed * dt;
      if (keysRef.current.arrowright || keysRef.current.d) p.x += speed * dt;
      if (keysRef.current.arrowup || keysRef.current.w) p.y -= speed * dt;
      if (keysRef.current.arrowdown || keysRef.current.s) p.y += speed * dt;
      if (pointerRef.current.active) { p.x = pointerRef.current.x; p.y = pointerRef.current.y; firingRef.current = true; }
      p.x = Math.max(20, Math.min(W - 20, p.x));
      p.y = Math.max(40, Math.min(H - 20, p.y));
      if (p.weapon !== 'single' && now > p.weaponUntil) { p.weapon = 'single'; syncHud(); }
      // --- Player fire ---
      p.fireCooldown -= dt * 1000;
      const rate = p.weapon === 'rapid' ? 90 : p.weapon === 'spread' ? 220 : 170;
      if (firingRef.current && p.fireCooldown <= 0) {
        p.fireCooldown = rate;
        soundRef.current.laser();
        const mk = (vx) => s.bullets.push({ x: p.x, y: p.y - 18, vx, vy: -460 });
        if (p.weapon === 'spread') { mk(-120); mk(0); mk(120); } else mk(0);
      }
      // --- Spawning ---
      if (s.queue.length > 0) {
        s.spawnTimer -= dt;
        if (s.spawnTimer <= 0) { s.enemies.push(spawnEnemy(s.queue.shift(), s.wave)); s.spawnTimer = 0.7; }
      } else if (s.enemies.length === 0) {
        s.wave += 1; s.queue = buildWave(s.wave); s.spawnTimer = 1.2; syncHud();
      }
      // --- Enemies ---
      for (const e of s.enemies) {
        e.t += dt;
        if (e.type === 'weaver') { e.y += e.speed * dt; e.x = e.baseX + Math.sin(e.t * 3 + e.phase) * 60; }
        else if (e.type === 'boss') {
          if (e.y < 90) e.y += e.speed * dt; else e.x = W / 2 + Math.sin(e.t * 0.9) * 220;
          e.shootTimer -= dt;
          if (e.shootTimer <= 0 && e.y > 0) {
            e.shootTimer = 1.2;
            for (const vx of [-90, 0, 90]) s.enemyBullets.push({ x: e.x, y: e.y + 40, vx, vy: 180 });
          }
        } else {
          e.y += e.speed * dt;
          if (e.type === 'tank') {
            e.shootTimer -= dt;
            if (e.shootTimer <= 0 && e.y > 0) { e.shootTimer = 2.6; s.enemyBullets.push({ x: e.x, y: e.y + 20, vx: 0, vy: 150 }); }
          }
        }
      }
      // --- Bullets ---
      for (const b of s.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
      for (const b of s.enemyBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
      s.bullets = s.bullets.filter((b) => b.y > -10 && b.x > -10 && b.x < W + 10);
      s.enemyBullets = s.enemyBullets.filter((b) => b.y < H + 10 && b.x > -10 && b.x < W + 10);
      s.enemies = s.enemies.filter((e) => e.y < H + 80);
      // --- Collisions: player bullets vs enemies ---
      for (const b of [...s.bullets]) {
        for (const e of [...s.enemies]) {
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) {
            b.dead = true; e.hp -= 1;
            if (e.hp <= 0) {
              e.dead = true; s.combo += 1;
              const mult = 1 + Math.floor(s.combo / 5) * 0.5;
              s.score += Math.round(e.score * mult);
              soundRef.current.explosion();
              const count = REDUCED ? 4 : 16;
              for (let i = 0; i < count; i++) s.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 240, vy: (Math.random() - 0.5) * 240, life: 0.5, color: e.color });
              if (Math.random() < 0.18) {
                const roll = Math.random();
                const kind = roll < 0.3 ? 'spread' : roll < 0.6 ? 'rapid' : roll < 0.92 ? 'shield' : 'life';
                s.powerups.push({ x: e.x, y: e.y, kind });
              }
              syncHud();
            }
          }
        }
      }
      s.bullets = s.bullets.filter((b) => !b.dead);
      s.enemies = s.enemies.filter((e) => !e.dead);
      // --- Player hit ---
      const hitPlayer = () => {
        if (p.shield) { p.shield = false; soundRef.current.hit(); syncHud(); return; }
        p.lives -= 1; s.combo = 0; s.shake = REDUCED ? 0 : 12; soundRef.current.hit();
        syncHud();
        if (p.lives <= 0) { endGame(); }
      };
      for (const b of s.enemyBullets) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < 18) { b.dead = true; hitPlayer(); }
      }
      s.enemyBullets = s.enemyBullets.filter((b) => !b.dead);
      for (const e of s.enemies) {
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 14) { e.dead = true; hitPlayer(); }
      }
      s.enemies = s.enemies.filter((e) => !e.dead);
      if (s.over) return;
      // --- Power-ups ---
      for (const pu of s.powerups) {
        pu.y += 70 * dt;
        if (Math.hypot(pu.x - p.x, pu.y - p.y) < 26) {
          pu.dead = true; soundRef.current.powerup();
          if (pu.kind === 'life') p.lives = Math.min(5, p.lives + 1);
          else if (pu.kind === 'shield') p.shield = true;
          else { p.weapon = pu.kind; p.weaponUntil = performance.now() + 10000; }
          syncHud();
        }
      }
      s.powerups = s.powerups.filter((pu) => !pu.dead && pu.y < H + 20);
      // --- Particles + stars ---
      for (const pt of s.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
      s.particles = s.particles.filter((pt) => pt.life > 0);
      for (const st of s.stars) { st.y += (20 + st.layer * 35) * dt; if (st.y > H) { st.y = 0; st.x = Math.random() * W; } }
      if (s.shake > 0) s.shake *= 0.88;
      // --- Draw ---
      ctx.save();
      if (s.shake > 0.5) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
      ctx.fillStyle = '#05010f'; ctx.fillRect(-20, -20, W + 40, H + 40);
      for (const st of s.stars) { ctx.fillStyle = st.layer === 2 ? '#a5f3fc' : '#818cf8'; ctx.globalAlpha = 0.4 + st.layer * 0.3; ctx.fillRect(st.x, st.y, st.size, st.size); }
      ctx.globalAlpha = 1;
      for (const pu of s.powerups) {
        ctx.shadowColor = '#facc15'; ctx.shadowBlur = 14; ctx.fillStyle = '#facc15';
        ctx.beginPath(); ctx.arc(pu.x, pu.y, 11, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#05010f'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(pu.kind === 'spread' ? 'S' : pu.kind === 'rapid' ? 'R' : pu.kind === 'shield' ? '◈' : '+', pu.x, pu.y + 4);
      }
      for (const e of s.enemies) {
        ctx.shadowColor = e.color; ctx.shadowBlur = 16; ctx.fillStyle = e.color;
        ctx.beginPath();
        if (e.type === 'boss') { ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); }
        else if (e.type === 'tank') { ctx.rect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2); }
        else { ctx.moveTo(e.x, e.y + e.r); ctx.lineTo(e.x - e.r, e.y - e.r); ctx.lineTo(e.x + e.r, e.y - e.r); ctx.closePath(); }
        ctx.fill(); ctx.shadowBlur = 0;
        if (e.maxHp > 1) {
          ctx.fillStyle = '#334155'; ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 5);
          ctx.fillStyle = '#22c55e'; ctx.fillRect(e.x - e.r, e.y - e.r - 10, (e.r * 2 * e.hp) / e.maxHp, 5);
        }
      }
      for (const b of s.bullets) { ctx.fillStyle = '#f0abfc'; ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 10; ctx.fillRect(b.x - 2, b.y - 8, 4, 16); ctx.shadowBlur = 0; }
      for (const b of s.enemyBullets) { ctx.fillStyle = '#fb7185'; ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill(); }
      for (const pt of s.particles) { ctx.globalAlpha = Math.max(pt.life * 2, 0); ctx.fillStyle = pt.color; ctx.fillRect(pt.x, pt.y, 3, 3); }
      ctx.globalAlpha = 1;
      // Player ship (canvas-drawn, no image files)
      ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 18; ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 18); ctx.lineTo(p.x - 14, p.y + 14); ctx.lineTo(p.x + 14, p.y + 14); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#f0abfc'; ctx.beginPath(); ctx.arc(p.x, p.y + 4, 4, 0, Math.PI * 2); ctx.fill();
      if (p.shield) { ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen, endGame, syncHud]);

  function canvasPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  }

  async function submitAuth(e) {
    e.preventDefault(); setAuthMsg('');
    const url = `${API}/api/auth/${authMode}`;
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(authForm) });
      const data = await r.json();
      if (!r.ok) { setAuthMsg(data.message || 'Authentication failed'); return; }
      const saved = { token: data.token, user: data.user };
      localStorage.setItem('space-shooter-auth', JSON.stringify(saved));
      setAuth(saved); setPlayerName(data.user.name); setAuthMsg(`${authMode === 'register' ? 'Registered' : 'Logged in'} as ${data.user.name}`);
    } catch { setAuthMsg('Could not reach the server — is it running on port 5000?'); }
  }

  function logout() { localStorage.removeItem('space-shooter-auth'); setAuth(null); }

  async function submitScore(e) {
    e.preventDefault();
    if (!finalScore) return;
    try {
      const r = await fetch(`${API}/api/scores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: playerName.trim(), score: finalScore.score, wave: finalScore.wave }) });
      const data = await r.json();
      if (!r.ok) { setScoresMsg(data.message || 'Score not saved'); return; }
      setSubmitted(true); loadScores();
    } catch { setScoresMsg('Could not reach the server to save the score.'); }
  }

  return (
    <div className="shell">
      <header className="top">
        <h1>NEON SPACE SHOOTER</h1>
        <p className="tag">A complete arcade shooter — waves, a boss every 5 waves, power-ups and a live leaderboard.</p>
        <div className="top-actions">
          <button onClick={() => { const v = !muted; setMuted(v); soundRef.current.setMuted(v); }}>{muted ? '🔇 Sound off' : '🔊 Sound on'}</button>
          {auth ? (<><span>Hi, {auth.user.name}</span><button onClick={logout}>Log out</button></>) : null}
        </div>
      </header>

      <main className="layout">
        <section className="game-col">
          {(screen === 'playing' || screen === 'paused') && (
            <div className="hud">
              <span>Score <b>{hud.score}</b></span>
              <span>Lives <b>{'♥'.repeat(Math.max(hud.lives, 0))}</b></span>
              <span>Wave <b>{hud.wave}</b></span>
              <span>Combo <b>×{hud.combo}</b></span>
              <span>Weapon <b>{hud.weapon}</b>{hud.shield ? ' + shield' : ''}</span>
              <button onClick={togglePause}>{screen === 'paused' ? 'Resume' : 'Pause'}</button>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="game-canvas"
            onPointerDown={(e) => { const p = canvasPos(e); pointerRef.current = { active: true, x: p.x, y: p.y }; firingRef.current = true; }}
            onPointerMove={(e) => { if (pointerRef.current.active) { const p = canvasPos(e); pointerRef.current = { active: true, x: p.x, y: p.y }; } }}
            onPointerUp={() => { pointerRef.current.active = false; firingRef.current = false; }}
            onPointerLeave={() => { pointerRef.current.active = false; firingRef.current = false; }}
          />
          {screen === 'menu' && (
            <div className="overlay">
              <h2>Ready to fly?</h2>
              <p>Move: Arrow keys / WASD / touch drag &nbsp;•&nbsp; Shoot: Space or click/touch (auto-fire on touch) &nbsp;•&nbsp; Pause: P or Esc</p>
              <p>Enemies: <span className="c-cyan">drone</span> (straight) • <span className="c-pink">weaver</span> (sine path) • <span className="c-orange">tank</span> (tough, shoots) • <span className="c-red">boss every 5 waves</span> (spread attack)</p>
              <p>Power-ups: <b>S</b> spread shot • <b>R</b> rapid fire • <b>◈</b> shield • <b>+</b> extra life (rare). Chain kills for a combo bonus — taking a hit resets it.</p>
              <button className="primary" onClick={startGame}>▶ Start game</button>
              <p className="hint">Guest play works without logging in. Log in below only if you want your name saved for scores.</p>
            </div>
          )}
          {screen === 'paused' && (
            <div className="overlay">
              <h2>Paused</h2>
              <button className="primary" onClick={togglePause}>Resume</button>
              <button onClick={startGame}>Restart</button>
            </div>
          )}
          {screen === 'gameover' && finalScore && (
            <div className="overlay">
              <h2>Game over</h2>
              <p>Final score: <b>{finalScore.score}</b> &nbsp;•&nbsp; Reached wave <b>{finalScore.wave}</b></p>
              {submitted ? <p className="ok">Score saved to the leaderboard.</p> : (
                <form onSubmit={submitScore} className="row">
                  <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name for the leaderboard" maxLength={30} required />
                  <button className="primary" type="submit">Save score</button>
                </form>
              )}
              {scoresMsg && <p className="err">{scoresMsg}</p>}
              <button className="primary" onClick={startGame}>Play again</button>
            </div>
          )}
        </section>

        <aside className="side">
          <section className="card">
            <h3>{auth ? 'Account' : 'Log in / Register (optional)'}</h3>
            {auth ? (
              <p>Logged in as <b>{auth.user.name}</b> ({auth.user.email}). Your name is prefilled when you save a score.</p>
            ) : (
              <form onSubmit={submitAuth} className="stack">
                <div className="tabs">
                  <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Log in</button>
                  <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
                </div>
                {authMode === 'register' && <input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Name" required />}
                <input value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="Email" type="email" required />
                <input value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="Password (min 6 characters)" type="password" required />
                <button className="primary" type="submit">{authMode === 'register' ? 'Register' : 'Log in'}</button>
                {authMsg && <p className="msg">{authMsg}</p>}
              </form>
            )}
          </section>
          <section className="card">
            <h3>🏆 Leaderboard — Top 10</h3>
            {scores.length === 0 ? (
              <p className="empty">No scores yet — be the first pilot on the board.</p>
            ) : (
              <ol className="scores">
                {scores.map((s) => (
                  <li key={s._id}><span>{s.player}</span><span>Wave {s.wave}</span><b>{s.score}</b></li>
                ))}
              </ol>
            )}
            {scoresMsg && <p className="err">{scoresMsg}</p>}
            <button onClick={loadScores}>Refresh</button>
          </section>
          <section className="card">
            <h3>How to run it</h3>
            <p>Server: <code>cd server && npm install && npm run dev</code><br />Client: <code>cd client && npm install && npm run dev</code><br />Open <code>http://localhost:5173</code></p>
          </section>
        </aside>
      </main>
      <footer>Neon Space Shooter — React + Canvas 2D + Express + MongoDB. All ships and sounds are drawn / synthesized in code; no image or audio files.</footer>
    </div>
  );
}
