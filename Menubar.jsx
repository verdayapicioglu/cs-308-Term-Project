// Menubar.jsx

import React from 'react';
import './Menubar.css'; // Birazdan bu stil dosyasını oluşturacağız

function Menubar() {
  return (
    <nav className="menubar">
      <div className="logo">
        <a href="/">PETSHOP</a>
      </div>
      <ul className="menu-items">
        <li><a href="/">Ana Sayfa</a></li>
        
        {/* Proje belgesinde istenen "Kategoriler" */}
        <li className="dropdown">
          <a href="/kategoriler">Kategoriler</a>
          <ul className="dropdown-content">
            <li><a href="/kategori/kopek">Köpek Ürünleri</a></li>
            <li><a href="/kategori/kedi">Kedi Ürünleri</a></li>
            <li><a href="/kategori/kus">Kuş Ürünleri</a></li>
            <li><a href="/kategori/akvaryum">Akvaryum</a></li>
          </ul>
        </li>
        
        <li><a href="/hakkimizda">Hakkımızda</a></li>
        <li><a href="/giris">Giriş Yap</a></li>
        <li><a href="/sepet">Sepetim</a></li>
      </ul>
    </nav>
  );
}

export default Menubar;