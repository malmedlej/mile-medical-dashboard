# Azure RFQ Upload Endpoint - Deployment Guide

## 🎯 Overview

Complete deployment guide for the **RFQ File Upload Azure Function** endpoint.

**Endpoint**: `POST /api/rfq/upload`  
**Purpose**: Upload RFQ Excel files to Azure Blob Storage  
**Storage**: `stmilemedicaltic` → `rfq-uploads` container

---

## ✅ WHAT WAS CREATED

### New Files:

```
azure-functions/rfq-upload/
├── function.json           # HTTP trigger configuration
├── index.js               # Main upload logic (6.6 KB)
├── package.json           # Dependencies
├── README.md              # Complete documentation (8.4 KB)
├── deploy.sh              # Deployment script
└── test-local.sh          # Local testing script
```

### Key Features:

- ✅ HTTP POST endpoint `/api/rfq/upload`
- ✅ Multipart form-data handling
- ✅ Azure Blob Storage upload
- ✅ File validation (type, size)
- ✅ CORS headers for frontend
- ✅ Comprehensive error handling
- ✅ Detailed logging
- ✅ Security sanitization

---

## 🚀 DEPLOYMENT STEPS

### **Option A: Quick Deploy (Recommended)**

```bash
# 1. Navigate to function directory
cd azure-functions/rfq-upload

# 2. Run deployment script
./deploy.sh YOUR_FUNCTION_APP_NAME

# Script will:
# - Install dependencies
# - Deploy to Azure
# - Show endpoint URL
```

### **Option B: Manual Deploy**

```bash
# 1. Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# 2. Login to Azure
az login

# 3. Navigate to function directory
cd azure-functions/rfq-upload

# 4. Install dependencies
npm install

# 5. Deploy
cd ..
func azure functionapp publish YOUR_FUNCTION_APP_NAME
```

---

## 🔧 CONFIGURATION

### 1. Set Environment Variables

**In Azure Portal**:
1. Go to Function App → Configuration
2. Add Application Setting:
   - Name: `AZURE_STORAGE_CONNECTION_STRING`
   - Value: `DefaultEndpointsProtocol=https;AccountName=stmilemedicaltic;AccountKey=...;EndpointSuffix=core.windows.net`

**Via Azure CLI**:
```bash
# Get connection string
CONNECTION_STRING=$(az storage account show-connection-string \
  --name stmilemedicaltic \
  --resource-group YOUR_RESOURCE_GROUP \
  --output tsv)

# Set in Function App
az functionapp config appsettings set \
  --name YOUR_FUNCTION_APP_NAME \
  --resource-group YOUR_RESOURCE_GROUP \
  --settings "AZURE_STORAGE_CONNECTION_STRING=$CONNECTION_STRING"
```

### 2. Create Blob Container

```bash
az storage container create \
  --name rfq-uploads \
  --account-name stmilemedicaltic \
  --public-access blob \
  --auth-mode login
```

### 3. Enable CORS (if needed)

```bash
az functionapp cors add \
  --name YOUR_FUNCTION_APP_NAME \
  --resource-group YOUR_RESOURCE_GROUP \
  --allowed-origins "*"
```

---

## 🧪 TESTING

### Test 1: Endpoint Availability

```bash
# Should return 400 (no file) - confirms endpoint is live
curl -X POST https://YOUR_FUNCTION_APP.azurewebsites.net/api/rfq/upload
```

Expected response:
```json
{
  "success": false,
  "error": "No file provided",
  "statusCode": 400
}
```

### Test 2: File Upload

```bash
# Create a test Excel file
echo "Test" > test.xlsx

# Upload it
curl -X POST https://YOUR_FUNCTION_APP.azurewebsites.net/api/rfq/upload \
  -F "file=@test.xlsx" \
  -F "rfqId=TEST_001"
```

Expected response:
```json
{
  "success": true,
  "fileUrl": "https://stmilemedicaltic.blob.core.windows.net/rfq-uploads/TEST_001_1699876543210.xlsx",
  "fileName": "TEST_001_1699876543210.xlsx",
  "originalFileName": "test.xlsx",
  "fileSize": 5,
  "uploadedAt": "2024-11-14T20:30:00.000Z",
  "rfqId": "TEST_001",
  "message": "File uploaded successfully"
}
```

### Test 3: Verify in Storage

```bash
# List files in container
az storage blob list \
  --container-name rfq-uploads \
  --account-name stmilemedicaltic \
  --output table
```

### Test 4: Download File

```bash
# Copy the fileUrl from upload response and visit in browser
# Or use curl:
curl -o downloaded.xlsx "https://stmilemedicaltic.blob.core.windows.net/rfq-uploads/TEST_001_..."
```

### Test 5: Frontend Integration

1. Open TIE Matcher page: `https://YOUR_SITE/tie/matcher.html`
2. Upload an RFQ Excel file
3. Click "Save to Archive"
4. Check browser console for logs:
   ```
   📤 Uploading file to Azure: filename.xlsx
   ✅ File uploaded to Azure Blob Storage
   📁 File URL: https://...
   ```
5. Navigate to Archive page
6. Verify download button appears
7. Click download button
8. Verify file downloads

---

## ✅ VALIDATION CHECKLIST

### Backend Validation:

- [ ] Azure Function deployed successfully
- [ ] Endpoint returns 200 on test upload
- [ ] File appears in `rfq-uploads` container
- [ ] `fileUrl` in response is accessible
- [ ] File can be downloaded from URL
- [ ] CORS headers present in response

### Frontend Integration:

- [ ] TIE frontend calls correct endpoint
- [ ] File upload triggers successfully
- [ ] Toast shows "RFQ and file saved to SharePoint"
- [ ] Console shows file URL
- [ ] Archive page loads RFQs with file URLs
- [ ] Download button appears in archive
- [ ] Download button successfully downloads file

### Error Handling:

- [ ] Invalid file type rejected
- [ ] File too large rejected (>50MB)
- [ ] Missing rfqId returns error
- [ ] Storage errors handled gracefully

---

## 📊 MONITORING

### View Logs in Azure Portal:

1. Function App → Functions → rfq-upload
2. Click "Monitor"
3. View recent invocations
4. Check for errors

### Common Log Messages:

```
✅ Success logs:
📤 RFQ File Upload Request Received
📁 File: filename.xlsx (145678 bytes)
🔖 RFQ ID: RFQ_2024_001
✅ Container ready: rfq-uploads
📤 Uploading to blob: RFQ_2024_001_1699876543210.xlsx
✅ Upload successful
✅ Response sent successfully

❌ Error logs:
❌ No request body
❌ Invalid file type
❌ File too large
❌ Storage not configured
❌ Upload error
```

### Application Insights Query:

```kusto
traces
| where message contains "RFQ"
| order by timestamp desc
| take 50
```

---

## 🐛 TROUBLESHOOTING

### Error: "Storage not configured"

**Cause**: Missing `AZURE_STORAGE_CONNECTION_STRING`

**Solution**:
```bash
az functionapp config appsettings set \
  --name YOUR_FUNCTION_APP \
  --resource-group YOUR_RG \
  --settings "AZURE_STORAGE_CONNECTION_STRING=YOUR_CONNECTION_STRING"
```

### Error: "Container not found"

**Cause**: `rfq-uploads` container doesn't exist

**Solution**:
```bash
az storage container create \
  --name rfq-uploads \
  --account-name stmilemedicaltic \
  --public-access blob
```

### Error: CORS blocked

**Cause**: CORS not configured

**Solution**:
```bash
az functionapp cors add \
  --name YOUR_FUNCTION_APP \
  --resource-group YOUR_RG \
  --allowed-origins "https://your-frontend-domain.com"
```

### Error: 413 Request Entity Too Large

**Cause**: File exceeds Azure limit

**Solution**: Update `host.json` in parent directory:
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

## 🔒 SECURITY CONSIDERATIONS

### Authentication

Current: `anonymous` (no auth required)

**Recommended for Production**:
```json
{
  "authLevel": "function"
}
```

Then pass function key:
```bash
curl -X POST "https://YOUR_FUNCTION_APP.azurewebsites.net/api/rfq/upload?code=YOUR_FUNCTION_KEY" \
  -F "file=@test.xlsx" \
  -F "rfqId=TEST"
```

### File Validation

✅ Already implemented:
- File type validation (`.xlsx`, `.xls` only)
- File size limit (50MB max)
- Filename sanitization
- RFQ ID sanitization

### Access Control

- Container has public **read** access (download only)
- Upload requires hitting the function endpoint
- Consider adding authentication for production

---

## 📈 PERFORMANCE

### Expected Performance:

- Small files (<1MB): ~500ms
- Medium files (1-10MB): ~1-2 seconds
- Large files (10-50MB): ~5-10 seconds

### Optimization Tips:

1. **Increase timeout** if needed:
   ```json
   // function.json
   {
     "timeout": "00:05:00"
   }
   ```

2. **Use Premium plan** for better performance
3. **Enable CDN** for faster downloads
4. **Compress files** before upload

---

## 🔗 INTEGRATION POINTS

### Frontend Configuration:

File: `tie/js/sharepoint-client.js`

```javascript
const SHAREPOINT_API_CONFIG = {
    baseUrl: window.location.origin + '/api/rfq',  // /api/rfq/upload
    timeout: 30000
};
```

**If Function App is separate domain**:
```javascript
const SHAREPOINT_API_CONFIG = {
    baseUrl: 'https://YOUR_FUNCTION_APP.azurewebsites.net/api/rfq',
    timeout: 30000
};
```

### Archive Page:

File: `tie/js/archive.js`

Download button uses `rfq.fileUrl` directly:
```javascript
function downloadRFQFile(index) {
    const link = document.createElement('a');
    link.href = rfq.fileUrl;  // From uploaded file
    link.download = rfq.fileName;
    link.click();
}
```

---

## 📝 DEPLOYMENT CHECKLIST

### Pre-Deployment:

- [ ] Azure Function App created
- [ ] Storage account `stmilemedicaltic` exists
- [ ] Azure CLI installed and logged in
- [ ] Node.js 18+ installed

### Deployment:

- [ ] Run `./deploy.sh YOUR_FUNCTION_APP_NAME`
- [ ] Or run `func azure functionapp publish YOUR_FUNCTION_APP_NAME`
- [ ] Verify deployment succeeded

### Post-Deployment:

- [ ] Set `AZURE_STORAGE_CONNECTION_STRING` env var
- [ ] Create `rfq-uploads` blob container
- [ ] Enable CORS if needed
- [ ] Test endpoint with cURL
- [ ] Test file upload
- [ ] Verify file in Azure Storage
- [ ] Test file download
- [ ] Test from frontend
- [ ] Monitor logs for errors

---

## 🎯 SUCCESS CRITERIA

### All 4 Points Validated:

1. ✅ **Endpoint Deployed**: `POST /api/rfq/upload` returns 200/400
2. ✅ **Real File Upload**: File appears in `rfq-uploads` container
3. ✅ **Response Format**: Returns `fileUrl`, `fileName`, `success: true`
4. ✅ **Download Works**: File URL is accessible and downloadable

**Once all 4 points are confirmed**, we can proceed to **Issue #8 - Full System Testing**.

---

## 📞 NEXT STEPS

After deployment:

1. **Test the 4 validation points** above
2. **Verify from TIE frontend**:
   - Upload file
   - Save to archive
   - View in archive
   - Download file
3. **Proceed to Issue #8** - Full system testing with 3 real RFQ files

---

## 🆘 SUPPORT

### Resources:

- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [Azure Blob Storage](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Function README](azure-functions/rfq-upload/README.md)

### Contact:

If issues persist after following this guide, check:
1. Azure Portal → Function App → Logs
2. Application Insights → Failures
3. Storage Account → Monitoring

---

**Created**: 2024-11-14  
**Version**: 1.0  
**Status**: Ready for deployment
