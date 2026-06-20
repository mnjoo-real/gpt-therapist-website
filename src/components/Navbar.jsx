function Navbar({ displayName, onSignOut }) {
  return (
    <header className="navbar">
      <a className="brand" href="/">
        Reflection Journal
      </a>
      <div className="nav-actions">
        <span className="nav-user">{displayName}</span>
        <button type="button" className="secondary-button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  )
}

export default Navbar
