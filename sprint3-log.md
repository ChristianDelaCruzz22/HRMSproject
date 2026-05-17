# Sprint 3 Log — HRMS Project

## Sprint Duration
- **Start:** April 22, 2026
- **End:** May 2, 2026
- **Theme:** Admin Module, HR Reports, Production Deployment & System Refactor
- **Team:** Group 6 - Alt F4 (IM2)
- **Total PRs This Sprint:** 14 (M1: 3, M2: 3, M3: 3, M4: 2, M5: 3)

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

## Week 5 (April 22, 2026) — Refactor & Schema Alignment

### Tasks Started
| Category | Task | Assignee | Status |
|---|---|---|---|
| Development | Fix & refactor Dashboard module | M1, M2 | To Do |
| Development | Fix & refactor Employee Management module | M1, M2, M3 | To Do |
| Development | Fix & refactor Directory module | M2, M3 | To Do |
| Development | Fix & refactor Departments module | M2, M3 | To Do |
| Development | Fix & refactor Recruitment module | M2, M3 | To Do |

### Notes
- Dashboard refactor scope defined: remove leave, announcements, messages, training, payroll, reports, and settings sections — keep profile and preferences only
- Employee Management to be restructured into 4 separate tables: employee, department, job, jobHistory — aligned with SIRS SQL schema
- Directory and Departments modules require field name updates to match Supabase schema changes; SIRS SQL used as reference
- Recruitment module data flow to be reviewed and aligned with updated Supabase field names

---

## Week 6 (April 23, 2026) — Auth, Role Rendering & Testing Setup

### Tasks Started
| Category | Task | Assignee | Status |
|---|---|---|---|
| Development | Remove Attendance module (tentative) | M1, M3 | To Do |
| Development | Supabase field name migration | M3 | To Do |
| Development | emp_id Auth & Authorization Flow | M4 | To Do |
| Development | Role-based content rendering | M1, M2, M4 | To Do |
| UI/UX | Manager assignment distribution UI | M2 | To Do |
| Testing | End-to-End System Flow Audit | M5 | To Do |

### Notes
- Attendance and Schedule modules flagged for removal — requires team confirmation before final deletion
- M3 to migrate all Supabase field names to match SIRS SQL; all frontend references to be updated accordingly
- emp_id auth flow (M4) covers both Dashboard access and Time-In/Out permissions — unauthorized IDs must not access protected modules
- Role-based rendering confirmed: same page served to all roles, content differs based on role (employee vs admin/manager)
- Manager assignment UI to follow semi-professional style — floating cards and split backgrounds
- Vitest audit (M5) to verify unauthorized IDs cannot access attendance or dashboard modules

---

## Full Sprint 3 Deliverables by Member

### M1 — Christian Dela Cruz — Project Lead / Full-Stack Developer
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | feat/admin-api | getUsers(), activateUser(), deactivateUser() (SUPERADMIN-blocked) |  Merged |
| PR-02 | feat/reports-api | Headcount by dept + salary summary + employee full history |  Merged |
| PR-03 | chore/production-deploy | Vercel/Netlify config + env vars + production redirect URLs |  Merged |

**Outputs:**
- getUsers(), activateUser(), deactivateUser() — all three block any operation on SUPERADMIN rows
- getHeadcountByDept() from headcount_by_dept view
- getSalarySummaryByJob() from salary_summary_by_job view
- getEmployeeFullHistory(empNo) from full employee history query
- App deployed to Vercel/Netlify with production Supabase URL and anon key as env vars
- Production redirect URLs updated in Supabase Dashboard
- Release PR created: dev → main, reviewed by all 5 members, merged as final Sprint 3 delivery
- All stale branches deleted from GitHub repository

**Sprint 3 PRs: 3**
**Running PR Total: 10** (7 from Sprint 1–2 + 3 from Sprint 3)

---

### M2 — Josh Visitacion — Frontend Developer (UI/UX)
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | feat/ui-admin-users | UserManagementPage with SUPERADMIN row protection |  Merged |
| PR-02 | feat/ui-reports | HeadcountByDeptPage + SalaryReportPage + EmployeeHistoryReportPage |  Merged |
| PR-03 | fix/ui-final-polish | Loading/empty/error states, mobile responsive fixes |  Merged |

**Outputs:**
- UserManagementPage: table of all users (userId, username, user_type, record_status); Activate and Deactivate buttons per row; SUPERADMIN rows fully disabled with tooltip "SUPERADMIN accounts cannot be modified"
- HeadcountByDeptPage: active employee count per department linked to department.deptName
- SalaryReportPage: min/max/avg salary per jobCode linked to job.jobDesc
- EmployeeHistoryReportPage: select an employee, view complete job history chronologically (job, dept, salary, effDate)
- Final UI polish: consistent loading states, empty states ("No records found"), error messages, mobile responsive verified across all pages

**Sprint 3 PRs: 3**
**Running PR Total: 12** (9 from Sprint 1–2 + 3 from Sprint 3)

---

### M3 — Wesly Quilendireno — Backend / Database Engineer
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | db/views-reports | headcount_by_dept + salary_summary_by_job views |  Merged |
| PR-02 | db/rls-admin-user-mgmt | User table + UserModule_Rights RLS with SUPERADMIN guard | Merged |
| PR-03 | docs/final-rls-audit | RLS audit checklist and hard-delete verification report |  Merged |

**Outputs:**
- headcount_by_dept view: COUNT of active employees per department using latest active jobHistory row per employee
- salary_summary_by_job view: MIN, MAX, AVG salary per active jobCode from active jobHistory rows
- Admin Module RLS on user table: ADMIN can UPDATE record_status only WHERE user_type != 'SUPERADMIN'; ADMIN cannot UPDATE user_type; ADMIN cannot INSERT/UPDATE/DELETE UserModule_Rights rows belonging to a SUPERADMIN
- Final RLS audit: all 4 HR tables + user + UserModule_Rights verified; no dev-mode policy bypasses in production
- Hard delete audit: zero DELETE statements found in any Supabase function, trigger, migration, or Edge Function
- Database backup verified in Supabase Dashboard

**Sprint 3 PRs: 3**
**Running PR Total: 11** (8 from Sprint 1–2 + 3 from Sprint 3)

---

### M4 — Felicity Zoe Villa — Rights & Authentication Specialist
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | feat/rights-admin-module | ADM_USER gating for Admin sidebar link |  Merged |
| PR-02 | test/e2e-rights-production | Production regression test log (all 3 user types) |  Merged |

**Outputs:**
- Admin Module sidebar link gated: visible only when rights.ADM_USER === 1
- UserManagementPage: all action buttons (Activate, Deactivate) disabled on SUPERADMIN rows regardless of who is logged in; tooltip displayed on hover
- End-to-end rights regression in production: USER (HR Staff), ADMIN (HR Manager), SUPERADMIN — all 17 rights and all 4 HR module buttons verified in live environment
- Google OAuth tested in production: sign in with Google confirmed, activation flow confirmed, 17 rights loaded correctly after activation
- ADMIN cannot modify SUPERADMIN row confirmed at both UI level (buttons disabled) and DB level (direct Supabase call rejected by RLS)

**Sprint 3 PRs: 2**
**Running PR Total: 10** (8 from Sprint 1–2 + 2 from Sprint 3)

---

### M5 — Rajah Renzuken Lamsen — QA / Documentation Specialist
| PR | Branch | Description | Status |
|---|---|---|---|
| PR-01 | test/sprint3-e2e-production | Full end-to-end test report with production screenshots |  Merged |
| PR-02 | docs/user-manual-final | Finalized HR System User Manual |  Merged |
| PR-03 | docs/presentation-slides | 12-slide presentation deck |  Merged |

**Outputs:**
- Full end-to-end test in production: all 3 user types, all 4 HR modules, all 3 reports, admin activation — pass/fail recorded with screenshots
- SUPERADMIN protection test: ADMIN attempt to modify SUPERADMIN row blocked at UI; direct Supabase UPDATE blocked by RLS
- Cascade test in production: soft-delete and recover employee confirmed, job history cascades correctly
- User Manual finalized: covers registration (email + Google), login, Employee management, job and department management, reports, admin activation — screenshots from live app
- Sprint Deliverables & PR Expectations document reviewed and finalized
- Presentation slides prepared: 12 slides covering system overview, architecture, demo flow, rights matrix, cascade behavior, reports, lessons learned

**Sprint 3 PRs: 3**
**Running PR Total: 8** (5 from Sprint 1–2 + 3 from Sprint 3)

---

## Completed This Sprint
-  Admin Module API built with SUPERADMIN row protection (M1)
-  HR Reports API wired to headcount, salary summary, and full history views (M1)
-  App deployed to production with correct env vars and redirect URLs (M1)
-  UserManagementPage with SUPERADMIN row disabling deployed (M2)
-  HeadcountByDeptPage, SalaryReportPage, EmployeeHistoryReportPage built (M2)
-  Final UI polish: loading, empty, and error states across all pages (M2)
-  headcount_by_dept and salary_summary_by_job SQL views live (M3)
-  Admin Module RLS with SUPERADMIN guard enforced on user table (M3)
-  Final RLS audit and hard-delete verification completed (M3)
-  ADM_USER sidebar gating implemented (M4)
-  Production rights regression passed for all 3 user types (M4)
-  Google OAuth tested and confirmed in production (M4)
-  Full end-to-end production test completed with screenshots (M5)
-  User Manual finalized (M5)
-  Presentation slides completed (M5)

## Blockers Encountered
- Dashboard, Attendance, and Schedule refactor carried from Sprint 2 — partially addressed in Week 5–6 planning
- Attendance module removal tentative — pending team confirmation
- Supabase field name migration not yet complete — carried into active sprint work
- emp_id Auth & Authorization Flow still in progress (M4)
- Role-based content rendering still in progress (M1, M2, M4)
- Manager assignment distribution UI not yet implemented (M2)
- End-to-End System Flow Audit with Vitest not yet run (M5)

## Resolutions Applied
- SUPERADMIN protection enforced at both UI level (M4 button gating) and DB level (M3 RLS) for redundant security
- Release PR reviewed by all 5 members before merge to main — no unreviewed code in production
- Google OAuth production testing completed before final deployment sign-off

---

## Cumulative PR Totals (Sprint 1 + Sprint 2 + Sprint 3)
| Member | Sprint 1 | Sprint 2 | Sprint 3 | Total |
|---|---|---|---|---|
| M1 | 3 | 4 | 3 | **10** |
| M2 | 4 | 4 | 3 | **12** |
| M3 | 3 | 4 | 3 | **11** |
| M4 | 4 | 4 | 2 | **10** |
| M5 | 2 | 3 | 3 | **8** |
| **Team** | **16** | **19** | **14** | **49** |

---

## Next Sprint Goals
- Confirm and finalize Attendance module removal with full team
- Complete Supabase field name migration (M3) and update all frontend references
- Complete emp_id Auth & Authorization Flow for Time-In/Out (M4)
- Complete role-based content rendering across all pages (M1, M2, M4)
- Build Manager assignment distribution UI with floating cards and split backgrounds (M2)
- Run End-to-End System Flow Audit using Vitest (M5)