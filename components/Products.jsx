import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Products() {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('is_authenticated');
  const userEmail = localStorage.getItem('user_email');
  const userName = localStorage.getItem('user_name');

  useEffect(() => {
    // Eğer kullanıcı giriş yapmamışsa login sayfasına yönlendir
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null; // Yönlendirme yapılırken boş ekran
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Welcome to Products Page!</h1>
      <p>Hello, {userName || userEmail}!</p>
      <p>You have successfully logged in. 🎉</p>
      <p style={{ color: '#666', marginTop: '20px' }}>
        Products will be displayed here.
      </p>
    </div>
  );
}

export default Products;
