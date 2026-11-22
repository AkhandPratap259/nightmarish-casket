import { useEffect, useState } from 'react';
import { api } from '../api';
import { SPEECH_LANG } from '../data/config';
import Scramble from '../components/Scramble';
import LessonPlayer from '../components/LessonPlayer';

export default function Lesson({ lessonId, onExit, onFinished, notify }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState('');
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLesson(null);
    setError('');
    api
      .startLesson(lessonId)
      .then((d) => {
        if (!cancelled) setLesson(d.lesson);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, restartKey]);

  if (error) {
    return (
      <div className="page">
        <p className="section-label">(LESSON)</p>
        <h1>Could not start this lesson.</h1>
        <p className="form-error" role="alert">{error}</p>
        <button type="button" className="btn btn-primary" onClick={onExit}>
          Back to the skill tree
        </button>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="page">
        <p aria-live="polite">Starting your lesson…</p>
      </div>
    );
  }

  return (
    <div className="page lesson-page">
      <p className="section-label">(LESSON) {lesson.unitTitle.toUpperCase()}</p>
      <h1>
        <Scramble text={lesson.title} /> <em>· {lesson.exercises.length} exercises</em>
      </h1>
      <LessonPlayer
        key={`${lesson.id}-${restartKey}`}
        lesson={lesson}
        speechLang={SPEECH_LANG[lesson.languageCode] || 'en-US'}
        onExit={onExit}
        onFinished={onFinished}
        notify={notify}
      />
    </div>
  );
}
