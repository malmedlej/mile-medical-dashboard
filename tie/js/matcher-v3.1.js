// Global variables
let vendorItems = [];
let vendorHashMap = {};  // VLOOKUP-style hash map for O(1) exact matching
let priceHistory = [];
let matchedItems = [];
let notFoundItems = [];
let currentRFQId = '';
let autoSaveEnabled = true;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadVendorItems();
    await loadPriceHistory();
    setupEventListeners();
});

// Load vendor items from Excel file (GitHub)
async function loadVendorItems() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/malmedlej/mile-medical-dashboard/main/tie/data/vendor_items.xlsx');
        
        if (!response.ok) {
            throw new Error(`GitHub fetch failed: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Convert to vendor items format - CLEAN, NO NORMALIZATION
        vendorItems = jsonData.map(row => ({
            nupco_code: String(row['NUPCO Code'] || '').trim(),
            product_name: String(row['Product Name'] || '').trim(),
            pack: String(row['Pack'] || '').trim(),
            supplier: String(row['Supplier'] || '').trim()
        })).filter(item => item.nupco_code);
        
        // BUILD HASH MAP for O(1) exact VLOOKUP-style matching
        vendorHashMap = {};
        vendorItems.forEach(item => {
            const code = item.nupco_code;
            if (!vendorHashMap[code]) {
                vendorHashMap[code] = [];
            }
            vendorHashMap[code].push(item);
        });
        
        console.log(`✅ Loaded ${vendorItems.length} vendor items from GitHub`);
        console.log(`✅ Built hash map with ${Object.keys(vendorHashMap).length} unique NUPCO codes`);
        
        // Log unique suppliers
        const uniqueSuppliers = [...new Set(vendorItems.map(item => item.supplier))];
        console.log(`✅ Suppliers found: ${uniqueSuppliers.join(', ')}`);
        
        showToast(`✅ Loaded ${vendorItems.length} items from vendor catalog`, 'success');
    } catch (error) {
        console.error('❌ Error loading vendor items:', error);
        showToast('⚠️ Could not load vendor catalog from GitHub', 'warning');
        vendorItems = [];
    }
}

// Load price history from JSON
async function loadPriceHistory() {
    try {
        const response = await fetch('data/price_history.json');
        priceHistory = await response.json();
        console.log(`Loaded ${priceHistory.length} price history records`);
    } catch (error) {
        console.error('Error loading price history:', error);
        priceHistory = [];
    }
}

// Setup event listeners
function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadZone = document.getElementById('uploadZone');
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    const saveToArchiveBtn = document.getElementById('saveToArchiveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const notFoundToggle = document.getElementById('notFoundToggle');

    // FIXED: Single file input with button trigger (no double-trigger)
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
        console.log('✅ Upload button listener attached');
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
        console.log('✅ File input change listener attached');
    } else {
        console.error('❌ fileInput element not found');
    }
    
    // Drag and drop
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('border-[#F6B17A]');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('border-[#F6B17A]');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('border-[#F6B17A]');
            const files = e.dataTransfer.files;
            if (files.length > 0 && fileInput) {
                fileInput.files = files;
                handleFileUpload({ target: { files } });
            }
        });
    }

    if (autoSaveToggle) {
        autoSaveToggle.addEventListener('change', (e) => {
            autoSaveEnabled = e.target.checked;
        });
    }

    // FIXED: Save to Archive button handler
    if (saveToArchiveBtn) {
        saveToArchiveBtn.addEventListener('click', async () => {
            saveToArchiveBtn.disabled = true;
            saveToArchiveBtn.innerHTML = '<svg class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Saving...';
            
            await saveToArchive();
            
            saveToArchiveBtn.disabled = false;
            saveToArchiveBtn.innerHTML = '<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>Save to Archive';
        });
        console.log('✅ Save to Archive button listener attached');
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportResults);
    }

    if (notFoundToggle) {
        notFoundToggle.addEventListener('click', toggleNotFound);
    }

    console.log('✅ All event listeners set up');
}

// Extract RFQ ID from filename - KEEP FULL FILENAME WITHOUT EXTENSION
function extractRFQId(filename) {
    // Simply remove the extension and return the full filename
    const nameWithoutExt = filename.replace(/\.(xlsx|xls)$/i, '');
    return nameWithoutExt;
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    console.log('📁 File selected:', file.name);

    const uploadPrompt = document.getElementById('uploadPrompt');
    const uploadingIndicator = document.getElementById('uploadingIndicator');

    if (uploadPrompt) uploadPrompt.classList.add('hidden');
    if (uploadingIndicator) uploadingIndicator.classList.remove('hidden');

    try {
        currentRFQId = extractRFQId(file.name);
        console.log('📋 RFQ ID:', currentRFQId);
        
        const data = await readExcelFile(file);
        console.log('📊 Extracted items:', data.length);
        
        matchItems(data);
        displayResults();
        showToast('✅ File processed successfully', 'success');
    } catch (error) {
        console.error('❌ Error processing file:', error);
        showToast('❌ Error processing file: ' + error.message, 'error');
        if (uploadPrompt) uploadPrompt.classList.remove('hidden');
        if (uploadingIndicator) uploadingIndicator.classList.add('hidden');
    }
}

// Read Excel file using SheetJS
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const items = extractNUPCOCodes(jsonData);
                resolve(items);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

// Extract NUPCO items with all data from Excel
function extractNUPCOCodes(data) {
    const items = [];
    let headerRowIndex = 0;
    let codeColumnIndex = -1;
    let nameColumnIndex = -1;
    let uomColumnIndex = -1;
    let qtyColumnIndex = -1;
    
    // Search for header row
    for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i];
        for (let j = 0; j < row.length; j++) {
            const cell = String(row[j]).toLowerCase();
            
            if (cell.includes('nupco') && (cell.includes('code') || cell.includes('item'))) {
                headerRowIndex = i;
                codeColumnIndex = j;
            }
            if ((cell.includes('product') || cell.includes('item') || cell.includes('description')) && cell.includes('name')) {
                nameColumnIndex = j;
            }
            if (cell.includes('uom') || cell.includes('unit') || cell === 'unit') {
                uomColumnIndex = j;
            }
            if (cell.includes('qty') || cell.includes('quantity') || cell.includes('required')) {
                qtyColumnIndex = j;
            }
        }
        if (codeColumnIndex >= 0) break;
    }
    
    // Default positions if not found
    if (codeColumnIndex === -1) codeColumnIndex = 0;
    if (nameColumnIndex === -1) nameColumnIndex = 1;
    if (uomColumnIndex === -1) uomColumnIndex = 2;
    if (qtyColumnIndex === -1) qtyColumnIndex = 3;
    
    // Extract data
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (row[codeColumnIndex]) {
            const code = String(row[codeColumnIndex]).trim();
            if (code && /\d/.test(code)) {
                items.push({
                    nupco_code: code,
                    rfq_description: row[nameColumnIndex] ? String(row[nameColumnIndex]).trim() : 'N/A',  // RFQ item name
                    product_name: row[nameColumnIndex] ? String(row[nameColumnIndex]).trim() : 'N/A',      // Keep for compatibility
                    uom: row[uomColumnIndex] ? String(row[uomColumnIndex]).trim() : 'N/A',
                    qty: row[qtyColumnIndex] ? String(row[qtyColumnIndex]).trim() : 'N/A'
                });
            }
        }
    }
    
    return items;
}

// EXACT VLOOKUP-STYLE MATCHING - Hash map O(1) lookup
// NO AI, NO SEMANTIC MATCHING - Pure exact NUPCO code match
function matchItems(rfqItems) {
    matchedItems = [];
    notFoundItems = [];
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 MATCHING RFQ ITEMS AGAINST VENDOR CATALOG');
    console.log('='.repeat(80));
    console.log(`RFQ Items: ${rfqItems.length}`);
    console.log(`Vendor Items: ${vendorItems.length}\n`);
    
    rfqItems.forEach((rfqItem, index) => {
        const code = rfqItem.nupco_code;
        
        // EXACT MATCH using hash map (O(1) lookup like VLOOKUP)
        const vendorMatches = vendorHashMap[code] || [];
        
        console.log(`[${index + 1}/${rfqItems.length}] Code: ${code}`);
        console.log(`  → Found ${vendorMatches.length} vendor match(es)`);
        
        if (vendorMatches.length > 0) {
            // Group by vendor and keep only ONE entry per vendor
            const uniqueVendors = {};
            
            vendorMatches.forEach((vendorItem) => {
                const vendor = vendorItem.supplier;
                
                // Only add if we haven't seen this vendor yet for this NUPCO code
                if (!uniqueVendors[vendor]) {
                    uniqueVendors[vendor] = true;
                    
                    console.log(`     ✓ ${vendor} - ${vendorItem.product_name.substring(0, 50)}`);
                    
                    const history = getPriceHistory(code, vendor);
                    
                    matchedItems.push({
                        nupco_code: code,
                        rfq_description: rfqItem.rfq_description,           // RFQ item name (PRIMARY)
                        vendor_product_name: vendorItem.product_name,       // Vendor product name (SECONDARY)
                        product_name: vendorItem.product_name,              // Keep for backward compatibility
                        pack: vendorItem.pack || 'N/A',
                        vendor: vendor,
                        uom: rfqItem.uom,
                        qty: rfqItem.qty,
                        required_qty: rfqItem.qty,                          // Alias for consistency
                        supplier: history ? history.Supplier : vendor,
                        price: history ? history.Price : '',
                        lastPrice: history
                    });
                }
            });
        } else {
            console.log(`     ❌ No match found - adding to unmatched list`);
            notFoundItems.push({
                nupco_code: code,
                product_name: rfqItem.rfq_description,
                uom: rfqItem.uom,
                qty: rfqItem.qty
            });
        }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ MATCHING COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total matched rows: ${matchedItems.length}`);
    console.log(`Total unmatched items: ${notFoundItems.length}`);
    console.log('='.repeat(80) + '\n');
}

// Get price history for a NUPCO code from specific vendor
function getPriceHistory(nupcoCode, vendor = null) {
    let entries = priceHistory.filter(entry => entry.NUPCO_Code === nupcoCode);
    
    if (vendor) {
        const vendorEntries = entries.filter(entry => entry.Supplier === vendor);
        if (vendorEntries.length > 0) {
            entries = vendorEntries;
        }
    }
    
    if (entries.length === 0) return null;
    
    entries.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    return entries[0];
}

// Display results
function displayResults() {
    const rfqIdDisplay = document.getElementById('rfqIdDisplay');
    const rfqInfo = document.getElementById('rfqInfo');
    const uploadZone = document.getElementById('uploadZone');
    
    if (rfqIdDisplay) rfqIdDisplay.textContent = currentRFQId;
    if (rfqInfo) rfqInfo.classList.remove('hidden');
    if (uploadZone) uploadZone.classList.add('hidden');
    
    const total = matchedItems.length + notFoundItems.length;
    const matchRate = total > 0 ? Math.round((matchedItems.length / total) * 100) : 0;
    
    const totalItemsEl = document.getElementById('totalItems');
    const matchedItemsEl = document.getElementById('matchedItems');
    const notFoundItemsEl = document.getElementById('notFoundItems');
    const matchRateEl = document.getElementById('matchRate');
    const statsSection = document.getElementById('statsSection');
    
    if (totalItemsEl) totalItemsEl.textContent = total;
    if (matchedItemsEl) matchedItemsEl.textContent = matchedItems.length;
    if (notFoundItemsEl) notFoundItemsEl.textContent = notFoundItems.length;
    if (matchRateEl) matchRateEl.textContent = matchRate + '%';
    if (statsSection) statsSection.classList.remove('hidden');
    
    displayMatchedItems();
    
    if (notFoundItems.length > 0) {
        displayNotFoundItems();
    }
}

// Display matched items in table
function displayMatchedItems() {
    const tbody = document.getElementById('matchedTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    console.log(`\n📊 Displaying ${matchedItems.length} matched items in table...\n`);
    
    matchedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b border-white/5 hover:bg-white/5 transition-colors';
        
        let historyHtml = '';
        if (item.lastPrice) {
            const date = new Date(item.lastPrice.Date);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            historyHtml = `<p class="text-xs text-gray-500 mt-1">Last: ${item.lastPrice.Price} SAR (${item.lastPrice.Supplier} – ${formattedDate})</p>`;
        }
        
        // FIXED: Show RFQ description as primary, vendor product name as secondary
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };
        
        row.innerHTML = `
            <td class="py-4 px-4 text-sm font-mono text-white">${escapeHtml(item.nupco_code)}</td>
            <td class="py-4 px-4 text-sm text-gray-300">
                <div class="font-medium text-white">${escapeHtml(item.rfq_description || item.product_name)}</div>
                ${item.vendor_product_name && item.rfq_description !== item.vendor_product_name ? 
                    `<div class="text-xs text-gray-500 mt-1">Vendor: ${escapeHtml(item.vendor_product_name)}</div>` : ''}
            </td>
            <td class="py-4 px-4 text-sm text-gray-300">${escapeHtml(item.uom || 'N/A')}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${escapeHtml(item.qty || 'N/A')}</td>
            <td class="py-4 px-4 text-sm text-[#F6B17A] font-semibold">${escapeHtml(item.vendor)}</td>
            <td class="py-4 px-4">
                <span class="status-badge status-submitted">✓ Matched</span>
            </td>
            <td class="py-4 px-4">
                <input type="number" 
                       class="price-input" 
                       data-index="${index}"
                       value="${item.price}"
                       step="0.01"
                       placeholder="0.00">
                ${historyHtml}
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Log first 10 rows for debugging
        if (index < 10) {
            console.log(`Row ${index + 1}: ${item.nupco_code} | ${item.vendor} | ${item.product_name.substring(0, 40)}`);
        }
    });
    
    const matchedSection = document.getElementById('matchedSection');
    if (matchedSection) matchedSection.classList.remove('hidden');
    
    // Add input listeners
    document.querySelectorAll('.price-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            matchedItems[index].price = e.target.value;
            
            if (autoSaveEnabled && e.target.value) {
                saveSinglePrice(index);
            }
        });
    });
}

// Display not found items
function displayNotFoundItems() {
    const notFoundCount = document.getElementById('notFoundCount');
    if (notFoundCount) notFoundCount.textContent = notFoundItems.length;
    
    const list = document.getElementById('notFoundList');
    if (!list) return;
    
    list.innerHTML = '';
    
    notFoundItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bg-red-500/10 border border-red-500/30 rounded-lg p-4';
        card.innerHTML = `
            <div class="space-y-2">
                <p class="text-sm font-semibold text-red-400">${item.nupco_code}</p>
                <p class="text-xs text-gray-300">${item.product_name}</p>
                <div class="flex justify-between text-xs text-gray-400">
                    <span>UOM: ${item.uom}</span>
                    <span>Qty: ${item.qty}</span>
                </div>
                <p class="text-xs text-red-300 font-medium">❌ Not in catalog</p>
            </div>
        `;
        list.appendChild(card);
    });
    
    const notFoundSection = document.getElementById('notFoundSection');
    if (notFoundSection) notFoundSection.classList.remove('hidden');
}

// Toggle not found section
function toggleNotFound() {
    const content = document.getElementById('notFoundContent');
    const chevron = document.getElementById('notFoundChevron');
    
    if (content && chevron) {
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            chevron.classList.add('rotate-180');
        } else {
            content.classList.add('hidden');
            chevron.classList.remove('rotate-180');
        }
    }
}

// Save single price
function saveSinglePrice(index) {
    const item = matchedItems[index];
    
    if (!item.price || !item.supplier) return;
    
    const priceEntry = {
        NUPCO_Code: item.nupco_code,
        RFQ_ID: currentRFQId,
        Supplier: item.supplier,
        Price: parseFloat(item.price),
        Date: new Date().toISOString().split('T')[0]
    };
    
    priceHistory.push(priceEntry);
    console.log('Auto-saved price:', priceEntry);
}

// Save all prices
function savePrices() {
    const newEntries = [];
    
    matchedItems.forEach(item => {
        if (item.price && item.supplier) {
            newEntries.push({
                NUPCO_Code: item.nupco_code,
                RFQ_ID: currentRFQId,
                Supplier: item.supplier,
                Price: parseFloat(item.price),
                Date: new Date().toISOString().split('T')[0]
            });
        }
    });
    
    if (newEntries.length === 0) {
        showToast('⚠️ No prices to save', 'warning');
        return;
    }
    
    priceHistory.push(...newEntries);
    downloadJSON(priceHistory, 'price_history.json');
    showToast(`✅ ${newEntries.length} prices saved`, 'success');
}

// Save RFQ to Archive (SharePoint + localStorage)
async function saveToArchive() {
    try {
        if (!currentRFQId) {
            showToast('❌ No RFQ loaded', 'error');
            return;
        }

        const rfqObject = {
            rfqId: currentRFQId,
            date: new Date().toISOString(),
            matchedItems: matchedItems.map(item => ({
                nupco_code: item.nupco_code,
                rfq_description: item.rfq_description,
                vendor_product_name: item.vendor_product_name,
                product_name: item.product_name,
                uom: item.uom,
                qty: item.qty,
                required_qty: item.required_qty || item.qty,
                vendor: item.vendor,
                supplier: item.supplier,
                price: item.price || '',
                unit_price: item.price || '',
                total_price: ''
            })),
            notFoundItems: notFoundItems,
            matchedCount: matchedItems.length,
            totalCount: matchedItems.length + notFoundItems.length,
            status: 'New'
        };

        console.log('💾 Saving RFQ to archive:', rfqObject);

        // Try to save to SharePoint (if available via storageManager)
        if (window.storageManager) {
            try {
                const result = await window.storageManager.saveRFQ(rfqObject);
                if (result && result.success) {
                    showToast('✅ RFQ saved to SharePoint', 'success');
                    return;
                }
            } catch (sharepointError) {
                console.warn('⚠️ SharePoint save failed, using localStorage:', sharepointError);
            }
        }

        // Fallback: Save to localStorage only
        saveToLocalStorageOnly(rfqObject);
        showToast('💾 RFQ saved locally', 'success');

    } catch (error) {
        console.error('❌ Error saving to archive:', error);
        showToast('❌ Failed to save RFQ: ' + error.message, 'error');
    }
}

// Save to localStorage fallback
function saveToLocalStorageOnly(rfqObject) {
    try {
        const ARCHIVE_STORAGE_KEY = 'tie_rfq_archive';
        const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        let archive = stored ? JSON.parse(stored) : [];

        // Remove existing entry with same RFQ ID
        archive = archive.filter(item => item.rfqId !== rfqObject.rfqId);

        // Add new entry
        archive.unshift(rfqObject);

        // Save back
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archive));
        console.log('✅ Saved to localStorage:', rfqObject.rfqId);
    } catch (error) {
        console.error('❌ localStorage save error:', error);
        throw error;
    }
}

// Export results to Excel
function exportResults() {
    const exportData = matchedItems.map(item => ({
        'NUPCO Code': item.nupco_code,
        'Product Name': item.product_name,
        'UOM': item.uom,
        'Quantity': item.qty,
        'Vendor': item.vendor,
        'Price (SAR)': item.price || '',
        'Status': 'Matched'
    }));
    
    notFoundItems.forEach(item => {
        exportData.push({
            'NUPCO Code': item.nupco_code,
            'Product Name': item.product_name,
            'UOM': item.uom,
            'Quantity': item.qty,
            'Vendor': '-',
            'Price (SAR)': '-',
            'Status': 'Not Found'
        });
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RFQ Results');
    XLSX.writeFile(wb, `RFQ-${currentRFQId}-Results.xlsx`);
    
    showToast('✅ Results exported successfully', 'success');
}

// Download JSON file
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    if (!toast || !toastMessage || !toastIcon) return;
    
    toastMessage.textContent = message;
    
    let iconHTML = '';
    let bgColor = '';
    
    if (type === 'success') {
        bgColor = 'bg-green-500/20';
        iconHTML = '<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
    } else if (type === 'error') {
        bgColor = 'bg-red-500/20';
        iconHTML = '<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
    } else if (type === 'warning') {
        bgColor = 'bg-yellow-500/20';
        iconHTML = '<svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    }
    
    toastIcon.className = `w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`;
    toastIcon.innerHTML = iconHTML;
    
    toast.classList.remove('translate-x-full');
    toast.classList.remove('translate-y-[-200%]');
    toast.classList.add('translate-y-0');
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0');
        toast.classList.add('translate-y-[-200%]');
    }, 3000);
}
