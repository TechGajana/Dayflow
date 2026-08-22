# Dayflow

Dayflow is a realtime HR operations platform for employee provisioning, attendance, time off, payroll, expenses, assets, recruitment, performance, and reporting.

**Live app:** [tg-dayflow.vercel.app](https://tg-dayflow.vercel.app/)

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run build` to create a production build and `npm run start` to serve it.

## Environment

Create `.env.local` with:

```env
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=optional-resend-api-key
RESEND_FROM_EMAIL=optional-sender@example.com
```

`BETTER_AUTH_SECRET` is required. Resend variables enable activation and notification emails. Never commit `.env.local` or expose its values in client code.

## Authentication

- Workspace owners register the first company administrator.
- Admins create HR and employee accounts from **Employees > Add user**.
- HR can create employee accounts but cannot create administrators or HR accounts.
- New users receive a generated Login ID and temporary password and must activate their email.
- The first login requires changing the temporary password.
- Sign in accepts either an email address or Login ID.
- Password fields include a visibility toggle.

## Roles

| Capability | Admin | HR | Manager | Employee |
| --- | --- | --- | --- | --- |
| Create HR accounts | Yes | No | No | No |
| Create employee accounts | Yes | Yes | No | No |
| View company attendance and leave | Yes | Yes | Yes | No |
| Manage leave approvals | Yes | Yes | Yes | No |
| View company payroll | Yes | Yes | No | Own record |
| Edit wage structures | Yes | No | No | No |
| Publish recruitment roles | Yes | Yes | Yes | No |
| Submit expenses | Yes | Yes | Yes | Yes |
| Approve expenses/assets | Yes | Yes | Yes | No |

## Features

- **Dashboard:** Live company metrics, team attendance, leave approvals, and 15-second refresh polling.
- **Employees:** Search workspace users and provision accounts with generated credentials.
- **Attendance:** Check in/out, view month calendars, working hours, overtime after eight hours, and status colors.
- **QR check-in:** Admin, HR, or managers display a signed five-minute office QR code. Employees scan it using a camera-enabled browser.
- **Leave:** Submit requests and approve or reject them with company-scoped permissions.
- **Payroll:** Admins set monthly wages. Basic salary, HRA, allowances, deductions, and net pay are calculated and persisted. Employees can download their own payslip; admin and HR can download company payslips.
- **Recruitment:** Create and close open job postings.
- **Performance:** Management can create reviews; employees can create and edit their own review notes.
- **Assets:** Track company equipment and assign it to employees.
- **Expenses:** Submit expense claims and approve or reject them.
- **Reports:** Live payroll totals and graphical attendance, leave, and expense reports.
- **Profile:** Employees can edit their phone, address, and profile picture. Admins can edit all resume and private profile fields.

## Data

The application uses SQLite at `data/dayflow.sqlite`. The database schema is initialized automatically on server startup. SQLite WAL files are runtime database files and should be backed up together with the main database when deploying persistent storage.

## API routes

- `/api/auth/*` - sessions, login, registration, email verification, and password changes
- `/api/dashboard` - live dashboard data, attendance, and leave actions
- `/api/attendance` - calendar records, working hours, overtime, and QR check-in
- `/api/users` - role-protected user provisioning and management
- `/api/profile` - profile reads and role-limited updates
- `/api/modules` - payroll, recruitment, performance, assets, expenses, and reports
- `/api/payroll/slip` - authorized payslip downloads

## Validation

```bash
npx tsc --noEmit
npm run build
```