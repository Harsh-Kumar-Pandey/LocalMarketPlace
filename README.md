# Local Market (Next.js + PostgreSQL)

1. `createdb marketplace && psql marketplace -f schema.sql`  (creates tables + seed users)
2. `cp .env.local.example .env.local` and fix DATABASE_URL
3. `npm install && npm run dev` -> http://localhost:3000

Sign in from the Home page as a seller (Asha / Ravi) or buyer (Meera). Dummy auth = a `uid` cookie; RBAC is checked in each API route via `requireRole()`.

| Route | Who |
|---|---|
| GET /api/products | anyone |
| GET /api/products?mine=1, POST /api/products | seller |
| PUT, DELETE /api/products/:id | owner seller or admin (DELETE is a soft delete) |
| GET, POST /api/orders | buyer (POST is one transaction, locks rows, decrements stock) |
| GET /api/categories, GET/POST/DELETE /api/session | anyone |
