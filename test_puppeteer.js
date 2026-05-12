const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://127.0.0.1:8080/index.html');
  
  // Wait for load
  await new Promise(r => setTimeout(r, 1000));
  
  // Inject mock user
  await page.evaluate(() => {
    try {
      showApp({uid: 'g_123', name: 'Test User', email: 'test@example.com', picture: 'https://example.com/pic.jpg'});
    } catch (e) {
      console.error('SHOWAPP ERROR:', e.message);
    }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({path: 'screenshot.png'});
  
  await browser.close();
})();
