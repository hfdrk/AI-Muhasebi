# Web App

The Next.js frontend application for AI Muhasebi, providing the user interface for the multi-tenant accounting platform.

## Local Development

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Backend API running (see `apps/backend-api/README.md`)

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env.local`
   - Set `NEXT_PUBLIC_API_BASE_URL` to your backend API URL (default: `http://localhost:3800`)

3. **Start development server:**
   ```bash
   pnpm dev
   ```

   The app will start on `http://localhost:3000` (or the port specified in Next.js config).

### Environment Variables

Required variables in `.env.local`:

- `NEXT_PUBLIC_API_BASE_URL`: Backend API base URL (e.g., `http://localhost:3800`)

Optional variables:

- `NODE_ENV`: Environment (development, production, test)

See `.env.example` for complete list.

## Configuring Base API URL

The frontend communicates with the backend API. Configure the API URL in `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3800
```

For production, set this to your production API URL:
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

**Note:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Testing

### End-to-End Tests (Playwright)

Run E2E tests:
```bash
pnpm test:e2e
```

Run E2E tests with UI:
```bash
pnpm test:e2e:ui
```

### Smoke Tests

Run the smoke test suite for quick validation:
```bash
pnpm test:e2e -- smoke.spec.ts
```

Or from the root:
```bash
pnpm smoke:full
```

The smoke test suite verifies:
- Main routes render correctly (Dashboard, Müşteriler, Faturalar, Raporlar, Bildirimler, Ayarlar)
- Turkish labels are displayed correctly
- Login flow works end-to-end

Smoke tests are designed to be:
- Fast (typically completes in under a minute)
- Cover critical user-facing flows
- Verify UI text is in Turkish (from `packages/i18n`)

### Test Configuration

E2E tests are configured in `playwright.config.ts`. The test server automatically starts the Next.js dev server if not already running.

## Production Build

1. **Build:**
   ```bash
   pnpm build
   ```

   This creates an optimized production build in `.next/`.

2. **Start:**
   ```bash
   pnpm start
   ```

   Or use the root start script:
   ```bash
   pnpm --filter web-app start
   ```

## UI Text and Localization

All UI-facing text is in Turkish and comes from the `packages/i18n` package. The app uses:
- Turkish locale (`tr-TR`) by default
- Translation keys from `packages/i18n/src/translations/tr.json`

To modify UI text, update the translation files in `packages/i18n`.

## Troubleshooting

### API Connection Issues

- Verify `NEXT_PUBLIC_API_BASE_URL` is correct
- Ensure backend API is running
- Check CORS configuration on backend

### Build Errors

- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check TypeScript errors: `pnpm type-check`

### Port Already in Use

- Change port in `next.config.js` or use `-p` flag:
  ```bash
  pnpm dev -p 3001
  ```





