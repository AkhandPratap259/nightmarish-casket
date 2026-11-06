// Bullet improver with two engines.
// 1. AI (optional): OpenAI if OPENAI_API_KEY is set, else Gemini if
//    GEMINI_API_KEY is set. 2. Rule-based fallback: always available, so the
//    feature works with no key at all. The response always says which
//    engine produced the rewrite — never presented as AI when it is not.

const VERB_SWAPS = [
  [/^(was responsible for|responsible for)\s+/i, 'Owned '],
  [/^worked on\s+/i, 'Built '],
  [/^helped (with|to)\s+/i, 'Supported '],
  [/^did\s+/i, 'Delivered '],
  [/^involved in\s+/i, 'Contributed to '],
  [/^tasked with\s+/i, 'Led '],
  [/^made\s+/i, 'Created '],
  [/^handled\s+/i, 'Managed '],
];

const STRONG_OPENERS = new Set([
  'built', 'launched', 'led', 'designed', 'shipped', 'improved', 'increased',
  'reduced', 'automated', 'created', 'developed', 'delivered', 'owned', 'scaled',
  'optimized', 'mentored', 'drove', 'grew', 'cut', 'saved', 'won', 'presented',
  'published', 'migrated', 'refactored', 'tested', 'deployed', 'implemented',
]);

function ruleImprove(bullet) {
  let text = String(bullet || '').trim().replace(/\s+/g, ' ').replace(/\.+$/, '');
  if (!text) return { original: bullet, improved: '', notes: ['Empty bullet — write what you did, with a verb.'] };
  const notes = [];
  for (const [re, replacement] of VERB_SWAPS) {
    if (re.test(text)) {
      text = text.replace(re, replacement);
      notes.push('Replaced a weak opening with a stronger verb.');
      break;
    }
  }
  const first = (text.match(/^[A-Za-z]+/) || [''])[0].toLowerCase();
  if (!STRONG_OPENERS.has(first)) {
    notes.push('Lead with a strong action verb (Built, Led, Shipped, Improved).');
  }
  if (!/\d/.test(text)) {
    notes.push('Add a number if you can: users, time saved, % improved.');
  }
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!notes.length) notes.push('Already action-led — keep it as is, or add a number.');
  return { original: bullet, improved: text, notes };
}

function parseAiJson(raw) {
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  try {
    const arr = JSON.parse(raw.slice(start, end + 1));
    if (Array.isArray(arr) && arr.every((x) => typeof x === 'string')) return arr;
    return null;
  } catch (err) {
    return null;
  }
}

async function tryOpenAi(bullets) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'You rewrite resume bullet points. Return ONLY a JSON array of strings, same length and order as the input. Each rewrite: start with a strong action verb, keep every fact from the original, do not invent numbers, names, or results. If a bullet has no number, keep it without one.',
        },
        { role: 'user', content: JSON.stringify(bullets) },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!raw) return null;
  const arr = parseAiJson(raw);
  if (!arr || arr.length !== bullets.length) return null;
  return arr;
}

async function tryGemini(bullets) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Rewrite these resume bullet points. Return ONLY a JSON array of strings, same length and order. Each rewrite: start with a strong action verb, keep every fact from the original, do not invent numbers, names, or results.\n${JSON.stringify(bullets)}`,
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const raw =
    data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;
  if (!raw) return null;
  const arr = parseAiJson(raw);
  if (!arr || arr.length !== bullets.length) return null;
  return arr;
}

async function improveBullets(bullets) {
  let engine = 'rule-based';
  let improved = null;
  try {
    improved = await tryOpenAi(bullets);
    if (improved) engine = 'openai';
  } catch (err) {
    improved = null;
  }
  if (!improved) {
    try {
      improved = await tryGemini(bullets);
      if (improved) engine = 'gemini';
    } catch (err) {
      improved = null;
    }
  }
  if (improved) {
    return {
      engine,
      results: bullets.map((b, i) => ({
        original: b,
        improved: improved[i],
        notes: ['Rewritten by the AI layer. Check every fact is still true before applying.'],
      })),
    };
  }
  return { engine: 'rule-based', results: bullets.map(ruleImprove) };
}

module.exports = { improveBullets, ruleImprove };
