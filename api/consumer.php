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
    // Handle GET requests (fetch charger details, etc.)
    if (isset($_GET['action'])) {
        if ($_GET['action'] === 'fetchCharger' && isset($_GET['cpid'])) {
            fetchChargerDetails($_GET['cpid']);
        } else {
            sendJsonResponse(false, 'Invalid action');
        }
    } else {
        sendJsonResponse(false, 'Action not specified');
    }
} elseif ($method === 'POST') {
    // Handle POST requests (submit complaint)
    $data = json_decode(file_get_contents("php://input"));
    
    if (isset($data->action)) {
        if ($data->action === 'submitComplaint') {
            submitComplaint($data);
        } else {
            sendJsonResponse(false, 'Invalid action');
        }
    } else {
        sendJsonResponse(false, 'Action not specified');
    }
} else {
    sendJsonResponse(false, 'Method not allowed');
}

/**
 * Fetch charger details by CPID
 */
function fetchChargerDetails($cpid) {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Clean and standardize the CPID
        $cleanCpid = cleanCpid($cpid);
        
        // Query charger details
        $query = "SELECT c.*, d.name as division_name 
                  FROM chargers c 
                  LEFT JOIN divisions d ON c.division_id = d.id 
                  WHERE c.cpid = :cpid";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':cpid', $cleanCpid);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            $charger = $stmt->fetch(PDO::FETCH_ASSOC);
            sendJsonResponse(true, 'Charger found', $charger);
        } else {
            // Charger not found in database
            sendJsonResponse(true, 'Unregistered charger', [
                'cpid' => $cleanCpid,
                'location' => 'Unregistered Charger',
                'division' => null
            ]);
        }
    } catch(PDOException $e) {
        error_log("Fetch Charger Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to fetch charger details');
    }
}

/**
 * Submit a new complaint
 */
function submitComplaint($data) {
    if (!validateComplaintData($data)) {
        sendJsonResponse(false, 'Invalid complaint data');
    }
    
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Start transaction
        $conn->beginTransaction();
        
        // Generate tracking ID
        $trackingId = generateTrackingId();
        
        // Clean and standardize the CPID
        $cleanCpid = cleanCpid($data->stationId);
        
        // Prepare complaint data
        $complaint = [
            'tracking_id' => $trackingId,
            'charger_id' => $cleanCpid,
            'location' => $data->location ?? 'Unknown Location',
            'division' => $data->division ?? null,
            'type' => $data->complaintType,
            'sub_type' => $data->subIssueType ?? null,
            'status' => 'Open',
            'consumer_name' => $data->consumerName,
            'consumer_phone' => preg_replace('/\D/', '', $data->consumerPhone),
            'consumer_email' => $data->consumerEmail ?? null,
            'description' => $data->complaintDescription
        ];
        
        // Insert complaint
        $query = "INSERT INTO complaints 
                  (tracking_id, charger_id, location, division, type, sub_type, 
                   status, consumer_name, consumer_phone, consumer_email, description) 
                  VALUES 
                  (:tracking_id, :charger_id, :location, :division, :type, :sub_type, 
                   :status, :consumer_name, :consumer_phone, :consumer_email, :description)";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($complaint);
        
        // Get last insert ID for timeline entries
        $complaintId = $conn->lastInsertId();
        
        // Add initial timeline entry
        $timelineQuery = "INSERT INTO complaint_timeline (complaint_id, status, description) 
                          VALUES (:complaint_id, 'Complaint Received', 'Complaint has been registered in the system.')";
        
        $timelineStmt = $conn->prepare($timelineQuery);
        $timelineStmt->bindParam(':complaint_id', $complaintId);
        $timelineStmt->execute();
        
        // Add auto-assignment note if division exists
        if (!empty($complaint['division'])) {
            $divisionAssignQuery = "INSERT INTO complaint_timeline (complaint_id, status, description) 
                                   VALUES (:complaint_id, 'Assigned to Division', :description)";
            
            $divisionAssignStmt = $conn->prepare($divisionAssignQuery);
            $divisionAssignStmt->bindParam(':complaint_id', $complaintId);
            $divisionAssignStmt->bindParam(':description', $assignmentDesc);
            
            $assignmentDesc = "Complaint automatically assigned to " . $complaint['division'];
            $divisionAssignStmt->execute();
        }
        
        // Commit transaction
        $conn->commit();
        
        // Return success with tracking ID
        sendJsonResponse(true, 'Complaint submitted successfully', [
            'trackingId' => $trackingId
        ]);
    } catch(PDOException $e) {
        // Rollback transaction on error
        $conn->rollBack();
        error_log("Submit Complaint Error: " . $e->getMessage(), 0);
        sendJsonResponse(false, 'Failed to submit complaint. Please try again.');
    }
}

/**
 * Validate complaint data
 */
function validateComplaintData($data) {
    // Check required fields
    if (!isset($data->stationId) || empty($data->stationId)) {
        return false;
    }
    
    if (!isset($data->consumerName) || empty($data->consumerName)) {
        return false;
    }
    
    if (!isset($data->consumerPhone) || empty($data->consumerPhone)) {
        return false;
    }
    
    if (!isset($data->complaintType) || empty($data->complaintType)) {
        return false;
    }
    
    if (!isset($data->complaintDescription) || empty($data->complaintDescription)) {
        return false;
    }
    
    // Validate phone number format
    $phoneRegex = '/^\+?[0-9]{10,15}$/';
    if (!preg_match($phoneRegex, preg_replace('/\D/', '', $data->consumerPhone))) {
        return false;
    }
    
    return true;
}

/**
 * Generate a unique tracking ID
 */
function generateTrackingId() {
    $today = date('Ymd');
    $random = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT);
    return "CP-{$today}-{$random}";
}

/**
 * Clean and standardize CPID
 */
function cleanCpid($cpid) {
    if (empty($cpid)) {
        return '';
    }
    
    // Convert to uppercase
    $upperCaseId = strtoupper($cpid);
    
    // Check if the ID follows the IN*ADN* format with asterisks
    if (strpos($upperCaseId, 'IN*ADN*') !== false) {
        return substr($upperCaseId, 7);
    }
    
    // Check if the ID follows the IN-ADN- format with hyphens
    if (strpos($upperCaseId, 'IN-ADN-') !== false) {
        return substr($upperCaseId, 7);
    }
    
    // Otherwise, assume it's already just the CPID
    return $upperCaseId;
}
?>