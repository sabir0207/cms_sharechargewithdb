<?php
// Simple database connection test script
// Place this in your root directory and access it via browser to test database connection

// Enable error display
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Database configuration
$DB_HOST = 'localhost';
$DB_USER = 'u415870896_testcms2';
$DB_PASS = 'Sabirsande1234567@';
$DB_NAME = 'u415870896_testcms2';

// Output header
echo "<html><head><title>Database Test</title>";
echo "<style>
body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
h1 { color: #4CAF50; }
.success { color: green; font-weight: bold; }
.error { color: red; font-weight: bold; }
.warning { color: orange; font-weight: bold; }
code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; }
pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto; }
table { border-collapse: collapse; width: 100%; }
table, th, td { border: 1px solid #ddd; }
th, td { padding: 8px; text-align: left; }
th { background-color: #4CAF50; color: white; }
</style></head><body>";
echo "<h1>EV Charging System - Database Test</h1>";

// Test if PDO is available
echo "<h2>PHP Configuration</h2>";
echo "PHP Version: " . phpversion() . "<br>";
if (extension_loaded('pdo')) {
    echo "PDO Extension: <span class='success'>Available</span><br>";
} else {
    echo "PDO Extension: <span class='error'>Not Available</span> - Please enable PDO extension<br>";
}

if (extension_loaded('pdo_mysql')) {
    echo "PDO MySQL Driver: <span class='success'>Available</span><br>";
} else {
    echo "PDO MySQL Driver: <span class='error'>Not Available</span> - Please enable PDO MySQL driver<br>";
}

// Test database connection
echo "<h2>Database Connection Test</h2>";
try {
    $conn = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME", $DB_USER, $DB_PASS);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connection: <span class='success'>Success</span><br>";
    
    // Get MySQL version
    $stmt = $conn->query("SELECT VERSION() as version");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "MySQL Version: " . $row['version'] . "<br>";
    
    // Check if tables exist
    echo "<h2>Database Structure</h2>";
    $tables = array('system_users', 'divisions', 'vendors', 'chargers', 'complaints', 'complaint_timeline');
    $tableStatus = array();
    
    echo "<table>";
    echo "<tr><th>Table Name</th><th>Status</th><th>Row Count</th></tr>";
    
    foreach ($tables as $table) {
        $stmt = $conn->query("SHOW TABLES LIKE '$table'");
        $exists = $stmt->rowCount() > 0;
        
        echo "<tr>";
        echo "<td>$table</td>";
        
        if ($exists) {
            echo "<td><span class='success'>Exists</span></td>";
            $countStmt = $conn->query("SELECT COUNT(*) as count FROM $table");
            $countRow = $countStmt->fetch(PDO::FETCH_ASSOC);
            echo "<td>{$countRow['count']}</td>";
            
            $tableStatus[$table] = true;
        } else {
            echo "<td><span class='error'>Missing</span></td>";
            echo "<td>N/A</td>";
            $tableStatus[$table] = false;
        }
        
        echo "</tr>";
    }
    
    echo "</table>";
    
    // Check admin user
    echo "<h2>Admin User Check</h2>";
    if ($tableStatus['system_users']) {
        $stmt = $conn->query("SELECT * FROM system_users WHERE username = 'admin' AND role = 'admin'");
        
        if ($stmt->rowCount() > 0) {
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            echo "Admin user: <span class='success'>Found</span><br>";
            echo "Username: admin<br>";
            echo "Name: {$admin['name']}<br>";
            echo "Created: {$admin['created_at']}<br>";
            
            // Check if the password is still the default
            if ($admin['password'] === 'admin123') {
                echo "Password: <span class='warning'>Still using default password (admin123)</span><br>";
            } else {
                echo "Password: <span class='success'>Password has been changed from default</span><br>";
            }
        } else {
            echo "Admin user: <span class='error'>Not found</span><br>";
            echo "Recommendation: Run the database initialization script<br>";
        }
    } else {
        echo "Cannot check admin user since the system_users table does not exist.<br>";
    }
    
    // Database setup recommendations
    echo "<h2>Setup Recommendations</h2>";
    if (in_array(false, $tableStatus)) {
        echo "<p class='warning'>Some tables are missing. Run the database initialization script.</p>";
        echo "<p>To initialize the database structure, access any of the API endpoints or include the config/db.php file.</p>";
        
        echo "<h3>Create Tables SQL</h3>";
        echo "<pre>" . htmlspecialchars(file_get_contents('create_tables_sql.txt')) . "</pre>";
    } else {
        echo "<p class='success'>All required tables exist.</p>";
    }
    
    // Create SQL file if it doesn't exist
    if (!file_exists('create_tables_sql.txt')) {
        $sql = "-- Create system_users table
CREATE TABLE IF NOT EXISTS system_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'division', 'vendor') NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create divisions table
CREATE TABLE IF NOT EXISTS divisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    division_id INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL
);

-- Create chargers table
CREATE TABLE IF NOT EXISTS chargers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpid VARCHAR(50) NOT NULL UNIQUE,
    location VARCHAR(255),
    division_id INT,
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL
);

-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
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
);

-- Create complaint_timeline table
CREATE TABLE IF NOT EXISTS complaint_timeline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_id INT NOT NULL,
    status VARCHAR(100) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT INTO system_users (username, password, role, name)
SELECT 'admin', 'admin123', 'admin', 'Administrator'
WHERE NOT EXISTS (
    SELECT 1 FROM system_users WHERE role = 'admin' AND username = 'admin'
);";
        file_put_contents('create_tables_sql.txt', $sql);
    }
    
} catch(PDOException $e) {
    echo "Connection: <span class='error'>Failed</span><br>";
    echo "Error: " . $e->getMessage() . "<br>";
    
    // Check if database exists but credentials are wrong
    try {
        $testConn = new PDO("mysql:host=$DB_HOST", $DB_USER, $DB_PASS);
        $testConn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Try to create the database
        echo "<p>Attempting to create database...</p>";
        $testConn->exec("CREATE DATABASE IF NOT EXISTS $DB_NAME");
        echo "<p class='success'>Database created successfully!</p>";
        echo "<p>Please refresh this page to check connection again.</p>";
    } catch(PDOException $e2) {
        echo "<p class='error'>Unable to create database. Error: " . $e2->getMessage() . "</p>";
        echo "<p>Please check your database credentials in config/db.php</p>";
    }
}

echo "</body></html>";
?>