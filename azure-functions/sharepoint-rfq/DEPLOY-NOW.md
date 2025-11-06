# 🚀 Deploy to Azure - Step-by-Step Guide

**Function App Name**: `mile-medical-sharepoint-func`  
**Status**: Ready for deployment  
**Estimated Time**: 30-45 minutes

---

## 📦 Deployment Package Ready

All code is committed to GitHub and ready to deploy:
- **Repository**: https://github.com/malmedlej/mile-medical-dashboard
- **Branch**: main
- **Function Path**: `azure-functions/sharepoint-rfq`

---

## 🎯 Deployment Options

Choose the method that works best for you:

### **Option 1: Deploy from Your Local Machine** (Recommended)
### **Option 2: Deploy via Azure Portal**
### **Option 3: Deploy via GitHub Actions**

---

## 🖥️ **OPTION 1: Deploy from Local Machine**

### Step 1: Install Prerequisites

#### Install Azure CLI
```bash
# Windows (via winget)
winget install Microsoft.AzureCLI

# macOS (via Homebrew)
brew install azure-cli

# Linux (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify installation
az --version
```

#### Install Azure Functions Core Tools
```bash
# Windows (via npm)
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# macOS (via Homebrew)
brew tap azure/functions
brew install azure-functions-core-tools@4

# Linux (Ubuntu/Debian)
wget -q https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4

# Verify installation
func --version
```

### Step 2: Clone Repository (if not already)
```bash
git clone https://github.com/malmedlej/mile-medical-dashboard.git
cd mile-medical-dashboard/azure-functions/sharepoint-rfq
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Configure Environment Variables
```bash
# Copy template
cp local.settings.json.template local.settings.json

# Edit local.settings.json with your credentials:
# - SHAREPOINT_SITE_URL (already set)
# - AZURE_TENANT_ID
# - AZURE_CLIENT_ID
# - AZURE_CLIENT_SECRET
```

### Step 5: Login to Azure
```bash
az login

# Verify you're in the correct subscription
az account show

# If you need to switch subscriptions:
az account set --subscription "your-subscription-id"
```

### Step 6: Run Deployment Script
```bash
# Option A: Automated deployment (interactive)
./deploy.sh

# Option B: Manual deployment
# Create resource group (if doesn't exist)
az group create --name mile-medical-rg --location eastus

# Create storage account (if doesn't exist)
az storage account create \
  --name milemedicalstorage \
  --resource-group mile-medical-rg \
  --location eastus \
  --sku Standard_LRS

# Create Function App
az functionapp create \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --storage-account milemedicalstorage \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --consumption-plan-location eastus \
  --os-type Linux

# Configure environment variables
az functionapp config appsettings set \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --settings \
    SHAREPOINT_SITE_URL="https://milemedical365.sharepoint.com/sites/MileMedical2" \
    AZURE_TENANT_ID="your-tenant-id" \
    AZURE_CLIENT_ID="your-client-id" \
    AZURE_CLIENT_SECRET="your-client-secret" \
    NODE_ENV="production"

# Deploy function code
func azure functionapp publish mile-medical-sharepoint-func --javascript
```

### Step 7: Test Deployment
```bash
# Get function URL
FUNCTION_URL="https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq"

# Test CREATE endpoint
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "rfqId": "DEPLOY-TEST-001",
    "matchedItems": [{"catalog_number": "12345", "description": "Test Product"}],
    "notFoundItems": ["67890"],
    "matchedCount": 1,
    "totalCount": 2,
    "notFound": 1,
    "matchRate": 50,
    "notes": "Deployment verification test"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "✅ RFQ DEPLOY-TEST-001 saved successfully.",
#   "itemId": 123,
#   ...
# }

# Verify in SharePoint
# Go to: https://milemedical365.sharepoint.com/sites/MileMedical2
# Check "TIE RFQ Archive" list for the new item
```

---

## 🌐 **OPTION 2: Deploy via Azure Portal**

### Step 1: Create Function App

1. **Go to Azure Portal**: https://portal.azure.com
2. **Click** "Create a resource"
3. **Search** for "Function App"
4. **Click** "Create"

### Step 2: Configure Function App

**Basics Tab:**
- **Subscription**: Your Azure subscription
- **Resource Group**: Create new or select existing (e.g., `mile-medical-rg`)
- **Function App name**: `mile-medical-sharepoint-func`
- **Publish**: Code
- **Runtime stack**: Node.js
- **Version**: 18 LTS
- **Region**: East US (or your preferred region)
- **Operating System**: Linux

**Hosting Tab:**
- **Storage account**: Create new or use existing
- **Plan type**: Consumption (Serverless)

**Networking Tab:**
- Accept defaults

**Monitoring Tab:**
- **Enable Application Insights**: Yes (recommended)

**Tags Tab:**
- Add tags if needed (optional)

Click **Review + Create** → **Create**

### Step 3: Configure Application Settings

1. **Navigate** to your Function App: `mile-medical-sharepoint-func`
2. **Go to** Settings → Configuration
3. **Add** the following Application Settings:

| Name | Value |
|------|-------|
| SHAREPOINT_SITE_URL | https://milemedical365.sharepoint.com/sites/MileMedical2 |
| AZURE_TENANT_ID | your-tenant-id-here |
| AZURE_CLIENT_ID | your-client-id-here |
| AZURE_CLIENT_SECRET | your-client-secret-here |
| NODE_ENV | production |
| WEBSITE_NODE_DEFAULT_VERSION | ~18 |

4. **Click** "Save"
5. **Click** "Continue" when prompted

### Step 4: Deploy Code via ZIP

#### Prepare ZIP Package (on your local machine)
```bash
# Clone repository
git clone https://github.com/malmedlej/mile-medical-dashboard.git
cd mile-medical-dashboard/azure-functions/sharepoint-rfq

# Install production dependencies
npm install --production

# Create deployment package
zip -r sharepoint-rfq.zip . -x "*.git*" -x "local.settings.json" -x "test-local.sh" -x "deploy.sh" -x "*.md"
```

#### Deploy ZIP via Azure Portal
1. **Go to** your Function App → Deployment → Deployment Center
2. **Choose** "Local Git" or "External Git"
3. **Or use Azure CLI**:
   ```bash
   az functionapp deployment source config-zip \
     --resource-group mile-medical-rg \
     --name mile-medical-sharepoint-func \
     --src sharepoint-rfq.zip
   ```

#### Alternative: Deploy via VS Code
1. **Install** Azure Functions extension in VS Code
2. **Sign in** to Azure
3. **Right-click** function folder → "Deploy to Function App"
4. **Select** `mile-medical-sharepoint-func`
5. **Confirm** deployment

### Step 5: Configure CORS

1. **Go to** Function App → API → CORS
2. **Add** allowed origins:
   - `https://milemedical365.sharepoint.com`
   - Your dashboard domain (if different)
   - `*` (for testing only - remove in production)
3. **Click** "Save"

### Step 6: Test Function

1. **Go to** Function App → Functions
2. **Click** on `sharepoint-rfq` function
3. **Click** "Code + Test"
4. **Click** "Test/Run"
5. **Set** HTTP Method to POST
6. **Add** request body:
   ```json
   {
     "rfqId": "PORTAL-TEST-001",
     "matchedCount": 1,
     "totalCount": 2,
     "notFound": 1,
     "matchRate": 50,
     "notes": "Test from Azure Portal"
   }
   ```
7. **Click** "Run"
8. **Verify** response shows success

---

## 🤖 **OPTION 3: Deploy via GitHub Actions (CI/CD)**

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/azure-functions-deploy.yml`:

```yaml
name: Deploy Azure Function

on:
  push:
    branches:
      - main
    paths:
      - 'azure-functions/sharepoint-rfq/**'
  workflow_dispatch:

env:
  AZURE_FUNCTIONAPP_NAME: mile-medical-sharepoint-func
  AZURE_FUNCTIONAPP_PACKAGE_PATH: 'azure-functions/sharepoint-rfq'
  NODE_VERSION: '18.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 'Checkout GitHub Action'
        uses: actions/checkout@v3

      - name: Setup Node ${{ env.NODE_VERSION }} Environment
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: 'Resolve Project Dependencies'
        shell: bash
        run: |
          pushd './${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}'
          npm install
          npm run build --if-present
          npm run test --if-present
          popd

      - name: 'Run Azure Functions Action'
        uses: Azure/functions-action@v1
        with:
          app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
          package: ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

### Step 2: Get Publish Profile

1. **Go to** Azure Portal → Function App → `mile-medical-sharepoint-func`
2. **Click** "Get publish profile" (download)
3. **Copy** the entire XML content

### Step 3: Add GitHub Secret

1. **Go to** GitHub repository → Settings → Secrets and variables → Actions
2. **Click** "New repository secret"
3. **Name**: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
4. **Value**: Paste the publish profile XML
5. **Click** "Add secret"

### Step 4: Trigger Deployment

```bash
# Commit the workflow file
git add .github/workflows/azure-functions-deploy.yml
git commit -m "Add Azure Functions deployment workflow"
git push origin main

# The deployment will trigger automatically
```

---

## ✅ Post-Deployment Verification

### 1. Check Function Status

**Azure Portal:**
- Navigate to Function App → Overview
- Verify status is "Running"
- Check "Functions" tab shows `sharepoint-rfq`

**Azure CLI:**
```bash
az functionapp show \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --query "state" -o tsv
```

### 2. Test API Endpoints

```bash
# Base URL
FUNCTION_URL="https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq"

# Test CREATE
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"rfqId": "TEST-001", "matchedCount": 1, "totalCount": 2, "notFound": 1, "matchRate": 50}'

# Test LIST
curl "$FUNCTION_URL"

# Test GET (replace 123 with actual item ID)
curl "$FUNCTION_URL/123"
```

### 3. Verify SharePoint Integration

1. **Open SharePoint**: https://milemedical365.sharepoint.com/sites/MileMedical2
2. **Navigate** to "TIE RFQ Archive" list
3. **Verify** test RFQ appears
4. **Check** all fields are populated correctly

### 4. Monitor Logs

**Azure Portal:**
- Function App → Monitor → Log stream
- Watch for successful executions

**Azure CLI:**
```bash
az webapp log tail \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg
```

---

## 🔧 Update Frontend Configuration

After successful deployment, update the dashboard to use the production endpoint.

### Edit Frontend File

File: `tie/js/sharepoint-client.js`

```javascript
// Find this line (around line 10-15):
this.azureFunctionUrl = 'http://localhost:7071/api/sharepoint-rfq';

// Replace with production URL:
this.azureFunctionUrl = 'https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq';
```

### Commit and Deploy

```bash
cd /path/to/mile-medical-dashboard

# Update frontend
git add tie/js/sharepoint-client.js
git commit -m "Update Azure Function URL to production endpoint"
git push origin main

# Deploy frontend (method depends on your hosting)
# If using GitHub Pages, Cloudflare Pages, etc., push will trigger deployment
```

---

## 🧪 End-to-End Testing

### Test from Dashboard

1. **Open** TIE Matcher: `tie/matcher.html`
2. **Upload** an RFQ Excel file
3. **Wait** for matching results to display
4. **Click** "Save to Archive" button
5. **Verify** success toast: "✅ RFQ saved to SharePoint"
6. **Check** browser console (F12) for any errors

### Verify in SharePoint

1. **Open** SharePoint list: https://milemedical365.sharepoint.com/sites/MileMedical2
2. **Go to** "TIE RFQ Archive"
3. **Find** your RFQ in the list
4. **Verify** all fields:
   - Title (RFQ ID)
   - RFQDate
   - Status = "New"
   - MatchedCount
   - TotalCount
   - NotFound
   - MatchRate
   - Notes

### Test Different Scenarios

1. **Upload valid RFQ** → Should save successfully
2. **Upload large RFQ** (100+ items) → Should handle properly
3. **Upload from different browser** → Test CORS
4. **Upload from different device** → Test mobile compatibility

---

## 🚨 Troubleshooting

### Issue: Function Not Found (404)
**Solution:**
- Verify function deployed: Azure Portal → Functions tab
- Check function name matches route: `/api/sharepoint-rfq`
- Restart function app if needed

### Issue: 401 Unauthorized
**Solution:**
- Verify application settings in Azure Portal
- Check AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
- Ensure Azure AD app has SharePoint permissions granted

### Issue: CORS Error
**Solution:**
- Add frontend domain to CORS settings
- Azure Portal → Function App → CORS
- Add `https://yourdomain.com` or `*` for testing

### Issue: 500 Internal Server Error
**Solution:**
- Check Application Insights logs
- Azure Portal → Monitor → Logs
- Look for error messages
- Verify SharePoint list exists and is accessible

### Issue: Slow Response Times
**Solution:**
- First request may be slow (cold start)
- Consider upgrading to Premium plan
- Implement keep-alive ping
- Check SharePoint site responsiveness

---

## 📊 Monitoring & Maintenance

### Enable Application Insights (if not already)

```bash
# Create Application Insights
az monitor app-insights component create \
  --app mile-medical-app-insights \
  --location eastus \
  --resource-group mile-medical-rg

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app mile-medical-app-insights \
  --resource-group mile-medical-rg \
  --query instrumentationKey -o tsv)

# Link to Function App
az functionapp config appsettings set \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

### Set Up Alerts

1. **Go to** Function App → Monitoring → Alerts
2. **Create** alert rules for:
   - Function failures > 5 per hour
   - Response time > 5 seconds
   - HTTP 5xx errors > 10 per hour

### Review Metrics Regularly

**Daily:**
- Check function execution count
- Review error logs
- Monitor response times

**Weekly:**
- Analyze usage patterns
- Review performance metrics
- Check for warnings

**Monthly:**
- Update dependencies
- Review security
- Optimize as needed

---

## 🎯 Success Checklist

After deployment, verify all these items:

- [ ] Function App created: `mile-medical-sharepoint-func`
- [ ] Environment variables configured in Azure
- [ ] Function code deployed successfully
- [ ] Function shows as "Running" in portal
- [ ] CORS configured for frontend domain
- [ ] CREATE endpoint tested successfully
- [ ] LIST endpoint tested successfully
- [ ] SharePoint integration verified (item created)
- [ ] Frontend updated with production URL
- [ ] End-to-end test completed
- [ ] No errors in browser console
- [ ] Application Insights logging enabled
- [ ] Alerts configured
- [ ] Documentation updated with production URL

---

## 🎉 You're Live!

Once all checks pass, your SharePoint integration is **LIVE IN PRODUCTION**! 🚀

### What You've Achieved:
✅ **Centralized RFQ Storage** in SharePoint  
✅ **Organization-Wide Visibility**  
✅ **Enterprise-Grade Architecture**  
✅ **Automated Deployment Pipeline**  
✅ **Comprehensive Monitoring**

### Next Steps:
- Monitor usage for first week
- Gather user feedback
- Consider implementing Archive page UI
- Plan additional features (reporting, analytics, etc.)

---

## 📞 Need Help?

- **Documentation**: See other MD files in this directory
- **Azure Support**: https://portal.azure.com → Support
- **GitHub Issues**: https://github.com/malmedlej/mile-medical-dashboard/issues

---

**Deployment Guide Version**: 1.0  
**Last Updated**: 2025-01-06  
**Function App**: `mile-medical-sharepoint-func`  
**Status**: 🚀 **READY TO DEPLOY**
