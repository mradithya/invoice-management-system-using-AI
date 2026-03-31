# XAMPP Setup Guide for Invoice Management System

## Step-by-Step Installation Guide

### 1. Install XAMPP

#### Windows
1. Download XAMPP from https://www.apachefriends.org/download.html
2. Run the installer (xampp-windows-x64-X.X.X-installer.exe)
3. Choose installation directory (default: C:\xampp)
4. Select components: Apache, MySQL, PHP, phpMyAdmin
5. Complete the installation

#### macOS
1. Download XAMPP for macOS
2. Open the DMG file
3. Drag XAMPP to Applications folder
4. Open XAMPP and run the installer

#### Linux
```bash
wget https://www.apachefriends.org/xampp-files/X.X.X/xampp-linux-x64-X.X.X-installer.run
chmod +x xampp-linux-x64-X.X.X-installer.run
sudo ./xampp-linux-x64-X.X.X-installer.run
```

### 2. Start Services

1. Open XAMPP Control Panel
2. Start Apache service
3. Start MySQL service
4. Verify both services show "Running" status

### 3. Database Setup

#### Create Database
1. Open browser and navigate to: http://localhost/phpmyadmin
2. Click "New" in the left sidebar
3. Database name: `invoice_management_ai`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

#### Import Schema
1. Click on the `invoice_management_ai` database
2. Click "Import" tab
3. Click "Choose File"
4. Navigate to project folder: `database/schema.sql`
5. Click "Go" to execute

### 4. Deploy Backend

#### Option A: Direct Copy (Recommended for XAMPP)
```bash
# Windows
xcopy /E /I backend C:\xampp\htdocs\invoice-system\backend

# macOS/Linux
cp -r backend /Applications/XAMPP/htdocs/invoice-system/backend
```

#### Option B: Symbolic Link
```bash
# Windows (Run as Administrator)
mklink /D C:\xampp\htdocs\invoice-system\backend "C:\path\to\project\backend"

# macOS/Linux
ln -s /path/to/project/backend /Applications/XAMPP/htdocs/invoice-system/backend
```

### 5. Configure Backend

#### Database Configuration
Edit `backend/config/database.php`:
```php
private $host = "localhost";
private $db_name = "invoice_management_ai";
private $username = "root";
private $password = ""; // Leave empty for XAMPP default
```

#### Enable Apache Rewrite Module
1. Open `C:\xampp\apache\conf\httpd.conf`
2. Find line: `#LoadModule rewrite_module modules/mod_rewrite.so`
3. Remove the `#` to uncomment
4. Restart Apache in XAMPP Control Panel

#### Create .htaccess (if needed)
Create file: `C:\xampp\htdocs\invoice-system\.htaccess`
```apache
Options +FollowSymLinks
RewriteEngine On

# Handle API routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^backend/api/(.*)$ backend/api/$1 [L,QSA]
```

### 6. Test Backend

Open browser and test these endpoints:

1. Test Database Connection:
   - Create a test file: `C:\xampp\htdocs\invoice-system\test.php`
   ```php
   <?php
   require_once 'backend/config/database.php';
   $database = new Database();
   $conn = $database->getConnection();
   if($conn){
       echo "Database connected successfully!";
   } else {
       echo "Connection failed!";
   }
   ?>
   ```
   - Visit: http://localhost/invoice-system/test.php

2. Test API:
   - Visit: http://localhost/invoice-system/backend/api/auth/index.php?action=check

### 7. Setup Frontend

#### Install Node.js
1. Download from https://nodejs.org/ (LTS version)
2. Run installer
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Configure API URL
Edit `frontend/src/services/api.js`:
```javascript
const API_BASE_URL = 'http://localhost/invoice-system/backend/api';
```

#### Start Development Server
```bash
npm run dev
```

Access application at: http://localhost:3000

### 8. Troubleshooting

#### Port Conflicts
If port 80 (Apache) or 3306 (MySQL) is already in use:

**Apache Port:**
1. Edit `C:\xampp\apache\conf\httpd.conf`
2. Change `Listen 80` to `Listen 8080`
3. Change `ServerName localhost:80` to `ServerName localhost:8080`
4. Restart Apache
5. Access via http://localhost:8080

**MySQL Port:**
1. Edit `C:\xampp\mysql\bin\my.ini`
2. Change `port=3306` to `port=3307`
3. Restart MySQL
4. Update database.php with new port

#### Permission Issues (Windows)
1. Right-click XAMPP Control Panel
2. Select "Run as Administrator"

#### Permission Issues (macOS/Linux)
```bash
sudo chmod -R 755 /Applications/XAMPP/htdocs/invoice-system
sudo chown -R daemon:daemon /Applications/XAMPP/htdocs/invoice-system
```

#### CORS Issues
If getting CORS errors:
1. Verify `backend/config/cors.php` has correct origin
2. Check browser console for specific error
3. Ensure both frontend and backend are running

#### Session Issues
1. Check PHP session directory is writable
2. Edit `php.ini`:
   ```ini
   session.save_path = "C:\xampp\tmp"
   ```
3. Create tmp directory if it doesn't exist

### 9. Production Deployment

#### Build Frontend
```bash
cd frontend
npm run build
```

#### Deploy Frontend
1. Copy `frontend/dist/*` to `C:\xampp\htdocs\invoice-system\frontend`
2. Configure Apache to serve static files

#### Update CORS for Production
Edit `backend/config/cors.php`:
```php
header("Access-Control-Allow-Origin: https://yourdomain.com");
```

### 10. Default Login Credentials

After database setup, you can login with:
- Email: `admin@example.com`
- Password: `admin123`

**Important**: Change this password immediately after first login!

### 11. Backup and Maintenance

#### Database Backup
```bash
# Windows
C:\xampp\mysql\bin\mysqldump -u root invoice_management_ai > backup.sql

# macOS/Linux
/Applications/XAMPP/bin/mysqldump -u root invoice_management_ai > backup.sql
```

#### Database Restore
```bash
# Windows
C:\xampp\mysql\bin\mysql -u root invoice_management_ai < backup.sql

# macOS/Linux
/Applications/XAMPP/bin/mysql -u root invoice_management_ai < backup.sql
```

### 12. Automate Recurring Invoices (Windows Task Scheduler)

Recurring templates are now executable from a scheduler-safe script:

- Script: `C:\xampp\htdocs\invoice-management\backend\cron\run_recurring.php`
- Batch launcher: `C:\xampp\htdocs\invoice-management\backend\cron\run_recurring.bat`

#### Quick test (manual)
```bash
C:\xampp\php\php.exe C:\xampp\htdocs\invoice-management\backend\cron\run_recurring.php
```

Expected output:
- `Recurring run complete`
- `Processed templates: X`
- `Created invoices: Y`

#### Create a daily scheduled task
Run this command in PowerShell (as Administrator):

```powershell
schtasks /Create /TN "InvoiceManagement-RecurringDaily" /TR "C:\xampp\htdocs\invoice-management\backend\cron\run_recurring.bat" /SC DAILY /ST 09:00 /F
```

#### Run it immediately (optional test)
```powershell
schtasks /Run /TN "InvoiceManagement-RecurringDaily"
```

#### Verify task exists
```powershell
schtasks /Query /TN "InvoiceManagement-RecurringDaily"
```

## Quick Reference

### URLs
- phpMyAdmin: http://localhost/phpmyadmin
- Backend API: http://localhost/invoice-system/backend/api
- Frontend Dev: http://localhost:3000

### Directory Structure
```
C:\xampp\htdocs\invoice-system\
├── backend\
│   ├── api\
│   ├── config\
│   ├── models\
│   └── utils\
└── frontend\ (production build)
```

### Common Commands
```bash
# Frontend Development
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production

# Database
mysqldump -u root invoice_management_ai > backup.sql  # Backup
mysql -u root invoice_management_ai < backup.sql      # Restore
```

## Support

For issues:
1. Check XAMPP error logs: `C:\xampp\apache\logs\error.log`
2. Check PHP error logs: `C:\xampp\php\logs\php_error_log`
3. Enable error reporting in `php.ini`:
   ```ini
   display_errors = On
   error_reporting = E_ALL
   ```
