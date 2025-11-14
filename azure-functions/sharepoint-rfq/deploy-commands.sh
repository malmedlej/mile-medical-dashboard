#!/bin/bash
###############################################################################
# Quick Deployment Commands for mile-medical-sharepoint-func
# Copy and paste these commands into your terminal
###############################################################################

# STEP 1: Login to Azure
echo "🔐 Step 1: Login to Azure"
az login

# STEP 2: Set variables
echo "🔧 Step 2: Setting variables"
RESOURCE_GROUP="mile-medical-rg"
FUNCTION_APP_NAME="mile-medical-sharepoint-func"
STORAGE_ACCOUNT="milemedicalstorage"
LOCATION="eastus"

# STEP 3: Create Resource Group (if doesn't exist)
echo "📦 Step 3: Creating Resource Group"
az group create --name $RESOURCE_GROUP --location $LOCATION

# STEP 4: Create Storage Account (if doesn't exist)
echo "💾 Step 4: Creating Storage Account"
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# STEP 5: Create Function App
echo "🚀 Step 5: Creating Function App"
az functionapp create \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --consumption-plan-location $LOCATION \
  --os-type Linux

# STEP 6: Configure Environment Variables
echo "⚙️  Step 6: Configuring Environment Variables"
echo "⚠️  IMPORTANT: Replace 'your-tenant-id', 'your-client-id', 'your-client-secret' with actual values"
read -p "Press Enter when you've updated the values below, or Ctrl+C to cancel..."

az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    SHAREPOINT_SITE_URL="https://milemedical365.sharepoint.com/sites/MileMedical2" \
    AZURE_TENANT_ID="your-tenant-id" \
    AZURE_CLIENT_ID="your-client-id" \
    AZURE_CLIENT_SECRET="your-client-secret" \
    NODE_ENV="production" \
    WEBSITE_NODE_DEFAULT_VERSION="~18"

# STEP 7: Deploy Function Code
echo "📤 Step 7: Deploying Function Code"
func azure functionapp publish $FUNCTION_APP_NAME --javascript

# STEP 8: Test Deployment
echo "🧪 Step 8: Testing Deployment"
FUNCTION_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/sharepoint-rfq"

echo "Function URL: $FUNCTION_URL"
echo "Testing CREATE endpoint..."

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
    "notes": "Automated deployment test"
  }'

echo ""
echo ""
echo "✅ Deployment Complete!"
echo "📍 Function URL: $FUNCTION_URL"
echo ""
echo "Next Steps:"
echo "1. Verify the test item appears in SharePoint"
echo "2. Update frontend URL in tie/js/sharepoint-client.js"
echo "3. Test end-to-end flow in the dashboard"
echo ""
echo "Monitor logs with:"
echo "  az webapp log tail --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP"
