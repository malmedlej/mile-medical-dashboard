# 🧪 Post-Deployment Verification Checklist

## After running deployment, verify these items:

---

## 1️⃣ Azure Deployment Success

### Check Azure Portal
```bash
# Open Azure Portal
https://portal.azure.com

# Search for: mile-medical-sharepoint-func
```

**Verify:**
- [ ] Function App exists
- [ ] Status shows "Running"
- [ ] Runtime: Node 18
- [ ] Plan: Consumption

### Check via Azure CLI
```bash
# Check function status
az functionapp show \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg \
  --query "state" -o tsv

# Expected output: Running
```

### Test API Endpoint
```bash
FUNCTION_URL="https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq"

# Test CREATE
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "rfqId": "VERIFY-TEST-001",
    "matchedCount": 1,
    "totalCount": 2,
    "notFound": 1,
    "matchRate": 50,
    "notes": "Post-deployment verification"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ RFQ VERIFY-TEST-001 saved successfully.",
  "itemId": 123,
  "rfqId": "VERIFY-TEST-001",
  "matchRate": 50,
  "timestamp": "2025-01-06T..."
}
```

**Verify:**
- [ ] Returns 200 status
- [ ] success: true
- [ ] itemId is a number
- [ ] No error messages

---

## 2️⃣ Frontend Endpoint Updated

### Check Frontend File
```bash
# View the updated line
grep "azureFunctionUrl" tie/js/sharepoint-client.js
```

**Expected:**
```javascript
this.azureFunctionUrl = 'https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq';
```

**Verify:**
- [ ] URL is production endpoint (not localhost)
- [ ] URL uses HTTPS (not HTTP)
- [ ] URL ends with /api/sharepoint-rfq
- [ ] No syntax errors

### Check Git Commit
```bash
git log -1 --oneline
git show HEAD:tie/js/sharepoint-client.js | grep azureFunctionUrl
```

**Verify:**
- [ ] Changes committed to Git
- [ ] Commit message mentions production URL
- [ ] Changes pushed to GitHub

---

## 3️⃣ RFQ Created and Visible in SharePoint

### Check SharePoint List
```
1. Open SharePoint site:
   https://milemedical365.sharepoint.com/sites/MileMedical2

2. Navigate to:
   Lists → TIE RFQ Archive

3. Find your test RFQ:
   Title: VERIFY-TEST-001
```

**Verify Fields:**
- [ ] **Title**: VERIFY-TEST-001
- [ ] **RFQDate**: Current timestamp (today's date)
- [ ] **Status**: "New"
- [ ] **MatchedCount**: 1
- [ ] **TotalCount**: 2
- [ ] **NotFound**: 1
- [ ] **MatchRate**: 50
- [ ] **Notes**: "Post-deployment verification"
- [ ] **Created**: Today
- [ ] **Modified**: Today

### Test LIST Endpoint
```bash
curl https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq
```

**Verify:**
- [ ] Returns array of RFQs
- [ ] Includes test RFQ
- [ ] Count field shows total number
- [ ] No errors

---

## 4️⃣ Dashboard Integration Test

### Upload RFQ in Dashboard
```
1. Open browser
2. Navigate to: tie/matcher.html
3. Upload RFQ Excel file
4. Wait for matching results
5. Click "Save to Archive"
```

**Verify:**
- [ ] Upload works (no errors)
- [ ] Matching displays results
- [ ] "Save to Archive" button clickable
- [ ] Success toast appears: "✅ RFQ saved to SharePoint"
- [ ] No errors in browser console (F12)

### Check Browser Console
```
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for any errors
```

**Verify:**
- [ ] No red error messages
- [ ] No CORS errors
- [ ] No 401/403 authentication errors
- [ ] Success message logged

### Verify in SharePoint
```
1. Refresh SharePoint list
2. Find newly created RFQ
3. Check RFQ ID matches uploaded file
```

**Verify:**
- [ ] RFQ appears in list
- [ ] RFQ ID is correct
- [ ] All fields populated
- [ ] MatchedCount accurate
- [ ] TotalCount accurate
- [ ] MatchRate calculated correctly

---

## 5️⃣ End-to-End Flow Verification

### Complete User Journey
```
User Action → System Response → Expected Result
```

1. **Upload Excel**
   - [ ] File accepted
   - [ ] Parsing successful
   - [ ] Results displayed

2. **Match Products**
   - [ ] Matched items shown
   - [ ] Not found items shown
   - [ ] Match rate calculated

3. **Save to Archive**
   - [ ] Button click works
   - [ ] API call sent
   - [ ] Success response received
   - [ ] Toast notification shown

4. **SharePoint Storage**
   - [ ] Item created in list
   - [ ] All fields saved
   - [ ] Timestamp accurate
   - [ ] Status set to "New"

5. **Retrieval**
   - [ ] Can view in SharePoint
   - [ ] Can list via API
   - [ ] Can get specific RFQ
   - [ ] Data intact

---

## 6️⃣ Monitoring & Logs

### Check Application Insights
```
1. Azure Portal → mile-medical-sharepoint-func
2. Click "Application Insights"
3. View: Requests, Failures, Performance
```

**Verify:**
- [ ] Requests showing up
- [ ] No failures in last hour
- [ ] Response times < 3 seconds
- [ ] Success rate > 99%

### Check Function Logs
```bash
# Stream live logs
az webapp log tail \
  --name mile-medical-sharepoint-func \
  --resource-group mile-medical-rg
```

**Verify:**
- [ ] Logs streaming
- [ ] Success messages visible
- [ ] No error messages
- [ ] SharePoint operations logged

---

## 7️⃣ Security Verification

### CORS Configuration
```
1. Azure Portal → Function App → CORS
2. Check allowed origins
```

**Verify:**
- [ ] SharePoint domain allowed
- [ ] Dashboard domain allowed
- [ ] No wildcard (*) in production

### Environment Variables
```
1. Azure Portal → Function App → Configuration
2. Application Settings tab
```

**Verify:**
- [ ] SHAREPOINT_SITE_URL set
- [ ] AZURE_TENANT_ID set (hidden)
- [ ] AZURE_CLIENT_ID set (hidden)
- [ ] AZURE_CLIENT_SECRET set (hidden)
- [ ] NODE_ENV = "production"

### Authentication
```bash
# Test without credentials (should fail)
curl https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq \
  -H "Content-Type: application/json" \
  -d '{"rfqId": "TEST"}'
```

**Note**: This tests if function has proper SharePoint authentication configured.

---

## 8️⃣ Performance Testing

### Response Time Test
```bash
# Test CREATE endpoint speed
time curl -X POST https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq \
  -H "Content-Type: application/json" \
  -d '{"rfqId": "PERF-TEST", "matchedCount": 1, "totalCount": 2, "notFound": 1, "matchRate": 50}'
```

**Verify:**
- [ ] Response time < 3 seconds
- [ ] No timeout errors
- [ ] Consistent performance

### Multiple Requests Test
```bash
# Send 5 requests
for i in {1..5}; do
  curl -X POST https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq \
    -H "Content-Type: application/json" \
    -d "{\"rfqId\": \"LOAD-TEST-$i\", \"matchedCount\": 1, \"totalCount\": 2, \"notFound\": 1, \"matchRate\": 50}"
  echo ""
done
```

**Verify:**
- [ ] All requests succeed
- [ ] No rate limiting
- [ ] All items in SharePoint

---

## ✅ Final Verification Summary

### Deployment Checklist
- [ ] Function App deployed and running
- [ ] API endpoints responding
- [ ] SharePoint integration working
- [ ] Frontend updated with production URL
- [ ] End-to-end flow verified
- [ ] No errors in logs
- [ ] Performance acceptable
- [ ] Security configured

### Success Criteria
- [ ] **Azure Deployment**: Function live at https://mile-medical-sharepoint-func.azurewebsites.net
- [ ] **Frontend Update**: Production URL in tie/js/sharepoint-client.js
- [ ] **SharePoint Sync**: RFQs appearing in "TIE RFQ Archive" list
- [ ] **Dashboard Integration**: Upload → Save → Archive working
- [ ] **Data Accuracy**: All fields mapping correctly
- [ ] **Monitoring**: Application Insights logging events

---

## 📊 Verification Results Template

Copy this template and fill in results:

```
=== DEPLOYMENT VERIFICATION RESULTS ===

Date: [DATE]
Verified By: [NAME]

1️⃣ Azure Deployment Success
   - Function App Status: [Running/Not Running]
   - API Test Result: [Success/Failed]
   - Response Time: [X seconds]
   - Notes: [Any issues]

2️⃣ Frontend Endpoint Updated
   - URL in Code: [localhost/production]
   - Git Committed: [Yes/No]
   - Changes Pushed: [Yes/No]
   - Notes: [Any issues]

3️⃣ RFQ in SharePoint
   - Test RFQ Created: [Yes/No]
   - SharePoint Item ID: [ID]
   - All Fields Present: [Yes/No]
   - Data Accurate: [Yes/No]
   - Notes: [Any issues]

4️⃣ Dashboard Integration
   - Upload Works: [Yes/No]
   - Save Works: [Yes/No]
   - Success Message: [Yes/No]
   - Console Errors: [Yes/No]
   - Notes: [Any issues]

5️⃣ End-to-End Test
   - Complete Flow: [Success/Failed]
   - RFQ in SharePoint: [Yes/No]
   - Time to Complete: [X seconds]
   - Notes: [Any issues]

=== OVERALL STATUS ===
[✅ SUCCESS / ❌ ISSUES FOUND]

Next Steps:
- [List any follow-up actions needed]
```

---

## 🎉 If All Checks Pass

**Congratulations!** 🎊

Your SharePoint RFQ integration is now **LIVE IN PRODUCTION**!

### What You've Achieved:
✅ Serverless Azure Function deployed  
✅ Real-time SharePoint synchronization  
✅ Organization-wide RFQ visibility  
✅ Enterprise-grade data storage  
✅ Production-ready, scalable solution  

### Next Steps:
1. **Monitor** - Watch logs for first few days
2. **Train** - Brief team on new feature
3. **Optimize** - Based on usage patterns
4. **Enhance** - Consider archive page UI, reporting, etc.

---

**Function URL**: https://mile-medical-sharepoint-func.azurewebsites.net/api/sharepoint-rfq  
**SharePoint List**: https://milemedical365.sharepoint.com/sites/MileMedical2 → TIE RFQ Archive  
**Status**: 🚀 **LIVE IN PRODUCTION**
