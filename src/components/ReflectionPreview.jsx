const placeholderMessage =
  'Reflection support will appear here after you reflect on this entry.'

function formatList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return placeholderMessage
  }

  return items.join(', ')
}

function ReflectionPreview({
  canReflect,
  isLoading,
  reflection,
  mentalContext,
  status,
  errorMessage,
  onReflect,
}) {
  const emotions = reflection?.emotions || {}
  const primaryEmotions = formatList(emotions.primary)
  const secondaryEmotions = Array.isArray(emotions.secondary)
    ? emotions.secondary.join(', ')
    : ''
  const emotionText = reflection
    ? `${primaryEmotions}${
        secondaryEmotions ? `; secondary: ${secondaryEmotions}` : ''
      }${emotions.intensity ? `; intensity: ${emotions.intensity}` : ''}`
    : placeholderMessage

  const longTermText =
    mentalContext?.long_term_summary ||
    mentalContext?.emotional_patterns?.recent_pattern ||
    placeholderMessage

  return (
    <section className="reflection-panel" aria-labelledby="reflection-title">
      <div className="reflection-header">
        <div>
          <p className="section-label">Reflection support</p>
          <h2 id="reflection-title">Personal reflection companion</h2>
        </div>

        <div className="reflection-actions">
          {status ? (
            <p className="reflection-status" aria-live="polite">
              {status}
            </p>
          ) : null}
          <button
            type="button"
            className="primary-button"
            onClick={onReflect}
            disabled={!canReflect || isLoading}
          >
            {isLoading ? 'Reflecting...' : 'Reflect on this entry'}
          </button>
        </div>
      </div>

      {!canReflect ? (
        <p className="reflection-note">
          Save this journal entry before requesting reflection support.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="page-error reflection-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="reflection-grid">
        <article className="reflection-card">
          <h3>Today&apos;s reflection</h3>
          <p>{reflection?.summary || placeholderMessage}</p>
          {reflection?.supportive_note ? (
            <p className="supportive-note">{reflection.supportive_note}</p>
          ) : null}
        </article>

        <article className="reflection-card">
          <h3>Emotional themes</h3>
          <p>{emotionText}</p>
          {reflection?.themes?.length ? (
            <p className="supportive-note">
              Themes: {formatList(reflection.themes)}
            </p>
          ) : null}
        </article>

        <article className="reflection-card">
          <h3>Gentle questions</h3>
          {reflection?.gentle_questions?.length ? (
            <ul className="question-list">
              {reflection.gentle_questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : (
            <p>{placeholderMessage}</p>
          )}
        </article>

        <article className="reflection-card">
          <h3>Long-term patterns</h3>
          <p>{longTermText}</p>
          {mentalContext?.recurring_themes?.length ? (
            <p className="supportive-note">
              Recurring themes: {formatList(mentalContext.recurring_themes)}
            </p>
          ) : null}
        </article>
      </div>
    </section>
  )
}

export default ReflectionPreview
