
const radiusOptions = [300, 500, 800, 1200, 2000];
const presetPoints = [
  { label:'京都市役所前', lat:35.011564, lng:135.768149 },
  { label:'四条烏丸', lat:35.003729, lng:135.759454 },
  { label:'京都駅', lat:34.985849, lng:135.758766 },
  { label:'祇園四条', lat:35.003708, lng:135.772691 },
  { label:'出町柳', lat:35.029004, lng:135.772104 }
];
const state = { radius: 500, userLat: null, userLng: null, search: '', sortMode: 'distance', exhibitions: [] };
const el = {
  radiusChips: document.getElementById('radiusChips'),
  sortChips: document.getElementById('sortChips'),
  list: document.getElementById('list'),
  status: document.getElementById('status'),
  countStat: document.getElementById('countStat'),
  nearestStat: document.getElementById('nearestStat'),
  radiusStat: document.getElementById('radiusStat'),
  verifiedStat: document.getElementById('verifiedStat'),
  modeStat: document.getElementById('modeStat'),
  subInfo: document.getElementById('subInfo'),
  searchInput: document.getElementById('searchInput'),
  secureNotice: document.getElementById('secureNotice'),
  presetButtons: document.getElementById('presetButtons'),
  latInput: document.getElementById('latInput'),
  lngInput: document.getElementById('lngInput'),
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function setStatus(msg, kind='info'){ el.status.className=`status ${kind}`; el.status.textContent=msg; }
function formatDistance(m){ if (m == null) return '—'; return m < 1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(2)}km`; }
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeRegex(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function highlight(text, q){
  const safe = escapeHtml(text ?? '');
  if (!q) return safe;
  const re = new RegExp(`(${escapeRegex(q)})`, 'ig');
  return safe.replace(re, '<mark class="hl">$1</mark>');
}
function calcRelevance(item, q){
  const query = q.toLowerCase();
  let score = 0;
  const fields = [
    ['id', item.id, 4],
    ['no', item.no, 6],
    ['title', item.title, 8],
    ['officialTitle', item.officialTitle, 7],
    ['venue', item.venue, 5],
    ['addressNormalized', item.addressNormalized, 3],
    ['addressOfficial', item.addressOfficial, 2],
  ];
  fields.forEach(([_, value, weight]) => {
    const s = String(value ?? '').toLowerCase();
    if (!s) return;
    if (s === query) score += weight * 10;
    else if (s.startsWith(query)) score += weight * 6;
    else if (s.includes(query)) score += weight * 3;
  });
  return score;
}
function buildRadiusChips(){
  el.radiusChips.innerHTML='';
  radiusOptions.forEach(r=>{
    const chip=document.createElement('button');
    chip.className=`chip ${state.radius===r?'active':''}`;
    chip.textContent=`${r}m`;
    chip.addEventListener('click',()=>{ state.radius=r; buildRadiusChips(); render(); });
    el.radiusChips.appendChild(chip);
  });
  el.radiusStat.textContent=`${state.radius}m`;
}
function buildSortChips(){
  const modes = [
    ['distance', '距離順'],
    ['relevance', '関連度順']
  ];
  el.sortChips.innerHTML='';
  modes.forEach(([value,label])=>{
    const chip=document.createElement('button');
    chip.className=`chip ${state.sortMode===value?'active':''}`;
    chip.textContent=label;
    chip.addEventListener('click',()=>{ state.sortMode=value; buildSortChips(); render(); });
    el.sortChips.appendChild(chip);
  });
}
function buildPresetButtons(){
  presetPoints.forEach(p=>{
    const btn=document.createElement('button');
    btn.className='ghost';
    btn.textContent=p.label;
    btn.addEventListener('click',()=>applyLocation(p.lat,p.lng,p.label));
    el.presetButtons.appendChild(btn);
  });
}
function filteredResults(){
  const q = state.search.trim();
  const hasLocation = state.userLat != null && state.userLng != null;

  let items = state.exhibitions.map(item => {
    const distance = hasLocation ? haversine(state.userLat, state.userLng, item.lat, item.lng) : null;
    const relevance = q ? calcRelevance(item, q) : 0;
    return { ...item, distance, relevance };
  });

  if (q) {
    items = items.filter(item =>
      [item.id, item.no, item.title, item.officialTitle, item.venue, item.addressNormalized, item.addressOfficial]
        .some(v => String(v ?? '').toLowerCase().includes(q.toLowerCase()))
    );
    if (state.sortMode === 'relevance') {
      items.sort((a,b) => (b.relevance - a.relevance) || ((a.distance ?? 1e12) - (b.distance ?? 1e12)));
    } else {
      items.sort((a,b) => ((a.distance ?? 1e12) - (b.distance ?? 1e12)) || (b.relevance - a.relevance));
    }
    return items;
  }

  if (!hasLocation) return [];
  items = items.filter(item => item.distance <= state.radius)
               .sort((a,b)=>a.distance-b.distance);
  return items;
}
function render(){
  const results = filteredResults();
  const verifiedCount = state.exhibitions.filter(x=>x.verificationStatus==='verified').length;
  const hasQuery = !!state.search.trim();
  el.countStat.textContent = results.length;
  el.nearestStat.textContent = results[0] ? results[0].no : '-';
  el.verifiedStat.textContent = `${verifiedCount}/${state.exhibitions.length}`;
  el.modeStat.textContent = hasQuery ? 'キーワード' : '距離';

  if (hasQuery) {
    el.subInfo.textContent = `キーワード検索中（距離制限なし） / 並び順: ${state.sortMode === 'relevance' ? '関連度順' : '距離順'}`;
  } else if (state.userLat != null && state.userLng != null) {
    el.subInfo.textContent = `検索地点: ${state.userLat.toFixed(6)}, ${state.userLng.toFixed(6)}`;
  } else {
    el.subInfo.textContent = '地点未設定';
  }

  if (!hasQuery && (state.userLat == null || state.userLng == null)) {
    el.list.innerHTML='<div class="empty">まず現在地を取得するか、地点ボタンまたは手動入力で検索地点を設定してください。人名などを入力すれば、距離制限なしの検索もできます。</div>';
    return;
  }
  if (!results.length) {
    el.list.innerHTML='<div class="empty">条件に一致する展示がありません。検索語、並び順、半径を見直してください。</div>';
    return;
  }

  const q = state.search.trim();
  el.list.innerHTML = results.map(item=>{
    const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}&travelmode=walking`;
    const official = item.addressOfficial && item.addressOfficial !== item.addressNormalized
      ? `<div class="address official">official: ${highlight(item.addressOfficial, q)}</div>` : '';
    const officialTitle = item.officialTitle && item.officialTitle !== item.title
      ? `<div class="subtitle">official: ${highlight(item.officialTitle, q)}</div>` : '';
    const distancePill = `<span class="pill">${formatDistance(item.distance)}</span>`;
    const relevancePill = hasQuery ? `<span class="pill">score ${item.relevance}</span>` : '';
    return `
      <article class="card">
        <div class="topline">
          <div class="badge">${highlight(item.no, q)}</div>
          <div class="distance">${formatDistance(item.distance)}</div>
        </div>
        <h3 class="title">${highlight(item.title, q)}</h3>
        ${officialTitle}
        <div class="venue">${highlight(item.venue, q)}</div>
        <div class="address">${highlight(item.addressNormalized, q)}</div>
        ${official}
        <div class="meta">
          <span class="pill verified">verified</span>
          <span class="pill">${highlight(item.id, q)}</span>
          ${distancePill}
          ${relevancePill}
        </div>
        <div class="links">
          <a href="${mapLink}" target="_blank" rel="noreferrer"><button class="primary">Googleマップで行く</button></a>
          <a href="${item.detailUrl}" target="_blank" rel="noreferrer"><button class="ghost">公式詳細</button></a>
        </div>
      </article>
    `;
  }).join('');
}
function applyLocation(lat,lng,label='現在地'){
  state.userLat=Number(lat); state.userLng=Number(lng);
  el.latInput.value=state.userLat.toFixed(6); el.lngInput.value=state.userLng.toFixed(6);
  setStatus(`${label}を設定しました。${state.search.trim() ? 'キーワード検索は距離制限なしで表示します。' : `半径 ${state.radius}m 以内の展示を表示しています。`}`,'ok');
  render();
}
function requestLocation(){
  if (!navigator.geolocation) return setStatus('このブラウザは位置情報に対応していません。','info');
  if (!window.isSecureContext) return setStatus('現在地取得にはHTTPSで開く必要があります。GitHub Pages / Netlify などで公開してください。','info');
  setStatus('現在地を取得しています…');
  navigator.geolocation.getCurrentPosition(
    pos=>applyLocation(pos.coords.latitude,pos.coords.longitude),
    err=>{ let msg='現在地を取得できませんでした。'; if(err.code===1) msg+=' 位置情報の許可がオフです。'; if(err.code===2) msg+=' 位置情報が利用できません。'; if(err.code===3) msg+=' タイムアウトしました。'; setStatus(msg,'info'); },
    {enableHighAccuracy:true, timeout:10000, maximumAge:60000}
  );
}
async function init(){
  try{
    const res = await fetch('./data.json');
    if(!res.ok) throw new Error('data.json load failed');
    state.exhibitions = await res.json();
    buildRadiusChips(); buildSortChips(); buildPresetButtons();
    document.getElementById('locateBtn').addEventListener('click', requestLocation);
    document.getElementById('demoBtn').addEventListener('click', ()=>applyLocation(35.011564,135.768149,'デモ位置（京都市役所前）'));
    document.getElementById('applyManualBtn').addEventListener('click', ()=>{
      const lat=parseFloat(el.latInput.value), lng=parseFloat(el.lngInput.value);
      if(Number.isFinite(lat)&&Number.isFinite(lng)) applyLocation(lat,lng,'手動地点');
      else setStatus('緯度経度を正しく入力してください。','info');
    });
    el.searchInput.addEventListener('input', e=>{ state.search=e.target.value; render(); });
    document.getElementById('clearSearch').addEventListener('click', ()=>{ state.search=''; el.searchInput.value=''; render(); });
    if (!window.isSecureContext) {
      el.secureNotice.style.display='block';
      el.secureNotice.innerHTML='現在地取得は <strong>HTTPS環境</strong> でのみ動きます。ローカルファイルではなく、<strong>GitHub Pages / Netlify / Vercel</strong> などに置いてください。';
    }
    render();
  }catch(e){
    console.error(e);
    setStatus('データ読込に失敗しました。ファイル一式を同じ階層で公開してください。','info');
  }
}
init();
