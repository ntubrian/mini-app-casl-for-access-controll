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

## Project structure

- `src/lib/ability.ts` - Ability types, rules, and helpers.
- `src/lib/ability-context.tsx` - React context and `<Can />` component bound to the context.
- `src/app/page.tsx` - Demo UI that exercises permissions.

## CASL setup (how it works here)

1. **Define ability types and rules**  
   In `src/lib/ability.ts`, we define the action/subject types and the rules based on the current user.

   - `defineRulesFor(user)` builds the rule set.
   - `buildAbilityFor(user)` creates an ability instance from those rules.

2. **Bind ability to React**  
   In `src/lib/ability-context.tsx`, we create a React context and a contextual `<Can />` component:

   - `<AbilityProvider user={user}>` creates the ability and provides it.
   - `<Can I="read" this={orderSubject(order)}>` checks authorization in the UI.

3. **Use in the UI**  
   In `src/app/page.tsx`, the demo renders orders and reports and shows what each role can do.

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
// src/lib/ability-policy.ts
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

## Mock policy API

This demo includes a mock endpoint that returns three different policy sets:

- `GET /api/ability?set=sales-focus&user=sales`
- `GET /api/ability?set=regional-manager&user=manager`
- `GET /api/ability?set=admin-lite&user=admin`

The UI exposes a policy picker and an "Update policy" button that swaps the in-memory ability rules with the API response.

## UI design notes

- `src/app/globals.css` holds the theme tokens, layout utilities, and component styles for the demo UI.
- Fonts are loaded in `src/app/layout.tsx` with `next/font/google` and wired to CSS variables.
- `src/app/page.tsx` renders semantic sections and cards; the layout is responsive and uses light motion.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and switch roles to see the permissions applied.
