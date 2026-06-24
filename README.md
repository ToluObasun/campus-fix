# CampusFix - Campus Infrastructure Maintenance Portal

CampusFix is a production-ready, high-density infrastructure maintenance management portal built using Next.js (App Router), Tailwind CSS (customized for a brutalist, high-contrast light mode design system), and MongoDB with Mongoose ODM. 

The system implements a deterministic state machine to manage the lifecycle of maintenance requests, with role-based edge containment and automated lifecycle auditing.

---

## ⚡ Key Architectural Features

* **Brutalist "Nordic Cyberpunk" Design**: Clear slate-grey backgrounds (`#F8FAFC`), razor-sharp geometric borders (`2px solid #0F172A`), and brutalist box shadows. Compact layouts optimize data density for field operators.
* **Deterministic State Machine**: 
  * **Priorities**: `Routine` ➔ `Elevated` ➔ `Critical` ➔ `Emergency`.
  * **Lifecycles**: `Submitted` ➔ `Dispatched` ➔ `Active` ➔ `Resolved`.
* **Edge-Compatible JWT Auth**: Authentication using `jose` and `bcryptjs` is fully compatible with Edge routing, implemented inside Next.js Middleware.
* **Database Connection Caching**: Utilizes a Mongoose global cache connection pattern to prevent socket leaks during development hot-reloading.
* **Audit Timeline Ledger**: Logs every single ticket state transition including previous/new states, timestamps, and the actioning operator.

---

## 📂 Folder Structure

```bash
CampusFix/
├── jmeter/
│   └── load-profile.jmx     # JMeter 20-thread/4s SLA test plan
├── public/
│   └── storage/             # Uploaded request attachments directory
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   └── main.ts      # Server Actions (auth, ticket creation, dispatch, transitions)
│   │   ├── dashboard/
│   │   │   ├── page.tsx     # Dashboard Server Page (Prefetches dataset)
│   │   │   └── DashboardView.tsx # Reactive client dashboard & state desk
│   │   ├── AuthForm.tsx     # Login/Register tab switch console
│   │   ├── globals.css      # Brutalist theme tokens and utility styles
│   │   ├── layout.tsx       # Main layout (Outfit & JetBrains Mono fonts)
│   │   └── page.tsx         # Auth Landing Server Component
│   ├── components/
│   │   └── SuccessModal.tsx # Submit success modal with latency metrics
│   ├── lib/
│   │   └── db.ts            # Mongoose singleton connection and seeding trigger
│   ├── models/
│   │   ├── Category.ts      # Categories (Electrical, Facilities, DataLines, Structural)
│   │   ├── User.ts          # Accounts (Admin, FieldTechnician, Requestor)
│   │   ├── MaintenanceTicket.ts # Request metadata, statuses, and priorities
│   │   ├── TaskAllocation.ts    # Technician assignment records
│   │   └── LifecycleAudit.ts    # Log entries for status updates
│   └── middleware.ts        # Edge JWT verification and RBAC route interceptor
├── tests/
│   └── e2e-flow.spec.ts     # Playwright E2E State Machine test cases
├── playwright.config.ts     # Playwright test execution configurations
└── package.json             # Build script and dependency ledger
```

---

## 🚀 Setup & Execution

### 1. Configure Environments
Create a `.env.local` file at the root of the project:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.t3glquk.mongodb.net/campusfix?retryWrites=true&w=majority
JWT_SECRET=super_secret_signing_key_containing_at_least_32_characters
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
*Note: The application will automatically seed the Category collection with `Electrical`, `Facilities`, `DataLines`, `Appliance`, and `Structural` on database connection.*

### 4. Build and Run in Production
```bash
npm run build
npm run start
```
---

## 🧪 Automated Testing

### Playwright E2E Tests
To execute E2E flow tests (validates password requirements, redirection, file attachment, dispatching, state transitions, route boundary containment, and technician ticket access isolation):

```bash
# 1. Install headless browser
npx playwright install chromium

# 2. Run the test runner (automatically boots production server and runs tests sequentially)
npx playwright test
```

The test suite covers 8 scenarios:
1. **Middleware Redirection**: Ensures unauthenticated users cannot view the dashboard.
2. **Password Length Validation**: Rejects passwords shorter than 6 characters during registration.
3. **Ticket Filing with Media Upload**: Creates ticket, uploads file, and checks modal analytics.
4. **State Machine lifecycle**: Moves tickets through `Submitted` ➔ `Dispatched` ➔ `Active` ➔ `Resolved` and verifies timeline logs.
5. **Middleware RBAC Boundary**: Blocks Requestors from accessing Admin/Technician views.
6. **Login Failures**: Displays warnings for invalid credentials.
7. **Email Uniqueness**: Blocks registration of duplicate email addresses.
8. **Ticket Isolation**: Verifies unassigned technicians cannot view tickets dispatched to others.

### JMeter Load Profiles
Load testing is configured inside `jmeter/load-profile.jmx` representing 20 concurrent threads:

* **Authentication API**: A dedicated route handler `/api/auth/login` is implemented at `src/app/api/auth/login/route.ts` to allow JMeter to establish session tokens.
* **Auto-Seeded Operator**: The application automatically seeds a default technician account (`operator@campus.edu` / `securepassword123`) on database connection for verification.
* **Assertions**: Duration Assertions are set with a **4,000ms SLA ceiling**.
* **Event Loop & Concurrency Note**: Password verification uses `bcryptjs` (pure JS). Under high concurrent login loads, Node's main thread can queue these operations. It is recommended to increase `UV_THREADPOOL_SIZE` and start the server like so:
  ```bash
  # Windows
  set UV_THREADPOOL_SIZE=32 && npm run start
  
  # Unix/macOS
  UV_THREADPOOL_SIZE=32 npm run start
  ```
* **Execution (CLI)**:
  ```bash
  # If jmeter is in your PATH
  jmeter -n -t jmeter/load-profile.jmx -l jmeter/results.jtl -e -o jmeter/report/

  # If using the project's local bin folder (Windows)
  jmeter-bin\apache-jmeter-5.6.3\bin\jmeter.bat -n -t jmeter/load-profile.jmx -l jmeter/results.jtl -e -o jmeter/report/
  ```

