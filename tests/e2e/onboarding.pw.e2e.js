/*
 * Copyright (c) 2016-present - TagSpaces GmbH. All rights reserved.
 */
import { test, expect } from './fixtures';
import { startTestingApp, stopApp } from './hook';
import { clearDataStorage } from './welcome.helpers';

// Onboarding tests boot the app WITHOUT an extconfig override so
// ExtIsFirstRun is undefined and the license/onboarding dialogs auto-show
// from default settings (firstRun: true). General tests use extconfig.js
// which suppresses the dialogs — that's why this file owns its own
// beforeAll instead of sharing the general suite's setup.

test.beforeAll(async ({ isWeb, isS3, webServerPort }, testInfo) => {
  await startTestingApp({ isWeb, isS3, webServerPort, testInfo });
});

test.afterAll(async () => {
  await stopApp();
});

test.afterEach(async ({ isWeb }) => {
  // Reset firstRun and onboarding flags between tests so each one starts
  // from a clean slate. clearDataStorage clears localStorage; we then
  // reload so providers re-mount and the license/wizard appear again.
  await clearDataStorage(isWeb);
  if (!isWeb) {
    await global.client.reload();
  }
});

test.describe('TST91 - Onboarding flow', () => {
  test('TST9101 - License dialog shown on first run [electron,web,s3]', async () => {
    // The license dialog auto-shows on first run in every build. Its primary
    // action button (data-tid stays `agreeLicenseDialog` regardless of label)
    // is always present. Whether it also offers a "Quit" (refuse) button is
    // build-specific — the Pro EULA gate has one, the AGPL info dialog does
    // not — so that assertion lives in TST9106 (_pro) / TST9107 (_lite).
    const agreeBtn = await global.client.waitForSelector(
      '[data-tid=agreeLicenseDialog]',
      { timeout: 10000, state: 'visible' },
    );
    expect(agreeBtn).toBeTruthy();
  });

  test('TST9102 - Accepting license opens the onboarding wizard [electron,web,s3]', async () => {
    // License dialog should be visible.
    await global.client.waitForSelector('[data-tid=agreeLicenseDialog]', {
      timeout: 10000,
      state: 'visible',
    });

    // Accepting the license should close it and reveal the onboarding
    // wizard underneath. The wizard's close button has the stable data-tid
    // 'closeOnboardingDialog'.
    await global.client.click('[data-tid=agreeLicenseDialog]');

    const closeOnboarding = await global.client.waitForSelector(
      '[data-tid=closeOnboardingDialog]',
      { timeout: 5000, state: 'visible' },
    );
    expect(closeOnboarding).toBeTruthy();

    // The wizard footer should show a Next button on the first slide
    // (the finish CTA only appears on the last slide).
    const nextBtn = await global.client.waitForSelector(
      '[data-tid=onboardingNextTID]',
      { timeout: 3000, state: 'visible' },
    );
    expect(nextBtn).toBeTruthy();
  });

  test('TST9103 - Wizard navigates through all slides via Next [electron,web,s3]', async () => {
    await global.client.waitForSelector('[data-tid=agreeLicenseDialog]', {
      timeout: 10000,
      state: 'visible',
    });
    await global.client.click('[data-tid=agreeLicenseDialog]');
    await global.client.waitForSelector('[data-tid=closeOnboardingDialog]', {
      timeout: 5000,
      state: 'visible',
    });

    // 5 slides total → 4 Next clicks land us on slide 5.
    // After the 4th click, Next should be replaced by the finish CTA
    // (either onboardingOpenPrimaryTID or onboardingChooseFolderToStartTID).
    for (let i = 0; i < 4; i++) {
      await global.client.click('[data-tid=onboardingNextTID]');
      // Small settle time for Swiper transition (500ms speed).
      await global.client.waitForTimeout(600);
    }

    // The Next button should be gone on the last slide.
    const stillHasNext = await global.client.$(
      '[data-tid=onboardingNextTID]',
    );
    expect(stillHasNext).toBeFalsy();

    // The finish CTA must be present in one of its two forms.
    const openPrimary = await global.client.$(
      '[data-tid=onboardingOpenPrimaryTID]',
    );
    const chooseFolder = await global.client.$(
      '[data-tid=onboardingChooseFolderToStartTID]',
    );
    expect(openPrimary || chooseFolder).toBeTruthy();
  });

  test('TST9105 - License dialog only closes via its action buttons [electron,web,s3]', async () => {
    // The dialog should ignore Escape and backdrop clicks — only the action
    // button(s) inside it may dismiss it. We verify Escape and backdrop, plus
    // the primary button. (The build-specific Quit button is covered in
    // TST9106; we don't click it here as it would terminate the app.)
    await global.client.waitForSelector('[data-tid=agreeLicenseDialog]', {
      timeout: 10000,
      state: 'visible',
    });

    // Escape must NOT close the dialog.
    await global.client.keyboard.press('Escape');
    await global.client.waitForTimeout(300);
    expect(
      await global.client.isVisible('[data-tid=agreeLicenseDialog]'),
    ).toBe(true);

    // Clicking the backdrop (outside the dialog paper) must NOT close it.
    // The dialog paper is centered, so a click at (5, 5) lands on the
    // MUI backdrop covering the rest of the viewport.
    await global.client.mouse.click(5, 5);
    await global.client.waitForTimeout(300);
    expect(
      await global.client.isVisible('[data-tid=agreeLicenseDialog]'),
    ).toBe(true);

    // The primary button must close the dialog.
    await global.client.click('[data-tid=agreeLicenseDialog]');
    await global.client.waitForSelector('[data-tid=agreeLicenseDialog]', {
      timeout: 5000,
      state: 'hidden',
    });
  });

  // The license *acceptance* gate (Quit/refuse + "I Agree") is only legally
  // meaningful for the Pro EULA. The AGPL (Lite) doesn't require end-user
  // acceptance to run the app (AGPLv3 §9), so the Lite build shows the license
  // for information only: no Quit button, and the primary button reads "Close"
  // rather than "I Agree". These two tests pin each build's behavior.
  test('TST9106 - Pro EULA offers accept/refuse gate [electron,_pro]', async () => {
    await global.client.waitForSelector('[data-tid=agreeLicenseDialog]', {
      timeout: 10000,
      state: 'visible',
    });
    // Pro: a Quit (refuse) button is present alongside the accept button.
    const quitBtn = await global.client.$('[data-tid=confirmLicenseDialog]');
    expect(quitBtn).toBeTruthy();
    // Primary button is an acceptance CTA ("I Agree"), not a plain "Close".
    const label = await global.client.textContent(
      '[data-tid=agreeLicenseDialog]',
    );
    expect(label.trim().toLowerCase()).toContain('agree');
  });

  test('TST9107 - AGPL dialog is informational, no refuse gate [electron,_lite]', async () => {
    await global.client.waitForSelector('[data-tid=agreeLicenseDialog]', {
      timeout: 10000,
      state: 'visible',
    });
    // Lite/AGPL: no Quit button — nothing to refuse.
    const quitBtn = await global.client.$('[data-tid=confirmLicenseDialog]');
    expect(quitBtn).toBeFalsy();
    // Primary button acknowledges ("Close"), it is not an "I Agree" CTA.
    const label = await global.client.textContent(
      '[data-tid=agreeLicenseDialog]',
    );
    expect(label.trim().toLowerCase()).not.toContain('agree');
  });

  test('TST9104 - Closing the wizard marks onboarding completed [electron,web,s3]', async () => {
    await global.client.waitForSelector('[data-tid=agreeLicenseDialog]', {
      timeout: 10000,
      state: 'visible',
    });
    await global.client.click('[data-tid=agreeLicenseDialog]');
    await global.client.waitForSelector('[data-tid=closeOnboardingDialog]', {
      timeout: 5000,
      state: 'visible',
    });

    // Close via the X — this should dispatch setOnboardingCompleted(true).
    await global.client.click('[data-tid=closeOnboardingDialog]');

    // Wait for the dialog to actually disappear before reading state.
    await global.client.waitForSelector('[data-tid=closeOnboardingDialog]', {
      timeout: 3000,
      state: 'hidden',
    });

    // Read Redux-persisted settings from localStorage and verify the
    // onboardingCompleted flag was set.
    const onboardingCompleted = await global.client.evaluate(() => {
      const root = JSON.parse(localStorage.getItem('persist:root') || '{}');
      if (!root.settings) return null;
      const settings = JSON.parse(root.settings);
      return settings.onboardingCompleted;
    });
    expect(onboardingCompleted).toBe(true);
  });
});
