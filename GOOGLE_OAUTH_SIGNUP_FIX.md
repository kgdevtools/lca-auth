# Fix: Google OAuth Signup Flow

## Context

`signUpWithGoogle()` validates `tournament_fullname` from FormData before initiating OAuth — but the Google form in `/signup/page.tsx` has no such input field, so `formData.get('tournament_fullname')` is always null, triggering an immediate redirect to an error message. OAuth never starts.

Secondary issue: a brand-new OAuth user who somehow did get through would land at `/user` with no `profiles` row — the callback reads the profile but never inserts one for new users.

**Intended outcome:** Clicking "Sign Up with Google" initiates OAuth cleanly. After Google authenticates the user, if they are new, create their profile from Google metadata and redirect them to a "complete your profile" page to collect `tournament_fullname`. No database queries happen client-side.

---

## Files to Change

| File | Action |
|------|--------|
| `src/app/signup/server-actions.ts` | Rewrite `signUpWithGoogle` |
| `src/app/auth/callback/route.ts` | Rewrite profile-check logic |
| `src/app/signup/complete-profile/page.tsx` | **New** — onboarding form |
| `src/app/signup/complete-profile/actions.ts` | **New** — server action |
| `src/app/signup/page.tsx` | No changes needed |

---

## Step 1 — `src/app/signup/server-actions.ts`

Remove lines 8–77 (the entire old `signUpWithGoogle`). Replace with a function that mirrors `signInWithGoogle` from `src/app/login/server-actions.ts`.

Copy the `getRedirectUrl` private helper verbatim from `login/server-actions.ts` (lines 7–25) into this file. Remove the `cookies` import if it becomes unused (check: `signUpWithEmail` at line 118 still uses it — keep it).

New `signUpWithGoogle`:
```ts
export async function signUpWithGoogle() {
  try {
    const supabase = await createClientForServerAction()
    const redirectTo = await getRedirectUrl()
    if (!redirectTo) return { error: 'Unable to determine redirect URL. Please try again.' }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

    if (error) return { error: error.message }
    if (!data?.url) return { error: 'Failed to initiate Google sign up. Please try again.' }
    return { url: data.url }
  } catch (error) {
    console.error('signUpWithGoogle unexpected error:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}
```

The `handleGoogleSubmit` handler in `page.tsx` already handles `{ url }` / `{ error }` — no client changes needed.

---

## Step 2 — `src/app/auth/callback/route.ts`

Replace the profile-lookup and signup-cookie block (lines 49–96) with new logic:

```ts
// Look up the profile
const { data: profile } = await supabase
  .from('profiles')
  .select('role, tournament_fullname')
  .eq('id', user.id)
  .single()

// New user — insert profile from Google metadata, then complete onboarding
if (!profile) {
  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    // role intentionally omitted — admin assigns coach or student after signup
  })
  if (insertError) console.error('Profile insert failed:', insertError)

  const response = NextResponse.redirect(new URL('/signup/complete-profile', request.url))
  cookiesToWrite.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}

// Existing user but onboarding incomplete
if (!profile.tournament_fullname) {
  const response = NextResponse.redirect(new URL('/signup/complete-profile', request.url))
  cookiesToWrite.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}

// Fully onboarded — route by role
const isAdmin = profile.role === 'admin'
let redirectPath = isAdmin ? '/admin/admin-dashboard' : '/user'
```

Remove the `is_signup` / `signup_tournament_fullname` / `signup_chessa_id` cookie reads and clears entirely.

The password-reset branch and final redirect response below remain unchanged — they already reference `redirectPath`.

---

## Step 3 — `src/app/signup/complete-profile/actions.ts` (new)

```ts
"use server"

import { createClientForServerAction } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function completeProfile(formData: FormData) {
  const tournamentFullName = (formData.get('tournament_fullname') as string)?.trim()
  const chessaId = (formData.get('chessa_id') as string)?.trim() || null

  if (!tournamentFullName) {
    redirect('/signup/complete-profile?message=Tournament Full Name is required')
  }

  const supabase = await createClientForServerAction()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, tournament_fullname: tournamentFullName, chessa_id: chessaId },
             { onConflict: 'id' })

  if (error) redirect('/signup/complete-profile?message=Failed to save profile. Please try again.')

  redirect('/user')
}
```

`user.id` comes from the server-side JWT — never from form input.

---

## Step 4 — `src/app/signup/complete-profile/page.tsx` (new)

Server component. Matches styling of `/signup/page.tsx` (same `Card` shell, pawn background images, `Input`/`Button` classes).

Structure:
1. Auth guard — `createClient()` + `supabase.auth.getUser()` → redirect to `/login` if no session
2. Profile guard — if `profile.tournament_fullname` already set → redirect to `/user`
3. Render card with:
   - `searchParams.message` displayed in red Alert (same pattern as signup page)
   - `Tournament Full Name` input (required)
   - `CHESSA ID` input (optional)
   - Submit button bound via `<form action={completeProfile}>`

---

## Post-Fix Flow

1. User clicks "Sign Up with Google" → OAuth initiates, no form fields required
2. Google authenticates → callback at `/auth/callback?code=…`
3. **New user:** INSERT profile (name/avatar from Google, role: 'student') → `/signup/complete-profile`
4. **Returning, incomplete:** profile exists but `tournament_fullname` null → `/signup/complete-profile`
5. **Returning, complete:** profile has `tournament_fullname` → `/user` or `/admin/admin-dashboard`
6. On `/signup/complete-profile`: submit Tournament Full Name → `completeProfile` upserts → `/user`

---

## Verification

1. Click "Sign Up with Google" on `/signup` — should redirect to Google (no error message)
2. Complete Google auth — should land on `/signup/complete-profile`
3. Submit without Tournament Full Name — should show validation error
4. Submit with Tournament Full Name — should land on `/user`
5. Sign out, sign back in with same Google account — should land on `/user` directly (profile complete)
6. Check Supabase `profiles` table — row should have `full_name`, `avatar_url`, `role: student`, `tournament_fullname` set
7. `tsc --noEmit` — no type errors
