#!/bin/bash

###############################################################################
# RFQ Upload Function - Deployment Script
# 
# Deploys the RFQ file upload Azure Function
###############################################################################

set -e  # Exit on error

echo "🚀 Deploying RFQ Upload Function to Azure"
echo "=========================================="

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
echo "🔐 Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Running 'az login'..."
    az login
fi

# Get current subscription
SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Logged in to Azure"
echo "📋 Subscription: $SUBSCRIPTION"
echo ""

# Prompt for Function App name if not provided
if [ -z "$1" ]; then
    echo "Please provide the Function App name:"
    read -p "Function App Name: " FUNCTION_APP_NAME
else
    FUNCTION_APP_NAME=$1
fi

echo "🎯 Target Function App: $FUNCTION_APP_NAME"
echo ""

# Check if Function App exists
echo "🔍 Checking if Function App exists..."
if ! az functionapp show --name "$FUNCTION_APP_NAME" --resource-group "${2:-tie-resources}" &> /dev/null; then
    echo "❌ Function App '$FUNCTION_APP_NAME' not found."
    echo ""
    echo "Create it with:"
    echo "  az functionapp create --resource-group YOUR_RG --consumption-plan-location eastus --runtime node --runtime-version 18 --functions-version 4 --name $FUNCTION_APP_NAME --storage-account YOUR_STORAGE"
    exit 1
fi

echo "✅ Function App found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd "$(dirname "$0")"
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Deploy function
echo "🚀 Deploying function..."
cd ..
func azure functionapp publish "$FUNCTION_APP_NAME"

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📡 Function endpoint:"
echo "   https://${FUNCTION_APP_NAME}.azurewebsites.net/api/rfq/upload"
echo ""
echo "🧪 Test with:"
echo "   curl -X POST https://${FUNCTION_APP_NAME}.azurewebsites.net/api/rfq/upload \\"
echo "     -F \"file=@test.xlsx\" \\"
echo "     -F \"rfqId=TEST_001\""
echo ""
echo "🔧 Next steps:"
echo "   1. Set AZURE_STORAGE_CONNECTION_STRING in Function App Configuration"
echo "   2. Create 'rfq-uploads' container in storage account"
echo "   3. Test the endpoint with a real file"
echo "   4. Update frontend baseUrl if needed"
echo ""
echo "✅ Done!"
