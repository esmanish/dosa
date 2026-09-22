const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  await page.goto('file:///Users/edassery/Documents/0.Dosa/index.html');
  
  // Wait a moment for scripts to execute
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Try to click a recipe
  await page.evaluate(() => {
    const btn = document.querySelector('.recipe');
    if (btn) btn.click();
    else console.log('BROWSER LOG: No recipe button found');
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await browser.close();
})();
