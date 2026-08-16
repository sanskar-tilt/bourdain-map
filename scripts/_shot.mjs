import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox"],defaultViewport:{width:1440,height:900,deviceScaleFactor:2}});
const p=await b.newPage();
const errs=[];
p.on("pageerror",e=>errs.push(String(e)));
p.on("console",m=>m.type()==="error"&&errs.push(m.text()));
const shots=[["/","home"],["/place/swan-oyster-depot-san-francisco/","place"],["/city/new-orleans-us/","city"],["/about/","about"]];
for(const [url,name] of shots){
  await p.goto("http://127.0.0.1:8900"+url,{waitUntil:"networkidle0",timeout:60000});
  await new Promise(r=>setTimeout(r,2500));
  await p.screenshot({path:`/tmp/shot-${name}.png`});
  console.log("shot",name);
}
// palette
await p.goto("http://127.0.0.1:8900/",{waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,2000));
await p.keyboard.press("Slash");
await new Promise(r=>setTimeout(r,400));
await p.keyboard.type("acaraje");
await new Promise(r=>setTimeout(r,700));
await p.screenshot({path:"/tmp/shot-search.png"});
console.log("shot search");
if(errs.length){console.log("\nERRORS:");errs.slice(0,8).forEach(e=>console.log("  "+e.slice(0,200)));}
else console.log("\nno console errors");
await b.close();
