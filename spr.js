(()=>{
"use strict";
// Módulo aislado: no modifica capas, semáforo, datos ni el intervalo del Agente.
const stations=[
 ["RH30TAPIJ","Tapijulapa","https://app.conagua.gob.mx/spr/tapijulapa.html"],
 ["RH30SAMAR","Samaria",null],
 ["RH30GONZA","González",null],
 ["RH30SANJO","San Joaquín",null],
 ["RH30GAVIO","Gaviotas",null],
 ["RH30CENSO","Censo",null],
 ["RH30SABAN","Sabanilla",null],
 ["RH30PORVE","Porvenir","https://app.conagua.gob.mx/spr/porvenir.html"],
 ["RH30PLATA","Platanar",null],
 ["RH30PNUEV","Pueblo Nuevo",null],
 ["RH30PUYAC","Puyacatengo",null],
 ["RH30TEAPA","Teapa",null],
 ["RH30GRIJA","Grijalva","https://app.conagua.gob.mx/spr/grijalva.html"]
];
const directory="https://app.conagua.gob.mx/spr/bajogrijalva.html";
const el=document.getElementById("sprStations");
if(!el)return;
const frag=document.createDocumentFragment();
for(const [code,name,url] of stations){
 const row=document.createElement("div");row.className="spr-station";
 const info=document.createElement("span");info.className="spr-info";
 const bold=document.createElement("strong");bold.textContent=name;
 const small=document.createElement("small");small.textContent=code+" · consultar emisión y gráfico en CONAGUA";
 info.append(bold,small);
 const link=document.createElement("a");link.href=url||directory;link.target="_blank";link.rel="noopener noreferrer";
 link.textContent=url?"Ver pronóstico oficial":"Ver en directorio";
 link.setAttribute("aria-label",name+" — abrir portal oficial de CONAGUA");
 row.append(info,link);frag.append(row);
}
el.replaceChildren(frag);
const source=document.getElementById("sprSourceStatus");
if(source)source.textContent="13 puntos en el directorio oficial · pronóstico numérico aún no integrado ni validado";
})();
