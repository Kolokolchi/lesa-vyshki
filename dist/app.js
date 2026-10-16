const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 1 });
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const menuButton = $('.menu-toggle');
const mobileNav = $('#mobile-nav');

function closeMenu(restoreFocus = false) {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});
mobileNav.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true);
});
window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
  if (event.matches) closeMenu();
});
$('#year').textContent = String(new Date().getFullYear());

const heightInput = $('#height');
const lengthInput = $('#length');
const form = $('#estimate-form');
let mode = 'tower';
const savedHeight = { scaffold: 4, tower: 2.4 };
let shownSections = 0;
let lastBayCount = 0;
let modelMode = '';
let modelFrame = 0;
let modelGeneration = 0;
const model = $('#blueprint');
const BASE_Y = 258;
const FLOOR = 39;
const MAX_SECTIONS = 30;

function rangeFill(input) {
  const percent = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
  input.style.setProperty('--progress', `${percent}%`);
}
function pluralSections(number) {
  const last = number % 10;
  const lastTwo = number % 100;
  const word = last === 1 && lastTwo !== 11 ? 'секция' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'секции' : 'секций';
  return `${number} ${word}`;
}
function point(x, y, z = 0) { return [240 + (x - y) * .85, BASE_Y + (x + y) * .29 - z]; }
function p(x, y, z) { return point(x, y, z).map(value => value.toFixed(2)).join(','); }
function beam(a, b, color = '#a5c2d4', width = 3.4) {
  return `<path class="model-beam" d="M${p(...a)}L${p(...b)}" stroke="#071f31" stroke-width="${width + 1.8}"/><path class="model-beam" d="M${p(...a)}L${p(...b)}" stroke="${color}" stroke-width="${width}"/><path class="model-beam" d="M${p(...a)}L${p(...b)}" stroke="#e4f1f8" stroke-opacity=".3" stroke-width=".8"/>`;
}
function joint(x, y, z) {
  const [cx, cy] = point(x, y, z);
  return `<circle cx="${cx}" cy="${cy}" r="2.4" fill="#f77843"/>`;
}
function deck(width, depth, z) {
  let s = `<path d="M${p(-width/2,-depth/2,z)}L${p(width/2,-depth/2,z)}L${p(width/2,depth/2,z)}L${p(-width/2,depth/2,z)}Z" fill="#c5a47b" stroke="#e2c29b" stroke-width="1.3"/>`;
  for (let y = -depth/2 + 10; y < depth/2; y += 10) s += `<path d="M${p(-width/2,y,z+.3)}L${p(width/2,y,z+.3)}" stroke="#907452" stroke-width=".8"/>`;
  s += `<path d="M${p(-width/2,depth/2,z)}L${p(width/2,depth/2,z)}L${p(width/2,depth/2,z-3)}L${p(-width/2,depth/2,z-3)}Z" fill="#93744f"/>`;
  return s;
}
function makeModel() {
  cancelAnimationFrame(modelFrame);
  const generation = ++modelGeneration;
  const isTower = mode === 'tower';
  const bays = isTower ? 1 : Math.min(4, Math.max(1, Math.ceil(Number(lengthInput.value)/12)));
  const width = isTower ? 88 : bays * 92;
  const depth = isTower ? 76 : 58;
  const left = -width/2, right = width/2, back = -depth/2, front = depth/2;
  lastBayCount = bays;
  modelMode = mode;
  shownSections = 0;
  let svg = '<g class="model-ground">';
  for (let i=-240; i<=240; i+=40) {
    svg += `<path d="M${p(i,-160,0)}L${p(i,160,0)}M${p(-240,i,0)}L${p(240,i,0)}"/>`;
  }
  svg += '</g><g class="model-viewport">';
  svg += `<ellipse class="model-shadow" cx="245" cy="${BASE_Y+15}" rx="${width*.8+30}" ry="28"/>`;
  for (const x of [left,right]) for (const y of [back,front]) {
    if (isTower) {
      const [cx,cy] = point(x,y,0);
      svg += `<ellipse cx="${cx}" cy="${cy+5}" rx="5" ry="7" fill="#071c29" stroke="#99afba" stroke-width="1.4"/>`;
      svg += beam([x,y,0],[x,y,11],'#b7cbd7',3);
    } else svg += `<path d="M${p(x-7,y-5,0)}L${p(x+7,y-5,0)}L${p(x+7,y+5,0)}L${p(x-7,y+5,0)}Z" fill="#b7cbd7"/>`;
  }
  if (isTower) {
    for (const side of [-1,1]) {
      svg += beam([side*width/2,front,31],[side*(width/2+28),front+21,0],'#5a9cc5',3);
      svg += beam([side*width/2,back,31],[side*(width/2+28),back-21,0],'#5a9cc5',3);
    }
  }
  for(let level=0; level<MAX_SECTIONS; level++) {
    const bottom=level*FLOOR+10, top=bottom+FLOOR;
    const upright=isTower?'#e1b54d':'#6794b5';
    svg += `<g class="assembly-layer absent" data-level="${level}">`;
    for(let bay=0;bay<bays;bay++) {
      const x1=left+bay*width/bays, x2=left+(bay+1)*width/bays;
      svg += beam([x1,back,bottom],[x1,back,top],upright);
      svg += beam([x2,back,bottom],[x2,back,top],upright);
      svg += beam([x1,back,top],[x2,back,top]);
      svg += beam([x1,back,bottom],[x2,back,top],'#507b99',1.8);
      svg += beam([x2,back,bottom],[x1,back,top],'#507b99',1.8);
    }
    svg += beam([right,back,top],[right,front,top]);
    svg += beam([right,back,bottom],[right,front,top],'#6fa3c3',2);
    svg += beam([right,front,bottom],[right,back,top],'#6fa3c3',2);
    svg += deck(width,depth,top-2);
    for(let bay=0;bay<bays;bay++) {
      const x1=left+bay*width/bays, x2=left+(bay+1)*width/bays;
      svg += beam([x1,front,bottom],[x1,front,top],upright);
      svg += beam([x2,front,bottom],[x2,front,top],upright);
      svg += beam([x1,front,bottom],[x2,front,bottom],'#8faec1',2.5);
      svg += beam([x1,front,top],[x2,front,top],'#bdcfda',3);
      svg += beam([x1,front,bottom],[x2,front,top],isTower?'#528ab3':'#9fb7c8',2);
      svg += beam([x2,front,bottom],[x1,front,top],isTower?'#528ab3':'#9fb7c8',2);
      svg += joint(x1,front,top)+joint(x2,front,top);
    }
    for(let z=bottom+9;z<top;z+=10) svg += beam([left,back,z],[left,front,z],upright,2);
    svg += beam([left,back,bottom],[left,back,top],upright);
    svg += beam([left,front,bottom],[left,front,top],upright);
    svg += '</g>';
  }
  svg += '<g class="model-roof">';
  for (const x of [left,right]) for (const y of [back,front]) svg += beam([x,y,10],[x,y,31],'#f17041',3);
  for(const z of [21,31]) {
    svg += beam([left,back,z],[right,back,z],'#f17041',2.8);
    svg += beam([right,back,z],[right,front,z],'#f17041',2.8);
    svg += beam([left,front,z],[right,front,z],'#f17041',2.8);
    svg += beam([left,back,z],[left,front,z],'#f17041',2.8);
  }
  svg += '</g></g>';
  model.innerHTML=svg;
  modelFrame=requestAnimationFrame(()=> {
    if(generation!==modelGeneration) return;
    modelFrame=requestAnimationFrame(()=>animateModel());
  });
}
function sectionCount() {
  return mode==='tower' ? Math.max(1,Math.round((Number(heightInput.value)-1.2)/1.2)) : Math.round(Number(heightInput.value)/2);
}
function animateModel() {
  const count=sectionCount();
  const old=shownSections;
  const scale=Math.min(1,222/(count*FLOOR+34));
  const viewport=model.querySelector('.model-viewport');
  if(!viewport) return;
  viewport.style.transform=`translate(${240*(1-scale)}px,${BASE_Y*(1-scale)}px) scale(${scale})`;
  model.querySelector('.model-roof').style.transform=`translateY(${-count*FLOOR}px)`;
  model.querySelectorAll('.assembly-layer').forEach((layer,index)=> {
    const visible=index<count;
    const changed=(index<old)!==visible;
    const distance=visible?Math.max(0,index-old):Math.max(0,old-1-index);
    layer.style.transitionDelay=changed&&!reducedMotion.matches?`${Math.min(distance*65,350)}ms`:'0ms';
    layer.classList.toggle('absent',!visible);
  });
  shownSections=count;
  $('#model-sections').textContent=pluralSections(count);
  model.dataset.sections=String(count);
}
function update() {
  const length=Number(lengthInput.value);
  const height=Number(heightInput.value);
  savedHeight[mode]=height;
  $('#height-output').textContent=decimal.format(height);
  heightInput.setAttribute('aria-valuetext',`${decimal.format(height)} метра`);
  $('#length-output').textContent=decimal.format(length);
  rangeFill(heightInput);
  rangeFill(lengthInput);
  $('#height-down').disabled=height<=Number(heightInput.min);
  $('#height-up').disabled=height>=Number(heightInput.max);
  if(mode==='scaffold') {
    const area=length*height;
    $('#estimate-description').textContent=`Ориентир за ${money.format(area)} м²`;
    $('#estimate-price').textContent=`от ${money.format(area*2600)} ₸`;
    $('#estimate-note').textContent='Предварительно: площадь × 2 600 ₸/м². Настилы, крепления и доставка уточняются при расчёте.';
  } else {
    $('#estimate-description').textContent='Начальная цена линейки ВСП-250';
    $('#estimate-price').textContent='от 99 900 ₸';
    $('#estimate-note').textContent=`Цена базового варианта. Комплект на ${decimal.format(height)} м и доставку отдельно рассчитает менеджер.`;
  }
  const bays=mode==='tower'?1:Math.min(4,Math.max(1,Math.ceil(length/12)));
  if(modelMode!==mode||lastBayCount!==bays) makeModel();
  else animateModel();
  $('#form-status').hidden=true;
}
function setMode(value) {
  mode=value;
  const isTower=mode==='tower';
  document.querySelectorAll('[name=equipment]').forEach(input=>input.checked=input.value===mode);
  heightInput.min=isTower?'2.4':'2';
  heightInput.max=isTower?'21.6':'60';
  heightInput.step=isTower?'1.2':'2';
  heightInput.value=String(savedHeight[mode]);
  $('#height-min').textContent=isTower?'2,4 м':'2 м';
  $('#height-max').textContent=isTower?'21,6 м':'60 м';
  $('#height-label').textContent=isTower?'Высота конструкции':'Высота лесов';
  $('#length-field').hidden=isTower;
  lengthInput.disabled=isTower;
  $('#model-name').textContent=isTower?'Вышка-тура':'Рамные леса';
  $('#selection-caption').textContent='Ваше оборудование';
  $('#selection-model').textContent=isTower?'ВСП-250 «Евро»':'ЛРСП-40 / ЛРСП-60';
  $('#selection-description').textContent=isTower?'Для монтажа, обслуживания и локальной отделки.':'Для кладки, утепления и отделки фасадов.';
  $('#selection-feature').textContent=isTower?'Шаг секции — 1,2 м':'Высота яруса — 2 м';
  update();
}
document.querySelectorAll('[name=equipment]').forEach(input=>input.addEventListener('change',()=>setMode(input.value)));
$('#height-down').addEventListener('click',()=>{heightInput.stepDown();update();});
$('#height-up').addEventListener('click',()=>{heightInput.stepUp();update();});
heightInput.addEventListener('input',update);
lengthInput.addEventListener('input',update);
document.querySelectorAll('[data-product]').forEach(link=>link.addEventListener('click',()=>setMode(link.dataset.product)));
$('#city').addEventListener('change',()=> {
  const other=$('#city').value==='other';
  $('#other-city-field').hidden=!other;
  $('#other-city').disabled=!other;
  $('#other-city').required=other;
  if(other) $('#other-city').focus();
  $('#form-status').hidden=true;
});
$('#other-city').addEventListener('input',()=>$('#other-city').setCustomValidity(''));
form.addEventListener('submit',(event)=> {
  event.preventDefault();
  const city=$('#city').value==='other'?$('#other-city').value.trim():$('#city').value;
  if(!city) {
    $('#other-city').setCustomValidity('Укажите город доставки');
    $('#other-city').reportValidity();
    return;
  }
  const height=decimal.format(Number(heightInput.value));
  const lines=['Здравствуйте! Хочу получить расчёт оборудования.'];
  if(mode==='scaffold') lines.push('Оборудование: рамные строительные леса.',`Длина фасада: ${lengthInput.value} м.`,`Высота конструкции: ${height} м.`);
  else lines.push('Оборудование: вышка-тура ВСП-250 «Евро».',`Желаемая высота конструкции по схеме: ${height} м.`);
  lines.push(`Город доставки: ${city}.`,'Помогите уточнить рабочую высоту, комплектацию, актуальную стоимость и доставку.');
  const url=`https://wa.me/77017050000?text=${encodeURIComponent(lines.join('\n'))}`;
  const status=$('#form-status');
  status.replaceChildren(document.createTextNode('Запрос подготовлен. '));
  const link=document.createElement('a');
  link.href=url; link.target='_blank'; link.rel='noopener'; link.textContent='Открыть его в WhatsApp';
  status.append(link); status.hidden=false;
  window.open(url,'_blank','noopener,noreferrer');
});
setMode('tower');
