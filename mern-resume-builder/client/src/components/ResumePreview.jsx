// Live resume preview. Renders only the data in the resume object —
// no invented content. Three templates, one data source.
export default function ResumePreview({ resume }) {
  const p = resume.personal || {};
  const contact = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean).join('  ·  ');

  if (resume.template === 'split') {
    return (
      <article className="resume-page tpl-split" aria-label="Resume preview, split template">
        <aside className="resume-rail">
          <h2>{p.name || 'Your name'}</h2>
          <p className="rail-headline">{p.headline || 'Target role'}</p>
          <p className="rail-contact">{contact || 'Contact details appear here.'}</p>
          <h3>Skills</h3>
          <ul>
            {(resume.skills || []).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {(resume.skills || []).length === 0 && <p className="muted">Add skills to see them here.</p>}
        </aside>
        <div className="resume-main">
          {p.summary && (
            <section>
              <h3>Summary</h3>
              <p>{p.summary}</p>
            </section>
          )}
          {(resume.experience || []).length > 0 && (
            <section>
              <h3>Experience</h3>
              {resume.experience.map((e, i) => (
                <div className="prev-block" key={i}>
                  <p className="prev-role">
                    {e.role} — {e.company}
                  </p>
                  <p className="prev-dates">
                    {e.start}
                    {e.end || e.current ? ` — ${e.current ? 'Present' : e.end}` : ''}
                  </p>
                  <ul>
                    {e.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
          {(resume.education || []).length > 0 && (
            <section>
              <h3>Education</h3>
              {resume.education.map((e, i) => (
                <div className="prev-block" key={i}>
                  <p className="prev-role">
                    {e.degree} — {e.school}
                  </p>
                  <p className="prev-dates">
                    {e.start} — {e.end}
                  </p>
                  {e.details && <p>{e.details}</p>}
                </div>
              ))}
            </section>
          )}
          {(resume.projects || []).length > 0 && (
            <section>
              <h3>Projects</h3>
              {resume.projects.map((pr, i) => (
                <div className="prev-block" key={i}>
                  <p className="prev-role">
                    {pr.name}
                    {pr.link ? ` — ${pr.link}` : ''}
                  </p>
                  <p>{pr.description}</p>
                  {pr.tags.length > 0 && <p className="prev-tags">{pr.tags.join(' · ')}</p>}
                </div>
              ))}
            </section>
          )}
        </div>
      </article>
    );
  }

  if (resume.template === 'classic') {
    return (
      <article className="resume-page tpl-classic" aria-label="Resume preview, classic template">
        <header>
          <h2>{p.name || 'Your name'}</h2>
          <p className="prev-headline">{p.headline || 'Target role'}</p>
          <p className="prev-contact">{contact || 'Contact details appear here.'}</p>
        </header>
        {p.summary && (
          <section>
            <h3>Summary</h3>
            <p>{p.summary}</p>
          </section>
        )}
        {(resume.experience || []).length > 0 && (
          <section>
            <h3>Experience</h3>
            {resume.experience.map((e, i) => (
              <div className="prev-block" key={i}>
                <p className="prev-role">
                  {e.role} — {e.company} <span className="prev-dates">({e.start} — {e.current ? 'Present' : e.end})</span>
                </p>
                <ul>
                  {e.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
        {(resume.education || []).length > 0 && (
          <section>
            <h3>Education</h3>
            {resume.education.map((e, i) => (
              <div className="prev-block" key={i}>
                <p className="prev-role">
                  {e.degree} — {e.school} <span className="prev-dates">({e.start} — {e.end})</span>
                </p>
                {e.details && <p>{e.details}</p>}
              </div>
            ))}
          </section>
        )}
        {(resume.skills || []).length > 0 && (
          <section>
            <h3>Skills</h3>
            <p>{resume.skills.join(' · ')}</p>
          </section>
        )}
        {(resume.projects || []).length > 0 && (
          <section>
            <h3>Projects</h3>
            {resume.projects.map((pr, i) => (
              <div className="prev-block" key={i}>
                <p className="prev-role">
                  {pr.name}
                  {pr.link ? ` — ${pr.link}` : ''}
                </p>
                <p>{pr.description}</p>
              </div>
            ))}
          </section>
        )}
      </article>
    );
  }

  // Editorial (default)
  return (
    <article className="resume-page tpl-editorial" aria-label="Resume preview, editorial template">
      <header>
        <p className="prev-kicker">{p.headline || 'Target role'}</p>
        <h2>{p.name || 'Your name'}</h2>
        <p className="prev-contact">{contact || 'Contact details appear here.'}</p>
      </header>
      {p.summary && (
        <section>
          <h3>Summary</h3>
          <p className="prev-summary">{p.summary}</p>
        </section>
      )}
      {(resume.experience || []).length > 0 && (
        <section>
          <h3>Experience</h3>
          {resume.experience.map((e, i) => (
            <div className="prev-block" key={i}>
              <p className="prev-role">{e.role}</p>
              <p className="prev-company">
                {e.company} · {e.start} — {e.current ? 'Present' : e.end}
              </p>
              <ul>
                {e.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
      {(resume.education || []).length > 0 && (
        <section>
          <h3>Education</h3>
          {resume.education.map((e, i) => (
            <div className="prev-block" key={i}>
              <p className="prev-role">{e.degree}</p>
              <p className="prev-company">
                {e.school} · {e.start} — {e.end}
              </p>
              {e.details && <p>{e.details}</p>}
            </div>
          ))}
        </section>
      )}
      {(resume.skills || []).length > 0 && (
        <section>
          <h3>Skills</h3>
          <p className="prev-skills">{resume.skills.join('  ·  ')}</p>
        </section>
      )}
      {(resume.projects || []).length > 0 && (
        <section>
          <h3>Projects</h3>
          {resume.projects.map((pr, i) => (
            <div className="prev-block" key={i}>
              <p className="prev-role">{pr.name}</p>
              {pr.link && <p className="prev-company">{pr.link}</p>}
              <p>{pr.description}</p>
              {pr.tags.length > 0 && <p className="prev-tags">{pr.tags.join(' · ')}</p>}
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
