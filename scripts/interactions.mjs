import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
  await page.goto(process.env.TEST_URL||'http://localhost:4173',{waitUntil:'networkidle'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{window.open=url=>{window.__request=url;return null;};});
  const drawings=new Set();
  for(const size of ['0,8 × 1,7 м','1,2 × 2 м','2 × 2 м']) {
    await page.getByRole('radio',{name:size,exact:true}).check();
    for(const height of ['2.49','21.69']) {
      await page.locator('#height').evaluate((input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},height);
      await page.waitForFunction(expected=>document.querySelector('#blueprint').dataset.sections===expected,height==='2.49'?'1':'17');
      const picture=await page.locator('#blueprint').screenshot({animations:'disabled',path:`artifacts/platform-${size.replaceAll(/[^\d]/g,'')}-${height}.png`});
      if(height==='2.49') drawings.add(createHash('sha256').update(picture).digest('hex'));
      const fits=await page.locator('#blueprint').evaluate(svg=>{
        const frame=svg.getBoundingClientRect();
        return [...svg.querySelector('.model-viewport').children].filter(el=>!el.classList.contains('absent')).every(el=>{
          const box=el.getBoundingClientRect();
          return box.left>=frame.left&&box.right<=frame.right&&box.top>=frame.top&&box.bottom<=frame.bottom;
        });
      });
      assert.ok(fits,`${size} at ${height} m must fit the drawing`);
    }
    await page.locator('#height').evaluate(input=>{input.value='8.49';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.getByRole('button',{name:'Получить точный расчёт'}).click();
    const request=new URL(await page.evaluate(()=>window.__request));
    assert.ok(request.searchParams.get('text').includes(`Размер площадки: ${size}.`));
    assert.ok(request.searchParams.get('text').includes('Общая высота по схеме: 8,49 м.'));
    assert.equal(await page.locator('#selection-platform').textContent(),`Площадка: ${size}`);
  }
  assert.equal(drawings.size,3,'All three platform sizes must have different geometry');
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const size of ['0,8 × 1,7 м','2 × 2 м','1,2 × 2 м','2 × 2 м']) await page.getByRole('radio',{name:size,exact:true}).check();
  await page.waitForTimeout(950);
  assert.equal(await page.locator('#height').inputValue(),'8.49');
  assert.equal(await page.locator('.assembly-layer:not(.absent)').count(),6);
  await page.getByRole('radio',{name:'Строительные леса',exact:true}).check();
  assert.equal(await page.locator('#platform-picker').isVisible(),false);
  await page.getByRole('button',{name:'Получить точный расчёт'}).click();
  assert.ok(!new URL(await page.evaluate(()=>window.__request)).searchParams.get('text').includes('Размер площадки:'));
  await page.getByRole('radio',{name:'Вышка-тура',exact:true}).check();
  assert.equal(await page.getByRole('radio',{name:'2 × 2 м',exact:true}).isChecked(),true);
  assert.equal(await page.locator('#height').inputValue(),'8.49');
  // The footer anchor must reach document zero even when the header is sticky.
  for(const motion of ['no-preference','reduce']) {
    await page.emulateMedia({reducedMotion:motion});
    await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    assert.ok(await page.evaluate(()=>scrollY)>1000);
    if(motion==='reduce') {await page.locator('.back-top').focus();await page.keyboard.press('Enter');}
    else await page.getByRole('link',{name:'Наверх'}).click();
    await page.waitForFunction(()=>scrollY===0,{},{timeout:5000});
    assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.header .brand')),true);
  }
  await page.emulateMedia({reducedMotion:'no-preference'});
  const trigger=page.getByRole('button',{name:'Выбрать город и номер WhatsApp'});
  const popup=page.locator('#quick-contacts');
  const originalUrl=page.url();
  await trigger.click();
  assert.equal(await popup.isVisible(),true);
  assert.equal(page.url(),originalUrl);
  assert.equal(await page.evaluate(()=>scrollY),0);
  assert.deepEqual(await popup.locator('a').evaluateAll(links=>links.map(link=>link.href)),['https://wa.me/77017050000','https://wa.me/77781735353','https://wa.me/77770582285']);
  assert.deepEqual(await popup.locator('h3').allTextContents(),['Астана','Алматы']);
  await popup.screenshot({path:'artifacts/quick-contacts.png',animations:'disabled'});
  const panelBox=await popup.boundingBox(), triggerBox=await trigger.boundingBox();
  assert.ok(panelBox.y+panelBox.height<=triggerBox.y&&triggerBox.y-panelBox.y-panelBox.height<24);
  assert.ok(Math.abs(panelBox.x+panelBox.width-triggerBox.x-triggerBox.width)<2);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#quick-contacts').matches(':popover-open'));
  assert.equal(await trigger.evaluate(el=>document.activeElement===el),true);
  await page.keyboard.press('Enter');
  assert.equal(await popup.isVisible(),true);
  await page.getByRole('button',{name:'Закрыть выбор контактов'}).click();
  await page.waitForFunction(()=>!document.querySelector('#quick-contacts').matches(':popover-open'));
  await trigger.click();
  await page.mouse.click(20,20);
  await page.waitForFunction(()=>!document.querySelector('#quick-contacts').matches(':popover-open'));
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const controls=await page.locator('.platform-options label').evaluateAll(labels=>labels.map(label=>({width:label.clientWidth,scroll:label.scrollWidth,height:label.getBoundingClientRect().height})));
    assert.ok(controls.every(control=>control.scroll<=control.width&&control.height>=44));
    if(width===768) {
      await trigger.click();
      const box=await popup.boundingBox();
      assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<900);
      await page.keyboard.press('Escape');
    }
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: three platform geometries, min/max bounds, saved height and size, size in requests, full back-to-top with mouse/keyboard, contact popover position/links/Escape/outside dismissal, responsive controls.');
} finally {await browser.close();}
