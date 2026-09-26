window.MAP_CONFIG={
  sourceBase:"/Agente-Hidrometeorologico-Cloud",
  urls:{
    levels:"/Agente-Hidrometeorologico-Cloud/data/niveles/Ultimo_Corte/ultimo_resumen.json",
    rainConagua:"/Agente-Hidrometeorologico-Cloud/data/niveles/Lluvia_CONAGUA/ultimo_corte.json",
    weather:"/Agente-Hidrometeorologico-Cloud/data/weatherlink/latest.json",
    weatherExtra:"/Agente-Hidrometeorologico-Cloud/data/weatherlink/extra_latest.json",
    fuente1:"/Agente-Hidrometeorologico-Cloud/data/latest/FUENTE1.txt",
    insivumehRain:"/Agente-Hidrometeorologico-Cloud/data/fuentes_publicas/insivumeh_automaticas.json",
    insivumehLevels:"/Agente-Hidrometeorologico-Cloud/data/fuentes_publicas/insivumeh_alto_hidro.json",
    publicSources:"/Agente-Hidrometeorologico-Cloud/data/fuentes_publicas/latest.json"
  },
  rainThresholds:[
    {min:250,level:4,label:"Extraordinaria",color:"#6a2ca0"},
    {min:150,level:3,label:"Torrencial",color:"#d62828"},
    {min:75,level:2,label:"Intensa",color:"#f28c00"},
    {min:50,level:1,label:"Muy fuerte",color:"#f2d600"},
    {min:0,level:0,label:"Menor a muy fuerte",color:"#9aa0a6"}
  ],
  rainDisplayMinMm:50,
  forecastBasins:{
    "Peñitas":{center:[17.43,-93.56],radius:52000},
    "Malpaso":{center:[17.18,-93.60],radius:65000},
    "Chicoasén":{center:[16.95,-93.18],radius:54000},
    "La Angostura":{center:[16.40,-92.80],radius:76000},
    "Bajo Grijalva-Ríos de la Sierra":{center:[17.55,-92.95],radius:70000},
    "Usumacinta":{center:[17.35,-91.45],radius:90000},
    "Presa Juan Sabines":{center:[16.32,-93.30],radius:56000}
  },
  // Ubicaciones de referencia para el piloto. Se reemplazarán por coordenadas oficiales.
  stations:{
    "Samaria":[18.05,-93.19],"González":[18.03,-92.99],"Oxolotán":[17.38,-92.75],
    "Tapijulapa":[17.46,-92.78],"Teapa":[17.55,-92.95],"Puyacatengo":[17.55,-92.93],
    "San Joaquín":[17.52,-93.12],"Pueblo Nuevo":[17.80,-92.88],"Gaviotas":[17.98,-92.92],
    "Porvenir":[17.98,-92.91],"Macuspana":[17.76,-92.60],"Salto de Agua":[17.56,-92.33],
    "San Pedro":[17.80,-91.53],"Boca del Cerro":[17.43,-91.49],
    "PEÑITAS":[17.45,-93.46],"PLATANAR":[17.91,-93.24],"SAMARIA":[18.05,-93.19],
    "MACUSPANA":[17.76,-92.60],"SALTO DE AGUA":[17.56,-92.33],"OXOLOTÁN":[17.38,-92.75],
    "TAPIJULAPA":[17.46,-92.78],"TEAPA":[17.55,-92.95],"PUYACATENGO":[17.55,-92.93],
    "SAN JOAQUÍN":[17.52,-93.12],"PUEBLO NUEVO":[17.80,-92.88],"BOCA DEL CERRO":[17.43,-91.49],
    "AMATÁN PCIVILCHIAPAS":[17.35,-92.82],"PICHUCALCO PCIVILCHIAPAS":[17.51,-93.12],
    "CHAPULTENANGO PCIVILCHIAPAS":[17.33,-93.13],"SALTO DE AGUA PCIVILCHIAPAS":[17.56,-92.33],
    "PALENQUE PCIVILCHIAPAS":[17.51,-91.98],"NAISA 1":[16.52,-90.19],
    "LAS CRUCES 2 (PETEN)":[16.65,-90.18],"SAN FRANCISCO":[16.80,-89.94],
    "El Tigre":[16.611410,-90.655150],"El Porvenir":[16.519581,-90.483911],
    "Machaquilá":[16.393860,-89.444400],"San Pedro Mactún":[16.9729,-89.9147],
    "San Agustín Chixoy":[16.069835,-90.425616],"Playa Grande":[15.968061,-90.746611],
    "Playa Grande Met (Ixcan)":[15.968061,-90.746611],"Santa María Cahabón":[15.6056,-89.8125],
    "Panzos PHC Altaverapaz":[15.3974,-89.64397]
  }
};