// EV Charging Complaint Management System - Login JavaScript
// Script version to force reload if cache detected
const APP_VERSION = '1.0.3';

// Force reload if cached
(function() {
    if (localStorage.getItem('appVersion') !== APP_VERSION) {
        localStorage.setItem('appVersion', APP_VERSION);
        window.location.reload(true);
    }
})();

// Constants
const APP_CONFIG = {
    version: APP_VERSION,
    defaultCredentials: {
        admin: { username: 'admin', password: 'admin123' }
    }
};

// Set the base URL for API - leave empty for same domain, or set to your domain if needed
const API_BASE_URL = '';

// DOM References
document.addEventListener('DOMContentLoaded', () => {
    // Setup login and tracking functionality
    setupLoginSystem();
    
    // Setup toast notification system
    setupToastSystem();
    
    // Check if URL contains #tracking to switch to tracking tab
    if (window.location.hash === '#tracking') {
        const trackingTab = document.getElementById('trackingTab');
        if (trackingTab) {
            trackingTab.click();
        }
    }
});

// Login function using API
function login(username, password, userType) {
    return new Promise((resolve, reject) => {
        // API request data
        const requestData = {
            username: username,
            password: password,
            userType: userType
        };
        
        console.log('Sending login request:', requestData);
        
        // Make API request
        fetch(`${API_BASE_URL}/api/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            console.log('Response status:', response.status);
            return response.json().catch(error => {
                console.error('Error parsing JSON:', error);
                throw new Error('Invalid response from server');
            });
        })
        .then(data => {
            console.log('Login response:', data);
            if (data.success) {
                // Store user data in session storage
                sessionStorage.setItem('currentUser', JSON.stringify(data.data));
                
                // For division user, also store division info
                if (userType === 'division' && data.data.divisionId) {
                    sessionStorage.setItem('currentDivision', JSON.stringify({
                        id: data.data.divisionId,
                        name: data.data.divisionName,
                        role: 'division'
                    }));
                }
                
                resolve(data.data);
            } else {
                reject(new Error(data.message || 'Login failed'));
            }
        })
        .catch(error => {
            console.error('Login request error:', error);
            reject(error);
        });
    });
}

// Logout function
function logout() {
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentDivision');
    window.location.href = 'index.html';
}

// Login System Setup
function setupLoginSystem() {
    const loginForm = document.getElementById('userLoginForm');
    const trackingForm = document.getElementById('trackComplaintForm');
    const loginTab = document.getElementById('loginTab');
    const trackingTab = document.getElementById('trackingTab');

    // Tab Switching
    if (loginTab && trackingTab) {
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            trackingTab.classList.remove('active');
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('trackingForm').classList.add('hidden');
            // Update URL hash
            window.location.hash = '';
        });

        trackingTab.addEventListener('click', () => {
            trackingTab.classList.add('active');
            loginTab.classList.remove('active');
            document.getElementById('trackingForm').classList.remove('hidden');
            document.getElementById('loginForm').classList.add('hidden');
            // Update URL hash
            window.location.hash = 'tracking';
        });
    }

    // Login Form Handler
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const userType = document.getElementById('userType').value;
            
            // Validate input
            if (!username || !password) {
                showToast('error', 'Missing Information', 'Please enter both username and password');
                return;
            }
            
            // Disable submit button and show loading state
            const submitButton = loginForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            }
            
            // Use default admin login if default credentials and no database yet
            // This is a fallback for the first login
            if (username === 'admin' && password === 'admin123' && userType === 'admin') {
                try {
                    // Try using localStorage as fallback for initial login
                    const defaultAdminUser = {
                        id: 1,
                        username: 'admin',
                        name: 'Administrator',
                        role: 'admin',
                        loginTime: new Date().toISOString()
                    };
                    
                    sessionStorage.setItem('currentUser', JSON.stringify(defaultAdminUser));
                    showToast('success', 'Login Successful', 'Welcome to Admin Dashboard');
                    
                    setTimeout(() => {
                        window.location.href = 'admin.html';
                    }, 1000);
                    
                    return;
                } catch (e) {
                    console.log('Fallback failed, continuing with API login');
                }
            }

            login(username, password, userType)
                .then(user => {
                    showToast('success', 'Login Successful', `Welcome to ${user.name || userType} Dashboard`);
                    
                    // Redirect based on user role after a short delay
                    setTimeout(() => {
                        switch(userType) {
                            case 'admin':
                                window.location.href = 'admin.html';
                                break;
                            case 'division':
                                window.location.href = 'division.html';
                                break;
                            case 'vendor':
                                window.location.href = 'vendor.html';
                                break;
                        }
                    }, 1000);
                })
                .catch(error => {
                    console.error('Login error:', error);
                    showToast('error', 'Login Failed', error.message || 'Invalid credentials');
                    
                    // Reset submit button
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Sign In';
                    }
                });
        });
    }

    // Tracking Form Handler
    if (trackingForm) {
        trackingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phoneNumber = document.getElementById('trackingId').value.trim();
            
            if (!phoneNumber) {
                showToast('error', 'Invalid Input', 'Please enter your phone number');
                return;
            }
            
            // Disable submit button and show loading state
            const submitButton = trackingForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tracking...';
            }
            
            // Track complaints by phone number
            trackComplaintsByPhone(phoneNumber)
                .then(() => {
                    // Reset submit button
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Track Complaints';
                    }
                })
                .catch(error => {
                    console.error('Tracking error:', error);
                    
                    // Reset submit button
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Track Complaints';
                    }
                    
                    showToast('error', 'Tracking Failed', error.message || 'Failed to track complaints');
                });
        });
    }
}

// Complaint Tracking Functions using API
function trackComplaintsByPhone(phoneNumber) {
    return new Promise((resolve, reject) => {
        // API request data
        const requestData = {
            action: 'trackComplaints',
            phoneNumber: phoneNumber
        };
        
        console.log('Sending tracking request:', requestData);
        
        // Make API request
        fetch(`${API_BASE_URL}/api/login.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            console.log('Tracking response status:', response.status);
            return response.json().catch(error => {
                console.error('Error parsing JSON:', error);
                throw new Error('Invalid response from server');
            });
        })
        .then(data => {
            console.log('Tracking response:', data);
            
            if (data.success) {
                displayTrackingResults(data.data);
                resolve();
            } else {
                showToast('error', 'No Complaints Found', data.message || 'We could not find any complaints associated with this phone number');
                reject(new Error(data.message || 'No complaints found'));
            }
        })
        .catch(error => {
            console.error('Tracking request error:', error);
            reject(error);
        });
    });
}

// Display tracking results
function displayTrackingResults(complaints) {
    const trackingResultSection = document.getElementById('trackingResultSection');
    const trackingResult = document.getElementById('trackingResult');

    if (trackingResultSection && trackingResult && complaints.length > 0) {
        trackingResultSection.classList.remove('hidden');

        // Generate header
        let resultHTML = `
            <div class="tracking-header">
                <h3>Your Complaints (${complaints.length})</h3>
                <p class="text-gray">Showing your ${complaints.length} most recent complaints</p>
            </div>
        `;
        
        // Generate complaint cards
        resultHTML += '<div class="complaint-cards">';
        
        complaints.forEach(complaint => {
            resultHTML += `
                <div class="complaint-card">
                    <div class="complaint-card-header">
                        <div class="complaint-info">
                            <div class="complaint-id">Tracking ID: <span class="highlight-text">${complaint.tracking_id}</span></div>
                            <div class="complaint-status">
                                <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span>
                            </div>
                        </div>
                        <div class="complaint-date">${new Date(complaint.created_at).toLocaleDateString()}</div>
                    </div>
                    <div class="complaint-card-content">
                        <div class="detail-row">
                            <div class="detail-label">Charger ID:</div>
                            <div class="detail-value">${complaint.charger_id}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Location:</div>
                            <div class="detail-value">${complaint.location || 'Not specified'}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Type:</div>
                            <div class="detail-value">${complaint.type}${complaint.sub_type ? ' - ' + complaint.sub_type : ''}</div>
                        </div>
                    </div>
                    <div class="complaint-card-footer">
                        <button class="btn btn-sm btn-outline view-simple-timeline-btn" data-id="${complaint.tracking_id}" data-complaint='${JSON.stringify(complaint)}'>
                            View Status <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        resultHTML += '</div>';
        
        trackingResult.innerHTML = resultHTML;
        trackingResultSection.scrollIntoView({ behavior: 'smooth' });
        
        // Add event listeners to timeline buttons
        const timelineButtons = document.querySelectorAll('.view-simple-timeline-btn');
        timelineButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                try {
                    const complaintData = JSON.parse(btn.getAttribute('data-complaint'));
                    showSimpleComplaintTimeline(complaintData);
                } catch (error) {
                    console.error('Error parsing complaint data:', error);
                    showToast('error', 'Error', 'Could not load complaint details');
                }
            });
        });
    }
}

// Show Simple Timeline for Consumers
function showSimpleComplaintTimeline(complaint) {
    if (!complaint) return;
    
    // Get modal element
    let timelineModal = document.getElementById('complaintTimelineModal');
    
    // Create a simplified timeline with key status changes
    const statusTimeline = [];
    
    // Always show submission as first event
    statusTimeline.push({
        status: 'Complaint Submitted',
        timestamp: complaint.created_at,
        description: 'Your complaint has been registered in our system.'
    });
    
    // Process timeline events from complaint data
    if (complaint.timeline && complaint.timeline.length > 0) {
        complaint.timeline.forEach(event => {
            // Skip the initial 'Complaint Received' event since we already added it
            if (event.status.toLowerCase() === 'complaint received') {
                return;
            }
            
            // Add other events with more consumer-friendly names
            let statusName = event.status;
            let statusDesc = event.description;
            
            // Improve status names for consumers
            if (event.status.toLowerCase().includes('assigned to vendor')) {
                statusName = 'Assigned to Vendor';
                statusDesc = 'Your complaint has been assigned to a service vendor for resolution.';
            }
            else if (event.status.toLowerCase().includes('site visit done')) {
                statusName = 'Site Visit Completed';
                statusDesc = 'A technician has visited the site to assess the issue.';
            }
            else if (event.status.toLowerCase().includes('pending resolution')) {
                statusName = 'Resolution in Review';
                statusDesc = 'The vendor has completed the work and the resolution is being verified.';
            }
            
            statusTimeline.push({
                status: statusName,
                timestamp: event.timestamp,
                description: statusDesc || `Your complaint status has been updated to ${statusName}.`
            });
        });
    }
    
    // If timeline is still empty (except for the initial event) and status is not 'Open',
    // add the current status as a timeline event
    if (statusTimeline.length === 1 && complaint.status.toLowerCase() !== 'open') {
        statusTimeline.push({
            status: complaint.status,
            timestamp: complaint.last_updated || complaint.created_at,
            description: `Your complaint status has been updated to ${complaint.status}.`
        });
    }
    
    // Generate timeline HTML with improved styling
    let timelineHTML = `
        <div class="tracking-header">
            <div class="tracking-id">Tracking ID: <span class="highlight-text">${complaint.tracking_id}</span></div>
            <div class="tracking-status">Status: <span class="status-badge ${getStatusClass(complaint.status)}">${complaint.status}</span></div>
        </div>
        
        <div class="consumer-tracking-timeline">
    `;
    
    // Add status events with better icons and colors
    statusTimeline.forEach((event, index) => {
        // Determine appropriate status class and icon
        let statusClass = '';
        let iconClass = '';
        
        if (event.status.toLowerCase().includes('resolved') || 
            event.status.toLowerCase().includes('resolution')) {
            statusClass = 'green';
            iconClass = 'fa-check-circle';
        } else if (event.status.toLowerCase().includes('assigned')) {
            statusClass = 'blue';
            iconClass = 'fa-user-plus';
        } else if (event.status.toLowerCase().includes('visit')) {
            statusClass = 'yellow';
            iconClass = 'fa-tools';
        } else if (event.status.toLowerCase().includes('submitted')) {
            statusClass = 'blue';
            iconClass = 'fa-file-alt';
        } else if (event.status.toLowerCase().includes('in progress')) {
            statusClass = 'yellow';
            iconClass = 'fa-spinner';
        } else {
            statusClass = 'blue';
            iconClass = 'fa-info-circle';
        }
        
        // Add completed class for past events
        const completedClass = index < statusTimeline.length - 1 ? 'completed' : '';
        
        timelineHTML += `
            <div class="consumer-timeline-item ${completedClass}">
                <div class="consumer-timeline-icon ${statusClass}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="consumer-timeline-content">
                    <div class="consumer-timeline-title">${event.status}</div>
                    <div class="consumer-timeline-date">${new Date(event.timestamp).toLocaleString()}</div>
                    <div class="consumer-timeline-description">${event.description}</div>
                </div>
            </div>
        `;
    });
    
    timelineHTML += `</div>`;
    
    // Update modal content
    const modalBody = timelineModal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = timelineHTML;
        
        // Add additional styles for consumer timeline if not already present
        if (!document.getElementById('consumer-timeline-styles')) {
            const consumerTimelineStyles = document.createElement('style');
            consumerTimelineStyles.id = 'consumer-timeline-styles';
            consumerTimelineStyles.textContent = `
                .consumer-tracking-timeline {
                    position: relative;
                    margin: 20px 0;
                    padding: 0;
                }
                
                .consumer-tracking-timeline:before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 20px;
                    height: 100%;
                    width: 4px;
                    background: #e0e0e0;
                }
                
                .consumer-timeline-item {
                    position: relative;
                    margin-bottom: 30px;
                    padding-left: 50px;
                }
                
                .consumer-timeline-item.completed .consumer-timeline-icon:after {
                    content: '';
                    position: absolute;
                    top: 40px;
                    left: 20px;
                    height: calc(100% + 30px);
                    width: 4px;
                    background: #4CAF50;
                }
                
                .consumer-timeline-icon {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    text-align: center;
                    line-height: 40px;
                    background: white;
                    border: 4px solid #ccc;
                    z-index: 1;
                }
                
                .consumer-timeline-icon.blue {
                    border-color: #2196F3;
                }
                
                .consumer-timeline-icon.green {
                    border-color: #4CAF50;
                }
                
                .consumer-timeline-icon.yellow {
                    border-color: #FFC107;
                }
                
                .consumer-timeline-icon.red {
                    border-color: #F44336;
                }
                
                .consumer-timeline-icon i {
                    font-size: 20px;
                    color: #555;
                }
                
                .consumer-timeline-content {
                    background: #f9f9f9;
                    padding: 15px;
                    border-radius: 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .consumer-timeline-title {
                    font-weight: bold;
                    font-size: 16px;
                    margin-bottom: 5px;
                }
                
                .consumer-timeline-date {
                    color: #777;
                    font-size: 12px;
                    margin-bottom: 10px;
                }
                
                .consumer-timeline-description {
                    color: #333;
                }
            `;
            document.head.appendChild(consumerTimelineStyles);
        }
    }
    
    // Show modal
    timelineModal.classList.add('active');
    
    // Add event listeners to close buttons
    document.getElementById('closeTimelineModal').addEventListener('click', () => {
        timelineModal.classList.remove('active');
    });
    document.getElementById('closeTimelineBtn').addEventListener('click', () => {
        timelineModal.classList.remove('active');
    });
}

// Helper function to get status class
function getStatusClass(status) {
    if (!status) return '';
    
    switch(status.toLowerCase()) {
        case 'open': return 'red';
        case 'in progress': return 'yellow';
        case 'resolved': return 'green';
        case 'pending resolution approval': return 'yellow';
        case 'closed': return 'green';
        default: return 'blue';
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

// Check if user is already logged in
function checkAuthStatus() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (currentUser) {
        // Redirect to appropriate dashboard
        switch(currentUser.role) {
            case 'admin':
                window.location.href = 'admin.html';
                break;
            case 'division':
                window.location.href = 'division.html';
                break;
            case 'vendor':
                window.location.href = 'vendor.html';
                break;
        }
    }
}

// Check authentication status when page loads
checkAuthStatus();