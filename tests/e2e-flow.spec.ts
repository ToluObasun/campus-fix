import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("CampusFix Core State Machine & Auth E2E Flow", () => {
  // Test paths
  const LOGIN_URL = "/";
  const DASHBOARD_URL = "/dashboard";
  const ADMIN_DASHBOARD_URL = "/dashboard/admin";

  test("1. Middleware redirects unauthenticated user from dashboard", async ({ page }) => {
    // Attempt to access dashboard without cookie
    await page.goto(DASHBOARD_URL);
    // URL should be rewritten to home (login page)
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("2. Registration password minimum length verification", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000); // Wait for hydration
    
    // Switch to Register tab
    await page.click("button:has-text('REGISTER')");

    // Enter details with short password
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "Test User");
    await page.fill("input[placeholder='operator@campus.edu']", "short_pass@test.com");
    await page.fill("input[placeholder='••••••••']", "12345"); // < 6 chars

    // Click register button
    await page.click("button[type='submit']");

    // Expect error modal / banner warning
    const errorBanner = page.locator("text=ERROR:");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Password must be at least 6 characters");
  });

  test("3. Requestor files maintenance request with media upload", async ({ page }) => {
    // 1. Register a Requestor
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000); // Wait for hydration
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "Requestor John");
    const uniqueEmail = `requestor_${Date.now()}@campus.edu`;
    await page.fill("input[placeholder='operator@campus.edu']", uniqueEmail);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    
    // Select Requestor role
    await page.click("button:has-text('Requestor')");
    await page.click("button[type='submit']");

    // Redirected to /dashboard
    await expect(page).toHaveURL(DASHBOARD_URL);

    // 2. Open Ticket Filing form
    await page.click("button:has-text('FILE_TICKET')");

    // Create a dummy attachment file
    const tempFilePath = path.join(__dirname, "temp-leak-image.png");
    fs.writeFileSync(tempFilePath, "fake image buffer content");

    // 3. Fill ticket properties
    await page.fill("input[placeholder*='dorm room 302']", "E2E Leak Test Ticket");
    await page.selectOption("select[required]", { index: 1 }); // selects first available Category option (Electrical/Facilities...)
    await page.fill("textarea[placeholder*='Please describe in detail']", "Active plumbing rupture causing corridor flooding. Immediate structural assessment required.");
    await page.selectOption("select >> nth=1", "Emergency"); // select priority

    // Upload the file attachment
    await page.setInputFiles("input[type='file']", tempFilePath);

    // Submit ticket
    await page.click("button:has-text('File Ticket (Submit)')");

    // 4. Verify Brutalist Success Modal opens and displays performance metrics
    const successHeader = page.locator("text=Ticket Submitted");
    await expect(successHeader).toBeVisible();

    const systemAudit = page.locator("text=System Audit Analytics");
    await expect(systemAudit).toBeVisible();

    const latencyReport = page.locator("text=Total Response Time");
    await expect(latencyReport).toBeVisible();

    // Close modal
    await page.click("button:has-text('Acknowledge & Close')");

    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      console.warn("Deferred cleanup of temp E2E attachment file:", e);
    }
  });

  test("4. Full State Machine transition: Admin dispatch & Field Tech resolution", async ({ page }) => {
    // 1. Create a technician and a requestor ticket
    const uniqueTechEmail = `tech_${Date.now()}@campus.edu`;
    const techName = `Tech Dave ${Date.now()}`;
    const uniqueAdminEmail = `admin_${Date.now()}@campus.edu`;
    const uniqueReqEmail = `req_${Date.now()}@campus.edu`;

    // A. Register Technician
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000); // Wait for hydration
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", techName);
    await page.fill("input[placeholder='operator@campus.edu']", uniqueTechEmail);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Technician')");
    await page.click("button[type='submit']");
    await page.click("button:has-text('EXIT')"); // Logout

    // B. Register Requestor and file ticket
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000); // Wait for hydration
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "Req Alice");
    await page.fill("input[placeholder='operator@campus.edu']", uniqueReqEmail);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Requestor')");
    await page.click("button[type='submit']");
    
    const ticketTitle = `Dispatch Test Water Leak ${Date.now()}`;
    await page.click("button:has-text('FILE_TICKET')");
    await page.fill("input[placeholder*='dorm room 302']", ticketTitle);
    await page.selectOption("select[required]", { index: 1 });
    await page.fill("textarea[placeholder*='Please describe in detail']", "Slow leakage under sink.");
    await page.click("button:has-text('File Ticket (Submit)')");
    await page.click("button:has-text('Acknowledge & Close')");
    await page.click("button:has-text('EXIT')"); // Logout

    // C. Register Admin
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000); // Wait for hydration
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "Admin Chief");
    await page.fill("input[placeholder='operator@campus.edu']", uniqueAdminEmail);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Admin')");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(DASHBOARD_URL);

    // D. Admin dispatches to Dave
    // Find ticket and select the technician from the drop-down selector
    const ticketCard = page.locator(`.brutalist-card:has-text("${ticketTitle}")`);
    await expect(ticketCard).toBeVisible();

    await ticketCard.locator("select.flex-grow").selectOption({ label: techName });
    await ticketCard.locator("button:has-text('Dispatch')").click();

    // Status should update to DISPATCHED
    await expect(ticketCard.locator("span:has-text('DISPATCHED')")).toBeVisible();
    await page.click("button:has-text('EXIT')"); // Logout Admin

    // E. Tech Dave completes work
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000); // Wait for hydration
    await page.fill("input[placeholder='operator@campus.edu']", uniqueTechEmail);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('ESTABLISH_SESSION')");
    await expect(page).toHaveURL(DASHBOARD_URL);

    const techTicketCard = page.locator(`.brutalist-card:has-text("${ticketTitle}")`);
    await expect(techTicketCard).toBeVisible();

    // Dave accepts work: transition to Active
    await techTicketCard.locator("button:has-text('Begin Repair')").click();
    await expect(techTicketCard.locator("span:has-text('ACTIVE')")).toBeVisible();

    // Dave completes work: transition to Resolved
    await techTicketCard.locator("button:has-text('Complete Request')").click();
    // View Lifecycle audit logs
    await techTicketCard.locator("button:has-text('View Lifecycle Log')").click();
    await expect(techTicketCard.locator("text=SUBMITTED → DISPATCHED")).toBeVisible();
    await expect(techTicketCard.locator("text=DISPATCHED → ACTIVE")).toBeVisible();
    await expect(techTicketCard.locator("text=ACTIVE → RESOLVED")).toBeVisible();
  });

  test("5. Middleware RBAC boundary containment checks", async ({ page }) => {
    // Register a Requestor
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "Boundary Req");
    const uniqueReqEmail = `boundary_req_${Date.now()}@campus.edu`;
    await page.fill("input[placeholder='operator@campus.edu']", uniqueReqEmail);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Requestor')");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(DASHBOARD_URL);

    // Try to visit /dashboard/admin - should be redirected to /dashboard
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(DASHBOARD_URL);

    // Try to visit /dashboard/tech - should be redirected to /dashboard
    await page.goto("/dashboard/tech");
    await expect(page).toHaveURL(DASHBOARD_URL);
  });

  test("6. Invalid login credentials warning", async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    
    // Login with random non-existent credentials
    await page.fill("input[placeholder='operator@campus.edu']", `nonexistent_${Date.now()}@campus.edu`);
    await page.fill("input[placeholder='••••••••']", "wrongpassword");
    await page.click("button:has-text('ESTABLISH_SESSION')");

    // Expect error banner
    const errorBanner = page.locator("text=ERROR:");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Invalid credentials");
  });

  test("7. Duplicate registration warning", async ({ page }) => {
    const dupEmail = `dup_${Date.now()}@campus.edu`;

    // A. Register user first time
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "First User");
    await page.fill("input[placeholder='operator@campus.edu']", dupEmail);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Requestor')");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(DASHBOARD_URL);
    await page.click("button:has-text('EXIT')"); // Logout

    // B. Register again with same email
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "Second User");
    await page.fill("input[placeholder='operator@campus.edu']", dupEmail);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Requestor')");
    await page.click("button[type='submit']");

    // Expect error banner
    const errorBanner = page.locator("text=ERROR:");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("Email is already registered");
  });

  test("8. Ticket authorization / containment check for unassigned technicians", async ({ page }) => {
    const techAName = `Tech A ${Date.now()}`;
    const techBName = `Tech B ${Date.now()}`;
    const uniqueTechA = `techa_${Date.now()}@campus.edu`;
    const uniqueTechB = `techb_${Date.now()}@campus.edu`;
    const uniqueAdmin = `admin_${Date.now()}@campus.edu`;
    const uniqueReq = `req_${Date.now()}@campus.edu`;

    // A. Register Tech A
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", techAName);
    await page.fill("input[placeholder='operator@campus.edu']", uniqueTechA);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Technician')");
    await page.click("button[type='submit']");
    await page.click("button:has-text('EXIT')");

    // B. Register Tech B
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", techBName);
    await page.fill("input[placeholder='operator@campus.edu']", uniqueTechB);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Technician')");
    await page.click("button[type='submit']");
    await page.click("button:has-text('EXIT')");

    // C. Register Requestor and file ticket
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "Req Alice");
    await page.fill("input[placeholder='operator@campus.edu']", uniqueReq);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Requestor')");
    await page.click("button[type='submit']");
    
    const ticketTitle = `Auth Test Ticket ${Date.now()}`;
    await page.click("button:has-text('FILE_TICKET')");
    await page.fill("input[placeholder*='dorm room 302']", ticketTitle);
    await page.selectOption("select[required]", { index: 1 });
    await page.fill("textarea[placeholder*='Please describe in detail']", "Unassigned tech check.");
    await page.click("button:has-text('File Ticket (Submit)')");
    await page.click("button:has-text('Acknowledge & Close')");
    await page.click("button:has-text('EXIT')");

    // D. Register Admin and dispatch to Tech A
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    await page.click("button:has-text('REGISTER')");
    await page.fill("input[placeholder='e.g. Timeyin Egbe']", "Admin Chief");
    await page.fill("input[placeholder='operator@campus.edu']", uniqueAdmin);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('Admin')");
    await page.click("button[type='submit']");
    
    const adminTicketCard = page.locator(`.brutalist-card:has-text("${ticketTitle}")`);
    await expect(adminTicketCard).toBeVisible();
    await adminTicketCard.locator("select.flex-grow").selectOption({ label: techAName });
    await adminTicketCard.locator("button:has-text('Dispatch')").click();
    await expect(adminTicketCard.locator("span:has-text('DISPATCHED')")).toBeVisible();
    await page.click("button:has-text('EXIT')");

    // E. Log in as Tech B (unassigned tech) and check they don't see action buttons
    await page.goto(LOGIN_URL);
    await page.waitForTimeout(2000);
    await page.fill("input[placeholder='operator@campus.edu']", uniqueTechB);
    await page.fill("input[placeholder='••••••••']", "securepassword123");
    await page.click("button:has-text('ESTABLISH_SESSION')");
    
    const techBTicketCard = page.locator(`.brutalist-card:has-text("${ticketTitle}")`);
    await expect(techBTicketCard).not.toBeVisible();
  });
});


