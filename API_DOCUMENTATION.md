# API Documentation

Base URL: `http://localhost/invoice-system/backend/api`

All API requests require proper authentication except for registration and login endpoints.

## Authentication

Session-based authentication is used. After login, a session cookie is set.

### Register User
```
POST /auth/index.php?action=register
```

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Login
```
POST /auth/index.php?action=login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user_id": 1,
    "full_name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Logout
```
POST /auth/index.php?action=logout
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": []
}
```

### Check Authentication
```
GET /auth/index.php?action=check
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logged_in": true,
    "user_id": 1
  }
}
```

## Clients

### Get All Clients
```
GET /clients.php
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "name": "ABC Corporation",
      "email": "contact@abc.com",
      "phone": "+1234567890",
      "address": "123 Main St, City",
      "company": "ABC Corp",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
}
```

### Get Single Client
```
GET /clients.php/{id}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ABC Corporation",
    "email": "contact@abc.com",
    "phone": "+1234567890",
    "address": "123 Main St, City",
    "company": "ABC Corp"
  }
}
```

### Create Client
```
POST /clients.php
```

**Request Body:**
```json
{
  "name": "ABC Corporation",
  "email": "contact@abc.com",
  "phone": "+1234567890",
  "address": "123 Main St, City",
  "company": "ABC Corp"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Client created successfully",
  "data": {
    "id": 1,
    "name": "ABC Corporation",
    "email": "contact@abc.com",
    "phone": "+1234567890",
    "address": "123 Main St, City",
    "company": "ABC Corp"
  }
}
```

### Update Client
```
PUT /clients.php/{id}
```

**Request Body:**
```json
{
  "name": "ABC Corporation Updated",
  "email": "new@abc.com",
  "phone": "+0987654321",
  "address": "456 New St, City",
  "company": "ABC Corp"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Client updated successfully",
  "data": []
}
```

### Delete Client
```
DELETE /clients.php/{id}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Client deleted successfully",
  "data": []
}
```

## Invoices

### Get All Invoices
```
GET /invoices.php
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "client_id": 1,
      "invoice_number": "INV-00001",
      "issue_date": "2024-01-01",
      "due_date": "2024-01-31",
      "subtotal": "1000.00",
      "tax_rate": "10.00",
      "tax_amount": "100.00",
      "total": "1100.00",
      "status": "Pending",
      "notes": "Payment terms: Net 30",
      "client_name": "ABC Corporation",
      "client_company": "ABC Corp"
    }
  ]
}
```

### Get Single Invoice
```
GET /invoices.php/{id}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-00001",
    "issue_date": "2024-01-01",
    "due_date": "2024-01-31",
    "subtotal": "1000.00",
    "tax_rate": "10.00",
    "tax_amount": "100.00",
    "total": "1100.00",
    "status": "Pending",
    "notes": "Payment terms: Net 30",
    "client_name": "ABC Corporation",
    "client_email": "contact@abc.com",
    "client_phone": "+1234567890",
    "client_address": "123 Main St, City",
    "client_company": "ABC Corp",
    "items": [
      {
        "id": 1,
        "invoice_id": 1,
        "description": "Web Development Services",
        "quantity": 10,
        "unit_price": "100.00",
        "total": "1000.00"
      }
    ]
  }
}
```

### Create Invoice
```
POST /invoices.php
```

**Request Body:**
```json
{
  "client_id": 1,
  "issue_date": "2024-01-01",
  "due_date": "2024-01-31",
  "tax_rate": 10,
  "notes": "Payment terms: Net 30",
  "items": [
    {
      "description": "Web Development Services",
      "quantity": 10,
      "unit_price": 100
    },
    {
      "description": "Design Services",
      "quantity": 5,
      "unit_price": 50
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Invoice created successfully",
  "data": {
    "id": 1,
    "invoice_number": "INV-00001"
  }
}
```

### Update Invoice
```
PUT /invoices.php/{id}
```

**Request Body:**
```json
{
  "client_id": 1,
  "issue_date": "2024-01-01",
  "due_date": "2024-02-01",
  "tax_rate": 15,
  "status": "Pending",
  "notes": "Updated payment terms",
  "items": [
    {
      "description": "Updated Service",
      "quantity": 10,
      "unit_price": 120
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Invoice updated successfully",
  "data": []
}
```

### Delete Invoice
```
DELETE /invoices.php/{id}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Invoice deleted successfully",
  "data": []
}
```

## Payments

### Get Payments for Invoice
```
GET /payments.php/invoice/{invoice_id}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "invoice_id": 1,
      "amount": "500.00",
      "payment_date": "2024-01-15",
      "payment_method": "Bank Transfer",
      "reference_number": "TXN12345",
      "notes": "First installment",
      "created_at": "2024-01-15 10:00:00"
    }
  ]
}
```

### Record Payment
```
POST /payments.php
```

**Request Body:**
```json
{
  "invoice_id": 1,
  "amount": 500.00,
  "payment_date": "2024-01-15",
  "payment_method": "Bank Transfer",
  "reference_number": "TXN12345",
  "notes": "First installment"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "data": {
    "id": 1
  }
}
```

**Note:** Recording a payment automatically updates the invoice status to "Paid" if the total paid amount equals or exceeds the invoice total.

### Delete Payment
```
DELETE /payments.php/{id}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment deleted successfully",
  "data": []
}
```

## Dashboard & AI Analytics

### Get Dashboard Statistics
```
GET /dashboard.php/stats
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "health_score": 85,
    "total_revenue": "50000.00",
    "paid_amount": "40000.00",
    "pending_amount": "8000.00",
    "overdue_amount": "2000.00",
    "client_count": 15,
    "monthly_revenue": [
      {
        "month": "2024-01",
        "revenue": "10000.00"
      },
      {
        "month": "2023-12",
        "revenue": "8500.00"
      }
    ],
    "insights": [
      {
        "type": "success",
        "category": "Revenue",
        "message": "Excellent payment collection! 80% of invoices are paid."
      },
      {
        "type": "info",
        "category": "Stability",
        "message": "Revenue is stable and consistent. Business is financially healthy."
      }
    ],
    "next_month_prediction": {
      "prediction": 11200.50,
      "confidence": "high",
      "method": "linear_regression",
      "average": 9500.00
    }
  }
}
```

### Get Risky Clients
```
GET /dashboard.php/clients/risky
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "name": "Late Payer Inc",
      "company": "Late Payer",
      "total_invoices": 10,
      "overdue_count": 6,
      "overdue_amount": "5000.00",
      "avg_delay_days": 45.2,
      "risk_level": "high"
    }
  ]
}
```

### Get Top Performing Clients
```
GET /dashboard.php/clients/top
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "ABC Corporation",
      "company": "ABC Corp",
      "total_invoices": 25,
      "total_revenue": "50000.00",
      "paid_count": 24,
      "avg_payment_days": -2.5
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["field1 is required", "field2 must be a number"]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Email already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Status Codes

- `200` - OK (Success)
- `201` - Created (Resource created successfully)
- `400` - Bad Request (Invalid input)
- `401` - Unauthorized (Not authenticated)
- `404` - Not Found (Resource doesn't exist)
- `405` - Method Not Allowed (Wrong HTTP method)
- `409` - Conflict (Resource already exists)
- `422` - Unprocessable Entity (Validation error)
- `500` - Internal Server Error (Server error)

## Rate Limiting

Currently, there is no rate limiting implemented. Consider implementing rate limiting for production use.

## CORS

The API allows requests from `http://localhost:3000` by default. Update `backend/config/cors.php` for production.
