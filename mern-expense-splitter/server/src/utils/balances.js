// Pure balance maths for FairShare. All amounts are rounded to 2 decimals;
// anything below 0.01 is treated as settled (zero).

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function keyOf(id) {
  // Accept ObjectIds, strings, and populated Mongoose documents alike.
  if (id && typeof id === 'object' && id._id) return String(id._id);
  return String(id);
}

// Nets are keyed by member id (as a string). A positive net means the member
// is owed money; a negative net means the member owes money.
// Accepts expenses and settlements as plain objects or Mongoose documents,
// and memberIds as ObjectIds or strings.
function computeBalances(expenses, settlements, memberIds) {
  const nets = {};
  for (const id of memberIds || []) nets[keyOf(id)] = 0;

  for (const expense of expenses || []) {
    const paidBy = keyOf(expense.paidBy);
    const amount = round2(expense.amount);
    if (!(paidBy in nets)) nets[paidBy] = 0;
    nets[paidBy] = round2(nets[paidBy] + amount);
    for (const split of expense.splits || []) {
      const who = keyOf(split.user);
      if (!(who in nets)) nets[who] = 0;
      nets[who] = round2(nets[who] - round2(split.amount));
    }
  }

  for (const settlement of settlements || []) {
    const from = keyOf(settlement.from);
    const to = keyOf(settlement.to);
    const amount = round2(settlement.amount);
    if (!(from in nets)) nets[from] = 0;
    if (!(to in nets)) nets[to] = 0;
    // The payer's debt shrinks (net rises); the receiver was owed less.
    nets[from] = round2(nets[from] + amount);
    nets[to] = round2(nets[to] - amount);
  }

  for (const id of Object.keys(nets)) {
    if (Math.abs(nets[id]) < 0.01) nets[id] = 0;
    else nets[id] = round2(nets[id]);
  }
  return nets;
}

// Raw who-owes-whom: every debtor owes every creditor a pro-rata share of
// that creditor's balance, so each debtor-creditor pair appears once.
// nets: { userId: net } with positive = owed, negative = owes.
function pairwiseDebts(nets) {
  const debts = [];
  const debtors = Object.entries(nets)
    .filter(([, net]) => net < -0.009)
    .map(([id, net]) => ({ id, owes: round2(-net) }));
  const creditors = Object.entries(nets)
    .filter(([, net]) => net > 0.009)
    .map(([id, net]) => ({ id, owed: round2(net) }));
  const totalOwed = round2(creditors.reduce((sum, c) => sum + c.owed, 0));
  if (totalOwed <= 0 || debtors.length === 0) return debts;

  for (const debtor of debtors) {
    let remaining = debtor.owes;
    creditors.forEach((creditor, index) => {
      const isLast = index === creditors.length - 1;
      const amount = isLast
        ? round2(remaining)
        : round2((debtor.owes * creditor.owed) / totalOwed);
      if (amount >= 0.01) {
        debts.push({ from: debtor.id, to: creditor.id, amount });
        remaining = round2(remaining - amount);
      }
    });
  }
  return debts;
}

// Minimal settlement plan via greedy min-cash-flow: repeatedly match the
// largest debtor with the largest creditor until everyone is settled.
// Produces at most (debtors + creditors - 1) transfers, never more than
// pairwiseDebts for the same nets.
function simplifyDebts(nets) {
  const debtors = Object.entries(nets)
    .filter(([, net]) => net < -0.009)
    .map(([id, net]) => ({ id, amount: round2(-net) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(nets)
    .filter(([, net]) => net > 0.009)
    .map(([id, net]) => ({ id, amount: round2(net) }))
    .sort((a, b) => b.amount - a.amount);

  const plan = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = round2(Math.min(debtor.amount, creditor.amount));
    if (amount >= 0.01) {
      plan.push({ from: debtor.id, to: creditor.id, amount });
    }
    debtor.amount = round2(debtor.amount - amount);
    creditor.amount = round2(creditor.amount - amount);
    if (debtor.amount < 0.01) i += 1;
    if (creditor.amount < 0.01) j += 1;
  }
  return plan;
}

// Server-side split computation. Returns [{ user, amount, percentage?, shares? }]
// with amounts that sum exactly to `amount`. Throws an Error with a plain
// message on invalid input; routes turn it into a 400.
// `splits` is the client-supplied list; for 'equal' it may be omitted,
// in which case every member in `memberIds` is split among.
function computeSplits(amount, splitType, splits, memberIds) {
  const total = round2(amount);
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Amount must be greater than 0');
  }
  const type = splitType || 'equal';
  if (!['equal', 'exact', 'percentage', 'shares'].includes(type)) {
    throw new Error('Invalid split type');
  }

  let entries = Array.isArray(splits) ? splits : [];
  if (type === 'equal' && entries.length === 0) {
    entries = (memberIds || []).map((id) => ({ user: id }));
  }
  if (entries.length === 0) throw new Error('At least one person must be included in the split');

  const users = entries.map((s) => keyOf(s.user));
  if (users.some((u) => !u || u === 'undefined' || u === 'null')) {
    throw new Error('Every split needs a person');
  }
  if (new Set(users).size !== users.length) {
    throw new Error('Each person can appear in a split only once');
  }

  if (type === 'equal') {
    // Split into whole pennies; leftover pennies go to the first members
    // so the shares sum exactly to the expense amount.
    const base = Math.floor((total * 100) / users.length) / 100;
    let remainderPennies = Math.round(total * 100 - base * 100 * users.length);
    return users.map((user, index) => {
      const extra = remainderPennies > 0 ? 0.01 : 0;
      if (remainderPennies > 0) remainderPennies -= 1;
      return { user, amount: round2(base + extra) };
    });
  }

  if (type === 'exact') {
    const sum = round2(entries.reduce((s, e) => s + Number(e.amount || 0), 0));
    if (Math.abs(sum - total) > 0.01) {
      throw new Error('Exact amounts must add up to the expense amount');
    }
    return entries.map((e) => ({ user: keyOf(e.user), amount: round2(e.amount) }));
  }

  if (type === 'percentage') {
    const pctSum = entries.reduce((s, e) => s + Number(e.percentage || 0), 0);
    if (Math.abs(pctSum - 100) > 0.01) {
      throw new Error('Percentages must add up to 100');
    }
    const computed = entries.map((e) => ({
      user: keyOf(e.user),
      amount: round2((total * Number(e.percentage)) / 100),
      percentage: Number(e.percentage),
    }));
    // Fix rounding drift on the last share so shares sum exactly.
    const drift = round2(total - computed.reduce((s, c) => s + c.amount, 0));
    if (drift !== 0) computed[computed.length - 1].amount = round2(computed[computed.length - 1].amount + drift);
    return computed;
  }

  // shares
  const totalShares = entries.reduce((s, e) => s + Number(e.shares || 0), 0);
  if (!Number.isFinite(totalShares) || totalShares <= 0) {
    throw new Error('Shares must add up to more than 0');
  }
  if (entries.some((e) => Number(e.shares) <= 0)) {
    throw new Error('Each share count must be greater than 0');
  }
  const computed = entries.map((e) => ({
    user: keyOf(e.user),
    amount: round2((total * Number(e.shares)) / totalShares),
    shares: Number(e.shares),
  }));
  const drift = round2(total - computed.reduce((s, c) => s + c.amount, 0));
  if (drift !== 0) computed[computed.length - 1].amount = round2(computed[computed.length - 1].amount + drift);
  return computed;
}

module.exports = { round2, computeBalances, pairwiseDebts, simplifyDebts, computeSplits };
