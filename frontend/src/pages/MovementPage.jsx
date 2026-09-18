import { useState } from 'react';
import { api, formatDate, today, useFetch } from '../api';
import { ROLES, useAuth } from '../context/AuthContext';
import Filters, { EMPTY_FILTERS } from '../components/Filters';

export default function MovementPage({ config }) {
  const { title, description, endpoint, dateField, submitLabel, isTransfer, extraFields = [] } = config;
  const { user, bases, equipmentTypes } = useAuth();
  const isAdmin = user.role === ROLES.ADMIN;

  const emptyForm = {
    baseId: '',
    toBaseId: '',
    equipmentTypeId: '',
    quantity: '',
    date: today(),
    ...Object.fromEntries(extraFields.map((f) => [f.name, ''])),
  };

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const list = useFetch(endpoint, filters);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const sourceBaseId = isAdmin ? Number(form.baseId) : user.baseId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    const body = {
      equipmentTypeId: Number(form.equipmentTypeId),
      quantity: Number(form.quantity),
      [dateField]: form.date,
      ...Object.fromEntries(extraFields.map((f) => [f.name, form[f.name] || undefined])),
    };
    if (isAdmin) body[isTransfer ? 'fromBaseId' : 'baseId'] = Number(form.baseId);
    if (isTransfer) body.toBaseId = Number(form.toBaseId);

    try {
      await api(endpoint, { method: 'POST', body });
      setMessage({ type: 'success', text: `${title.replace(/s$/, '')} recorded.` });
      setForm({ ...emptyForm, baseId: form.baseId, equipmentTypeId: form.equipmentTypeId });
      list.reload();
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
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </div>

      <div className="split">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>New entry</h2>

          {isAdmin && (
            <label>
              {isTransfer ? 'From base' : 'Base'}
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

          {isTransfer && (
            <label>
              To base
              <select required value={form.toBaseId} onChange={set('toBaseId')}>
                <option value="">Select destination…</option>
                {bases
                  .filter((b) => b.id !== sourceBaseId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </label>
          )}

          <label>
            Equipment type
            <select required value={form.equipmentTypeId} onChange={set('equipmentTypeId')}>
              <option value="">Select equipment…</option>
              {equipmentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </label>

          <div className="row">
            <label>
              Quantity
              <input type="number" min="1" step="1" required value={form.quantity} onChange={set('quantity')} />
            </label>
            <label>
              Date
              <input type="date" required value={form.date} onChange={set('date')} />
            </label>
          </div>

          {extraFields.map((f) => (
            <label key={f.name}>
              {f.label}
              <input
                required={f.required}
                placeholder={f.placeholder}
                value={form[f.name]}
                onChange={set(f.name)}
              />
            </label>
          ))}

          {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </form>

        <div className="stack">
          <Filters value={filters} onChange={setFilters} />
          {list.error && <div className="alert alert-error">{list.error}</div>}

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    {isTransfer ? (
                      <>
                        <th>From</th>
                        <th>To</th>
                      </>
                    ) : (
                      <th>Base</th>
                    )}
                    <th>Equipment</th>
                    <th className="num">Qty</th>
                    {extraFields.map((f) => (
                      <th key={f.name}>{f.label}</th>
                    ))}
                    <th>Recorded by</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row[dateField])}</td>
                      {isTransfer ? (
                        <>
                          <td>{row.fromBase.name}</td>
                          <td>{row.toBase.name}</td>
                        </>
                      ) : (
                        <td>{row.base.name}</td>
                      )}
                      <td>{row.equipmentType.name}</td>
                      <td className="num">
                        <strong>{row.quantity}</strong>
                      </td>
                      {extraFields.map((f) => (
                        <td key={f.name}>{row[f.name] || '—'}</td>
                      ))}
                      <td className="muted">{row.createdBy.username}</td>
                    </tr>
                  ))}
                  {!list.loading && list.data?.length === 0 && (
                    <tr>
                      <td colSpan={10} className="empty">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
