<?php
// Include database connection
require_once '../config/db.php';

// Set headers for CORS and JSON
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get action from request
$action = '';
if ($method === 'GET' && isset($_GET['action'])) {
    $action = $_GET['action'];
} else if (($method === 'POST' || $method === 'PUT' || $method === 'DELETE') && !empty(file_get_contents("php://input"))) {
    $data = json_decode(file_get_contents("php://input"));
    if (isset($data->action)) {
        $action = $data->action;
    }
}

// Check for file uploads
if ($method === 'POST' && isset($_FILES) && count($_FILES) > 0) {
    if (isset($_POST['action'])) {
        $action = $_POST['action'];
    }
}

// Routes for different actions
switch ($action) {
    // Dashboard Statistics
    case 'getDashboardStats':
        getDashboardStats();
        break;
    
    // Recent Complaints
    case 'getRecentComplaints':
        getRecentComplaints();
        break;
    
    // Division Management
    case 'getDivisions':
        getDivisions();
        break;
    case 'addDivision':
        addDivision($data);
        break;
    case 'updateDivision':
        updateDivision($data);
        break;
    case 'deleteDivision':
        deleteDivision($data);
        break;
    case 'getDivisionDetails':
        getDivisionDetails($_GET['id'] ?? $data->id ?? null);
        break;
    
    // Vendor Management
    case 'getVendors':
        getVendors();
        break;
    case 'addVendor':
        addVendor($data);
        break;
    case 'updateVendor':
        updateVendor($data);
        break;
    case 'deleteVendor':
        deleteVendor($data);
        break;
    case 'getVendorDetails':
        getVendorDetails($_GET['id'] ?? $data->id ?? null);
        break;
    
    // Charger Management
    case 'getChargers':
        getChargers($_GET['filter'] ?? null);
        break;
    case 'addCharger':
        addCharger($data);
        break;
    case 'updateCharger':
        updateCharger($data);
        break;
    case 'deleteCharger':
        deleteCharger($data);
        break;
    case 'getChargerDetails':
        getChargerDetails($_GET['id'] ?? $data->id ?? null);
        break;
    case 'bulkUploadChargers':
        bulkUploadChargers();
        break;
    
    // Complaint Management
    case 'getComplaints':
        getComplaints($_GET['filter'] ?? null);
        break;
    case 'getComplaintDetails':
        getComplaintDetails($_GET['id'] ?? $data->id ?? null);
        break;
    case 'updateComplaintStatus':
        updateComplaintStatus($data);
        break;
    case 'assignComplaint':
        assignComplaint($data);
        break;
    case 'deleteComplaint':
        deleteComplaint($data);
        break;
    case 'exportComplaints':
        exportComplaints($_GET['filter'] ?? $data->filters ?? null);
        break;
    
    // System Settings
    case 'getSLASettings':
        getSLASettings();
        break;
    case 'updateSLASettings':
        updateSLASettings($data);
        break;
    case 'updateGeneralSettings':
        updateGeneralSettings($data);
        break;
    case 'updateNotificationSettings':
        updateNotificationSettings($data);
        break;
    
    default:
        sendJsonResponse(false, 'Invalid action');
        break;
}

/**
 * Get Dashboard Statistics
 */
function getDashboardStats() {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get total chargers
        $queryChargers = "SELECT COUNT(*) as total FROM chargers";
        $stmtChargers = $conn->query($queryChargers);
        $totalChargers = $stmtChargers->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get total active users (divisions + vendors)
        $queryUsers = "SELECT 
                        (SELECT COUNT(*) FROM divisions WHERE status = 'active') +
                        (SELECT COUNT(*) FROM vendors WHERE status = 'active') as total";
        $stmtUsers = $conn->query($queryUsers);
        $totalUsers = $stmtUsers->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get open complaints
        $queryOpenComplaints = "SELECT COUNT(*) as total FROM complaints 
                                WHERE status IN ('Open', 'In Progress', 'Pending Resolution Approval')";
        $stmtOpenComplaints = $conn->query($queryOpenComplaints);
        $openComplaints = $stmtOpenComplaints->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Get resolution rate
        $queryAllComplaints = "SELECT COUNT(*) as total FROM complaints";
        $stmtAllComplaints = $conn->query($queryAllComplaints);
        $totalComplaints = $stmtAllComplaints->fetch(PDO::FETCH_ASSOC)['total'];
        
        $queryResolvedComplaints = "SELECT COUNT(*) as total FROM complaints WHERE status = 'Resolved'";
        $stmtResolvedComplaints = $conn->query($queryResolvedComplaints);
        $resolvedComplaints = $stmtResolvedComplaints->fetch(PDO::FETCH_ASSOC)['total'];
        
        $resolutionRate = $totalComplaints > 0 ? round(($resolvedComplaints / $totalComplaints) * 100) : 0;
        
        // Get weekly trends for changes
        $lastWeekChargers = getLastWeekCount('chargers');
        $lastWeekUsers = getLastWeekActiveUserCount();
        $lastWeekOpenComplaints = getLastWeekOpenComplaintsCount();
        $lastWeekResolutionRate = getLastWeekResolutionRate();
        
        // Calculate changes
        $chargersChange = calculateChange($totalChargers, $lastWeekChargers);
        $usersChange = calculateChange($totalUsers, $lastWeekUsers);
        $complaintsChange = calculateChange($openComplaints, $lastWeekOpenComplaints);
        $resolutionChange = $resolutionRate - $lastWeekResolutionRate;
        
        // Compile statistics
        $stats = [
            'totalChargers' => $totalChargers,
            'activeUsers' => $totalUsers,
            'openComplaints' => $openComplaints,
            'resolutionRate' => $resolutionRate . '%',
            'chargersChange' => formatChange($chargersChange),
            'usersChange' => formatChange($usersChange),
            'complaintsChange' => formatChange($complaintsChange),
            'resolutionChange' => formatChange($resolutionChange, true)
        ];
        
        sendJsonResponse(true, 'Dashboard statistics fetched successfully', $stats);
    } catch(PDOException $e) {
        error_log("Dashboard Stats Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch dashboard statistics');
    }
}

/**
 * Get count of items added in the last week
 */
function getLastWeekCount($table) {
    $conn = getConnection();
    if (!$conn) {
        return 0;
    }
    
    try {
        $query = "SELECT COUNT(*) as count FROM {$table} 
                  WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)";
        
        $stmt = $conn->query($query);
        return $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    } catch(PDOException $e) {
        error_log("Last Week Count Error: " . $e->getMessage(), 0);
        return 0;
    }
}

/**
 * Get count of active users from last week
 */
function getLastWeekActiveUserCount() {
    $conn = getConnection();
    if (!$conn) {
        return 0;
    }
    
    try {
        $query = "SELECT
                 (SELECT COUNT(*) FROM divisions WHERE status = 'active' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)) +
                 (SELECT COUNT(*) FROM vendors WHERE status = 'active' AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)) as count";
        
        $stmt = $conn->query($query);
        return $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    } catch(PDOException $e) {
        error_log("Last Week User Count Error: " . $e->getMessage(), 0);
        return 0;
    }
}

/**
 * Get count of open complaints from last week
 */
function getLastWeekOpenComplaintsCount() {
    $conn = getConnection();
    if (!$conn) {
        return 0;
    }
    
    try {
        $query = "SELECT COUNT(*) as count FROM complaints
                  WHERE status IN ('Open', 'In Progress', 'Pending Resolution Approval')
                  AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)";
        
        $stmt = $conn->query($query);
        return $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    } catch(PDOException $e) {
        error_log("Last Week Complaints Count Error: " . $e->getMessage(), 0);
        return 0;
    }
}

/**
 * Get resolution rate from last week
 */
function getLastWeekResolutionRate() {
    $conn = getConnection();
    if (!$conn) {
        return 0;
    }
    
    try {
        // Get total complaints from a week ago
        $queryTotal = "SELECT COUNT(*) as total FROM complaints
                      WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)";
        
        $stmtTotal = $conn->query($queryTotal);
        $totalComplaints = $stmtTotal->fetch(PDO::FETCH_ASSOC)['total'];
        
        if ($totalComplaints == 0) {
            return 0;
        }
        
        // Get resolved complaints from a week ago
        $queryResolved = "SELECT COUNT(*) as resolved FROM complaints
                         WHERE status = 'Resolved'
                         AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)";
        
        $stmtResolved = $conn->query($queryResolved);
        $resolvedComplaints = $stmtResolved->fetch(PDO::FETCH_ASSOC)['resolved'];
        
        return round(($resolvedComplaints / $totalComplaints) * 100);
    } catch(PDOException $e) {
        error_log("Last Week Resolution Rate Error: " . $e->getMessage(), 0);
        return 0;
    }
}

/**
 * Calculate change between current and previous values
 */
function calculateChange($current, $previous) {
    if ($previous == 0) {
        return $current > 0 ? 100 : 0;
    }
    
    return round((($current - $previous) / $previous) * 100);
}

/**
 * Format change value for display
 */
function formatChange($change, $isPercent = false) {
    $prefix = $change >= 0 ? '+' : '';
    $suffix = $isPercent ? '%' : '';
    
    return $prefix . $change . $suffix;
}

/**
 * Get Recent Complaints (for dashboard)
 */
function getRecentComplaints() {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get 5 most recent complaints with relevant details
        $query = "SELECT c.id, c.tracking_id, c.charger_id, c.type, c.sub_type, 
                 c.status, c.division, c.created_at, c.consumer_name, c.consumer_phone
                 FROM complaints c 
                 ORDER BY c.created_at DESC 
                 LIMIT 5";
        
        $stmt = $conn->query($query);
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'Recent complaints fetched successfully', $complaints);
    } catch(PDOException $e) {
        error_log("Recent Complaints Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch recent complaints');
    }
}

/**
 * Get All Divisions
 */
function getDivisions() {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get all divisions with count of associated chargers
        $query = "SELECT d.*, 
                 (SELECT COUNT(*) FROM chargers c WHERE c.division_id = d.id) as total_chargers
                 FROM divisions d
                 ORDER BY d.name ASC";
        
        $stmt = $conn->query($query);
        $divisions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'Divisions fetched successfully', $divisions);
    } catch(PDOException $e) {
        error_log("Get Divisions Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch divisions');
    }
}

/**
 * Add New Division
 */
function addDivision($data) {
    // Validate required fields
    if (!isset($data->name) || empty($data->name) ||
        !isset($data->username) || empty($data->username) ||
        !isset($data->password) || empty($data->password)) {
        
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Check if division with same name already exists
        $checkQuery = "SELECT COUNT(*) as count FROM divisions WHERE name = :name";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':name', $data->name);
        $checkStmt->execute();
        
        if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'A division with this name already exists');
            return;
        }
        
        // Check if username already exists
        $checkUserQuery = "SELECT COUNT(*) as count FROM system_users WHERE username = :username";
        $checkUserStmt = $conn->prepare($checkUserQuery);
        $checkUserStmt->bindParam(':username', $data->username);
        $checkUserStmt->execute();
        
        if ($checkUserStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'Username is already taken');
            return;
        }
        
        // Insert division
        $status = $data->status ?? 'active';
        $divisionQuery = "INSERT INTO divisions (name, manager, email, phone, address, status) 
                         VALUES (:name, :manager, :email, :phone, :address, :status)";
        
        $divisionStmt = $conn->prepare($divisionQuery);
        $divisionStmt->bindParam(':name', $data->name);
        $divisionStmt->bindParam(':manager', $data->manager);
        $divisionStmt->bindParam(':email', $data->email);
        $divisionStmt->bindParam(':phone', $data->phone);
        $divisionStmt->bindParam(':address', $data->address);
        $divisionStmt->bindParam(':status', $status);
        $divisionStmt->execute();
        
        // Get last insert ID
        $divisionId = $conn->lastInsertId();
        
        // Insert system user
        $hashedPassword = password_hash($data->password, PASSWORD_DEFAULT);
        $userQuery = "INSERT INTO system_users (username, password, role, name) 
                     VALUES (:username, :password, 'division', :name)";
        
        $userStmt = $conn->prepare($userQuery);
        $userStmt->bindParam(':username', $data->username);
        $userStmt->bindParam(':password', $hashedPassword);
        $userStmt->bindParam(':name', $data->name);
        $userStmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Division added successfully', [
            'id' => $divisionId,
            'name' => $data->name,
            'status' => $status
        ]);
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Add Division Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to add division');
    }
}

/**
 * Update Division
 */
function updateDivision($data) {
    // Validate required fields
    if (!isset($data->id) || empty($data->id) ||
        !isset($data->name) || empty($data->name) ||
        !isset($data->status) || empty($data->status)) {
        
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Get original division details
        $getQuery = "SELECT name FROM divisions WHERE id = :id";
        $getStmt = $conn->prepare($getQuery);
        $getStmt->bindParam(':id', $data->id);
        $getStmt->execute();
        
        $divisionDetails = $getStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$divisionDetails) {
            sendJsonResponse(false, 'Division not found');
            return;
        }
        
        $oldName = $divisionDetails['name'];
        
        // Check if new name conflicts with another division
        if ($oldName !== $data->name) {
            $checkQuery = "SELECT COUNT(*) as count FROM divisions WHERE name = :name AND id != :id";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':name', $data->name);
            $checkStmt->bindParam(':id', $data->id);
            $checkStmt->execute();
            
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                sendJsonResponse(false, 'A division with this name already exists');
                return;
            }
        }
        
        // Update division
        $updateQuery = "UPDATE divisions 
                       SET name = :name, status = :status, 
                       manager = :manager, email = :email, 
                       phone = :phone, address = :address 
                       WHERE id = :id";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':name', $data->name);
        $updateStmt->bindParam(':status', $data->status);
        $updateStmt->bindParam(':manager', $data->manager);
        $updateStmt->bindParam(':email', $data->email);
        $updateStmt->bindParam(':phone', $data->phone);
        $updateStmt->bindParam(':address', $data->address);
        $updateStmt->bindParam(':id', $data->id);
        $updateStmt->execute();
        
        // If name changed, update system_users
        if ($oldName !== $data->name) {
            $updateUserQuery = "UPDATE system_users SET name = :new_name WHERE name = :old_name AND role = 'division'";
            $updateUserStmt = $conn->prepare($updateUserQuery);
            $updateUserStmt->bindParam(':new_name', $data->name);
            $updateUserStmt->bindParam(':old_name', $oldName);
            $updateUserStmt->execute();
            
            // Update division name in complaints
            $updateComplaintsQuery = "UPDATE complaints SET division = :new_name WHERE division = :old_name";
            $updateComplaintsStmt = $conn->prepare($updateComplaintsQuery);
            $updateComplaintsStmt->bindParam(':new_name', $data->name);
            $updateComplaintsStmt->bindParam(':old_name', $oldName);
            $updateComplaintsStmt->execute();
            
            // Add note about division name change in complaint timeline
            $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description)
                             SELECT id, status, :description
                             FROM complaints
                             WHERE division = :new_name";
            
            $timelineStmt = $conn->prepare($timelineQuery);
            $description = "Division name changed from {$oldName} to {$data->name}";
            $timelineStmt->bindParam(':description', $description);
            $timelineStmt->bindParam(':new_name', $data->name);
            $timelineStmt->execute();
        }
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Division updated successfully', [
            'id' => $data->id,
            'name' => $data->name,
            'status' => $data->status
        ]);
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Update Division Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update division');
    }
}

/**
 * Delete Division
 */
function deleteDivision($data) {
    if (!isset($data->id) || empty($data->id)) {
        sendJsonResponse(false, 'Division ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Check if division has associated chargers
        $checkChargersQuery = "SELECT COUNT(*) as count FROM chargers WHERE division_id = :division_id";
        $checkChargersStmt = $conn->prepare($checkChargersQuery);
        $checkChargersStmt->bindParam(':division_id', $data->id);
        $checkChargersStmt->execute();
        
        if ($checkChargersStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'Cannot delete division with associated chargers. Please reassign chargers first.');
            return;
        }
        
        // Get division name for system_users update
        $getDivisionQuery = "SELECT name FROM divisions WHERE id = :id";
        $getDivisionStmt = $conn->prepare($getDivisionQuery);
        $getDivisionStmt->bindParam(':id', $data->id);
        $getDivisionStmt->execute();
        
        $divisionName = $getDivisionStmt->fetch(PDO::FETCH_ASSOC)['name'] ?? null;
        
        if (!$divisionName) {
            sendJsonResponse(false, 'Division not found');
            return;
        }
        
        // Check if division has associated complaints
        $checkComplaintsQuery = "SELECT COUNT(*) as count FROM complaints WHERE division = :division_name";
        $checkComplaintsStmt = $conn->prepare($checkComplaintsQuery);
        $checkComplaintsStmt->bindParam(':division_name', $divisionName);
        $checkComplaintsStmt->execute();
        
        if ($checkComplaintsStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'Cannot delete division with associated complaints. Please reassign complaints first.');
            return;
        }
        
        // Begin transaction
        $conn->beginTransaction();
        
        // Delete system user
        $deleteUserQuery = "DELETE FROM system_users WHERE name = :division_name AND role = 'division'";
        $deleteUserStmt = $conn->prepare($deleteUserQuery);
        $deleteUserStmt->bindParam(':division_name', $divisionName);
        $deleteUserStmt->execute();
        
        // Delete division
        $deleteDivisionQuery = "DELETE FROM divisions WHERE id = :id";
        $deleteDivisionStmt = $conn->prepare($deleteDivisionQuery);
        $deleteDivisionStmt->bindParam(':id', $data->id);
        $deleteDivisionStmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Division deleted successfully');
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Delete Division Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to delete division');
    }
}

/**
 * Get Division Details
 */
function getDivisionDetails($id) {
    if (!$id) {
        sendJsonResponse(false, 'Division ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get division details
        $query = "SELECT d.*, 
                 (SELECT COUNT(*) FROM chargers c WHERE c.division_id = d.id) as total_chargers,
                 (SELECT COUNT(*) FROM complaints com WHERE com.division = d.name) as total_complaints,
                 (SELECT COUNT(*) FROM complaints com WHERE com.division = d.name AND com.status IN ('Open', 'In Progress', 'Pending Resolution Approval')) as open_complaints,
                 (SELECT COUNT(*) FROM complaints com WHERE com.division = d.name AND com.status = 'Resolved') as resolved_complaints
                 FROM divisions d
                 WHERE d.id = :id";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        $division = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$division) {
            sendJsonResponse(false, 'Division not found');
            return;
        }
        
        // Get division's active chargers
        $chargersQuery = "SELECT COUNT(*) as active_chargers FROM chargers 
                          WHERE division_id = :division_id AND status = 'active'";
        $chargersStmt = $conn->prepare($chargersQuery);
        $chargersStmt->bindParam(':division_id', $id);
        $chargersStmt->execute();
        
        $division['active_chargers'] = $chargersStmt->fetch(PDO::FETCH_ASSOC)['active_chargers'];
        
        sendJsonResponse(true, 'Division details fetched successfully', $division);
    } catch(PDOException $e) {
        error_log("Division Details Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch division details');
    }
}

/**
 * Get All Vendors
 */
function getVendors() {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get all vendors
        $query = "SELECT v.*, GROUP_CONCAT(d.name) as service_areas 
                  FROM vendors v 
                  LEFT JOIN divisions d ON FIND_IN_SET(d.id, v.division_id) > 0 
                  GROUP BY v.id 
                  ORDER BY v.name ASC";
        
        $stmt = $conn->query($query);
        $vendors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'Vendors fetched successfully', $vendors);
    } catch(PDOException $e) {
        error_log("Get Vendors Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch vendors');
    }
}

/**
 * Add New Vendor
 */
function addVendor($data) {
    // Validate required fields
    if (!isset($data->name) || empty($data->name) ||
        !isset($data->contactPerson) || empty($data->contactPerson) ||
        !isset($data->email) || empty($data->email) ||
        !isset($data->phone) || empty($data->phone) ||
        !isset($data->address) || empty($data->address) ||
        !isset($data->serviceAreas) || empty($data->serviceAreas) ||
        !isset($data->username) || empty($data->username) ||
        !isset($data->password) || empty($data->password) ||
        !isset($data->status) || empty($data->status)) {
        
        sendJsonResponse(false, 'All fields are required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Check if vendor with same name already exists
        $checkQuery = "SELECT COUNT(*) as count FROM vendors WHERE name = :name";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':name', $data->name);
        $checkStmt->execute();
        
        if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'A vendor with this name already exists');
            return;
        }
        
        // Check if username already exists
        $checkUserQuery = "SELECT COUNT(*) as count FROM system_users WHERE username = :username";
        $checkUserStmt = $conn->prepare($checkUserQuery);
        $checkUserStmt->bindParam(':username', $data->username);
        $checkUserStmt->execute();
        
        if ($checkUserStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'Username is already taken');
            return;
        }
        
        // Process service areas
        $serviceAreas = is_array($data->serviceAreas) ? implode(',', $data->serviceAreas) : $data->serviceAreas;
        
        // Insert vendor
        $vendorQuery = "INSERT INTO vendors (name, contact_person, email, phone, address, division_id, status) 
                        VALUES (:name, :contact_person, :email, :phone, :address, :division_id, :status)";
        
        $vendorStmt = $conn->prepare($vendorQuery);
        $vendorStmt->bindParam(':name', $data->name);
        $vendorStmt->bindParam(':contact_person', $data->contactPerson);
        $vendorStmt->bindParam(':email', $data->email);
        $vendorStmt->bindParam(':phone', $data->phone);
        $vendorStmt->bindParam(':address', $data->address);
        $vendorStmt->bindParam(':division_id', $serviceAreas);
        $vendorStmt->bindParam(':status', $data->status);
        $vendorStmt->execute();
        
        // Get last insert ID
        $vendorId = $conn->lastInsertId();
        
        // Insert system user
        $hashedPassword = password_hash($data->password, PASSWORD_DEFAULT);
        $userQuery = "INSERT INTO system_users (username, password, role, name) 
                     VALUES (:username, :password, 'vendor', :name)";
        
        $userStmt = $conn->prepare($userQuery);
        $userStmt->bindParam(':username', $data->username);
        $userStmt->bindParam(':password', $hashedPassword);
        $userStmt->bindParam(':name', $data->name);
        $userStmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Vendor added successfully', [
            'id' => $vendorId,
            'name' => $data->name,
            'status' => $data->status
        ]);
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Add Vendor Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to add vendor');
    }
}

/**
 * Update Vendor
 */
function updateVendor($data) {
    // Validate required fields
    if (!isset($data->id) || empty($data->id) ||
        !isset($data->name) || empty($data->name) ||
        !isset($data->contactPerson) || empty($data->contactPerson) ||
        !isset($data->email) || empty($data->email) ||
        !isset($data->phone) || empty($data->phone) ||
        !isset($data->address) || empty($data->address) ||
        !isset($data->serviceAreas) || empty($data->serviceAreas) ||
        !isset($data->status) || empty($data->status)) {
        
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Get original vendor details
        $getQuery = "SELECT name FROM vendors WHERE id = :id";
        $getStmt = $conn->prepare($getQuery);
        $getStmt->bindParam(':id', $data->id);
        $getStmt->execute();
        
        $vendorDetails = $getStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$vendorDetails) {
            sendJsonResponse(false, 'Vendor not found');
            return;
        }
        
        $oldName = $vendorDetails['name'];
        
        // Check if new name conflicts with another vendor
        if ($oldName !== $data->name) {
            $checkQuery = "SELECT COUNT(*) as count FROM vendors WHERE name = :name AND id != :id";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':name', $data->name);
            $checkStmt->bindParam(':id', $data->id);
            $checkStmt->execute();
            
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                sendJsonResponse(false, 'A vendor with this name already exists');
                return;
            }
        }
        
        // Process service areas
        $serviceAreas = is_array($data->serviceAreas) ? implode(',', $data->serviceAreas) : $data->serviceAreas;
        
        // Update vendor
        $updateQuery = "UPDATE vendors 
                       SET name = :name, contact_person = :contact_person, 
                       email = :email, phone = :phone, address = :address, 
                       division_id = :division_id, status = :status
                       WHERE id = :id";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':name', $data->name);
        $updateStmt->bindParam(':contact_person', $data->contactPerson);
        $updateStmt->bindParam(':email', $data->email);
        $updateStmt->bindParam(':phone', $data->phone);
        $updateStmt->bindParam(':address', $data->address);
        $updateStmt->bindParam(':division_id', $serviceAreas);
        $updateStmt->bindParam(':status', $data->status);
        $updateStmt->bindParam(':id', $data->id);
        $updateStmt->execute();
        
        // If name changed, update system_users
        if ($oldName !== $data->name) {
            $updateUserQuery = "UPDATE system_users SET name = :new_name WHERE name = :old_name AND role = 'vendor'";
            $updateUserStmt = $conn->prepare($updateUserQuery);
            $updateUserStmt->bindParam(':new_name', $data->name);
            $updateUserStmt->bindParam(':old_name', $oldName);
            $updateUserStmt->execute();
            
            // Add note about vendor name change in complaint timeline
            $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description)
                             SELECT id, status, :description
                             FROM complaints
                             WHERE assigned_to = :vendor_id";
            
            $timelineStmt = $conn->prepare($timelineQuery);
            $description = "Vendor name changed from {$oldName} to {$data->name}";
            $timelineStmt->bindParam(':description', $description);
            $timelineStmt->bindParam(':vendor_id', $data->id);
            $timelineStmt->execute();
        }
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Vendor updated successfully', [
            'id' => $data->id,
            'name' => $data->name,
            'status' => $data->status
        ]);
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Update Vendor Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update vendor');
    }
}

/**
 * Delete Vendor
 */
function deleteVendor($data) {
    if (!isset($data->id) || empty($data->id)) {
        sendJsonResponse(false, 'Vendor ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get vendor name for system_users update
        $getVendorQuery = "SELECT name FROM vendors WHERE id = :id";
        $getVendorStmt = $conn->prepare($getVendorQuery);
        $getVendorStmt->bindParam(':id', $data->id);
        $getVendorStmt->execute();
        
        $vendorName = $getVendorStmt->fetch(PDO::FETCH_ASSOC)['name'] ?? null;
        
        if (!$vendorName) {
            sendJsonResponse(false, 'Vendor not found');
            return;
        }
        
        // Check if vendor has assigned complaints
        $checkComplaintsQuery = "SELECT COUNT(*) as count FROM complaints WHERE assigned_to = :vendor_id";
        $checkComplaintsStmt = $conn->prepare($checkComplaintsQuery);
        $checkComplaintsStmt->bindParam(':vendor_id', $data->id);
        $checkComplaintsStmt->execute();
        
        if ($checkComplaintsStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'Cannot delete vendor with assigned complaints. Please reassign complaints first.');
            return;
        }
        
        // Begin transaction
        $conn->beginTransaction();
        
        // Delete system user
        $deleteUserQuery = "DELETE FROM system_users WHERE name = :vendor_name AND role = 'vendor'";
        $deleteUserStmt = $conn->prepare($deleteUserQuery);
        $deleteUserStmt->bindParam(':vendor_name', $vendorName);
        $deleteUserStmt->execute();
        
        // Delete vendor
        $deleteVendorQuery = "DELETE FROM vendors WHERE id = :id";
        $deleteVendorStmt = $conn->prepare($deleteVendorQuery);
        $deleteVendorStmt->bindParam(':id', $data->id);
        $deleteVendorStmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Vendor deleted successfully');
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Delete Vendor Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to delete vendor');
    }
}

/**
 * Get Vendor Details
 */
function getVendorDetails($id) {
    if (!$id) {
        sendJsonResponse(false, 'Vendor ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get vendor details
        $query = "SELECT v.*, 
                  (SELECT GROUP_CONCAT(d.name) FROM divisions d WHERE FIND_IN_SET(d.id, v.division_id) > 0) as service_areas,
                  (SELECT COUNT(*) FROM complaints c WHERE c.assigned_to = v.id) as total_complaints,
                  (SELECT COUNT(*) FROM complaints c WHERE c.assigned_to = v.id AND c.status IN ('Open', 'In Progress', 'Pending Resolution Approval')) as open_complaints,
                  (SELECT COUNT(*) FROM complaints c WHERE c.assigned_to = v.id AND c.status = 'Resolved') as resolved_complaints
                  FROM vendors v
                  WHERE v.id = :id";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        $vendor = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$vendor) {
            sendJsonResponse(false, 'Vendor not found');
            return;
        }
        
        sendJsonResponse(true, 'Vendor details fetched successfully', $vendor);
    } catch(PDOException $e) {
        error_log("Vendor Details Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch vendor details');
    }
}

/**
 * Get Chargers with Filtering
 */
function getChargers($filter = null) {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        $query = "SELECT c.*, d.name as division_name 
                  FROM chargers c 
                  LEFT JOIN divisions d ON c.division_id = d.id 
                  WHERE 1=1";
        
        $params = [];
        
        // Apply filters if provided
        if ($filter) {
            $filterData = json_decode($filter);
            
            if (isset($filterData->status) && $filterData->status !== 'all') {
                $query .= " AND c.status = :status";
                $params[':status'] = $filterData->status;
            }
            
            if (isset($filterData->division) && $filterData->division !== 'all') {
                $query .= " AND d.name = :division";
                $params[':division'] = $filterData->division;
            }
            
            if (isset($filterData->type) && $filterData->type !== 'all') {
                // Handle AC/DC type filter
                if ($filterData->type === 'ac') {
                    $query .= " AND c.type LIKE '%AC%'";
                } else if ($filterData->type === 'dc') {
                    $query .= " AND c.type LIKE '%DC%'";
                }
            }
            
            if (isset($filterData->search) && !empty($filterData->search)) {
                $query .= " AND (c.cpid LIKE :search OR c.location LIKE :search)";
                $params[':search'] = '%' . $filterData->search . '%';
            }
            
            // Pagination
            $page = $filterData->page ?? 1;
            $itemsPerPage = $filterData->itemsPerPage ?? 10;
            $offset = ($page - 1) * $itemsPerPage;
            
            // Get total count first
            $countQuery = str_replace("SELECT c.*, d.name as division_name", "SELECT COUNT(*) as total", $query);
            $countStmt = $conn->prepare($countQuery);
            
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            
            $countStmt->execute();
            $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            $totalPages = ceil($totalItems / $itemsPerPage);
            
            // Add sorting and pagination
            $query .= " ORDER BY c.created_at DESC LIMIT :offset, :limit";
            $params[':offset'] = $offset;
            $params[':limit'] = $itemsPerPage;
        } else {
            // Default sort by created date
            $query .= " ORDER BY c.created_at DESC";
        }
        
        $stmt = $conn->prepare($query);
        
        // Bind parameters
        foreach ($params as $key => $value) {
            // Special binding for LIMIT parameters which must be integers
            if ($key === ':offset' || $key === ':limit') {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value);
            }
        }
        
        $stmt->execute();
        $chargers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($filter) {
            sendJsonResponse(true, 'Chargers fetched successfully', [
                'chargers' => $chargers,
                'pagination' => [
                    'totalItems' => $totalItems,
                    'totalPages' => $totalPages,
                    'currentPage' => $page,
                    'itemsPerPage' => $itemsPerPage
                ]
            ]);
        } else {
            sendJsonResponse(true, 'Chargers fetched successfully', $chargers);
        }
    } catch(PDOException $e) {
        error_log("Get Chargers Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch chargers');
    }
}

/**
 * Add New Charger
 */
function addCharger($data) {
    // Validate required fields
    if (!isset($data->cpid) || empty($data->cpid) ||
        !isset($data->location) || empty($data->location) ||
        !isset($data->division) || empty($data->division) ||
        !isset($data->status) || empty($data->status)) {
        
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Check if charger with same CPID already exists
        $checkQuery = "SELECT COUNT(*) as count FROM chargers WHERE cpid = :cpid";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':cpid', $data->cpid);
        $checkStmt->execute();
        
        if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'A charger with this CPID already exists');
            return;
        }
        
        // If serial number is provided, check for duplicates
        if (isset($data->serialNumber) && !empty($data->serialNumber)) {
            $checkSerialQuery = "SELECT COUNT(*) as count FROM chargers WHERE serial_number = :serial_number";
            $checkSerialStmt = $conn->prepare($checkSerialQuery);
            $checkSerialStmt->bindParam(':serial_number', $data->serialNumber);
            $checkSerialStmt->execute();
            
            if ($checkSerialStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                sendJsonResponse(false, 'A charger with this Serial Number already exists');
                return;
            }
        }
        
        // Find division ID
        $divisionQuery = "SELECT id FROM divisions WHERE name = :name";
        $divisionStmt = $conn->prepare($divisionQuery);
        $divisionStmt->bindParam(':name', $data->division);
        $divisionStmt->execute();
        
        $divisionId = $divisionStmt->fetch(PDO::FETCH_ASSOC)['id'] ?? null;
        
        if (!$divisionId) {
            sendJsonResponse(false, 'Division not found');
            return;
        }
        
        // Insert charger
        $chargerQuery = "INSERT INTO chargers (cpid, serial_number, location, make, model, 
                        division_id, type, address, status) 
                        VALUES (:cpid, :serial_number, :location, :make, :model, 
                        :division_id, :type, :address, :status)";
        
        $chargerStmt = $conn->prepare($chargerQuery);
        $chargerStmt->bindParam(':cpid', $data->cpid);
        $chargerStmt->bindParam(':serial_number', $data->serialNumber);
        $chargerStmt->bindParam(':location', $data->location);
        $chargerStmt->bindParam(':make', $data->make);
        $chargerStmt->bindParam(':model', $data->model);
        $chargerStmt->bindParam(':division_id', $divisionId);
        $chargerStmt->bindParam(':type', $data->type);
        $chargerStmt->bindParam(':address', $data->address);
        $chargerStmt->bindParam(':status', $data->status);
        $chargerStmt->execute();
        
        $chargerId = $conn->lastInsertId();
        
        sendJsonResponse(true, 'Charger added successfully', [
            'id' => $chargerId,
            'cpid' => $data->cpid
        ]);
    } catch(PDOException $e) {
        error_log("Add Charger Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to add charger');
    }
}

/**
 * Update Charger
 */
function updateCharger($data) {
    // Validate required fields
    if (!isset($data->cpid) || empty($data->cpid) ||
        !isset($data->location) || empty($data->location) ||
        !isset($data->division) || empty($data->division) ||
        !isset($data->status) || empty($data->status)) {
        
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get current charger data
        $getQuery = "SELECT c.*, d.name as division_name 
                    FROM chargers c 
                    LEFT JOIN divisions d ON c.division_id = d.id 
                    WHERE c.cpid = :cpid";
        
        $getStmt = $conn->prepare($getQuery);
        $getStmt->bindParam(':cpid', $data->cpid);
        $getStmt->execute();
        
        $charger = $getStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$charger) {
            sendJsonResponse(false, 'Charger not found');
            return;
        }
        
        // Begin transaction
        $conn->beginTransaction();
        
        // Check if division is changing
        $originalDivision = $charger['division_name'];
        $divisionChanged = $originalDivision !== $data->division;
        
        if ($divisionChanged) {
            // Find new division ID
            $divisionQuery = "SELECT id FROM divisions WHERE name = :name";
            $divisionStmt = $conn->prepare($divisionQuery);
            $divisionStmt->bindParam(':name', $data->division);
            $divisionStmt->execute();
            
            $newDivisionId = $divisionStmt->fetch(PDO::FETCH_ASSOC)['id'] ?? null;
            
            if (!$newDivisionId) {
                sendJsonResponse(false, 'Division not found');
                return;
            }
        }
        
        // If serial number is being changed, check for duplicates
        if (isset($data->serialNumber) && !empty($data->serialNumber) && $data->serialNumber !== $charger['serial_number']) {
            $checkSerialQuery = "SELECT COUNT(*) as count FROM chargers WHERE serial_number = :serial_number AND cpid != :cpid";
            $checkSerialStmt = $conn->prepare($checkSerialQuery);
            $checkSerialStmt->bindParam(':serial_number', $data->serialNumber);
            $checkSerialStmt->bindParam(':cpid', $data->cpid);
            $checkSerialStmt->execute();
            
            if ($checkSerialStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                sendJsonResponse(false, 'A different charger with this Serial Number already exists');
                return;
            }
        }
        
        // Update charger
        $updateQuery = "UPDATE chargers 
                       SET serial_number = :serial_number, 
                       location = :location, 
                       make = :make, 
                       model = :model, 
                       division_id = :division_id, 
                       type = :type, 
                       address = :address, 
                       status = :status 
                       WHERE cpid = :cpid";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':serial_number', $data->serialNumber);
        $updateStmt->bindParam(':location', $data->location);
        $updateStmt->bindParam(':make', $data->make);
        $updateStmt->bindParam(':model', $data->model);
        $updateStmt->bindParam(':division_id', $newDivisionId ?? $charger['division_id']);
        $updateStmt->bindParam(':type', $data->type);
        $updateStmt->bindParam(':address', $data->address);
        $updateStmt->bindParam(':status', $data->status);
        $updateStmt->bindParam(':cpid', $data->cpid);
        $updateStmt->execute();
        
        // If division changed, update related complaints
        if ($divisionChanged) {
            // Update complaint division
            $updateComplaintsQuery = "UPDATE complaints SET division = :new_division WHERE charger_id = :cpid";
            $updateComplaintsStmt = $conn->prepare($updateComplaintsQuery);
            $updateComplaintsStmt->bindParam(':new_division', $data->division);
            $updateComplaintsStmt->bindParam(':cpid', $data->cpid);
            $updateComplaintsStmt->execute();
            
            // Add timeline entry about division change
            $getAffectedComplaintsQuery = "SELECT id FROM complaints WHERE charger_id = :cpid";
            $getAffectedComplaintsStmt = $conn->prepare($getAffectedComplaintsQuery);
            $getAffectedComplaintsStmt->bindParam(':cpid', $data->cpid);
            $getAffectedComplaintsStmt->execute();
            
            while ($complaint = $getAffectedComplaintsStmt->fetch(PDO::FETCH_ASSOC)) {
                $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description) 
                                 VALUES (:complaint_id, 'Division Changed', :description)";
                
                $timelineStmt = $conn->prepare($timelineQuery);
                $timelineStmt->bindParam(':complaint_id', $complaint['id']);
                $description = "Charger has been reassigned from {$originalDivision} to {$data->division}";
                $timelineStmt->bindParam(':description', $description);
                $timelineStmt->execute();
            }
        }
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Charger updated successfully');
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Update Charger Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update charger');
    }
}

/**
 * Delete Charger
 */
function deleteCharger($data) {
    if (!isset($data->cpid) || empty($data->cpid)) {
        sendJsonResponse(false, 'Charger ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Check if charger has associated complaints
        $checkComplaintsQuery = "SELECT COUNT(*) as count FROM complaints WHERE charger_id = :cpid";
        $checkComplaintsStmt = $conn->prepare($checkComplaintsQuery);
        $checkComplaintsStmt->bindParam(':cpid', $data->cpid);
        $checkComplaintsStmt->execute();
        
        if ($checkComplaintsStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
            sendJsonResponse(false, 'Cannot delete charger with associated complaints. Please resolve complaints first.');
            return;
        }
        
        // Delete charger
        $deleteQuery = "DELETE FROM chargers WHERE cpid = :cpid";
        $deleteStmt = $conn->prepare($deleteQuery);
        $deleteStmt->bindParam(':cpid', $data->cpid);
        $deleteStmt->execute();
        
        sendJsonResponse(true, 'Charger deleted successfully');
    } catch(PDOException $e) {
        error_log("Delete Charger Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to delete charger');
    }
}

/**
 * Get Charger Details
 */
function getChargerDetails($cpid) {
    if (!$cpid) {
        sendJsonResponse(false, 'Charger ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get charger details
        $query = "SELECT c.*, d.name as division_name 
                 FROM chargers c 
                 LEFT JOIN divisions d ON c.division_id = d.id 
                 WHERE c.cpid = :cpid";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':cpid', $cpid);
        $stmt->execute();
        
        $charger = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$charger) {
            sendJsonResponse(false, 'Charger not found');
            return;
        }
        
        // Get complaint history for this charger
        $complaintsQuery = "SELECT c.id, c.tracking_id, c.created_at, c.type, c.sub_type, c.status, 
                           c.last_updated, 
                           (CASE 
                              WHEN c.status = 'Resolved' THEN 
                                TIMESTAMPDIFF(HOUR, c.created_at, c.last_updated) 
                              ELSE NULL 
                           END) as resolution_time
                           FROM complaints c 
                           WHERE c.charger_id = :cpid 
                           ORDER BY c.created_at DESC";
        
        $complaintsStmt = $conn->prepare($complaintsQuery);
        $complaintsStmt->bindParam(':cpid', $cpid);
        $complaintsStmt->execute();
        
        $complaints = $complaintsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Prepare response
        $response = [
            'charger' => $charger,
            'complaints' => $complaints
        ];
        
        sendJsonResponse(true, 'Charger details fetched successfully', $response);
    } catch(PDOException $e) {
        error_log("Charger Details Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch charger details');
    }
}

/**
 * Bulk Upload Chargers
 */
function bulkUploadChargers() {
    // Check if file was uploaded
    if (!isset($_FILES['excelFile']) || $_FILES['excelFile']['error'] != UPLOAD_ERR_OK) {
        sendJsonResponse(false, 'No file uploaded or upload error');
        return;
    }
    
    // Check file type
    $fileType = mime_content_type($_FILES['excelFile']['tmp_name']);
    if ($fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && 
        $fileType !== 'application/vnd.ms-excel' && 
        $fileType !== 'application/octet-stream') {
        sendJsonResponse(false, 'Invalid file type. Please upload an Excel file.');
        return;
    }
    
    // Process Excel file
    require_once '../vendor/autoload.php'; // Include PhpSpreadsheet library
    
    try {
        // Load Excel file
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($_FILES['excelFile']['tmp_name']);
        $spreadsheet = $reader->load($_FILES['excelFile']['tmp_name']);
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();
        
        // Skip header row
        $headerRow = array_shift($rows);
        
        // Connection
        $conn = getConnection();
        if (!$conn) {
            sendJsonResponse(false, 'Database connection error');
            return;
        }
        
        // Validate and insert chargers
        $results = [
            'addedCount' => 0,
            'errorCount' => 0,
            'duplicateCount' => 0,
            'errors' => []
        ];
        
        foreach ($rows as $rowIndex => $row) {
            // Skip empty rows
            if (empty($row[0])) continue;
            
            $rowNum = $rowIndex + 2; // Add 2 to account for 1-based indexing and header row
            $cpid = $row[0];
            $serialNumber = $row[1];
            $location = $row[2];
            $division = $row[3];
            $make = $row[4];
            $model = $row[5];
            $type = $row[6];
            $address = $row[7];
            $status = $row[8] ?? 'active';
            
            // Validate required fields
            if (empty($cpid) || empty($location) || empty($division)) {
                $results['errorCount']++;
                $results['errors'][] = "Row {$rowNum}: Missing required field (Charger ID, Location, or Division)";
                continue;
            }
            
            try {
                // Check if charger already exists
                $checkQuery = "SELECT COUNT(*) as count FROM chargers WHERE cpid = :cpid";
                $checkStmt = $conn->prepare($checkQuery);
                $checkStmt->bindParam(':cpid', $cpid);
                $checkStmt->execute();
                
                if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                    $results['duplicateCount']++;
                    $results['errors'][] = "Row {$rowNum}: Charger with ID {$cpid} already exists";
                    continue;
                }
                
                // If serial number is provided, check for duplicates
                if (!empty($serialNumber)) {
                    $checkSerialQuery = "SELECT COUNT(*) as count FROM chargers WHERE serial_number = :serial_number";
                    $checkSerialStmt = $conn->prepare($checkSerialQuery);
                    $checkSerialStmt->bindParam(':serial_number', $serialNumber);
                    $checkSerialStmt->execute();
                    
                    if ($checkSerialStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                        $results['duplicateCount']++;
                        $results['errors'][] = "Row {$rowNum}: Charger with Serial Number {$serialNumber} already exists";
                        continue;
                    }
                }
                
                // Find division ID
                $divisionQuery = "SELECT id FROM divisions WHERE name = :name";
                $divisionStmt = $conn->prepare($divisionQuery);
                $divisionStmt->bindParam(':name', $division);
                $divisionStmt->execute();
                
                $divisionId = $divisionStmt->fetch(PDO::FETCH_ASSOC)['id'] ?? null;
                
                if (!$divisionId) {
                    $results['errorCount']++;
                    $results['errors'][] = "Row {$rowNum}: Division '{$division}' not found";
                    continue;
                }
                
                // Validate status
                $status = strtolower($status);
                if (!in_array($status, ['active', 'inactive', 'maintenance'])) {
                    $status = 'active'; // Default to active if invalid
                }
                
                // Insert charger
                $chargerQuery = "INSERT INTO chargers (cpid, serial_number, location, make, model, 
                                division_id, type, address, status) 
                                VALUES (:cpid, :serial_number, :location, :make, :model, 
                                :division_id, :type, :address, :status)";
                
                $chargerStmt = $conn->prepare($chargerQuery);
                $chargerStmt->bindParam(':cpid', $cpid);
                $chargerStmt->bindParam(':serial_number', $serialNumber);
                $chargerStmt->bindParam(':location', $location);
                $chargerStmt->bindParam(':make', $make);
                $chargerStmt->bindParam(':model', $model);
                $chargerStmt->bindParam(':division_id', $divisionId);
                $chargerStmt->bindParam(':type', $type);
                $chargerStmt->bindParam(':address', $address);
                $chargerStmt->bindParam(':status', $status);
                $chargerStmt->execute();
                
                $results['addedCount']++;
            } catch(PDOException $e) {
                $results['errorCount']++;
                $results['errors'][] = "Row {$rowNum}: Database error - " . $e->getMessage();
            }
        }
        
        sendJsonResponse(true, 'Bulk upload completed', $results);
    } catch(Exception $e) {
        error_log("Bulk Upload Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to process Excel file: ' . $e->getMessage());
    }
}

/**
 * Get Complaints with Filtering
 */
function getComplaints($filter = null) {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        $query = "SELECT c.*, 
                  ch.location as charger_location,
                  v.name as vendor_name
                  FROM complaints c 
                  LEFT JOIN chargers ch ON c.charger_id = ch.cpid
                  LEFT JOIN vendors v ON c.assigned_to = v.id
                  WHERE 1=1";
        
        $params = [];
        
        // Apply filters if provided
        if ($filter) {
            $filterData = json_decode($filter);
            
            if (isset($filterData->status) && $filterData->status !== 'all') {
                $query .= " AND c.status = :status";
                $params[':status'] = $filterData->status;
            }
            
            if (isset($filterData->division) && $filterData->division !== 'all') {
                $query .= " AND c.division = :division";
                $params[':division'] = $filterData->division;
            }
            
            if (isset($filterData->type) && $filterData->type !== 'all') {
                if ($filterData->type === 'charger') {
                    $query .= " AND c.type NOT LIKE '%Billing%'";
                } else if ($filterData->type === 'billing') {
                    $query .= " AND c.type LIKE '%Billing%'";
                }
            }
            
            if (isset($filterData->search) && !empty($filterData->search)) {
                $query .= " AND (c.tracking_id LIKE :search OR c.charger_id LIKE :search OR c.consumer_name LIKE :search OR c.consumer_phone LIKE :search)";
                $params[':search'] = '%' . $filterData->search . '%';
            }
            
            if (isset($filterData->dateFrom) && !empty($filterData->dateFrom)) {
                $query .= " AND c.created_at >= :date_from";
                $params[':date_from'] = $filterData->dateFrom . ' 00:00:00';
            }
            
            if (isset($filterData->dateTo) && !empty($filterData->dateTo)) {
                $query .= " AND c.created_at <= :date_to";
                $params[':date_to'] = $filterData->dateTo . ' 23:59:59';
            }
            
            // Pagination
            $page = $filterData->page ?? 1;
            $itemsPerPage = $filterData->itemsPerPage ?? 10;
            $offset = ($page - 1) * $itemsPerPage;
            
            // Get total count first
            $countQuery = str_replace("SELECT c.*, \n                  ch.location as charger_location,\n                  v.name as vendor_name", "SELECT COUNT(*) as total", $query);
            $countStmt = $conn->prepare($countQuery);
            
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            
            $countStmt->execute();
            $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            $totalPages = ceil($totalItems / $itemsPerPage);
            
            // Add sorting and pagination
            $query .= " ORDER BY c.created_at DESC LIMIT :offset, :limit";
            $params[':offset'] = $offset;
            $params[':limit'] = $itemsPerPage;
        } else {
            // Default sort by created date
            $query .= " ORDER BY c.created_at DESC";
        }
        
        $stmt = $conn->prepare($query);
        
        // Bind parameters
        foreach ($params as $key => $value) {
            // Special binding for LIMIT parameters which must be integers
            if ($key === ':offset' || $key === ':limit') {
                $stmt->bindValue($key, $value, PDO::PARAM_INT);
            } else {
                $stmt->bindValue($key, $value);
            }
        }
        
        $stmt->execute();
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($filter) {
            sendJsonResponse(true, 'Complaints fetched successfully', [
                'complaints' => $complaints,
                'pagination' => [
                    'totalItems' => $totalItems,
                    'totalPages' => $totalPages,
                    'currentPage' => $page,
                    'itemsPerPage' => $itemsPerPage
                ]
            ]);
        } else {
            sendJsonResponse(true, 'Complaints fetched successfully', $complaints);
        }
    } catch(PDOException $e) {
        error_log("Get Complaints Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch complaints');
    }
}

/**
 * Get Complaint Details
 */
function getComplaintDetails($id) {
    if (!$id) {
        sendJsonResponse(false, 'Complaint ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get complaint details
        $query = "SELECT c.*, 
                 ch.location as charger_location,
                 v.name as vendor_name
                 FROM complaints c 
                 LEFT JOIN chargers ch ON c.charger_id = ch.cpid
                 LEFT JOIN vendors v ON c.assigned_to = v.id
                 WHERE c.tracking_id = :id OR c.id = :id_numeric";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':id_numeric', $id, PDO::PARAM_INT);
        $stmt->execute();
        
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$complaint) {
            sendJsonResponse(false, 'Complaint not found');
            return;
        }
        
        // Get timeline events
        $timelineQuery = "SELECT * FROM complaint_timeline 
                         WHERE complaint_id = :complaint_id 
                         ORDER BY timestamp ASC";
        
        $timelineStmt = $conn->prepare($timelineQuery);
        $timelineStmt->bindParam(':complaint_id', $complaint['id']);
        $timelineStmt->execute();
        
        $timeline = $timelineStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add initial event if timeline is empty
        if (empty($timeline)) {
            $timeline[] = [
                'status' => 'Complaint Received',
                'description' => 'Complaint has been registered in the system.',
                'timestamp' => $complaint['created_at']
            ];
        }
        
        // Get SLA info if assigned to vendor
        $slaInfo = null;
        if ($complaint['assigned_to']) {
            $slaQuery = "SELECT s.* 
                        FROM sla_settings s 
                        WHERE s.id = (SELECT MAX(id) FROM sla_settings)";
            
            $slaStmt = $conn->prepare($slaQuery);
            $slaStmt->execute();
            
            $slaSettings = $slaStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($slaSettings) {
                // Get assignment time
                $assignmentEvent = null;
                foreach ($timeline as $event) {
                    if (stripos($event['status'], 'assigned to vendor') !== false) {
                        $assignmentEvent = $event;
                        break;
                    }
                }
                
                if ($assignmentEvent) {
                    $assignmentTime = new DateTime($assignmentEvent['timestamp']);
                    $currentTime = new DateTime();
                    
                    // Determine SLA priority and deadline
                    $slaPriority = 'medium'; // Default
                    $slaHours = $slaSettings['medium_sla'] ?? 24;
                    
                    // Allow custom priority if set in complaint
                    if (isset($complaint['sla_priority']) && !empty($complaint['sla_priority'])) {
                        $slaPriority = strtolower($complaint['sla_priority']);
                        
                        switch($slaPriority) {
                            case 'critical':
                                $slaHours = $slaSettings['critical_sla'] ?? 4;
                                break;
                            case 'high':
                                $slaHours = $slaSettings['high_sla'] ?? 12;
                                break;
                            case 'medium':
                                $slaHours = $slaSettings['medium_sla'] ?? 24;
                                break;
                            case 'low':
                                $slaHours = $slaSettings['low_sla'] ?? 48;
                                break;
                        }
                    }
                    
                    // Calculate expected resolution date
                    $deadline = clone $assignmentTime;
                    $deadline->add(new DateInterval("PT{$slaHours}H"));
                    
                    // Calculate time remaining or overdue
                    $timeRemaining = $currentTime->diff($deadline);
                    $isOverdue = $currentTime > $deadline;
                    
                    $slaInfo = [
                        'priority' => $slaPriority,
                        'hours' => $slaHours,
                        'deadline' => $deadline->format('Y-m-d H:i:s'),
                        'isOverdue' => $isOverdue,
                        'timeRemaining' => $timeRemaining->format('%a days, %h hours, %i minutes'),
                        'formattedStatus' => $isOverdue ? 'OVERDUE' : 'On Time'
                    ];
                }
            }
        }
        
        // Prepare response
        $response = [
            'complaint' => $complaint,
            'timeline' => $timeline,
            'sla' => $slaInfo
        ];
        
        sendJsonResponse(true, 'Complaint details fetched successfully', $response);
    } catch(PDOException $e) {
        error_log("Complaint Details Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch complaint details');
    }
}

/**
 * Update Complaint Status
 */
function updateComplaintStatus($data) {
    if (!isset($data->trackingId) || empty($data->trackingId) ||
        !isset($data->newStatus) || empty($data->newStatus)) {
        
        sendJsonResponse(false, 'Tracking ID and new status are required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Get complaint details
        $query = "SELECT * FROM complaints WHERE tracking_id = :tracking_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':tracking_id', $data->trackingId);
        $stmt->execute();
        
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$complaint) {
            sendJsonResponse(false, 'Complaint not found');
            return;
        }
        
        $oldStatus = $complaint['status'];
        $currentTime = date('Y-m-d H:i:s');
        
        // Special handling for resolved status
        $statusNote = $data->statusNote ?? '';
        
        if ($data->newStatus === 'Resolved') {
            // Calculate resolution metrics if SLA was set
            $resolutionMetrics = '';
            
            if ($complaint['assigned_to'] && isset($complaint['expected_resolution_date']) && !empty($complaint['expected_resolution_date'])) {
                $deadline = new DateTime($complaint['expected_resolution_date']);
                $resolvedTime = new DateTime();
                $resolvedOnTime = $resolvedTime <= $deadline;
                
                // Calculate time difference
                $timeDifference = $resolvedTime->getTimestamp() - $deadline->getTimestamp();
                
                // Format the difference for display
                $hours = floor(abs($timeDifference) / 3600);
                $days = floor($hours / 24);
                $remainingHours = $hours % 24;
                
                $formattedDiff = $days > 0 ? "{$days} days, {$remainingHours} hours" : "{$hours} hours";
                
                if ($resolvedOnTime) {
                    // Resolved on time - calculate time before deadline
                    $resolutionMetrics = "Resolved {$formattedDiff} before SLA deadline";
                } else {
                    // Resolved late - calculate delay
                    $resolutionMetrics = "Resolved {$formattedDiff} after SLA deadline (DELAYED)";
                }
                
                // Append resolution metrics to note
                if (!empty($resolutionMetrics)) {
                    $statusNote .= "\n" . $resolutionMetrics;
                }
            }
        }
        
        // Update complaint status
        $updateQuery = "UPDATE complaints SET status = :status, last_updated = :last_updated WHERE id = :id";
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':status', $data->newStatus);
        $updateStmt->bindParam(':last_updated', $currentTime);
        $updateStmt->bindParam(':id', $complaint['id']);
        $updateStmt->execute();
        
        // Add timeline entry
        $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description, timestamp) 
                         VALUES (:complaint_id, :status, :description, :timestamp)";
        
        $timelineStmt = $conn->prepare($timelineQuery);
        $timelineStmt->bindParam(':complaint_id', $complaint['id']);
        $timelineStmt->bindParam(':status', $data->newStatus);
        
        $description = !empty($statusNote) ? $statusNote : "Status changed from {$oldStatus} to {$data->newStatus}";
        $timelineStmt->bindParam(':description', $description);
        $timelineStmt->bindParam(':timestamp', $currentTime);
        $timelineStmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Complaint status updated successfully');
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Update Complaint Status Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update complaint status');
    }
}

/**
 * Assign Complaint to Division/Vendor
 */
function assignComplaint($data) {
    if (!isset($data->trackingId) || empty($data->trackingId)) {
        sendJsonResponse(false, 'Tracking ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Get complaint details
        $query = "SELECT * FROM complaints WHERE tracking_id = :tracking_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':tracking_id', $data->trackingId);
        $stmt->execute();
        
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$complaint) {
            sendJsonResponse(false, 'Complaint not found');
            return;
        }
        
        $currentTime = date('Y-m-d H:i:s');
        $updateFields = [];
        $updateParams = [];
        $timelineDescription = "";
        
        // Handle division assignment
        if (isset($data->division) && !empty($data->division)) {
            $updateFields[] = "division = :division";
            $updateParams[':division'] = $data->division;
            
            $timelineStatus = "Assigned to Division";
            $timelineDescription = "Complaint assigned to division: {$data->division}";
            
            if (isset($data->assignmentNote) && !empty($data->assignmentNote)) {
                $timelineDescription .= "\nNote: {$data->assignmentNote}";
            }
        }
        
        // Handle vendor assignment
        if (isset($data->vendorId) && !empty($data->vendorId)) {
            $updateFields[] = "assigned_to = :assigned_to";
            $updateParams[':assigned_to'] = $data->vendorId;
            
            // Get vendor name
            $vendorQuery = "SELECT name FROM vendors WHERE id = :id";
            $vendorStmt = $conn->prepare($vendorQuery);
            $vendorStmt->bindParam(':id', $data->vendorId);
            $vendorStmt->execute();
            
            $vendorName = $vendorStmt->fetch(PDO::FETCH_ASSOC)['name'] ?? 'Unknown Vendor';
            
            $timelineStatus = "Assigned to Vendor";
            $timelineDescription = "Complaint assigned to vendor: {$vendorName}";
            
            if (isset($data->assignmentNote) && !empty($data->assignmentNote)) {
                $timelineDescription .= "\nNote: {$data->assignmentNote}";
            }
            
            // Set SLA based on priority
            if (isset($data->slaPriority) && !empty($data->slaPriority)) {
                $updateFields[] = "sla_priority = :sla_priority";
                $updateParams[':sla_priority'] = $data->slaPriority;
                
                // Get SLA settings
                $slaQuery = "SELECT * FROM sla_settings WHERE id = (SELECT MAX(id) FROM sla_settings)";
                $slaStmt = $conn->prepare($slaQuery);
                $slaStmt->execute();
                
                $slaSettings = $slaStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($slaSettings) {
                    $slaHours = 24; // Default medium
                    
                    switch(strtolower($data->slaPriority)) {
                        case 'critical':
                            $slaHours = $slaSettings['critical_sla'] ?? 4;
                            break;
                        case 'high':
                            $slaHours = $slaSettings['high_sla'] ?? 12;
                            break;
                        case 'medium':
                            $slaHours = $slaSettings['medium_sla'] ?? 24;
                            break;
                        case 'low':
                            $slaHours = $slaSettings['low_sla'] ?? 48;
                            break;
                    }
                    
                    // Calculate expected resolution date
                    $deadline = new DateTime();
                    $deadline->add(new DateInterval("PT{$slaHours}H"));
                    $expectedResolutionDate = $deadline->format('Y-m-d H:i:s');
                    
                    $updateFields[] = "expected_resolution_date = :expected_resolution_date";
                    $updateParams[':expected_resolution_date'] = $expectedResolutionDate;
                    
                    $timelineDescription .= "\nSLA Priority: {$data->slaPriority}";
                    $timelineDescription .= "\nExpected Resolution: {$expectedResolutionDate} ({$slaHours} hours)";
                }
            }
        }
        
        // Update status if requested
        if (isset($data->updateStatus) && $data->updateStatus === true) {
            $updateFields[] = "status = :status";
            $updateParams[':status'] = 'In Progress';
        }
        
        // Only proceed if we have something to update
        if (!empty($updateFields)) {
            $updateFields[] = "last_updated = :last_updated";
            $updateParams[':last_updated'] = $currentTime;
            $updateParams[':id'] = $complaint['id'];
            
            // Update complaint
            $updateQuery = "UPDATE complaints SET " . implode(", ", $updateFields) . " WHERE id = :id";
            $updateStmt = $conn->prepare($updateQuery);
            
            foreach ($updateParams as $param => $value) {
                $updateStmt->bindValue($param, $value);
            }
            
            $updateStmt->execute();
            
            // Add timeline entry
            $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description, timestamp) 
                             VALUES (:complaint_id, :status, :description, :timestamp)";
            
            $timelineStmt = $conn->prepare($timelineQuery);
            $timelineStmt->bindParam(':complaint_id', $complaint['id']);
            $timelineStmt->bindParam(':status', $timelineStatus);
            $timelineStmt->bindParam(':description', $timelineDescription);
            $timelineStmt->bindParam(':timestamp', $currentTime);
            $timelineStmt->execute();
            
            // Add status change timeline entry if updating status
            if (isset($data->updateStatus) && $data->updateStatus === true && $complaint['status'] !== 'In Progress') {
                $statusTimelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description, timestamp) 
                                       VALUES (:complaint_id, :status, :description, :timestamp)";
                
                $statusTimelineStmt = $conn->prepare($statusTimelineQuery);
                $statusTimelineStmt->bindParam(':complaint_id', $complaint['id']);
                $statusTimelineStmt->bindValue(':status', 'In Progress');
                $statusTimelineStmt->bindValue(':description', "Status changed from {$complaint['status']} to In Progress");
                $statusTimelineStmt->bindParam(':timestamp', $currentTime);
                $statusTimelineStmt->execute();
            }
            
            // Commit transaction
            $conn->commit();
            
            sendJsonResponse(true, 'Complaint assigned successfully');
        } else {
            sendJsonResponse(false, 'No assignment information provided');
        }
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Assign Complaint Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to assign complaint');
    }
}

/**
 * Delete Complaint
 */
function deleteComplaint($data) {
    if (!isset($data->trackingId) || empty($data->trackingId)) {
        sendJsonResponse(false, 'Tracking ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Begin transaction
        $conn->beginTransaction();
        
        // Get complaint ID
        $query = "SELECT id FROM complaints WHERE tracking_id = :tracking_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':tracking_id', $data->trackingId);
        $stmt->execute();
        
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$complaint) {
            sendJsonResponse(false, 'Complaint not found');
            return;
        }
        
        // Delete timeline entries first
        $deleteTimelineQuery = "DELETE FROM complaint_timeline WHERE complaint_id = :complaint_id";
        $deleteTimelineStmt = $conn->prepare($deleteTimelineQuery);
        $deleteTimelineStmt->bindParam(':complaint_id', $complaint['id']);
        $deleteTimelineStmt->execute();
        
        // Delete complaint
        $deleteComplaintQuery = "DELETE FROM complaints WHERE id = :id";
        $deleteComplaintStmt = $conn->prepare($deleteComplaintQuery);
        $deleteComplaintStmt->bindParam(':id', $complaint['id']);
        $deleteComplaintStmt->execute();
        
        // Commit transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Complaint deleted successfully');
    } catch(PDOException $e) {
        // Rollback transaction
        $conn->rollBack();
        error_log("Delete Complaint Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to delete complaint');
    }
}

/**
 * Export Complaints to Excel
 */
function exportComplaints($filter = null) {
    require_once '../vendor/autoload.php'; // Include PhpSpreadsheet library
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Build query with filters
        $query = "SELECT c.*, 
                 ch.location as charger_location,
                 v.name as vendor_name
                 FROM complaints c 
                 LEFT JOIN chargers ch ON c.charger_id = ch.cpid
                 LEFT JOIN vendors v ON c.assigned_to = v.id
                 WHERE 1=1";
        
        $params = [];
        
        // Apply filters if provided
        if ($filter) {
            $filterData = is_string($filter) ? json_decode($filter) : $filter;
            
            if (isset($filterData->status) && $filterData->status !== 'all') {
                $query .= " AND c.status = :status";
                $params[':status'] = $filterData->status;
            }
            
            if (isset($filterData->division) && $filterData->division !== 'all') {
                $query .= " AND c.division = :division";
                $params[':division'] = $filterData->division;
            }
            
            if (isset($filterData->type) && $filterData->type !== 'all') {
                if ($filterData->type === 'charger') {
                    $query .= " AND c.type NOT LIKE '%Billing%'";
                } else if ($filterData->type === 'billing') {
                    $query .= " AND c.type LIKE '%Billing%'";
                }
            }
            
            if (isset($filterData->search) && !empty($filterData->search)) {
                $query .= " AND (c.tracking_id LIKE :search OR c.charger_id LIKE :search OR c.consumer_name LIKE :search OR c.consumer_phone LIKE :search)";
                $params[':search'] = '%' . $filterData->search . '%';
            }
            
            if (isset($filterData->dateFrom) && !empty($filterData->dateFrom)) {
                $query .= " AND c.created_at >= :date_from";
                $params[':date_from'] = $filterData->dateFrom . ' 00:00:00';
            }
            
            if (isset($filterData->dateTo) && !empty($filterData->dateTo)) {
                $query .= " AND c.created_at <= :date_to";
                $params[':date_to'] = $filterData->dateTo . ' 23:59:59';
            }
        }
        
        // Add sorting
        $query .= " ORDER BY c.created_at DESC";
        
        // Execute query
        $stmt = $conn->prepare($query);
        
        // Bind parameters
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Create Excel spreadsheet
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Complaints');
        
        // Set column headers
        $headers = [
            'Tracking ID',
            'Customer Name',
            'Phone Number',
            'Email',
            'Charger ID',
            'Location',
            'Division',
            'Type',
            'Sub-Type',
            'Status',
            'Assigned To',
            'Created Date',
            'Last Updated',
            'Description'
        ];
        
        foreach (range('A', chr(ord('A') + count($headers) - 1)) as $columnIndex => $columnID) {
            $sheet->setCellValue($columnID . '1', $headers[$columnIndex]);
            $sheet->getStyle($columnID . '1')->getFont()->setBold(true);
        }
        
        // Add data rows
        $rowIndex = 2;
        foreach ($complaints as $complaint) {
            $sheet->setCellValue('A' . $rowIndex, $complaint['tracking_id']);
            $sheet->setCellValue('B' . $rowIndex, $complaint['consumer_name']);
            $sheet->setCellValue('C' . $rowIndex, $complaint['consumer_phone']);
            $sheet->setCellValue('D' . $rowIndex, $complaint['consumer_email'] ?? '');
            $sheet->setCellValue('E' . $rowIndex, $complaint['charger_id']);
            $sheet->setCellValue('F' . $rowIndex, $complaint['charger_location'] ?? $complaint['location'] ?? '');
            $sheet->setCellValue('G' . $rowIndex, $complaint['division'] ?? '');
            $sheet->setCellValue('H' . $rowIndex, $complaint['type']);
            $sheet->setCellValue('I' . $rowIndex, $complaint['sub_type'] ?? '');
            $sheet->setCellValue('J' . $rowIndex, $complaint['status']);
            $sheet->setCellValue('K' . $rowIndex, $complaint['vendor_name'] ?? '');
            $sheet->setCellValue('L' . $rowIndex, $complaint['created_at']);
            $sheet->setCellValue('M' . $rowIndex, $complaint['last_updated'] ?? '');
            $sheet->setCellValue('N' . $rowIndex, $complaint['description']);
            
            $rowIndex++;
        }
        
        // Auto-size columns
        foreach (range('A', 'N') as $columnID) {
            $sheet->getColumnDimension($columnID)->setAutoSize(true);
        }
        
        // Create writer and output file
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        
        // Generate filename with current date
        $filename = 'Complaints_' . date('Y-m-d') . '.xlsx';
        $filepath = '../temp/' . $filename;
        
        // Create temp directory if doesn't exist
        if (!is_dir('../temp')) {
            mkdir('../temp', 0755, true);
        }
        
        // Save file
        $writer->save($filepath);
        
        // Output file for download
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($filepath));
        readfile($filepath);
        
        // Delete file after download
        unlink($filepath);
        
        exit;
    } catch(PDOException $e) {
        error_log("Export Complaints Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to export complaints');
    }
}

/**
 * Get SLA Settings
 */
function getSLASettings() {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Create table if it doesn't exist
        $createTableQuery = "CREATE TABLE IF NOT EXISTS sla_settings (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            critical_sla INT NOT NULL DEFAULT 4,
                            high_sla INT NOT NULL DEFAULT 12,
                            medium_sla INT NOT NULL DEFAULT 24,
                            low_sla INT NOT NULL DEFAULT 48,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            )";
        
        $conn->exec($createTableQuery);
        
        // Check if there are any settings
        $checkQuery = "SELECT COUNT(*) as count FROM sla_settings";
        $checkStmt = $conn->query($checkQuery);
        
        if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] == 0) {
            // Insert default settings
            $defaultQuery = "INSERT INTO sla_settings (critical_sla, high_sla, medium_sla, low_sla) 
                            VALUES (4, 12, 24, 48)";
            $conn->exec($defaultQuery);
        }
        
        // Get latest settings
        $query = "SELECT * FROM sla_settings ORDER BY id DESC LIMIT 1";
        $stmt = $conn->query($query);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'SLA settings fetched successfully', $settings);
    } catch(PDOException $e) {
        error_log("Get SLA Settings Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch SLA settings');
    }
}

/**
 * Update SLA Settings
 */
function updateSLASettings($data) {
    if (!isset($data->criticalSLA) || !isset($data->highSLA) || 
        !isset($data->mediumSLA) || !isset($data->lowSLA)) {
        
        sendJsonResponse(false, 'All SLA values are required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Insert new settings (we keep history)
        $query = "INSERT INTO sla_settings (critical_sla, high_sla, medium_sla, low_sla) 
                 VALUES (:critical_sla, :high_sla, :medium_sla, :low_sla)";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':critical_sla', $data->criticalSLA, PDO::PARAM_INT);
        $stmt->bindParam(':high_sla', $data->highSLA, PDO::PARAM_INT);
        $stmt->bindParam(':medium_sla', $data->mediumSLA, PDO::PARAM_INT);
        $stmt->bindParam(':low_sla', $data->lowSLA, PDO::PARAM_INT);
        $stmt->execute();
        
        // Update existing complaints with new SLA values
        updateExistingComplaintSLAs($conn, $data);
        
        sendJsonResponse(true, 'SLA settings updated successfully');
    } catch(PDOException $e) {
        error_log("Update SLA Settings Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update SLA settings');
    }
}

/**
 * Update existing complaints with new SLA values
 */
function updateExistingComplaintSLAs($conn, $slaSettings) {
    try {
        // Get open complaints with SLA priority
        $query = "SELECT id, sla_priority, 
                 (SELECT timestamp FROM complaint_timeline WHERE complaint_id = complaints.id AND status LIKE '%Assigned to Vendor%' ORDER BY timestamp ASC LIMIT 1) as assignment_time
                 FROM complaints 
                 WHERE status IN ('Open', 'In Progress', 'Site Visit Done') 
                 AND sla_priority IS NOT NULL 
                 AND assigned_to IS NOT NULL";
        
        $stmt = $conn->query($query);
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($complaints as $complaint) {
            if (!$complaint['assignment_time']) {
                continue;
            }
            
            // Calculate new expected resolution time based on SLA settings
            $hoursToAdd = 24; // Default medium
            
            switch(strtolower($complaint['sla_priority'])) {
                case 'critical':
                    $hoursToAdd = $slaSettings->criticalSLA;
                    break;
                case 'high':
                    $hoursToAdd = $slaSettings->highSLA;
                    break;
                case 'medium':
                    $hoursToAdd = $slaSettings->mediumSLA;
                    break;
                case 'low':
                    $hoursToAdd = $slaSettings->lowSLA;
                    break;
            }
            
            // Set new expected resolution date
            $assignmentTime = new DateTime($complaint['assignment_time']);
            $newDeadline = clone $assignmentTime;
            $newDeadline->add(new DateInterval("PT{$hoursToAdd}H"));
            $expectedResolutionDate = $newDeadline->format('Y-m-d H:i:s');
            
            // Update complaint
            $updateQuery = "UPDATE complaints SET expected_resolution_date = :expected_resolution_date WHERE id = :id";
            $updateStmt = $conn->prepare($updateQuery);
            $updateStmt->bindParam(':expected_resolution_date', $expectedResolutionDate);
            $updateStmt->bindParam(':id', $complaint['id']);
            $updateStmt->execute();
        }
    } catch(PDOException $e) {
        error_log("Update Existing SLAs Error: " . $e->getMessage(), 0);
        // Don't throw - this is a secondary operation
    }
}

/**
 * Update General Settings
 */
function updateGeneralSettings($data) {
    if (!isset($data->systemName) || !isset($data->companyName) ||
        !isset($data->contactEmail) || !isset($data->supportPhone)) {
        
        sendJsonResponse(false, 'All settings are required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Create settings table if not exists
        $createTableQuery = "CREATE TABLE IF NOT EXISTS general_settings (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            setting_key VARCHAR(50) NOT NULL UNIQUE,
                            setting_value TEXT,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                            )";
        
        $conn->exec($createTableQuery);
        
        // Update or insert settings
        $settings = [
            'system_name' => $data->systemName,
            'company_name' => $data->companyName,
            'contact_email' => $data->contactEmail,
            'support_phone' => $data->supportPhone
        ];
        
        foreach ($settings as $key => $value) {
            // Check if setting exists
            $checkQuery = "SELECT COUNT(*) as count FROM general_settings WHERE setting_key = :key";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':key', $key);
            $checkStmt->execute();
            
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                // Update existing setting
                $updateQuery = "UPDATE general_settings SET setting_value = :value WHERE setting_key = :key";
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bindParam(':value', $value);
                $updateStmt->bindParam(':key', $key);
                $updateStmt->execute();
            } else {
                // Insert new setting
                $insertQuery = "INSERT INTO general_settings (setting_key, setting_value) VALUES (:key, :value)";
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bindParam(':key', $key);
                $insertStmt->bindParam(':value', $value);
                $insertStmt->execute();
            }
        }
        
        sendJsonResponse(true, 'General settings updated successfully');
    } catch(PDOException $e) {
        error_log("Update General Settings Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update general settings');
    }
}

/**
 * Update Notification Settings
 */
function updateNotificationSettings($data) {
    if (!isset($data->emailNotifications) || 
        !isset($data->smsNotifications) || 
        !isset($data->pushNotifications) || 
        !isset($data->notificationFrequency)) {
        
        sendJsonResponse(false, 'All notification settings are required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Create settings table if not exists
        $createTableQuery = "CREATE TABLE IF NOT EXISTS notification_settings (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            setting_key VARCHAR(50) NOT NULL UNIQUE,
                            setting_value TEXT,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                            )";
        
        $conn->exec($createTableQuery);
        
        // Update or insert settings
        $settings = [
            'email_notifications' => $data->emailNotifications ? '1' : '0',
            'sms_notifications' => $data->smsNotifications ? '1' : '0',
            'push_notifications' => $data->pushNotifications ? '1' : '0',
            'notification_frequency' => $data->notificationFrequency
        ];
        
        foreach ($settings as $key => $value) {
            // Check if setting exists
            $checkQuery = "SELECT COUNT(*) as count FROM notification_settings WHERE setting_key = :key";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':key', $key);
            $checkStmt->execute();
            
            if ($checkStmt->fetch(PDO::FETCH_ASSOC)['count'] > 0) {
                // Update existing setting
                $updateQuery = "UPDATE notification_settings SET setting_value = :value WHERE setting_key = :key";
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bindParam(':value', $value);
                $updateStmt->bindParam(':key', $key);
                $updateStmt->execute();
            } else {
                // Insert new setting
                $insertQuery = "INSERT INTO notification_settings (setting_key, setting_value) VALUES (:key, :value)";
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bindParam(':key', $key);
                $insertStmt->bindParam(':value', $value);
                $insertStmt->execute();
            }
        }
        
        sendJsonResponse(true, 'Notification settings updated successfully');
    } catch(PDOException $e) {
        error_log("Update Notification Settings Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update notification settings');
    }
}