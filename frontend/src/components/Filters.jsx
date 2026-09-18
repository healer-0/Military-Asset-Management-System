import { ROLES, useAuth } from '../context/AuthContext';

export const EMPTY_FILTERS = { baseId: '', equipmentTypeId: '', startDate: '', endDate: '' };

export default function Filters({ value, onChange }) {
  const { user, bases, equipmentTypes } = useAuth();
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const hasFilters = Object.values(value).some(Boolean);

  return (
    <div className="filters">
      {user.role === ROLES.ADMIN && (
        <label>
          Base
          <select value={value.baseId} onChange={set('baseId')}>
            <option value="">All bases</option>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Equipment type
        <select value={value.equipmentTypeId} onChange={set('equipmentTypeId')}>
          <option value="">All equipment</option>
          {equipmentTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        From
        <input type="date" value={value.startDate} max={value.endDate || undefined} onChange={set('startDate')} />
      </label>
      <label>
        To
        <input type="date" value={value.endDate} min={value.startDate || undefined} onChange={set('endDate')} />
      </label>
      {hasFilters && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear
        </button>
      )}
    </div>
  );
}
