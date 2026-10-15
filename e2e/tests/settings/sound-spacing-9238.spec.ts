import { expect, test } from '../../fixtures/test.fixture';

for (const width of [1333, 600]) {
  test(`sound pitch toggle has field spacing at ${width}px (#9238)`, async ({
    page,
    settingsPage,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#/config?tab=1');
    await settingsPage.expandSection('config-sound-form');
    const sound = page.locator('config-sound-form');
    await sound.getByRole('combobox', { name: 'Task completed sound' }).click();
    await page.getByRole('option', { name: 'Small Ding', exact: true }).click();
    const toggle = sound.locator('mat-slide-toggle');
    await expect(toggle).toBeVisible();
    await sound.scrollIntoViewIfNeeded();
    const geometry = await sound.evaluate((element) => {
      const pitch = element.querySelector('mat-slide-toggle')!;
      const fields = Array.from(element.querySelectorAll('mat-form-field'));
      const rect = (node: Element): { top: number; bottom: number; height: number } => {
        const { top, bottom, height } = node.getBoundingClientRect();
        return { top, bottom, height };
      };
      const pitchRect = rect(pitch);
      const done = rect(fields[1]);
      const next = rect(fields[2]);
      const last = rect(fields[3]);
      return {
        pitch: pitchRect,
        done,
        next,
        last,
        pitchToNext: next.top - pitchRect.bottom,
        doneToPitch: pitchRect.top - done.bottom,
        nextToLast: last.top - next.bottom,
        spacingToken: parseFloat(getComputedStyle(element).getPropertyValue('--s2')),
        pitchMarginBottom: getComputedStyle(pitch).marginBottom,
      };
    });
    await testInfo.attach('geometry', {
      body: JSON.stringify(geometry, null, 2),
      contentType: 'application/json',
    });
    await testInfo.attach('sound-settings', {
      body: await sound.screenshot(),
      contentType: 'image/png',
    });
    console.log(JSON.stringify({ width, ...geometry }));
    // Adjacent selectors use --s2; the intervening toggle needs the same minimum gap.
    expect(geometry.pitchToNext).toBeGreaterThanOrEqual(geometry.spacingToken - 1);
  });
}
