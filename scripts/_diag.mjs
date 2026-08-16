import puppeteer from "puppeteer-core";
const CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b=await puppeteer.launch({executablePath:CHROME,headless:"new",args:["--no-sandbox"],defaultViewport:{width:1440,height:900}});
b.on("targetcreated",async t=>{ if(t.type()==="worker") console.log("[worker created]", t.url().slice(0,140)); });
const p=await b.newPage();
p.on("requestfailed",r=>console.log("[reqfail]",r.url().slice(0,140),r.failure()?.errorText));
p.on("response",r=>{ if(r.status()>=400) console.log("[",r.status(),"]",r.url().slice(0,140)); });
await p.goto("http://127.0.0.1:8900/",{waitUntil:"networkidle0",timeout:60000});
await new Promise(r=>setTimeout(r,5000));
const workers=p.workers().map(w=>w.url());
console.log("\npage workers:", JSON.stringify(workers,null,1));
const o=await p.evaluate(()=>({
  hasWorkerCtor: typeof Worker,
  mlVersion: window.__map?.version ?? "?",
}));
console.log("env:", JSON.stringify(o));
await b.close();
