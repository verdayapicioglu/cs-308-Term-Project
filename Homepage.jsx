// Homepage.jsx

import React from 'react';
import './Homepage.css'; // Stil dosyası

function Homepage() {
  return (
    <div className="homepage-container">
      <header className="welcome-header">
        <h1>Petshop'umuza Hoş Geldiniz!</h1>
        <p>Tüylü dostlarınız için en iyi ürünler burada.</p>
        <a href="/kategoriler" className="cta-button">
          Şimdi Alışverişe Başla
        </a>
      </header>

      <section className="featured-products">
        <h2>Öne Çıkan Ürünler</h2>
        {/* Normalde burada ürünler listelenir (Projenin ilerleyen adımları).
          Şimdilik yer tutucu (placeholder) koyalım.
        */}
        <div className="product-list">
          <div className="product-card">Ürün 1</div>
          <div className="product-card">Ürün 2</div>
          <div className="product-card">Ürün 3</div>
        </div>
      </section>
    </div>
  );
}

export default Homepage;