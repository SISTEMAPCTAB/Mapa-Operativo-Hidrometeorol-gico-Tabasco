(()=>{
"use strict";
// Módulo independiente RH29: no altera el semáforo Grijalva-Usumacinta ni el Agente fuente.
const base="/Agente-Hidrometeorologico-Cloud/data/";
const U={tonala:base+"coatzacoalcos_tonala/latest.json",rain:base+"niveles/Lluvia_CONAGUA/ultimo_corte.json",weather:base+"weatherlink/latest.json"};
const weatherNames=new Set(["Impulsora","PASO LA MINA","Modesta_1","CitrusMax IP Gateway S2"]);
const $=id=>document.getElementById(id);
const finite=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(v,d=2)=>finite(v)?Number(v).toFixed(d):"s/d";
const nowLocal=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const human=v=>{const t=Date.parse(v||"");return Number.isFinite(t)?new Date(t).toLocaleString("es-MX",{timeZone:"America/Mexico_City",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"s/d"};
async function get(u){try{const r=await fetch(u+"?v="+Date.now(),{cache:"no-store"});return r.ok?await r.json():null}catch{return null}}
function rainClass(mm){
 if(!finite(mm))return null;
 const n=Number(mm);
 if(n>=250)return{level:4,label:"Extraordinaria"};
 if(n>=150)return{level:3,label:"Torrencial"};
 if(n>=75)return{level:2,label:"Intensa"};
 if(n>=50)return{level:1,label:"Muy fuerte"};
 return null;
}
const fresh=v=>{let t=Date.parse(v||"");return Number.isFinite(t)&&t<=Date.now()+300000&&Date.now()-t<=3*3600000};
const tr=(a)=>"<tr>"+a.map(x=>"<td>"+x+"</td>").join("")+"</tr>";
let serial=0;
let mapMarker=null;
function markerFor(level,current,p){
 const map=window.TONALA_MAP, L=window.L;if(!map||!L)return;
 if(mapMarker){map.removeLayer(mapMarker);mapMarker=null;}
 if(!$("showTonala")?.checked)return;
 // Ubicación de la localidad San José del Carmen, no coordenada oficial del instrumento.
 const coordinate=[17.86948,-94.08515];
 const color=!current?"#7b8086":level>=3?"#a51e43":level===2?"#d62828":level===1?"#f28c00":"#2f7d5c";
 mapMarker=L.circleMarker(coordinate,{radius:10,color:"#fff",weight:2,fillColor:color,fillOpacity:.95})
 .bindTooltip("Tonalá · San José del Carmen"+(!current?" · dato anterior":""),{direction:"top"})
 .bindPopup('<div class="popup-title">Coatzacoalcos–Tonalá · San José del Carmen</div><p><b>Última escala:</b> '+fmt(p?.current_m)+' m</p><p><b>NAMO:</b> '+fmt(p?.namo_m)+' m</p><p><b>Fecha del informe:</b> '+esc(p?.date||"s/d")+'</p><p><b>Condición:</b> '+esc(current?"Lectura publicada hoy":"Último dato válido anterior; no genera alerta actual")+'</p><p>Ubicación aproximada de la localidad; no representa coordenada verificada del instrumento hidrométrico.</p>')
 .addTo(map);
}
async function update(){
 const id=++serial;
 const box=$("tonalaOperational");if(!box)return;
 const [doc,rain,weather]=await Promise.all([get(U.tonala),get(U.rain),get(U.weather)]);
 if(id!==serial)return;
 const mat=doc?.reports?.matutino||{},points=Array.isArray(mat.stations)?mat.stations:[];
 const today=nowLocal(),validDate=/^\d{4}-\d{2}-\d{2}$/.test(mat.date||"");
 // La fecha es la de emisión del documento, NO la hora de observación.
 const current=validDate&&mat.date===today;
 const levels=points.map(p=>{
  let level=0,reason=[];
  const delta=finite(p.delta_m)?Number(p.delta_m):null;
  const actual=finite(p.current_m)?Number(p.current_m):null;
  const namo=finite(p.namo_m)?Number(p.namo_m):null;
  if(current&&actual!==null&&namo!==null&&namo>0){
   const remaining=namo-actual;
   if(remaining<=0){level=3;reason.push("nivel igual o superior al NAMO")}
   else if(remaining<=.30){level=2;reason.push("a 30 cm o menos del NAMO")}
   else if(remaining<=.50){level=1;reason.push("a 50 cm o menos del NAMO")}
   if(delta!==null&&delta>=.30){level=Math.max(level,2);reason.push("ascenso entre escalas ≥30 cm")}
   else if(delta!==null&&delta>=.15){level=Math.max(level,1);reason.push("ascenso entre escalas ≥15 cm")}
  }
  return{...p,level,reason};
 });
 // Puente Tonalá: fuente directamente asociada, nunca confundir precipitación con escala hidrométrica.
 const bridge=(Array.isArray(rain)?rain:[]).filter(x=>/puente tonal[aá]/i.test(x.estacion||"")).sort((a,b)=>Date.parse(b.fecha_hora||"")-Date.parse(a.fecha_hora||""))[0];
 const bridgeFresh=bridge&&fresh(bridge.fecha_hora)&&bridge.estado_24h==="observado";
 const wr=(weather?.stations||[]).filter(x=>weatherNames.has(x.nombre));
 const liveWeather=wr.filter(x=>fresh(x.observed_utc));
 // WeatherLink regional no se toma como media de cuenca ni se atribuye a Tonalá sin coordenadas oficiales.
 const signals=[];
 if(bridgeFresh){let c=rainClass(bridge.lluvia_24h_precedentes_mm);if(c)signals.push({source:"Puente Tonalá",mm:bridge.lluvia_24h_precedentes_mm,time:bridge.fecha_hora,...c,associated:true})}
 for(const w of liveWeather){const c=rainClass(w.accumulations_mm?.["24"]);if(c)signals.push({source:w.nombre,mm:w.accumulations_mm["24"],time:w.observed_utc,...c,associated:false})}
 const strong=signals.filter(x=>x.associated),maxL=Math.max(0,...levels.map(x=>x.level));
 const label=["Sin señal hidrométrica vigente","Atención preventiva","Vigilancia reforzada","NAMO alcanzado o superado"][maxL];
 let badge=current?label:"Nivel no vigente · sin alerta hidrométrica actual";
 if(strong.length)badge+=" · lluvia observada en Puente Tonalá";
 const levRows=levels.map(p=>{
  let klass=!current?"Dato anterior":p.level>=2?"Vigilancia reforzada":p.level?"Atención preventiva":"Observación";
  return tr(["<b>"+esc(p.name)+"</b><br><small>"+esc(p.river)+"</small>",fmt(p.current_m)+" m",(finite(p.delta_m)&&Number(p.delta_m)>0?"+":"")+fmt(p.delta_m)+" m",fmt(p.namo_m)+" m",esc(mat.date||"s/d"),esc(klass)+(p.reason.length?" · "+esc(p.reason.join("; ")):"")]);
 }).join("");
 const rainRows=[];
 if(bridge)rainRows.push(tr(["Puente Tonalá","CONAGUA",bridgeFresh?fmt(bridge.lluvia_24h_precedentes_mm)+" mm":"s/d",human(bridge.fecha_hora),bridgeFresh?"Vigente":"Dato anterior"]));
 for(const w of wr){let yes=fresh(w.observed_utc),v=w.accumulations_mm?.["24"];
  let state=yes?"Vigente · referencia regional":"Dato anterior";
  if(w.nombre==="CitrusMax IP Gateway S2")state+=" · cuenca sin confirmar";
  rainRows.push(tr([esc(w.nombre),"WeatherLink",yes&&finite(v)?(w.accumulation_status?.["24"]==="minimo_observado"?"≥ ":"")+fmt(v,1)+" mm":"s/d",human(w.observed_utc),esc(state)]));
 }
 const notes=signals.map(s=>'<p><b>'+esc(s.source)+'</b>: '+fmt(s.mm,1)+' mm/24 h · '+esc(s.label)+' · '+human(s.time)+(s.associated?' · lluvia en Puente Tonalá':' · referencia regional; no se atribuye directamente a la cuenca')+'</p>').join("");
 const tonal=levels.find(p=>p.id==="san-jose-del-carmen");
 markerFor(tonal?.level||0,current,tonal?{...tonal,date:mat.date}:null);
 const banner=$("tonalaMapNotice");
 if(banner)banner.innerHTML='<b>Coatzacoalcos–Tonalá:</b> '+esc(current?badge:"última escala "+fmt(tonal?.current_m)+" m ("+esc(mat.date||"s/d")+"), dato anterior; sin alerta hidrométrica actual.")+' <button id="focusTonala" type="button">Ver Tonalá en el mapa</button>';
 $("focusTonala")?.addEventListener("click",()=>{if(window.TONALA_MAP){$("showTonala").checked=true;markerFor(tonal?.level||0,current,tonal?{...tonal,date:mat.date}:null);window.TONALA_MAP.setView([17.86948,-94.08515],11);mapMarker?.openPopup();}});
 const notice=current?'<span class="badge '+(maxL>=2?"danger":maxL?"warn":"ok")+'">'+esc(badge)+'</span>':'<span class="badge warn">'+esc(badge)+'</span>';
 box.innerHTML='<h2>Coatzacoalcos–Tonalá · vigilancia independiente</h2><p>'+notice+'</p>'+
 '<p class="footnote">Fuente hidrométrica: CONAGUA Golfo Centro · última emisión comprobada '+esc(mat.date||"s/d")+'. La fecha de emisión NO equivale a hora observada. Se conserva la última lectura sin elevar alertas por datos anteriores.</p>'+
 '<div class="table-wrap"><table><thead><tr><th>Estación</th><th>Escala</th><th>Δ informe</th><th>NAMO</th><th>Emisión</th><th>Condición</th></tr></thead><tbody>'+(levRows||'<tr><td colspan="6">Sin nivel verificable</td></tr>')+'</tbody></table></div>'+
 '<p class="footnote"><a href="'+esc(mat.url||"https://www.gob.mx/conagua/acciones-y-programas/hidrometeorologia")+'" target="_blank" rel="noopener noreferrer">Consultar informe oficial ↗</a>. Los umbrales indicados son preventivos para visualización; no sustituyen avisos oficiales de CONAGUA.</p>'+
 '<h3>Lluvia y estaciones regionales</h3><div class="table-wrap"><table><thead><tr><th>Estación</th><th>Fuente</th><th>24 h</th><th>Observación</th><th>Estado</th></tr></thead><tbody>'+(rainRows.join("")||'<tr><td colspan="5">Sin registros</td></tr>')+'</tbody></table></div>'+
 (notes?'<div class="note"><b>Señales de lluvia ≥50 mm:</b>'+notes+'</div>':'<p class="footnote">Sin lluvia vigente ≥50 mm en las estaciones consultadas.</p>')+
 '<p class="footnote">Esta capa informativa es independiente del semáforo Grijalva–Usumacinta. Se evita trasladar umbrales o valores entre cuencas. Las estaciones WeatherLink conservan su adscripción original hasta comprobar coordenadas y subcuenca.</p>';
}
document.addEventListener("DOMContentLoaded",()=>{
 $("showTonala")?.addEventListener("change",()=>update());
 update();
 document.getElementById("refreshBtn")?.addEventListener("click",update);
 setInterval(update,15*60*1000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)update()});
});
})();
