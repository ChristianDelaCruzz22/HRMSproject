# Sprint 1 Log — HRMS Project

## Sprint Duration
- **Start:** March 23, 2026
- **End:** March 30, 2026
- **Team:** M1 (Project Lead), M2 (Frontend), M3 (Database), M4 (Auth), M5 (QA/Docs)

---

## Week 1 (March 23, 2026) — Initial Planning & Setup

### Tasks Started
| Category | Task | Assignee | Status |
|---|---|---|---|
| Back-end | Setup Database Environment (Supabase) | M3, M1 | In Progress |
| Back-end | Implement Auth & Role Logic | M1, M4 | In Progress |
| Front-end | Develop User & Super Admin Dashboards | M4, M1 | To Do |
| Back-end | Research Forgot Password / OTP | M1, M3 | To Do |
| Development | Define User Roles & Permissions | M2, M3, M1 | To Do |
| Documentation | Document & Vitest Debugging | M5, M1 | In Progress |

### Notes
- System design direction decided: Formal / Building-like aesthetic for the HRMS
- Supabase selected as database platform; capabilities still being evaluated by M3
- Auth setup to support NEU accounts (jcesperanza@neu.edu.ph) and external accounts
- Super Admin privileges to be granted to the project supervisor's account
- Three user roles defined: User (Interact), Admin (Approve/Monitor), Super Admin (Global Monitor)
- Documentation process started alongside development from day one by M5

---

## Week 1 Update (March 25, 2026) — Priority Shift

### Urgent Items Identified
| Category | Task | Assignee | Priority |
|---|---|---|---|
| Front-end | Finalize Login and Register pages | M1, M2 | URGENT |
| Back-end | Implement Active Day Counter logic | M1, M3 | Medium |
| Front-end | Improve existing system design | M1, M2 | Medium |
| Development | Research and add QoL features | M5 | High |
| Development | Setup Manual and Vitest framework | M4, M5 | High |

### Notes
- Login and Register pages escalated to urgent — M2 to implement email/password form,
  Google OAuth button, validation, and error messages immediately
- UI/UX direction updated: shifting from Formal/Building-like to "Modern Campus" aesthetics
- M4 flagged as dependency for Login/Register — Auth wiring (signUp, signIn, signInWithOAuth)
  must be ready alongside M2's UI forms
- Active Day Counter logic identified as a needed backend feature for M3
- M5 began researching QoL improvements and setting up Vitest framework with M4

---

## Week 2 (March 30, 2026) — Development Push & First Tests

### Tasks Updated
| Category | Task | Assignee | Status |
|---|---|---|---|
| Back-end | Complete database implementation | M3, M1 | In Progress |
| Back-end | Fix "Forgot Password" function | M3, M1 | In Progress (Urgent) |
| Front-end | Update Dashboard elements | M1, M2 | To Do |
| Front-end | General UI improvements | M2 | In Progress |
| Development | Transition website to Git | M1 | ✅ Complete |
| Testing | Vitest testing of source code | M5 | ✅ Complete (Partial) |

### Notes
- Database remains the highest priority — HopeDB tables (employee, department, job, jobHistory)
  and Rights Scripts still being finalized by M3
- Forgot Password / OTP function broken and flagged urgent for M3 + M1
- M1 successfully migrated project to Git — branching strategy (main/dev/feature/*) established
- M4 working on AuthContext and provision_new_user() trigger logic
- M2 continuing UI polish toward Modern Campus aesthetic
- M5 ran Vitest against source code — not all functions passed, failing cases logged for Sprint 2

---

## Full Sprint 1 Deliverables by Member

### M1 — Project Lead / Full-Stack Developer
| PR | Branch | Description |
|---|---|---|
| PR-01 | feat/project-scaffold | Vite + React + Tailwind initial setup |
| PR-02 | feat/supabase-client | Supabase client init, .env config |
| PR-03 | feat/routing-skeleton | All HR routes, ProtectedRoute, placeholder pages |
| PR-04 | chore/github-branch-protection | Branch protection rules and PR template |

**Outputs:**
- GitHub repository created with main/dev/feature/* branching strategy documented in README
- Vite + React 18 + Tailwind CSS scaffolded and running locally
- Supabase JS client initialized with .env variables (.env.example committed)
- All placeholder pages wired: /employees, /jobhistory, /jobs, /departments, /admin, /deleted-items, /auth/callback

TOTAL PR - 3

---

### M2 — Frontend Developer (UI/UX)
| PR | Branch | Description |
|---|---|---|
| PR-01 | feat/ui-login-page | Login form with email/password + Google OAuth button |
| PR-02 | feat/ui-register-page | Registration form with validation |
| PR-03 | feat/ui-app-shell | Navbar, sidebar with HR nav links, layout wrapper |
| PR-04 | feat/ui-auth-callback | /auth/callback loading page |

**Outputs:**
- Login page: email/password form + 'Sign in with Google' button, validation, error messages
- Register page: First Name, Last Name, Username, Email, Password + Google register button
- App shell: Navbar showing logged-in user's name and Logout button
- Sidebar with HR nav links: Employees, Job History, Jobs, Departments, Admin, Deleted Items
- /auth/callback page with loading spinner during OAuth session setup
- All pages responsive across mobile and desktop breakpoints

TOTAL PR - 4 
---

### M3 — Backend / Database Engineer
| PR | Branch | Description |
|---|---|---|
| PR-01 | db/initial-schema | HopeDB HR tables + record_status + stamp columns |
| PR-02 | db/rights-seed | Rights Scripts: 5 modules + 17 rights + SUPERADMIN seed |
| PR-03 | docs/db-erd | ERD diagram and schema notes |
| PR-04 | db/verify-seed | SQL verification queries confirming row counts and FK integrity |

**Outputs:**
- Supabase project created; URL and anon key shared via .env.example
- HopeDB SQL executed: employee (31), department (8), job (14), jobHistory (54) records seeded
- Rights Scripts executed: user, Module, user_module, rights, UserModule_Rights tables created
- record_status ('ACTIVE' default) and stamp columns added to all major tables
- 5 modules and 17 rights rows seeded (Emp_Mod, JH_Mod, Job_Mod, Dept_Mod, Adm_Mod)
- SUPERADMIN seeded: jcesperanza@neu.edu.ph with all 17 rights = 1
- All SQL files committed to /db/migrations with sequential naming
- ERD diagram committed to /docs

TOTAL PR - 3
---

### M4 — Rights & Authentication Specialist
| PR | Branch | Description |
|---|---|---|
| PR-01 | feat/auth-context | AuthContext, session listener, currentUser state |
| PR-02 | feat/auth-email-signup | signUp() + signIn() wired to Register/Login |
| PR-03 | feat/auth-google-oauth | signInWithOAuth + /auth/callback route + redirect URLs |
| PR-04 | db/trigger-provision-user | provision_new_user() trigger with HR module/rights defaults |

**Outputs:**
- AuthContext.jsx wraps app, provides currentUser and session via onAuthStateChange
- Email/password: supabase.auth.signUp() and signIn() wired to Register and Login forms
- Google OAuth: signInWithOAuth({provider:'google'}) wired to Google buttons on both pages
- /auth/callback exchanges OAuth code for session, runs login guard, navigates accordingly
- Login guard: checks record_status = 'ACTIVE' on every SIGNED_IN event; blocks INACTIVE users
- provision_new_user() trigger: fires on auth.users INSERT, creates USER/INACTIVE row,
  inserts 5 module rows + 17 rights rows (VIEW only = 1, all others = 0)
- Google OAuth credentials configured in Google Cloud Console and Supabase Dashboard

TOTAL PR - 4
---

### M5 — QA / Documentation Specialist
| PR | Branch | Description |
|---|---|---|
| PR-01 | test/sprint1-auth-flows | Auth test cases: email registration, Google OAuth, login guard |
| PR-02 | docs/sprint1-log-readme | Sprint 1 log + README setup instructions |

**Outputs:**
- Vitest + React Testing Library installed and configured
- Test cases written and executed:
  - Email registration flow
  - Google OAuth new user flow
  - Login guard blocks INACTIVE users
  - Login guard allows ACTIVE users
- Sprint 1 log completed (this document)
- README.md updated with clone, npm install, .env setup, npm run dev, Supabase project link


TOTAL PR - 2


TOTAL SPRINT 1 PR 16/18
---

## Completed This Sprint
-  Git repository created with protected branching strategy (M1)
-  Vite + Tailwind scaffolded and running (M1)
-  Supabase project live with full HopeDB seed data (M3)
-  Rights and permissions tables seeded with SUPERADMIN account (M3)
-  Login and Register pages built with full validation (M2)
-  App shell (Navbar + Sidebar) implemented (M2)
-  AuthContext and session management wired up (M4)
-  Email and Google OAuth login both functional (M4)
-  Login guard blocking INACTIVE users implemented (M4)
-  provision_new_user() trigger deployed (M4)
-  Vitest framework installed and first test suite executed (M5)
-  All routes wired with ProtectedRoute (M1)

## Blockers Encountered
- Database implementation ran longer than expected — still incomplete at sprint end (M3)
- Forgot Password / OTP feature broken and needs urgent fix next sprint (M3, M1)
- Several Vitest test cases failed — source code needs fixes before full test coverage (M5)
- Dashboard elements required rework based on diagnostic feedback (M2, M1)
- Google OAuth redirect URLs required manual configuration in both Google Cloud and Supabase (M4)

## Resolutions Applied
- Login and Register pages re-prioritized to URGENT to unblock M2 and M4 progress
- Git migration completed by M1 to enable proper version control for all members
- Failing Vitest cases documented by M5 and queued for Sprint 2 debugging
- UI redesign direction updated mid-sprint to Modern Campus aesthetic — team aligned (M2)
- .env.example committed by M1 and M3 so all members share correct environment setup

---

## Next Sprint Goals
- Fix all failing Vitest test cases from Sprint 1 (M5)
- Complete and verify full database implementation in Supabase (M3)
- Repair Forgot Password / OTP function (M3, M1)
- Finalize Dashboard pages and sidebar visibility logic based on user roles (M1, M2)
- Expand Vitest coverage to all core HR module flows (M5)
- Implement role-based access control visibility in the sidebar (M2, M4)
- Continue QoL feature research and begin implementation (M5)