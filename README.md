# FleetMS — Fleet Management System
Built by MNADANI Company Limited

---

## Modules

| Module | Features |
|--------|----------|
| 🚗 Vehicles | Full register, profiles, service schedule tracking |
| 👤 Drivers | Driver profiles, license tracking, expiry alerts |
| ⛽ Fuel | Fill-up logs, cost tracking, consumption per vehicle |
| 🔧 Maintenance | Schedule, track, and cost all repairs and services |
| 🗺️ Trips | Log trips, mileage, route and purpose tracking |
| 📋 Compliance | Insurance, road licenses, fitness — expiry alerts |
| ⚠️ Incidents | Accident reports, damage costs, resolution tracking |
| 📈 Reports | Fleet cost, fuel analysis, per-vehicle breakdown |

---

## Setup

### 1. Supabase Project
1. Go to [supabase.com](https://supabase.com) → New project
2. SQL Editor → Run the full contents of `supabase_schema.sql`
3. Copy **Project URL** and **anon key** from Settings → API

### 2. Environment Variables
```bash
cp .env.example .env
```
Edit `.env`:
```
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJxxxxxx...
```

### 3. Install & Run
```bash
npm install
npm start
```

### 4. Create First Admin
1. Register via login page (you'll see "Awaiting Approval")
2. In Supabase → Table Editor → `profiles` table
3. Set your user's `role = admin` and `status = approved`
4. Sign in again — full access granted

---

## Roles
| Role    | Access |
|---------|--------|
| admin   | Full access — users, all records, delete |
| manager | All modules, cannot manage users |
| staff   | View + create records (trips, fuel, incidents) |
| viewer  | Read-only |

---

## Build & Deploy
```bash
npm run build
```
Deploy `build/` to Netlify, Vercel, or any static host. Set env vars in the hosting dashboard.
# feet-ms
