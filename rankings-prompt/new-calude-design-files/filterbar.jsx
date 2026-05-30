// FilterBar — search, category (with conditional age-group), and numeric ranges.
const { useState } = React;

const AGE_GROUPS = ["U08", "U10", "U12", "U14", "U16", "U18", "U20"];

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function NumField({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="num"
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function FilterBar({ filters, onChange, defaults }) {
  const set = (patch) => onChange({ ...filters, ...patch });
  const numPatch = (key, raw) => {
    if (raw.trim() === "") return set({ [key]: undefined });
    const n = Number(raw);
    if (Number.isFinite(n)) set({ [key]: n });
  };

  const isJuniors = filters.category === "juniors";

  const active =
    (filters.search && filters.search.length) ||
    (filters.category && filters.category !== "all") ||
    (filters.ageGroup && filters.ageGroup !== "all");

  return (
    <div className="filters">
      <div className="filter-top">
        <div className="search">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search players…"
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>

        <label className="field">
          <span>Category</span>
          <select
            className="sel"
            value={filters.category ?? "all"}
            onChange={(e) => {
              const v = e.target.value;
              set({ category: v, ageGroup: v === "juniors" ? (filters.ageGroup ?? "all") : undefined });
            }}
          >
            <option value="all">All</option>
            <option value="seniors">Seniors</option>
            <option value="juniors">Juniors</option>
          </select>
        </label>

        <label className="field" aria-hidden={!isJuniors}>
          <span>Age group</span>
          <select
            className="sel"
            disabled={!isJuniors}
            value={filters.ageGroup ?? "all"}
            onChange={(e) => set({ ageGroup: e.target.value })}
          >
            <option value="all">All juniors</option>
            {AGE_GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>

        {active && (
          <button type="button" className="clear-btn" onClick={() => onChange({ ...defaults })}>
            Reset filters
          </button>
        )}
      </div>

      <div className="filter-row">
        <NumField label="Min events" value={filters.minTournaments} onChange={(v) => numPatch("minTournaments", v)} placeholder="1" />
        <NumField label="Show rows" value={filters.limit} onChange={(v) => numPatch("limit", v)} placeholder="50" />
      </div>
    </div>
  );
}

window.FilterBar = FilterBar;
