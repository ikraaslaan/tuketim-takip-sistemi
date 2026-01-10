import { createContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    // Backend'e istek at (backend 'email' bekliyor)
    const response = await api.post("/auth/login", { email: username, password });
    
    // Gelen cevapta token varsa kaydet
    if (response.data.token) {
      const userData = {
        token: response.data.token,
        user: response.data.user,
        role: response.data.user.role
      };
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    }
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    // Sayfayı yenilemeye gerek yok, state değişince App.js otomatik algılar
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;