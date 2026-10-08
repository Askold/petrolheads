# Petrolheads

Telegram Mini App for our car group: driver profiles, garages, and verified lap-time leaderboards, styled after mid-2000s street racing games.

```
backend/   Kotlin + Ktor API, Telegram bot webhook, PostgreSQL (Exposed + Flyway)
frontend/  React + Vite + Tailwind + Motion, served by Caddy
docker-compose.yml  db + backend + web (Caddy with automatic HTTPS)
```

## How auth works

Telegram passes signed `initData` to the Mini App. The frontend sends it as
`Authorization: tma <initData>`. The backend checks the HMAC against `BOT_TOKEN` and, when
`GROUP_CHAT_ID` is set, uses `getChatMember` to confirm the user belongs to the group. There are no passwords or sessions.

## Local development

```bash
cp .env.example .env   # then set DEV_AUTH=true, DOMAIN=http://localhost, BOT_TOKEN=dev
docker compose up -d db
```

Backend: run `app.petrolheads.ApplicationKt` from IntelliJ with env `DEV_AUTH=true;DATABASE_PASSWORD=<same as .env>`,
or `cd backend && ./gradlew run`.

Frontend:

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. Outside Telegram the dev build sends `tma dev`, which the backend accepts only with
`DEV_AUTH=true`. That dev user is an admin.

To try it inside Telegram before deploying, expose the Vite port with a tunnel (`cloudflared tunnel --url http://localhost:5173`)
and set that URL as the Mini App URL in BotFather.

## Deploy to the VPS

1. Point a domain (A record) at the VPS. Ports 80 and 443 must be free, because Caddy terminates TLS.
2. In @BotFather: `/newbot` → token. `/newapp` (or Bot Settings → Configure Mini App) → URL `https://<domain>`.
3. Add the bot to the car group. To find the group id, temporarily make the bot an admin or forward a group message to @RawDataBot. The id starts with `-100`.
4. On the VPS:
   ```bash
   git clone <repo> petrolheads && cd petrolheads
   cp .env.example .env && nano .env      # DEV_AUTH=false!
   docker compose up -d --build
   ```
5. The backend registers the bot webhook (`PUBLIC_URL/bot/webhook`) on startup. Send `/start` to the bot in private chat to get the "Open garage" button.

If the VPS already runs nginx on 80/443, remove the `web` service's ports, put Caddy on another port (or serve
`frontend/dist` from nginx), and proxy `/api/` and `/bot/` to the backend.

Backups: `docker compose exec db pg_dump -U petrolheads petrolheads > backup.sql`

## API

| Method | Path | |
|---|---|---|
| GET/PATCH | `/api/me` | own profile (cars, personal bests) / edit nickname, crew, bio |
| GET | `/api/users/{id}` | someone else's profile (verified laps only) |
| POST/PUT/DELETE | `/api/cars[/{id}]` | manage own garage |
| GET/POST | `/api/tracks` | list / add (admin) |
| GET | `/api/tracks/{id}/leaderboard` | best verified lap per driver |
| POST | `/api/laps` | submit lap (status `pending`) |
| GET | `/api/admin/laps/pending` | review queue (admin) |
| POST | `/api/admin/laps/{id}/review` | `{"status":"verified"\|"rejected"}`, +100 rep on verify |

## Roadmap

- [x] Profiles, garage, lap submission, admin verification, leaderboards
- [x] Street-racing UI: chrome titles, neon accents, segmented performance bars, haptics
- [ ] Photo upload to S3/R2 (strip EXIF/GPS!) instead of photo URLs
- [ ] Garage render v1: background removal + compositing into a neon garage scene
- [ ] Garage render v2: AI relighting/background around a protected car mask, job queue, bot notification when ready
