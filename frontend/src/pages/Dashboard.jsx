import { useState } from 'react';
import { useFetch } from '../api';
import { ROLES, useAuth } from '../context/AuthContext';
import Filters, { EMPTY_FILTERS } from '../components/Filters';

const signed = (n) => (n > 0 ? `+${n}` : String(n));

export default function Dashboard() {
  const { user, baseName } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { data, error, loading } = useFetch('/assets/dashboard', filters);

  const scope =
    user.role === ROLES.ADMIN
      ? filters.baseId
        ? baseName(Number(filters.baseId))
        : 'All bases'
      : baseName(user.baseId);
  const totals = data?.totals ?? {};

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Stock position for {scope}</p>
        </div>
      </div>

      <Filters value={filters} onChange={setFilters} />
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats">
        <Stat label="Opening Balance" value={totals.openingBalance} />
        <Stat
          label="Net Movement"
          value={totals.netMovement}
          hint={`${totals.purchases ?? 0} purchased · ${totals.transfersIn ?? 0} in · ${totals.transfersOut ?? 0} out`}
          tone={totals.netMovement < 0 ? 'negative' : 'positive'}
        />
        <Stat label="Assigned" value={totals.assigned} />
        <Stat label="Expended" value={totals.expended} />
        <Stat label="Closing Balance" value={totals.closingBalance} highlight />
      </div>

      <p className="formula muted">
        Net Movement = Purchases + Transfers In − Transfers Out &nbsp;·&nbsp; Closing = Opening + Net
        Movement − Assigned − Expended
      </p>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Category</th>
                <th className="num">Opening</th>
                <th className="num">Purchases</th>
                <th className="num">Transfers In</th>
                <th className="num">Transfers Out</th>
                <th className="num">Net Movement</th>
                <th className="num">Assigned</th>
                <th className="num">Expended</th>
                <th className="num">Closing</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((row) => (
                <tr key={row.equipmentType.id}>
                  <td>
                    <strong>{row.equipmentType.name}</strong>
                  </td>
                  <td>
                    <span className="badge">{row.equipmentType.category}</span>
                  </td>
                  <td className="num">{row.openingBalance}</td>
                  <td className="num">{row.purchases}</td>
                  <td className="num">{row.transfersIn}</td>
                  <td className="num">{row.transfersOut}</td>
                  <td className={`num ${row.netMovement < 0 ? 'negative' : row.netMovement > 0 ? 'positive' : ''}`}>
                    {signed(row.netMovement)}
                  </td>
                  <td className="num">{row.assigned}</td>
                  <td className="num">{row.expended}</td>
                  <td className="num">
                    <strong>{row.closingBalance}</strong>
                  </td>
                </tr>
              ))}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={10} className="empty">
                    No equipment types yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint, tone, highlight }) {
  return (
    <div className={`stat ${highlight ? 'stat-highlight' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone ?? ''}`}>{value ?? '—'}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
