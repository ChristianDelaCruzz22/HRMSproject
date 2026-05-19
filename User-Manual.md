# Human Resource Management System (HRMS)

## User Manual

> A web-based Human Resource Management System designed to streamline recruitment, employee management, department organization, and workforce monitoring..

---

---

# Table of Contents

1. Introduction
2. System Overview
3. System Requirements
4. Accessing the System
5. User Roles and Permissions
6. Login and Authentication
7. Dashboard Overview
8. Recruitment Module
9. Employee Management Module
10. Directory Module
11. Departments Module
12. Job History Module
13. Notifications Module
14. Profile Management
15. Troubleshooting Guide
16. Frequently Asked Questions (FAQs)
17. Security and Data Privacy
18. Future Enhancements
19. Conclusion

---

# 1. Introduction

The Human Resource Management System (HRMS) is a web-based platform designed to simplify and centralize human resource operations within an organization. The system allows administrators and employees to efficiently manage recruitment, employee information, departments, job history, and organizational monitoring.

The HRMS provides a secure and scalable environment through role-based access control and cloud-based database integration using Supabase.

This manual serves as a guide for users in navigating and utilizing the system effectively.

---

# 2. System Overview

The HRMS helps organizations manage workforce-related processes through a centralized platform.

Main Objectives:

* Streamline HR operations
* Improve employee management
* Simplify recruitment processes
* Maintain organized department structures
* Provide secure access based on user roles
* Enable real-time workforce monitoring

The system is accessible through a web browser and supports multiple user roles with different permissions.

---

# 3. System Requirements

## Hardware Requirements

* Desktop or Laptop Computer
* Stable Internet Connection

## Software Requirements

* Google Chrome (Recommended)
* Mozilla Firefox
* Microsoft Edge
* Safari Browser

## Supported Devices

* Desktop Computers
* Laptops
* Tablets

---

# 4. Accessing the System

## Step 1: Open the Website

Launch a web browser and enter the HRMS website URL.

Example:
https://hrm-sproject.vercel.app/


## Step 2: Login or Register

Users may:

* Log in using their email and password
* Register for a new account
* Use Google OAuth Authentication

---

# 5. User Roles and Permissions

The HRMS uses Role-Based Access Control (RBAC) to ensure users only access authorized modules.

| Role             | Description                             | Access Level                  |
| ---------------- | --------------------------------------- | ----------------------------- |
| SuperAdmin (CEO) | Full system management                  | Full Access                   |
| Admin (Manager)  | Employee and recruitment management     | Limited Administrative Access |
| User (Employee)  | Personal profile and company visibility | Standard User Access          |

## SuperAdmin Access

* Full employee management
* Recruitment management
* Department management
* Workforce analytics
* Promotion tracking
* Notifications monitoring

## Admin Access

* Team monitoring
* Recruitment handling
* Employee activity overview
* Department visibility

## User Access

* Personal profile management
* Department information
* Employee directory access
* Notifications viewing

---

# 6. Login and Authentication

## Login Procedure

1. Navigate to the Login Page
2. Enter registered email address
3. Enter password
4. Click the “Login” button

## Google Authentication

1. Click “Continue with Google”
2. Select a Google account
3. Grant access permissions
4. Redirect to dashboard

## Registration Procedure

1. Open the Registration Page
2. Fill in required information
3. Submit registration form
4. Wait for account verification if applicable

## Account Verification

Accounts may require approval depending on the assigned role and account status.

---

# 7. Dashboard Overview

The dashboard dynamically changes depending on the user role.

## SuperAdmin Dashboard Features

* Workforce analytics
* Employee statistics
* Recruitment overview
* Department monitoring
* Promotion tracking
* Organizational insights

## Admin Dashboard Features

* Team overview
* Employee activity monitoring
* Recruitment management
* Department visibility

## Employee Dashboard Features

* Personal information overview
* Current position
* Department information
* Notifications

---

# 8. Recruitment Module

The Recruitment Module manages applicant processing and recruitment workflows.

## Features

* Applicant management
* Resume viewing
* Recruitment notifications
* Application status tracking
* Approval and rejection management

## Managing Applicants

### Step 1: Open Recruitment Module

Navigate to the Recruitment section from the sidebar.

### Step 2: View Applicant List

The system displays all submitted applicants.

### Step 3: Review Applicant Information

Administrators can:

* View applicant details
* Check submitted resumes
* Evaluate qualifications

### Step 4: Update Application Status

Application statuses include:

* Pending
* Approved
* Rejected

### Step 5: Notify Applicants

The system automatically generates notifications regarding application updates.

---

# 9. Employee Management Module

The Employee Management Module handles employee records and workforce monitoring.

## Features

* Employee records management
* Position assignment
* Department assignment
* Employee status monitoring

## Managing Employee Records

### Adding Employees

1. Open Employee Management
2. Click “Add Employee”
3. Enter employee information
4. Assign department and position
5. Save record

### Editing Employee Information

1. Select employee record
2. Click “Edit”
3. Update information
4. Save changes

### Employee Status Monitoring

The system tracks employee statuses such as:

* Active
* Inactive
* Applicant

---

# 10. Directory Module

The Directory Module provides company-wide employee visibility.

## Features

* Employee directory listing
* Search functionality
* Department filtering

## Searching Employees

Users can search employees by:

* Name
* Department
* Position

## Viewing Employee Profiles

Employee profiles contain:

* Full name
* Position
* Department
* Employment status
* Contact information (if available)

---

# 11. Departments Module

The Departments Module organizes company departments and workforce distribution.

## Features

* Department management
* Department descriptions
* Organizational overview

## Managing Departments

### Adding a Department

1. Open Departments Module
2. Click “Add Department”
3. Enter department description
4. Save department

### Editing Departments

1. Select department
2. Click “Edit”
3. Update department details
4. Save changes

### Department Monitoring

The system tracks employee distribution across departments.

---

# 12. Job History Module

The Job History Module records employee career progression.

## Features

* Previous positions
* Career growth history
* Employment background records

## Viewing Job History

1. Open employee profile
2. Navigate to Job History section
3. Review previous and current positions

---

# 13. Notifications Module

The Notifications Module provides system-generated updates.

## Types of Notifications

* Recruitment updates
* Promotion announcements
* Account status updates
* Employee-related alerts

---

# 14. Profile Management

Users can manage their personal profiles.

## Features

* Update profile information
* View department details
* Manage account settings

## Updating Profile Information

1. Open Profile Page
2. Click “Edit Profile”
3. Update necessary information
4. Save changes

---

# 15. Troubleshooting Guide

| Problem            | Possible Cause                 | Solution                  |
| ------------------ | ------------------------------ | ------------------------- |
| Unable to login    | Incorrect credentials          | Verify email and password |
| Page not loading   | Internet connection issue      | Check internet connection |
| Access denied      | Insufficient permissions       | Contact administrator     |
| Missing data       | Database synchronization delay | Refresh the page          |
| Google login issue | Authentication error           | Re-login using Google     |

---

# 16. Frequently Asked Questions (FAQs)

## Q1: What is HRMS?

HRMS is a Human Resource Management System used for managing employees, recruitment, departments, and organizational processes.

## Q2: Who can access the system?

Authorized employees, managers, and administrators with registered accounts can access the system.

## Q3: Can employees edit their profiles?

Yes. Employees can update selected profile information through the Profile Management module.

## Q4: How are promotions tracked?

Promotions are recorded in the Job History module.

## Q5: Is the system secure?

Yes. The system uses Supabase Authentication, Role-Based Access Control, and Row Level Security (RLS).

---

# 17. Security and Data Privacy

The HRMS implements modern security mechanisms to protect organizational data.

## Security Features

* Secure Authentication
* Google OAuth Integration
* Supabase Row Level Security (RLS)
* Role-Based Access Control
* Secure Database Management

## Data Privacy

Employee information is protected and accessible only to authorized personnel.

---

# 19. Conclusion

The Human Resource Management System (HRMS) provides a centralized and efficient solution for managing recruitment, employees, departments, and organizational processes.

Through secure authentication, role-based access, and real-time data management, the system enhances workforce administration and simplifies HR operations.

The platform is designed to be scalable, user-friendly, and adaptable for future organizational needs.

---

# APPENDIX

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript
* Font Awesome

### Backend and Database

* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase Realtime
* Supabase Storage

### Deployment

* Vercel

---

# DATABASE TABLES

| Table Name    | Purpose                            |
| ------------- | ---------------------------------- |
| employee      | Employee and applicant information |
| job           | Current employee position          |
| jobhistory    | Promotion and career history       |
| departments   | Department information             |
| notifications | System notifications               |

---

# END OF DOCUMENT
