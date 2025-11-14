/**
 * RFQ Archive Module - Tender Intelligence Engine
 * Manages archived RFQs with status tracking and price updates
 * Version: 1.0
 */

// Storage key for archived RFQs
const ARCHIVE_STORAGE_KEY = 'tie_rfq_archive';

// Global state
let archivedRFQs = [];
let currentRFQ = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🗄️ TIE Archive v1.0 - RFQ Archive System (SharePoint Edition)');
    
    await loadArchive();
    setupEventListeners();
    updateStatistics();
    renderArchiveTable();
    setupComingSoonLinks();
    
    // Show SharePoint status
    if (window.storageManager) {
        const isAvailable = await window.storageManager.isSharePointAvailable();
        if (isAvailable) {
            console.log('✅ SharePoint integration: Active');
        } else {
            console.log('⚠️ SharePoint integration: Unavailable (using local storage)');
        }
    }
});

// Setup coming soon link handlers
function setupComingSoonLinks() {
    const comingSoonLinks = document.querySelectorAll('.nav-item.opacity-50');
    comingSoonLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showComingSoonToast();
        });
    });
}

// Show coming soon as toast
function showComingSoonToast() {
    showToast('🚧 This feature is coming soon!', 'warning');
}

// Load archived RFQs from SharePoint (with localStorage fallback)
async function loadArchive() {
    try {
        // Try loading from SharePoint first
        if (window.storageManager) {
            console.log('📂 Loading RFQs from SharePoint...');
            
            const rfqs = await window.storageManager.loadRFQs();
            
            // Transform SharePoint format to legacy format for compatibility
            archivedRFQs = rfqs.map(rfq => ({
                rfqId: rfq.rfqId || rfq.Title,
                date: rfq.date || rfq.RFQDate,
                matchedItems: rfq.matchedItems || [],
                matchedCount: rfq.matchedCount || rfq.MatchedCount,
                totalCount: rfq.totalCount || rfq.TotalCount,
                status: rfq.status || rfq.Status || 'New',
                sharePointId: rfq.id || rfq.Id,
                synced: true
            }));
            
            console.log(`✅ Loaded ${archivedRFQs.length} RFQs from SharePoint`);
            
        } else {
            // Fallback to localStorage
            console.log('⚠️ SharePoint client not available, loading from localStorage');
            loadArchiveFromLocalStorage();
        }
        
    } catch (error) {
        console.error('❌ Error loading from SharePoint:', error);
        console.log('⚠️ Falling back to localStorage');
        loadArchiveFromLocalStorage();
    }
}

// Fallback: Load from localStorage only
function loadArchiveFromLocalStorage() {
    try {
        const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        if (stored) {
            archivedRFQs = JSON.parse(stored);
            console.log(`📦 Loaded ${archivedRFQs.length} archived RFQs from localStorage`);
        } else {
            archivedRFQs = [];
            console.log('📦 No archived RFQs found in localStorage');
        }
    } catch (error) {
        console.error('❌ Error loading from localStorage:', error);
        archivedRFQs = [];
        showToast('⚠️ Error loading archive', 'error');
    }
}

// Save archive to localStorage
function saveArchive() {
    try {
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archivedRFQs));
        console.log('💾 Archive saved successfully');
        return true;
    } catch (error) {
        console.error('❌ Error saving archive:', error);
        showToast('❌ Error saving archive', 'error');
        return false;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(() => {
        renderArchiveTable();
    }, 300));

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', renderArchiveTable);

    // Sort filter
    const sortFilter = document.getElementById('sortFilter');
    sortFilter.addEventListener('change', renderArchiveTable);

    // Clear archive button
    const clearArchiveBtn = document.getElementById('clearArchiveBtn');
    clearArchiveBtn.addEventListener('click', clearArchive);

    // Modal close button
    const closeModalBtn = document.getElementById('closeModalBtn');
    closeModalBtn.addEventListener('click', closeModal);

    // Close modal on backdrop click
    const viewModal = document.getElementById('viewModal');
    viewModal.addEventListener('click', (e) => {
        if (e.target === viewModal) {
            closeModal();
        }
    });

    // Update status button
    const updateStatusBtn = document.getElementById('updateStatusBtn');
    updateStatusBtn.addEventListener('click', showStatusUpdateDialog);

    // Export modal button
    const exportModalBtn = document.getElementById('exportModalBtn');
    exportModalBtn.addEventListener('click', exportCurrentRFQ);
}

// Update statistics
function updateStatistics() {
    const totalRFQs = archivedRFQs.length;
    const pendingRFQs = archivedRFQs.filter(rfq => rfq.status === 'Pending Quotes').length;
    const quotedRFQs = archivedRFQs.filter(rfq => rfq.status === 'Quoted').length;
    const totalItems = archivedRFQs.reduce((sum, rfq) => sum + rfq.matchedCount, 0);

    document.getElementById('totalRFQs').textContent = totalRFQs;
    document.getElementById('pendingRFQs').textContent = pendingRFQs;
    document.getElementById('quotedRFQs').textContent = quotedRFQs;
    document.getElementById('totalMatchedItems').textContent = totalItems;
}

// Render archive table with filters
function renderArchiveTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    // Filter RFQs
    let filteredRFQs = archivedRFQs.filter(rfq => {
        const matchesSearch = rfq.rfqId.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Sort RFQs
    filteredRFQs.sort((a, b) => {
        switch (sortFilter) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'items-desc':
                return b.matchedCount - a.matchedCount;
            case 'items-asc':
                return a.matchedCount - b.matchedCount;
            default:
                return 0;
        }
    });

    // Update count
    document.getElementById('rfqCount').textContent = `${filteredRFQs.length} RFQs`;

    // Show empty state or table
    const emptyState = document.getElementById('emptyState');
    const archiveTable = document.getElementById('archiveTable');
    const tbody = document.getElementById('archiveTableBody');

    if (filteredRFQs.length === 0) {
        emptyState.classList.remove('hidden');
        archiveTable.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    archiveTable.classList.remove('hidden');
    tbody.innerHTML = '';

    // Render rows
    filteredRFQs.forEach((rfq, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b border-white/5 hover:bg-white/5 transition-colors';

        const matchRate = Math.round((rfq.matchedCount / rfq.totalCount) * 100) || 0;
        const statusClass = getStatusClass(rfq.status);

        row.innerHTML = `
            <td class="py-4 px-4 text-sm font-mono text-white">${escapeHtml(rfq.rfqId)}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${formatDate(rfq.date)}</td>
            <td class="py-4 px-4 text-sm font-semibold text-[#F6B17A]">${rfq.matchedCount}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${rfq.totalCount}</td>
            <td class="py-4 px-4 text-sm text-gray-300">${matchRate}%</td>
            <td class="py-4 px-4">
                <span class="status-badge ${statusClass}">${rfq.status}</span>
            </td>
            <td class="py-4 px-4">
                <div class="flex space-x-2">
                    <button onclick="viewRFQ(${index})" class="text-[#F6B17A] hover:text-[#f49347] transition-colors" title="View Details">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                    ${rfq.fileUrl ? `
                    <button onclick="downloadRFQFile(${index})" class="text-blue-400 hover:text-blue-300 transition-colors" title="Download Original File">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </button>
                    ` : ''}
                    <button onclick="deleteRFQ(${index})" class="text-red-400 hover:text-red-300 transition-colors" title="Delete RFQ">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// View RFQ details in modal
function viewRFQ(index) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    // Get filtered RFQs (same as renderArchiveTable)
    let filteredRFQs = archivedRFQs.filter(rfq => {
        const matchesSearch = rfq.rfqId.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    filteredRFQs.sort((a, b) => {
        switch (sortFilter) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'items-desc':
                return b.matchedCount - a.matchedCount;
            case 'items-asc':
                return a.matchedCount - b.matchedCount;
            default:
                return 0;
        }
    });

    currentRFQ = filteredRFQs[index];
    
    if (!currentRFQ) {
        showToast('❌ RFQ not found', 'error');
        return;
    }

    // Update modal content
    document.getElementById('modalRFQId').textContent = currentRFQ.rfqId;
    document.getElementById('modalDate').textContent = formatDate(currentRFQ.date);
    
    const statusBadge = document.getElementById('modalStatus');
    statusBadge.textContent = currentRFQ.status;
    statusBadge.className = 'status-badge ' + getStatusClass(currentRFQ.status);
    
    const matchRate = Math.round((currentRFQ.matchedCount / currentRFQ.totalCount) * 100) || 0;
    document.getElementById('modalMatchRate').textContent = `${matchRate}% (${currentRFQ.matchedCount}/${currentRFQ.totalCount})`;
    
    // Show file info if available
    const modalHeader = document.querySelector('#rfqModal .glass-card > div:first-child');
    const existingFileInfo = modalHeader.querySelector('.file-info');
    if (existingFileInfo) {
        existingFileInfo.remove();
    }
    
    if (currentRFQ.fileUrl) {
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info flex items-center space-x-2 text-sm text-gray-400 mt-2';
        fileInfo.innerHTML = `
            <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span>Original file: ${escapeHtml(currentRFQ.originalFileName || currentRFQ.fileName || 'Available')}</span>
            <button onclick="window.open('${currentRFQ.fileUrl}', '_blank')" class="text-blue-400 hover:text-blue-300 underline">
                Download
            </button>
        `;
        modalHeader.appendChild(fileInfo);
    }

    // Render matched items
    const modalItemsBody = document.getElementById('modalItemsBody');
    modalItemsBody.innerHTML = '';

    currentRFQ.matchedItems.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'border-b border-white/5';
        
        row.innerHTML = `
            <td class="py-3 px-3 text-xs font-mono text-white">${escapeHtml(item.nupco_code)}</td>
            <td class="py-3 px-3 text-xs text-gray-300">
                <div class="font-medium">${escapeHtml(item.product_name)}</div>
            </td>
            <td class="py-3 px-3 text-xs text-gray-300">${escapeHtml(item.uom)}</td>
            <td class="py-3 px-3 text-xs text-gray-300">${escapeHtml(item.supplier)}</td>
            <td class="py-3 px-3 text-xs text-gray-300">${escapeHtml(item.required_qty)}</td>
            <td class="py-3 px-3 text-xs">
                <input type="number" 
                       class="price-input w-24 px-2 py-1 text-xs" 
                       placeholder="Price"
                       value="${item.price || ''}"
                       data-code="${escapeHtml(item.nupco_code)}"
                       onchange="updateItemPrice(this)">
            </td>
        `;

        modalItemsBody.appendChild(row);
    });

    // Show modal
    document.getElementById('viewModal').classList.remove('hidden');
}

// Update item price
function updateItemPrice(input) {
    const code = input.dataset.code;
    const price = input.value;

    if (!currentRFQ) return;

    // Find and update item
    const item = currentRFQ.matchedItems.find(i => i.nupco_code === code);
    if (item) {
        item.price = price;
        
        // Update in archive
        const rfqIndex = archivedRFQs.findIndex(r => r.rfqId === currentRFQ.rfqId);
        if (rfqIndex !== -1) {
            archivedRFQs[rfqIndex] = currentRFQ;
            saveArchive();
            showToast('✅ Price updated', 'success');
        }
    }
}

// Close modal
function closeModal() {
    document.getElementById('viewModal').classList.add('hidden');
    currentRFQ = null;
}

// Show status update dialog
function showStatusUpdateDialog() {
    if (!currentRFQ) return;

    const modal = document.getElementById('statusModal');
    const currentStatusDisplay = document.getElementById('currentStatusDisplay');
    const statusOptions = document.querySelectorAll('.status-option');
    const cancelBtn = document.getElementById('statusCancelBtn');
    const closeBtn = document.getElementById('statusCloseBtn');

    currentStatusDisplay.textContent = currentRFQ.status;
    modal.classList.remove('hidden');

    const handleStatusSelect = (e) => {
        const button = e.target.closest('.status-option');
        if (!button) return;

        const newStatus = button.dataset.status;
        currentRFQ.status = newStatus;
        
        // Update in archive
        const rfqIndex = archivedRFQs.findIndex(r => r.rfqId === currentRFQ.rfqId);
        if (rfqIndex !== -1) {
            archivedRFQs[rfqIndex] = currentRFQ;
            saveArchive();
            
            // Update modal display
            const statusBadge = document.getElementById('modalStatus');
            statusBadge.textContent = newStatus;
            statusBadge.className = 'status-badge ' + getStatusClass(newStatus);
            
            // Refresh table
            updateStatistics();
            renderArchiveTable();
            
            showToast('✅ Status updated successfully', 'success');
            modal.classList.add('hidden');
        }
        
        cleanup();
    };

    const handleClose = () => {
        modal.classList.add('hidden');
        cleanup();
    };

    const cleanup = () => {
        statusOptions.forEach(option => {
            option.removeEventListener('click', handleStatusSelect);
        });
        cancelBtn.removeEventListener('click', handleClose);
        closeBtn.removeEventListener('click', handleClose);
    };

    statusOptions.forEach(option => {
        option.addEventListener('click', handleStatusSelect);
    });
    cancelBtn.addEventListener('click', handleClose);
    closeBtn.addEventListener('click', handleClose);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            handleClose();
        }
    });
}

// Export current RFQ
function exportCurrentRFQ() {
    if (!currentRFQ) return;

    try {
        const exportData = currentRFQ.matchedItems.map(item => ({
            'NUPCO Code': item.nupco_code,
            'Product Name': item.product_name,
            'UOM': item.uom,
            'Supplier': item.supplier,
            'Required Qty': item.required_qty,
            'Price': item.price || '',
            'Total': item.price ? (parseFloat(item.price) * parseFloat(item.required_qty || 1)).toFixed(2) : ''
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 15 },  // NUPCO Code
            { wch: 45 },  // Product Name
            { wch: 15 },  // UOM
            { wch: 25 },  // Supplier
            { wch: 12 },  // Required Qty
            { wch: 12 },  // Price
            { wch: 12 }   // Total
        ];

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Quote');

        // Generate filename
        const filename = `${currentRFQ.rfqId}-Quote.xlsx`;

        // Download file
        XLSX.writeFile(wb, filename);

        showToast(`✅ Exported: ${filename}`, 'success');

    } catch (error) {
        console.error('❌ Export error:', error);
        showToast('❌ Failed to export', 'error');
    }
}

// Delete RFQ
async function deleteRFQ(index) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    // Get filtered RFQs (same as renderArchiveTable)
    let filteredRFQs = archivedRFQs.filter(rfq => {
        const matchesSearch = rfq.rfqId.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    filteredRFQs.sort((a, b) => {
        switch (sortFilter) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'items-desc':
                return b.matchedCount - a.matchedCount;
            case 'items-asc':
                return a.matchedCount - b.matchedCount;
            default:
                return 0;
        }
    });

    const rfqToDelete = filteredRFQs[index];
    
    if (!rfqToDelete) return;

    const confirmed = await showConfirm(
        `Delete RFQ "${rfqToDelete.rfqId}"?`,
        'This action cannot be undone.'
    );

    if (confirmed) {
        // Find index in original array
        const originalIndex = archivedRFQs.findIndex(r => r.rfqId === rfqToDelete.rfqId);
        
        if (originalIndex !== -1) {
            archivedRFQs.splice(originalIndex, 1);
            saveArchive();
            updateStatistics();
            renderArchiveTable();
            showToast('✅ RFQ deleted successfully', 'success');
        }
    }
}

// Clear entire archive
async function clearArchive() {
    const confirmed1 = await showConfirm(
        'Clear entire archive?',
        'This will delete ALL archived RFQs and cannot be undone.'
    );
    
    if (confirmed1) {
        const confirmed2 = await showConfirm(
            'Are you absolutely sure?',
            'This action is permanent and cannot be reversed!'
        );
        
        if (confirmed2) {
            archivedRFQs = [];
            saveArchive();
            updateStatistics();
            renderArchiveTable();
            showToast('✅ Archive cleared', 'success');
        }
    }
}

// Get status badge class
function getStatusClass(status) {
    switch (status) {
        case 'New':
            return 'status-matching';
        case 'Pending Quotes':
            return 'status-matching';
        case 'Quoted':
            return 'status-submitted';
        case 'Submitted':
            return 'status-submitted';
        default:
            return 'status-matching';
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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

// Custom confirmation dialog
function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const closeBtn = document.getElementById('confirmCloseBtn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.remove('hidden');

        const handleOk = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            closeBtn.removeEventListener('click', handleCancel);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        closeBtn.addEventListener('click', handleCancel);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
    });
}

// Export function to be called from matcher.js
window.archiveRFQ = function(rfqData) {
    const newRFQ = {
        rfqId: rfqData.rfqId,
        date: new Date().toISOString(),
        matchedItems: rfqData.matchedItems,
        matchedCount: rfqData.matchedItems.length,
        totalCount: rfqData.totalCount,
        status: 'New'
    };

    archivedRFQs.unshift(newRFQ);
    saveArchive();

    console.log(`✅ Archived RFQ: ${rfqData.rfqId}`);
};

// Download RFQ file
function downloadRFQFile(index) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    // Get filtered RFQs (same logic as renderArchiveTable)
    let filteredRFQs = archivedRFQs.filter(rfq => {
        const matchesSearch = rfq.rfqId.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    filteredRFQs.sort((a, b) => {
        switch (sortFilter) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'items-desc':
                return b.matchedCount - a.matchedCount;
            case 'items-asc':
                return a.matchedCount - b.matchedCount;
            default:
                return 0;
        }
    });

    const rfq = filteredRFQs[index];
    
    if (!rfq || !rfq.fileUrl) {
        showToast('❌ File not available', 'error');
        return;
    }

    // Download file
    try {
        const link = document.createElement('a');
        link.href = rfq.fileUrl;
        link.download = rfq.fileName || rfq.originalFileName || `${rfq.rfqId}.xlsx`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('📥 Downloading file:', rfq.fileUrl);
        showToast('📥 Downloading file...', 'success');
    } catch (error) {
        console.error('❌ Download failed:', error);
        showToast('❌ Download failed', 'error');
    }
}
