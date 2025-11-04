/**
 * Dashboard Module - Tender Intelligence Engine
 * Displays real-time statistics from Archive
 * Version: 2.0 - Connected to Archive
 */

// Storage key for archived RFQs (same as archive.js)
const ARCHIVE_STORAGE_KEY = 'tie_rfq_archive';

// Global variables
let archivedRFQs = [];
let rfqTrendChart = null;
let vendorChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 TIE Dashboard v2.0 - Real Data from Archive');
    loadArchiveData();
    updateDashboardStats();
    initializeCharts();
    renderRecentRFQs();
    setupComingSoonLinks();
});

// Load archived RFQs from localStorage
function loadArchiveData() {
    try {
        const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        if (stored) {
            archivedRFQs = JSON.parse(stored);
            console.log(`📦 Loaded ${archivedRFQs.length} RFQs from Archive`);
        } else {
            archivedRFQs = [];
            console.log('📦 No archived RFQs found');
        }
    } catch (error) {
        console.error('❌ Error loading archive data:', error);
        archivedRFQs = [];
    }
}

// Update dashboard statistics with real data
function updateDashboardStats() {
    // Total RFQs
    const totalRFQs = archivedRFQs.length;
    document.querySelector('.glass-card:nth-child(1) p.text-3xl').textContent = totalRFQs;
    
    // Calculate match rate
    if (totalRFQs > 0) {
        const totalMatched = archivedRFQs.reduce((sum, rfq) => sum + rfq.matchedCount, 0);
        const totalItems = archivedRFQs.reduce((sum, rfq) => sum + rfq.totalCount, 0);
        const matchRate = totalItems > 0 ? Math.round((totalMatched / totalItems) * 100) : 0;
        document.querySelector('.glass-card:nth-child(2) p.text-3xl').textContent = matchRate + '%';
    } else {
        document.querySelector('.glass-card:nth-child(2) p.text-3xl').textContent = '0%';
    }
    
    // Participated Tenders (RFQs with status Quoted or Submitted)
    const participatedTenders = archivedRFQs.filter(rfq => 
        rfq.status === 'Quoted' || rfq.status === 'Submitted'
    ).length;
    document.querySelector('.glass-card:nth-child(3) p.text-3xl').textContent = participatedTenders;
    
    // Average Margin (placeholder for now - will calculate when pricing data available)
    document.querySelector('.glass-card:nth-child(4) p.text-3xl').textContent = 'N/A';
    
    // Update small text
    document.querySelectorAll('.glass-card p.text-xs')[0].textContent = totalRFQs > 0 ? 'From Archive' : 'No RFQs yet';
    document.querySelectorAll('.glass-card p.text-xs')[1].textContent = 'Based on archived RFQs';
    document.querySelectorAll('.glass-card p.text-xs')[2].textContent = 'Quoted/Submitted RFQs';
}

// Initialize charts with real data
function initializeCharts() {
    // Chart.js Default Configuration
    Chart.defaults.color = '#9CA3AF';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    // Get trend data from archived RFQs
    const trendData = calculateTrendData();
    
    // RFQ Trend Line Chart
    const rfqTrendCtx = document.getElementById('rfqTrendChart').getContext('2d');
    rfqTrendChart = new Chart(rfqTrendCtx, {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [{
                label: 'RFQs',
                data: trendData.data,
                borderColor: '#F6B17A',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
                    gradient.addColorStop(0, 'rgba(246, 177, 122, 0.3)');
                    gradient.addColorStop(1, 'rgba(246, 177, 122, 0.01)');
                    return gradient;
                },
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#F6B17A',
                pointBorderColor: '#0D0D10',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#F6B17A',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 20, 25, 0.95)',
                    titleColor: '#F6B17A',
                    bodyColor: '#fff',
                    borderColor: 'rgba(246, 177, 122, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'RFQs: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6B7280',
                        padding: 10,
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#6B7280',
                        padding: 10
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
    
    // Vendor Contribution Chart
    const vendorData = calculateVendorContribution();
    const vendorChartCtx = document.getElementById('vendorChart').getContext('2d');
    vendorChart = new Chart(vendorChartCtx, {
        type: 'doughnut',
        data: {
            labels: vendorData.labels,
            datasets: [{
                data: vendorData.data,
                backgroundColor: vendorData.colors,
                borderColor: vendorData.borderColors,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9CA3AF',
                        padding: 15,
                        font: {
                            size: 12
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 20, 25, 0.95)',
                    titleColor: '#F6B17A',
                    bodyColor: '#fff',
                    borderColor: 'rgba(246, 177, 122, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return label + ': ' + value + ' items';
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Calculate trend data from archived RFQs
function calculateTrendData() {
    if (archivedRFQs.length === 0) {
        return {
            labels: ['No Data'],
            data: [0]
        };
    }
    
    // Group RFQs by month
    const monthCounts = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    archivedRFQs.forEach(rfq => {
        const date = new Date(rfq.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const monthLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        
        if (!monthCounts[monthKey]) {
            monthCounts[monthKey] = { label: monthLabel, count: 0 };
        }
        monthCounts[monthKey].count++;
    });
    
    // Sort by date and get last 6 months
    const sortedMonths = Object.keys(monthCounts).sort().slice(-6);
    
    return {
        labels: sortedMonths.map(key => monthCounts[key].label),
        data: sortedMonths.map(key => monthCounts[key].count)
    };
}

// Calculate vendor contribution from archived RFQs
function calculateVendorContribution() {
    if (archivedRFQs.length === 0) {
        return {
            labels: ['No Data'],
            data: [1],
            colors: ['rgba(156, 163, 175, 0.3)'],
            borderColors: ['#9CA3AF']
        };
    }
    
    // Count items by supplier
    const supplierCounts = {};
    
    archivedRFQs.forEach(rfq => {
        rfq.matchedItems.forEach(item => {
            const supplier = item.supplier || 'Unknown';
            supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
        });
    });
    
    // Sort and get top suppliers
    const sortedSuppliers = Object.entries(supplierCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (sortedSuppliers.length === 0) {
        return {
            labels: ['No Suppliers'],
            data: [1],
            colors: ['rgba(156, 163, 175, 0.3)'],
            borderColors: ['#9CA3AF']
        };
    }
    
    const colors = [
        'rgba(246, 177, 122, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(251, 146, 60, 0.8)'
    ];
    
    const borderColors = [
        '#F6B17A',
        '#8B5CF6',
        '#3B82F6',
        '#10B981',
        '#FB923C'
    ];
    
    return {
        labels: sortedSuppliers.map(s => s[0]),
        data: sortedSuppliers.map(s => s[1]),
        colors: colors.slice(0, sortedSuppliers.length),
        borderColors: borderColors.slice(0, sortedSuppliers.length)
    };
}

// Render recent RFQs table
function renderRecentRFQs() {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (archivedRFQs.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" class="py-8 text-center text-gray-400">
                <p class="mb-2">No RFQs uploaded yet</p>
                <a href="matcher.html" class="text-[#F6B17A] hover:underline">Upload your first RFQ in Matcher</a>
            </td>
        `;
        tbody.appendChild(row);
        return;
    }
    
    // Sort by date (newest first) and take top 7
    const recentRFQs = [...archivedRFQs]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 7);
    
    recentRFQs.forEach(rfq => {
        const row = document.createElement('tr');
        row.className = 'border-b border-white/5 hover:bg-white/5 transition-colors';
        
        const statusClass = getStatusClass(rfq.status);
        const matchRate = Math.round((rfq.matchedCount / rfq.totalCount) * 100);
        
        row.innerHTML = `
            <td class="py-4 px-4 text-sm font-medium text-white">${escapeHtml(rfq.rfqId)}</td>
            <td class="py-4 px-4"><span class="status-badge ${statusClass}">${escapeHtml(rfq.status)}</span></td>
            <td class="py-4 px-4 text-sm text-gray-300">Archive System</td>
            <td class="py-4 px-4 text-sm font-semibold text-emerald-400">${matchRate}%</td>
        `;
        
        // Make row clickable to view in archive
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            window.location.href = `archive.html?rfq=${encodeURIComponent(rfq.rfqId)}`;
        });
        
        tbody.appendChild(row);
    });
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

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup coming soon link handlers
function setupComingSoonLinks() {
    const comingSoonLinks = document.querySelectorAll('.nav-item.opacity-50');
    comingSoonLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showComingSoonMessage();
        });
    });
}

// Show coming soon message with custom modal
function showComingSoonMessage() {
    const existingModal = document.getElementById('comingSoonModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'comingSoonModal';
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="glass-card max-w-md w-full" style="background: linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(20, 20, 25, 0.98) 100%); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px;">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-white">🚧 Coming Soon</h3>
            </div>
            <p class="text-gray-300 mb-4">This feature is under development and will be available soon.</p>
            <div class="mb-4">
                <p class="text-sm text-gray-400 mb-2">Currently Available:</p>
                <div class="space-y-1">
                    <div class="flex items-center text-sm text-gray-300">
                        <span class="mr-2">✅</span>
                        <span>Dashboard</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-300">
                        <span class="mr-2">✅</span>
                        <span>Matcher</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-300">
                        <span class="mr-2">✅</span>
                        <span>Archive</span>
                    </div>
                </div>
            </div>
            <div class="flex justify-end">
                <button class="btn-primary" onclick="document.getElementById('comingSoonModal').remove()" style="display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; background: linear-gradient(135deg, #F6B17A 0%, #f49347 100%); color: white; font-weight: 600; font-size: 14px; border-radius: 10px; border: none; cursor: pointer;">OK</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Add animation and interactivity
document.addEventListener('DOMContentLoaded', () => {
    // Animate KPI cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.glass-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});
