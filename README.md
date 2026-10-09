# Gootiraa Research Hub (ጎቲራ) — Backend API

> **High-Integrity Scholarly Discovery, Preprint Repository & Science Journalism Engine**

A production-ready Node.js, Express, TypeScript, and Prisma ORM backend powering paper discovery, open peer review distinction, grounded AI assistants, researcher impact wallets, and editorial fact-checking.

---

## 🌐 Live API Deployments

| Component | Platform | Live URL | Status |
| :--- | :--- | :--- | :--- |
| **API Backend** | **Render** | [https://gootiraa-research-hub-backend.onrender.com](https://gootiraa-research-hub-backend.onrender.com) | 🟢 Online |
| **API Health Check** | **Render** | [https://gootiraa-research-hub-backend.onrender.com/api/v1/health](https://gootiraa-research-hub-backend.onrender.com/api/v1/health) | 🟢 200 OK |
| **Web App (Frontend)** | **Vercel** | [https://gootiraa-research-hub-frontend.vercel.app](https://gootiraa-research-hub-frontend.vercel.app) | 🟢 Production |

---

## 🚀 How to Deploy on Render (1-Click Guide)

You can host this backend on **Render** completely free in under 3 minutes:

### Option A: Using Render Blueprints (Recommended)
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **"New +"** → **"Blueprint"**.
3. Connect your repository: `Haro11-c/gootiraa-research-hub-backend`.
4. Render will automatically read [`render.yaml`](./render.yaml) and configure the build, start commands, health checks, and environment variables!
5. Click **Apply**.

### Option B: Manual Web Service Setup
1. On Render, click **"New +"** → **"Web Service"**.
2. Connect `Haro11-c/gootiraa-research-hub-backend`.
3. Configure settings:
   - **Environment**: `Node`
   - **Region**: Frankfurt (EU) or Oregon (US)
   - **Branch**: `main`
   - **Build Command**: `npm install && npx prisma generate && npx prisma db push && npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Render standard port |
   | `JWT_SECRET` | `GootiraaSuperSecureProductionSecretKey2026!` | 32+ char secret string |
   | `DATABASE_URL` | `file:./dev.db` | Portable SQLite database |
   | `CORS_ORIGINS` | `*` | Or specify your Vercel URL |
5. Click **Create Web Service**.

### 📦 Initial Database Seeding on Render
Once deployed, click on the **"Shell"** tab in your Render dashboard and run:
```bash
npm run prisma:seed
```
This will instantly populate sample universities, publications, editorial articles, bounties, and demo admin/scholar accounts!

---

## 💻 Local Setup & Testing

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client & Initialize Database
npx prisma generate
npx prisma db push

# 3. Seed authentic demo data
npm run prisma:seed

# 4. Run automated test suite (20 tests)
npm test

# 5. Start development server
npm run dev
# Server runs at http://localhost:5000
```

---

## 🔑 Demo Access Accounts

All accounts use password: **`Gootiraa2026Secure!`**

| Role | Email | Description |
| :--- | :--- | :--- |
| **Super Admin** | `superadmin@gootiraa.org` | Financial payouts, anti-fraud telemetry, user roles |
| **Moderator / Editor** | `admin@gootiraa.org` | Manuscript approvals, publishing science news & fact-checks |
| **Senior Scholar** | `almaz.bekele@aau.edu.et` | Dr. Almaz Bekele (AAU) — Top 1% Ranked Researcher |
| **Active Scholar** | `harouturakerro@gmail.com` | Haro Utura — Research contributor & impact wallet |
