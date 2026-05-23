# AI-Fertilizer-Sugegstion

## Development Setup

### Frontend + Shared Tooling
```bash
npm install
npm run lint
npm run format:check
```

### Backend
```bash
cd Backend
npm install
npm run start
```

## Environment

1. Copy `Backend/.env.example` to `Backend/.env`.
2. Fill DB, email OTP, and AI provider variables.

## CI

GitHub Actions workflow: `.github/workflows/ci.yml`

Runs on push/PR to `main` and `dev`:
- lint (root + backend)
- format check (root + backend)
