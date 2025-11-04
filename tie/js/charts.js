// Chart.js Default Configuration
Chart.defaults.color = '#9CA3AF';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Inter', sans-serif";

// RFQ Trend Line Chart
const rfqTrendCtx = document.getElementById('rfqTrendChart').getContext('2d');
const rfqTrendChart = new Chart(rfqTrendCtx, {
    type: 'line',
    data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [{
            label: 'RFQs',
            data: [85, 92, 78, 105, 118, 125, 132],
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
                    padding: 10
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

// Vendor Contribution Doughnut Chart
const vendorChartCtx = document.getElementById('vendorChart').getContext('2d');
const vendorChart = new Chart(vendorChartCtx, {
    type: 'doughnut',
    data: {
        labels: ['Vendor A', 'Vendor B', 'Vendor C', 'Others'],
        datasets: [{
            data: [35, 28, 22, 15],
            backgroundColor: [
                'rgba(246, 177, 122, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)'
            ],
            borderColor: [
                '#F6B17A',
                '#8B5CF6',
                '#3B82F6',
                '#10B981'
            ],
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
                        return label + ': ' + value + '%';
                    }
                }
            }
        },
        cutout: '65%'
    }
});

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

    // Add hover effect to table rows
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.01)';
        });
        row.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });

    // Setup coming soon link handlers
    setupComingSoonLinks();
});

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

// Show coming soon message with toast-like notification
function showComingSoonMessage() {
    // Create a custom modal for coming soon
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