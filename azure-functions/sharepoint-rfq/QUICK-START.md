# 🚀 Quick Start Guide - SharePoint RFQ Azure Function

## ✅ Current Status

**Local Testing:** ✅ **WORKING**
- SharePoint connection verified
- All API endpoints tested via CURL
- Data fields mapping correctly
- JSON responses formatted properly

---

## 📋 What's New

### Route Updates
The function now uses **smart routing** and supports multiple endpoint formats:

#### ✅ All These Work for Creating RFQs:
```bash
# Format 1: Explicit action
POST /api/sharepoint-rfq/create

# Format 2: Just POST to base URL (auto-infers)
POST /api/sharepoint-rfq

# Both produce identical results!
```

#### ✅ HTTP Method Auto-Detection:
- `POST /api/sharepoint-rfq` → Automatically routes to **CREATE**
- `GET /api/sharepoint-rfq` → Automatically routes to **LIST**
- `GET /api/sharepoint-rfq/{id}` → Automatically routes to **GET**
- `PATCH /api/sharepoint-rfq/{id}` → Automatically routes to **UPDATE**
- `DELETE /api/sharepoint-rfq/{id}` → Automatically routes to **DELETE**

---

## 🎯 Next Steps: Deploy to Azure

### Option 1: Automated Deployment (Recommended)
```bash
cd azure-functions/sharepoint-rfq
./deploy.sh
```

This script will:
1. ✅ Check prerequisites (Azure CLI, Node.js, func tools)
2. ✅ Verify Azure login
3. ✅ Validate environment variables
4. ✅ Create Azure resources if needed
5. ✅ Deploy the function
6. ✅ Configure settings
7. ✅ Test deployment

### Option 2: Manual Deployment
```bash
cd azure-functions/sharepoint-rfq

# Login to Azure
az login

# Deploy
func azure functionapp publish <your-function-app-name> --javascript
```

### Option 3: GitHub Actions (CI/CD)
See `DEPLOYMENT-CHECKLIST.md` for GitHub Actions setup.

---

## 🧪 Local Testing (Before Deployment)

### Start Function Locally
```bash
cd azure-functions/sharepoint-rfq
func start
```

### Run Automated Tests
```bash
# In another terminal
./test-local.sh
```

This will test:
- ✅ CREATE endpoint
- ✅ LIST endpoint
- ✅ GET endpoint
- ✅ UPDATE endpoint
- ✅ FILTER queries
- ✅ PAGINATION
- ✅ ERROR handling
- ✅ DELETE endpoint (optional)

---

## 📡 Test Your Deployed Function

### After Deployment
```bash
# Replace with your actual function app name
FUNCTION_URL="https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq"

# Test CREATE
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "rfqId": "PROD-TEST-001",
    "matchedItems": [{"catalog_number": "12345", "description": "Test"}],
    "notFoundItems": ["67890"],
    "matchedCount": 1,
    "totalCount": 2,
    "notFound": 1,
    "matchRate": 50,
    "notes": "Production test"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "✅ RFQ PROD-TEST-001 saved successfully.",
#   "itemId": 123,
#   ...
# }

# Test LIST
curl "$FUNCTION_URL"

# Test GET
curl "$FUNCTION_URL/123"
```

---

## 🔧 Update Frontend After Deployment

### Edit `tie/js/sharepoint-client.js`

```javascript
// Change this line:
this.azureFunctionUrl = 'http://localhost:7071/api/sharepoint-rfq';

// To this (replace with your actual function URL):
this.azureFunctionUrl = 'https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq';
```

### Commit and Deploy Frontend
```bash
cd /home/user/webapp
git add tie/js/sharepoint-client.js
git commit -m "Update Azure Function URL to production"
git push origin main
```

---

## 📊 Verify End-to-End Flow

1. **Open TIE Matcher** 
   - Navigate to `tie/matcher.html`

2. **Upload RFQ Excel File**
   - Click "Choose Excel File"
   - Select your RFQ file
   - Wait for matching results

3. **Save to SharePoint**
   - Click "Save to Archive" button
   - Look for success toast: "✅ RFQ saved to SharePoint"

4. **Check SharePoint**
   - Open: https://milemedical365.sharepoint.com/sites/MileMedical2
   - Go to "TIE RFQ Archive" list
   - Verify new RFQ appears with correct data

5. **View Logs (Optional)**
   ```bash
   # Stream Azure Function logs
   az webapp log tail \
     --name mile-medical-sharepoint-func \
     --resource-group mile-medical-rg
   ```

---

## 📁 Important Files

### Configuration
- `local.settings.json` - Local environment variables (not committed)
- `local.settings.json.template` - Template for configuration

### Code
- `index.js` - Main function code (✅ working with real SharePoint)
- `function.json` - Route configuration
- `package.json` - Dependencies

### Deployment
- `deploy.sh` - Automated deployment script
- `test-local.sh` - Local testing script
- `DEPLOYMENT-CHECKLIST.md` - Detailed deployment guide
- `README.md` - Full documentation

---

## 🎉 Success Criteria

After deployment, verify:
- [x] Local SharePoint integration working
- [ ] Function deployed to Azure
- [ ] All API endpoints responding
- [ ] Frontend calling production function
- [ ] RFQs saving to SharePoint successfully
- [ ] No errors in browser console
- [ ] Azure Function logs showing successful operations

---

## 🆘 Troubleshooting

### "Authentication failed"
- Verify `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` in Azure Function settings
- Check Azure AD app has SharePoint permissions granted

### "List not found"
- Confirm SharePoint list "TIE RFQ Archive" exists
- Check list name spelling (case-sensitive)

### "CORS error"
- Add frontend domain to Azure Function CORS settings
- Use Azure Portal → Function App → CORS

### "Function not responding"
- Check function is running: Azure Portal → Function App → Overview
- View logs: Monitor → Log Stream
- Test health: `curl https://your-function.azurewebsites.net/api/sharepoint-rfq`

---

## 📞 Getting Help

- **Detailed Guide**: See `DEPLOYMENT-CHECKLIST.md`
- **API Documentation**: See `README.md`
- **Azure Support**: https://portal.azure.com → Support
- **Logs**: Azure Portal → Function App → Monitor → Logs

---

## 🎯 Quick Commands Reference

```bash
# Local development
func start                    # Start function locally
./test-local.sh              # Run local tests

# Deployment
./deploy.sh                  # Automated deployment
func azure functionapp publish <name>  # Manual deployment

# Azure management
az functionapp list          # List function apps
az functionapp logs tail     # View live logs
az functionapp restart       # Restart function

# Testing
curl -X POST <url>           # Test CREATE
curl <url>                   # Test LIST
curl <url>/123               # Test GET by ID
```

---

**Last Updated**: 2025-01-06  
**Status**: ✅ **Ready for Azure Deployment**  
**Local Testing**: ✅ **Verified Working**
