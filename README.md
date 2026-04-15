# FleetMS — Fleet Management System

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)

A modern Fleet Management System built with React and Supabase to help organizations manage vehicles, drivers, trips, fuel usage, maintenance, HR, and compliance in one centralized platform.

The application provides role-based access control, secure authentication, and real-time database integration through Supabase.!



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



## Project Structure
```
src/
│
├── components/
│   └── layout/
│       └── Layout.js
│
├── context/
│   ├── SupabaseContext.js
│   └── ToastContext.js
│
├── pages/
│   ├── LoginPage.js
│   ├── DashboardPage.js
│   ├── UsersPage.js
│
│   ├── vehicles/
│   │   └── VehiclesPage.js
│
│   ├── drivers/
│   │   └── DriversPage.js
│
│   ├── trips/
│   │   └── TripsPage.js
│
│   ├── fuel/
│   │   └── FuelPage.js
│
│   ├── maintenance/
│   │   └── MaintenancePage.js
│
│   ├── compliance/
│   │   └── CompliancePage.js
│
│   ├── incidents/
│   │   └── IncidentsPage.js
│
│   ├── reports/
│   │   └── ReportsPage.js
│
│   └── hr/
│       ├── EmployeesPage.js
│       ├── PayrollPage.js
│       └── ExpensesPage.js
│
└── App.js
```
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
1. Register for an account from the **Login Page**.
2. After registration, your account will show **"Awaiting Approval"**.
3. An **Administrator** must approve your account from the **Admin Dashboard → Users page**.
4. Once approved, sign in again to access the system.



## Roles
| Role    | Access |
|---------|--------|
| admin   | Full access — users, all records, delete |
| manager | All modules, cannot manage users |
| staff   | View + create records (trips, fuel, incidents) |
| viewer  | Read-only |



## Build & Deploy
```bash
npm run build
```
Deploy `build/` to Netlify, Vercel, or any static host. Set env vars in the hosting dashboard.

