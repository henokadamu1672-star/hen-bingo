# Hen@ Bingo

A simple customer messaging website with a protected admin inbox.

## Run locally

```bash
npm install
ADMIN_PASSWORD="change-this" npm start
```

Open `http://localhost:3000`.

Admin: `http://localhost:3000/admin`

Default admin username: `admin` (or set `ADMIN_USER`).

## Render / online hosting

Set these environment variables:

- `ADMIN_USER` — admin username
- `ADMIN_PASSWORD` — strong admin password
- `DATABASE_URL` — PostgreSQL connection string

`DATABASE_URL` is recommended for production so messages survive restarts/deploys. Without it, the app uses a local JSON file, which is suitable for local testing only.
