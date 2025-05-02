<?php
// Include database connection
require_once '../config/db.php';

// Set headers for CORS and JSON
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Route the request
if ($method === 'GET') {
    // Handle GET requests
    handleGetRequest();
} elseif ($method === 'POST') {
    // Handle POST requests
    handlePostRequest();
} else {
    sendJsonResponse(false, 'Method not allowed');
}

/**
 * Handle GET requests
 */
function handleGetRequest() {
    if (!isset($_GET['action'])) {
        sendJsonResponse(false, 'Action not specified');
    }

    // Get division ID (required for most actions)
    $divisionId = isset($_GET['divisionId']) ? intval($_GET['divisionId']) : 0;
    
    // Route to appropriate function based on action
    switch ($_GET['action']) {
        case 'getDashboardStats':
            getDashboardStats($divisionId);
            break;
        case 'getRecentComplaints':
            getRecentComplaints($divisionId);
            break;
        case 'getComplaints':
            getComplaints($divisionId);
            break;
        case 'getComplaintDetails':
            getComplaintDetails($_GET['trackingId']);
            break;
        case 'getChargers':
            getChargers($divisionId);
            break;
        case 'getChargerDetails':
            getChargerDetails($_GET['chargerId']);
            break;
        case 'getVendors':
            getVendors($divisionId);
            break;
        case 'getAvailableVendors':
            getAvailableVendors($divisionId);
            break;
        case 'getSLASettings':
            getSLASettings();
            break;
        default:
            sendJsonResponse(false, 'Invalid action');
    }
}

/**
 * Handle POST requests
 */
function handlePostRequest() {
    // Get data from request body
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['action'])) {
        sendJsonResponse(false, 'Action not specified');
    }
    
    // Route to appropriate function based on action
    switch ($data['action']) {
        case 'assignComplaintToVendor':
            assignComplaintToVendor($data);
            break;
        case 'updateComplaintStatus':
            updateComplaintStatus($data);
            break;
        case 'addCharger':
            addCharger($data);
            break;
        default:
            sendJsonResponse(false, 'Invalid action');
    }
}

/**
 * Get dashboard statistics
 */
function getDashboardStats($divisionId) {
    if (!$divisionId) {
        sendJsonResponse(false, 'Division ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get basic stats
        $statsQuery = "SELECT 
            (SELECT COUNT(*) FROM chargers WHERE division_id = :divisionId) AS totalChargers,
            (SELECT COUNT(*) FROM chargers WHERE division_id = :divisionId AND status = 'active') AS activeChargers,
            (SELECT COUNT(*) FROM complaints WHERE division = (SELECT name FROM divisions WHERE id = :divisionId) AND status IN ('Open', 'In Progress', 'Pending Resolution Approval')) AS openComplaints";
        
        $statsStmt = $conn->prepare($statsQuery);
        $statsStmt->bindParam(':divisionId', $divisionId);
        $statsStmt->execute();
        
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
        
        // Get resolution rate (resolved complaints / total complaints * 100)
        $resolutionQuery = "SELECT 
            COUNT(CASE WHEN status = 'Resolved' THEN 1 END) AS resolvedCount,
            COUNT(*) AS totalCount
            FROM complaints 
            WHERE division = (SELECT name FROM divisions WHERE id = :divisionId)
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        
        $resolutionStmt = $conn->prepare($resolutionQuery);
        $resolutionStmt->bindParam(':divisionId', $divisionId);
        $resolutionStmt->execute();
        
        $resolutionData = $resolutionStmt->fetch(PDO::FETCH_ASSOC);
        
        // Calculate resolution rate
        $resolutionRate = 0;
        if (!empty($resolutionData['totalCount']) && $resolutionData['totalCount'] > 0) {
            $resolutionRate = round(($resolutionData['resolvedCount'] / $resolutionData['totalCount']) * 100);
        }
        
        // Get trend data
        // Chargers trend (month over month change)
        $chargersTrendQuery = "SELECT 
            (SELECT COUNT(*) FROM chargers 
             WHERE division_id = :divisionId AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) 
            - 
            (SELECT COUNT(*) FROM chargers 
             WHERE division_id = :divisionId AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) 
             AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)) 
            AS chargersTrend";
        
        $chargersTrendStmt = $conn->prepare($chargersTrendQuery);
        $chargersTrendStmt->bindParam(':divisionId', $divisionId);
        $chargersTrendStmt->execute();
        
        $chargersTrend = $chargersTrendStmt->fetchColumn();
        
        // Active chargers trend (day over day change)
        $activeChargersTrendQuery = "SELECT 
            (SELECT COUNT(*) FROM chargers 
             WHERE division_id = :divisionId AND status = 'active') 
            - 
            (SELECT COUNT(*) FROM chargers 
             WHERE division_id = :divisionId AND status = 'active' 
             AND last_status_change < DATE_SUB(NOW(), INTERVAL 1 DAY)) 
            AS activeChargersTrend";
        
        // Since we don't track last_status_change yet, use a placeholder value
        $activeChargersTrend = 0;
        
        // Open complaints trend (week over week change)
        $openComplaintsTrendQuery = "SELECT 
            (SELECT COUNT(*) FROM complaints 
             WHERE division = (SELECT name FROM divisions WHERE id = :divisionId)
             AND status IN ('Open', 'In Progress', 'Pending Resolution Approval')) 
            - 
            (SELECT COUNT(*) FROM complaints 
             WHERE division = (SELECT name FROM divisions WHERE id = :divisionId)
             AND status IN ('Open', 'In Progress', 'Pending Resolution Approval')
             AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)) 
            AS openComplaintsTrend";
        
        $openComplaintsTrendStmt = $conn->prepare($openComplaintsTrendQuery);
        $openComplaintsTrendStmt->bindParam(':divisionId', $divisionId);
        $openComplaintsTrendStmt->execute();
        
        $openComplaintsTrend = $openComplaintsTrendStmt->fetchColumn();
        
        // Resolution rate trend (month over month change)
        $resolutionRateTrendQuery = "SELECT 
            (SELECT 
                CASE WHEN COUNT(*) > 0 
                THEN ROUND((COUNT(CASE WHEN status = 'Resolved' THEN 1 END) / COUNT(*)) * 100)
                ELSE 0 END
             FROM complaints 
             WHERE division = (SELECT name FROM divisions WHERE id = :divisionId)
             AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) 
            - 
            (SELECT 
                CASE WHEN COUNT(*) > 0 
                THEN ROUND((COUNT(CASE WHEN status = 'Resolved' THEN 1 END) / COUNT(*)) * 100)
                ELSE 0 END
             FROM complaints 
             WHERE division = (SELECT name FROM divisions WHERE id = :divisionId)
             AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
             AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)) 
            AS resolutionRateTrend";
        
        $resolutionRateTrendStmt = $conn->prepare($resolutionRateTrendQuery);
        $resolutionRateTrendStmt->bindParam(':divisionId', $divisionId);
        $resolutionRateTrendStmt->execute();
        
        $resolutionRateTrend = $resolutionRateTrendStmt->fetchColumn();
        
        // Get charger status distribution for chart
        $chargerStatusQuery = "SELECT 
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
            SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive,
            SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance
            FROM chargers
            WHERE division_id = :divisionId";
        
        $chargerStatusStmt = $conn->prepare($chargerStatusQuery);
        $chargerStatusStmt->bindParam(':divisionId', $divisionId);
        $chargerStatusStmt->execute();
        
        $chargerStatusData = $chargerStatusStmt->fetch(PDO::FETCH_ASSOC);
        
        // Prepare response data
        $responseData = [
            'totalChargers' => $stats['totalChargers'] ?? 0,
            'activeChargers' => $stats['activeChargers'] ?? 0,
            'openComplaints' => $stats['openComplaints'] ?? 0,
            'resolutionRate' => $resolutionRate,
            'chargersTrend' => $chargersTrend,
            'activeChargersTrend' => $activeChargersTrend,
            'openComplaintsTrend' => $openComplaintsTrend,
            'resolutionRateTrend' => $resolutionRateTrend,
            'chargerStatusData' => $chargerStatusData
        ];
        
        sendJsonResponse(true, 'Dashboard stats fetched successfully', $responseData);
    } catch (PDOException $e) {
        error_log("Dashboard Stats Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch dashboard stats');
    }
}

/**
 * Get recent complaints for division
 */
function getRecentComplaints($divisionId, $limit = 5) {
    if (!$divisionId) {
        sendJsonResponse(false, 'Division ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get division name
        $divNameQuery = "SELECT name FROM divisions WHERE id = :divisionId";
        $divNameStmt = $conn->prepare($divNameQuery);
        $divNameStmt->bindParam(':divisionId', $divisionId);
        $divNameStmt->execute();
        $divisionName = $divNameStmt->fetchColumn();
        
        if (!$divisionName) {
            sendJsonResponse(false, 'Division not found');
        }
        
        // Get recent complaints
        $query = "SELECT c.*,
                 (SELECT v.name FROM vendors v WHERE v.id = c.assigned_to) AS vendor_name
                 FROM complaints c
                 WHERE c.division = :divisionName
                 ORDER BY c.created_at DESC
                 LIMIT :limit";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':divisionName', $divisionName);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'Recent complaints fetched successfully', $complaints);
    } catch (PDOException $e) {
        error_log("Recent Complaints Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch recent complaints');
    }
}

/**
 * Get paginated complaints for division with filtering
 */
function getComplaints($divisionId) {
    if (!$divisionId) {
        sendJsonResponse(false, 'Division ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get division name
        $divNameQuery = "SELECT name FROM divisions WHERE id = :divisionId";
        $divNameStmt = $conn->prepare($divNameQuery);
        $divNameStmt->bindParam(':divisionId', $divisionId);
        $divNameStmt->execute();
        $divisionName = $divNameStmt->fetchColumn();
        
        if (!$divisionName) {
            sendJsonResponse(false, 'Division not found');
        }
        
        // Get pagination parameters
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
        $offset = ($page - 1) * $limit;
        
        // Build query with filters
        $conditions = ["c.division = :divisionName"];
        $params = [':divisionName' => $divisionName];
        
        // Status filter
        if (isset($_GET['status']) && $_GET['status'] !== 'all') {
            $conditions[] = "c.status = :status";
            $params[':status'] = $_GET['status'];
        }
        
        // Type filter
        if (isset($_GET['type']) && $_GET['type'] !== 'all') {
            $conditions[] = "c.type LIKE :type";
            $params[':type'] = '%' . $_GET['type'] . '%';
        }
        
        // Search filter
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $conditions[] = "(c.tracking_id LIKE :search OR c.charger_id LIKE :search OR c.location LIKE :search OR c.consumer_name LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        
        // Date range filter
        if (isset($_GET['dateFrom']) && !empty($_GET['dateFrom'])) {
            $conditions[] = "c.created_at >= :dateFrom";
            $params[':dateFrom'] = $_GET['dateFrom'] . ' 00:00:00';
        }
        
        if (isset($_GET['dateTo']) && !empty($_GET['dateTo'])) {
            $conditions[] = "c.created_at <= :dateTo";
            $params[':dateTo'] = $_GET['dateTo'] . ' 23:59:59';
        }
        
        // Build WHERE clause
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        
        // Count total records for pagination
        $countQuery = "SELECT COUNT(*) FROM complaints c $whereClause";
        $countStmt = $conn->prepare($countQuery);
        foreach ($params as $key => $value) {
            $countStmt->bindValue($key, $value);
        }
        $countStmt->execute();
        $totalRecords = $countStmt->fetchColumn();
        $totalPages = ceil($totalRecords / $limit);
        
        // Get complaints with pagination
        $query = "SELECT c.*,
                 (SELECT v.name FROM vendors v WHERE v.id = c.assigned_to) AS vendor_name
                 FROM complaints c
                 $whereClause
                 ORDER BY c.created_at DESC
                 LIMIT :offset, :limit";
        
        $stmt = $conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add SLA information
        foreach ($complaints as &$complaint) {
            // Add placeholder SLA info for now
            if ($complaint['assigned_to']) {
                $complaint['sla_priority'] = 'medium'; // Default priority
                $complaint['expected_resolution_date'] = date('Y-m-d H:i:s', strtotime('+24 hours', strtotime($complaint['created_at'])));
            }
        }
        
        $response = [
            'data' => $complaints,
            'pagination' => [
                'currentPage' => $page,
                'totalPages' => $totalPages,
                'totalRecords' => $totalRecords,
                'limit' => $limit
            ]
        ];
        
        sendJsonResponse(true, 'Complaints fetched successfully', $response);
    } catch (PDOException $e) {
        error_log("Get Complaints Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch complaints');
    }
}

/**
 * Get complaint details by tracking ID
 */
function getComplaintDetails($trackingId) {
    if (!$trackingId) {
        sendJsonResponse(false, 'Tracking ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get complaint details
        $query = "SELECT c.*,
                 (SELECT v.name FROM vendors v WHERE v.id = c.assigned_to) AS vendor_name
                 FROM complaints c
                 WHERE c.tracking_id = :trackingId";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':trackingId', $trackingId);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            sendJsonResponse(false, 'Complaint not found');
        }
        
        $complaint = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get timeline data
        $timelineQuery = "SELECT * FROM complaint_timeline 
                         WHERE complaint_id = :complaintId 
                         ORDER BY timestamp ASC";
        
        $timelineStmt = $conn->prepare($timelineQuery);
        $timelineStmt->bindParam(':complaintId', $complaint['id']);
        $timelineStmt->execute();
        
        $timeline = $timelineStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add SLA information
        if ($complaint['assigned_to']) {
            // Add placeholder SLA info for now
            $complaint['sla_priority'] = 'medium'; // Default priority
            $complaint['expected_resolution_date'] = date('Y-m-d H:i:s', strtotime('+24 hours', strtotime($complaint['created_at'])));
        }
        
        // Add timeline to complaint data
        $complaint['timeline'] = $timeline;
        
        sendJsonResponse(true, 'Complaint details fetched successfully', $complaint);
    } catch (PDOException $e) {
        error_log("Complaint Details Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch complaint details');
    }
}

/**
 * Get division chargers with filtering and pagination
 */
function getChargers($divisionId) {
    if (!$divisionId) {
        sendJsonResponse(false, 'Division ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get pagination parameters
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
        $offset = ($page - 1) * $limit;
        
        // Build query with filters
        $conditions = ["c.division_id = :divisionId"];
        $params = [':divisionId' => $divisionId];
        
        // Status filter
        if (isset($_GET['status']) && $_GET['status'] !== 'all') {
            $conditions[] = "c.status = :status";
            $params[':status'] = $_GET['status'];
        }
        
        // Type filter
        if (isset($_GET['type']) && $_GET['type'] !== 'all') {
            $conditions[] = "c.type LIKE :type";
            $params[':type'] = '%' . $_GET['type'] . '%';
        }
        
        // Search filter
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $conditions[] = "(c.cpid LIKE :search OR c.location LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        
        // Build WHERE clause
        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        
        // Count total records for pagination
        $countQuery = "SELECT COUNT(*) FROM chargers c $whereClause";
        $countStmt = $conn->prepare($countQuery);
        foreach ($params as $key => $value) {
            $countStmt->bindValue($key, $value);
        }
        $countStmt->execute();
        $totalRecords = $countStmt->fetchColumn();
        $totalPages = ceil($totalRecords / $limit);
        
        // Get chargers with pagination
        $query = "SELECT c.*,
                 (SELECT COUNT(*) FROM complaints cp WHERE cp.charger_id = c.cpid AND cp.status IN ('Open', 'In Progress', 'Pending Resolution Approval')) AS open_complaints
                 FROM chargers c
                 $whereClause
                 ORDER BY c.created_at DESC
                 LIMIT :offset, :limit";
        
        $stmt = $conn->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $chargers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $response = [
            'data' => $chargers,
            'pagination' => [
                'currentPage' => $page,
                'totalPages' => $totalPages,
                'totalRecords' => $totalRecords,
                'limit' => $limit
            ]
        ];
        
        sendJsonResponse(true, 'Chargers fetched successfully', $response);
    } catch (PDOException $e) {
        error_log("Get Chargers Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch chargers');
    }
}

/**
 * Get charger details
 */
function getChargerDetails($chargerId) {
    if (!$chargerId) {
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
                 WHERE c.id = :chargerId";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':chargerId', $chargerId);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            sendJsonResponse(false, 'Charger not found');
        }
        
        $charger = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get recent complaints for this charger
        $complaintsQuery = "SELECT tracking_id, type, status, created_at 
                           FROM complaints 
                           WHERE charger_id = :cpid
                           ORDER BY created_at DESC 
                           LIMIT 5";
        
        $complaintsStmt = $conn->prepare($complaintsQuery);
        $complaintsStmt->bindParam(':cpid', $charger['cpid']);
        $complaintsStmt->execute();
        
        $complaints = $complaintsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Add complaints to charger data
        $charger['recent_complaints'] = $complaints;
        $charger['open_complaints'] = count(array_filter($complaints, function($c) {
            return $c['status'] !== 'Resolved' && $c['status'] !== 'Closed';
        }));
        
        sendJsonResponse(true, 'Charger details fetched successfully', $charger);
    } catch (PDOException $e) {
        error_log("Charger Details Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch charger details');
    }
}

/**
 * Get division vendors
 */
function getVendors($divisionId) {
    if (!$divisionId) {
        sendJsonResponse(false, 'Division ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get vendors
        $query = "SELECT v.*,
                 (SELECT COUNT(*) FROM complaints c WHERE c.assigned_to = v.id AND c.status IN ('Open', 'In Progress', 'Pending Resolution Approval')) AS open_tickets
                 FROM vendors v
                 WHERE v.division_id = :divisionId AND v.status = 'active'
                 ORDER BY v.name ASC";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':divisionId', $divisionId);
        $stmt->execute();
        
        $vendors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'Vendors fetched successfully', $vendors);
    } catch (PDOException $e) {
        error_log("Get Vendors Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch vendors');
    }
}

/**
 * Get available vendors for complaint assignment
 */
function getAvailableVendors($divisionId) {
    if (!$divisionId) {
        sendJsonResponse(false, 'Division ID is required');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Get vendors
        $query = "SELECT id, name
                 FROM vendors
                 WHERE division_id = :divisionId AND status = 'active'
                 ORDER BY name ASC";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':divisionId', $divisionId);
        $stmt->execute();
        
        $vendors = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendJsonResponse(true, 'Available vendors fetched successfully', $vendors);
    } catch (PDOException $e) {
        error_log("Get Available Vendors Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch available vendors');
    }
}

/**
 * Get SLA settings
 */
function getSLASettings() {
    // This is a placeholder function for now
    // In a real implementation, these would be retrieved from a database table
    
    $slaSettings = [
        'criticalSLA' => 4, // hours
        'highSLA' => 12, // hours
        'mediumSLA' => 24, // hours
        'lowSLA' => 48 // hours
    ];
    
    sendJsonResponse(true, 'SLA settings fetched successfully', $slaSettings);
}

/**
 * Assign complaint to vendor
 */
function assignComplaintToVendor($data) {
    // Validate required data
    if (!isset($data['trackingId']) || !isset($data['vendorId']) || !isset($data['divisionId'])) {
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Start a transaction
        $conn->beginTransaction();
        
        // Get complaint details
        $complaintQuery = "SELECT id, tracking_id, status FROM complaints WHERE tracking_id = :trackingId";
        $complaintStmt = $conn->prepare($complaintQuery);
        $complaintStmt->bindParam(':trackingId', $data['trackingId']);
        $complaintStmt->execute();
        
        if ($complaintStmt->rowCount() === 0) {
            $conn->rollBack();
            sendJsonResponse(false, 'Complaint not found');
        }
        
        $complaint = $complaintStmt->fetch(PDO::FETCH_ASSOC);
        
        // Get vendor details
        $vendorQuery = "SELECT id, name FROM vendors WHERE id = :vendorId";
        $vendorStmt = $conn->prepare($vendorQuery);
        $vendorStmt->bindParam(':vendorId', $data['vendorId']);
        $vendorStmt->execute();
        
        if ($vendorStmt->rowCount() === 0) {
            $conn->rollBack();
            sendJsonResponse(false, 'Vendor not found');
        }
        
        $vendor = $vendorStmt->fetch(PDO::FETCH_ASSOC);
        
        // Calculate expected resolution date based on SLA priority
        $hoursToAdd = 24; // Default medium priority (24 hours)
        
        if (isset($data['slaPriority'])) {
            switch ($data['slaPriority']) {
                case 'critical':
                    $hoursToAdd = 4;
                    break;
                case 'high':
                    $hoursToAdd = 12;
                    break;
                case 'medium':
                    $hoursToAdd = 24;
                    break;
                case 'low':
                    $hoursToAdd = 48;
                    break;
            }
        }
        
        $expectedResolutionDate = date('Y-m-d H:i:s', strtotime("+{$hoursToAdd} hours"));
        
        // Update complaint with vendor assignment
        $updateQuery = "UPDATE complaints 
                       SET assigned_to = :vendorId,
                       status = :status,
                       last_updated = NOW()
                       WHERE id = :complaintId";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':vendorId', $vendor['id']);
        $updateStmt->bindParam(':complaintId', $complaint['id']);
        
        // Update status to In Progress if requested
        $newStatus = $complaint['status'];
        if (isset($data['updateStatus']) && $data['updateStatus']) {
            $newStatus = 'In Progress';
        }
        $updateStmt->bindParam(':status', $newStatus);
        
        $updateStmt->execute();
        
        // Add timeline entry
        $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description) 
                         VALUES (:complaintId, :status, :description)";
        
        $timelineStmt = $conn->prepare($timelineQuery);
        $timelineStmt->bindParam(':complaintId', $complaint['id']);
        $timelineStmt->bindParam(':status', $timelineStatus);
        $timelineStmt->bindParam(':description', $timelineDesc);
        
        $timelineStatus = 'Assigned to Vendor';
        $timelineDesc = "Complaint assigned to " . $vendor['name'];
        if (!empty($data['note'])) {
            $timelineDesc .= " with note: " . $data['note'];
        }
        
        $timelineStmt->execute();
        
        // If status was changed to In Progress, add another timeline entry
        if ($newStatus !== $complaint['status']) {
            $timelineStatus = $newStatus;
            $timelineDesc = "Status updated to " . $newStatus;
            
            $timelineStmt->execute();
        }
        
        // Commit the transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Complaint assigned successfully', [
            'trackingId' => $complaint['tracking_id'],
            'vendorId' => $vendor['id'],
            'vendorName' => $vendor['name'],
            'status' => $newStatus,
            'expectedResolutionDate' => $expectedResolutionDate
        ]);
    } catch (PDOException $e) {
        $conn->rollBack();
        error_log("Assign Complaint Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to assign complaint to vendor');
    }
}

/**
 * Update complaint status
 */
function updateComplaintStatus($data) {
    // Validate required data
    if (!isset($data['trackingId']) || !isset($data['newStatus']) || !isset($data['divisionId'])) {
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Start a transaction
        $conn->beginTransaction();
        
        // Get complaint details
        $complaintQuery = "SELECT id, tracking_id, status, assigned_to FROM complaints WHERE tracking_id = :trackingId";
        $complaintStmt = $conn->prepare($complaintQuery);
        $complaintStmt->bindParam(':trackingId', $data['trackingId']);
        $complaintStmt->execute();
        
        if ($complaintStmt->rowCount() === 0) {
            $conn->rollBack();
            sendJsonResponse(false, 'Complaint not found');
        }
        
        $complaint = $complaintStmt->fetch(PDO::FETCH_ASSOC);
        
        // Update complaint status
        $updateQuery = "UPDATE complaints 
                       SET status = :newStatus,
                       last_updated = NOW()
                       WHERE id = :complaintId";
        
        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->bindParam(':newStatus', $data['newStatus']);
        $updateStmt->bindParam(':complaintId', $complaint['id']);
        $updateStmt->execute();
        
        // Add timeline entry
        $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description) 
                         VALUES (:complaintId, :status, :description)";
        
        $timelineStmt = $conn->prepare($timelineQuery);
        $timelineStmt->bindParam(':complaintId', $complaint['id']);
        $timelineStmt->bindParam(':status', $data['newStatus']);
        
        $description = "Status updated to " . $data['newStatus'];
        if (!empty($data['note'])) {
            $description .= ": " . $data['note'];
        }
        
        $timelineStmt->bindParam(':description', $description);
        $timelineStmt->execute();
        
        // Initialize response data
        $responseData = [
            'trackingId' => $complaint['tracking_id'],
            'oldStatus' => $complaint['status'],
            'newStatus' => $data['newStatus']
        ];
        
        // Handle special actions for status changes
        if ($complaint['status'] === 'Pending Resolution Approval' && $data['newStatus'] === 'Resolved') {
            // Resolution approved
            $responseData['specialAction'] = 'resolution_approved';
        } elseif ($complaint['status'] === 'Pending Resolution Approval' && $data['newStatus'] === 'In Progress') {
            // Resolution rejected
            $responseData['specialAction'] = 'resolution_rejected';
        }
        
        // Commit the transaction
        $conn->commit();
        
        sendJsonResponse(true, 'Complaint status updated successfully', $responseData);
    } catch (PDOException $e) {
        $conn->rollBack();
        error_log("Update Status Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to update complaint status');
    }
}

/**
 * Add a new charger
 */
function addCharger($data) {
    // Validate required data
    if (!isset($data['cpid']) || !isset($data['location']) || !isset($data['divisionId'])) {
        sendJsonResponse(false, 'Required fields missing');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Check if charger CPID already exists
        $checkQuery = "SELECT id FROM chargers WHERE cpid = :cpid";
        $checkStmt = $conn->prepare($checkQuery);
        $checkStmt->bindParam(':cpid', $data['cpid']);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() > 0) {
            sendJsonResponse(false, 'Charger with this CPID already exists');
        }
        
        // Insert new charger
        $query = "INSERT INTO chargers (cpid, serial_number, location, make, model, type, status, division_id, created_at)
                 VALUES (:cpid, :serialNumber, :location, :make, :model, :type, :status, :divisionId, :commissionDate)";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':cpid', $data['cpid']);
        $stmt->bindParam(':serialNumber', $data['serialNumber']);
        $stmt->bindParam(':location', $data['location']);
        $stmt->bindParam(':make', $data['make']);
        $stmt->bindParam(':model', $data['model']);
        $stmt->bindParam(':type', $data['type']);
        $stmt->bindParam(':status', $data['status']);
        $stmt->bindParam(':divisionId', $data['divisionId']);
        $stmt->bindParam(':commissionDate', $data['commissionDate']);
        
        $stmt->execute();
        
        sendJsonResponse(true, 'Charger added successfully', [
            'id' => $conn->lastInsertId(),
            'cpid' => $data['cpid']
        ]);
    } catch (PDOException $e) {
        error_log("Add Charger Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to add charger: ' . $e->getMessage());
    }
}
?>