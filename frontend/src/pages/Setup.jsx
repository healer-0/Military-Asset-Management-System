import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Setup() {
  const { bases, equipmentTypes, refreshLookups } = useAuth();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Bases & Equipment</h1>
          <p className="muted">Manage the bases and the equipment types tracked in stock.</p>
        </div>
      </div>

      <div className="grid-2">
        <Section
          title="Bases"
          endpoint="/assets/bases"
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'location', label: 'Location' },
          ]}
          rows={bases}
          onCreated={refreshLookups}
        />
        <Section
          title="Equipment types"
          endpoint="/assets/equipment-types"
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'category', label: 'Category', required: true, placeholder: 'WEAPON, VEHICLE…' },
          ]}
          rows={equipmentTypes}
          onCreated={refreshLookups}
        />
      </div>
    </>
  );
}

function Section({ title, endpoint, fields, rows, onCreated }) {
  const emptyForm = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]));
      await api(endpoint, { method: 'POST', body });
      setForm(emptyForm);
      setMessage({ type: 'success', text: 'Added.' });
      await onCreated();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="card">
      <h2>{title}</h2>
      <form className="inline-form" onSubmit={handleSubmit}>
        {fields.map((f) => (
          <input
            key={f.name}
            required={f.required}
            placeholder={f.placeholder ?? f.label}
            value={form[f.name]}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
          />
        ))}
        <button className="btn btn-primary">Add</button>
      </form>
      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {fields.map((f) => (
                <th key={f.name}>{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {fields.map((f) => (
                  <td key={f.name}>{row[f.name] || '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
