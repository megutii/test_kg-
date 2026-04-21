let map, markers = [], data = [];
let state = { search: "", lat: null, lng: null };

const list = document.getElementById("list");

fetch("./data.json")
  .then(r => r.json())
  .then(d => {
    data = d;
    initMap();
    render();
  });

function initMap() {
  map = L.map("map").setView([35.01, 135.76], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);
}

document.getElementById("searchBtn").onclick = doSearch;
document.getElementById("searchInput").addEventListener("keypress", e => {
  if (e.key === "Enter") doSearch();
});

function doSearch() {
  state.search = document.getElementById("searchInput").value.toLowerCase().trim();
  render(true);
}

document.getElementById("locateBtn").onclick = () => {
  navigator.geolocation.getCurrentPosition(p => {
    state.lat = p.coords.latitude;
    state.lng = p.coords.longitude;
    map.setView([state.lat, state.lng], 14);
    render();
  });
};

function dist(a, b, c, d) {
  const R = 6371000;
  const dLat = (c - a) * Math.PI / 180;
  const dLon = (d - b) * Math.PI / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a * Math.PI / 180) *
      Math.cos(c * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getItems() {
  let items = data.map(x => {
    const distance = state.lat != null
      ? dist(state.lat, state.lng, x.lat, x.lng)
      : null;
    return { ...x, distance };
  });

  if (state.search) {
    items = items.filter(x =>
      (
        (x.title || "") +
        (x.name || "") +
        (x.venue || "") +
        (x.no || "") +
        (x.addressNormalized || "") +
        (x.addressOfficial || "")
      )
        .toLowerCase()
        .includes(state.search)
    );

    // 現在地があれば距離順、なければ番号順っぽくそのまま
    if (state.lat != null) {
      items.sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));
    }

    return items;
  }

  if (state.lat != null) {
    items.sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));
  }

  return items;
}

function render(moveToFirst = false) {
  const items = getItems();

  markers.forEach(m => map.removeLayer(m));
  markers = [];
  list.innerHTML = "";

  if (!items.length) {
    list.innerHTML = `<div class="card">検索結果がありません</div>`;
    return;
  }

  items.forEach((x, index) => {
    const popupHtml = `
      <div>
        <b>${escapeHtml(x.no || "")}</b><br>
        ${escapeHtml(x.title || x.name || "")}<br>
        ${escapeHtml(x.venue || "")}<br>
        <a href="${x.detailUrl}" target="_blank" rel="noopener noreferrer">詳細</a>
      </div>
    `;

    const m = L.marker([x.lat, x.lng]).addTo(map).bindPopup(popupHtml);
    markers.push(m);

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div><strong>${escapeHtml(x.no || "")} ${escapeHtml(x.title || x.name || "")}</strong></div>
      <div>${escapeHtml(x.venue || "")}</div>
      ${
        x.distance != null
          ? `<div class="distance">${Math.round(x.distance)}m</div>`
          : ""
      }
      <div class="link">
        <a href="${x.detailUrl}" target="_blank" rel="noopener noreferrer">公式サイトを見る</a>
      </div>
    `;

    // カード全体タップで詳細ページへ
    div.addEventListener("click", e => {
      if (e.target.closest("a")) return;
      window.location.href = x.detailUrl;
    });

    // 先頭結果だけ、検索直後に地図を移動
    if (moveToFirst && index === 0) {
      map.setView([x.lat, x.lng], 16);
      m.openPopup();
    }

    list.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[s];
  });
}
