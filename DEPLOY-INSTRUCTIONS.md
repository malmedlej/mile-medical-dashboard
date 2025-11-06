# 🚀 Deploy to Azure Production - Instructions

## ⚡ Quick Start (2 Commands)

```bash
# 1. Clone and navigate
git clone https://github.com/malmedlej/mile-medical-dashboard.git
cd mile-medical-dashboard

# 2. Run deployment script
./DEPLOY-TO-AZURE-NOW.sh
```

**That's it!** The script handles everything automatically.

---

## 📋 What the Script Does

The `DEPLOY-TO-AZURE-NOW.sh` script will:

1. ✅ **Check prerequisites** (Azure CLI, func tools, Node.js)
2. ✅ **Login to Azure** (if needed)
3. ✅ **Load credentials** from local.settings.json
4. ✅ **Create Azure resources**:
   - Resource Group: `mile-medical-rg`
   - Storage Account: `milemedicalstorage`
   - Function App: `mile-medical-sharepoint-func`
5. ✅ **Configure environment variables** in Azure
6. ✅ **Deploy function code**
7. ✅ **Configure CORS**
8. ✅ **Test deployment** (CREATE and LIST endpoints)
9. ✅ **Update frontend** URL to production
10. ✅ **Commit and push** changes to GitHub
11. ✅ **Provide verification instructions**

**Time**: ~5-10 minutes for complete deployment

---

## 🔧 Prerequisites

Before running the script, ensure you have:

### 1. Azure CLI
```bash
# Check if installed
az --version

# If not installed:
# Windows: winget install Microsoft.AzureCLI
# macOS: brew install azure-cli
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 2. Azure Functions Core Tools
```bash
# Check if installed
func --version

# If not installed:
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### 3. Node.js 18+
```bash
# Check version
node --version

# Should show v18.x or higher
```

### 4. Azure AD Credentials
Ensure `azure-functions/sharepoint-rfq/local.settings.json` contains:
- AZURE_TENANT_ID
- AZURE_CLIENT_ID
- AZURE_CLIENT_SECRET

---

## 🎯 Step-by-Step Deployment

### Option 1: Automated (Recommended)
```bash
cd mile-medical-dashboard
./DEPLOY-TO-AZURE-NOW.sh
```

### Option 2: Manual Commands
If you prefer to run commands manually:

```bash
# Login
az login

# Set variables
FUNCTION_APP_NAME="mile-medical-sharepoint-func"
RESOURCE_GROUP="mile-medical-rg"
LOCATION="eastus"

# Create resources
az group create --name $RESOURCE_GROUP --location $LOCATION

az storage account create \
  --name milemedicalstorage \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

az functionapp create \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --storage-account milemedicalstorage \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --consumption-plan-location $LOCATION \
  --os-type Linux

# Configure settings (replace with your values)
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    SHAREPOINT_SITE_URL="https://milemedical365.sharepoint.com/sites/MileMedical2" \
    AZURE_TENANT_ID="your-tenant-id" \
    AZURE_CLIENT_ID="your-client-id" \
    AZURE_CLIENT_SECRET="your-client-secret" \
    NODE_ENV="production"

# Deploy code
cd azure-functions/sharepoint-rfq
npm install
func azure functionapp publish $FUNCTION_APP_NAME --javascript
```

---

## 🧪 Testing After Deployment

### Automated Test (included in script)
The deployment script automatically tests the function by:
1. Creating a test RFQ in SharePoint
2. Verifying the response is successful
3. Checking the LIST endpoint

### Manual Test
```bash
FUNCTION_URL="https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq"

# Test CREATE
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "rfqId": "MANUAL-TEST-001",
    "matchedCount": 1,
    "totalCount": 2,
    "notFound": 1,
    "matchRate": 50,
    "notes": "Manual test"
  }'

# Test LIST
curl "$FUNCTION_URL"
```

### End-to-End Test (in Dashboard)
1. Open `tie/matcher.html` in browser
2. Upload RFQ Excel file
3. Click "Save to Archive"
4. Verify success message
5. Check SharePoint list for new item

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] **Function Status**: Azure Portal shows "Running"
- [ ] **CREATE Test**: Successfully creates test RFQ
- [ ] **SharePoint**: Test item appears in "TIE RFQ Archive" list
- [ ] **LIST Test**: Returns array of RFQs
- [ ] **Frontend**: Updated with production URL
- [ ] **Git**: Changes committed and pushed
- [ ] **End-to-End**: Dashboard uploads work

---

## 📊 Monitoring

### View Logs
```bash
# Real-time logs
az webapp log tail \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg

# Or in Azure Portal:
# Function App → Monitor → Log stream
```

### Check Status
```bash
az functionapp show \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --query "state"
```

### Application Insights
- Azure Portal → mile-medical-sharepoint-func → Application Insights
- View: Requests, Failures, Performance

---

## 🚨 Troubleshooting

### "Azure CLI not found"
Install from: https://aka.ms/azure-cli

### "func not found"
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### "Authentication failed"
- Verify credentials in `local.settings.json`
- Ensure Azure AD app has SharePoint permissions
- Check admin consent was granted

### "Deployment failed"
- Check Azure CLI is logged in: `az account show`
- Verify subscription has permissions
- Review error message in script output
- Check Azure Portal for detailed error logs

### "Function returns 500 error"
- Check Application Settings in Azure Portal
- Verify all environment variables are set
- View function logs for error details
- Test SharePoint connection manually

---

## 🎉 Success!

Once deployment completes successfully:

✅ **Function URL**: https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq  
✅ **SharePoint List**: https://milemedical365.sharepoint.com/sites/MileMedical2 → "TIE RFQ Archive"  
✅ **Frontend**: Updated to use production endpoint  
✅ **Status**: LIVE and ready for production use

---

## 📞 Need Help?

- **Detailed Guides**: See `azure-functions/sharepoint-rfq/` directory
- **Quick Checklist**: `DEPLOYMENT-QUICK-CHECKLIST.md`
- **Complete Guide**: `DEPLOY-NOW.md`
- **Azure Support**: https://portal.azure.com → Support

---

## 🎯 What's Next?

After successful deployment:

1. **Test thoroughly** - Upload several RFQs to verify
2. **Monitor usage** - Watch logs for first few days
3. **Train users** - Brief demo of archive feature
4. **Plan enhancements** - Archive page UI, reporting, etc.

---

**Function App**: `mile-medical-sharepoint-func`  
**Repository**: https://github.com/malmedlej/mile-medical-dashboard  
**Status**: Ready to deploy!

**Run `./DEPLOY-TO-AZURE-NOW.sh` to begin!** 🚀
