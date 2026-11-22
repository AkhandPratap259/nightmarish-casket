import { useRef, useState } from 'react';

// Hold-to-confirm (D16): press and hold for `holdMs`; a stepped fill bar
// grows inside the button and the confirm fires only on a full hold.
// Pointer, touch and keyboard (hold Enter or Space) all work. Releasing
// early cancels. No onClick — a stray click event can never confirm.
export default function HoldButton({
  children,
  onConfirm,
  holdMs = 900,
  disabled = false,
  className = '',
  label,
  hint,
}) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const timer = useRef(null);
  const startAt = useRef(0);
  const fired = useRef(false);

  function stop() {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    setHolding(false);
    setProgress(0);
  }

  function start(e) {
    if (disabled || holding) return;
    if (e && e.button !== undefined && e.button !== 0) return;
    if (e && e.preventDefault) e.preventDefault();
    fired.current = false;
    startAt.current = Date.now();
    setHolding(true);
    // Stepped fill: 9 jumps over the hold time (mechanical stepped, F4).
    timer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - startAt.current) / holdMs);
      setProgress(Math.floor(p * 9) / 9);
      if (p >= 1 && !fired.current) {
        fired.current = true;
        window.clearInterval(timer.current);
        timer.current = null;
        setHolding(false);
        setProgress(0);
        onConfirm();
      }
    }, Math.max(30, holdMs / 9));
  }

  function onKeyDown(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.repeat) return;
    start(e);
  }

  function onKeyUp(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // A keyup click event would otherwise fire on Space; there is no
    // onClick handler, so stopping here just cancels the hold.
    e.preventDefault();
    if (!fired.current) stop();
  }

  return (
    <>
      <button
        type="button"
        className={`btn hold-btn ${holding ? 'is-holding' : ''} ${className}`}
        disabled={disabled}
        onPointerDown={start}
        onPointerUp={() => {
          if (!fired.current) stop();
        }}
        onPointerLeave={() => {
          if (!fired.current) stop();
        }}
        onPointerCancel={() => {
          if (!fired.current) stop();
        }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={label || (typeof children === 'string' ? children : 'Hold to confirm')}
        aria-describedby={hint ? 'hold-hint' : undefined}
      >
        <span className="hold-fill" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
        {holding ? 'Keep holding…' : children}
      </button>
      {hint ? (
        <span className="hold-hint" id="hold-hint">
          {hint}
        </span>
      ) : null}
    </>
  );
}
