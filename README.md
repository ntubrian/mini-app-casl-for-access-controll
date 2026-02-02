# CASL + Next.js RBAC/ABAC Starter

Minimal Next.js (App Router) example that demonstrates role-based access control (RBAC) and attribute-based access control (ABAC) using CASL v6.

## Roles and access model

- **Sales BU**
  - Create orders.
  - Read orders in their business unit.
  - Update their own draft orders.
  - Read reports in their BU when `visibilityLevel <= user.level` (ABAC).
- **General Manager**
  - Read/update/approve orders within their region.
  - Read reports for their region.
  - Read users.
  - Cannot delete orders.
- **Admin**
  - Manage everything.

## Project structure (Nx monorepo)

- `apps/web` - Next.js app (frontend + API routes).
- `apps/web/src/lib/ability.ts` - Ability types, rules, and helpers.
- `apps/web/src/lib/ability-context.tsx` - React context and `<Can />` component bound to the context.
- `apps/web/src/app/page.tsx` - Demo UI that exercises permissions.
- `apps/api/src/index.ts` - Backend API service (Express, reads/writes Neon).
- `libs/db` - Drizzle schema + Neon connection.
- `libs/policies` - Policy templates shared by backend and frontend.

## CASL setup (how it works here)

1. **Define ability types and rules**  
   In `apps/web/src/lib/ability.ts`, we define the action/subject types and the rules based on the current user.

   - `defineRulesFor(user)` builds the rule set.
   - `buildAbilityFor(user)` creates an ability instance from those rules.

2. **Bind ability to React**  
   In `apps/web/src/lib/ability-context.tsx`, we create a React context and a contextual `<Can />` component:

   - `<AbilityProvider user={user}>` creates the ability and provides it.
   - `<Can I="read" this={orderSubject(order)}>` checks authorization in the UI.

3. **Use in the UI**  
   In `apps/web/src/app/page.tsx`, the demo renders orders and reports and shows what each role can do.

## Subject helpers and `__type`

This project uses helper functions:

```ts
export function orderSubject(order: Order) {
  return subject("Order", { ...order, __type: "Order" });
}
```

These helpers tag plain objects with a subject type so CASL can evaluate conditions like:

```ts
can("update", "Order", { ownerId: user.id });
```

The `abilityOptions.detectSubjectType` function reads `__type`, so **if you keep this setup** you must tag objects with `__type`.

## What if we do not use custom `__type`?

CASL has built-in subject type detection:

- If you call `subject("Order", order)`, CASL tags the object with an internal `__caslSubjectType__` field and uses that.
- If you pass a class instance, CASL can use `instance.constructor.name`.
- If you pass a string subject (e.g. `"Order"`), the string is used directly.

Plain object literals do not have a useful constructor name, so without tagging they would be treated as `"Object"` and your rules would not match.

### Options if you want to drop `__type`

1. **Use CASL tagging only**
   - Update helpers to: `subject("Order", order)` (no custom `__type`)
   - Remove `abilityOptions.detectSubjectType` so CASL uses its default detection.

2. **Use a different field**
   - Keep `detectSubjectType` but read another field such as `type` or `__typename`.

3. **Use classes**
   - Create domain classes (`class Order { ... }`) and pass instances instead of plain objects.

## Ability policy from API (frontend contract)

If the backend sends a policy, send serialized CASL rules and type them on the frontend.

```ts
// apps/web/src/lib/ability-policy.ts
import type { RawRuleOf } from "@casl/ability";
import type { AppAbility } from "./ability";

export type ApiAbilityRule = RawRuleOf<AppAbility>;

export interface AbilityPolicyResponse {
  rules: ApiAbilityRule[];
  version?: number;
  issuedAt?: string;
}
```

Client usage:

```ts
const res = await fetch("/api/ability");
const { rules } = (await res.json()) as AbilityPolicyResponse;
const ability = new AppAbility(rules, abilityOptions);
```

If you need a smaller payload, use `packRules` on the server and `unpackRules` on the client from `@casl/ability/extra`.

## Policy API (backend service)

This demo exposes a backend API (Express, serverless on Vercel) and returns three default policy sets (seeded on first run):

- `GET /api/ability?set=sales-focus&user=sales`
- `GET /api/ability?set=regional-manager&user=manager`
- `GET /api/ability?set=admin-lite&user=admin`

The UI exposes a policy picker and an "Update policy" button that swaps the in-memory ability rules with the API response.

## Neon + Drizzle persistence

Policies are stored in Postgres (Neon) with **policy set + version** tables:

- `policy_sets` stores the policy set key/name/description.
- `policy_versions` stores the JSON rules and version number.

API behavior:

- `GET /api/ability?set=...&user=...` returns the latest version and injects `$user.*` tokens.
- `POST /api/ability` creates a new version (raw rules JSON).
- `POST /api/policies/seed` seeds default policy sets and versions.

Default seeded rules use simple tokens like `$user.region` and `$user.level` which are resolved on the server before returning to the client.

### Schema + migrations

1) Set `DATABASE_URL` (see `.env.example`).
2) (Optional) If you run the API separately, set `NEXT_PUBLIC_API_BASE=http://localhost:4000`.
3) Generate migrations:

```bash
npm run db:generate
```

4) Push to Neon:

```bash
npm run db:push
```

## UI design notes

- `apps/web/src/app/globals.css` holds the theme tokens, layout utilities, and component styles for the demo UI.
- Fonts are loaded in `apps/web/src/app/layout.tsx` with `next/font/google` and wired to CSS variables.
- `apps/web/src/app/page.tsx` renders semantic sections and cards; the layout is responsive and uses light motion.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and switch roles to see the permissions applied.

## Local backend dev

Run the Express API locally:

```bash
npm run dev:api
```

Then run the frontend:

```bash
npm run dev
```

## Swagger / OpenAPI

- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`

## Vercel deployment (split frontend/backend)

Deploy as **two Vercel projects** (recommended for this monorepo):

### Backend (API)

1) New Project → select this repo.
2) Root Directory: `apps/api`
3) Framework Preset: Other
4) Build Command: leave empty
5) Environment Variables: `DATABASE_URL`
6) Deploy

### Frontend (Next)

1) New Project → select this repo.
2) Root Directory: `apps/web`
3) Framework Preset: Next.js
4) Environment Variables: `NEXT_PUBLIC_API_BASE=https://<your-api-domain>`
5) Deploy
