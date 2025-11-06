#!/bin/bash

###############################################################################
# Azure Function Deployment Script
# SharePoint RFQ Integration for Mile Medical TIE System
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_APP_NAME="${FUNCTION_APP_NAME:-mile-medical-sharepoint-func}"
RESOURCE_GROUP="${RESOURCE_GROUP:-mile-medical-rg}"
LOCATION="${LOCATION:-eastus}"
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-milemedicalstorage}"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install: https://aka.ms/azure-cli"
        exit 1
    fi
    print_success "Azure CLI installed"
    
    # Check Azure Functions Core Tools
    if ! command -v func &> /dev/null; then
        print_error "Azure Functions Core Tools not installed. Please install: npm install -g azure-functions-core-tools@4"
        exit 1
    fi
    print_success "Azure Functions Core Tools installed"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    NODE_VERSION=$(node -v)
    print_success "Node.js installed ($NODE_VERSION)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm installed"
    
    echo ""
}

# Check Azure login
check_azure_login() {
    print_header "Checking Azure Login"
    
    if ! az account show &> /dev/null; then
        print_warning "Not logged into Azure. Initiating login..."
        az login
    fi
    
    ACCOUNT_NAME=$(az account show --query name -o tsv)
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    print_success "Logged into Azure"
    print_info "Account: $ACCOUNT_NAME"
    print_info "Subscription: $SUBSCRIPTION_ID"
    echo ""
}

# Check environment variables
check_env_vars() {
    print_header "Checking Environment Variables"
    
    if [ ! -f "local.settings.json" ]; then
        print_error "local.settings.json not found. Copy from local.settings.json.template and configure."
        exit 1
    fi
    
    # Extract values from local.settings.json
    SHAREPOINT_SITE_URL=$(grep -o '"SHAREPOINT_SITE_URL"[^,]*' local.settings.json | cut -d'"' -f4)
    AZURE_TENANT_ID=$(grep -o '"AZURE_TENANT_ID"[^,]*' local.settings.json | cut -d'"' -f4)
    AZURE_CLIENT_ID=$(grep -o '"AZURE_CLIENT_ID"[^,]*' local.settings.json | cut -d'"' -f4)
    AZURE_CLIENT_SECRET=$(grep -o '"AZURE_CLIENT_SECRET"[^,]*' local.settings.json | cut -d'"' -f4)
    
    if [ -z "$SHAREPOINT_SITE_URL" ] || [ -z "$AZURE_TENANT_ID" ] || [ -z "$AZURE_CLIENT_ID" ] || [ -z "$AZURE_CLIENT_SECRET" ]; then
        print_error "Missing required environment variables in local.settings.json"
        exit 1
    fi
    
    print_success "Environment variables configured"
    print_info "SharePoint Site: $SHAREPOINT_SITE_URL"
    print_info "Tenant ID: ${AZURE_TENANT_ID:0:8}..."
    print_info "Client ID: ${AZURE_CLIENT_ID:0:8}..."
    echo ""
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    npm install
    
    print_success "Dependencies installed"
    echo ""
}

# Create Azure resources (if needed)
create_azure_resources() {
    print_header "Checking Azure Resources"
    
    # Check if resource group exists
    if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Resource group '$RESOURCE_GROUP' not found. Creating..."
        az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
        print_success "Resource group created"
    else
        print_success "Resource group '$RESOURCE_GROUP' exists"
    fi
    
    # Check if storage account exists
    if ! az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Storage account '$STORAGE_ACCOUNT' not found. Creating..."
        az storage account create \
            --name "$STORAGE_ACCOUNT" \
            --resource-group "$RESOURCE_GROUP" \
            --location "$LOCATION" \
            --sku Standard_LRS
        print_success "Storage account created"
    else
        print_success "Storage account '$STORAGE_ACCOUNT' exists"
    fi
    
    # Check if function app exists
    if ! az functionapp show --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Function app '$FUNCTION_APP_NAME' not found. Creating..."
        az functionapp create \
            --name "$FUNCTION_APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --storage-account "$STORAGE_ACCOUNT" \
            --runtime node \
            --runtime-version 18 \
            --functions-version 4 \
            --consumption-plan-location "$LOCATION" \
            --os-type Linux
        print_success "Function app created"
    else
        print_success "Function app '$FUNCTION_APP_NAME' exists"
    fi
    
    echo ""
}

# Configure function app settings
configure_app_settings() {
    print_header "Configuring Function App Settings"
    
    az functionapp config appsettings set \
        --name "$FUNCTION_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --settings \
            SHAREPOINT_SITE_URL="$SHAREPOINT_SITE_URL" \
            AZURE_TENANT_ID="$AZURE_TENANT_ID" \
            AZURE_CLIENT_ID="$AZURE_CLIENT_ID" \
            AZURE_CLIENT_SECRET="$AZURE_CLIENT_SECRET" \
            NODE_ENV="production" \
            WEBSITE_NODE_DEFAULT_VERSION="~18" \
        > /dev/null
    
    print_success "Function app settings configured"
    echo ""
}

# Deploy function
deploy_function() {
    print_header "Deploying Function to Azure"
    
    print_info "This may take a few minutes..."
    func azure functionapp publish "$FUNCTION_APP_NAME" --javascript
    
    print_success "Function deployed successfully"
    echo ""
}

# Get function URL
get_function_url() {
    print_header "Deployment Complete"
    
    FUNCTION_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/sharepoint-rfq"
    
    print_success "Azure Function is now live!"
    print_info "Function URL: $FUNCTION_URL"
    echo ""
    
    print_info "Test with:"
    echo "  curl -X POST '$FUNCTION_URL' \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"rfqId\": \"TEST-001\", \"matchedCount\": 1, \"totalCount\": 2, \"notFound\": 1, \"matchRate\": 50}'"
    echo ""
}

# Test function
test_function() {
    print_header "Testing Deployed Function"
    
    FUNCTION_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/sharepoint-rfq"
    
    print_info "Sending test request..."
    
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -d '{
            "rfqId": "DEPLOY-TEST-001",
            "matchedItems": [{"catalog_number": "12345", "description": "Test Item"}],
            "notFoundItems": ["67890"],
            "matchedCount": 1,
            "totalCount": 2,
            "notFound": 1,
            "matchRate": 50,
            "notes": "Automated deployment test"
        }')
    
    if echo "$RESPONSE" | grep -q "success"; then
        print_success "Function test passed!"
        print_info "Response: $RESPONSE"
    else
        print_error "Function test failed!"
        print_error "Response: $RESPONSE"
    fi
    
    echo ""
}

# Main deployment flow
main() {
    clear
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║   Azure Function Deployment                            ║"
    echo "║   SharePoint RFQ Integration - Mile Medical            ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    # Confirmation
    print_info "Deploying to:"
    print_info "  Function App: $FUNCTION_APP_NAME"
    print_info "  Resource Group: $RESOURCE_GROUP"
    print_info "  Location: $LOCATION"
    echo ""
    
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    echo ""
    
    # Run deployment steps
    check_prerequisites
    check_azure_login
    check_env_vars
    install_dependencies
    create_azure_resources
    configure_app_settings
    deploy_function
    get_function_url
    
    # Ask if user wants to test
    read -p "Run deployment test? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_function
    fi
    
    print_success "All done! 🎉"
    print_info "Next steps:"
    print_info "  1. Update frontend: tie/js/sharepoint-client.js with production URL"
    print_info "  2. Test end-to-end flow in TIE Matcher"
    print_info "  3. Monitor logs in Azure Portal"
    echo ""
}

# Run main function
main
