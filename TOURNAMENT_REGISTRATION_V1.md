# Tournament Registration — V1 Draft

## The Problem

Regional chess organisers (and LCA) currently use Google Forms for player registration. The critical missing piece is **intelligent player lookup** — parents and coaches cannot remember their Chess SA ID or FIDE ID, and manually searching rating lists is a barrier.

Google Forms cannot query our ratings database. We can.

---

## Core Value Proposition

When a player starts typing their name in the registration form, a dropdown appears showing matches from our ratings database (`active_players_august_2025_profiles`). Selecting their name auto-fills:

- **Chess SA ID** (UNIQUE_NO)
- **FIDE ID** (if available)
- **Current Rating** (RATING)

This already exists on the `/profile` page via `PlayerSearchCombobox`. We reuse it here.

---

## V1 Scope

### Organiser Flow

1. Organiser visits a tournament creation page (no login required for now)
2. Fills in tournament details:
   - Tournament name, date, location
   - Organiser name + contact
   - Poster image (Cloudinary upload — already works)
   - Tournament sections (name + entry fee as display text)
   - Which fields to include on the registration form (toggles)
3. On submit: a unique registration URL is generated — e.g. `/register/limpopo-open-2026`
4. Organiser copies the link and shares it (WhatsApp, email, social media)

### Player Flow

1. Player opens the registration link (from tournament poster, events page, or shared URL)
2. Page shows:
   - Tournament poster header + name, date, location
   - Registration form with **smart name field** (search combobox → autofills IDs + rating)
   - Remaining fields based on tournament config (DOB, phone, section selector, emergency contact, etc.)
3. Player submits → confirmation shown + their details displayed
4. Data stored in Supabase `tournament_registrations` table

### Admin/Organiser Access to Registrations

- All registrations visible in existing admin dashboard
- **Download CSV** button per tournament — organiser imports to their own Google Sheet if needed
- Optionally: show a public "who's registered" list on the tournament page (like current LCA Open 2025 form does)

---

## What We Reuse

| Component | Where | Notes |
|---|---|---|
| `PlayerSearchCombobox` | `src/components/ui/player-search-combobox.tsx` | Drop in as-is |
| `searchPlayers()` | `src/app/user/tournament-actions.ts` | Already queries ratings DB |
| `UpcomingTournamentForm` | `src/components/forms/UpcomingTournamentForm.tsx` | Extend for step 1 |
| Cloudinary poster upload | `/api/upload-poster` | Already works |
| `upcomingTournamentRepo` | `src/repositories/upcomingTournamentRepo.ts` | Extend with new fields |
| LCA Open 2025 form layout | `src/app/forms/tournament-registration/` | Reference for form structure |

---

## Database Changes (V1)

### Extend `upcoming_tournaments`
- `registration_slug` TEXT UNIQUE — URL-friendly identifier
- `use_hosted_form` BOOLEAN DEFAULT false — enables the built-in form
- `form_config` JSONB — field toggles + section definitions

### New `tournament_registrations` table
- `tournament_id` → links to `upcoming_tournaments`
- `player_name`, `chessa_id`, `fide_id`, `rating`
- `dob`, `phone`, `gender`, `club`, `city`
- `section`, `emergency_name`, `emergency_phone`, `comments`
- `created_at`

### `form_config` shape (example)
```json
{
  "fields": {
    "dob": true,
    "phone": true,
    "chessa_id": true,
    "fide_id": false,
    "rating": true,
    "gender": false,
    "club": false,
    "emergency_contact": true,
    "comments": false
  },
  "sections": [
    { "id": "A", "label": "A Section", "description": "Open", "fee_display": "R300" },
    { "id": "Juniors", "label": "Juniors", "description": "U14", "fee_display": "R150" }
  ]
}
```

---

## New Files

| File | Purpose |
|---|---|
| `src/app/register/[slug]/page.tsx` | Server: load tournament by slug, render form |
| `src/app/register/[slug]/RegistrationFormClient.tsx` | Client: smart form with PlayerSearchCombobox |
| `src/app/register/[slug]/server-actions.ts` | `submitRegistration()` action |
| `src/app/forms/upcoming-tournament/configure/page.tsx` | Form config step (field toggles, sections) |

---

## Slug Generation

Tournament name → URL slug + short suffix:
`"Limpopo Open 2026"` → `limpopo-open-2026-x7k2`

Generated at tournament creation using `nanoid(4)` for uniqueness.

---

## Open Questions (Deferred)

- **Google Sheets sync**: Still wanted by some organisers. Revisit in V2 — likely service account approach where we own the Sheet and share it to their email, no organiser auth required.
- **Monetization**: Entry fee collection via Stripe Connect. V2.
- **Organiser accounts**: Login + dashboard for managing their own tournaments and viewing registrations. V2.
- **Custom fields**: Letting organisers add arbitrary form fields beyond the standard chess template. V2.
- **Email notifications**: Email organiser on each registration, or daily digest. V2.
- **Registration closing**: Auto-close when tournament date passes or manually by admin.
- **Duplicate prevention**: Stop the same player registering twice for the same tournament.

---

## Success Criteria (V1)

- [ ] Organiser fills in tournament details → gets a shareable `/register/[slug]` link
- [ ] Player visits link → sees tournament poster + registration form
- [ ] Typing a name shows a dropdown of matching players from the ratings database
- [ ] Selecting a player autofills Chess SA ID and rating
- [ ] Form submits → row in `tournament_registrations` table
- [ ] Confirmation shown with player's details + current registrant list
- [ ] Admin can see all registrations and download CSV
