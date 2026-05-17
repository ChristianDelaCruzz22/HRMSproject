# Sprint 2 Log — HRMS Project

## Sprint Duration
- **Start:** April 2, 2026
- **End:** April 13, 2026
- **Theme:** HR CRUD, Rights Enforcement & Soft Delete Visibility
- **Team:** Group 6 - Alt F4 (IM2)
- **Total PRs This Sprint:** 20 (M1: 4, M2: 5, M3: 4, M4: 4, M5: 3)

---

## Team Members

| Member | Name                  | Role                                  |
| ------ | --------------------- | ------------------------------------- |
| M1     | Christian Dela Cruz   | Project Lead / Full-Stack Developer   |
| M2     | Josh Visitacion       | Frontend Developer (UI/UX)            |
| M3     | Wesly Quilendireno    | Backend / Database Engineer           |
| M4     | Felicity Zoe Villa    | Rights & Authentication Specialist    |
| M5     | Rajah Renzuken Lamsen | QA / Documentation Specialist         |

---

## Week 3 (April 2, 2026) — CRUD Implementation Begins

### Tasks Started
| Category | Task | Assignee | Status |
|---|---|---|---|
| Development | Implement Dashboard, and Schedule views | M1 | To Do |
| Development | Real-time Persistence | M1, M3 | To Do |
| Development | emp_id Auth & Authorization Flow | M4 | To Do |
| UI/UX | Manager assignment distribution UI | M1, M2 | To Do |
| Testing | End-to-End System Flow Audit | M1, M5 | To Do |
| Testing | Testing of new and improved source code | M5 |  Complete |

### Notes
- Sprint 2 theme established: full CRUD for all four HR tables (Employee, Job History, Job, Department) with rights enforcement across all 17 rights
- M1 began building service functions for Employee, Job History, Job, and Department modules
- M2 started EmployeeListPage and modal components with rights gating in mind
- M3 started writing RLS policies for all four tables — SELECT, INSERT, UPDATE patterns
- M4 began designing UserRightsContext to load all 17 rights on login
- M5 completed testing of the new and improved source code — no errors found during debugging, all previously failing Sprint 1 tests now passing
- UI/UX direction updated again: shifting from "Formal" toward semi-professional aesthetic using floating cards and split backgrounds
- Auth flow for emp_id assigned to M4 — covers Dashboard access and Time-In/Out permissions
- Timestamp real-time persistence flagged as a dependency between M1 and M3

---

## Week 4 (April 13, 2026) — Rights Enforcement, Soft Delete & Visibility

### Tasks Completed
| Category | Task | Assignee | Status |
|---|---|---|---|
| Back-end | RLS policies for employee table | M3 |  Complete |
| Back-end | RLS policies for jobHistory, job, department | M3 |  Complete |
| Back-end | Soft-delete cascade trigger (employee → jobHistory) | M3 |  Complete |
| Back-end | employee_current_job SQL view | M3 |  Complete |
| Development | Employee service functions (CRUD + soft delete + recover) | M1 |  Complete |
| Development | Job History service functions | M1 |  Complete |
| Development | Job and Department service functions | M1 |  Complete |
| Development | /deactivate-items route guard for USER accounts | M1 |  Complete |
| Front-end | EmployeeListPage with stamp gating + INACTIVE filter | M2 |  Complete |
| Front-end | EmployeeDetailPage + JobHistoryPanel + AddJobHistoryForm | M2 |  Complete |
| Front-end | JobListPage + DeptListPage + modals | M2 |  Complete |
| Front-end | Sidebar gating — hide Deleted Items + Admin links for USER | M2 |  Complete |
| Auth | UserRightsContext + useRights hook (17 rights) | M4 |  Complete |
| Auth | Button gating for Employee and Job History modules | M4 |  Complete |
| Auth | Button gating for Job and Department modules | M4 |  Complete |
| Auth | Stamp column visibility + sidebar link gating | M4 |  Complete |
| Testing | Full 51-case rights test matrix (3 users × 17 rights) | M5 |  Complete |
| Testing | Cascade, recovery, API bypass, stamp visibility tests | M5 |  Complete |
| Documentation | Sprint 2 log | M5 | Complete |

---

## Full Sprint 2 Deliverables by Member

### M1 — Christian Dela Cruz — Project Lead / Full-Stack Developer
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | feat/employee-api | Employee service functions (CRUD + soft delete + recover) |  Merged |
| PR-02 | feat/jobhistory-api | Job History service functions |  Merged |
| PR-03 | feat/job-dept-api | Job and Department service functions |  Merged |
| PR-04 | feat/route-guard-deleted | /softdeleted-items route guard for USER accounts |  Merged |

**Outputs:**
- getEmployees(), addEmployee(), updateEmployee(), softDeleteEmployee(), recoverEmployee()
- getJobHistory(), addJobHistory(), updateJobHistory(), softDeleteJobHistory(), recoverJobHistory()
- getJobs(), addJob(), updateJob(), softDeleteJob(), recoverJob()
- getDepts(), addDept(), updateDept(), softDeleteDept(), recoverDept()
- All getX() functions filter record_status = 'ACTIVE' for USER; return all rows for ADMIN/SUPERADMIN
- UserRightsContext integrated at app level
- Route guard on /deleted-items blocking USER accounts

**Sprint 2 PRs: 4**
**Running PR Total: 7** (3 from Sprint 1 + 4 from Sprint 2)

---

### M2 — Josh Visitacion — Frontend Developer (UI/UX)
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | feat/ui-employee-list | EmployeeListPage with stamp gating + INACTIVE filter |  Merged |
| PR-02 | feat/ui-employee-detail-jh | EmployeeDetailPage + JobHistoryPanel + AddJobHistoryForm |  Merged |
| PR-03 | feat/ui-job-dept | JobListPage + DeptListPage + their modals |  Merged |
| PR-04 | feat/ui-deleted-items | SoftDeletedItemsPage with 4 tabs and Recover buttons |  Merged |
| PR-05 | fix/ui-sidebar-gating | Hide Deleted Items + Admin links for USER in sidebar |  Merged |

**Outputs:**
- EmployeeListPage: empno, lastname, firstname, gender, hiredate, sepDate, current job; stamp column shown only to ADMIN/SUPERADMIN; INACTIVE rows hidden for USER
- EmployeeDetailPage: profile view with JobHistoryPanel (jobDesc, deptName, effDate, salary) sorted by effDate descending
- AddEmployeeModal, EditEmployeeModal, SoftDeleteConfirmDialog (EMP_ADD/EMP_EDIT/EMP_DEL gated)
- AddJobHistoryForm embedded in EmployeeDetailPage (JH_ADD gated)
- EditJobHistoryModal (JH_EDIT gated); soft-delete button per row (JH_DEL gated)
- JobListPage: jobCode, jobDesc, record_status (ADMIN+); AddJobModal + EditJobModal
- DeptListPage: deptCode, deptName; AddDeptModal + EditDeptModal
- DeletedItemsPage: 4 tabs (Employees / Job History / Jobs / Departments) with Recover buttons
- Sidebar link for Deleted Items and Admin hidden for USER accounts
- UI redesigned to semi-professional: floating cards and split backgrounds

**Sprint 2 PRs: 5**
**Running PR Total: 9** (4 from Sprint 1 + 5 from Sprint 2)

---

### M3 — Wesly Quilendireno — Backend / Database Engineer
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | db/rls-employee | SELECT + INSERT + UPDATE policies for employee |  Merged |
| PR-02 | db/rls-jobhistory-job-dept | Same RLS policy pattern for jobHistory, job, department |  Merged |
| PR-03 | db/trigger-cascade-softdelete | Cascade trigger (employee → jobHistory status sync) |  Merged |
| PR-04 | db/view-employee-current-job | employee_current_job SQL view |  Merged |

**Outputs:**
- RLS SELECT policy on employee: USER sees ACTIVE only; ADMIN/SUPERADMIN see all rows
- RLS INSERT (EMP_ADD=1), UPDATE-edit (EMP_EDIT=1), UPDATE-deactivate (EMP_DEL=1), UPDATE-recover (ADMIN/SUPERADMIN) policies on employee
- Same 4-policy pattern applied to jobHistory, job, and department tables
- Soft-delete cascade trigger: setting employee INACTIVE cascades to all their jobHistory rows; restoring employee restores all their jobHistory rows
- employee_current_job SQL view: latest active jobHistory per employee joined with job.jobDesc and department.deptName
- All RLS policies tested in Supabase SQL editor using role impersonation

**Sprint 2 PRs: 4**
**Running PR Total: 8** (4 from Sprint 1 + 4 from Sprint 2)

---

### M4 — Felicity Zoe Villa — Rights & Authentication Specialist
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | feat/rights-context | UserRightsContext + useRights hook (17 rights) |  Merged |
| PR-02 | feat/rights-employee-jh | Button gating for Employee and Job History modules |  Merged |
| PR-03 | feat/rights-job-dept | Button gating for Job and Department modules |  Merged |
| PR-04 | feat/rights-stamp-sidebar | Stamp column visibility + sidebar link gating |  Merged |

**Outputs:**
- UserRightsContext.jsx: on login, queries all 17 UserModule_Rights rows for currentUser, stores as rights map
- useRights() hook: returns rights map from context
- Employee: Add (EMP_ADD), Edit (EMP_EDIT), Delete (EMP_DEL) buttons gated
- Job History: Add (JH_ADD), Edit (JH_EDIT), Delete (JH_DEL) buttons gated
- Job: Add (JOB_ADD), Edit (JOB_EDIT), Delete (JOB_DEL) buttons gated
- Department: Add (DEPT_ADD), Edit (DEPT_EDIT), Delete (DEPT_DEL) buttons gated
- Stamp column hidden for USER accounts across all 4 table components
- Sidebar Deleted Items and Admin links hidden for USER; /deleted-items route guard active

**Sprint 2 PRs: 4**
**Running PR Total: 8** (4 from Sprint 1 + 4 from Sprint 2)

---

### M5 — Rajah Renzuken Lamsen — QA / Documentation Specialist
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | test/sprint2-rights-51-cases | Full 51-case rights test matrix results |  Merged |
| PR-02 | test/sprint2-cascade-visibility | Cascade, recovery, API bypass, stamp tests |  Merged |
| PR-03 | docs/sprint2-log | Sprint 2 log with findings and resolutions |  Merged |

**Outputs:**
- Rights test matrix: 3 user types × 17 rights = 51 test cases, all documented with pass/fail
- Soft-delete cascade test: soft-delete employee 00001 as SUPERADMIN → confirmed all their jobHistory rows disappear for USER; confirmed ADMIN sees them in Deleted Items 
- Recovery cascade test: recover employee 00001 as ADMIN → confirmed all their jobHistory rows reappear for USER 
- Visibility bypass test: USER calling getEmployees() without ACTIVE filter → confirmed RLS blocks INACTIVE rows from all 4 tables 
- Stamp visibility test: USER login — stamp column absent in all 4 tables ; ADMIN login — stamp present 
- No hard delete audit: zero .delete() calls found on HR tables 
- Previously failing Sprint 1 test cases now fully resolved and passing 
- Sprint 2 log completed

**Sprint 2 PRs: 3**
**Running PR Total: 5** (2 from Sprint 1 + 3 from Sprint 2)

---

## Completed This Sprint
-  All 4 HR service layers built with full CRUD + soft delete + recover (M1)
-  All 4 HR table UIs built with modals, detail views, and gated buttons (M2)
-  RLS policies enforced on all 4 tables for all 3 user types (M3)
-  Soft-delete cascade trigger deployed and tested (M3)
-  employee_current_job SQL view live (M3)
-  All 17 rights loaded into UserRightsContext on login (M4)
-  All 51 rights button gates implemented and tested (M4)
-  Stamp column and sidebar visibility gated by user type (M2, M4)
-  DeletedItemsPage with 4 tabs and Recover buttons deployed (M2)
-  51-case rights test matrix completed — all cases documented (M5)
-  Cascade, recovery, bypass, and stamp tests all passed (M5)
-  Sprint 1 failing tests fully resolved (M5)
-  No hard deletes found in codebase (M5)

## Blockers Encountered
- Timestamp real-time persistence between M1 and M3 still being finalized
- Dashboard, Attendance, and Schedule views not yet started — carried to Sprint 3
- Admin Schedule & Attendance Tracker not yet started — carried to Sprint 3
- emp_id Auth & Authorization Flow for Time-In/Out still pending (M4)
- Manager assignment distribution UI not yet implemented — carried to Sprint 3
- End-to-End System Flow Audit with Vitest pending full feature completion

## Resolutions Applied
- Sprint 1 test failures resolved by M5 before Sprint 2 testing began — clean slate
- RLS policies tested directly in Supabase SQL editor using role impersonation to catch issues before frontend integration
- Sidebar gating handled jointly by M2 (UI hiding) and M4 (rights context) to ensure both visual and route-level protection

---

## Cumulative PR Totals (Sprint 1 + Sprint 2)
| Member | Sprint 1 | Sprint 2 | Total |
|---|---|---|---|
| M1 | 3 | 4 | **7** |
| M2 | 4 | 4 | **9** |
| M3 | 3 | 4 | **8** |
| M4 | 4 | 4 | **8** |
| M5 | 2 | 3 | **5** |
| **Team** | **16** | **19** | **35** |

---

## Next Sprint Goals
- Build Dashboard, and Schedule views (M1, M2)
- Implement Admin Schedule & Tracker (M2)
- Complete Timestamp real-time persistence (M1, M3)
- Implement emp_id Auth & Authorization for Time-In/Out (M4)
- Build Manager assignment distribution UI with floating card layout (M1, M2)
- Run End-to-End System Flow Audit using Vitest (M1, M5)
- Expand Vitest coverage to HR CRUD and rights enforcement flows (M5)
