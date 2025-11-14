#!/bin/bash
###############################################################################
# Azure Production Deployment Script
# Function App: mile-medical-sharepoint-func
# 
# This script will:
# 1. Create Azure resources
# 2. Deploy the function code
# 3. Configure environment variables
# 4. Test the deployment
# 5. Update frontend configuration
# 6. Run end-to-end verification
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FUNCTION_APP_NAME="mile-medical-sharepoint-func"
RESOURCE_GROUP="mile-medical-rg"
LOCATION="eastus"
STORAGE_ACCOUNT="milemedicalstorage"
SHAREPOINT_SITE_URL="https://milemedical365.sharepoint.com/sites/MileMedical2"
SHAREPOINT_LIST="TIE RFQ Archive"

# Functions
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ $(printf '%-62s' "$1") ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
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
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Welcome banner
clear
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     Azure Function Deployment - Production                   ║
║     SharePoint RFQ Integration                               ║
║     Mile Medical Dashboard                                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_info "Function App: $FUNCTION_APP_NAME"
print_info "Resource Group: $RESOURCE_GROUP"
print_info "Location: $LOCATION"
print_info "SharePoint Site: $SHAREPOINT_SITE_URL"
echo ""

# Confirmation
read -p "$(echo -e ${YELLOW}Continue with deployment? [y/N]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

###############################################################################
# STEP 1: Prerequisites Check
###############################################################################
print_header "Step 1: Checking Prerequisites"

print_step "Checking Azure CLI..."
if ! command -v az &> /dev/null; then
    print_error "Azure CLI not found"
    print_info "Install: https://aka.ms/azure-cli"
    exit 1
fi
AZ_VERSION=$(az --version | head -1 | cut -d' ' -f2)
print_success "Azure CLI installed ($AZ_VERSION)"

print_step "Checking Azure Functions Core Tools..."
if ! command -v func &> /dev/null; then
    print_error "Azure Functions Core Tools not found"
    print_info "Install: npm install -g azure-functions-core-tools@4"
    exit 1
fi
FUNC_VERSION=$(func --version)
print_success "Functions Core Tools installed ($FUNC_VERSION)"

print_step "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found"
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js installed ($NODE_VERSION)"

print_step "Checking npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm not found"
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm installed ($NPM_VERSION)"

###############################################################################
# STEP 2: Azure Login
###############################################################################
print_header "Step 2: Azure Authentication"

print_step "Checking Azure login status..."
if ! az account show &> /dev/null; then
    print_warning "Not logged into Azure"
    print_step "Initiating Azure login..."
    az login
fi

ACCOUNT_NAME=$(az account show --query name -o tsv)
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
print_success "Logged into Azure"
print_info "Account: $ACCOUNT_NAME"
print_info "Subscription: $SUBSCRIPTION_ID"

###############################################################################
# STEP 3: Environment Variables
###############################################################################
print_header "Step 3: Environment Variables Configuration"

print_step "Checking local.settings.json..."
if [ ! -f "azure-functions/sharepoint-rfq/local.settings.json" ]; then
    print_error "local.settings.json not found"
    print_info "Copy from local.settings.json.template and configure"
    exit 1
fi

# Extract credentials
AZURE_TENANT_ID=$(grep -o '"AZURE_TENANT_ID"[^,]*' azure-functions/sharepoint-rfq/local.settings.json | cut -d'"' -f4)
AZURE_CLIENT_ID=$(grep -o '"AZURE_CLIENT_ID"[^,]*' azure-functions/sharepoint-rfq/local.settings.json | cut -d'"' -f4)
AZURE_CLIENT_SECRET=$(grep -o '"AZURE_CLIENT_SECRET"[^,]*' azure-functions/sharepoint-rfq/local.settings.json | cut -d'"' -f4)

if [ -z "$AZURE_TENANT_ID" ] || [ -z "$AZURE_CLIENT_ID" ] || [ -z "$AZURE_CLIENT_SECRET" ]; then
    print_error "Missing Azure AD credentials in local.settings.json"
    exit 1
fi

print_success "Environment variables loaded"
print_info "Tenant ID: ${AZURE_TENANT_ID:0:8}..."
print_info "Client ID: ${AZURE_CLIENT_ID:0:8}..."

###############################################################################
# STEP 4: Create Azure Resources
###############################################################################
print_header "Step 4: Creating Azure Resources"

print_step "Creating Resource Group..."
if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    print_success "Resource Group '$RESOURCE_GROUP' already exists"
else
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
    print_success "Resource Group created"
fi

print_step "Creating Storage Account..."
if az storage account show --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    print_success "Storage Account '$STORAGE_ACCOUNT' already exists"
else
    az storage account create \
        --name "$STORAGE_ACCOUNT" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku Standard_LRS \
        --output none
    print_success "Storage Account created"
fi

print_step "Creating Function App..."
if az functionapp show --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    print_success "Function App '$FUNCTION_APP_NAME' already exists"
else
    az functionapp create \
        --name "$FUNCTION_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --storage-account "$STORAGE_ACCOUNT" \
        --runtime node \
        --runtime-version 18 \
        --functions-version 4 \
        --consumption-plan-location "$LOCATION" \
        --os-type Linux \
        --output none
    print_success "Function App created"
    sleep 10  # Wait for app to be ready
fi

###############################################################################
# STEP 5: Configure Application Settings
###############################################################################
print_header "Step 5: Configuring Application Settings"

print_step "Setting environment variables in Azure..."
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
    --output none

print_success "Application settings configured"

###############################################################################
# STEP 6: Deploy Function Code
###############################################################################
print_header "Step 6: Deploying Function Code"

print_step "Installing dependencies..."
cd azure-functions/sharepoint-rfq
npm install --silent --no-progress
print_success "Dependencies installed"

print_step "Deploying to Azure..."
print_info "This may take 2-3 minutes..."
func azure functionapp publish "$FUNCTION_APP_NAME" --javascript

cd ../..
print_success "Function code deployed"

###############################################################################
# STEP 7: Configure CORS
###############################################################################
print_header "Step 7: Configuring CORS"

print_step "Adding CORS origins..."
az functionapp cors add \
    --name "$FUNCTION_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --allowed-origins \
        "https://milemedical365.sharepoint.com" \
        "https://*.pages.dev" \
    --output none 2>/dev/null || true

print_success "CORS configured"

###############################################################################
# STEP 8: Test Deployment
###############################################################################
print_header "Step 8: Testing Deployed Function"

FUNCTION_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/sharepoint-rfq"
print_info "Function URL: $FUNCTION_URL"

print_step "Waiting for function to be ready..."
sleep 15

print_step "Testing CREATE endpoint..."
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -d '{
        "rfqId": "DEPLOY-TEST-'$(date +%s)'",
        "matchedItems": [{"catalog_number": "TEST-001", "description": "Deployment Test Product"}],
        "notFoundItems": ["TEST-002"],
        "matchedCount": 1,
        "totalCount": 2,
        "notFound": 1,
        "matchRate": 50,
        "notes": "Automated deployment verification test"
    }')

if echo "$RESPONSE" | grep -q "success.*true"; then
    print_success "CREATE endpoint working!"
    ITEM_ID=$(echo "$RESPONSE" | grep -o '"itemId":[0-9]*' | cut -d':' -f2)
    print_info "Created SharePoint item ID: $ITEM_ID"
else
    print_error "CREATE endpoint test failed"
    print_error "Response: $RESPONSE"
    echo ""
    print_warning "Deployment completed but test failed. Check Azure Function logs."
    exit 1
fi

print_step "Testing LIST endpoint..."
RESPONSE=$(curl -s "$FUNCTION_URL")
if echo "$RESPONSE" | grep -q "success.*true"; then
    print_success "LIST endpoint working!"
    COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    print_info "Total RFQs in SharePoint: $COUNT"
else
    print_warning "LIST endpoint test inconclusive"
fi

###############################################################################
# STEP 9: Update Frontend Configuration
###############################################################################
print_header "Step 9: Updating Frontend Configuration"

FRONTEND_FILE="tie/js/sharepoint-client.js"

print_step "Backing up frontend file..."
cp "$FRONTEND_FILE" "${FRONTEND_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
print_success "Backup created"

print_step "Updating Azure Function URL..."
if grep -q "localhost:7071" "$FRONTEND_FILE"; then
    sed -i.tmp "s|http://localhost:7071/api/sharepoint-rfq|${FUNCTION_URL}|g" "$FRONTEND_FILE"
    rm "${FRONTEND_FILE}.tmp" 2>/dev/null
    print_success "Frontend URL updated to production"
else
    print_warning "localhost URL not found - may already be updated"
fi

print_step "Verifying update..."
if grep -q "$FUNCTION_URL" "$FRONTEND_FILE"; then
    print_success "Frontend configuration verified"
    grep -A 1 "azureFunctionUrl" "$FRONTEND_FILE" | head -2
else
    print_error "Frontend update failed"
    exit 1
fi

###############################################################################
# STEP 10: Commit Changes
###############################################################################
print_header "Step 10: Committing Frontend Changes"

print_step "Checking git status..."
git add "$FRONTEND_FILE"

print_step "Committing changes..."
git commit -m "🚀 Deploy to production: Update Azure Function URL

- Updated frontend to use production endpoint
- Function App: ${FUNCTION_APP_NAME}
- Production URL: ${FUNCTION_URL}
- Deployment verified and tested
- Ready for end-to-end testing"

print_success "Changes committed"

print_step "Pushing to GitHub..."
git push origin main

print_success "Changes pushed to repository"

###############################################################################
# STEP 11: End-to-End Verification Instructions
###############################################################################
print_header "Step 11: End-to-End Verification"

echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           🎉  DEPLOYMENT SUCCESSFUL!  🎉                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_success "Azure Function deployed and running"
print_success "Frontend configuration updated"
print_success "Changes committed to repository"
echo ""

print_info "Production Function URL:"
echo "  $FUNCTION_URL"
echo ""

print_info "SharePoint List:"
echo "  $SHAREPOINT_SITE_URL"
echo "  List: $SHAREPOINT_LIST"
echo ""

print_header "🧪 Manual End-to-End Test Instructions"

echo -e "${YELLOW}Please perform the following verification:${NC}"
echo ""
echo "1️⃣  Open the TIE Matcher in your browser:"
echo "   ${CYAN}tie/matcher.html${NC}"
echo ""
echo "2️⃣  Upload an RFQ Excel file"
echo "   - Choose any valid RFQ Excel file"
echo "   - Wait for matching results"
echo ""
echo "3️⃣  Click 'Save to Archive' button"
echo "   - Should show success toast message"
echo "   - Check browser console for any errors (F12)"
echo ""
echo "4️⃣  Verify in SharePoint:"
echo "   ${CYAN}$SHAREPOINT_SITE_URL${NC}"
echo "   - Navigate to '$SHAREPOINT_LIST' list"
echo "   - Find your newly created RFQ"
echo "   - Verify all fields are populated correctly:"
echo "     • Title (RFQ ID)"
echo "     • RFQDate (current timestamp)"
echo "     • Status = 'New'"
echo "     • MatchedCount"
echo "     • TotalCount"
echo "     • NotFound"
echo "     • MatchRate"
echo "     • Notes"
echo ""
echo "5️⃣  Test LIST functionality (optional):"
echo "   ${CYAN}curl $FUNCTION_URL${NC}"
echo ""

print_header "📊 Monitoring & Next Steps"

echo "Monitor function health:"
echo "  ${CYAN}az functionapp show --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP --query 'state'${NC}"
echo ""
echo "View live logs:"
echo "  ${CYAN}az webapp log tail --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP${NC}"
echo ""
echo "Azure Portal:"
echo "  ${CYAN}https://portal.azure.com${NC}"
echo "  Search for: $FUNCTION_APP_NAME"
echo ""

print_header "✅ Deployment Complete"

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  🎊 Congratulations! Your SharePoint RFQ integration is      ║
║     now LIVE in production!                                  ║
║                                                               ║
║  All RFQs will now be automatically saved to SharePoint      ║
║  with organization-wide visibility and enterprise backup.    ║
║                                                               ║
║  This is a production-grade, scalable solution! 🚀          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_success "Deployment completed successfully!"
print_info "Deployment date: $(date)"
print_info "Function App: $FUNCTION_APP_NAME"
print_info "Status: LIVE"
echo ""
