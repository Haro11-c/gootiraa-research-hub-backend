# gootiraa-research-hub-backend

**Backend REST API for Gootiraa Research Hub (ጎቲራ)**

An open, high-integrity scholarly discovery, preprint repository, and empirical science journalism API server built with Node.js, Express, TypeScript, and Prisma ORM.

## Key Features

- **Versioned REST API (`/api/v1`)**: Clean separation across routes, controllers, services, adapters, and repositories.
- **Scholarly Adapter Layer**: Built-in adapters for **OpenAlex**, **Crossref**, and **arXiv** with caching and circuit breakers.
- **Evidence-Grounded AI Engine**: Document passage citation, 3-part structured paper summarization, cross-paper comparison, and prompt injection sanitization.
- **Research Integrity Standards**: Distinct verification for peer-reviewed vs preprint records.
- **Editorial Fact-Check Bureau**: Publishing pipeline with verdict tags and transparent correction logs.
- **OWASP Top 10 Security**: Helmet security headers, rate limiting, magic-number PDF inspection, and RBAC authorization.
- **Persistence & Migrations**: Prisma ORM schema supporting SQLite for zero-setup local dev and PostgreSQL for production.
- **Automated Testing**: 15 Jest integration and unit tests covering all critical paths.

## Setup & Running

```bash
# Install dependencies
npm install

# Generate Prisma Client & Initialize Database
npx prisma generate
npx prisma db push

# Seed authentic academic and editorial records
npx ts-node prisma/seed.ts

# Run automated tests
npm test

# Start development server
npm run dev

# Build production bundle
npm run build
npm start
```

## API Documentation

- Complete endpoint catalog documented in `docs/api.md`.
- Health check available at `http://localhost:5000/api/v1/health`.
