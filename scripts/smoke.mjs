import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
  assert.equal(await page.locator('#height').inputValue(),'3.69');
  await page.getByRole('button',{name:'Уменьшить высоту'}).click();
  assert.equal(await page.locator('#height').inputValue(),'2.49');
  assert.equal(await page.locator('#platform-output').textContent(),'1,49');
  await page.locator('#height').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#height').inputValue(),'3.69');
  assert.equal(await page.locator('#blueprint').getAttribute('data-sections'),'2');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#blueprint').getAttribute('data-sections'),'17');
  assert.equal(await page.locator('#height-up').isDisabled(),true);
  assert.equal(await page.locator('.assembly-layer:not(.absent)').count(),17);
  assert.equal(await page.locator('#height').inputValue(),'21.69');
  assert.equal(await page.locator('#platform-output').textContent(),'20,69');
  await page.keyboard.press('Home');
  for(let sections=1;sections<=17;sections++) {
    if(sections>1) await page.keyboard.press('ArrowRight');
    const total=Number(await page.locator('#height').inputValue());
    const platform=Number((await page.locator('#platform-output').textContent()).replace(',','.'));
    assert.equal(Math.round(total*100),29+sections*120+100);
    assert.equal(Math.round(platform*100),29+sections*120);
    assert.equal(await page.locator('#blueprint').getAttribute('data-sections'),String(sections));
  }
  for (const value of ['9.69','3.69','13.29','2.49','8.49']) {
    await page.locator('#height').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  }
  await page.waitForTimeout(900);
  assert.equal(await page.locator('.assembly-layer:not(.absent)').count(),6);
  assert.equal(await page.locator('#height-output').textContent(),'8,49');
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
  // Every 3 m position must change the actual drawing, including positions above 48 m.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#length').focus();
  await page.keyboard.press('Home');
  const drawings=new Set();
  for(let length=3;length<=90;length+=3) {
    if(length>3) await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#length-output').textContent(),String(length));
    assert.equal((await page.locator('#estimate-price').textContent()).replace(/\D/g,''),String(length*10*2600));
    const drawing=await page.locator('#blueprint').screenshot({animations:'disabled'});
    drawings.add(createHash('sha256').update(drawing).digest('hex'));
  }
  assert.equal(drawings.size,30,'All 30 length positions must produce different drawings');
  await page.locator('#height').focus();
  await page.keyboard.press('End');
  await page.locator('#blueprint').screenshot({path:'artifacts/scaffold-90x60.png',animations:'disabled'});
  const withinDrawing=await page.locator('#blueprint').evaluate(svg=>{
    const frame=svg.getBoundingClientRect();
    return [...svg.querySelectorAll('.assembly-layer:not(.absent) .assembly-bay:not(.absent-bay),.model-roof .assembly-bay:not(.absent-bay),.model-base .assembly-bay:not(.absent-bay)')].every(bay=>{
      const box=bay.getBoundingClientRect();
      return box.left>=frame.left&&box.right<=frame.right&&box.top>=frame.top&&box.bottom<=frame.bottom;
    });
  });
  assert.equal(withinDrawing,true,'Maximum-size scaffold must stay inside the drawing');
  await page.emulateMedia({reducedMotion:'no-preference'});
  for (const value of ['3','90','6','87','30']) {
    await page.locator('#length').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},value);
  }
  await page.waitForTimeout(900);
  assert.equal(await page.locator('.assembly-layer:not(.absent) .assembly-bay:not(.absent-bay)').count(),300);
  await page.locator('#height').evaluate(input=>{input.value='2';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(900);
  await page.locator('#calculator').screenshot({path:'artifacts/scaffold-length-30.png'});
  await page.getByRole('radio',{name:'Вышка-тура'}).check();
  assert.equal(await page.locator('#height').inputValue(),'8.49');
  assert.equal(await page.locator('#length-field').isVisible(),false);
  await page.locator('#city').selectOption('other');
  assert.equal(await page.locator('#other-city').isVisible(),true);
  await page.locator('#other-city').fill('Темиртау');
  await page.evaluate(()=>{window.__openedUrl=null;window.open=(url)=>{window.__openedUrl=url;return null;};});
  await page.getByRole('button',{name:'Получить точный расчёт'}).click();
  const opened=await page.evaluate(()=>window.__openedUrl);
  assert.equal(new URL(opened).hostname,'wa.me');
  assert.equal(new URL(opened).pathname,'/77017050000');
  assert.match(decodeURIComponent(opened),/Темиртау/);
  assert.match(decodeURIComponent(opened),/Общая высота по схеме: 8,49 м/);
  assert.match(decodeURIComponent(opened),/Высота настила: 7,49 м/);
  assert.match(decodeURIComponent(opened),/Секции по 1,2 м: 6/);
  assert.match(decodeURIComponent(opened),/Колёсная база: 0,29 м. Верхнее ограждение: 1 м/);
  assert.equal(await page.locator('#form-status').isVisible(),true);
  await page.locator('#city').selectOption('Алматы');
  assert.equal(await page.locator('#office').inputValue(),'Алматы');
  assert.equal(await page.locator('#recipient option').count(),2);
  for(const number of ['77781735353','77770582285']) {
    await page.locator('#recipient').selectOption(number);
    await page.getByRole('button',{name:'Получить точный расчёт'}).click();
    const requestUrl=new URL(await page.evaluate(()=>window.__openedUrl));
    assert.equal(requestUrl.pathname,`/${number}`);
    assert.match(requestUrl.searchParams.get('text'),/Город доставки: Алматы/);
    assert.match(requestUrl.searchParams.get('text'),/Офис: Алматы/);
  }
  await page.locator('#office').selectOption('Астана');
  assert.equal(await page.locator('#recipient option').count(),1);
  assert.equal(await page.locator('#recipient').inputValue(),'77017050000');
  await page.locator('#city').selectOption('Караганда');
  assert.equal(await page.locator('#office').inputValue(),'Астана');
  await page.getByRole('button',{name:'Получить точный расчёт'}).click();
  const astanaRequest=new URL(await page.evaluate(()=>window.__openedUrl));
  assert.equal(astanaRequest.pathname,'/77017050000');
  assert.match(astanaRequest.searchParams.get('text'),/Город доставки: Караганда/);
  await page.locator('#office').selectOption('Алматы');
  assert.equal(await page.locator('#recipient').inputValue(),'77770582285');
  await page.getByRole('radio',{name:'Строительные леса'}).check();
  await page.getByRole('button',{name:'Получить точный расчёт'}).click();
  const scaffoldRequest=new URL(await page.evaluate(()=>window.__openedUrl));
  assert.equal(scaffoldRequest.pathname,'/77770582285');
  assert.match(scaffoldRequest.searchParams.get('text'),/Длина фасада: 30 м/);
  assert.match(scaffoldRequest.searchParams.get('text'),/Высота конструкции: 2 м/);
  await page.getByRole('radio',{name:'Вышка-тура'}).check();
  assert.equal(await page.locator('#other-city').isVisible(),false);
  assert.equal(await page.locator('#other-city').isDisabled(),true);
  await page.locator('.faq-list summary').first().click();
  assert.equal(await page.locator('.faq-list details').first().getAttribute('open'),'');
  for(const width of [320,360,390,768,1024,1201,1280,1440]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForTimeout(200);
    const size=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(size.scroll<=size.inner,`Overflow at ${width}: ${JSON.stringify(size)}`);
    if(width>1200) {
      const header=await page.evaluate(()=>{
        const elements=[...document.querySelector('.header-inner').children].filter(el=>getComputedStyle(el).display!=='none');
        return elements.map(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));
      });
      assert.ok(header.every((box,index)=>index===0||box.left>=header[index-1].right),`Header overlap at ${width}`);
      assert.ok(header.at(-1).right<=width,`Header does not fit at ${width}`);
    }
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
  assert.equal(await page.locator('#mobile-nav a[href="tel:+77781735353"]').isVisible(),true);
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
  console.log('PASS: assets, console, all 17 tower heights include a 29 cm base and 1 m guardrail, all 30 length positions have distinct drawings, maximum dimensions fit, rapid reversal, all 3 WhatsApp recipients, complete dimensions in requests, pricing, mobile navigation, 8 responsive widths, reduced motion.');
} finally {await browser.close();}
