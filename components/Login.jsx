import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { authAPI, storeUserData } from './api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call backend API for login
      const response = await authAPI.login(email, password);
      
      if (response.data && response.data.user) {
        const user = response.data.user;
        
        // Store user data in localStorage
        storeUserData(user);
        
        // Also store additional profile data if available
        if (user.profile) {
          localStorage.setItem('user_phone', user.profile.phone || '');
          localStorage.setItem('user_bio', user.profile.bio || '');
        }
        
        // Successful login - redirect to products page
        navigate('/products');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different error types
      if (error.response) {
        const errorData = error.response.data;
        setError(errorData.error || errorData.detail || 'Invalid email or password. Please try again.');
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to login. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password', {
      state: email ? { email } : undefined,
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>
          <span className="login-title-text">Login to Pet Shop</span>
          <span className="paw-icon">🐾</span>
        </h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <button
          type="button"
          className="forgot-password-button"
          onClick={handleForgotPassword}
          disabled={loading}
        >
          Forgot password?
        </button>
        <p className="signup-link">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>
        <div className="mock-info">
          <small>Test accounts available in database. Use any registered email/username and password.</small>
        </div>
      </div>
    </div>
  );
}

export default Login;

