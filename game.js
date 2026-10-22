
// ===================== 1. GAME DIFFICULTY — EDIT VALUES HERE =====================
const GAME_SETTINGS = {
  durationSeconds: 90,             // Initial playtime; combo bonuses can extend it.
  totalBoxes: 1000,                 // 3 items per box: 1000 boxes = 3000 stock items.
  startingFrontItems: 8,           // Recommended 5–14; keep empty spaces for movement.
  boxesPerLockedShelf: 70,         // Stock rows reserved inside each locked shelf (deep, so unlocked shelves keep refilling).
  cabinetUnlockAt: [2, 4],         // Box scores that open the two half-open cabinets.
  lockedShelfUnlockAt: [6, 8, 10, 12, 14], // Five locked shelves, in order.
  manualRefreshCooldownSeconds: 4,
  minimumRefreshEmptySlots: 5,     // Empty usable front positions retained after any refresh.
  results: { normalFrom: 70, happyFrom: 200 },
  combo: {
    activationMatches: 3,          // Number of matches needed to activate combo.
    activationWindow: 20,          // Those matches must fit inside this many seconds.
    startWindow: 20,                // Time to make the next match at 3×.
    minWindow: 7,                  // Shortest combo countdown.
    fastAt: 60,                    // Countdown reaches minWindow at this combo.
    max: 100,                      // Maximum displayed multiplier.
    bonusAt: 3, bonusSeconds: 3,    // Reward at every new multiple of bonusAt.
    maxBonusSeconds: 4             // Reward on each match at the maximum combo.
  }
};
// ===================== 1B. APPEARANCE / FIXED BOARD STRUCTURE =====================
// Difficulty aliases below read GAME_SETTINGS automatically; edit the block above.
const W=360,H=640,COLS=3,ROWS=4;
const GAME_TIME=GAME_SETTINGS.durationSeconds,TOTAL_BOXES=GAME_SETTINGS.totalBoxes;
const START_FRONTS=GAME_SETTINGS.startingFrontItems,LOCK_ROWS=GAME_SETTINGS.boxesPerLockedShelf;
const SHUFFLE_CD=GAME_SETTINGS.manualRefreshCooldownSeconds;
const DOOR_AT=GAME_SETTINGS.cabinetUnlockAt,UNLOCK_AT=GAME_SETTINGS.lockedShelfUnlockAt;
const HAPPY_JUMP=GAME_SETTINGS.results.happyFrom,HAPPY_STAND=GAME_SETTINGS.results.normalFrom;
const COMBO_SETTINGS=GAME_SETTINGS.combo;
const CWD=114,RH=106,X0=9,Y0=89,ITEM_SCALE=.78;
const GROUND=630,SOSO_X=62,SOSO_SCALE=1.15;
const LOCKED=[[1,2],[2,0],[2,2],[3,0],[3,2]],DOORS=[[0,0],[2,1]];
const ITEM_TYPES=12;

// ===================== 2. DRAW HELPERS (same helpers/palette as Momo Pudding Panic) =====================
const cv=document.getElementById('c'),ctx=cv.getContext('2d');let S=1;
function fit(){const k=Math.min(innerWidth/W,innerHeight/H)*.97;cv.style.width=W*k+'px';cv.style.height=H*k+'px';S=k*Math.min(devicePixelRatio||1,2);cv.width=W*S;cv.height=H*S}
addEventListener('resize',fit);fit();
const F="'Fredoka','Arial Rounded MT Bold',ui-rounded,system-ui,sans-serif",B='#6b3920';   // B = character outline brown
const rr=(x,y,w,h,r,f,k,lw)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(f){ctx.fillStyle=f;ctx.fill()}if(k){ctx.strokeStyle=k;ctx.lineWidth=lw||2;ctx.lineJoin='round';ctx.stroke()}};
const ci=(x,y,r,f,k,lw)=>{ctx.beginPath();ctx.arc(x,y,r,0,7);if(f){ctx.fillStyle=f;ctx.fill()}if(k){ctx.strokeStyle=k;ctx.lineWidth=lw||2;ctx.stroke()}};
const grad=(y0,y1,a,b)=>{const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(1,b);return g};
function poly(p,f,k,lw){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);p.slice(1).forEach(q=>ctx.lineTo(q[0],q[1]));ctx.closePath();ctx.fillStyle=f;ctx.fill();ctx.strokeStyle=k;ctx.lineWidth=lw||2;ctx.lineJoin='round';ctx.stroke()}
['500','700'].forEach(w=>{try{document.fonts.load(w+' 20px Fredoka')}catch(e){}});   // load Fredoka before the first menu draw
function txt(s,x,y,z,f,al){ctx.font='700 '+z+'px '+F;ctx.textAlign=al||'center';ctx.lineJoin='round';ctx.lineWidth=z/4;ctx.strokeStyle='#fff';ctx.strokeText(s,x,y);ctx.fillStyle=f||'#3d5a80';ctx.fillText(s,x,y)}

// ===================== 3. ITEM ASSETS =====================
// Array order is the item type used by matching logic. Change paths here to replace art.
const ITEM_PATHS = ['peach-tea', 'milk', 'flashlight', 'handheld-fan', 'blueberry-jam', 'potato-chips', 'cup-noodle', 'baguette', 'canned-tuna', 'cookie-tin', 'shampoo', 'strawberry-milk'];
const ITEM_IMAGES = ITEM_PATHS.map(name => {
 const image = new Image(); image.src = 'asset/items/' + name + '.png'; return image;
});
// Fit each artwork inside a 46 x 62 sprite box while keeping its proportions.
function drawItem(t,x,y,s,a){
 const image=ITEM_IMAGES[t]; if(!image || !image.complete || !image.naturalWidth)return;
 const scale=Math.min(46/image.naturalWidth,62/image.naturalHeight)*s;
 const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
 ctx.save();ctx.globalAlpha=a==null?1:a;ctx.drawImage(image,x-w/2,y+24*s-h,w,h);ctx.restore();
}

// ===================== 4. SOSO + BOX + TROLLEY ASSETS =====================
// External image files keep this program readable. Do not rename without changing these keys.
const SPR_PATHS = ['hr_h', 'fl_h', 'body_a', 'box_open', 'hl_n', 'box_closed', 'tr_empty', 'fr_n', 'tr_box', 'hr_n', 'fr_h', 'fl_n', 'hr_a', 'body_h', 'body_n', 'hl_a', 'hl_h'];
const SPR={};for(const k of SPR_PATHS){const i=new Image();i.src='asset/soso/'+k+'.webp?v=20261020-body';SPR[k]=i}
const img=(n,x,y,w,h)=>{const i=SPR[n];if(i&&i.complete&&i.naturalWidth)ctx.drawImage(i,x,y,w,h)};
const sz=n=>SPR[n].naturalWidth?[SPR[n].naturalWidth,SPR[n].naturalHeight]:[1,1];
const cl=x=>Math.max(0,Math.min(1,x)),eio=x=>{x=cl(x);return x*x*(3-2*x)};
const BS=.61,TS=.95,GY=350;      // box scale, trolley scale, ground line (all in sprite units; Soso's body sprite is 250 wide)
// Hand targets in body-sprite units (body ~250 wide, centre x=125). Smaller offsets from 125 = hands hug the body.
const HANDS={side:[[92,262],[190,258]],hold:[[116,268],[252,262]],push:[[246,242],[256,252]],up:[[42,150],[208,150]]};
const TROLLEY_DX=-22;           // trolley slides in by the same amount so the handle still meets her hands
let hcur=null,dtG=.016;
function boxU(name,cx,bot,items,sc){const[w0,h0]=sz(name),w=w0*BS,h=h0*BS;ctx.save();ctx.translate(cx,bot);ctx.scale(sc||1,sc||1);
 if(items)items.forEach((t,i)=>drawItem(t,(i-1)*36,-h*.9,1.25));img(name,-w/2,-h,w,h);ctx.restore()}
function trolleyU(name,tx){const[w0,h0]=sz(name);img(name,tx+TROLLEY_DX,GY-h0*TS,w0*TS,h0*TS)}
// o: {face:'n'|'h'|'a', arms:'side'|'hold'|'push'|'up', walk, ph, flip, hop, tilt, tuck, sq, kick, prop:()=>draw between body and hands}
// Old body art came as two separate parts (head / torso with a transparent gap). Detect that automatically so
// either art works: returns the row where the head ends, or -1 if the image is one connected piece.
const splitCache=new Map();
function splitRow(im){
 if(splitCache.has(im))return splitCache.get(im);
 let r=-1;
 try{const c=document.createElement('canvas'),w=im.naturalWidth,h=im.naturalHeight;c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(im,0,0);
  const d=x.getImageData(0,0,w,h).data;
  for(let y=Math.floor(h*.55);y<Math.floor(h*.8);y++){let solid=0;for(let xx=0;xx<w;xx++)if(d[(y*w+xx)*4+3]>40)solid++;if(solid===0){r=y;break}}
  if(r<0){ // fallback for the known old art: a thin transparent neck band
   for(let y=Math.floor(h*.55);y<Math.floor(h*.8);y++){let solid=0;for(let xx=Math.floor(w*.35);xx<Math.floor(w*.65);xx++)if(d[(y*w+xx)*4+3]>40)solid++;if(solid===0){r=y;break}}}
 }catch(e){r=222}
 splitCache.set(im,r);return r;
}
function drawSoso(x,y,k,o){o=o||{};const f=o.face||'n',ph=o.ph||0,sn=Math.sin,PI=Math.PI,wk=o.walk?1:0,tg=HANDS[o.arms||'side'];
 if(!hcur)hcur=tg.map(p=>p.slice());const a=1-Math.exp(-dtG*16);hcur.forEach((p,i)=>{p[0]+=(tg[i][0]-p[0])*a;p[1]+=(tg[i][1]-p[1])*a});
 const air=-(o.hop||0);ctx.fillStyle='rgba(60,100,150,'+(.2*Math.max(.35,1-air/120))+')';ctx.beginPath();ctx.ellipse(x,y+2,115*k*(1-Math.min(.3,air/260)),20*k,0,0,7);ctx.fill();
 const bob=wk?-Math.abs(sn(ph))*9:sn(clock*2.4)*2.5,sw=(o.arms||'side')=='side'?wk:0;
 ctx.save();ctx.translate(x,y+(o.hop||0));ctx.rotate(o.tilt||0);ctx.scale((o.flip?-1:1)*k,k*(o.sq||1)*(1+.012*sn(clock*2.4)));ctx.translate(-125,-GY);
 const foot=(n,cx,cy)=>{const[w,h]=sz(n);img(n,cx-w/2,cy-h/2,w,h)};
 const fn='f%_'+(f=='a'?'n':f),tk=(o.tuck||0)*14;
 foot(fn.replace('%','l'),88+sn(ph)*12*wk,320-Math.max(0,sn(ph))*16*wk-tk);
 foot(fn.replace('%','r'),172-sn(ph)*12*wk+70*(o.kick||0),324-Math.max(0,-sn(ph))*16*wk-tk-38*(o.kick||0));
 // The body asset contains two separated parts. Keep the torso in place and lower
 // the head by HEAD_DROP sprite pixels so it overlaps the neckline naturally.
 const body=SPR['body_'+f],HEAD_DROP=14;
 if(body.complete&&body.naturalWidth){
  const bw=body.naturalWidth,bh=body.naturalHeight,HEAD_CUT=splitRow(body);
  if(HEAD_CUT<0)ctx.drawImage(body,0,bob);   // new art: head and body are ONE piece → drawn as-is
  else{ctx.drawImage(body,0,HEAD_CUT,bw,bh-HEAD_CUT,0,bob+HEAD_CUT,bw,bh-HEAD_CUT);
  ctx.drawImage(body,0,0,bw,HEAD_CUT,0,bob+HEAD_DROP,bw,HEAD_CUT);}
 }
 if(o.prop)o.prop();
 const hand=(n,p,dy)=>{const[w,h]=sz(n);img(n,p[0]-w/2,p[1]-h/2+bob+dy,w,h)};
 hand('hl_'+f,hcur[0],sw*sn(ph)*13);hand('hr_'+f,hcur[1],-sw*sn(ph)*13);
 ctx.restore()}

// ===================== 5. MUSIC + VOLUME =====================
// ONE background track plays from the first moment the browser allows sound and is never stopped, rewound or restarted by
// the game (new game, pause, home, mute…). "Mute" only turns the volume to 0 - the track keeps running underneath.
// Browsers refuse sound until the player touches the page, so the track is started immediately on load AND retried on the
// very first tap / click / key press.
const MUSIC_FILE='asset/audio/stockspree.mp3';            // keep the folder name aligned with GitHub (asset, singular)
const SOUND_KEY='sosoStockShuffle.sound',BEST_KEY='sosoStockShuffle.best';
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let soundOn=store.get(SOUND_KEY)!=='off';                  // Sound ON / OFF (saved on the device)
const gameplayMusic=new Audio(MUSIC_FILE);
gameplayMusic.loop=true;gameplayMusic.preload='auto';gameplayMusic.volume=1;
// Rules: ON → the track plays from launch (after the first touch if the browser insists) and replays after every result screen.
//        OFF → the track is stopped and the audio session released, so the phone's own music/podcasts can play over the game.
//        Result screen → music stops; it comes back on the next touch (the tap that starts the next round).
let musicWanted=true,musicHeld=false;                      // musicWanted: tab visible · musicHeld: result screen showing
const shouldPlay=()=>soundOn&&musicWanted&&!musicHeld;
const UNLOCK_EVENTS=['pointerdown','pointerup','touchend','mouseup','click','keydown'];
function armUnlock(){UNLOCK_EVENTS.forEach(ev=>addEventListener(ev,unlockMusic,true));}
function disarmUnlock(){UNLOCK_EVENTS.forEach(ev=>removeEventListener(ev,unlockMusic,true));}
function unlockMusic(){startMusic()}
function startMusic(){
 if(!shouldPlay())return;
 try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}   // play even with the iPhone silent switch on
 const p=gameplayMusic.play();
 if(p)p.then(disarmUnlock).catch(armUnlock);               // blocked by the browser → retry on the next touch
}
function stopMusic(){gameplayMusic.pause();try{if(navigator.audioSession)navigator.audioSession.type='auto'}catch(e){}}
function setSound(on){soundOn=on;store.set(SOUND_KEY,on?'on':'off');if(on){armUnlock();startMusic()}else stopMusic()}
function holdMusicForResult(){musicHeld=true;stopMusic()}                    // result screen appears
function releaseMusicForNewRound(){musicHeld=false;gameplayMusic.currentTime=0;armUnlock();startMusic()}
armUnlock();startMusic();
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){musicWanted=false;gameplayMusic.pause()}
 else{musicWanted=true;armUnlock();startMusic()}});

// ===================== 6. GAME STATE =====================
// G[r][c] = {lock:index|-1, slots:[{f:front item, b:item hidden behind}, x3]}   item = {t,x,y,pop}
let state='title',time=GAME_TIME,boxes=0,G=[],sel=null,flyers=[],msg={t:0,s:''};
let drag=null,shufCD=0;
let phase='idle',pt=0,sx=0,toff=0,ex=0,happyT=0,queued=0,boxItems=[],lid=0,lastType=0,endT=0,clock=0;
const rnd=n=>Math.random()*n|0;
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const slotX=(c,i)=>X0+c*CWD+20+i*37, slotY=r=>Y0+r*RH+RH-36;
const blocked=(r,c,i)=>G[r][c].door>=0&&i!=1&&boxes<DOOR_AT[G[r][c].door];
const isOpen=(r,c)=>{const l=G[r][c].lock;return l<0||boxes>=UNLOCK_AT[l]};
const mk=(t,r,c,i,dy)=>({t,x:slotX(c,i),y:slotY(r)+(dy||0),pop:0});
// Back rows belong to their shelf. Each slot keeps a queue (q) of items stacked behind it; the next row only slides forward
// once the shelf's WHOLE front row is empty.
// Choose the next batch ONCE. Rendering and replenishment share this exact plan.
function getRestockPlan(cp){
 const heads=cp.slots.map(s=>s.q[0]||null),types=heads.map(it=>it?.t);
 if(cp.restockPlan&&cp.restockGate===(boxes<(cp.door>=0?DOOR_AT[cp.door]:0)&&cp.door>=0)&&heads.every((it,i)=>it===cp.restockHeads[i]&&types[i]===cp.restockTypes[i]))return cp.restockPlan;
 const gate=boxes<(cp.door>=0?DOOR_AT[cp.door]:0)&&cp.door>=0;   // closed cabinet: only the middle slot restocks
 const available=shuf([0,1,2].filter(i=>heads[i]&&!(gate&&i!==1)));
 const roll = Math.random();
 let count = roll < 0.08 ? 1 : roll < 0.22 ? 2 : 3;      // mostly full rows (fewer gaps)
 count = Math.min(count, available.length);
 // Never preview a batch that would arrive already matched.
 if(count===3&&heads.every(it=>it&&it.t===heads[0].t))count=2;
 cp.restockGate=gate;cp.restockHeads=heads;cp.restockTypes=types;cp.restockPlan=available.slice(0,count);
 return cp.restockPlan;
}
function advance(r,c){
 const cp=G[r][c],slots=cp.slots;if(slots.some(s=>s.f))return;
 const plan=getRestockPlan(cp).slice();
 plan.forEach(i=>{const it=slots[i].q.shift();it.x=slotX(c,i)-5;it.y=slotY(r)-7;it.pop=.5;slots[i].f=it;});
 cp.restockPlan=null;
}
const rowsTri=cp=>{const s=cp.slots,n=Math.max(...s.map(q=>q.q.length));for(let j=0;j<n;j++)if(s.every(q=>q.q[j])&&s[0].q[j].t==s[1].q[j].t&&s[1].q[j].t==s[2].q[j].t)return true;return false};
function compTri(r,c){const s=G[r][c].slots;return s.every(q=>q.f)&&s[0].f.t==s[1].f.t&&s[1].f.t==s[2].f.t}
function anyTri(){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(compTri(r,c))return true;return false}
function easyCount(){let n=0;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isOpen(r,c)){
 const u=[0,1,2].filter(i=>!blocked(r,c,i)).map(i=>G[r][c].slots[i]);
 if(u.length==3){const f=u.filter(s=>s.f);if(f.length==2&&f[0].f.t==f[1].f.t)n++}}return n}   // shelves one move away from a match
function deal(){let bad=true,tries=0;while(bad){G=[];
 for(let r=0;r<ROWS;r++){G.push([]);for(let c=0;c<COLS;c++)G[r].push({lock:LOCKED.findIndex(l=>l[0]==r&&l[1]==c),door:DOORS.findIndex(d=>d[0]==r&&d[1]==c),dop:0,slots:[{q:[]},{q:[]},{q:[]}]})}
 const normal=[],locked=[],acc=[],doors=[];
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const cp=G[r][c];if(cp.lock>=0)locked.push([r,c]);else if(cp.door<0)normal.push([r,c]);else doors.push([r,c]);
  for(let i=0;i<3;i++)if(isOpen(r,c)&&!blocked(r,c,i))acc.push([r,c,i])}
 const openSets=TOTAL_BOXES-locked.length*LOCK_ROWS;
 const ty=[];for(let t=0;t<ITEM_TYPES;t++)ty.push(t);while(ty.length<TOTAL_BOXES)ty.push(rnd(ITEM_TYPES));shuf(ty);
 const A=[];ty.slice(0,openSets).forEach(t=>A.push(t,t,t));shuf(A);               // open shelves: whole sets of 3
 const it=(t)=>({t,x:0,y:0,pop:0});
 const pick=normal.map(([r,c])=>[r,c,rnd(3)]).concat(doors.map(([r,c])=>[r,c,1]));   // cabinets start with their one reachable item                                  // every open shelf starts with at least 1 front item
 const rest=shuf(acc.filter(p=>!pick.some(q=>q[0]==p[0]&&q[1]==p[1]&&q[2]==p[2]))).slice(0,START_FRONTS-pick.length);
 pick.concat(rest).forEach((p,k)=>{G[p[0]][p[1]].slots[p[2]].f=mk(A[k],p[0],p[1],p[2])});
 // Allocate every remaining item exactly once, even when startingFrontItems
 // is not a multiple of three. The final back row may be partial.
 const order=shuf(normal.concat(doors));                     // cabinets get back rows too (2nd row onwards)
 for(let k=START_FRONTS;k<A.length;k++){
  const offset=k-START_FRONTS,[r,c]=order[Math.floor(offset/3)%order.length];
  G[r][c].slots[offset%3].q.push(it(A[k]));
 }
 locked.forEach(([r,c],n)=>{const types=ty.slice(openSets+n*LOCK_ROWS,openSets+(n+1)*LOCK_ROWS);let rows,g=0;     // each locked shelf: its own 5 sets
  do{const pool=[];types.forEach(t=>pool.push(t,t,t));shuf(pool);rows=[];for(let j=0;j<LOCK_ROWS;j++)rows.push(pool.slice(j*3,j*3+3))}
  while(g++<300&&rows.some(rw=>rw[0]==rw[1]&&rw[1]==rw[2]));
  rows.forEach((rw,j)=>rw.forEach((t,i)=>{if(j==0)G[r][c].slots[i].f=mk(t,r,c,i);else G[r][c].slots[i].q.push(it(t))}))});
 preventBackTriples();bad=anyTri();for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(rowsTri(G[r][c]))bad=true;
 if(!bad&&tries++<300&&easyCount()<2)bad=true}}
function newGame(){resetComboGame();boxes=0;time=GAME_TIME;sel=null;flyers=[];phase='idle';pt=0;sx=0;queued=0;boxItems=[];lid=0;msg.t=0;deal();drag=null;shufCD=0;state='play';refreshAnim=null;autoCheckTimer=.25;lastCheckedBoard='';TUT=null;scoreSaved=false;soundOpen=false;releaseMusicForNewRound()}

// ===================== COMBO SETTINGS / STATE =====================

let combo=0,comboLeft=0,comboWindow=COMBO_SETTINGS.startWindow,matchTimes=[],playClock=0,timeBonusLeft=0,timeBonusText='',timerPeak=GAME_TIME;
function resetCombo(){combo=0;comboLeft=0;comboWindow=COMBO_SETTINGS.startWindow;matchTimes=[];}
function resetComboGame(){resetCombo();playClock=0;timeBonusLeft=0;timeBonusText='';timerPeak=GAME_TIME;}
function comboMatch(){
 const previousCombo=combo;
 if(combo>=COMBO_SETTINGS.activationMatches){combo=Math.min(COMBO_SETTINGS.max,combo+1);}
 else{
  matchTimes=matchTimes.filter(t=>playClock-t<=COMBO_SETTINGS.activationWindow);matchTimes.push(playClock);
  if(matchTimes.length>=COMBO_SETTINGS.activationMatches)combo=COMBO_SETTINGS.activationMatches;
 }
 if(combo>=COMBO_SETTINGS.activationMatches){
  comboWindow=COMBO_SETTINGS.startWindow-(COMBO_SETTINGS.startWindow-COMBO_SETTINGS.minWindow)*cl((combo-COMBO_SETTINGS.activationMatches)/Math.max(1,COMBO_SETTINGS.fastAt-COMBO_SETTINGS.activationMatches));
  comboLeft=comboWindow;
  const milestoneBonus=combo>previousCombo&&COMBO_SETTINGS.bonusAt>0&&combo%COMBO_SETTINGS.bonusAt===0?COMBO_SETTINGS.bonusSeconds:0;
  const capBonus=combo>=COMBO_SETTINGS.max?COMBO_SETTINGS.maxBonusSeconds:0;
  const bonus=milestoneBonus+capBonus;
  if(bonus){time+=bonus;timerPeak=Math.max(timerPeak,time);timeBonusText='+'+bonus;timeBonusLeft=.4;}
 }
}
function updateCombo(dt){
 playClock+=dt;timeBonusLeft=Math.max(0,timeBonusLeft-dt);
 if(combo>=COMBO_SETTINGS.activationMatches){comboLeft=Math.max(0,comboLeft-dt);if(comboLeft<=0)resetCombo();}
 else matchTimes=matchTimes.filter(t=>playClock-t<=COMBO_SETTINGS.activationWindow);
}
// Break any pre-matched hidden row using swaps, preserving every stock item.
function preventBackTriples(){
 const refs=[];G.forEach(row=>row.forEach(cp=>cp.slots.forEach((slot,col)=>slot.q.forEach((it,depth)=>refs.push({cp,col,depth,it})))));
 const triple=(cp,d)=>cp.slots.every(slot=>slot.q[d])&&cp.slots.every(slot=>slot.q[d].t===cp.slots[0].q[d].t);
 for(const p of refs){if(!triple(p.cp,p.depth))continue;
  for(const q of shuf(refs.slice())){if(q.it.t===p.it.t||q.cp===p.cp&&q.depth===p.depth)continue;
   [p.it.t,q.it.t]=[q.it.t,p.it.t];if(!triple(p.cp,p.depth)&&!triple(q.cp,q.depth))break;
   [p.it.t,q.it.t]=[q.it.t,p.it.t];
  }
 }
}
// A promoted row must never appear already matched: move its third item into
// another usable empty front position. If none exists, keep that item queued.
function preventPromotedTriple(r,c){
 if(!compTri(r,c))return;const source=G[r][c].slots[2],it=source.f;source.f=null;
 for(let rr=0;rr<ROWS;rr++)for(let cc=0;cc<COLS;cc++)if((rr!==r||cc!==c)&&isOpen(rr,cc))for(let i=0;i<3;i++){
  const dst=G[rr][cc].slots[i];if(blocked(rr,cc,i)||dst.f)continue;
  if(G[rr][cc].slots.every((slot,j)=>j===i||slot.f?.t===it.t))continue;
  dst.f=it;it.x=slotX(cc,i);it.y=slotY(rr);return;
 }
 source.q.unshift(it);
}

// ===================== 7. MATCH + RESTOCK LOGIC =====================
// A match is only ever made by the player's own drop, and counts exactly one box.
function clearComp(r,c){const sl=G[r][c].slots;boxes++;comboMatch();queued++;lastType=sl[0].f.t;
 sl.forEach(s=>{if(s.f){flyers.push({x:s.f.x,y:s.f.y,t:0,type:s.f.t});s.f=null}});happyT=.9;advance(r,c);
 if(UNLOCK_AT.includes(boxes)||DOOR_AT.includes(boxes))msg={t:1.6,s:'More shelf space!'};
 if(G.every(row=>row.every(cp=>cp.slots.every(s=>!s.f&&!s.q.length)))){state='over';endT=0;drag=null}}   // whole store restocked
// ===================== 7A. POSITION-PRESERVING REFRESH =====================
// Only item TYPES change. Front occupancy, queue depths and item coordinates stay intact.
let refreshAnim=null,autoCheckTimer=0,lastCheckedBoard='';
const REFRESH_DURATION=1.85;
const REFRESH_ART={};
for(const name of ['shutter','pulling-pose']){const image=new Image();image.src='asset/refresh/'+name+'.png';REFRESH_ART[name]=image;}
function boardFingerprint(){return boxes+'|'+G.flat().map(cp=>cp.slots.map(s=>(s.f?s.f.t:'_')+':'+s.q.map(it=>it.t).join(',')).join('/')).join('|');}
function accessibleFront(){const list=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isOpen(r,c))G[r][c].slots.forEach((s,i)=>{if(!blocked(r,c,i)&&s.f)list.push({it:s.f,r,c,i});});return list;}
// A complete set must exist on playable fronts, with space to move it into a shelf.
function hasPlayableMatch(){
 const fronts=accessibleFront(),counts=Array(ITEM_TYPES).fill(0);fronts.forEach(p=>counts[p.it.t]++);
 let empty=0;const shelves=[];
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isOpen(r,c)){
  G[r][c].slots.forEach((s,i)=>{if(!blocked(r,c,i)&&!s.f)empty++;});
  if([0,1,2].every(i=>!blocked(r,c,i)))shelves.push(G[r][c].slots);
 }
 return counts.some((n,t)=>n>=3&&shelves.some(sl=>{
  const same=sl.filter(s=>s.f&&s.f.t===t).length,free=sl.filter(s=>!s.f).length;
  return same===3||(empty>0&&(free>0||empty>free));
 }));
}
function shuffleBoard(){
 ensureRefreshSpace();
 const entries=[];G.forEach((row,r)=>row.forEach((cp,c)=>cp.slots.forEach((s,i)=>{
  if(s.f)entries.push({it:s.f,r,c,i,front:true});
  s.q.forEach(it=>entries.push({it,r,c,i,front:false}));
 })));
 const original=entries.map(p=>p.it.t),counts=Array(ITEM_TYPES).fill(0);original.forEach(t=>counts[t]++);
 const fronts=accessibleFront(),pairs=[];
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isOpen(r,c)&&[0,1,2].every(i=>!blocked(r,c,i))){
  const occupied=fronts.filter(p=>p.r===r&&p.c===c);
  if(occupied.length===2)pairs.push(occupied);
 }
 let best=original.slice(),bestScore=-1;
 // Construct two front sets, preferring pairs on shelves with one empty position.
 for(let attempt=0;attempt<100;attempt++){
  const pool=shuf(original.slice()),remaining=counts.slice(),types=[];
  for(const t of shuf([...Array(ITEM_TYPES).keys()]))while(remaining[t]>=3&&types.length<Math.min(2,Math.floor(fronts.length/3))){types.push(t);remaining[t]-=3;}
  const chosen=shuf(pairs.slice()).slice(0,types.length),reserved=new Set(),assign=new Map();
  chosen.forEach((pair,n)=>pair.forEach(p=>{assign.set(p.it,types[n]);reserved.add(p.it);}));
  const spare=shuf(fronts.filter(p=>!reserved.has(p.it)));
  types.forEach((t,n)=>{for(let k=chosen[n]?2:0;k<3;k++){const p=spare.pop();if(p){assign.set(p.it,t);reserved.add(p.it);}}});
  let valid=true;
  for(const t of assign.values()){const index=pool.indexOf(t);if(index<0){valid=false;break;}pool.splice(index,1);}
  if(!valid)continue;
  // Fill all remaining fixed positions from the remaining stock, avoiding automatic triples.
  entries.forEach(p=>{if(assign.has(p.it))p.it.t=assign.get(p.it);else p.it.t=-1;});
  for(const p of shuf(entries.filter(p=>!assign.has(p.it)))){
   let index=pool.findIndex(t=>!p.front||!G[p.r][p.c].slots.every((s,i)=>i===p.i||(s.f&&s.f.t===t)));
   if(index<0)index=0;p.it.t=pool.splice(index,1)[0];
  }
  const fc=Array(ITEM_TYPES).fill(0);fronts.forEach(p=>fc[p.it.t]++);
  const complete=fc.reduce((n,v)=>n+Math.floor(v/3),0),score=(hasPlayableMatch()?100:0)+Math.min(2,easyCount())*10+Math.min(2,complete);
  if(!anyTri()&&score>bestScore){best=entries.map(p=>p.it.t);bestScore=score;}
  if(bestScore>=122)break;
 }
 entries.forEach((p,i)=>p.it.t=best[i]);preventBackTriples();ensureRefreshSpace();
 lastCheckedBoard=boardFingerprint();autoCheckTimer=.3;
 msg={t:1.5,s:hasPlayableMatch()?'Stock refreshed!':'No playable set in this layout'};
}
function beginRefresh(automatic=false){
 if(state!=='play'||refreshAnim)return;
 drag=null;refreshAnim={t:0,changed:false,automatic,startX:sx};shufCD=SHUFFLE_CD;
}
function updateRefresh(dt){
 refreshAnim.t+=dt;
 if(refreshAnim.t>=.88&&!refreshAnim.changed){shuffleBoard();refreshAnim.changed=true;}
 if(refreshAnim.t>=REFRESH_DURATION){refreshAnim=null;sx=0;phase='idle';pt=0;lastCheckedBoard=boardFingerprint();}
}
// Auto-refresh only when the player is blocked, or front + current back rows
// contain no complete set. Deeper queues are deliberately excluded.
function shouldAutomaticallyRefresh(){
 if(anyTri())return false;
 const counts=Array(ITEM_TYPES).fill(0),shelves=[];let empty=0,frontTotal=0;
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isOpen(r,c)){
  const slots=G[r][c].slots,usable=slots.filter((s,i)=>!blocked(r,c,i));
  usable.forEach(s=>{if(s.f){counts[s.f.t]++;frontTotal++;}else empty++;});
  shelves.push({usable,slots,owner:G[r][c]});
 }
 if(!frontTotal&&!shelves.some(cp=>cp.usable.some(s=>s.q.length)))return false;
 if(empty===0)return true; // No legal destination for any move.
 if(hasPlayableMatch())return false;
 let canExpose=false;
 for(const cp of shelves){
  const filled=cp.usable.filter(s=>s.f).length,localEmpty=cp.usable.length-filled;
  const accessible=cp.usable.length===3;
  // Current back row advances only after ALL front items have left the shelf.
  if(accessible&&cp.usable.some(s=>s.q.length)&&empty-localEmpty>=filled)canExpose=true;
  if(accessible)getRestockPlan(cp.owner).forEach(i=>counts[cp.slots[i].q[0].t]++);
 }
 const currentRowsHaveSet=counts.some(n=>n>=3);
 if(!currentRowsHaveSet)return true;
 return !canExpose; // No front match and insufficient space to expose a back row.
}
function checkAutomaticRefresh(dt){
 autoCheckTimer-=dt;if(autoCheckTimer>0||drag||flyers.length||refreshAnim)return;
 autoCheckTimer=.25;const signature=boardFingerprint();if(signature===lastCheckedBoard)return;
 lastCheckedBoard=signature;if(shouldAutomaticallyRefresh())beginRefresh(true);
}
// Assemble the supplied separated sprites. Feet rotate independently while hanging.
function drawShutterSoso(x,bottom,rise,t){
 const image=REFRESH_ART['pulling-pose'];
 if(!image?.complete||!image.naturalWidth)return;
 // Preserve the proportions of the supplied complete pose.
 const h=130,w=h*image.naturalWidth/image.naturalHeight;
 ctx.save();ctx.translate(x,bottom);
 ctx.rotate(Math.sin(t*18)*.025*Math.min(1,rise*2));
 ctx.drawImage(image,-w/2,-h,w,h);
 ctx.restore();
}

function drawRefresh(){
 if(!refreshAnim)return;
 const t=refreshAnim.t,top=Y0-8,height=RH*ROWS+16;
 const down=t<.4?0:t<.85?eio((t-.4)/.45):t<1?1:t<1.4?1-eio((t-1)/.4):0;
 const edge=top+height*down;
 if(down>0){ctx.save();ctx.beginPath();ctx.rect(4,top,352,height);ctx.clip();
  ctx.fillStyle='#b8dafa';ctx.fillRect(4,edge-height,352,height);
  const shutter=REFRESH_ART.shutter;if(shutter.complete&&shutter.naturalWidth)ctx.drawImage(shutter,4,edge-height,352,height);
  ctx.restore();
 }
 // Exactly ONE character-rendering branch per frame.
 if(t<.25||t>=1.5){
  const q=t<.25?eio(t/.25):1-eio((t-1.5)/.35);
  drawSoso(SOSO_X+(refreshAnim.startX||0)-(SOSO_X+100+(refreshAnim.startX||0))*q,GROUND,.30132,
   {face:'n',arms:'hold',walk:true,ph:clock*16,flip:t<.25,
    prop:()=>boxU('box_open',205,GY-4,boxItems,1)});
 }else{

  const rise=t<.4?eio((t-.25)/.15):t<.85?1-down:t<1?0:t<1.4?1-down:t<1.5?1-eio((t-1.4)/.1):0;
  const bottom=GROUND-rise*(GROUND-(top+145));
  const x=t<.4?-100+(SOSO_X+100)*eio((t-.25)/.15):t>1.4?SOSO_X-(SOSO_X+100)*eio((t-1.4)/.1):SOSO_X;
  drawShutterSoso(x,bottom,rise,t);
 }
}
// Keep four movable empty front slots after either kind of refresh.
function ensureRefreshSpace(){
 const occupied=[];let empty=0;
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isOpen(r,c))G[r][c].slots.forEach((slot,i)=>{
  if(!blocked(r,c,i)){if(slot.f)occupied.push({slot,r,c});else empty++;}
 });
 const needed=Math.min(Math.max(0,GAME_SETTINGS.minimumRefreshEmptySlots-empty),occupied.length);
 const selected=[],seen=new Set();
 for(const p of shuf(occupied.slice())){if(selected.length>=needed)break;const key=p.r+':'+p.c;if(!seen.has(key)){selected.push(p);seen.add(key);}}
 for(const p of shuf(occupied.slice())){if(selected.length>=needed)break;if(!selected.includes(p))selected.push(p);}
 selected.forEach(p=>{p.slot.q.push(p.slot.f);p.slot.f=null;});
}
let homePromptPrevious='play';
const PAUSE_RESUME=[110,495,140,44],HOME_YES=[74,345,94,42],HOME_NO=[192,345,94,42];
const pauseSoso=new Image();pauseSoso.src='asset/soso/soso-pause.png';
const inside=(x,y,b)=>x>=b[0]&&x<=b[0]+b[2]&&y>=b[1]&&y<=b[1]+b[3];
function openHomePrompt(){homePromptPrevious=state;state='homePrompt';drag=null;}
function returnToHome(){
 state='title';refreshAnim=null;drag=null;G=[];boxes=0;time=GAME_TIME;flyers=[];queued=0;phase='idle';pt=0;sx=0;ex=0;boxItems=[];hcur=null;resetComboGame();TUT=null;soundOpen=false;shufCD=0;refreshAnim=null;
}
function drawRestartButton(){
 const [rx,ry,rad]=RESTART_BTN;ci(rx,ry,rad,'#5ba8ef','#2a6fc4',2);
 ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(rx,ry,6,-.4,Math.PI*1.5);ctx.stroke();
 poly([[rx-2,ry-8],[rx+5,ry-8],[rx+3,ry-2]],'#fff','#fff',1);
}
function drawPauseScreen(){
 ctx.fillStyle='rgba(244,249,255,.95)';ctx.fillRect(0,0,W,H);
 txt('Paused',W/2,166,36,'#ff6b9a');
 if(pauseSoso.complete&&pauseSoso.naturalWidth){const h=270,w=h*pauseSoso.naturalWidth/pauseSoso.naturalHeight;ctx.drawImage(pauseSoso,W/2-w/2,193,w,h);}
  rr(...PAUSE_RESUME,22,grad(495,539,'#9fd0ff','#5aa5f0'),'#2a6fc4',3);txt('Resume game',W/2,523,18);
 drawSoundButton();drawRestartButton();
}
function drawConfirmLabel(label,x,y){
 ctx.save();ctx.font='700 20px '+F;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle=B;ctx.strokeText(label,x,y);ctx.fillStyle='#fff';ctx.fillText(label,x,y);ctx.restore();
}
function drawHomePrompt(){
 ctx.fillStyle='rgba(244,249,255,.93)';ctx.fillRect(0,0,W,H);
 rr(35,252,290,160,20,'#fff','#a9c9ee',2);
 txt('Return to Home Screen?',W/2,303,21,'#8a6a7c');
 rr(...HOME_YES,16,'#7fbaef',B,2.5);drawConfirmLabel('Yes',121,372);
 rr(...HOME_NO,16,'#f7b6ce',B,2.5);drawConfirmLabel('No',239,372);
}

const PAUSE_BTN=[340,24,13],RESTART_BTN=[302,24,13],SOUND_BTN=[264,24,13];
function setPause(on){if(TUT)return;if(on&&state=='play'){state='pause';drag=null}else if(!on&&state=='pause'){state='play'}}
function tap(px,py){
 if(state==='homePrompt'){
  if(inside(px,py,HOME_YES))returnToHome();
  else if(inside(px,py,HOME_NO)){state=homePromptPrevious;}
  return true;
 }
 // menu buttons; returns true if the touch was used
 if(refreshAnim)return true;
 if(state=='title'||state=='option')return true;           // menu screens are handled by pointer press/release (see UI)
 if(state=='over'){if(endT>.8)newGame();return true}
 if(TUT&&tutorialButtonTap(px,py))return true;
 if(Math.hypot(px-RESTART_BTN[0],py-RESTART_BTN[1])<RESTART_BTN[2]+5){openHomePrompt();return true}
 if(Math.hypot(px-SOUND_BTN[0],py-SOUND_BTN[1])<SOUND_BTN[2]+6){setSound(!soundOn);return true}   // same button in play and pause
 if(state=='pause'){if(inside(px,py,PAUSE_RESUME))setPause(false);return true}
 if(!TUT&&Math.hypot(px-PAUSE_BTN[0],py-PAUSE_BTN[1])<PAUSE_BTN[2]+6){setPause(true);return true}
 if(px>=SOSO_X+sx-45&&px<=SOSO_X+sx+80&&py>=GROUND-112&&py<=GROUND+7){
  if(TUT){if(TUT.step===5&&!TUT.refreshStarted){TUT.refreshStarted=true;beginRefresh(false);shufCD=SHUFFLE_CD}return true}
  if(shufCD<=0){beginRefresh(false);shufCD=SHUFFLE_CD}return true}
 return false}
// ---- DRAG AND DROP: items only go into EMPTY slots (no swapping). Dropping on a shelf uses its nearest empty slot.
const ptr=e=>{const b=cv.getBoundingClientRect();return[(e.clientX-b.left)/b.width*W,(e.clientY-b.top)/b.height*H]};
function dropTarget(px,py){const c=Math.floor((px-X0)/CWD),r=Math.floor((py-Y0)/RH);if(c<0||c>=COLS||r<0||r>=ROWS||!isOpen(r,c))return null;
 let best=null,bd=1e9;for(let i=0;i<3;i++){if(blocked(r,c,i)||G[r][c].slots[i].f)continue;const d=Math.abs(px-slotX(c,i));if(d<bd){bd=d;best=[r,c,i]}}return best}
cv.addEventListener('pointerdown',e=>{const[px,py]=ptr(e);
 if(state==='title'||state==='option'){UI.press=menuHit(px,py);try{cv.setPointerCapture(e.pointerId)}catch(_){}return}
 if(tap(px,py))return;
 const c=Math.floor((px-X0)/CWD),r=Math.floor((py-Y0)/RH);if(state!='play'||c<0||c>=COLS||r<0||r>=ROWS||!isOpen(r,c))return;
 const i=Math.max(0,Math.min(2,Math.floor((px-X0-c*CWD-6)/((CWD-12)/3))));if(blocked(r,c,i))return;const s=G[r][c].slots[i];
 if(TUT&&!tutorialCanDrag(r,c,i))return;
 if(s.f){drag={r,c,i,it:s.f,px,py};s.f.pop=.3;s.f.x=px;s.f.y=py-16;try{cv.setPointerCapture(e.pointerId)}catch(_){}}});
cv.addEventListener('pointermove',e=>{if(!drag)return;const[px,py]=ptr(e);drag.px=px;drag.py=py;drag.it.x=px;drag.it.y=py-16});
cv.addEventListener('pointerup',e=>{
 if(UI.press){const[ux,uy]=ptr(e),id=menuHit(ux,uy),was=UI.press;UI.press=null;if(id===was)menuActivate(id);return}
 if(!drag)return;const[px,py]=ptr(e),d=drag;drag=null;if(state!='play')return;const t=dropTarget(px,py);
 if(t&&TUT&&!tutorialCanDrop(d,t)){msg={t:1.4,s:'Drop it in the glowing slot!'};return}
 if(t){G[t[0]][t[1]].slots[t[2]].f=d.it;G[d.r][d.c].slots[d.i].f=null;advance(d.r,d.c);d.it.pop=.5;if(compTri(t[0],t[1]))clearComp(t[0],t[1])}});   // else it springs back
cv.addEventListener('pointercancel',()=>{drag=null;UI.press=null});
// ---- DEBUG: hold Alt + 1 / 2 / 3 ends the game at once with 20 / 12 / 5 boxes. P or Esc = pause.
addEventListener('keydown',e=>{
 if(e.altKey&&!TUT&&(state=='play'||state=='pause')){const n={Digit1:20,Digit2:12,Digit3:5}[e.code];
  if(n!=null){e.preventDefault();boxes=n;time=0;queued=0;flyers=[];sel=null;state='over';endT=0;scoreSaved=true;return}}
 if(!e.repeat&&(e.key=='p'||e.key=='P'||e.key=='Escape'))setPause(state=='play')});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});


// ===================== 8. UPDATE =====================
function update(dt){clock+=dt;if(state=='over'&&!musicHeld)holdMusicForResult();if(state=='title'){updateTitle(dt);return}if(state=='option')return;if(state=='pause'||state=='homePrompt'||soundOpen)return;if(TUT)updateTutorial(dt);if(state=='play'&&refreshAnim){updateRefresh(dt);return;}if(state=='over')drag=null;shufCD=Math.max(0,shufCD-dt);
 G.forEach((row,r)=>row.forEach(cp=>{if(cp.door>=0||cp.lock>=0){const op=cp.door>=0?boxes>=DOOR_AT[cp.door]:boxes>=UNLOCK_AT[cp.lock];cp.dop+=((op?1:0)-cp.dop)*Math.min(1,dt*6)}}));
 if(state=='play'&&!TUT){updateCombo(dt);time-=dt;if(time<=0){time=0;state='over';endT=0}}else if(state=='over'){endT+=dt;if(!scoreSaved){scoreSaved=true;if(boxes>highScore){highScore=boxes;store.set(BEST_KEY,String(boxes))}}}
 msg.t=Math.max(0,msg.t-dt);
 G.forEach((row,r)=>row.forEach((cp,c)=>cp.slots.forEach((s,i)=>{const k=Math.min(1,dt*14);
  if(s.f&&!(drag&&drag.it===s.f)){s.f.x+=(slotX(c,i)-s.f.x)*k;s.f.y+=(slotY(r)-s.f.y)*k;s.f.pop=Math.max(0,s.f.pop-dt*3)}})));
 flyers.forEach(f=>f.t+=dt/.4);
 flyers=flyers.filter(f=>{if(f.t>=1){if(phase=='idle'&&boxItems.length<3)boxItems.push(f.type);return false}return true});
 if(state!='play')return;if(!TUT)checkAutomaticRefresh(dt);if(refreshAnim)return;pt+=dt;happyT=Math.max(0,happyT-dt);
 if(phase=='idle'){sx=0;ex=0;if(queued>0&&pt>.5){phase='close';pt=0;queued--;boxItems=[lastType,lastType,lastType]}}
 else if(phase=='close'){if(pt>=.6){phase='load';pt=0}}
 else if(phase=='load'){if(pt>=.3){phase='push';pt=0}}
 else if(phase=='push'){sx=eio(pt/.5)*130;ex=pt>.35?Math.pow((pt-.35)/.55,2)*560:0;if(pt>=.95){phase='back';pt=0;boxItems=[]}}
 else if(phase=='back'){const kk=Math.min(1,pt/.9);sx=130*(1-eio(kk));ex=0;if(kk>=1){phase='idle';pt=0;sx=0}}}

// ===================== 9. DRAW SCENE =====================
function drawBG(){
 // Cute supermarket wall and a pastel tile floor, drawn in code for easy colour edits.
 ctx.fillStyle=grad(0,530,'#e9f4ff','#fffaf1');ctx.fillRect(0,0,W,H);
 const horizon=530,bottom=H,vanishX=W/2;
 ctx.fillStyle='#faf3df';ctx.fillRect(0,horizon,W,bottom-horizon);
 // Tiles widen toward the viewer. Horizontal rows follow the same perspective.
 const rows=[530,548,572,603,640],columns=[-360,-180,0,180,360,540,720];
 const project=(x,y)=>vanishX+(x-vanishX)*(.32+.68*(y-horizon)/(bottom-horizon));
 for(let r=0;r<rows.length-1;r++)for(let c=0;c<columns.length-1;c++){
  const top=rows[r],bot=rows[r+1];
  poly([[project(columns[c],top),top],[project(columns[c+1],top),top],
        [project(columns[c+1],bot),bot],[project(columns[c],bot),bot]],
       (r+c)%2?'#f4ecd7':'#e2eee5','#cbd9cc',1.3);
 }
 // Simple baseboard anchors the shelves to the wall.
 rr(0,520,W,10,0,'#fffdf5','#c7dacb',1.5);
}
function drawAwning(){const x=X0-8,w=CWD*COLS+16,y=50,n=12,sw=w/n;
 for(let k=0;k<n;k++){ctx.fillStyle=k&1?'#ffffff':'#3d8bec';ctx.beginPath();ctx.rect(x+k*sw,y,sw,16);ctx.arc(x+k*sw+sw/2,y+16,sw/2,0,Math.PI);ctx.fill();ctx.strokeStyle='#2a6fc4';ctx.lineWidth=1.5;ctx.stroke()}
 rr(x+w/2-50,y+1,100,21,8,'#fff','#2a6fc4',2);txt('SOSO MART',x+w/2,y+16,14,'#2a6fc4')}
function drawDoor(x,y,w,h,side){if(w<2)return;rr(x,y,w,h,5,grad(y,y+h,'#ffffff','#e2e8f0'),'#aebdcf',1.8);
 if(w>14){rr(x+4,y+4,w-8,h-8,3,null,'#d3dce7',1.4);ctx.fillStyle='rgba(255,255,255,.75)';ctx.fillRect(x+7,y+9,Math.min(5,w*.1),h-18);
  const hx=side<0?x+w-8:x+4;rr(hx,y+h/2-13,4,26,2,grad(y+h/2-13,y+h/2+13,'#e3eaf2','#8fa2b9'),'#6b7f98',1)}}
function drawShelf(){
 rr(X0-8,Y0-8,CWD*COLS+16,RH*ROWS+16,12,grad(Y0,Y0+RH*ROWS,'#ffffff','#f1f4f8'),'#c3cfdc',3);
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const x=X0+c*CWD,y=Y0+r*RH,cp=G[r][c];
  rr(x+3,y+3,CWD-6,RH-6,7,'#ffffff','#dde4ec',2);
  ctx.fillStyle='rgba(170,185,205,.28)';for(let a=0;a<4;a++)for(let b=0;b<2;b++){ctx.beginPath();ctx.arc(x+20+a*24,y+13+b*13,1.6,0,7);ctx.fill()}   // pegboard dots
  rr(x+6,y+RH-15,CWD-12,9,3,grad(y+RH-15,y+RH-6,'#ffffff','#e1e8f0'),'#b9c6d6',1.5);rr(x+6,y+RH-8,CWD-12,5,2,'#6aa6e8');   // shelf board + price rail
  for(let i=0;i<3;i++)rr(slotX(c,i)-8,y+RH-9,16,7,2,'#fff','#6aa6e8',1);                                                    // price tags
  cp.slots.forEach((s,i)=>{const X=slotX(c,i),Y=slotY(r);
   // Third depth row and deeper remain in inventory but are not drawn.
   if(s.q[0]&&getRestockPlan(cp).includes(i))drawItem(s.q[0].t,X-5,Y-7,ITEM_SCALE*.85,.24);
   if(s.f&&!(drag&&drag.it===s.f)){ctx.fillStyle='rgba(60,100,150,.16)';ctx.beginPath();ctx.ellipse(s.f.x,Y+18,13,3.5,0,0,7);ctx.fill();
    drawItem(s.f.t,s.f.x,s.f.y,ITEM_SCALE*(1+s.f.pop*.4))}});
  if(cp.door>=0&&cp.dop<.97){const w=30*(1-cp.dop);drawDoor(x+9,y+9,w,RH-24,-1);drawDoor(x+CWD-9-w,y+9,w,RH-24,1)}
  if(cp.lock>=0&&cp.dop<.99){const w=(CWD-10)/2*(1-cp.dop);drawDoor(x+5,y+5,w,RH-20,-1);drawDoor(x+CWD-5-w,y+5,w,RH-20,1);   // shut cabinet doors
   if(cp.dop<.6){const cx=x+CWD/2,cy=y+RH/2-8;ctx.save();ctx.globalAlpha=1-cp.dop/.6;
    ctx.strokeStyle='#7d90a8';ctx.lineWidth=3.2;ctx.beginPath();ctx.arc(cx,cy-3,7,Math.PI,0);ctx.stroke();                        // padlock
    rr(cx-11,cy-3,22,17,4,grad(cy-3,cy+14,'#e3eaf2','#98aac0'),'#6b7f98',1.6);ci(cx,cy+5,2.4,'#5a6c84');
    rr(cx-15,cy+17,30,18,7,'#fff','#3d8bec',2);txt(''+UNLOCK_AT[cp.lock],cx,cy+31,15,'#2a6fc4');ctx.restore()}}}
 drawAwning()}
const PI0=Math.PI;
function drawDrag(){if(!drag)return;const it=drag.it,t=dropTarget(drag.px,drag.py);
 if(t)ci(slotX(t[1],t[2]),slotY(t[0]),21,'rgba(255,240,170,.65)','#ffc84e',2);
 ctx.fillStyle='rgba(120,70,100,.2)';ctx.beginPath();ctx.ellipse(it.x,it.y+24,14,4,0,0,7);ctx.fill();drawItem(it.t,it.x,it.y,ITEM_SCALE*1.3)}
function drawFlyers(){flyers.forEach(f=>{const k=Math.min(1,f.t),e=k*k*(3-2*k),tx=SOSO_X+30+sx,ty=GROUND-30;
 drawItem(f.type,f.x+(tx-f.x)*e,f.y+(ty-f.y)*e-Math.sin(k*Math.PI)*30,ITEM_SCALE*(1-.45*e))})}
function drawHUD(){
 // Combo number + countdown, aligned to the supplied layout.
 txt(combo>=COMBO_SETTINGS.activationMatches?combo:matchTimes.length,26,29,20,'#8a6a7c');txt('combo',26,40,8,'#8a6a7c');
 rr(44,21,94,11,5,'#ffffff','#a9c9ee',1.5);
 const progress=combo>=COMBO_SETTINGS.activationMatches?comboLeft/comboWindow:matchTimes.length?cl(1-(playClock-matchTimes[0])/COMBO_SETTINGS.activationWindow):0;
 rr(46,23,90*progress,7,3,grad(23,30,'#b8ddff','#74baff'));
 // Pie timer; clamp percentage when bonus time exceeds the initial duration.
 const cx=184,cy=27,r=20,fraction=cl(time/timerPeak);
 ci(cx,cy,r,'#eef7ff','#a9c9ee',1.5);ctx.beginPath();ctx.moveTo(cx,cy);
 ctx.arc(cx,cy,r-3,-Math.PI/2,-Math.PI/2+Math.PI*2*fraction);ctx.closePath();
 ctx.fillStyle=time<15?'#ffaaaa':'#a1d2ff';ctx.fill();
 txt(timeBonusLeft>0?timeBonusText:Math.ceil(time),cx,cy+6,19,timeBonusLeft>0?'#48a875':'#8a6a7c');
 drawRestartButton();
 drawSoundButton();
 if(!TUT){const [x,y,pr]=PAUSE_BTN;ci(x,y,pr,'#5ba8ef','#2a6fc4',2);
 rr(x-5,y-6,3,12,1,'#fff');rr(x+2,y-6,3,12,1,'#fff');
 txt('Boxes: '+boxes,W-12,H-9,22,'#8a6a7c','right');}
 const nx=[...DOOR_AT,...UNLOCK_AT].filter(u=>u>boxes).sort((a,b)=>a-b)[0];
 if(nx&&!TUT)txt('Next shelf at '+nx+' boxes',W/2,Y0+RH*ROWS+24,12,'#7f9bbf');
 if(msg.t>0){ctx.globalAlpha=Math.min(1,msg.t);txt(msg.s,W/2,H/2-40,20,'#2f7fe0');ctx.globalAlpha=1;}
}
// Manual refresh cooldown: dark silhouette refills with normal colour from the feet up.
function drawSosoScene(){
 if(refreshAnim)return;
 if(shufCD<=0){drawSosoSceneArt();return;}
 const ready=cl(1-shufCD/SHUFFLE_CD),x=SOSO_X+sx;
 ctx.save();ctx.filter='brightness(0.38)';drawSosoSceneArt();ctx.restore();
 ctx.save();ctx.beginPath();ctx.rect(0,GROUND-112*ready,W,112*ready+10);ctx.clip();drawSosoSceneArt();ctx.restore();
 rr(x-30,GROUND+3,60,5,2,'#788899','#ffffff',1);
 rr(x-29,GROUND+4,58*ready,3,1,'#9ee0b0');
}
function drawSosoSceneArt(){const k=.30132,TX=240,happy=happyT>0||phase=='close'||phase=='load'||phase=='push';
 const o={face:happy?'h':'n',arms:'hold',ph:clock*13,walk:false,flip:false},bx=205,by=GY-4;
 if(phase=='idle')o.prop=()=>boxU('box_open',bx,by,boxItems,1);
 else if(phase=='close'){const tin=eio(pt/.4),l=cl((pt-.1)/.35);o.prop=()=>{trolleyU('tr_empty',TX+(1-tin)*620);boxU(l<.5?'box_open':'box_closed',bx,by,l<.5?boxItems:null,1+.14*Math.sin(Math.PI*l))}}
 else if(phase=='load'){const q=eio(pt/.3);o.prop=()=>{trolleyU('tr_empty',TX);boxU('box_closed',bx+(368-bx)*q,by+(291-by)*q-Math.sin(Math.PI*q)*40,null,1)}}
 else if(phase=='push'){o.arms=pt<.5?'push':'side';o.walk=pt<.5;o.prop=()=>trolleyU('tr_box',TX+ex)}
 else{o.flip=true;o.walk=true;const pp=eio(pt/.3);o.prop=()=>boxU('box_open',bx,by,[],.2+.8*pp)}
 drawSoso(SOSO_X+sx,GROUND,k,o)}
function drawOver(){ctx.fillStyle='rgba(244,249,255,.93)';ctx.fillRect(0,0,W,H);
 txt("Time's up!",W/2,100,36,'#ff6b9a');txt('Boxes packed: '+boxes,W/2,148,24,'#8a6a7c');
 const t=clock,sn=Math.sin,K=.66;let line;
 if(boxes>=HAPPY_JUMP){const j=Math.abs(sn(t*5));drawSoso(150,505,K,{face:'h',arms:'up',hop:-j*48,tuck:j,sq:1+.07*(1-j)});line='Amazing stock work!'}
 else if(boxes>=HAPPY_STAND){drawSoso(150,505,K,{face:'n',arms:'side'});line='Nice and tidy!'}
 else{const kk=Math.max(0,sn(t*4));drawSoso(150,505,K,{face:'a',arms:'side',kick:kk,prop:()=>boxU('box_closed',315+kk*16,GY-2,null,1)});line='Hmph... restocking is hard.'}
 txt(line,W/2,556,19,'#8a6a7c');if(endT>.8)txt('Tap to play again',W/2,600,21,'#ff6b9a')}
// ===================== 9B. TITLE SCREEN · OPTION SCREEN · SOUND POPUP =====================
const LOGO=new Image();LOGO.src='asset/ui/logo.png?v=1';
const MENU_INK='#4a2412';                                  // dark brown for menu outlines + text
const BTN_W=164,BTN_H=39,BTN_X=(W-BTN_W)/2;
// Title buttons. They are 50 apart; the slot at y=362 (between Option and Tutorial) is deliberately EMPTY for your next button.
// To add one: insert {id:'newid',label:'Name',y:362,fill:[...]} below and handle 'newid' in menuActivate().
const TITLE_BUTTONS=[
 {id:'start',   label:'Start Game',y:262,fill:['#a6dafc','#79c2f6']},
 {id:'option',  label:'Option',    y:312,fill:['#cde8fb','#b6dcf8']},
 {id:'tutorial',label:'Tutorial',  y:412,fill:['#dfeefb','#cce3f7']},
];
let highScore=parseInt(store.get(BEST_KEY),10)||0,scoreSaved=false,soundOpen=false;
const UI={press:null};
function plain(s,x,y,z,col,al){ctx.save();ctx.font='700 '+z+'px '+F;ctx.textAlign=al||'center';ctx.fillStyle=col||MENU_INK;ctx.fillText(s,x,y);ctx.restore()}
function menuButton(x,y,w,h,label,fill,pressed,size){
 const dy=pressed?2:0;
 if(!pressed)rr(x,y+3,w,h,10,'rgba(74,36,18,.22)');
 rr(x,y+dy,w,h,10,grad(y,y+h,fill[0],fill[1]),MENU_INK,3);
 rr(x+8,y+dy+7,5,14,2.5,'rgba(255,255,255,.92)');
 plain(label,x+w/2,y+dy+h/2+7,size||19);
}
// ---- title: Soso pushes a loaded trolley across the floor, on and off the screen, her face flipping happy ↔ neutral
const TW={x:70,dir:1,wait:0,pass:0,face:'h',faceT:2.4},TW_K=.41,TW_Y=594,TW_SPEED=74;
function updateTitle(dt){
 TW.faceT-=dt;if(TW.faceT<=0){TW.face=TW.face==='h'?'n':'h';TW.faceT=1.6+Math.random()*1.9}
 if(TW.wait>0){TW.wait-=dt;return}
 TW.x+=TW.dir*TW_SPEED*dt;
 if(TW.dir>0&&TW.x>425){TW.dir=-1;TW.x=525;TW.pass++;TW.wait=.7}      // off the right edge → come back from the right
 else if(TW.dir<0&&TW.x<-65){TW.dir=1;TW.x=-165;TW.pass++;TW.wait=.7} // off the left edge → come back from the left
}
function drawTitleSoso(){
 const two=TW.pass%2===1;                                   // alternate one box / two stacked boxes
 drawSoso(TW.x,TW_Y,TW_K,{face:TW.face,arms:'push',walk:true,ph:clock*13,flip:TW.dir<0,
  prop:()=>{trolleyU('tr_box',240);if(two)boxU('box_closed',240+TROLLEY_DX+140,229,null,.95)}});
}
function drawTitle(){
 if(LOGO.complete&&LOGO.naturalWidth){const lw=323,lh=lw*LOGO.naturalHeight/LOGO.naturalWidth;ctx.drawImage(LOGO,(W-lw)/2,10+Math.sin(clock*1.7)*1.6,lw,lh)}
 TITLE_BUTTONS.forEach(b=>menuButton(BTN_X,b.y,BTN_W,BTN_H,b.label,b.fill,UI.press===b.id));
 drawTitleSoso();
 plain('Highscore: '+highScore,196,628,17,MENU_INK,'left');
}
// ---- option: volume Mute / 1 / 2 / 3
const OPT_PANEL=[30,120,300,290];
const OPT_CHIPS=[{id:'son',x:62,y:240,w:110,h:44,label:'ON'},{id:'soff',x:188,y:240,w:110,h:44,label:'OFF'}];
const OPT_BACK={id:'back',x:BTN_X,y:340,w:BTN_W,h:BTN_H};
function drawOption(){
 rr(...OPT_PANEL,22,'rgba(255,255,255,.94)','#a9c9ee',2.5);
 txt('Option',W/2,172,34,'#ff6b9a');
 plain('Sound',W/2,222,20,'#3d5a80');
 OPT_CHIPS.forEach((c,i)=>{const sel=(i===0)===soundOn;
  menuButton(c.x,c.y,c.w,c.h,c.label,sel?['#8fcbf8','#5ba8ef']:['#eef6fd','#dcebfa'],UI.press===c.id,22)});
 plain('OFF stops the music so your own music can play.',W/2,312,12,'#7f9bbf');
 menuButton(OPT_BACK.x,OPT_BACK.y,OPT_BACK.w,OPT_BACK.h,'Back',['#a6dafc','#79c2f6'],UI.press==='back');
 drawSoso(W/2,596,.5,{face:soundOn?'h':'n',arms:'side'});
}
function menuList(){return state==='title'?TITLE_BUTTONS.map(b=>({id:b.id,x:BTN_X,y:b.y,w:BTN_W,h:BTN_H})):state==='option'?OPT_CHIPS.concat([OPT_BACK]):[]}
function menuHit(px,py){for(const b of menuList())if(inside(px,py,[b.x,b.y,b.w,b.h]))return b.id;return null}
function menuActivate(id){
 if(id==='start')newGame();
 else if(id==='option')state='option';
 else if(id==='tutorial')startTutorial();
 else if(id==='back')state='title';
 else if(id==='son')setSound(true);
 else if(id==='soff')setSound(false);
}
// ---- sound button (top bar in play, beside the restart button on the pause screen): tap = ON / OFF
function drawSoundButton(){
 const[x,y,r]=SOUND_BTN;ci(x,y,r,'#5ba8ef','#2a6fc4',2);
 ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(x-7,y-2.6);ctx.lineTo(x-3.5,y-2.6);ctx.lineTo(x+.5,y-6.2);ctx.lineTo(x+.5,y+6.2);ctx.lineTo(x-3.5,y+2.6);ctx.lineTo(x-7,y+2.6);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#fff';ctx.lineWidth=1.6;ctx.lineCap='round';
 if(!soundOn){ctx.beginPath();ctx.moveTo(x+4,y-3.6);ctx.lineTo(x+9,y+3.6);ctx.moveTo(x+9,y-3.6);ctx.lineTo(x+4,y+3.6);ctx.stroke()}
 else for(let k=1;k<=2;k++){ctx.beginPath();ctx.arc(x+.5,y,2.2+k*2.6,-.8,.8);ctx.stroke()}
}
function draw(){ctx.setTransform(S,0,0,S,0,0);drawBG();
 if(state=='title'){drawTitle();return}
 if(state=='option'){drawOption();return}
 drawShelf();drawSosoScene();drawFlyers();drawHUD();
 if(TUT){drawTutorialDim();drawTutorialHints()}
 drawDrag();drawRefresh();
 if(TUT)drawTutorialBubble();
 if(state=='over')drawOver();
 if(state==='pause')drawPauseScreen();
 if(state==='homePrompt')drawHomePrompt();
}

// ===================== 9C. TUTORIAL =====================
// A guided mini-round on the real game engine: scripted board, frozen timer, one lesson per step.
let TUT=null;
const IT={peach:0,milk:1,flash:2,fan:3,jam:4,chips:5,noodle:6,bread:7,tuna:8,tin:9,shampoo:10,straw:11};   // = ITEM_PATHS order
const BUB=[112,526,240,104],BUB_NEXT=[BUB[0]+BUB[2]-76,BUB[1]+BUB[3]-32,64,24],BUB_SKIP=[BUB[0]+12,BUB[1]+BUB[3]-32,50,24];
const TUT_SOSO=[8,524,108,108];
const TUT_STEPS=[
 {text:"Hi, I'm Soso! Let's learn how to sort the shelves together.",next:true},
 {text:'Drag the milk into the glowing slot to line up 3 milks. Items can only go into empty spaces.'},
 {text:'Three of a kind gets packed into a box! New stock slides forward once a shelf is empty.',next:true},
 {text:'Your turn! Drag 3 strawberry milks onto one shelf.'},
 {text:()=>'Every box opens more room: cabinets at '+DOOR_AT.join(' & ')+' boxes, locked shelves from '+UNLOCK_AT[0]+'.',next:true},
 {text:'Stuck? Tap me and I will shuffle the front items!'},
 {text:()=>'Pack '+COMBO_SETTINGS.activationMatches+' sets within '+COMBO_SETTINGS.activationWindow+' seconds to start a combo. Combos add bonus time!',next:true},
 {text:"You're ready to stock up the store!",next:true,last:true},
];
function startTutorial(){
 resetComboGame();boxes=0;time=GAME_TIME;sel=null;flyers=[];phase='idle';pt=0;sx=0;ex=0;queued=0;boxItems=[];lid=0;msg.t=0;drag=null;shufCD=0;refreshAnim=null;hcur=null;soundOpen=false;
 buildTutorialBoard();
 TUT={step:0,t:0,refreshStarted:false};state='play';
}
function buildTutorialBoard(){
 G=[];for(let r=0;r<ROWS;r++){G.push([]);for(let c=0;c<COLS;c++)G[r].push({lock:LOCKED.findIndex(l=>l[0]==r&&l[1]==c),door:DOORS.findIndex(d=>d[0]==r&&d[1]==c),dop:0,slots:[{q:[]},{q:[]},{q:[]}]})}
 const f=(r,c,i,t)=>{G[r][c].slots[i].f=mk(t,r,c,i)},q=(r,c,i,t)=>G[r][c].slots[i].q.push({t,x:0,y:0,pop:0});
 // lesson 1: the milk set
 f(0,1,0,IT.milk);f(0,1,2,IT.milk);q(0,1,0,IT.straw);q(0,1,0,IT.bread);q(0,1,1,IT.peach);q(0,1,2,IT.fan);
 f(1,1,0,IT.milk);f(1,1,2,IT.peach);
 // lesson 2: three strawberry milks on three different shelves
 f(0,2,0,IT.straw);f(1,0,0,IT.straw);f(1,0,1,IT.noodle);f(3,1,1,IT.straw);f(3,1,2,IT.bread);
 f(2,1,1,IT.tin);                                               // cabinet shelf: only its middle slot is reachable at first
 // hidden stock behind the locked shelves (keeps refresh and unlocking realistic)
 [[1,2,[IT.jam,IT.shampoo,IT.tuna],[IT.fan,IT.tin,IT.noodle]],[2,0,[IT.flash,IT.bread,IT.peach],[IT.shampoo,IT.milk,IT.jam]],
  [2,2,[IT.tuna,IT.flash,IT.fan],[IT.tin,IT.bread,IT.straw]],[3,0,[IT.noodle,IT.peach,IT.jam],[IT.flash,IT.tuna,IT.shampoo]],
  [3,2,[IT.fan,IT.tin,IT.milk],[IT.peach,IT.noodle,IT.bread]]].forEach(([r,c,fr,bk])=>fr.forEach((t,i)=>{f(r,c,i,t);q(r,c,i,bk[i])}));
}
const cellRect=(r,c)=>[X0+c*CWD+3,Y0+r*RH+3,CWD-6,RH-6];
const slotCentre=(r,c,i)=>[slotX(c,i),slotY(r)-2];
const TUT_ONE_MOVE={from:[1,1,0],to:[0,1,1]};
function findHint(){          // best single move toward completing a set
 let hint=null,top=-1;const fronts=accessibleFront();
 for(let t=0;t<ITEM_TYPES;t++){
  const its=fronts.filter(p=>p.it.t===t);if(its.length<3)continue;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
   if(!isOpen(r,c)||[0,1,2].some(i=>blocked(r,c,i)))continue;
   const sl=G[r][c].slots,same=sl.filter(s=>s.f&&s.f.t===t).length,free=sl.filter(s=>!s.f).length;
   if(same===3||same+free<3)continue;
   const src=its.find(p=>!(p.r===r&&p.c===c)),score=same*10+free;
   if(src&&score>top){top=score;hint={from:[src.r,src.c,src.i],to:[r,c,sl.findIndex(s=>!s.f)]}}
  }}
 return hint;
}
function tutorialCanDrag(r,c,i){return TUT.step===1?(r===1&&c===1&&i===0):TUT.step===3}
function tutorialCanDrop(d,t){return TUT.step===1?(t[0]===0&&t[1]===1&&t[2]===1):true}
function tutorialButtonTap(px,py){
 if(inside(px,py,BUB_SKIP)){returnToHome();return true}
 const st=TUT_STEPS[TUT.step];
 if(st.next&&inside(px,py,BUB_NEXT)){if(st.last)returnToHome();else{TUT.step++;TUT.t=0}return true}
 return inside(px,py,BUB);
}
function updateTutorial(dt){
 TUT.t+=dt;
 if(TUT.step===1&&boxes>=1){TUT.step=2;TUT.t=0}
 else if(TUT.step===3&&boxes>=2){TUT.step=4;TUT.t=0}
 else if(TUT.step===5&&TUT.refreshStarted&&!refreshAnim){TUT.step=6;TUT.t=0}
}
function tutorialFocus(){
 const s=TUT.step;
 if(s===1)return[cellRect(0,1),cellRect(1,1)];
 if(s===2)return[cellRect(0,1)];
 if(s===4)return[cellRect(1,2),cellRect(0,0)];
 if(s===6)return[[6,6,204,46]];
 return[];
}
function drawTutorialDim(){
 const s=TUT.step;if(s===3||s===7)return;
 const focus=tutorialFocus(),holes=focus.concat([TUT_SOSO]);
 ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);holes.forEach(hh=>ctx.roundRect(hh[0],hh[1],hh[2],hh[3],10));
 ctx.fillStyle='rgba(40,70,120,.38)';ctx.fill('evenodd');
 ctx.strokeStyle='rgba(255,208,64,'+(.55+.45*Math.sin(TUT.t*5))+')';ctx.lineWidth=3;
 (s===5?[TUT_SOSO]:focus).forEach(hh=>{ctx.beginPath();ctx.roundRect(hh[0],hh[1],hh[2],hh[3],10);ctx.stroke()});
 ctx.restore();
}
function drawHintHand(a,b){
 const L=2.4,t=(TUT.t%L)/L,m=t<.22?0:t<.72?eio((t-.22)/.5):1,al=t<.08?t/.08:t>.92?(1-t)/.08:1;
 const x=a[0]+(b[0]-a[0])*m,y=a[1]+(b[1]-a[1])*m,hand=SPR.hr_n;
 ctx.save();ctx.globalAlpha=al;
 if(hand.complete&&hand.naturalWidth){const w=30,hh=w*hand.naturalHeight/hand.naturalWidth;ctx.drawImage(hand,x-8,y-6,w,hh)}
 ctx.restore();
}
function drawTutorialHints(){
 if(drag)return;const s=TUT.step;let mv=null;
 if(s===1)mv=TUT_ONE_MOVE;else if(s===3)mv=findHint();
 if(!mv)return;
 const a=slotCentre(...mv.from),b=slotCentre(...mv.to),pulse=.5+.5*Math.sin(TUT.t*6);
 ci(b[0],b[1],19+pulse*3,'rgba(255,236,150,.5)','rgba(255,196,48,'+(.6+.4*pulse)+')',2.5);        // glowing target slot
 drawHintHand(a,b);
}
function wrapLines(s,maxW,font){ctx.font=font;const out=[];let cur='';for(const w of s.split(' ')){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){out.push(cur);cur=w}else cur=t}if(cur)out.push(cur);return out}
function drawTutorialBubble(){
 const st=TUT_STEPS[TUT.step],text=typeof st.text==='function'?st.text():st.text;
 ctx.save();
 poly([[BUB[0]+2,BUB[1]+58],[BUB[0]-10,BUB[1]+70],[BUB[0]+2,BUB[1]+80]],'#fff','#2a6fc4',2.5);
 rr(...BUB,16,'#fff','#2a6fc4',2.5);
 ctx.fillStyle='#fff';ctx.fillRect(BUB[0]+.5,BUB[1]+59,4,20);                                    // hide the bubble border behind the tail
 const lines=wrapLines(text,BUB[2]-28,'700 13px '+F);
 lines.forEach((ln,i)=>plain(ln,BUB[0]+14,BUB[1]+24+i*16,13,'#3d5a80','left'));
 menuButton(BUB_SKIP[0],BUB_SKIP[1],BUB_SKIP[2],BUB_SKIP[3],'Skip',['#eef6fd','#dcebfa'],false,12);
 if(st.next)menuButton(BUB_NEXT[0],BUB_NEXT[1],BUB_NEXT[2],BUB_NEXT[3],st.last?'Finish':'Next',['#a6dafc','#79c2f6'],false,13);
 plain('Step '+(TUT.step+1)+' / '+TUT_STEPS.length,BUB[0]+BUB[2]/2+4,BUB[1]+BUB[3]-14,10,'#9bb4d4','center');
 ctx.restore();
}

// ===================== 10. MAIN LOOP =====================
let last=performance.now();
function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;dtG=dt;update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
