# Human Resource Management System (HRMS)

## Deployment
Live Deployment:
https://hrm-sproject.vercel.app/

## Overview
The Human Resource Management System (HRMS) is a web-based application designed to help organizations manage employee information, recruitment processes, departmental structures, and workforce monitoring in a centralized platform.

This system streamlines HR operations by providing role-based access for CEOs (SuperAdmins), Managers (Admins), and Employees (Users). It allows administrators to oversee recruitment, employee records, departments, and organizational data while enabling employees to manage their profiles and view company information.

The project is built using modern web technologies and integrates with Supabase for authentication, database management, and real-time data handling.

---

# Features

## Authentication & Access Control
- Secure login and registration system
- Google OAuth authentication
- Role-based access control (RBAC)
- Status-based account verification
- Supabase Row Level Security (RLS)

---

## Dashboard
Dynamic dashboard based on user role:

### CEO (SuperAdmin)
- Workforce analytics
- Employee statistics
- Recruitment overview
- Department monitoring
- Promotion tracking

### Manager (Admin)
- Team monitoring
- Recruitment management
- Employee activity overview
- Department visibility

### Employee (User)
- Personal profile overview
- Position and department information
- Promotion history
- Notifications

---

## Recruitment Module
- Applicant management
- Pending / Approved / Rejected application handling
- Resume viewing
- Recruitment notifications
- Applicant status tracking

---

## Employee Management
- Employee records management
- Position assignment
- Department assignment
- Employee status monitoring
- Promotion management

---

## Directory
- Employee directory listing
- Search employees by:
  - Name
  - Department
  - Position
- Company-wide employee visibility

---

## Departments
- Department management
- Department codes and descriptions
- Employee distribution tracking
- Organizational structure overview

---

## Job History
- Employee promotion tracking
- Previous positions
- Career growth monitoring
- Employment background history

---

# Technologies Used

## Frontend
- HTML5
- CSS3
- JavaScript
- Font Awesome

## Backend & Database
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Realtime
- Supabase Storage

## Deployment
- Vercel

---

# Database Tables

The system currently uses the following main tables:

| Table Name | Purpose |
|---|---|
| employee | Employee and applicant information |
| job | Current employee position |
| jobhistory | Promotion and career history |
| departments | Department information |
| notifications | System notifications |

---

# Role Access

| Role | Access Level |
|---|---|
| SuperAdmin | Full system access |
| Admin | Employee and recruitment management |
| User | Personal profile and directory access |

---

# System Modules

- Dashboard
- Recruitment
- Employee Management
- Directory
- Departments
- Profile Management
- Notifications

---

# Project Goal
The goal of this project is to provide a scalable and modern HR management platform that simplifies employee administration, recruitment workflows, and organizational management while maintaining secure role-based access.

---

# Developers Notes
This project is continuously improving and may include future modules such as:
- Attendance Monitoring
- Leave Management
- Payroll System
- Reports and Analytics
- Training Management

---

# License
This project is intended for educational and academic purposes.
