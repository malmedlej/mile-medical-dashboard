/**
 * RFQ Matcher Module - Tender Intelligence Engine
 * Auto-detects columns and matches against permanent vendor list
 * Version: 2.0
 */

// Global variables
let vendorItems = [];
let matchedItems = [];
let notFoundItems = [];
let currentRFQId = '';
let rfqData = [];

// Column header variations
const COLUMN_PATTERNS = {
    code: ['nupco code', 'item code', 'code', 'nupco', 'product code', 'material code'],
    quantity: ['quantity', 'qty', 'rfq qty', 'order quantity', 'req qty'],
    description: ['description', 'product name', 'item name', 'item description', 'product description', 'material description']
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('TIE Matcher v2.0 Initializing...');
    await loadVendorItems();
    setupEventListeners();
});

// Load permanent vendor list
async function loadVendorItems() {
    try {
        const response = await fetch('data/vendor_items.json');
        if (!response.ok) throw new Error('Failed to load vendor items');
        vendorItems = await response.json();
        console.log(`✓ Loaded ${vendorItems.length} vendor items from permanent catalog`);
    } catch (error) {
        console.error('Error loading vendor items:', error);
        showToast('⚠️ Could not load vendor catalog. Please refresh the page.', 'error');
        vendorItems = [];
    }
}

// Setup event listeners
function setupEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadZone = document.getElementById('uploadZone');
    const exportBtn = document.getElementById('exportBtn');
    const savePricesBtn = document.getElementById('savePricesBtn');
    const notFoundToggle = document.getElementById('notFoundToggle');

    // Upload button click
    uploadBtn.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', handleFileUpload);
    
    // Drag and drop handlers
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.add('border-[#F6B17A]', 'bg-[#F6B17A]/5');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('border-[#F6B17A]', 'bg-[#F6B17A]/5');
    });
    
    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadZone.classList.remove('border-[#F6B17A]', 'bg-[#F6B17A]/5');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.match(/\.(xlsx|xls)$/i)) {
            fileInput.files = files;
            await handleFileUpload({ target: { files } });
        } else {
            showToast('⚠️ Please drop an Excel file (.xlsx or .xls)', 'warning');
        }
    });

    // Export button
    exportBtn.addEventListener('click', exportResults);
    
    // Save prices button (disabled for now)
    savePricesBtn.addEventListener('click', () => {
        showToast('💡 Price saving feature coming soon!', 'warning');
    });
    
    // Not found toggle
    notFoundToggle.addEventListener('click', toggleNotFound);
}

// Extract RFQ ID from filename (full name without extension)
function extractRFQId(filename) {
    // Remove file extension
    return filename.replace(/\.(xlsx|xls)$/i, '');
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('⚠️ Please upload an Excel file (.xlsx or .xls)', 'warning');
        return;
    }

    // Show loading state
    document.getElementById('uploadPrompt').classList.add('hidden');
    document.getElementById('uploadingIndicator').classList.remove('hidden');

    try {
        // Extract RFQ ID from full filename
        currentRFQId = extractRFQId(file.name);
        console.log(`Processing RFQ: ${currentRFQId}`);
        
        // Read and parse Excel file
        rfqData = await readExcelFile(file);
        console.log(`Parsed ${rfqData.length} items from RFQ`);
        
        // Match items against vendor catalog
        performMatching();
        
        // Display results
        displayResults();
        
        showToast(`✅ Successfully processed ${rfqData.length} items`, 'success');
        
    } catch (error) {
        console.error('Error processing file:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
        
        // Reset UI
        document.getElementById('uploadPrompt').classList.remove('hidden');
        document.getElementById('uploadingIndicator').classList.add('hidden');
    }
}

// Read Excel file with auto-detection of columns
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to JSON with headers
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                    header: 1,
                    defval: '',
                    blankrows: false 
                });
                
                // Auto-detect columns and parse data
                const parsedData = autoDetectAndParse(jsonData);
                
                if (parsedData.length === 0) {
                    throw new Error('No valid data found in Excel file');
                }
                
                resolve(parsedData);
                
            } catch (error) {
                reject(new Error(`Failed to parse Excel: ${error.message}`));
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Auto-detect columns and parse data
function autoDetectAndParse(rawData) {
    if (rawData.length < 2) {
        throw new Error('Excel file must have at least a header row and one data row');
    }
    
    // Find header row and column indices
    let headerRowIndex = -1;
    let codeColIndex = -1;
    let qtyColIndex = -1;
    let descColIndex = -1;
    
    // Search first 5 rows for headers
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const row = rawData[i];
        
        for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j]).toLowerCase().trim();
            
            // Check for NUPCO Code column
            if (codeColIndex === -1 && COLUMN_PATTERNS.code.some(pattern => cellValue.includes(pattern))) {
                codeColIndex = j;
                headerRowIndex = i;
            }
            
            // Check for Quantity column
            if (qtyColIndex === -1 && COLUMN_PATTERNS.quantity.some(pattern => cellValue.includes(pattern))) {
                qtyColIndex = j;
            }
            
            // Check for Description column
            if (descColIndex === -1 && COLUMN_PATTERNS.description.some(pattern => cellValue.includes(pattern))) {
                descColIndex = j;
            }
        }
        
        // If we found the code column, we have our header row
        if (codeColIndex !== -1) break;
    }
    
    // Fallback: if no header detected, assume first row is header
    if (headerRowIndex === -1) {
        headerRowIndex = 0;
        codeColIndex = 0; // Assume first column is code
    }
    
    console.log(`Header detected at row ${headerRowIndex + 1}`);
    console.log(`Columns - Code: ${codeColIndex}, Qty: ${qtyColIndex}, Desc: ${descColIndex}`);
    
    // Parse data rows
    const parsedItems = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[codeColIndex]) continue;
        
        const code = String(row[codeColIndex]).trim();
        
        // Validate code (must contain at least one digit)
        if (!code || !/\d/.test(code)) continue;
        
        const item = {
            code: code,
            quantity: qtyColIndex !== -1 ? String(row[qtyColIndex] || '').trim() : '',
            description: descColIndex !== -1 ? String(row[descColIndex] || '').trim() : ''
        };
        
        parsedItems.push(item);
    }
    
    return parsedItems;
}

// Perform matching against vendor catalog
function performMatching() {
    matchedItems = [];
    notFoundItems = [];
    
    console.log('Starting matching process...');
    
    rfqData.forEach(rfqItem => {
        const normalizedCode = normalizeCode(rfqItem.code);
        
        // Try to find match in vendor catalog
        const vendorMatch = vendorItems.find(vendor => {
            const vendorCode = normalizeCode(vendor.nupco_code);
            return vendorCode === normalizedCode;
        });
        
        if (vendorMatch) {
            matchedItems.push({
                nupco_code: rfqItem.code,
                product_name: vendorMatch.product_name,
                pack: vendorMatch.pack || 'N/A',
                supplier: '',
                quantity: rfqItem.quantity,
                description: rfqItem.description,
                status: 'Matched'
            });
        } else {
            notFoundItems.push(rfqItem.code);
        }
    });
    
    console.log(`Matching complete: ${matchedItems.length} matched, ${notFoundItems.length} not found`);
}

// Normalize NUPCO code for matching (ignore case, spaces, dashes)
function normalizeCode(code) {
    return String(code)
        .toLowerCase()
        .replace(/[\s\-_]/g, '')
        .trim();
}

// Display results
function displayResults() {
    // Update RFQ ID display
    document.getElementById('rfqIdDisplay').textContent = currentRFQId;
    document.getElementById('rfqInfo').classList.remove('hidden');
    
    // Hide upload zone
    document.getElementById('uploadZone').classList.add('hidden');
    
    // Calculate statistics
    const totalItems = matchedItems.length + notFoundItems.length;
    const matchRate = totalItems > 0 ? Math.round((matchedItems.length / totalItems) * 100) : 0;
    
    // Update KPI counters
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('matchedItems').textContent = matchedItems.length;
    document.getElementById('notFoundItems').textContent = notFoundItems.length;
    document.getElementById('matchRate').textContent = `${matchRate}%`;
    
    // Show statistics section
    document.getElementById('statsSection').classList.remove('hidden');
    
    // Display matched items table
    if (matchedItems.length > 0) {
        displayMatchedTable();
    }
    
    // Display not found items
    if (notFoundItems.length > 0) {
        displayNotFoundItems();
    }
}

// Display matched items in table
function displayMatchedTable() {
    const tbody = document.getElementById('matchedTableBody');
    tbody.innerHTML = '';
    
    matchedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b border-white/5 hover:bg-white/5 transition-colors';
        
        row.innerHTML = `
            <td class="py-4 px-4 text-sm font-mono text-white">${escapeHtml(item.nupco_code)}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${escapeHtml(item.product_name)}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${escapeHtml(item.pack)}</td>
            <td class="py-4 px-4">
                <span class="status-badge status-submitted">✓ Matched</span>
            </td>
            <td class="py-4 px-4">
                <input type="text" 
                       class="supplier-input" 
                       placeholder="Enter supplier"
                       data-index="${index}">
            </td>
            <td class="py-4 px-4">
                <input type="number" 
                       class="price-input" 
                       placeholder="0.00"
                       step="0.01"
                       min="0"
                       data-index="${index}">
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Show matched section
    document.getElementById('matchedSection').classList.remove('hidden');
    
    // Disable save prices button (feature not ready)
    document.getElementById('savePricesBtn').disabled = true;
    document.getElementById('savePricesBtn').classList.add('opacity-50', 'cursor-not-allowed');
}

// Display not found items as chips
function displayNotFoundItems() {
    const list = document.getElementById('notFoundList');
    list.innerHTML = '';
    
    notFoundItems.forEach(code => {
        const chip = document.createElement('div');
        chip.className = 'inline-flex items-center bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2';
        chip.innerHTML = `
            <svg class="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <span class="text-sm font-mono text-red-300">${escapeHtml(code)}</span>
        `;
        list.appendChild(chip);
    });
    
    document.getElementById('notFoundCount').textContent = notFoundItems.length;
    document.getElementById('notFoundSection').classList.remove('hidden');
    
    // Auto-expand if there are few items
    if (notFoundItems.length <= 10) {
        document.getElementById('notFoundContent').classList.remove('hidden');
        document.getElementById('notFoundChevron').classList.add('rotate-180');
    }
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

// Export results to Excel
function exportResults() {
    try {
        // Prepare matched data
        const exportData = matchedItems.map(item => ({
            'NUPCO Code': item.nupco_code,
            'Product Name': item.product_name,
            'Pack': item.pack,
            'Status': item.status,
            'Supplier': item.supplier || '',
            'Price (SAR)': ''
        }));
        
        // Add not found items
        notFoundItems.forEach(code => {
            exportData.push({
                'NUPCO Code': code,
                'Product Name': 'NOT FOUND',
                'Pack': '-',
                'Status': 'Not Found',
                'Supplier': '-',
                'Price (SAR)': '-'
            });
        });
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 15 },  // NUPCO Code
            { wch: 40 },  // Product Name
            { wch: 20 },  // Pack
            { wch: 12 },  // Status
            { wch: 25 },  // Supplier
            { wch: 12 }   // Price
        ];
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Matched Results');
        
        // Generate filename with RFQ ID
        const filename = `${currentRFQId}-Results.xlsx`;
        
        // Download file
        XLSX.writeFile(wb, filename);
        
        showToast(`✅ Results exported: ${filename}`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('❌ Failed to export results', 'error');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    toastMessage.textContent = message;
    
    // Set icon based on type
    let iconHTML = '';
    let bgColor = '';
    
    switch(type) {
        case 'success':
            bgColor = 'bg-green-500/20';
            iconHTML = `<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>`;
            break;
        case 'error':
            bgColor = 'bg-red-500/20';
            iconHTML = `<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>`;
            break;
        case 'warning':
            bgColor = 'bg-yellow-500/20';
            iconHTML = `<svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>`;
            break;
    }
    
    toastIcon.className = `w-10 h-10 rounded-full flex items-center justify-center ${bgColor}`;
    toastIcon.innerHTML = iconHTML;
    
    // Show toast
    toast.classList.remove('translate-x-full');
    
    // Hide after 4 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 4000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
