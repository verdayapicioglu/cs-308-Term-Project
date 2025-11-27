import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './ForgotPassword.css';
import { authAPI } from './api';

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const presetEmail = useMemo(
    () => location.state?.email?.toLowerCase() ?? '',
    [location.state],
  );

  const [email, setEmail] = useState(presetEmail);
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [step, setStep] = useState(presetEmail ? 'reset' : 'request');
  const [processing, setProcessing] = useState(false);
  const [devResetLink, setDevResetLink] = useState('');

  useEffect(() => {
    if (presetEmail) {
      setEmail(presetEmail);
    }
  }, [presetEmail]);

  const parseResetLink = (link) => {
    try {
      const url = new URL(link);
      const uidParam = url.searchParams.get('uid');
      const tokenParam = url.searchParams.get('token');
      if (uidParam) setUid(uidParam);
      if (tokenParam) setToken(tokenParam);
    } catch (parseError) {
      console.warn('Failed to parse reset link:', parseError);
    }
  };

  const handleRequestLink = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    setDevResetLink('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter the email associated with your account.');
      return;
    }

    setProcessing(true);
    try {
      const response = await authAPI.requestPasswordReset(normalizedEmail);
      const message =
        response.data?.message ||
        'If that email exists, a reset link has been sent.';
      setInfo(message);

      if (response.data?.reset_link) {
        setDevResetLink(response.data.reset_link);
        parseResetLink(response.data.reset_link);
        setStep('reset');
      }
    } catch (err) {
      const apiMessage =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'Unable to request password reset.';
      setError(apiMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    setDevResetLink('');

    if (!uid.trim() || !token.trim()) {
      setError('Please enter the UID and token from the reset link.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setProcessing(true);
    try {
      await authAPI.confirmPasswordReset({
        uid: uid.trim(),
        token: token.trim(),
        new_password: newPassword,
        new_password2: confirmPassword,
      });

      setStep('success');
      setInfo('Password updated successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const apiMessage =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        'Unable to reset password.';
      setError(apiMessage);
    } finally {
      setProcessing(false);
    }
  };

  const renderContent = () => {
    if (step === 'success') {
      return (
        <div className="success-state">
          <p>You can now sign in with your new password.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => navigate('/login')}
          >
            Back to login
          </button>
        </div>
      );
    }

    if (step === 'request') {
      return (
        <form onSubmit={handleRequestLink}>
          <div className="form-group">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              required
            />
          </div>
          <button type="submit" className="primary-button" disabled={processing}>
            {processing ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleResetPassword}>
        <div className="form-group">
          <label htmlFor="uid">UID (from reset link)</label>
          <input
            id="uid"
            type="text"
            value={uid}
            onChange={(event) => setUid(event.target.value)}
            placeholder="Paste the uid parameter"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="reset-token">Reset token</label>
          <input
            id="reset-token"
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste the token parameter"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Choose a new password"
            minLength={8}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm your new password"
            required
          />
        </div>
        <button
          type="submit"
          className="primary-button"
          disabled={processing}
        >
          {processing ? 'Updating...' : 'Reset password'}
        </button>
      </form>
    );
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h2>
          <span className="title-text">Reset your password</span>
          <span className="paw-icon">🐾</span>
        </h2>
        <p className="subtitle">
          Enter your email to receive a reset link, then use the UID & token to
          set a new password.
        </p>
        {error && <div className="error-message">{error}</div>}
        {info && step !== 'success' && (
          <div className="info-message">
            <p>{info}</p>
            {devResetLink && (
              <p style={{ marginTop: '0.5rem' }}>
                Dev link:{' '}
                <a
                  href={devResetLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ wordBreak: 'break-all' }}
                >
                  {devResetLink}
                </a>
              </p>
            )}
          </div>
        )}
        {renderContent()}
        {step !== 'success' && (
          <p className="helper-text">
            Remembered your password? <Link to="/login">Back to login</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;




