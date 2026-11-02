const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setContent('<body></body>'); await p.addScriptTag({content:fs.readFileSync(''+__dirname+'/side.js','utf8')});
 const d=await p.evaluate(()=>{const W=1700,H=900,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);
  const items=[['tidbit','sit',0],['sugarfoot','sit',0],['tidbit','stand',0.6],['sugarfoot','stand',-0.6]];
  [false,true].forEach((mono,r)=>items.forEach((it,i)=>{g.save();g.translate(210+i*410,400+r*440);g.scale(1.55,1.55);PUP2.draw(g,it[0],it[1],{mono:mono,step:it[2]});g.restore();}));
  return c.toDataURL('image/png').slice(22);});
 fs.writeFileSync('/tmp/cn/sheet.png',Buffer.from(d,'base64')); await b.close();})();
