# ✅ Quick Deployment Checklist

**Function App Name**: `mile-medical-sharepoint-func`  
**Target**: Azure Production Environment  
**Estimated Time**: 30-45 minutes

---

## 📋 Pre-Deployment (5 minutes)

- [ ] **Azure CLI installed**: Run `az --version`
- [ ] **Functions Core Tools installed**: Run `func --version`
- [ ] **Node.js 18+ installed**: Run `node --version`
- [ ] **Repository cloned**: Clone from GitHub
- [ ] **Credentials ready**: Have Azure AD credentials available

---

## 🔧 Deployment Steps (20-30 minutes)

### Step 1: Prepare Local Environment
```bash
cd mile-medical-dashboard/azure-functions/sharepoint-rfq
npm install
cp local.settings.json.template local.settings.json
# Edit local.settings.json with your credentials
```
- [ ] Dependencies installed
- [ ] local.settings.json configured

### Step 2: Azure Login
```bash
az login
az account show  # Verify correct subscription
```
- [ ] Logged into Azure
- [ ] Correct subscription selected

### Step 3: Create Azure Resources
```bash
# Resource Group
az group create --name mile-medical-rg --location eastus

# Storage Account
az storage account create \
  --name milemedicalstorage \
  --resource-group mile-medical-rg \
  --location eastus \
  --sku Standard_LRS

# Function App
az functionapp create \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --storage-account milemedicalstorage \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --consumption-plan-location eastus \
  --os-type Linux
```
- [ ] Resource group created
- [ ] Storage account created
- [ ] Function app created

### Step 4: Configure Environment Variables
```bash
az functionapp config appsettings set \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --settings \
    SHAREPOINT_SITE_URL="https://milemedical365.sharepoint.com/sites/MileMedical2" \
    AZURE_TENANT_ID="your-tenant-id" \
    AZURE_CLIENT_ID="your-client-id" \
    AZURE_CLIENT_SECRET="your-client-secret" \
    NODE_ENV="production"
```
- [ ] Environment variables configured in Azure

### Step 5: Deploy Function Code
```bash
func azure functionapp publish mile-medical-sharepoint-func --javascript
```
- [ ] Function code deployed
- [ ] Deployment successful message received

### Step 6: Configure CORS (via Portal)
1. Go to Azure Portal → Function App
2. API → CORS
3. Add allowed origins
- [ ] CORS configured

---

## 🧪 Testing (10 minutes)

### Test 1: Function Availability
```bash
curl https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq
```
- [ ] Function responds (not 404)

### Test 2: CREATE Endpoint
```bash
curl -X POST https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq \
  -H "Content-Type: application/json" \
  -d '{"rfqId": "TEST-001", "matchedCount": 1, "totalCount": 2, "notFound": 1, "matchRate": 50}'
```
- [ ] Returns success response
- [ ] Returns item ID

### Test 3: SharePoint Verification
1. Open: https://milemedical365.sharepoint.com/sites/MileMedical2
2. Go to "TIE RFQ Archive" list
3. Find TEST-001 item
- [ ] Item appears in SharePoint
- [ ] All fields populated correctly

### Test 4: LIST Endpoint
```bash
curl https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq
```
- [ ] Returns list of RFQs
- [ ] Includes test item

---

## 🎨 Frontend Update (5 minutes)

### Update Configuration
Edit `tie/js/sharepoint-client.js`:
```javascript
// Line ~12
this.azureFunctionUrl = 'https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq';
```
- [ ] File updated with production URL

### Commit and Deploy
```bash
git add tie/js/sharepoint-client.js
git commit -m "Update Azure Function URL to production"
git push origin main
```
- [ ] Changes committed
- [ ] Changes pushed
- [ ] Frontend deployed (if auto-deploy configured)

---

## 🎯 End-to-End Test (5 minutes)

### Dashboard Test
1. Open TIE Matcher in browser
2. Upload RFQ Excel file
3. Click "Save to Archive"
4. Check for success message
- [ ] Upload works
- [ ] Save button works
- [ ] Success toast appears
- [ ] No console errors

### SharePoint Verification
1. Refresh SharePoint list
2. Find newly created RFQ
3. Verify all data fields
- [ ] New RFQ appears
- [ ] All fields correct
- [ ] Match rate accurate

---

## 📊 Monitoring Setup (Optional but Recommended)

### Enable Application Insights
```bash
az monitor app-insights component create \
  --app mile-medical-app-insights \
  --location eastus \
  --resource-group mile-medical-rg

INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app mile-medical-app-insights \
  --resource-group mile-medical-rg \
  --query instrumentationKey -o tsv)

az functionapp config appsettings set \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```
- [ ] Application Insights created
- [ ] Linked to Function App
- [ ] Logs visible in portal

---

## ✅ Final Verification

- [ ] Function Status: **Running**
- [ ] Test Requests: **Passing**
- [ ] SharePoint Integration: **Working**
- [ ] Frontend: **Updated**
- [ ] End-to-End Flow: **Verified**
- [ ] Monitoring: **Enabled**
- [ ] Documentation: **Updated**

---

## 🎉 Success Criteria

### All Green? You're Live! 🚀

- ✅ Function deployed to Azure
- ✅ All API endpoints responding
- ✅ SharePoint integration verified
- ✅ Frontend calling production function
- ✅ End-to-end test successful
- ✅ No errors in logs

---

## 🚨 If Something Fails

### Function Not Deploying
1. Check Azure CLI is logged in: `az account show`
2. Verify resource group exists: `az group show --name mile-medical-rg`
3. Check for error messages in terminal
4. Review `deploy.sh` script output

### Function Returns Errors
1. Check Application Insights logs
2. Verify environment variables in Azure Portal
3. Test SharePoint connection manually
4. Review function logs: `az webapp log tail --name mile-medical-sharepoint-func`

### Frontend Not Connecting
1. Check CORS settings in Azure Portal
2. Verify URL in sharepoint-client.js is correct
3. Check browser console for errors
4. Ensure HTTPS (not HTTP) in URL

---

## 📞 Need Help?

**Detailed Guides:**
- `DEPLOY-NOW.md` - Full deployment guide
- `DEPLOYMENT-CHECKLIST.md` - Comprehensive checklist
- `README.md` - API documentation
- `TROUBLESHOOTING.md` - Common issues

**Azure Resources:**
- Azure Portal: https://portal.azure.com
- Function App URL: https://mile-medical-sharepoint-func.azurewebsites.net

---

## 🎯 Quick Commands Reference

```bash
# Login
az login

# Deploy
func azure functionapp publish mile-medical-sharepoint-func

# Test
curl https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq

# Logs
az webapp log tail --name mile-medical-sharepoint-func --resource-group mile-medical-rg

# Status
az functionapp show --name mile-medical-sharepoint-func --resource-group mile-medical-rg

# Restart
az functionapp restart --name mile-medical-sharepoint-func --resource-group mile-medical-rg
```

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Status**: [ ] Success  [ ] In Progress  [ ] Issues  
**Production URL**: https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq

---

**Print this checklist and check off items as you complete them!** ✓
