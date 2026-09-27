(()=>{"use strict";
// Capa independiente BHG21: consulta FUENTE1 ya procesada por el Agente.
// Punto cartográfico sobre el río Lacantún, NO ubicación instrumental BHG21.
// Referencia geográfica del río: 16.11041, -90.93975 (cuenca media).
const SOURCE="/Agente-Hidrometeorologico-Cloud/data/latest/FUENTE1.txt";
const REFERENCE=[16.11041,-90.93975];
const $=id=>document.getElementById(id);
const escapeHTML=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):"s/d";
const readHeader=(s,name)=>s.match(new RegExp("^"+name+":\\s*(.+)$","im"))?.[1]?.trim()||"";
function parse(text){
 const line=String(text||"").split(/\r?\n/).find(s=>/\bBHG21\s+Lacant[uú]n\b/i.test(s));
 if(!line)return null;
 const part=line.match(/\bBHG21\s+Lacant[uú]n\s+(.*?)(?=\s+[A-Z]{2,}\d+\s+|$)/i)?.[1];
 if(!part||!/\bOcosingo\b/i.test(part))return null;
 const nums=[...part.matchAll(/(?<!\S)-?\d+(?:,\d{3})*(?:\.\d+)?(?!\S)/g)].map(x=>Number(x[0].replace(/,/g,"")));
 if(nums.length<8||nums.some(x=>!Number.isFinite(x)))return null;
 // Formato OCFS: NAMO; escala/gasto anterior; escala/gasto actual; lluvia/Tmax/Tmin.
 const [namo,prev,prevFlow,now,flow,rain]=nums;
 if(!(namo>0&&namo<1000&&prev>0&&now>0&&prevFlow>=0&&flow>=0&&
      Math.abs(now-prev)<10&&Math.abs(now-namo)<50&&rain>=0&&rain<1000))return null;
 const date=readHeader(text,"FECHA/HORA MENSAJE"),collected=readHeader(text,"FECHA/HORA RECOLECCIÓN");
 const t=Date.parse(date),valid=Number.isFinite(t)&&t<=Date.now()+300000;
 if(!valid)return null;
 return {namo,prev,now,flow,rain,time:date,collected,source:readHeader(text,"ASUNTO"),age:Date.now()-t};
}
const markerIcon=stale=>L.divIcon({className:"",html:'<div class="level-triangle s-'+(stale?"gray":"green")+'"></div>',iconSize:[24,22],iconAnchor:[12,11]});
let layer=null,marker=null,ready=false;
function popup(v){
 const stale=v.age>36*3600000;
 return '<div class="popup-title">Lacantún · BHG21 · OCFS</div><div class="popup-grid">'+
 "<b>Río</b><span>Lacantún · aporte previo a Boca del Cerro</span>"+
 "<b>Estación reportada</b><span>BHG21 · Ocosingo, Chiapas</span>"+
 "<b>Nivel actual</b><span>"+fmt(v.now)+" m</span>"+
 "<b>Nivel anterior</b><span>"+fmt(v.prev)+" m</span>"+
 "<b>Δ reporte</b><span>"+(v.now-v.prev>=0?"+":"")+fmt(v.now-v.prev)+" m</span>"+
 "<b>Referencia NAMO</b><span>"+fmt(v.namo)+" m · diferencia "+fmt(v.now-v.namo)+" m</span>"+
 "<b>Gasto reportado</b><span>"+fmt(v.flow)+" m³/s</span>"+
 "<b>Lluvia reportada</b><span>"+fmt(v.rain,1)+" mm (periodo del boletín OCFS)</span>"+
 "<b>Fecha/hora del mensaje</b><span>"+escapeHTML(v.time)+"</span>"+
 "<b>Estado</b><span>"+(stale?"DATO ANTERIOR · no representa lectura actual":"Último boletín fuente disponible")+"</span>"+
 "<b>Ubicación</b><span>Referencia del río Lacantún en la cuenca media; NO son las coordenadas de la estación BHG21.</span>"+
 "<b>Fuente</b><span>"+escapeHTML(v.source||"Boletín OCFS / FUENTE1")+"</span></div>";
}
async function refresh(){
 if(!layer)return;
 try{
  const r=await fetch(SOURCE+"?v="+Date.now(),{cache:"no-store"});
  if(!r.ok)throw Error("fuente");
  const d=parse(await r.text());
  layer.clearLayers();marker=null;
  if(!d)return;
  marker=L.marker(REFERENCE,{icon:markerIcon(d.age>36*3600000),title:"Lacantún · BHG21 (ubicación referencial)"}).bindPopup(popup(d)).addTo(layer);
 }catch(e){console.warn("Lacantún BHG21: dato no disponible; capa principal intacta.",e)}
}
function toggle(){
 if(!layer)return;
 const checked=$("showUpstream")?.checked!==false;
 const map=window.TONALA_MAP;
 if(checked&&!map.hasLayer(layer))layer.addTo(map);
 if(!checked&&map.hasLayer(layer))map.removeLayer(layer);
}
function init(){
 const map=window.TONALA_MAP;
 if(!map||ready)return;
 ready=true;layer=L.layerGroup().addTo(map);
 $("showUpstream")?.addEventListener("change",toggle);
 $("refreshBtn")?.addEventListener("click",()=>setTimeout(refresh,100));
 refresh();setInterval(refresh,15*60*1000);
}
window.addEventListener("tonala-map-ready",init);
if(window.TONALA_MAP)init();
})();