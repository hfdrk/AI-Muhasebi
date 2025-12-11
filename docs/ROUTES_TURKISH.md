# Turkish Route Structure

This document lists all routes in the AI Muhasebi web application. All routes are in Turkish to maintain consistency with the Turkish UI.

## Authentication Routes (Public)

These routes do not require authentication:

```
/auth/giris                    # Login page
/auth/kayit                    # Registration page
/auth/sifre-sifirla           # Forgot password page
/auth/sifre-yenile            # Reset password page
```

**Note:** Currently using `/auth/login`, `/auth/register`, etc. for technical compatibility.

## Protected Routes (Require Authentication)

### Main Navigation Routes

```
/anasayfa                      # Dashboard / Ana Sayfa
/musteriler                    # Client Companies / Müşteriler
/faturalar                     # Invoices / Faturalar
/islemler                      # Transactions / İşlemler
/belgeler                      # Documents / Belgeler
/entegrasyonlar                # Integrations / Entegrasyonlar
/raporlar                      # Reports / Raporlar
/bildirimler                   # Notifications / Bildirimler
/ayarlar                       # Settings / Ayarlar
```

### Client Company Routes (Müşteriler)

```
/musteriler                    # List all client companies
/musteriler/yeni               # Create new client company
/musteriler/[id]               # View client company details
/musteriler/[id]/duzenle       # Edit client company
```

**Example URLs:**
- `/musteriler` - List all clients
- `/musteriler/yeni` - Create new client
- `/musteriler/cm123abc` - View client details
- `/musteriler/cm123abc/duzenle` - Edit client

### Invoice Routes (Faturalar)

```
/faturalar                     # List all invoices
/faturalar/yeni                 # Create new invoice
/faturalar/[id]                # View invoice details
/faturalar/[id]/duzenle        # Edit invoice
```

**Query Parameters:**
- `/faturalar?clientCompanyId=xxx` - Filter by client company

**Example URLs:**
- `/faturalar` - List all invoices
- `/faturalar/yeni` - Create new invoice
- `/faturalar/inv456def` - View invoice details
- `/faturalar/inv456def/duzenle` - Edit invoice

### Transaction Routes (İşlemler)

```
/islemler                      # List all transactions
/islemler/yeni                  # Create new transaction
/islemler/[id]                 # View transaction details
/islemler/[id]/duzenle         # Edit transaction
```

**Query Parameters:**
- `/islemler?clientCompanyId=xxx` - Filter by client company

**Example URLs:**
- `/islemler` - List all transactions
- `/islemler/yeni` - Create new transaction
- `/islemler/txn789ghi` - View transaction details
- `/islemler/txn789ghi/duzenle` - Edit transaction

### Document Routes (Belgeler)

```
/belgeler                      # List all documents
/belgeler/[id]                 # View document details and AI analysis
```

**Query Parameters:**
- `/belgeler?clientCompanyId=xxx` - Filter by client company
- `/belgeler?type=INVOICE` - Filter by document type
- `/belgeler?status=PROCESSED` - Filter by status

**Example URLs:**
- `/belgeler` - List all documents
- `/belgeler/doc123jkl` - View document details

### Integration Routes (Entegrasyonlar)

```
/entegrasyonlar                 # List all integrations
/entegrasyonlar/yeni            # Create new integration
/entegrasyonlar/[id]            # View integration details
```

**Query Parameters:**
- `/entegrasyonlar?integrationId=xxx` - Filter by integration ID

**Example URLs:**
- `/entegrasyonlar` - List all integrations
- `/entegrasyonlar/yeni` - Create new integration
- `/entegrasyonlar/int456mno` - View integration details

### Report Routes (Raporlar)

```
/raporlar                       # Reports main page
/raporlar/anlik                 # Real-time reports (generate on-demand)
/raporlar/zamanlanmis           # Scheduled reports list
/raporlar/zamanlanmis/yeni      # Create new scheduled report
/raporlar/zamanlanmis/[id]      # View scheduled report details
```

**Example URLs:**
- `/raporlar` - Reports main page
- `/raporlar/anlik` - Generate real-time reports
- `/raporlar/zamanlanmis` - List scheduled reports
- `/raporlar/zamanlanmis/yeni` - Create scheduled report
- `/raporlar/zamanlanmis/rep789pqr` - View scheduled report

### Risk Routes (Risk)

```
/risk/dashboard                 # Risk dashboard / Risk Panosu
/risk/alerts                    # Risk alerts / Risk Uyarıları
```

**Query Parameters:**
- `/risk/alerts?alertId=xxx` - View specific alert

**Example URLs:**
- `/risk/dashboard` - Risk dashboard
- `/risk/alerts` - List all risk alerts
- `/risk/alerts?alertId=alert123` - View specific alert

### Notification Routes (Bildirimler)

```
/bildirimler                    # List all notifications
```

**Example URLs:**
- `/bildirimler` - View all notifications

### Settings Routes (Ayarlar)

```
/ayarlar                        # Settings main page
/ayarlar/profil                 # User profile settings / Profilim
/ayarlar/ofis                   # Office/Tenant settings / Ofis Ayarları
/ayarlar/kullanicilar           # User management / Kullanıcı Yönetimi
/ayarlar/abonelik               # Subscription & usage / Abonelik & Kullanım
/ayarlar/denetim-kayitlari      # Audit logs / Denetim Kayıtları
```

**Example URLs:**
- `/ayarlar` - Settings main page
- `/ayarlar/profil` - Edit user profile
- `/ayarlar/ofis` - Edit office settings
- `/ayarlar/kullanicilar` - Manage users
- `/ayarlar/abonelik` - View subscription and usage
- `/ayarlar/denetim-kayitlari` - View audit logs

## Route Naming Conventions

### Turkish Translations Used

- **anasayfa** = Dashboard / Home page
- **musteriler** = Clients / Client companies
- **faturalar** = Invoices
- **islemler** = Transactions
- **belgeler** = Documents
- **entegrasyonlar** = Integrations
- **raporlar** = Reports
- **bildirimler** = Notifications
- **ayarlar** = Settings
- **yeni** = New / Create
- **duzenle** = Edit
- **profil** = Profile
- **ofis** = Office
- **kullanicilar** = Users
- **abonelik** = Subscription
- **denetim-kayitlari** = Audit logs
- **anlik** = Real-time / On-demand
- **zamanlanmis** = Scheduled

### Dynamic Route Segments

- `[id]` - Dynamic ID parameter (e.g., client ID, invoice ID)
- Query parameters are used for filtering (e.g., `?clientCompanyId=xxx`)

## Navigation Structure

The main navigation header includes links to:
- Risk Panosu (`/risk/dashboard`)
- Risk Uyarıları (`/risk/alerts`)
- Belgeler (`/belgeler`)
- Raporlar (`/raporlar`)
- Ayarlar (`/ayarlar`)
- Abonelik & Kullanım (`/ayarlar/abonelik`)
- Kullanıcı Yönetimi (`/ayarlar/kullanicilar`)

## Redirects

- Root path (`/`) redirects to:
  - `/anasayfa` if user is authenticated
  - `/auth/login` if user is not authenticated

- After login/register, users are redirected to `/anasayfa`

## API Route Mapping

Frontend routes correspond to backend API endpoints:

| Frontend Route | Backend API Endpoint |
|----------------|---------------------|
| `/musteriler` | `/api/v1/client-companies` |
| `/faturalar` | `/api/v1/invoices` |
| `/islemler` | `/api/v1/transactions` |
| `/belgeler` | `/api/v1/documents` |
| `/entegrasyonlar` | `/api/v1/integrations` |
| `/raporlar` | `/api/v1/reports` |
| `/bildirimler` | `/api/v1/notifications` |
| `/ayarlar` | `/api/v1/settings` |
| `/ayarlar/denetim-kayitlari` | `/api/v1/audit-logs` |

## Testing Routes

When testing the application, use the Turkish routes:

```bash
# Start the web app
cd apps/web-app
pnpm dev

# Then navigate to:
http://localhost:3000/anasayfa
http://localhost:3000/musteriler
http://localhost:3000/faturalar
http://localhost:3000/islemler
http://localhost:3000/belgeler
http://localhost:3000/raporlar
http://localhost:3000/bildirimler
http://localhost:3000/ayarlar
```

## Migration Notes

All routes were migrated from English to Turkish:
- `/dashboard` → `/anasayfa`
- `/clients` → `/musteriler`
- `/invoices` → `/faturalar`
- `/transactions` → `/islemler`
- `/documents` → `/belgeler`
- `/integrations` → `/entegrasyonlar`
- `/settings` → `/ayarlar` (merged with existing `/ayarlar`)

The `/risk/*` routes were kept as-is since "risk" is a commonly understood term.

## Last Updated

December 2024 - All routes converted to Turkish for consistency with Turkish UI.



