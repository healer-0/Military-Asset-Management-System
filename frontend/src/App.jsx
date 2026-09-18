import { Navigate, Route, Routes } from 'react-router';
import { ROLES, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MovementPage from './pages/MovementPage';
import { assignments, expenditures, purchases, transfers } from './pages/movementConfigs';
import Users from './pages/Users';
import Setup from './pages/Setup';

const COMMAND_ROLES = [ROLES.ADMIN, ROLES.BASE_COMMANDER];

function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="purchases" element={<MovementPage key="purchases" config={purchases} />} />
        <Route path="transfers" element={<MovementPage key="transfers" config={transfers} />} />
        <Route
          path="assignments"
          element={
            <RequireAuth roles={COMMAND_ROLES}>
              <MovementPage key="assignments" config={assignments} />
            </RequireAuth>
          }
        />
        <Route
          path="expenditures"
          element={
            <RequireAuth roles={COMMAND_ROLES}>
              <MovementPage key="expenditures" config={expenditures} />
            </RequireAuth>
          }
        />
        <Route
          path="users"
          element={
            <RequireAuth roles={[ROLES.ADMIN]}>
              <Users />
            </RequireAuth>
          }
        />
        <Route
          path="setup"
          element={
            <RequireAuth roles={[ROLES.ADMIN]}>
              <Setup />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
