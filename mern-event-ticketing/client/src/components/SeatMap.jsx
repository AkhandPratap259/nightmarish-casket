import { useMemo } from 'react';
import { inr } from '../api';

// Interactive SVG seat map. Rows run front (VIP, nearest the stage) to
// back (Standard). Seats are keyboard-focusable buttons with full labels;
// state comes from the server (available / held / booked) plus the
// caller's current selection.
const SEAT = 26;
const GAP = 8;
const LABEL_W = 64;

function describe(seat, selected) {
  if (selected) return 'selected';
  if (seat.state === 'booked') return 'booked';
  if (seat.state === 'held') return seat.mine ? 'held by you' : 'held by someone else';
  return 'available';
}

export default function SeatMap({ event, seats, selected = [], onToggle, interactive = true }) {
  const zones = useMemo(() => {
    if (!event?.zones) return [];
    const bySeat = new Map((seats || []).map((s) => [s.id, s]));
    return event.zones.map((zone) => ({
      ...zone,
      rows: zone.rows.map((row) => ({
        ...row,
        seats: Array.from({ length: row.count }, (_, i) => {
          const id = `${row.label}${i + 1}`;
          return bySeat.get(id) || { id, zone: zone.name, price: zone.price, row: row.label, number: i + 1, state: 'available', mine: false };
        }),
      })),
    }));
  }, [event, seats]);

  const maxSeats = Math.max(1, ...zones.flatMap((z) => z.rows.map((r) => r.count)));
  const width = LABEL_W + maxSeats * (SEAT + GAP) + 16;
  let y = 56; // below the stage bar
  const zoneBlocks = zones.map((zone) => {
    const startY = y;
    const rows = zone.rows.map((row) => {
      const rowY = y;
      y += SEAT + GAP;
      return { ...row, y: rowY };
    });
    y += 18; // gap between zones
    return { ...zone, rows, startY, endY: y - 18 };
  });
  const height = y + 8;

  if (!event) return <p className="muted">No event selected.</p>;

  return (
    <div className="seatmap-wrap">
      <svg
        className="seatmap"
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={`Seat map for ${event.title}. ${seats?.filter((s) => s.state === 'available').length ?? 0} seats available.`}
      >
        <g>
          <rect x={LABEL_W} y={8} width={width - LABEL_W - 16} height={30} rx={4} className="stage" />
          <text x={width / 2 + LABEL_W / 2} y={28} textAnchor="middle" className="stage-label">
            STAGE
          </text>
        </g>
        {zoneBlocks.map((zone) => (
          <g key={zone.name}>
            <text x={8} y={zone.startY + (zone.endY - zone.startY) / 2} className="zone-label" dominantBaseline="middle">
              {zone.name}
            </text>
            <text
              x={8}
              y={zone.startY + (zone.endY - zone.startY) / 2 + 16}
              className="zone-price"
              dominantBaseline="middle"
            >
              {inr(zone.price)}
            </text>
            {zone.rows.map((row) => {
              const rowWidth = row.count * (SEAT + GAP) - GAP;
              const startX = LABEL_W + (width - LABEL_W - 16 - rowWidth) / 2;
              return (
                <g key={row.label}>
                  <text x={startX - 12} y={row.y + SEAT / 2} textAnchor="end" dominantBaseline="middle" className="row-label">
                    {row.label}
                  </text>
                  {row.seats.map((seat, i) => {
                    const isSelected = selected.includes(seat.id);
                    const cls = isSelected
                      ? 'seat seat-selected'
                      : seat.state === 'booked'
                        ? 'seat seat-booked'
                        : seat.state === 'held'
                          ? seat.mine
                            ? 'seat seat-held-mine'
                            : 'seat seat-held'
                          : 'seat seat-available';
                    const x = startX + i * (SEAT + GAP);
                    const label = `Seat ${seat.id}, ${seat.zone}, ${inr(seat.price)}, ${describe(seat, isSelected)}`;
                    const common = {
                      className: cls,
                      'aria-label': label,
                    };
                    if (!interactive) {
                      return (
                        <g key={seat.id} {...common}>
                          <rect x={x} y={row.y} width={SEAT} height={SEAT} rx={6} />
                          <title>{label}</title>
                        </g>
                      );
                    }
                    const clickable = seat.state === 'available' || (seat.state === 'held' && seat.mine);
                    return (
                      <g
                        key={seat.id}
                        {...common}
                        role={clickable ? 'button' : undefined}
                        tabIndex={clickable ? 0 : -1}
                        aria-disabled={!clickable}
                        onClick={() => clickable && onToggle && onToggle(seat)}
                        onKeyDown={(e) => {
                          if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onToggle && onToggle(seat);
                          }
                        }}
                      >
                        <rect x={x} y={row.y} width={SEAT} height={SEAT} rx={6} />
                        <title>{label}</title>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      <ul className="seat-legend" aria-label="Seat legend">
        <li><span className="swatch seat-available" aria-hidden="true" /> Available</li>
        <li><span className="swatch seat-selected" aria-hidden="true" /> Selected</li>
        <li><span className="swatch seat-held" aria-hidden="true" /> Held</li>
        <li><span className="swatch seat-held-mine" aria-hidden="true" /> Your hold</li>
        <li><span className="swatch seat-booked" aria-hidden="true" /> Booked</li>
      </ul>
    </div>
  );
}
