// Main view — filtering, sorting, expand state, and Tweaks (theme/density/accent).
const { useState, useMemo, useEffect } = React;

const DATA = window.RANKINGS_DATA;

const ACCENTS = { gold: 74, emerald: 152, azure: 250, rose: 12 };
const DENSITY = { Compact: "compact", Cosy: "", Comfy: "comfy" };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  dark: false,
  density: "Cosy",
  accent: "gold",
}/*EDITMODE-END*/;

const FILTER_DEFAULTS = { minTournaments: 1, limit: 50, category: "all" };

// age/category boundaries (reference: 2026 season)
const REF_YEAR = 2026;
const SENIOR_MAX_BIRTH = 1985; // born 1985 or earlier
const JUNIOR_MIN_BIRTH = 2006; // born 2006 or later (under 20)

function sortPlayers(list, sort) {
  const { field, dir } = sort;
  const mul = dir === "asc" ? 1 : -1;
  const val = (p) => {
    const v = p[field];
    if (field === "name") return v.toLowerCase();
    return v == null ? -Infinity : v;
  };
  return [...list].sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va < vb) return -1 * mul;
    if (va > vb) return 1 * mul;
    return b.avgPerf - a.avgPerf; // stable-ish tiebreak
  });
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const [sort, setSort] = useState({ field: "avgPerf", dir: "desc" });
  const [openKey, setOpenKey] = useState(null);

  // apply theme / density / accent to <html>
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", t.dark ? "dark" : "light");
    const d = DENSITY[t.density] ?? "";
    if (d) el.setAttribute("data-density", d); else el.removeAttribute("data-density");
    el.style.setProperty("--accent-h", ACCENTS[t.accent] ?? 74);
  }, [t.dark, t.density, t.accent]);

  const players = useMemo(() => {
    const q = (filters.search ?? "").trim().toLowerCase();

    let out = DATA.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;

      if (filters.category === "seniors") {
        if (!(p.birthYear != null && p.birthYear <= SENIOR_MAX_BIRTH)) return false;
      } else if (filters.category === "juniors") {
        if (!(p.birthYear != null && p.birthYear >= JUNIOR_MIN_BIRTH)) return false;
        if (filters.ageGroup && filters.ageGroup !== "all") {
          const maxAge = Number(filters.ageGroup.replace(/\D/g, ""));
          const minBirth = REF_YEAR - maxAge;
          if (!(p.birthYear >= minBirth)) return false;
        }
      }

      if (filters.minTournaments != null && p.ratedTournaments < filters.minTournaments) return false;
      return true;
    });

    out = sortPlayers(out, sort);
    return out.slice(0, filters.limit ?? 50);
  }, [filters, sort]);

  const onSort = (field) => {
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "desc" ? "asc" : "desc" }
        : { field, dir: field === "name" ? "asc" : "desc" }
    );
  };

  const onToggle = (key) => setOpenKey((k) => (k === key ? null : key));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Player Rankings</h1>
          <p className="page-sub">
            <b>{players.length}</b> players · ranked by average performance rating
          </p>
        </div>
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        defaults={FILTER_DEFAULTS}
      />

      {players.length === 0 ? (
        <p style={{ marginTop: 40, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          No players match the current filters.
        </p>
      ) : (
        <RankingsTable
          players={players}
          sort={sort}
          onSort={onSort}
          openKey={openKey}
          onToggle={onToggle}
        />
      )}

      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak("dark", v)} />
        <TweakRadio
          label="Density"
          value={t.density}
          options={["Compact", "Cosy", "Comfy"]}
          onChange={(v) => setTweak("density", v)}
        />
        <TweakSection label="Accent" />
        <TweakRadio
          label="Hue"
          value={t.accent}
          options={["gold", "emerald", "azure", "rose"]}
          onChange={(v) => setTweak("accent", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
