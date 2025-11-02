/**
 * RFQ Matcher Module - Tender Intelligence Engine
 * Fully matches RFQ Excel files with vendor catalog Excel data
 * Version: 3.0 - Complete Matching System
 */

// Global variables
let vendorItems = [];
let matchedItems = [];
let notFoundItems = [];
let currentRFQId = '';
let rfqData = [];

// Column header variations for flexible parsing
const COLUMN_PATTERNS = {
    code: ['nupco code', 'item code', 'code', 'nupco', 'product code', 'material code'],
    quantity: ['quantity', 'qty', 'rfq qty', 'order quantity', 'req qty', 'required qty', 'required quantity', 'needed qty', 'needed quantity'],
    description: ['description', 'product name', 'item name', 'item description', 'product description', 'material description']
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 TIE Matcher v3.0 - Full Matching System');
    await loadVendorItems();
    setupEventListeners();
});

// Load permanent vendor catalog from Excel
async function loadVendorItems() {
    try {
        console.log('📂 Loading vendor catalog from Excel...');
        
        // Fetch vendor catalog Excel file
        const response = await fetch('data/vendor_items.xlsx');
        if (!response.ok) throw new Error('Failed to load vendor items Excel file');
        
        // Read as array buffer
        const arrayBuffer = await response.arrayBuffer();
        
        // Parse Excel file with SheetJS
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON (array of arrays)
        const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false 
        });
        
        // Parse vendor data (skip header row)
        vendorItems = [];
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Skip empty rows
            if (!row[0]) continue;
            
            vendorItems.push({
                nupco_code: String(row[0] || '').trim(),
                product_name: String(row[1] || '').trim(),
                pack: String(row[2] || '').trim(),
                supplier: String(row[3] || '').trim()
            });
        }
        
        console.log(`✅ Loaded ${vendorItems.length} vendor items from Excel catalog`);
        
        if (vendorItems.length === 0) {
            throw new Error('Vendor catalog is empty');
        }
        
    } catch (error) {
        console.error('❌ Error loading vendor items:', error);
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
    const rfqId = filename.replace(/\.(xlsx|xls)$/i, '');
    console.log(`🔍 RFQ ID Extraction - Original: "${filename}" → Extracted: "${rfqId}"`);
    return rfqId;
}

// Handle RFQ file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📂 File upload started');
    console.log('   Original file.name:', file.name);
    console.log('   File.name type:', typeof file.name);
    console.log('   File.name length:', file.name.length);

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showToast('⚠️ Please upload an Excel file (.xlsx or .xls)', 'warning');
        return;
    }

    // Show loading state
    document.getElementById('uploadPrompt').classList.add('hidden');
    document.getElementById('uploadingIndicator').classList.remove('hidden');

    try {
        // Extract RFQ ID from filename
        currentRFQId = extractRFQId(file.name);
        console.log(`📋 Processing RFQ: ${currentRFQId}`);
        console.log(`   currentRFQId length: ${currentRFQId.length}`);
        
        // TEMPORARY DEBUG ALERT
        alert(`DEBUG:\nOriginal filename: ${file.name}\nExtracted RFQ ID: ${currentRFQId}\nLength: ${currentRFQId.length}`);
        
        // Parse RFQ Excel file
        rfqData = await parseRFQExcel(file);
        console.log(`📊 Parsed ${rfqData.length} items from RFQ`);
        
        // Perform matching against vendor catalog
        performMatching();
        
        // Display results
        displayResults();
        
        showToast(`✅ Successfully matched ${matchedItems.length} of ${rfqData.length} items`, 'success');
        
    } catch (error) {
        console.error('❌ Error processing RFQ file:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
        
        // Reset UI
        document.getElementById('uploadPrompt').classList.remove('hidden');
        document.getElementById('uploadingIndicator').classList.add('hidden');
    }
}

// Parse RFQ Excel file with auto-detection of columns
async function parseRFQExcel(file) {
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
                const parsedData = autoDetectAndParseRFQ(jsonData);
                
                if (parsedData.length === 0) {
                    throw new Error('No valid data found in RFQ Excel file');
                }
                
                resolve(parsedData);
                
            } catch (error) {
                reject(new Error(`Failed to parse RFQ Excel: ${error.message}`));
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read RFQ file'));
        reader.readAsArrayBuffer(file);
    });
}

// Auto-detect columns and parse RFQ data
function autoDetectAndParseRFQ(rawData) {
    if (rawData.length < 2) {
        throw new Error('RFQ Excel file must have at least a header row and one data row');
    }
    
    console.log('\n🔍 === RFQ FILE STRUCTURE ANALYSIS ===');
    console.log(`Total rows in file: ${rawData.length}`);
    console.log('\n📋 First row (potential header):');
    console.log(rawData[0]);
    console.log('\n📋 Second row (first data row):');
    console.log(rawData[1]);
    
    // Find header row and column indices
    let headerRowIndex = -1;
    let codeColIndex = -1;
    let qtyColIndex = -1;
    let descColIndex = -1;
    
    // Search first 5 rows for headers
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const row = rawData[i];
        
        console.log(`\n🔎 Checking row ${i}:`, row);
        
        for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j]).toLowerCase().trim();
            
            // Check for NUPCO Code column
            if (codeColIndex === -1 && COLUMN_PATTERNS.code.some(pattern => cellValue.includes(pattern))) {
                codeColIndex = j;
                headerRowIndex = i;
                console.log(`   ✅ Found NUPCO Code column at index ${j}: "${row[j]}"`);
            }
            
            // Check for Quantity column
            if (qtyColIndex === -1 && COLUMN_PATTERNS.quantity.some(pattern => cellValue.includes(pattern))) {
                qtyColIndex = j;
                console.log(`   ✅ Found Quantity column at index ${j}: "${row[j]}"`);
            }
            
            // Check for Description column
            if (descColIndex === -1 && COLUMN_PATTERNS.description.some(pattern => cellValue.includes(pattern))) {
                descColIndex = j;
                console.log(`   ✅ Found Description column at index ${j}: "${row[j]}"`);
            }
        }
        
        // If we found the code column, we have our header row
        if (codeColIndex !== -1) break;
    }
    
    // Fallback: if no header detected, assume first row is header
    if (headerRowIndex === -1) {
        console.warn('⚠️ No header row detected! Using fallback: assuming row 0 is header and column 0 is code');
        headerRowIndex = 0;
        codeColIndex = 0; // Assume first column is code
    }
    
    console.log(`\n📍 Header detected at row ${headerRowIndex + 1}`);
    console.log(`📋 Columns - Code: ${codeColIndex}, Qty: ${qtyColIndex}, Desc: ${descColIndex}`);
    
    // Parse data rows
    const parsedItems = [];
    console.log(`\n📊 Parsing data rows starting from row ${headerRowIndex + 2}...`);
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Skip empty rows
        if (!row || row.length === 0 || !row[codeColIndex]) continue;
        
        const code = String(row[codeColIndex]).trim();
        
        // Validate code (must contain at least one digit)
        if (!code || !/\d/.test(code)) continue;
        
        const item = {
            code: code,
            quantity: qtyColIndex !== -1 ? String(row[qtyColIndex] || '').trim() : '1',
            description: descColIndex !== -1 ? String(row[descColIndex] || '').trim() : ''
        };
        
        // Log first 3 items in detail
        if (parsedItems.length < 3) {
            console.log(`\n   Item #${parsedItems.length + 1}:`);
            console.log(`      Raw row:`, row);
            console.log(`      Parsed code: "${item.code}"`);
            console.log(`      Quantity: "${item.quantity}"`);
            console.log(`      Description: "${item.description}"`);
        }
        
        parsedItems.push(item);
    }
    
    console.log(`\n✅ Parsed ${parsedItems.length} valid items from RFQ`);
    console.log('='.repeat(50) + '\n');
    
    return parsedItems;
}

// Perform matching between RFQ and vendor catalog
function performMatching() {
    matchedItems = [];
    notFoundItems = [];
    
    console.log('🔍 Starting matching process...');
    console.log(`📊 RFQ Items to match: ${rfqData.length}`);
    console.log(`📦 Vendor catalog items: ${vendorItems.length}`);
    
    // Debug: Show sample vendor codes
    console.log('📋 Sample vendor codes (first 5):');
    vendorItems.slice(0, 5).forEach(v => {
        console.log(`  - Original: "${v.nupco_code}" → Normalized: "${normalizeCode(v.nupco_code)}"`);
    });
    
    // Debug: Show sample RFQ codes
    console.log('📋 Sample RFQ codes (first 5):');
    rfqData.slice(0, 5).forEach(r => {
        console.log(`  - Original: "${r.code}" → Normalized: "${normalizeCode(r.code)}"`);
    });
    
    rfqData.forEach((rfqItem, index) => {
        const normalizedCode = normalizeCode(rfqItem.code);
        
        // Debug first 3 items in detail
        if (index < 3) {
            console.log(`\n🔎 Matching item #${index + 1}: "${rfqItem.code}" (normalized: "${normalizedCode}")`);
        }
        
        // Try to find match in vendor catalog
        const vendorMatch = vendorItems.find(vendor => {
            const vendorCode = normalizeCode(vendor.nupco_code);
            return vendorCode === normalizedCode;
        });
        
        if (vendorMatch) {
            if (index < 3) console.log(`✅ MATCH FOUND: "${vendorMatch.nupco_code}"`);
            matchedItems.push({
                nupco_code: rfqItem.code,
                product_name: vendorMatch.product_name,
                pack: vendorMatch.pack || 'N/A',
                supplier: vendorMatch.supplier || '-',
                required_qty: rfqItem.quantity || '1',
                rfq_description: rfqItem.description,
                status: 'Matched'
            });
        } else {
            if (index < 3) console.log(`❌ NO MATCH for "${rfqItem.code}"`);
            notFoundItems.push({
                code: rfqItem.code,
                quantity: rfqItem.quantity,
                description: rfqItem.description
            });
        }
    });
    
    console.log(`\n✅ Matching complete: ${matchedItems.length} matched, ${notFoundItems.length} not found`);
}

// Normalize NUPCO code for matching (ignore case, spaces, dashes)
function normalizeCode(code) {
    const normalized = String(code)
        .toLowerCase()
        .replace(/[\s\-_]/g, '')
        .trim();
    return normalized;
}

// Display results
function displayResults() {
    // Update RFQ ID display
    console.log('📺 Displaying results...');
    console.log('   currentRFQId to display:', currentRFQId);
    console.log('   currentRFQId length:', currentRFQId.length);
    
    const displayElement = document.getElementById('rfqIdDisplay');
    displayElement.textContent = currentRFQId;
    
    console.log('   Element textContent after set:', displayElement.textContent);
    console.log('   Element textContent length:', displayElement.textContent.length);
    
    document.getElementById('rfqInfo').classList.remove('hidden');
    
    // Hide upload zone
    document.getElementById('uploadZone').classList.add('hidden');
    
    // Calculate statistics
    const totalItems = matchedItems.length + notFoundItems.length;
    const matchRate = totalItems > 0 ? Math.round((matchedItems.length / totalItems) * 100) : 0;
    
    // Update KPI counters with animation
    animateCounter('totalItems', totalItems);
    animateCounter('matchedItems', matchedItems.length);
    animateCounter('notFoundItems', notFoundItems.length);
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

// Animate counter (count up effect)
function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    const duration = 1000; // 1 second
    const steps = 20;
    const increment = targetValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
            element.textContent = targetValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, duration / steps);
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
            <td class="py-4 px-4 text-sm text-gray-300">
                <div class="font-medium">${escapeHtml(item.product_name)}</div>
                ${item.rfq_description ? `<div class="text-xs text-gray-500 mt-1">${escapeHtml(item.rfq_description)}</div>` : ''}
            </td>
            <td class="py-4 px-4 text-sm text-gray-300">${escapeHtml(item.pack)}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${escapeHtml(item.supplier)}</td>
            <td class="py-4 px-4 text-sm font-semibold text-[#F6B17A]">${escapeHtml(item.required_qty)}</td>
            <td class="py-4 px-4">
                <span class="status-badge status-submitted">✓ Matched</span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Show matched section
    document.getElementById('matchedSection').classList.remove('hidden');
    
    // Disable save prices button (feature not ready)
    const savePricesBtn = document.getElementById('savePricesBtn');
    savePricesBtn.disabled = true;
    savePricesBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

// Display not found items as chips
function displayNotFoundItems() {
    const list = document.getElementById('notFoundList');
    list.innerHTML = '';
    
    notFoundItems.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-2';
        chip.innerHTML = `
            <div class="flex items-start space-x-2">
                <svg class="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <div class="flex-1">
                    <div class="text-sm font-mono text-red-300 font-semibold">${escapeHtml(item.code)}</div>
                    ${item.quantity ? `<div class="text-xs text-red-400 mt-1">Qty: ${escapeHtml(item.quantity)}</div>` : ''}
                    ${item.description ? `<div class="text-xs text-gray-400 mt-1">${escapeHtml(item.description)}</div>` : ''}
                </div>
            </div>
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
            'Supplier': item.supplier,
            'Required Qty': item.required_qty,
            'Status': item.status
        }));
        
        // Add not found items
        notFoundItems.forEach(item => {
            exportData.push({
                'NUPCO Code': item.code,
                'Product Name': 'NOT FOUND IN CATALOG',
                'Pack': '-',
                'Supplier': '-',
                'Required Qty': item.quantity || '1',
                'Status': 'Not Found'
            });
        });
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 15 },  // NUPCO Code
            { wch: 45 },  // Product Name
            { wch: 20 },  // Pack
            { wch: 25 },  // Supplier
            { wch: 12 },  // Required Qty
            { wch: 12 }   // Status
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
        console.error('❌ Export error:', error);
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
