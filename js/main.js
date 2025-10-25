// ================================================================
// Mile Medical Dashboard - Core JavaScript
// Version: 2.0 Professional with Interactive Features
// ================================================================

// ================================================================
// GLOBAL CONFIGURATION
// ================================================================
const CONFIG = {
    refreshInterval: 300000, // 5 minutes in milliseconds
    chartColors: {
        primary: '#1B1464',
        accent: '#3FABE6',
        success: '#48BB78',
        warning: '#F6AD55',
        danger: '#F56565',
        info: '#4299E1',
        purple: '#9F7AEA'
    },
    sharePointUrls: {
        operations: 'https://milemedical.sharepoint.com/:x:/s/MileMedical/EVq4q-YnW0JKjK-eikbGR5kBnAF0I3X4BcxqYcO0_4CdJQ',
        commercial: 'https://milemedical.sharepoint.com/:x:/s/MileMedical/EcnuIdF1jllMgZ7Fw2dQmYABfvRRMQkLJ36kXqeU0Oq6bg',
        marketing: 'https://milemedical.sharepoint.com/:x:/s/MileMedical/EYN5ITx2xHxEjx_6-CXUfYIB2OMO2jG-l_xE2K0cJrPB-g'
    }
};

// ================================================================
// STATE MANAGEMENT
// ================================================================
const appState = {
    currentPage: '',
    lastRefresh: null,
    charts: {},
    data: {}
};

// ================================================================
// DOM READY INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Mile Medical Dashboard initializing...');
    
    // Initialize current page
    initializePage();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Setup auto-refresh
    setupAutoRefresh();
    
    // Setup search functionality
    setupSearchFeatures();
    
    // Setup tab switching
    setupTabs();
    
    // Add KPI click handlers
    setupKPIClickHandlers();
    
    console.log('Dashboard initialized successfully');
});

// ================================================================
// PAGE INITIALIZATION
// ================================================================
function initializePage() {
    // Determine current page from URL
    const path = window.location.pathname;
    
    if (path.includes('operations')) {
        appState.currentPage = 'operations';
        initOperationsDashboard();
    } else if (path.includes('commercial')) {
        appState.currentPage = 'commercial';
        initCommercialDashboard();
    } else if (path.includes('marketing')) {
        appState.currentPage = 'marketing';
        initMarketingDashboard();
    } else if (path.includes('pages/')) {
        initDetailPage();
    } else {
        appState.currentPage = 'executive';
        initExecutiveDashboard();
    }
    
    appState.lastRefresh = new Date();
}

// ================================================================
// MOBILE MENU FUNCTIONALITY
// ================================================================
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
}

// ================================================================
// AUTO-REFRESH FUNCTIONALITY
// ================================================================
function setupAutoRefresh() {
    setInterval(function() {
        console.log('Auto-refreshing dashboard data...');
        refreshDashboardData();
        appState.lastRefresh = new Date();
        updateRefreshIndicator();
    }, CONFIG.refreshInterval);
    
    updateRefreshIndicator();
}

function updateRefreshIndicator() {
    const indicator = document.querySelector('.last-update-time');
    if (indicator && appState.lastRefresh) {
        const timeStr = appState.lastRefresh.toLocaleTimeString();
        indicator.textContent = timeStr;
    }
}

function refreshDashboardData() {
    // In production, this would fetch real data from SharePoint
    // For now, regenerate with slight variations
    switch(appState.currentPage) {
        case 'executive':
            initExecutiveDashboard();
            break;
        case 'operations':
            initOperationsDashboard();
            break;
        case 'commercial':
            initCommercialDashboard();
            break;
        case 'marketing':
            initMarketingDashboard();
            break;
    }
}

// ================================================================
// KPI CLICK HANDLERS - INTERACTIVE NAVIGATION
// ================================================================
function setupKPIClickHandlers() {
    const kpiCards = document.querySelectorAll('.kpi-card[data-detail-page]');
    
    kpiCards.forEach(card => {
        card.addEventListener('click', function() {
            const detailPage = this.getAttribute('data-detail-page');
            if (detailPage) {
                window.location.href = detailPage;
            }
        });
        
        // Add keyboard accessibility
        card.setAttribute('tabindex', '0');
        card.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
}

// ================================================================
// SEARCH FUNCTIONALITY
// ================================================================
function setupSearchFeatures() {
    const searchInputs = document.querySelectorAll('.search-input');
    
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableId = this.getAttribute('data-table');
            const table = document.getElementById(tableId);
            
            if (table) {
                filterTable(table, searchTerm);
            }
        });
    });
}

function filterTable(table, searchTerm) {
    const rows = table.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ================================================================
// TAB SWITCHING FUNCTIONALITY
// ================================================================
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const content = document.getElementById(tabId);
            if (content) {
                content.classList.add('active');
            }
        });
    });
}

// ================================================================
// CSV EXPORT FUNCTIONALITY
// ================================================================
function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td, th');
        const csvRow = [];
        cols.forEach(col => {
            csvRow.push('"' + col.textContent.trim() + '"');
        });
        csv.push(csvRow.join(','));
    });
    
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// ================================================================
// CHART CREATION UTILITIES
// ================================================================
function createLineChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    
    // Destroy existing chart if it exists
    if (appState.charts[canvasId]) {
        appState.charts[canvasId].destroy();
    }
    
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(27, 20, 100, 0.9)',
                padding: 12,
                titleFont: { size: 14 },
                bodyFont: { size: 13 }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: { ...defaultOptions, ...options }
    });
    
    appState.charts[canvasId] = chart;
    return chart;
}

function createBarChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    
    if (appState.charts[canvasId]) {
        appState.charts[canvasId].destroy();
    }
    
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                backgroundColor: 'rgba(27, 20, 100, 0.9)',
                padding: 12
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: { ...defaultOptions, ...options }
    });
    
    appState.charts[canvasId] = chart;
    return chart;
}

function createDoughnutChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    
    if (appState.charts[canvasId]) {
        appState.charts[canvasId].destroy();
    }
    
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            },
            tooltip: {
                backgroundColor: 'rgba(27, 20, 100, 0.9)',
                padding: 12
            }
        }
    };
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: { ...defaultOptions, ...options }
    });
    
    appState.charts[canvasId] = chart;
    return chart;
}

function createHorizontalBarChart(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    
    if (appState.charts[canvasId]) {
        appState.charts[canvasId].destroy();
    }
    
    const defaultOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(27, 20, 100, 0.9)',
                padding: 12
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            y: {
                grid: {
                    display: false
                }
            }
        }
    };
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: { ...defaultOptions, ...options }
    });
    
    appState.charts[canvasId] = chart;
    return chart;
}

// ================================================================
// EXECUTIVE DASHBOARD INITIALIZATION
// ================================================================
function initExecutiveDashboard() {
    console.log('Initializing Executive Dashboard...');
    
    // Revenue Trend Chart
    createLineChart('revenueChart', {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Revenue',
            data: [4200, 4500, 4800, 5100, 5400, 5800],
            borderColor: CONFIG.chartColors.accent,
            backgroundColor: 'rgba(63, 171, 230, 0.1)',
            tension: 0.4,
            fill: true
        }]
    });
    
    // Department Performance Chart
    createBarChart('performanceChart', {
        labels: ['Operations', 'Commercial', 'Marketing', 'Finance', 'HR'],
        datasets: [{
            label: 'Performance Score',
            data: [92, 88, 85, 90, 87],
            backgroundColor: [
                CONFIG.chartColors.accent,
                CONFIG.chartColors.success,
                CONFIG.chartColors.warning,
                CONFIG.chartColors.info,
                CONFIG.chartColors.purple
            ]
        }]
    });
    
    // Project Status Distribution
    createDoughnutChart('projectStatusChart', {
        labels: ['Completed', 'In Progress', 'Pending', 'On Hold'],
        datasets: [{
            data: [45, 30, 15, 10],
            backgroundColor: [
                CONFIG.chartColors.success,
                CONFIG.chartColors.accent,
                CONFIG.chartColors.warning,
                CONFIG.chartColors.danger
            ]
        }]
    });
    
    // Top Products Chart
    createHorizontalBarChart('topProductsChart', {
        labels: ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'],
        datasets: [{
            label: 'Sales',
            data: [1200, 980, 850, 720, 650],
            backgroundColor: CONFIG.chartColors.primary
        }]
    });
}

// ================================================================
// OPERATIONS DASHBOARD INITIALIZATION
// ================================================================
function initOperationsDashboard() {
    console.log('Initializing Operations Dashboard...');
    
    // RFQ Trend Chart
    createLineChart('rfqTrendChart', {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
            label: 'RFQs Received',
            data: [145, 160, 152, 178],
            borderColor: CONFIG.chartColors.accent,
            backgroundColor: 'rgba(63, 171, 230, 0.1)',
            tension: 0.4,
            fill: true
        }, {
            label: 'RFQs Processed',
            data: [140, 155, 148, 170],
            borderColor: CONFIG.chartColors.success,
            backgroundColor: 'rgba(72, 187, 120, 0.1)',
            tension: 0.4,
            fill: true
        }]
    });
    
    // Purchase Order Status
    createDoughnutChart('poStatusChart', {
        labels: ['Delivered', 'In Transit', 'Processing', 'Pending'],
        datasets: [{
            data: [450, 180, 120, 80],
            backgroundColor: [
                CONFIG.chartColors.success,
                CONFIG.chartColors.info,
                CONFIG.chartColors.warning,
                CONFIG.chartColors.danger
            ]
        }]
    });
    
    // Supplier Performance
    createHorizontalBarChart('supplierPerformanceChart', {
        labels: ['Supplier A', 'Supplier B', 'Supplier C', 'Supplier D', 'Supplier E'],
        datasets: [{
            label: 'Performance Score',
            data: [95, 92, 88, 85, 82],
            backgroundColor: CONFIG.chartColors.accent
        }]
    });
    
    // Monthly PO Volume
    createBarChart('poVolumeChart', {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Purchase Orders',
            data: [420, 450, 480, 510, 540, 580],
            backgroundColor: CONFIG.chartColors.primary
        }]
    });
}

// ================================================================
// COMMERCIAL DASHBOARD INITIALIZATION
// ================================================================
function initCommercialDashboard() {
    console.log('Initializing Commercial Dashboard...');
    
    // Sales Pipeline Chart
    createBarChart('salesPipelineChart', {
        labels: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won'],
        datasets: [{
            label: 'Deal Value ($K)',
            data: [850, 620, 480, 320, 1200],
            backgroundColor: [
                CONFIG.chartColors.info,
                CONFIG.chartColors.accent,
                CONFIG.chartColors.warning,
                CONFIG.chartColors.success,
                CONFIG.chartColors.primary
            ]
        }]
    });
    
    // Revenue by Product Line
    createDoughnutChart('revenueProductChart', {
        labels: ['Surgical Supplies', 'Diagnostic Equipment', 'Pharmaceuticals', 'Medical Devices', 'Other'],
        datasets: [{
            data: [3200, 2800, 2100, 1800, 900],
            backgroundColor: [
                CONFIG.chartColors.primary,
                CONFIG.chartColors.accent,
                CONFIG.chartColors.success,
                CONFIG.chartColors.warning,
                CONFIG.chartColors.info
            ]
        }]
    });
    
    // Monthly Sales Trend
    createLineChart('salesTrendChart', {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Revenue ($K)',
            data: [1800, 1950, 2100, 2250, 2400, 2600],
            borderColor: CONFIG.chartColors.success,
            backgroundColor: 'rgba(72, 187, 120, 0.1)',
            tension: 0.4,
            fill: true
        }, {
            label: 'Target ($K)',
            data: [2000, 2000, 2000, 2000, 2500, 2500],
            borderColor: CONFIG.chartColors.danger,
            borderDash: [5, 5],
            tension: 0,
            fill: false
        }]
    });
    
    // Top Customers
    createHorizontalBarChart('topCustomersChart', {
        labels: ['Hospital A', 'Clinic B', 'Medical Center C', 'Health System D', 'Hospital E'],
        datasets: [{
            label: 'Revenue ($K)',
            data: [580, 520, 480, 420, 380],
            backgroundColor: CONFIG.chartColors.accent
        }]
    });
}

// ================================================================
// MARKETING DASHBOARD INITIALIZATION
// ================================================================
function initMarketingDashboard() {
    console.log('Initializing Marketing Dashboard...');
    
    // Campaign Performance
    createBarChart('campaignPerformanceChart', {
        labels: ['Email Campaign', 'Social Media', 'Content Marketing', 'PPC Ads', 'Events'],
        datasets: [{
            label: 'Leads Generated',
            data: [450, 380, 320, 280, 220],
            backgroundColor: CONFIG.chartColors.accent
        }, {
            label: 'Conversions',
            data: [90, 76, 64, 56, 44],
            backgroundColor: CONFIG.chartColors.success
        }]
    });
    
    // Lead Source Distribution
    createDoughnutChart('leadSourceChart', {
        labels: ['Website', 'Social Media', 'Referrals', 'Direct', 'Other'],
        datasets: [{
            data: [420, 320, 280, 180, 120],
            backgroundColor: [
                CONFIG.chartColors.primary,
                CONFIG.chartColors.accent,
                CONFIG.chartColors.success,
                CONFIG.chartColors.warning,
                CONFIG.chartColors.info
            ]
        }]
    });
    
    // Monthly Lead Trend
    createLineChart('leadTrendChart', {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Leads',
            data: [420, 450, 480, 510, 540, 580],
            borderColor: CONFIG.chartColors.accent,
            backgroundColor: 'rgba(63, 171, 230, 0.1)',
            tension: 0.4,
            fill: true
        }]
    });
    
    // Channel ROI
    createHorizontalBarChart('channelROIChart', {
        labels: ['Email', 'Social Media', 'Content', 'PPC', 'Events'],
        datasets: [{
            label: 'ROI (%)',
            data: [320, 280, 250, 180, 150],
            backgroundColor: CONFIG.chartColors.success
        }]
    });
}

// ================================================================
// DETAIL PAGE INITIALIZATION
// ================================================================
function initDetailPage() {
    console.log('Initializing Detail Page...');
    
    // Detail pages have their own specific initialization
    // Charts will be created based on the specific page type
    
    // Example: Revenue Detail Page
    if (document.getElementById('revenueDetailChart')) {
        createLineChart('revenueDetailChart', {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Revenue',
                data: [4200, 4500, 4800, 5100, 5400, 5800, 6100, 6400, 6700, 7000, 7300, 7600],
                borderColor: CONFIG.chartColors.accent,
                backgroundColor: 'rgba(63, 171, 230, 0.1)',
                tension: 0.4,
                fill: true
            }]
        });
    }
    
    // Example: RFQ Detail Page
    if (document.getElementById('rfqDetailChart')) {
        createBarChart('rfqDetailChart', {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'RFQs Received',
                data: [580, 640, 608, 712, 680, 750],
                backgroundColor: CONFIG.chartColors.accent
            }, {
                label: 'RFQs Processed',
                data: [560, 620, 592, 680, 660, 720],
                backgroundColor: CONFIG.chartColors.success
            }]
        });
    }
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

function formatPercentage(value) {
    return value.toFixed(1) + '%';
}

function getRandomData(min, max, count) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return data;
}

// ================================================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ================================================================
window.MileDashboard = {
    exportTableToCSV,
    formatCurrency,
    formatNumber,
    formatPercentage,
    refreshDashboardData,
    config: CONFIG
};

console.log('Mile Medical Dashboard Core JS Loaded Successfully');
