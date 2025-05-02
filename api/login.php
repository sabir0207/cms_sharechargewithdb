<?php
// Include database connection
require_once '../config/db.php';

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set headers for CORS and JSON
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers, Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With');

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Only POST requests are allowed');
}

// Get POST data
$input = file_get_contents("php://input");
$data = json_decode($input);

// Log received data for debugging
error_log("Login API received: " . $input);

// If no data received or invalid JSON
if (!$data) {
    error_log("Invalid JSON input: " . $input);
    sendJsonResponse(false, 'Invalid JSON input');
}

// If tracking a complaint
if (isset($data->action) && $data->action === 'trackComplaints') {
    if (!isset($data->phoneNumber) || empty($data->phoneNumber)) {
        sendJsonResponse(false, 'Phone number is required');
    }
    
    // Track complaints by phone number
    trackComplaintsByPhone($data->phoneNumber);
} else {
    // Login request
    if (!isset($data->username) || !isset($data->password) || !isset($data->userType)) {
        sendJsonResponse(false, 'Username, password, and user type are required');
    }
    
    // Attempt login
    loginUser($data->username, $data->password, $data->userType);
}

/**
 * Authenticate user login
 */
function loginUser($username, $password, $userType) {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Log login attempt
        error_log("Login attempt for: $username, role: $userType");
        
        // Prepare SQL query
        $query = "SELECT id, username, password, name FROM system_users WHERE username = :username AND role = :role";
        $stmt = $conn->prepare($query);
        
        // Bind parameters
        $stmt->bindParam(':username', $username);
        $stmt->bindParam(':role', $userType);
        
        // Execute query
        $stmt->execute();
        
        // Check if user exists
        if ($stmt->rowCount() > 0) {
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Log password check
            error_log("User found, checking password. Stored: " . substr($user['password'], 0, 5) . "...");
            
            // For initial login with plain text password (admin123)
            if ($password === $user['password'] || ($password === 'admin123' && $user['username'] === 'admin')) {
                // Password is correct
                // Create user data to return (exclude password)
                $userData = [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'name' => $user['name'],
                    'role' => $userType,
                    'loginTime' => date('Y-m-d H:i:s')
                ];
                
                // For division user, get division info
                if ($userType === 'division') {
                    $divQuery = "SELECT d.id, d.name FROM divisions d 
                                 JOIN system_users u ON d.id = u.name 
                                 WHERE u.id = :user_id";
                    $divStmt = $conn->prepare($divQuery);
                    $divStmt->bindParam(':user_id', $user['id']);
                    $divStmt->execute();
                    
                    if ($divStmt->rowCount() > 0) {
                        $division = $divStmt->fetch(PDO::FETCH_ASSOC);
                        $userData['divisionId'] = $division['id'];
                        $userData['divisionName'] = $division['name'];
                    }
                }
                
                // Log successful login
                error_log("Login successful for: $username");
                
                sendJsonResponse(true, 'Login successful', $userData);
            } else {
                // Try with password_verify for hashed passwords
                if (function_exists('password_verify') && password_verify($password, $user['password'])) {
                    // Password is correct
                    $userData = [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'name' => $user['name'],
                        'role' => $userType,
                        'loginTime' => date('Y-m-d H:i:s')
                    ];
                    
                    // Log successful login
                    error_log("Login successful with hashed password for: $username");
                    
                    sendJsonResponse(true, 'Login successful', $userData);
                } else {
                    // Password is incorrect
                    error_log("Invalid password for: $username");
                    sendJsonResponse(false, 'Invalid credentials');
                }
            }
        } else {
            // User not found
            error_log("User not found: $username with role: $userType");
            sendJsonResponse(false, 'Invalid credentials');
        }
    } catch(PDOException $e) {
        error_log("Login Error: " . $e->getMessage());
        sendJsonResponse(false, 'Login failed, please try again. Error: ' . $e->getMessage());
    }
}

/**
 * Track complaints by phone number
 */
function trackComplaintsByPhone($phoneNumber) {
    $conn = getConnection();
    if (!$conn) {
        sendJsonResponse(false, 'Database connection error');
    }
    
    try {
        // Clean phone number (remove non-numeric characters)
        $cleanPhone = preg_replace('/\D/', '', $phoneNumber);
        
        // Prepare SQL query to find complaints with matching phone
        $query = "SELECT c.*, 
                  (SELECT GROUP_CONCAT(CONCAT(ct.status, ':::', ct.description, ':::', ct.timestamp) SEPARATOR '|||')
                   FROM complaint_timeline ct 
                   WHERE ct.complaint_id = c.id) as timeline_data
                  FROM complaints c 
                  WHERE REPLACE(c.consumer_phone, ' ', '') = :phone
                  ORDER BY c.created_at DESC 
                  LIMIT 5";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':phone', $cleanPhone);
        $stmt->execute();
        
        // Check if complaints found
        if ($stmt->rowCount() > 0) {
            $complaints = [];
            
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                // Process timeline data
                $timeline = [];
                if (!empty($row['timeline_data'])) {
                    $timelineItems = explode('|||', $row['timeline_data']);
                    foreach ($timelineItems as $item) {
                        $parts = explode(':::', $item);
                        if (count($parts) === 3) {
                            $timeline[] = [
                                'status' => $parts[0],
                                'description' => $parts[1],
                                'timestamp' => $parts[2]
                            ];
                        }
                    }
                }
                
                // Remove timeline_data from row and add processed timeline
                unset($row['timeline_data']);
                $row['timeline'] = $timeline;
                
                $complaints[] = $row;
            }
            
            sendJsonResponse(true, 'Complaints found', $complaints);
        } else {
            sendJsonResponse(false, 'No complaints found for this phone number');
        }
    } catch(PDOException $e) {
        error_log("Track Complaints Error: " . $e->getMessage());
        sendJsonResponse(false, 'Failed to track complaints, please try again');
    }
}
?>