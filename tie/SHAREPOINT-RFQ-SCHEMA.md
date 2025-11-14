# SharePoint RFQ Archive - List Schema & Setup Guide

## Overview

This document describes the SharePoint List structure for storing RFQ (Request for Quotation) data from the Tender Intelligence Engine.

---

## SharePoint List: "TIE RFQ Archive"

### List Settings
- **List Name:** `TIE_RFQ_Archive`
- **List Type:** Custom List
- **Versioning:** Enabled (Major versions only)
- **Content Approval:** Optional (Enable for workflow approval)
- **Permissions:** Inherit from parent site (Mile Medical team members)

---

## Column Schema

### Required Columns

| Column Name | Internal Name | Type | Required | Description |
|-------------|---------------|------|----------|-------------|
| **Title** | `Title` | Single line of text | Yes | RFQ ID (e.g., "RFQ-2024-001.xlsx") |
| **RFQ Date** | `RFQDate` | Date and Time | Yes | When RFQ was uploaded |
| **Uploaded By** | `UploadedBy` | Person or Group | Yes | Employee who uploaded (auto-filled) |
| **Status** | `Status` | Choice | Yes | New, Quoted, Submitted, Won, Lost |
| **Matched Count** | `MatchedCount` | Number | Yes | Number of items matched |
| **Total Count** | `TotalCount` | Number | Yes | Total items in RFQ |
| **Match Rate** | `MatchRate` | Number | No | Percentage (calculated: MatchedCount/TotalCount*100) |
| **Matched Items JSON** | `MatchedItemsJSON` | Multiple lines of text | Yes | JSON array of matched items |
| **Not Found Items JSON** | `NotFoundItemsJSON` | Multiple lines of text | No | JSON array of items not found |
| **Total Value** | `TotalValue` | Currency | No | Sum of all item prices (calculated) |
| **Notes** | `Notes` | Multiple lines of text | No | Additional notes/comments |
| **Last Modified** | `Modified` | Date and Time | Auto | Last update timestamp |
| **Modified By** | `Editor` | Person or Group | Auto | Last person to modify |

### Choice Field Values

**Status Column:**
- New (Default)
- Quoted
- Submitted
- Won
- Lost
- Cancelled

---

## JSON Data Structure

### Matched Items JSON Format

```json
[
  {
    "nupco_code": "NPC-12345",
    "product_name": "Surgical Gloves Latex",
    "uom": "BOX",
    "supplier": "ABC Medical Supplies",
    "required_qty": "100",
    "rfq_description": "Latex surgical gloves, size M",
    "status": "Matched",
    "unit_price": "25.50",
    "total_price": "2550.00",
    "quoted_date": "2025-11-06T10:30:00Z"
  }
]
```

### Not Found Items JSON Format

```json
[
  {
    "code": "NPC-99999",
    "quantity": "50",
    "description": "Special item not in catalog"
  }
]
```

---

## SharePoint List Creation

### Option 1: Manual Creation (SharePoint UI)

1. Navigate to: `https://milemedical365.sharepoint.com/sites/MileMedical2`
2. Click **Site contents** → **New** → **List**
3. Choose **Blank list**
4. Name: `TIE RFQ Archive`
5. Add columns as per schema above

### Option 2: PowerShell Script

```powershell
# Connect to SharePoint Online
Connect-PnPOnline -Url "https://milemedical365.sharepoint.com/sites/MileMedical2" -Interactive

# Create the list
New-PnPList -Title "TIE RFQ Archive" -Template GenericList -Url "Lists/TIE_RFQ_Archive"

# Add custom columns
Add-PnPField -List "TIE RFQ Archive" -DisplayName "RFQ Date" -InternalName "RFQDate" -Type DateTime -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Uploaded By" -InternalName "UploadedBy" -Type User -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Status" -InternalName "Status" -Type Choice -Choices "New","Quoted","Submitted","Won","Lost","Cancelled" -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Matched Count" -InternalName "MatchedCount" -Type Number -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Total Count" -InternalName "TotalCount" -Type Number -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Match Rate" -InternalName "MatchRate" -Type Number
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Matched Items JSON" -InternalName "MatchedItemsJSON" -Type Note -Required
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Not Found Items JSON" -InternalName "NotFoundItemsJSON" -Type Note
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Total Value" -InternalName "TotalValue" -Type Currency
Add-PnPField -List "TIE RFQ Archive" -DisplayName "Notes" -InternalName "Notes" -Type Note

Write-Host "✅ SharePoint List 'TIE RFQ Archive' created successfully!"
```

### Option 3: REST API / PnP Provisioning Template

See file: `sharepoint-list-template.xml`

---

## Permissions & Security

### Recommended Permission Structure

| Group | Permission Level | Can Do |
|-------|------------------|--------|
| **Mile Medical Admins** | Full Control | Everything |
| **Commercial Team** | Contribute | Create, Read, Edit own items |
| **Operations Team** | Read | View all RFQs |
| **External Vendors** | None | No access |

### Item-Level Permissions (Optional)

Enable "Item-level Permissions" to allow users to:
- ✅ Read all items
- ✅ Edit only items they created
- ❌ Delete items (Admin only)

---

## Views

### Default View: "All RFQs"
- Show: Title, RFQ Date, Uploaded By, Status, Match Rate, Total Value
- Sort by: RFQ Date (Descending)
- Filter: None

### Custom Views to Create

1. **My RFQs**
   - Filter: `[Uploaded By] = [Me]`
   - Sort: RFQ Date (Desc)

2. **Recent Submissions**
   - Filter: `Status = "Submitted" OR Status = "Quoted"`
   - Sort: Modified (Desc)

3. **Won Tenders**
   - Filter: `Status = "Won"`
   - Sort: RFQ Date (Desc)

4. **This Month**
   - Filter: `[RFQ Date] >= [Today] - 30`
   - Sort: RFQ Date (Desc)

---

## Calculated Columns (Optional)

### Match Rate Percentage

```
=IF([Total Count]>0, ([Matched Count]/[Total Count]*100), 0)
```

### Days Since Upload

```
=INT(NOW()-[RFQ Date])
```

### Status Color (For formatting)

```
=IF([Status]="Won","🎉",IF([Status]="Lost","❌",IF([Status]="Submitted","⏳","📝")))
```

---

## Indexing for Performance

For better query performance, create indexes on:

1. **RFQ Date** - Frequently filtered
2. **Status** - Frequently filtered
3. **Uploaded By** - User-specific queries
4. **Modified** - Recent items queries

To create indexes:
- List Settings → Columns → Click column → Column Settings → Add Index

---

## Backup & Retention

### Retention Policy
- Keep all items indefinitely (or set custom policy)
- Enable Recycle Bin (90 days)
- Regular backups via SharePoint Admin Center

### Export Options
- Users can export to Excel from List view
- Admins can use PowerShell for bulk export
- Azure Functions can automate backups

---

## Integration Endpoints

### SharePoint REST API

**Base URL:**
```
https://milemedical365.sharepoint.com/sites/MileMedical2/_api/web/lists/getbytitle('TIE RFQ Archive')
```

**Get All Items:**
```
GET /_api/web/lists/getbytitle('TIE RFQ Archive')/items
```

**Get Single Item:**
```
GET /_api/web/lists/getbytitle('TIE RFQ Archive')/items({id})
```

**Create Item:**
```
POST /_api/web/lists/getbytitle('TIE RFQ Archive')/items
Content-Type: application/json;odata=verbose

{
  "__metadata": {"type": "SP.Data.TIE_RFQ_ArchiveListItem"},
  "Title": "RFQ-2024-001.xlsx",
  "RFQDate": "2025-11-06T12:00:00Z",
  "Status": "New",
  ...
}
```

**Update Item:**
```
POST /_api/web/lists/getbytitle('TIE RFQ Archive')/items({id})
X-HTTP-Method: MERGE
If-Match: *
Content-Type: application/json;odata=verbose

{
  "__metadata": {"type": "SP.Data.TIE_RFQ_ArchiveListItem"},
  "Status": "Quoted"
}
```

---

## Next Steps

1. ✅ Create the SharePoint List using one of the methods above
2. ✅ Configure permissions appropriately
3. ✅ Create custom views
4. ✅ Test adding items manually
5. ✅ Deploy Azure Function for API integration
6. ✅ Update TIE frontend to use SharePoint

---

## Related Files

- `azure-functions/sharepoint-rfq/` - Azure Function for CRUD operations
- `tie/js/sharepoint-client.js` - Frontend SharePoint client
- `tie/js/sharepoint-sync.js` - Sync utility for migration

---

## Support

For issues with SharePoint setup, contact:
- SharePoint Admin: IT Department
- Developer: See project README
- Documentation: This file + Azure Function README
