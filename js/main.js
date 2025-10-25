/**
 * Mile Medical Dashboard - Main JavaScript
 * Handles data loading, charts, and UI interactions
 */

const CONFIG = {
  refreshInterval: 300000, // 5 minutes
  sharePointUrls: {
    operations: 'https://milemedical.sharepoint.com/:x:/s/MileMedical/EVq4q-YnW0JKjK-eikbGR5kBnAF0I3X4BcxqYcO0_4CdJQ',
    commercial: 'https://milemedical.sharepoint.com/:x:/s/MileMedical/EcnuIdF1jllMgZ7Fw2dQmYABfvRRMQkLJ36kXqeU0Oq6bg',
    marketing: 'https://milemedical.sharepoint.com/:x:/s/MileMedical/EYN5ITx2xHxEjx_6-CXUfYIB2OMO2jG-l_xE2K0cJrPB-g'
  },
  chartColors: {
    primary: '#1B1464',
    accent: '#3FABE6',
    success: '#48BB78',
    warning: '#F6AD55',
    danger: '#F56565',
    gradient: ['#1B1464', '#3FABE6', '#48BB78', '#9F7AEA', '#F6AD55', '#ED8936']
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadPartials();
  setActiveNav();
  initMobileMenu();
  await loadDashboardData();
  setupAutoRefresh();
});

// Load header and sidebar partials
async function loadPartials() {
  try {
    const headerResponse = await fetch('partials/header.html');
    const headerHTML = await headerResponse.text();
    document.querySelector('#header').innerHTML = headerHTML;
    
    const sidebarResponse = await fetch('partials/sidebar.html');
    const sidebarHTML = await sidebarResponse.text();
    document.querySelector('#sidebar').innerHTML = sidebarHTML;
  } catch (error) {
    console.error('Error loading partials:', error);
  }
}

// Set active navigation item
function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  setTimeout(() => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href === currentPage) {
        item.classList.add('active');
      }
    });
  }, 100);
}

// Mobile menu toggle
function initMobileMenu() {
  setTimeout(() => {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });
      
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
          sidebar.classList.remove('active');
        }
      });
    }
  }, 100);
}

// Load dashboard data based on current page
async function loadDashboardData() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  
  try {
    if (currentPage === 'index.html' || currentPage === '') {
      loadMainDashboard();
    } else if (currentPage === 'operations.html') {
      loadOperationsDashboard();
    } else if (currentPage === 'commercial.html') {
      loadCommercialDashboard();
    } else if (currentPage === 'marketing.html') {
      loadMarketingDashboard();
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// Main Dashboard
function loadMainDashboard() {
  // Revenue Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Revenue',
          data: [180000, 195000, 210000, 225000, 235000, 248000, 260000, 270000, 285000, 295000, 310000, 325000],
          borderColor: CONFIG.chartColors.accent,
          backgroundColor: 'rgba(63, 171, 230, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
  
  // Vertical Contribution Chart
  const verticalCtx = document.getElementById('verticalChart');
  if (verticalCtx) {
    new Chart(verticalCtx, {
      type: 'doughnut',
      data: {
        labels: ['Operations', 'Commercial', 'Marketing'],
        datasets: [{
          data: [45, 35, 20],
          backgroundColor: [CONFIG.chartColors.primary, CONFIG.chartColors.accent, CONFIG.chartColors.success],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }
}

// Operations Dashboard
function loadOperationsDashboard() {
  const rfqCtx = document.getElementById('rfqStatusChart');
  if (rfqCtx) {
    new Chart(rfqCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'In Progress', 'Submitted', 'Won', 'Lost'],
        datasets: [{
          data: [5, 8, 3, 15, 4],
          backgroundColor: CONFIG.chartColors.gradient,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }
  
  const poCtx = document.getElementById('poSupplierChart');
  if (poCtx) {
    new Chart(poCtx, {
      type: 'bar',
      data: {
        labels: ['Philips', 'GE Medical', 'Siemens', 'Medtronic', 'J&J'],
        datasets: [{
          label: 'Purchase Orders',
          data: [12, 9, 8, 6, 5],
          backgroundColor: CONFIG.chartColors.gradient,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
}

// Commercial Dashboard
function loadCommercialDashboard() {
  console.log('Loading commercial dashboard...');
}

// Marketing Dashboard
function loadMarketingDashboard() {
  console.log('Loading marketing dashboard...');
}

// Auto-refresh
function setupAutoRefresh() {
  setTimeout(() => location.reload(), CONFIG.refreshInterval);
}

// Manual refresh
function refreshData() {
  location.reload();
}

// Export CSV function
function exportToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  let csv = [];
  const rows = table.querySelectorAll('tr');
  
  rows.forEach(row => {
    const cols = row.querySelectorAll('td, th');
    const csvRow = [];
    cols.forEach(col => csvRow.push(col.textContent));
    csv.push(csvRow.join(','));
  });
  
  const csvContent = csv.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
