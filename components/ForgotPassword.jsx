import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './ForgotPassword.css';
import { getMockUsers, saveMockUsers } from './authUtils';

const createResetToken = () => Math.random().toString(36).substring(2, 10);

const getResetRequests = () => {
  const stored = localStorage.getItem('mock_password_resets');
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn('Corrupted password reset store. Clearing...', error);
    localStorage.removeItem('mock_password_resets');
    return [];
  }
};

const saveResetRequests = (requests) => {
  localStorage.setItem('mock_password_resets', JSON.stringify(requests));
};

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const presetEmail = useMemo(
    () => location.state?.email?.toLowerCase() ?? '',
    [location.state]
  );

  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mode, setMode] = useState(presetEmail ? 'reset' : 'request');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (presetEmail) {
      setEmail(presetEmail);
    }
  }, [presetEmail]);

  const handleRequestLink = (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter the email associated with your account.');
      return;
    }

    try {
      const users = getMockUsers();
      const user = users.find((u) => u.email === normalizedEmail);

      if (!user) {
        setError('We couldn’t find an account with that email.');
        return;
      }

      const activeRequests = getResetRequests().filter(
        (request) => request.email !== user.email
      );
      const resetToken = createResetToken();
      const record = {
        id: Date.now().toString(),
        email: user.email,
        token: resetToken,
        requestedAt: new Date().toISOString(),
      };

      saveResetRequests([...activeRequests, record]);
      console.info(
        'Password reset link (demo):',
        `https://petstore.example/reset-password?token=${resetToken}`
      );
      setInfo(
        `Reset link generated! Use the token sent to ${user.email}. (Check the browser console in this demo.)`
      );
      setToken(resetToken);
      setMode('reset');
    } catch (err) {
      console.error('Reset link request failed:', err);
      setError('Unable to generate a reset link. Please try again.');
    }
  };

  const handleResetPassword = (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    setProcessing(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Email is required.');
      setProcessing(false);
      return;
    }

    if (!token.trim()) {
      setError('Please enter the reset token.');
      setProcessing(false);
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password.');
      setProcessing(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setProcessing(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setProcessing(false);
      return;
    }

    try {
      const requests = getResetRequests();
      const matchingRequest = requests.find(
        (request) =>
          request.email === normalizedEmail &&
          request.token === token.trim()
      );

      if (!matchingRequest) {
        setError('Invalid or expired reset token.');
        setProcessing(false);
        return;
      }

      const users = getMockUsers();
      const userIndex = users.findIndex((u) => u.email === normalizedEmail);

      if (userIndex === -1) {
        setError('We couldn’t find an account with that email.');
        setProcessing(false);
        return;
      }

      const updatedUsers = [...users];
      updatedUsers[userIndex] = {
        ...updatedUsers[userIndex],
        password: newPassword,
      };
      saveMockUsers(updatedUsers);

      const remainingRequests = requests.filter(
        (request) => request.id !== matchingRequest.id
      );
      saveResetRequests(remainingRequests);

      setInfo('Password successfully updated! Redirecting to login...');
      setMode('success');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      console.error('Password reset failed:', err);
      setError('Unable to reset password. Please try again.');
      setProcessing(false);
    }
  };

  const renderContent = () => {
    if (mode === 'success') {
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

    if (mode === 'request') {
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
          <button type="submit" className="primary-button">
            Send reset link
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleResetPassword}>
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
        <div className="form-group">
          <label htmlFor="reset-token">Reset token</label>
          <input
            id="reset-token"
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Paste the token from the email/console"
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
          Enter your email to receive a reset token, then use it to set a new
          password.
        </p>
        {error && <div className="error-message">{error}</div>}
        {info && mode !== 'success' && (
          <div className="info-message">{info}</div>
        )}
        {renderContent()}
        {mode !== 'success' && (
          <p className="helper-text">
            Remembered your password? <Link to="/login">Back to login</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;




