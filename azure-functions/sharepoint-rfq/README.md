# SharePoint RFQ Integration - Azure Function

Real SharePoint Online integration for Mile Medical Tender Intelligence Engine (TIE).

## 📋 Overview

This Azure Function provides a REST API for CRUD operations on RFQ data stored in SharePoint Online.

**SharePoint Site:** https://milemedical365.sharepoint.com/sites/MileMedical2  
**SharePoint List:** TIE RFQ Archive  
**Runtime:** Node.js 18+

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js** 18+ installed
2. **Azure Functions Core Tools** installed (`npm install -g azure-functions-core-tools@4`)
3. **SharePoint List** created (see schema below)
4. **Azure AD App Registration** with SharePoint permissions

### Installation

```bash
cd azure-functions/sharepoint-rfq
npm install
```

### Configuration

1. Copy the template:
```bash
cp local.settings.json.template local.settings.json
```

2. Edit `local.settings.json` with your credentials:
```json
{
  "Values": {
    "SHAREPOINT_SITE_URL": "https://milemedical365.sharepoint.com/sites/MileMedical2",
    "AZURE_TENANT_ID": "your-tenant-id",
    "AZURE_CLIENT_ID": "your-client-id",
    "AZURE_CLIENT_SECRET": "your-client-secret"
  }
}
```

### Local Testing

```bash
# Start the function
func start

# Run automated tests (in another terminal)
./test-local.sh
```

The function will be available at: `http://localhost:7071/api/sharepoint-rfq`

### Deployment to Azure

```bash
# Quick deployment (interactive)
./deploy.sh

# Or manual deployment
func azure functionapp publish <your-function-app-name> --javascript
```

See `DEPLOYMENT-CHECKLIST.md` for detailed deployment instructions.

---

## 📡 API Endpoints

### 1. Create RFQ (POST)

**Endpoints (all equivalent):**
- `POST /api/sharepoint-rfq/create`
- `POST /api/sharepoint-rfq` (auto-infers from POST method)

**Request Body:**
```json
{
  "rfqId": "NDP01086-25",
  "totalCount": 119,
  "matchedCount": 4,
  "notFound": 115,
  "matchRate": 3.36,
  "notes": "Auto-imported from dashboard",
  "matchedItems": [...],
  "notFoundItems": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "✅ RFQ NDP01086-25 saved successfully.",
  "itemId": 42,
  "rfqId": "NDP01086-25",
  "matchRate": 3.36,
  "timestamp": "2025-11-06T13:00:00.000Z"
}
```

### 2. List RFQs (GET)

**Endpoint:** `GET /api/rfq/list`

**Query Parameters:**
- `filter` - OData filter (e.g., `Status eq 'New'`)
- `orderBy` - Sort field (e.g., `RFQDate`)
- `desc` - Sort descending (true/false)
- `top` - Limit results
- `skip` - Pagination offset

**Example:**
```
GET /api/rfq/list?orderBy=RFQDate&desc=true&top=10
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 42,
      "rfqId": "NDP01086-25",
      "date": "2025-11-06T...",
      "status": "New",
      "matchedCount": 4,
      "totalCount": 119,
      "matchRate": 3.36,
      ...
    }
  ]
}
```

### 3. Get Single RFQ (GET)

**Endpoint:** `GET /api/rfq/get/{id}`

**Example:**
```
GET /api/rfq/get/42
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "rfqId": "NDP01086-25",
    "matchedItems": [...],
    "notFoundItems": [...],
    ...
  }
}
```

### 4. Update RFQ (PUT)

**Endpoint:** `PUT /api/rfq/update/{id}`

**Request Body:**
```json
{
  "status": "Quoted",
  "notes": "Prices updated",
  "matchedItems": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "RFQ updated successfully",
  "itemId": 42
}
```

### 5. Delete RFQ (DELETE)

**Endpoint:** `DELETE /api/rfq/delete/{id}`

**Response:**
```json
{
  "success": true,
  "message": "RFQ deleted successfully",
  "itemId": 42
}
```

---

## 📊 SharePoint List Schema

### Required Columns

| Column Name | Internal Name | Type | Required | Description |
|-------------|---------------|------|----------|-------------|
| Title | Title | Single line of text | Yes | RFQ ID (e.g., "NDP01086-25") |
| RFQ Date | RFQDate | Date and Time | Yes | Upload date |
| Status | Status | Choice | Yes | New, Quoted, Submitted, Won, Lost |
| Matched Count | MatchedCount | Number | Yes | Items matched |
| Total Count | TotalCount | Number | Yes | Total items in RFQ |
| Not Found | NotFound | Number | Yes | Items not found |
| Match Rate | MatchRate | Number | No | Match percentage |
| Matched Items JSON | MatchedItemsJSON | Multiple lines of text | No | JSON array |
| Not Found Items JSON | NotFoundItemsJSON | Multiple lines of text | No | JSON array |
| Total Value | TotalValue | Currency | No | Total RFQ value |
| Notes | Notes | Multiple lines of text | No | Additional notes |

### Create List with PowerShell

```powershell
Connect-PnPOnline -Url "https://milemedical365.sharepoint.com/sites/MileMedical2" -Interactive

New-PnPList -Title "TIE RFQ Archive" -Template GenericList -Url "Lists/TIE_RFQ_Archive"

Add-PnPField -List "TIE RFQ Archive" -DisplayName "RFQ Date" -InternalName "RFQDate" -Type DateTime -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Status" -InternalName "Status" -Type Choice -Choices "New","Quoted","Submitted","Won","Lost" -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Matched Count" -InternalName "MatchedCount" -Type Number -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Total Count" -InternalName "TotalCount" -Type Number -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Not Found" -InternalName "NotFound" -Type Number -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Match Rate" -InternalName "MatchRate" -Type Number
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Matched Items JSON" -InternalName "MatchedItemsJSON" -Type Note
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Not Found Items JSON" -InternalName "NotFoundItemsJSON" -Type Note
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Total Value" -InternalName "TotalValue" -Type Currency
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Notes" -InternalName "Notes" -Type Note
```

---

## 🔐 Azure AD App Registration

### Steps:

1. **Register App:**
   - Azure Portal → App Registrations → New registration
   - Name: "TIE SharePoint Function"
   - Supported account types: Single tenant

2. **API Permissions:**
   - Add permissions:
     - SharePoint → Application permissions → `Sites.ReadWrite.All`
   - Grant admin consent

3. **Client Secret:**
   - Certificates & secrets → New client secret
   - Copy and save securely

4. **Note IDs:**
   - Copy: Application (client) ID
   - Copy: Directory (tenant) ID

---

## 🚀 Deployment to Azure

### Option 1: VS Code

1. Install Azure Functions extension
2. Right-click on `sharepoint-rfq` folder
3. Select "Deploy to Function App..."
4. Choose your function app

### Option 2: Azure CLI

```bash
# Login
az login

# Create Function App (if needed)
az functionapp create \
  --resource-group <resource-group> \
  --consumption-plan-location <location> \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name <function-app-name> \
  --storage-account <storage-account>

# Deploy
cd azure-functions
func azure functionapp publish <function-app-name>
```

### Configure Application Settings

```bash
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings \
    SHAREPOINT_SITE_URL="https://milemedical365.sharepoint.com/sites/MileMedical2" \
    AZURE_TENANT_ID="your-tenant-id" \
    AZURE_CLIENT_ID="your-client-id" \
    AZURE_CLIENT_SECRET="your-client-secret" \
    NODE_ENV="production"
```

---

## 🧪 Testing

### Test with curl

```bash
# Create RFQ
curl -X POST http://localhost:7071/api/rfq/create \
  -H "Content-Type: application/json" \
  -d '{
    "rfqId": "TEST-001",
    "totalCount": 10,
    "matchedCount": 8,
    "notFound": 2,
    "matchRate": 80,
    "notes": "Test RFQ"
  }'

# List RFQs
curl http://localhost:7071/api/rfq/list

# Get specific RFQ
curl http://localhost:7071/api/rfq/get/1

# Update RFQ
curl -X PUT http://localhost:7071/api/rfq/update/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "Quoted"}'

# Delete RFQ
curl -X DELETE http://localhost:7071/api/rfq/delete/1
```

### Test from Frontend

The frontend SharePoint client will automatically call these endpoints.

---

## 📝 Logging

Function logs include:
- 🚀 Function start/end
- 📍 Configuration details
- 🔐 Authentication status
- 📊 Request data
- ✅ Success messages
- ❌ Error details

View logs:
```bash
# Local
func logs

# Azure
az functionapp log tail --name <function-app-name> --resource-group <resource-group>
```

---

## ⚠️ Troubleshooting

### Common Issues

**1. Authentication Failed**
- Verify tenant ID, client ID, and client secret
- Check Azure AD app has SharePoint permissions
- Ensure admin consent was granted

**2. List Not Found**
- Verify list name is exactly "TIE RFQ Archive"
- Check list exists at the SharePoint site
- Ensure app has access to the site

**3. Column Not Found**
- Verify all required columns exist
- Check internal names match exactly
- Use PowerShell script to create columns

**4. CORS Issues**
- Enable CORS in Function App settings
- Allow your Static Web App domain

---

## 🔄 Integration with Frontend

The frontend (`tie/js/sharepoint-client.js`) already has the integration code:

```javascript
// Create RFQ
await window.storageManager.saveRFQ({
  rfqId: "NDP01086-25",
  matchedCount: 4,
  totalCount: 119,
  ...
});

// Load RFQs
const rfqs = await window.storageManager.loadRFQs();
```

No frontend changes needed - it will automatically detect when SharePoint is available!

---

## 📚 Dependencies

- `@pnp/sp` - SharePoint operations
- `@pnp/nodejs` - Node.js authentication
- `@pnp/common` - Common utilities
- `@pnp/logging` - Logging framework
- `@pnp/odata` - OData helpers

---

## 🎯 Success Criteria

✅ Function deploys without errors  
✅ Authentication succeeds  
✅ Can create RFQ in SharePoint  
✅ Can retrieve RFQs  
✅ Frontend shows success messages  
✅ SharePoint List contains data  

---

## 📞 Support

For issues:
1. Check function logs
2. Verify SharePoint List structure
3. Test authentication separately
4. Review Azure AD app permissions

---

**Version:** 2.0  
**Last Updated:** 2025-11-06  
**Status:** Production Ready
