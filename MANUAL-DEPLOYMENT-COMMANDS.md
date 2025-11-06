# Manual Deployment Commands

Run these commands on your local machine in sequence:

## Step 1: Login to Azure
```bash
az login
az account show  # Verify correct subscription
```

## Step 2: Set Variables
```bash
FUNCTION_APP_NAME="mile-medical-sharepoint-func"
RESOURCE_GROUP="mile-medical-rg"
LOCATION="eastus"
STORAGE_ACCOUNT="milemedicalstorage"
```

## Step 3: Create Resource Group
```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

## Step 4: Create Storage Account
```bash
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS
```

## Step 5: Create Function App
```bash
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

## Step 6: Configure Environment Variables
```bash
# Get values from local.settings.json
cd azure-functions/sharepoint-rfq
AZURE_TENANT_ID=$(grep -o '"AZURE_TENANT_ID"[^,]*' local.settings.json | cut -d'"' -f4)
AZURE_CLIENT_ID=$(grep -o '"AZURE_CLIENT_ID"[^,]*' local.settings.json | cut -d'"' -f4)
AZURE_CLIENT_SECRET=$(grep -o '"AZURE_CLIENT_SECRET"[^,]*' local.settings.json | cut -d'"' -f4)

# Set in Azure
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    SHAREPOINT_SITE_URL="https://milemedical365.sharepoint.com/sites/MileMedical2" \
    AZURE_TENANT_ID="$AZURE_TENANT_ID" \
    AZURE_CLIENT_ID="$AZURE_CLIENT_ID" \
    AZURE_CLIENT_SECRET="$AZURE_CLIENT_SECRET" \
    NODE_ENV="production" \
    WEBSITE_NODE_DEFAULT_VERSION="~18"
```

## Step 7: Deploy Function Code
```bash
# Install dependencies
npm install

# Deploy
func azure functionapp publish $FUNCTION_APP_NAME --javascript
```

## Step 8: Test Deployment
```bash
FUNCTION_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/sharepoint-rfq"

# Wait for function to warm up
sleep 15

# Test CREATE endpoint
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "rfqId": "DEPLOY-TEST-'$(date +%s)'",
    "matchedItems": [{"catalog_number": "TEST-001", "description": "Test Product"}],
    "notFoundItems": ["TEST-002"],
    "matchedCount": 1,
    "totalCount": 2,
    "notFound": 1,
    "matchRate": 50,
    "notes": "Deployment verification"
  }'

# Should return success with itemId
```

## Step 9: Update Frontend
```bash
cd ../..

# Update frontend file
sed -i.backup 's|http://localhost:7071/api/sharepoint-rfq|https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq|g' tie/js/sharepoint-client.js

# Commit changes
git add tie/js/sharepoint-client.js
git commit -m "Update Azure Function URL to production"
git push origin main
```

## Step 10: Verify End-to-End
1. Open tie/matcher.html in browser
2. Upload RFQ Excel file
3. Click "Save to Archive"
4. Check SharePoint for new item

## Verification Checklist
- [ ] Function App shows "Running" in Azure Portal
- [ ] CREATE test returns success with itemId
- [ ] Test item appears in SharePoint "TIE RFQ Archive" list
- [ ] Frontend updated with production URL
- [ ] Dashboard upload and save works
- [ ] No errors in browser console
