// EV Charging Complaint Management System - Admin JavaScript
// Script version to force reload if cache detected
const APP_VERSION = '1.0.2';

// Force reload if cached
(function() {
    if (localStorage.getItem('appVersion') !== APP_VERSION) {
        localStorage.setItem('appVersion', APP_VERSION);
        window.location.reload(true);
    }
})();

// Set the base URL for API - leave empty for same domain, or set to your domain if needed
const API_BASE_URL = '';

// When DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in and has admin role
    checkAdminAuthStatus();
    
    // Setup admin dashboard
    setupAdminDashboard();
    
    // Setup toast notification system
    setupToastSystem();
});

// Check Admin Authentication Status
function checkAdminAuthStatus() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser) {
        // Not logged in, redirect to login page
        window.location.href = 'index.html';
        return;
    }
    
    if (currentUser.role !== 'admin') {
        // Not an admin, redirect to login page
        window.location.href = 'index.html';
        return;
    }
    
    // Update user display name
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = currentUser.name || 'Admin User';
    }
}

// Setup Admin Dashboard
function setupAdminDashboard() {
    // Set up logout button
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Initialize sidebar navigation
    initializeSidebarNavigation();
    
    // Initialize notifications
    initializeNotifications();
    
    // Load dashboard statistics
    updateDashboardStats();
    
    // Load recent complaints table
    loadRecentComplaints();
    
    // Setup vendor management
    setupVendorManagement();
    
    // Setup division management
    setupDivisionManagement();
    
    // Setup charger management
    setupChargerManagement();
    
    // Setup all complaints management
    setupComplaintsManagement();
    
    // Setup settings management
    setupSettingsManagement();
}

// Logout Function
function logout() {
    // Clear session storage
    sessionStorage.removeItem('currentUser');
    
    // Redirect to login page
    window.location.href = 'index.html';
}

// Initialize Sidebar Navigation
function initializeSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get target section
            const targetSection = item.getAttribute('data-section');
            
            // Update active sidebar item
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show target section, hide others
            dashboardSections.forEach(section => {
                if (section.id === targetSection + 'Section') {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            });
            
            // Special handling for All Complaints tab
            if (targetSection === 'allComplaints') {
                loadFilteredComplaints();
            }
        });
    });
}

// Initialize Notifications
function initializeNotifications() {
    updateNotificationCount();
    
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', showNotifications);
    }
}

// Toast Notification System
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

// Update Notification Badge - Get new complaints in the last 24 hours
function updateNotificationCount() {
    const notificationBadge = document.querySelector('.notification-badge');
    if (!notificationBadge) return;
    
    // Use API to get recent complaints count
    fetch(`${API_BASE_URL}/api/admin.php?action=getRecentComplaints`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Get complaints created in last 24 hours
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const newComplaints = data.data.filter(c => {
                    const complaintDate = new Date(c.created_at);
                    return complaintDate >= yesterday;
                });
                
                const count = newComplaints.length;
                
                // Update badge
                notificationBadge.textContent = count;
                notificationBadge.style.display = count > 0 ? 'flex' : 'none';
            } else {
                console.error('Failed to get recent complaints');
                notificationBadge.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            notificationBadge.style.display = 'none';
        });
}

// Show Notifications Dropdown
function showNotifications() {
    // Use API to get recent complaints
    fetch(`${API_BASE_URL}/api/admin.php?action=getRecentComplaints`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Filter for complaints in the last 24 hours
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                const newComplaints = data.data.filter(c => {
                    const complaintDate = new Date(c.created_at);
                    return complaintDate >= yesterday;
                }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                // Create notification dropdown
                let notificationDropdown = document.getElementById('notificationDropdown');
                
                if (!notificationDropdown) {
                    notificationDropdown = document.createElement('div');
                    notificationDropdown.id = 'notificationDropdown';
                    notificationDropdown.className = 'notifications-dropdown';
                    document.body.appendChild(notificationDropdown);
                }
                
                // Position dropdown relative to notification bell
                const bell = document.querySelector('.notification-bell');
                if (bell) {
                    const bellRect = bell.getBoundingClientRect();
                    notificationDropdown.style.position = 'fixed';
                    notificationDropdown.style.top = `${bellRect.bottom + 5}px`;
                    notificationDropdown.style.right = `${window.innerWidth - bellRect.right + 10}px`;
                }
                
                // Generate notification content
                let notificationHTML = `
                    <div class="notifications-header">
                        <h3>Notifications</h3>
                        <button id="markAllReadBtn" class="btn btn-sm btn-outline">Mark All Read</button>
                    </div>
                    <div class="notifications-body">
                `;
                
                if (newComplaints.length === 0) {
                    notificationHTML += `<div class="no-notifications">No new notifications</div>`;
                } else {
                    newComplaints.slice(0, 5).forEach(complaint => {
                        notificationHTML += `
                            <div class="notification-item">
                                <div class="notification-icon blue">
                                    <i class="fas fa-file-alt"></i>
                                </div>
                                <div class="notification-content">
                                    <div class="notification-title">New Complaint Filed</div>
                                    <div class="notification-details">Tracking ID: ${complaint.tracking_id}</div>
                                    <div class="notification-time">${timeAgo(new Date(complaint.created_at))}</div>
                                </div>
                                <button class="notification-action btn-sm btn-outline" data-id="${complaint.tracking_id}">
                                    View
                                </button>
                            </div>
                        `;
                    });
                }
                
                notificationHTML += `</div>`;
                
                notificationDropdown.innerHTML = notificationHTML;
                notificationDropdown.classList.add('active');
                
                // Add event listener to close when clicking outside
                document.addEventListener('click', function closeNotifications(e) {
                    if (!notificationDropdown.contains(e.target) && 
                        !e.target.closest('.notification-bell')) {
                        notificationDropdown.classList.remove('active');
                        document.removeEventListener('click', closeNotifications);
                    }
                });
                
                // Add event listeners to notification actions
                const actionButtons = notificationDropdown.querySelectorAll('.notification-action');
                actionButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const complaintId = btn.getAttribute('data-id');
                        showComplaintDetails(complaintId);
                        notificationDropdown.classList.remove('active');
                    });
                });
                
                // Mark all read button
                const markAllReadBtn = document.getElementById('markAllReadBtn');
                if (markAllReadBtn) {
                    markAllReadBtn.addEventListener('click', () => {
                        updateNotificationCount();
                        notificationDropdown.classList.remove('active');
                    });
                }
            } else {
                showToast('error', 'Failed to get notifications', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Failed to get notifications', 'A network error occurred');
        });
}

// Helper function to format time ago
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' years ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    
    if(seconds < 10) return 'just now';
    
    return Math.floor(seconds) + ' seconds ago';
}

// Dashboard Statistics Update
function updateDashboardStats() {
    // Use API to get dashboard stats
    fetch(`${API_BASE_URL}/api/admin.php?action=getDashboardStats`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const stats = data.data;
                
                // Update statistics display
                document.getElementById('totalChargersCount').textContent = stats.totalChargers;
                document.getElementById('activeUsersCount').textContent = stats.activeUsers;
                document.getElementById('openComplaintsCount').textContent = stats.openComplaints;
                document.getElementById('resolutionRateValue').textContent = stats.resolutionRate;
                
                // Update trend indicators
                document.getElementById('chargersChange').textContent = stats.chargersChange;
                document.getElementById('usersChange').textContent = stats.usersChange;
                document.getElementById('complaintsChange').textContent = stats.complaintsChange;
                document.getElementById('resolutionChange').textContent = stats.resolutionChange;
            } else {
                console.error('Failed to get dashboard stats:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Load Recent Complaints
function loadRecentComplaints() {
    const tableBody = document.querySelector('#recentComplaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    
    // Use API to get recent complaints
    fetch(`${API_BASE_URL}/api/admin.php?action=getRecentComplaints`)
        .then(response => response.json())
        .then(data => {
            // Clear loading state
            tableBody.innerHTML = '';
            
            if (data.success) {
                const complaints = data.data;
                
                if (complaints.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No complaints found</td></tr>';
                    return;
                }
                
                // Add complaints to table
                complaints.forEach(complaint => {
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${complaint.tracking_id}</td>
                        <td>${complaint.charger_id}</td>
                        <td>${complaint.division || 'Unassigned'}</td>
                        <td>${complaint.type}${complaint.sub_type ? ' - ' + complaint.sub_type : ''}</td>
                        <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
                        <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-complaint-btn" data-id="${complaint.tracking_id}">
                                View Details
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
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="7" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading complaints</td></tr>';
        });
    
    // View all complaints link
    const viewAllLink = document.getElementById('viewAllComplaintsLink');
    if (viewAllLink) {
        viewAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Switch to all complaints tab
            const allComplaintsTab = document.querySelector('.sidebar-item[data-section="allComplaints"]');
            if (allComplaintsTab) {
                allComplaintsTab.click();
            }
        });
    }
}

// Helper function to get status class
function getStatusClass(status) {
    if (!status) return '';
    
    switch(status.toLowerCase()) {
        case 'open': return 'red';
        case 'in progress': return 'yellow';
        case 'pending resolution approval': return 'yellow';
        case 'resolved': return 'green';
        case 'closed': return 'green';
        default: return 'blue';
    }
}

// Helper function to get timeline status class
function getTimelineStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('resolved')) {
        return 'green';
    } else if (statusLower.includes('progress')) {
        return 'yellow';
    } else if (statusLower.includes('assigned')) {
        return 'blue';
    } else if (statusLower.includes('received') || statusLower.includes('submitted')) {
        return 'blue';
    } else {
        return '';
    }
}

// Helper function to get SLA priority class
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

// Show Complaint Details
function showComplaintDetails(trackingId) {
    // Use API to get complaint details
    fetch(`${API_BASE_URL}/api/admin.php?action=getComplaintDetails&id=${trackingId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const complaint = data.data.complaint;
                const timeline = data.data.timeline;
                const sla = data.data.sla;
                
                // Get modal
                const complaintModal = document.getElementById('complaintDetailsModal');
                if (!complaintModal) return;
                
                // Update modal body
                const modalBody = complaintModal.querySelector('.modal-body');
                
                modalBody.innerHTML = `
                    <div class="complaint-details-container">
                        <div class="complaint-header">
                            <div class="tracking-id">Tracking ID: <span class="highlight-text">${complaint.tracking_id}</span></div>
                            <div class="tracking-status">Status: <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></div>
                        </div>
                        
                        <div class="detail-section">
                            <h3>Complaint Information</h3>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <div class="detail-label">Charger ID:</div>
                                    <div class="detail-value">${complaint.charger_id}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Location:</div>
                                    <div class="detail-value">${complaint.charger_location || complaint.location || 'Unknown'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Division:</div>
                                    <div class="detail-value">${complaint.division || 'Unassigned'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Issue Type:</div>
                                    <div class="detail-value">${complaint.type}${complaint.sub_type ? ` - ${complaint.sub_type}` : ''}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Reported By:</div>
                                    <div class="detail-value">${complaint.consumer_name}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Contact:</div>
                                    <div class="detail-value">${complaint.consumer_phone} / ${complaint.consumer_email || 'N/A'}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Submitted On:</div>
                                    <div class="detail-value">${new Date(complaint.created_at).toLocaleString()}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Assigned To:</div>
                                    <div class="detail-value">${complaint.vendor_name || 'Not Assigned'}</div>
                                </div>
                            </div>
                            
                            <div class="description-section">
                                <div class="detail-label">Description:</div>
                                <div class="detail-value description">${complaint.description}</div>
                            </div>
                        </div>
                `;
                
                // Add SLA section if applicable
                if (sla) {
                    const slaClass = sla.isOverdue ? 'red' : 'green';
                    
                    modalBody.innerHTML += `
                        <div class="detail-section sla-info-section">
                            <h3>SLA Information</h3>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <div class="detail-label">Priority:</div>
                                    <div class="detail-value">
                                        <span class="sla-badge ${getSLAPriorityClass(sla.priority)}">${sla.priority.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Deadline:</div>
                                    <div class="detail-value">${new Date(sla.deadline).toLocaleString()}</div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Status:</div>
                                    <div class="detail-value">
                                        <span class="sla-status ${slaClass}">${sla.formattedStatus}</span>
                                    </div>
                                </div>
                                <div class="detail-item">
                                    <div class="detail-label">Time Remaining:</div>
                                    <div class="detail-value sla-timer ${sla.isOverdue ? 'overdue' : 'on-time'}" 
                                        data-deadline="${sla.deadline}" 
                                        data-id="${complaint.tracking_id}-detail">
                                        ${sla.timeRemaining}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }
                
                // Add timeline section
                modalBody.innerHTML += `
                        <div class="detail-section">
                            <h3>Timeline</h3>
                            <div class="tracking-timeline">
                `;
                
                // Add timeline events
                if (timeline && timeline.length > 0) {
                    timeline.forEach((event, index) => {
                        const statusClass = getTimelineStatusClass(event.status);
                        
                        modalBody.innerHTML += `
                            <div class="timeline-item">
                                <div class="timeline-icon ${statusClass}"></div>
                                <div class="timeline-content">
                                    <div class="timeline-title">${event.status}</div>
                                    <div class="timeline-date">${new Date(event.timestamp).toLocaleString()}</div>
                                    <div class="timeline-description">${event.description}</div>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    modalBody.innerHTML += `
                        <div class="timeline-item">
                            <div class="timeline-icon"></div>
                            <div class="timeline-content">
                                <div class="timeline-title">Complaint Received</div>
                                <div class="timeline-date">${new Date(complaint.created_at).toLocaleString()}</div>
                                <div class="timeline-description">Complaint has been registered in the system.</div>
                            </div>
                        </div>
                    `;
                }
                
                // Close timeline and detail sections
                modalBody.innerHTML += `
                            </div>
                        </div>
                    </div>
                `;
                
                // Update action buttons based on complaint status
                const assignBtn = document.getElementById('assignComplaintBtn');
                const updateStatusBtn = document.getElementById('updateStatusBtn');
                
                if (assignBtn) {
                    if (complaint.status.toLowerCase() === 'resolved') {
                        assignBtn.style.display = 'none';
                    } else {
                        assignBtn.style.display = 'block';
                        
                        // Remove existing event listeners
                        const newAssignBtn = assignBtn.cloneNode(true);
                        assignBtn.parentNode.replaceChild(newAssignBtn, assignBtn);
                        
                        // Add new event listener
                        newAssignBtn.addEventListener('click', () => {
                            complaintModal.classList.remove('active');
                            showAssignToDivisionModal(complaint.tracking_id);
                        });
                    }
                }
                
                if (updateStatusBtn) {
                    if (complaint.status.toLowerCase() === 'resolved' || complaint.status.toLowerCase() === 'closed') {
                        updateStatusBtn.style.display = 'none';
                    } else {
                        updateStatusBtn.style.display = 'block';
                        
                        // Remove existing event listeners
                        const newUpdateBtn = updateStatusBtn.cloneNode(true);
                        updateStatusBtn.parentNode.replaceChild(newUpdateBtn, updateStatusBtn);
                        
                        // Add new event listener
                        newUpdateBtn.addEventListener('click', () => {
                            complaintModal.classList.remove('active');
                            showUpdateStatusModal(complaint.tracking_id, complaint.status);
                        });
                    }
                }
                
                // Initialize SLA timers if any
                initializeSLATimers();
                
                // Show modal
                complaintModal.classList.add('active');
                
                // Setup close button handlers
                const closeButtons = complaintModal.querySelectorAll('#closeComplaintModal, #closeDetailsBtn');
                closeButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        complaintModal.classList.remove('active');
                    });
                });
            } else {
                showToast('error', 'Not Found', data.message || 'The requested complaint could not be found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error', 'Failed to load complaint details');
        });
}

// Initialize SLA Timers
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

// Update Timer Element
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

// Format Time Difference
function formatTimeDifference(timeDifference) {
    // Calculate time components
    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    
    // Format time string
    let timeString = '';
    
    if (days > 0) {
        timeString += `${days}d `;
    }
    
    timeString += `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    
    return timeString;
}

// Show Assign To Division Modal
function showAssignToDivisionModal(trackingId) {
    // Get modal
    const assignModal = document.getElementById('assignToDivisionModal');
    if (!assignModal) return;
    
    // Get divisions
    fetch(`${API_BASE_URL}/api/admin.php?action=getDivisions`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const divisions = data.data.filter(d => d.status === 'active');
                
                // Populate division select
                const divisionSelect = document.getElementById('divisionSelect');
                if (divisionSelect) {
                    // Clear existing options except first
                    while (divisionSelect.options.length > 1) {
                        divisionSelect.remove(1);
                    }
                    
                    // Add division options
                    divisions.forEach(division => {
                        const option = document.createElement('option');
                        option.value = division.name;
                        option.textContent = division.name;
                        divisionSelect.appendChild(option);
                    });
                }
                
                // Set complaint tracking ID
                document.getElementById('complaintTrackingId').value = trackingId;
                
                // Show modal
                assignModal.classList.add('active');
                
                // Setup close buttons
                const closeButtons = assignModal.querySelectorAll('#closeAssignModal, #cancelAssignBtn');
                closeButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        assignModal.classList.remove('active');
                    });
                });
                
                // Setup form submission
                const assignForm = document.getElementById('assignToDivisionForm');
                if (assignForm) {
                    // Remove existing listeners
                    const newForm = assignForm.cloneNode(true);
                    assignForm.parentNode.replaceChild(newForm, assignForm);
                    
                    // Add new listener
                    newForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        
                        const selectedDivision = document.getElementById('divisionSelect').value;
                        const assignmentNote = document.getElementById('assignmentNote').value;
                        const updateStatus = document.getElementById('updateStatusToInProgress').checked;
                        const complaintId = document.getElementById('complaintTrackingId').value;
                        
                        if (!selectedDivision) {
                            showToast('error', 'Division Required', 'Please select a division');
                            return;
                        }
                        
                        // Assign complaint
                        const assignData = {
                            action: 'assignComplaint',
                            trackingId: complaintId,
                            division: selectedDivision,
                            assignmentNote: assignmentNote,
                            updateStatus: updateStatus
                        };
                        
                        fetch(`${API_BASE_URL}/api/admin.php`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(assignData)
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Close modal
                                assignModal.classList.remove('active');
                                
                                // Show success message
                                showToast('success', 'Complaint Assigned', `Complaint has been assigned to ${selectedDivision}`);
                                
                                // Refresh tables
                                loadFilteredComplaints();
                                loadRecentComplaints();
                                updateNotificationCount();
                            } else {
                                showToast('error', 'Assignment Failed', data.message || 'Failed to assign complaint');
                            }
                        })
                        .catch(error => {
                            console.error('Error:', error);
                            showToast('error', 'Assignment Failed', 'A network error occurred');
                        });
                    });
                }
            } else {
                showToast('error', 'Failed to get divisions', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Failed to get divisions', 'A network error occurred');
        });
}

// Show Update Status Modal
function showUpdateStatusModal(trackingId, currentStatus) {
    // Get modal
    const statusModal = document.getElementById('updateStatusModal');
    if (!statusModal) return;
    
    // Update tracking ID and current status
    document.getElementById('statusTrackingId').textContent = trackingId;
    const currentStatusBadge = document.getElementById('currentStatusBadge');
    currentStatusBadge.textContent = currentStatus;
    currentStatusBadge.className = 'status-badge ' + getStatusClass(currentStatus);
    
    // Populate status options
    const newStatusSelect = document.getElementById('newStatus');
    if (newStatusSelect) {
        // Clear existing options except first
        while (newStatusSelect.options.length > 1) {
            newStatusSelect.remove(1);
        }
        
        // Define available statuses (exclude current status)
        const statuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        const availableStatuses = statuses.filter(status => 
            status.toLowerCase() !== currentStatus.toLowerCase()
        );
        
        // Add status options
        availableStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            newStatusSelect.appendChild(option);
        });
    }
    
    // Show modal
    statusModal.classList.add('active');
    
    // Setup close buttons
    const closeButtons = statusModal.querySelectorAll('#closeStatusModal, #cancelStatusBtn');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            statusModal.classList.remove('active');
        });
    });
    
    // Setup form submission
    const statusForm = document.getElementById('updateStatusForm');
    if (statusForm) {
        // Remove existing listeners
        const newForm = statusForm.cloneNode(true);
        statusForm.parentNode.replaceChild(newForm, statusForm);
        
        // Add new listener
        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newStatus = document.getElementById('newStatus').value;
            const statusNote = document.getElementById('statusNote').value;
            
            if (!newStatus) {
                showToast('error', 'Status Required', 'Please select a new status');
                return;
            }
            
            // Update complaint status
            const statusData = {
                action: 'updateComplaintStatus',
                trackingId: trackingId,
                newStatus: newStatus,
                statusNote: statusNote
            };
            
            fetch(`${API_BASE_URL}/api/admin.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(statusData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Close modal
                    statusModal.classList.remove('active');
                    
                    // Show success message
                    showToast('success', 'Status Updated', `Complaint status has been updated to ${newStatus}`);
                    
                    // Refresh tables
                    loadFilteredComplaints();
                    loadRecentComplaints();
                    updateNotificationCount();
                } else {
                    showToast('error', 'Status Update Failed', data.message || 'Failed to update complaint status');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('error', 'Status Update Failed', 'A network error occurred');
            });
        });
    }
}

// Setup Vendor Management
function setupVendorManagement() {
    // Add Vendor Button
    const addVendorBtn = document.getElementById('addVendorBtn');
    if (addVendorBtn) {
        addVendorBtn.addEventListener('click', () => {
            // Populate service areas in the form
            populateServiceAreas();
            
            // Reset form to add mode
            resetVendorForm();
            
            // Show modal
            document.getElementById('addVendorModal').classList.add('active');
        });
    }
    
    // Close Vendor Modal
    const closeVendorModal = document.getElementById('closeVendorModal');
    const cancelVendorBtn = document.getElementById('cancelVendorBtn');
    
    if (closeVendorModal) {
        closeVendorModal.addEventListener('click', () => {
            document.getElementById('addVendorModal').classList.remove('active');
        });
    }
    
    if (cancelVendorBtn) {
        cancelVendorBtn.addEventListener('click', () => {
            document.getElementById('addVendorModal').classList.remove('active');
        });
    }
    
    // Add Vendor Form Submission
    const addVendorForm = document.getElementById('addVendorForm');
    if (addVendorForm) {
        addVendorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const vendorName = document.getElementById('vendorName').value;
            const contactPerson = document.getElementById('contactPerson').value;
            const vendorEmail = document.getElementById('vendorEmail').value;
            const vendorPhone = document.getElementById('vendorPhone').value;
            const vendorAddress = document.getElementById('vendorAddress').value;
            const vendorUsername = document.getElementById('vendorUsername')?.value;
            const vendorPassword = document.getElementById('vendorPassword')?.value;
            const vendorStatus = document.getElementById('vendorStatus').value;
            
            // Get selected service areas
            const serviceAreas = [];
            const checkboxes = document.querySelectorAll('#vendorServiceAreas input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                serviceAreas.push(checkbox.value);
            });
            
            if (serviceAreas.length === 0) {
                showToast('error', 'Validation Error', 'Please select at least one service area');
                return;
            }
            
            // Check if this is an edit operation
            const isEditing = addVendorForm.hasAttribute('data-vendor-id');
            const vendorId = addVendorForm.getAttribute('data-vendor-id');
            
            if (isEditing) {
                // Update existing vendor
                const vendorData = {
                    action: 'updateVendor',
                    id: vendorId,
                    name: vendorName,
                    contactPerson: contactPerson,
                    email: vendorEmail,
                    phone: vendorPhone,
                    address: vendorAddress,
                    serviceAreas: serviceAreas,
                    status: vendorStatus
                };
                
                fetch(`${API_BASE_URL}/api/admin.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(vendorData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Close modal and reset form
                        document.getElementById('addVendorModal').classList.remove('active');
                        resetVendorForm();
                        
                        // Show success message
                        showToast('success', 'Vendor Updated', `${vendorName} has been successfully updated`);
                        
                        // Refresh vendors table
                        loadVendorsTable();
                        
                        // Update dashboard stats
                        updateDashboardStats();
                    } else {
                        showToast('error', 'Update Failed', data.message || 'Failed to update vendor');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('error', 'Update Failed', 'A network error occurred');
                });
            } else {
                // Add new vendor
                if (!vendorUsername || !vendorPassword) {
                    showToast('error', 'Validation Error', 'Username and password are required');
                    return;
                }
                
                const vendorData = {
                    action: 'addVendor',
                    name: vendorName,
                    contactPerson: contactPerson,
                    email: vendorEmail,
                    phone: vendorPhone,
                    address: vendorAddress,
                    serviceAreas: serviceAreas,
                    username: vendorUsername,
                    password: vendorPassword,
                    status: vendorStatus
                };
                
                fetch(`${API_BASE_URL}/api/admin.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(vendorData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Close modal and reset form
                        document.getElementById('addVendorModal').classList.remove('active');
                        resetVendorForm();
                        
                        // Show success message
                        showToast('success', 'Vendor Added', `${vendorName} has been successfully added to the system`);
                        
                        // Refresh vendors table
                        loadVendorsTable();
                        
                        // Update dashboard stats
                        updateDashboardStats();
                    } else {
                        showToast('error', 'Addition Failed', data.message || 'Failed to add vendor');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('error', 'Addition Failed', 'A network error occurred');
                });
            }
        });
    }
    
    // Load Vendors Table
    loadVendorsTable();
}

// Populate Service Areas
function populateServiceAreas() {
    const serviceAreasContainer = document.getElementById('vendorServiceAreas');
    if (!serviceAreasContainer) return;
    
    // Clear existing options
    serviceAreasContainer.innerHTML = '';
    
    // Get divisions
    fetch(`${API_BASE_URL}/api/admin.php?action=getDivisions`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const divisions = data.data.filter(d => d.status === 'active');
                
                if (divisions.length === 0) {
                    // No divisions available, show a message
                    serviceAreasContainer.innerHTML = '<p class="no-vendors-message">No divisions available. Please create divisions first.</p>';
                    return;
                }
                
                // Add checkbox for each division
                divisions.forEach(division => {
                    const checkbox = document.createElement('div');
                    checkbox.className = 'checkbox-label';
                    
                    checkbox.innerHTML = `
                        <input type="checkbox" id="area-${division.id}" name="serviceAreas" value="${division.name}">
                        <label for="area-${division.id}">${division.name}</label>
                    `;
                    
                    serviceAreasContainer.appendChild(checkbox);
                });
            } else {
                serviceAreasContainer.innerHTML = '<p class="no-vendors-message">Failed to load divisions. Please try again.</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            serviceAreasContainer.innerHTML = '<p class="no-vendors-message">Failed to load divisions due to a network error.</p>';
        });
}

// Reset Vendor Form
function resetVendorForm() {
    const form = document.getElementById('addVendorForm');
    if (!form) return;
    
    // Reset form
    form.reset();
    
    // Reset form title
    const modalTitle = document.querySelector('#addVendorModal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Add New Vendor';
    }
    
    // Reset submit button text
    const submitButton = document.querySelector('#addVendorForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Vendor';
    }
    
    // Show username and password fields
    const usernameField = document.querySelector('#addVendorForm .form-row:nth-of-type(3)');
    if (usernameField) {
        usernameField.style.display = 'flex';
    }
    
    // Remove data attributes
    form.removeAttribute('data-vendor-id');
}

// Load Vendors Table
function loadVendorsTable() {
    const tableBody = document.querySelector('#vendorsTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
    
    // Get vendors from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getVendors`)
        .then(response => response.json())
        .then(data => {
            // Clear loading state
            tableBody.innerHTML = '';
            
            if (data.success) {
                const vendors = data.data;
                
                if (vendors.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No vendors found</td></tr>';
                    return;
                }
                
                // Add vendors to table
                vendors.forEach(vendor => {
                    const row = document.createElement('tr');
                    
                    // Format service areas
                    let serviceAreas = vendor.service_areas || '';
                    if (serviceAreas && typeof serviceAreas === 'string') {
                        // If it's a comma-separated string, keep it as is
                        // If it's a single value, it's fine too
                    } else if (Array.isArray(serviceAreas)) {
                        // If it's an array, join with commas
                        serviceAreas = serviceAreas.join(', ');
                    }
                    
                    row.innerHTML = `
                        <td>${vendor.id}</td>
                        <td>${vendor.name}</td>
                        <td>${vendor.contact_person || ''}</td>
                        <td>${vendor.email || ''}</td>
                        <td>${vendor.phone || ''}</td>
                        <td>${serviceAreas}</td>
                        <td><span class="status-badge ${vendor.status === 'active' ? 'green' : 'red'}">${vendor.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline vendor-view-btn" data-id="${vendor.id}">
                                View
                            </button>
                            <button class="btn btn-sm btn-primary vendor-edit-btn" data-id="${vendor.id}">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger vendor-delete-btn" data-id="${vendor.id}">
                                Delete
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Add event listeners to buttons
                tableBody.querySelectorAll('.vendor-view-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vendorId = btn.getAttribute('data-id');
                        showVendorDetails(vendorId);
                    });
                });
                
                tableBody.querySelectorAll('.vendor-delete-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vendorId = btn.getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this vendor?')) {
                            deleteVendor(vendorId);
                        }
                    });
                });
                
                tableBody.querySelectorAll('.vendor-edit-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const vendorId = btn.getAttribute('data-id');
                        showEditVendorModal(vendorId);
                    });
                });
            } else {
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading vendors</td></tr>';
        });
}

// Show Vendor Details
function showVendorDetails(vendorId) {
    // Get vendor data from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getVendorDetails&id=${vendorId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const vendor = data.data;
                
                // Create modal if doesn't exist
                let vendorModal = document.getElementById('vendorDetailsModal');
                
                if (!vendorModal) {
                    vendorModal = document.createElement('div');
                    vendorModal.id = 'vendorDetailsModal';
                    vendorModal.className = 'modal';
                    document.body.appendChild(vendorModal);
                }
                
                // Create modal content
                vendorModal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 class="modal-title">${vendor.name} Details</h2>
                            <button class="modal-close" id="closeVendorDetailsModal">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="detail-section">
                                <h3>Vendor Information</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="detail-label">Vendor ID:</div>
                                        <div class="detail-value">${vendor.id}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Contact Person:</div>
                                        <div class="detail-value">${vendor.contact_person || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Email:</div>
                                        <div class="detail-value">${vendor.email || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Phone:</div>
                                        <div class="detail-value">${vendor.phone || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Address:</div>
                                        <div class="detail-value">${vendor.address || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Service Areas:</div>
                                        <div class="detail-value">${vendor.service_areas || 'None'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Status:</div>
                                        <div class="detail-value">
                                            <span class="status-badge ${vendor.status === 'active' ? 'green' : 'red'}">
                                                ${vendor.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h3>Vendor Statistics</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="detail-label">Open Complaints:</div>
                                        <div class="detail-value">${vendor.open_complaints || 0}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Resolved Complaints:</div>
                                        <div class="detail-value">${vendor.resolved_complaints || 0}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Total Complaints:</div>
                                        <div class="detail-value">${vendor.total_complaints || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="editVendorDetailsBtn" data-id="${vendor.id}">Edit Vendor</button>
                            <button class="btn btn-secondary" id="closeVendorDetailsBtn">Close</button>
                        </div>
                    </div>
                `;
                
                // Show modal
                vendorModal.classList.add('active');
                
                // Add event listeners for buttons
                document.getElementById('closeVendorDetailsModal').addEventListener('click', () => {
                    vendorModal.classList.remove('active');
                });
                
                document.getElementById('closeVendorDetailsBtn').addEventListener('click', () => {
                    vendorModal.classList.remove('active');
                });
                
                document.getElementById('editVendorDetailsBtn').addEventListener('click', () => {
                    vendorModal.classList.remove('active');
                    showEditVendorModal(vendor.id);
                });
            } else {
                showToast('error', 'Not Found', data.message || 'The requested vendor could not be found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error', 'Failed to load vendor details');
        });
}

// Show Edit Vendor Modal
function showEditVendorModal(vendorId) {
    // Get vendor data from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getVendorDetails&id=${vendorId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const vendor = data.data;
                
                // Populate service areas in the form
                populateServiceAreas();
                
                // Need to wait for service areas to be populated before checking them
                setTimeout(() => {
                    // Fill form with vendor data
                    document.getElementById('vendorName').value = vendor.name;
                    document.getElementById('contactPerson').value = vendor.contact_person || '';
                    document.getElementById('vendorEmail').value = vendor.email || '';
                    document.getElementById('vendorPhone').value = vendor.phone || '';
                    document.getElementById('vendorAddress').value = vendor.address || '';
                    document.getElementById('vendorStatus').value = vendor.status;
                    
                    // Check service areas
                    if (vendor.service_areas) {
                        let areas = vendor.service_areas;
                        if (typeof areas === 'string') {
                            areas = areas.split(',').map(a => a.trim());
                        }
                        
                        areas.forEach(area => {
                            const checkbox = document.querySelector(`input[name="serviceAreas"][value="${area}"]`);
                            if (checkbox) {
                                checkbox.checked = true;
                            }
                        });
                    }
                    
                    // Change form title to indicate editing
                    const modalTitle = document.querySelector('#addVendorModal .modal-title');
                    if (modalTitle) {
                        modalTitle.textContent = 'Edit Vendor';
                    }
                    
                    // Change submit button text
                    const submitButton = document.querySelector('#addVendorForm button[type="submit"]');
                    if (submitButton) {
                        submitButton.textContent = 'Update Vendor';
                    }
                    
                    // Hide username and password fields
                    const usernameField = document.querySelector('#addVendorForm .form-row:nth-of-type(3)');
                    if (usernameField) {
                        usernameField.style.display = 'none';
                    }
                    
                    // Store vendor ID for updating
                    document.getElementById('addVendorForm').setAttribute('data-vendor-id', vendorId);
                    
                    // Show modal
                    document.getElementById('addVendorModal').classList.add('active');
                }, 300); // Wait for service areas to be populated
            } else {
                showToast('error', 'Not Found', data.message || 'The requested vendor could not be found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error', 'Failed to load vendor details');
        });
}

// Delete Vendor
function deleteVendor(vendorId) {
    // Delete vendor via API
    const vendorData = {
        action: 'deleteVendor',
        id: vendorId
    };
    
    fetch(`${API_BASE_URL}/api/admin.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(vendorData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('success', 'Vendor Deleted', 'Vendor has been successfully removed');
            loadVendorsTable();
            
            // Update dashboard stats
            updateDashboardStats();
        } else {
            showToast('error', 'Deletion Failed', data.message || 'Failed to delete vendor');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('error', 'Deletion Failed', 'A network error occurred');
    });
}

// Setup Division Management
function setupDivisionManagement() {
    // Add Division Button
    const addDivisionBtn = document.getElementById('addDivisionBtn');
    if (addDivisionBtn) {
        addDivisionBtn.addEventListener('click', () => {
            // Reset form to add mode
            resetDivisionForm();
            // Show modal
            document.getElementById('addDivisionModal').classList.add('active');
        });
    }
    
    // Close Division Modal
    const closeDivisionModal = document.getElementById('closeDivisionModal');
    const cancelDivisionBtn = document.getElementById('cancelDivisionBtn');
    
    if (closeDivisionModal) {
        closeDivisionModal.addEventListener('click', () => {
            document.getElementById('addDivisionModal').classList.remove('active');
        });
    }
    
    if (cancelDivisionBtn) {
        cancelDivisionBtn.addEventListener('click', () => {
            document.getElementById('addDivisionModal').classList.remove('active');
        });
    }
    
    // Add Division Form Submission
    const addDivisionForm = document.getElementById('addDivisionForm');
    if (addDivisionForm) {
        addDivisionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const divisionName = document.getElementById('divisionName').value;
            const managerName = document.getElementById('managerName').value;
            const divisionEmail = document.getElementById('divisionEmail').value;
            const divisionPhone = document.getElementById('divisionPhone').value;
            const divisionAddress = document.getElementById('divisionAddress').value;
            const divisionUsername = document.getElementById('divisionUsername')?.value;
            const divisionPassword = document.getElementById('divisionPassword')?.value;
            const divisionStatus = document.getElementById('divisionStatus').value;
            
            // Check if this is an edit operation
            const divisionId = addDivisionForm.getAttribute('data-division-id');
            const isEditing = !!divisionId;
            
            if (isEditing) {
                // Update existing division
                const divisionData = {
                    action: 'updateDivision',
                    id: divisionId,
                    name: divisionName,
                    manager: managerName,
                    email: divisionEmail,
                    phone: divisionPhone,
                    address: divisionAddress,
                    status: divisionStatus
                };
                
                fetch(`${API_BASE_URL}/api/admin.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(divisionData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Close modal and reset form
                        document.getElementById('addDivisionModal').classList.remove('active');
                        resetDivisionForm();
                        
                        // Show success message
                        showToast('success', 'Division Updated', `${divisionName} has been successfully updated`);
                        
                        // Refresh divisions table
                        loadDivisionsTable();
                        
                        // Update dashboard stats
                        updateDashboardStats();
                    } else {
                        showToast('error', 'Update Failed', data.message || 'Failed to update division');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('error', 'Update Failed', 'A network error occurred');
                });
            } else {
                // Adding new division
                if (!divisionUsername || !divisionPassword) {
                    showToast('error', 'Validation Error', 'Username and password are required');
                    return;
                }
                
                const divisionData = {
                    action: 'addDivision',
                    name: divisionName,
                    manager: managerName,
                    email: divisionEmail,
                    phone: divisionPhone,
                    address: divisionAddress,
                    username: divisionUsername,
                    password: divisionPassword,
                    status: divisionStatus
                };
                
                fetch(`${API_BASE_URL}/api/admin.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(divisionData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Close modal and reset form
                        document.getElementById('addDivisionModal').classList.remove('active');
                        resetDivisionForm();
                        
                        // Show success message
                        showToast('success', 'Division Added', `${divisionName} has been successfully added to the system`);
                        
                        // Refresh divisions table
                        loadDivisionsTable();
                        
                        // Update dashboard stats
                        updateDashboardStats();
                    } else {
                        showToast('error', 'Addition Failed', data.message || 'Failed to add division');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('error', 'Addition Failed', 'A network error occurred');
                });
            }
        });
    }
    
    // Load Divisions Table
    loadDivisionsTable();
}

// Reset Division Form
function resetDivisionForm() {
    const form = document.getElementById('addDivisionForm');
    if (!form) return;
    
    // Reset form
    form.reset();
    
    // Reset form title
    const modalTitle = document.querySelector('#addDivisionModal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Add Division User';
    }
    
    // Reset submit button text
    const submitButton = document.querySelector('#addDivisionForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Division';
    }
    
    // Show username and password fields
    const usernameField = document.querySelector('#addDivisionForm .form-row:nth-of-type(3)');
    if (usernameField) {
        usernameField.style.display = 'flex';
    }
    
    // Remove data attributes
    form.removeAttribute('data-division-id');
}

// Load Divisions Table
function loadDivisionsTable() {
    const tableBody = document.querySelector('#divisionsTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
    
    // Get divisions from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getDivisions`)
        .then(response => response.json())
        .then(data => {
            // Clear loading state
            tableBody.innerHTML = '';
            
            if (data.success) {
                const divisions = data.data;
                
                if (divisions.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No divisions found</td></tr>';
                    return;
                }
                
                // Add divisions to table
                divisions.forEach(division => {
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${division.id}</td>
                        <td>${division.name}</td>
                        <td>${division.manager || 'N/A'}</td>
                        <td>${division.email || 'N/A'}</td>
                        <td>${division.phone || 'N/A'}</td>
                        <td>${division.total_chargers || 0}</td>
                        <td><span class="status-badge ${division.status === 'active' ? 'green' : 'red'}">${division.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline division-view-btn" data-id="${division.id}">
                                View
                            </button>
                            <button class="btn btn-sm btn-primary division-edit-btn" data-id="${division.id}">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger division-delete-btn" data-id="${division.id}">
                                Delete
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Add event listeners to buttons
                tableBody.querySelectorAll('.division-view-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const divisionId = btn.getAttribute('data-id');
                        showDivisionDetails(divisionId);
                    });
                });
                
                tableBody.querySelectorAll('.division-delete-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const divisionId = btn.getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this division? This will remove all associated data.')) {
                            deleteDivision(divisionId);
                        }
                    });
                });
                
                tableBody.querySelectorAll('.division-edit-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const divisionId = btn.getAttribute('data-id');
                        showEditDivisionModal(divisionId);
                    });
                });
            } else {
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading divisions</td></tr>';
        });
}

// Show Division Details
function showDivisionDetails(divisionId) {
    // Get division data from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getDivisionDetails&id=${divisionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const division = data.data;
                
                // Create modal if doesn't exist
                let divisionModal = document.getElementById('divisionDetailsModal');
                
                if (!divisionModal) {
                    divisionModal = document.createElement('div');
                    divisionModal.id = 'divisionDetailsModal';
                    divisionModal.className = 'modal';
                    document.body.appendChild(divisionModal);
                }
                
                // Create modal content
                divisionModal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 class="modal-title">${division.name} Details</h2>
                            <button class="modal-close" id="closeDivisionDetailsModal">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="detail-section">
                                <h3>Division Information</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="detail-label">Division ID:</div>
                                        <div class="detail-value">${division.id}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Manager:</div>
                                        <div class="detail-value">${division.manager || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Email:</div>
                                        <div class="detail-value">${division.email || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Phone:</div>
                                        <div class="detail-value">${division.phone || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Address:</div>
                                        <div class="detail-value">${division.address || 'N/A'}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Total Chargers:</div>
                                        <div class="detail-value">${division.total_chargers || 0}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Status:</div>
                                        <div class="detail-value">
                                            <span class="status-badge ${division.status === 'active' ? 'green' : 'red'}">
                                                ${division.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h3>Division Statistics</h3>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="detail-label">Active Chargers:</div>
                                        <div class="detail-value">${division.active_chargers || 0}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Open Complaints:</div>
                                        <div class="detail-value">${division.open_complaints || 0}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Resolved Complaints:</div>
                                        <div class="detail-value">${division.resolved_complaints || 0}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Total Complaints:</div>
                                        <div class="detail-value">${division.total_complaints || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" id="editDivisionDetailsBtn" data-id="${division.id}">Edit Division</button>
                            <button class="btn btn-secondary" id="closeDivisionDetailsBtn">Close</button>
                        </div>
                    </div>
                `;
                
                // Show modal
                divisionModal.classList.add('active');
                
                // Add event listeners for buttons
                document.getElementById('closeDivisionDetailsModal').addEventListener('click', () => {
                    divisionModal.classList.remove('active');
                });
                
                document.getElementById('closeDivisionDetailsBtn').addEventListener('click', () => {
                    divisionModal.classList.remove('active');
                });
                
                document.getElementById('editDivisionDetailsBtn').addEventListener('click', () => {
                    divisionModal.classList.remove('active');
                    showEditDivisionModal(division.id);
                });
            } else {
                showToast('error', 'Not Found', data.message || 'The requested division could not be found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error', 'Failed to load division details');
        });
}

// Show Edit Division Modal
function showEditDivisionModal(divisionId) {
    // Get division data from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getDivisionDetails&id=${divisionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const division = data.data;
                
                // Fill form with division data
                document.getElementById('divisionName').value = division.name;
                document.getElementById('managerName').value = division.manager || '';
                document.getElementById('divisionEmail').value = division.email || '';
                document.getElementById('divisionPhone').value = division.phone || '';
                document.getElementById('divisionAddress').value = division.address || '';
                document.getElementById('divisionStatus').value = division.status;
                
                // Change form title to indicate editing
                const modalTitle = document.querySelector('#addDivisionModal .modal-title');
                if (modalTitle) {
                    modalTitle.textContent = 'Edit Division';
                }
                
                // Change submit button text
                const submitButton = document.querySelector('#addDivisionForm button[type="submit"]');
                if (submitButton) {
                    submitButton.textContent = 'Update Division';
                }
                
                // Hide username and password fields
                const usernameField = document.querySelector('#addDivisionForm .form-row:nth-of-type(3)');
                if (usernameField) {
                    usernameField.style.display = 'none';
                }
                
                // Store division ID for updating
                document.getElementById('addDivisionForm').setAttribute('data-division-id', divisionId);
                
                // Show modal
                document.getElementById('addDivisionModal').classList.add('active');
            } else {
                showToast('error', 'Not Found', data.message || 'The requested division could not be found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error', 'Failed to load division details');
        });
}

// Delete Division
function deleteDivision(divisionId) {
    // Delete division via API
    const divisionData = {
        action: 'deleteDivision',
        id: divisionId
    };
    
    fetch(`${API_BASE_URL}/api/admin.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(divisionData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('success', 'Division Deleted', 'Division has been successfully removed');
            loadDivisionsTable();
            
            // Update dashboard stats
            updateDashboardStats();
        } else {
            showToast('error', 'Deletion Failed', data.message || 'Failed to delete division');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('error', 'Deletion Failed', 'A network error occurred');
    });
}

// Setup Charger Management
function setupChargerManagement() {
    // Add Charger Button
    const addChargerBtn = document.getElementById('addChargerBtn');
    if (addChargerBtn) {
        addChargerBtn.addEventListener('click', () => {
            // Populate divisions dropdown
            populateDivisionsDropdown();
            
            // Reset form to add mode
            resetChargerForm();
            
            // Show modal
            document.getElementById('addChargerModal').classList.add('active');
        });
    }
    
    // Bulk Upload Button
    const bulkUploadBtn = document.getElementById('bulkUploadBtn');
    if (bulkUploadBtn) {
        bulkUploadBtn.addEventListener('click', () => {
            // Show bulk upload modal
            document.getElementById('bulkUploadModal').classList.add('active');
        });
    }
    
    // Close Charger Modal
    const closeChargerModal = document.getElementById('closeChargerModal');
    const cancelChargerBtn = document.getElementById('cancelChargerBtn');
    
    if (closeChargerModal) {
        closeChargerModal.addEventListener('click', () => {
            document.getElementById('addChargerModal').classList.remove('active');
        });
    }
    
    if (cancelChargerBtn) {
        cancelChargerBtn.addEventListener('click', () => {
            document.getElementById('addChargerModal').classList.remove('active');
        });
    }
    
    // Close Bulk Upload Modal
    const closeBulkUploadModal = document.getElementById('closeBulkUploadModal');
    const cancelBulkUploadBtn = document.getElementById('cancelBulkUploadBtn');
    
    if (closeBulkUploadModal) {
        closeBulkUploadModal.addEventListener('click', () => {
            document.getElementById('bulkUploadModal').classList.remove('active');
        });
    }
    
    if (cancelBulkUploadBtn) {
        cancelBulkUploadBtn.addEventListener('click', () => {
            document.getElementById('bulkUploadModal').classList.remove('active');
        });
    }
    
    // Download Template Button
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadChargerTemplate);
    }
    
    // Setup charger filters
    setupChargerFilters();
    
    // Add Charger Form Submission
    const addChargerForm = document.getElementById('addChargerForm');
    if (addChargerForm) {
        addChargerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const chargerCPID = document.getElementById('chargerCPID').value.trim();
            const chargerSerialNumber = document.getElementById('chargerSerialNumber').value.trim();
            const chargerLocation = document.getElementById('chargerLocation').value.trim();
            const chargerMake = document.getElementById('chargerMake').value.trim();
            const chargerModel = document.getElementById('chargerModel').value.trim();
            const chargerDivision = document.getElementById('chargerDivision').value;
            const chargerType = document.getElementById('chargerType').value;
            const chargerAddress = document.getElementById('chargerAddress').value.trim();
            const chargerStatus = document.getElementById('chargerStatus').value;
            const qrCodeGeneration = document.getElementById('qrCodeGeneration').checked;
            
            // Basic validation
            if (!chargerCPID) {
                showToast('error', 'Validation Error', 'Charge Point ID is required');
                return;
            }
            
            if (!chargerLocation) {
                showToast('error', 'Validation Error', 'Location Name is required');
                return;
            }
            
            if (!chargerDivision) {
                showToast('error', 'Validation Error', 'Division is required');
                return;
            }
            
            // Check if editing or adding
            const isEditing = document.getElementById('chargerCPID').readOnly;
            
            if (isEditing) {
                // Update existing charger
                const chargerData = {
                    action: 'updateCharger',
                    cpid: chargerCPID,
                    serialNumber: chargerSerialNumber,
                    location: chargerLocation,
                    make: chargerMake,
                    model: chargerModel,
                    division: chargerDivision,
                    type: chargerType,
                    address: chargerAddress,
                    status: chargerStatus
                };
                
                fetch(`${API_BASE_URL}/api/admin.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(chargerData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Close modal and reset form
                        resetChargerForm();
                        document.getElementById('addChargerModal').classList.remove('active');
                        
                        // Show success message
                        showToast('success', 'Charger Updated', `Charger ${chargerCPID} has been successfully updated`);
                        
                        // Generate QR code if requested
                        if (qrCodeGeneration) {
                            generateChargerQRCode(chargerCPID, chargerLocation);
                        }
                        
                        // Refresh chargers table
                        loadFilteredChargers();
                        
                        // Update dashboard stats
                        updateDashboardStats();
                    } else {
                        showToast('error', 'Update Failed', data.message || 'Failed to update charger');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('error', 'Update Failed', 'A network error occurred');
                });
            } else {
                // Add new charger
                const chargerData = {
                    action: 'addCharger',
                    cpid: chargerCPID,
                    serialNumber: chargerSerialNumber,
                    location: chargerLocation,
                    make: chargerMake,
                    model: chargerModel,
                    division: chargerDivision,
                    type: chargerType,
                    address: chargerAddress,
                    status: chargerStatus
                };
                
                fetch(`${API_BASE_URL}/api/admin.php`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(chargerData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Close modal and reset form
                        resetChargerForm();
                        document.getElementById('addChargerModal').classList.remove('active');
                        
                        // Show success message
                        showToast('success', 'Charger Added', `Charger ${chargerCPID} has been successfully commissioned`);
                        
                        // Generate QR code if selected
                        if (qrCodeGeneration) {
                            generateChargerQRCode(chargerCPID, chargerLocation);
                        }
                        
                        // Refresh chargers table
                        loadFilteredChargers();
                        
                        // Update dashboard stats
                        updateDashboardStats();
                    } else {
                        showToast('error', 'Addition Failed', data.message || 'Failed to add charger');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('error', 'Addition Failed', 'A network error occurred');
                });
            }
        });
    }
    
    // Bulk Upload Form Submission
    const bulkUploadForm = document.getElementById('bulkUploadForm');
    if (bulkUploadForm) {
        bulkUploadForm.addEventListener('submit', handleBulkUpload);
    }
    
    // Load Chargers Table
    loadFilteredChargers();
}

// Download Charger Template
function downloadChargerTemplate() {
    // Create workbook with XLSX library
    if (typeof XLSX === 'undefined') {
        // If XLSX library is not loaded, load it
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => {
            createAndDownloadTemplate();
        };
        document.head.appendChild(script);
    } else {
        createAndDownloadTemplate();
    }
}

// Create and download Excel template
function createAndDownloadTemplate() {
    try {
        const wb = XLSX.utils.book_new();
        
        // Define headers for the template
        const headers = [
            'Charge Point ID',
            'Serial Number',
            'Location Name',
            'Division',
            'Make',
            'Model',
            'Charger Type',
            'Full Address',
            'Status'
        ];
        
        // Create worksheet with headers
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        
        // Get divisions for the example data
        fetch(`${API_BASE_URL}/api/admin.php?action=getDivisions`)
            .then(response => response.json())
            .then(data => {
                const divisions = data.success ? data.data : [];
                
                // Create example rows
                const exampleRows = [
                    [
                        'EVC-001',
                        'S12345',
                        'Central Mall',
                        divisions.length > 0 ? divisions[0].name : 'North Division',
                        'ABB',
                        'Terra 54',
                        'DC Fast Charger',
                        '123 Main Street, City',
                        'active'
                    ],
                    [
                        'EVC-002',
                        'S12346',
                        'Downtown Parking',
                        divisions.length > 0 ? divisions[0].name : 'North Division',
                        'ChargePoint',
                        'CT4000',
                        'AC Type 2',
                        '456 Park Avenue, City',
                        'active'
                    ]
                ];
                
                // Add example rows to worksheet
                XLSX.utils.sheet_add_aoa(ws, exampleRows, { origin: 1 });
                
                // Add worksheet to workbook
                XLSX.utils.book_append_sheet(wb, ws, 'Chargers Template');
                
                // Generate Excel file and trigger download
                XLSX.writeFile(wb, 'EV_Chargers_Template.xlsx');
            })
            .catch(error => {
                console.error('Error fetching divisions:', error);
                
                // Create example rows with default division
                const exampleRows = [
                    [
                        'EVC-001',
                        'S12345',
                        'Central Mall',
                        'North Division',
                        'ABB',
                        'Terra 54',
                        'DC Fast Charger',
                        '123 Main Street, City',
                        'active'
                    ],
                    [
                        'EVC-002',
                        'S12346',
                        'Downtown Parking',
                        'North Division',
                        'ChargePoint',
                        'CT4000',
                        'AC Type 2',
                        '456 Park Avenue, City',
                        'active'
                    ]
                ];
                
                // Add example rows to worksheet
                XLSX.utils.sheet_add_aoa(ws, exampleRows, { origin: 1 });
                
                // Add worksheet to workbook
                XLSX.utils.book_append_sheet(wb, ws, 'Chargers Template');
                
                // Generate Excel file and trigger download
                XLSX.writeFile(wb, 'EV_Chargers_Template.xlsx');
            });
    } catch (error) {
        console.error('Error creating template:', error);
        showToast('error', 'Template Download Failed', 'Could not create template file');
    }
}

// Handle Bulk Upload
function handleBulkUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('bulkExcelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('error', 'No File Selected', 'Please select an Excel file to upload');
        return;
    }
    
    // Check file extension
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt !== 'xlsx' && fileExt !== 'xls') {
        showToast('error', 'Invalid File', 'Please upload an Excel file (.xlsx or .xls)');
        return;
    }
    
    // Disable submit button and show loading
    const submitButton = document.querySelector('#bulkUploadForm button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    }
    
    // Create FormData
    const formData = new FormData();
    formData.append('action', 'bulkUploadChargers');
    formData.append('excelFile', file);
    
    // Send file to server
    fetch(`${API_BASE_URL}/api/admin.php`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Upload Chargers';
        }
        
        if (data.success) {
            // Close modal and reset form
            document.getElementById('bulkUploadForm').reset();
            document.getElementById('bulkUploadModal').classList.remove('active');
            
            // Show success message
            const successCount = data.data.addedCount || 0;
            const errorCount = data.data.errorCount || 0;
            const duplicateCount = data.data.duplicateCount || 0;
            
            const successMessage = successCount > 0 ? `${successCount} chargers successfully added. ` : '';
            const errorMessage = errorCount > 0 ? `${errorCount} chargers had errors. ` : '';
            const duplicateMessage = duplicateCount > 0 ? `${duplicateCount} duplicates found.` : '';
            
            showToast('success', 'Bulk Upload Complete', `${successMessage}${errorMessage}${duplicateMessage}`);
            
            // Show error details if any
            if (data.data.errors && data.data.errors.length > 0) {
                showBulkUploadErrors(data.data.errors);
            }
            
            // Refresh chargers table
            loadFilteredChargers();
            
            // Update dashboard stats
            updateDashboardStats();
        } else {
            showToast('error', 'Bulk Upload Failed', data.message || 'An error occurred during upload');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        
        // Reset submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Upload Chargers';
        }
        
        showToast('error', 'Upload Failed', 'A network error occurred');
    });
}

// Show Bulk Upload Errors
function showBulkUploadErrors(errorMessages) {
    if (!errorMessages || errorMessages.length === 0) return;
    
    // Create error modal if it doesn't exist
    let errorModal = document.getElementById('bulkUploadErrorModal');
    
    if (!errorModal) {
        errorModal = document.createElement('div');
        errorModal.id = 'bulkUploadErrorModal';
        errorModal.className = 'modal';
        document.body.appendChild(errorModal);
    }
    
    // Clear modal content
    errorModal.innerHTML = '';
    
    // Build modal content
    let modalContent = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Bulk Upload Errors</h2>
                <button class="modal-close" id="closeErrorModal">×</button>
            </div>
            <div class="modal-body">
                <div class="error-list">
                    <p>The following errors were encountered during bulk upload:</p>
                    <ul class="error-messages">
    `;
    
    // Add error messages
    errorMessages.forEach(error => {
        modalContent += `<li>${error}</li>`;
    });
    
    modalContent += `
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" id="closeErrorBtn">Close</button>
            </div>
        </div>
    `;
    
    errorModal.innerHTML = modalContent;
    
    // Show modal
    errorModal.classList.add('active');
    
    // Add event listeners
    document.getElementById('closeErrorModal').addEventListener('click', () => {
        errorModal.classList.remove('active');
    });
    
    document.getElementById('closeErrorBtn').addEventListener('click', () => {
        errorModal.classList.remove('active');
    });
}

// Populate Divisions Dropdown
function populateDivisionsDropdown() {
    const divisionsDropdown = document.getElementById('chargerDivision');
    if (!divisionsDropdown) return;
    
    // Clear existing options
    divisionsDropdown.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Division';
    divisionsDropdown.appendChild(defaultOption);
    
    // Get divisions from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getDivisions`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add active divisions
                data.data.filter(d => d.status === 'active').forEach(division => {
                    const option = document.createElement('option');
                    option.value = division.name;
                    option.textContent = division.name;
                    divisionsDropdown.appendChild(option);
                });
            } else {
                console.error('Failed to get divisions:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Setup Charger Filters
function setupChargerFilters() {
    // Populate division filter
    const divisionFilter = document.getElementById('chargerDivisionFilter');
    if (divisionFilter) {
        // Clear existing options except first
        while (divisionFilter.options.length > 1) {
            divisionFilter.remove(1);
        }
        
        // Get divisions from API
        fetch(`${API_BASE_URL}/api/admin.php?action=getDivisions`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Add active divisions
                    data.data.filter(d => d.status === 'active').forEach(division => {
                        const option = document.createElement('option');
                        option.value = division.name;
                        option.textContent = division.name;
                        divisionFilter.appendChild(option);
                    });
                } else {
                    console.error('Failed to get divisions:', data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
    
    // Apply filters button
    const applyFilters = document.getElementById('applyChargerFilters');
    if (applyFilters) {
        applyFilters.addEventListener('click', () => {
            loadFilteredChargers();
        });
    }
    
    // Reset filters button
    const resetFilters = document.getElementById('resetChargerFilters');
    if (resetFilters) {
        resetFilters.addEventListener('click', () => {
            // Reset filter inputs
            const statusFilter = document.getElementById('chargerStatusFilter');
            const divisionFilter = document.getElementById('chargerDivisionFilter');
            const typeFilter = document.getElementById('chargerTypeFilter');
            const search = document.getElementById('chargerSearch');
            
            if (statusFilter) statusFilter.value = 'all';
            if (divisionFilter) divisionFilter.value = 'all';
            if (typeFilter) typeFilter.value = 'all';
            if (search) search.value = '';
            
            // Load unfiltered chargers
            loadFilteredChargers();
        });
    }
    
    // Setup pagination
    setupChargerPagination();
}

// Setup Charger Pagination
function setupChargerPagination() {
    const prevPageBtn = document.getElementById('prevChargerPage');
    const nextPageBtn = document.getElementById('nextChargerPage');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            const filters = getChargerFilters();
            const currentPage = parseInt(document.getElementById('currentChargerPage').textContent);
            
            if (currentPage > 1) {
                loadFilteredChargers(currentPage - 1, filters);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const filters = getChargerFilters();
            const currentPage = parseInt(document.getElementById('currentChargerPage').textContent);
            const totalPages = parseInt(document.getElementById('totalChargerPages').textContent);
            
            if (currentPage < totalPages) {
                loadFilteredChargers(currentPage + 1, filters);
            }
        });
    }
}

// Get Charger Filters
function getChargerFilters() {
    return {
        status: document.getElementById('chargerStatusFilter')?.value || 'all',
        division: document.getElementById('chargerDivisionFilter')?.value || 'all',
        type: document.getElementById('chargerTypeFilter')?.value || 'all',
        search: document.getElementById('chargerSearch')?.value || ''
    };
}

// Load Filtered Chargers
function loadFilteredChargers(page = 1, filterOverrides = null) {
    const tableBody = document.querySelector('#chargersTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Loading...</td></tr>';
    
    // Get filter values
    const filters = filterOverrides || getChargerFilters();
    
    // Prepare filter data for API
    const filterData = {
        ...filters,
        page: page,
        itemsPerPage: 10
    };
    
    // Get filtered chargers from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getChargers&filter=${encodeURIComponent(JSON.stringify(filterData))}`)
        .then(response => response.json())
        .then(data => {
            // Clear loading state
            tableBody.innerHTML = '';
            
            if (data.success) {
                const chargers = data.data.chargers;
                const pagination = data.data.pagination;
                
                if (chargers.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No chargers found</td></tr>';
                    return;
                }
                
                // Update pagination info
                document.getElementById('currentChargerPage').textContent = pagination.currentPage;
                document.getElementById('totalChargerPages').textContent = pagination.totalPages || 1;
                
                // Enable/disable pagination buttons
                document.getElementById('prevChargerPage').disabled = pagination.currentPage <= 1;
                document.getElementById('nextChargerPage').disabled = pagination.currentPage >= pagination.totalPages;
                
                // Add chargers to table
                chargers.forEach(charger => {
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${charger.cpid}</td>
                        <td>${charger.serial_number || 'N/A'}</td>
                        <td>${charger.location || 'Unknown'}</td>
                        <td>${charger.make || 'N/A'}</td>
                        <td>${charger.model || 'N/A'}</td>
                        <td>${charger.division_name || 'Unassigned'}</td>
                        <td><span class="status-badge ${getChargerStatusClass(charger.status)}">${charger.status || 'Unknown'}</span></td>
                        <td>${charger.created_at ? new Date(charger.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-charger-btn" data-id="${charger.cpid}">
                                View
                            </button>
                            <button class="btn btn-sm btn-primary edit-charger-btn" data-id="${charger.cpid}">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger delete-charger-btn" data-id="${charger.cpid}">
                                Delete
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Add event listeners to buttons
                tableBody.querySelectorAll('.view-charger-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const chargerId = btn.getAttribute('data-id');
                        showChargerDetails(chargerId);
                    });
                });
                
                tableBody.querySelectorAll('.delete-charger-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const chargerId = btn.getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this charger? This may affect associated complaints.')) {
                            deleteCharger(chargerId);
                        }
                    });
                });
                
                tableBody.querySelectorAll('.edit-charger-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const chargerId = btn.getAttribute('data-id');
                        showEditChargerModal(chargerId);
                    });
                });
            } else {
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="9" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Error loading chargers</td></tr>';
        });
}

// Reset Charger Form
function resetChargerForm() {
    const form = document.getElementById('addChargerForm');
    if (!form) return;
    
    // Reset form
    form.reset();
    
    // Enable ID field
    document.getElementById('chargerCPID').readOnly = false;
    
    // Reset form title
    const modalTitle = document.querySelector('#addChargerModal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Commission New Charger';
    }
    
    // Reset submit button text
    const submitButton = document.querySelector('#addChargerForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Commission Charger';
    }
    
    // Remove data attributes
    form.removeAttribute('data-original-division');
}

// Show Charger Details
function showChargerDetails(chargerId) {
    // Get charger data from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getChargerDetails&id=${chargerId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const charger = data.data.charger;
                const complaints = data.data.complaints;
                
                // Update modal with charger details
                document.getElementById('detailCPID').textContent = charger.cpid;
                document.getElementById('detailSerialNumber').textContent = charger.serial_number || 'N/A';
                document.getElementById('detailLocation').textContent = charger.location || 'Unknown';
                document.getElementById('detailMakeModel').textContent = 
                    (charger.make && charger.model) ? `${charger.make} ${charger.model}` : 
                    (charger.make || charger.model || 'N/A');
                document.getElementById('detailDivision').textContent = charger.division_name || 'Unassigned';
                
                const statusElement = document.getElementById('detailStatus');
                statusElement.textContent = charger.status || 'Unknown';
                statusElement.className = 'info-value';
                statusElement.classList.add(getChargerStatusClass(charger.status));
                
                document.getElementById('detailCommissionDate').textContent = 
                    charger.created_at ? new Date(charger.created_at).toLocaleDateString() : 'N/A';
                
                // Load complaint history for this charger
                loadChargerComplaintHistory(complaints);
                
                // Setup action buttons
                const editChargerBtn = document.getElementById('editChargerBtn');
                if (editChargerBtn) {
                    // Remove existing event listeners
                    const newBtn = editChargerBtn.cloneNode(true);
                    editChargerBtn.parentNode.replaceChild(newBtn, editChargerBtn);
                    
                    // Add new event listener
                    newBtn.addEventListener('click', () => {
                        document.getElementById('chargerDetailsModal').classList.remove('active');
                        showEditChargerModal(chargerId);
                    });
                }
                
                const printChargerQRBtn = document.getElementById('printChargerQRBtn');
                if (printChargerQRBtn) {
                    // Remove existing event listeners
                    const newBtn = printChargerQRBtn.cloneNode(true);
                    printChargerQRBtn.parentNode.replaceChild(newBtn, printChargerQRBtn);
                    
                    // Add new event listener
                    newBtn.addEventListener('click', () => {
                        generateChargerQRCode(charger.cpid, charger.location);
                    });
                }
                
                // Show modal
                document.getElementById('chargerDetailsModal').classList.add('active');
                
                // Setup close buttons
                const closeButtons = document.querySelectorAll('#closeChargerDetailsModal, #closeChargerDetailBtn');
                closeButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.getElementById('chargerDetailsModal').classList.remove('active');
                    });
                });
            } else {
                showToast('error', 'Not Found', data.message || 'The requested charger could not be found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error', 'Failed to load charger details');
        });
}

// Load Charger Complaint History
function loadChargerComplaintHistory(complaints) {
    const tableBody = document.querySelector('#chargerComplaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    if (!complaints || complaints.length === 0) {
        // Show no data message
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No complaint history found</td></tr>';
        return;
    }
    
    // Add complaints to table
    complaints.forEach(complaint => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${complaint.tracking_id}</td>
            <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
            <td>${complaint.type}${complaint.sub_type ? ' - ' + complaint.sub_type : ''}</td>
            <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
            <td>${formatResolutionTime(complaint)}</td>
            <td>
                <button class="btn btn-sm btn-outline view-complaint-from-charger-btn" data-id="${complaint.tracking_id}">
                    View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    tableBody.querySelectorAll('.view-complaint-from-charger-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const trackingId = btn.getAttribute('data-id');
            
            // Close charger details modal first
            document.getElementById('chargerDetailsModal').classList.remove('active');
            
            // Show complaint details
            showComplaintDetails(trackingId);
        });
    });
}

// Format Resolution Time
function formatResolutionTime(complaint) {
    if (complaint.status !== 'Resolved' || !complaint.resolution_time) {
        return '-';
    }
    
    const hours = complaint.resolution_time;
    
    if (hours < 24) {
        return `${hours} hours`;
    } else {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        
        if (remainingHours === 0) {
            return `${days} days`;
        } else {
            return `${days} days, ${remainingHours} hours`;
        }
    }
}

// Delete Charger
function deleteCharger(chargerId) {
    // Delete charger via API
    const chargerData = {
        action: 'deleteCharger',
        cpid: chargerId
    };
    
    fetch(`${API_BASE_URL}/api/admin.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(chargerData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('success', 'Charger Deleted', 'Charger has been successfully removed');
            loadFilteredChargers();
            
            // Update dashboard stats
            updateDashboardStats();
        } else {
            showToast('error', 'Deletion Failed', data.message || 'Failed to delete charger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('error', 'Deletion Failed', 'A network error occurred');
    });
}

// Show Edit Charger Modal
function showEditChargerModal(chargerId) {
    // Get charger data from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getChargerDetails&id=${chargerId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const charger = data.data.charger;
                
                // Populate divisions dropdown
                populateDivisionsDropdown();
                
                // Wait for dropdown to be populated
                setTimeout(() => {
                    // Fill form with charger data
                    document.getElementById('chargerCPID').value = charger.cpid;
                    document.getElementById('chargerCPID').readOnly = true; // Prevent changing ID
                    document.getElementById('chargerSerialNumber').value = charger.serial_number || '';
                    document.getElementById('chargerLocation').value = charger.location || '';
                    document.getElementById('chargerMake').value = charger.make || '';
                    document.getElementById('chargerModel').value = charger.model || '';
                    document.getElementById('chargerDivision').value = charger.division_name || '';
                    document.getElementById('chargerType').value = charger.type || '';
                    document.getElementById('chargerAddress').value = charger.address || '';
                    document.getElementById('chargerStatus').value = charger.status || '';
                    document.getElementById('qrCodeGeneration').checked = false;
                    
                    // Change form title to indicate editing
                    const modalTitle = document.querySelector('#addChargerModal .modal-title');
                    if (modalTitle) {
                        modalTitle.textContent = 'Edit Charger';
                    }
                    
                    // Change submit button text
                    const submitButton = document.querySelector('#addChargerForm button[type="submit"]');
                    if (submitButton) {
                        submitButton.textContent = 'Update Charger';
                    }
                    
                    // Store original division for updating counts later
                    document.getElementById('addChargerForm').setAttribute('data-original-division', charger.division_name || '');
                    
                    // Show modal
                    document.getElementById('addChargerModal').classList.add('active');
                }, 300); // Give time for divisions to load
            } else {
                showToast('error', 'Not Found', data.message || 'The requested charger could not be found');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('error', 'Error', 'Failed to load charger details');
        });
}

// Generate Charger QR Code
function generateChargerQRCode(chargerId, chargerLocation) {
    // Get QR code modal
    const qrCodeModal = document.getElementById('qrCodeModal');
    if (!qrCodeModal) return;
    
    // Set QR code info
    document.getElementById('qrCPID').textContent = chargerId;
    document.getElementById('qrLocation').textContent = chargerLocation || 'Unknown Location';
    
    // Generate QR code
    const qrCodeDisplay = document.getElementById('qrCodeDisplay');
    qrCodeDisplay.innerHTML = '';
    
    // Create canvas for QR code
    const canvas = document.createElement('canvas');
    qrCodeDisplay.appendChild(canvas);
    
    // Create QR code
    createQRCode(canvas, chargerId);
    
    // Show modal
    qrCodeModal.classList.add('active');
    
    // Setup close button
    document.getElementById('closeQRModal').addEventListener('click', () => {
        qrCodeModal.classList.remove('active');
    });
    
    // Setup download button
    document.getElementById('downloadQRBtn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `QR_${chargerId}.png`;
        link.click();
    });
    
    // Setup print button
    document.getElementById('printQRBtn').addEventListener('click', () => {
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html>
            <head>
                <title>Charger QR Code - ${chargerId}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 20px;
                    }
                    .qr-container {
                        margin: 20px auto;
                        max-width: 300px;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                    }
                    .charger-info {
                        margin-top: 10px;
                        font-size: 14px;
                    }
                    .charger-id {
                        font-weight: bold;
                        font-size: 18px;
                        margin-bottom: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <img src="${canvas.toDataURL('image/png')}" alt="Charger QR Code">
                    <div class="charger-info">
                        <div class="charger-id">Charger ID: ${chargerId}</div>
                        <div>Location: ${chargerLocation || 'Unknown'}</div>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    });
}

// Create QR Code
function createQRCode(canvas, content) {
    // Load QRious if needed
    if (typeof QRious === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
        script.onload = () => {
            new QRious({
                element: canvas,
                value: content,
                size: 250,
                level: 'H' // High error correction
            });
        };
        document.head.appendChild(script);
    } else {
        new QRious({
            element: canvas,
            value: content,
            size: 250,
            level: 'H' // High error correction
        });
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


// Setup Complaints Management
function setupComplaintsManagement() {
    // Setup filter buttons
    const applyFilters = document.getElementById('applyFilters');
    const resetFilters = document.getElementById('resetFilters');
    const exportBtn = document.getElementById('exportComplaintsBtn');
    
    if (applyFilters) {
        applyFilters.addEventListener('click', () => {
            loadFilteredComplaints();
        });
    }
    
    if (resetFilters) {
        resetFilters.addEventListener('click', () => {
            // Reset filter inputs
            const statusFilter = document.getElementById('statusFilter');
            const divisionFilter = document.getElementById('divisionFilter');
            const typeFilter = document.getElementById('typeFilter');
            const globalSearch = document.getElementById('globalSearch');
            const dateFrom = document.getElementById('dateFrom');
            const dateTo = document.getElementById('dateTo');
            
            if (statusFilter) statusFilter.value = 'all';
            if (divisionFilter) divisionFilter.value = 'all';
            if (typeFilter) typeFilter.value = 'all';
            if (globalSearch) globalSearch.value = '';
            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
            
            // Load unfiltered complaints
            loadFilteredComplaints();
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportComplaintsToExcel();
        });
    }
    
    // Populate division filter
    const divisionFilter = document.getElementById('divisionFilter');
    if (divisionFilter) {
        // Clear existing options except first
        while (divisionFilter.options.length > 1) {
            divisionFilter.remove(1);
        }
        
        // Get divisions from API
        fetch(`${API_BASE_URL}/api/admin.php?action=getDivisions`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Add division options
                    data.data.forEach(division => {
                        const option = document.createElement('option');
                        option.value = division.name;
                        option.textContent = division.name;
                        divisionFilter.appendChild(option);
                    });
                } else {
                    console.error('Failed to get divisions:', data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
    
    // Setup pagination
    setupComplaintsPagination();
    
    // Load complaints initially
    loadFilteredComplaints();
}

// Setup Complaints Pagination
function setupComplaintsPagination() {
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            const filters = getComplaintFilters();
            const currentPage = parseInt(document.getElementById('currentPage').textContent);
            
            if (currentPage > 1) {
                loadFilteredComplaints(currentPage - 1, filters);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const filters = getComplaintFilters();
            const currentPage = parseInt(document.getElementById('currentPage').textContent);
            const totalPages = parseInt(document.getElementById('totalPages').textContent);
            
            if (currentPage < totalPages) {
                loadFilteredComplaints(currentPage + 1, filters);
            }
        });
    }
}

// Get Complaint Filters
function getComplaintFilters() {
    return {
        status: document.getElementById('statusFilter')?.value || 'all',
        division: document.getElementById('divisionFilter')?.value || 'all',
        type: document.getElementById('typeFilter')?.value || 'all',
        search: document.getElementById('globalSearch')?.value || '',
        dateFrom: document.getElementById('dateFrom')?.value || '',
        dateTo: document.getElementById('dateTo')?.value || ''
    };
}

// Load Filtered Complaints
function loadFilteredComplaints(page = 1, filterOverrides = null) {
    const tableBody = document.querySelector('#complaintsTable tbody');
    if (!tableBody) return;
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Loading...</td></tr>';
    
    // Get filter values
    const filters = filterOverrides || getComplaintFilters();
    
    // Prepare filter data for API
    const filterData = {
        ...filters,
        page: page,
        itemsPerPage: 10
    };
    
   // Get filtered complaints from API
    fetch(`${API_BASE_URL}/api/admin.php?action=getComplaints&filter=${encodeURIComponent(JSON.stringify(filterData))}`)
        .then(response => response.json())
        .then(data => {
            // Clear loading state
            tableBody.innerHTML = '';
            
            if (data.success) {
                const complaints = data.data.complaints;
                const pagination = data.data.pagination;
                
                if (complaints.length === 0) {
                    // Show no data message
                    tableBody.innerHTML = '<tr><td colspan="10" class="text-center">No complaints found</td></tr>';
                    return;
                }
                
                // Update pagination info
                document.getElementById('currentPage').textContent = pagination.currentPage;
                document.getElementById('totalPages').textContent = pagination.totalPages || 1;
                
                // Enable/disable pagination buttons
                document.getElementById('prevPage').disabled = pagination.currentPage <= 1;
                document.getElementById('nextPage').disabled = pagination.currentPage >= pagination.totalPages;
                
                // Add complaints to table
                complaints.forEach(complaint => {
                    const row = document.createElement('tr');
                    
                    row.innerHTML = `
                        <td>${complaint.tracking_id}</td>
                        <td>${complaint.consumer_name}</td>
                        <td>${complaint.charger_id}</td>
                        <td>${complaint.division || 'Unassigned'}</td>
                        <td>${complaint.type}${complaint.sub_type ? ' - ' + complaint.sub_type : ''}</td>
                        <td><span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></td>
                        <td>${complaint.vendor_name || 'Not Assigned'}</td>
                        <td>${new Date(complaint.created_at).toLocaleDateString()}</td>
                        <td>${complaint.last_updated ? new Date(complaint.last_updated).toLocaleDateString() : '-'}</td>
                        <td>
                            <button class="btn btn-sm btn-outline view-admin-complaint-btn" data-id="${complaint.tracking_id}">
                                View
                            </button>
                            <button class="btn btn-sm btn-danger delete-complaint-btn" data-id="${complaint.tracking_id}">
                                Delete
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Add event listeners to buttons
                tableBody.querySelectorAll('.view-admin-complaint-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const trackingId = btn.getAttribute('data-id');
                        showComplaintDetails(trackingId);
                    });
                });
                
                tableBody.querySelectorAll('.delete-complaint-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const trackingId = btn.getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this complaint?')) {
                            deleteComplaint(trackingId);
                        }
                    });
                });
            } else {
                // Show error message
                tableBody.innerHTML = `<tr><td colspan="10" class="text-center">Error: ${data.message}</td></tr>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            tableBody.innerHTML = '<tr><td colspan="10" class="text-center">Error loading complaints</td></tr>';
        });
}

// Delete Complaint
function deleteComplaint(trackingId) {
    // Delete complaint via API
    const complaintData = {
        action: 'deleteComplaint',
        trackingId: trackingId
    };
    
    fetch(`${API_BASE_URL}/api/admin.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(complaintData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('success', 'Complaint Deleted', 'Complaint has been successfully removed');
            loadFilteredComplaints();
            
            // Refresh recent complaints
            loadRecentComplaints();
            
            // Update dashboard stats
            updateDashboardStats();
            
            // Update notification count
            updateNotificationCount();
        } else {
            showToast('error', 'Deletion Failed', data.message || 'Failed to delete complaint');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('error', 'Deletion Failed', 'A network error occurred');
    });
}

// Export Complaints to Excel
function exportComplaintsToExcel() {
    // Get filters
    const filters = getComplaintFilters();
    
    // Show loading toast
    showToast('info', 'Export Started', 'Preparing to export complaints...');
    
    // Prepare API request
    const exportData = {
        action: 'exportComplaints',
        filters: filters
    };
    
    // Request export from API
    fetch(`${API_BASE_URL}/api/admin.php`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.blob();
    })
    .then(blob => {
        // Create object URL
        const url = window.URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0];
        a.download = `Complaints_${date}.xlsx`;
        
        // Add to document and trigger click
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success toast
        showToast('success', 'Export Complete', 'Complaints exported successfully');
    })
    .catch(error => {
        console.error('Error exporting complaints:', error);
        
        // Show error toast
        showToast('error', 'Export Failed', 'Failed to export complaints');
        
        // Fallback: Use client-side export
        clientSideExport();
    });
}

// Client-side export fallback
function clientSideExport() {
    // Check if XLSX is loaded
    if (typeof XLSX === 'undefined') {
        // Load XLSX library
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = function() {
            performClientSideExport();
        };
        document.head.appendChild(script);
    } else {
        performClientSideExport();
    }
}

// Perform client-side export
function performClientSideExport() {
    // Get filters
    const filters = getComplaintFilters();
    filters.itemsPerPage = 1000; // Get more items for export
    
    // Get complaints data
    fetch(`${API_BASE_URL}/api/admin.php?action=getComplaints&filter=${encodeURIComponent(JSON.stringify(filters))}`)
        .then(response => response.json())
        .then(data => {
            if (!data.success || !data.data.complaints) {
                showToast('error', 'Export Failed', 'No data available for export');
                return;
            }
            
            const complaints = data.data.complaints;
            
            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            
            // Define headers for the complaints sheet
            const headers = [
                'Tracking ID',
                'Customer Name',
                'Phone Number',
                'Email',
                'Charger ID',
                'Location',
                'Division',
                'Complaint Type',
                'Sub-Type',
                'Status',
                'Assigned To',
                'Created Date',
                'Last Updated',
                'Description'
            ];
            
            // Prepare data rows
            const dataRows = complaints.map(complaint => {
                return [
                    complaint.tracking_id,
                    complaint.consumer_name,
                    complaint.consumer_phone,
                    complaint.consumer_email || '',
                    complaint.charger_id,
                    complaint.charger_location || complaint.location || '',
                    complaint.division || '',
                    complaint.type,
                    complaint.sub_type || '',
                    complaint.status,
                    complaint.vendor_name || '',
                    new Date(complaint.created_at).toLocaleString(),
                    complaint.last_updated ? new Date(complaint.last_updated).toLocaleString() : '',
                    complaint.description
                ];
            });
            
            // Create worksheet with headers and data
            const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
            
            // Generate filename with current date
            const date = new Date().toISOString().split('T')[0];
            const filename = `Complaints_${date}.xlsx`;
            
            // Generate Excel file and trigger download
            XLSX.writeFile(wb, filename);
            
            // Show success toast
            showToast('success', 'Export Complete', 'Complaints exported successfully');
        })
        .catch(error => {
            console.error('Error exporting complaints:', error);
            showToast('error', 'Export Failed', 'Failed to export complaints');
        });
}

// Setup Settings Management
function setupSettingsManagement() {
    // General Settings Form
    const generalSettingsForm = document.getElementById('generalSettingsForm');
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const systemName = document.getElementById('systemName').value;
            const companyName = document.getElementById('companyName').value;
            const contactEmail = document.getElementById('contactEmail').value;
            const supportPhone = document.getElementById('supportPhone').value;
            
            // Prepare settings data
            const settingsData = {
                action: 'updateGeneralSettings',
                systemName,
                companyName,
                contactEmail,
                supportPhone
            };
            
            // Send settings to API
            fetch(`${API_BASE_URL}/api/admin.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('success', 'Settings Saved', 'General settings have been updated');
                } else {
                    showToast('error', 'Save Failed', data.message || 'Failed to save general settings');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('error', 'Save Failed', 'A network error occurred');
            });
        });
    }
    
    // Notification Settings Form
    const notificationSettingsForm = document.getElementById('notificationSettingsForm');
    if (notificationSettingsForm) {
        notificationSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const emailNotifications = document.querySelector('input[name="emailNotifications"]').checked;
            const smsNotifications = document.querySelector('input[name="smsNotifications"]').checked;
            const pushNotifications = document.querySelector('input[name="pushNotifications"]').checked;
            const notificationFrequency = document.getElementById('notificationFrequency').value;
            
            // Prepare settings data
            const settingsData = {
                action: 'updateNotificationSettings',
                emailNotifications,
                smsNotifications,
                pushNotifications,
                notificationFrequency
            };
            
            // Send settings to API
            fetch(`${API_BASE_URL}/api/admin.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('success', 'Settings Saved', 'Notification settings have been updated');
                } else {
                    showToast('error', 'Save Failed', data.message || 'Failed to save notification settings');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('error', 'Save Failed', 'A network error occurred');
            });
        });
    }
    
    // SLA Settings Form
    const slaSettingsForm = document.getElementById('slaSettingsForm');
    if (slaSettingsForm) {
        // Load current SLA settings
        loadSLASettings();
        
        slaSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const criticalSLA = parseInt(document.getElementById('criticalSLA').value);
            const highSLA = parseInt(document.getElementById('highSLA').value);
            const mediumSLA = parseInt(document.getElementById('mediumSLA').value);
            const lowSLA = parseInt(document.getElementById('lowSLA').value);
            
            // Validate inputs
            if (isNaN(criticalSLA) || isNaN(highSLA) || isNaN(mediumSLA) || isNaN(lowSLA)) {
                showToast('error', 'Invalid Input', 'Please enter valid numbers for all SLA times');
                return;
            }
            
            if (criticalSLA <= 0 || highSLA <= 0 || mediumSLA <= 0 || lowSLA <= 0) {
                showToast('error', 'Invalid Input', 'SLA times must be greater than zero');
                return;
            }
            
            // Prepare settings data
            const settingsData = {
                action: 'updateSLASettings',
                criticalSLA,
                highSLA,
                mediumSLA,
                lowSLA
            };
            
            // Send settings to API
            fetch(`${API_BASE_URL}/api/admin.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('success', 'Settings Saved', 'SLA settings have been updated');
                } else {
                    showToast('error', 'Save Failed', data.message || 'Failed to save SLA settings');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('error', 'Save Failed', 'A network error occurred');
            });
        });
    }
}

// Load SLA Settings
function loadSLASettings() {
    fetch(`${API_BASE_URL}/api/admin.php?action=getSLASettings`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const settings = data.data;
                
                // Populate form fields
                document.getElementById('criticalSLA').value = settings.critical_sla || 4;
                document.getElementById('highSLA').value = settings.high_sla || 12;
                document.getElementById('mediumSLA').value = settings.medium_sla || 24;
                document.getElementById('lowSLA').value = settings.low_sla || 48;
            } else {
                console.error('Failed to load SLA settings:', data.message);
                
                // Set default values
                document.getElementById('criticalSLA').value = 4;
                document.getElementById('highSLA').value = 12;
                document.getElementById('mediumSLA').value = 24;
                document.getElementById('lowSLA').value = 48;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Set default values
            document.getElementById('criticalSLA').value = 4;
            document.getElementById('highSLA').value = 12;
            document.getElementById('mediumSLA').value = 24;
            document.getElementById('lowSLA').value = 48;
        });
}