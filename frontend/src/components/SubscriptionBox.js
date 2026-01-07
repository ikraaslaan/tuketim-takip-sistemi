import React, { useState, useEffect } from "react"; 
import { Mail, X } from "lucide-react";

const SubscriptionBox = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
  setTimeout(() => setIsVisible(true), 500);
}, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    localStorage.setItem("subscriptionBoxDismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 w-80 hover:shadow-xl transition-all relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 text-lg">
            Kesintilerden haberdar olmak ister misiniz?
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Mahallenizdeki kesintiler için bildirim alın.
          </p>
        </div>

        <button
          onClick={() => {
            const event = new CustomEvent("openKayitForm");
            window.dispatchEvent(event);
          }}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-all"
        >
          Kayıt Ol
        </button>
      </div>
    </div>
  );
};

export default SubscriptionBox;
