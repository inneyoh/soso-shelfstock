
// ===================== 1. CONFIG (edit numbers here) =====================
const W=360,H=640,GAME_TIME=80,COLS=3,ROWS=4;
const CWD=112,RH=90,X0=12,Y0=100,ITEM_SCALE=.64;             // shelf compartment layout
const GROUND=612,SOSO_X=70,SOSO_SCALE=1.15;                  // Soso placement
const LOCKED=[[1,2],[2,0],[2,2],[3,0],[3,2]];                // 5 locked compartments [row,col]
const DOORS=[[0,0],[2,1]];                                   // 2 half-open cabinets: only the middle slot is usable
const DOOR_AT=[2,4];                                         // boxes needed to fully open each half-open cabinet (opens BEFORE the locked ones)
const SHUFFLE_CD=4;                                          // seconds between refresh-button uses
const TOTAL_BOXES=50, LOCK_ROWS=5;                           // finite stock: 50 boxes (150 items) in the whole store; each locked shelf holds 5 boxes' worth
const START_FRONTS=9;                                        // front items on the open shelves at the start (leaves empty slots, since items can't swap)                                          // items dealt into the starting open shelves (8 sets of 3)
const UNLOCK_AT=[6,8,10,12,14];                               // boxes needed for each
const ITEM_TYPES=12, HAPPY_JUMP=22, HAPPY_STAND=11;           // ending thresholds

// ===================== 2. DRAW HELPERS (same helpers/palette as Momo Pudding Panic) =====================
const cv=document.getElementById('c'),ctx=cv.getContext('2d');let S=1;
function fit(){const k=Math.min(innerWidth/W,innerHeight/H)*.97;cv.style.width=W*k+'px';cv.style.height=H*k+'px';S=k*Math.min(devicePixelRatio||1,2);cv.width=W*S;cv.height=H*S}
addEventListener('resize',fit);fit();
const F="'Fredoka','Arial Rounded MT Bold',ui-rounded,system-ui,sans-serif",B='#6b3920';   // B = character outline brown
const rr=(x,y,w,h,r,f,k,lw)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(f){ctx.fillStyle=f;ctx.fill()}if(k){ctx.strokeStyle=k;ctx.lineWidth=lw||2;ctx.lineJoin='round';ctx.stroke()}};
const ci=(x,y,r,f,k,lw)=>{ctx.beginPath();ctx.arc(x,y,r,0,7);if(f){ctx.fillStyle=f;ctx.fill()}if(k){ctx.strokeStyle=k;ctx.lineWidth=lw||2;ctx.stroke()}};
const grad=(y0,y1,a,b)=>{const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(1,b);return g};
function poly(p,f,k,lw){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);p.slice(1).forEach(q=>ctx.lineTo(q[0],q[1]));ctx.closePath();ctx.fillStyle=f;ctx.fill();ctx.strokeStyle=k;ctx.lineWidth=lw||2;ctx.lineJoin='round';ctx.stroke()}
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
const SPR={};for(const k of SPR_PATHS){const i=new Image();i.src='asset/soso/'+k+'.webp';SPR[k]=i}
const img=(n,x,y,w,h)=>{const i=SPR[n];if(i&&i.complete&&i.naturalWidth)ctx.drawImage(i,x,y,w,h)};
const sz=n=>SPR[n].naturalWidth?[SPR[n].naturalWidth,SPR[n].naturalHeight]:[1,1];
const cl=x=>Math.max(0,Math.min(1,x)),eio=x=>{x=cl(x);return x*x*(3-2*x)};
const BS=.61,TS=.95,GY=350;      // box scale, trolley scale, ground line (all in sprite units; Soso's body sprite is 250 wide)
const HANDS={side:[[83,262],[200,258]],hold:[[112,268],[268,262]],push:[[268,238],[280,250]],up:[[30,146],[220,146]]};
let hcur=null,dtG=.016;
function boxU(name,cx,bot,items,sc){const[w0,h0]=sz(name),w=w0*BS,h=h0*BS;ctx.save();ctx.translate(cx,bot);ctx.scale(sc||1,sc||1);
 if(items)items.forEach((t,i)=>drawItem(t,(i-1)*36,-h*.9,1.25));img(name,-w/2,-h,w,h);ctx.restore()}
function trolleyU(name,tx){const[w0,h0]=sz(name);img(name,tx,GY-h0*TS,w0*TS,h0*TS)}
// o: {face:'n'|'h'|'a', arms:'side'|'hold'|'push'|'up', walk, ph, flip, hop, tilt, tuck, sq, kick, prop:()=>draw between body and hands}
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
 const body=SPR['body_'+f],HEAD_CUT=222,HEAD_DROP=14;
 if(body.complete&&body.naturalWidth){
  const bw=body.naturalWidth,bh=body.naturalHeight;
  ctx.drawImage(body,0,HEAD_CUT,bw,bh-HEAD_CUT,0,bob+HEAD_CUT,bw,bh-HEAD_CUT);
  ctx.drawImage(body,0,0,bw,HEAD_CUT,0,bob+HEAD_DROP,bw,HEAD_CUT);
 }
 if(o.prop)o.prop();
 const hand=(n,p,dy)=>{const[w,h]=sz(n);img(n,p[0]-w/2,p[1]-h/2+bob+dy,w,h)};
 hand('hl_'+f,hcur[0],sw*sn(ph)*13);hand('hr_'+f,hcur[1],-sw*sn(ph)*13);
 ctx.restore()}

// ===================== 5. GAMEPLAY MUSIC =====================
// Keep this path aligned with the folder name in GitHub (asset, singular).
const gameplayMusic = new Audio('asset/audio/stockspree.mp3');
gameplayMusic.loop = true;
gameplayMusic.volume = 0.5; // Edit from 0 (silent) to 1 (full volume).
gameplayMusic.preload = 'auto';
let musicState = '';
function playGameplayMusic(){
 const pending = gameplayMusic.play();
 if(pending)pending.catch(() => {}); // Browsers may require another user tap.
}
function syncGameplayMusic(){
 if(musicState === state)return;
 musicState = state;
 if(state === 'play')playGameplayMusic();
 else gameplayMusic.pause();
}

// ===================== 6. GAME STATE =====================
// G[r][c] = {lock:index|-1, slots:[{f:front item, b:item hidden behind}, x3]}   item = {t,x,y,pop}
let state='title',time=GAME_TIME,boxes=0,G=[],sel=null,flyers=[],msg={t:0,s:''};
let drag=null,shufCD=0;
let phase='idle',pt=0,sx=0,toff=0,ex=0,happyT=0,queued=0,boxItems=[],lid=0,lastType=0,endT=0,clock=0;
const rnd=n=>Math.random()*n|0;
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const slotX=(c,i)=>X0+c*CWD+20+i*36, slotY=r=>Y0+r*RH+RH-36;
const blocked=(r,c,i)=>G[r][c].door>=0&&i!=1&&boxes<DOOR_AT[G[r][c].door];
const isOpen=(r,c)=>{const l=G[r][c].lock;return l<0||boxes>=UNLOCK_AT[l]};
const mk=(t,r,c,i,dy)=>({t,x:slotX(c,i),y:slotY(r)+(dy||0),pop:0});
// Back rows belong to their shelf. Each slot keeps a queue (q) of items stacked behind it; the next row only slides forward
// once the shelf's WHOLE front row is empty.
function advance(r,c){const s=G[r][c].slots;if(s.some(q=>q.f)||!s.some(q=>q.q.length))return;
 s.forEach((q,i)=>{if(q.q.length){const it=q.q.shift();it.x=slotX(c,i)-5;it.y=slotY(r)-7;it.pop=.5;q.f=it}})}
const rowsTri=cp=>{const s=cp.slots,n=Math.max(...s.map(q=>q.q.length));for(let j=0;j<n;j++)if(s.every(q=>q.q[j])&&s[0].q[j].t==s[1].q[j].t&&s[1].q[j].t==s[2].q[j].t)return true;return false};
function compTri(r,c){const s=G[r][c].slots;return s.every(q=>q.f)&&s[0].f.t==s[1].f.t&&s[1].f.t==s[2].f.t}
function anyTri(){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(compTri(r,c))return true;return false}
function easyCount(){let n=0;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isOpen(r,c)){
 const u=[0,1,2].filter(i=>!blocked(r,c,i)).map(i=>G[r][c].slots[i]);
 if(u.length==3){const f=u.filter(s=>s.f);if(f.length==2&&f[0].f.t==f[1].f.t)n++}}return n}   // shelves one move away from a match
function deal(){let bad=true,tries=0;while(bad){G=[];
 for(let r=0;r<ROWS;r++){G.push([]);for(let c=0;c<COLS;c++)G[r].push({lock:LOCKED.findIndex(l=>l[0]==r&&l[1]==c),door:DOORS.findIndex(d=>d[0]==r&&d[1]==c),dop:0,slots:[{q:[]},{q:[]},{q:[]}]})}
 const normal=[],locked=[],acc=[];
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const cp=G[r][c];if(cp.lock>=0)locked.push([r,c]);else if(cp.door<0)normal.push([r,c]);
  for(let i=0;i<3;i++)if(isOpen(r,c)&&!blocked(r,c,i))acc.push([r,c,i])}
 const openSets=TOTAL_BOXES-locked.length*LOCK_ROWS;
 const ty=[];for(let t=0;t<ITEM_TYPES;t++)ty.push(t);while(ty.length<TOTAL_BOXES)ty.push(rnd(ITEM_TYPES));shuf(ty);
 const A=[];ty.slice(0,openSets).forEach(t=>A.push(t,t,t));shuf(A);               // open shelves: whole sets of 3
 const it=(t)=>({t,x:0,y:0,pop:0});
 const pick=normal.map(([r,c])=>[r,c,rnd(3)]);                                  // every open shelf starts with at least 1 front item
 const rest=shuf(acc.filter(p=>!pick.some(q=>q[0]==p[0]&&q[1]==p[1]&&q[2]==p[2]))).slice(0,START_FRONTS-pick.length);
 pick.concat(rest).forEach((p,k)=>{G[p[0]][p[1]].slots[p[2]].f=mk(A[k],p[0],p[1],p[2])});
 const nb=(A.length-START_FRONTS)/3,base=Math.floor(nb/normal.length),extra=nb%normal.length;let k=START_FRONTS;
 shuf(normal.slice()).forEach(([r,c],n)=>{const cnt=base+(n<extra?1:0);for(let j=0;j<cnt;j++)for(let i=0;i<3;i++)G[r][c].slots[i].q.push(it(A[k++]))});   // back rows
 locked.forEach(([r,c],n)=>{const types=ty.slice(openSets+n*LOCK_ROWS,openSets+(n+1)*LOCK_ROWS);let rows,g=0;     // each locked shelf: its own 5 sets
  do{const pool=[];types.forEach(t=>pool.push(t,t,t));shuf(pool);rows=[];for(let j=0;j<LOCK_ROWS;j++)rows.push(pool.slice(j*3,j*3+3))}
  while(g++<300&&rows.some(rw=>rw[0]==rw[1]&&rw[1]==rw[2]));
  rows.forEach((rw,j)=>rw.forEach((t,i)=>{if(j==0)G[r][c].slots[i].f=mk(t,r,c,i);else G[r][c].slots[i].q.push(it(t))}))});
 bad=anyTri();for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(rowsTri(G[r][c]))bad=true;
 if(!bad&&tries++<300&&easyCount()<2)bad=true}}
function newGame(){boxes=0;time=GAME_TIME;sel=null;flyers=[];phase='idle';pt=0;sx=0;queued=0;boxItems=[];lid=0;msg.t=0;deal();drag=null;shufCD=0;state='play';refreshAnim=null;autoCheckTimer=.25;lastCheckedBoard='';gameplayMusic.currentTime=0;playGameplayMusic()}

// ===================== 7. MATCH + RESTOCK LOGIC =====================
// A match is only ever made by the player's own drop, and counts exactly one box.
function clearComp(r,c){const sl=G[r][c].slots;boxes++;queued++;lastType=sl[0].f.t;
 sl.forEach(s=>{if(s.f){flyers.push({x:s.f.x,y:s.f.y,t:0,type:s.f.t});s.f=null}});happyT=.9;advance(r,c);
 if(UNLOCK_AT.includes(boxes)||DOOR_AT.includes(boxes))msg={t:1.6,s:'More shelf space!'};
 if(G.every(row=>row.every(cp=>cp.slots.every(s=>!s.f&&!s.q.length)))){state='over';endT=0;drag=null}}   // whole store restocked
// ===================== 7A. POSITION-PRESERVING REFRESH =====================
// Only item TYPES change. Front occupancy, queue depths and item coordinates stay intact.
let refreshAnim=null,autoCheckTimer=0,lastCheckedBoard='';
const REFRESH_DURATION=1.6;
const REFRESH_ART={};
for(const name of ['shutter','soso-pull']){const image=new Image();image.src='asset/refresh/'+name+'.png';REFRESH_ART[name]=image;}
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
 entries.forEach((p,i)=>p.it.t=best[i]);
 lastCheckedBoard=boardFingerprint();autoCheckTimer=.3;
 msg={t:1.5,s:hasPlayableMatch()?'Stock refreshed!':'No playable set in this layout'};
}
function beginRefresh(automatic=false){
 if(state!=='play'||refreshAnim)return;
 drag=null;refreshAnim={t:0,changed:false,automatic};shufCD=SHUFFLE_CD;
}
function updateRefresh(dt){
 refreshAnim.t+=dt;
 if(refreshAnim.t>=.78&&!refreshAnim.changed){shuffleBoard();refreshAnim.changed=true;}
 if(refreshAnim.t>=REFRESH_DURATION){refreshAnim=null;lastCheckedBoard=boardFingerprint();}
}
function checkAutomaticRefresh(dt){
 autoCheckTimer-=dt;if(autoCheckTimer>0||drag||flyers.length)return;
 autoCheckTimer=.25;const signature=boardFingerprint();if(signature===lastCheckedBoard)return;
 lastCheckedBoard=signature;if(!hasPlayableMatch())beginRefresh(true);
}
function drawRefresh(){
 if(!refreshAnim)return;
 const t=refreshAnim.t,down=t<.72?eio(t/.72):t<.9?1:1-eio((t-.9)/.7);
 const top=90,height=382,edge=top+height*down;
 ctx.save();ctx.beginPath();ctx.rect(4,top,352,height);ctx.clip();
 // Opaque backing ensures artwork covers all shelf contents while it slides.
 ctx.fillStyle='#b8dafa';ctx.fillRect(4,edge-height,352,height);
 const shutter=REFRESH_ART.shutter;if(shutter.complete&&shutter.naturalWidth)ctx.drawImage(shutter,4,edge-height,352,height);
 ctx.restore();
 const soso=REFRESH_ART['soso-pull'];
 // Jump to grab, descend pulling, then rise pushing the shutter overhead.
 const jump=t<.25?Math.sin(t/.25*Math.PI)*22:0;
 const actorTop=Math.max(18,edge-55)-jump;
 if(soso.complete&&soso.naturalWidth)ctx.drawImage(soso,118,actorTop,116,178);
}
const PAUSE_BTN=[326,54,16],SHUF_BTN=[288,54,16];
function setPause(on){if(on&&state=='play'){state='pause';drag=null;gameplayMusic.pause()}else if(!on&&state=='pause'){state='play';playGameplayMusic()}}
function tap(px,py){   // menu buttons; returns true if the touch was used
 if(refreshAnim)return true;
 if(state=='title'){newGame();return true}
 if(state=='over'){if(endT>.8)newGame();return true}
 if(state=='pause'){setPause(false);return true}
 if(Math.hypot(px-PAUSE_BTN[0],py-PAUSE_BTN[1])<PAUSE_BTN[2]+6){setPause(true);return true}
 if(Math.hypot(px-SHUF_BTN[0],py-SHUF_BTN[1])<SHUF_BTN[2]+6){if(shufCD<=0){beginRefresh(false);shufCD=SHUFFLE_CD}return true}
 return false}
// ---- DRAG AND DROP: items only go into EMPTY slots (no swapping). Dropping on a shelf uses its nearest empty slot.
const ptr=e=>{const b=cv.getBoundingClientRect();return[(e.clientX-b.left)/b.width*W,(e.clientY-b.top)/b.height*H]};
function dropTarget(px,py){const c=Math.floor((px-X0)/CWD),r=Math.floor((py-Y0)/RH);if(c<0||c>=COLS||r<0||r>=ROWS||!isOpen(r,c))return null;
 let best=null,bd=1e9;for(let i=0;i<3;i++){if(blocked(r,c,i)||G[r][c].slots[i].f)continue;const d=Math.abs(px-slotX(c,i));if(d<bd){bd=d;best=[r,c,i]}}return best}
cv.addEventListener('pointerdown',e=>{const[px,py]=ptr(e);if(tap(px,py))return;
 const c=Math.floor((px-X0)/CWD),r=Math.floor((py-Y0)/RH);if(state!='play'||c<0||c>=COLS||r<0||r>=ROWS||!isOpen(r,c))return;
 const i=Math.max(0,Math.min(2,Math.floor((px-X0-c*CWD-6)/((CWD-12)/3))));if(blocked(r,c,i))return;const s=G[r][c].slots[i];
 if(s.f){drag={r,c,i,it:s.f,px,py};s.f.pop=.3;s.f.x=px;s.f.y=py-16;try{cv.setPointerCapture(e.pointerId)}catch(_){}}});
cv.addEventListener('pointermove',e=>{if(!drag)return;const[px,py]=ptr(e);drag.px=px;drag.py=py;drag.it.x=px;drag.it.y=py-16});
cv.addEventListener('pointerup',e=>{if(!drag)return;const[px,py]=ptr(e),d=drag;drag=null;if(state!='play')return;const t=dropTarget(px,py);
 if(t){G[t[0]][t[1]].slots[t[2]].f=d.it;G[d.r][d.c].slots[d.i].f=null;advance(d.r,d.c);d.it.pop=.5;if(compTri(t[0],t[1]))clearComp(t[0],t[1])}});   // else it springs back
cv.addEventListener('pointercancel',()=>{drag=null});
// ---- DEBUG: hold Alt + 1 / 2 / 3 ends the game at once with 20 / 12 / 5 boxes. P or Esc = pause.
addEventListener('keydown',e=>{
 if(e.altKey&&(state=='play'||state=='pause')){const n={Digit1:20,Digit2:12,Digit3:5}[e.code];
  if(n!=null){e.preventDefault();boxes=n;time=0;queued=0;flyers=[];sel=null;state='over';endT=0;return}}
 if(!e.repeat&&(e.key=='p'||e.key=='P'||e.key=='Escape'))setPause(state=='play')});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});


// ===================== 8. UPDATE =====================
function update(dt){clock+=dt;if(state=='pause')return;if(state=='play'&&refreshAnim){updateRefresh(dt);return;}if(state=='over')drag=null;shufCD=Math.max(0,shufCD-dt);
 G.forEach((row,r)=>row.forEach(cp=>{if(cp.door>=0||cp.lock>=0){const op=cp.door>=0?boxes>=DOOR_AT[cp.door]:boxes>=UNLOCK_AT[cp.lock];cp.dop+=((op?1:0)-cp.dop)*Math.min(1,dt*6)}}));
 if(state=='play'){time-=dt;if(time<=0){time=0;state='over';endT=0}}else if(state=='over')endT+=dt;
 msg.t=Math.max(0,msg.t-dt);
 G.forEach((row,r)=>row.forEach((cp,c)=>cp.slots.forEach((s,i)=>{const k=Math.min(1,dt*14);
  if(s.f&&!(drag&&drag.it===s.f)){s.f.x+=(slotX(c,i)-s.f.x)*k;s.f.y+=(slotY(r)-s.f.y)*k;s.f.pop=Math.max(0,s.f.pop-dt*3)}})));
 flyers.forEach(f=>f.t+=dt/.4);
 flyers=flyers.filter(f=>{if(f.t>=1){if(phase=='idle'&&boxItems.length<3)boxItems.push(f.type);return false}return true});
 if(state!='play')return;checkAutomaticRefresh(dt);if(refreshAnim)return;pt+=dt;happyT=Math.max(0,happyT-dt);
 if(phase=='idle'){sx=0;ex=0;if(queued>0&&pt>.5){phase='close';pt=0;queued--;boxItems=[lastType,lastType,lastType]}}
 else if(phase=='close'){if(pt>=.6){phase='load';pt=0}}
 else if(phase=='load'){if(pt>=.3){phase='push';pt=0}}
 else if(phase=='push'){sx=eio(pt/.5)*130;ex=pt>.35?Math.pow((pt-.35)/.55,2)*560:0;if(pt>=.95){phase='back';pt=0;boxItems=[]}}
 else if(phase=='back'){const kk=Math.min(1,pt/.9);sx=130*(1-eio(kk));ex=0;if(kk>=1){phase='idle';pt=0;sx=0}}}

// ===================== 9. DRAW SCENE =====================
function drawBG(){
 // Cute supermarket wall and a pastel tile floor, drawn in code for easy colour edits.
 ctx.fillStyle=grad(0,462,'#e9f4ff','#fffaf1');ctx.fillRect(0,0,W,H);
 const horizon=466,bottom=H,vanishX=W/2;
 ctx.fillStyle='#faf3df';ctx.fillRect(0,horizon,W,bottom-horizon);
 // Tiles widen toward the viewer. Horizontal rows follow the same perspective.
 const rows=[466,490,523,568,640],columns=[-360,-180,0,180,360,540,720];
 const project=(x,y)=>vanishX+(x-vanishX)*(.32+.68*(y-horizon)/(bottom-horizon));
 for(let r=0;r<rows.length-1;r++)for(let c=0;c<columns.length-1;c++){
  const top=rows[r],bot=rows[r+1];
  poly([[project(columns[c],top),top],[project(columns[c+1],top),top],
        [project(columns[c+1],bot),bot],[project(columns[c],bot),bot]],
       (r+c)%2?'#f4ecd7':'#e2eee5','#cbd9cc',1.3);
 }
 // Simple baseboard anchors the shelves to the wall.
 rr(0,456,W,10,0,'#fffdf5','#c7dacb',1.5);
}
function drawAwning(){const x=X0-8,w=CWD*COLS+16,y=72,n=12,sw=w/n;
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
   if(s.q[1])drawItem(s.q[1].t,X-9,Y-13,ITEM_SCALE*.75,.12);
   if(s.q[0])drawItem(s.q[0].t,X-5,Y-7,ITEM_SCALE*.85,.4);
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
function drawHUD(){rr(20,18,320,18,9,'#ffffff','#a9c9ee',2);rr(22,20,Math.max(0,316*time/GAME_TIME),14,7,time<15?grad(20,34,'#ffb3b3','#ff7f7f'):grad(20,34,'#9fd0ff','#3d8bec'));
 txt('Boxes: '+boxes,22,64,22,'#8a6a7c','left');txt(Math.ceil(time)+'s',W/2,64,22,time<15?'#e0506a':'#8a6a7c');
 ci(PAUSE_BTN[0],PAUSE_BTN[1],PAUSE_BTN[2],grad(38,70,'#6fb2f5','#3d8bec'),'#2a6fc4',2.5);rr(PAUSE_BTN[0]-6,PAUSE_BTN[1]-7,4,14,2,'#fffafc');rr(PAUSE_BTN[0]+2,PAUSE_BTN[1]-7,4,14,2,'#fffafc');
 {const[bx,by,br]=SHUF_BTN;ci(bx,by,br,grad(38,70,'#c4e0ff','#8cc4f8'),'#3d8bec',2.5);ctx.strokeStyle='#fffafc';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.arc(bx,by,6.5,.5,Math.PI*1.65);ctx.stroke();
  const ax=bx+6.5*Math.cos(Math.PI*1.65),ay=by+6.5*Math.sin(Math.PI*1.65);poly([[ax-4,ay-5],[ax+5,ay-3],[ax+1,ay+4]],'#fffafc','#fffafc',1);
  if(shufCD>0){ctx.fillStyle='rgba(244,249,255,.7)';ctx.beginPath();ctx.moveTo(bx,by);ctx.arc(bx,by,br,-Math.PI/2,-Math.PI/2+Math.PI*2*shufCD/SHUFFLE_CD);ctx.closePath();ctx.fill()}}
 const nx=[...DOOR_AT,...UNLOCK_AT].filter(u=>u>boxes).sort((a,b)=>a-b)[0];if(nx)txt('Next shelf at '+nx+' boxes',W/2,490,12,'#7f9bbf');
 if(msg.t>0){ctx.globalAlpha=Math.min(1,msg.t);txt(msg.s,W/2,H/2-40,24,'#2f7fe0');ctx.globalAlpha=1}}
function drawSosoScene(){const k=.36,TX=240,happy=happyT>0||phase=='close'||phase=='load'||phase=='push';
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
function drawTitle(){txt("Soso Shelf Stock",W/2,100,34,'#ff6b9a');txt('Drag items into empty spaces.',W/2,142,15);
 txt('Match 3 on a shelf - back rows slide forward!',W/2,166,15);for(let i=0;i<ITEM_TYPES;i++)drawItem(i,48+(i%6)*53,214+Math.floor(i/6)*56,.95);
 drawSoso(W/2,540,.66,{face:'h',arms:'side'});txt('Tap to start',W/2,610,22,'#ff6b9a')}
function draw(){ctx.setTransform(S,0,0,S,0,0);drawBG();if(state=='title'){drawTitle();return}
 drawShelf();drawSosoScene();drawFlyers();drawHUD();drawDrag();drawRefresh();if(state=='over')drawOver();
 if(state=='pause'){ctx.fillStyle='rgba(244,249,255,.9)';ctx.fillRect(0,0,W,H);txt('Paused',W/2,H/2-30,38,'#ff6b9a');
  rr(W/2-70,H/2-4,140,44,22,grad(H/2-4,H/2+40,'#9fd0ff','#5aa5f0'),'#2a6fc4',3);txt('Tap to resume',W/2,H/2+25,18,'#8a6a7c')}}

// ===================== 10. MAIN LOOP =====================
let last=performance.now();
function loop(n){const dt=Math.min(.05,(n-last)/1000);last=n;dtG=dt;update(dt);syncGameplayMusic();draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
