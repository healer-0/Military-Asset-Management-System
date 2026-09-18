import { NavLink, Outlet } from 'react-router';
import { ROLES, ROLE_LABELS, useAuth } from '../context/AuthContext';

const { ADMIN, BASE_COMMANDER } = ROLES;

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/purchases', label: 'Purchases', icon: '＋' },
  { to: '/transfers', label: 'Transfers', icon: '⇄' },
  { to: '/assignments', label: 'Assignments', icon: '◉', roles: [ADMIN, BASE_COMMANDER] },
  { to: '/expenditures', label: 'Expenditures', icon: '−', roles: [ADMIN, BASE_COMMANDER] },
  { to: '/users', label: 'Users', icon: '☰', roles: [ADMIN] },
  { to: '/setup', label: 'Bases & Equipment', icon: '⚙', roles: [ADMIN] },
];

export default function Layout() {
  const { user, logout, baseName } = useAuth();
  const links = NAV.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">★</span>
          <div>
            <strong>MAMS</strong>
            <small>Asset Management</small>
          </div>
        </div>
        <nav>
          {links.map(({ to, label, icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="user-info">
            <span className="avatar">{user.username[0].toUpperCase()}</span>
            <div>
              <strong>{user.username}</strong>
              <small>
                {ROLE_LABELS[user.role]}
                {user.baseId && ` · ${baseName(user.baseId)}`}
              </small>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
