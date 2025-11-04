# 🚀 Let's Set This Up RIGHT NOW!

Follow these steps IN ORDER. I've simplified everything to make it super easy.

---

## ✅ STEP 1: Create Azure Storage Account (5 minutes)

### Open Azure Portal:
1. Go to: https://portal.azure.com
2. Sign in with your Mile Medical account

### Create Storage:
1. Click **"Create a resource"** (top left, or search bar)
2. Search for: **"Storage account"**
3. Click **"Storage account"** → **"Create"**

### Fill in the form:
```
Subscription: [Your Mile Medical subscription]
Resource Group: mile-medical-rg (select existing)
Storage account name: stmilemedicaltic
Region: East US (or same as your dashboard)
Performance: Standard
Redundancy: LRS (Locally-redundant storage)
```

4. Click **"Review + Create"**
5. Click **"Create"**
6. Wait ~2 minutes for deployment
7. Click **"Go to resource"**

### Get Connection String (SAVE THIS!):
1. In your storage account, left menu → **"Access keys"**
2. Click **"Show"** next to key1
3. Copy the entire **"Connection string"** 
4. **SAVE IT** in a notepad (you'll need it later!)

Example format:
```
DefaultEndpointsProtocol=https;AccountName=stmilemedicaltic;AccountKey=LONG_KEY_HERE;EndpointSuffix=core.windows.net
```

---

## ✅ STEP 2: Create Blob Container (2 minutes)

### Still in Storage Account:
1. Left menu → **"Containers"**
2. Click **"+ Container"** (top)
3. Fill in:
   ```
   Name: tie-vendor-catalog
   Public access level: Blob (anonymous read access for blobs only)
   ```
4. Click **"Create"**

### You should now see:
- Container name: `tie-vendor-catalog`
- Public access: `Blob`

---

## ✅ STEP 3: Register Azure AD App (7 minutes)

### Create App Registration:
1. Azure Portal search bar → Type: **"Azure Active Directory"**
2. Click **"Azure Active Directory"**
3. Left menu → **"App registrations"**
4. Click **"+ New registration"**
5. Fill in:
   ```
   Name: TIE-SharePoint-Sync
   Supported account types: Accounts in this organizational directory only (Mile Medical only - Single tenant)
   Redirect URI: Leave empty
   ```
6. Click **"Register"**

### Save These IDs (IMPORTANT!):
After registration, you'll see the Overview page. **COPY AND SAVE**:

1. **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Copy this, save it as "CLIENT_ID"

2. **Directory (tenant) ID**: `edd2363d-c022-49f2-b7f7-a8f08b72af06`
   - Copy this, save it as "TENANT_ID"

### Create Client Secret:
1. Left menu → **"Certificates & secrets"**
2. Click **"+ New client secret"**
3. Fill in:
   ```
   Description: SharePoint Sync Secret
   Expires: 24 months
   ```
4. Click **"Add"**
5. **IMMEDIATELY COPY THE "Value"** (the secret itself, NOT the Secret ID!)
6. **SAVE IT** as "CLIENT_SECRET" - you can't see it again!

Example: `abc123~DEF456_ghi789-jkl012`

### Add API Permissions:
1. Left menu → **"API permissions"**
2. Click **"+ Add a permission"**
3. Click **"Microsoft Graph"**
4. Click **"Application permissions"** (NOT Delegated)
5. Search for: **"Sites.Read.All"**
   - Check the box for **"Sites.Read.All"**
6. Search for: **"Files.Read.All"**
   - Check the box for **"Files.Read.All"**
7. Click **"Add permissions"**

### Grant Admin Consent (CRITICAL!):
1. You should see your 2 permissions listed
2. Click **"✓ Grant admin consent for Mile Medical"** (top button)
3. Click **"Yes"** to confirm
4. Wait a few seconds
5. Verify both permissions show **"Granted for Mile Medical"** in green

---

## ✅ STEP 4: Get SharePoint IDs (10 minutes)

This is the trickiest part. We need 3 IDs from your SharePoint.

### Option A: Using Graph Explorer (Easiest)

1. Open: https://developer.microsoft.com/en-us/graph/graph-explorer
2. Click **"Sign in to Graph Explorer"**
3. Sign in with your Mile Medical account

### Get Site ID:
1. In the query box, paste:
   ```
   https://graph.microsoft.com/v1.0/sites/milemedical365.sharepoint.com:/sites/Milemedical2
   ```
2. Click **"Run query"**
3. In the response, find: `"id": "LONG-SITE-ID-HERE"`
4. Copy the entire ID value
5. **SAVE IT** as "SITE_ID"

Example: `milemedical365.sharepoint.com,abc123,def456`

### Get Drive ID:
1. In the query box, paste (replace `YOUR-SITE-ID` with the ID from above):
   ```
   https://graph.microsoft.com/v1.0/sites/YOUR-SITE-ID/drives
   ```
2. Click **"Run query"**
3. Look through the results for the drive containing your file
4. Copy the `"id"` of that drive
5. **SAVE IT** as "DRIVE_ID"

Example: `b!abc123def456ghi789jkl012mno345pqr678stu901`

### File ID (You Already Have This!):
```
SAVE as "FILE_ID": 155bdd1b-a840-4a8a-88a4-44a441cb0301
```

### Option B: I'll Help You Get These

If Graph Explorer is confusing, just tell me and I'll provide alternative PowerShell commands you can run.

---

## ✅ STEP 5: Create Function App (5 minutes)

### Create Function:
1. Azure Portal → **"Create a resource"**
2. Search: **"Function App"**
3. Click **"Function App"** → **"Create"**

### Fill in:
```
Subscription: [Your subscription]
Resource Group: mile-medical-rg (existing)
Function App name: func-tie-sharepoint-sync
Publish: Code
Runtime stack: Node.js
Version: 18 LTS
Region: East US (same as storage)
Operating System: Linux
Plan type: Consumption (Serverless)
```

### Storage (Important!):
- **Storage account**: Select the one you just created (**stmilemedicaltic**)

4. Click **"Review + Create"**
5. Click **"Create"**
6. Wait ~3 minutes for deployment
7. Click **"Go to resource"**

---

## ✅ STEP 6: Configure Function App (5 minutes)

### Add Environment Variables:

1. In your Function App, left menu → **"Configuration"**
2. Click **"+ New application setting"** for EACH of these:

| Name | Value | Your Note |
|------|-------|-----------|
| `SHAREPOINT_CLIENT_ID` | [Paste CLIENT_ID from Step 3] | App registration client ID |
| `SHAREPOINT_CLIENT_SECRET` | [Paste CLIENT_SECRET from Step 3] | App secret value |
| `SHAREPOINT_TENANT_ID` | `edd2363d-c022-49f2-b7f7-a8f08b72af06` | Your tenant ID |
| `SHAREPOINT_SITE_ID` | [Paste SITE_ID from Step 4] | From Graph Explorer |
| `SHAREPOINT_DRIVE_ID` | [Paste DRIVE_ID from Step 4] | From Graph Explorer |
| `SHAREPOINT_FILE_ID` | `155bdd1b-a840-4a8a-88a4-44a441cb0301` | Your file ID |
| `AZURE_STORAGE_CONNECTION_STRING` | [Paste from Step 1] | Storage connection string |
| `BLOB_CONTAINER_NAME` | `tie-vendor-catalog` | Container name |

3. After adding ALL settings, click **"Save"** (top)
4. Click **"Continue"** to confirm restart

---

## ✅ STEP 7: Deploy Function Code (10 minutes)

### Option A: Using VS Code (Recommended)

1. **Install Azure Functions extension**:
   - Open VS Code
   - Extensions (Ctrl+Shift+X)
   - Search: **"Azure Functions"**
   - Install it

2. **Open the azure-functions folder**:
   - In VS Code: File → Open Folder
   - Navigate to: `/home/user/webapp/azure-functions`
   - Click **"Select Folder"**

3. **Install dependencies**:
   - Open Terminal in VS Code (Ctrl+`)
   - Run: `npm install`

4. **Deploy**:
   - Click **Azure icon** in left sidebar
   - Under "Functions" section, click **"Deploy to Function App"**
   - Select: **"func-tie-sharepoint-sync"**
   - Confirm deployment
   - Wait ~2 minutes

### Option B: Using Azure Portal (Direct Upload)

1. **Prepare the package**:
   - On your computer, navigate to: `/home/user/webapp/azure-functions`
   - Open terminal/command prompt there
   - Run: `npm install`
   - Zip the entire folder (including node_modules)
   - Name it: `function.zip`

2. **Upload to Azure**:
   - Azure Portal → Your Function App
   - Left menu → **"Deployment Center"**
   - Click **"Manual Deployment (Push/Sync)"**
   - Under "Deploy from", choose: **"ZIP Deploy"**
   - Click **"Browse"** and select your `function.zip`
   - Click **"Upload"**
   - Wait for "Deployment successful"

---

## ✅ STEP 8: Test the Function (3 minutes)

### Run It Manually:

1. Azure Portal → Your Function App
2. Left menu → **"Functions"**
3. You should see: **"sharepoint-sync"**
4. Click on **"sharepoint-sync"**
5. Left menu → **"Code + Test"**
6. Top toolbar → Click **"Test/Run"**
7. Click **"Run"** button
8. Watch the **"Logs"** panel at bottom

### What You Should See:
```
🚀 SharePoint Sync Function triggered at: 2024-11-04...
📂 Loading vendor catalog from SharePoint...
🔑 Getting SharePoint access token...
✅ Access token obtained
📥 Downloading file from SharePoint...
✅ Downloaded 12345 bytes from SharePoint
📤 Uploading to Azure Blob Storage...
✅ Uploaded to: https://stmilemedicaltic.blob.core.windows.net/tie-vendor-catalog/vendor_items.xlsx
✅ Upload completed with metadata
✅ Sync completed successfully
```

### If You See Errors:
- Check the logs carefully
- Verify all environment variables are correct
- Make sure API permissions were granted (Step 3)
- Try running again (sometimes first run fails)

---

## ✅ STEP 9: Get Blob URL (1 minute)

### Find Your File:

1. Azure Portal → Storage Account **"stmilemedicaltic"**
2. Left menu → **"Containers"**
3. Click **"tie-vendor-catalog"**
4. You should see: **"vendor_items.xlsx"**
5. Click on the file
6. Copy the **"URL"** field

Example:
```
https://stmilemedicaltic.blob.core.windows.net/tie-vendor-catalog/vendor_items.xlsx
```

### ⚠️ SEND ME THIS URL!

**Reply with the blob URL so I can update the TIE Matcher code!**

---

## ✅ STEP 10: I'll Update the Code (2 minutes)

Once you give me the blob URL, I'll:
1. Update `tie/js/matcher-v3.1.js` with your URL
2. Commit and push the changes
3. Changes will deploy automatically

---

## ✅ STEP 11: Test Everything! (2 minutes)

After I update the code:

1. Wait 2-3 minutes for deployment
2. Open: https://dashboard.milemedical.com/tie/matcher.html
3. Open browser console (F12)
4. Look for: `✅ Loaded from Azure Blob Storage`
5. Click **"🔄 Reload Catalog"** button
6. Should reload from blob!

---

## 🎉 YOU'RE DONE!

After setup, to update your catalog:
1. Edit SharePoint Excel file
2. Save
3. Wait 5 minutes (auto-sync)
4. TIE Matcher has new data!

---

## 📞 Need Help?

At ANY point, if you're stuck:
1. Take a screenshot
2. Tell me which step
3. I'll help you through it!

Let's start with **STEP 1**. Tell me when you've completed it! 🚀
