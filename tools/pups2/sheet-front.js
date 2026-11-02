const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
 const p=await b.newPage(); await p.setContent('<body></body>'); await p.addScriptTag({content:fs.readFileSync(''+__dirname+'/front.js','utf8')});
 const d=await p.evaluate(()=>{const W=1600,H=1000,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);
  const items=[['tidbit',false],['sugarfoot',false],['tidbit',true],['sugarfoot',true]];
  [false,true].forEach((mono,r)=>items.forEach((it,i)=>{g.save();g.translate(200+i*400,450+r*490);g.scale(1.25,1.25);PUPF.draw(g,it[0],{mono:mono,wave:it[1]});g.restore();}));
  return c.toDataURL('image/png').slice(22);});
 fs.writeFileSync('/tmp/cn/fsheet.png',Buffer.from(d,'base64')); await b.close();})();
