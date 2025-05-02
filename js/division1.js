// EV Charging Complaint Management System - Division Dashboard JavaScript
// Add this to the top of each JS file
(function() {
    // Force reload if cached
    if (localStorage.getItem('appVersion') !== '1.0.1') {
        localStorage.setItem('appVersion', '1.0.1');
        window.location.reload(true);
    }
})();
// Global Variables
let currentDivision = null;
let complaintsPagination = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10
};
let chargersPagination = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Setup sidebar navigation
    setupSidebarNavigation();
    
    // Setup logout button
    setupLogout();
    
    // Setup notification system
    setupToastSystem();
    
    // Setup modals
    setupModals();
    
    // Load division dashboard data
    loadDashboardData();
    
    // Setup filters for complaints
    setupComplaintsFilters();
    
    // Setup filters for chargers
    setupChargersFilters();
    
    // Setup pagination
    setupPagination();
    // Setup charger management features
    setupChargerManagement();
    
    // Setup bulk upload functionality
    setupBulkChargerUpload();
    addChargerManagementStyles();
});


// Add this function to setup charger management
function setupChargerManagement() {
    // Setup add charger button
    const addChargerBtn = document.getElementById('addDivisionChargerBtn');
    if (addChargerBtn) {
        addChargerBtn.addEventListener('click', showAddChargerModal);
    }
    
    // Setup bulk upload button
    const bulkUploadBtn = document.getElementById('bulkUploadChargersBtn');
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', showBulkUploadModal);
    }
}

// Add this CSS at the beginning of the JS file to ensure styles are added
function addChargerManagementStyles() {
    if (document.getElementById('charger-management-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'charger-management-styles';
    styles.textContent = `
        /* Form styles for charger management */
        .form-row {
            display: flex;
            margin-left: -10px;
            margin-right: -10px;
        }
        
        .form-group {
            margin-bottom: 15px;
            width: 100%;
        }
        
        .form-row .form-group {
            padding-left: 10px;
            padding-right: 10px;
        }
        
        .form-row .form-group.half {
            width: 50%;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .form-group textarea {
            resize: vertical;
            min-height: 80px;
        }
        
        .help-text {
            font-size: 12px;
            color: #666;
            margin-top: 3px;
        }
        
        /* Modal styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
        }
        
        .modal-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #777;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 15px 20px;
            border-top: 1px solid #eee;
        }
    `;
    
    document.head.appendChild(styles);
}
// Authentication Check
function checkAuth() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser || currentUser.role !== 'division') {
        // Not logged in or not a division user, redirect to login
        window.location.href = 'index.html';
        return;
    }
    
    // Get division from session storage
    currentDivision = JSON.parse(sessionStorage.getItem('currentDivision'));
    
    if (!currentDivision || !currentDivision.name) {
        // No division information, redirect to login
        window.location.href = 'index.html';
        return;
    }
    
    // Update user name display
    document.getElementById('divisionUserName').textContent = currentDivision.name;
    document.getElementById('divisionWelcomeName').textContent = currentDivision.name;
}

// Sidebar Navigation
function setupSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.getAttribute('data-section');
            
            // Update active sidebar item
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show target section, hide others
            dashboardSections.forEach(section => {
                if (section.id === targetSection + 'Section') {
                    section.classList.remove('hidden');
                    
                    // Load section data if needed
                    if (targetSection === 'divisionComplaints') {
                        loadFilteredDivisionComplaints(1);
                    } else if (targetSection === 'divisionChargers') {
                        loadFilteredDivisionChargers(1);
                    } else if (targetSection === 'assignedVendors') {
                        loadDivisionVendors();
                    }
                } else {
                    section.classList.add('hidden');
                }
            });
        });
    });
    
    // Set up "View all complaints" link
    document.getElementById('viewAllDivisionComplaints').addEventListener('click', (e) => {
        e.preventDefault();
        // Find complaints sidebar item and click it
        const complaintsItem = document.querySelector('.sidebar-item[data-section="divisionComplaints"]');
        if (complaintsItem) {
            complaintsItem.click();
        }
    });
}

// Logout Functionality
function setupLogout() {
    const logoutBtn = document.getElementById('divisionLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear session storage
            sessionStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentDivision');
            
            // Redirect to login page
            window.location.href = 'index.html';
        });
    }
}

// Setup Toast Notification System
function setupToastSystem() {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

// Show Toast Notification
function showToast(type, title, message, duration = 3000) {
    // Get toast container
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Determine icon based on type
    const iconClass = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-times-circle' : 
                     type === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon ${type}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">×</button>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Add event listener to close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('fading');
        
        // Remove after fade animation
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

// Set up modals
function setupModals() {
    // Close modal buttons
    const closeButtons = document.querySelectorAll('.modal-close, .btn-secondary[id^="cancel"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Find closest modal parent
            const modal = button.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Set up assign to vendor form
    const assignToVendorForm = document.getElementById('assignToVendorForm');
    if (assignToVendorForm) {
        assignToVendorForm.addEventListener('submit', handleAssignToVendor);
    }
    
    // Set up update status form
    const updateStatusForm = document.getElementById('updateStatusForm');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', handleUpdateStatus);
    }
}

// Load Dashboard Data
function loadDashboardData() {
    if (!currentDivision) return;
    
    // Update statistics
    updateDivisionDashboardStats();
    
    // Load recent complaints
    loadDivisionRecentComplaints();
    
    // Create charger status chart
    createChargerStatusChart();
}

// Update Dashboard Statistics
function updateDivisionDashboardStats() {
    if (!currentDivision) return;
    
    // Get data from localStorage
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Filter for this division
    const divisionChargers = chargers.filter(c => c.division === currentDivision.name);
    const divisionComplaints = complaints.filter(c => c.division === currentDivision.name);
    
    // Calculate statistics
    const totalChargers = divisionChargers.length;
    const activeChargers = divisionChargers.filter(c => c.status === 'active').length;
    
    const openComplaints = divisionComplaints.filter(c => 
        c.status === 'Open' || c.status === 'In Progress'
    ).length;
    
    const resolvedComplaints = divisionComplaints.filter(c => c.status === 'Resolved').length;
    let resolutionRate = 0;
    if (divisionComplaints.length > 0) {
        resolutionRate = Math.round((resolvedComplaints / divisionComplaints.length) * 100);
    }
    
    // Update DOM elements
    document.getElementById('divTotalChargers').textContent = totalChargers;
    document.getElementById('divActiveChargers').textContent = activeChargers;
    document.getElementById('divOpenComplaints').textContent = openComplaints;
    document.getElementById('divResolutionRate').textContent = `${resolutionRate}%`;
    
    // Set random trend indicators for demonstration purposes
    document.getElementById('divChargersChange').textContent = `${Math.floor(Math.random() * 5 + 1)}`;
    
    // Update trend classes and icons
    const activeChargersTrend = document.getElementById('activeChargersTrend');
    const openComplaintsTrend = document.getElementById('openComplaintsTrend');
    const resolutionRateTrend = document.getElementById('resolutionRateTrend');
    
    if (activeChargersTrend) {
        const isPositive = Math.random() > 0.5;
        activeChargersTrend.className = isPositive ? 'stat-trend positive' : 'stat-trend negative';
        activeChargersTrend.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.floor(Math.random() * 3 + 1)}
        `;
    }
    
    if (openComplaintsTrend) {
        // More complaints is negative
        openComplaintsTrend.className = 'stat-trend negative';
        openComplaintsTrend.innerHTML = `
            <i class="fas fa-arrow-up"></i>
            ${Math.floor(Math.random() * 5 + 1)}
        `;
    }
    
    if (resolutionRateTrend) {
        // Higher resolution rate is positive
        resolutionRateTrend.className = 'stat-trend positive';
        resolutionRateTrend.innerHTML = `
            <i class="fas fa-arrow-up"></i>
            ${Math.floor(Math.random() * 5 + 1)}%
        `;
    }
}

// Load Recent Complaints for Dashboard
function loadDivisionRecentComplaints() {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divisionComplaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Get complaints from localStorage
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Filter for division and sort by date (newest first)
    const divisionComplaints = complaints
        .filter(c => c.division === currentDivision.name)
        .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
        .slice(0, 5); // Get only 5 most recent
    
    if (divisionComplaints.length === 0) {
        // Show no data message
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No complaints found</td></tr>';
        return;
    }
    
    // Add complaints to table
    divisionComplaints.forEach(complaint => {
        // Get charger info
        const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
        const charger = chargers.find(c => c.id === complaint.chargerID);
        const location = charger ? charger.location : 'Unknown Location';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${complaint.trackingId}</td>
            <td>${complaint.chargerID}</td>
            <td>${location}</td>
            <td>${complaint.type || 'General'}</td>
            <td>${new Date(complaint.createdDate).toLocaleDateString()}</td>
            <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
            <td>${complaint.assignedTo || 'Not Assigned'}</td>
            <td>
                <button class="btn btn-sm btn-outline view-complaint-btn" data-id="${complaint.trackingId}">
                    View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    const viewButtons = tableBody.querySelectorAll('.view-complaint-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const trackingId = btn.getAttribute('data-id');
            showComplaintDetails(trackingId);
        });
    });
}

// Create Charger Status Chart
function createChargerStatusChart() {
    if (!currentDivision) return;
    
    const chartCanvas = document.getElementById('chargerStatusChart');
    if (!chartCanvas) return;
    
    // Get chargers from localStorage
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    
    // Filter for division
    const divisionChargers = chargers.filter(c => c.division === currentDivision.name);
    
    // Count chargers by status
    const statusCounts = {
        active: 0,
        inactive: 0,
        maintenance: 0
    };
    
    divisionChargers.forEach(charger => {
        const status = charger.status ? charger.status.toLowerCase() : 'inactive';
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
    });
    
    // Create or update chart
    if (window.chargerStatusChart) {
        window.chargerStatusChart.destroy();
    }
    
    window.chargerStatusChart = new Chart(chartCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Inactive', 'Under Maintenance'],
            datasets: [{
                data: [
                    statusCounts.active,
                    statusCounts.inactive,
                    statusCounts.maintenance
                ],
                backgroundColor: [
                    '#4CAF50', // Green for active
                    '#F44336', // Red for inactive
                    '#FFC107'  // Yellow for maintenance
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Charger Status Distribution'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Setup Complaints Filters
function setupComplaintsFilters() {
    const applyFiltersBtn = document.getElementById('applyDivFilters');
    const resetFiltersBtn = document.getElementById('resetDivFilters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            complaintsPagination.currentPage = 1;
            loadFilteredDivisionComplaints(1);
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Reset filter inputs
            document.getElementById('divComplaintStatusFilter').value = 'all';
            document.getElementById('divComplaintTypeFilter').value = 'all';
            document.getElementById('divComplaintSearch').value = '';
            document.getElementById('divDateFrom').value = '';
            document.getElementById('divDateTo').value = '';
            
            complaintsPagination.currentPage = 1;
            loadFilteredDivisionComplaints(1);
        });
    }
}

// Replace the existing loadFilteredDivisionComplaints function in division.js with this improved version

// Complete loadFilteredDivisionComplaints Function for division.js

function loadFilteredDivisionComplaints(page = 1) {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divComplaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Get filter values
    const statusFilter = document.getElementById('divComplaintStatusFilter').value;
    const typeFilter = document.getElementById('divComplaintTypeFilter').value;
    const searchInput = document.getElementById('divComplaintSearch').value.toLowerCase();
    const dateFrom = document.getElementById('divDateFrom').value;
    const dateTo = document.getElementById('divDateTo').value;
    
    // Get complaints from localStorage
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Filter for division
    let filteredComplaints = complaints.filter(c => c.division === currentDivision.name);
    
    // Apply filters
    if (statusFilter !== 'all') {
        filteredComplaints = filteredComplaints.filter(c => 
            c.status.toLowerCase().replace(' ', '-') === statusFilter.toLowerCase()
        );
    }
    
    if (typeFilter !== 'all') {
        filteredComplaints = filteredComplaints.filter(c => 
            c.type.toLowerCase().includes(typeFilter.toLowerCase())
        );
    }
    
    if (searchInput) {
        filteredComplaints = filteredComplaints.filter(c => 
            (c.trackingId && c.trackingId.toLowerCase().includes(searchInput)) ||
            (c.chargerID && c.chargerID.toLowerCase().includes(searchInput)) ||
            (c.consumerName && c.consumerName.toLowerCase().includes(searchInput)) ||
            (c.description && c.description.toLowerCase().includes(searchInput))
        );
    }
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filteredComplaints = filteredComplaints.filter(c => 
            new Date(c.createdDate) >= fromDate
        );
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredComplaints = filteredComplaints.filter(c => 
            new Date(c.createdDate) <= toDate
        );
    }
    
    // Sort by date (newest first)
    filteredComplaints.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    
    // Update pagination
    complaintsPagination.totalPages = Math.ceil(filteredComplaints.length / complaintsPagination.itemsPerPage) || 1;
    complaintsPagination.currentPage = page > complaintsPagination.totalPages ? 1 : page;
    
    // Update pagination controls
    document.getElementById('currentDivComplaintPage').textContent = complaintsPagination.currentPage;
    document.getElementById('totalDivComplaintPages').textContent = complaintsPagination.totalPages;
    document.getElementById('prevDivComplaintPage').disabled = complaintsPagination.currentPage <= 1;
    document.getElementById('nextDivComplaintPage').disabled = complaintsPagination.currentPage >= complaintsPagination.totalPages;
    
    // Get page data
    const startIndex = (complaintsPagination.currentPage - 1) * complaintsPagination.itemsPerPage;
    const endIndex = startIndex + complaintsPagination.itemsPerPage;
    const pageComplaints = filteredComplaints.slice(startIndex, endIndex);
    
    if (pageComplaints.length === 0) {
        // Show no data message
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center">No complaints found</td></tr>';
        return;
    }
    
    // Check if SLA column exists in the table header
    let slaColumnExists = false;
    const headerRow = document.querySelector('#divComplaintsTable thead tr');
    if (headerRow) {
        Array.from(headerRow.cells).forEach(cell => {
            if (cell.textContent.includes('Expected Resolution')) {
                slaColumnExists = true;
            }
        });
        
        // Add SLA column if it doesn't exist
        if (!slaColumnExists) {
            // Find Status column index
            const statusIndex = Array.from(headerRow.cells).findIndex(cell => 
                cell.textContent.toLowerCase().includes('status')
            );
            
            if (statusIndex >= 0) {
                const slaColumn = document.createElement('th');
                slaColumn.textContent = 'Expected Resolution';
                // Insert after status column
                headerRow.insertBefore(slaColumn, headerRow.cells[statusIndex + 1]);
            }
        }
    }
    
    // Add complaints to table
    pageComplaints.forEach(complaint => {
        // Get charger info
        const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
        const charger = chargers.find(c => c.id === complaint.chargerID);
        const location = charger ? charger.location : 'Unknown Location';
        
        const row = document.createElement('tr');
        
        // First cells remain the same
        row.innerHTML = `
            <td>${complaint.trackingId}</td>
            <td>${complaint.chargerID}</td>
            <td>${location}</td>
            <td>${complaint.consumerName || 'Anonymous'}</td>
            <td>${complaint.type || 'General'}</td>
            <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
        `;
        
        // Create SLA info cell
        const slaCell = document.createElement('td');
        if (complaint.assignedTo && complaint.slaPriority && complaint.expectedResolutionDate) {
            // Calculate time remaining or delay based on the SLA deadline
            const now = new Date();
            const deadline = new Date(complaint.expectedResolutionDate);
            const timeRemaining = deadline - now;
            
            // Get SLA priority class
            const slaClass = getSLAPriorityClass(complaint.slaPriority);
            
            // Create SLA badge
            const slaBadgeHTML = `<span class="sla-badge ${slaClass}">${complaint.slaPriority.toUpperCase()}</span>`;
            
            // Create SLA timer with appropriate class
            let slaTimerHTML = '';
            if (timeRemaining > 0) {
                // Still has time - create countdown timer element
                slaTimerHTML = `
                    <div class="sla-timer on-time" data-deadline="${complaint.expectedResolutionDate}" data-id="${complaint.trackingId}-div-table">
                        Loading timer...
                    </div>
                `;
            } else {
                // Overdue - show delay timer
                slaTimerHTML = `
                    <div class="sla-timer overdue" data-deadline="${complaint.expectedResolutionDate}" data-id="${complaint.trackingId}-div-table">
                        Loading timer...
                    </div>
                `;
            }
            
            // Set cell content
            slaCell.innerHTML = `
                ${new Date(complaint.expectedResolutionDate).toLocaleDateString()} ${slaBadgeHTML}
                ${slaTimerHTML}
            `;
            
            // Add class to row if overdue
            if (timeRemaining < 0) {
                row.classList.add('sla-overdue');
            }
        } else {
            // Not assigned to vendor yet
            slaCell.innerHTML = '<span class="muted-text">Not yet assigned to vendor</span>';
        }
        row.appendChild(slaCell);
        
        // Continue with remaining cells
        row.innerHTML += `
            <td>${complaint.assignedTo || 'Not Assigned'}</td>
            <td>${new Date(complaint.createdDate).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline view-complaint-btn" data-id="${complaint.trackingId}">
                    View
                </button>
                ${complaint.status !== 'Resolved' ? `
                <button class="btn btn-sm btn-primary assign-complaint-btn" data-id="${complaint.trackingId}">
                    Assign
                </button>
                <button class="btn btn-sm btn-secondary update-status-btn" data-id="${complaint.trackingId}">
                    Update
                </button>
                ` : ''}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners
    tableBody.querySelectorAll('.view-complaint-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const trackingId = btn.getAttribute('data-id');
            showComplaintDetails(trackingId);
        });
    });
    
    tableBody.querySelectorAll('.assign-complaint-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const trackingId = btn.getAttribute('data-id');
            showAssignToVendorModal(trackingId);
        });
    });
    
    tableBody.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const trackingId = btn.getAttribute('data-id');
            showUpdateStatusModal(trackingId);
        });
    });
    
    // Initialize SLA timers
    initializeSLATimers();
    
    // Add required styles if not already present
    if (!document.getElementById('sla-styles')) {
        addSLAStyles();
    }
    
    if (!document.getElementById('extra-sla-styles')) {
        addExtraSLAStyles();
    }
}

// Setup Chargers Filters
function setupChargersFilters() {
    const applyFiltersBtn = document.getElementById('applyDivChargerFilters');
    const resetFiltersBtn = document.getElementById('resetDivChargerFilters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            chargersPagination.currentPage = 1;
            loadFilteredDivisionChargers(1);
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Reset filter inputs
            document.getElementById('divChargerStatusFilter').value = 'all';
            document.getElementById('divChargerTypeFilter').value = 'all';
            document.getElementById('divChargerSearch').value = '';
            
            chargersPagination.currentPage = 1;
            loadFilteredDivisionChargers(1);
        });
    }
}

// Load Filtered Division Chargers
function loadFilteredDivisionChargers(page = 1) {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divisionChargersTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Get filter values
    const statusFilter = document.getElementById('divChargerStatusFilter').value;
    const typeFilter = document.getElementById('divChargerTypeFilter').value;
    const searchInput = document.getElementById('divChargerSearch').value.toLowerCase();
    
    // Get chargers from localStorage
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    
    // Filter for division
    let filteredChargers = chargers.filter(c => c.division === currentDivision.name);
    
    // Apply filters
    if (statusFilter !== 'all') {
        filteredChargers = filteredChargers.filter(c => 
            c.status && c.status.toLowerCase() === statusFilter.toLowerCase()
        );
    }
    
    if (typeFilter !== 'all') {
        filteredChargers = filteredChargers.filter(c => {
            const chargerType = c.type ? c.type.toLowerCase() : '';
            if (typeFilter === 'ac') {
                return chargerType.includes('ac') || chargerType.includes('type 2');
            } else if (typeFilter === 'dc') {
                return chargerType.includes('dc') || chargerType.includes('ccs') || chargerType.includes('chademo');
            }
            return true;
        });
    }
    
    if (searchInput) {
        filteredChargers = filteredChargers.filter(c => 
            (c.id && c.id.toLowerCase().includes(searchInput)) ||
            (c.location && c.location.toLowerCase().includes(searchInput)) ||
            (c.serialNumber && c.serialNumber.toLowerCase().includes(searchInput))
        );
    }
    
    // Update pagination
    chargersPagination.totalPages = Math.ceil(filteredChargers.length / chargersPagination.itemsPerPage) || 1;
    chargersPagination.currentPage = page > chargersPagination.totalPages ? 1 : page;
    
    // Update pagination controls
    document.getElementById('currentDivChargerPage').textContent = chargersPagination.currentPage;
    document.getElementById('totalDivChargerPages').textContent = chargersPagination.totalPages;
    document.getElementById('prevDivChargerPage').disabled = chargersPagination.currentPage <= 1;
    document.getElementById('nextDivChargerPage').disabled = chargersPagination.currentPage >= chargersPagination.totalPages;
    
    // Get page data
    const startIndex = (chargersPagination.currentPage - 1) * chargersPagination.itemsPerPage;
    const endIndex = startIndex + chargersPagination.itemsPerPage;
    const pageChargers = filteredChargers.slice(startIndex, endIndex);
    
    if (pageChargers.length === 0) {
        // Show no data message
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No chargers found</td></tr>';
        return;
    }
    
    // Get complaints for open count
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Add chargers to table
    pageChargers.forEach(charger => {
        // Count open complaints for this charger
        const openComplaints = complaints.filter(c => 
            c.chargerID === charger.id && 
            (c.status === 'Open' || c.status === 'In Progress')
        ).length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${charger.id}</td>
            <td>${charger.serialNumber || 'N/A'}</td>
            <td>${charger.location || 'Unknown'}</td>
            <td>${(charger.make || '') + ' ' + (charger.model || '')}</td>
            <td>${charger.type || 'Unknown'}</td>
            <td><span class="status-badge ${getChargerStatusClass(charger.status)}">${charger.status || 'Unknown'}</span></td>
            <td>${openComplaints}</td>
            <td>${charger.commissionDate ? new Date(charger.commissionDate).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-outline view-charger-btn" data-id="${charger.id}">
                    View
                </button>
                <button class="btn btn-sm btn-primary edit-charger-btn" data-id="${charger.id}">
                    Edit
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners
    tableBody.querySelectorAll('.view-charger-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const chargerId = btn.getAttribute('data-id');
            showChargerDetails(chargerId);
        });
    });
    
    tableBody.querySelectorAll('.edit-charger-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const chargerId = btn.getAttribute('data-id');
            // TO-DO: Implement edit charger functionality
            showToast('info', 'Feature Coming Soon', 'Charger editing will be available in a future update');
        });
    });
}

// Load Division Vendors
function loadDivisionVendors() {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divVendorsTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Get vendors from localStorage
    const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
    
    // Filter for vendors that serve this division
    const divisionVendors = vendors.filter(v => 
        v.status === 'active' && 
        v.serviceAreas && 
        v.serviceAreas.includes(currentDivision.name)
    );
    
    if (divisionVendors.length === 0) {
        // Show no data message
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No vendors available for your division</td></tr>';
        return;
    }
    
    // Get complaints for vendor stats
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Add vendors to table
    divisionVendors.forEach(vendor => {
        // Get vendor's complaints for this division
        const vendorComplaints = complaints.filter(c => 
            c.assignedTo === vendor.name && 
            c.division === currentDivision.name
        );
        
        // Count open complaints
        const openTickets = vendorComplaints.filter(c => 
            c.status === 'Open' || c.status === 'In Progress'
        ).length;
        
        // Calculate average resolution time
        let avgResolutionTime = 'N/A';
        const resolvedComplaints = vendorComplaints.filter(c => c.status === 'Resolved');
        
        if (resolvedComplaints.length > 0) {
            let totalHours = 0;
            let count = 0;
            
            resolvedComplaints.forEach(complaint => {
                const createdDate = new Date(complaint.createdDate);
                
                // Find resolution event in timeline
                if (complaint.timeline) {
                    const resolutionEvent = complaint.timeline.find(e => e.status === 'Resolved');
                    if (resolutionEvent) {
                        const resolvedDate = new Date(resolutionEvent.timestamp);
                        const hours = Math.round((resolvedDate - createdDate) / (1000 * 60 * 60));
                        totalHours += hours;
                        count++;
                    }
                }
            });
            
            if (count > 0) {
                const avgHours = Math.round(totalHours / count);
                avgResolutionTime = avgHours < 24 ? `${avgHours} hours` : `${Math.round(avgHours / 24)} days`;
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vendor.name}</td>
            <td>${vendor.contactPerson || 'N/A'}</td>
            <td>${vendor.email || 'N/A'}</td>
            <td>${vendor.phone || 'N/A'}</td>
            <td>${openTickets}</td>
            <td>${avgResolutionTime}</td>
            <td>
                <button class="btn btn-sm btn-outline view-vendor-btn" data-id="${vendor.id}">
                    View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners
    tableBody.querySelectorAll('.view-vendor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const vendorId = btn.getAttribute('data-id');
            // TO-DO: Implement view vendor details
            showToast('info', 'Feature Coming Soon', 'Vendor details will be available in a future update');
        });
    });
}

// Setup Pagination
function setupPagination() {
    // Complaints pagination
    const prevComplaintBtn = document.getElementById('prevDivComplaintPage');
    const nextComplaintBtn = document.getElementById('nextDivComplaintPage');
    
    if (prevComplaintBtn) {
        prevComplaintBtn.addEventListener('click', () => {
            if (complaintsPagination.currentPage > 1) {
                loadFilteredDivisionComplaints(complaintsPagination.currentPage - 1);
            }
        });
    }
    
    if (nextComplaintBtn) {
        nextComplaintBtn.addEventListener('click', () => {
            if (complaintsPagination.currentPage < complaintsPagination.totalPages) {
                loadFilteredDivisionComplaints(complaintsPagination.currentPage + 1);
            }
        });
    }
    
    // Chargers pagination
    const prevChargerBtn = document.getElementById('prevDivChargerPage');
    const nextChargerBtn = document.getElementById('nextDivChargerPage');
    
    if (prevChargerBtn) {
        prevChargerBtn.addEventListener('click', () => {
            if (chargersPagination.currentPage > 1) {
                loadFilteredDivisionChargers(chargersPagination.currentPage - 1);
            }
        });
    }
    
    if (nextChargerBtn) {
        nextChargerBtn.addEventListener('click', () => {
            if (chargersPagination.currentPage < chargersPagination.totalPages) {
                loadFilteredDivisionChargers(chargersPagination.currentPage + 1);
            }
        });
    }
}

// Show Complaint Details
function showComplaintDetails(trackingId) {
    // Get complaint data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const complaint = complaints.find(c => c.trackingId === trackingId);
    
    if (!complaint) {
        showToast('error', 'Complaint Not Found', 'The requested complaint information could not be found');
        return;
    }
    
    // Get modal elements
    const modal = document.getElementById('complaintDetailsModal');
    const modalContent = document.getElementById('complaintDetailsContent');
    const actionButtons = document.getElementById('complaintActionButtons');
    
    if (!modal || !modalContent || !actionButtons) return;
    
    // Get charger info
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    const charger = chargers.find(c => c.id === complaint.chargerID);
    const chargerLocation = charger ? charger.location : 'Unknown Location';
    
    // Build complaint details HTML
    let detailsHTML = `
        <div class="complaint-details-container">
            <div class="complaint-header">
                <div class="tracking-id">Tracking ID: <span class="highlight-text">${complaint.trackingId}</span></div>
                <div class="tracking-status">Status: <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></div>
            </div>
            
            <div class="detail-section">
                <h3>Complaint Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Charger ID:</div>
                        <div class="detail-value">${complaint.chargerID}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Location:</div>
                        <div class="detail-value">${chargerLocation}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Issue Type:</div>
                        <div class="detail-value">${complaint.type}${complaint.subType ? ` - ${complaint.subType}` : ''}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Reported By:</div>
                        <div class="detail-value">${complaint.consumerName || 'Anonymous'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Contact:</div>
                        <div class="detail-value">${complaint.consumerPhone || 'N/A'} / ${complaint.consumerEmail || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Submitted On:</div>
                        <div class="detail-value">${new Date(complaint.createdDate).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Assigned To:</div>
                        <div class="detail-value">${complaint.assignedTo || 'Not Assigned'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Expected Resolution:</div>
                        <div class="detail-value">${complaint.expectedResolutionDate ? new Date(complaint.expectedResolutionDate).toLocaleDateString() : 'Not Specified'}</div>
                    </div>
                </div>
                
                <div class="description-section">
                    <div class="detail-label">Description:</div>
                    <div class="detail-value description">${complaint.description || 'No description provided'}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Timeline</h3>
                <div class="tracking-timeline">
    `;
    
    // Add timeline events
    if (complaint.timeline && complaint.timeline.length > 0) {
        complaint.timeline.forEach(event => {
            const statusClass = 
                event.status.toLowerCase().includes('resolved') ? 'green' :
                event.status.toLowerCase().includes('progress') ? 'yellow' : 'blue';
            
            detailsHTML += `
                <div class="timeline-item">
                    <div class="timeline-icon ${statusClass}"></div>
                    <div class="timeline-content">
                        <div class="timeline-title">${event.status}</div>
                        <div class="timeline-date">${new Date(event.timestamp).toLocaleString()}</div>
                        <div class="timeline-description">${event.description || ''}</div>
                    </div>
                </div>
            `;
        });
    } else {
        detailsHTML += `
            <div class="timeline-item">
                <div class="timeline-icon"></div>
                <div class="timeline-content">
                    <div class="timeline-title">Complaint Received</div>
                    <div class="timeline-date">${new Date(complaint.createdDate).toLocaleString()}</div>
                    <div class="timeline-description">Complaint has been registered in the system.</div>
                </div>
            </div>
        `;
    }
    
    detailsHTML += `
                </div>
            </div>
        </div>
    `;
    
    // Update modal content
    modalContent.innerHTML = detailsHTML;
    
    // Update action buttons
    let buttonsHTML = `<button type="button" class="btn btn-secondary" id="closeDetailsBtn">Close</button>`;
    
    if (complaint.status !== 'Resolved') {
        buttonsHTML = `
            <button type="button" class="btn btn-primary assign-vendor-modal-btn" data-id="${complaint.trackingId}">
                <i class="fas fa-user-plus"></i> Assign to Vendor
            </button>
            <button type="button" class="btn btn-primary update-status-modal-btn" data-id="${complaint.trackingId}">
                <i class="fas fa-edit"></i> Update Status
            </button>
            ${buttonsHTML}
        `;
    }
    
    actionButtons.innerHTML = buttonsHTML;
    
    // Add event listeners to action buttons
    actionButtons.querySelector('#closeDetailsBtn').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    const assignVendorBtn = actionButtons.querySelector('.assign-vendor-modal-btn');
    if (assignVendorBtn) {
        assignVendorBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            showAssignToVendorModal(complaint.trackingId);
        });
    }
    
    const updateStatusBtn = actionButtons.querySelector('.update-status-modal-btn');
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            showUpdateStatusModal(complaint.trackingId);
        });
    }
    
    // Show modal
    modal.classList.add('active');
    
    setTimeout(() => enhanceComplaintDetailsDisplay(trackingId), 200);
    
}



// Add this function after showComplaintDetails in both files
function enhanceComplaintDetailsDisplay(trackingId) {
    // Get complaint data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const complaint = complaints.find(c => c.trackingId === trackingId);
    
    if (!complaint) return;
    
    // Get complaint detail container
    let detailContainer;
    
    // Check which page we're on by looking for different container IDs
    if (document.getElementById('complaintDetailsContent')) {
        // Division page
        detailContainer = document.getElementById('complaintDetailsContent');
    } else if (document.querySelector('#complaintDetailsModal .modal-body')) {
        // Admin page
        detailContainer = document.querySelector('#complaintDetailsModal .modal-body');
    } else {
        // No compatible container found
        return;
    }
    
    // Only add SLA section if assigned to vendor with SLA
    if (complaint.assignedTo && complaint.slaPriority && complaint.expectedResolutionDate) {
        // Create SLA section if it doesn't exist
        if (!detailContainer.querySelector('.sla-info-section')) {
            const slaSection = document.createElement('div');
            slaSection.className = 'detail-section sla-info-section';
            
            const slaClass = getSLAPriorityClass(complaint.slaPriority);
            const deadlineDate = new Date(complaint.expectedResolutionDate);
            
            // Calculate time remaining or delay
            const now = new Date();
            const timeRemaining = deadlineDate - now;
            
            // Create SLA timer component
            let slaTimerHTML = '';
            if (timeRemaining > 0) {
                slaTimerHTML = `
                    <div class="sla-timer detail-timer on-time" data-deadline="${complaint.expectedResolutionDate}" data-id="${complaint.trackingId}-detail">
                        Loading timer...
                    </div>
                `;
            } else {
                slaTimerHTML = `
                    <div class="sla-timer detail-timer overdue" data-deadline="${complaint.expectedResolutionDate}" data-id="${complaint.trackingId}-detail">
                        Loading timer...
                    </div>
                `;
            }
            
            slaSection.innerHTML = `
                <h3>SLA Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Priority:</div>
                        <div class="detail-value">
                            <span class="sla-badge ${slaClass}">${complaint.slaPriority.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Deadline:</div>
                        <div class="detail-value">${deadlineDate.toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Time Remaining:</div>
                        <div class="detail-value">${slaTimerHTML}</div>
                    </div>
                </div>
            `;
            
            // Find a good insertion point (after complaint info, before timeline)
            const timelineSection = detailContainer.querySelector('.detail-section:last-child');
            if (timelineSection) {
                timelineSection.insertAdjacentElement('beforebegin', slaSection);
            } else {
                // Just append if no better place found
                detailContainer.appendChild(slaSection);
            }
            
            // Initialize SLA timers
            initializeSLATimers();
        }
    }
}

// Modified showAssignToVendorModal function - remove expected resolution date field
function showAssignToVendorModal(trackingId) {
    // Get complaint data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const complaint = complaints.find(c => c.trackingId === trackingId);
    
    if (!complaint) {
        showToast('error', 'Complaint Not Found', 'The requested complaint information could not be found');
        return;
    }
    
    // Get modal elements
    const modal = document.getElementById('assignToVendorModal');
    const vendorSelect = document.getElementById('vendorSelect');
    const trackingIdInput = document.getElementById('vendorComplaintTrackingId');
    
    if (!modal || !vendorSelect || !trackingIdInput) return;
    
    // Clear previous selections
    vendorSelect.innerHTML = '<option value="">Select Vendor</option>';
    
    // Set tracking ID
    trackingIdInput.value = trackingId;
    
    // Get vendors from localStorage
    const vendors = JSON.parse(localStorage.getItem('vendors') || '[]');
    
    // Filter for vendors that serve this division
    const divisionVendors = vendors.filter(v => 
        v.status === 'active' && 
        v.serviceAreas && 
        v.serviceAreas.includes(currentDivision.name)
    );
    
    if (divisionVendors.length === 0) {
        vendorSelect.innerHTML += '<option value="" disabled>No vendors available for this division</option>';
    } else {
        // Add vendor options
        divisionVendors.forEach(vendor => {
            vendorSelect.innerHTML += `<option value="${vendor.name}">${vendor.name}</option>`;
        });
    }
    
    // Add SLA priority selection if it doesn't exist
    if (!document.getElementById('slaPriority')) {
        // Create SLA priority field
        const slaPriorityField = document.createElement('div');
        slaPriorityField.className = 'form-group';
        
        // Get SLA settings for display
        const slaSettings = JSON.parse(localStorage.getItem('slaSettings') || '{}');
        const criticalHours = slaSettings.criticalSLA || 4;
        const highHours = slaSettings.highSLA || 12;
        const mediumHours = slaSettings.mediumSLA || 24;
        const lowHours = slaSettings.lowSLA || 48;
        
        // Format SLA times for display
        const formatSLATime = (hours) => {
            if (hours < 24) return `${hours} hours`;
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return days > 0 ? 
                (remainingHours > 0 ? `${days} days, ${remainingHours} hours` : `${days} days`) : 
                `${hours} hours`;
        };
        
        slaPriorityField.innerHTML = `
            <label for="slaPriority">Priority Level (SLA)</label>
            <select id="slaPriority" name="slaPriority" required>
                <option value="critical">Critical (${formatSLATime(criticalHours)})</option>
                <option value="high">High (${formatSLATime(highHours)})</option>
                <option value="medium" selected>Medium (${formatSLATime(mediumHours)})</option>
                <option value="low">Low (${formatSLATime(lowHours)})</option>
            </select>
            <p class="help-text">SLA timer will start immediately after assignment</p>
        `;
        
        // Get the form
        const form = document.getElementById('assignToVendorForm');
        
        // Get insertion point (after vendorSelect)
        const vendorSelectGroup = vendorSelect.parentElement;
        const assignmentNoteGroup = document.getElementById('vendorAssignmentNote').parentElement;
        
        // Insert after vendor select and before assignment note
        form.insertBefore(slaPriorityField, assignmentNoteGroup);
    }
    
    // Remove the expected resolution date field if it exists
    const expectedDateField = document.getElementById('expectedResolutionDate');
    if (expectedDateField) {
        const fieldGroup = expectedDateField.parentElement;
        if (fieldGroup) {
            fieldGroup.remove();
        }
    }
    
    // Show modal
    modal.classList.add('active');
}

// Helper function to update expected resolution date based on SLA priority
function updateExpectedResolutionDate() {
    const slaPriority = document.getElementById('slaPriority').value;
    const expectedDateField = document.getElementById('expectedResolutionDate');
    
    if (!expectedDateField) return;
    
    // Get SLA settings
    const slaSettings = JSON.parse(localStorage.getItem('slaSettings') || '{}');
    
    // Determine hours to add based on priority
    let hoursToAdd = 24; // Default medium
    
    switch (slaPriority) {
        case 'critical':
            hoursToAdd = slaSettings.criticalSLA || 4;
            break;
        case 'high':
            hoursToAdd = slaSettings.highSLA || 12;
            break;
        case 'medium':
            hoursToAdd = slaSettings.mediumSLA || 24;
            break;
        case 'low':
            hoursToAdd = slaSettings.lowSLA || 48;
            break;
    }
    
    // Calculate new date
    const expectedDate = new Date();
    expectedDate.setHours(expectedDate.getHours() + hoursToAdd);
    
    // Set the date field
    expectedDateField.valueAsDate = expectedDate;
}



// Modified handleAssignToVendor function to include SLA
// Modified handleAssignToVendor function to start SLA timer at assignment time
function handleAssignToVendor(e) {
    e.preventDefault();
    
    // Get form data
    const trackingId = document.getElementById('vendorComplaintTrackingId').value;
    const selectedVendor = document.getElementById('vendorSelect').value;
    const assignmentNote = document.getElementById('vendorAssignmentNote').value;
    const updateToInProgress = document.getElementById('updateToInProgress').checked;
    
    // Get SLA priority (this element will be added to the form)
    const slaPriority = document.getElementById('slaPriority').value;
    
    if (!trackingId || !selectedVendor) {
        showToast('error', 'Required Fields', 'Please select a vendor to assign the complaint');
        return;
    }
    
    // Get complaint data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const complaintIndex = complaints.findIndex(c => c.trackingId === trackingId);
    
    if (complaintIndex === -1) {
        showToast('error', 'Complaint Not Found', 'The complaint you are trying to assign could not be found');
        return;
    }
    
    // Get SLA settings
    const slaSettings = JSON.parse(localStorage.getItem('slaSettings') || '{}');
    
    // Default SLA hours based on priority if settings not found
    let slaHours = 24; // Default to medium (24 hours)
    
    // Determine SLA hours based on priority and settings
    switch (slaPriority) {
        case 'critical':
            slaHours = slaSettings.criticalSLA || 4;
            break;
        case 'high':
            slaHours = slaSettings.highSLA || 12;
            break;
        case 'medium':
            slaHours = slaSettings.mediumSLA || 24;
            break;
        case 'low':
            slaHours = slaSettings.lowSLA || 48;
            break;
    }
    
    // Current time - this is when the complaint is assigned
    const currentTime = new Date();
    
    // Update complaint
    const complaint = complaints[complaintIndex];
    complaint.assignedTo = selectedVendor;
    complaint.slaPriority = slaPriority;
    complaint.slaHours = slaHours;
    complaint.slaStartTime = currentTime.toISOString();
    
    // Calculate SLA deadline - start counting from assignment time
    const slaDeadline = new Date(currentTime);
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);
    
    // Set expected resolution date based on SLA
    complaint.expectedResolutionDate = slaDeadline.toISOString();
    
    // Update status if checked
    if (updateToInProgress && complaint.status.toLowerCase() !== 'in progress') {
        complaint.status = 'In Progress';
    }
    
    // Add to timeline
    if (!complaint.timeline) {
        complaint.timeline = [];
    }
    
    // Get SLA text based on hours
    let slaText = '';
    if (slaHours < 24) {
        slaText = `${slaHours} hours`;
    } else {
        const days = Math.floor(slaHours / 24);
        const remainingHours = slaHours % 24;
        slaText = days > 0 ? 
            (remainingHours > 0 ? `${days} days, ${remainingHours} hours` : `${days} days`) : 
            `${slaHours} hours`;
    }
    
    // Format deadline for display
    const deadlineFormatted = slaDeadline.toLocaleString();
    
    complaint.timeline.push({
        status: 'Assigned to Vendor',
        timestamp: currentTime.toISOString(),
        description: `Complaint assigned to ${selectedVendor} with ${slaPriority.toUpperCase()} priority SLA (${slaText}). Deadline: ${deadlineFormatted}${assignmentNote ? '. Note: ' + assignmentNote : ''}`
    });
    
    complaint.lastUpdated = currentTime.toISOString();
    
    // Save updated complaints
    localStorage.setItem('complaints', JSON.stringify(complaints));
    
    // Close modal
    document.getElementById('assignToVendorModal').classList.remove('active');
    
    // Reset form
    document.getElementById('assignToVendorForm').reset();
    
    // Show success message
    showToast('success', 'Complaint Assigned', `Complaint has been assigned to ${selectedVendor} with ${slaPriority} priority (${slaText} SLA)`);
    
    // Refresh complaints tables
    loadDivisionRecentComplaints();
    loadFilteredDivisionComplaints(complaintsPagination.currentPage);
}


// Full implementation of showUpdateStatusModal with resolution approval and site visit handling
function showUpdateStatusModal(trackingId) {
    // Get complaint data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const complaint = complaints.find(c => c.trackingId === trackingId);
    
    if (!complaint) {
        showToast('error', 'Complaint Not Found', 'The requested complaint information could not be found');
        return;
    }
    
    // Get modal elements
    const modal = document.getElementById('updateStatusModal');
    const currentStatusInfo = document.getElementById('currentStatusInfo');
    const newStatusSelect = document.getElementById('newStatus');
    const trackingIdInput = document.getElementById('statusComplaintId');
    
    if (!modal || !currentStatusInfo || !newStatusSelect || !trackingIdInput) return;
    
    // Update current status info
    currentStatusInfo.innerHTML = `
        <div class="tracking-id">Tracking ID: <span class="highlight-text">${complaint.trackingId}</span></div>
        <div class="tracking-status">Current Status: <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></div>
    `;
    
    // Set tracking ID
    trackingIdInput.value = trackingId;
    
    // Clear previous options
    newStatusSelect.innerHTML = '<option value="">Select New Status</option>';
    
    // If complaint is pending resolution approval, add approval options
    if (complaint.status === 'Pending Resolution Approval') {
        // Add "Approve Resolution" and "Reject Resolution" options
        newStatusSelect.innerHTML += `
            <option value="Resolved">Approve Resolution</option>
            <option value="In Progress">Reject Resolution (Return to In Progress)</option>
        `;
    } else if (complaint.status === 'Site Visit Done') {
        // Options for Site Visit Done
        newStatusSelect.innerHTML += `
            <option value="In Progress">Return to In Progress</option>
            <option value="Resolved">Mark as Resolved</option>
        `;
    } else {
        // Define available statuses (exclude current status)
        const statuses = ['Open', 'In Progress', 'Site Visit Done', 'Resolved'];
        const availableStatuses = statuses.filter(status => 
            status.toLowerCase() !== complaint.status.toLowerCase()
        );
        
        // Add status options
        availableStatuses.forEach(status => {
            newStatusSelect.innerHTML += `<option value="${status}">${status}</option>`;
        });
    }
    
    // Initialize SLA section if complaint has SLA info
if (complaint.assignedTo && complaint.slaPriority && complaint.expectedResolutionDate) {
    enhanceComplaintDetailsDisplay(complaint.trackingId);
}
    
    // Show modal
    modal.classList.add('active');
}

// Full implementation of handleUpdateStatus with resolution approval and site visit handling
function handleUpdateStatus(e) {
    e.preventDefault();
    
    // Get form data
    const trackingId = document.getElementById('statusComplaintId').value;
    const newStatus = document.getElementById('newStatus').value;
    const statusNote = document.getElementById('statusNote').value;
    
    if (!trackingId || !newStatus) {
        showToast('error', 'Required Fields', 'Please select a new status');
        return;
    }
    
    // Get complaint data
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const complaintIndex = complaints.findIndex(c => c.trackingId === trackingId);
    
    if (complaintIndex === -1) {
        showToast('error', 'Complaint Not Found', 'The complaint you are trying to update could not be found');
        return;
    }
    
    // Update complaint
    const complaint = complaints[complaintIndex];
    const oldStatus = complaint.status;
    
    // Special handling for resolution approval
    if (complaint.status === 'Pending Resolution Approval') {
        if (newStatus === 'Resolved') {
            // Resolution approved
            complaint.status = 'Resolved';
            
            // Add to timeline
            if (!complaint.timeline) {
                complaint.timeline = [];
            }
            
            complaint.timeline.push({
                status: 'Resolved',
                timestamp: new Date().toISOString(),
                description: statusNote || `Resolution approved by division`
            });
            
            // Show special success message
            showToast('success', 'Resolution Approved', 'The complaint has been marked as resolved');
        } else if (newStatus === 'In Progress') {
            // Resolution rejected
            complaint.status = 'In Progress';
            
            // Add to timeline
            if (!complaint.timeline) {
                complaint.timeline = [];
            }
            
            complaint.timeline.push({
                status: 'In Progress',
                timestamp: new Date().toISOString(),
                description: statusNote || `Resolution rejected by division and returned to In Progress`
            });
            
            // Show special failure message
            showToast('warning', 'Resolution Rejected', 'The complaint has been returned to In Progress status');
        }
    } 
    // Special handling for Site Visit Done status updates
    else if (complaint.status === 'Site Visit Done') {
        complaint.status = newStatus;
        
        // Add to timeline
        if (!complaint.timeline) {
            complaint.timeline = [];
        }
        
        if (newStatus === 'Resolved') {
            complaint.timeline.push({
                status: newStatus,
                timestamp: new Date().toISOString(),
                description: statusNote || `Division confirmed resolution after site visit`
            });
            
            // Show special success message
            showToast('success', 'Status Updated', `Complaint has been confirmed as resolved after site visit`);
        } else {
            complaint.timeline.push({
                status: newStatus,
                timestamp: new Date().toISOString(),
                description: statusNote || `Status changed from Site Visit Done to ${newStatus}`
            });
            
            // Show standard success message
            showToast('success', 'Status Updated', `Complaint status has been updated to ${newStatus}`);
        }
    }
    else {
        // Regular status update
        complaint.status = newStatus;
        
        // Add to timeline
        if (!complaint.timeline) {
            complaint.timeline = [];
        }
        
        complaint.timeline.push({
            status: newStatus,
            timestamp: new Date().toISOString(),
            description: statusNote || `Status changed from ${oldStatus} to ${newStatus}`
        });
        
        // Show standard success message
        showToast('success', 'Status Updated', `Complaint status has been updated to ${newStatus}`);
    }
    
    complaint.lastUpdated = new Date().toISOString();
    
    // Save updated complaints
    localStorage.setItem('complaints', JSON.stringify(complaints));
    
    // Close modal
    document.getElementById('updateStatusModal').classList.remove('active');
    
    // Reset form
    document.getElementById('updateStatusForm').reset();
    
    // Refresh complaints tables
    loadDivisionRecentComplaints();
    loadFilteredDivisionComplaints(complaintsPagination.currentPage);
}


// Add this function to division.js
function showChargerDetails(chargerId) {
    // Get charger data
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    const charger = chargers.find(c => c.id === chargerId);
    
    if (!charger) {
        showToast('error', 'Charger Not Found', 'The requested charger information could not be found');
        return;
    }
    
    // Create modal if it doesn't exist
    let chargerModal = document.getElementById('chargerDetailsModal');
    
    if (!chargerModal) {
        chargerModal = document.createElement('div');
        chargerModal.id = 'chargerDetailsModal';
        chargerModal.className = 'modal';
        document.body.appendChild(chargerModal);
    }
    
    // Get charger complaints
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const chargerComplaints = complaints.filter(c => c.chargerID === chargerId);
    
    // Count open complaints
    const openComplaints = chargerComplaints.filter(c => 
        c.status === 'Open' || c.status === 'In Progress'
    ).length;
    
    // Create modal content
    chargerModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Charger Details</h2>
                <button class="modal-close" id="closeChargerDetailModal">×</button>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h3>Charger Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Charge Point ID:</div>
                            <div class="detail-value">${charger.id}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Serial Number:</div>
                            <div class="detail-value">${charger.serialNumber || 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Location:</div>
                            <div class="detail-value">${charger.location || 'Unknown'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Make & Model:</div>
                            <div class="detail-value">${(charger.make || '') + ' ' + (charger.model || '')}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Type:</div>
                            <div class="detail-value">${charger.type || 'Unknown'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Status:</div>
                            <div class="detail-value">
                                <span class="status-badge ${getChargerStatusClass(charger.status)}">${charger.status || 'Unknown'}</span>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Commission Date:</div>
                            <div class="detail-value">${charger.commissionDate ? new Date(charger.commissionDate).toLocaleDateString() : 'N/A'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Open Complaints:</div>
                            <div class="detail-value">${openComplaints}</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3>Recent Complaints</h3>
                    <div class="recent-complaints">
                        ${chargerComplaints.length > 0 ? `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Tracking ID</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${chargerComplaints.slice(0, 5).map(c => `
                                        <tr>
                                            <td>${c.trackingId}</td>
                                            <td>${c.type}</td>
                                            <td><span class="status-badge ${getStatusClass(c.status)}">${c.status}</span></td>
                                            <td>${new Date(c.createdDate).toLocaleDateString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : '<p class="no-data">No complaints found for this charger.</p>'}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary edit-charger-btn" data-id="${charger.id}">
                    Edit Charger
                </button>
                <button type="button" class="btn btn-secondary" id="closeDetailBtn">Close</button>
            </div>
        </div>
    `;
    

    
    
    // Show modal
    chargerModal.classList.add('active');
    
    // Add event listeners
    document.getElementById('closeChargerDetailModal').addEventListener('click', () => {
        chargerModal.classList.remove('active');
    });
    
    document.getElementById('closeDetailBtn').addEventListener('click', () => {
        chargerModal.classList.remove('active');
    });
    
    const editBtn = chargerModal.querySelector('.edit-charger-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            chargerModal.classList.remove('active');
            // Call edit function
            showEditChargerModal(chargerId);
        });
    }
}

// Updated getStatusClass function to support Site Visit Done status
function getStatusClass(status) {
    if (!status) return '';
    
    switch(status.toLowerCase()) {
        case 'open': return 'red';
        case 'in progress': return 'yellow';
        case 'site visit done': return 'blue';
        case 'pending resolution approval': return 'orange';
        case 'resolved': return 'green';
        default: return '';
    }
}

// Helper function to get charger status class
function getChargerStatusClass(status) {
    if (!status) return '';
    
    switch(status.toLowerCase()) {
        case 'active': return 'green';
        case 'inactive': return 'red';
        case 'maintenance': return 'yellow';
        default: return '';
    }
}

// Add this to division.js
document.getElementById('addDivisionChargerBtn').addEventListener('click', () => {
    // Show a form similar to the one in admin.js
    showAddChargerModal();
});


// Enhanced updateComplaintStatus function for better resolution time display
function updateComplaintStatus(trackingId, newStatus, statusNote) {
    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    const complaintIndex = complaints.findIndex(c => c.trackingId === trackingId);
    
    if (complaintIndex === -1) {
        showToast('error', 'Not Found', 'The requested complaint could not be found');
        return;
    }
    
    const complaint = complaints[complaintIndex];
    const oldStatus = complaint.status;
    const currentTime = new Date();
    
    // Special handling for resolved status from vendor
    if (newStatus === 'Resolved') {
        // Calculate resolution metrics if SLA was set
        if (complaint.slaPriority && complaint.expectedResolutionDate) {
            const deadline = new Date(complaint.expectedResolutionDate);
            const resolvedOnTime = currentTime <= deadline;
            
            // Calculate time difference
            const timeDifference = currentTime - deadline;
            let resolutionMetrics = '';
            
            // Format the difference for display
            const formattedDiff = formatTimeDifference(Math.abs(timeDifference));
            
            if (resolvedOnTime) {
                // Resolved on time - calculate time before deadline
                resolutionMetrics = `Resolved ${formattedDiff} before SLA deadline`;
            } else {
                // Resolved late - calculate delay
                resolutionMetrics = `Resolved ${formattedDiff} after SLA deadline (DELAYED)`;
            }
            
            // Store resolution metrics
            complaint.resolutionMetrics = {
                resolvedOnTime,
                resolvedAt: currentTime.toISOString(),
                deadlineTime: deadline.toISOString(),
                timeDifference, // Store raw milliseconds
                formattedDifference: formattedDiff,
                displayText: resolutionMetrics
            };
        }
        
        // Mark as "Pending Resolution Approval" instead of directly "Resolved"
        complaint.status = 'Pending Resolution Approval';
        complaint.lastUpdated = currentTime.toISOString();
        
        // Add to timeline
        if (!complaint.timeline) {
            complaint.timeline = [];
        }
        
        // Add resolution metrics to timeline if available
        const metricsText = complaint.resolutionMetrics ? 
            `\n${complaint.resolutionMetrics.displayText}` : '';
        
        complaint.timeline.push({
            status: 'Pending Resolution Approval',
            timestamp: currentTime.toISOString(),
            description: (statusNote || `Vendor has marked this complaint as resolved. Awaiting approval from division or admin.`) + metricsText
        });
        
        // Save updated complaints
        localStorage.setItem('complaints', JSON.stringify(complaints));
        
        // Show success message
        showToast('success', 'Status Updated', `Complaint has been marked as resolved and is pending approval`);
    } 
    // Special handling for Site Visit Done status
    else if (newStatus === 'Site Visit Done') {
        complaint.status = 'Site Visit Done';
        complaint.lastUpdated = currentTime.toISOString();
        
        // Add to timeline
        if (!complaint.timeline) {
            complaint.timeline = [];
        }
        
        complaint.timeline.push({
            status: 'Site Visit Done',
            timestamp: currentTime.toISOString(),
            description: statusNote || `Vendor has visited the site but issue is not yet resolved. Further work needed.`
        });
        
        // Save updated complaints
        localStorage.setItem('complaints', JSON.stringify(complaints));
        
        // Show success message
        showToast('success', 'Status Updated', `Complaint status has been updated to Site Visit Done`);
    }
    // Regular status update
    else {
        complaint.status = newStatus;
        complaint.lastUpdated = currentTime.toISOString();
        
        // Add to timeline
        if (!complaint.timeline) {
            complaint.timeline = [];
        }
        
        complaint.timeline.push({
            status: newStatus,
            timestamp: currentTime.toISOString(),
            description: statusNote || `Status changed from ${oldStatus} to ${newStatus}`
        });
        
        // Save updated complaints
        localStorage.setItem('complaints', JSON.stringify(complaints));
        
        // Show success message
        showToast('success', 'Status Updated', `Complaint status has been updated to ${newStatus}`);
    }
    
    // Refresh data based on current view
    refreshCurrentView();
}

// Function to display resolution time with proper formatting
// This can be used in all admin/division/vendor dashboards
function formatResolutionTime(complaint) {
    if (!complaint.resolutionMetrics) return '-';
    
    const resolutionClass = complaint.resolutionMetrics.resolvedOnTime ? 'on-time' : 'overdue';
    let displayText = complaint.resolutionMetrics.displayText;
    
    // Replace "DELAYED" with HTML for bold red text
    if (!complaint.resolutionMetrics.resolvedOnTime) {
        displayText = displayText.replace("(DELAYED)", "(<span class='delayed-text'>DELAYED</span>)");
    }
    
    return `<span class="resolution-time ${resolutionClass}">${displayText}</span>`;
}


// Add this function to admin.js and division.js to enhance complaint tables

// Function to update complaint table to show SLA information
function enhanceComplaintTableDisplay() {
    // Find all complaint tables across admin/division/vendor pages
    const complaintTables = [
        document.getElementById('complaintsTable'), // Admin all complaints
        document.getElementById('recentComplaintsTable'), // Admin dashboard
        document.getElementById('divComplaintsTable'), // Division complaints
        document.getElementById('divisionComplaintsTable') // Division dashboard
    ];
    
    // Loop through all tables
    complaintTables.forEach(table => {
        if (!table) return;
        
        // Get table headers
        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        
        // Check if SLA column already exists
        let slaColumnExists = false;
        headerRow.querySelectorAll('th').forEach(th => {
            if (th.textContent.includes('SLA') || th.textContent.includes('Expected')) {
                slaColumnExists = true;
            }
        });
        
        // Add SLA column if it doesn't exist
        if (!slaColumnExists) {
            const statusColumn = Array.from(headerRow.querySelectorAll('th')).find(
                th => th.textContent.includes('Status')
            );
            
            if (statusColumn) {
                // Create new SLA header column
                const slaHeaderColumn = document.createElement('th');
                slaHeaderColumn.textContent = 'Expected Resolution';
                
                // Insert after status column
                statusColumn.insertAdjacentElement('afterend', slaHeaderColumn);
                
                // Now process all rows to add SLA information
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    // Skip empty message rows
                    if (row.cells.length <= 1) return;
                    
                    // Create new cell for SLA info
                    const slaCell = document.createElement('td');
                    
                    // Get tracking ID from row
                    const trackingIdCell = row.cells[0];
                    const trackingId = trackingIdCell.textContent.trim();
                    
                    // Get complaint data
                    const complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
                    const complaint = complaints.find(c => c.trackingId === trackingId);
                    
                    if (complaint) {
                        // Check if complaint is assigned to a vendor
                        if (complaint.assignedTo && complaint.slaPriority && complaint.expectedResolutionDate) {
                            // Calculate time remaining or delay
                            const now = new Date();
                            const deadline = new Date(complaint.expectedResolutionDate);
                            const timeRemaining = deadline - now;
                            
                            // Get SLA priority class
                            const slaClass = getSLAPriorityClass(complaint.slaPriority);
                            
                            // Create SLA badge
                            const slaBadgeHTML = `<span class="sla-badge ${slaClass}">${complaint.slaPriority.toUpperCase()}</span>`;
                            
                            // Create SLA timer with appropriate class
                            let slaTimerHTML = '';
                            if (timeRemaining > 0) {
                                // Still has time - create countdown timer element
                                slaTimerHTML = `
                                    <div class="sla-timer on-time" data-deadline="${complaint.expectedResolutionDate}" data-id="${complaint.trackingId}-table">
                                        Loading timer...
                                    </div>
                                `;
                            } else {
                                // Overdue - show delay timer
                                slaTimerHTML = `
                                    <div class="sla-timer overdue" data-deadline="${complaint.expectedResolutionDate}" data-id="${complaint.trackingId}-table">
                                        Loading timer...
                                    </div>
                                `;
                            }
                            
                            // Set cell content
                            slaCell.innerHTML = `
                                ${new Date(complaint.expectedResolutionDate).toLocaleDateString()} ${slaBadgeHTML}
                                ${slaTimerHTML}
                            `;
                        } else {
                            // Not assigned to vendor yet
                            slaCell.innerHTML = '<span class="muted-text">Not yet assigned to vendor</span>';
                        }
                    } else {
                        slaCell.textContent = '-';
                    }
                    
                    // Insert after status column
                    const statusCell = row.cells[Array.from(headerRow.cells).findIndex(cell => cell.textContent.includes('Status'))];
                    if (statusCell) {
                        statusCell.insertAdjacentElement('afterend', slaCell);
                    }
                });
                
                // Initialize SLA timers
                initializeSLATimers();
            }
        }
    });
}


// Add this to admin and division login initialize function
function initializeComplaintDisplay() {
    // Add SLA styles
    addSLAStyles();
    
    // Enhance complaint tables with SLA info
    enhanceComplaintTableDisplay();
    
    // Add event listener for complaint details
    const viewButtons = document.querySelectorAll('.view-complaint-btn');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const complaintId = this.getAttribute('data-id');
            // Use setTimeout to give modal time to open
            setTimeout(() => enhanceComplaintDetailsDisplay(complaintId), 200);
        });
    });
}


// Add these functions to both admin.js and division.js

// Function to initialize SLA timers
function initializeSLATimers() {
    const timers = document.querySelectorAll('.sla-timer');
    
    timers.forEach(timer => {
        const deadline = new Date(timer.dataset.deadline);
        const timerId = timer.dataset.id;
        
        // Clear any existing interval for this timer
        if (window.slaTimers && window.slaTimers[timerId]) {
            clearInterval(window.slaTimers[timerId]);
        }
        
        // Initialize slaTimers object if it doesn't exist
        if (!window.slaTimers) {
            window.slaTimers = {};
        }
        
        // Initial update
        updateTimer(timer, deadline);
        
        // Set interval to update every second
        window.slaTimers[timerId] = setInterval(() => {
            updateTimer(timer, deadline);
        }, 1000);
    });
}

// Function to update a timer element
function updateTimer(timerElement, deadline) {
    const now = new Date();
    const timeDifference = deadline - now;
    
    // Format the time
    const formattedTime = formatTimeDifference(Math.abs(timeDifference));
    
    // Update timer text and class
    if (timeDifference > 0) {
        timerElement.textContent = formattedTime + ' remaining';
        timerElement.classList.remove('overdue');
        timerElement.classList.add('on-time');
    } else {
        timerElement.textContent = formattedTime + ' overdue';
        timerElement.classList.remove('on-time');
        timerElement.classList.add('overdue');
    }
}

// Format time difference in days, hours, minutes, seconds
function formatTimeDifference(timeDifference) {
    // Calculate time components
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    
    // Format time string
    let timeString = '';
    
    if (days > 0) {
        timeString += `${days}d `;
    }
    
    timeString += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    return timeString;
}

// Helper function to get SLA priority class for styling
function getSLAPriorityClass(priority) {
    if (!priority) return '';
    
    switch(priority.toLowerCase()) {
        case 'critical': return 'red';
        case 'high': return 'orange';
        case 'medium': return 'yellow';
        case 'low': return 'green';
        default: return '';
    }
}

// Add SLA CSS styles
function addSLAStyles() {
    if (document.getElementById('sla-styles')) return;
    
    const slaStyles = document.createElement('style');
    slaStyles.id = 'sla-styles';
    slaStyles.textContent = `
        .sla-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            color: white;
            margin-left: 5px;
        }
        
        .sla-badge.red {
            background-color: #F44336;
        }
        
        .sla-badge.orange {
            background-color: #FF9800;
        }
        
        .sla-badge.yellow {
            background-color: #FFC107;
        }
        
        .sla-badge.green {
            background-color: #4CAF50;
        }
        
        .sla-timer {
            font-size: 0.8em;
            font-family: monospace;
            margin-top: 3px;
            padding: 2px 4px;
            border-radius: 2px;
            display: inline-block;
        }
        
        .sla-timer.on-time {
            color: #4CAF50;
            background-color: rgba(76, 175, 80, 0.1);
        }
        
        .sla-timer.overdue {
            color: #F44336;
            font-weight: bold;
            background-color: rgba(244, 67, 54, 0.1);
        }
        
        .detail-timer {
            font-size: 1em;
            padding: 4px 8px;
        }
        
        tr.sla-overdue {
            background-color: rgba(244, 67, 54, 0.1);
        }
    `;
    document.head.appendChild(slaStyles);
}

// Add extra CSS styles for admin and division
function addExtraSLAStyles() {
    if (document.getElementById('extra-sla-styles')) return;
    
    const extraStyles = document.createElement('style');
    extraStyles.id = 'extra-sla-styles';
    extraStyles.textContent = `
        .muted-text {
            color: #777;
            font-style: italic;
        }
        
        .sla-info-section {
            margin-top: 20px;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
    `;
    document.head.appendChild(extraStyles);
}

// Function to show the add charger modal with complete form fields
function showAddChargerModal() {
    // Create a modal for adding a new charger
    let modal = document.createElement('div');
    modal.id = 'addDivisionChargerModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Commission New Charger</h2>
                <button class="modal-close" id="closeDivChargerModal">×</button>
            </div>
            <div class="modal-body">
                <form id="addDivisionChargerForm">
                    <div class="form-row">
                        <div class="form-group half">
                            <label for="divChargerCPID">Charge Point ID (CPID)*</label>
                            <input type="text" id="divChargerCPID" name="divChargerCPID" placeholder="e.g., EVC-1234" required>
                            <p class="help-text">Must be unique. Format: EVC-XXXX or similar</p>
                        </div>
                        <div class="form-group half">
                            <label for="divChargerSerialNumber">Serial Number*</label>
                            <input type="text" id="divChargerSerialNumber" name="divChargerSerialNumber" placeholder="e.g., SN12345678" required>
                            <p class="help-text">Must be unique. Manufacturer-provided</p>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="divChargerLocation">Location*</label>
                        <input type="text" id="divChargerLocation" name="divChargerLocation" placeholder="e.g., Central Mall Parking" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group half">
                            <label for="divChargerMake">Make*</label>
                            <input type="text" id="divChargerMake" name="divChargerMake" placeholder="e.g., ABB" required>
                        </div>
                        <div class="form-group half">
                            <label for="divChargerModel">Model*</label>
                            <input type="text" id="divChargerModel" name="divChargerModel" placeholder="e.g., Terra AC" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group half">
                            <label for="divChargerType">Charger Type*</label>
                            <select id="divChargerType" name="divChargerType" required>
                                <option value="">Select Type</option>
                                <option value="AC Type 2">AC Type 2</option>
                                <option value="DC CCS">DC CCS</option>
                                <option value="DC CHAdeMO">DC CHAdeMO</option>
                                <option value="AC+DC Combo">AC+DC Combo</option>
                            </select>
                        </div>
                        <div class="form-group half">
                            <label for="divChargerStatus">Status*</label>
                            <select id="divChargerStatus" name="divChargerStatus" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="maintenance">Under Maintenance</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group half">
                            <label for="divChargerCapacity">Capacity (kW)</label>
                            <input type="number" id="divChargerCapacity" name="divChargerCapacity" placeholder="e.g., 50">
                        </div>
                        <div class="form-group half">
                            <label for="divChargerCommissionDate">Commission Date*</label>
                            <input type="date" id="divChargerCommissionDate" name="divChargerCommissionDate" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="divChargerNotes">Notes (Optional)</label>
                        <textarea id="divChargerNotes" name="divChargerNotes" rows="3" placeholder="Additional information about this charger..."></textarea>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelDivChargerBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Commission Charger</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.appendChild(modal);
    
    // Set today's date as default commission date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('divChargerCommissionDate').value = today;
    
    // Show modal
    document.getElementById('addDivisionChargerModal').classList.add('active');
    
    // Setup event listeners
    setupDivisionChargerModalListeners();
}

// Function to handle the form submission
function handleAddDivisionCharger(e) {
    e.preventDefault();
    
    // Get form data
    const chargerCPID = document.getElementById('divChargerCPID').value.trim();
    const serialNumber = document.getElementById('divChargerSerialNumber').value.trim();
    const location = document.getElementById('divChargerLocation').value.trim();
    const make = document.getElementById('divChargerMake').value.trim();
    const model = document.getElementById('divChargerModel').value.trim();
    const type = document.getElementById('divChargerType').value;
    const status = document.getElementById('divChargerStatus').value;
    const capacity = document.getElementById('divChargerCapacity').value;
    const commissionDate = document.getElementById('divChargerCommissionDate').value;
    const notes = document.getElementById('divChargerNotes').value.trim();
    
    // Validate unique CPID and Serial Number
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    
    // Check if CPID already exists
    if (chargers.some(c => c.id && c.id.toLowerCase() === chargerCPID.toLowerCase())) {
        showToast('error', 'Duplicate CPID', 'A charger with this CPID already exists');
        return;
    }
    
    // Check if Serial Number already exists
    if (chargers.some(c => c.serialNumber && c.serialNumber.toLowerCase() === serialNumber.toLowerCase())) {
        showToast('error', 'Duplicate Serial Number', 'A charger with this Serial Number already exists');
        return;
    }
    
    // Create new charger object
    const newCharger = {
        id: chargerCPID,
        serialNumber: serialNumber,
        location: location,
        make: make,
        model: model,
        type: type,
        status: status,
        division: currentDivision.name,
        capacity: capacity || null,
        commissionDate: commissionDate,
        notes: notes || null,
        createdAt: new Date().toISOString(),
        createdBy: currentDivision.name
    };
    
    // Add new charger to array
    chargers.push(newCharger);
    
    // Save to localStorage
    localStorage.setItem('chargers', JSON.stringify(chargers));
    
    // Show success message
    showToast('success', 'Charger Added', 'Charger has been successfully commissioned');
    
    // Close modal
    document.getElementById('addDivisionChargerModal').classList.remove('active');
    document.getElementById('addDivisionChargerModal').remove();
    
    // Refresh chargers list
    loadFilteredDivisionChargers(1);
    
    // Update dashboard stats
    updateDivisionDashboardStats();
}

// Function to set up modal listeners
function setupDivisionChargerModalListeners() {
    // Setup close and cancel buttons
    document.getElementById('closeDivChargerModal').addEventListener('click', () => {
        document.getElementById('addDivisionChargerModal').classList.remove('active');
        document.getElementById('addDivisionChargerModal').remove();
    });
    
    document.getElementById('cancelDivChargerBtn').addEventListener('click', () => {
        document.getElementById('addDivisionChargerModal').classList.remove('active');
        document.getElementById('addDivisionChargerModal').remove();
    });
    
    // Setup form submission
    document.getElementById('addDivisionChargerForm').addEventListener('submit', handleAddDivisionCharger);
}





// Function to handle bulk charger upload
function setupBulkChargerUpload() {
    // Add event listener to the bulk upload button
    const bulkUploadBtn = document.getElementById('bulkUploadChargersBtn');
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', showBulkUploadModal);
    }
}


// Function to show the bulk upload modal
function showBulkUploadModal() {
    // Create a modal for bulk upload
    let modal = document.createElement('div');
    modal.id = 'bulkUploadModal';
    modal.className = 'modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Bulk Upload Chargers</h2>
                <button class="modal-close" id="closeBulkUploadModal">×</button>
            </div>
            <div class="modal-body">
                <div class="bulk-upload-info">
                    <p>Upload multiple chargers at once using an Excel file. Please ensure your file follows the required format.</p>
                    <div class="template-download">
                        <button class="btn btn-sm btn-outline" id="downloadTemplateBtn">
                            <i class="fas fa-download"></i> Download Template
                        </button>
                        <span class="help-text">Download the Excel template for bulk upload</span>
                    </div>
                </div>
                
                <form id="bulkUploadForm">
                    <div class="form-group">
                        <label for="chargerExcelFile">Upload Excel File*</label>
                        <input type="file" id="chargerExcelFile" name="chargerExcelFile" accept=".xlsx, .xls" required>
                        <p class="help-text">Accepted formats: .xlsx, .xls</p>
                    </div>
                    
                    <div class="upload-preview">
                        <h3>File Preview</h3>
                        <div id="uploadPreviewContent" class="preview-content">
                            <p class="text-center text-muted">No file selected</p>
                        </div>
                    </div>
                    
                    <div class="validation-summary hidden" id="validationSummary">
                        <h3>Validation Results</h3>
                        <div id="validationContent"></div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelBulkUploadBtn">Cancel</button>
                        <button type="button" class="btn btn-primary" id="validateFileBtn">Validate File</button>
                        <button type="submit" class="btn btn-success hidden" id="confirmUploadBtn">Confirm Upload</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.appendChild(modal);
    
    // Show modal
    document.getElementById('bulkUploadModal').classList.add('active');
    
    // Setup event listeners
    setupBulkUploadModalListeners();
}

// Function to setup bulk upload modal listeners
function setupBulkUploadModalListeners() {
    // Close modal buttons
    document.getElementById('closeBulkUploadModal').addEventListener('click', () => {
        document.getElementById('bulkUploadModal').classList.remove('active');
        document.getElementById('bulkUploadModal').remove();
    });
    
    document.getElementById('cancelBulkUploadBtn').addEventListener('click', () => {
        document.getElementById('bulkUploadModal').classList.remove('active');
        document.getElementById('bulkUploadModal').remove();
    });
    
    // Download template button
    document.getElementById('downloadTemplateBtn').addEventListener('click', downloadChargerTemplate);
    
    // File input change
    document.getElementById('chargerExcelFile').addEventListener('change', handleFileSelection);
    
    // Validate button
    document.getElementById('validateFileBtn').addEventListener('click', validateExcelFile);
    
    // Form submission
    document.getElementById('bulkUploadForm').addEventListener('submit', handleBulkUpload);
}

// Function to download the charger template
function downloadChargerTemplate() {
    // First, check if XLSX is loaded
    if (typeof XLSX === 'undefined') {
        // Load XLSX library if not available
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = function() {
            // After loading, call this function again
            downloadChargerTemplate();
        };
        document.head.appendChild(script);
        showToast('info', 'Loading Template Generator', 'Please wait while we prepare the template...');
        return;
    }
    
    try {
        // Show loading toast
        showToast('info', 'Generating Template', 'Creating Excel template for charger upload...');
        
        // Sample data
        const sampleData = [
            // Headers
            ['CPID', 'SerialNumber', 'Location', 'Make', 'Model', 'Type', 'Status', 'Capacity(kW)', 'CommissionDate', 'Notes'],
            // Example row 1
            ['EVC-1001', 'SN12345678', 'Central Mall Parking', 'ABB', 'Terra AC', 'AC Type 2', 'active', '22', '2025-05-01', 'Test charger'],
            // Example row 2
            ['EVC-1002', 'SN87654321', 'Railway Station', 'Delta', 'UFC200', 'DC CCS', 'active', '150', '2025-05-01', ''],
            // Example row 3
            ['EVC-1003', 'SN11223344', 'City Center', 'Schneider', 'EVlink', 'AC Type 2', 'active', '7.4', '2025-05-01', 'Slow charger'],
            // Empty row for user to fill
            ['', '', '', '', '', '', '', '', '', '']
        ];
        
        // Instructions data
        const instructionsData = [
            ['Field', 'Description', 'Required', 'Format/Options'],
            ['CPID', 'Unique Charge Point ID', 'Yes', 'Must be unique, e.g., EVC-1001'],
            ['SerialNumber', 'Unique Serial Number', 'Yes', 'Must be unique, manufacturer provided'],
            ['Location', 'Physical location of charger', 'Yes', 'Text description of location'],
            ['Make', 'Manufacturer name', 'Yes', 'Text, e.g., ABB, Delta, etc.'],
            ['Model', 'Charger model name', 'Yes', 'Text, e.g., Terra AC, UFC200, etc.'],
            ['Type', 'Charger type', 'Yes', 'AC Type 2, DC CCS, DC CHAdeMO, AC+DC Combo'],
            ['Status', 'Initial status', 'Yes', 'active, inactive, maintenance'],
            ['Capacity(kW)', 'Power capacity in kW', 'No', 'Number, e.g., 22, 50, 150'],
            ['CommissionDate', 'Date of commissioning', 'Yes', 'YYYY-MM-DD format'],
            ['Notes', 'Additional information', 'No', 'Optional text notes']
        ];
        
        // Create workbook and worksheets
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sampleData);
        const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
        
        // Add column widths to main sheet
        ws['!cols'] = [
            {wch: 12},  // CPID
            {wch: 15},  // SerialNumber
            {wch: 25},  // Location
            {wch: 12},  // Make
            {wch: 15},  // Model
            {wch: 12},  // Type
            {wch: 10},  // Status
            {wch: 12},  // Capacity
            {wch: 15},  // CommissionDate
            {wch: 30}   // Notes
        ];
        
        // Add column widths to instructions sheet
        wsInstructions['!cols'] = [
            {wch: 15},  // Field
            {wch: 30},  // Description
            {wch: 10},  // Required
            {wch: 40}   // Format/Options
        ];
        
        // Add validation rules sheet
        const validationData = [
            ['Validation Rules for Bulk Charger Upload'],
            [''],
            ['Duplicate Check:'],
            ['- CPIDs must be unique across the system'],
            ['- Serial Numbers must be unique across the system'],
            ['- The system will check for duplicates both within the upload file and against existing chargers'],
            [''],
            ['Valid Types:'],
            ['- AC Type 2'],
            ['- DC CCS'],
            ['- DC CHAdeMO'],
            ['- AC+DC Combo'],
            [''],
            ['Valid Statuses:'],
            ['- active'],
            ['- inactive'],
            ['- maintenance'],
            [''],
            ['Date Format:'],
            ['- Commission Date must be in YYYY-MM-DD format (e.g., 2025-05-01)'],
            [''],
            ['Required Fields:'],
            ['- CPID, SerialNumber, Location, Make, Model, Type, Status, and CommissionDate are required'],
            ['- Capacity and Notes are optional']
        ];
        
        const wsValidation = XLSX.utils.aoa_to_sheet(validationData);
        wsValidation['!cols'] = [{wch: 80}];
        
        // Add worksheets to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Chargers");
        XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");
        XLSX.utils.book_append_sheet(wb, wsValidation, "Validation Rules");
        
        // Generate file name
        const divisionName = currentDivision ? currentDivision.name.replace(/\s+/g, '_') : 'division';
        const fileName = `charger_template_${divisionName}.xlsx`;
        
        // Convert workbook to binary string
        const wbout = XLSX.write(wb, {bookType:'xlsx', type:'binary'});
        
        // Convert binary string to ArrayBuffer
        function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < s.length; i++) {
                view[i] = s.charCodeAt(i) & 0xFF;
            }
            return buf;
        }
        
        // Create Blob and download link
        const blob = new Blob([s2ab(wbout)], {type:'application/octet-stream'});
        const url = URL.createObjectURL(blob);
        
        // Create and trigger download link
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(function() {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('success', 'Template Downloaded', 'Excel template has been downloaded successfully');
        }, 100);
    } catch (error) {
        console.error('Error generating template:', error);
        showToast('error', 'Download Failed', 'Failed to generate Excel template. Please try again.');
    }
}

// Function to handle file selection
function handleFileSelection(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});
            
            // Display preview
            displayFilePreview(jsonData);
            
            // Store data for validation
            window.uploadedChargerData = jsonData;
            
            // Show validate button
            document.getElementById('validateFileBtn').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error reading file:', error);
            document.getElementById('uploadPreviewContent').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error reading file. Please make sure it's a valid Excel file.</p>
                </div>
            `;
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Function to display file preview
function displayFilePreview(data) {
    const previewDiv = document.getElementById('uploadPreviewContent');
    
    if (!data || data.length === 0) {
        previewDiv.innerHTML = '<p class="text-center text-muted">No data found in file</p>';
        return;
    }
    
    let tableHTML = '<div class="table-responsive preview-table"><table class="data-table">';
    
    // Headers
    const headers = data[0];
    tableHTML += '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Only show first 5 rows in preview
    const rowCount = Math.min(data.length, 6);
    for (let i = 1; i < rowCount; i++) {
        tableHTML += '<tr>';
        const rowData = data[i];
        
        // Make sure we don't exceed the number of headers
        for (let j = 0; j < headers.length; j++) {
            tableHTML += `<td>${rowData[j] || ''}</td>`;
        }
        
        tableHTML += '</tr>';
    }
    
    // Show ellipsis if there are more rows
    if (data.length > 6) {
        tableHTML += '<tr><td colspan="' + headers.length + '" class="text-center">...</td></tr>';
    }
    
    tableHTML += '</tbody></table></div>';
    tableHTML += `<p class="text-center text-muted">Total: ${data.length - 1} chargers</p>`;
    
    previewDiv.innerHTML = tableHTML;
}

// Function to validate Excel file
function validateExcelFile() {
    const data = window.uploadedChargerData;
    
    if (!data || data.length <= 1) {
        showToast('error', 'Validation Failed', 'No data found in file');
        return;
    }
    
    // Get existing chargers
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    
    // Expected headers
    const expectedHeaders = ['CPID', 'SerialNumber', 'Location', 'Make', 'Model', 'Type', 'Status', 'Capacity(kW)', 'CommissionDate', 'Notes'];
    
    // Check headers
    const headers = data[0];
    let headerIssues = [];
    
    expectedHeaders.forEach((expectedHeader, index) => {
        if (index < headers.length) {
            if (headers[index].trim() !== expectedHeader) {
                headerIssues.push(`Column ${index + 1} should be "${expectedHeader}" but found "${headers[index]}"`);
            }
        } else {
            headerIssues.push(`Missing column: "${expectedHeader}"`);
        }
    });
    
    // Validate each row
    let rowIssues = [];
    let validChargers = [];
    let duplicateIssues = [];
    let dataIssues = [];
    
    // Valid charger types and statuses
    const validTypes = ['AC Type 2', 'DC CCS', 'DC CHAdeMO', 'AC+DC Combo'];
    const validStatuses = ['active', 'inactive', 'maintenance'];
    
    // Check for duplicates within the file itself
    const fileCPIDs = new Set();
    const fileSerialNumbers = new Set();
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        let rowErrors = [];
        
        // Skip completely empty rows
        if (row.every(cell => !cell || cell.toString().trim() === '')) {
            continue;
        }
        
        // Check required fields
        if (!row[0] || row[0].toString().trim() === '') rowErrors.push('CPID is required');
        if (!row[1] || row[1].toString().trim() === '') rowErrors.push('SerialNumber is required');
        if (!row[2] || row[2].toString().trim() === '') rowErrors.push('Location is required');
        if (!row[3] || row[3].toString().trim() === '') rowErrors.push('Make is required');
        if (!row[4] || row[4].toString().trim() === '') rowErrors.push('Model is required');
        
        // Check valid type
        if (!row[5] || row[5].toString().trim() === '') {
            rowErrors.push('Type is required');
        } else if (!validTypes.includes(row[5].toString().trim())) {
            rowErrors.push(`Invalid Type: ${row[5]}. Must be one of: ${validTypes.join(', ')}`);
        }
        
        // Check valid status
        if (!row[6] || row[6].toString().trim() === '') {
            rowErrors.push('Status is required');
        } else if (!validStatuses.includes(row[6].toString().trim().toLowerCase())) {
            rowErrors.push(`Invalid Status: ${row[6]}. Must be one of: ${validStatuses.join(', ')}`);
        }
        
        // Check commission date format
        if (!row[8] || row[8].toString().trim() === '') {
            rowErrors.push('CommissionDate is required');
        } else {
            const dateString = row[8].toString().trim();
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            
            if (!dateRegex.test(dateString)) {
                rowErrors.push(`Invalid CommissionDate format: ${dateString}. Must be YYYY-MM-DD`);
            } else {
                // Check if it's a valid date
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    rowErrors.push(`Invalid CommissionDate: ${dateString}`);
                }
            }
        }
        
        // Check for duplicates within the file
        const cpid = row[0].toString().trim();
        const serialNumber = row[1].toString().trim();
        
        if (fileCPIDs.has(cpid)) {
            duplicateIssues.push(`Row ${i+1}: Duplicate CPID "${cpid}" within upload file`);
        } else {
            fileCPIDs.add(cpid);
        }
        
        if (fileSerialNumbers.has(serialNumber)) {
            duplicateIssues.push(`Row ${i+1}: Duplicate Serial Number "${serialNumber}" within upload file`);
        } else {
            fileSerialNumbers.add(serialNumber);
        }
        
        // Check for duplicates in existing database
        const duplicateCPID = chargers.find(c => c.id && c.id.toLowerCase() === cpid.toLowerCase());
        const duplicateSerial = chargers.find(c => c.serialNumber && c.serialNumber.toLowerCase() === serialNumber.toLowerCase());
        
        if (duplicateCPID) {
            duplicateIssues.push(`Row ${i+1}: CPID "${cpid}" already exists in the system`);
        }
        
        if (duplicateSerial) {
            duplicateIssues.push(`Row ${i+1}: Serial Number "${serialNumber}" already exists in the system`);
        }
        
        // If row has errors, add to issues list
        if (rowErrors.length > 0) {
            rowIssues.push({
                row: i + 1,
                errors: rowErrors
            });
        } 
        // If no duplicates and no errors, add to valid chargers
        else if (!duplicateCPID && !duplicateSerial) {
            validChargers.push({
                id: cpid,
                serialNumber: serialNumber,
                location: row[2].toString().trim(),
                make: row[3].toString().trim(),
                model: row[4].toString().trim(),
                type: row[5].toString().trim(),
                status: row[6].toString().trim().toLowerCase(),
                capacity: row[7] ? parseFloat(row[7]) : null,
                commissionDate: row[8].toString().trim(),
                notes: row[9] ? row[9].toString().trim() : null,
                division: currentDivision.name,
                createdAt: new Date().toISOString(),
                createdBy: currentDivision.name
            });
        }
    }
    
    // Display validation results
    const validationSummary = document.getElementById('validationSummary');
    const validationContent = document.getElementById('validationContent');
    
    let validationHTML = '';
    
    if (headerIssues.length > 0) {
        validationHTML += `
            <div class="validation-section error">
                <h4>Header Issues</h4>
                <ul>
                    ${headerIssues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (duplicateIssues.length > 0) {
        validationHTML += `
            <div class="validation-section error">
                <h4>Duplicate Issues</h4>
                <ul>
                    ${duplicateIssues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (rowIssues.length > 0) {
        validationHTML += `
            <div class="validation-section error">
                <h4>Data Issues</h4>
                <ul>
                    ${rowIssues.map(issue => `
                        <li>
                            Row ${issue.row}: 
                            <ul>
                                ${issue.errors.map(error => `<li>${error}</li>`).join('')}
                            </ul>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Success section
    validationHTML += `
        <div class="validation-section ${validChargers.length > 0 ? 'success' : 'error'}">
            <h4>Summary</h4>
            <p>Total rows in file: ${data.length - 1}</p>
            <p>Valid chargers: ${validChargers.length}</p>
            <p>Rows with issues: ${rowIssues.length}</p>
            <p>Duplicate entries: ${duplicateIssues.length}</p>
        </div>
    `;
    
    validationContent.innerHTML = validationHTML;
    validationSummary.classList.remove('hidden');
    
    // Store valid chargers for upload
    window.validChargers = validChargers;
    
    // Show/hide confirm button based on validation
    const confirmBtn = document.getElementById('confirmUploadBtn');
    
    if (validChargers.length > 0 && headerIssues.length === 0) {
        confirmBtn.classList.remove('hidden');
    } else {
        confirmBtn.classList.add('hidden');
    }
    
    // Show appropriate toast message
    if (headerIssues.length > 0) {
        showToast('error', 'Validation Failed', 'File has header format issues');
    } else if (validChargers.length === 0) {
        showToast('error', 'Validation Failed', 'No valid chargers found in file');
    } else if (rowIssues.length > 0 || duplicateIssues.length > 0) {
        showToast('warning', 'Validation Complete', `Found ${validChargers.length} valid chargers with some issues`);
    } else {
        showToast('success', 'Validation Successful', `Found ${validChargers.length} valid chargers ready for upload`);
    }
}

// Function to handle bulk upload
function handleBulkUpload(e) {
    e.preventDefault();
    
    const validChargers = window.validChargers;
    
    if (!validChargers || validChargers.length === 0) {
        showToast('error', 'Upload Failed', 'No valid chargers to upload');
        return;
    }
    
    // Get existing chargers
    const chargers = JSON.parse(localStorage.getItem('chargers') || '[]');
    
    // Append new chargers
    chargers.push(...validChargers);
    
    // Save to localStorage
    localStorage.setItem('chargers', JSON.stringify(chargers));
    
    // Show success message
    showToast('success', 'Upload Successful', `${validChargers.length} chargers have been added to the system`);
    
    // Close modal
    document.getElementById('bulkUploadModal').classList.remove('active');
    document.getElementById('bulkUploadModal').remove();
    
    // Refresh chargers list
    loadFilteredDivisionChargers(1);
    
    // Update dashboard stats
    updateDivisionDashboardStats();
}

// Add CSS styles for the bulk upload modal
function addBulkUploadStyles() {
    if (document.getElementById('bulk-upload-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'bulk-upload-styles';
    styles.textContent = `
        .bulk-upload-info {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        
        .template-download {
            margin-top: 10px;
            display: flex;
            align-items: center;
        }
        
        .template-download .help-text {
            margin-left: 10px;
            color: #666;
        }
        
        .preview-content {
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
        }
        
        .preview-table {
            width: 100%;
            overflow-x: auto;
        }
        
        .validation-summary {
            margin-top: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .validation-section {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }
        
        .validation-section.error {
            background-color: rgba(244, 67, 54, 0.1);
            border-left: 3px solid #F44336;
        }
        
        .validation-section.success {
            background-color: rgba(76, 175, 80, 0.1);
            border-left: 3px solid #4CAF50;
        }
        
        .validation-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
        }
        
        .validation-section ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .error-message {
            color: #F44336;
            text-align: center;
            padding: 20px;
        }
        
        .error-message i {
            font-size: 24px;
            margin-bottom: 10px;
        }
    `;
    
    document.head.appendChild(styles);
}


// Add CSS styles for the bulk upload modal
function addBulkUploadStyles() {
    if (document.getElementById('bulk-upload-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'bulk-upload-styles';
    styles.textContent = `
        .bulk-upload-info {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
        }
        
        .template-download {
            margin-top: 10px;
            display: flex;
            align-items: center;
        }
        
        .template-download .help-text {
            margin-left: 10px;
            color: #666;
        }
        
        .preview-content {
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
        }
        
        .preview-table {
            width: 100%;
            overflow-x: auto;
        }
        
        .validation-summary {
            margin-top: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .validation-section {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }
        
        .validation-section.error {
            background-color: rgba(244, 67, 54, 0.1);
            border-left: 3px solid #F44336;
        }
        
        .validation-section.success {
            background-color: rgba(76, 175, 80, 0.1);
            border-left: 3px solid #4CAF50;
        }
        
        .validation-section h4 {
            margin-top: 0;
            margin-bottom: 10px;
        }
        
        .validation-section ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .error-message {
            color: #F44336;
            text-align: center;
            padding: 20px;
        }
        
        .error-message i {
            font-size: 24px;
            margin-bottom: 10px;
        }
    `;
    
    document.head.appendChild(styles);
}


// Function to update division charger count (add this to division.js)
function updateDivisionChargerCount(divisionName, countChange) {
    // This function would normally update the database
    // For this demo, we'll just update the localStorage stats
    
    // Get divisions
    const divisions = JSON.parse(localStorage.getItem('divisions') || '[]');
    
    // Find division
    const divisionIndex = divisions.findIndex(d => d.name === divisionName);
    
    if (divisionIndex >= 0) {
        // Create chargerCount property if it doesn't exist
        if (!divisions[divisionIndex].hasOwnProperty('chargerCount')) {
            divisions[divisionIndex].chargerCount = 0;
        }
        
        // Update count
        divisions[divisionIndex].chargerCount += countChange;
        
        // Save back to localStorage
        localStorage.setItem('divisions', JSON.stringify(divisions));
    }
    
    // Update UI
    updateDivisionDashboardStats();
}


// Function to refresh current view based on what's visible
function refreshCurrentView() {
    // Check which section is currently visible
    const dashboardSection = document.getElementById('divisionHomeSection');
    const complaintsSection = document.getElementById('divisionComplaintsSection');
    const chargersSection = document.getElementById('divisionChargersSection');
    
    if (dashboardSection && !dashboardSection.classList.contains('hidden')) {
        // Dashboard is visible
        updateDivisionDashboardStats();
        loadDivisionRecentComplaints();
        createChargerStatusChart();
    } else if (complaintsSection && !complaintsSection.classList.contains('hidden')) {
        // Complaints section is visible
        loadFilteredDivisionComplaints(complaintsPagination.currentPage);
    } else if (chargersSection && !chargersSection.classList.contains('hidden')) {
        // Chargers section is visible
        loadFilteredDivisionChargers(chargersPagination.currentPage);
    }
}

// Initialize SLA display when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add required styles
    addSLAStyles();
    addExtraSLAStyles();
    addBulkUploadStyles();
    
    // Setup bulk charger upload
    setupBulkChargerUpload();
    
    // Set up mutation observer to monitor table changes
    const tableObserver = new MutationObserver(function(mutations) {
        // Initialize SLA timers after table content changes
        initializeSLATimers();
    });
    
    // Tables to observe
    const tables = [
        document.querySelector('#complaintsTable tbody'),             // Admin
        document.querySelector('#recentComplaintsTable tbody'),       // Admin
        document.querySelector('#divComplaintsTable tbody'),          // Division
        document.querySelector('#divisionComplaintsTable tbody')      // Division
    ];
    
    // Start observing each table
    tables.forEach(table => {
        if (table) {
            tableObserver.observe(table, { childList: true });
        }
    });
    
    // Initial SLA timer initialization
    initializeSLATimers();

    
    
});


// Initialize export functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if SheetJS library is available
    if (typeof XLSX === 'undefined') {
        // Include SheetJS library if not already included
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = setupExportButton;
        document.head.appendChild(script);
    } else {
        setupExportButton();
    }
    
    // Add event listener to the "View all complaints" link
    const viewAllLink = document.getElementById('viewAllDivisionComplaints');
    if (viewAllLink) {
        viewAllLink.addEventListener('click', function() {
            // Setup export button with a slight delay to ensure the page has changed
            setTimeout(setupExportButton, 300);
        });
    }
    
    // Also add event listener to the complaints sidebar item
    const complaintsItem = document.querySelector('.sidebar-item[data-section="divisionComplaints"]');
    if (complaintsItem) {
        complaintsItem.addEventListener('click', function() {
            // Setup export button with a slight delay
            setTimeout(setupExportButton, 300);
        });
    }
});
