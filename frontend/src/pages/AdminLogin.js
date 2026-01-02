import React, { useState, useContext } from 'react';
import AuthContext from '../context/AuthContext';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      // Backend'e istek at
      await login(username, password);
      // Not: Yönlendirme yapmıyoruz, App.js Context değişimini algılayıp sayfayı değiştirecek.
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş başarısız');
    }
  };

  return (
    // TASARIM GÜNCELLEMESİ (Arkadaşından Alındı):
    // Ekranın yüksekliğinden Header payını düşüp tam ortaya hizalar.
    <div className="w-full flex items-center justify-center h-[calc(100vh-100px)]">
      
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white/50 backdrop-blur-sm rounded-xl p-8 max-w-md w-full shadow-xl border border-white/40">
        <h2 className="text-2xl font-bold text-emerald-800 mb-6">Yönetici Girişi</h2>
        
        <form onSubmit={handleLogin} className="w-full space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Kullanıcı Adı</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Şifre</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition duration-300 shadow-md"
          >
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;