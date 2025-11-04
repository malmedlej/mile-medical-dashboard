# 🧪 Tender Intelligence Engine - Testing Checklist

**Before sharing with the team, verify all items below:**

---

## ✅ Navigation Tests

### Dashboard Page (`/tie/index.html`)
- [ ] Dashboard link shows as **active** (orange highlight)
- [ ] All sidebar links are visible
- [ ] Clicking "Matcher" navigates to matcher page
- [ ] Clicking "Archive" navigates to archive page
- [ ] Clicking Pipeline/P&L/Workflow/Analytics shows "Coming Soon" alert
- [ ] Charts load correctly (RFQ Trend, Vendor Contribution)
- [ ] KPI cards display numbers
- [ ] Recent RFQs table is visible

### Matcher Page (`/tie/matcher.html`)
- [ ] Matcher link shows as **active** (orange highlight)
- [ ] All sidebar links are visible
- [ ] Clicking "Dashboard" navigates to dashboard
- [ ] Clicking "Archive" navigates to archive page
- [ ] Clicking Pipeline/P&L/Workflow/Analytics shows "Coming Soon" alert
- [ ] Upload area is visible
- [ ] Auto-save toggle is visible and checked

### Archive Page (`/tie/archive.html`)
- [ ] Archive link shows as **active** (orange highlight)
- [ ] All sidebar links are visible
- [ ] Clicking "Dashboard" navigates to dashboard
- [ ] Clicking "Matcher" navigates to matcher page
- [ ] Clicking Pipeline/P&L/Workflow/Analytics shows "Coming Soon" alert
- [ ] Statistics cards visible (Total RFQs, Pending, Quoted, Total Items)
- [ ] Search and filter controls visible
- [ ] Empty state shows "No RFQs Yet" if no data

---

## ✅ Matcher Functionality Tests

### File Upload
- [ ] Can click "Select File" button
- [ ] Can drag & drop Excel file
- [ ] File input accepts `.xlsx` and `.xls` files
- [ ] Shows loading indicator when processing
- [ ] **NO debug alert appears** (previously had DEBUG popup)

### Matching Process
- [ ] RFQ ID displays correctly in header (from filename)
- [ ] Statistics update after matching:
  - [ ] Total Items count
  - [ ] Matched items count (green)
  - [ ] Not Found items count (red)
  - [ ] Match Rate percentage
- [ ] Matched items table displays with:
  - [ ] NUPCO Code
  - [ ] Product Name
  - [ ] **UOM** column (NOT "Pack")
  - [ ] Supplier
  - [ ] Required Qty
  - [ ] Status badge (✓ Matched)

### Export Functionality
- [ ] "Export Results" button is visible
- [ ] Clicking export downloads Excel file
- [ ] Excel filename includes RFQ ID
- [ ] Excel file contains:
  - [ ] **UOM column** (NOT Pack)
  - [ ] All matched items
  - [ ] Not found items marked as "NOT FOUND"

### Auto-Save
- [ ] Auto-save toggle is checked by default
- [ ] After matching, RFQ is saved to Archive (check Archive page)
- [ ] Can toggle auto-save off/on

---

## ✅ Archive Functionality Tests

### Initial State
- [ ] If no RFQs: Shows "No RFQs Yet" message
- [ ] "Go to Matcher" button works
- [ ] Statistics show 0 for all counts

### After Uploading RFQs
- [ ] Archive table shows saved RFQs
- [ ] Each row displays:
  - [ ] RFQ ID
  - [ ] Date (relative: "X mins ago")
  - [ ] Matched Items count
  - [ ] Total Items count
  - [ ] Match Rate percentage
  - [ ] Status badge (New, Pending Quotes, Quoted, Submitted)
  - [ ] Action buttons (View 👁️, Delete 🗑️)

### Search & Filter
- [ ] Search by RFQ ID works
- [ ] Filter by Status works (All, New, Pending Quotes, Quoted, Submitted)
- [ ] Sort options work:
  - [ ] Latest First
  - [ ] Oldest First
  - [ ] Most Items
  - [ ] Least Items

### View RFQ Details (Modal)
- [ ] Clicking "View" icon opens modal
- [ ] Modal shows:
  - [ ] RFQ ID as title
  - [ ] Date
  - [ ] Status badge
  - [ ] Match Rate
  - [ ] Full matched items table
  - [ ] **UOM column** (NOT Pack)
  - [ ] Price input fields for each item
- [ ] Can enter prices in input fields
- [ ] Prices are saved (check by closing and reopening modal)
- [ ] "Export" button downloads Excel with prices
- [ ] "Update Status" button allows changing status
- [ ] Close button (X) works
- [ ] Clicking outside modal closes it

### Status Management
- [ ] Can update RFQ status via modal
- [ ] Status options available:
  - [ ] New
  - [ ] Pending Quotes
  - [ ] Quoted
  - [ ] Submitted
- [ ] Status badge updates immediately
- [ ] Statistics update after status change

### Delete Operations
- [ ] Clicking delete icon shows confirmation
- [ ] Can cancel deletion
- [ ] Confirming deletes the RFQ
- [ ] Statistics update after deletion
- [ ] "Clear Archive" button requires double confirmation
- [ ] Clearing archive removes all RFQs

---

## ✅ Visual & UX Tests

### Responsive Design
- [ ] Desktop view (1920x1080) looks good
- [ ] Laptop view (1366x768) looks good
- [ ] Tablet view (768px) - sidebar collapses appropriately
- [ ] Mobile view (375px) - all content accessible

### Styling
- [ ] Glassmorphic cards have blur effect
- [ ] Orange gradient accent color (#F6B17A) visible
- [ ] Dark theme consistent across all pages
- [ ] Hover effects work on buttons and links
- [ ] Active nav items have orange highlight
- [ ] Grayed-out nav items (Pipeline, P&L, etc.) have reduced opacity

### Notifications
- [ ] Toast notifications appear in top-right corner
- [ ] Success toasts are green
- [ ] Error toasts are red
- [ ] Warning toasts are yellow
- [ ] Toasts auto-dismiss after 4 seconds

---

## ✅ Data Persistence Tests

### LocalStorage
- [ ] After uploading RFQ with auto-save ON:
  - [ ] Close browser tab
  - [ ] Reopen Archive page
  - [ ] RFQ is still there
- [ ] After updating prices:
  - [ ] Refresh page
  - [ ] Prices are still saved
- [ ] After updating status:
  - [ ] Refresh page
  - [ ] Status is preserved

---

## ✅ Error Handling Tests

### Invalid Uploads
- [ ] Uploading non-Excel file shows error
- [ ] Uploading empty Excel file shows error
- [ ] Uploading Excel with no valid items shows error

### Edge Cases
- [ ] RFQ with 0 matched items (100% not found)
- [ ] RFQ with 100% match rate
- [ ] Very long RFQ IDs display correctly
- [ ] Very long product names don't break layout
- [ ] Special characters in RFQ ID handled correctly

---

## ✅ Performance Tests

### Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Matcher page loads in < 2 seconds
- [ ] Archive page loads in < 2 seconds
- [ ] Matching 100+ items completes in < 5 seconds

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (if available)

---

## ✅ Critical Issues to Watch For

### Known Fixed Issues
- ✅ DEBUG alert removed
- ✅ "Pack" changed to "UOM"
- ✅ Archive link added to all pages
- ✅ Coming Soon alerts for placeholder pages

### Things That Should NOT Happen
- ❌ No debug popups or alerts (except Coming Soon)
- ❌ No console errors in browser DevTools
- ❌ No broken images or missing styles
- ❌ No "404 Not Found" errors
- ❌ No "Pack" column anywhere (should be "UOM")

---

## 📊 Current Feature Status

### ✅ Fully Functional
- Dashboard (view only)
- Matcher (upload, match, export)
- Archive (track, manage, price, export)

### 🚧 Coming Soon (Grayed Out)
- Pipeline
- P&L
- Workflow
- Analytics

---

## 🔗 Test URLs

After deployment completes (wait ~1 minute), test these URLs:

- **Dashboard**: https://dashboard.milemedical.com/tie/index.html
- **Matcher**: https://dashboard.milemedical.com/tie/matcher.html
- **Archive**: https://dashboard.milemedical.com/tie/archive.html

---

## 📝 Testing Notes

**Test with Real Data:**
1. Use actual NUPCO RFQ files
2. Upload RFQ with ID like: `NDP01086-25.xlsx`
3. Verify matching works with vendor catalog
4. Check that UOM values make sense
5. Test price entry with realistic numbers

**Report Any Issues With:**
- Screenshot of the issue
- Browser and version
- Steps to reproduce
- Expected vs actual behavior

---

## ✅ Final Approval Checklist

Before sharing with team:
- [ ] All navigation links work
- [ ] No debug messages appear
- [ ] UOM column displays correctly
- [ ] Auto-save works
- [ ] Archive functionality complete
- [ ] Coming Soon alerts work
- [ ] Export includes prices
- [ ] Mobile view tested
- [ ] No console errors
- [ ] Deployment successful

**Sign-off:** _______________  **Date:** _______________

---

*Last Updated: 2025-11-04*
*Version: 1.0 - Archive System Release*
