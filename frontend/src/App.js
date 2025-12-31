import React, { useState } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage.js";
import Elektrik from "./pages/Elektrik";
import Su from "./pages/Su";
import Dogalgaz from "./pages/Dogalgaz";
import SubscriptionBox from "./components/SubscriptionBox";
import KayitForm from "./pages/KayitForm.js";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("home");

  const renderContent = () => {
    switch (activeTab) {
      case "home": return <HomePage />;
      case "kayit": return <KayitForm />;
      case "elektrik": return <Elektrik />;
      case "su": return <Su />;
      case "dogalgaz": return <Dogalgaz />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#DDEEE3]">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="p-5">
        {renderContent()}
      </div>
      <div className="fixed bottom-4 right-4">
        <SubscriptionBox />
      </div>
    </div>
  );
}

export default App;