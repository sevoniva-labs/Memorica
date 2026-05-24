const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);

  const inputs = await page.locator('input').all();
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type') || '';
    if (type === 'password') {
      await inputs[i].fill('admin');
    } else {
      await inputs[i].fill('admin');
    }
  }

  const btns = await page.locator('button').all();
  for (const btn of btns) {
    const text = await btn.textContent();
    if (text && (text.includes('登录') || text.includes('Login'))) {
      await btn.click();
      break;
    }
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/memorica_home.png', fullPage: false });
  console.log('Screenshot saved to /tmp/memorica_home.png');
  await browser.close();
})();
