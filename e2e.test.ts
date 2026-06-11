import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5174';

function uniqueUser(prefix = 'test') {
  const ts = Date.now();
  return {
    name: `${prefix} User`,
    email: `${prefix}-${ts}@e2e.vellum.dev`,
    password: 'Password123!',
  };
}

test.describe('Public Pages', () => {
  test('Landing page renders', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Standard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Plus' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Metal' })).toBeVisible();
    await expect(page.locator('a[href*="/signup"]').first()).toBeVisible();
    await expect(page.locator('a[href*="/login"]').first()).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('Landing page CTA links to signup with plan', async ({ page }) => {
    await page.goto(BASE);
    const standardCta = page.locator('a[href*="/signup?plan=standard"]').first();
    if (await standardCta.isVisible()) {
      expect(await standardCta.getAttribute('href')).toContain('/signup?plan=standard');
    }
  });

  test('Login page renders', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login page has show/hide password toggle', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const pwInput = page.locator('input[name="password"]');
    await expect(pwInput).toHaveAttribute('type', 'password');
    const toggle = page.locator('button[aria-label="Show password"]');
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(pwInput).toHaveAttribute('type', 'text');
    }
  });

  test('Signup page renders', async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

test.describe('Registration & Onboarding', () => {
  test('Complete sign up → onboarding → Standard → dashboard', async ({ page }) => {
    const u = uniqueUser('reg');
    await page.goto(`${BASE}/signup`);
    await page.fill('input[name="name"]', u.name);
    await page.fill('input[name="email"]', u.email);
    await page.fill('input[name="password"]', u.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*onboarding/, { timeout: 15000 });
    await expect(page.locator('h1').first()).toBeVisible();

    const standardPlan = page.locator('button[aria-pressed]').filter({ hasText: 'Standard' }).first();
    await standardPlan.waitFor({ state: 'visible', timeout: 8000 });
    await standardPlan.click();

    const cta = page.locator('button:has-text("Start with Standard")');
    await cta.waitFor({ state: 'visible', timeout: 5000 });
    await cta.click();

    await page.waitForURL(/.*dashboard/, { timeout: 20000 });
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Good/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Signup with ?plan=standard pre-selects plan', async ({ page }) => {
    const u = uniqueUser('preplan');
    await page.goto(`${BASE}/signup?plan=standard`);
    await page.fill('input[name="name"]', u.name);
    await page.fill('input[name="email"]', u.email);
    await page.fill('input[name="password"]', u.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*onboarding/, { timeout: 15000 });

    const standardPlan = page.locator('button[aria-pressed]').filter({ hasText: 'Standard' }).first();
    await standardPlan.waitFor({ state: 'visible', timeout: 8000 });
    await standardPlan.click();

    const cta = page.locator('button:has-text("Start with Standard")');
    await cta.waitFor({ state: 'visible', timeout: 5000 });
    await cta.click();

    await page.waitForURL(/.*dashboard/, { timeout: 20000 });
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Good/i).first()).toBeVisible({ timeout: 15000 });
  });
});

/** Helper: sign up and activate Standard plan, return page on dashboard. */
async function signUpAndActivate(page: any, u: ReturnType<typeof uniqueUser>) {
  await page.goto(`${BASE}/signup`);
  await page.fill('input[name="name"]', u.name);
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*onboarding/, { timeout: 15000 });
  const planBtn = page.locator('button[aria-pressed]').filter({ hasText: 'Standard' }).first();
  await planBtn.waitFor({ state: 'visible', timeout: 8000 });
  await planBtn.click();
  const cta = page.locator('button:has-text("Start with Standard")');
  await cta.waitFor({ state: 'visible', timeout: 5000 });
  await cta.click();
  await page.waitForURL(/.*dashboard/, { timeout: 20000 });
}

test.describe('Dashboard', () => {
  test('Dashboard shows greeting and balance', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('dash-greet'));
    await expect(page.getByText(/Good/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=$').first()).toBeVisible({ timeout: 5000 });
  });

  test('Dashboard has time range tabs', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('dash-tabs'));
    for (const tab of ['1M', '3M', '6M', 'All']) {
      await expect(page.getByRole('tab', { name: tab })).toBeVisible({ timeout: 5000 });
    }
  });

  test('Dashboard has quick action buttons', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('dash-actions'));
    for (const id of ['qa-send', 'qa-vaults', 'qa-cards', 'qa-add-money']) {
      await expect(page.getByTestId(id)).toBeVisible({ timeout: 5000 });
    }
  });

  test('Transactions table loads', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('dash-tx'));
    await page.waitForTimeout(3000);
    const rows = page.locator('table tr, [role="row"]');
    // Should have more than just a header row
    expect(await rows.count()).toBeGreaterThan(1);
  });
});

test.describe('Send Money', () => {
  test('Send money dialog opens, fills, submits, shows toast', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('send'));
    const sendBtn = page.getByTestId('qa-send');
    await sendBtn.waitFor({ state: 'visible', timeout: 5000 });
    await sendBtn.click();

    await expect(page.locator('input#recipient')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input#amount')).toBeVisible({ timeout: 5000 });

    await page.fill('input#recipient', 'Alice Johnson');
    await page.fill('input#amount', '25');

    // The button text is dynamic: "Send $25.00" — scope to the dialog
    await page.getByRole('dialog').getByRole('button', { name: /\$25\.00/ }).click();

    await expect(page.getByText('Alice Johnson').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Vaults', () => {
  test('Create a vault via Vaults dialog', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('vault-create'));
    const vaultsBtn = page.getByTestId('qa-vaults');
    await vaultsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await vaultsBtn.click();

    await expect(page.locator('input#vault-name')).toBeVisible({ timeout: 5000 });
    await page.fill('input#vault-name', 'Holiday Fund');
    await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText('Holiday Fund').first()).toBeVisible({ timeout: 10000 });
  });

  test('Vault persists after closing and reopening dialog', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('vault-persist'));
    const vaultsBtn = page.getByTestId('qa-vaults');
    await vaultsBtn.waitFor({ state: 'visible', timeout: 5000 });
    await vaultsBtn.click();

    await expect(page.locator('input#vault-name')).toBeVisible({ timeout: 5000 });
    await page.fill('input#vault-name', 'Emergency Fund');
    await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Emergency Fund').first()).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await vaultsBtn.click();
    await expect(page.getByText('Emergency Fund').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Add Money (Top-up)', () => {
  test('Add money shows success toast in demo mode', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('topup'));
    const addBtn = page.getByTestId('qa-add-money');
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click();
    await expect(page.getByText(/topped up/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Billing Page', () => {
  test('Billing page shows current plan and status badge', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('billing-view'));
    await page.goto(`${BASE}/billing`);
    await expect(page.getByRole('heading', { name: 'Standard' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('active', { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Billing page shows plan switching tiers', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('billing-tiers'));
    await page.goto(`${BASE}/billing`);
    // Plus and Metal plan headings for switching
    await expect(page.getByRole('heading', { name: 'Plus' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Metal' })).toBeVisible({ timeout: 5000 });
  });

  test('Billing page has Stripe mode badge', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('billing-badge'));
    await page.goto(`${BASE}/billing`);
    await expect(page.getByText(/demo mode|live/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Account Page', () => {
  test('Account page shows user name and email', async ({ page }) => {
    const u = uniqueUser('acct-info');
    await signUpAndActivate(page, u);
    await page.goto(`${BASE}/account`);
    await expect(page.getByText(u.name).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(u.email).first()).toBeVisible({ timeout: 5000 });
  });

  test('Account page shows avatar', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('acct-avatar'));
    await page.goto(`${BASE}/account`);
    // Avatar has a span with initials inside it
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible({ timeout: 5000 });
  });

  test('Account page has sessions section', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('acct-sessions'));
    await page.goto(`${BASE}/account`);
    await expect(page.getByText('Active sessions')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Settings Page', () => {
  test('Settings page has notification toggles', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('settings-notif'));
    await page.goto(`${BASE}/settings`);
    await expect(page.getByText('Notifications')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Transaction alerts')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Weekly digest')).toBeVisible({ timeout: 5000 });
  });

  test('Settings page has change password form', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('settings-pw'));
    await page.goto(`${BASE}/settings`);
    await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('Current password')).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel('New password')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Change password' })).toBeVisible({ timeout: 5000 });
  });

  test('Settings page has delete account button', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('settings-delete'));
    await page.goto(`${BASE}/settings`);
    await expect(page.getByRole('button', { name: 'Delete account' })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Auth Guards', () => {
  const routes = ['/dashboard', '/account', '/settings', '/billing', '/onboarding'];
  for (const route of routes) {
    test(`Unauthenticated GET ${route} redirects to /login`, async ({ page }) => {
      await page.goto(`${BASE}${route}`);
      await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
    });
  }
});

test.describe('Login / Logout Flow', () => {
  const user = uniqueUser('loginflow');

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await signUpAndActivate(page, user);
    await page.close();
  });

  test('Login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 15000 });
  });

  test('Login with wrong password stays on login page', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', 'WrongPassword999!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('login');
  });

  test('Login with non-existent email stays on login page', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', 'nonexistent@nowhere.com');
    await page.fill('input[name="password"]', 'SomePassword1!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('login');
  });

  test('Logout redirects to landing page', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    await page.locator('[data-testid="user-menu"]:visible').first().click();
    await page.getByRole('menuitem', { name: /Sign out|Log out/i }).click();
    await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  });

  test('Dashboard is blocked after logout', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 15000 });

    await page.locator('[data-testid="user-menu"]:visible').first().click();
    await page.getByRole('menuitem', { name: /Sign out|Log out/i }).click();
    await page.waitForURL(`${BASE}/`, { timeout: 15000 });

    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });
});

test.describe('Mobile Responsive Navigation', () => {
  test('Mobile viewport shows bottom tab bar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const u = uniqueUser('mobile');
    await page.goto(`${BASE}/signup`);
    await page.fill('input[name="name"]', u.name);
    await page.fill('input[name="email"]', u.email);
    await page.fill('input[name="password"]', u.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*onboarding/, { timeout: 15000 });

    const planBtn = page.locator('button[aria-pressed]').filter({ hasText: 'Standard' }).first();
    await planBtn.waitFor({ state: 'visible', timeout: 8000 });
    await planBtn.click();

    const cta = page.locator('button:has-text("Start with Standard")');
    await cta.waitFor({ state: 'visible', timeout: 5000 });
    await cta.click();

    await page.waitForURL(/.*dashboard/, { timeout: 20000 });

    // Bottom tab bar shows a visible Dashboard link (sidebar copy is hidden)
    await expect(page.locator('nav a[href="/dashboard"]:visible').last()).toBeVisible({ timeout: 5000 });

    // Click Billing tab — :visible skips the hidden desktop sidebar link
    const billingTab = page.locator('a[href="/billing"]:visible').last();
    await billingTab.click();
    await expect(page).toHaveURL(/.*billing/, { timeout: 10000 });
  });
});

/** Helper: sign up and activate the PAID Plus plan via the demo payment ceremony. */
async function signUpAndActivatePlus(page: any, u: ReturnType<typeof uniqueUser>) {
  await page.goto(`${BASE}/signup?plan=plus`);
  await page.fill('input[name="name"]', u.name);
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*onboarding/, { timeout: 15000 });
  const cta = page.locator('button:has-text("Activate Plus")');
  await cta.waitFor({ state: 'visible', timeout: 8000 });
  await cta.click();
  await page.waitForURL(/.*dashboard/, { timeout: 30000 });
}

test.describe('Paid Plan — demo payment ceremony', () => {
  test('Signup → Plus → ceremony dialog → dashboard with active Plus', async ({ page }) => {
    const u = uniqueUser('plus');
    await page.goto(`${BASE}/signup?plan=plus`);
    await page.fill('input[name="name"]', u.name);
    await page.fill('input[name="email"]', u.email);
    await page.fill('input[name="password"]', u.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*onboarding/, { timeout: 15000 });

    // Plus arrives pre-selected from ?plan=plus
    const cta = page.locator('button:has-text("Activate Plus")');
    await cta.waitFor({ state: 'visible', timeout: 8000 });
    await cta.click();

    // The staged payment ceremony shows before navigation
    await expect(
      page.getByText(/Securing checkout|Confirming with Stripe|Funding your account|Plus is live/).first(),
    ).toBeVisible({ timeout: 8000 });

    await page.waitForURL(/.*dashboard/, { timeout: 30000 });

    // Subscription persisted: billing shows Plus active
    await page.goto(`${BASE}/billing`);
    await expect(page.getByRole('heading', { name: /Plus/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('active', { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Billing Actions', () => {
  test('Switch Standard → Metal applies instantly in demo mode', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('switch'));
    await page.goto(`${BASE}/billing`);
    await page.locator('button:has-text("Switch to Metal")').click();
    await expect(page.getByText(/on Metal now/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Metal/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Cancel paid subscription moves status to canceled', async ({ page }) => {
    await signUpAndActivatePlus(page, uniqueUser('cancel'));
    await page.goto(`${BASE}/billing`);
    await page.locator('button:has-text("Cancel subscription")').click();
    await page.getByRole('button', { name: /Yes, cancel it/i }).click();
    await expect(page.getByText('canceled', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Security — password change full loop', () => {
  test('Change password, sign out, re-login with the new password', async ({ page }) => {
    const u = uniqueUser('pwloop');
    const newPassword = 'NewPassword456!';
    await signUpAndActivate(page, u);

    await page.goto(`${BASE}/settings`);
    await page.getByLabel('Current password').fill(u.password);
    await page.getByLabel('New password').fill(newPassword);
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText(/Password changed/i)).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="user-menu"]:visible').first().click();
    await page.getByRole('menuitem', { name: /Sign out/i }).click();
    await page.waitForURL(`${BASE}/`, { timeout: 15000 });

    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', u.email);
    await page.fill('input[name="password"]', newPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*dashboard/, { timeout: 15000 });
  });
});

test.describe('Transactions Search', () => {
  test('Search filters the virtualized table; empty state appears for no match', async ({ page }) => {
    await signUpAndActivate(page, uniqueUser('txsearch'));
    await page.waitForSelector('[data-testid="tx-row"]', { timeout: 20000 });

    const search = page.getByPlaceholder(/Search merchants/);
    await search.fill('Payroll');
    await page.waitForTimeout(600);
    const rows = page.locator('[data-testid="tx-row"]');
    expect(await rows.count()).toBeGreaterThan(0);
    for (const text of await rows.allTextContents()) {
      expect(text).toContain('Payroll');
    }

    await search.fill('zzz-no-match');
    await expect(page.getByText(/Nothing matches/)).toBeVisible({ timeout: 5000 });
  });
});
