let map,markers=[],data=[];
let state={search:"",lat:null,lng:null};

const list=document.getElementById("list");

fetch("./data.json").then(r=>r.json()).then(d=>{
 data=d;initMap();render();
});

function initMap(){
 map=L.map('map').setView([35.01,135.76],13);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

document.getElementById("searchBtn").onclick=doSearch;
document.getElementById("searchInput").addEventListener("keypress",e=>{
 if(e.key==="Enter")doSearch();
});

function doSearch(){
 state.search=document.getElementById("searchInput").value.toLowerCase();
 render();
}

document.getElementById("locateBtn").onclick=()=>{
 navigator.geolocation.getCurrentPosition(p=>{
  state.lat=p.coords.latitude;
  state.lng=p.coords.longitude;
  map.setView([state.lat,state.lng],14);
  render();
 });
};

function dist(a,b,c,d){
 const R=6371000;
 const dLat=(c-a)*Math.PI/180;
 const dLon=(d-b)*Math.PI/180;
 const x=Math.sin(dLat/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLon/2)**2;
 return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function getItems(){
 let items=data.map(x=>{
  const distance=state.lat?dist(state.lat,state.lng,x.lat,x.lng):null;
  return {...x,distance};
 });

 if(state.search){
  return items.filter(x=>
   (x.title+x.venue+x.no+(x.addressNormalized||"")).toLowerCase().includes(state.search)
  );
 }
 return items;
}

function render(){
 const items=getItems();
 markers.forEach(m=>map.removeLayer(m)); markers=[];
 list.innerHTML="";

 items.forEach(x=>{
  const m=L.marker([x.lat,x.lng]).addTo(map)
   .bindPopup(`<b>${x.no}</b><br>${x.title}<br><a href="${x.detailUrl}" target="_blank">詳細</a>`);
  markers.push(m);

  const div=document.createElement("div");
  div.className="card";
  div.innerHTML=`
   <div>${x.no} ${x.title}</div>
   <div>${x.venue}</div>
   <div class="link"><a href="${x.detailUrl}" target="_blank">公式サイトを見る</a></div>
  `;
  list.appendChild(div);
 });
}
