# SharePoint Vendor Catalog Setup Guide

## Overview
TIE Matcher now integrates with your SharePoint vendor catalog for real-time product matching.

## SharePoint File Location
**File**: `vendor_items.xlsx`  
**Location**: https://milemedical365.sharepoint.com/:x:/s/Milemedical2/EXUb3LmgUKtEijkKxESkSxMBM18ryASwuHIuSqLJvCFAfQ?e=moNDnQ

## File Format (Expected Columns)

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| NUPCO Code | Product Name | UOM | Supplier |
| 4110260000200 | Medical Product Name | EA | Supplier Name |
| ... | ... | ... | ... |

### Column Details:
1. **Column A - NUPCO Code**: The unique NUPCO material code
2. **Column B - Product Name**: Full product description
3. **Column C - UOM**: Unit of Measure (EA, BOX, PACK, etc.)
4. **Column D - Supplier**: Your vendor/supplier name

## Setup Instructions

### Option 1: SharePoint Direct Access (Recommended)
1. **Make file publicly accessible**:
   - Open the file in SharePoint
   - Click "Share" → "Anyone with the link can view"
   - Copy the share link
   - Update `SHAREPOINT_CONFIG.vendorCatalogUrl` in `matcher-v3.1.js`

2. **Enable anonymous access** (if needed):
   - SharePoint Admin → Settings → Sharing
   - Enable "Anyone" links

### Option 2: Local Backup (Current Fallback)
1. Download `vendor_items.xlsx` from SharePoint
2. Place it in `/tie/data/vendor_items.xlsx`
3. System will use this if SharePoint is unavailable

### Option 3: Automated Sync (Future Enhancement)
- Azure Function to sync SharePoint → Azure Blob Storage
- TIE fetches from Blob Storage (no CORS issues)

## How to Update Vendor Catalog

### Quick Update (SharePoint):
1. Open the SharePoint Excel file
2. Add/edit rows with new products
3. Save the file
4. Refresh TIE Matcher page
5. New items are loaded automatically

### Benefits:
✅ **Easy Updates**: Edit from anywhere (phone, computer)  
✅ **No Code Changes**: Just update the Excel file  
✅ **Team Collaboration**: Multiple users can maintain the catalog  
✅ **Version History**: SharePoint tracks all changes  
✅ **Backup**: Automatic SharePoint backups

## Troubleshooting

### "Could not load vendor catalog" Error
**Cause**: CORS or authentication blocking SharePoint access

**Solution**:
1. Check file permissions (must be "Anyone with link")
2. Verify file is in correct location
3. Use local backup: Download file → place in `/tie/data/`
4. Check browser console for specific error

### Items Not Matching
**Cause**: NUPCO codes don't match exactly

**Solution**:
1. Ensure NUPCO codes in catalog match RFQ exactly
2. Remove extra spaces or special characters
3. Use TEXT format in Excel (not NUMBER)
4. Check for leading zeros

### Empty Catalog
**Cause**: File format incorrect or empty

**Solution**:
1. Ensure header row exists (row 1)
2. Data starts from row 2
3. No empty rows between data
4. All 4 columns have data

## Technical Details

### CORS Handling
SharePoint blocks direct browser access due to CORS policies. The system:
1. First tries SharePoint direct download
2. Falls back to local backup file
3. Shows appropriate warnings/notifications

### File Parsing
- Uses SheetJS (XLSX.js) library
- Reads first sheet only
- Skips header row (row 1)
- Converts all values to strings and trims whitespace

### Caching
- Vendor catalog loads once on page load
- To reload: Refresh the browser page
- Future: Add "Reload Catalog" button

## Contact
For issues or questions about SharePoint integration, contact the TIE development team.
