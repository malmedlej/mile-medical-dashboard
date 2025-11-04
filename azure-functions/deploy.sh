#!/bin/bash

# Azure Function Deployment Script
# Deploys SharePoint sync function to Azure

set -e

echo "🚀 TIE SharePoint Sync - Deployment Script"
echo "=========================================="

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
echo "🔐 Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run: az login"
    exit 1
fi

echo "✅ Azure CLI authenticated"

# Configuration
FUNCTION_APP_NAME="func-tie-sharepoint-sync"
RESOURCE_GROUP="rg-mile-medical-dashboard"

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building function..."
# No build step needed for Node.js

echo ""
echo "📤 Deploying to Azure Function: $FUNCTION_APP_NAME"
echo "   Resource Group: $RESOURCE_GROUP"

# Deploy using func CLI if available, otherwise use az
if command -v func &> /dev/null; then
    echo "Using Azure Functions Core Tools..."
    func azure functionapp publish $FUNCTION_APP_NAME
else
    echo "Using Azure CLI (zip deploy)..."
    
    # Create deployment package
    echo "Creating deployment package..."
    zip -r deploy.zip . -x "*.git*" "deploy.zip" "deploy.sh" "local.settings.json"
    
    # Deploy
    az functionapp deployment source config-zip \
        --resource-group $RESOURCE_GROUP \
        --name $FUNCTION_APP_NAME \
        --src deploy.zip
    
    # Cleanup
    rm deploy.zip
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify deployment in Azure Portal"
echo "2. Test the function manually"
echo "3. Check logs in Monitor tab"
echo "4. Update TIE Matcher with Blob Storage URL"
echo ""
echo "🔗 Function App URL:"
echo "   https://portal.azure.com/#@milemedical.com/resource/subscriptions/YOUR-SUB-ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$FUNCTION_APP_NAME"
