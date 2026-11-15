import { speak, SPEECH_LANG } from '../data/config';

// One vocabulary word: the word, its translation, an example sentence and
// a listen button (real browser text-to-speech).
export default function WordCard({ word, speechLang, onAddToReview, added }) {
  const audioText = word.word.replace(/\s*\([^)]*\)\s*/g, '').trim();
  return (
    <article className="word-card">
      <div className="word-main">
        <h3 className="word-text">{word.word}</h3>
        <p className="word-translation">{word.translation}</p>
        {word.example ? (
          <p className="word-example">
            “{word.example}”
            {word.exampleEn ? <span className="word-example-en"> — {word.exampleEn}</span> : null}
          </p>
        ) : null}
      </div>
      <div className="word-actions">
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => speak(audioText, speechLang)}
          aria-label={`Hear ${word.word}`}
        >
          🔊 Listen
        </button>
        {onAddToReview ? (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={added}
            onClick={() => onAddToReview(word)}
          >
            {added ? 'In review deck ✓' : '+ Review'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
