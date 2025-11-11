import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Signup.css';

// Mock users - localStorage'dan yüklenir
const getMockUsers = () => {
  const stored = localStorage.getItem('mock_users');
  if (stored) {
    return JSON.parse(stored);
  }
  // Varsayılan mock kullanıcılar
  const defaultUsers = [
    {
      id: '1',
      email: 'admin@petstore.com',
      password: 'admin123',
      name: 'Admin User',
    },
    {
      id: '2',
      email: 'user@example.com',
      password: 'password123',
      name: 'Test User',
    }
  ];
  localStorage.setItem('mock_users', JSON.stringify(defaultUsers));
  return defaultUsers;
};

function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);

    // Simüle edilmiş API çağrısı (gerçekçi loading için)
    setTimeout(() => {
      try {
        const mockUsers = getMockUsers();
        
        // Email zaten kullanılıyor mu kontrol et
        const emailExists = mockUsers.some(
          (u) => u.email === formData.email.toLowerCase()
        );

        if (emailExists) {
          setError('This email is already registered. Please use a different email or login.');
          setLoading(false);
          return;
        }

        // Yeni kullanıcı oluştur
        const newUser = {
          id: Date.now().toString(), // Basit ID oluşturma
          email: formData.email.toLowerCase(),
          password: formData.password,
          name: formData.email.split('@')[0], // Email'den isim oluştur
        };

        // Mock users listesine ekle
        mockUsers.push(newUser);
        localStorage.setItem('mock_users', JSON.stringify(mockUsers));

        // Kullanıcı bilgilerini localStorage'a kaydet
        localStorage.setItem('user_email', newUser.email);
        localStorage.setItem('user_name', newUser.name);
        localStorage.setItem('user_id', newUser.id);
        localStorage.setItem('is_authenticated', 'true');
        
        // Başarılı signup - products sayfasına yönlendir
        navigate('/products');
      } catch (error) {
        setError('Failed to sign up. Please try again.');
        console.error('Signup error:', error);
      } finally {
        setLoading(false);
      }
    }, 1000); // 1 saniye loading simülasyonu
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h2>
          <span className="signup-title-text">Create Account</span>
          <span className="paw-icon">🐾</span>
        </h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
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
              placeholder="Enter your password (min 6 characters)"
              minLength={6}
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

