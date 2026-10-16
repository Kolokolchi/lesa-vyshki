import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`);});
try {
  await page.goto(process.env.TEST_URL || 'http://localhost:4173',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'artifacts/desktop-full.png',fullPage:true});
  await page.screenshot({path:'artifacts/desktop-hero.png'});
  assert.equal(await page.locator('#blueprint').getAttribute('data-sections'),'1');
  assert.equal(await page.locator('#height-down').isDisabled(),true);
  await page.getByRole('button',{name:'Увеличить высоту'}).click();
  assert.equal(await page.locator('#height').inputValue(),'3.6');
  await page.getByRole('button',{name:'Уменьшить высоту'}).click();
  assert.equal(await page.locator('#height').inputValue(),'2.4');
  await page.locator('#height').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#height').inputValue(),'3.6');
  assert.equal(await page.locator('#blueprint').getAttribute('data-sections'),'2');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#blueprint').getAttribute('data-sections'),'17');
  assert.equal(await page.locator('#height-up').isDisabled(),true);
  assert.equal(await page.locator('.assembly-layer:not(.absent)').count(),17);
  for (const value of ['9.6','3.6','13.2','2.4','8.4']) {
    await page.locator('#height').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  }
  await page.waitForTimeout(900);
  assert.equal(await page.locator('.assembly-layer:not(.absent)').count(),6);
  assert.equal(await page.locator('#height-output').textContent(),'8,4');
  await page.locator('#calculator').screenshot({path:'artifacts/calculator-tower.png'});
  await page.getByRole('radio',{name:'Строительные леса'}).check();
  await page.locator('#height').focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#height').inputValue(),'2');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#height').inputValue(),'4');
  assert.equal(await page.locator('.assembly-layer:not(.absent)').count(),2);
  assert.match((await page.locator('#estimate-price').textContent()).replace(/\s/g,''),/249600/);
  await page.keyboard.press('End');
  assert.equal(await page.locator('.assembly-layer:not(.absent)').count(),30);
  await page.locator('#height').evaluate(input=>{input.value='10';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(900);
  await page.locator('#calculator').screenshot({path:'artifacts/calculator-scaffold.png'});
  await page.getByRole('radio',{name:'Вышка-тура'}).check();
  assert.equal(await page.locator('#height').inputValue(),'8.4');
  assert.equal(await page.locator('#length-field').isVisible(),false);
  await page.locator('#city').selectOption('other');
  assert.equal(await page.locator('#other-city').isVisible(),true);
  await page.locator('#other-city').fill('Темиртау');
  await page.evaluate(()=>{window.__openedUrl=null;window.open=(url)=>{window.__openedUrl=url;return null;};});
  await page.getByRole('button',{name:'Получить точный расчёт'}).click();
  const opened=await page.evaluate(()=>window.__openedUrl);
  assert.equal(new URL(opened).hostname,'wa.me');
  assert.match(decodeURIComponent(opened),/Темиртау/);
  assert.match(decodeURIComponent(opened),/8,4/);
  assert.equal(await page.locator('#form-status').isVisible(),true);
  await page.locator('#city').selectOption('Алматы');
  assert.equal(await page.locator('#other-city').isVisible(),false);
  assert.equal(await page.locator('#other-city').isDisabled(),true);
  await page.locator('.faq-list summary').first().click();
  assert.equal(await page.locator('.faq-list details').first().getAttribute('open'),'');
  for(const width of [320,360,390,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForTimeout(200);
    const size=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(size.scroll<=size.inner,`Overflow at ${width}: ${JSON.stringify(size)}`);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.scrollTo(0,0));
  const arrangement=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();
    return {
      tabsBottom:rect('.equipment-picker').bottom,
      modelTop:rect('.blueprint').top,
      modelBottom:rect('.blueprint').bottom,
      sliderTop:rect('.assembly-slider').top,
      bodyFont:getComputedStyle(document.querySelector('.product-body>p')).fontSize,
      quoteTop:rect('.calculator-panel').top,
      controlsBottom:rect('.assembly-workspace').bottom,
      colors:['.catalog','.advantages','.calculator','.delivery','.faq','.contact-section'].map(s=>getComputedStyle(document.querySelector(s)).backgroundColor)
    };
  });
  assert.ok(arrangement.tabsBottom<=arrangement.modelTop);
  assert.ok(arrangement.modelBottom<=arrangement.sliderTop);
  assert.ok(arrangement.quoteTop>arrangement.controlsBottom);
  assert.ok(parseFloat(arrangement.bodyFont)>=16);
  assert.equal(new Set(arrangement.colors).size,6);
  await page.screenshot({path:'artifacts/mobile-full.png',fullPage:true});
  await page.screenshot({path:'artifacts/mobile-hero.png'});
  await page.locator('#calculator').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await page.screenshot({path:'artifacts/mobile-calculator.png'});
  await page.getByRole('button',{name:'Открыть меню'}).click();
  assert.equal(await page.locator('#mobile-nav').isVisible(),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#mobile-nav').isVisible(),false);
  await page.getByRole('button',{name:'Открыть меню'}).click();
  await page.locator('#mobile-nav a[href="#catalog"]').click();
  assert.equal(await page.locator('#mobile-nav').isVisible(),false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#height').focus();
  await page.keyboard.press('Home');
  const reduced=await page.locator('.assembly-layer').first().evaluate(el=>getComputedStyle(el).transitionDuration);
  assert.ok(reduced.includes('1e-05s')||reduced.includes('0.00001s'));
  assert.deepEqual(errors,[]);
  console.log('PASS: assets, console, assembly add/remove/rapid reversal, keyboard controls, both models, pricing, request parameters, city validation, accordion, mobile navigation, 6 responsive widths, reduced motion.');
} finally {await browser.close();}
