// All copy and configuration for LinguaLeap lives here; components only render it.
export const config = {
  name: 'LinguaLeap',
  tagline: 'Learn a language, one small win at a time.',
  demoEmail: 'demo@lingualeap.example',
  demoInstructorEmail: 'demo-instructor@lingualeap.example',
  demoAdminEmail: 'admin@lingualeap.example',
  demoPassword: 'LinguaLeap123!',
  // No live links exist; nothing to link out to.
  repoLink: '',
  demoLink: '',
};

export const DAILY_GOAL_XP = 50;
export const XP_PER_CORRECT = 10;
export const HEARTS_PER_LESSON = 3;

// BCP 47 tags for the browser speechSynthesis API, per language.
export const SPEECH_LANG = {
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
};

export const LANGUAGE_NAMES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
};

export const ACHIEVEMENT_INFO = {
  'first-lesson': 'Complete your first lesson.',
  'lessons-5': 'Complete 5 lessons.',
  'lessons-10': 'Complete 10 lessons.',
  'xp-100': 'Reach 100 XP.',
  'xp-500': 'Reach 500 XP.',
  'streak-3': 'Keep a 3-day streak.',
  'streak-7': 'Keep a 7-day streak.',
  'review-10': 'Answer 10 review items correctly.',
  flawless: 'Finish a lesson with all 3 hearts.',
};

// Speak text with the browser Web Speech API. Real text-to-speech — no
// audio files. Returns false when the browser has no speech synthesis.
export function speak(text, lang) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang || 'en-US';
  utterance.rate = 0.85;
  const voice = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang && v.lang.toLowerCase().startsWith((lang || 'en').slice(0, 2).toLowerCase()));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}
