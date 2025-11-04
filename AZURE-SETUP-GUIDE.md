# Azure Blob Storage Sync Setup Guide

## 🎯 Overview

This guide will help you set up automated syncing of your SharePoint vendor catalog to Azure Blob Storage, enabling the TIE Matcher to load your catalog without CORS or authentication issues.

---

## Architecture

```
SharePoint Excel File 
    ↓ (Auto-sync every 5 minutes)
Azure Function (Timer Trigger)
    ↓ (Upload)
Azure Blob Storage (Public Read)
    ↓ (HTTPS GET)
TIE Matcher (Fast, No CORS)
```

---

## Prerequisites

- Azure Subscription (you already have this!)
- Azure Storage Account
- SharePoint Online access
- Azure AD App Registration

---

## Step 1: Create Azure Storage Account

### 1.1 Via Azure Portal:
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"** → **"Storage account"**
3. Fill in:
   - **Subscription**: Your Mile Medical subscription
   - **Resource Group**: Use existing (e.g., `rg-mile-medical-dashboard`)
   - **Storage account name**: `stmilemedicaltic` (must be unique, lowercase, no hyphens)
   - **Region**: Same as your Static Web App
   - **Performance**: Standard
   - **Redundancy**: LRS (Locally-redundant storage)
4. Click **"Review + Create"** → **"Create"**

### 1.2 Via Azure CLI:
```bash
# Login
az login

# Create storage account
az storage account create \
  --name stmilemedicaltic \
  --resource-group rg-mile-medical-dashboard \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Get connection string (save this!)
az storage account show-connection-string \
  --name stmilemedicaltic \
  --resource-group rg-mile-medical-dashboard \
  --output tsv
```

---

## Step 2: Create Blob Container

### 2.1 Via Azure Portal:
1. Navigate to your Storage Account
2. Left menu → **"Containers"**
3. Click **"+ Container"**
4. Name: `tie-vendor-catalog`
5. **Public access level**: **"Blob (anonymous read access for blobs only)"**
6. Click **"Create"**

### 2.2 Via Azure CLI:
```bash
az storage container create \
  --name tie-vendor-catalog \
  --account-name stmilemedicaltic \
  --public-access blob
```

---

## Step 3: Register Azure AD App for SharePoint Access

### 3.1 Via Azure Portal:
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **"Azure Active Directory"**
3. Left menu → **"App registrations"**
4. Click **"+ New registration"**
5. Fill in:
   - **Name**: `TIE-SharePoint-Sync`
   - **Supported account types**: Single tenant
   - **Redirect URI**: Leave empty
6. Click **"Register"**

### 3.2 Copy Important IDs:
After registration, note these values (you'll need them later):
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `edd2363d-c022-49f2-b7f7-a8f08b72af06` (your existing tenant)

### 3.3 Create Client Secret:
1. In your app registration → **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Description: `SharePoint Sync Secret`
4. Expires: 24 months
5. Click **"Add"**
6. **COPY THE SECRET VALUE IMMEDIATELY** (you can't see it again!)

### 3.4 Grant API Permissions:
1. App registration → **"API permissions"**
2. Click **"+ Add a permission"**
3. Choose **"Microsoft Graph"**
4. Choose **"Application permissions"**
5. Search and add:
   - `Sites.Read.All` (Read items in all site collections)
   - `Files.Read.All` (Read files in all site collections)
6. Click **"Add permissions"**
7. Click **"✓ Grant admin consent for Mile Medical"** (requires admin)
8. Confirm by clicking **"Yes"**

---

## Step 4: Get SharePoint Site/Drive/File IDs

### 4.1 Get Site ID:
```bash
# Using Microsoft Graph Explorer (https://developer.microsoft.com/en-us/graph/graph-explorer)
GET https://graph.microsoft.com/v1.0/sites/milemedical365.sharepoint.com:/sites/Milemedical2
```

Response includes `id` field - copy it.

### 4.2 Get Drive ID:
```bash
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives
```

Look for the drive containing your file, copy its `id`.

### 4.3 Get File ID:
You already have this: `155bdd1b-a840-4a8a-88a4-44a441cb0301`

**OR** get it via:
```bash
GET https://graph.microsoft.com/v1.0/sites/{site-id}/drives/{drive-id}/root/children
```

Find your file in the list and copy its `id`.

---

## Step 5: Deploy Azure Function

### 5.1 Create Function App:
1. Azure Portal → **"Create a resource"** → **"Function App"**
2. Fill in:
   - **Function App name**: `func-tie-sharepoint-sync`
   - **Runtime stack**: Node.js
   - **Version**: 18 LTS
   - **Region**: Same as storage account
   - **Operating System**: Linux
   - **Plan type**: Consumption (Serverless)
3. Click **"Review + Create"** → **"Create"**

### 5.2 Configure Function App Settings:
1. Navigate to your Function App
2. Left menu → **"Configuration"**
3. Click **"+ New application setting"** for each:

| Name | Value |
|------|-------|
| `SHAREPOINT_CLIENT_ID` | Your app client ID from Step 3.2 |
| `SHAREPOINT_CLIENT_SECRET` | Your app secret from Step 3.3 |
| `SHAREPOINT_TENANT_ID` | `edd2363d-c022-49f2-b7f7-a8f08b72af06` |
| `SHAREPOINT_SITE_ID` | From Step 4.1 |
| `SHAREPOINT_DRIVE_ID` | From Step 4.2 |
| `SHAREPOINT_FILE_ID` | `155bdd1b-a840-4a8a-88a4-44a441cb0301` |
| `AZURE_STORAGE_CONNECTION_STRING` | From Step 1.2 |
| `BLOB_CONTAINER_NAME` | `tie-vendor-catalog` |

4. Click **"Save"**

### 5.3 Deploy Function Code:

#### Option A: Using VS Code (Recommended):
1. Install **"Azure Functions"** extension in VS Code
2. Open `/azure-functions` folder
3. Run `npm install`
4. Click Azure icon in sidebar
5. Right-click your Function App → **"Deploy to Function App"**
6. Confirm

#### Option B: Using Azure CLI:
```bash
cd azure-functions
npm install
func azure functionapp publish func-tie-sharepoint-sync
```

#### Option C: Manual ZIP deployment:
1. In `/azure-functions` folder, run: `npm install`
2. Zip everything (including node_modules)
3. Azure Portal → Your Function App → **"Deployment Center"**
4. Choose **"ZIP Deploy"**
5. Upload your zip file

---

## Step 6: Test the Function

### 6.1 Manual Test:
1. Azure Portal → Your Function App → **"Functions"**
2. Click **"sharepoint-sync"**
3. Click **"Code + Test"** (left menu)
4. Click **"Test/Run"** (top toolbar)
5. Click **"Run"**
6. Check **"Logs"** panel for output

### 6.2 Verify Blob Storage:
1. Go to Storage Account → **"Containers"** → **"tie-vendor-catalog"**
2. You should see `vendor_items.xlsx`
3. Click it → Copy **"URL"**
4. Save this URL - you'll need it!

Example URL:
```
https://stmilemedicaltic.blob.core.windows.net/tie-vendor-catalog/vendor_items.xlsx
```

---

## Step 7: Update TIE Matcher Configuration

### 7.1 Update Blob URL:
Edit `/tie/js/matcher-v3.1.js`:

```javascript
const SHAREPOINT_CONFIG = {
    // Replace STORAGE_ACCOUNT_NAME with your actual storage account name
    blobStorageUrl: 'https://stmilemedicaltic.blob.core.windows.net/tie-vendor-catalog/vendor_items.xlsx',
    // ... rest of config
};
```

### 7.2 Commit and Deploy:
```bash
git add tie/js/matcher-v3.1.js
git commit -m "feat: Configure Azure Blob Storage URL for vendor catalog"
git push origin main
```

---

## Step 8: Verify End-to-End

1. Wait 2-3 minutes for deployment
2. Open: https://dashboard.milemedical.com/tie/matcher.html
3. Open browser console (F12)
4. You should see: `✅ Loaded from Azure Blob Storage`
5. Click **"🔄 Reload Catalog"** button to test
6. Verify products load correctly

---

## 🔄 How It Works

### Automatic Syncing:
- Azure Function runs **every 5 minutes**
- Downloads latest file from SharePoint
- Uploads to Azure Blob Storage
- TIE Matcher always gets latest data

### Manual Sync (if needed):
- Azure Portal → Function App → **"sharepoint-sync"** → **"Run"**

### Monitoring:
- Function App → **"Monitor"** → See all sync runs
- Application Insights → Detailed logs

---

## 📝 How to Update Vendor Catalog

### Easy Process:
1. Open your SharePoint Excel file
2. Add/edit rows with products
3. Save the file
4. Wait 5 minutes (automatic sync)
5. TIE Matcher has new data!

### Immediate Sync (no waiting):
1. Azure Portal → Your Function
2. Click **"Run"** to trigger immediately
3. OR click **"🔄 Reload Catalog"** in TIE Matcher after sync

---

## 🐛 Troubleshooting

### Function Fails to Run:
- Check **"Monitor"** tab for error details
- Verify all environment variables are set
- Ensure app has **"Sites.Read.All"** permission granted

### "403 Forbidden" Error:
- Grant admin consent for API permissions (Step 3.4)
- Wait 5 minutes for permissions to propagate

### "404 Not Found" Error:
- Verify Site ID, Drive ID, and File ID are correct
- Check file still exists in SharePoint

### TIE Matcher Shows "Using local backup":
- Blob URL might be wrong - check Step 7.1
- Storage container might not be public - check Step 2

### Sync Runs But File Not Updated:
- Check function logs for upload errors
- Verify storage connection string is correct

---

## 💰 Cost Estimate

### Monthly Cost (Approximate):
- **Storage Account**: $0.50/month (minimal data)
- **Function App**: $0.00 (free tier covers this)
- **Bandwidth**: $0.10/month (minimal downloads)

**Total**: ~$0.60/month 💸

---

## 🔒 Security Best Practices

1. ✅ App uses Application permissions (no user credentials)
2. ✅ Client secret stored in Azure (not in code)
3. ✅ Blob storage is read-only for public
4. ✅ SharePoint file access is limited to specific file
5. ✅ No credentials stored in frontend code

---

## 📚 Additional Resources

- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/overview)

---

## ✅ Success Checklist

- [ ] Azure Storage Account created
- [ ] Blob container created with public access
- [ ] Azure AD App registered
- [ ] Client secret created and saved
- [ ] API permissions granted (admin consent)
- [ ] Site ID, Drive ID, File ID obtained
- [ ] Function App created
- [ ] Environment variables configured
- [ ] Function code deployed
- [ ] Function tested successfully
- [ ] Blob URL updated in TIE Matcher code
- [ ] Changes committed and deployed
- [ ] TIE Matcher loading from Blob Storage

---

## 🎉 You're Done!

Your vendor catalog now syncs automatically from SharePoint to Azure Blob Storage every 5 minutes!

**Need Help?** Check the troubleshooting section or review function logs in Azure Portal.
