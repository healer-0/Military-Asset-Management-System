import { useState } from 'react';
import { api, formatDate, useFetch } from '../api';
import { ROLES, ROLE_LABELS, useAuth } from '../context/AuthContext';

const EMPTY_FORM = { username: '', password: '', role: ROLES.LOGISTICS_OFFICER, baseId: '' };

export default function Users() {
  const { bases } = useAuth();
  const users = useFetch('/auth/users');
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const isAdminRole = form.role === ROLES.ADMIN;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api('/auth/users', {
        method: 'POST',
        body: { ...form, baseId: isAdminRole ? null : Number(form.baseId) },
      });
      setMessage({ type: 'success', text: `User "${form.username}" created.` });
      setForm(EMPTY_FORM);
      users.reload();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="muted">Create accounts and assign each person a role and base.</p>
        </div>
      </div>

      <div className="split">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>New user</h2>
          <label>
            Username
            <input required minLength={3} value={form.username} onChange={set('username')} />
          </label>
          <label>
            Password
            <input type="password" required minLength={8} value={form.password} onChange={set('password')} />
          </label>
          <label>
            Role
            <select value={form.role} onChange={set('role')}>
              {Object.values(ROLES).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          {!isAdminRole && (
            <label>
              Base
              <select required value={form.baseId} onChange={set('baseId')}>
                <option value="">Select base…</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </form>

        <div className="card">
          {users.error && <div className="alert alert-error">{users.error}</div>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Base</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {users.data?.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.username}</strong>
                    </td>
                    <td>
                      <span className={`badge badge-${u.role.toLowerCase()}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td>{u.base?.name ?? '—'}</td>
                    <td className="muted">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
