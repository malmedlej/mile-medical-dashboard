# 📊 RFQ Data Storage Guide - Tender Intelligence Engine

## Overview

When an employee uploads an RFQ (Request for Quotation) file to the TIE Matcher, the system processes and stores the data **locally in the browser**. Currently, there is **no backend database** - all data is stored client-side.

---

## Current Storage Architecture

### **Storage Method: Browser LocalStorage**

The TIE system uses the browser's `localStorage` API to persist RFQ data on the user's device.

#### **Storage Key:**
```javascript
'tie_rfq_archive'
```

#### **Data Structure:**
```javascript
{
  rfqId: "RFQ-2024-001.xlsx",           // Extracted from filename
  date: "2025-11-06T12:34:56.789Z",     // ISO timestamp
  matchedItems: [                        // Array of matched items
    {
      nupco_code: "NPC-12345",
      product_name: "Product Name",
      uom: "EA",
      supplier: "Supplier Name",
      required_qty: "10",
      rfq_description: "...",
      status: "Matched",
      price: ""                          // Empty initially, filled later
    }
  ],
  matchedCount: 15,                      // Number of matched items
  totalCount: 20,                        // Total items in RFQ
  status: "New"                          // Status: New, Quoted, Submitted, Won, Lost
}
```

---

## Data Flow Process

### **1. Upload & Matching**
```
Employee uploads Excel file
         ↓
System extracts RFQ ID from filename
         ↓
Parses Excel data (NUPCO codes, quantities)
         ↓
Matches against vendor catalog
         ↓
Shows results on screen
```

### **2. Auto-Save to Archive**
```
If "Auto-save history" checkbox is enabled:
         ↓
System calls saveToArchive()
         ↓
Creates RFQ object with matched items
         ↓
Saves to localStorage
         ↓
Data persists in browser
```

### **3. Viewing Archive**
```
Navigate to Archive page
         ↓
System loads from localStorage
         ↓
Displays all saved RFQs in table
         ↓
Can filter, search, and update status
```

---

## Storage Locations

### **Code Files:**

1. **Matcher JavaScript** (`tie/js/matcher-v3.1.js`)
   - Line 735-779: `saveToArchive()` function
   - Handles saving RFQ data to localStorage

2. **Archive JavaScript** (`tie/js/archive.js`)
   - Line 40-56: `loadArchive()` function
   - Line 58-69: `saveArchive()` function
   - Manages reading/writing archive data

3. **Archive Page** (`tie/archive.html`)
   - Displays all archived RFQs
   - Allows status updates and price entry

---

## Current Limitations

### ⚠️ **Browser-Only Storage**

| Limitation | Impact |
|------------|--------|
| **Device-Specific** | Data only exists on the user's device/browser |
| **No Sharing** | Other employees cannot see uploaded RFQs |
| **No Backup** | If browser cache is cleared, data is lost |
| **Storage Limit** | Limited to ~5-10MB per domain |
| **No Sync** | Different devices/browsers have separate data |
| **No History** | No audit trail or version control |

### ⚠️ **No Persistence**

- Data is **NOT** saved to a server
- Data is **NOT** shared across team members
- Data is **NOT** backed up automatically
- Clearing browser data **deletes** all RFQs

---

## Future Enhancement Options

### **Option 1: SharePoint Integration** (Recommended)

Store RFQ data in SharePoint Lists or Excel files:

```
Upload RFQ → Process Data → Save to SharePoint List
                                    ↓
                         All team members can access
                                    ↓
                         Automatic backup & versioning
```

**Benefits:**
- ✅ Centralized storage
- ✅ Team collaboration
- ✅ Automatic backup
- ✅ Version control
- ✅ Azure AD authentication
- ✅ Already integrated with Mile Medical infrastructure

**Files to Create:**
- `tie/api/sharepoint-save.js` - Save to SharePoint API
- Azure Function to handle writes
- SharePoint List schema for RFQ archive

---

### **Option 2: Azure SQL Database**

Store data in Azure SQL Database:

```
Upload RFQ → Process Data → POST to Azure Function
                                    ↓
                         Azure Function writes to SQL DB
                                    ↓
                         All users query same database
```

**Benefits:**
- ✅ Relational database
- ✅ Advanced querying
- ✅ Reporting capabilities
- ✅ High availability
- ✅ Scalable

**Files to Create:**
- `azure-functions/rfq-save/index.js`
- `azure-functions/rfq-list/index.js`
- Database schema and migrations

---

### **Option 3: Azure Blob Storage + Cosmos DB**

Hybrid approach:

```
Upload RFQ → Store Excel in Blob Storage
          → Store metadata in Cosmos DB
          → Link both with unique ID
```

**Benefits:**
- ✅ Cheap blob storage for files
- ✅ Fast NoSQL queries
- ✅ Global distribution
- ✅ Original files preserved

---

## How to Access Current Data

### **View in Browser DevTools:**

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Expand **Local Storage**
4. Click on your domain
5. Find key: `tie_rfq_archive`
6. View JSON data

### **Export Current Data:**

Add this to browser console:
```javascript
const data = localStorage.getItem('tie_rfq_archive');
const blob = new Blob([data], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'rfq-archive-backup.json';
a.click();
```

---

## Recommended Next Steps

### **Immediate Actions:**

1. ✅ **Add Export Function** - Allow users to export archive as Excel/JSON
2. ✅ **Add Import Function** - Allow restoring from backup
3. ✅ **Add Warning Banner** - Inform users data is local only

### **Short-Term (1-2 weeks):**

1. 🔄 **Implement SharePoint Integration** - Save to SharePoint List
2. 🔄 **Add Azure Function** - Handle server-side processing
3. 🔄 **Add Team Sync** - Allow viewing other users' RFQs

### **Long-Term (1-2 months):**

1. 🚀 **Full Database Migration** - Move to Azure SQL or Cosmos DB
2. 🚀 **Real-time Collaboration** - Multiple users working on same RFQ
3. 🚀 **Advanced Analytics** - Reporting and insights

---

## Questions?

If you want to implement any of these enhancements, let me know and I can:
- Create the database schema
- Build the Azure Functions
- Implement SharePoint integration
- Add export/import functionality
- Set up proper backup systems

**Current Status:** ⚠️ Data is stored locally in browser only (no database backend)
