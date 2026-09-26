(()=>{"use strict";
const C=window.MAP_CONFIG;
const LEVEL_COLORS=["green","yellow","orange","red"], LEVEL_LABELS=["Verde","Amarillo","Naranja","Rojo"];
const map=L.map("map",{zoomControl:true}).setView([17.70,-92.65],8);
const base=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap contributors",crossOrigin:true}).addTo(map);
base.on("tileerror",()=>{const s=document.getElementById("statusText");if(s)s.textContent="Mapa cargado, pero algunas teselas de OpenStreetMap no respondieron; reintentando…";});
const levelLayer=L.layerGroup().addTo(map),rainLayer=L.layerGroup().addTo(map),upstreamLayer=L.layerGroup().addTo(map);

const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const finite=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmt=(v,n=2)=>finite(v)?Number(v).toFixed(n):"s/d";
const fetchJSON=async u=>{try{const r=await fetch(u+"?v="+Date.now(),{cache:"no-store"});return r.ok?await r.json():null}catch{return null}};
const fetchText=async u=>{try{const r=await fetch(u+"?v="+Date.now(),{cache:"no-store"});return r.ok?await r.text():""}catch{return ""}};
function coord(name){const hit=Object.entries(C.stations).find(([k])=>norm(k)===norm(name));return hit?hit[1]:null}

function rainClass(mm){
  if(!finite(mm))return{level:-1,label:"Sin dato",color:"#888"};
  const x=Number(mm);
  return C.rainThresholds.find(r=>x>=r.min)||C.rainThresholds.at(-1);
}
function levelDot(level){
  const c=level<0?"gray":LEVEL_COLORS[Math.min(3,level)];
  return L.divIcon({className:"",html:`<div class="marker-dot s-${c}"></div>`,iconSize:[18,18],iconAnchor:[9,9]});
}
function rainDot(k){
  return L.divIcon({className:"",html:`<div class="rain-dot" style="background:${k.color}"></div>`,iconSize:[20,20],iconAnchor:[10,15]});
}
function parseOfficial(txt){
 const out=new Map(),lines=String(txt||"").split(/\n/);
 const rx=/^(Samaria|Gonzalez|Oxolotan|Tapijulapa|Teapa|Puyacatengo|San Joaquin|Pueblo Nuevo|Gaviotas|El Muelle|Porvenir|Macuspana|Salto de Agua|San Pedro|Boca del Cerro)\s+.+?\s+(-?\d+(?:\.\d+)?)\s+(?:\d+(?:\.\d+)?\s+)?(?:\d+(?:\.\d+)?\s+)?(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/i;
 for(const raw of lines){const m=raw.trim().match(rx);if(m)out.set(norm(m[1]),{critical:+m[3],overflow:+m[4],minimum:+m[5]})}
 return out;
}
function levelSeverity(r,off){
 let sev=0,reasons=[];
 if(off&&finite(r.ultimo_nivel)){
   const n=+r.ultimo_nivel;
   if(finite(off.overflow)&&n>=off.overflow){sev=3;reasons.push("nivel ≥ desbordamiento")}
   else if(finite(off.critical)&&n>=off.critical){sev=Math.max(sev,2);reasons.push("nivel ≥ crítico")}
   else if(finite(off.critical)&&(off.critical-n)<=0.50){sev=Math.max(sev,1);reasons.push("a ≤0.50 m del crítico")}
 }
 const d24=finite(r.delta_24h)?+r.delta_24h:0,dre=finite(r.delta_reporte)?+r.delta_reporte:0;
 if(d24>=1||dre>=0.30){sev=Math.min(3,sev+1);reasons.push("ascenso rápido")}
 else if(d24>=0.50||dre>=0.15){sev=Math.max(sev,1);reasons.push("ascenso relevante")}
 if(/ascenso/i.test(r.tendencia||"")&&sev===0){sev=1;reasons.push("tendencia ascendente")}
 return{level:sev,reasons};
}
function combined(levelSev,rainSev){
 const rLevel=rainSev?.level??-1;
 let x=Math.max(levelSev.level,Math.min(3,rLevel)),reasons=[...levelSev.reasons];
 if(rainSev&&rainSev.level>=1)reasons.push("lluvia "+rainSev.label.toLowerCase());
 if(levelSev.level>=1&&rLevel>=2)x=Math.min(3,Math.max(x,levelSev.level+1));
 return{level:x,reasons};
}
function popupLevel(r,off,sev,rain){
 return `<div class="popup-title">${esc(r.estacion)}</div><div class="popup-grid">
 <b>Río</b><span>${esc(r.rio)}</span><b>Nivel</b><span>${fmt(r.ultimo_nivel)} m</span>
 <b>Tendencia</b><span>${esc(r.tendencia||"s/d")}</span><b>Δ reporte</b><span>${fmt(r.delta_reporte)} m</span>
 <b>Δ24 h</b><span>${fmt(r.delta_24h)} m</span><b>Crítico</b><span>${off?fmt(off.critical)+" m":"s/d"}</span>
 <b>Desbordamiento</b><span>${off?fmt(off.overflow)+" m":"s/d"}</span><b>Lluvia asociada</b><span>${rain?fmt(rain.mm,1)+" mm · "+esc(rain.label):"s/d"}</span>
 <b>Alerta operativa</b><span><strong>${sev.level<0?"Sin dato":LEVEL_LABELS[sev.level]}</strong></span>
 <b>Razón</b><span>${esc(sev.reasons.join(" · ")||"seguimiento ordinario")}</span></div>`;
}
function popupRain(r,k){
 return `<div class="popup-title">${esc(r.name)}</div><div class="popup-grid"><b>Fuente</b><span>${esc(r.source)}</span>
 <b>Acumulado</b><span>${fmt(r.mm,1)} mm</span><b>Periodo</b><span>${esc(r.period)}</span>
 <b>Categoría</b><span>${esc(k.label)}</span><b>Hora</b><span>${esc(r.time||"s/d")}</span></div>`;
}
function nearestRainForLevel(r,rains){
 const c=coord(r.estacion);if(!c)return null;let best=null,dist=1e9;
 for(const rr of rains){const p=coord(rr.name);if(!p||!finite(rr.mm))continue;const d=(p[0]-c[0])**2+(p[1]-c[1])**2;if(d<dist){dist=d;best=rr}}
 return best&&dist<0.5?{...best,...rainClass(best.mm)}:null;
}
function isChiapasOrGuatemala(r){
 const t=norm((r.name||"")+" "+(r.source||"")+" "+(r.location||""));
 return /chiapas|guatemala|peten|insivumeh/.test(t);
}
function insLevelRows(doc){
 return (doc?.estaciones||[]).filter(x=>x.estado_dato==="observado"&&finite(x.nivel_instantaneo_m)).map(x=>({
   type:"INSIVUMEH nivel",name:x.estacion,status:"Monitoreo",detail:`${fmt(x.nivel_instantaneo_m,2)} m · ${esc(x.rio||"río s/d")} · ${esc(x.ubicacion||"Guatemala")}`,priority:1
 }));
}
function insRainRows(doc){
 return (doc?.estaciones||[]).filter(x=>finite(x.precipitacion_24h_mm)).map(x=>{
   const k=rainClass(x.precipitacion_24h_mm);
   return {type:"INSIVUMEH lluvia",name:x.estacion,status:k.level>=1?k.label:"Monitoreo",detail:`${fmt(x.precipitacion_24h_mm,1)} mm / 24 h · Guatemala`,priority:k.level>=1?2:1};
 });
}

async function load(){
 document.getElementById("statusText").textContent="Actualizando…";
 const [levels,rainCon,weather,extra,f1,insRain,insLevels]=await Promise.all([
   fetchJSON(C.urls.levels),fetchJSON(C.urls.rainConagua),fetchJSON(C.urls.weather),fetchJSON(C.urls.weatherExtra),
   fetchText(C.urls.fuente1),fetchJSON(C.urls.insivumehRain),fetchJSON(C.urls.insivumehLevels)
 ]);
 const off=parseOfficial(f1),rains=[];
 for(const r of Array.isArray(rainCon)?rainCon:[]){
   if(finite(r.lluvia_hoy_desde_08_mm))rains.push({name:r.estacion,source:"CONAGUA",mm:+r.lluvia_hoy_desde_08_mm,time:r.fecha_hora,period:"HOY desde 08:00",location:"Tabasco/Chiapas"});
 }
 for(const r of [...(weather?.stations||[]),...(extra?.stations||[])]){
   const mm=r.accumulations_mm?.["24"];
   if(finite(mm))rains.push({name:r.nombre,source:"WeatherLink",mm:+mm,time:r.observed_utc,period:"24 h",location:r.ubicacion||""});
 }
 for(const r of insRain?.estaciones||[]){
   if(finite(r.precipitacion_24h_mm))rains.push({name:r.estacion,source:"INSIVUMEH",mm:+r.precipitacion_24h_mm,time:insRain.consultado_utc,period:"24 h",location:"Guatemala"});
 }

 levelLayer.clearLayers();rainLayer.clearLayers();upstreamLayer.clearLayers();
 const alerts=[];let maxRain=null,maxLevel=-1,maxCombined=-1,shownRain=0;
 for(const rr of rains){
   const k=rainClass(rr.mm);
   if(k.level>=1 && (!maxRain||k.level>maxRain.level))maxRain=k;
   if(k.level<1)continue; // sólo muy fuertes o superiores
   const p=coord(rr.name);
   if(p){
     const marker=L.marker(p,{icon:rainDot(k),title:rr.name}).bindPopup(popupRain(rr,k));
     if(isChiapasOrGuatemala(rr))marker.addTo(upstreamLayer);else marker.addTo(rainLayer);
     shownRain++;
   }
   alerts.push({type:"Lluvia",name:rr.name,status:k.label,detail:`${fmt(rr.mm,1)} mm · ${rr.source} · ${rr.period}`,priority:3+k.level});
 }
 for(const r of Array.isArray(levels)?levels:[]){
   const p=coord(r.estacion);if(!p)continue;
   const ls=levelSeverity(r,off.get(norm(r.estacion))),near=nearestRainForLevel(r,rains),cs=combined(ls,near);
   maxLevel=Math.max(maxLevel,ls.level);maxCombined=Math.max(maxCombined,cs.level);
   L.marker(p,{icon:levelDot(cs.level),title:r.estacion}).bindPopup(popupLevel(r,off.get(norm(r.estacion)),cs,near)).addTo(levelLayer);
   if(cs.level>=1)alerts.push({type:"Río",name:r.estacion,status:LEVEL_LABELS[cs.level],detail:cs.reasons.join(" · "),priority:5+cs.level});
 }
 // Guatemala: conservar en el cuadro inferior todas las estaciones INSIVUMEH que sí reportan lluvia o nivel.
 alerts.push(...insRainRows(insRain),...insLevelRows(insLevels));

 const levelText=x=>x<0?"Sin dato":LEVEL_LABELS[x];
 document.getElementById("rainAlert").textContent=maxRain?maxRain.label:"Sin lluvia ≥50 mm";
 document.getElementById("levelAlert").textContent=levelText(maxLevel);
 document.getElementById("combinedAlert").textContent=levelText(maxCombined);
 document.getElementById("rainDetail").textContent=shownRain+" puntos ≥50 mm en mapa";
 document.getElementById("levelDetail").textContent=(Array.isArray(levels)?levels.length:0)+" estaciones de nivel";
 document.getElementById("combinedDetail").textContent="Nivel + tendencia + lluvia ≥50 mm";

 alerts.sort((a,b)=>(b.priority||0)-(a.priority||0)||String(a.name).localeCompare(String(b.name),"es"));
 const seen=new Set(),filtered=alerts.filter(a=>{const k=[a.type,a.name,a.detail].join("|");if(seen.has(k))return false;seen.add(k);return true});
 document.getElementById("alertsTable").innerHTML=filtered.length?
 `<table><thead><tr><th>Tipo</th><th>Estación</th><th>Condición</th><th>Dato relevante</th></tr></thead><tbody>${filtered.map(a=>`<tr><td>${esc(a.type)}</td><td><b>${esc(a.name)}</b></td><td>${esc(a.status)}</td><td>${esc(a.detail)}</td></tr>`).join("")}</tbody></table>`:
 "<p>Sin datos relevantes con los criterios actuales.</p>";
 document.getElementById("statusText").textContent="Datos consultados del Agente Hidrometeorológico · "+new Date().toLocaleString("es-MX");
}
document.getElementById("refreshBtn").addEventListener("click",load);
document.getElementById("showLevels").addEventListener("change",e=>e.target.checked?levelLayer.addTo(map):map.removeLayer(levelLayer));
document.getElementById("showRain").addEventListener("change",e=>e.target.checked?rainLayer.addTo(map):map.removeLayer(rainLayer));
document.getElementById("showUpstream").addEventListener("change",e=>e.target.checked?upstreamLayer.addTo(map):map.removeLayer(upstreamLayer));
setTimeout(()=>map.invalidateSize(true),250);window.addEventListener("resize",()=>map.invalidateSize(false));
load();setInterval(load,15*60*1000);
})();