// Deterministic, rule-based ATS-style analysis.
// No AI key needed, no invented scores: every check is a verifiable fact
// about the resume content, and the score is the weighted pass rate.

const STRONG_VERBS = new Set([
  'built', 'launched', 'led', 'designed', 'shipped', 'improved', 'increased',
  'reduced', 'automated', 'created', 'developed', 'delivered', 'owned', 'scaled',
  'optimized', 'optimised', 'mentored', 'drove', 'grew', 'cut', 'saved', 'won',
  'presented', 'published', 'migrated', 'refactored', 'tested', 'deployed',
  'implemented', 'architected', 'streamlined', 'raised', 'doubled', 'tripled',
]);

const STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'are', 'you', 'your', 'our', 'this', 'that',
  'will', 'have', 'has', 'from', 'into', 'using', 'used', 'use', 'work', 'team',
  'ability', 'experience', 'skills', 'required', 'role', 'candidate', 'job',
  'years', 'year', 'must', 'should', 'good', 'strong', 'also', 'more', 'than',
]);

function firstWord(bullet) {
  const m = String(bullet || '').trim().toLowerCase().match(/^[a-z]+/);
  return m ? m[0] : '';
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function collectText(resume) {
  const parts = [
    resume.personal && resume.personal.summary,
    (resume.experience || []).flatMap((e) => [e.role, e.company, ...(e.bullets || [])]),
    (resume.education || []).flatMap((e) => [e.degree, e.school, e.details]),
    (resume.skills || []),
    (resume.projects || []).flatMap((p) => [p.name, p.description, ...(p.tags || [])]),
  ];
  return parts.flat().filter(Boolean).join(' ').toLowerCase();
}

function keywordCoverage(resumeText, jobDescription) {
  const tokens = String(jobDescription || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#. ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const unique = [...new Set(tokens)];
  if (unique.length === 0) return null;
  const matched = unique.filter((w) => resumeText.includes(w));
  const missing = unique.filter((w) => !resumeText.includes(w)).slice(0, 12);
  return {
    total: unique.length,
    matched: matched.length,
    coverage: Math.round((matched.length / unique.length) * 100),
    missing,
  };
}

function analyzeResume(resume, jobDescription) {
  const checks = [];
  const issues = [];
  const suggestions = [];
  const p = resume.personal || {};
  const bullets = (resume.experience || []).flatMap((e) => e.bullets || []);
  const summaryWords = wordCount(p.summary);
  const totalWords = wordCount(collectText(resume));

  function check(label, weight, pass, detail, suggestion) {
    checks.push({ label, weight, pass, detail });
    if (!pass) {
      issues.push(label);
      if (suggestion) suggestions.push(suggestion);
    }
  }

  check('Contact details', 10, Boolean(p.name && p.email), p.email ? `Email on file: ${p.email}` : 'Name or email missing', 'Add your name and a working email address.');
  check('Headline / target role', 5, Boolean(p.headline && p.headline.trim()), p.headline || 'No headline', 'Add a one-line headline naming the role you want.');
  check('Summary (30+ words)', 10, summaryWords >= 30, `${summaryWords} words`, 'Write a 30–60 word summary: what you do, your strongest proof, and what you want next.');
  check('Experience with bullets', 15, (resume.experience || []).some((e) => (e.bullets || []).length >= 2), `${(resume.experience || []).length} role(s), ${bullets.length} bullet(s)`, 'Add at least one role with two or more bullet points.');
  check('Education listed', 10, (resume.education || []).length >= 1, `${(resume.education || []).length} entr(ies)`, 'Add your degree and institution.');
  check('Skills (3+)', 10, (resume.skills || []).length >= 3, `${(resume.skills || []).length} skill(s)`, 'List at least three skills that match the roles you apply for.');
  check('Project listed', 10, (resume.projects || []).length >= 1, `${(resume.projects || []).length} project(s)`, 'Add one project with what you built and what it does.');

  const strongCount = bullets.filter((b) => STRONG_VERBS.has(firstWord(b))).length;
  const strongPct = bullets.length ? Math.round((strongCount / bullets.length) * 100) : 0;
  check('Action-led bullets (60%+)', 15, bullets.length > 0 && strongPct >= 60, `${strongCount}/${bullets.length} bullets start with a strong verb (${strongPct}%)`, 'Start bullets with strong verbs: Built, Led, Shipped, Improved, Automated.');

  const numberCount = bullets.filter((b) => /\d/.test(b)).length;
  const numberPct = bullets.length ? Math.round((numberCount / bullets.length) * 100) : 0;
  check('Quantified results (40%+)', 15, bullets.length > 0 && numberPct >= 40, `${numberCount}/${bullets.length} bullets contain a number (${numberPct}%)`, 'Add numbers to your bullets: users, revenue, time saved, percentage improved.');

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earned / totalWeight) * 100);

  if (totalWords > 0 && totalWords < 150) {
    issues.push('Very short resume');
    suggestions.push(`Your resume is about ${totalWords} words — most one-page resumes run 300–600 words. Add detail to experience and projects.`);
  }
  if (totalWords > 900) {
    issues.push('Very long resume');
    suggestions.push(`Your resume is about ${totalWords} words — aim for one page (roughly 300–600 words) for fresher roles.`);
  }

  const keywords = keywordCoverage(collectText(resume), jobDescription);
  if (keywords && keywords.coverage < 50) {
    issues.push('Low keyword match with job description');
    suggestions.push(`Only ${keywords.coverage}% of the job description's keywords appear in your resume. Missing: ${keywords.missing.join(', ')}. Add the ones that are genuinely true for you.`);
  }

  return { score, checks, issues, suggestions, keywords, totalWords };
}

module.exports = { analyzeResume };
