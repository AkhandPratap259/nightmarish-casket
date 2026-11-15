import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import SkillTree from '../components/SkillTree';
import WordCard from '../components/WordCard';

export default function Learn({ language, onLanguage, onStartLesson, onRequireAuth, notify }) {
  const [languages, setLanguages] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [addedWords, setAddedWords] = useState(new Set());

  const load = useCallback(async (code) => {
    setError('');
    try {
      const [langs, det] = await Promise.all([api.languages(), api.language(code)]);
      setLanguages(langs.languages);
      setDetail(det);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load(language);
  }, [language, load]);

  function addToReview(word) {
    api
      .reviewAdd({
        word: word.word,
        translation: word.translation,
        reading: word.reading || '',
        languageCode: language,
      })
      .then(() => {
        setAddedWords((s) => new Set(s).add(word.word));
        notify(`“${word.word}” added to your review deck.`, 'success');
      })
      .catch((err) => notify(err.message, 'error'));
  }

  if (!detail) {
    return (
      <div className="page">
        <p aria-live="polite">{error || 'Loading the skill tree…'}</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
    );
  }

  const lang = detail.language;
  const totalLessons = detail.units.reduce((n, u) => n + u.lessons.length, 0);
  const doneLessons = detail.units.reduce(
    (n, u) => n + u.lessons.filter((l) => l.status === 'completed').length,
    0
  );

  return (
    <div className="page learn-page">
      <p className="section-label">(LEARN) SKILL TREE</p>
      <h1>
        {lang.name} <em>· {lang.nativeName}</em>
      </h1>
      <p className="page-sub">{lang.description}</p>
      <p className="page-sub">
        {doneLessons} of {totalLessons} lessons complete · {lang.difficulty}
      </p>

      <div className="lang-tabs" role="group" aria-label="Choose a language">
        {languages.map((l) => (
          <button
            key={l.code}
            type="button"
            className={l.code === language ? 'is-active' : ''}
            onClick={() => onLanguage(l.code)}
            aria-pressed={l.code === language}
          >
            {l.name}
            {l.completedCount ? ` (${l.completedCount}/${l.lessonCount})` : ''}
          </button>
        ))}
      </div>

      {error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}

      <SkillTree
        units={detail.units}
        onStart={(lessonId) => {
          if (!detail) return;
          onStartLesson(lessonId);
        }}
      />

      <section className="vocab-section" aria-labelledby="vocab-heading">
        <p className="section-label">(VOCABULARY BANK)</p>
        <h2 id="vocab-heading">
          Every word in <em>{lang.name}.</em>
        </h2>
        <p>Sample beginner vocabulary for this course. Listen to each word, or add it to your review deck.</p>
        <div className="word-list">
          {detail.vocabulary.map((word) => (
            <WordCard
              key={word.word}
              word={word}
              speechLang={lang.speechLang}
              onAddToReview={addToReview}
              added={addedWords.has(word.word)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
