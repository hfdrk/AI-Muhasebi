# Client Portal Data Setup Guide

**Issue:** Client portal shows no data (all zeros)

**Root Cause:** ReadOnly users are matched to client companies by email. If the user's email doesn't match any `ClientCompany.contactEmail`, no data will be displayed.

---

## How Client-User Matching Works

The system matches ReadOnly users to client companies by:
1. User's email address (from User table)
2. Client company's `contactEmail` field (from ClientCompany table)
3. Must match exactly (case-insensitive)

**Example:**
- User email: `fatma@example.com`
- ClientCompany.contactEmail: `fatma@example.com`
- ✅ Match found → User sees that company's data

---

## How to Fix "No Data" Issue

### Option 1: Update Client Company Contact Email

1. **As an accountant/admin:**
   - Go to `/musteriler` (or `/clients`)
   - Find the client company
   - Edit the company
   - Set `contactEmail` to match the ReadOnly user's email
   - Save

### Option 2: Update ReadOnly User Email

1. **As an accountant/admin:**
   - Go to `/ayarlar/kullanicilar` (or `/settings/users`)
   - Find the ReadOnly user
   - Update their email to match the client company's `contactEmail`
   - Save

### Option 3: Use Setup Scripts

The codebase includes scripts to automatically set up client users:

```bash
# Setup customer users for demo tenant
pnpm setup:demo-customers

# Or create customer users for all client companies
pnpm create:customer-users
```

These scripts:
- Create ReadOnly users for each client company
- Match user email with `ClientCompany.contactEmail`
- Set up proper associations

---

## Verification Steps

1. **Check if client company exists:**
   ```sql
   SELECT id, name, contactEmail, isActive 
   FROM client_companies 
   WHERE tenant_id = 'your-tenant-id';
   ```

2. **Check if ReadOnly user exists:**
   ```sql
   SELECT u.email, utm.role 
   FROM users u
   JOIN user_tenant_memberships utm ON u.id = utm.user_id
   WHERE utm.role = 'ReadOnly' AND utm.tenant_id = 'your-tenant-id';
   ```

3. **Verify email match:**
   - User email should match `ClientCompany.contactEmail`
   - Both should be active

---

## API Endpoint for Testing

**GET** `/api/v1/client-companies/my-company`

Returns the client company for the current ReadOnly user (matched by email).

**Response:**
```json
{
  "data": {
    "id": "client-company-id",
    "name": "Company Name",
    "contactEmail": "user@example.com",
    ...
  }
}
```

If no match found:
```json
{
  "data": null
}
```

---

## Troubleshooting

### Issue: Dashboard shows "Müşteri Şirketi Bulunamadı"
**Solution:** 
- Check that `ClientCompany.contactEmail` is set
- Check that it matches the ReadOnly user's email
- Update one to match the other

### Issue: Data exists but shows 0
**Solution:**
- Verify the client company ID is correct
- Check that invoices/transactions/documents have the correct `clientCompanyId`
- Verify the user has the ReadOnly role

### Issue: Can't see any data after matching
**Solution:**
- Make sure the client company is active (`isActive: true`)
- Make sure invoices/transactions/documents belong to that client company
- Check browser console for API errors

---

## Quick Fix Script

If you need to quickly match a user to a company:

```typescript
// In a script or database query:
// 1. Find the client company
const company = await prisma.clientCompany.findFirst({
  where: { name: "Company Name" }
});

// 2. Update contactEmail to match user email
await prisma.clientCompany.update({
  where: { id: company.id },
  data: { contactEmail: "user@example.com" }
});
```

---

## Data Flow

1. **ReadOnly user logs in**
2. **Frontend calls** `GET /api/v1/client-companies/my-company`
3. **Backend matches** user email → `ClientCompany.contactEmail`
4. **Returns client company ID**
5. **Frontend uses client company ID** to fetch:
   - Invoices (`listInvoices({ clientCompanyId })`)
   - Transactions (`listTransactions({ clientCompanyId })`)
   - Documents (`listDocuments({ clientCompanyId })`)
   - Risk score (`getClientCompanyRiskScore(clientCompanyId)`)

---

**Last Updated:** 2025-01-15

