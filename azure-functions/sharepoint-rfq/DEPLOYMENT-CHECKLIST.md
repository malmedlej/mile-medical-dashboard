# 🚀 Azure Function Deployment Checklist

## ✅ Pre-Deployment Verification

### Local Testing Status
- [x] **SharePoint connection working** - Confirmed via local testing
- [x] **Environment variables configured** - local.settings.json in place
- [x] **CURL testing successful** - RFQ creation verified
- [x] **All data fields mapping correctly** - totalCount, matchedCount, notFound, matchRate, notes
- [x] **JSON responses formatted properly** - ✅ RFQ {id} saved successfully
- [x] **Route aliases added** - Multiple endpoint formats supported

### Route Configuration
The function now supports multiple endpoint formats:

#### Create RFQ (POST)
```bash
# Format 1: Explicit action
POST https://{function-app}.azurewebsites.net/api/sharepoint-rfq/create

# Format 2: Default route (auto-infers from POST method)
POST https://{function-app}.azurewebsites.net/api/sharepoint-rfq

# Format 3: Direct action parameter
POST https://{function-app}.azurewebsites.net/api/sharepoint-rfq
```

#### List RFQs (GET)
```bash
# Get all RFQs
GET https://{function-app}.azurewebsites.net/api/sharepoint-rfq

# With filtering
GET https://{function-app}.azurewebsites.net/api/sharepoint-rfq?filter=Status eq 'New'

# With sorting and pagination
GET https://{function-app}.azurewebsites.net/api/sharepoint-rfq?orderBy=RFQDate&desc=true&top=10
```

#### Get Single RFQ (GET)
```bash
GET https://{function-app}.azurewebsites.net/api/sharepoint-rfq/{id}
```

#### Update RFQ (PATCH/PUT)
```bash
PATCH https://{function-app}.azurewebsites.net/api/sharepoint-rfq/{id}
```

#### Delete RFQ (DELETE)
```bash
DELETE https://{function-app}.azurewebsites.net/api/sharepoint-rfq/{id}
```

---

## 📋 Deployment Steps

### Step 1: Prepare Azure Resources

#### 1.1 Create Azure Function App (if not exists)
```bash
# Variables
RESOURCE_GROUP="mile-medical-rg"
LOCATION="eastus"
FUNCTION_APP_NAME="mile-medical-sharepoint-func"
STORAGE_ACCOUNT="milemedicalstorage"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# Create Function App (Node.js 18)
az functionapp create \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --consumption-plan-location $LOCATION \
  --os-type Linux
```

#### 1.2 Configure Environment Variables in Azure
```bash
# Set SharePoint configuration
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    SHAREPOINT_SITE_URL="https://milemedical365.sharepoint.com/sites/MileMedical2" \
    AZURE_TENANT_ID="your-tenant-id-from-azure-ad" \
    AZURE_CLIENT_ID="your-client-id-from-app-registration" \
    AZURE_CLIENT_SECRET="your-client-secret-value" \
    NODE_ENV="production"
```

**⚠️ Important:** Get these values from Azure AD App Registration:
- **Tenant ID**: Azure Portal → Azure Active Directory → Overview → Tenant ID
- **Client ID**: App registrations → Your App → Application (client) ID
- **Client Secret**: App registrations → Your App → Certificates & secrets → Client secrets

---

### Step 2: Deploy Function Code

#### Option A: Deploy via Azure Functions Core Tools (Recommended)
```bash
# Navigate to function directory
cd /home/user/webapp/azure-functions/sharepoint-rfq

# Install dependencies
npm install

# Login to Azure
az login

# Deploy function
func azure functionapp publish $FUNCTION_APP_NAME --javascript
```

#### Option B: Deploy via VS Code
1. Install "Azure Functions" extension
2. Sign in to Azure
3. Right-click function folder → "Deploy to Function App"
4. Select your Function App
5. Confirm deployment

#### Option C: Deploy via GitHub Actions (CI/CD)
See `GITHUB-ACTIONS-DEPLOYMENT.md` for automated deployment setup.

---

### Step 3: Verify Deployment

#### 3.1 Check Function Status
```bash
# List functions in the app
az functionapp function list \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Get function URL
az functionapp function show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --function-name sharepoint-rfq \
  --query "invokeUrlTemplate"
```

#### 3.2 Test Deployed Function
```bash
# Get the function URL
FUNCTION_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/sharepoint-rfq"

# Test CREATE endpoint
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "rfqId": "PROD-TEST-001",
    "matchedItems": [
      {"catalog_number": "12345", "description": "Test Product", "quantity": 10}
    ],
    "notFoundItems": ["67890"],
    "matchedCount": 1,
    "totalCount": 2,
    "notFound": 1,
    "matchRate": 50,
    "notes": "Production deployment test"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "✅ RFQ PROD-TEST-001 saved successfully.",
#   "itemId": 123,
#   "rfqId": "PROD-TEST-001",
#   "matchRate": 50,
#   "timestamp": "2025-01-06T..."
# }

# Test LIST endpoint
curl "$FUNCTION_URL" -H "Accept: application/json"

# Test GET specific RFQ
curl "$FUNCTION_URL/123" -H "Accept: application/json"
```

#### 3.3 Monitor Function Logs
```bash
# Stream live logs
az webapp log tail \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# View recent logs in Azure Portal:
# Function App → Monitor → Logs → Application Insights
```

---

### Step 4: Update Frontend Configuration

#### 4.1 Update SharePoint Client
Edit `tie/js/sharepoint-client.js`:

```javascript
// Change from localhost to production URL
this.azureFunctionUrl = 'https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq';
```

#### 4.2 Commit and Deploy Frontend
```bash
cd /home/user/webapp
git add tie/js/sharepoint-client.js
git commit -m "Update Azure Function URL to production endpoint"
git push origin main
```

---

### Step 5: Configure CORS (if needed)

If the frontend and Azure Function are on different domains:

```bash
# Add allowed origins
az functionapp cors add \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins \
    "https://yourdomain.com" \
    "https://milemedical365.sharepoint.com"

# Or allow all (development only)
az functionapp cors add \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "*"
```

---

## 🔒 Security Best Practices

### 1. Enable Authentication (Recommended for Production)
```bash
# Enable Azure AD authentication
az functionapp auth update \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --enabled true \
  --action LoginWithAzureActiveDirectory \
  --aad-client-id $AZURE_CLIENT_ID
```

### 2. Use Azure Key Vault for Secrets
```bash
# Create Key Vault
az keyvault create \
  --name mile-medical-keyvault \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Store secrets
az keyvault secret set \
  --vault-name mile-medical-keyvault \
  --name "SharePointClientSecret" \
  --value "your-client-secret"

# Configure Function App to use Key Vault
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    AZURE_CLIENT_SECRET="@Microsoft.KeyVault(SecretUri=https://mile-medical-keyvault.vault.azure.net/secrets/SharePointClientSecret/)"
```

### 3. Enable Managed Identity
```bash
# Enable system-assigned managed identity
az functionapp identity assign \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Grant Key Vault access to managed identity
az keyvault set-policy \
  --name mile-medical-keyvault \
  --object-id $(az functionapp identity show --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv) \
  --secret-permissions get list
```

---

## 📊 Monitoring and Troubleshooting

### Enable Application Insights
```bash
# Create Application Insights
az monitor app-insights component create \
  --app mile-medical-app-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP

# Link to Function App
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app mile-medical-app-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

### Common Issues and Solutions

#### Issue: 401 Unauthorized
```
Solution:
- Verify Azure AD app permissions include Sites.ReadWrite.All
- Ensure admin consent granted for SharePoint API permissions
- Check tenant ID, client ID, client secret are correct
- Verify SharePoint site URL is accessible by the service principal
```

#### Issue: 404 List Not Found
```
Solution:
- Confirm SharePoint list "TIE RFQ Archive" exists
- Verify list name spelling exactly matches (case-sensitive)
- Check service principal has access to the SharePoint site
- Test SharePoint connection: https://milemedical365.sharepoint.com/sites/MileMedical2
```

#### Issue: CORS Errors
```
Solution:
- Add frontend domain to CORS allowed origins
- Ensure preflight OPTIONS requests are handled
- Check Access-Control-Allow-Origin headers in responses
- Verify HTTPS is used (not HTTP)
```

#### Issue: Function Times Out
```
Solution:
- Check SharePoint site responsiveness
- Verify network connectivity from Azure to SharePoint
- Increase function timeout (default 5 minutes for consumption plan)
- Consider upgrading to Premium plan for longer timeout
```

---

## 🧪 Post-Deployment Testing

### Test Checklist
- [ ] CREATE: Successfully creates RFQ in SharePoint
- [ ] LIST: Returns all RFQs with proper formatting
- [ ] GET: Retrieves specific RFQ with full details
- [ ] UPDATE: Modifies existing RFQ status/notes
- [ ] DELETE: Removes RFQ from SharePoint
- [ ] CORS: Frontend can call API without errors
- [ ] Authentication: Proper security in place
- [ ] Logging: Application Insights capturing events
- [ ] Performance: Response times under 3 seconds
- [ ] Error Handling: Graceful error messages displayed

### End-to-End User Flow Test
1. **Upload RFQ in Matcher**
   - Go to tie/matcher.html
   - Upload Excel file
   - Wait for matching results

2. **Save to SharePoint**
   - Click "Save to Archive" button
   - Verify success toast: "✅ RFQ saved to SharePoint"
   - Check browser console for any errors

3. **Verify in SharePoint**
   - Open SharePoint site: https://milemedical365.sharepoint.com/sites/MileMedical2
   - Navigate to "TIE RFQ Archive" list
   - Confirm new RFQ item appears with correct data

4. **View in Archive Page**
   - Navigate to archive page (when implemented)
   - Verify RFQ appears in list
   - Test filtering and sorting

---

## 📝 Deployment Log Template

```markdown
## Deployment: [DATE]

### Environment
- Function App: [NAME]
- Resource Group: [NAME]
- Region: [LOCATION]

### Changes
- [List of changes deployed]

### Configuration
- SharePoint Site: [VERIFIED]
- Azure AD App: [VERIFIED]
- Environment Variables: [SET]
- CORS: [CONFIGURED]

### Testing Results
- CREATE endpoint: [PASS/FAIL]
- LIST endpoint: [PASS/FAIL]
- GET endpoint: [PASS/FAIL]
- UPDATE endpoint: [PASS/FAIL]
- DELETE endpoint: [PASS/FAIL]

### Performance
- Average response time: [X ms]
- Error rate: [X%]

### Issues Encountered
- [List any issues and resolutions]

### Next Steps
- [Action items]

Deployed by: [NAME]
Approved by: [NAME]
```

---

## 🎯 Quick Reference

### Production URLs
- **Function Base URL**: `https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq`
- **SharePoint Site**: `https://milemedical365.sharepoint.com/sites/MileMedical2`
- **SharePoint List**: `TIE RFQ Archive`

### Azure Resources
- **Resource Group**: `mile-medical-rg`
- **Function App**: `mile-medical-sharepoint-func`
- **Storage Account**: `milemedicalstorage`
- **App Insights**: `mile-medical-app-insights`

### Key Files
- **Function Code**: `/home/user/webapp/azure-functions/sharepoint-rfq/index.js`
- **Function Config**: `/home/user/webapp/azure-functions/sharepoint-rfq/function.json`
- **Package Dependencies**: `/home/user/webapp/azure-functions/sharepoint-rfq/package.json`
- **Frontend Client**: `/home/user/webapp/tie/js/sharepoint-client.js`

---

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] Azure Function deployed and running
- [ ] Environment variables configured in Azure
- [ ] SharePoint connection tested successfully
- [ ] All API endpoints verified with CURL
- [ ] Frontend updated with production URL
- [ ] CORS configured for frontend domain
- [ ] Authentication and security enabled
- [ ] Application Insights monitoring active
- [ ] Error handling tested (invalid data, network failures)
- [ ] Performance benchmarked (response times acceptable)
- [ ] Documentation updated with production URLs
- [ ] Team trained on new features
- [ ] Backup/recovery procedures documented

---

## 🚨 Rollback Procedure

If deployment encounters critical issues:

```bash
# Revert to previous version
func azure functionapp publish $FUNCTION_APP_NAME --javascript --slot staging

# Or stop the function temporarily
az functionapp stop --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP

# Restore previous environment variables
az functionapp config appsettings set --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --settings @previous-settings.json

# Restart function
az functionapp start --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP
```

---

## 📞 Support Contacts

- **Azure Support**: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
- **SharePoint Admin**: [Contact Info]
- **Development Team**: [Contact Info]
- **Documentation**: See `README.md` in function directory

---

**Deployment Prepared By**: AI Assistant  
**Last Updated**: 2025-01-06  
**Status**: ✅ Ready for Production Deployment
