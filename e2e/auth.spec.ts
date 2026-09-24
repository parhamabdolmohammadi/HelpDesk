import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers/test-env";
import { ADMIN_STORAGE_STATE } from "./global-setup";

test.describe("Login", () => {
  test("successful login redirects to / and NavBar shows the user + sign out", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    // NavBar displayName falls back to name ("Admin") over email.
    await expect(page.getByText("Admin", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("wrong password shows an error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("unknown email shows an error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("no-such-user@example.com");
    await page.getByLabel("Password").fill("whatever-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("empty form submission shows client-side validation errors and sends no request", async ({
    page,
  }) => {
    await page.goto("/login");

    let signInRequestSent = false;
    await page.route("**/api/auth/sign-in/email", async (route) => {
      signInRequestSent = true;
      await route.continue();
    });

    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");
    expect(signInRequestSent).toBe(false);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("invalid email format shows a validation error and sends no request", async ({
    page,
  }) => {
    await page.goto("/login");

    let signInRequestSent = false;
    await page.route("**/api/auth/sign-in/email", async (route) => {
      signInRequestSent = true;
      await route.continue();
    });

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("some-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Enter a valid email")).toBeVisible();
    expect(signInRequestSent).toBe(false);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("session persists across a reload", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/");

    await page.reload();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("sign out clears the session and redirects to /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // The session is actually gone server-side, not just a client-side nav:
    // revisiting a protected route bounces back to /login again.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login after an unauthenticated deep-link attempt always lands on /, not the original page", async ({
    page,
  }) => {
    // The app has no "return to originally requested page" behavior today
    // (ProtectedRoute's redirect doesn't carry state, and Login always
    // navigates to "/" on success) -- this pins down that actual behavior.
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");
  });
});

test.describe("Already authenticated", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("visiting /login redirects straight to /", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });
});
