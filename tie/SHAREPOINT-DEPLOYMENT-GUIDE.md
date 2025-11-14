# SharePoint Integration - Deployment Guide

## 📋 Overview

This guide walks through deploying the SharePoint integration for RFQ storage in the Tender Intelligence Engine (TIE).

---

## 🎯 What's Been Implemented

### ✅ Completed Components

1. **SharePoint List Schema** (`SHAREPOINT-RFQ-SCHEMA.md`)
   - Complete column structure
   - Data format specifications
   - Permission guidelines

2. **Azure Function** (`azure-functions/sharepoint-rfq/`)
   - REST API for CRUD operations
   - SharePoint authentication
   - Error handling and fallbacks

3. **Frontend Client** (`tie/js/sharepoint-client.js`)
   - SharePoint API wrapper
   - Hybrid storage (SharePoint + localStorage)
   - Automatic fallback mechanism

4. **Updated Matcher** (`tie/js/matcher-v3.1.js`)
   - Auto-save to SharePoint
   - localStorage backup
   - Error handling

5. **Updated Archive** (`tie/js/archive.js`)
   - Load from SharePoint
   - Display SharePoint data
   - Sync capabilities

---

## 🚀 Deployment Steps

### Step 1: Create SharePoint List

#### Option A: Manual Creation (Easiest)

1. Navigate to your SharePoint site:
   ```
   https://milemedical365.sharepoint.com/sites/MileMedical2
   ```

2. Click **Site Contents** → **New** → **List**

3. Choose **Blank list**, name it: `TIE RFQ Archive`

4. Add these columns:

   | Column Name | Type | Settings |
   |-------------|------|----------|
   | RFQ Date | Date and Time | Required |
   | Uploaded By | Person or Group | Required |
   | Status | Choice | New, Quoted, Submitted, Won, Lost |
   | Matched Count | Number | Required |
   | Total Count | Number | Required |
   | Match Rate | Number | Optional |
   | Matched Items JSON | Multiple lines of text (Plain text) | Required |
   | Not Found Items JSON | Multiple lines of text (Plain text) | Optional |
   | Total Value | Currency | Optional |
   | Notes | Multiple lines of text | Optional |

#### Option B: PowerShell Script

```powershell
# Connect to SharePoint
Connect-PnPOnline -Url "https://milemedical365.sharepoint.com/sites/MileMedical2" -Interactive

# Run the script from SHAREPOINT-RFQ-SCHEMA.md
# (Copy the PowerShell script from that file)
```

---

### Step 2: Deploy Azure Function

#### 2.1 Install Dependencies

```bash
cd azure-functions/sharepoint-rfq
npm install
```

#### 2.2 Configure Environment Variables

Create `.env` or configure in Azure Portal:

```env
SHAREPOINT_SITE_URL=https://milemedical365.sharepoint.com/sites/MileMedical2
SHAREPOINT_ACCESS_TOKEN=<your-token-or-use-managed-identity>
NODE_ENV=production
```

#### 2.3 Deploy to Azure

**Option A: VS Code Azure Functions Extension**

1. Install Azure Functions extension
2. Right-click on `sharepoint-rfq` folder
3. Select "Deploy to Function App..."
4. Choose your function app

**Option B: Azure CLI**

```bash
# Login
az login

# Deploy
cd azure-functions
func azure functionapp publish <your-function-app-name>
```

#### 2.4 Configure Authentication

**Enable Azure AD Authentication:**

1. Go to Azure Portal → Your Function App
2. Navigate to **Authentication**
3. Add **Microsoft** identity provider
4. Configure:
   - Issuer URL: `https://login.microsoftonline.com/<tenant-id>/v2.0`
   - Allowed audiences: Your app ID
   - Action: **Allow anonymous requests** (we'll handle auth in code)

**Configure SharePoint Permissions:**

1. Register app in Azure AD:
   - Azure Portal → App Registrations → New registration
   - Name: "TIE SharePoint Function"
   - Redirect URI: Your function app URL

2. API Permissions:
   - Microsoft Graph → `Sites.ReadWrite.All`
   - SharePoint → `Sites.FullControl.All`

3. Create client secret:
   - Certificates & secrets → New client secret
   - Copy and save securely

4. Update Function App settings:
   ```
   AZURE_CLIENT_ID=<app-id>
   AZURE_CLIENT_SECRET=<secret>
   AZURE_TENANT_ID=<tenant-id>
   ```

---

### Step 3: Update Static Web App Configuration

#### 3.1 Update `staticwebapp.config.json`

Add API route:

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/*.{js,css,png,jpg,svg,ico}"]
  }
}
```

#### 3.2 Link Azure Function to Static Web App

```bash
# Using Azure CLI
az staticwebapp functions link \
    --name <your-static-web-app-name> \
    --resource-group <resource-group> \
    --function-resource-id <function-app-resource-id>
```

Or via Azure Portal:
1. Static Web App → APIs
2. Link existing Function App
3. Select your sharepoint-rfq function

---

### Step 4: Deploy Frontend Changes

```bash
# Stage all changes
git add .

# Commit
git commit -m "feat(tie): implement SharePoint integration for RFQ storage"

# Push to trigger deployment
git push origin main
```

Azure Static Web Apps will automatically deploy.

---

### Step 5: Test Integration

#### 5.1 Test SharePoint List

1. Manually add a test item to SharePoint List
2. Verify all columns are accessible
3. Check permissions work correctly

#### 5.2 Test Azure Function

```bash
# Test list endpoint
curl https://<your-function-app>.azurewebsites.net/api/rfq/list

# Test create endpoint
curl -X POST https://<your-function-app>.azurewebsites.net/api/rfq/create \
  -H "Content-Type: application/json" \
  -d '{
    "rfqId": "TEST-001",
    "matchedItems": [],
    "matchedCount": 0,
    "totalCount": 0
  }'
```

#### 5.3 Test Frontend

1. Open TIE Matcher: `https://your-site.azurestaticapps.net/tie/matcher.html`
2. Upload a test RFQ file
3. Check browser console for SharePoint logs:
   - Should see: "💾 Saving to SharePoint..."
   - Should see: "✅ RFQ saved to SharePoint (ID: X)"
4. Go to Archive page
5. Verify RFQ appears in the list
6. Check SharePoint List - item should be there

---

## 🔧 Troubleshooting

### Issue: "SharePoint client not available"

**Cause:** `sharepoint-client.js` not loaded or loaded after matcher.js

**Fix:** Verify script order in HTML:
```html
<script src="js/sharepoint-client.js"></script>
<script src="js/matcher-v3.1.js"></script>
```

---

### Issue: "Failed to save to SharePoint"

**Causes:**
1. Azure Function not deployed
2. Authentication issues
3. SharePoint list doesn't exist
4. Network/CORS issues

**Debug Steps:**

1. Check browser console for errors
2. Check Azure Function logs:
   ```bash
   az functionapp log tail \
       --name <function-app-name> \
       --resource-group <resource-group>
   ```

3. Verify SharePoint list exists and has correct name

4. Check CORS settings in Azure Function:
   - Should allow your Static Web App domain

---

### Issue: "RFQs not loading in Archive"

**Cause:** Archive page can't reach Azure Function or SharePoint

**Fix:**

1. Check network tab in DevTools
2. Verify API endpoint is correct
3. Check authentication token is valid
4. Fallback will use localStorage if SharePoint unavailable

---

## 🔄 Migration from localStorage

### Automatic Migration

When users first load the page after deployment, the system will:

1. Check for unsynced items in localStorage
2. Automatically sync them to SharePoint
3. Mark them as synced

### Manual Migration (if needed)

```javascript
// In browser console
await window.storageManager.syncLocalToSharePoint();
```

---

## 📊 Monitoring & Maintenance

### Monitor SharePoint Usage

1. SharePoint Admin Center → Analytics
2. View list access logs
3. Check storage usage

### Monitor Azure Function

1. Azure Portal → Function App → Monitor
2. View invocations, errors, performance
3. Set up alerts for failures

### Backup Strategy

- **SharePoint:** Auto-versioned, backed up by Microsoft
- **localStorage:** Browser-specific, users should export regularly
- **Recommended:** Periodic exports to Excel

---

## 🎓 User Training

### Key Points to Communicate:

1. **Data is now shared** - All team members can see RFQs
2. **Auto-saved to SharePoint** - No data loss
3. **Offline support** - Works with localStorage backup
4. **Status updates** - Can update RFQ status in Archive page

### Quick Start for Users:

1. Upload RFQ as before
2. System auto-saves to SharePoint
3. View all team's RFQs in Archive
4. Update status as RFQs progress

---

## 📝 Post-Deployment Checklist

- [ ] SharePoint List created with correct columns
- [ ] Azure Function deployed and accessible
- [ ] Function authentication configured
- [ ] SharePoint permissions granted to Function
- [ ] Static Web App linked to Function
- [ ] Frontend code deployed
- [ ] SharePoint integration tested (create, read, update)
- [ ] Archive page loads from SharePoint
- [ ] localStorage fallback tested
- [ ] Migration utility tested
- [ ] User documentation updated
- [ ] Team trained on new features
- [ ] Monitoring/alerts configured

---

## 🆘 Support

If you encounter issues:

1. Check browser console for errors
2. Check Azure Function logs
3. Verify SharePoint permissions
4. Test with a simple manual API call
5. Review this guide's troubleshooting section

For additional help:
- Review `SHAREPOINT-RFQ-SCHEMA.md`
- Check Azure Function logs
- Contact IT/DevOps team

---

## 🔮 Future Enhancements

Potential additions after initial deployment:

1. **Real-time Sync** - WebSockets for live updates
2. **Advanced Search** - Full-text search in SharePoint
3. **Reporting** - Power BI integration
4. **Workflows** - SharePoint approval workflows
5. **Notifications** - Email alerts on status changes
6. **Mobile App** - Native mobile access
7. **Batch Operations** - Bulk updates
8. **Export/Import** - Advanced data management

---

**Status:** ✅ Ready for Deployment
**Version:** 1.0
**Last Updated:** 2025-11-06
