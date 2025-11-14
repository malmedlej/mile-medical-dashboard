# RFQ File Upload - Azure Function

HTTP Trigger Azure Function for uploading RFQ Excel files to Azure Blob Storage.

## 📋 Overview

**Endpoint**: `POST /api/rfq/upload`  
**Content-Type**: `multipart/form-data`  
**Purpose**: Accept RFQ Excel file uploads and store in Azure Blob Storage

---

## 🚀 Quick Deployment

### Prerequisites

1. **Azure CLI** installed and logged in
2. **Azure Function App** created
3. **Azure Storage Account** `stmilemedicaltic` with container `rfq-uploads`
4. **Node.js 18+** for local testing

### Deploy to Azure

```bash
# Navigate to function directory
cd azure-functions/rfq-upload

# Install dependencies
npm install

# Deploy using Azure Functions Core Tools
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>

# Or deploy entire function app from parent directory
cd ../
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>
```

### Alternative: Deploy via Azure Portal

1. Go to Azure Portal → Function App
2. Click **"Deployment Center"**
3. Choose **"GitHub"** or **"Local Git"**
4. Select repository and branch
5. Azure will automatically deploy

---

## 🔧 Configuration

### Required Environment Variables

Set these in **Azure Function App → Configuration → Application Settings**:

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_STORAGE_CONNECTION_STRING` | Storage account connection string | `DefaultEndpointsProtocol=https;AccountName=stmilemedicaltic;...` |
| `AzureWebJobsStorage` | Same as above (fallback) | `DefaultEndpointsProtocol=https;...` |

### Get Storage Connection String

```bash
az storage account show-connection-string \
  --name stmilemedicaltic \
  --resource-group <YOUR_RESOURCE_GROUP> \
  --output tsv
```

### Create Blob Container

```bash
az storage container create \
  --name rfq-uploads \
  --account-name stmilemedicaltic \
  --public-access blob
```

---

## 📡 API Documentation

### Request

**Endpoint**: `POST /api/rfq/upload`

**Headers**:
```
Content-Type: multipart/form-data
```

**Body** (FormData):
```javascript
{
  file: File,      // Excel file (.xlsx or .xls)
  rfqId: string    // RFQ identifier (e.g., "RFQ_2024_001")
}
```

### Response

**Success (200)**:
```json
{
  "success": true,
  "fileUrl": "https://stmilemedicaltic.blob.core.windows.net/rfq-uploads/RFQ_2024_001_1699876543210.xlsx",
  "fileName": "RFQ_2024_001_1699876543210.xlsx",
  "originalFileName": "RFQ_2024_001.xlsx",
  "fileSize": 145678,
  "uploadedAt": "2024-11-14T20:30:00.000Z",
  "rfqId": "RFQ_2024_001",
  "message": "File uploaded successfully"
}
```

**Error (400/500)**:
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

---

## 🧪 Testing

### Test Locally

```bash
# Install dependencies
npm install

# Install Azure Functions Core Tools (if not already installed)
npm install -g azure-functions-core-tools@4

# Start local function
func start

# Function will be available at:
# http://localhost:7071/api/rfq/upload
```

### Test with cURL

```bash
curl -X POST http://localhost:7071/api/rfq/upload \
  -F "file=@/path/to/RFQ_Test.xlsx" \
  -F "rfqId=RFQ_TEST_001"
```

### Test with JavaScript (Fetch)

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('rfqId', 'RFQ_2024_001');

const response = await fetch('https://YOUR_FUNCTION_APP.azurewebsites.net/api/rfq/upload', {
    method: 'POST',
    body: formData
});

const result = await response.json();
console.log(result);
```

### Test from TIE Frontend

The frontend is already configured to call this endpoint. Simply:

1. Navigate to Matcher page
2. Upload an RFQ Excel file
3. Click "Save to Archive"
4. Check console for upload logs

---

## ✅ Validation

### Endpoint Validation

```bash
# Check if endpoint is deployed
curl -X POST https://YOUR_FUNCTION_APP.azurewebsites.net/api/rfq/upload

# Should return 400 (no file provided) - confirms endpoint is live
```

### File Upload Test

1. Use Postman or cURL to upload a test file
2. Check Azure Storage Explorer for uploaded file in `rfq-uploads` container
3. Verify file URL is accessible (public read)
4. Confirm response includes `fileUrl` and `fileName`

### End-to-End Test

1. Open TIE Matcher page
2. Upload RFQ Excel file
3. Click "Save to Archive"
4. Check browser console for:
   ```
   📤 Uploading file to Azure: filename.xlsx
   ✅ File uploaded to Azure Blob Storage
   📁 File URL: https://stmilemedicaltic.blob.core.windows.net/...
   ```
5. Navigate to Archive page
6. Click download button
7. Verify original file downloads

---

## 🔒 Security

### File Validation

- ✅ Only `.xlsx` and `.xls` files accepted
- ✅ Max file size: 50MB
- ✅ Filename sanitization
- ✅ RFQ ID sanitization

### Access Control

- Function uses `anonymous` auth level for simplicity
- Consider changing to `function` level and passing API key
- Blob container has public read access (download only)

### CORS

- CORS headers included in response
- Allows cross-origin requests from frontend

---

## 📊 Monitoring

### View Logs

**Azure Portal**:
1. Function App → Functions → rfq-upload
2. Monitor → Invocations
3. View execution logs

**Application Insights** (if enabled):
```bash
az monitor app-insights query \
  --app <APP_INSIGHTS_NAME> \
  --analytics-query "traces | where message contains 'RFQ' | order by timestamp desc"
```

### Common Log Messages

```
📤 RFQ File Upload Request Received
📦 Parsed {n} form parts
📁 File: {filename} ({size} bytes)
🔖 RFQ ID: {rfqId}
✅ Container ready: rfq-uploads
📤 Uploading to blob: {blobName}
✅ Upload successful: {fileUrl}
✅ Response sent successfully
```

---

## 🐛 Troubleshooting

### "Storage not configured" error

**Solution**: Set `AZURE_STORAGE_CONNECTION_STRING` in Function App Configuration

```bash
az functionapp config appsettings set \
  --name YOUR_FUNCTION_APP_NAME \
  --resource-group YOUR_RESOURCE_GROUP \
  --settings "AZURE_STORAGE_CONNECTION_STRING=YOUR_CONNECTION_STRING"
```

### "Container not found" error

**Solution**: Create the container

```bash
az storage container create \
  --name rfq-uploads \
  --account-name stmilemedicaltic \
  --public-access blob
```

### CORS errors in browser

**Solution**: Verify CORS headers are set (already included in code)

If still failing, configure CORS in Function App:
```bash
az functionapp cors add \
  --name YOUR_FUNCTION_APP_NAME \
  --resource-group YOUR_RESOURCE_GROUP \
  --allowed-origins "*"
```

### File upload fails with 413 error

**Solution**: Increase max request size in `host.json` (parent directory):

```json
{
  "extensions": {
    "http": {
      "maxRequestLength": 52428800
    }
  }
}
```

---

## 🔗 Integration

This function integrates with:

- **TIE Frontend** (`tie/js/sharepoint-client.js`)
- **SharePoint Client** (calls this endpoint for file upload)
- **Archive Page** (displays download links to uploaded files)

Frontend configuration in `sharepoint-client.js`:
```javascript
const SHAREPOINT_API_CONFIG = {
    baseUrl: window.location.origin + '/api/rfq',  // Points to /api/rfq/upload
    timeout: 30000
};
```

---

## 📦 Dependencies

- **@azure/storage-blob**: Azure Blob Storage SDK
- **parse-multipart-data**: Multipart form data parser

Install with:
```bash
npm install @azure/storage-blob@^12.17.0 parse-multipart-data@^1.5.0
```

---

## 🚀 Production Checklist

Before deploying to production:

- [ ] Set `AZURE_STORAGE_CONNECTION_STRING` environment variable
- [ ] Create `rfq-uploads` blob container with public read access
- [ ] Test endpoint with cURL/Postman
- [ ] Verify file uploads appear in Azure Storage Explorer
- [ ] Test download links from Archive page
- [ ] Enable Application Insights for monitoring
- [ ] Configure alerts for failures
- [ ] Set up backup/retention policies for uploaded files

---

## 📝 Notes

- Files are stored with pattern: `{rfqId}_{timestamp}_{filename}`
- Container has public read access for downloads
- Max file size: 50MB (configurable in code)
- Supported formats: `.xlsx`, `.xls`
- CORS enabled for cross-origin requests

---

## 🔗 Related Documentation

- [TIE System Fixes Summary](../../TIE-SYSTEM-FIXES-SUMMARY.md)
- [Issue #7 Implementation](../../TIE-ISSUE-7-FILE-STORAGE-IMPLEMENTATION.md)
- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
