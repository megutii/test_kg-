const radiusOptions = [300, 500, 800, 1200, 2000];
const presetPoints = [
  { label:'京都市役所前', lat:35.011564, lng:135.768149 },
  { label:'四条烏丸', lat:35.003729, lng:135.759454 },
  { label:'京都駅', lat:34.985849, lng:135.758766 },
  { label:'祇園四条', lat:35.003708, lng:135.772691 },
  { label:'出町柳', lat:35.029004, lng:135.772104 }
];

const state = { radius: 500, userLat: null, userLng: null, search: '', statusFilter: 'all', exhibitions: [] };

const el = {
  radiusChips: document.getElementById('radiusChips'),
  list: document.getElementById('list'),
  status: document.getElementById('status'),
  countStat: document.getElementById('countStat'),
  nearestStat: document.getElementById('nearestStat'),
  radiusStat: document.getElementById('radiusStat'),
  verifiedStat: document.getElementById('verifiedStat'),
  subInfo: document.getElementById('subInfo'),
  searchInput: document.getElementById('searchInput'),
  secureNotice: document.getElementById('secureNotice'),
  presetButtons: document.getElementById('presetButtons'),
  latInput: document.getElementById('latInput'),
  lngInput: document.getElementById('lngInput'),
  verificationChips: document.getElementById('verificationChips')
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function setStatus(msg, kind='info') {
  el.status.className = `status ${kind}`;
  el.status.textContent = msg;
}
function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m/1000).toFixed(2)}km`;
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function buildRadiusChips() {
  el.radiusChips.innerHTML = '';
  radiusOptions.forEach((r) => {
    const chip = document.createElement('button');
    chip.className = `chip ${state.radius === r ? 'active' : ''}`;
    chip.textContent = `${r}m`;
    chip.addEventListener('click', () => {
      state.radius = r;
      buildRadiusChips();
      render();
    });
    el.radiusChips.appendChild(chip);
  });
  el.radiusStat.textContent = `${state.radius}m`;
}
function buildVerificationChips() {
  const options = [
    ['all', 'すべて'],
    ['verified', 'verified'],
    ['partially_verified', 'partial'],
    ['unverified', 'unverified']
  ];
  el.verificationChips.innerHTML = '';
  options.forEach(([value, label]) => {
    const chip = document.createElement('button');
    chip.className = `chip ${state.statusFilter === value ? 'active' : ''}`;
    chip.textContent = label;
    chip.addEventListener('click', () => {
      state.statusFilter = value;
      buildVerificationChips();
      render();
    });
    el.verificationChips.appendChild(chip);
  });
}
function buildPresetButtons() {
  presetPoints.forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.textContent = p.label;
    btn.addEventListener('click', () => applyLocation(p.lat, p.lng, p.label));
    el.presetButtons.appendChild(btn);
  });
}
function badgeClass(status) {
  if (status === 'verified') return 'pill verified';
  if (status === 'partially_verified') return 'pill partial';
  return 'pill unverified';
}
function badgeText(status) {
  if (status === 'verified') return 'verified';
  if (status === 'partially_verified') return 'partial';
  return 'unverified';
}
function filteredResults() {
  if (state.userLat == null || state.userLng == null) return [];
  const q = state.search.trim().toLowerCase();
  return state.exhibitions
    .map(item => ({ ...item, distance: haversine(state.userLat, state.userLng, item.lat, item.lng) }))
    .filter(item => item.distance <= state.radius)
    .filter(item => state.statusFilter === 'all' || item.verificationStatus === state.statusFilter)
    .filter(item => !q || [item.no, item.title, item.venue, item.address].some(v => String(v ?? '').toLowerCase().includes(q)))
    .sort((a, b) => a.distance - b.distance);
}
function render() {
  const results = filteredResults();
  const verifiedCount = state.exhibitions.filter(x => x.verificationStatus === 'verified').length;
  el.countStat.textContent = results.length;
  el.nearestStat.textContent = results[0] ? results[0].no : '-';
  el.verifiedStat.textContent = `${verifiedCount}/${state.exhibitions.length}`;

  if (state.userLat != null && state.userLng != null) {
    el.subInfo.textContent = `検索地点: ${state.userLat.toFixed(6)}, ${state.userLng.toFixed(6)}`;
  } else {
    el.subInfo.textContent = '地点未設定';
  }

  if (state.userLat == null || state.userLng == null) {
    el.list.innerHTML = '<div class="empty">まず現在地を取得するか、地点ボタンまたは手動入力で検索地点を設定してください。</div>';
    return;
  }
  if (results.length === 0) {
    el.list.innerHTML = `<div class="empty">条件に一致する展示がありません。半径または verification フィルタを見直してください。</div>`;
    return;
  }

  el.list.innerHTML = results.map(item => {
    const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}&travelmode=walking`;
    const addressHtml = item.address ? `<div class="address">${escapeHtml(item.address)}</div>` : '';
    const notesHtml = item.notes ? `<span class="pill">${escapeHtml(item.notes)}</span>` : '';
    const fieldsHtml = (item.verifiedFields || []).length ? `<span class="pill">${escapeHtml(item.verifiedFields.join(', '))}</span>` : '';
    return `
      <article class="card">
        <div class="topline">
          <div class="badge">${escapeHtml(item.no)}</div>
          <div class="distance">${formatDistance(item.distance)}</div>
        </div>
        <h3 class="title">${escapeHtml(item.title)}</h3>
        <div class="venue">${escapeHtml(item.venue)}</div>
        ${addressHtml}
        <div class="meta">
          <span class="${badgeClass(item.verificationStatus)}">${badgeText(item.verificationStatus)}</span>
          ${fieldsHtml}
          ${notesHtml}
          <span class="pill">${formatDistance(item.distance)}</span>
        </div>
        <div class="links">
          <a href="${mapLink}" target="_blank" rel="noreferrer"><button class="primary">Googleマップで行く</button></a>
          <a href="${item.detailUrl}" target="_blank" rel="noreferrer"><button class="ghost">公式詳細</button></a>
        </div>
      </article>
    `;
  }).join('');
}
function applyLocation(lat, lng, label='現在地') {
  state.userLat = Number(lat);
  state.userLng = Number(lng);
  el.latInput.value = state.userLat.toFixed(6);
  el.lngInput.value = state.userLng.toFixed(6);
  setStatus(`${label}を設定しました。半径 ${state.radius}m 以内の展示を表示しています。`, 'ok');
  render();
}
function requestLocation() {
  if (!navigator.geolocation) {
    setStatus('このブラウザは位置情報に対応していません。', 'error');
    return;
  }
  if (!window.isSecureContext) {
    setStatus('現在地取得にはHTTPSで開く必要があります。GitHub Pages / Netlify などで公開してください。', 'error');
    return;
  }
  setStatus('現在地を取得しています…');
  navigator.geolocation.getCurrentPosition(
    pos => applyLocation(pos.coords.latitude, pos.coords.longitude),
    err => {
      let msg = '現在地を取得できませんでした。';
      if (err.code === 1) msg += ' 位置情報の許可がオフです。';
      if (err.code === 2) msg += ' 位置情報が利用できません。';
      if (err.code === 3) msg += ' タイムアウトしました。';
      setStatus(msg, 'error');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}
async function init() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error('data.json load failed');
    state.exhibitions = await res.json();
    buildRadiusChips();
    buildVerificationChips();
    buildPresetButtons();

    document.getElementById('locateBtn').addEventListener('click', requestLocation);
    document.getElementById('demoBtn').addEventListener('click', () => applyLocation(35.011564, 135.768149, 'デモ位置（京都市役所前）'));
    document.getElementById('applyManualBtn').addEventListener('click', () => {
      const lat = parseFloat(el.latInput.value);
      const lng = parseFloat(el.lngInput.value);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        applyLocation(lat, lng, '手動地点');
      } else {
        setStatus('緯度経度を正しく入力してください。', 'error');
      }
    });
    el.searchInput.addEventListener('input', e => { state.search = e.target.value; render(); });
    document.getElementById('clearSearch').addEventListener('click', () => { state.search = ''; el.searchInput.value = ''; render(); });

    if (!window.isSecureContext) {
      el.secureNotice.style.display = 'block';
      el.secureNotice.innerHTML = '現在地取得は <strong>HTTPS環境</strong> でのみ動きます。ローカルファイルではなく、<strong>GitHub Pages / Netlify / Vercel</strong> などに置いてください。';
    }
    render();
  } catch (e) {
    console.error(e);
    setStatus('データ読込に失敗しました。ファイル一式を同じ階層で公開してください。', 'error');
  }
}
init();