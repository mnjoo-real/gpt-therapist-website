function formatFullDate(dateValue) {
  if (!dateValue) {
    return 'Select a date'
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateValue}T12:00:00`))
}

function EssayEditor({
  content,
  selectedDate,
  today,
  saveStatus,
  onChangeContent,
  onChangeDate,
  onSave,
}) {
  const isSaving = saveStatus === 'Saving...'
  const isError = saveStatus.startsWith('Error:')

  return (
    <section className="editor-card" aria-labelledby="editor-title">
      <div className="editor-header">
        <div className="editor-title-group">
          <p className="section-label">{formatFullDate(selectedDate)}</p>
          <h2 id="editor-title">Personal essay</h2>
        </div>

        <label className="date-picker-label" htmlFor="entry-date">
          Entry date
          <input
            id="entry-date"
            type="date"
            max={today}
            required
            value={selectedDate}
            onChange={(event) => onChangeDate(event.target.value)}
          />
        </label>

        <div className="save-area">
          {saveStatus ? (
            <p
              className={`save-status${isError ? ' is-error' : ''}`}
              aria-live="polite"
            >
              {saveStatus}
            </p>
          ) : null}
          <button
            type="button"
            className="primary-button"
            onClick={onSave}
            disabled={isSaving}
          >
            Save
          </button>
        </div>
      </div>

      <textarea
        className="essay-textarea"
        value={content}
        onChange={(event) => onChangeContent(event.target.value)}
        placeholder="Write your thoughts here..."
        aria-label={`Journal entry for ${formatFullDate(selectedDate)}`}
      />
    </section>
  )
}

export default EssayEditor
