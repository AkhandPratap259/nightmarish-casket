// Server-side price breakdown. The client never sends a price: it sends an
// offering, a date and a slot, and the server computes every rupee.
//
//   base            the offering's own price
//   peak surcharge  15% of base for slots 17:00–20:00 or weekend dates
//   platform fee    5% of (base + peak surcharge)
//   GST             18% of (base + peak surcharge + platform fee)
//   total           the sum, rounded to the nearest rupee

const PEAK_HOURS = [17, 18, 19];
const PEAK_RATE = 0.15;
const PLATFORM_FEE_RATE = 0.05;
const GST_RATE = 0.18;

function isPeak(dateStr, slot) {
  const hour = Number(String(slot).slice(0, 2));
  if (PEAK_HOURS.includes(hour)) return true;
  const d = new Date(`${dateStr}T12:00:00Z`);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function computePriceBreakdown(basePrice, dateStr, slot) {
  const base = Math.round(Number(basePrice) || 0);
  const peak = isPeak(dateStr, slot);
  const peakSurcharge = peak ? Math.round(base * PEAK_RATE) : 0;
  const platformFee = Math.round((base + peakSurcharge) * PLATFORM_FEE_RATE);
  const gst = Math.round((base + peakSurcharge + platformFee) * GST_RATE);
  const total = base + peakSurcharge + platformFee + gst;
  return { base, peakSurcharge, platformFee, gst, total, peak };
}

module.exports = { computePriceBreakdown, isPeak, PEAK_RATE, PLATFORM_FEE_RATE, GST_RATE };
