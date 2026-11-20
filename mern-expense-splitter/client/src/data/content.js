export const EXPENSE_CATEGORIES = [
  'Food',
  'Stay',
  'Transport',
  'Activities',
  'Shopping',
  'Utilities',
  'Misc',
];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

export const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal', hint: 'Split evenly between everyone' },
  { value: 'exact', label: 'Exact amounts', hint: 'Enter each person’s share in money' },
  { value: 'percentage', label: 'Percentage', hint: 'Enter each person’s share as a %' },
  { value: 'shares', label: 'Shares', hint: 'Weight each person by shares, e.g. 2 : 1' },
];

export const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Add expense',
    text: 'One person pays and logs the expense once — title, amount, category, and who paid.',
  },
  {
    num: '02',
    title: 'Split fairly',
    text: 'Split it equally, by exact amounts, by percentage, or by shares. Everyone sees their share live.',
  },
  {
    num: '03',
    title: 'Settle in fewer transfers',
    text: 'FairShare nets out who owes whom, so a tangled group settles with the fewest possible payments.',
  },
];

// Illustrative preview only — sample figures showing how debt simplification
// works. Not real users, not real money.
export const DEMO_SPLIT = {
  label: 'Illustrative preview — sample figures, not real people or money',
  before: [
    { from: 'Asha', to: 'Ravi', amount: 1200 },
    { from: 'Ravi', to: 'Meera', amount: 900 },
    { from: 'Meera', to: 'Asha', amount: 600 },
    { from: 'Asha', to: 'Meera', amount: 450 },
    { from: 'Ravi', to: 'Asha', amount: 300 },
  ],
  after: [
    { from: 'Asha', to: 'Meera', amount: 750 },
    { from: 'Ravi', to: 'Meera', amount: 600 },
  ],
};

export const DEMO_ACCOUNT = {
  email: 'demo@fairshare.example',
  password: 'FairShare123!',
};

export const CATEGORY_COLOURS = {
  Food: '#2547f4',
  Travel: '#1c1a17',
  Stay: '#6f6a61',
  Shopping: '#7a5af8',
  Entertainment: '#0e7a5f',
  Utilities: '#b45309',
  Other: '#9a938a',
};
