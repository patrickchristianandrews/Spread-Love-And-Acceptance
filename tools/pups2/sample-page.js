global.window=global; const R='/home/user/Spread-Love-And-Acceptance/tools/pups2/';
require(R+'front.js'); require(R+'side.js'); require(R+'scene.js'); const S=require(R+'svgctx.js'); const fs=require('fs');
function page(mono){
 const W=850,H=1100,g=new S(W,H),o={mono};
 g.fillStyle='#fff'; g.fillRect(0,0,W,H);
 g.raw('<defs><clipPath id="fr"><rect x="24" y="24" width="'+(W-48)+'" height="'+(H-48)+'" rx="46"/></clipPath></defs><g clip-path="url(#fr)">');
 // sky things
 SCENE.sun(g,690,170,52,o); SCENE.cloud(g,200,150,1.0,o); SCENE.cloud(g,470,230,0.7,o);
 SCENE.butterfly(g,130,360,1.5,o); SCENE.butterfly(g,560,330,1.2,o);
 SCENE.hills(g,W,560,700,o);
 SCENE.tree(g,710,640,1.15,o);
 SCENE.fence(g,40,560,640,120,o);
 // flowers and grass in front
 [[90,980,'#F48FB1'],[780,960,'#B79CEB'],[430,1000,'#FFD95A']].forEach(p=>SCENE.flower(g,p[0],p[1],1.1,p[2],o));
 [[180,1000],[600,1010],[330,990],[720,1005]].forEach(p=>SCENE.tuft(g,p[0],p[1],1.2,o));
 SCENE.ball(g,425,950,34,o);
 // the pups: big, side by side, a clear gap between them
 g.save(); g.translate(225,960); g.scale(1.55,1.55); PUPF.draw(g,'sugarfoot',{mono}); g.restore();
 g.save(); g.translate(630,960); g.scale(1.55,1.55); PUPF.draw(g,'tidbit',{mono,wave:true}); g.restore();
 g.raw('</g>'); SCENE.frame(g,W,H,24,o);
 return g.svg();
}
fs.writeFileSync('/tmp/cn/page1-l.svg',page(true)); fs.writeFileSync('/tmp/cn/page1-c.svg',page(false));
