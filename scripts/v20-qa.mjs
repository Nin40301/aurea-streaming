import { _electron } from "@playwright/test";
const app=await _electron.launch({args:["."],env:{...process.env,AUREA_DATA_DIR:process.cwd()+"/../../work/v20-final"}});
const p=await app.firstWindow(); const errors=[]; p.on("pageerror",e=>errors.push(e.message));
const sizes=[[1440,900],[1920,1080]];
async function snap(name){for(const [w,h] of sizes){await app.evaluate(({BrowserWindow},s)=>BrowserWindow.getAllWindows()[0].setContentSize(...s),[w,h]);await p.waitForTimeout(250);await p.screenshot({path:`screenshots/v20-${name}-${w}.png`,animations:"disabled"});}}
await snap("profiles"); await p.getByRole("button",{name:/Meu cinema/}).click(); await snap("home");
for(const [name,label] of [["movies","Filmes"],["series","Séries"],["library","Minha Lista"],["addons","Add-ons"],["settings","Configurações"]]){await p.getByRole("navigation",{name:"Explorar"}).getByRole("button",{name:label,exact:true}).click();await snap(name);}
await p.getByRole("navigation",{name:"Explorar"}).getByRole("button",{name:"Descobrir",exact:true}).click(); const search=p.getByRole("textbox",{name:"Buscar títulos"});await search.fill("Sintel");await snap("search");await search.fill("");
await p.getByRole("button",{name:"Detalhes de Sintel",exact:true}).first().click(); await snap("movie-detail");
await p.getByRole("button",{name:"Voltar",exact:true}).click(); await p.getByRole("navigation",{name:"Explorar"}).getByRole("button",{name:"Séries",exact:true}).click(); await p.getByRole("button",{name:"Detalhes de Mundos da Blender",exact:true}).click(); await snap("series-detail");
await p.getByRole("button",{name:/Sintel - A jornada/}).click(); await p.getByRole("button",{name:/MP4/}).first().click(); await p.locator("video").waitFor(); await snap("player");
console.log("RENDERER_ERRORS",errors); await app.close();
