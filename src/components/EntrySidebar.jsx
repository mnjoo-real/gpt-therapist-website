function formatDateLabel(dateValue) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateValue}T12:00:00`))
}

function EntrySidebar({
  entries,
  isLoading,
  selectedDate,
  today,
  onSelectDate,
}) {
  const dateValues = entries.map((entry) => entry.entry_date)

  function handleAddPastEntry() {
    document.getElementById('entry-date')?.focus()
  }

  return (
    <aside className="entry-sidebar" aria-label="Journal entry dates">
      <div className="sidebar-heading">
        <p className="section-label">Entries</p>
        <h2>Dates</h2>
        <button
          type="button"
          className="sidebar-action"
          onClick={handleAddPastEntry}
        >
          Add past entry
        </button>
      </div>

      <div className="date-list" role="list">
        {isLoading ? <p className="sidebar-note">Loading entries...</p> : null}

        {!isLoading && dateValues.length === 0 ? (
          <p className="sidebar-note">No entries yet.</p>
        ) : null}

        {dateValues.map((dateValue) => {
          const isSelected = selectedDate === dateValue

          return (
            <button
              type="button"
              key={dateValue}
              className={`date-button${isSelected ? ' is-selected' : ''}`}
              onClick={() => onSelectDate(dateValue)}
            >
              <span>{formatDateLabel(dateValue)}</span>
              <small>
                {dateValue === today ? 'Today' : 'Saved'}
              </small>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default EntrySidebar
