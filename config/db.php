<?php
// Database connection configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'u415870896_testcms2');
define('DB_PASS', 'Sabirsande1234567@');
define('DB_NAME', 'u415870896_testcms2');

// Create database connection
function getConnection() {
    try {
        $conn = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        // Set the PDO error mode to exception
        $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        // Set character set to utf8
        $conn->exec("SET NAMES 'utf8'");
        return $conn;
    } catch(PDOException $e) {
        // Log error to a file instead of displaying it
        error_log("Database Connection Error: " . $e->getMessage(), 0);
        return null;
    }
}

// Common function to send JSON response
function sendJsonResponse($success, $message, $data = null) {
    header('Content-Type: application/json');
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

// Function to check if tables exist and create them if they don't
function initializeTables() {
    $conn = getConnection();
    if (!$conn) {
        return false;
    }
    
    try {
        // Create system_users table
        $conn->exec("CREATE TABLE IF NOT EXISTS system_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role ENUM('admin', 'division', 'vendor') NOT NULL,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Create divisions table
        $conn->exec("CREATE TABLE IF NOT EXISTS divisions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Create vendors table
        $conn->exec("CREATE TABLE IF NOT EXISTS vendors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            division_id INT,
            status ENUM('active', 'inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL
        )");
        
        // Create chargers table
        $conn->exec("CREATE TABLE IF NOT EXISTS chargers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cpid VARCHAR(50) NOT NULL UNIQUE,
            location VARCHAR(255),
            division_id INT,
            status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL
        )");
        
        // Create complaints table
        $conn->exec("CREATE TABLE IF NOT EXISTS complaints (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tracking_id VARCHAR(20) NOT NULL UNIQUE,
            charger_id VARCHAR(50) NOT NULL,
            location VARCHAR(255),
            division VARCHAR(100),
            type VARCHAR(100) NOT NULL,
            sub_type VARCHAR(100),
            status ENUM('Open', 'In Progress', 'Pending Resolution Approval', 'Resolved', 'Closed') DEFAULT 'Open',
            consumer_name VARCHAR(100) NOT NULL,
            consumer_phone VARCHAR(15) NOT NULL,
            consumer_email VARCHAR(100),
            description TEXT NOT NULL,
            assigned_to INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_to) REFERENCES vendors(id) ON DELETE SET NULL
        )");
        
        // Create complaint_timeline table
        $conn->exec("CREATE TABLE IF NOT EXISTS complaint_timeline (
            id INT AUTO_INCREMENT PRIMARY KEY,
            complaint_id INT NOT NULL,
            status VARCHAR(100) NOT NULL,
            description TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
        )");
        
        // Check if admin user exists, if not create default
        $stmt = $conn->prepare("SELECT COUNT(*) FROM system_users WHERE role = 'admin'");
        $stmt->execute();
        
        if ($stmt->fetchColumn() == 0) {
            // Create default admin user
            $defaultUsername = 'admin';
            $defaultPassword = 'admin123'; // In production, this should be hashed
            $hashedPassword = password_hash($defaultPassword, PASSWORD_DEFAULT);
            
            $stmt = $conn->prepare("INSERT INTO system_users (username, password, role, name) VALUES (?, ?, 'admin', 'Administrator')");
            $stmt->execute([$defaultUsername, $hashedPassword]);
        }
        
        return true;
    } catch(PDOException $e) {
        error_log("Table Creation Error: " . $e->getMessage(), 0);
        return false;
    }
}

// Initialize tables when this file is included
initializeTables();
?>