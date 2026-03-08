# PROJECT KY-9 DOCUMENTATION

## 4. ATTENDANCE MANAGEMENT SYSTEM

### 4.1 Authentication

#### a. Login
**Function Trigger:** User clicks the "Sign In" button on the Login Portal page.

**Function Description:** This function allows users (Admin, Accountant, Employee) to log into the Attendance Management System to access their respective portals. Data processing involves validating the user's email and password for authentication, then redirecting to the appropriate portal based on their role.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The user must be connected to the internet.
- The user must have a valid account in the system.
- The account must be active (isActive = true).

**Process:**
1. Navigate to Login Portal:
   - The user accesses the Login Portal at `http://localhost:3000`.
2. Select Role:
   - The user selects their role from the dropdown (Admin, Accountant, Employee, Payroll Admin).
3. Enter Login Information:
   - Users input their email and password.
4. Submit Login Information:
   - The user clicks the "Sign In" button.
5. Validate Information:
   - System validates the user's email and password against the database.
   - System checks if the account is active and if the role matches the selected role.
6. Redirect to Portal:
   - If credentials are valid, the system generates a JWT token and redirects the user to their respective portal:
     - Admin → Admin Portal (Port 5174)
     - Accountant → Accountant Client (Port 5175)
     - Employee → Employee Portal (Port 5176)
     - Payroll Admin → Payroll Frontend (Port 5177)

**Alternative Flow (Invalid Information):**
- If the submitted information is incorrect (e.g., wrong email or password):
  - Display an error message (e.g., "Invalid credentials").
  - Redirect back to the Login page for the user to re-enter credentials.
- If the account is inactive:
  - Display error message: "User account is inactive".
  - Prevent login.

**Postconditions:**
- The user is successfully logged into the system with their respective role.
- The user is navigated to their role-specific portal.
- JWT token is stored in localStorage for session management.

**Error Handling:**
- Lost Connection: Display a "Lost Connection" screen and prompt the user to reconnect.
- Invalid Credentials: Display an error message and allow the user to retry.
- Account Inactive: Display error message and prevent login.

**Security Measures:**
- Passwords are validated against stored hashed credentials using bcrypt.
- JWT tokens are used for secure session management.
- Only active accounts can log in.
- Role-based access control ensures users can only access their designated portals.

#### b. Logout
**Function Trigger:** User clicks the "Logout" button in the account menu or header.

**Function Description:** This function allows logged-in users (Admin, Accountant, Employee) to log out of the platform, ending their session and clearing authentication data.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The user is logged into the system.
- The user is connected to the internet.
- The user has successfully authenticated.

**Process:**
1. Access Account Menu:
   - The user clicks the account menu or logout button.
2. Initiate Logout:
   - The user clicks the "Logout" button.
3. Clear Session:
   - System removes authToken and user data from localStorage.
4. Redirect to Login Page:
   - The system redirects to the Login Portal page.

**Alternative Flow:** N/A.

**Postconditions:**
- The user is successfully logged out and returned to the Login Portal page.
- All session data is cleared from localStorage.

**Error Handling:**
- Lost Connection: Display a "Lost Connection" screen and prompt reconnection.

**Security Measures:**
- User session is securely terminated upon logout.
- All authentication tokens are removed from client storage.

### 4.2 Employee Management

#### a. Enroll Employee
**Function Trigger:** Admin clicks the "Enroll Employee" option from the navigation menu in Admin Portal.

**Function Description:** This function allows Admin users to register new employees in the system. The process includes capturing employee personal information, job details, and face recognition data for attendance tracking. Data processing involves collecting employee information, capturing face images, generating face embeddings, and storing all data in the database.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- The admin has access to the Admin Portal.
- Face recognition models are loaded.
- Camera access is available.

**Process:**
1. Navigate to Enrollment Form:
   - Admin clicks "Enroll Employee" from the navigation menu.
2. Load Face Recognition Models:
   - System loads face-api.js models (TinyFaceDetector, FaceLandmark68Net, FaceRecognitionNet).
3. Fill Employee Information:
   - Admin enters required information:
     - Name, Email, Employee Code
     - Job Title (selected from dropdown)
     - Education Level
     - Base Salary
4. Capture Face Images:
   - Admin clicks "Start Camera" to activate webcam.
   - System detects face in real-time.
   - Admin captures 3-5 face images by clicking "Capture Face".
   - System validates each capture (face detected, anti-spoofing check).
5. Generate Password:
   - Admin chooses to generate random password or set custom password.
   - System validates password strength if custom.
6. Submit Enrollment:
   - Admin clicks "Enroll Employee" button.
   - System validates all fields.
   - System generates face embeddings from captured images.
   - System creates user account with hashed password.
   - System stores face profile in MongoDB.
   - System stores employee data in PostgreSQL.

**Alternative Flow (Invalid Information):**
- If required fields are missing or invalid:
  - Display inline validation errors.
  - Prevent form submission.
- If face capture fails:
  - Display error: "Face not detected. Please try again."
  - Allow retry of face capture.

**Postconditions:**
- A new employee account is successfully created in the database.
- Face profile is stored for attendance recognition.
- Employee can log in with provided credentials.

**Error Handling:**
- Lost Connection: Display "Lost Connection" screen and prompt reconnection.
- Face Detection Failure: Display error and allow retry.
- Database Error: Display "Failed to enroll employee. Please try again later."

**Security Measures:**
- Only authenticated Admin users can enroll employees.
- Passwords are hashed using bcrypt before storage.
- Face embeddings are securely stored in MongoDB.
- Input validation prevents SQL injection and XSS attacks.

#### b. View Employee List
**Function Trigger:** Admin clicks "Employee Management" from the navigation menu in Admin Portal.

**Function Description:** This function allows Admin users to view a list of all employees in the system, including their basic information, department, job title, and employment status.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- The system is connected to the database.

**Process:**
1. Navigate to Employee Management:
   - Admin clicks "Employee Management" from the sidebar.
2. Retrieve Employee Data:
   - System queries the database for all employees.
   - System includes related data (Department, JobTitle, SalaryGrade).
3. Display Employee List:
   - System displays employees in a table format with:
     - Employee Code, Name, Email
     - Department, Job Title
     - Employment Status, Start Date
     - Action buttons (View Details, Edit, Delete)

**Alternative Flow:** N/A.

**Postconditions:**
- The employee list is successfully displayed.
- Admin can perform actions on individual employees.

**Error Handling:**
- Database Error: Display "Unable to load employee list. Please try again later."

**Security Measures:**
- Only authenticated Admin users can view the employee list.
- Data is retrieved securely from the database.

#### c. View Employee Details
**Function Trigger:** Admin clicks the "View" button next to an employee in the Employee List.

**Function Description:** This function allows Admin users to view comprehensive details of a specific employee, including personal information, employment details, salary information, documents, qualifications, and attendance history.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- The employee exists in the system.

**Process:**
1. Select Employee:
   - Admin clicks "View" button next to an employee.
2. Retrieve Employee Details:
   - System fetches employee data including:
     - Personal information (name, email, phone, address, date of birth)
     - Employment details (department, job title, start date, contract type)
     - Salary information (base salary, allowances)
     - Documents, Qualifications, Dependents
     - Attendance history
3. Display Employee Details:
   - System displays all employee information in a detailed view.
   - Admin can navigate between different sections (Personal Info, Employment, Documents, etc.).

**Alternative Flow:** N/A.

**Postconditions:**
- Employee details are successfully displayed.
- Admin can view all related information.

**Error Handling:**
- Employee Not Found: Display "Employee not found" and redirect to employee list.

**Security Measures:**
- Only authenticated Admin users can view employee details.
- System validates employee ID before retrieving data.

#### d. Edit Employee
**Function Trigger:** Admin clicks the "Edit" button next to an employee in the Employee List.

**Function Description:** This function allows Admin users to modify employee information, including personal details, employment information, salary, and other attributes.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- The employee exists in the system.

**Process:**
1. Select Employee to Edit:
   - Admin clicks "Edit" button next to an employee.
2. Load Employee Data:
   - System loads current employee information into an editable form.
3. Modify Information:
   - Admin updates desired fields (name, email, department, job title, salary, etc.).
4. Submit Changes:
   - Admin clicks "Save Changes" button.
   - System validates updated data.
   - System updates employee record in database.

**Alternative Flow (Invalid Information):**
- If updated information is invalid:
  - Display validation errors.
  - Prevent form submission.

**Postconditions:**
- Employee information is successfully updated in the database.

**Error Handling:**
- Validation Error: Display specific error messages for invalid fields.
- Database Error: Display "Failed to update employee. Please try again later."

**Security Measures:**
- Only authenticated Admin users can edit employee information.
- Input validation ensures data integrity.

### 4.3 Attendance

#### a. Check-In
**Function Trigger:** Employee clicks the "Check-In" button on the Employee Portal attendance page.

**Function Description:** This function allows employees to check in for work using face recognition technology. The system captures the employee's face, verifies identity against stored face profiles, records the check-in time, and detects if the employee is late based on shift settings.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The employee is logged in and authenticated.
- The employee has a face profile registered in the system.
- Camera access is available.
- Face recognition models are loaded.

**Process:**
1. Navigate to Attendance Page:
   - Employee accesses the Employee Portal and navigates to the Attendance page.
2. Start Camera:
   - Employee clicks "Check-In" button.
   - System activates webcam and loads face recognition models.
3. Face Detection:
   - System detects face in real-time video stream.
   - System performs liveness detection (blink detection, anti-spoofing).
4. Face Recognition:
   - System extracts face descriptor from captured image.
   - System compares descriptor against stored face profiles in database.
   - System calculates match distance and confidence score.
5. Record Attendance:
   - If face matches (confidence > threshold):
     - System records attendance log with:
       - User ID, Timestamp, Type (IN)
       - Confidence score, Match distance
       - Image (Base64 encoded)
       - isLate flag (if after grace period)
6. Display Result:
   - System displays success message with check-in time.
   - System shows if employee is late.

**Alternative Flow (Face Not Recognized):**
- If face does not match any registered profile:
  - Display error: "Face not recognized. Please try again."
  - Allow retry.

**Postconditions:**
- Attendance log is successfully created in the database.
- Check-in time is recorded.
- Late status is determined and stored.

**Error Handling:**
- Face Not Detected: Display "Face not detected. Please position yourself in front of the camera."
- Recognition Failure: Display "Face recognition failed. Please try again."
- Database Error: Display "Failed to record attendance. Please try again later."

**Security Measures:**
- Only authenticated employees can check in.
- Face recognition prevents proxy attendance.
- Liveness detection prevents photo spoofing.
- All attendance records are logged with timestamps and images.

#### b. Check-Out
**Function Trigger:** Employee clicks the "Check-Out" button on the Employee Portal attendance page.

**Function Description:** This function allows employees to check out from work using face recognition. The system verifies identity, records check-out time, and detects if the employee is leaving early based on shift settings.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The employee is logged in and authenticated.
- The employee has checked in earlier in the day.
- Camera access is available.

**Process:**
1. Navigate to Attendance Page:
   - Employee accesses the Attendance page.
2. Start Camera:
   - Employee clicks "Check-Out" button.
   - System activates webcam.
3. Face Recognition:
   - System detects and recognizes employee's face.
   - System verifies identity against stored profile.
4. Record Check-Out:
   - If face matches:
     - System records attendance log with:
       - User ID, Timestamp, Type (OUT)
       - Confidence score, Image
       - isEarlyLeave flag (if before shift end time)
5. Display Result:
   - System displays success message with check-out time.

**Alternative Flow:** N/A.

**Postconditions:**
- Check-out time is successfully recorded in the database.
- Early leave status is determined and stored.

**Error Handling:**
- Face Not Recognized: Display error and allow retry.
- Database Error: Display error message.

**Security Measures:**
- Face recognition ensures only the registered employee can check out.
- All check-out records are logged securely.

#### c. View Attendance History
**Function Trigger:** Admin clicks "Attendance History" from the navigation menu in Admin Portal.

**Function Description:** This function allows Admin users to view attendance logs for all employees, filter by date range, employee, or status (late, early leave), and export attendance data.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- Attendance logs exist in the database.

**Process:**
1. Navigate to Attendance History:
   - Admin clicks "Attendance History" from the sidebar.
2. Retrieve Attendance Logs:
   - System queries attendance_logs table.
   - System includes related user information.
3. Display Attendance List:
   - System displays logs in a table with:
     - Employee Name, Date, Check-In Time, Check-Out Time
     - Late Status, Early Leave Status
     - Confidence Score
4. Filter and Search:
   - Admin can filter by date range, employee, or status.
   - System updates the displayed list based on filters.

**Alternative Flow:** N/A.

**Postconditions:**
- Attendance history is successfully displayed.
- Admin can filter and export data.

**Error Handling:**
- Database Error: Display "Unable to load attendance history. Please try again later."

**Security Measures:**
- Only authenticated Admin users can view attendance history.
- Data is retrieved securely from the database.

### 4.4 Leave & Requests Management

#### a. Create Leave Request
**Function Trigger:** Employee clicks "Request Leave" button on the Leave Management page in Employee Portal.

**Function Description:** This function allows employees to submit leave requests by specifying leave type, start date, end date, and reason. The request is submitted for approval through a multi-level approval workflow.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The employee is logged in and authenticated.
- The employee is connected to the internet.

**Process:**
1. Navigate to Leave Request Form:
   - Employee clicks "Request Leave" from the Leave Management page.
2. Fill Leave Information:
   - Employee selects leave type (paid, unpaid, sick, maternity, personal).
   - Employee enters start date and end date.
   - System calculates number of days automatically.
   - Employee enters reason for leave.
3. Submit Request:
   - Employee clicks "Submit" button.
   - System validates dates and leave type.
   - System creates leave_request record with status "pending".
   - System creates approval_workflow entries for multi-level approval.
4. Confirmation:
   - System displays success message.
   - Request appears in "Pending Requests" list.

**Alternative Flow (Invalid Dates):**
- If start date is after end date:
  - Display error: "Start date must be before end date."
  - Prevent submission.

**Postconditions:**
- Leave request is successfully created with status "pending".
- Approval workflow is initiated.
- Employee receives confirmation.

**Error Handling:**
- Validation Error: Display specific error messages for invalid inputs.
- Database Error: Display "Failed to submit leave request. Please try again later."

**Security Measures:**
- Only authenticated employees can create leave requests.
- Date validation prevents invalid date ranges.
- Approval workflow ensures proper authorization.

#### b. Approve Leave Request
**Function Trigger:** Manager/Admin clicks "Approve" button next to a pending leave request in the Approval Management page.

**Function Description:** This function allows managers and admins to approve or reject leave requests submitted by employees. The system supports multi-level approval workflow (Department Manager → HR → Director).

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The approver is logged in and authenticated.
- The approver has approval permissions for the request.
- A pending leave request exists.

**Process:**
1. Navigate to Approval Management:
   - Manager/Admin accesses "Approval Management" page.
2. View Pending Requests:
   - System displays list of pending leave requests.
3. Review Request:
   - Approver clicks "View Details" to see request information.
4. Approve or Reject:
   - Approver clicks "Approve" or "Reject" button.
   - If approved:
     - System updates leave_request status to "approved".
     - System updates approval_workflow status.
     - System moves to next approval level if required.
   - If rejected:
     - System updates status to "rejected".
     - System sends notification to employee.
5. Confirmation:
   - System displays success message.

**Alternative Flow:** N/A.

**Postconditions:**
- Leave request status is updated.
- Employee is notified of approval/rejection.
- Approval workflow progresses to next level if required.

**Error Handling:**
- Permission Error: Display "You do not have permission to approve this request."
- Database Error: Display "Failed to process approval. Please try again later."

**Security Measures:**
- Only authorized approvers can approve requests.
- Multi-level approval ensures proper authorization.
- All approval actions are logged.

#### c. Create Overtime Request
**Function Trigger:** Employee clicks "Request Overtime" button on the Overtime Management page.

**Function Description:** This function allows employees to submit overtime work requests by specifying date, start time, end time, reason, and project name. The request requires approval before overtime hours are counted.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The employee is logged in and authenticated.
- The employee is connected to the internet.

**Process:**
1. Navigate to Overtime Request Form:
   - Employee clicks "Request Overtime" from Overtime Management page.
2. Fill Overtime Information:
   - Employee selects date.
   - Employee enters start time and end time.
   - System calculates total hours automatically.
   - Employee enters reason and project name (optional).
3. Submit Request:
   - Employee clicks "Submit" button.
   - System validates time range.
   - System creates overtime_request record with status "pending".
   - System creates approval workflow entries.
4. Confirmation:
   - System displays success message.

**Alternative Flow:** N/A.

**Postconditions:**
- Overtime request is successfully created.
- Approval workflow is initiated.

**Error Handling:**
- Validation Error: Display errors for invalid time ranges.
- Database Error: Display error message.

**Security Measures:**
- Only authenticated employees can create overtime requests.
- Time validation ensures logical time ranges.
- Approval workflow ensures proper authorization.

### 4.5 Payroll Management

#### a. Calculate Payroll
**Function Trigger:** Admin/Accountant clicks "Calculate Payroll" button on the Payroll Management page.

**Function Description:** This function allows Admin or Accountant users to automatically calculate payroll for all employees for a specific month. The system calculates base salary, allowances, bonuses, deductions (insurance, tax), and net salary based on attendance, leave records, and salary policies.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The user is logged in as Admin or Accountant.
- Employee data, attendance logs, and salary policies exist in the database.
- Insurance configurations are set up.

**Process:**
1. Navigate to Payroll Management:
   - Admin/Accountant accesses "Payroll Management" page.
2. Select Month and Year:
   - User selects the month and year for payroll calculation.
3. Initiate Calculation:
   - User clicks "Calculate Payroll" button.
4. System Calculations:
   - System retrieves all active employees.
   - For each employee:
     - Calculates working days from attendance logs.
     - Calculates base salary based on working days.
     - Calculates allowances (lunch, transport, phone, responsibility).
     - Calculates overtime pay from approved overtime requests.
     - Calculates insurance deductions (BHXH, BHYT, BHTN).
     - Calculates personal income tax (TNCN) with deductions.
     - Calculates net salary (total income - total deductions).
5. Create Payroll Records:
   - System creates payroll record for each employee.
   - System creates payroll_detail records for each component.
   - System sets status to "pending_approval".
6. Display Results:
   - System displays calculated payroll list.
   - User can review and approve individual payrolls.

**Alternative Flow:** N/A.

**Postconditions:**
- Payroll records are successfully created for all employees.
- Payroll details are stored in the database.
- Payroll status is set to "pending_approval".

**Error Handling:**
- Calculation Error: Display "Error calculating payroll for employee [name]. Please check data."
- Database Error: Display "Failed to save payroll. Please try again later."

**Security Measures:**
- Only Admin or Accountant users can calculate payroll.
- All calculations are validated before saving.
- Payroll records require approval before payment.

#### b. View Payslip
**Function Trigger:** Employee clicks "View Payslip" button on the Salary History page in Employee Portal.

**Function Description:** This function allows employees to view their monthly payslip in PDF format, showing detailed breakdown of salary components, deductions, and net salary.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The employee is logged in and authenticated.
- Payroll record exists for the selected month.

**Process:**
1. Navigate to Salary History:
   - Employee accesses "Salary History" page.
2. Select Month:
   - Employee selects month and year.
3. View Payslip:
   - Employee clicks "View Payslip" button.
   - System retrieves payroll data.
   - System generates PDF payslip with:
     - Employee information
     - Salary breakdown (base salary, allowances, bonuses)
     - Deductions (insurance, tax)
     - Net salary
4. Download PDF:
   - System displays PDF in new window or downloads file.

**Alternative Flow:** N/A.

**Postconditions:**
- Payslip PDF is successfully generated and displayed.

**Error Handling:**
- Payroll Not Found: Display "No payroll record found for this month."
- PDF Generation Error: Display "Failed to generate payslip. Please try again later."

**Security Measures:**
- Only authenticated employees can view their own payslips.
- System validates employee ID before retrieving payroll data.

### 4.6 Insurance Forms

#### a. Fill TK1-TS Form
**Function Trigger:** Admin clicks "BHXH/BHYT Form (TK1-TS)" from the navigation menu in Admin Portal.

**Function Description:** This function allows Admin users to fill out the TK1-TS form (Social and Health Insurance Declaration Form) for employees. The form includes employee personal information, birth place, address, and household member information. Data can be auto-filled from employee records, saved to database, and exported as PDF or Word.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- Employee data exists in the system.
- The system is connected to the database.

**Process:**
1. Navigate to TK1-TS Form:
   - Admin clicks "BHXH/BHYT Form (TK1-TS)" from the sidebar.
2. Select Employee:
   - Admin selects an employee from the dropdown.
3. Auto-Fill Employee Data:
   - System automatically loads employee information:
     - Name, Date of Birth, Gender
     - Nationality, Ethnicity
     - Address (with country/province dropdowns)
     - ID Number, Phone Number
     - Social Insurance Number
4. Load Saved Form Data:
   - System checks if form data was previously saved.
   - If saved data exists, system loads and displays it.
5. Fill Form Fields:
   - Admin fills remaining fields:
     - Birth place (country, province, district, ward dropdowns)
     - Address details (country, province, district, ward dropdowns)
     - Date fields using date pickers
     - Household member information (if applicable)
6. Save Form:
   - Admin clicks "💾 Lưu Form" button.
   - System saves form data to insurance_forms table.
   - System displays success message.
7. Export Form:
   - Admin clicks "📄 Xuất PDF" or "📝 Xuất Word" button.
   - System generates PDF/Word file with form data.
   - System downloads file to user's computer.

**Alternative Flow (No Saved Data):**
- If no saved form data exists:
  - System only displays auto-filled employee data.
  - Admin fills form from scratch.

**Postconditions:**
- Form data is successfully saved to the database.
- Form can be exported as PDF or Word.
- Saved data is available for future editing.

**Error Handling:**
- Employee Not Selected: Display "Please select an employee first."
- Save Error: Display "Failed to save form. Please try again later."
- Export Error: Display "Failed to export form. Please try again later."

**Security Measures:**
- Only authenticated Admin users can fill and save forms.
- Form data is securely stored in the database.
- Country and province dropdowns prevent invalid address entries.

#### b. Fill D02-LT Form
**Function Trigger:** Admin clicks "Báo Cáo D02-LT" from the navigation menu in Admin Portal.

**Function Description:** This function allows Admin users to create the D02-LT report (Labor Usage and Social Insurance Participation Report) for the company. The report includes company information and a detailed list of employees with their employment and insurance information. Data can be saved and exported as PDF or Word.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- Employee data exists in the system.
- Company information is available.

**Process:**
1. Navigate to D02-LT Form:
   - Admin clicks "Báo Cáo D02-LT" from the sidebar.
2. Fill Company Information:
   - Admin enters company details:
     - Company Name, Company Code, Tax Code
     - Address, Phone, Email
     - Report Number, Report Date
3. Select Employees:
   - System loads list of all employees.
   - Admin selects employees to include in the report (checkboxes).
   - Admin can select all or individual employees.
4. Generate Employee List:
   - System generates detailed employee list with:
     - Name, Social Insurance Number, Date of Birth, Gender
     - ID Number, Position, Salary
     - Contract dates, Insurance start/end dates
     - Notes
5. Preview Report:
   - System displays preview table with selected employees.
6. Save Report:
   - Admin clicks "💾 Lưu Form" button.
   - System saves company info and employee list to database.
   - System displays success message.
7. Export Report:
   - Admin clicks "📄 Xuất PDF" or "📝 Xuất Word" button.
   - System generates PDF/Word file with report data.
   - System downloads file.

**Alternative Flow:** N/A.

**Postconditions:**
- Report data is successfully saved to the database.
- Report can be exported as PDF or Word.
- Saved data can be loaded for future editing.

**Error Handling:**
- No Employees Selected: Display "Please select at least one employee."
- Save Error: Display "Failed to save report. Please try again later."
- Export Error: Display "Failed to export report. Please try again later."

**Security Measures:**
- Only authenticated Admin users can create and save reports.
- Report data is securely stored in the database.
- Employee data is retrieved securely from the database.

### 4.7 Reports

#### a. View Attendance Report
**Function Trigger:** Admin clicks "Reports" → "Attendance Report" from the navigation menu in Admin Portal.

**Function Description:** This function allows Admin users to view attendance reports for employees, including total working days, actual working days, overtime hours, and leave days remaining. Reports can be filtered by date range, department, or employee.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- Attendance logs exist in the database.

**Process:**
1. Navigate to Reports:
   - Admin clicks "Reports" from the sidebar.
2. Select Attendance Report:
   - Admin clicks "Attendance Report" option.
3. Set Filters:
   - Admin selects date range (month/year).
   - Admin optionally filters by department or employee.
4. Generate Report:
   - Admin clicks "Generate Report" button.
   - System queries attendance_logs and leave_requests tables.
   - System calculates:
     - Total standard working days
     - Actual working days
     - Overtime hours
     - Leave days used and remaining
5. Display Report:
   - System displays report in table format.
   - Report shows data per employee or aggregated by department.

**Alternative Flow:** N/A.

**Postconditions:**
- Attendance report is successfully generated and displayed.

**Error Handling:**
- No Data: Display "No attendance data found for the selected period."
- Database Error: Display "Failed to generate report. Please try again later."

**Security Measures:**
- Only authenticated Admin users can view reports.
- Data is retrieved securely from the database.

#### b. View Payroll Cost Report
**Function Trigger:** Admin clicks "Reports" → "Payroll Cost Report" from the navigation menu.

**Function Description:** This function allows Admin users to view payroll cost reports showing total salary fund, insurance costs, tax costs, and net payroll expenses for a specific period.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- Payroll records exist in the database.

**Process:**
1. Navigate to Reports:
   - Admin clicks "Reports" from the sidebar.
2. Select Payroll Cost Report:
   - Admin clicks "Payroll Cost Report" option.
3. Set Period:
   - Admin selects month and year.
4. Generate Report:
   - System queries payrolls and payroll_details tables.
   - System calculates:
     - Total salary fund
     - Total insurance costs (employee + employer contributions)
     - Total tax costs
     - Net payroll expenses
5. Display Report:
   - System displays aggregated cost data.
   - Report shows breakdown by cost category.

**Alternative Flow:** N/A.

**Postconditions:**
- Payroll cost report is successfully generated and displayed.

**Error Handling:**
- No Data: Display "No payroll data found for the selected period."
- Database Error: Display error message.

**Security Measures:**
- Only authenticated Admin users can view cost reports.
- Financial data is retrieved securely.

#### c. View Turnover Report
**Function Trigger:** Admin clicks "Reports" → "Turnover Report" from the navigation menu.

**Function Description:** This function allows Admin users to view employee turnover reports showing turnover rate, number of new employees, and number of employees who left during a specific period.

**Screen Layout:**

**Function Details:**

**Preconditions:**
- The admin is logged in and authenticated.
- Employee data exists in the database.

**Process:**
1. Navigate to Reports:
   - Admin clicks "Reports" from the sidebar.
2. Select Turnover Report:
   - Admin clicks "Turnover Report" option.
3. Set Period:
   - Admin selects period (month, quarter, or year).
4. Generate Report:
   - System queries users table.
   - System calculates:
     - Total employees at start of period
     - New employees joined during period
     - Employees who left during period
     - Turnover rate percentage
5. Display Report:
   - System displays turnover statistics.
   - Report shows trends over time.

**Alternative Flow:** N/A.

**Postconditions:**
- Turnover report is successfully generated and displayed.

**Error Handling:**
- No Data: Display "No employee data found for the selected period."
- Database Error: Display error message.

**Security Measures:**
- Only authenticated Admin users can view turnover reports.
- Data is retrieved securely from the database.
