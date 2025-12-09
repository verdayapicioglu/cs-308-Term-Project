import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css';
import { authAPI, storeUserData } from './api';

function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const formatApiErrors = (errorPayload) => {
    if (!errorPayload) return 'Failed to sign up. Please try again.';
    if (typeof errorPayload === 'string') return errorPayload;
    if (Array.isArray(errorPayload)) {
      return errorPayload.join(' ');
    }
    return Object.entries(errorPayload)
      .map(([field, value]) => {
        if (Array.isArray(value)) {
          return `${field}: ${value.join(' ')}`;
        }
        if (typeof value === 'string') {
          return `${field}: ${value}`;
        }
        return `${field}: ${JSON.stringify(value)}`;
      })
      .join(' ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const { firstName, username, email, password, confirmPassword } = formData;

    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }

    if (!username.trim()) {
      setError('Please choose a username.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter a valid email.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        password2: formData.confirmPassword,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
      };

      await authAPI.register(payload);
      setInfo('Account created! Logging you in...');

      // Auto-login to create session/cookies
      const loginResponse = await authAPI.login(
        payload.username || payload.email,
        payload.password,
      );

      if (loginResponse.data?.user) {
        storeUserData(loginResponse.data.user);
      }

      navigate('/products');
    } catch (err) {
      if (err.response?.data) {
        const apiError =
          err.response.data.errors ||
          err.response.data.error ||
          err.response.data.detail;
        setError(formatApiErrors(apiError));
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2>
          <span className="signup-title-text">Create Account</span>
          <span className="paw-icon">🐾</span>
        </h2>
        {error && <div className="error-message">{error}</div>}
        {info && <div className="info-message">{info}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="firstName">First name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter your last name (optional)"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Pick a username"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter a strong password (min 8 characters)"
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <p className="login-link">
          <span className="login-label">Already have an account?</span>{' '}
          <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;

