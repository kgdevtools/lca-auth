<p align="center">
  <picture>
    <source media="(min-width: 1024px)" srcset="./public/lca_mark.svg" />
    <img src="./public/lca_mark.svg" alt="Limpopo Chess Academy" style="max-width: 820px; width: 90%; height: auto;" />
  </picture>

  <br />
  <strong>Limpopo Chess Academy website and related assets are being developed here.</strong>
  <br />
</p>

### Project Structure

```txt
.
├─ public/
│  ├─ lca_logo_svg.svg
│  └─ lca_mark.svg
├─ src/
│  ├─ app/
│  │  ├─ auth/
│  │  │  ├─ callback/route.ts
│  │  │  └─ confirm/route.ts
│  │  ├─ error/page.tsx
│  │  ├─ forms/
│  │  │  ├─ PlayerRegistrationForm.tsx
│  │  │  ├─ page.tsx
│  │  │  └─ register-player/
│  │  │     ├─ action.ts
│  │  │     └─ route.ts
│  │  ├─ login/
│  │  │  ├─ page.tsx
│  │  │  └─ server-actions.ts
│  │  ├─ private/page.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ nav-links.tsx
│  │  ├─ submit-button.tsx
│  │  ├─ theme-toggle.tsx
│  │  └─ ui/
│  │     ├─ alert.tsx
│  │     ├─ avatar.tsx
│  │     ├─ button.tsx
│  │     └─ card.tsx
│  ├─ lib/
│  │  └─ utils.ts
│  └─ utils/
│     └─ supabase/
│        ├─ client.ts
│        ├─ middleware.ts
│        └─ server.ts
├─ middleware.ts
├─ next.config.ts
├─ package.json
├─ tsconfig.json
└─ README.md
```
