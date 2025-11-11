// Global variables
let vendorItems = [];
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
        // Load from GitHub directly (private repo)
        // Note: For private repos, you may need to add authentication
        const response = await fetch('https://raw.githubusercontent.com/malmedlej/mile-medical-dashboard/main/tie/data/vendor_items.xlsx', {
            // If repository is private, uncomment and add your GitHub token:
            // headers: {
            //     'Authorization': 'token YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'
            // }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub fetch failed: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON (skip header row)
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Convert to vendor items format
        vendorItems = jsonData.map(row => ({
            nupco_code: String(row['NUPCO Code'] || row['nupco_code'] || '').trim(),
            product_name: String(row['Product Name'] || row['product_name'] || '').trim(),
            pack: String(row['Pack'] || row['pack'] || row['UOM'] || row['uom'] || 'N/A').trim(),
            supplier: String(row['Supplier'] || row['supplier'] || row['Vendor'] || row['vendor'] || 'Unknown').trim(),
            uom: String(row['Pack'] || row['UOM'] || row['uom'] || 'N/A').trim()
        })).filter(item => item.nupco_code && item.nupco_code !== '#N/A');
        
        console.log(`Loaded ${vendorItems.length} vendor items from GitHub`);
        showToast(`✅ Loaded ${vendorItems.length} items from vendor catalog`, 'success');
    } catch (error) {
        console.error('Error loading vendor items:', error);
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
        // Initialize with empty array if file doesn't exist
        priceHistory = [];
    }
}

// Setup event listeners
function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadZone = document.getElementById('uploadZone');
    const autoSaveToggle = document.getElementById('autoSaveToggle');
    const savePricesBtn = document.getElementById('savePricesBtn');
    const exportBtn = document.getElementById('exportBtn');
    const notFoundToggle = document.getElementById('notFoundToggle');

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    
    // Drag and drop
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
        if (files.length > 0) {
            fileInput.files = files;
            handleFileUpload({ target: { files } });
        }
    });

    autoSaveToggle.addEventListener('change', (e) => {
        autoSaveEnabled = e.target.checked;
    });

    savePricesBtn.addEventListener('click', savePrices);
    exportBtn.addEventListener('click', exportResults);
    notFoundToggle.addEventListener('click', toggleNotFound);
}

// Extract RFQ ID from filename
function extractRFQId(filename) {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.(xlsx|xls)$/i, '');
    
    // Try different patterns
    // Pattern 1: NUPCO-1420 or NUPCO_1420
    let match = nameWithoutExt.match(/NUPCO[-_]?(\d+)/i);
    if (match) return match[1];
    
    // Pattern 2: RFQ-1420 or RFQ_1420
    match = nameWithoutExt.match(/RFQ[-_]?(\d+)/i);
    if (match) return match[1];
    
    // Pattern 3: Just numbers
    match = nameWithoutExt.match(/(\d+)/);
    if (match) return match[1];
    
    // Default: use timestamp
    return Date.now().toString().slice(-6);
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Show loading indicator
    document.getElementById('uploadPrompt').classList.add('hidden');
    document.getElementById('uploadingIndicator').classList.remove('hidden');

    try {
        // Extract RFQ ID from filename
        currentRFQId = extractRFQId(file.name);
        
        // Read Excel file
        const data = await readExcelFile(file);
        
        // Match items
        matchItems(data);
        
        // Display results
        displayResults();
        
        // Show success message
        showToast('✅ File processed successfully', 'success');
        
    } catch (error) {
        console.error('Error processing file:', error);
        showToast('❌ Error processing file: ' + error.message, 'error');
        
        // Reset upload area
        document.getElementById('uploadPrompt').classList.remove('hidden');
        document.getElementById('uploadingIndicator').classList.add('hidden');
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
                
                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // Extract NUPCO codes (looking for columns that might contain codes)
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
    
    // Find header row
    let headerRowIndex = 0;
    let headers = [];
    let codeColumnIndex = -1;
    let nameColumnIndex = -1;
    let uomColumnIndex = -1;
    let qtyColumnIndex = -1;
    
    // Search for header row and identify columns
    for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i];
        for (let j = 0; j < row.length; j++) {
            const cell = String(row[j]).toLowerCase();
            
            // NUPCO Code column
            if (cell.includes('nupco') && (cell.includes('code') || cell.includes('item'))) {
                headerRowIndex = i;
                codeColumnIndex = j;
            }
            // Product Name column
            if ((cell.includes('product') || cell.includes('item') || cell.includes('description')) && cell.includes('name')) {
                nameColumnIndex = j;
            }
            // UOM column
            if (cell.includes('uom') || cell.includes('unit') || cell === 'unit') {
                uomColumnIndex = j;
            }
            // Quantity column
            if (cell.includes('qty') || cell.includes('quantity') || cell.includes('required')) {
                qtyColumnIndex = j;
            }
        }
        if (codeColumnIndex >= 0) {
            headers = data[i];
            break;
        }
    }
    
    // If no specific columns found, use default positions
    if (codeColumnIndex === -1) codeColumnIndex = 0;
    if (nameColumnIndex === -1) nameColumnIndex = 1;
    if (uomColumnIndex === -1) uomColumnIndex = 2;
    if (qtyColumnIndex === -1) qtyColumnIndex = 3;
    
    // Extract all data from rows
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (row[codeColumnIndex]) {
            const code = String(row[codeColumnIndex]).trim();
            if (code && /\d/.test(code)) {
                items.push({
                    nupco_code: code,
                    product_name: row[nameColumnIndex] ? String(row[nameColumnIndex]).trim() : 'N/A',
                    uom: row[uomColumnIndex] ? String(row[uomColumnIndex]).trim() : 'N/A',
                    qty: row[qtyColumnIndex] ? String(row[qtyColumnIndex]).trim() : 'N/A'
                });
            }
        }
    }
    
    return items;
}

// Match items against vendor catalog - SHOW ALL VENDORS
function matchItems(rfqItems) {
    matchedItems = [];
    notFoundItems = [];
    
    rfqItems.forEach(rfqItem => {
        const code = rfqItem.nupco_code;
        
        // Find ALL matching vendor items (not just first one)
        const vendorMatches = vendorItems.filter(item => 
            item.nupco_code === code || 
            item.nupco_code === code.replace(/^0+/, '') || 
            code === item.nupco_code.replace(/^0+/, '')
        );
        
        // DEBUG: Log matches for first few items
        if (matchedItems.length < 5) {
            console.log(`Code ${code}: Found ${vendorMatches.length} vendor(s)`, vendorMatches.map(v => v.vendor));
        }
        
        if (vendorMatches.length > 0) {
            // Create a row for EACH vendor
            vendorMatches.forEach(vendorItem => {
                // Get price history for this item from this vendor
                const history = getPriceHistory(code, vendorItem.supplier || vendorItem.vendor);
                
                matchedItems.push({
                    nupco_code: code,
                    product_name: vendorItem.product_name,
                    pack: vendorItem.pack || vendorItem.uom || 'N/A',
                    vendor: vendorItem.supplier || vendorItem.vendor || 'Unknown',
                    uom: rfqItem.uom,
                    qty: rfqItem.qty,
                    supplier: history ? history.Supplier : (vendorItem.supplier || vendorItem.vendor || ''),
                    price: history ? history.Price : '',
                    lastPrice: history
                });
            });
        } else {
            // Keep all original RFQ data for not found items
            notFoundItems.push({
                nupco_code: code,
                product_name: rfqItem.product_name,
                uom: rfqItem.uom,
                qty: rfqItem.qty
            });
        }
    });
}

// Get price history for a NUPCO code from specific vendor
function getPriceHistory(nupcoCode, vendor = null) {
    // Find entries for this code
    let entries = priceHistory.filter(entry => entry.NUPCO_Code === nupcoCode);
    
    // If vendor specified, filter by vendor
    if (vendor) {
        const vendorEntries = entries.filter(entry => entry.Supplier === vendor);
        if (vendorEntries.length > 0) {
            entries = vendorEntries;
        }
    }
    
    if (entries.length === 0) return null;
    
    // Sort by date (most recent first)
    entries.sort((a, b) => new Date(b.Date) - new Date(a.Date));
    return entries[0];
}

// Display results
function displayResults() {
    // Update RFQ ID display
    document.getElementById('rfqIdDisplay').textContent = currentRFQId;
    document.getElementById('rfqInfo').classList.remove('hidden');
    
    // Hide upload area
    document.getElementById('uploadZone').classList.add('hidden');
    
    // Show statistics
    const total = matchedItems.length + notFoundItems.length;
    const matchRate = total > 0 ? Math.round((matchedItems.length / total) * 100) : 0;
    
    document.getElementById('totalItems').textContent = total;
    document.getElementById('matchedItems').textContent = matchedItems.length;
    document.getElementById('notFoundItems').textContent = notFoundItems.length;
    document.getElementById('matchRate').textContent = matchRate + '%';
    document.getElementById('statsSection').classList.remove('hidden');
    
    // Display matched items table
    displayMatchedItems();
    
    // Display not found items
    if (notFoundItems.length > 0) {
        displayNotFoundItems();
    }
}

// Display matched items in table
function displayMatchedItems() {
    const tbody = document.getElementById('matchedTableBody');
    tbody.innerHTML = '';
    
    matchedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b border-white/5 hover:bg-white/5 transition-colors';
        
        // Build history info HTML
        let historyHtml = '';
        if (item.lastPrice) {
            const date = new Date(item.lastPrice.Date);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            historyHtml = `<p class="text-xs text-gray-500 mt-1">Last: ${item.lastPrice.Price} SAR (${item.lastPrice.Supplier} – ${formattedDate})</p>`;
        }
        
        row.innerHTML = `
            <td class="py-4 px-4 text-sm font-medium text-white">${item.nupco_code}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${item.product_name}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${item.uom || 'N/A'}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${item.qty || 'N/A'}</td>
            <td class="py-4 px-4 text-sm text-[#F6B17A] font-semibold">${item.vendor}</td>
            <td class="py-4 px-4">
                <span class="status-badge status-submitted">✓ Found</span>
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
    });
    
    // Show section
    document.getElementById('matchedSection').classList.remove('hidden');
    
    // Add input listeners for auto-save
    document.querySelectorAll('.price-input, .supplier-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            const priceInput = document.querySelector(`.price-input[data-index="${index}"]`);
            const supplierInput = document.querySelector(`.supplier-input[data-index="${index}"]`);
            
            matchedItems[index].price = priceInput.value;
            matchedItems[index].supplier = supplierInput.value;
            
            // Auto-save if enabled and both fields are filled
            if (autoSaveEnabled && priceInput.value && supplierInput.value) {
                saveSinglePrice(index);
            }
        });
    });
}

// Display not found items with all RFQ data
function displayNotFoundItems() {
    document.getElementById('notFoundCount').textContent = notFoundItems.length;
    
    const list = document.getElementById('notFoundList');
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
    
    document.getElementById('notFoundSection').classList.remove('hidden');
}

// Toggle not found section
function toggleNotFound() {
    const content = document.getElementById('notFoundContent');
    const chevron = document.getElementById('notFoundChevron');
    
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        chevron.classList.add('rotate-180');
    } else {
        content.classList.add('hidden');
        chevron.classList.remove('rotate-180');
    }
}

// Save single price (for auto-save)
function saveSinglePrice(index) {
    const item = matchedItems[index];
    
    if (!item.price || !item.supplier) return;
    
    // Create price entry
    const priceEntry = {
        NUPCO_Code: item.nupco_code,
        RFQ_ID: currentRFQId,
        Supplier: item.supplier,
        Price: parseFloat(item.price),
        Date: new Date().toISOString().split('T')[0]
    };
    
    // Add to history (in-memory)
    priceHistory.push(priceEntry);
    
    // In a real application, this would save to backend
    // For now, we'll show it in console and prepare for download
    console.log('Auto-saved price:', priceEntry);
}

// Save all prices
function savePrices() {
    const newEntries = [];
    
    matchedItems.forEach(item => {
        if (item.price && item.supplier) {
            const priceEntry = {
                NUPCO_Code: item.nupco_code,
                RFQ_ID: currentRFQId,
                Supplier: item.supplier,
                Price: parseFloat(item.price),
                Date: new Date().toISOString().split('T')[0]
            };
            
            newEntries.push(priceEntry);
        }
    });
    
    if (newEntries.length === 0) {
        showToast('⚠️ No prices to save', 'warning');
        return;
    }
    
    // Add to history
    priceHistory.push(...newEntries);
    
    // Download updated price history
    downloadJSON(priceHistory, 'price_history.json');
    
    showToast(`✅ ${newEntries.length} prices saved to historical memory`, 'success');
}

// Export results to Excel
function exportResults() {
    // Prepare data for export
    const exportData = matchedItems.map(item => ({
        'NUPCO Code': item.nupco_code,
        'Product Name': item.product_name,
        'Pack': item.pack,
        'Supplier': item.supplier || '',
        'Price (SAR)': item.price || '',
        'Status': 'Matched'
    }));
    
    // Add not found items
    notFoundItems.forEach(code => {
        exportData.push({
            'NUPCO Code': code,
            'Product Name': 'NOT FOUND',
            'Pack': '-',
            'Supplier': '-',
            'Price (SAR)': '-',
            'Status': 'Not Found'
        });
    });
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RFQ Results');
    
    // Download
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
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon and color based on type
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
    
    // Show toast
    toast.classList.remove('translate-x-full');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 3000);
}
