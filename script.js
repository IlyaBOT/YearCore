'use strict';

/* YEARCORE: a static, local-first trend-list maker. No account, API, or build step. */
const DB_KEY = 'yearcore-v1';
const IMAGE_CACHE_KEY = 'yearcore-image-cache-v1';
const CATEGORIES = {
  all: 'Все', sites: 'Сайты', devices: 'Техника', games: 'Игры',
  memes: 'Мемы', apps: 'Софт', cinema: 'Кино', music: 'Музыка',
  tv: 'Сериалы', politics: 'Политика', events: 'События', fashion: 'Мода'
};
const TIERS = ['S','A','B','C','D'];
const RANK_COLORS = {S:'#f67c75', A:'#ffbe7d', B:'#ffe58e', C:'#b5e3a3', D:'#aad4ed'};
const SEEDS = [
  [2007,'iphone','Первый iPhone','devices','📱'],
  [2007,'myspace','MySpace','sites','🌐'],
  [2007,'snapshare','SnapShare','sites','📷'],
  [2007,'vista','Windows Vista','apps','💿'],
  [2008,'obama','Obama HOPE','memes','🎨'],
  [2008,'failwhale','Twitter Fail Whale','memes','🐳'],
  [2008,'chrome','Первый Google Chrome','apps','🌐'],
  [2008,'macbook','MacBook Air','devices','💻'],
  [2009,'angrybirds','Angry Birds','games','🐦'],
  [2009,'windows7','Windows 7','apps','🪟'],
  [2009,'farmville','FarmVille','games','🌾'],
  [2009,'minecraft','Minecraft Classic','games','⛏️'],
  [2010,'ipad','Первый iPad','devices','📱'],
  [2010,'pinterest','Pinterest','sites','📌'],
  [2010,'instagram','Instagram','apps','📸'],
  [2010,'gap','Новый логотип Gap','memes','👕'],
  [2011,'bootstrap','Bootstrap','apps','🧩'],
  [2011,'chrome','Google Chrome','apps','🌐'],
  [2011,'nyancat','Nyan Cat','memes','🌈'],
  [2012,'windows8','Windows 8','apps','🪟'],
  [2012,'twitter','Twitter','sites','🐦'],
  [2012,'microsoft','Новый логотип Microsoft','apps','◼️'],
  [2012,'gangnam','Gangnam Style','memes','🎵'],
  [2013,'iphone5s','iPhone 5s','devices','📱'],
  [2013,'yahoo','Редизайн Yahoo!','sites','💜'],
  [2013,'doge','Doge','memes','🐕'],
  [2013,'sunrise','Sunrise Calendar','apps','⏰'],
  [2014,'monument','Monument Valley','games','🏛️'],
  [2014,'flappy','Flappy Bird','games','🐤'],
  [2014,'airbnb','Редизайн Airbnb','sites','🏠'],
  [2015,'google','Новый логотип Google','apps','🔎'],
  [2015,'dress','Сине-чёрное или бело-золотое?','memes','👗'],
  [2015,'applewatch','Apple Watch','devices','⌚'],
  [2016,'instagram','Новый логотип Instagram','apps','📷'],
  [2016,'stranger','Stranger Things','memes','📺'],
  [2016,'pokemon','Pokémon GO','games','🔴'],
  [2016,'figma','Figma','apps','🎨']
];
const BUILTIN = [
  ...SEEDS.map(([year,slug,title,category,emoji]) => ({
    id:`${year}-${slug}`,year,title,category,emoji,src:`assets/${year}-${slug}.webp`
  })),
  ...(window.YEARCORE_TRENDS || [])
];
function readImageCache(){
  try {
    const value = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY));
    if (value && typeof value === 'object') return value;
  } catch (e) { console.warn('Image cache unavailable', e); }
  return {};
}
let imageCache = readImageCache();
const imagePromises = new Map();
function saveImageCache(){
  try { localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imageCache)); }
  catch (e) { console.warn('Image cache save failed', e); }
}
function normalizeImageQuery(value=''){
  return String(value).replace(/[«»]/g,'').replace(/[–—]/g,' ').replace(/\([^)]*\)/g,' ').replace(/\s+/g,' ').trim();
}
async function fetchWikiThumb(query, lang='ru'){
  const params = new URLSearchParams({
    action:'query', format:'json', formatversion:'2', origin:'*',
    generator:'search', gsrsearch: query, gsrlimit:'1',
    prop:'pageimages', piprop:'thumbnail', pithumbsize:'640', pilicense:'any'
  });
  const response = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params.toString()}`);
  if (!response.ok) throw new Error('Wikipedia fetch failed');
  const data = await response.json();
  const page = (data?.query?.pages || []).find(entry => entry?.thumbnail?.source);
  return page?.thumbnail?.source || '';
}
async function ensureItemImage(item){
  if (!item) return '';
  if (typeof item.src === 'string' && (item.src.startsWith('assets/') || validUrl(item.src))) return item.src;
  const rawQuery = item.imageQuery || item.title;
  const imageQuery = normalizeImageQuery(rawQuery);
  if (!imageQuery) return '';
  if (imageCache[imageQuery]) { item.src = imageCache[imageQuery]; return item.src; }
  if (imagePromises.has(imageQuery)) return imagePromises.get(imageQuery);
  const promise = (async () => {
    const langs = /^en:/i.test(imageQuery) ? ['en'] : /^ru:/i.test(imageQuery) ? ['ru'] : ['ru','en'];
    const query = imageQuery.replace(/^(ru|en):/i,'').trim();
    for (const lang of langs) {
      try {
        const src = await fetchWikiThumb(query, lang);
        if (src && validUrl(src)) {
          imageCache[imageQuery] = src;
          item.src = src;
          saveImageCache();
          return src;
        }
      } catch (error) {}
    }
    return '';
  })().finally(() => imagePromises.delete(imageQuery));
  imagePromises.set(imageQuery, promise);
  return promise;
}
function placeholderHtml(item){
  return `<span class="trend-visual trend-visual-loading cat-${safeText(item.category)}" aria-hidden="true"><small>${safeText(item.title)}</small></span>`;
}
async function hydrateAutoImages(root=document){
  const shells = [...root.querySelectorAll('[data-autoimg]')];
  await Promise.all(shells.map(async shell => {
    const item = itemById(shell.dataset.autoimg);
    if (!item || shell.dataset.state === 'done' || shell.dataset.state === 'loading') return;
    shell.dataset.state = 'loading';
    const src = await ensureItemImage(item);
    if (!src) { shell.dataset.state = 'failed'; return; }
    // Replace the placeholder only after the image actually loads.
    const image = new Image();
    image.alt = '';
    image.draggable = false;
    image.decoding = 'async';
    image.onload = () => {
      if (!shell.isConnected) return;
      shell.replaceChildren(image);
      shell.dataset.state = 'done';
    };
    image.onerror = () => {
      shell.dataset.state = 'failed';
      // Avoid indefinitely caching broken image URLs.
      const key = normalizeImageQuery(item.imageQuery || item.title);
      if (imageCache[key] === src) {
        delete imageCache[key];
        saveImageCache();
      }
      if (item.src === src) item.src = '';
    };
    image.src = src;
  }));
}
const byId = id => document.getElementById(id);
const safeText = value => String(value ?? '').replace(/[&<>"']/g,ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const validUrl = value => typeof value === 'string' && ( /^https:\/\//i.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value));
const SEED_IDS = new Map();
for (const item of BUILTIN) {
  if (!SEED_IDS.has(item.year)) SEED_IDS.set(item.year,[]);
  SEED_IDS.get(item.year).push(item.id);
}
const defaultYear = y => ({
  title:`Мой ${y}`,note:'', poster:[...(SEED_IDS.get(y)||[]).slice(0,4)],
  tier:{S:[],A:[],B:[],C:[],D:[]},
  bingo:Array(25).fill(null),bingoSize:3,marked:[]
});
function readDb(){
  try {
    const value=JSON.parse(localStorage.getItem(DB_KEY));
    if(value && value.version===1 && value.years && typeof value.years==='object' && Array.isArray(value.custom)) return value;
  } catch(e) { console.warn('Local storage unavailable or invalid',e); }
  return {version:1,years:{},custom:[]};
}
let db = readDb();
let year = 2009;
let mode = 'poster';
let filter = 'all';
let search = '';
let dragId = null;
let toastTimer = 0;
const pathnameHash = location.hash.match(/^#(\d{4})\/(poster|tier|bingo)$/);
if(pathnameHash) { year=Number(pathnameHash[1]); mode=pathnameHash[2]; }
function canYear(y) {return Number.isInteger(y) && y>=1990 && y<=2025;}
if(!canYear(year))year=2009;
const years = () => Array.from({length:36},(_,i)=>1990+i);
function getYear(y=year){
  if(!Object.prototype.hasOwnProperty.call(db.years,y)) db.years[y]=defaultYear(y);
  const d=db.years[y];
  if(!Array.isArray(d.poster))d.poster=[];
  if(!d.tier || typeof d.tier !=='object')d.tier={};
  for(const tier of TIERS)if(!Array.isArray(d.tier[tier]))d.tier[tier]=[];
  if(![3,4,5].includes(Number(d.bingoSize)))d.bingoSize=5;
  if(!Array.isArray(d.bingo))d.bingo=Array(25).fill(null);
  if(!Array.isArray(d.marked))d.marked=[];
  if(typeof d.title!=='string')d.title=`Мой ${y}`;
  if(typeof d.note!=='string')d.note='';
  return d;
}
function save(){try{localStorage.setItem(DB_KEY,JSON.stringify(db));return true}catch(e){toast('Не хватает памяти браузера. Скачай резервную копию JSON.');return false;}}
function toast(message){
  const el=byId('toast');el.textContent=message;el.classList.add('shown');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('shown'),3200);
}
function itemsForYear(y=year){return [...BUILTIN,...db.custom].filter(it=>it.year===y);}
function itemById(id){return BUILTIN.find(it=>it.id===id)||db.custom.find(it=>it.id===id)||null;}
function itemArt(item){
  if(!item) return `<span class="fallback">✳</span>`;
  const placeholder = placeholderHtml(item);
  const src = item.src;
  const allowed = typeof src==='string' && (src.startsWith('assets/') || validUrl(src));
  if (allowed) return `<img src="${safeText(src)}" alt="" loading="lazy" draggable="false" onerror="this.hidden=true;this.insertAdjacentHTML('afterend',decodeURIComponent('${encodeURIComponent(placeholder)}'))">`;
  return item.imageQuery ? `<div class="auto-image-shell" data-autoimg="${safeText(item.id)}">${placeholder}</div>` : placeholder;
}
function selectedIds(){
  const d=getYear();
  return mode==='poster'?d.poster:mode==='tier'?TIERS.flatMap(k=>d.tier[k]):d.bingo.filter(Boolean);
}
function renderYears(){
  const strip=byId('yearStrip');
  strip.innerHTML=years().map(y=>`<button type="button" data-year="${y}" class="year-chip ${year===y?'active':''}" aria-pressed="${year===y}">${y}</button>`).join('');
  byId('decadeSwitch').innerHTML=[1990,2000,2010,2020].map(y=>`<button type="button" class="decade-chip ${Math.floor(year/10)===y/10?'active':''}" data-decade="${y}" aria-pressed="${Math.floor(year/10)===y/10}">${y===1990?'90-е':y===2000?'00-е':y===2010?'10-е':'20-е'}</button>`).join('');
  byId('prevYear').disabled=year===1990;
  byId('nextYear').disabled=year===2025;
  const active=strip.querySelector('.active');
  if(active)strip.scrollLeft=active.offsetLeft-strip.offsetLeft-(strip.clientWidth-active.clientWidth)/2;
}
function renderFilters(){
  const counts={all:itemsForYear().length};
  for(const item of itemsForYear())counts[item.category]=(counts[item.category]||0)+1;
  byId('filters').innerHTML=Object.entries(CATEGORIES).map(([id,label])=>`<button type="button" class="filter ${filter===id?'active':''}" data-filter="${id}" aria-pressed="${filter===id}">${label}<small>${counts[id]||0}</small></button>`).join('');
}
function renderLibrary(){
  const list=itemsForYear();const selected=new Set(selectedIds());
  const searchFiltered=list.filter(item=> (filter==='all'||item.category===filter) && (item.title.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru'))));
  byId('libraryCount').textContent=String(list.length);
  byId('catalog').innerHTML=searchFiltered.length? searchFiltered.map(item=>{
    const isCustom=db.custom.some(it=>it.id===item.id);
    return `<div class="catalog-card ${selected.has(item.id)?'placed':''}" data-add="${safeText(item.id)}" tabindex="0" role="button" aria-label="${safeText(item.title)} — ${selected.has(item.id)?'убрать':'добавить'}" draggable="true" data-drag="${safeText(item.id)}"><div class="catalog-image">${itemArt(item)}</div><div class="catalog-text"><b>${safeText(item.title)}</b><span>${safeText(CATEGORIES[item.category]||'Другое')}</span></div>${isCustom?`<button class="custom-delete" title="Удалить из каталога" data-delete="${safeText(item.id)}" aria-label="Удалить ${safeText(item.title)}">×</button>`:''}<span class="catalog-add">${selected.has(item.id)?'✓':'+'}</span></div>`;
  }).join('') : `<div class="catalog-empty">${list.length?'Ничего не найдено. Попробуй другой запрос.':'Пока пусто. Добавь первый тренд этого года — он появится здесь.'}</div>`;
}
const boardFooter = () => `<div class="board-footer"><b>YEARCORE ✳</b><span>MY INTERNET TIME CAPSULE</span><span>↗ ${year}</span></div>`;
const boardHead = (type='poster')=>{
  const d=getYear();
  const kicker = type==='bingo'?'MY YEAR BINGO':type==='tier'?'PERSONAL TIER RANKING':'THE INTERNET I REMEMBER';
  return `<div class="board-header"><div><div class="board-kicker">${kicker}</div><h2 class="board-year">${year}</h2><div class="board-title">${safeText(d.title)}</div>${d.note?`<p class="board-subtitle">${safeText(d.note)}</p>`:''}</div>${type==='poster'?`<div class="board-seal">THE<br>GOOD<br>OLD WEB</div>`:''}</div>`;
};
function renderPoster(){
  const d=getYear(),count=d.poster.length;
  const cards=d.poster.map((id,index)=>{
    const item=itemById(id);if(!item)return '';
    return `<article class="poster-item" style="--angle:${[-3,3,-1.5,2,-2,1.5][index%6]}deg" draggable="true" data-drag="${safeText(id)}" data-poster-index="${index}"><div class="poster-image">${itemArt(item)}</div><div class="poster-caption"><strong title="${safeText(item.title)}">${safeText(item.title)}</strong><div class="move-controls"><button type="button" data-move="${index}:-1" aria-label="Передвинуть влево">‹</button><button type="button" data-move="${index}:1" aria-label="Передвинуть вправо">›</button></div><button type="button" class="remove-item" data-remove="${safeText(id)}" aria-label="Убрать ${safeText(item.title)}">×</button></div></article>`;
  }).join('');
  return `${boardHead()}${count?`<div class="poster-grid ${count>=7?'dense':''}" data-drop="poster">${cards}</div>`:`<div class="board-empty" data-drop="poster"><span>✳</span><b>Тут пока нет воспоминаний</b><p>Найди в библиотеке что-нибудь культовое<br>и добавь на постер.</p></div>`}${boardFooter()}`;
}
function renderTier(){
  const d=getYear();
  return `<div class="tier-board-head">${boardHead('tier')}<div class="tier-heading">ОТ ЛЕГЕНДАРНОГО К «НУ ТАКОЕ» ↓</div></div><div class="tier-rows">${TIERS.map(rank=>`<div class="tier-row" data-tier="${rank}" data-drop="tier"><div class="tier-label">${rank}</div><div class="tier-items">${d.tier[rank].length?d.tier[rank].map(id=>{
    const item=itemById(id);if(!item)return '';
    return `<div class="tier-item" data-drag="${safeText(id)}" draggable="true">${itemArt(item)}<b title="${safeText(item.title)}">${safeText(item.title)}</b><select class="tier-select" data-set-tier="${safeText(id)}" aria-label="Уровень ${safeText(item.title)}">${TIERS.map(t=>`<option value="${t}" ${t===rank?'selected':''}>${t}</option>`).join('')}</select><button type="button" class="remove-item" data-remove="${safeText(id)}" aria-label="Убрать ${safeText(item.title)}">×</button></div>`;
  }).join(''):`<span class="tier-hint">Перетащи сюда</span>`}</div></div>`).join('')}</div>${boardFooter()}`;
}
function renderBingo(){
  const d=getYear(),size=Number(d.bingoSize),total=size*size;
  return `<div class="bingo-board-head"><div class="board-kicker">MY PERSONAL INTERNET BINGO</div><h2 class="board-year">${year}</h2><div class="board-title" style="margin:0 auto">${safeText(d.title)}</div>${d.note?`<p class="board-subtitle">${safeText(d.note)}</p>`:''}</div><div class="bingo-grid" style="--size:${size}" data-drop="bingo">${Array.from({length:total},(_,i)=>{
    const id=d.bingo[i];const item=id?itemById(id):null;
    return `<div class="bingo-tile ${item?'filled':''} ${d.marked.includes(i)?'marked':''}" data-slot="${i}" ${item?`draggable="true" data-drag="${safeText(id)}"`:''} tabindex="0" role="button" aria-label="${item?safeText(item.title):'Пустая клетка'}">${item?`${itemArt(item)}<b title="${safeText(item.title)}">${safeText(item.title)}</b><button type="button" class="remove-item" data-remove="${safeText(id)}" title="Убрать">×</button>`:'+'}</div>`;
  }).join('')}</div><p class="bingo-help">Нажми на заполненную клетку, чтобы отметить её галочкой. Перетаскивай тренды между клетками.</p>${boardFooter()}`;
}
function renderBoard(){
  const fn={poster:renderPoster,tier:renderTier,bingo:renderBingo}[mode];
  byId('board').innerHTML=fn();
  const count=selectedIds().length;
  byId('boardStatus').textContent=`${count} ${count===1?'воспоминание':count>=2&&count<=4?'воспоминания':'воспоминаний'} в ${year} году`;
}
function renderControls(){
  const d=getYear();
  byId('boardTitle').value=d.title;
  byId('boardNote').value=d.note;
  byId('saveYear').textContent=String(year);
  byId('bingoSize').value=String(d.bingoSize);
  byId('bingoOptions').hidden=mode!=='bingo';
  const help={poster:'Постер — личный коллаж года. Перетаскивай картинки, чтобы изменить порядок.',tier:'Тир-лист — добавляй карточки в S, затем перетаскивай их в A–D или используй селектор на карточке.',bingo:'Бинго — заполняй клетки из каталога. Нажатие отмечает уже заполненную клетку. Размер сетки можно изменить.'};
  byId('modeHelp').textContent=help[mode];
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
}
function renderAll(){renderYears();renderFilters();renderLibrary();renderBoard();renderControls();hydrateAutoImages(byId('catalog'));hydrateAutoImages(byId('board'));}
function setYear(y){
  if(!canYear(y))return;
  year=y; filter='all';search='';byId('search').value='';
  getYear();save();updateHash();renderAll();
}
function setMode(m){
  if(!['poster','tier','bingo'].includes(m))return;
  mode=m;updateHash();renderLibrary();renderBoard();renderControls();
}
function updateHash(){ history.replaceState(null,'',`#${year}/${mode}`); }
function addItem(id,target=null){
  const item=itemById(id);if(!item || item.year!==year)return;
  const d=getYear();
  if(mode==='poster'){
    if(d.poster.includes(id)) {d.poster=d.poster.filter(x=>x!==id);} else d.poster.push(id);
  } else if(mode==='tier'){
    const old=TIERS.find(t=>d.tier[t].includes(id));
    if(old && !target){d.tier[old]=d.tier[old].filter(x=>x!==id)}
    else {for(const t of TIERS)d.tier[t]=d.tier[t].filter(x=>x!==id);d.tier[target||'S'].push(id)}
  } else {
    const index=d.bingo.indexOf(id);
    if(index>=0 && target===null) {d.bingo[index]=null;d.marked=d.marked.filter(x=>x!==index);}
    else {
      if(index>=0)d.bingo[index]=null;
      const slot=target===null?d.bingo.slice(0,d.bingoSize*d.bingoSize).indexOf(null):target;
      if(slot<0){if(index>=0)d.bingo[index]=id;else toast('Все клетки заняты — освободи одну.');return;}
      d.bingo[slot]=id;d.marked=d.marked.filter(x=>x!==slot);
    }
  }
  save();renderLibrary();renderBoard();
}
function removeItem(id){
  const d=getYear();
  if(mode==='poster')d.poster=d.poster.filter(x=>x!==id);
  else if(mode==='tier')for(const t of TIERS)d.tier[t]=d.tier[t].filter(x=>x!==id);
  else {const i=d.bingo.indexOf(id);if(i>=0){d.bingo[i]=null;d.marked=d.marked.filter(x=>x!==i)}}
  save();renderLibrary();renderBoard();
}
function movePoster(from,offset){
  const a=getYear().poster, to=from+offset;
  if(from<0||from>=a.length||to<0||to>=a.length)return;
  [a[from],a[to]]=[a[to],a[from]];save();renderBoard();
}
function moveTier(id,rank){
  if(!TIERS.includes(rank))return;
  const d=getYear();for(const r of TIERS)d.tier[r]=d.tier[r].filter(x=>x!==id);
  d.tier[rank].push(id);save();renderBoard();renderLibrary();
}
function placeDrop(id,target,after=null){
  if(!id||!itemById(id)||itemById(id).year!==year)return;
  const d=getYear();
  if(mode==='tier' && TIERS.includes(target)){
    for(const t of TIERS)d.tier[t]=d.tier[t].filter(x=>x!==id);
    d.tier[target].push(id);
  } else if(mode==='poster' && target==='poster'){
    d.poster=d.poster.filter(x=>x!==id);
    const afterIndex=after===null?-1:d.poster.indexOf(after);
    if(afterIndex<0)d.poster.push(id);
    else d.poster.splice(afterIndex,0,id);
  } else if(mode==='bingo' && target==='bingo'){
    let index=Number(after);
    if(!Number.isInteger(index)||index<0||index>=d.bingoSize*d.bingoSize) index=d.bingo.slice(0,d.bingoSize*d.bingoSize).indexOf(null);
    if(index<0)return toast('Все клетки заняты.');
    const old=d.bingo.indexOf(id),previous=d.bingo[index];
    if(old>=0)d.bingo[old]=previous||null;
    d.bingo[index]=id;
    d.marked=d.marked.filter(i=>i!==index && i!==old);
  } else return;
  save();renderLibrary();renderBoard();
}
function shuffle(){
  const d=getYear();
  const shuffleArray=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}};
  if(mode==='poster')shuffleArray(d.poster);
  else if(mode==='bingo') {const current=d.bingo.slice(0,d.bingoSize*d.bingoSize);shuffleArray(current);d.bingo.splice(0,current.length,...current);d.marked=[];}
  else{const all=TIERS.flatMap(t=>d.tier[t]);shuffleArray(all);for(const t of TIERS)d.tier[t]=[];all.forEach((id,i)=>d.tier[TIERS[i%TIERS.length]].push(id));}
  save();renderBoard();renderLibrary();toast('Перемешано!');
}
function clearMode(){
  if(!confirm(`Очистить ${mode==='poster'?'постер':mode==='tier'?'тир-лист':'бинго'} за ${year} год?`))return;
  const d=getYear();
  if(mode==='poster')d.poster=[];
  else if(mode==='tier')for(const t of TIERS)d.tier[t]=[];
  else {d.bingo=Array(25).fill(null);d.marked=[];}
  save();renderBoard();renderLibrary();toast('Поле очищено');
}
function deleteCustom(id){
  if(!confirm('Удалить этот артефакт из каталога и всех подборок?'))return;
  db.custom=db.custom.filter(i=>i.id!==id);
  for(const d of Object.values(db.years)){
    if(Array.isArray(d.poster))d.poster=d.poster.filter(x=>x!==id);
    if(d.tier)for(const t of TIERS)if(Array.isArray(d.tier[t]))d.tier[t]=d.tier[t].filter(x=>x!==id);
    if(Array.isArray(d.bingo))d.bingo=d.bingo.map(x=>x===id?null:x);
  }
  save();renderLibrary();renderBoard();
}

/* Image files are downscaled and compressed, so localStorage remains usable. */
async function optimizeImage(file){
  if(!file) return '';
  if(file.size>12*1024*1024)throw Error('Максимальный размер изображения — 12 МБ.');
  const temp=URL.createObjectURL(file);
  try {
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Не получилось открыть изображение.'));im.src=temp;});
    const max=550,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
    const ctx=c.getContext('2d');ctx.fillStyle='#f7f6f2';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    return c.toDataURL('image/webp',.75);
  } finally {URL.revokeObjectURL(temp)}
}
async function submitItem(e){
  e.preventDefault();
  const title=byId('itemTitle').value.trim(),category=byId('itemCategory').value;
  const file=byId('itemUpload').files?.[0],remote=byId('itemUrl').value.trim();
  byId('formError').textContent='';
  if(!title || !Object.hasOwn(CATEGORIES,category)||category==='all')return;
  if(remote && !/^https:\/\//i.test(remote))return byId('formError').textContent='Используй ссылку с HTTPS.';
  try {
    const src=file?await optimizeImage(file):remote;
    const id=`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    db.custom.push({id,year,title,category,src:src||'',emoji:'✳'});
    if(!save()){db.custom.pop();return;}
    byId('itemDialog').close();byId('itemForm').reset();
    search='';filter='all';byId('search').value='';
    renderFilters();renderLibrary();
    addItem(id);toast('Добавлено в каталог и на поле!');
  }catch(err){byId('formError').textContent=String(err.message||err);}
}

/* Export JSON includes all custom assets, titles, years, and layouts. */
function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob);const link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportAll(){downloadBlob(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),'yearcore-backup.json');toast('Все годы сохранены в JSON');}
function exportYear(){
  const d=getYear();const selectedCustom=db.custom.filter(i=>i.year===year);
  const snapshot={version:1,years:{[year]:d},custom:selectedCustom};
  downloadBlob(new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'}),`yearcore-${year}.json`);
  toast('Подборка года сохранена');
}
function validImported(d){
  if(!d||d.version!==1||!d.years||typeof d.years!=='object'||!Array.isArray(d.custom)||d.custom.length>500)return false;
  for(const [y,obj] of Object.entries(d.years)){
    if(!canYear(Number(y))||!obj||typeof obj!=='object'||!Array.isArray(obj.poster)||!obj.tier||!Array.isArray(obj.bingo))return false;
  }
  for(const c of d.custom){if(!c||typeof c.id!=='string'||!c.id.startsWith('custom-')||!canYear(Number(c.year))||typeof c.title!=='string'||c.title.length>150||!(c.category in CATEGORIES))return false;}
  return true;
}
async function importYear(e){
  const file=e.target.files?.[0];if(!file)return;
  try {
    if(file.size>8*1024*1024)throw Error('Слишком большой JSON-файл (максимум 8 МБ).');
    const imported=JSON.parse(await file.text());
    if(!validImported(imported))throw Error('Это не корректный файл YEARCORE.');
    if(!confirm('Импортировать данные? Совпадающие годы будут заменены, остальные останутся без изменений.'))return;
    for(const [y,d] of Object.entries(imported.years))db.years[y]=d;
    const newIds=new Set(imported.custom.map(c=>c.id));db.custom=db.custom.filter(c=>!newIds.has(c.id)).concat(imported.custom.map(c=>({...c,src:validUrl(c.src)?c.src:''})));
    save();renderAll();toast('Импортировано успешно');
  } catch(err){toast(err.message||'Ошибка импорта файла');}
  finally{e.target.value='';}
}

/* Deterministic Canvas 2D renderer, no third-party CDN / html2canvas dependency. */
const waitImg = src => new Promise(resolve=>{
  if(!src || !(src.startsWith('assets/')||validUrl(src)))return resolve(null);
  const im=new Image();
  if(/^https:\/\//.test(src))im.crossOrigin='anonymous';
  im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src;
  setTimeout(()=>resolve(null),6500);
});
function paintText(ctx,value,x,y,size=20,color='#1c1d1a',weight=700,align='left'){
  ctx.font=`${weight} ${size}px Arial, sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;
  ctx.fillText(String(value),x,y);
}
function clippedText(ctx,text,x,y,maxWidth,fontSize=20,color='#1c1d1a',align='left'){
  ctx.font=`700 ${fontSize}px Arial,sans-serif`;let s=String(text);
  while(ctx.measureText(s).width>maxWidth&&s.length>2)s=s.slice(0,-2)+'…';
  paintText(ctx,s,x,y,fontSize,color,700,align);
}
function rect(ctx,x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function contain(ctx,im,x,y,w,h){
  if(!im)return;
  const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
  const s=Math.min(w/iw,h/ih),a=iw*s,b=ih*s;
  ctx.drawImage(im,x+(w-a)/2,y+(h-b)/2,a,b);
}
function drawFallbackThumb(ctx,item,x,y,w,h,compact=false){
  const grad = ctx.createLinearGradient(x,y,x+w,y+h);
  grad.addColorStop(0,'#eef1f7');
  grad.addColorStop(1,'#cfdaf0');
  rect(ctx,x,y,w,h,grad,compact?2:3);
  ctx.strokeStyle='#d9dfe9';
  ctx.lineWidth=1;
  ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  // No generic “PHOTO” badge: the artwork or title identifies the card.
  const max = compact ? 18 : 40;
  let text = String(item?.title || '');
  if (compact) {
    clippedText(ctx,text,x+w/2,y+h-10,w-10,Math.max(10,Math.min(12,w/10)),'#27303b','center');
  } else {
    ctx.font=`800 ${Math.max(14, Math.min(18, w/16))}px Arial, sans-serif`;
    ctx.fillStyle='#25303a';
    ctx.textAlign='left';
    const words=text.split(/\s+/); let line=''; let yy=y+h/2;
    const lines=[];
    for(const word of words){
      const trial = line ? line+' '+word : word;
      if(ctx.measureText(trial).width > w-26 && line){ lines.push(line); line=word; if(lines.length===2) break; }
      else line=trial;
    }
    if(line && lines.length<2) lines.push(line);
    for(const ln of lines.slice(0,2)) { ctx.fillText(ln,x+13,yy); yy += 19; }
  }
}
async function renderCanvas(){
  const d=getYear();const W=1200;
  let H=1500;
  const layout=[];
  if(mode==='poster'){
    const count=d.poster.length,cols=count>6?3:2,cardW=(W-120-26*(cols-1))/cols;
    const cardH=count>6?275:365,rows=Math.ceil(count/cols);
    H=Math.max(1240,380+rows*(cardH+26));
    d.poster.forEach((id,i)=>layout.push({id,x:60+(i%cols)*(cardW+26),y:280+Math.floor(i/cols)*(cardH+26),w:cardW,h:cardH}));
  } else if(mode==='tier'){
    let y=275;
    for(const t of TIERS){const list=d.tier[t],rows=Math.max(1,Math.ceil(list.length/8));const height=rows*133+18;
      layout.push({tier:t,x:60,y,w:1080,h:height});y+=height;}
    H=Math.max(1250,y+100);
  } else {
    const size=d.bingoSize,step=1065/size;
    H=270+step*size+145;
    for(let i=0;i<size*size;i++)layout.push({id:d.bingo[i],slot:i,x:67+(i%size)*step,y:265+Math.floor(i/size)*step,w:step-5,h:step-5});
  }
  const idsToPrefetch = [...new Set(layout.map(entry => entry.id).filter(Boolean))];
  if (idsToPrefetch.length) await Promise.all(idsToPrefetch.map(id => ensureItemImage(itemById(id))));
  H=Math.min(12000,H);
  const cnv=document.createElement('canvas');cnv.width=W;cnv.height=H;
  const ctx=cnv.getContext('2d');rect(ctx,0,0,W,H,'#eeece6');
  if(mode==='poster'){
    paintText(ctx,'THE INTERNET I REMEMBER',65,57,19,'#78746b',800);
    paintText(ctx,year,57,218,193,'#1c1d1a',800);
    rect(ctx,1003,56,127,127,'#f2643d',64);paintText(ctx,'THE GOOD',1067,101,18,'#1c1d1a',800,'center');paintText(ctx,'OLD WEB',1067,126,20,'#1c1d1a',800,'center');
    clippedText(ctx,d.title,65,256,740,24,'#5a574f');
    if(d.note)clippedText(ctx,d.note,65,279,850,16,'#817d74');
    const imgs=await Promise.all(layout.map(it=>waitImg(itemById(it.id)?.src)));
    layout.forEach((lay,i)=>{
      const item=itemById(lay.id),img=imgs[i];if(!item)return;
      ctx.save();ctx.translate(lay.x+lay.w/2,lay.y+lay.h/2);ctx.rotate(([-2,2,-1,1.5][i%4]*Math.PI)/180);
      ctx.shadowColor='#00000024';ctx.shadowBlur=13;ctx.shadowOffsetY=10;
      rect(ctx,-lay.w/2,-lay.h/2,lay.w,lay.h,'#fff',3);ctx.shadowColor='transparent';
      rect(ctx,-lay.w/2+9,-lay.h/2+9,lay.w-18,lay.h-55,'#efede7',2);
      contain(ctx,img,-lay.w/2+12,-lay.h/2+12,lay.w-24,lay.h-63);
      if(!img)drawFallbackThumb(ctx,item,-lay.w/2+12,-lay.h/2+12,lay.w-24,lay.h-63,false);
      clippedText(ctx,item.title,-lay.w/2+16,lay.h/2-16,lay.w-35,19);
      ctx.restore();
    });
  } else if(mode==='tier'){
    paintText(ctx,'PERSONAL INTERNET TIER LIST',60,57,19,'#77746c',800);
    paintText(ctx,year,55,220,160,'#1b1c1a',800);
    clippedText(ctx,d.title,700,150,440,30,'#575249','left');
    for(const row of layout){
      rect(ctx,row.x,row.y,row.w,row.h,'#22221e');rect(ctx,row.x+3,row.y+3,145,row.h-6,RANK_COLORS[row.tier]);
      paintText(ctx,row.tier,row.x+76,row.y+row.h/2+22,71,'#1c1d1a',800,'center');
      rect(ctx,row.x+151,row.y+3,row.w-154,row.h-6,'#faf9f6');
      const cellW=112,cellH=119;
      for(let i=0;i<d.tier[row.tier].length;i++){
        const id=d.tier[row.tier][i],item=itemById(id);if(!item)continue;
        const img=await waitImg(item.src),x=row.x+163+(i%8)*116,y=row.y+9+Math.floor(i/8)*133;
        rect(ctx,x,y,108,114,'#eeece6',3);
        contain(ctx,img,x+4,y+4,100,84);
        if(!img)drawFallbackThumb(ctx,item,x+4,y+4,100,84,true);
        clippedText(ctx,item.title,x+4,y+105,101,12);
      }
    }
  } else {
    paintText(ctx,'MY PERSONAL INTERNET BINGO',W/2,55,20,'#77746c',800,'center');
    paintText(ctx,year,W/2,206,164,'#1c1d1a',800,'center');
    clippedText(ctx,d.title,W/2,245,850,21,'#5d594f','center');
    const imgs=await Promise.all(layout.map(it=>waitImg(itemById(it.id)?.src)));
    layout.forEach((lay,i)=>{
      const item=itemById(lay.id),im=imgs[i];
      rect(ctx,lay.x,lay.y,lay.w,lay.h,'#fff');
      if(item){contain(ctx,im,lay.x+8,lay.y+8,lay.w-16,lay.h-34);
        if(!im)drawFallbackThumb(ctx,item,lay.x+8,lay.y+8,lay.w-16,lay.h-34,true);
        clippedText(ctx,item.title,lay.x+lay.w/2,lay.y+lay.h-10,lay.w-12,Math.max(11,Math.min(15,lay.w/10)),'#1c1d1a','center');
        if(d.marked.includes(lay.slot)){ctx.fillStyle='#b9db8fa8';ctx.fillRect(lay.x,lay.y,lay.w,lay.h);paintText(ctx,'✓',lay.x+lay.w/2,lay.y+lay.h/2+29,80,'#2b5e31',800,'center');}
      }else paintText(ctx,'+',lay.x+lay.w/2,lay.y+lay.h/2+17,49,'#d0cbc2',700,'center');
    });
  }
  ctx.fillStyle='#d0ccc4';ctx.fillRect(60,H-65,W-120,1);
  paintText(ctx,'YEARCORE ✳',65,H-33,20,'#1b1c1a',800);
  paintText(ctx,'MY INTERNET TIME CAPSULE  /  '+year,W-65,H-33,17,'#77746c',800,'right');
  return cnv;
}
async function exportPng(){
  const button=byId('exportPng'),old=button.innerHTML;
  button.disabled=true;button.textContent='Готовим PNG…';
  try{
    const cnv=await renderCanvas();
    const blob=await new Promise((resolve,reject)=>cnv.toBlob(b=>b?resolve(b):reject(Error('Canvas export failed')),'image/png'));
    downloadBlob(blob,`yearcore-${year}-${mode}.png`);
    toast('PNG сохранён');
  }catch(e){console.error(e);toast('Не удалось экспортировать PNG. Попробуй убрать внешние картинки.');}
  finally{button.disabled=false;button.innerHTML=old;}
}

function installEvents(){
  byId('prevYear').addEventListener('click',()=>setYear(Math.max(1990,year-1)));
  byId('nextYear').addEventListener('click',()=>setYear(Math.min(2025,year+1)));
  byId('yearStrip').addEventListener('click',e=>{const b=e.target.closest('[data-year]');if(b)setYear(Number(b.dataset.year));});
  byId('decadeSwitch').addEventListener('click',e=>{const b=e.target.closest('[data-decade]');if(b)setYear(Number(b.dataset.decade));});
  byId('modes').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode);});
  byId('filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;renderFilters();renderLibrary();});
  byId('search').addEventListener('input',e=>{search=e.target.value;renderLibrary();});
  byId('catalog').addEventListener('click',e=>{
    const del=e.target.closest('[data-delete]');if(del){e.stopPropagation();deleteCustom(del.dataset.delete);return;}
    const card=e.target.closest('[data-add]');if(card)addItem(card.dataset.add);
  });
  byId('catalog').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ') && e.target.matches('.catalog-card')){e.preventDefault();addItem(e.target.dataset.add);}});
  byId('board').addEventListener('click',e=>{
    const remove=e.target.closest('[data-remove]');if(remove){e.stopPropagation();removeItem(remove.dataset.remove);return;}
    const move=e.target.closest('[data-move]');if(move){const [from,offset]=move.dataset.move.split(':').map(Number);movePoster(from,offset);return;}
    const tile=e.target.closest('[data-slot]');if(tile && mode==='bingo'){
      const i=Number(tile.dataset.slot),d=getYear();
      if(d.bingo[i]){d.marked=d.marked.includes(i)?d.marked.filter(v=>v!==i):[...d.marked,i];save();renderBoard();}
      else toast('Добавь тренд из библиотеки слева');
    }
  });
  byId('board').addEventListener('keydown',e=>{if(e.target.matches('[data-slot]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.target.click();}});
  byId('board').addEventListener('change',e=>{const t=e.target.closest('[data-set-tier]');if(t)moveTier(t.dataset.setTier,t.value);});
  document.addEventListener('dragstart',e=>{
    const el=e.target.closest('[data-drag]');if(!el)return;
    dragId=el.dataset.drag;
    if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);}
    el.classList.add('dragging');
  });
  document.addEventListener('dragend',()=>{dragId=null;document.querySelectorAll('.dragging,.dragover').forEach(e=>e.classList.remove('dragging','dragover'));});
  byId('board').addEventListener('dragover',e=>{
    const el=e.target.closest('[data-drop]');if(!el)return;e.preventDefault();e.dataTransfer.dropEffect='move';el.classList.add('dragover');
  });
  byId('board').addEventListener('dragleave',e=>{const el=e.target.closest('[data-drop]');if(el && !el.contains(e.relatedTarget))el.classList.remove('dragover');});
  byId('board').addEventListener('drop',e=>{
    e.preventDefault();
    const id=e.dataTransfer.getData('text/plain')||dragId;
    if(mode==='poster')placeDrop(id,'poster',e.target.closest('[data-poster-index]')?.dataset.drag||null);
    else if(mode==='tier')placeDrop(id,e.target.closest('[data-tier]')?.dataset.tier||'');
    else if(mode==='bingo')placeDrop(id,'bingo',e.target.closest('[data-slot]')?.dataset.slot??null);
    document.querySelectorAll('.dragover').forEach(el=>el.classList.remove('dragover'));
  });
  byId('boardTitle').addEventListener('input',e=>{getYear().title=e.target.value;save();renderBoard();});
  byId('boardNote').addEventListener('input',e=>{getYear().note=e.target.value;save();renderBoard();});
  byId('bingoSize').addEventListener('change',e=>{getYear().bingoSize=Number(e.target.value);save();renderBoard();});
  byId('shuffleButton').addEventListener('click',shuffle);
  byId('clearButton').addEventListener('click',clearMode);
  byId('addButton').addEventListener('click',()=>byId('itemDialog').showModal());
  byId('addCustomBottom').addEventListener('click',()=>byId('itemDialog').showModal());
  byId('itemForm').addEventListener('submit',submitItem);
  byId('howButton').addEventListener('click',()=>byId('helpDialog').showModal());
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>byId(btn.dataset.close).close()));
  byId('exportPng').addEventListener('click',exportPng);
  byId('exportJson').addEventListener('click',exportYear);
  byId('backupButton').addEventListener('click',exportAll);
  byId('importJson').addEventListener('click',()=>byId('importFile').click());
  byId('importFile').addEventListener('change',importYear);
  document.querySelectorAll('[data-mobile-target]').forEach(button=>button.addEventListener('click',()=>{
    const el=byId(button.dataset.mobileTarget);
    if(el)el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    document.querySelectorAll('[data-mobile-target]').forEach(b=>b.classList.toggle('active',b===button));
  }));
  window.addEventListener('hashchange',()=>{const m=location.hash.match(/^#(\d{4})\/(poster|tier|bingo)$/);if(m && canYear(Number(m[1]))){year=Number(m[1]);mode=m[2];renderAll();}});
}
getYear();installEvents();renderAll();updateHash();
