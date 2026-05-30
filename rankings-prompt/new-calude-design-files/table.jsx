// Rankings table: grouped sortable header, rich identity cell, click-to-expand history.

const signed = (n) => (n >= 0 ? `+${n}` : String(n));
const f1 = (n) => (n == null ? "—" : n.toFixed(1));
const f2 = (n) => (n == null ? "—" : n.toFixed(2));
const fmtDate = (s) =>
  s ? new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : "—";

// ── perf sparkline (chronological, oldest → newest) ──────────────
function Sparkline({ values, w = 132, h = 34 }) {
  if (!values || values.length < 2) return <span className="spark"><span className="cap">—</span></span>;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => pad + (i * (w - 2 * pad)) / (values.length - 1);
  const y = (v) => pad + (1 - (v - min) / span) * (h - 2 * pad);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${pts} ${(w - pad).toFixed(1)},${h - pad}`;
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);
  return (
    <div className="spark">
      <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#spk)" />
        <polyline points={pts} fill="none" stroke="var(--accent-strong)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastX} cy={lastY} r="3" fill="var(--accent-strong)" stroke="var(--surface)" strokeWidth="1.5" />
      </svg>
      <span className="cap">{min}–{max}</span>
    </div>
  );
}

// ── expanded tournament history ──────────────────────────────────
function ExpandedPanel({ p, open }) {
  const chrono = [...p.appearances].slice().reverse();
  const idClass = p.identityKind === "fuzzy-match" ? "fuzzy" : p.identityKind === "fide_id" ? "fide" : "";
  const idLabel =
    p.identityKind === "unique_no" ? "Verified · unique no." :
    p.identityKind === "fide_id" ? "Matched · FIDE id" : "Fuzzy name match";

  return (
    <td className="expand-cell" colSpan={10}>
      <div className={"expand-grid" + (open ? " open" : "")}>
        <div className="expand-inner">
          <div className="expand-pad">
            {/* profile */}
            <aside className="profile">
              <div className="profile-name">{p.name}</div>
              <div className="profile-sub">
                {p.title && <span className="pf-tag" style={{ color: "var(--accent-strong)" }}>{p.title}</span>}
                <span className="pf-tag">{p.federation ?? "—"}</span>
                <span className="pf-tag">{p.sex ?? "—"}</span>
                <span className="pf-tag">b. {p.birthYear ?? "—"}</span>
              </div>

              <div className="profile-big">
                <span className="val">{p.avgPerf}</span>
                <span className="lab">avg<br />performance</span>
              </div>

              <div className="profile-stats">
                <div className="ps"><span className="l">Best</span><span className="v">{p.bestPerf}</span></div>
                <div className="ps"><span className="l">Tournament rating</span><span className="v">{p.avgSeed ?? "—"}</span></div>
                <div className="ps">
                  <span className="l">Δ vs rating</span>
                  <span className={"v " + (p.avgGap >= 0 ? "pos" : "neg")}>{signed(p.avgGap)}</span>
                </div>
                <div className="ps"><span className="l">FIDE</span><span className="v">{p.fideRating ?? "—"}</span></div>
                <div className="ps"><span className="l">Chess SA</span><span className="v">{p.currentRating ?? "—"}</span></div>
              </div>

              <div className="id-badge"><span className={"id-dot " + idClass} />{idLabel}</div>
            </aside>

            {/* history */}
            <div>
              <div className="history-head">
                <span className="history-title">Tournament history · {p.ratedTournaments} rated</span>
                <Sparkline values={chrono.map((a) => a.perf)} />
              </div>
              <table className="hist">
                <thead>
                  <tr>
                    <th className="l">Date</th>
                    <th className="l">Event</th>
                    <th>Rank</th>
                    <th>Pts</th>
                    <th>Rating</th>
                    <th>Perf</th>
                    <th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {p.appearances.map((a) => (
                    <tr key={a.tournamentId}>
                      <td className="l ev-date">{fmtDate(a.date)}</td>
                      <td className="l">
                        <div className="ev-name">{a.tournamentName}</div>
                        <div className="ev-loc">{a.district}, {a.province}</div>
                      </td>
                      <td>{a.rank ?? "—"}</td>
                      <td>{f1(a.points)}</td>
                      <td className="ev-date">{a.seed ?? "—"}</td>
                      <td style={{ fontWeight: 600, color: "var(--text-strong)" }}>{a.perf ?? "—"}</td>
                      <td className={a.gap >= 0 ? "delta pos" : "delta neg"}>
                        <span className="tri">{a.gap >= 0 ? "▲" : "▼"}</span>{signed(a.gap)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </td>
  );
}

// ── one player row + its expansion ───────────────────────────────
function PlayerRow({ p, rank, open, onToggle }) {
  const topClass = rank <= 3 ? " top" + rank : "";
  const delta = (n) =>
    n == null ? <span className="faint">—</span> :
    <span className={"delta " + (n >= 0 ? "pos" : "neg")}><span className="tri">{n >= 0 ? "▲" : "▼"}</span>{signed(n)}</span>;

  return (
    <React.Fragment>
      <tr className={"player-row" + (open ? " open" : "") + topClass} onClick={onToggle}>
        <td className="c-rank"><span className="rank-n">{rank}</span></td>
        <td className="c-name">
          <div className="name-wrap">
            <svg className="caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            <div className="name-main">
              <div className="name-line">
                <span className="pname">{p.name}</span>
                {p.title && <span className="title-badge">{p.title}</span>}
              </div>
              <div className="name-meta">
                <span className="fed">{p.federation ?? "—"}</span>
                <span className="dot">·</span><span>{p.sex ?? "—"}</span>
                <span className="dot">·</span><span>b. {p.birthYear ?? "—"}</span>
              </div>
            </div>
          </div>
        </td>
        <td className="num-cell hero group-start"><span className="hero-pill">{p.avgPerf}</span></td>
        <td className="num-cell dim">{p.bestPerf}</td>
        <td className="num-cell group-start">{p.ratedTournaments}</td>
        <td className="num-cell dim">{p.totalAppearances}</td>
        <td className="num-cell dim group-start">{p.avgSeed ?? "—"}</td>
        <td className="num-cell">{delta(p.avgGap)}</td>
        <td className="num-cell dim group-start">{p.fideRating ?? "—"}</td>
        <td className="num-cell dim">{p.currentRating ?? "—"}</td>
      </tr>
      <tr className="expand-row" aria-hidden={!open}>
        <ExpandedPanel p={p} open={open} />
      </tr>
    </React.Fragment>
  );
}

// ── sortable column header ───────────────────────────────────────
function SortTh({ field, label, sort, onSort, cls }) {
  const activeS = sort.field === field;
  return (
    <th className={"sortable " + (cls || "")} onClick={() => onSort(field)}>
      {label}
      {activeS && <span className="arr">{sort.dir === "desc" ? "▼" : "▲"}</span>}
    </th>
  );
}

function RankingsTable({ players, sort, onSort, openKey, onToggle }) {
  return (
    <div className="table-wrap">
      <div className="table-scroll scroll-x">
        <table className="rk">
          <thead>
            <tr className="grp">
              <th className="gl spacer" colSpan={2}></th>
              <th colSpan={2}>Performance</th>
              <th colSpan={2}>No. Tournaments</th>
              <th colSpan={2}>Tournament Rating</th>
              <th colSpan={2}>Rating</th>
            </tr>
            <tr className="col">
              <th className="gl c-rank">#</th>
              <SortTh field="name" label="Player" sort={sort} onSort={onSort} cls="gl c-name" />
              <SortTh field="avgPerf" label="Avg" sort={sort} onSort={onSort} cls="group-start" />
              <SortTh field="bestPerf" label="Best" sort={sort} onSort={onSort} />
              <SortTh field="ratedTournaments" label="Rated" sort={sort} onSort={onSort} cls="group-start" />
              <SortTh field="totalAppearances" label="Played" sort={sort} onSort={onSort} />
              <SortTh field="avgSeed" label="Avg" sort={sort} onSort={onSort} cls="group-start" />
              <SortTh field="avgGap" label="Δ" sort={sort} onSort={onSort} />
              <SortTh field="fideRating" label="FIDE" sort={sort} onSort={onSort} cls="group-start" />
              <SortTh field="currentRating" label="Chess SA" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <PlayerRow
                key={p.key}
                p={p}
                rank={i + 1}
                open={openKey === p.key}
                onToggle={() => onToggle(p.key)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

window.RankingsTable = RankingsTable;
