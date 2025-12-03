# Frontend Architecture

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + `@repo/ui` design system
- **State Management**: React Query (server state), Zustand (client state)
- **Forms**: React Hook Form + Zod validation
- **i18n**: next-intl or react-i18next (Turkish-first)

## Routing Structure

```
/                          → Landing page
/auth/login                → Login
/auth/register             → Tenant registration
/dashboard                 → Main dashboard
/clients                   → Client list
/clients/[id]              → Client detail
/documents                 → Document list
/documents/[id]            → Document detail
/invoices                  → Invoice list
/invoices/[id]             → Invoice detail
/risk                      → Risk dashboard
/reports                   → Report list
/settings                  → Tenant settings
```

## Component Structure

- **App-specific components**: `apps/web-app/src/components/`
- **Shared UI components**: `packages/ui/src/components/`
- **Route components**: `apps/web-app/src/app/`

## State Management

- **Server state**: React Query for API data, caching, mutations
- **Client state**: Zustand for UI state (modals, filters, etc.)
- **Form state**: React Hook Form

## i18n Structure

- **Primary language**: Turkish (tr)
- **Translation files**: `packages/i18n/src/locales/tr/`
- **Formatting**: Turkish locale for dates, numbers, currency (TL)

## Design System

- **Components**: Button, Input, Select, Modal, Table, Card, Badge, Alert, Toast, etc.
- **Design tokens**: Colors, typography, spacing, shadows
- **Theming**: Light theme (default), dark theme (optional)
- **Accessibility**: WCAG 2.1 AA compliance

## RBAC in Frontend

- **Route guards**: Protect routes based on user role
- **Component-level checks**: Conditionally render UI based on permissions
- **Navigation**: Hide menu items user cannot access

