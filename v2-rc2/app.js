/* EMDC-LD01 V2.0 RC2 — interfaz */
(function app(){
"use strict";
const $=id=>document.getElementById(id), E=EMDC, elem=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);if(cls)e.className=cls;return e}, option=(v,t)=>{const e=elem("option",t);e.value=v;return e}, setOptions=(node,opts,value)=>{node.replaceChildren(...opts.map(([v,t])=>option(v,t)));if(value&&!opts.some(([v])=>v===value))node.append(option(value,value+" (sin coincidencias)"));node.value=value||opts[0]?.[0]||""}, defaultView=()=>matchMedia("(max-width:720px)").matches?"cards":"table", baseCols=["brand","model","maker","scale","material","reference","year"], facetKeys=["category","brand","maker","scale","material","materialClass","profile","series","country","verification"], allOps=[["eq","Igual a"],["neq","Distinto de (conocido)"],["contains","Contiene"],["notcontains","No contiene"],["in","Cualquiera de (separar con |)"],["gte","Mayor o igual"],["lte","Menor o igual"],["known","Con dato"],["unknown","Sin dato"]], storage="emdc-ld01-v2-criteria", defaults=()=>({schema:"EMDC-LD01-2.0",name:"",level:"variante",q:"",facets:{},from:"",to:"",logic:"AND",conditions:[],sort:"model",view:defaultView(),columns:[...baseCols]});
let data=null,state=defaults(),page=1,size=12,rows=[],labels={...E.fields},fields=Object.keys(labels),saved=[],selected=new Set(),ready=false,availability=new Map(),lastView="cards";
const queryParams=new URLSearchParams(location.search), embedded=queryParams.get("embed")==="1";
if(embedded)document.body.classList.add("embed");
function feedback(msg){$("feedback").textContent=msg}
function fieldName(k){return labels[k]||k}
function display(v){return E.present(v)?String(v):"Sin dato"}
function labelOf(r){return [r.brand,r.model].filter(Boolean).join(" ")||r.maker||r.id}
function setStatus(msg){$("status").textContent=msg}
function config(){return {...state,name:$("name").value.trim()||"Lista personalizada",columns:[...state.columns],facets:{...state.facets},conditions:state.conditions.map(x=>({...x}))}}
function available(){const keys=availability.get(state.level)||new Set();return fields.filter(k=>k==="id"||keys.has(k)||state.columns.includes(k)||state.conditions.some(c=>c.field===k)||state.facets[k])}
function pretty(k,v){return k==="profile"?(data?.profileLabels?.[v]||v):v}
function updateSelection(){const n=selected.size;$("compareCount").textContent=n+" seleccionados";$("compareBar").hidden=!n;$("compareText").textContent=n+" de 4 seleccionados";$("compareNow").disabled=n<2;document.body.classList.toggle("with-selection",!!n)}
function activeFilters(){const box=$("activeFilters");box.replaceChildren();const entries=[];for(const [k,v] of Object.entries(state.facets))if(v)entries.push([fieldName(k)+": "+pretty(k,v),()=>{delete state.facets[k]}]);if(state.q)entries.push(["Buscar: "+state.q,()=>{state.q=""}]);for(const k of ["from","to"])if(state[k])entries.push([(k==="from"?"Desde ":"Hasta ")+state[k],()=>{state[k]=""}]);state.conditions.forEach((c,i)=>entries.push([fieldName(c.field)+" "+(allOps.find(x=>x[0]===c.op)?.[1]||c.op)+" "+c.value,()=>state.conditions.splice(i,1)]));for(const [label,remove] of entries){const b=elem("button",label+" ×","chip");b.setAttribute("aria-label","Quitar filtro "+label);b.onclick=()=>{remove();sync();resetPage()};box.append(b)}box.hidden=!entries.length}
function openDetail(r){const d=$("detail"),box=$("detailBody");box.replaceChildren();box.append(elem("p",({fabricante:"Fabricante",modelo:"Modelo",variante:"Variante",aparicion:"Aparición"})[state.level],"levelbadge"),elem("h2",labelOf(r)),elem("p",r.id,"small"));const dl=elem("dl",undefined,"detail-grid");for(const k of fields){if(["id","photo","article"].includes(k)||!E.present(r[k]))continue;const dd=elem("dd");dd.append(linkCell(r,k));dl.append(elem("dt",fieldName(k)),dd)}box.append(dl);if(r.article)box.append(articleLink(r));else box.append(elem("p","No hay una ficha de EMDC vinculada explícitamente.","small"));const pic=photo(r);if(pic)box.prepend(pic);if(typeof d.showModal==="function")d.showModal();else d.open=true}
function articleLink(r){const a=elem("a","Consultar ficha técnica publicada","article-link");a.href=r.article;a.target="_blank";a.rel="noopener noreferrer";return a}
function photo(r){if(data?.mode!=="public"||!r.photo)return null;const img=elem("img");img.className="thumb";img.src=r.photo;img.loading="lazy";img.alt=labelOf(r);img.referrerPolicy="no-referrer";img.onerror=()=>img.remove();return img}
function displayCols(){const keys=availability.get(state.level)||new Set();const valid=state.columns.filter(k=>fields.includes(k)&&keys.has(k));return valid.length?valid:["id",...(keys.has("maker")?["maker"]:[])]}
function populateData(d,src){
  const adapted=E.adapt(d);
  data=adapted;labels={...E.fields};
  for(const x of data.registry)if(typeof x.id==="string"&&typeof x.nombre==="string")labels["x:"+x.id]=x.nombre;
  fields=Object.keys(labels);availability=new Map(Object.entries(data.rows).map(([k,arr])=>[k,new Set(arr.flatMap(r=>Object.keys(r).filter(x=>E.present(r[x]))))]));state=defaults();page=1;selected.clear();ready=true;
  $("sourceBadge").textContent=data.mode==="demo"?"Demostración · datos ficticios":data.mode==="public"?"Proyección pública autorizada":"Importación local · "+(data.mode==="uni"?"UNI T03":"CAT V3.4");
  $("warning").textContent=data.mode==="demo"?"Datos ficticios. No representan la producción real ni se conectan a la base maestra.":data.mode==="public"?"Catálogo de consulta: proyección pública autorizada. No representa necesariamente toda la producción.":"Modo local de solo lectura. Los datos importados no se suben ni se guardan en GitHub; los campos desconocidos no se completan por inferencia.";
  $("profileInfo").textContent=data.mode==="uni"?data.profiles.length+" nodos de perfil disponibles; "+data.registry.length+" definiciones marcadas publicables. Campos presentes y aplicables al perfil activo, con nivel documental y tipos admitidos; no se activa el candidato.":data.mode==="legacy"?"Modo legado: perfil no determinado cuando no hay contrato UNI.":data.mode==="public"?"Perfiles incluidos en la proyección autorizada.":"Perfiles ilustrativos de demostración.";
  $("issues").textContent=data.issues.length?data.issues.length+" incidencias de relación detectadas; no se ha corregido la base.":"Sin incidencias de relación detectadas en esta lectura.";
  setStatus(src+" · "+Object.entries(data.rows).map(([k,v])=>v.length+" "+k).join(" · "));
  sync();render();
}
async function reload(){try{const mf=await fetch("./manifest.json",{cache:"no-store"});if(!mf.ok)throw Error("Manifiesto de publicación no disponible");const manifest=await mf.json();if(manifest.schema!=="EMDC-LD01-MANIFEST-1.0")throw Error("Manifiesto incompatible");const path=manifest.source?.type==="public"&&manifest.source?.authorization==="APPROVED"&&manifest.source?.path==="./public-data.json"?"./public-data.json":manifest.source?.type==="fictional"&&manifest.source?.path==="../demo.json"?"../demo.json":null;if(!path)throw Error("Fuente no autorizada o incompatible");const response=await fetch(path,{cache:"no-store"});if(!response.ok)throw Error("HTTP "+response.status);const payload=await response.json();if(path==="./public-data.json"&&(payload.schema!=="EMDC-LD01-PUBLIC-1.0"||payload.authorization!=="APPROVED"))throw Error("Proyección no aprobada");if(path==="../demo.json"&&payload.fictional!==true)throw Error("Fuente ficticia incompatible");populateData(payload,"JSON de GitHub Pages");const raw=location.hash.slice(1);if(raw.startsWith("lista=")){try{apply(JSON.parse(decodeURIComponent(raw.slice(6))))}catch(e){feedback("Enlace de lista no válido: "+e.message)}}}catch(e){setStatus("No se pudo cargar la demostración: "+e.message+". Puedes importar un archivo JSON local.")}}
function sync(){
 $("level").value=state.level;$("q").value=state.q;$("from").value=state.from;$("to").value=state.to;$("logic").value=state.logic;$("sort").value=state.sort;$("view").value=state.view;$("name").value=state.name;
 drawConditions();drawColumns();
}
function resetPage(){page=1;render()}
function changeLevel(v){state.level=v;state.facets={};state.conditions=[];state.from="";state.to="";state.columns=v==="fabricante"?["id","maker"]:v==="modelo"?["id","brand","model","maker","scale","profile"]:v==="aparicion"?["brand","model","maker","reference","series","year","scale"]:baseCols.slice();selected.clear();sync();resetPage()}
function drawFacets(){
 const source=data.rows[state.level];
 for(const k of facetKeys){const sel=$(k),val=state.facets[k]||"",options=[...new Set(E.query(source,state,k,false).map(r=>r[k]).filter(E.present).map(String))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));setOptions(sel,[["","Todos"],...options.map(v=>[v,pretty(k,v)])],val);sel.disabled=!options.length&&!val;sel.closest("label").hidden=!availability.get(state.level)?.has(k)&&!val;}
}
function drawConditions(){
 const box=$("conditions");box.replaceChildren();
 state.conditions.forEach((c,i)=>{
  const line=elem("div",undefined,"condition"),field=elem("select"),op=elem("select"),input=elem("input"),del=elem("button","Quitar");
  field.setAttribute("aria-label","Campo de condición "+(i+1));op.setAttribute("aria-label","Operador "+(i+1));input.setAttribute("aria-label","Valor de condición "+(i+1));
  setOptions(field,available().map(k=>[k,fieldName(k)]),c.field);setOptions(op,allOps,c.op);input.value=c.value;input.placeholder="Valor";input.disabled=["known","unknown"].includes(c.op);
  field.onchange=()=>{c.field=field.value;resetPage()};op.onchange=()=>{c.op=op.value;input.disabled=["known","unknown"].includes(c.op);resetPage()};input.oninput=()=>{c.value=input.value;resetPage()};del.onclick=()=>{state.conditions.splice(i,1);drawConditions();resetPage()};line.append(field,op,input,del);box.append(line);
 });
}
function drawColumns(){const box=$("columns");box.replaceChildren();for(const k of available()){const l=elem("label",undefined,"check"),c=elem("input");c.type="checkbox";c.checked=state.columns.includes(k);c.onchange=()=>{if(c.checked)state.columns=[...new Set([...state.columns,k])];else if(state.columns.length>1)state.columns=state.columns.filter(x=>x!==k);else c.checked=true;render()};l.append(c,document.createTextNode(fieldName(k)));box.append(l)}}
function upgrade(c){if(c?.schema!=="EMDC-LD01-CONCEPTUAL-1.0")return c;const old=c.criteria||{};return {...defaults(),name:c.name,q:old.q||"",facets:Object.fromEntries(["category","brand","maker","scale","material"].filter(k=>typeof old[k]==="string"&&old[k]).map(k=>[k,old[k]])),from:old.from||"",to:old.to||"",sort:old.sort||"model",view:old.view||defaultView()}}
function apply(c){c=upgrade(c);if(!E.validateConfig(c,fields))throw Error("Configuración incompatible o inválida para la fuente actual");state={...defaults(),...c,facets:{...c.facets},conditions:c.conditions.map(x=>({...x})),columns:[...c.columns]};page=1;selected.clear();sync();render();feedback("Consulta aplicada.");}
function linkCell(r,k){if(k==="article"&&r.article)return articleLink(r);if(k==="source"&&E.present(r.source)){const a=elem("a","Consultar fuente");a.href=r.source;a.target="_blank";a.rel="noopener noreferrer";return a}return document.createTextNode(display(pretty(k,r[k])))}
function selectBox(r){const l=elem("label",undefined,"check"),c=elem("input");c.type="checkbox";c.checked=selected.has(r.id);c.setAttribute("aria-label","Seleccionar "+labelOf(r)+" para comparar");c.onchange=()=>{if(c.checked){if(selected.size>=4){c.checked=false;feedback("Máximo cuatro registros para comparar.");return}selected.add(r.id)}else selected.delete(r.id);updateSelection();if(state.view==="compare")render()};l.append(c,document.createTextNode("Comparar"));return l}
function rowCard(r,cols){const a=elem("article",undefined,"item");const detail=elem("button",labelOf(r),"record-title");detail.onclick=()=>openDetail(r);a.append(elem("span",({fabricante:"Fabricante",modelo:"Modelo",variante:"Variante",aparicion:"Aparición"})[state.level],"levelbadge"),detail,elem("p",r.id,"small"));const pic=photo(r);if(pic)a.prepend(pic);const dl=elem("dl");for(const k of cols.filter(k=>!["brand","model","id"].includes(k))){const dt=elem("dt",fieldName(k)),dd=elem("dd");dd.append(linkCell(r,k));dl.append(dt,dd)}a.append(dl,selectBox(r));if(r.article)a.append(articleLink(r));return a}
function render(){
 if(!ready)return;
 const bad=state.from&&state.to&&Number(state.from)>Number(state.to);
 $("rangeError").textContent=bad?"El año inicial supera al final.":"";
 rows=bad?[]:E.query(data.rows[state.level],state);
 selected=new Set([...selected].filter(id=>rows.some(r=>r.id===id)));
 drawFacets();
 const stats=[[rows.length,"Registros"],[new Set(rows.map(r=>r.fabricante_id||r.maker).filter(Boolean)).size,"Fabricantes"],[new Set(rows.map(r=>r.scale).filter(E.present)).size,"Escalas"]];
 $("stats").replaceChildren(...stats.map(([n,t])=>{const e=elem("div",undefined,"stat");e.append(elem("strong",n),elem("span",t));return e}));
 const max=Math.max(1,Math.ceil(rows.length/size));page=Math.max(1,Math.min(page,max));const start=(page-1)*size,chunk=rows.slice(start,start+size),cols=displayCols(),out=$("results");out.replaceChildren();
 updateSelection();activeFilters();$("scrollNotice").hidden=state.view!=="table"||!rows.length;
 $("pagination").hidden=state.view==="compare";$("page").textContent=rows.length?(start+1)+"–"+Math.min(start+size,rows.length)+" de "+rows.length+" · Página "+page+"/"+max:"0 resultados";$("prev").disabled=page<=1;$("next").disabled=page>=max;
 if(!rows.length)out.append(elem("p","No se encontraron coincidencias."));
 else if(state.view==="compare"){
   const compare=rows.filter(r=>selected.has(r.id));if(compare.length<2)out.append(elem("p","Selecciona entre dos y cuatro registros en la tabla, tarjetas o lista, y vuelve a Comparador."));else{const t=elem("table"),h=elem("tr");h.append(elem("th","Campo"),...compare.map(r=>elem("th",labelOf(r)+" · "+r.id)));t.append(h);for(const k of ["id",...cols.filter(k=>k!=="id")]){const tr=elem("tr");tr.append(elem("th",fieldName(k)),...compare.map(r=>{const td=elem("td");td.append(linkCell(r,k));return td}));t.append(tr)}out.append(t)}
 }else if(state.view==="table"){
  const t=elem("table"),head=elem("thead"),hr=elem("tr"),body=elem("tbody");for(const k of cols){const th=elem("th",fieldName(k));th.scope="col";hr.append(th)}hr.append(elem("th","Comparación"));head.append(hr);
  for(const r of chunk){const tr=elem("tr");for(const k of cols){const td=elem("td");if(k==="model"||k==="id"||k==="maker"&&state.level==="fabricante"){const b=elem("button",display(r[k]),"record-title");b.onclick=()=>openDetail(r);td.append(b)}else td.append(linkCell(r,k));tr.append(td)}const td=elem("td");td.append(selectBox(r));tr.append(td);body.append(tr)}t.append(head,body);out.append(t);
 }else if(state.view==="timeline"){
  const t=elem("div",undefined,"timeline");for(const r of chunk){const e=elem("div",undefined,"event");e.append(elem("strong",display(r.year)),rowCard(r,cols));t.append(e)}out.append(t);
 }else{const grid=elem("div",undefined,state.view==="list"?"list":"cards");chunk.forEach(r=>grid.append(rowCard(r,cols)));out.append(grid)}
 distribution();
}
function distribution(){const key=$("group").value,m=new Map();for(const r of rows){const k=display(r[key]);m.set(k,(m.get(k)||0)+1)}const out=$("dist");out.replaceChildren();for(const [k,n] of [...m].sort((a,b)=>b[1]-a[1]).slice(0,30)){const line=elem("div",undefined,"distrow"),bar=elem("progress");bar.max=rows.length||1;bar.value=n;line.append(elem("span",k+" · "+n),bar);out.append(line)}if(m.size>30)out.append(elem("p","Se muestran los 30 grupos más frecuentes.","small"))}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=elem("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function showSaved(){const box=$("saved");box.replaceChildren();if(!saved.length)box.append(elem("p","No hay listas guardadas.","small"));saved.forEach((s,i)=>{const line=elem("div",undefined,"saved"),open=elem("button","Abrir"),del=elem("button","Eliminar");open.onclick=()=>{try{apply(s)}catch(e){feedback(e.message)}};del.onclick=()=>{saved.splice(i,1);persist();showSaved()};line.append(elem("strong",s.name),open,del);box.append(line)})}
function persist(){try{localStorage.setItem(storage,JSON.stringify(saved));feedback("Criterios guardados en este navegador.")}catch{feedback("No se pudo acceder al almacenamiento local; listas temporales.")}}
function library(){const items=[["Volkswagen",{"brand":"Volkswagen"}],["Escala 1:64",{scale:"1:64"}],["Metal",{material:"Metal"}],["Volkswagen 1:64",{brand:"Volkswagen",scale:"1:64"}]];const box=$("library");for(const [name,facets] of items){const b=elem("button",name);b.onclick=()=>{if(!["demo","public"].includes(data?.mode)){feedback("Estas listas están configuradas para una fuente publicada. Recarga el catálogo publicado primero.");return}apply({...defaults(),name,facets})};box.append(b)}}
$("level").onchange=e=>changeLevel(e.target.value);
for(const k of ["q","from","to","logic","sort","view"])$(k).addEventListener("input",e=>{state[k]=e.target.value;if(k==="view"&&state.view!=="compare")lastView=state.view;if(k==="view"&&state.view==="timeline"){state.sort="year";$("sort").value="year"}resetPage()});
for(const k of facetKeys)$(k).onchange=e=>{state.facets[k]=e.target.value;resetPage()};
$("reset").onclick=()=>{state=defaults();selected.clear();sync();resetPage()};
$("addCondition").onclick=()=>{if(state.conditions.length>=50)return;state.conditions.push({field:available()[0]||"id",op:"eq",value:""});drawConditions();resetPage()};
$("size").onchange=e=>{size=Number(e.target.value);resetPage()};$("prev").onclick=()=>{page--;render()};$("next").onclick=()=>{page++;render()};$("group").onchange=distribution;
$("save").onclick=()=>{if(!$("name").value.trim()){feedback("Introduce el nombre de la lista.");return}if(!E.validateConfig(config(),fields)){feedback("Consulta inválida.");return}saved.push(config());persist();showSaved()};
$("export").onclick=()=>download("emdc-lista-v2.json",JSON.stringify(config(),null,2),"application/json");
$("copy").onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(config(),null,2));feedback("Configuración copiada.")}catch{feedback("Portapapeles no disponible; descarga el JSON.")}};
$("share").onclick=async()=>{if(!["demo","public"].includes(data?.mode)){feedback("Compartir por URL solo está habilitado con una fuente publicada; exporta los criterios locales si lo deseas.");return}if(!E.validateConfig(config(),fields)){feedback("Consulta inválida.");return}const u=new URL(location.href);u.hash="lista="+encodeURIComponent(JSON.stringify(config()));try{await navigator.clipboard.writeText(u.href);feedback("Enlace copiado.")}catch{$("shareLink").hidden=false;$("shareLink").value=u.href}};
$("csv").onclick=()=>download("emdc-resultados.csv",E.csv(rows,displayCols(),labels),"text/csv;charset=utf-8");
$("config").onchange=async e=>{try{if(e.target.files[0])apply(JSON.parse(await e.target.files[0].text()))}catch(err){feedback(err.message)}finally{e.target.value=""}};
$("file").onchange=async e=>{try{if(e.target.files[0])populateData(JSON.parse(await e.target.files[0].text()),"Archivo local · solo lectura")}catch(err){setStatus(err.message)}finally{e.target.value=""}};
$("reload").onclick=reload;$("compareNow").onclick=()=>{lastView=state.view==="compare"?lastView:state.view;state.view="compare";$("view").value="compare";render();$("resultSection").scrollIntoView({block:"start"})};$("clearSelection").onclick=()=>{selected.clear();if(state.view==="compare"){state.view=lastView;$("view").value=lastView}render()};$("backFilters").onclick=()=>$("filterSection").scrollIntoView({block:"start",behavior:"smooth"});$("closeDetail").onclick=()=>{const d=$("detail");if(typeof d.close==="function")d.close();else d.open=false};
try{const arr=JSON.parse(localStorage.getItem(storage)||"[]");if(Array.isArray(arr))saved=arr.filter(x=>x&&typeof x.name==="string");if(!localStorage.getItem(storage)){const old=JSON.parse(localStorage.getItem("emdc-ld01-conceptual-v1")||"[]");if(Array.isArray(old))saved=old.filter(x=>x?.schema==="EMDC-LD01-CONCEPTUAL-1.0").map(upgrade)}}catch{}
library();showSaved();sync();reload();
})();
