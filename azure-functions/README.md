# TIE SharePoint Sync - Azure Function

Automatically syncs vendor catalog from SharePoint to Azure Blob Storage every 5 minutes.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Azure CLI installed
- Azure subscription
- Completed Azure AD App setup (see AZURE-SETUP-GUIDE.md)

### Deploy to Azure

```bash
# Install dependencies
npm install

# Login to Azure
az login

# Deploy function
./deploy.sh
```

### Local Development

```bash
# Install dependencies
npm install

# Copy example settings
cp local.settings.json.example local.settings.json

# Edit local.settings.json with your values

# Run locally
npm start

# Function will be available at:
# http://localhost:7071/admin/functions/sharepoint-sync
```

### Manual Testing

Trigger the function manually in Azure Portal:
1. Go to Function App
2. Select "sharepoint-sync" function
3. Click "Code + Test"
4. Click "Test/Run"
5. Check logs for results

### Configuration

Set these environment variables in Azure Function App Configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `SHAREPOINT_CLIENT_ID` | Azure AD App Client ID | `xxxxxxxx-xxxx-xxxx...` |
| `SHAREPOINT_CLIENT_SECRET` | Azure AD App Secret | `your-secret-value` |
| `SHAREPOINT_TENANT_ID` | Azure AD Tenant ID | `edd2363d-c022...` |
| `SHAREPOINT_SITE_ID` | SharePoint Site ID | Get from Graph API |
| `SHAREPOINT_DRIVE_ID` | SharePoint Drive ID | Get from Graph API |
| `SHAREPOINT_FILE_ID` | File Unique ID | `155bdd1b-a840...` |
| `AZURE_STORAGE_CONNECTION_STRING` | Storage connection string | `DefaultEndpoints...` |
| `BLOB_CONTAINER_NAME` | Container name | `tie-vendor-catalog` |

### Schedule

Function runs on a timer: **every 5 minutes**

Schedule format (NCRONTAB):
```
0 */5 * * * *
```

To change the schedule, edit `sharepoint-sync/function.json`:
```json
{
  "schedule": "0 */5 * * * *"
}
```

### Monitoring

View logs in Azure Portal:
- Function App → Monitor → Invocations
- Application Insights (if enabled)

### Troubleshooting

**Function not running?**
- Check schedule is correct
- Verify Function App is running (not stopped)

**Authentication errors?**
- Verify client ID and secret are correct
- Check API permissions granted

**File not downloading?**
- Verify Site/Drive/File IDs are correct
- Check app has Sites.Read.All permission

**Blob upload fails?**
- Verify storage connection string
- Check container exists and is public

### Architecture

```
Timer Trigger (every 5 min)
    ↓
Get Azure AD Access Token
    ↓
Download from SharePoint (Graph API)
    ↓
Upload to Azure Blob Storage
    ↓
Set Metadata (sync time, etc.)
```

### Files

- `host.json` - Function app configuration
- `package.json` - Node.js dependencies
- `sharepoint-sync/function.json` - Function bindings
- `sharepoint-sync/index.js` - Function code
- `deploy.sh` - Deployment script
- `local.settings.json.example` - Local settings template

### Cost

Estimated cost: **~$0.60/month**
- Function executions: Free tier
- Storage: ~$0.50/month
- Bandwidth: ~$0.10/month

### Security

- Uses Application (daemon) permissions
- No user credentials required
- Secrets stored in Azure Key Vault (recommended)
- Blob storage is read-only public

## Full Documentation

See `/AZURE-SETUP-GUIDE.md` for complete setup instructions.
