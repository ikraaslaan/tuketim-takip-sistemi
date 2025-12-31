import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; 
import App from './App';
import { AuthProvider } from './context/AuthContext'; // <-- ÖNEMLİ: Sağlayıcıyı çağır

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* APP'İ SARMALIYORUZ Kİ HER YERDEN ERİŞİLSİN */}
    <AuthProvider> 
      <App />
    </AuthProvider>
  </React.StrictMode>
);