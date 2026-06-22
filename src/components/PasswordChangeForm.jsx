import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function PasswordChangeForm({ onCancel, onSessionInvalid }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setStatusMessage('')
    setErrorMessage('')

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('The passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setStatusMessage('Updating password...')

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setStatusMessage('')
      setErrorMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setStatusMessage('Password updated successfully.')
    setIsSubmitting(false)

    const { data } = await supabase.auth.getSession()

    if (!data.session) {
      onSessionInvalid()
    }
  }

  return (
    <section className="password-panel" aria-labelledby="password-title">
      <div className="password-panel-header">
        <div>
          <p className="section-label">Account</p>
          <h2 id="password-title">Change password</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <form className="password-form" onSubmit={handleSubmit}>
        <p className="password-note">Use a password that only you know.</p>

        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          minLength={8}
        />

        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
        />

        {errorMessage ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {statusMessage ? (
          <p className="form-success" aria-live="polite">
            {statusMessage}
          </p>
        ) : null}

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Updating password...' : 'Update password'}
        </button>
      </form>
    </section>
  )
}

export default PasswordChangeForm
