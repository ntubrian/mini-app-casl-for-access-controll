# CASL + Next.js RBAC/ABAC Starter

Minimal Next.js (App Router) example that demonstrates role-based access control (RBAC) and attribute-based access control (ABAC) using CASL v6.

## Roles & access model

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

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and switch roles to see the permissions applied.
