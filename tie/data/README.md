# Vendor Catalog Data Folder

## Purpose
This folder contains the local backup of your vendor catalog for the TIE Matcher system.

## Required File
**Filename**: `vendor_items.xlsx`

### How to Create:
1. Download your vendor catalog from SharePoint:
   - URL: https://milemedical365.sharepoint.com/:x:/s/Milemedical2/EXUb3LmgUKtEijkKxESkSxMBM18ryASwuHIuSqLJvCFAfQ?e=moNDnQ
2. Save it as `vendor_items.xlsx`
3. Place it in this folder

### File Format:
The Excel file must have these columns (in order):
- **Column A**: NUPCO Code
- **Column B**: Product Name
- **Column C**: UOM (Unit of Measure)
- **Column D**: Supplier

### Example:
| NUPCO Code | Product Name | UOM | Supplier |
|------------|--------------|-----|----------|
| 4110260000200 | Surgical Gloves Size 7 | BOX | Medical Supplies Co |
| 4110260000300 | Face Mask N95 | EA | Safety Equipment Ltd |

## When is this used?
- **Primary Source**: SharePoint (live updates)
- **Fallback**: This local file (if SharePoint unavailable)

## Updating the Catalog
**Recommended**: Update the SharePoint file directly for automatic sync  
**Alternative**: Replace the local file here and commit changes
