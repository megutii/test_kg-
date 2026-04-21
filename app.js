let map;
let markers=[];
let data=[];
let state={search:"",lat:null,lng:null};

const list=document.getElementById("list");

fetch("./data.json")
.then(r=>r.json())
.then(d=>{
  data=d;
  initMap();
  render();
});

function initMap(){
  map=L.map('map').setView([35.01,135.76],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
}

document.getElementById("locateBtn").onclick=()=>{
  navigator.geolocation.getCurrentPosition(pos=>{
    state.lat=pos.coords.latitude;
    state.lng=pos.coords.longitude;
    map.setView([state.lat,state.lng],14);
    render();
  });
};

document.getElementById("searchInput").oninput=e=>{
  state.search=e.target.value.toLowerCase();
  render();
};

function dist(a,b,c,d){
  const R=6371000;
  const dLat=(c-a)*Math.PI/180;
  const dLon=(d-b)*Math.PI/180;
  const x=Math.sin(dLat/2)**2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function getItems(){
  let items=data.map(x=>{
    const distance=state.lat?dist(state.lat,state.lng,x.lat,x.lng):null;
    return {...x,distance};
  });

  if(state.search){
    return items.filter(x=>
      (x.title+x.venue+x.no+(x.id||"")).toLowerCase().includes(state.search)
    ).sort((a,b)=>(a.distance||999999)-(b.distance||999999));
  }

  if(state.lat){
    return items.sort((a,b)=>a.distance-b.distance);
  }

  return items;
}

function render(){
  const items=getItems();

  markers.forEach(m=>map.removeLayer(m));
  markers=[];
  list.innerHTML="";

  items.forEach(x=>{
    const m=L.marker([x.lat,x.lng]).addTo(map)
      .bindPopup(`<b>${x.no}</b><br>${x.title}`);

    markers.push(m);

    const div=document.createElement("div");
    div.className="card";
    div.innerHTML=`
      <div class="title">${x.no} ${x.title}</div>
      <div>${x.venue}</div>
      <div class="distance">${x.distance?Math.round(x.distance)+'m':''}</div>
    `;

    div.onclick=()=>{
      map.setView([x.lat,x.lng],16);
      m.openPopup();
    };

    list.appendChild(div);
  });
}
