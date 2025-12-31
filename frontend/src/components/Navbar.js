import React from 'react';

const Navbar = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="bg-white p-4 shadow flex gap-4 justify-center">
      <button onClick={() => setActiveTab('home')} className="font-bold">Ana Sayfa</button>
      <button onClick={() => setActiveTab('elektrik')}>Elektrik</button>
      <button onClick={() => setActiveTab('su')}>Su</button>
      <button onClick={() => setActiveTab('dogalgaz')}>Doğalgaz</button>
      <button onClick={() => setActiveTab('kayit')} className="text-green-600">Kayıt Ol</button>
    </nav>
  );
};
export default Navbar;