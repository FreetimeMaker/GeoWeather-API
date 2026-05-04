# GeoWeather API - Database Setup Required

## Current Issue
**Error:** `Could not find the table 'public.users' in the schema cache`

## Root Cause
- Supabase local development stack requires Docker (not installed/running).
- Migrations in `scripts/migrate.js` need to run on local Supabase DB.

## Required Setup Steps

### 1. Install Docker
```bash
# Update packages
sudo apt update

# Install Docker
sudo apt install docker.io docker-compose

# Add user to docker group (logout/login after)
sudo usermod -aG docker $USER

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Verify Docker
```bash
docker --version
docker run hello-world
```

### 3. Start Supabase Local Stack
```bash
npx supabase start
```
*Copy SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL from output to .env*

### 4. Run Migrations
```bash
npm run db:migrate
```

### 5. Start Development Server
```bash
npm run dev
```

## Verify Fix
- Server starts without DB errors
- Health check passes (`GET /health` or startup logs)
- `npx supabase db psql` → `\dt` shows `users` table

## Production (Vercel)
- Migrations auto-run? Check vercel.json or add lifecycle script.
- Or run manually via Supabase dashboard SQL editor.

**Next:** Run Docker install commands above, then restart VSCode terminal and execute steps 2-5.
