// Show Add New Charger Modal
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

// Function to handle the form submission for adding a charger
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
    
    // Disable form submission
    const submitButton = document.querySelector('#addDivisionChargerForm button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    }
    
    // Prepare data for API request
    const requestData = {
        action: 'addCharger',
        cpid: chargerCPID,
        serialNumber: serialNumber,
        location: location,
        make: make,
        model: model,
        type: type,
        status: status,
        divisionId: currentDivision.id,
        capacity: capacity || null,
        commissionDate: commissionDate,
        notes: notes || null
    };
    
    // Make API request
    fetch(`${API_BASE_URL}/api/division.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Commission Charger';
        }
        
        if (data.success) {
            // Close modal
            document.getElementById('addDivisionChargerModal').classList.remove('active');
            document.getElementById('addDivisionChargerModal').remove();
            
            // Show success message
            showToast('success', 'Charger Added', 'Charger has been successfully commissioned');
            
            // Refresh chargers list
            loadFilteredDivisionChargers(1);
            
            // Update dashboard stats
            loadDashboardData();
        } else {
            showToast('error', 'Addition Failed', data.message || 'Failed to add charger. Please check the details and try again.');
        }
    })
    .catch(error => {
        console.error('Error adding charger:', error);
        
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Commission Charger';
        }
        
        showToast('error', 'Connection Error', 'Failed to connect to the server. Please try again.');
    });
}

// Function to set up charger modal listeners
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
                
                <form id="bulkUploadForm" enctype="multipart/form-data">
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
                        <button type="button" class="btn btn-success hidden" id="confirmUploadBtn">Confirm Upload</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.appendChild(modal);
    
    // Show modal
    document.getElementById('bulkUpload// EV Charging Complaint Management System - Division Dashboard JavaScript
// Script version to force reload if cache detected
const APP_VERSION = '1.0.3';

// Force reload if cached
(function() {
    if (localStorage.getItem('appVersion') !== APP_VERSION) {
        localStorage.setItem('appVersion', APP_VERSION);
        window.location.reload(true);
    }
})();

// Set the base URL for API - leave empty for same domain, or set to your domain if needed
const API_BASE_URL = '';

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
    
    // Add charger management styles
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

// Authentication Check - using API
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

// Load Dashboard Data using API
function loadDashboardData() {
    if (!currentDivision) return;
    
    // Show loading state
    document.getElementById('divTotalChargers').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('divActiveChargers').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('divOpenComplaints').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    document.getElementById('divResolutionRate').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // API request for dashboard statistics
    fetch(`${API_BASE_URL}/api/division.php?action=getDashboardStats&divisionId=${currentDivision.id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update DOM with stats
                updateDashboardWithStats(data.data);
                
                // Load recent complaints
                loadDivisionRecentComplaints();
                
                // Create charger status chart
                createChargerStatusChart(data.data.chargerStatusData);
            } else {
                showToast('error', 'Data Load Failed', data.message || 'Failed to load dashboard data');
                
                // Reset stats to 0
                document.getElementById('divTotalChargers').textContent = '0';
                document.getElementById('divActiveChargers').textContent = '0';
                document.getElementById('divOpenComplaints').textContent = '0';
                document.getElementById('divResolutionRate').textContent = '0%';
            }
        })
        .catch(error => {
            console.error('Error loading dashboard data:', error);
            showToast('error', 'Connection Error', 'Failed to connect to the server. Please check your connection.');
            
            // Reset stats to 0
            document.getElementById('divTotalChargers').textContent = '0';
            document.getElementById('divActiveChargers').textContent = '0';
            document.getElementById('divOpenComplaints').textContent = '0';
            document.getElementById('divResolutionRate').textContent = '0%';
        });
}

// Update Dashboard with Stats Data
function updateDashboardWithStats(stats) {
    document.getElementById('divTotalChargers').textContent = stats.totalChargers || '0';
    document.getElementById('divActiveChargers').textContent = stats.activeChargers || '0';
    document.getElementById('divOpenComplaints').textContent = stats.openComplaints || '0';
    document.getElementById('divResolutionRate').textContent = `${stats.resolutionRate || '0'}%`;
    
    // Update trend indicators
    document.getElementById('divChargersChange').textContent = stats.chargersTrend || '0';
    
    // Update trend classes and icons
    const activeChargersTrend = document.getElementById('activeChargersTrend');
    const openComplaintsTrend = document.getElementById('openComplaintsTrend');
    const resolutionRateTrend = document.getElementById('resolutionRateTrend');
    
    if (activeChargersTrend) {
        const isPositive = parseInt(stats.activeChargersTrend || 0) >= 0;
        activeChargersTrend.className = isPositive ? 'stat-trend positive' : 'stat-trend negative';
        activeChargersTrend.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(parseInt(stats.activeChargersTrend || 0))}
        `;
    }
    
    if (openComplaintsTrend) {
        const isPositive = parseInt(stats.openComplaintsTrend || 0) <= 0; // Fewer complaints is positive
        openComplaintsTrend.className = isPositive ? 'stat-trend positive' : 'stat-trend negative';
        openComplaintsTrend.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'down' : 'up'}"></i>
            ${Math.abs(parseInt(stats.openComplaintsTrend || 0))}
        `;
    }
    
    if (resolutionRateTrend) {
        // Higher resolution rate is positive
        const isPositive = parseInt(stats.resolutionRateTrend || 0) >= 0;
        resolutionRateTrend.className = isPositive ? 'stat-trend positive' : 'stat-trend negative';
        resolutionRateTrend.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${Math.abs(parseInt(stats.resolutionRateTrend || 0))}%
        `;
    }
}

// Load Recent Complaints for Dashboard using API
function loadDivisionRecentComplaints() {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divisionComplaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table and show loading
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading complaints...</td></tr>';
    
    // API request for recent complaints
    fetch(`${API_BASE_URL}/api/division.php?action=getRecentComplaints&divisionId=${currentDivision.id}&limit=5`)
        .then(response => response.json())
        .then(data => {
            // Clear table
            tableBody.innerHTML = '';
            
            if (data.success && data.data.length > 0) {
                // Add complaints to table
                data.data.forEach(complaint => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${complaint.tracking_id}</td>
                        <td>${complaint.charger_id}</td>
                        <td>${complaint.location || 'Unknown Location'}</td>
                        <td>${complaint.type || 'General'}</td>
                        <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                        <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
                        <td>${complaint.vendor_name || 'Not Assigned'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-complaint-btn" data-id="${complaint.tracking_id}">
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
            } else {
                // Show no data message
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No complaints found</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error loading recent complaints:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Failed to load complaints. Please try again.</td></tr>';
        });
}

// Create Charger Status Chart using API data
function createChargerStatusChart(chargerStatusData) {
    if (!currentDivision) return;
    
    const chartCanvas = document.getElementById('chargerStatusChart');
    if (!chartCanvas) return;
    
    // Default data if none provided
    const statusCounts = chargerStatusData || {
        active: 0,
        inactive: 0,
        maintenance: 0
    };
    
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

// Load Filtered Division Complaints using API
function loadFilteredDivisionComplaints(page = 1) {
    if (!currentDivision) return;
    
    const tableBody = document.querySelector('#divComplaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table and show loading
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading complaints...</td></tr>';
    
    // Get filter values
    const statusFilter = document.getElementById('divComplaintStatusFilter').value;
    const typeFilter = document.getElementById('divComplaintTypeFilter').value;
    const searchInput = document.getElementById('divComplaintSearch').value.toLowerCase();
    const dateFrom = document.getElementById('divDateFrom').value;
    const dateTo = document.getElementById('divDateTo').value;
    
    // Build API URL with query parameters
    let apiUrl = `${API_BASE_URL}/api/division.php?action=getComplaints&divisionId=${currentDivision.id}&page=${page}&limit=${complaintsPagination.itemsPerPage}`;
    
    if (statusFilter !== 'all') {
        apiUrl += `&status=${encodeURIComponent(statusFilter)}`;
    }
    
    if (typeFilter !== 'all') {
        apiUrl += `&type=${encodeURIComponent(typeFilter)}`;
    }
    
    if (searchInput) {
        apiUrl += `&search=${encodeURIComponent(searchInput)}`;
    }
    
    if (dateFrom) {
        apiUrl += `&dateFrom=${encodeURIComponent(dateFrom)}`;
    }
    
    if (dateTo) {
        apiUrl += `&dateTo=${encodeURIComponent(dateTo)}`;
    }
    
    // Fetch filtered complaints
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            // Clear table
            tableBody.innerHTML = '';
            
            if (data.success) {
                // Update pagination
                complaintsPagination.totalPages = data.data.pagination.totalPages || 1;
                complaintsPagination.currentPage = data.data.pagination.currentPage || 1;
                
                // Update pagination controls
                document.getElementById('currentDivComplaintPage').textContent = complaintsPagination.currentPage;
                document.getElementById('totalDivComplaintPages').textContent = complaintsPagination.totalPages;
                document.getElementById('prevDivComplaintPage').disabled = complaintsPagination.currentPage <= 1;
                document.getElementById('nextDivComplaintPage').disabled = complaintsPagination.currentPage >= complaintsPagination.totalPages;
                
                // Check if we have complaints to display
                if (data.data.data.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No complaints found</td></tr>';
                    return;
                }
                
                // Add complaints to table
                data.data.data.forEach(complaint => {
                    // Create row with complaint data
                    const row = document.createElement('tr');
                    
                    // First cells
                    row.innerHTML = `
                        <td>${complaint.tracking_id}</td>
                        <td>${complaint.charger_id}</td>
                        <td>${complaint.location || 'Unknown Location'}</td>
                        <td>${complaint.consumer_name || 'Anonymous'}</td>
                        <td>${complaint.type || 'General'}</td>
                        <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
                    `;
                    
                    // Create SLA info cell
                    const slaCell = document.createElement('td');
                    if (complaint.assigned_to && complaint.sla_priority && complaint.expected_resolution_date) {
                        // Calculate time remaining or delay based on the SLA deadline
                        const now = new Date();
                        const deadline = new Date(complaint.expected_resolution_date);
                        const timeRemaining = deadline - now;
                        
                        // Get SLA priority class
                        const slaClass = getSLAPriorityClass(complaint.sla_priority);
                        
                        // Create SLA badge
                        const slaBadgeHTML = `<span class="sla-badge ${slaClass}">${complaint.sla_priority.toUpperCase()}</span>`;
                        
                        // Create SLA timer with appropriate class
                        let slaTimerHTML = '';
                        if (timeRemaining > 0) {
                            // Still has time - create countdown timer element
                            slaTimerHTML = `
                                <div class="sla-timer on-time" data-deadline="${complaint.expected_resolution_date}" data-id="${complaint.tracking_id}-div-table">
                                    Loading timer...
                                </div>
                            `;
                        } else {
                            // Overdue - show delay timer
                            slaTimerHTML = `
                                <div class="sla-timer overdue" data-deadline="${complaint.expected_resolution_date}" data-id="${complaint.tracking_id}-div-table">
                                    Loading timer...
                                </div>
                            `;
                        }
                        
                        // Set cell content
                        slaCell.innerHTML = `
                            ${new Date(complaint.expected_resolution_date).toLocaleDateString()} ${slaBadgeHTML}
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
                        <td>${complaint.vendor_name || 'Not Assigned'}</td>
                        <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-complaint-btn" data-id="${complaint.tracking_id}">
                                View
                            </button>
                            ${complaint.status !== 'Resolved' ? `
                            <button class="btn btn-sm btn-primary assign-complaint-btn" data-id="${complaint.tracking_id}">
                                Assign
                            </button>
                            <button class="btn btn-sm btn-secondary update-status-btn" data-id="${complaint.tracking_id}">
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
            } else {
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error loading complaints:', error);
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Failed to load complaints. Please try again.</td></tr>';
        });