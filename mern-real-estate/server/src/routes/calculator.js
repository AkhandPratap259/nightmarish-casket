const express = require('express');

const router = express.Router();

// POST /api/calculator/emi — standard reducing-balance EMI formula.
router.post('/emi', (req, res) => {
  const principal = Number(req.body?.principal);
  const annualRate = Number(req.body?.annualRate);
  const years = Number(req.body?.years);
  if (!Number.isFinite(principal) || principal <= 0) {
    return res.status(400).json({ error: 'Principal must be a positive number' });
  }
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 30) {
    return res.status(400).json({ error: 'Annual rate must be between 0 and 30' });
  }
  if (!Number.isFinite(years) || years <= 0 || years > 30) {
    return res.status(400).json({ error: 'Tenure must be between 1 and 30 years' });
  }
  const months = Math.round(years * 12);
  const r = annualRate / 1200;
  let monthlyEmi;
  if (r === 0) monthlyEmi = principal / months;
  else monthlyEmi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  monthlyEmi = Math.round(monthlyEmi);
  const totalPayment = monthlyEmi * months;
  const totalInterest = totalPayment - principal;
  return res.json({ monthlyEmi, totalInterest, totalPayment, months });
});

module.exports = router;
