(()=>{"use strict";
// Módulo optativo: nunca altera niveles, lluvia ni pronóstico.
const URL="data/cap-smn/latest.json";
const FEED="https://correo1.conagua.gob.mx/feedsmn/feedalert.aspx";
let map=null, layer=null, timer=null;
const e=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(message){const el=document.getElementById("capStatus");if(el)el.textContent=message;}
function active(a){
 const end=Date.parse(a.expires||"");
 return Number.isFinite(end)&&end>Date.now();
}
function geometry(a){
 return (Array.isArray(a.polygons)?a.polygons:[]).filter(p=>
   Array.isArray(p)&&p.length>=4&&p.every(v=>Array.isArray(v)&&v.length===2&&
   Number.isFinite(v[0])&&Number.isFinite(v[1])&&v[0]>=-90&&v[0]<=90&&v[1]>=-180&&v[1]<=180));
}
async function update(){
 if(!layer)return;
 let data=null;
 try{
   const r=await fetch(URL+"?t="+Date.now(),{cache:"no-store"});
   if(!r.ok)throw Error("HTTP "+r.status);
   data=await r.json();
 }catch(err){
   layer.clearLayers();status("CAP SMN: consulta no disponible; sin avisos verificados.");return;
 }
 layer.clearLayers();
 if(data?.state!=="ok"){
   status(data?.state==="no_verified_alerts"?
     "CAP SMN: sin avisos georreferenciados verificables en la región.":
     "CAP SMN: fuente no disponible; no se muestran avisos antiguos.");
   return;
 }
 let count=0;
 if(document.getElementById("showCap")?.checked){
   for(const a of data.alerts||[]){
     if(!active(a))continue;
     for(const polygon of geometry(a)){
       L.polygon(polygon,{color:"#763b88",weight:2.5,dashArray:"6 4",
         fillColor:"#763b88",fillOpacity:.10}).bindPopup(
         '<div class="popup-title">Aviso oficial CAP · SMN</div><div class="popup-grid">'+
         "<b>Evento</b><span>"+e(a.event||"s/d")+"</span>"+
         "<b>Área</b><span>"+e(a.area||"s/d")+"</span>"+
         "<b>Emisión</b><span>"+e(a.sent||"s/d")+"</span>"+
         "<b>Vigencia hasta</b><span>"+e(a.expires||"s/d")+"</span>"+
         "<b>Descripción</b><span>"+e(a.description||a.headline||"s/d")+"</span>"+
         "<b>Fuente</b><span><a href='"+FEED+"' target='_blank' rel='noopener noreferrer'>CONAGUA–SMN CAP</a></span>"+
         "</div>").addTo(layer);
       count++;
     }
   }
 }else count=(data.alerts||[]).filter(a=>active(a)&&geometry(a).length).length;
 status(count?("CAP SMN: "+count+" aviso(s) vigente(s) con geometría; capa "+
   (document.getElementById("showCap")?.checked?"visible.":"oculta.")):
   "CAP SMN: sin avisos vigentes con geometría verificada.");
}
function init(){
 map=window.TONALA_MAP;
 if(!map||layer)return;
 layer=L.layerGroup().addTo(map);
 const box=document.getElementById("showCap");
 if(box)box.addEventListener("change",update);
 update();
 timer=setInterval(update,15*60*1000);
}
window.addEventListener("tonala-map-ready",init);
if(window.TONALA_MAP)init();
})();