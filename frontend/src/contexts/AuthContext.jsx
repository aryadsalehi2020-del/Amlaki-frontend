import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE } from '../config';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Lade User-Daten beim Start
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async (authToken = null, retries = 2) => {
    const currentToken = authToken || token || localStorage.getItem('token');
    if (!currentToken) return;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setLoading(false);
          return;
        } else {
          logout();
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error(`Fetch user attempt ${attempt + 1} failed:`, error);
        if (attempt < retries) {
          // Server wahrscheinlich im Cold Start - warten und nochmal versuchen
          await new Promise(r => setTimeout(r, 3000));
        } else {
          // Alle Versuche fehlgeschlagen - NICHT ausloggen, Token koennte noch gueltig sein
          console.error('Server nicht erreichbar nach allen Versuchen');
          setLoading(false);
        }
      }
    }
  };

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    const newToken = data.access_token;

    localStorage.setItem('token', newToken);
    setToken(newToken);

    // Lade User-Daten mit neuem Token
    await fetchCurrentUser(newToken);

    return data;
  };

  const register = async (email, username, password, fullName) => {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        username,
        password,
        full_name: fullName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();

    // Nach erfolgreicher Registrierung automatisch einloggen
    await login(email, password);

    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updates) => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update user');
    }

    const updatedUser = await response.json();
    setUser(updatedUser);
    return updatedUser;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
