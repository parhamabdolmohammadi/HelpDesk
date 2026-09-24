import { expect, test } from "@playwright/test";
import { ADMIN_STORAGE_STATE, AGENT_STORAGE_STATE } from "./global-setup";

test.describe("Unauthenticated access", () => {
  test("visiting / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("visiting /users redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an unknown route ends up at /login (via the / catch-all then ProtectedRoute)", async ({
    page,
  }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a direct API call with no session is rejected with 401", async ({ request }) => {
    const response = await request.get("/api/me");
    expect(response.status()).toBe(401);
  });
});

test.describe("Admin role", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("sees a Users link in the NavBar and can open /users", async ({ page }) => {
    await page.goto("/");
    const usersLink = page.getByRole("link", { name: "Users" });
    await expect(usersLink).toBeVisible();

    await usersLink.click();
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("can navigate to /users directly", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("an unknown route redirects to / (and stays there, already authenticated)", async ({
    page,
  }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL("/");
  });
});

test.describe("Agent role", () => {
  test.use({ storageState: AGENT_STORAGE_STATE });

  test("does not see a Users link in the NavBar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  });

  test("direct navigation to /users redirects to /", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
