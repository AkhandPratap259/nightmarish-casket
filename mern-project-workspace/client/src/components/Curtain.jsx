// E1 curtain wipe (FundForge): two panels sweep down to cover the screen,
// the view swaps underneath, then they sweep away. The parent drives the
// phase: idle | closing | opening. Instant when motion is off.
export default function Curtain({ phase }) {
  return (
    <div className={`curtain${phase === 'closing' ? ' is-closing' : phase === 'opening' ? ' is-opening' : ''}`} aria-hidden="true">
      <div className="curtain-panel curtain-panel-b" />
      <div className="curtain-panel curtain-panel-a" />
      <span className="curtain-mark">FlowBoard ✦</span>
    </div>
  );
}
