"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, Upload, CheckCircle2, X } from "lucide-react";
import { registerForTournament, getTournamentPlayers } from "./server-actions";
import type { RegTournament } from "../tournaments";
import type { PlayerRegistration } from "./server-actions";

// Kept in sync with /api/registration/player-search (defined locally to avoid
// pulling the server route's module graph into the client bundle).
interface PlayerSuggestion {
  surname: string;
  names: string;
  gender: string | null;
  chessaId: string | null;
  rating: number | null;
  uniqueNo: string | null;
  label: string;
}

interface FormState {
  surname: string;
  names: string;
  gender: string;
  chessaId: string;
  rating: string;
  section: string;
  contactName: string;
  contactNumber: string;
}

const EMPTY: FormState = {
  surname: "", names: "", gender: "", chessaId: "", rating: "", section: "", contactName: "", contactNumber: "",
};

/** South African mobile: 10 digits starting 0, or +27 followed by 9 digits. */
function normalizePhone(v: string): string {
  return v.replace(/[\s()-]/g, "");
}
function isValidSAPhone(v: string): boolean {
  return /^(?:\+27|0)\d{9}$/.test(normalizePhone(v));
}

const inputClass =
  "w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition";

// ── Scattered piece + LCA-mark watermark backdrop ───────────────────────────────
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-foreground">
      <svg width="0" height="0" className="absolute"><defs>
        <symbol id="rf-pawn" viewBox="0 0 100 130"><circle cx="50" cy="30" r="16"/><path d="M36 46 C 33 58 44 62 44 62 C 38 74 34 92 30 116 L70 116 C66 92 62 74 56 62 C 56 62 67 58 64 46 C 59 51 41 51 36 46 Z"/><rect x="22" y="112" width="56" height="14" rx="5"/></symbol>
        <symbol id="rf-rook" viewBox="0 0 100 130"><rect x="20" y="112" width="60" height="14" rx="4"/><path d="M30 112 L34 60 L66 60 L70 112 Z"/><rect x="27" y="54" width="46" height="8"/><path d="M28 56 L28 38 L38 38 L38 46 L46 46 L46 38 L54 38 L54 46 L62 46 L62 38 L72 38 L72 56 Z"/></symbol>
        <symbol id="rf-bishop" viewBox="0 0 100 130"><rect x="22" y="112" width="56" height="14" rx="5"/><ellipse cx="50" cy="66" rx="19" ry="5"/><path d="M40 112 C 33 86 38 58 50 40 C 62 58 67 86 60 112 Z"/><circle cx="50" cy="34" r="7"/></symbol>
        <symbol id="rf-king" viewBox="0 0 100 130"><rect x="20" y="112" width="60" height="14" rx="5"/><path d="M32 112 C 27 84 36 62 50 58 C 64 62 73 84 68 112 Z"/><ellipse cx="50" cy="64" rx="21" ry="5"/><rect x="37" y="40" width="26" height="16" rx="3"/><rect x="46" y="14" width="8" height="26"/><rect x="38" y="22" width="24" height="8"/></symbol>
        <symbol id="rf-knight" viewBox="0 0 100 130"><rect x="22" y="112" width="56" height="14" rx="5"/><path fillRule="evenodd" d="M34 112 C 30 92 30 80 40 72 C 30 70 28 60 34 52 C 40 40 52 30 60 22 C 58 30 62 32 66 32 C 74 34 80 44 80 60 C 80 78 74 96 76 112 Z M44 52 C 40 56 40 60 44 62 C 48 60 48 54 44 52 Z"/></symbol>
      </defs></svg>
      {[
        ["rf-king", "-2%", "6%", "12vmin"], ["rf-bishop", "86%", "10%", "12vmin"],
        ["rf-knight", "60%", "3%", "10vmin"], ["rf-pawn", "30%", "16%", "8vmin"],
        ["rf-rook", "4%", "40%", "11vmin"], ["rf-bishop", "82%", "44%", "11vmin"],
        ["rf-pawn", "48%", "54%", "9vmin"], ["rf-knight", "14%", "70%", "11vmin"],
        ["rf-rook", "90%", "74%", "11vmin"], ["rf-pawn", "36%", "84%", "8vmin"],
        ["rf-bishop", "66%", "88%", "10vmin"], ["rf-pawn", "2%", "90%", "8vmin"],
      ].map(([id, left, top, w], i) => (
        <svg key={i} viewBox="0 0 100 130" className="absolute fill-current opacity-[0.07] dark:opacity-[0.06]" style={{ left, top, width: w }}>
          <use href={`#${id}`} />
        </svg>
      ))}
    </div>
  );
}

// ── Smart autofill field ────────────────────────────────────────────────────────
function SmartField({
  id, label, required, value, placeholder, onChange, onPick,
}: {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onPick: (s: PlayerSuggestion) => void;
}) {
  const [sugs, setSugs] = useState<PlayerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focused.current || value.trim().length < 2) { setSugs([]); setOpen(false); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/registration/player-search?q=${encodeURIComponent(value.trim())}`);
        const j = await r.json();
        setSugs(j.players ?? []);
        setOpen((j.players ?? []).length > 0);
      } catch { setSugs([]); }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value]);

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        className={inputClass}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; setTimeout(() => setOpen(false), 150); }}
        onChange={(e) => onChange(e.target.value)}
      />
      {open && sugs.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-xl">
          {sugs.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => { e.preventDefault(); focused.current = false; setOpen(false); onPick(s); }}
              >
                <span className="min-w-0 break-words">{s.surname}{s.names ? `, ${s.names}` : ""}</span>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground pt-0.5">
                  {s.chessaId ? `#${s.chessaId}` : ""}{s.rating != null ? ` · ${s.rating}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────────
export function RegistrationForm({ tournament }: { tournament: RegTournament }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [sourceUniqueNo, setSourceUniqueNo] = useState("");
  const [popName, setPopName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [successData, setSuccessData] = useState<{
    player: PlayerRegistration;
    players: PlayerRegistration[];
  } | null>(null);
  const [sectionFilter, setSectionFilter] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const contactTouched = useRef(false);

  const set = useCallback((k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v })), []);

  // Auto-fill contactName from player name (unless manually edited)
  useEffect(() => {
    if (!contactTouched.current) {
      const fullName = [form.names, form.surname].filter(Boolean).join(" ");
      if (fullName && form.contactName !== fullName) {
        setForm((f) => ({ ...f, contactName: fullName }));
      }
    }
  }, [form.names, form.surname, form.contactName]);

  const onPick = useCallback((s: PlayerSuggestion) => {
    setForm((f) => ({
      ...f,
      surname: s.surname || f.surname,
      names: s.names || f.names,
      gender: s.gender || f.gender,
      chessaId: s.chessaId || "",
      rating: s.rating != null ? String(s.rating) : "",
      contactName: [s.names, s.surname].filter(Boolean).join(" ") || f.contactName,
    }));
    setSourceUniqueNo(s.uniqueNo || "");
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) { setPopName(null); return; }
    if (f.size > 5 * 1024 * 1024) {
      setMessage({ text: "Proof of payment must be 5MB or smaller.", error: true });
      if (fileRef.current) fileRef.current.value = "";
      setPopName(null);
      return;
    }
    setPopName(f.name);
    setMessage(null);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    if (!form.surname.trim()) return setMessage({ text: "Surname is required.", error: true });
    if (!form.names.trim()) return setMessage({ text: "Name(s) is required.", error: true });
    if (!form.contactName.trim()) return setMessage({ text: "Contact name is required.", error: true });
    if (!form.contactNumber.trim()) return setMessage({ text: "Contact number is required.", error: true });
    if (!isValidSAPhone(form.contactNumber)) {
      return setMessage({ text: "Enter a valid SA number (e.g. 082 123 4567 or +27 82 123 4567).", error: true });
    }
    if (!form.section) return setMessage({ text: "Please choose a section.", error: true });

    const fd = new FormData();
    fd.set("slug", tournament.slug);
    fd.set("surname", form.surname);
    fd.set("names", form.names);
    fd.set("gender", form.gender);
    fd.set("chessaId", form.chessaId);
    fd.set("rating", form.rating);
    fd.set("section", form.section);
    fd.set("contactName", form.contactName);
    fd.set("contactNumber", normalizePhone(form.contactNumber));
    fd.set("sourceUniqueNo", sourceUniqueNo);
    const file = fileRef.current?.files?.[0];
    if (file) fd.set("pop", file);

    setSubmitting(true);
    const res = await registerForTournament(fd);
    if (res.error) {
      setSubmitting(false);
      setMessage({ text: res.error, error: true });
      return;
    }
    if (!res.player) {
      setSubmitting(false);
      setMessage({ text: "Registration failed. Please try again.", error: true });
      return;
    }
    const allPlayers = await getTournamentPlayers(tournament.slug);
    setSubmitting(false);
    setSuccessData({ player: res.player, players: allPlayers });
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Backdrop />

      <div className="mx-auto w-full max-w-[560px] px-3 pt-5 pb-16">
        {/* ── Poster ── */}
        <div className="w-full">
          <Image src={tournament.posterLight} alt={tournament.name} width={794} height={1123}
            priority className="block dark:hidden w-full h-auto" />
          <Image src={tournament.posterDark} alt={tournament.name} width={794} height={1123}
            priority className="hidden dark:block w-full h-auto" />
        </div>

        {/* ── Form panel (below poster, no overlap) ── */}
        <div className="relative z-10 mt-6">
          <div className="rounded-xl border border-border bg-card shadow-xl">
            <div className="px-5 pt-6 pb-3 border-b border-border">
              <h1 className="text-xl font-bold tracking-tight">Register Online</h1>
              <p className="text-sm text-muted-foreground">{tournament.name} · {tournament.dateLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Registration closes {tournament.regDeadline}</p>
            </div>

            {successData ? (
              <div className="px-5 pb-6 pt-5">
                <div className="text-center mb-6">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600 dark:text-green-400" />
                  <h2 className="text-lg font-semibold">You&apos;re registered!</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Thanks {form.names} {form.surname} — we&apos;ve received your entry for {tournament.name}.
                    Please complete your EFT payment if you haven&apos;t.
                  </p>
                </div>

                {/* Section filter */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <button onClick={() => setSectionFilter("")}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                      sectionFilter === ""
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
                    }`}>All</button>
                  {tournament.sections.map((s) => (
                    <button key={s.code} onClick={() => setSectionFilter(s.code)}
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                        sectionFilter === s.code
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
                      }`}>{s.label}</button>
                  ))}
                </div>

                {/* Chess.com flat table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-primary/20">
                        <th className="text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 pb-2 w-8">#</th>
                        <th className="text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 pb-2">Name</th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 pb-2 w-14">Rating</th>
                        <th className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 pb-2 w-12 hidden sm:table-cell">Fed</th>
                        <th className="text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 pb-2 w-16">Sect.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sectionFilter
                        ? successData.players.filter((p) => p.section === sectionFilter)
                        : successData.players
                      ).length > 0 ? (
                        (sectionFilter
                          ? successData.players.filter((p) => p.section === sectionFilter)
                          : successData.players
                        ).map((player, i) => (
                          <tr key={player.id} className="border-b border-border/40">
                            <td className="py-1.5 text-sm text-muted-foreground align-middle w-8">{i + 1}</td>
                            <td className="py-1.5 text-sm text-foreground break-words align-middle pr-2">
                              <span>{player.surname}, {player.names}</span>
                              {player.id === successData.player.id && (
                                <span className="ml-1.5 text-[10px] font-medium text-primary bg-primary/10 px-1 py-0.5 rounded-sm">You</span>
                              )}
                            </td>
                            <td className="py-1.5 text-sm text-muted-foreground text-right align-middle whitespace-nowrap w-14">{player.rating ?? "–"}</td>
                            <td className="py-1.5 text-sm text-muted-foreground text-center align-middle whitespace-nowrap w-12 hidden sm:table-cell">RSA</td>
                            <td className="py-1.5 text-sm text-muted-foreground text-right align-middle whitespace-nowrap w-16">{player.section}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-sm text-muted-foreground text-center">No players in this section yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 text-right">{successData.players.length} registered player{successData.players.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="px-5 pb-6 pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SmartField id="surname" label="Surname" required value={form.surname}
                    placeholder="Start typing…" onChange={(v) => set("surname", v)} onPick={onPick} />
                  <SmartField id="names" label="Name(s)" required value={form.names}
                    placeholder="Start typing…" onChange={(v) => set("names", v)} onPick={onPick} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium mb-1">Gender</label>
                    <select id="gender" value={form.gender} onChange={(e) => set("gender", e.target.value)} className={inputClass}>
                      <option value="">—</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                  <SmartField id="chessaId" label="Chessa ID" value={form.chessaId}
                    placeholder="0" onChange={(v) => set("chessaId", v)} onPick={onPick} />
                  <div>
                    <label htmlFor="rating" className="block text-sm font-medium mb-1">Rating</label>
                    <input id="rating" inputMode="numeric" value={form.rating} placeholder="0"
                      onChange={(e) => set("rating", e.target.value.replace(/[^\d]/g, ""))} className={inputClass} />
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactName" className="block text-sm font-medium mb-1">Contact Name <span className="text-destructive">*</span></label>
                    <input id="contactName" type="text" value={form.contactName} placeholder="Auto-filled from player name"
                      onChange={(e) => { contactTouched.current = true; set("contactName", e.target.value); }} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="contactNumber" className="block text-sm font-medium mb-1">Contact Number <span className="text-destructive">*</span></label>
                    <input id="contactNumber" type="tel" inputMode="tel" value={form.contactNumber} placeholder="0XX XXX XXXX or +27…"
                      onChange={(e) => set("contactNumber", e.target.value)} className={inputClass} />
                  </div>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Section <span className="text-destructive">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {tournament.sections.map((s) => {
                      const active = form.section === s.code;
                      return (
                        <button key={s.code} type="button" onClick={() => set("section", s.code)}
                          className={`flex-1 min-w-[120px] rounded-md border px-3 py-2 text-left transition ${
                            active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:bg-accent"
                          }`}>
                          <span className="block text-sm font-semibold">{s.label} · R{s.fee}</span>
                          <span className="block text-xs text-muted-foreground">{s.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Proof of payment */}
                <div>
                  <label className="block text-sm font-medium mb-1">Proof of Payment</label>
                  <div className="flex items-center gap-2">
                    <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                      <Upload className="h-4 w-4" /> Upload (optional)
                    </button>
                    {popName ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                        {popName}
                        <button type="button" onClick={() => { if (fileRef.current) fileRef.current.value = ""; setPopName(null); }}
                          className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not Required</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">PDF or image, max 5MB.</p>
                </div>

                {message && (
                  <div className={`rounded-md border px-3 py-2 text-sm ${
                    message.error ? "border-destructive bg-destructive/10 text-destructive" : "border-primary bg-primary/10 text-primary"
                  }`}>{message.text}</div>
                )}

                <button type="submit" disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit Registration"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
