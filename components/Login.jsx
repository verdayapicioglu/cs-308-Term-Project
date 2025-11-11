import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { getMockUsers } from './authUtils';

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

    // Simüle edilmiş API çağrısı (gerçekçi loading için)
    setTimeout(() => {
      try {
        const mockUsers = getMockUsers();
        
        // Kullanıcıyı bul
        const user = mockUsers.find(
          (u) => u.email === email.toLowerCase() && u.password === password
        );

        if (user) {
          // Kullanıcı bilgilerini localStorage'a kaydet
          localStorage.setItem('user_email', user.email);
          localStorage.setItem('user_name', user.name);
          localStorage.setItem('user_id', user.id);
          localStorage.setItem('is_authenticated', 'true');
          
          // Başarılı login - products sayfasına yönlendir
          navigate('/products');
        } else {
          setError('Invalid email or password. Please try again.');
        }
      } catch (error) {
        setError('Failed to login. Please try again.');
        console.error('Login error:', error);
      } finally {
        setLoading(false);
      }
    }, 800); // 800ms loading simülasyonu
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
          <small>Demo: admin@petstore.com / admin123</small>
        </div>
      </div>
    </div>
  );
}

export default Login;

