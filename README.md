# AI-Powered Smart Financial Health Analyzer & Billing System

A comprehensive invoice management system with AI-powered financial insights for small businesses. Built with React.js, PHP, and MySQL.

## 📸 [View Preview & Screenshots](PREVIEW.md)

**Want to see what the application looks like?** Check out the [**PREVIEW.md**](PREVIEW.md) file for detailed screenshots, UI walkthroughs, and visual examples of all features!

## Features

### Core Functionality
- **User Authentication**: Secure registration and login with bcrypt password hashing
- **Client Management**: Full CRUD operations for managing clients
- **Invoice Management**: Create, edit, and manage invoices with dynamic line items
- **Payment Tracking**: Record payments and auto-update invoice status
- **Financial Dashboard**: Visual analytics with revenue trends

### AI-Powered Features
- **Financial Health Score**: 0-100 score based on revenue consistency, payment health, and client diversity
- **AI Insights Engine**: Intelligent suggestions and recommendations
- **Revenue Prediction**: Predict next month's revenue using linear regression
- **Risk Analysis**: Identify risky clients based on payment patterns
- **Top Clients**: Identify best-performing clients

## Tech Stack

- **Frontend**: React.js 18 with Hooks (useState, useEffect, useContext)
- **Styling**: Tailwind CSS
- **Backend**: PHP 8.x with PDO (RESTful API)
- **Database**: MySQL
- **Server**: Apache (XAMPP)
- **Charts**: Recharts

## Project Structure

```
invoice-management-system-using-AI/
├── backend/
│   ├── api/
│   │   ├── auth/
│   │   │   └── index.php          # Authentication endpoints
│   │   ├── clients.php             # Client CRUD API
│   │   ├── invoices.php            # Invoice CRUD API
│   │   ├── payments.php            # Payment tracking API
│   │   └── dashboard.php           # AI analytics API
│   ├── config/
│   │   ├── database.php            # Database connection
│   │   └── cors.php                # CORS configuration
│   ├── models/
│   │   ├── User.php                # User model
│   │   ├── Client.php              # Client model
│   │   ├── Invoice.php             # Invoice model
│   │   ├── InvoiceItem.php         # Invoice items model
│   │   ├── Payment.php             # Payment model
│   │   └── FinancialAnalyzer.php   # AI analytics engine
│   └── utils/
│       ├── Auth.php                # Authentication utility
│       └── Response.php            # API response utility
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx          # Main layout component
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.jsx           # Login page
│   │   │   ├── Register.jsx        # Registration page
│   │   │   ├── Dashboard.jsx       # AI Dashboard
│   │   │   ├── Clients.jsx         # Client management
│   │   │   ├── Invoices.jsx        # Invoice list
│   │   │   ├── InvoiceForm.jsx     # Create/Edit invoice
│   │   │   └── InvoiceDetail.jsx   # Invoice details & payments
│   │   ├── services/
│   │   │   ├── api.js              # Axios configuration
│   │   │   └── apiService.js       # API service functions
│   │   ├── App.jsx                 # Main app component
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── database/
    └── schema.sql                  # Database schema
```

## Installation Instructions

### Prerequisites
- XAMPP (PHP 8.x, MySQL, Apache)
- Node.js (v16 or higher)
- npm or yarn

### Step 1: Install XAMPP

1. Download XAMPP from [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. Install XAMPP with Apache, MySQL, and PHP
3. Start Apache and MySQL from XAMPP Control Panel

### Step 2: Setup Database

1. Open phpMyAdmin (http://localhost/phpmyadmin)
2. Create a new database named `invoice_management_ai`
3. Import the database schema:
   - Navigate to the `database` folder
   - Open `schema.sql` in phpMyAdmin's SQL tab
   - Execute the SQL script

**Default Admin Account:**
- Email: `admin@example.com`
- Password: `admin123`

### Step 3: Setup Backend (PHP API)

1. Copy the `backend` folder to XAMPP's `htdocs` directory:
   ```
   C:\xampp\htdocs\invoice-system\backend
   ```

2. Update database credentials if needed in `backend/config/database.php`:
   ```php
   private $host = "localhost";
   private $db_name = "invoice_management_ai";
   private $username = "root";
   private $password = "";
   ```

3. Create `.htaccess` file in `htdocs/invoice-system/backend` directory:
   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^api/(.*)$ api/$1 [L]
   ```

### Step 4: Setup Frontend (React)

1. Navigate to the `frontend` directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Update API URL in `frontend/src/services/api.js` if needed:
   ```javascript
   const API_BASE_URL = 'http://localhost/invoice-system/backend/api';
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/index.php?action=register` - Register new user
- `POST /api/auth/index.php?action=login` - User login
- `POST /api/auth/index.php?action=logout` - User logout
- `GET /api/auth/index.php?action=check` - Check authentication status

### Clients
- `GET /api/clients.php` - Get all clients
- `GET /api/clients.php/{id}` - Get single client
- `POST /api/clients.php` - Create client
- `PUT /api/clients.php/{id}` - Update client
- `DELETE /api/clients.php/{id}` - Delete client

### Invoices
- `GET /api/invoices.php` - Get all invoices
- `GET /api/invoices.php/{id}` - Get single invoice with items
- `POST /api/invoices.php` - Create invoice
- `PUT /api/invoices.php/{id}` - Update invoice
- `DELETE /api/invoices.php/{id}` - Delete invoice

### Payments
- `GET /api/payments.php/invoice/{invoice_id}` - Get payments for invoice
- `POST /api/payments.php` - Record payment
- `DELETE /api/payments.php/{id}` - Delete payment

### Dashboard (AI Analytics)
- `GET /api/dashboard.php/stats` - Get dashboard statistics with AI insights
- `GET /api/dashboard.php/clients/risky` - Get risky clients
- `GET /api/dashboard.php/clients/top` - Get top performing clients

## AI Financial Health Analyzer

### How It Works

The AI engine uses rule-based algorithms and statistical analysis:

#### 1. Financial Health Score (0-100)

**Revenue Consistency Score (40 points)**
- Analyzes monthly revenue variance
- Lower coefficient of variation = higher score
- Bonus points for growth trends

**Payment Health Score (40 points)**
- Paid ratio scoring (25 points)
- Overdue ratio penalty (15 points)
- Higher paid percentage = higher score

**Client Diversity Score (20 points)**
- Client count scoring (10 points)
- Revenue concentration analysis (10 points)
- Reduces risk from client dependency

#### 2. AI Insights

Generates intelligent suggestions based on:
- Revenue trends (growing/declining/stable)
- Payment collection efficiency
- Overdue payment ratios
- Client concentration risk
- Cash flow patterns

#### 3. Revenue Prediction

Uses simplified linear regression:
- Analyzes last 6 months of revenue
- Calculates trend using least squares method
- Provides confidence level (high/medium/low)
- Based on revenue consistency

#### 4. Risk Analysis

Identifies risky clients based on:
- Overdue invoice percentage
- Average payment delay
- Total outstanding amount
- Payment history patterns

## Usage Guide

### Getting Started

1. **Register an Account**
   - Navigate to the registration page
   - Enter your details
   - Login with your credentials

2. **Add Clients**
   - Go to Clients page
   - Click "Add Client"
   - Fill in client information

3. **Create Invoices**
   - Go to Invoices page
   - Click "Create Invoice"
   - Select client
   - Add line items dynamically
   - Set dates and tax rate
   - Submit to create

4. **Record Payments**
   - Open invoice details
   - Click "Record Payment"
   - Enter payment information
   - Invoice status updates automatically

5. **View AI Insights**
   - Dashboard shows Financial Health Score
   - View AI-generated recommendations
   - See revenue predictions
   - Track monthly trends

### Key Features

**Dynamic Line Items**
- Add/remove invoice items dynamically
- Auto-calculate subtotals and totals
- Tax calculation support

**Automatic Status Updates**
- Pending → Paid when fully paid
- Pending → Overdue when past due date
- Real-time balance calculations

**AI Insights Types**
- Success: Positive achievements
- Warning: Areas needing attention
- Danger: Critical issues
- Info: General recommendations

## Development

### Build for Production

Frontend:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/` directory.

### Database Backups

Regular backups recommended:
```bash
mysqldump -u root invoice_management_ai > backup.sql
```

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- SQL injection prevention (PDO prepared statements)
- XSS protection (input sanitization)
- CSRF protection via session validation
- Secure CORS configuration

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Check MySQL is running in XAMPP
- Verify database credentials in `config/database.php`
- Ensure database exists

**CORS Errors**
- Check `backend/config/cors.php` settings
- Verify frontend API URL matches backend location

**API Not Found (404)**
- Ensure `.htaccess` is configured
- Check Apache mod_rewrite is enabled
- Verify file paths are correct

**Session Issues**
- Clear browser cookies
- Check PHP session configuration
- Ensure session.save_path is writable

## Credits

Built with modern web technologies for small business financial management.

## License

This project is created for educational and business purposes