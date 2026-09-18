import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from '../api';

export const ROLES = {
  ADMIN: 'ADMIN',
  BASE_COMMANDER: 'BASE_COMMANDER',
  LOGISTICS_OFFICER: 'LOGISTICS_OFFICER',
};

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  BASE_COMMANDER: 'Base Commander',
  LOGISTICS_OFFICER: 'Logistics Officer',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshLookups = useCallback(async () => {
    const [baseList, typeList] = await Promise.all([
      api('/assets/bases'),
      api('/assets/equipment-types'),
    ]);
    setBases(baseList);
    setEquipmentTypes(typeList);
  }, []);

  // Restore the session from a saved token.
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    if (user) refreshLookups().catch(() => {});
  }, [user, refreshLookups]);

  // api() fires this when the token is rejected.
  useEffect(() => {
    window.addEventListener('auth:logout', logout);
    return () => window.removeEventListener('auth:logout', logout);
  }, [logout]);

  const login = async (username, password) => {
    const { token, user } = await api('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    setToken(token);
    setUser(user);
  };

  const baseName = (id) => bases.find((b) => b.id === id)?.name ?? '—';

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, bases, equipmentTypes, refreshLookups, baseName }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
