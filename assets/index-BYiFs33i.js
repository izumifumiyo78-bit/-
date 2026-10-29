const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./virtual_pwa-register-DfORtStj.js","./three-CZ7s7kry.js"])))=>i.map(i=>d[i]);
import{V as qa,a as De,b as B,M as ht,U as mn,c as dn,P as it,S as de,D as Fe,d as He,e as ve,W as ft,C as Jt,L as gt,R as Ka,H as ja,f as Za,O as vn,I as Ut,g as we,h as os,i as pn,j as yn,k as At,F as Xe,G as St,B as la,l as Qa,Q as Tt,E as Ba,m as Ja,n as Ot,o as vt,p as gn,q as ga,A as ea,r as Ns,s as xn,t as bn,u as Ws,v as Vs,N as kn,w as Mn,x as wn,y as Sn,z as Tn,J as Pn,K as Cn,T as is,X as zn,Y as Ln,Z as Rn,_ as An,$ as Dn,a0 as Fn}from"./three-CZ7s7kry.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function a(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(n){if(n.ep)return;n.ep=!0;const i=a(n);fetch(n.href,i)}})();const Nn="modulepreload",Wn=function(e,t){return new URL(e,t).href},rs={},Vn=function(t,a,s){let n=Promise.resolve();if(a&&a.length>0){let c=function(u){return Promise.all(u.map(h=>Promise.resolve(h).then(d=>({status:"fulfilled",value:d}),d=>({status:"rejected",reason:d}))))};const o=document.getElementsByTagName("link"),r=document.querySelector("meta[property=csp-nonce]"),l=r?.nonce||r?.getAttribute("nonce");n=c(a.map(u=>{if(u=Wn(u,s),u in rs)return;rs[u]=!0;const h=u.endsWith(".css"),d=h?'[rel="stylesheet"]':"";if(s)for(let f=o.length-1;f>=0;f--){const m=o[f];if(m.href===u&&(!h||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${d}`))return;const v=document.createElement("link");if(v.rel=h?"stylesheet":Nn,h||(v.as="script"),v.crossOrigin="",v.href=u,l&&v.setAttribute("nonce",l),document.head.appendChild(v),h)return new Promise((f,m)=>{v.addEventListener("load",f),v.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${u}`)))})}))}function i(o){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=o,window.dispatchEvent(r),!r.defaultPrevented)throw o}return n.then(o=>{for(const r of o||[])r.status==="rejected"&&i(r.reason);return t().catch(i)})},M={length:105,width:68,halfL:52.5,halfW:34,goalWidth:7.32,goalHalf:3.66,goalHeight:2.44,goalDepth:2,boxDepth:16.5,boxHalfW:20.16,sixDepth:5.5,sixHalfW:9.16,penSpot:11,centreR:9.15,arcR:9.15,cornerR:1,lineW:.12,runOffX:8.5,runOffY:7.5},cs=9.81,H={r:.111,airDrag:.0055,magnus:.0072,spinDecay:.72,spinDecayGround:2.6,restitution:.58,friction:.62,rollDrag:.42,postRest:.66,netDamp:.22,maxSpeed:42},O={baseSpeed:6.1,paceSpan:2,sprintMul:1.18,accel:6.9,decel:13,turnRate:7.4,dribbleSpeedMul:.915,shieldSpeedMul:.6,controlR:1.05,controlZ:1.05,touchCooldown:.085,dribbleAhead:.78,dribbleTouchEvery:.22,firstTouchErr:.9,passMin:9.5,passMax:24.5,passLoftMin:.055,throughLoft:.1,longPassLoft:.34,passErrDeg:9.5,shotMin:16,shotMax:33,shotErrDeg:10.5,finesseCurl:1.5,tackleR:1.95,slideSpeed:9.6,slideTime:.72,slideR:1.5,foulBase:.075,jostleR:.95,staminaDrainWalk:.22,staminaDrainSprint:2.35,staminaRecover:1.05,staminaSpeedBite:.17,gkReach:1.32,gkDiveSpeed:5.9,gkDiveTime:.78,gkRushTrigger:13,gkHandleR:.98},sa={pressRadius:13.5,markTight:2.1,supportSpread:9,decisionEvery:.11,reactionBase:.14},Ea=[{id:"beginner",name:"ビギナー",en:"Beginner",aiSkill:.62,aiReact:1.75,aiPress:.7,aiShotErr:1.9,assist:1,userErr:.55,gk:.8,userGk:1.16},{id:"amateur",name:"アマチュア",en:"Amateur",aiSkill:.76,aiReact:1.35,aiPress:.85,aiShotErr:1.45,assist:.92,userErr:.75,gk:.9,userGk:1.08},{id:"pro",name:"プロ",en:"Professional",aiSkill:.88,aiReact:1.08,aiPress:1,aiShotErr:1.12,assist:.8,userErr:.92,gk:1,userGk:1},{id:"world",name:"ワールドクラス",en:"World Class",aiSkill:.97,aiReact:.9,aiPress:1.14,aiShotErr:.95,assist:.68,userErr:1.04,gk:1.07,userGk:.96},{id:"legend",name:"レジェンド",en:"Legendary",aiSkill:1.06,aiReact:.76,aiPress:1.28,aiShotErr:.84,assist:.56,userErr:1.14,gk:1.14,userGk:.93}],Gn=[2,4,6,10],Bn={restartHold:.38},Ca={dt:1/60,maxSubSteps:4},pt=Math.PI*2,F=(e,t,a)=>e<t?t:e>a?a:e,I=e=>e<0?0:e>1?1:e,q=(e,t,a)=>e+(t-e)*a,En=e=>(e=I(e),e*e*(3-2*e)),Ie=e=>e<0?-1:e>0?1:0,nt=e=>e*Math.PI/180;function Gs(e,t){let a=(t-e)%pt;return a>Math.PI&&(a-=pt),a<-Math.PI&&(a+=pt),a}function ls(e,t,a){const s=Gs(e,t);return Math.abs(s)<=a?t:e+Ie(s)*a}const Hn=(e,t,a,s)=>{const n=a-e,i=s-t;return n*n+i*i},E=(e,t,a,s)=>Math.sqrt(Hn(e,t,a,s));function oe(e,t){const a=Math.hypot(e,t);return a<1e-9?{x:0,y:0,m:0}:{x:e/a,y:t/a,m:a}}const ye=(e,t,a,s)=>e+(t-e)*(1-Math.exp(-a*s));function Bs(e,t,a,s,n,i){const o=n-a,r=i-s,l=o*o+r*r;let c=l<1e-9?0:((e-a)*o+(t-s)*r)/l;c=I(c);const u=a+o*c,h=s+r*c;return{d:Math.hypot(e-u,t-h),t:c,x:u,y:h}}function Es(e=1){let t=e>>>0;const a=()=>{t=t+1831565813>>>0;let s=t;return s=Math.imul(s^s>>>15,s|1),s^=s+Math.imul(s^s>>>7,s|61),((s^s>>>14)>>>0)/4294967296};return a.range=(s,n)=>s+(n-s)*a(),a.int=(s,n)=>Math.floor(s+(n-s+1)*a()),a.pick=s=>s[Math.floor(a()*s.length)%s.length],a.chance=s=>a()<s,a.gauss=()=>(a()+a()+a()+a()+a()+a()-3)*.7071,a.shuffle=s=>{for(let n=s.length-1;n>0;n--){const i=Math.floor(a()*(n+1)),o=s[n];s[n]=s[i],s[i]=o}return s},a}function Un(e){const t=Math.max(0,Math.floor(e)),a=Math.floor(t/60);return`${String(a).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`}function On(){return{x:0,y:0,z:H.r,vx:0,vy:0,vz:0,wx:0,wy:0,wz:0,rolling:!0,lastTouch:null,lastTouchTeam:-1,prevTouchTeam:-1,kickT:-99,kickKind:null,kickFrom:{x:0,y:0},intendedTarget:null,offsideArmed:!1,trail:[],hitPost:0,bounced:0,spinVis:0}}function In(e,t,a,s=H.r){e.x=t,e.y=a,e.z=s,e.vx=e.vy=e.vz=0,e.wx=e.wy=e.wz=0,e.rolling=!0,e.trail.length=0}function ta(e,{dirX:t,dirY:a,speed:s,loft:n=0,curl:i=0,dip:o=0,kind:r="pass",by:l=null,target:c=null}){const u=oe(t,a),h=Math.atan2(n,1),d=Math.min(s/Math.max(.35,Math.cos(h)),H.maxSpeed);return e.vx=u.x*d*Math.cos(h),e.vy=u.y*d*Math.cos(h),e.vz=d*Math.sin(h),e.z<H.r+.02&&(e.z=H.r+.02),e.wz=i*28,e.wx=-u.y*o*26,e.wy=u.x*o*26,e.rolling=!1,e.kickKind=r,e.kickFrom.x=e.x,e.kickFrom.y=e.y,e.intendedTarget=c,l&&(e.lastTouch=l),e}const Xn=()=>{const e=M.halfL,t=M.goalHalf;return[{x:e,y:t},{x:e,y:-t},{x:-e,y:t},{x:-e,y:-t}]},us=Xn(),Ft=.06;function $n(e,t){const a={bounce:0,post:0,crossbar:0,net:0};e.hitPost>0&&(e.hitPost=Math.max(0,e.hitPost-t*3));const s=e.x,n=e.y,i=e.z,o=Math.hypot(e.vx,e.vy,e.vz);if(o>1e-4){const r=H.airDrag*o;let l=-e.vx*r,c=-e.vy*r,u=-e.vz*r;const h=e.wy*e.vz-e.wz*e.vy,d=e.wz*e.vx-e.wx*e.vz,v=e.wx*e.vy-e.wy*e.vx,f=H.magnus*(e.z>H.r+.05?1:.42);l+=h*f,c+=d*f,u+=v*f,u-=cs,e.vx+=l*t,e.vy+=c*t,e.vz+=u*t}else e.vz-=cs*t;if(e.x+=e.vx*t,e.y+=e.vy*t,e.z+=e.vz*t,e.z<=H.r)if(e.z=H.r,e.vz<-.35){a.bounce=Math.min(1,-e.vz/9),e.vz=-e.vz*H.restitution;const r=-e.wy*.018,l=e.wx*.018;e.vx=e.vx*H.friction+r,e.vy=e.vy*H.friction+l,e.wx*=.45,e.wy*=.45,e.wz*=.72,e.bounced=1}else e.vz=0,e.rolling=!0;else e.z>H.r+.02&&(e.rolling=!1);if(e.rolling){const r=Math.hypot(e.vx,e.vy);if(r>1e-4){const l=H.rollDrag+.055*r,c=Math.max(0,1-l*t/Math.max(r,.2));if(e.vx*=c,e.vy*=c,Math.abs(e.wz)>.4){const u=-e.vy/r,h=e.vx/r,d=e.wz*.0075*r;e.vx+=u*d*t,e.vy+=h*d*t}}Math.hypot(e.vx,e.vy)<.06&&(e.vx=0,e.vy=0),e.wz-=e.wz*Math.min(1,H.spinDecayGround*t),e.wx*=1-Math.min(1,4*t),e.wy*=1-Math.min(1,4*t)}else{const r=Math.min(1,H.spinDecay*t);e.wx-=e.wx*r,e.wy-=e.wy*r,e.wz-=e.wz*r}return Yn(e,s,n,i,a),e.spinVis+=Math.hypot(e.vx,e.vy)/H.r*t*.22,e.spinVis>1e6&&(e.spinVis=0),e.z>.3||Math.hypot(e.vx,e.vy)>9?(e.trail.push(e.x,e.y,e.z),e.trail.length>90&&e.trail.splice(0,3)):e.trail.length&&e.trail.splice(0,3),a}function Yn(e,t,a,s,n){const i=M.halfL,o=M.goalHalf,r=M.goalHeight;for(let l=0;l<us.length;l++){const c=us[l];if(e.z>r+.08)continue;const u=e.x-c.x,h=e.y-c.y,d=Math.hypot(u,h),v=Ft+H.r;if(d<v&&d>1e-5){const f=u/d,m=h/d;e.x=c.x+f*v,e.y=c.y+m*v;const p=e.vx*f+e.vy*m;p<0&&(e.vx-=(1+H.postRest)*p*f,e.vy-=(1+H.postRest)*p*m,n.post=1,e.hitPost=1)}}for(const l of[1,-1]){const c=i*l;if(Math.abs(e.y)>o+.1)continue;const u=(e.x-c)*l;if(Math.abs(u)>.3)continue;const h=r+Ft;Math.abs(e.z-h)<Ft+H.r&&Math.abs(s-h)>=Ft+H.r&&(e.z=s>h?h+Ft+H.r:h-Ft-H.r,e.vz=-e.vz*H.postRest,e.vx*=.8,e.vy*=.8,n.crossbar=1,e.hitPost=1)}for(const l of[1,-1]){const c=i*l;if(!((e.x-c)*l>0)||Math.abs(e.y)>o+.25||e.z>r+.3)continue;const h=c+l*M.goalDepth;(e.x-h)*l>-.111&&(e.x=h-l*H.r,e.vx=-e.vx*H.netDamp,e.vy*=.5,e.vz*=.4,n.net=1),Math.abs(e.y)>o-H.r&&(e.y=Math.sign(e.y)*(o-H.r),e.vy=-e.vy*H.netDamp,e.vx*=.6,n.net=1),e.z>r-H.r&&(e.z=r-H.r,e.vz>0&&(e.vz=-e.vz*H.netDamp,n.net=1))}}function _n(e,t){const a=M.halfL;for(const s of[1,-1]){const n=a*s,i=(t-n)*s,o=(e.x-n)*s;if(i<=0&&o>H.r*.1&&Math.abs(e.y)<M.goalHalf-H.r*.4&&e.z<M.goalHeight-H.r*.3)return s}return 0}const ot=[{id:"AUR",name:"オーロラFC",en:"Aurora FC",abbr:"AUR",pat:"stripes",c1:"#1e5fe0",c2:"#f2f6ff",c3:"#0b2a63",away1:"#f2f6ff",away2:"#1e5fe0",str:87,style:"possession",crest:"star"},{id:"IRO",name:"アイアンサイド",en:"Ironside United",abbr:"IRO",pat:"sash",c1:"#b8232c",c2:"#1b1b20",c3:"#f1d9a1",away1:"#1b1b20",away2:"#b8232c",str:86,style:"direct",crest:"shield"},{id:"VER",name:"ヴェルデ・マール",en:"Verde Mar",abbr:"VER",pat:"hoops",c1:"#0f9d58",c2:"#ffffff",c3:"#0b5b36",away1:"#0b3b26",away2:"#9ff0c4",str:85,style:"press",crest:"wave"},{id:"NOC",name:"ノクターン",en:"Nocturne SC",abbr:"NOC",pat:"plain",c1:"#2a2440",c2:"#c9a227",c3:"#0d0b16",away1:"#c9a227",away2:"#2a2440",str:84,style:"counter",crest:"moon"},{id:"SOL",name:"ソラリス",en:"Solaris Athletic",abbr:"SOL",pat:"stripes",c1:"#f5a623",c2:"#2b1a00",c3:"#ffd98a",away1:"#2b1a00",away2:"#f5a623",str:83,style:"direct",crest:"sun"},{id:"GLA",name:"グラシエ",en:"Glacier City",abbr:"GLA",pat:"halves",c1:"#7fd7f0",c2:"#0a3d52",c3:"#ffffff",away1:"#0a3d52",away2:"#7fd7f0",str:82,style:"possession",crest:"peak"},{id:"TER",name:"テッラロッサ",en:"Terra Rossa",abbr:"TER",pat:"plain",c1:"#8c3b1b",c2:"#f3e2c7",c3:"#4a1d0c",away1:"#f3e2c7",away2:"#8c3b1b",str:81,style:"press",crest:"bull"},{id:"ZEP",name:"ゼファー",en:"Zephyr Rovers",abbr:"ZEP",pat:"stripes",c1:"#d8dde3",c2:"#38414d",c3:"#9fb0c4",away1:"#38414d",away2:"#d8dde3",str:80,style:"counter",crest:"wing"},{id:"KUR",name:"クロガネ",en:"Kurogane FC",abbr:"KUR",pat:"sash",c1:"#20242b",c2:"#e8403a",c3:"#6f7680",away1:"#e8403a",away2:"#20242b",str:80,style:"press",crest:"anvil"},{id:"MAR",name:"マリンブルーズ",en:"Marine Blues",abbr:"MAR",pat:"hoops",c1:"#0a4f8a",c2:"#8fd3ff",c3:"#062f54",away1:"#8fd3ff",away2:"#0a4f8a",str:79,style:"possession",crest:"anchor"},{id:"AMB",name:"アンバー・ヒル",en:"Amber Hill",abbr:"AMB",pat:"plain",c1:"#e0a21a",c2:"#3a2a08",c3:"#fff0c4",away1:"#3a2a08",away2:"#e0a21a",str:78,style:"direct",crest:"hill"},{id:"VIO",name:"ヴィオレット",en:"Violette Nord",abbr:"VIO",pat:"sash",c1:"#6b3fb5",c2:"#efe7ff",c3:"#2f1a55",away1:"#efe7ff",away2:"#6b3fb5",str:78,style:"possession",crest:"lily"},{id:"FOR",name:"フォージ",en:"Forge Town",abbr:"FOR",pat:"stripes",c1:"#d75a1f",c2:"#241a14",c3:"#f6c79a",away1:"#241a14",away2:"#d75a1f",str:77,style:"direct",crest:"hammer"},{id:"CYP",name:"シプレス",en:"Cypress Park",abbr:"CYP",pat:"hoops",c1:"#2f6b3a",c2:"#f0f4e8",c3:"#17391f",away1:"#f0f4e8",away2:"#2f6b3a",str:76,style:"counter",crest:"tree"},{id:"HAL",name:"ハルシオン",en:"Halcyon Bay",abbr:"HAL",pat:"plain",c1:"#15b7a4",c2:"#07322e",c3:"#bdfff6",away1:"#07322e",away2:"#15b7a4",str:75,style:"possession",crest:"bird"},{id:"OBS",name:"オブシディアン",en:"Obsidian Nine",abbr:"OBS",pat:"halves",c1:"#16161a",c2:"#49e0c4",c3:"#3c3c46",away1:"#49e0c4",away2:"#16161a",str:75,style:"press",crest:"gem"}],qn=["Arvani","Belmire","Calbret","Dorsey","Enquist","Falvio","Grasso","Hakuda","Imbert","Jorven","Kastel","Lundqvist","Moriaux","Nevala","Okonjo","Petrelli","Quintar","Ravelli","Sandrup","Takimoto","Ulvang","Varela","Wendt","Ximenes","Yanagi","Zoric","Abrantes","Brecker","Cardoso","Delmaro","Eskildsen","Fontane","Gridley","Halvard","Ibori","Jansik","Kovalenko","Lamerre","Mbeki","Norrback","Olazar","Pellone","Raduno","Serrano","Tovarek","Urbina","Vascov","Weisner","Yoselin","Zagara","Alvent","Brindisi","Castellan","Dufresne","Egilsson","Ferraro","Goddard","Hirayama","Ilunga","Jerrick","Kaneshiro","Larsgaard","Montoro","Nakabe","Ostrov","Parvin","Rizzoli","Sorrento","Thalberg","Uvarov","Vicario","Welton","Yusupov","Zimran"],Kn="ADEFGHIJKLMNOPRSTVY".split(""),fs={GK:[.45,.5,.65,.25,.3,.4,.8,.9,.7,.7],CB:[.72,.7,.72,.4,.5,1.02,1.05,1.06,.78,.92],LB:[.98,.96,.86,.55,.82,.94,.78,.86,.84,1.04],RB:[.98,.96,.86,.55,.82,.94,.78,.86,.84,1.04],DM:[.8,.82,.95,.62,.74,1,.92,1,.95,1.04],CM:[.86,.9,1.04,.78,.92,.86,.8,.9,1.05,1.06],AM:[.9,.98,1.06,.9,1.06,.6,.7,.8,1.1,.96],LM:[1,1,.96,.8,1.02,.72,.7,.78,.94,1.04],RM:[1,1,.96,.8,1.02,.72,.7,.78,.94,1.04],LW:[1.08,1.06,.9,.9,1.1,.55,.66,.74,.92,.98],RW:[1.08,1.06,.9,.9,1.1,.55,.66,.74,.92,.98],ST:[1.02,1.04,.8,1.12,.96,.5,1,.98,.86,.94]},za=["pace","accel","pass","shoot","dribble","tackle","head","strength","vision","stamina"],jn={possession:{pass:4,vision:4,dribble:2,tackle:-2},direct:{shoot:4,head:4,strength:3,pass:-2},press:{tackle:5,stamina:4,pace:2,pass:-2},counter:{pace:5,accel:4,shoot:2,pass:-1}};function Zn(e,t,a,s,n){const i=fs[a]||fs.CM,o=jn[t.style]||{},r=t.str+e.gauss()*4.2-s*.22,l={id:`${t.id}-${n}`,shirt:n,name:`${e.pick(Kn)}. ${e.pick(qn)}`,role:a,foot:e.chance(.78)?"R":"L"};for(let h=0;h<za.length;h++){const d=za[h],v=r*(.72+.4*i[h])+(o[d]||0)+e.gauss()*3.4;l[d]=Math.round(F(v,36,99))}a==="GK"&&(l.gkReflex=Math.round(F(r+e.gauss()*3,40,99)),l.gkPositioning=Math.round(F(r+e.gauss()*3,40,99)),l.gkHandling=Math.round(F(r+e.gauss()*3,40,99)));const c=i.reduce((h,d)=>h+d,0),u=i.reduce((h,d)=>h+d*(.72+.4*d),0)/c;return l.overall=Math.round(za.reduce((h,d,v)=>h+l[d]*i[v],0)/c/u),l}const Qn=["GK","RB","CB","CB","LB","DM","CM","CM","RW","ST","LW","GK","CB","RB","DM","CM","AM","RW","ST"],Jn=[1,2,4,5,3,6,8,10,7,9,11,13,15,16,14,18,20,17,19],La=new Map;function Hs(e){if(La.has(e))return La.get(e);const t=ot.find(i=>i.id===e)||ot[0];let a=0;for(let i=0;i<t.id.length;i++)a=a*131+t.id.charCodeAt(i);const s=Es(a^2654435769),n=Qn.map((i,o)=>Zn(s,t,i,o,Jn[o]));return La.set(e,n),n}function ua(e){return ot.find(t=>t.id===e)||ot[0]}function Ra(e){const t=Hs(e).slice(0,11);return Math.round(t.reduce((a,s)=>a+s.overall,0)/t.length)}const Ha=[{id:"433",name:"4-3-3",en:"4-3-3",desc:"幅を使って崩す攻撃的な基本形",tactics:{line:.4,width:1.06,press:1.06,tempo:1.06,risk:1},slots:[{role:"GK",nx:.03,ny:0},{role:"RB",nx:.225,ny:.72},{role:"CB",nx:.165,ny:.26},{role:"CB",nx:.165,ny:-.26},{role:"LB",nx:.225,ny:-.72},{role:"DM",nx:.36,ny:0},{role:"CM",nx:.465,ny:.34},{role:"CM",nx:.465,ny:-.34},{role:"RW",nx:.7,ny:.8},{role:"ST",nx:.765,ny:.02},{role:"LW",nx:.7,ny:-.8}]},{id:"442",name:"4-4-2",en:"4-4-2",desc:"バランス重視、2トップで押し込む",tactics:{line:.38,width:1.02,press:1,tempo:1,risk:.96},slots:[{role:"GK",nx:.03,ny:0},{role:"RB",nx:.22,ny:.74},{role:"CB",nx:.16,ny:.26},{role:"CB",nx:.16,ny:-.26},{role:"LB",nx:.22,ny:-.74},{role:"RM",nx:.49,ny:.8},{role:"CM",nx:.43,ny:.24},{role:"CM",nx:.43,ny:-.24},{role:"LM",nx:.49,ny:-.8},{role:"ST",nx:.73,ny:.2},{role:"ST",nx:.73,ny:-.2}]},{id:"4231",name:"4-2-3-1",en:"4-2-3-1",desc:"中盤を厚くして主導権を握る",tactics:{line:.4,width:1,press:1.08,tempo:1.04,risk:1},slots:[{role:"GK",nx:.03,ny:0},{role:"RB",nx:.23,ny:.74},{role:"CB",nx:.165,ny:.26},{role:"CB",nx:.165,ny:-.26},{role:"LB",nx:.23,ny:-.74},{role:"DM",nx:.34,ny:.2},{role:"DM",nx:.34,ny:-.2},{role:"RW",nx:.59,ny:.76},{role:"AM",nx:.595,ny:0},{role:"LW",nx:.59,ny:-.76},{role:"ST",nx:.775,ny:0}]},{id:"352",name:"3-5-2",en:"3-5-2",desc:"ウイングバックが上下動する積極策",tactics:{line:.43,width:1.12,press:1.1,tempo:1.06,risk:1.08},slots:[{role:"GK",nx:.03,ny:0},{role:"CB",nx:.175,ny:.34},{role:"CB",nx:.15,ny:0},{role:"CB",nx:.175,ny:-.34},{role:"RM",nx:.455,ny:.9},{role:"CM",nx:.43,ny:.3},{role:"DM",nx:.345,ny:0},{role:"CM",nx:.43,ny:-.3},{role:"LM",nx:.455,ny:-.9},{role:"ST",nx:.73,ny:.18},{role:"ST",nx:.73,ny:-.18}]},{id:"532",name:"5-3-2",en:"5-3-2",desc:"堅守速攻。低い重心からカウンター",tactics:{line:.3,width:1,press:.9,tempo:1.1,risk:.86},slots:[{role:"GK",nx:.03,ny:0},{role:"RB",nx:.21,ny:.82},{role:"CB",nx:.14,ny:.3},{role:"CB",nx:.12,ny:0},{role:"CB",nx:.14,ny:-.3},{role:"LB",nx:.21,ny:-.82},{role:"CM",nx:.42,ny:.34},{role:"DM",nx:.35,ny:0},{role:"CM",nx:.42,ny:-.34},{role:"ST",nx:.7,ny:.22},{role:"ST",nx:.7,ny:-.22}]},{id:"41212",name:"4-1-2-1-2",en:"4-1-2-1-2",desc:"ダイヤモンド中盤で中央突破",tactics:{line:.41,width:.86,press:1.12,tempo:1.08,risk:1.04},slots:[{role:"GK",nx:.03,ny:0},{role:"RB",nx:.235,ny:.78},{role:"CB",nx:.165,ny:.24},{role:"CB",nx:.165,ny:-.24},{role:"LB",nx:.235,ny:-.78},{role:"DM",nx:.335,ny:0},{role:"CM",nx:.48,ny:.44},{role:"CM",nx:.48,ny:-.44},{role:"AM",nx:.615,ny:0},{role:"ST",nx:.77,ny:.16},{role:"ST",nx:.77,ny:-.16}]}],eo=e=>Ha.find(t=>t.id===e)||Ha[0];function hs(e){switch(e){case"possession":return"4231";case"direct":return"442";case"press":return"433";case"counter":return"532";default:return"433"}}let to=1;function ao(e,t,a,s){const n=e;return{uid:to++,info:n,name:n.name,shirt:n.shirt,role:s?s.role:n.role,team:t,slot:a,isGK:(s?s.role:n.role)==="GK",x:0,y:0,vx:0,vy:0,facing:0,speed:0,inX:0,inY:0,sprint:!1,stamina:1,state:"run",stateT:0,touchCd:0,kickAnim:0,kickFoot:1,armAnim:0,animPhase:Math.random()*pt,lean:0,diveDir:0,hasBall:!1,shielding:!1,cards:0,sentOff:!1,ai:{tDecide:Math.random()*.1,intent:"hold",runX:0,runY:0,markTarget:null,pressing:!1,support:0,lastPassT:-9,reaction:0,commit:0,jog:Math.random()*pt},k:so(n),homeX:0,homeY:0,targetX:0,targetY:0,user:!1,userGlow:0,stats:{passes:0,passOk:0,shots:0,goals:0,tackles:0,fouls:0,dist:0}}}function Be(e){return I((e-30)/65)}function so(e){return{pace:Be(e.pace),accel:Be(e.accel),pass:Be(e.pass),shoot:Be(e.shoot),dribble:Be(e.dribble),tackle:Be(e.tackle),head:Be(e.head),strength:Be(e.strength),vision:Be(e.vision),stamina:Be(e.stamina),gkReflex:Be(e.gkReflex||60),gkPos:Be(e.gkPositioning||60),gkHand:Be(e.gkHandling||60)}}function It(e,t=e.sprint){const a=O.baseSpeed+(e.k.pace-.5)*2*O.paceSpan,s=1-O.staminaSpeedBite*(1-e.stamina);let n=a*s;return t&&(n*=O.sprintMul),e.hasBall&&(n*=O.dribbleSpeedMul+e.k.dribble*.07),e.shielding&&(n*=O.shieldSpeedMul),n}function no(e,t,a){switch(e.stateT+=t,e.touchCd>0&&(e.touchCd-=t),e.kickAnim>0&&(e.kickAnim-=t),e.armAnim>0&&(e.armAnim-=t),e.userGlow>0&&(e.userGlow-=t),e.state){case"slide":io(e);break;case"dive":ro(e);break;case"getup":e.vx=ye(e.vx,0,9,t),e.vy=ye(e.vy,0,9,t),e.stateT>(e.isGK?.42:.55)&&Ue(e,"run");break;case"stunned":e.vx=ye(e.vx,0,7,t),e.vy=ye(e.vy,0,7,t),e.stateT>.75&&Ue(e,"run");break;case"celebrate":e.vx=ye(e.vx,e.inX*4.4,6,t),e.vy=ye(e.vy,e.inY*4.4,6,t);break;default:oo(e,t);break}e.x+=e.vx*t,e.y+=e.vy*t,e.speed=Math.hypot(e.vx,e.vy),e.stats.dist+=e.speed*t;const s=M.halfL+M.runOffX-1,n=M.halfW+M.runOffY-1;e.x>s&&(e.x=s,e.vx=Math.min(0,e.vx)),e.x<-s&&(e.x=-s,e.vx=Math.max(0,e.vx)),e.y>n&&(e.y=n,e.vy=Math.min(0,e.vy)),e.y<-n&&(e.y=-n,e.vy=Math.max(0,e.vy));const i=e.speed/Math.max(1,It(e,!0)),o=(O.staminaDrainWalk+(O.staminaDrainSprint-O.staminaDrainWalk)*Math.pow(i,2.1))*(1.25-e.k.stamina*.5);e.stamina=I(e.stamina-o*t/100+(i<.35?O.staminaRecover*t/100:0));const r=e.state==="slide"||e.state==="dive"?0:e.speed*1.52;e.animPhase=(e.animPhase+r*t)%pt;const l=Math.atan2(e.vy,e.vx),c=e.speed>.6?F(Gs(e.facing,l)*.45,-.5,.5):0;return e.lean=ye(e.lean,c,9,t),e}function oo(e,t){const a=Math.min(1,Math.hypot(e.inX,e.inY)),s=oe(e.inX,e.inY),n=It(e),i=a>.05?n*a:0,o=s.x*i,r=s.y*i;let l=o-e.vx,c=r-e.vy;const u=Math.hypot(l,c);if(u>1e-5){const d=.78+e.k.accel*.42,v=e.speed>.4?(e.vx*l+e.vy*c)/(e.speed*u):1,f=i>e.speed?O.accel:O.decel,m=v<0?1-.34*-v:1,p=f*d*m*(e.hasBall?.92:1),y=Math.min(u,p*t);e.vx+=l/u*y,e.vy+=c/u*y}const h=O.turnRate*(.6+e.k.dribble*.5)*(1-.3*Math.min(1,e.speed/8));a>.05?e.facing=ls(e.facing,Math.atan2(s.y,s.x),h*t):e.speed>.5&&(e.facing=ls(e.facing,Math.atan2(e.vy,e.vx),h*t))}function io(e,t){const a=e.stateT/O.slideTime,s=1-I(a)*.86,n=O.slideSpeed*s;e.vx=Math.cos(e.facing)*n,e.vy=Math.sin(e.facing)*n,e.stateT>=O.slideTime&&Ue(e,"getup")}function ro(e,t){const a=e.stateT/O.gkDiveTime,s=1-I(a)*.92,n=O.gkDiveSpeed*s*(.7+e.k.gkReflex*.5);e.vx=Math.cos(e.diveDir)*n*.42,e.vy=Math.sin(e.diveDir)*n,e.stateT>=O.gkDiveTime&&Ue(e,"getup")}function Ue(e,t){e.state!==t&&(e.state=t,e.stateT=0,(t==="slide"||t==="dive")&&(e.hasBall=!1))}function Us(e,t,a){if(e.state!=="run"||e.isGK)return!1;const s=oe(t,a);return s.m>.1&&(e.facing=Math.atan2(s.y,s.x)),Ue(e,"slide"),e.stamina=I(e.stamina-.012),!0}function co(e,t,a){return e.state!=="run"?!1:(e.diveDir=Math.atan2(t,(a-e.x)*.25),Ue(e,"dive"),!0)}function Os(e,t){return t.z>1.25&&t.z<2.55&&Math.hypot(t.x-e.x,t.y-e.y)<O.controlR+.35}function lo(e,t,a=1){if(e.touchCd>0||e.state==="getup"||e.state==="stunned")return!1;const s=(e.state==="slide"?O.slideR:e.state==="dive"?O.gkHandleR+.45:O.controlR)*a,n=e.isGK?2.5:O.controlZ;return Math.hypot(t.x-e.x,t.y-e.y)<s+Math.min(.55,e.speed*.055)&&(t.z<n||Os(e,t))}function Is(e,t=0){e.kickAnim=.26,e.kickFoot=t||(Math.random()<.5?1:-1)}function ms(e,t,a,s){const n=ua(e),i=Hs(e),o=eo(t),r=[],l=i.slice();return o.slots.forEach((c,u)=>{let h=0,d=-1e9;for(let f=0;f<l.length;f++){const m=l[f],p=uo(m.role,c.role)*100+m.overall;p>d&&(d=p,h=f)}const v=l.splice(h,1)[0];r.push(ao(v,a,u,c))}),{idx:a,side:s,club:n,squad:i,form:o,formationId:t,tactics:{...o.tactics},players:r,bench:l,score:0,kit:0,stats:{shots:0,onTarget:0,possSec:0,passes:0,passOk:0,tackles:0,fouls:0,corners:0,offsides:0,saves:0,yellow:0,red:0},mentality:0,pressUrge:0}}const ds={GK:"gk",CB:"cb",LB:"fb",RB:"fb",DM:"dm",CM:"cm",AM:"am",LM:"wm",RM:"wm",LW:"wg",RW:"wg",ST:"st"},vs={gk:{gk:1},cb:{cb:1,dm:.6,fb:.5},fb:{fb:1,wm:.65,cb:.5},dm:{dm:1,cm:.8,cb:.55},cm:{cm:1,dm:.78,am:.75},am:{am:1,cm:.8,wg:.6,st:.55},wm:{wm:1,wg:.8,fb:.6,cm:.5},wg:{wg:1,wm:.78,st:.6,am:.6},st:{st:1,wg:.6,am:.55}};function uo(e,t){const a=ds[e]||"cm",s=ds[t]||"cm";return a===s?1:vs[s]&&vs[s][a]||.25}const Ne=e=>-M.halfL*e.side,We=e=>M.halfL*e.side;function Xs(e,t,a){return{nx:I((t*e.side+M.halfL)/M.length),ny:F(a*e.side/M.halfW,-1.2,1.2)}}function zt(e,t,a){return{x:(t*M.length-M.halfL)*e.side,y:a*M.halfW*e.side}}function $s(e,t){const a=t.ball,{nx:s,ny:n}=Xs(e,a.x,a.y),i=t.possTeam===e.idx,o=t.possTeam<0,r=e.tactics,l=t.teams[1-e.idx],c=e.score-l.score,u=t.totalTime-t.played,h=c<0?I(1-u/(t.totalTime*.55)):0,d=F(-c*.22+h*.85,-.6,1);e.mentality+=(d-e.mentality)*.02;const v=i?1:o?.45:0,f=r.line+e.mentality*.07,m=(s-.5)*q(.44,.5,v)+(v-.5)*.08+e.mentality*.045,p=i?q(.98,1.05,En(s)):q(.74,1,s),y=q(.82,1.1,v)*r.width;for(const g of e.players){if(g.sentOff)continue;const b=e.form.slots[g.slot];if(g.isGK){const w=zt(e,.012+I(s-.5)*.028,F(n*.3,-.12,.12));g.homeX=w.x,g.homeY=w.y;continue}let k=f+(b.nx-r.line)*p+m,x=b.ny*y;if(x+=n*(i?.17:.3)*(1-Math.abs(b.ny)*.45),i){const w=Math.sign(b.ny)===Math.sign(n)&&Math.abs(n)>.3;Math.abs(b.ny)>.6&&(x+=Math.sign(b.ny)*.07),(b.role==="LB"||b.role==="RB")&&w&&s>.45&&(k+=.16*r.risk,x+=Math.sign(b.ny)*.06),(b.role==="ST"||b.role==="LW"||b.role==="RW")&&(k+=.018*r.risk)}else Math.abs(b.ny)>.6&&(x*=.84),b.nx>.65&&(k-=.05);k=F(k,.055,.965),x=F(x,-1.02,1.02);const z=zt(e,k,x);g.homeX=z.x,g.homeY=z.y}}function xa(e){const t=[];for(const s of e.players)s.sentOff||t.push(-s.x*e.side);return t.sort((s,n)=>n-s),-(t.length>1?t[1]:t[0])*e.side}function es(e,t,a,s){let n=null,i=1/0;for(const o of e){if(o.sentOff||s&&!s(o))continue;const r=(o.x-t)**2+(o.y-a)**2;r<i&&(i=r,n=o)}return n?{p:n,d:Math.sqrt(i)}:{p:null,d:1/0}}function Lt(e){return e.players.find(t=>t.isGK&&!t.sentOff)||e.players[0]}const mt=(e,t)=>({x:We(e.teams[t]),y:0});function ba(e,t){let a=0;const s=e.teams[1-t.team].players;for(const n of s){if(n.sentOff)continue;const i=E(t.x,t.y,n.x,n.y);if(i<6.5){const o=(t.x-n.x)*Math.cos(n.facing)+(t.y-n.y)*Math.sin(n.facing);a+=(1-i/6.5)*(o>0?1:.65)*(n.isGK?.4:1)}}return I(a*.78)}function ts(e,t,a,s,n,i,o=1.05){const r=e.teams[1-t].players;let l=1;const c=Math.hypot(n-a,i-s);for(const u of r){if(u.sentOff)continue;const h=Bs(u.x,u.y,a,s,n,i);if(h.t<=.02||h.t>=.995)continue;const d=o+.8+Math.min(1.4,u.speed*.18)+(u.isGK?.5:0);if(h.d<d){const v=Math.pow(I(h.d/d),1.5);l=Math.min(l,v)}}return c<1.5?1:l}function fo(e,t){let a=e/Math.max(t,.1);for(let s=0;s<3;s++){const n=H.rollDrag+.055*a;a=(e+.5*n*t*t)/Math.max(t,.1)}return a}function ho(e,t){const a=H.rollDrag+.055*e,s=e*e-2*a*t;return s<=0?1/0:(e-Math.sqrt(s))/Math.max(a,.001)}function Ua(e,t,a,s,n,i,o){const r=n-a,l=i-s,c=Math.hypot(r,l);if(c<2)return 1;const u=e.teams[1-t].players,h=F(Math.ceil(c/4),3,9);let d=1;for(let v=1;v<=h;v++){const f=v/h,m=a+r*f,p=s+l*f,y=ho(o,c*f);if(!isFinite(y))return .05;for(let g=0;g<u.length;g++){const b=u[g];if(b.sentOff||b.isGK&&(v<h||c<18))continue;const k=Math.hypot(b.x-m,b.y-p)-(b.isGK?1.6:1);if(k>26)continue;const x=O.baseSpeed+(b.k.pace-.5)*2*O.paceSpan,S=.19*(1.35-b.k.vision*.5),w=(Math.max(0,k)/(x*O.sprintMul)+S-y)/.42;if(w<1&&(d=Math.min(d,I(w))),d<=.02)return 0}}return d}function ka(e,t,a,s,n=7){const i=e.teams[1-t].players;let o=0;for(const r of i){if(r.sentOff||r.isGK)continue;const l=E(a,s,r.x,r.y);l<n&&(o+=1-l/n)}return I(1-o*.6)}function mo(e,t,a){const s=xa(e.teams[1-t.idx]),n=e.ball.x,i=(a-s)*t.side>.35,o=(a-n)*t.side>.35,r=a*t.side>.2;return i&&o&&r}function va(e,t,a,s,n="ground",i=70,o=.9){const r=e.teams[t.team],l=r.players,c=Math.hypot(a,s)>.2,u=oe(a,s),h=mt(e,t.team),d=[],v=Math.cos(nt(i));for(const f of l){if(f===t||f.sentOff||f.isGK&&n!=="ground")continue;const m=n==="through"?1:.34;let p=f.x+f.vx*m,y=f.y+f.vy*m;if(n==="through"){const Z=oe(h.x-f.x,h.y*.4-f.y),Q=F(6+f.k.pace*7.5,5.5,14);p=f.x+(f.speed>1.2?f.vx/Math.max(f.speed,.1):Z.x)*Q,y=f.y+(f.speed>1.2?f.vy/Math.max(f.speed,.1):Z.y)*Q,p=F(p,-M.halfL+1.5,M.halfL-1.5),y=F(y,-M.halfW+1.2,M.halfW-1.2)}const g=E(t.x,t.y,p,y);if(g<2.2||g>56)continue;const b=oe(p-t.x,y-t.y),k=c?b.x*u.x+b.y*u.y:1;if(c&&k<v)continue;const x=ts(e,t.team,t.x,t.y,p,y,1),S=n==="lob"?F(Math.sqrt(g*11.2)*1.14,11,28):n==="through"?F(g*.9+6,10,26):F(g*.9+4.6,O.passMin,O.passMax),z=n==="lob"?q(Ua(e,t.team,t.x,t.y,p,y,S),1,.6):Ua(e,t.team,t.x,t.y,p,y,S),w=Math.min(n==="lob"?q(x,1,.75):x,z*.6+.4)*(.35+z*.65),L=(p-t.x)*r.side/30,T=E(t.x,t.y,h.x,h.y),A=E(p,y,h.x,h.y),D=(T-A)/28,N=ka(e,t.team,p,y,8),J=n==="through"?.62:n==="lob"?.8:1,se=mo(e,r,f.x),K=I(n==="through"?1-Math.abs(g-22)/34:1-Math.abs(g-15)/34);let V=0;if(c&&o>2){const Z=I((k-v)/Math.max(.001,1-v));V+=Math.pow(Z,1.5)*o,V+=I(1-Math.abs(g-14)/26)*2.2,V+=w*2*J,V+=N*.6,V+=(D*2.4+L*1.25)*.22}else V+=w*2.2*J,V+=N*1,V+=D*2.4+L*1.25,L<0&&(V+=L*1.3),V+=K*.65,c&&(V+=k*o),V+=(f.k.dribble+f.k.shoot)*.22;f.isGK&&(V-=2.6),se&&(V-=4.2),n==="through"&&(V+=I(A<30?1:0)*.9),t.x*r.side<-M.halfL+20&&Math.abs(y)<14&&p*r.side<-M.halfL+18&&(V-=1.6),d.push({m:f,tx:p,ty:y,d:g,score:V,clear:w,mode:n,align:k})}return d.sort((f,m)=>m.score-f.score),d}function Vt(e,t,a,s,n="ground",i=70,o=.9){const r=va(e,t,a,s,n,i,o);return r.length?r[0]:null}function Ma(e,t,a){const s=e.ball;return s.x=t.x+Math.cos(t.facing)*.42,s.y=t.y+Math.sin(t.facing)*.42,s.z<H.r&&(s.z=H.r),ta(s,a),s.lastTouch=t,s.prevTouchTeam=s.lastTouchTeam,s.lastTouchTeam=t.team,s.kickT=e.t,t.touchCd=.16,t.hasBall=!1,e.carrier===t&&(e.carrier=null),Is(t),s}function Ce(e,t,{dirX:a,dirY:s,power:n=.6,mode:i="ground",target:o=null,assist:r=1}){const l=e.teams[t.team],c=Math.hypot(a,s)>.2,u=o||Vt(e,t,a,s,i,i==="through"?62:75,c?5:.9),h=ba(e,t),d=t.k.pass*.7+t.k.vision*.3;let v,f,m;if(u&&r>.25){const T=oe(u.tx-t.x,u.ty-t.y),A=oe(a,s),D=I(r*(.55+.45*u.align));v=q(A.m>.2?A.x:T.x,T.x,D),f=q(A.m>.2?A.y:T.y,T.y,D),m=u.d}else{const T=oe(a,s);if(T.m<.1)return null;v=T.x,f=T.y,m=q(12,34,n)}const p=e.diff?e.diff.userErr:1,y=O.passErrDeg*(1-d*.78)*(.45+h*.95)*(t.team===e.userTeam?p:e.diff?1/e.diff.aiSkill:1)*(i==="through"?1.25:1),g=nt(e.rng.gauss()*y),b=Math.cos(g),k=Math.sin(g),x=v*b-f*k,S=v*k+f*b;let z;if(i==="lob")z=F(Math.sqrt(m*11.2)*1.14,11,28);else if(i==="through"){const T=u&&u.m,A=T?E(T.x,T.y,u.tx,u.ty)/Math.max(It(T,!0),1)+.3:m/9;z=F(fo(m,F(A,.55,2.8)),9.5,26)}else z=F(m*.9+4.6,O.passMin,O.passMax);z*=q(.88,1.12,n)*q(.94,1.06,d);const w=i==="lob"?O.longPassLoft+n*.1:i==="through"?O.throughLoft*(m>26?1.8:1):O.passLoftMin,L=(t.info.foot==="L"?1:-1)*.1*e.rng.range(.2,1);return Ma(e,t,{dirX:x,dirY:S,speed:z,loft:w,curl:L,dip:i==="lob"?.2:.05,kind:i==="through"?"through":"pass",by:t,target:u?{m:u.m,x:u.tx,y:u.ty}:null}),e.ball.offsideArmed=!0,l.stats.passes++,t.stats.passes++,e.lastPass={by:t,to:u?u.m:null,t:e.t,mode:i},e.emit("pass",{p:t,mode:i,power:n,opt:u}),u}function na(e,t,{power:a=1,aim:s=null,dirX:n=0,dirY:i=0,finesse:o=!1,assist:r=1,chip:l=!1}){const c=e.teams[t.team],u=mt(e,t.team),h=E(t.x,t.y,u.x,u.y),d=e.teams[1-t.team].players.find(ge=>ge.isGK&&!ge.sentOff),v=ba(e,t),f=t.k.shoot*.76+t.k.strength*.1+t.k.dribble*.14,m=oe(n,i);let p,y,g=!1;if(s!==null)p=s*(M.goalHalf-.42),y=q(.35,1.9,I(a))*(l?1.25:1);else{g=!0;const ge=m.m>.25?m.y:0,Le=Math.abs(ge)>.3?Math.sign(ge):d?d.y>0?-1:1:e.rng.chance(.5)?1:-1,Me=I(1-(h-14)/46);p=(M.goalHalf-.45)*Le*q(.45,1,f)*q(.62,1,Me);const ue=e.rng.chance(.22+f*.3);y=o?1.65:ue?q(1.3,2.05,f*.7+e.rng.range(0,.3)):q(.3,1.1,e.rng.range(0,1))}const b=oe(u.x-t.x,p-t.y),k=I(r*.9);let x=m.m>.25&&!g?q(m.x,b.x,k):b.x,S=m.m>.25&&!g?q(m.y,b.y,k):b.y;const z=t.team===e.userTeam?e.diff?e.diff.userErr:1:e.diff?e.diff.aiShotErr:1,w=I((h-17)/26),L=O.shotErrDeg*(1-f*.72)*(.52+v*1.05)*(1+w*2.4)*z*(t.state==="slide"?2:1),T=nt(e.rng.gauss()*L),A=Math.cos(T),D=Math.sin(T),N=x*A-S*D,J=x*D+S*A,K=q(O.shotMin,O.shotMax,I(a))*q(.86,1.1,f)*(o?.84:1)*(v>.6?.93:1),V=Math.max(.25,h/Math.max(K,6));let $=F((y-.18)/Math.max(h,4)+4.905*V/Math.max(K,6),.015,.42);l&&($=F($*2.4+.16,.2,.62));const Z=t.info.foot==="L"?1:-1,Q=o?Z*O.finesseCurl*q(.6,1,f):Z*e.rng.range(0,.35),le=o?.55:q(.15,.6,I(a))*(l?.2:1);return Ma(e,t,{dirX:N,dirY:J,speed:K,loft:$,curl:Q,dip:le,kind:"shot",by:t,target:{x:u.x,y:p,z:y}}),e.ball.offsideArmed=!0,c.stats.shots++,t.stats.shots++,e.lastShot={by:t,t:e.t,d:h},e.emit("shot",{p:t,power:a,d:h,finesse:o}),!0}function Zt(e,t,a=!0){const s=e.teams[t.team],n=t.y>=0?1:-1,i=We(s)*.35,o=n*(M.halfW-6),r=oe(i-t.x,o-t.y),l=nt(e.rng.gauss()*9),c=Math.cos(l),u=Math.sin(l);return Ma(e,t,{dirX:r.x*c-r.y*u,dirY:r.x*u+r.y*c,speed:q(19,27,t.k.strength),loft:.42,dip:.3,kind:"clear",by:t}),e.ball.offsideArmed=!0,e.emit("clear",{p:t}),!0}function Et(e,t,a=.8){const s=e.teams[t.team],n=mt(e,t.team);let i=null,o=-1e9;for(const f of s.players){if(f===t||f.sentOff||f.isGK||!((n.x-f.x)*s.side<M.boxDepth+6&&(n.x-f.x)*s.side>-1&&Math.abs(f.y)<M.boxHalfW))continue;const p=f.k.head*2+ka(e,t.team,f.x,f.y,7)*1.5-Math.abs(f.y)/20;p>o&&(o=p,i=f)}const r=i?i.x+i.vx*.5:n.x-s.side*9,l=i?i.y+i.vy*.5:-Math.sign(t.y)*4,c=E(t.x,t.y,r,l),u=oe(r-t.x,l-t.y),h=nt(e.rng.gauss()*7*(1-t.k.pass*.6)),d=Math.cos(h),v=Math.sin(h);return Ma(e,t,{dirX:u.x*d-u.y*v,dirY:u.x*v+u.y*d,speed:F(Math.sqrt(c*12),13,26)*q(.9,1.08,a),loft:.36,curl:(t.y>0?-1:1)*.5,dip:.35,kind:"cross",by:t,target:i?{m:i,x:r,y:l}:null}),e.ball.offsideArmed=!0,e.emit("cross",{p:t,to:i}),!0}function vo(e,t,a){const s=e.teams[t.team],n=e.ball,i=mt(e,t.team),o=E(t.x,t.y,i.x,i.y),r=a&&o<20;let l,c,u;if(r){const f=e.rng.range(-1,1)*(M.goalHalf-.8);l=oe(i.x-t.x,f-t.y),c=q(12,20,t.k.head),u=F(.5/Math.max(2,o)+.03,.02,.2),s.stats.shots++,t.stats.shots++,e.lastShot={by:t,t:e.t,d:o},e.emit("shot",{p:t,power:.7,d:o,header:!0})}else l=oe(We(s)-t.x,(t.y>=0?1:-1)*20),c=q(11,19,t.k.head),u=.5,e.emit("header",{p:t});const h=nt(e.rng.gauss()*11*(1-t.k.head*.6)),d=Math.cos(h),v=Math.sin(h);return n.x=t.x+l.x*.3,n.y=t.y+l.y*.3,ta(n,{dirX:l.x*d-l.y*v,dirY:l.x*v+l.y*d,speed:c,loft:u,kind:r?"shot":"clear",by:t}),n.lastTouch=t,n.prevTouchTeam=n.lastTouchTeam,n.lastTouchTeam=t.team,n.kickT=e.t,n.offsideArmed=!0,t.touchCd=.3,t.armAnim=.3,!0}function pa(e,t){const a=e.ball,s=e.carrier;if(s&&s!==t&&s.team===t.team)return!1;const n=t.k.dribble*.6+t.k.pass*.25+t.k.vision*.15,i=Math.hypot(a.vx,a.vy)+Math.abs(a.vz)*.5,o=O.firstTouchErr*(1-n*.8)*I(i/18)*(t.state==="slide"?2.5:1),r=e.rng.range(0,Math.PI*2),l=o*e.rng.range(.25,1);a.x=t.x+Math.cos(t.facing)*.45+Math.cos(r)*l,a.y=t.y+Math.sin(t.facing)*.45+Math.sin(r)*l,a.z=H.r,a.vz=0;const c=I(.06+o*.4);return a.vx=t.vx*.8+a.vx*c,a.vy=t.vy*.8+a.vy*c,a.wx=a.wy=a.wz=0,a.lastTouch=t,a.prevTouchTeam=a.lastTouchTeam,a.lastTouchTeam=t.team,s&&s!==t&&(s.hasBall=!1),e.carrier=t,t.hasBall=!0,t.touchCd=O.touchCooldown,t.protect=e.t+.16,e.emit("touch",{p:t,err:o}),!0}function po(e,t,a){const s=e.ball,n=Math.max(t.speed,.4),i=O.dribbleAhead*(.55+Math.min(1.2,n/7))*(t.shielding?.35:1),o=t.x+Math.cos(t.facing)*i,r=t.y+Math.sin(t.facing)*i,l=Math.hypot(o-s.x,r-s.y),c=I(a*14);s.z<.4&&(s.vx=q(s.vx,(o-s.x)*9+t.vx*.55,c),s.vy=q(s.vy,(r-s.y)*9+t.vy*.55,c),l>.35&&(s.wz*=.9)),t.touchCd<=0&&l>.55&&(t.touchCd=O.dribbleTouchEvery*(1.3-t.k.dribble*.5),Is(t,t.kickFoot*-1),s.lastTouch=t,s.lastTouchTeam=t.team)}function wa(e,t){const a=e.ball,s=e.carrier;t.armAnim=.25;const n=Math.hypot(a.x-t.x,a.y-t.y);if(n>O.tackleR)return"miss";if(!s||s.team===t.team)return n<O.tackleR*.9&&a.z<1?(pa(e,t),"win"):"miss";const i=s.k.dribble*.62+s.k.strength*.23+s.k.pace*.15,o=t.k.tackle*.68+t.k.strength*.2+t.k.pace*.12,r=(s.x-t.x)*Math.cos(s.facing)+(s.y-t.y)*Math.sin(s.facing)>.1,l=o-i+(r?-.12:.08)+e.rng.gauss()*.13,c=t.team===e.userTeam?1:e.diff?e.diff.aiSkill:1;if(l*c>.02)return t.stats.tackles++,e.teams[t.team].stats.tackles++,s.hasBall=!1,e.emit("tackle",{p:t,victim:s,clean:!0}),pa(e,t),"win";const u=O.foulBase+I(-l)*.34+(r?.14:0);return e.rng.chance(u)?(e.emit("foul",{by:t,on:s,slide:!1}),"foul"):(e.emit("tackle",{p:t,victim:s,clean:!1}),"miss")}function yo(e,t){const a=e.ball,s=e.carrier;if(Math.hypot(a.x-t.x,a.y-t.y)<O.slideR&&a.z<.9){const i=oe(a.x-t.x+t.vx*.1,a.y-t.y+t.vy*.1);return ta(a,{dirX:i.x||Math.cos(t.facing),dirY:i.y||Math.sin(t.facing),speed:q(6,13,t.k.strength),loft:.18,kind:"block",by:t}),a.lastTouch=t,a.prevTouchTeam=a.lastTouchTeam,a.lastTouchTeam=t.team,s&&(s.hasBall=!1),e.carrier&&(e.carrier=null),t.stats.tackles++,e.teams[t.team].stats.tackles++,e.emit("slideWin",{p:t}),"win"}if(s&&s.team!==t.team&&E(t.x,t.y,s.x,s.y)<1.35){const o=t.k.tackle*.7+t.k.pace*.3,r=I(.68-o*.45);if(e.rng.chance(r+.22))return e.emit("foul",{by:t,on:s,slide:!0}),"foul"}return"none"}function go(e,t){const a=e.players;for(let s=0;s<a.length;s++){const n=a[s];if(!n.sentOff)for(let i=s+1;i<a.length;i++){const o=a[i];if(o.sentOff)continue;let r=o.x-n.x,l=o.y-n.y;const c=r*r+l*l,u=O.jostleR*(n.state==="slide"||o.state==="slide"?1.25:1);if(c>u*u||c<1e-6)continue;const h=Math.sqrt(c),d=(u-h)*.5;r/=h,l/=h;const v=n.k.strength+(n.hasBall?.25:0),f=o.k.strength+(o.hasBall?.25:0),m=f/(v+f+1e-5),p=1-m;n.x-=r*d*2*m,n.y-=l*d*2*m,o.x+=r*d*2*p,o.y+=l*d*2*p;const y=(o.vx-n.vx)*r+(o.vy-n.vy)*l;if(y<0){const g=y*.5;n.vx+=r*g*m*2,n.vy+=l*g*m*2,o.vx-=r*g*p*2,o.vy-=l*g*p*2}}}}const ca={t:-1,pts:[]};function Ys(e){if(ca.t===e.t)return ca.pts;const t=[],a=e.ball;let s=a.x,n=a.y,i=a.z,o=a.vx,r=a.vy,l=a.vz;const c=1/20;for(let u=0;u<=50;u++){t.push(s,n,i);const h=Math.hypot(o,r,l);if(i>H.r+.02){const d=H.airDrag*h;o-=o*d*c,r-=r*d*c,l-=(9.81+l*d)*c}else{const d=Math.hypot(o,r),v=d>.001?Math.min(1,(H.rollDrag+.055*d)*c/d):0;o-=o*v,r-=r*v,l=0}s+=o*c,n+=r*c,i+=l*c,i<H.r&&(i=H.r,l=-l*H.restitution,o*=H.friction,r*=H.friction)}return ca.t=e.t,ca.pts=t,t}function Sa(e,t,a=0){const s=Ys(e),n=It(t,!0)*(t.isGK?.9:1),i=sa.reactionBase*(e.diff?e.diff.aiReact:1)*(t.user?0:1)+a;for(let r=0;r<51;r++){const l=r/20,c=s[r*3],u=s[r*3+1],h=s[r*3+2];if(h>2.6&&r<50)continue;if(E(t.x,t.y,c,u)/Math.max(n,1)+i<=l)return{x:c,y:u,z:h,t:l,reachable:!0}}const o=150;return{x:s[o],y:s[o+1],z:s[o+2],t:2.5,reachable:!1}}function xo(e,t){const a=Sa(e,t);return E(t.x,t.y,a.x,a.y)/Math.max(It(t,!0),1)+(a.reachable?0:1.5)}function bo(e){const t=e.ball;for(const a of e.teams){const s=e.possTeam===a.idx,i=a.players.filter(v=>!v.sentOff).filter(v=>!v.isGK),o=!e.carrier&&e.ball.intendedTarget&&e.ball.intendedTarget.m;let r=null,l=1/0,c=null,u=1/0;for(const v of i){if(v.state!=="run")continue;let f=xo(e,v);const m=(v.x-Ne(a))*a.side;v.role==="CB"&&m>42&&(f+=1.2),v===e.carrier&&(f=-1),f<l?(u=l,c=r,l=f,r=v):f<u&&(u=f,c=v)}o&&o.team===a.idx&&!o.sentOff&&o.state==="run"&&o!==e.ball.lastTouch&&(r!==o&&(c=r),r=o),a.chaser=r,a.second=c;const h=e.teams[1-a.idx].players,d=e.carrier;for(const v of i)v.ai.pressing=!1,v.ai.markTarget=null;if(s){let v=null,f=-1e9;for(const m of i){if(m===e.carrier)continue;const p=Mo(e,a,m);p>f&&(f=p,v=m)}a.runner=f>.25?v:null}else{const v=a.tactics.press*(e.diff?e.diff.aiPress:1)*(1+a.mentality*.2);r&&(r.ai.pressing=!0),c&&v>.95&&d&&E(c.x,c.y,t.x,t.y)<sa.pressRadius&&(c.ai.pressing=!0);const f=h.filter(y=>!y.sentOff&&!y.isGK&&y!==d).map(y=>({o:y,danger:ko(e,a,y)})).sort((y,g)=>g.danger-y.danger),m=i.filter(y=>!y.ai.pressing),p=new Set;for(const y of f){let g=null,b=1/0;for(const k of m){if(p.has(k))continue;const x=E(k.homeX,k.homeY,y.o.x,y.o.y)+(k.role==="ST"||k.role==="LW"||k.role==="RW"?26:0);x<b&&(b=x,g=k)}g&&b<34&&(g.ai.markTarget=y.o,p.add(g))}}}}function ko(e,t,a){const s=Ne(t),n=E(a.x,a.y,s,0);let i=1-I(n/70);return i+=I(1-E(a.x,a.y,e.ball.x,e.ball.y)/28)*.55,i+=(a.k.shoot+a.k.dribble)*.18,(a.x-e.ball.x)*t.side<0&&(i+=.25),i}function Mo(e,t,a){const s=e.carrier;if(!s)return-1;const n=mt(e,t.idx),i=xa(e.teams[1-t.idx]),o=(a.x-s.x)*t.side,r=E(a.x,a.y,n.x,n.y);if(r>52)return-1;let l=0;l+=I(1-r/50)*1,l+=I(o/14)*.9,l+=a.k.pace*.7,l+=ts(e,t.idx,s.x,s.y,a.x+t.side*10,a.y,1.1)*.8;const c=(a.x-i)*t.side;return c>0?l-=1.3:l+=I(1+c/9)*.5,(a.role==="CB"||a.role==="DM")&&(l-=1.4),l}function wo(e,t){bo(e);for(const a of e.players)a.sentOff||(a.ai.tDecide-=t,!(a.user&&e.phase==="play"&&!e.noUser)&&(a.state==="slide"||a.state==="dive"||a.state==="getup"||a.state==="stunned"||a.state==="celebrate"||(a.isGK?Fo(e,a):e.carrier===a?So(e,a):zo(e,a,t))))}function qe(e,t,a,s=!1,n=1.2){const i=t-e.x,o=a-e.y,r=Math.hypot(i,o);if(r<.05)return e.inX=0,e.inY=0,e.sprint=!1,r;const l=r<n?r/n:1;return e.inX=i/r*l,e.inY=o/r*l,e.sprint=s&&r>1.4&&e.stamina>.12,r}function So(e,t,a){e.teams[t.team];const s=mt(e,t.team),n=ba(e,t),i=E(t.x,t.y,s.x,s.y),o=e.diff?e.diff.aiSkill:1;t.ai.tDecide<=0&&(t.ai.tDecide=sa.decisionEvery*(1.4-o*.5)*e.rng.range(.8,1.25),To(e,t,n,i,o));const r=t.ai.intent;if(r==="dribble"||r==="hold"||r==="carry"){const l=r==="carry"&&n<.55;t.shielding=r==="hold"&&n>.45,qe(t,t.ai.runX,t.ai.runY,l,2)}else t.shielding=!1,qe(t,t.ai.runX,t.ai.runY,!1,2)}function To(e,t,a,s,n){const i=e.teams[t.team],o=mt(e,t.team),r=(t.x-Ne(i))*i.side<M.boxDepth+4,l=i.tactics.risk*(1+i.mentality*.25);if(r&&a>.62&&e.rng.chance(.5)){Zt(e,t),t.ai.intent="hold";return}const c=Lt(e.teams[1-t.team]),u=ts(e,t.team,t.x,t.y,o.x,0,.95),h=I(1-Math.abs(t.y)/30);let v=I(1-(s-7)/26)*1.6*h+u*.95+t.k.shoot*.85-a*.45-I((s-25)/15)*1.05+.3;if(c&&E(c.x,c.y,o.x,0)>6&&s<34&&(v+=.8),s<13&&(v+=.5),v*=n*.85+.3,s<34&&v>1.5&&e.rng.chance(.6+n*.4)){const L=s>15&&s<26&&e.rng.chance(.45);na(e,t,{power:F(.5+s/36,.45,1),assist:1,finesse:L,aim:null}),t.ai.intent="hold";return}const f=Math.abs(t.y)>17,m=(o.x-t.x)*i.side<30;if(f&&m&&a>.2&&e.rng.chance(.5*l)&&e.teams[t.team].players.some(T=>T!==t&&!T.isGK&&(o.x-T.x)*i.side<M.boxDepth+6&&Math.abs(T.y)<M.boxHalfW)){Et(e,t,e.rng.range(.7,1)),t.ai.intent="hold";return}const p=i.runner;if(p&&a<.8&&e.t-(i.lastThroughT||-9)>2.5&&e.rng.chance(.5)){const T=va(e,t,0,0,"through",80).find(N=>N.m===p),A=T&&(T.m.speed>3.2||T.m.sprint),D=T&&E(T.tx,T.ty,o.x,o.y)<40;if(T&&A&&D&&T.score>3.3*(1.12-n*.14)&&T.clear>.5){i.lastThroughT=e.t,Ce(e,t,{dirX:T.tx-t.x,dirY:T.ty-t.y,power:.8,mode:"through",target:T,assist:1}),t.ai.intent="hold";return}}const y=va(e,t,0,0,"ground",180),g=i.side,b=y.filter(L=>(L.tx-t.x)*g>2.5&&L.clear>.35),k=y.find(L=>L.clear>.55)||y[0],x=Co(e,t),S=x.quality*2.3+t.k.dribble*1.1-a*1.9+(i.club.style==="counter"?.3:0),z=()=>{t.ai.runX=t.x+x.x*7,t.ai.runY=t.y+x.y*7,t.ai.intent=x.quality>.5?"carry":"dribble"};if(a>.5&&i.club.style==="direct"&&e.rng.chance(.3)&&e.t-(t.ai.lastLobT||-9)>5&&(!b.length||b[0].score<2.6)){const L=y.find(T=>T.d>24&&T.score>2.4);if(L){t.ai.lastLobT=e.t,Ce(e,t,{dirX:L.tx-t.x,dirY:L.ty-t.y,power:.9,mode:"lob",target:L,assist:1}),t.ai.intent="hold";return}}const w=b[0];if(w&&w.score>2.5+Math.max(0,S)*.55){Ce(e,t,{dirX:w.tx-t.x,dirY:w.ty-t.y,power:F(w.d/30,.35,1),mode:"ground",target:w,assist:1}),t.ai.intent="hold";return}if(S>.85&&a<.72){z();return}if(k&&(a>.42||k.score>3.4)){Ce(e,t,{dirX:k.tx-t.x,dirY:k.ty-t.y,power:F(k.d/30,.32,1),mode:"ground",target:k,assist:1}),t.ai.intent="hold";return}if(w){Ce(e,t,{dirX:w.tx-t.x,dirY:w.ty-t.y,power:F(w.d/30,.35,1),mode:"ground",target:w,assist:1}),t.ai.intent="hold";return}if(z(),a>.62){t.ai.intent="hold";const L=oe(Ne(i)-t.x,t.y*.2);t.ai.runX=t.x+L.x*2.5,t.ai.runY=t.y+L.y*2.5}}const Po=(()=>{const e=[];for(let t=0;t<16;t++)e.push({x:Math.cos(t*Math.PI/8),y:Math.sin(t*Math.PI/8)});return e})();function Co(e,t){e.teams[t.team];const a=mt(e,t.team),s=oe(a.x-t.x,a.y-t.y);let n={x:s.x,y:s.y,quality:0},i=-1e9;for(const o of Po){const r=t.x+o.x*6.5,l=t.y+o.y*6.5;if(Math.abs(r)>M.halfL-1.2||Math.abs(l)>M.halfW-1)continue;const c=ka(e,t.team,r,l,7.5),u=o.x*s.x+o.y*s.y,h=o.x*Math.cos(t.facing)+o.y*Math.sin(t.facing);let d=0;for(const f of e.teams[1-t.team].players){if(f.sentOff)continue;const m=Bs(f.x,f.y,t.x,t.y,r,l);m.d<1.5&&(d+=1-m.d/1.5)}const v=c*1.5+u*1.35+h*.45-d*1.6+t.k.dribble*.3;v>i&&(i=v,n={x:o.x,y:o.y,quality:I(c*.8+u*.4)})}return n}function zo(e,t,a){const s=e.teams[t.team];e.ball;const n=e.possTeam===s.idx;return(!e.carrier||e.possTeam!==s.idx)&&s.chaser===t?Lo(e,t):n?Ro(e,t,a):Ao(e,t)}function Lo(e,t,a){const s=Sa(e,t),n=e.ball,i=E(t.x,t.y,s.x,s.y),o=e.carrier;if(o&&o.team!==t.team){const r=Ne(e.teams[t.team]),l=oe(r-o.x,-o.y*.25),c=F(.9+E(t.x,t.y,o.x,o.y)*.08,.9,1.9),u=o.x+o.vx*.22+l.x*c,h=o.y+o.vy*.22+l.y*c;qe(t,u,h,!0,1);const d=E(t.x,t.y,n.x,n.y);if(d<O.tackleR&&t.touchCd<=0&&n.z<1.1&&(t.ai.nextTackle||0)<e.t){const v=(e.diff?e.diff.aiPress:1)*(.5+t.k.tackle*.6);t.ai.nextTackle=e.t+.5,(n.x-t.x)*Math.cos(t.facing)+(n.y-t.y)*Math.sin(t.facing)>-.2&&e.rng.chance(.5*v)&&(wa(e,t),t.touchCd=.3)}else d<3.4&&d>1.6&&t.speed>5.4&&(o.x-r)*e.teams[t.team].side>22&&e.rng.chance(.004*(e.diff?e.diff.aiPress:1))&&Us(t,n.x-t.x,n.y-t.y);return}qe(t,s.x,s.y,i>1.8||s.t<1.2,.8)}function Ro(e,t,a){const s=e.teams[t.team],n=e.carrier,i=mt(e,t.team),o=xa(e.teams[1-s.idx]);let r=t.homeX,l=t.homeY,c=!1;if(n){const h=E(t.x,t.y,n.x,n.y);if(s.runner===t){const d=F(o+s.side*1,-M.halfL+3,M.halfL-3),v=Math.sign(t.homeY||t.y||1);r=q(t.x,d+s.side*9,.7),l=F(t.homeY*.55+i.y*.4+v*3,-M.halfW+3,M.halfW-3),c=!0,(t.x-o)*s.side>-.6&&(r=o-s.side*1.6,c=!1)}else{const d=oe(t.x-n.x,t.y-n.y),v=F(sa.supportSpread+(t.role==="ST"?4:0),7,16);let f=n.x+d.x*v,m=n.y+d.y*v;f=q(t.homeX,f,.45),m=q(t.homeY,m,.45);let p=-1,y=f,g=m;for(let b=0;b<5;b++){const k=(b-2)*3.6,x=f-d.y*k,S=m+d.x*k;if(Math.abs(x)>M.halfL-2||Math.abs(S)>M.halfW-1.5)continue;const z=E(n.x,n.y,x,S),w=Ua(e,s.idx,n.x,n.y,x,S,F(z*.9+4.6,9.5,24.5))*1.9+ka(e,s.idx,x,S,7)-Math.abs(k)*.03;w>p&&(p=w,y=x,g=S)}r=y,l=g,c=h>22&&(t.x-n.x)*s.side>-2}if(!t.isGK){const d=(r-o)*s.side,v=(r-e.ball.x)*s.side;d>0&&v>0&&r*s.side>0&&(r=o-s.side*.8)}}t.ai.jog+=a*.7,r+=Math.sin(t.ai.jog*1.1+t.uid)*.5,l+=Math.cos(t.ai.jog*.9+t.uid*1.7)*.6,qe(t,r,l,c,2.4)<1.2&&(t.inX*=.4,t.inY*=.4)}function Ao(e,t,a){const s=e.teams[t.team],n=e.ball,i=e.carrier,o=Ne(s);let r=t.homeX,l=t.homeY,c=!1;if(t.ai.pressing&&i){const h=oe(o-i.x,-i.y*.2);r=i.x+i.vx*.25+h.x*1.5,l=i.y+i.vy*.25+h.y*1.5,c=E(t.x,t.y,i.x,i.y)>3,E(t.x,t.y,n.x,n.y)<O.tackleR&&t.touchCd<=0&&n.z<1.1&&(t.ai.nextTackle||0)<e.t&&(t.ai.nextTackle=e.t+.55,e.rng.chance(.45*(.5+t.k.tackle))&&(wa(e,t),t.touchCd=.35))}else if(t.ai.markTarget){const h=t.ai.markTarget,d=oe(o-h.x,-h.y*.15),v=sa.markTight*(1.4-t.k.tackle*.4)*(E(h.x,h.y,n.x,n.y)<18?.8:1.3),f=h.x+h.vx*.3+d.x*v,m=h.y+h.vy*.3+d.y*v,p=I(1-E(h.x,h.y,t.homeX,t.homeY)/26);r=q(t.homeX,f,.45+p*.45),l=q(t.homeY,m,.45+p*.45),c=E(t.x,t.y,r,l)>6}else{const h=oe(n.x-t.homeX,n.y-t.homeY);r=t.homeX+h.x*1.6,l=t.homeY+h.y*1.6}if(t.role==="CB"||t.role==="LB"||t.role==="RB"){const h=Do(e,s),d=(r-o)*s.side,v=(h-o)*s.side;(d<v-1||d>v+6)&&(r=o+s.side*F(v,2.5,M.length-12))}qe(t,r,l,c,2.2)<1&&(t.inX*=.35,t.inY*=.35)}function Do(e,t){const a=e.ball,s=Ne(t),n=e.teams[1-t.idx].players;let i=s+t.side*60;for(const u of n){if(u.sentOff||u.isGK)continue;(u.x-s)*t.side<(i-s)*t.side&&(i=u.x)}const o=(a.x-s)*t.side,r=F(o-18,9,M.length-26)*t.tactics.press,l=(i-s)*t.side,c=Math.min(Math.max(r,8.5),Math.max(l-.6,8.5));return s+t.side*F(c,7,M.length-24)}function Fo(e,t,a){const s=e.teams[t.team],n=e.ball,i=Ne(s),o=e.diff?t.team===e.userTeam?e.diff.userGk:e.diff.gk:1;if(e.carrier===t){if(t.ai.tDecide-=0,t.ai.tDecide<=0){t.ai.tDecide=.5;const g=va(e,t,0,0,"ground",180).filter(b=>b.d<32&&b.clear>.55);g.length&&e.rng.chance(.7)?Ce(e,t,{dirX:g[0].tx-t.x,dirY:g[0].ty-t.y,power:.55,mode:"ground",target:g[0],assist:1}):Zt(e,t)}qe(t,i+s.side*5,F(t.y,-6,6),!1);return}const r=E(t.x,t.y,n.x,n.y),l=(n.x-i)*s.side,c=No(e,i,s.side);if(c&&c.t<1.3&&Math.abs(c.y)<M.goalHalf+2.6&&c.z<M.goalHeight+.8){const g=e.ball,b=Math.hypot(g.vx,g.vy,g.vz),k=I(t.k.gkReflex*o);if(t.ai.readKick!==g.kickT){t.ai.readKick=g.kickT,t.ai.readAt=e.t+q(.3,.11,k);const A=(.45+(1-k)*1.6+b*.032)*(g.kickKind==="shot"?1:.5);t.ai.readY=c.y+e.rng.gauss()*A,t.ai.readZ=c.z}const x=e.t>=t.ai.readAt,S=F(x?q(t.ai.readY,c.y,Math.min(.45,(e.t-t.ai.readAt)*.45))*(.9+t.k.gkPos*.1):t.y,-M.goalHalf-1.4,M.goalHalf+1.4),z=i+s.side*F(.4+c.t*1.1,.4,2.2),w=S-t.y,L=It(t,!1)*.74,T=Math.abs(w)/Math.max(c.t,.08);if(x&&T>L*.85&&Math.abs(w)>.75&&c.t<.9){co(t,w,z),e.emit("gkDive",{p:t});return}if(!x){t.inX*=.25,t.inY*=.25,t.sprint=!1;return}qe(t,z,S,!1,.5),t.inX*=.78,t.inY*=.78;return}const u=Sa(e,t,.05),h=es(e.teams[1-s.idx].players,u.x,u.y,g=>!g.isGK).d,d=(u.x-i)*s.side,v=d>M.boxDepth-.5;if(!e.carrier&&u.reachable&&d<O.gkRushTrigger&&u.t<1.5&&(h>E(t.x,t.y,u.x,u.y)-1.5||d<5.5)){qe(t,u.x,u.y,!0,.6);return}if(e.carrier&&e.carrier.team!==s.idx&&l<9&&r<6.5&&!v){const g=oe(n.x-i,n.y);qe(t,i+g.x*F(r*.45,1,7),g.y*F(r*.3,.5,4.5),!0,.4);return}const f=oe(n.x-i,n.y*.92),m=F(.75+l*.11,.75,13.5)*(.85+t.k.gkPos*.3),p=i+f.x*m,y=F(f.y*m*1.5,-M.goalHalf-2.2,M.goalHalf+2.2);qe(t,p,y,l<24,.7),t.sprint||(t.inX*=.8,t.inY*=.8)}function No(e,t,a){if(e.ball.vx*a>-1.5)return null;const n=Ys(e);let i=n[0],o=n[1],r=n[2];for(let l=1;l<=50;l++){const c=n[l*3],u=n[l*3+1],h=n[l*3+2],d=(i-t)*a,v=(c-t)*a;if(d>0&&v<=0){const f=d/Math.max(d-v,1e-5);return{y:o+(u-o)*f,z:r+(h-r)*f,t:(l-1+f)/20}}i=c,o=u,r=h}return null}function as(e,t){const a=e.teams[t.team],s=xa(e.teams[1-a.idx]),n=e.ball.x,i=new Set;for(const o of a.players){if(o===t||o.sentOff||o.isGK)continue;const r=(o.x-s)*a.side>.25,l=(o.x-n)*a.side>.25,c=o.x*a.side>.1;r&&l&&c&&i.add(o)}e.offside=i.size?{team:a.idx,set:i,t:e.t,line:s}:null}function Wo(e,t){const a=e.offside;return a?t.team!==a.team?(e.offside=null,!1):a.set.has(t)?(e.offside=null,!0):!1:!1}function Vo(e,t,a){const s=e.ball,n=_n(s,t);if(n!==0){const r=e.teams.find(c=>c.side===n),l=e.teams.find(c=>c.side!==n);return{kind:"goal",scorerTeam:r.idx,concedeTeam:l.idx}}if(Math.abs(s.y)>M.halfW+H.r)return{kind:"throwin",team:1-(s.lastTouchTeam>=0?s.lastTouchTeam:e.possTeam>=0?e.possTeam:0),x:F(s.x,-M.halfL+.4,M.halfL-.4),y:Ie(s.y)*(M.halfW+.25)};if(Math.abs(s.x)>M.halfL+H.r){const r=Ie(s.x),l=e.teams.find(u=>u.side===-r);return(s.lastTouchTeam>=0?s.lastTouchTeam:l.idx)===l.idx?{kind:"corner",team:1-l.idx,x:r*(M.halfL-.2),y:Ie(s.y||1)*(M.halfW-.2)}:{kind:"goalkick",team:l.idx,x:r*(M.halfL-M.sixDepth),y:Ie(s.y||1)*M.sixHalfW*.6}}return null}function Go(e,t,a,s){const n=e.teams[a.team],i=e.teams[t.team],o=Ne(i),r=(a.x-o)*i.side,l=r<M.boxDepth&&Math.abs(a.y)<M.boxHalfW,c=F(a.x,-M.halfL+1.2,M.halfL-1.2),u=F(a.y,-M.halfW+1,M.halfW-1);let h=0;{const d=t.speed;let v=(s?.2:.07)+I((d-5)/10)*.22;l&&a.hasBall&&r<M.boxDepth&&s&&(v+=.2),e.rng.chance(v)&&(h=1),h&&e.rng.chance(s?.07:.02)&&(h=2),t.cards>=1&&h===1&&(h=3)}return l?{kind:"penalty",team:a.team,x:We(n)-n.side*M.penSpot,y:0,card:h,by:t,on:a}:{kind:"freekick",team:a.team,x:c,y:u,card:h,by:t,on:a}}function Bo(e,t,a){const s=e.teams[t.team];return a===1?(t.cards=1,s.stats.yellow++,"yellow"):a===2||a===3?(t.cards=2,t.sentOff=!0,s.stats.red++,a===3&&s.stats.yellow++,a===3?"second-yellow":"red"):null}function Eo(e,t){const a=e.teams[t.team],s=e.teams[1-t.team],n=t.x,i=t.y;switch(t.kind){case"kickoff":Uo(e,a);break;case"throwin":Oa(e,a,s,n,i);break;case"corner":Oo(e,a,s,n,i);break;case"goalkick":Io(e,a,s,n,i);break;case"freekick":Xo(e,a,s,n,i);break;case"penalty":$o(e,a,s,n);break;default:Oa(e,a,s,n,i);break}return Ho(e,t)}function Ho(e,t){const a=e.teams[t.team],s=a.players.filter(n=>!n.sentOff);if(t.kind==="goalkick")return Lt(a);if(t.kind==="penalty")return s.filter(n=>!n.isGK).sort((n,i)=>i.info.shoot+i.k.strength*10-(n.info.shoot+n.k.strength*10))[0];if(t.kind==="kickoff")return s.filter(i=>!i.isGK).sort((i,o)=>E(i.homeX,i.homeY,0,0)-E(o.homeX,o.homeY,0,0))[0];if(t.kind==="corner"||t.kind==="freekick"){const n=We(a),i=E(t.x,t.y,n,0)>30,o=s.filter(r=>!r.isGK);return o.sort((r,l)=>{const c=r.info.pass+(i?r.info.strength:r.info.shoot)*.8-E(r.x,r.y,t.x,t.y)*1.6;return l.info.pass+(i?l.info.strength:l.info.shoot)*.8-E(l.x,l.y,t.x,t.y)*1.6-c}),o[0]}return es(s,t.x,t.y,n=>!n.isGK).p||s[0]}function Uo(e,t,a){for(const n of e.teams){const i=n===t;for(const o of n.players){if(o.sentOff)continue;const r=n.form.slots[o.slot];let l=F(r.nx*(i?.92:.86),.03,i?.495:.47);const c=zt(n,l,r.ny*.92);if(o.homeX=c.x,o.homeY=c.y,!i&&E(o.homeX,o.homeY,0,0)<M.centreR+.8){const u=oe(o.homeX||-n.side,o.homeY);o.homeX=u.x*(M.centreR+1.2),o.homeY=u.y*(M.centreR+1.2)}i&&o.homeX*n.side>-.5&&!o.isGK&&(o.homeX=-n.side*1)}}const s=t.players.filter(n=>!n.isGK&&!n.sentOff).sort((n,i)=>E(n.homeX,n.homeY,0,0)-E(i.homeX,i.homeY,0,0));s[0]&&(s[0].homeX=-t.side*.6,s[0].homeY=-.6),s[1]&&(s[1].homeX=-t.side*2.4,s[1].homeY=2.2)}function Oa(e,t,a,s,n,i){for(const r of e.teams){const l=r===t;for(const c of r.players){if(c.sentOff)continue;const u=r.form.slots[c.slot],h=Xs(r,s,n);let d=F(u.nx+(h.nx-.5)*.5,.04,.95),v=F(u.ny*.95+h.ny*(l?.3:.34),-1,1);const f=zt(r,d,v);if(c.homeX=f.x,c.homeY=f.y,c.isGK){const m=zt(r,.02,F(h.ny*.25,-.1,.1));c.homeX=m.x,c.homeY=m.y}if(!l&&E(c.homeX,c.homeY,s,n)<3.2){const m=oe(c.homeX-s,c.homeY-n);c.homeX=s+(m.m?m.x:1)*3.4,c.homeY=n+(m.m?m.y:0)*3.4}}}const o=t.players.filter(r=>!r.isGK&&!r.sentOff).sort((r,l)=>E(r.homeX,r.homeY,s,n)-E(l.homeX,l.homeY,s,n));if(o[1]){const r=-Ie(n||1);o[1].homeX=s+t.side*3,o[1].homeY=n+r*5.5}o[2]&&(o[2].homeX=s-t.side*5.5,o[2].homeY=n+-Ie(n||1)*3)}function Oo(e,t,a,s,n){const i=We(t),o=Ie(n||1),r=t.players.filter(v=>!v.isGK&&!v.sentOff);r.sort((v,f)=>f.info.head+f.info.strength-(v.info.head+v.info.strength));const l=[{x:i-t.side*5,y:-o*1},{x:i-t.side*7.5,y:o*4},{x:i-t.side*10.5,y:-o*4.5},{x:i-t.side*4,y:o*6.5},{x:i-t.side*14,y:o*1.5},{x:i-t.side*17,y:-o*8},{x:i-t.side*24,y:o*12},{x:i-t.side*34,y:0},{x:i-t.side*44,y:-o*10}];r.forEach((v,f)=>{const m=l[Math.min(f,l.length-1)];v.homeX=m.x,v.homeY=m.y});const c=Lt(t);c&&(c.homeX=Ne(t)+t.side*2,c.homeY=0);const u=a.players.filter(v=>!v.isGK&&!v.sentOff);u.sort((v,f)=>f.info.head+f.info.strength-(v.info.head+v.info.strength));const h=[{x:i-a.side*-4.2,y:-o*2},{x:i+a.side*6.2,y:o*2.8},{x:i+a.side*9,y:-o*3.2},{x:i+a.side*4.2,y:o*5.6},{x:i+a.side*1.2,y:-o*3.2},{x:i+a.side*12.5,y:o*.5},{x:i+a.side*2,y:o*7.4},{x:i+a.side*20,y:-o*10},{x:i+a.side*30,y:o*6}];u.forEach((v,f)=>{const m=h[Math.min(f,h.length-1)];v.homeX=F(m.x,-M.halfL+1,M.halfL-1),v.homeY=m.y});const d=Lt(a);d&&(d.homeX=We(a)-a.side*1.1,d.homeY=-o*1.4)}function Io(e,t,a,s,n){const i=Ne(t);for(const o of t.players){if(o.sentOff)continue;const r=t.form.slots[o.slot],l=zt(t,F(r.nx*.8+.06,.04,.6),r.ny*1.05);o.homeX=l.x,o.homeY=l.y,o.isGK&&(o.homeX=s,o.homeY=n)}for(const o of a.players){if(o.sentOff)continue;const r=a.form.slots[o.slot],l=zt(a,F(r.nx+.22,.1,.8),r.ny);o.homeX=l.x,o.homeY=l.y,(o.homeX-i)*t.side<M.boxDepth+1.2&&Math.abs(o.homeY)<M.boxHalfW+1&&(o.homeX=i+t.side*(M.boxDepth+1.6))}}function Xo(e,t,a,s,n){Oa(e,t,a,s,n);const i=We(t),o=E(s,n,i,0);if(o<34){const r=oe(i-s,-n),l=s+r.x*9.15,c=n+r.y*9.15,u={x:-r.y,y:r.x},h=o<20?4:o<28?3:2,d=a.players.filter(f=>!f.isGK&&!f.sentOff).sort((f,m)=>E(f.homeX,f.homeY,l,c)-E(m.homeX,m.homeY,l,c));for(let f=0;f<Math.min(h,d.length);f++){const m=(f-(h-1)/2)*.62;d[f].homeX=l+u.x*m,d[f].homeY=c+u.y*m,d[f].inWall=!0}t.players.filter(f=>!f.isGK&&!f.sentOff).forEach((f,m)=>{m<2||(f.homeX=i-t.side*(6+m%3*3.5),f.homeY=(m%2?1:-1)*(2+m%4*2.6))})}}function $o(e,t,a,s,n){const i=We(t);for(const o of t.players){if(o.sentOff)continue;const r=o.slot;o.homeX=s-t.side*(9+r%5*2.2),o.homeY=(r%2?1:-1)*(M.boxHalfW+2.5+r%3),o.isGK&&(o.homeX=Ne(t)+t.side*8,o.homeY=0)}for(const o of a.players){if(o.sentOff)continue;const r=o.slot;o.homeX=s-t.side*(-2-r%5*2.4),o.homeY=(r%2?-1:1)*(M.boxHalfW+2.5+r%3),o.isGK&&(o.homeX=i-t.side*.35,o.homeY=0)}}function _s(e){for(const t of e.players)t.inWall=!1}function qs(e={}){const t={...Ea.find(i=>i.id===e.difficulty)||Ea[2]},a=e.halfMinutes||4,s=[ms(e.home||"AUR",e.homeFormation||"433",0,1),ms(e.away||"IRO",e.awayFormation||"442",1,-1)];s[1].kit=1;const n={t:0,played:0,halfTime:a*60,totalTime:a*120,half:1,addedTime:0,phase:"kickoff",phaseT:0,teams:s,players:s[0].players.concat(s[1].players),ball:On(),carrier:null,possTeam:0,lastPossTeam:0,userTeam:e.userTeam===1?1:0,diff:t,rng:Es(e.seed||(Date.now()^1542469173)>>>0),events:[],notices:[],restart:null,offside:null,lastPass:null,lastShot:null,freeze:0,shake:0,goalFlash:0,stats:{kickoffs:0},cam:{x:0,y:0,zoom:1,mode:"play"},emit(i,o){this.events.push({name:i,data:o,t:this.t})},notice(i,o="info",r=2600){this.notices.push({text:i,kind:o,until:this.t+r/1e3})}};return n.noUser=!!e.noUser,n.user={team:n.userTeam,player:null,chargeShoot:0,chargePass:0,chargeThrough:0,switchCd:0,autoSwitchCd:0,lastAim:{x:1,y:0}},n.cmd={mx:0,my:0,sprint:!1,shoot:!1,pass:!1,through:!1,tackle:!1,switchBtn:!1},Ia(n,0),Bt(n,{kind:"kickoff",team:n.rng.chance(.5)?0:1}),n}function Ia(e,t=.4){for(const a of e.teams){$s(a,e);for(const s of a.players)s.x=s.homeX+e.rng.gauss()*t,s.y=s.homeY+e.rng.gauss()*t,s.vx=s.vy=0,s.facing=a.side>0?0:Math.PI,Ue(s,"run"),s.hasBall=!1}}function Bt(e,t){e.restart={kind:t.kind,team:t.team,x:t.x!==void 0?t.x:0,y:t.y!==void 0?t.y:0,taker:null,state:"setup",timer:0,armed:!1},t.kind==="kickoff"&&(e.restart.x=0,e.restart.y=0),t.kind==="throwin"&&(e.restart.y=Ie(e.restart.y||1)*(M.halfW-.3),e.restart.x=F(e.restart.x,-M.halfL+1.5,M.halfL-1.5)),e.phase="deadball",e.phaseT=0,e.carrier=null;for(const a of e.players)a.hasBall=!1,(a.state==="slide"||a.state==="dive")&&Ue(a,"run");_s(e),In(e.ball,e.restart.x,e.restart.y,t.kind==="throwin"?1.6:H.r),e.ball.lastTouchTeam=-1,e.offside=null,e.restart.taker=Eo(e,e.restart),t.kind==="kickoff"&&e.firstKickoffTeam===void 0&&(e.firstKickoffTeam=t.team),e.possTeam=t.team,e.restart.taker&&e.restart.taker.team===e.userTeam&&Qt(e,e.restart.taker),e.emit("restart",{kind:t.kind,team:t.team})}function Yo(e){return{kickoff:"キックオフ",throwin:"スローイン",corner:"コーナーキック",goalkick:"ゴールキック",freekick:"フリーキック",penalty:"ペナルティキック"}[e]||""}function Ks(e){e.phase="play",e.phaseT=0,e.restart=null,e.outGrace=.18,_s(e)}function Qt(e,t){!t||t.sentOff||e.user.player!==t&&(e.user.player&&(e.user.player.user=!1),e.user.player=t,t.user=!0,t.userGlow=.5,e.emit("switch",{p:t}))}function ps(e,t){const a=e.teams[e.userTeam],s=e.ball;let n=null,i=-1/0;for(const o of a.players){if(o.sentOff||o.isGK||o===t)continue;const r=Sa(e,o),c=-E(o.x,o.y,s.x,s.y)*1-r.t*6+(o.ai.pressing?3:0);c>i&&(i=c,n=o)}return n}function _o(e){const t=e.teams[e.userTeam],a=e.ball,s=t.players.filter(i=>!i.sentOff&&!i.isGK).sort((i,o)=>E(i.x,i.y,a.x,a.y)-E(o.x,o.y,a.x,a.y));if(!s.length)return;const n=s.indexOf(e.user.player);Qt(e,s[(n+1)%s.length])}function ys(e,t){const a=e.user,s=e.cmd;e.teams[e.userTeam],a.autoSwitchCd-=t;const n=e.carrier&&e.carrier.team===e.userTeam?e.carrier:null;if(n&&!n.isGK)a.player!==n&&Qt(e,n);else if(!n&&a.autoSwitchCd<=0){const u=ps(e);if(u&&u!==a.player){const h=a.player;(!h||h.sentOff||h.isGK||E(h.x,h.y,e.ball.x,e.ball.y)>E(u.x,u.y,e.ball.x,e.ball.y)+7)&&(Qt(e,u),a.autoSwitchCd=.45)}}const i=a.player;if(!i||i.sentOff){const u=ps(e);u&&Qt(e,u);return}const o=Math.hypot(s.mx,s.my)>.14;(i.state==="run"||i.state==="celebrate")&&(i.inX=s.mx,i.inY=s.my,i.sprint=s.sprint&&i.stamina>.05),o&&(a.lastAim.x=s.mx,a.lastAim.y=s.my);const r=o?{x:s.mx,y:s.my}:null,l=e.diff.assist,c=e.carrier===i;if(e.phase==="deadball"){const u=e.restart;if(u&&u.taker===i&&u.state==="ready"){if(u.kind==="penalty"){s.shoot?a.chargeShoot+=t:a.chargeShoot>0&&(Zs(e,i,F(a.chargeShoot/.75,.25,1),r),a.chargeShoot=0);return}if(s.shoot)a.chargeShoot+=t;else if(a.chargeShoot>0){const h=F(a.chargeShoot/.8,.2,1);a.chargeShoot=0,Aa(e,i,"shoot",h,r);return}if(s.pass)a.chargePass+=t;else if(a.chargePass>0){const h=F(a.chargePass/.8,.18,1);a.chargePass=0,Aa(e,i,"pass",h,r);return}if(s.through&&a.chargeThrough<=0){a.chargeThrough=.01,Aa(e,i,"through",.8,r);return}s.through||(a.chargeThrough=0)}return}if(c){if(i.shielding=!o&&ba(e,i)>.3,s.shoot)a.chargeShoot=Math.min(1,a.chargeShoot+t);else if(a.chargeShoot>0){const u=F(.3+a.chargeShoot/.78*.7,.3,1),h=a.chargeShoot<.22;a.chargeShoot=0;const d=r?F(r.y*(e.teams[i.team].side>0?1:-1)*1.1,-1,1):0;na(e,i,{power:u,aim:l>.5?null:d,dirX:r?r.x:0,dirY:r?r.y:0,finesse:h,assist:l});return}if(s.pass)a.chargePass=Math.min(1,a.chargePass+t);else if(a.chargePass>0){const u=F(.25+a.chargePass/.7*.75,.25,1),h=a.chargePass>.55;a.chargePass=0;const d=r||a.lastAim;Ce(e,i,{dirX:d.x,dirY:d.y,power:u,mode:h?"lob":"ground",assist:l});return}if(s.through&&a.chargeThrough<=0){a.chargeThrough=.2;const u=r||a.lastAim;Ce(e,i,{dirX:u.x,dirY:u.y,power:.85,mode:"through",assist:l});return}if(s.through||(a.chargeThrough=Math.max(0,a.chargeThrough-t)),s.tackle&&a.chargeThrough<=0){const u=e.teams[i.team],h=Math.abs(i.y)>14,d=(We(u)-i.x)*u.side<34;if(h&&d){a.chargeThrough=.3,Et(e,i,.85);return}}}else{if(i.shielding=!1,a.chargeShoot=0,a.chargePass=0,s.switchBtn&&a.switchCd<=0&&(a.switchCd=.26,_o(e),a.autoSwitchCd=1.2),a.switchCd=Math.max(0,a.switchCd-t),s.shoot&&i.touchCd<=0&&i.state==="run"&&(wa(e,i),i.touchCd=.32),s.tackle&&i.touchCd<=0&&i.state==="run"&&(Us(i,s.mx||Math.cos(i.facing),s.my||Math.sin(i.facing)),i.touchCd=.5),s.through&&a.chargeThrough<=0){a.chargeThrough=.4;const u=es(e.teams[e.userTeam].players,e.ball.x,e.ball.y,h=>h!==i&&!h.isGK&&!h.sentOff).p;u&&(u.ai.pressing=!0,u.ai.commit=e.t+2.2)}s.through||(a.chargeThrough=Math.max(0,a.chargeThrough-t))}}function Aa(e,t,a,s,n){const i=e.restart,o=e.teams[t.team],r=We(o),l=E(t.x,t.y,r,0);let c=n||{x:o.side,y:0};i.kind==="throwin"&&(c=js(i,o,c)),i.kind==="corner"?Et(e,t,F(s+.1,.5,1)):i.kind==="freekick"&&a==="shoot"&&l<32?na(e,t,{power:F(s,.5,1),dirX:c.x,dirY:c.y,finesse:s<.6,assist:e.diff.assist,aim:null}):i.kind==="freekick"&&a==="shoot"?Et(e,t,.95):a==="through"?Ce(e,t,{dirX:c.x,dirY:c.y,power:.85,mode:"through",assist:e.diff.assist}):a==="shoot"?Ce(e,t,{dirX:c.x,dirY:c.y,power:F(s,.4,1),mode:"lob",assist:e.diff.assist}):Ce(e,t,{dirX:c.x,dirY:c.y,power:s,mode:s>.72?"lob":"ground",assist:e.diff.assist}),ss(e)}function js(e,t,a){const s=-Ie(e.y||1),n=Math.sign(a.y)===s?a.y:s*Math.max(.45,Math.abs(a.y)),i=oe(a.x*.8,n+s*.5);return{x:i.x,y:i.y}}function ss(e){const t=e.restart;t&&(as(e,e.ball.lastTouch||t.taker),e.emit("restartTaken",{kind:t.kind}),Ks(e))}function Zs(e,t,a,s){const n=e.teams[t.team],i=Lt(e.teams[1-t.team]),o=s?F(s.y*(n.side>0?1:-1),-1,1):e.rng.range(-.75,.75);if(i){const r=e.rng.chance(.42+i.k.gkReflex*.16)?Ie(o||1):-Ie(o||1);i.diveDir=Math.atan2(r*3.4,(n.side>0?1:-1)*.8),Ue(i,"dive")}na(e,t,{power:F(a*.8+.3,.45,1),aim:o*.94,dirX:n.side,dirY:0,assist:.25}),ss(e)}function gs(e){const t=e.restart,a=t.taker;if(!a){Ks(e);return}const s=e.teams[a.team],n=We(s),i=E(a.x,a.y,n,0);switch(t.kind){case"kickoff":{const o=Vt(e,a,-s.side*.2,e.rng.chance(.5)?1:-1,"ground",170);o?Ce(e,a,{dirX:o.tx-a.x,dirY:o.ty-a.y,power:.45,mode:"ground",target:o,assist:1}):Ce(e,a,{dirX:-s.side,dirY:.4,power:.4,mode:"ground",assist:1});break}case"corner":Et(e,a,e.rng.range(.75,1));break;case"penalty":{const o=e.rng.chance(.5)?1:-1;Zs(e,a,e.rng.range(.6,1),{x:s.side,y:o*.8*(s.side>0?1:-1)});return}case"freekick":{if(i<30&&e.rng.chance(.6))na(e,a,{power:F(.55+i/44,.5,1),finesse:e.rng.chance(.6),assist:1});else if(i<44&&e.rng.chance(.6))Et(e,a,.95);else{const o=Vt(e,a,0,0,"ground",180);o?Ce(e,a,{dirX:o.tx-a.x,dirY:o.ty-a.y,power:F(o.d/30,.4,1),mode:"ground",target:o,assist:1}):Zt(e,a)}break}case"goalkick":{const o=Vt(e,a,0,0,"ground",170);o&&o.d<26&&o.clear>.6&&(s.club.style==="possession"?e.rng.chance(.8):e.rng.chance(.4))?Ce(e,a,{dirX:o.tx-a.x,dirY:o.ty-a.y,power:.55,mode:"ground",target:o,assist:1}):Zt(e,a);break}default:{const o=t.kind==="throwin"?js(t,s,{x:s.side,y:0}):null,r=o?Vt(e,a,o.x,o.y,"ground",95):Vt(e,a,0,0,"ground",180);r&&r.score>1.2?Ce(e,a,{dirX:r.tx-a.x,dirY:r.ty-a.y,power:F(r.d/28,.3,.9),mode:r.d>24?"lob":"ground",target:r,assist:1}):o?Ce(e,a,{dirX:o.x,dirY:o.y,power:.5,mode:"ground",assist:1}):Zt(e,a);break}}ss(e)}function xs(e,t){const a=e.restart;for(const s of e.players){if(s.sentOff||s.user&&e.phase==="deadball"&&a&&a.state==="ready"&&a.taker===s||s.state!=="run"&&s.state!=="celebrate")continue;const n=a&&a.taker===s,i=n?a.x-e.teams[s.team].side*(a.kind==="penalty"?2.4:1.1):s.homeX,o=n?a.y*(a.kind==="throwin"?1.02:1):s.homeY,r=i-s.x,l=o-s.y,c=Math.hypot(r,l);if(c<.22){s.inX=0,s.inY=0,s.sprint=!1;continue}const u=c<2.2?Math.max(.28,c/2.2):1;s.inX=r/c*u,s.inY=l/c*u,s.sprint=c>8,s.state==="celebrate"&&s.stateT>1.2&&Ue(s,"run")}}function qo(e,t){const a=e.ball;for(const l of e.players)if(l.state==="slide"&&l.stateT<O.slideTime*.8&&yo(e,l)==="foul"){Qs(e,l,e.carrier,!0);return}for(const l of e.teams){const c=Lt(l);if(!c||c.sentOff)continue;const h=(c.x-Ne(l))*l.side<M.boxDepth+.6&&Math.abs(c.y)<M.boxHalfW+.6,d=c.state==="dive"?.72:1.15,v=Math.max(0,a.z-d)*1.15,f=Math.hypot(a.x-c.x,a.y-c.y,v),m=a.kickKind==="shot",p=(c.state==="dive"?O.gkReach:O.gkHandleR+.38)*(.88+c.k.gkReflex*.22);if(f<p&&a.z<2.5&&h&&c.touchCd<=0&&a.lastTouch!==c){const y=Math.hypot(a.vx,a.vy,a.vz),g=c.k.gkHand*1+.2-y/34+(c.state==="dive"?-.26:.08),b=I((y-9)/24);if(e.rng.chance(b*(1.15-c.k.gkReflex*.5)*.5)&&y>15){const S=oe(a.vx,a.vy);ta(a,{dirX:S.x*.5+e.rng.gauss()*.5,dirY:S.y+e.rng.gauss()*.7,speed:y*.42,loft:.3,kind:"parry",by:c}),a.lastTouch=c,a.lastTouchTeam=c.team,c.touchCd=.35,m&&l.stats.saves++,e.emit("save",{gk:c,parry:!0,speed:y});return}if(e.rng.chance(I(g))||y<8){pa(e,c),a.vx=a.vy=a.vz=0,c.ai.tDecide=e.rng.range(.6,1.4),y>11&&m?(l.stats.saves++,e.emit("save",{gk:c,parry:!1,speed:y})):e.emit("gkCollect",{gk:c});return}const x=oe(a.x-Ne(l),a.y*1.2+e.rng.gauss()*2);ta(a,{dirX:x.x,dirY:x.y,speed:F(y*.5,5,16),loft:.35,kind:"parry",by:c}),a.lastTouch=c,a.lastTouchTeam=c.team,c.touchCd=.3,m&&l.stats.saves++,e.emit("save",{gk:c,parry:!0,speed:y});return}}const s=e.carrier;if(s)if(s.sentOff||s.state==="getup"||s.state==="stunned")s.hasBall=!1,e.carrier=null;else if(E(s.x,s.y,a.x,a.y)>1.85||a.z>1.3)s.hasBall=!1,e.carrier=null;else{po(e,s,t);const l=(s.protect||0)>e.t;for(const c of e.teams[1-s.team].players){if(l)break;if(c.sentOff||c.isGK||c.state!=="run"||E(c.x,c.y,a.x,a.y)>O.controlR*.92||c.touchCd>0)continue;if(c.k.tackle*.6+c.k.strength*.4-(s.k.dribble*.62+s.k.strength*.38)+e.rng.gauss()*.18>.16){c.touchCd=.2,wa(e,c);return}}return}const n=a.intendedTarget&&a.intendedTarget.m?a.intendedTarget.m:null;let i=null,o=1/0;const r=Math.hypot(a.vx,a.vy)<4.5;for(const l of e.players){if(l.sentOff||l.state==="dive")continue;const c=l===n||e.teams[l.team].chaser===l||l.isGK||r||l.state==="slide";if(!lo(l,a,c?1:.55))continue;const u=E(l.x,l.y,a.x,a.y)-(l.isGK?.4:0)-(l===n?.5:0)-(l.user?.22*e.diff.assist:0);u<o&&(o=u,i=l)}if(i){if(e.lastPass&&e.lastPass.by!==i&&(e.lastPass.by.team===i.team&&(e.teams[i.team].stats.passOk++,e.lastPass.by.stats.passOk++),e.lastPass=null),Wo(e,i)){const l=e.teams[i.team];l.stats.offsides++,e.notice(`オフサイド  ${l.club.abbr} #${i.shirt}`,"whistle"),e.emit("whistle",{kind:"offside"}),Bt(e,{kind:"freekick",team:1-i.team,x:F(i.x,-M.halfL+2,M.halfL-2),y:F(i.y,-M.halfW+2,M.halfW-2)});return}if(Os(i,a)&&Math.hypot(a.vx,a.vy,a.vz)>5){const l=e.teams[i.team],c=We(l),u=E(i.x,i.y,c,0)<18;vo(e,i,u),as(e,i);return}pa(e,i),e.lastPossTeam=e.possTeam,e.possTeam=i.team}}function Qs(e,t,a,s){if(!a||a.team===t.team)return;const n=Go(e,t,a,s),i=e.teams[t.team];i.stats.fouls++,t.stats.fouls++;const o=n.card?Bo(e,t,n.card):null;Ue(a,"stunned"),Ue(t,"getup"),e.emit("whistle",{kind:"foul"}),o&&e.emit("card",{p:t,kind:o});const r=n.kind==="penalty"?"ペナルティ！":"ファウル",l=o==="yellow"?"  イエローカード":o?"  レッドカード":"";e.notice(`${r}  ${i.club.abbr} #${t.shirt}${l}`,"whistle",3e3),Bt(e,n)}function Ko(e){for(const t of e.events)t.name==="foul"&&!t.handled&&(t.handled=!0,Qs(e,t.data.by,t.data.on,t.data.slide)),(t.name==="pass"||t.name==="shot"||t.name==="clear"||t.name==="cross"||t.name==="header")&&!t.armed&&(t.armed=!0,t.data.p&&as(e,t.data.p))}function jo(e,t){const a=e.teams[t.scorerTeam],s=e.ball.lastTouch;a.score++;const n=s&&s.team!==t.scorerTeam;if(s&&(n||s.stats.goals++,e.teams[s.team].stats.onTarget++),e.phase="goal",e.phaseT=0,e.goalFlash=1,e.shake=1,e.lastGoal={team:t.scorerTeam,scorer:s,ownGoal:n,minute:Zo(e)},e.carrier=null,e.emit("goal",{team:t.scorerTeam,scorer:s,ownGoal:n}),e.emit("whistle",{kind:"goal"}),e.notice(n?`オウンゴール  #${s.shirt} ${s.name}`:s?`ゴール！  #${s.shirt} ${s.name}`:"ゴール！","goal",4200),s&&!n){Ue(s,"celebrate");const i=oe(We(e.teams[s.team])-s.x,s.y*.2);s.inX=i.x,s.inY=i.y;for(const o of e.teams[t.scorerTeam].players)if(!(o===s||o.isGK)&&E(o.x,o.y,s.x,s.y)<30){o.inX=s.x-o.x,o.inY=s.y-o.y;const r=oe(o.inX,o.inY);o.inX=r.x,o.inY=r.y,o.sprint=!0}}}function Zo(e){const t=I(e.played/e.totalTime);return Math.floor(t*90)+(e.phase==="fulltime",0)}function Qo(e,t){switch(e.t+=t,e.phaseT+=t,e.freeze>0&&(e.freeze-=t),e.shake>0&&(e.shake=Math.max(0,e.shake-t*1.6)),e.goalFlash>0&&(e.goalFlash=Math.max(0,e.goalFlash-t*1.2)),e.events.length=0,e.phase){case"deadball":{const n=e.restart;if(n.state==="setup"){let i=0,o=0;for(const r of e.players)r.sentOff||(o++,(E(r.x,r.y,r.homeX,r.homeY)<2.6||n.taker===r)&&i++);n.timer+=t,(i/Math.max(o,1)>.8&&n.timer>Bn.restartHold||n.timer>2.3)&&(n.state="ready",n.timer=0)}else if(n.state==="ready"){n.timer+=t;const i=!e.noUser&&n.taker&&n.taker.team===e.userTeam,o=n.kind==="penalty"?1.2:.38;(!i&&n.timer>o||i&&n.timer>(n.kind==="penalty"?8:5))&&gs(e)}break}case"goal":{if(e.phaseT>1&&!e.replayArmed&&(e.replayArmed=!0,e.emit("replayRequest",{reason:"goal"})),e.phaseT>3.2){if(e.replayArmed=!1,Da(e))break;Ia(e,.3),Bt(e,{kind:"kickoff",team:e.lastGoal?1-e.lastGoal.team:0})}break}case"halftime":{if(e.phaseT>2.6){e.half=2;for(const n of e.teams)n.side*=-1;Ia(e,.3),Bt(e,{kind:"kickoff",team:e.kickoffSecond})}break}}if(e.phase==="play"){e.played+=t;const n=e.possTeam;n>=0&&(e.teams[n].stats.possSec+=t)}for(const n of e.teams)$s(n,e);if(e.phase==="play")wo(e,t),e.noUser||ys(e,t);else if(e.phase==="deadball"){xs(e),e.noUser||ys(e,t);for(const n of e.teams){const i=Lt(n);i&&i.state==="run"&&e.restart&&e.restart.taker}}else xs(e);for(const n of e.players)n.sentOff||no(n,t);go(e);const s=e.ball.x;if(e.ball.y,e.phase!=="goal"||e.phaseT<1.4){const n=$n(e.ball,t);n.bounce>.08&&e.emit("bounce",n),n.post&&e.emit("post",{}),n.crossbar&&e.emit("post",{bar:!0}),n.net&&e.emit("net",{})}if((e.phase==="play"||e.phase==="goal")&&qo(e,t),Ko(e),e.carrier?e.possTeam!==e.carrier.team&&(e.lastPossTeam=e.possTeam,e.possTeam=e.carrier.team,e.emit("turnover",{team:e.possTeam})):e.ball.lastTouchTeam>=0&&e.phase==="play"&&(e.possTeam=e.ball.lastTouchTeam),e.outGrace>0&&(e.outGrace-=t),e.phase==="play"&&e.outGrace<=0){const n=Vo(e,s);if(n)if(n.kind==="goal")jo(e,n);else{e.emit("whistle",{kind:n.kind});const i=Yo(n.kind),o=e.teams[n.team].club.abbr;e.notice(`${i}  ${o}`,"info",1800),Bt(e,n)}else Da(e)}else e.phase==="play"&&Da(e);return e.notices=e.notices.filter(n=>n.until>e.t),e}function Da(e,t){const a=e.half===1?e.halfTime:e.totalTime;return e.played<a?!1:e.half===1?(e.kickoffSecond=e.firstKickoffTeam!==void 0?1-e.firstKickoffTeam:1,e.phase="halftime",e.phaseT=0,e.emit("whistle",{kind:"halftime"}),e.notice("ハーフタイム","whistle",2600),!0):(e.phase="fulltime",e.phaseT=0,e.emit("whistle",{kind:"fulltime"}),e.notice("試合終了","whistle",6e3),!0)}function Xa(e,t){const a=Ca.dt;e.acc=(e.acc||0)+Math.min(t,.25);let s=0;const n=[];for(;e.acc>=a&&s<Ca.maxSubSteps;){Qo(e,a);for(const i of e.events)n.push(i);e.acc-=a,s++}return s===Ca.maxSubSteps&&(e.acc=0),e.events=n,s}function Jo(){return{px:0,py:-58,pz:20,tx:0,ty:0,tz:1.2,fov:nt(34),fx:0,fy:0,fzoom:1,mode:"play",modeT:0,shakeX:0,shakeY:0,rx:1,ry:0,rz:0,ux:0,uy:0,uz:1,dx:0,dy:1,dz:0,focal:800,cx:0,cy:0,w:0,h:0,side:1}}function ei(e,t,a){e.w=t,e.h=a,e.cx=t*.5,e.cy=a*.5}function ti(e){const t=e.tx-e.px,a=e.ty-e.py,s=e.tz-e.pz,n=Math.hypot(t,a,s)||1;e.dx=t/n,e.dy=a/n,e.dz=s/n;let i=e.dy*1-e.dz*0,o=e.dz*0-e.dx*1,r=e.dx*0-e.dy*0;const l=Math.hypot(i,o,r)||1;e.rx=i/l,e.ry=o/l,e.rz=r/l,e.ux=e.ry*e.dz-e.rz*e.dy,e.uy=e.rz*e.dx-e.rx*e.dz,e.uz=e.rx*e.dy-e.ry*e.dx,e.focal=e.h*.5/Math.tan(e.fov*.5)}const bs={play:{z:17,back:26,vspan:1,hspan:1,bias:-5.5,yFollow:.34,xFollow:.92,lead:.28},tight:{z:13.5,back:20,vspan:.88,hspan:.88,bias:-4.2,yFollow:.48,xFollow:.97,lead:.2},wide:{z:23,back:38,vspan:1.3,hspan:1.3,bias:-8,yFollow:.2,xFollow:.8,lead:.1},goal:{z:6.8,back:12.5,vspan:.88,hspan:.88,bias:-2.2,yFollow:.62,xFollow:1,lead:0},replay:{z:8,back:15,vspan:1.05,hspan:1.05,bias:-4.5,yFollow:.62,xFollow:1,lead:.05}};function ai(e,t){return e.w/Math.max(1,e.h)<1?{wantV:F(38+e.h*.024,46,76)*t.vspan,wantH:F(16+e.w*.028,20,34)*t.hspan}:{wantV:F(14+e.h*.019,21,33)*t.vspan,wantH:F(30+e.w*.016,38,64)*t.hspan}}function fa(e,t,a,s={}){const n=t.ball,i=s.focus||n;e.modeT+=a,e.portrait=e.w/Math.max(1,e.h)<1;let o="play";const r=Math.abs(n.x)>M.halfL-26;t.phase==="goal"?o="goal":t.restart&&t.restart.kind==="kickoff"?o="wide":s.mode?o=s.mode:r&&(o="tight"),(t.phase==="halftime"||t.phase==="fulltime")&&(o="wide"),e.mode!==o&&(e.mode=o,e.modeT=0);const l=bs[e.mode]||bs.play,{wantV:c,wantH:u}=ai(e,l),h=s.zoom||1;let d,v,f,m,p,y;if(e.portrait){const w=s.attackDir||1;e.side=-w,e.fx=ye(e.fx,F(i.x,-M.halfL+6,M.halfL-6),2.6,a),e.fy=ye(e.fy,i.y*.55,2.8,a);const L=33*l.vspan,T=19.5*l.vspan;d=e.fx-w*L,v=e.fy*.6,f=T,m=e.fx+w*7,p=e.fy*.8,y=1}else{e.side=-1;const w=F(i.x*l.xFollow,-M.halfL+8,M.halfL-8),L=i.y*l.yFollow,T=(i.vx||0)*l.lead;if(e.fx=ye(e.fx,w+T,3.4,a),e.fy=ye(e.fy,L,2.6,a),d=e.fx*.96,v=e.side*(M.halfW+l.back),f=l.z,e.mode==="goal"){const D=Math.min(1,e.modeT/2.6);d=F(e.fx,-M.halfL+6,M.halfL-6),v=e.side*(M.halfW+q(l.back+4,l.back-4,D)),f=q(l.z+3,l.z,D)}m=e.fx;const A=I(-e.fy/14);p=e.fy*.85+l.bias*F(c/28,.7,1.5)*(1-A*.72),y=1.1}if(s.override){const w=s.override;d=w.px,v=w.py,f=w.pz,m=w.tx,p=w.ty,y=w.tz===void 0?1.1:w.tz}const g=s.snap?1e3:1;e.px=ye(e.px,d,5*g,a),e.py=ye(e.py,v,3.2*g,a),e.pz=ye(e.pz,f,3.2*g,a),e.tx=ye(e.tx,m,5.5*g,a),e.ty=ye(e.ty,p,4.2*g,a),e.tz=ye(e.tz,y,3.2*g,a);const b=Math.max(8,Math.hypot(e.tx-e.px,e.ty-e.py,e.tz-e.pz)),k=Math.min(e.h/(c*h),e.w/(u*h)),x=k*b,S=s.fovDeg?nt(s.fovDeg):2*Math.atan(e.h/(2*x));e.fov=ye(e.fov,F(S,nt(8),nt(86)),4*g,a),e.mpp=k;const z=(t.shake||0)*(s.shakeScale===void 0?1:s.shakeScale);if(z>.001){const w=z*z*9;e.shakeX=(Math.random()*2-1)*w,e.shakeY=(Math.random()*2-1)*w}else e.shakeX=0,e.shakeY=0;return ti(e),e}function si(e){const t=Math.hypot(e.dx,e.dy)||1,a=e.dx/t,s=e.dy/t;return{fwdX:a,fwdY:s,rightX:-s,rightY:a}}const ne=(e,t,a)=>new B(e,t,a),$t={day:{name:"デイゲーム",elev:52,azim:118,sunIntensity:7.4,zenith:ne(.09,.165,.33),horizon:ne(.42,.52,.65),ground:ne(.085,.115,.09),fog:ne(.02,.026,.034),fogDensity:.0012,fogHeight:.03,turbidity:1,night:0,wet:.06,exposure:.68,flood:0,grade:{lift:ne(0,0,.01),gamma:ne(1,1,1),gain:ne(1.02,1,.98),sat:1.06}},dusk:{name:"夕暮れ",elev:7.8,azim:196,sunIntensity:6.4,zenith:ne(.05,.068,.128),horizon:ne(.28,.228,.208),ground:ne(.045,.04,.038),fog:ne(.026,.018,.016),fogDensity:.002,fogHeight:.045,turbidity:2.1,night:.28,wet:.14,exposure:1.05,flood:.65,grade:{lift:ne(.01,.004,.012),gamma:ne(.98,1,1.03),gain:ne(1.07,.99,.94),sat:1.12}},night:{name:"ナイター",elev:-14,azim:300,sunIntensity:.085,zenith:ne(.0045,.0062,.0135),horizon:ne(.013,.0165,.026),ground:ne(.0075,.009,.0105),fog:ne(.004,.0052,.0075),fogDensity:.003,fogHeight:.05,turbidity:1.35,night:1,wet:.22,exposure:.95,flood:1,grade:{lift:ne(.004,.006,.012),gamma:ne(1.02,1,.98),gain:ne(.98,1,1.06),sat:1.04}},rain:{name:"雨天ナイター",elev:-10,azim:290,sunIntensity:.05,zenith:ne(.006,.007,.0105),horizon:ne(.015,.0175,.0225),ground:ne(.009,.01,.0115),fog:ne(.009,.0105,.013),fogDensity:.0075,fogHeight:.065,turbidity:1.7,night:1,wet:1,exposure:1,flood:1,rain:1,grade:{lift:ne(.006,.008,.014),gamma:ne(1.03,1.01,.99),gain:ne(.95,.99,1.07),sat:.96}}};function ni(e,t,a){const s=90-Math.max(e,-3),n=1/(Math.cos(ht.degToRad(Math.min(s,92)))+.50572*Math.pow(96.07995-s,-1.6364)),i=F(n,1,38),o=[.045,.0865,.205],r=[.052,.061,.073];for(let l=0;l<3;l++){const c=Math.exp(-(o[l]+r[l]*(t-.4))*i);a.setComponent(l,c)}return a}function oi(){const e={uTime:{value:0},uCamPos:{value:new B},uSunDir:{value:new B(.3,.4,.86)},uSunColor:{value:ne(6,5.6,5)},uSkyZenith:{value:ne(.09,.16,.33)},uSkyHorizon:{value:ne(.42,.52,.65)},uSkyGround:{value:ne(.08,.11,.09)},uFogColor:{value:ne(.33,.42,.54)},uFogParams:{value:new De(.003,.03)},uTurbidity:{value:1},uNight:{value:0},uWet:{value:.1},uWind:{value:new De(.7,.3)},uExposure:{value:1},uFlood:{value:Array.from({length:8},()=>new qa)},uFloodColor:{value:ne(1,.985,.94)},uFloodCount:{value:0}},t=new B(.3,.4,.86),a={u:e,preset:$t.night,presetId:"night",grade:$t.night.grade,rain:0,wetTarget:.22,sunElev:20,sunAzim:120,tmp:new B,shadowDir:t,towers:[],uniforms(){return{uTime:e.uTime,uCamPos:e.uCamPos,uSunDir:e.uSunDir,uSunColor:e.uSunColor,uSkyZenith:e.uSkyZenith,uSkyHorizon:e.uSkyHorizon,uSkyGround:e.uSkyGround,uFogColor:e.uFogColor,uFogParams:e.uFogParams,uTurbidity:e.uTurbidity,uNight:e.uNight,uWet:e.uWet,uWind:e.uWind,uExposure:e.uExposure,uFlood:e.uFlood,uFloodColor:e.uFloodColor,uFloodCount:e.uFloodCount}},setPreset(s){const n=$t[s]||$t.night;return a.preset=n,a.presetId=s in $t?s:"night",a.grade=n.grade,a.sunElev=n.elev,a.sunAzim=n.azim,a.rain=n.rain||0,a.wetTarget=n.wet,e.uSkyZenith.value.copy(n.zenith),e.uSkyHorizon.value.copy(n.horizon),e.uSkyGround.value.copy(n.ground),e.uFogColor.value.copy(n.fog),e.uFogParams.value.set(n.fogDensity,n.fogHeight),e.uTurbidity.value=n.turbidity,e.uNight.value=n.night,e.uWet.value=n.wet,e.uExposure.value=n.exposure,a.floodLevel=n.flood,a.applySun(),a},applySun(){const s=ht.degToRad(a.sunElev),n=ht.degToRad(a.sunAzim);e.uSunDir.value.set(Math.cos(s)*Math.cos(n),Math.cos(s)*Math.sin(n),Math.sin(s)).normalize();const i=ni(a.sunElev,e.uTurbidity.value,a.tmp),o=a.preset.sunIntensity*I((a.sunElev+4)/10);if(e.uSunColor.value.set(i.x*o,i.y*o,i.z*o),t.copy(e.uSunDir.value),a.sunElev<0){const r=a.preset.sunIntensity;e.uSunColor.value.set(r*.72,r*.8,r*1),e.uSunDir.value.set(Math.cos(s)*Math.cos(n),Math.cos(s)*Math.sin(n),Math.max(Math.sin(s),.22)).normalize();const l=ht.degToRad(74);t.set(Math.cos(l)*Math.cos(n),Math.cos(l)*Math.sin(n),Math.sin(l)).normalize()}},setTowers(s,n){a.towers=s;const i=Math.min(s.length,8);for(let o=0;o<8;o++){const r=s[o%Math.max(s.length,1)];o<i&&r?e.uFlood.value[o].set(r.x,r.y,r.z,n):e.uFlood.value[o].set(0,0,0,0)}e.uFloodCount.value=i},update(s,n,i){e.uTime.value=n,i&&e.uCamPos.value.copy(i),e.uWet.value=q(e.uWet.value,a.wetTarget,1-Math.exp(-s*.6));const o=e.uWind.value,r=Math.sin(n*.07)*.5+Math.sin(n*.021)*.5;o.set(.62+r*.35,.22+Math.cos(n*.053)*.28)},floodLevel:1};return a.setPreset("night"),a}function je(...e){return Object.assign({},mn.clone(dn.lights),...e)}const Ke=`
float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2  hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
vec3  hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(0.1031,0.1030,0.0973));
  p3 += dot(p3, p3.yxz+33.33); return fract((p3.xxy+p3.yzz)*p3.zyx); }
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x),
             mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y);
}
float vnoise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  float n000 = hash13(i), n100 = hash13(i+vec3(1,0,0));
  float n010 = hash13(i+vec3(0,1,0)), n110 = hash13(i+vec3(1,1,0));
  float n001 = hash13(i+vec3(0,0,1)), n101 = hash13(i+vec3(1,0,1));
  float n011 = hash13(i+vec3(0,1,1)), n111 = hash13(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,u.x), mix(n010,n110,u.x), u.y),
             mix(mix(n001,n101,u.x), mix(n011,n111,u.x), u.y), u.z);
}
// signed gradient noise: better for normals than value noise
float gnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  vec2 g00 = normalize(hash22(i)*2.0-1.0), g10 = normalize(hash22(i+vec2(1,0))*2.0-1.0);
  vec2 g01 = normalize(hash22(i+vec2(0,1))*2.0-1.0), g11 = normalize(hash22(i+vec2(1,1))*2.0-1.0);
  float v00 = dot(g00, f), v10 = dot(g10, f-vec2(1,0));
  float v01 = dot(g01, f-vec2(0,1)), v11 = dot(g11, f-vec2(1,1));
  return mix(mix(v00,v10,u.x), mix(v01,v11,u.x), u.y)*1.4;
}
float fbm(vec2 p, int oct){
  float a = 0.5, s = 0.0, n = 0.0;
  for (int i = 0; i < 8; i++){
    if (i >= oct) break;
    s += a*vnoise(p); n += a; p = p*2.03 + 17.3; a *= 0.5;
  }
  return s/max(n, 1e-4);
}
float fbmS(vec2 p, int oct){            // signed, zero mean
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 8; i++){
    if (i >= oct) break;
    s += a*gnoise(p); p = p*2.07 + 11.7; a *= 0.5;
  }
  return s;
}
float fbm3(vec3 p, int oct){
  float a = 0.5, s = 0.0, n = 0.0;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    s += a*vnoise3(p); n += a; p = p*2.11 + 9.1; a *= 0.5;
  }
  return s/max(n, 1e-4);
}
// cellular noise -> F1 distance + cell id. Used for grass clumps, leather
// grain, crowd seating and puddle shapes.
vec3 voronoi(vec2 p){
  vec2 ip = floor(p), fp = fract(p);
  float f1 = 8.0, f2 = 8.0; vec2 id = vec2(0.0);
  for (int j = -1; j <= 1; j++)
  for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j));
    vec2 o = hash22(ip+g);
    float d = length(g + o - fp);
    if (d < f1){ f2 = f1; f1 = d; id = ip+g; }
    else if (d < f2) f2 = d;
  }
  return vec3(f1, f2-f1, hash12(id));
}
`,ya=`
float pitchHeight(vec2 p){
  float cx = clamp(p.x/52.5, -1.4, 1.4);
  float cy = clamp(p.y/34.0, -1.4, 1.4);
  float crown = (1.0 - cy*cy)*0.085 + (1.0 - cx*cx)*0.02;
  float undul = fbmS(p*0.055, 3)*0.055 + fbmS(p*0.013, 2)*0.075;
  float off = clamp(smoothstep(34.0, 44.0, abs(p.y)) + smoothstep(52.5, 64.0, abs(p.x)), 0.0, 1.0);
  return crown + undul - off*0.22;
}
`,ze=`
uniform float uTime;
uniform vec3  uCamPos;
uniform vec3  uSunDir;          // world, points TOWARD the sun
uniform vec3  uSunColor;        // direct radiance
uniform vec3  uSkyZenith;
uniform vec3  uSkyHorizon;
uniform vec3  uSkyGround;
uniform vec3  uFogColor;
uniform vec2  uFogParams;       // x = density, y = height falloff (1/m)
uniform float uTurbidity;
uniform float uNight;           // 0 = daylight, 1 = floodlit night
uniform float uWet;             // 0 = dry pitch, 1 = soaked
uniform vec2  uWind;
uniform float uExposure;
uniform vec4  uFlood[8];        // xyz = position, w = intensity
uniform vec3  uFloodColor;
uniform float uFloodCount;
`,ns=`
float miePhase(float c, float g){
  float g2 = g*g;
  return (1.0-g2)/(4.0*PI*pow(1.0+g2-2.0*g*c, 1.5));
}
float rayleighPhase(float c){ return (3.0/(16.0*PI))*(1.0+c*c); }

vec3 cloudLayer(vec3 d, float h, float scale, float cover, float t){
  if (d.z <= 0.012) return vec3(0.0);
  float tHit = h/d.z;
  vec2 q = (uCamPos.xy + d.xy*tHit)*scale + uWind*t*0.06;
  float f = fbm(q, 5);
  float m = smoothstep(cover, cover+0.28, f);
  // vertical silver lining: more light leaks through thin edges
  float thin = smoothstep(cover+0.30, cover, f);
  float sun = max(dot(d, uSunDir), 0.0);
  float fade = smoothstep(0.012, 0.16, d.z);
  return vec3(m*fade, thin*fade, pow(sun, 24.0));
}

// The cheap half of the sky: gradient, scattering lobes, ground, sun disk.
// Fog, reflections and IBL all call this one -- the cloud decks cost ten
// octaves of noise and are only worth it for the dome itself.
vec3 skyBase(vec3 d, float withSun){
  float up = clamp(d.z, -1.0, 1.0);
  float c = clamp(dot(d, uSunDir), -1.0, 1.0);

  // horizon -> zenith gradient, thicker air near the horizon
  float t = pow(clamp(1.0 - up, 0.0, 1.0), 2.4);
  vec3 col = mix(uSkyZenith, uSkyHorizon, t);

  // Mie forward scattering (the big soft glow around the sun) and a touch of
  // Rayleigh so the whole dome brightens as the sun gets low.
  float sunUp = clamp(uSunDir.z, 0.0, 1.0);
  float mie = miePhase(c, mix(0.60, 0.80, 1.0-sunUp))*14.0*uTurbidity;
  float ray = rayleighPhase(c)*2.2;
  col += uSunColor*(mie*0.085 + ray*0.03)*(0.35+0.65*smoothstep(-0.12, 0.25, up));

  // ground bounce below the horizon line
  col = mix(col, uSkyGround, smoothstep(0.0, -0.08, up));

  // sun disk with limb softening + aureole
  if (withSun > 0.5){
    float disk = smoothstep(0.99955, 0.99985, c);
    float aureole = pow(max(c, 0.0), 1800.0);
    col += uSunColor*(disk*62.0 + aureole*9.0)*(1.0-uNight*0.92);
  }
  return max(col, vec3(0.0));
}

// Everything the dome adds on top: stars, the milky way, two cloud decks.
vec3 skyRadiance(vec3 d, float withSun){
  vec3 col = skyBase(d, withSun);
  float up = clamp(d.z, -1.0, 1.0);

  if (uNight > 0.01){
    vec2 sp = d.xy/max(abs(d.z)+0.35, 0.05);
    float stars = pow(hash12(floor(sp*420.0)), 240.0)*step(0.02, up);
    float tw = 0.65+0.35*sin(uTime*2.3 + hash12(floor(sp*420.0))*63.0);
    float band = smoothstep(0.52, 0.0, abs(d.x*0.42 + d.z*0.62 - 0.12));
    col += uNight*(vec3(0.85,0.92,1.0)*stars*tw*2.2
         + vec3(0.09,0.11,0.17)*band*fbm(sp*7.0, 4)*smoothstep(0.0,0.3,up));
  }

  vec3 cl = cloudLayer(d, 900.0, 0.00055, 0.52, uTime);
  vec3 cl2 = cloudLayer(d, 2600.0, 0.00022, 0.62, uTime*0.6);
  vec3 cloudLit = uSkyHorizon*0.85 + uSunColor*0.055*(0.35 + cl.z*2.2);
  vec3 cloudDark = uSkyZenith*0.42 + uSkyGround*0.18;
  vec3 cc = mix(cloudDark, cloudLit, 0.45 + 0.55*cl.y);
  col = mix(col, cc, cl.x*0.82*(1.0-uNight*0.55));
  col = mix(col, mix(cloudDark, cloudLit, 0.3), cl2.x*0.38*(1.0-uNight*0.6));
  return max(col, vec3(0.0));
}
vec3 skyRadiance(vec3 d){ return skyRadiance(d, 1.0); }

// Roughness-aware sky probe. Instead of a prefiltered cubemap we lerp the
// whole dome toward its average as the surface gets rougher -- cheap, stable,
// and indistinguishable at the sizes things appear on screen here.
vec3 skyProbe(vec3 r, float rough){
  vec3 avg = (uSkyZenith*0.55 + uSkyHorizon*0.45)*(0.55+0.45*(1.0-uNight));
  vec3 sharp = skyBase(normalize(r), 0.0);
  return mix(sharp, avg, clamp(rough*rough*1.35, 0.0, 1.0));
}

// Cosine-lobe average of the sky dome around n, plus the bounce off the
// pitch. Returned as radiance, so a Lambert surface is simply albedo*this.
vec3 skyIrradiance(vec3 n){
  float up = n.z*0.5 + 0.5;
  vec3 low  = uSkyHorizon*0.82 + uSkyZenith*0.18;   // lobe pointing sideways
  vec3 high = uSkyZenith*0.58 + uSkyHorizon*0.42;   // lobe pointing up
  vec3 sky = mix(low, high, up);
  vec3 bounce = uSkyGround*(1.0 - up)*1.15;
  return sky*(0.55 + 0.45*up) + bounce;
}
`,ii=`
float D_GGX(float NoH, float a){
  float a2 = a*a;
  float d = (NoH*a2-NoH)*NoH+1.0;
  return a2/max(PI*d*d, 1e-7);
}
float V_SmithGGX(float NoV, float NoL, float a){
  float a2 = a*a;
  float gv = NoL*sqrt(NoV*NoV*(1.0-a2)+a2);
  float gl = NoV*sqrt(NoL*NoL*(1.0-a2)+a2);
  return 0.5/max(gv+gl, 1e-6);
}
vec3 F_Schlick(vec3 f0, float u){ return f0 + (vec3(1.0)-f0)*pow(1.0-u, 5.0); }
float F_Schlick(float f0, float u){ return f0 + (1.0-f0)*pow(1.0-u, 5.0); }

// Karis' analytic environment BRDF (mobile friendly, no LUT).
vec3 envBRDF(vec3 f0, float rough, float NoV){
  vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 r = rough*c0 + c1;
  float a004 = min(r.x*r.x, exp2(-9.28*NoV))*r.x + r.y;
  vec2 ab = vec2(-1.04, 1.04)*a004 + r.zw;
  return f0*ab.x + ab.y;
}

// Cloth / fabric: inverted-Gaussian sheen lobe on top of a wrapped diffuse.
// This is what stops the kits looking like painted plastic.
float D_Charlie(float NoH, float rough){
  float a = max(rough, 0.07);
  float invR = 1.0/a;
  float cos2 = NoH*NoH;
  float sin2 = 1.0-cos2;
  return (2.0+invR)*pow(sin2, invR*0.5)/(2.0*PI);
}
float V_Ashikhmin(float NoV, float NoL){ return clamp(1.0/max(4.0*(NoL+NoV-NoL*NoV), 1e-4), 0.0, 2.0); }

// Wrapped diffuse for skin / cloth: light bleeds a little past the terminator.
float wrapDiffuse(float NoL, float w){ return clamp((NoL+w)/((1.0+w)*(1.0+w)), 0.0, 1.0); }

struct Surface {
  vec3 P; vec3 N; vec3 V; vec3 albedo;
  float rough; float metal; float ao; float spec;
};

vec3 directLight(Surface s, vec3 L, vec3 radiance){
  vec3 H = normalize(L+s.V);
  float NoL = max(dot(s.N, L), 0.0);
  float NoV = max(dot(s.N, s.V), 1e-4);
  float NoH = max(dot(s.N, H), 0.0);
  float VoH = max(dot(s.V, H), 0.0);
  float a = max(s.rough*s.rough, 2e-3);
  vec3 f0 = mix(vec3(0.04*s.spec), s.albedo, s.metal);
  vec3 F = F_Schlick(f0, VoH);
  float D = D_GGX(NoH, a);
  float Vis = V_SmithGGX(NoV, NoL, a);
  vec3 spec = F*D*Vis;
  vec3 kd = (vec3(1.0)-F)*(1.0-s.metal);
  return (kd*s.albedo*RECIPROCAL_PI + spec)*radiance*NoL;
}

vec3 ambientLight(Surface s){
  float NoV = max(dot(s.N, s.V), 1e-4);
  vec3 f0 = mix(vec3(0.04*s.spec), s.albedo, s.metal);
  vec3 irr = skyIrradiance(s.N)*s.ao;
  vec3 diff = s.albedo*(1.0 - s.metal)*irr;
  vec3 R = reflect(-s.V, s.N);
  vec3 refl = skyProbe(R, s.rough)*envBRDF(f0, s.rough, NoV);
  // horizon occlusion: never reflect the sky from below the ground
  refl *= mix(1.0, smoothstep(-0.25, 0.08, R.z), 0.75);
  return diff + refl*mix(s.ao, 1.0, 0.45);
}
`,ri=`
vec3 floodLights(Surface s){
  if (uNight < 0.01 || uFloodCount < 0.5) return vec3(0.0);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 8; i++){
    if (float(i) >= uFloodCount) break;
    vec3 lp = uFlood[i].xyz;
    vec3 d = lp - s.P;
    float dist2 = dot(d, d);
    vec3 L = d*inversesqrt(max(dist2, 1e-4));
    // rigs are aimed at the middle of the pitch: cone falloff toward the aim
    vec3 aim = normalize(vec3(0.0, 0.0, 1.2) - lp);
    float cone = smoothstep(0.12, 0.62, dot(-L, aim));
    float att = uFlood[i].w*26000.0/max(dist2, 64.0)*cone;
    if (att < 0.002) continue;
    sum += directLight(s, L, uFloodColor*att);
  }
  return sum*uNight;
}
`,ci=`
// Exponential height fog with the sun scattered into it. The night preset
// leans on this for the damp, heavy air of a floodlit match.
vec3 applyFog(vec3 col, vec3 P, vec3 V){
  vec3 ray = P - uCamPos;
  float dist = length(ray);
  vec3 dir = ray/max(dist, 1e-4);
  float hC = max(uCamPos.z, 0.0), hP = max(P.z, 0.0);
  float k = max(uFogParams.y, 1e-4);
  float dz = hP - hC;
  float integral;
  if (abs(dz) < 1e-3) integral = dist*exp(-k*hC);
  else integral = dist*(exp(-k*hC) - exp(-k*hP))/(k*dz);
  float f = clamp(1.0 - exp(-uFogParams.x*integral), 0.0, 1.0);
  // What the air scatters toward us IS the sky in that direction -- using a
  // hand-picked constant instead is how a dusk preset ends up painting the
  // whole pitch sepia. Looking down, the air takes the colour of the horizon.
  vec3 horizonDir = normalize(vec3(dir.xy, clamp(dir.z, 0.015, 0.45)));
  float c = max(dot(dir, uSunDir), 0.0);
  vec3 inscatter = skyBase(horizonDir, 0.0)*0.80 + uFogColor
                 + uSunColor*miePhase(c, 0.76)*0.40*(1.0 - uNight*0.6);
  return mix(col, inscatter, f);
}
`,li=`
#include <common>
#include <shadowmap_pars_vertex>
`,rt=`
#include <shadowmap_vertex>
`,ui=`
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
`;function Ze(e=""){return`${ui}
${ze}
${Ke}
${ns}
${ii}
${ri}
${ci}
${e}`}function Qe(e=""){return`${li}
${ze}
${Ke}
${e}`}function fi(e){const t=new it(2,2),a=new de({uniforms:Object.assign(e.uniforms(),{uInvVP:{value:new He}}),depthTest:!1,depthWrite:!1,side:Fe,vertexShader:`
      uniform mat4 uInvVP;
      varying vec3 vRay;
      void main(){
        // position is already in NDC; unproject the far plane to get the ray
        vec4 far = uInvVP * vec4(position.xy, 1.0, 1.0);
        vec4 near = uInvVP * vec4(position.xy, -1.0, 1.0);
        vRay = far.xyz/far.w - near.xyz/near.w;
        gl_Position = vec4(position.xy, 0.999999, 1.0);
      }
    `,fragmentShader:`
      #include <common>
      ${ze}
      ${Ke}
      ${ns}
      varying vec3 vRay;
      void main(){
        vec3 d = normalize(vRay);
        vec3 col = skyRadiance(d);
        // the stands block the lower dome; keep a dark apron under the horizon
        col = mix(col, uSkyGround*0.35, smoothstep(-0.02, -0.12, d.z));
        gl_FragColor = vec4(col, 1.0);
      }
    `}),s=new ve(t,a);s.frustumCulled=!1,s.renderOrder=-1e3,s.name="sky";const n=new He;return{mesh:s,setCamera(i){n.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),a.uniforms.uInvVP.value.copy(n).invert()}}}const Fa=M.length+2*M.runOffX,Na=M.width+2*M.runOffY;function hi(e,t=1024){const a=t,s=Math.max(256,Math.round(t*(Na/Fa)/2)*2),n={type:ja,format:Ka,depthBuffer:!1,stencilBuffer:!1,minFilter:gt,magFilter:gt,wrapS:Jt,wrapT:Jt};let i=new ft(a,s,n),o=new ft(a,s,n);const r=new Za,l=new vn(-1,1,1,-1,0,10);l.position.z=1;const c=new de({uniforms:{uPrev:{value:null},uHeal:{value:0}},depthTest:!1,depthWrite:!1,vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",fragmentShader:`
      uniform sampler2D uPrev; uniform float uHeal;
      varying vec2 vUv;
      void main(){
        vec4 p = texture2D(uPrev, vUv);
        // grass springs back fastest, soil takes the whole match, water dries
        p.r *= 1.0 - uHeal*0.55;
        p.g *= 1.0 - uHeal*0.10;
        p.b *= 1.0 - uHeal*1.60;
        p.a *= 1.0 - uHeal*0.80;
        gl_FragColor = max(p, vec4(0.0));
      }
    `}),u=new ve(new it(2,2),c);u.frustumCulled=!1,r.add(u);const h=512,d=new Ut,v=new it(1,1);d.index=v.index,d.attributes.position=v.attributes.position,d.attributes.uv=v.attributes.uv;const f=new we(new Float32Array(h*4),4),m=new we(new Float32Array(h*4),4);d.setAttribute("aXform",f),d.setAttribute("aParam",m),d.instanceCount=0;const p=new de({uniforms:{uSpan:{value:new De(Fa,Na)}},transparent:!0,blending:yn,blendEquation:pn,blendSrc:os,blendDst:os,depthTest:!1,depthWrite:!1,vertexShader:`
      attribute vec4 aXform;
      attribute vec4 aParam;
      uniform vec2 uSpan;
      varying vec2 vLocal;
      varying vec4 vParam;
      void main(){
        vLocal = position.xy*2.0;
        vParam = aParam;
        float c = cos(aXform.w), s = sin(aXform.w);
        // studs smear along the direction of travel
        vec2 stretch = vec2(1.0 + vParam.w*1.6, 1.0);
        vec2 p = position.xy*aXform.z*2.0*stretch;
        p = vec2(p.x*c - p.y*s, p.x*s + p.y*c) + aXform.xy;
        gl_Position = vec4(p.x/(uSpan.x*0.5), p.y/(uSpan.y*0.5), 0.0, 1.0);
      }
    `,fragmentShader:`
      ${Ke}
      varying vec2 vLocal;
      varying vec4 vParam;
      void main(){
        float d = length(vLocal);
        if (d > 1.0) discard;
        float fall = pow(1.0 - d, 1.45);
        // broken edge so a scar is never a clean circle
        float edge = 0.78 + 0.34*fbm(vLocal*3.4 + vParam.xy*37.0, 3);
        fall *= smoothstep(edge, edge*0.55, d);
        float cl = fbm(vLocal*6.0 + 11.0, 3);
        gl_FragColor = vec4(vParam.x*fall, vParam.y*fall*cl, vParam.z*fall, fall)*1.0;
      }
    `}),y=new ve(d,p);y.frustumCulled=!1,y.visible=!1,r.add(y);let g=0,b=0;const k={get texture(){return i.texture},uniforms:{uTurf:{value:i.texture},uTurfSpan:{value:new De(Fa,Na)}},add(x,S,z,w,L,T,A,D=0){if(g>=h)return;const N=g++;f.array[N*4]=x,f.array[N*4+1]=S,f.array[N*4+2]=z,f.array[N*4+3]=w,m.array[N*4]=L,m.array[N*4+1]=T,m.array[N*4+2]=A,m.array[N*4+3]=D},update(x){b+=x;const S=Math.min(b*.012,.02);if(g===0&&S<8e-4)return;b=0,c.uniforms.uPrev.value=i.texture,c.uniforms.uHeal.value=S,d.instanceCount=g,y.visible=g>0,g>0&&(f.needsUpdate=!0,m.needsUpdate=!0);const z=e.getRenderTarget(),w=e.autoClear;e.autoClear=!0,e.setRenderTarget(o),e.render(r,l),e.setRenderTarget(z),e.autoClear=w;const L=i;i=o,o=L,k.uniforms.uTurf.value=i.texture,g=0},clear(){for(const x of[i,o])e.setRenderTarget(x),e.setClearColor(0,0),e.clear(!0,!1,!1);e.setRenderTarget(null),g=0},dispose(){i.dispose(),o.dispose()}};return k.clear(),k}const mi=M.length+2*M.runOffX+46,di=M.width+2*M.runOffY+40;function vi(e,t,a={}){const s=a.tier>=2?192:a.tier>=1?128:64,n=new it(mi,di,s,Math.round(s*.68));n.computeVertexNormals();const i=je(e.uniforms(),{uTurf:t.uniforms.uTurf,uTurfSpan:t.uniforms.uTurfSpan,uReflect:{value:null},uReflectVP:{value:new He},uReflectOn:{value:0},uDew:{value:0},uQuality:{value:a.tier>=2?1:a.tier>=1?.6:.3},uMow:{value:new De(5,1)}}),o=new de({uniforms:i,lights:!0,vertexShader:Qe(ya)+`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main(){
        vec3 p = position;
        p.z += pitchHeight(p.xy);
        vec4 wp = modelMatrix*vec4(p, 1.0);
        vWorld = wp.xyz;
        vec3 objectNormal = vec3(0.0, 0.0, 1.0);
        vec3 transformedNormal = normalMatrix*objectNormal;
        vNormalW = normalize(mat3(modelMatrix)*objectNormal);
        vec4 worldPosition = wp;
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,fragmentShader:Ze(`
      uniform sampler2D uTurf;
      uniform vec2  uTurfSpan;
      uniform sampler2D uReflect;
      uniform mat4  uReflectVP;
      uniform float uReflectOn;
      uniform float uDew;
      uniform float uQuality;
      uniform vec2  uMow;
      varying vec3 vWorld;
      varying vec3 vNormalW;

      // --- anisotropic GGX (Filament's formulation) -----------------------
      float D_GGXaniso(float NoH, vec3 h, vec3 t, vec3 b, float at, float ab){
        float ToH = dot(t, h), BoH = dot(b, h);
        float a2 = at*ab;
        vec3 v = vec3(ab*ToH, at*BoH, a2*NoH);
        float v2 = dot(v, v);
        float w2 = a2/max(v2, 1e-7);
        return a2*w2*w2*RECIPROCAL_PI;
      }

      float segD(vec2 p, vec2 a, vec2 b){
        vec2 pa = p-a, ba = b-a;
        float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
        return length(pa-ba*h);
      }

      // Every marking on a FIFA pitch, as one distance field.
      float markings(vec2 p, out float spot){
        const float HL = ${M.halfL.toFixed(2)};
        const float HW = ${M.halfW.toFixed(2)};
        const float BD = ${M.boxDepth.toFixed(2)};
        const float BW = ${M.boxHalfW.toFixed(2)};
        const float SD = ${M.sixDepth.toFixed(2)};
        const float SW = ${M.sixHalfW.toFixed(2)};
        const float PS = ${M.penSpot.toFixed(2)};
        float d = 1e9;
        vec2 a = abs(p);
        // boundary + halfway
        if (a.x < HL+0.6 && a.y < HW+0.6){
          d = min(d, abs(a.y-HW));
          d = min(d, abs(a.x-HL));
          d = min(d, abs(p.x));
          d = min(d, abs(length(p)-${M.centreR.toFixed(2)}));
        }
        // penalty + goal areas (mirrored on both ends)
        float gx = HL - a.x;               // distance in from the goal line
        if (gx < BD+1.2 && a.y < BW+1.2){
          d = min(d, abs(gx-BD)*step(a.y, BW));                 // front edge
          d = min(d, abs(a.y-BW)*step(gx, BD) + (1.0-step(gx, BD))*1e9);
          d = min(d, abs(gx-SD)*step(a.y, SW));
          d = min(d, abs(a.y-SW)*step(gx, SD) + (1.0-step(gx, SD))*1e9);
          // penalty arc, only the part outside the box
          float dArc = abs(length(vec2(gx-PS, p.y)) - ${M.arcR.toFixed(2)});
          d = min(d, mix(1e9, dArc, step(BD, gx)));
        }
        // corner arcs
        vec2 cq = a - vec2(HL, HW);
        d = min(d, abs(length(cq) - ${M.cornerR.toFixed(2)}));
        // spots: centre + both penalty spots
        spot = 0.0;
        spot = max(spot, 1.0 - smoothstep(0.08, 0.115, length(p)));
        spot = max(spot, 1.0 - smoothstep(0.08, 0.115, length(vec2(gx-PS, p.y))));
        return d;
      }

      void main(){
        vec3 P = vWorld;
        vec2 q = P.xy;
        vec3 V = normalize(uCamPos - P);
        float viewDist = length(uCamPos - P);

        // screen footprint in metres: our LOD / filtering control
        float px = max(length(vec2(dFdx(q.x), dFdy(q.x))), length(vec2(dFdx(q.y), dFdy(q.y))));
        float detail = 1.0 - smoothstep(0.015, 0.12, px);
        float midDetail = 1.0 - smoothstep(0.06, 0.55, px);

        bool inPitch = abs(q.x) < ${(M.halfL+.9).toFixed(2)} && abs(q.y) < ${(M.halfW+.9).toFixed(2)};
        float apron = smoothstep(${M.halfL.toFixed(1)}, ${(M.halfL+3).toFixed(1)}, abs(q.x))
                    + smoothstep(${M.halfW.toFixed(1)}, ${(M.halfW+3).toFixed(1)}, abs(q.y));
        apron = clamp(apron, 0.0, 1.0);

        // --- mown mosaic -------------------------------------------------
        float cell = uMow.x;
        vec2 cid = floor(q/cell);
        float chk = mod(cid.x + cid.y, 2.0);
        vec2 lay = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), chk);
        // soften the block boundary: the mower leaves a 15 cm transition
        vec2 fcell = fract(q/cell);
        float edgeMix = min(min(fcell.x, 1.0-fcell.x), min(fcell.y, 1.0-fcell.y));
        float rollerMark = (1.0 - smoothstep(0.0, 0.035, edgeMix))*0.5;

        // --- blade detail ------------------------------------------------
        vec2 bladeQ = q*vec2(46.0, 46.0) + lay.yx*0.0;
        float blade = fbm(bladeQ, 2);
        float fine = vnoise(q*180.0 + lay*31.0);
        vec3 cl = voronoi(q*1.9);                 // clumps / growth variation
        vec3 cl2 = voronoi(q*0.33 + 7.0);         // broader colour banding
        float clump = cl.x;

        // --- turf map ----------------------------------------------------
        vec2 tuv = q/uTurfSpan + 0.5;
        vec4 scar = texture2D(uTurf, tuv);
        float flat0 = clamp(scar.r, 0.0, 1.0);
        float soil0 = clamp(scar.g, 0.0, 1.0);
        float splash = clamp(scar.b, 0.0, 1.0);

        // --- seasonal wear -----------------------------------------------
        float gx = ${M.halfL.toFixed(2)} - abs(q.x);
        float mouth = exp(-pow(length(vec2(gx*0.55, q.y*0.30)), 1.6)*0.42);
        float centreWear = exp(-pow(length(q*vec2(0.09, 0.09)), 1.7));
        float spotWear = exp(-length(vec2(gx-${M.penSpot.toFixed(2)}, q.y))*1.1);
        float wear = clamp(mouth*0.55 + centreWear*0.30 + spotWear*0.35
                      + fbm(q*0.09, 3)*0.22 - 0.06, 0.0, 1.0);
        wear = mix(wear, 0.0, apron*0.8);
        float soil = clamp(soil0*0.9 + wear*wear*0.42, 0.0, 1.0);
        float flatten = clamp(flat0 + wear*0.25, 0.0, 1.0);

        // --- albedo ------------------------------------------------------
        vec3 lush  = vec3(0.0295, 0.0905, 0.0235);
        vec3 light = vec3(0.0520, 0.1320, 0.0360);
        vec3 dry   = vec3(0.0860, 0.1020, 0.0410);
        vec3 dirt  = vec3(0.0820, 0.0560, 0.0345);
        vec3 alb = mix(lush, light, clamp(blade*0.75 + cl2.z*0.35 + clump*0.25, 0.0, 1.0));
        alb = mix(alb, dry, clamp(wear*0.55 + cl2.z*0.12, 0.0, 1.0)*0.75);
        alb = mix(alb, dirt, soil*0.88);
        alb *= 1.0 + (fine - 0.5)*0.16*detail;
        // the run-off is older, coarser, bluer grass
        alb = mix(alb, mix(alb, vec3(0.030, 0.062, 0.030), 0.55), apron);

        // --- lay-dependent brightness (the TV mow pattern) ---------------
        vec2 vxy = normalize(V.xy + vec2(1e-5));
        vec2 sxy = normalize(uSunDir.xy + vec2(1e-5));
        float vAlign = abs(dot(vxy, lay));
        float sAlign = abs(dot(sxy, lay));
        // blades leaning toward the viewer scatter more light back at them
        float mowGain = 1.0 + (vAlign - 0.5)*0.26 + (sAlign - 0.5)*0.12;
        mowGain = mix(1.0, mowGain, (1.0 - flatten*0.7)*(1.0 - apron*0.6)*uMow.y);
        alb *= mowGain;
        alb *= 1.0 - rollerMark*0.10;
        // Inside each block the mower's roller leaves fine parallel lines
        // along the direction it drove. They are what sells a cut pitch on
        // a long lens, and they cost one sine.
        float across = dot(q, vec2(-lay.y, lay.x));
        float roller = sin(across*6.2831/1.05);
        alb *= 1.0 + roller*0.017*midDetail*(1.0 - flatten*0.7)*(1.0 - apron*0.8);

        // --- markings ----------------------------------------------------
        float spot = 0.0;
        float dLine = markings(q, spot);
        float halfW = ${(M.lineW*.5).toFixed(3)};
        float aa = max(px*0.9, 0.004);
        float paint = (1.0 - smoothstep(halfW - aa, halfW + aa, dLine));
        paint = max(paint, spot);
        paint *= inPitch ? 1.0 : 0.0;
        // worn paint: thinner where the turf is chewed up
        paint *= 1.0 - soil*0.55;
        vec3 paintCol = vec3(0.620, 0.645, 0.620)*(0.88 + 0.12*fine);
        alb = mix(alb, paintCol, paint*0.93);

        // --- normal ------------------------------------------------------
        float e = 0.035;
        float n0 = fbm(q*42.0, 2);
        float nx = fbm((q+vec2(e,0.0))*42.0, 2) - n0;
        float ny = fbm((q+vec2(0.0,e))*42.0, 2) - n0;
        vec3 N = normalize(vNormalW + vec3(-nx, -ny, 0.0)*8.0*detail*(1.0 - flatten*0.85));
        // blades lie along the mow direction -> tilt the normal with it
        N = normalize(N + vec3(lay*0.10*detail*(1.0 - flatten), 0.0));
        vec3 T = normalize(vec3(lay, 0.0) - N*dot(N, vec3(lay, 0.0)));
        vec3 B = cross(N, T);

        // --- water -------------------------------------------------------
        float basin = fbm(q*0.22, 4)*0.65 + fbm(q*0.07, 3)*0.35;
        float lowGround = smoothstep(0.52, 0.30, basin);
        float puddle = clamp((uWet - 0.45)*2.0, 0.0, 1.0)*lowGround
                     + splash*0.28*clamp(uWet, 0.0, 1.0);
        puddle = clamp(puddle*smoothstep(0.0, 0.25, 1.0 - apron*0.5), 0.0, 1.0);
        float wetGrass = clamp(uWet*1.15 + splash*0.3, 0.0, 1.0);

        // ripples: rain impacts + wind chop
        if (puddle > 0.01){
          float rip = 0.0;
          if (uWet > 0.6){
            vec2 rq = q*5.5;
            float t = uTime*1.7;
            rip  = sin(length(fract(rq)-0.5)*42.0 - t*7.0)*exp(-length(fract(rq)-0.5)*5.0);
            rip += fbmS(q*7.0 + uTime*vec2(0.25, 0.11), 3)*0.6;
          } else {
            rip = fbmS(q*3.5 + uWind*uTime*0.08, 3)*0.5;
          }
          N = normalize(mix(N, normalize(vec3(-rip*0.35, -rip*0.28, 1.0)), puddle*0.92));
        }
        alb = mix(alb, alb*vec3(0.42, 0.46, 0.44), wetGrass*0.55);
        alb = mix(alb, vec3(0.012, 0.016, 0.014), puddle*0.85);

        // --- material ----------------------------------------------------
        float rough = mix(0.74, 0.90, flatten);
        rough = mix(rough, 0.52, wetGrass*0.7);
        rough = mix(rough, 0.055, puddle);
        float ao = mix(1.0, 0.62, (1.0 - clump)*0.5*detail) * mix(1.0, 0.80, soil)
                 * mix(1.0, 0.92, flatten);
        ao *= 1.0 - paint*0.10;

        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = alb;
        s.rough = rough; s.metal = 0.0; s.ao = ao;
        s.spec = mix(0.6, 1.25, wetGrass) + puddle*0.45;

        float shadow = getShadowMask();
        vec3 col = vec3(0.0);

        // direct sun, with an anisotropic lobe along the mow lay
        vec3 L = uSunDir;
        float NoL = max(dot(N, L), 0.0);
        if (NoL > 0.0){
          vec3 H = normalize(L+V);
          float NoV = max(dot(N, V), 1e-4);
          float NoH = max(dot(N, H), 0.0);
          float VoH = max(dot(V, H), 0.0);
          float at = max(rough*rough*mix(0.45, 1.0, puddle), 2e-3);
          float ab = max(rough*rough*mix(1.55, 1.0, puddle), 2e-3);
          float D = D_GGXaniso(NoH, H, T, B, at, ab);
          float Vis = V_SmithGGX(NoV, NoL, max(rough*rough, 2e-3));
          vec3 F = F_Schlick(vec3(0.04*s.spec), VoH);
          vec3 diff = alb*RECIPROCAL_PI;
          col += (diff + D*Vis*F)*uSunColor*NoL*shadow;
        }
        // grass is translucent: light coming through the blades from behind
        float back = pow(max(dot(-V, L), 0.0), 3.0)*(1.0 - puddle);
        col += uSunColor*vec3(0.085, 0.175, 0.055)*back*0.55*shadow*(1.0 - flatten*0.6);

        col += ambientLight(s);
        col += floodLights(s)*(0.30 + 0.70*shadow);

        // --- reflections --------------------------------------------------
        // Energy conserving: at grazing angles water IS a mirror, so the
        // reflection replaces the diffuse rather than adding to it.
        float reflAmt = max(puddle, wetGrass*0.25);
        if (reflAmt > 0.01){
          vec3 R = reflect(-V, N);
          float NoV = max(dot(N, V), 0.0);
          // roughness-aware Fresnel: only smooth water turns into a mirror at
          // grazing angles, wet grass just gets a sheen
          float Fmax = max(1.0 - rough*1.25, 0.02);
          float F = 0.02 + (Fmax - 0.02)*pow(1.0 - NoV, 5.0);
          vec3 refl = skyProbe(R, mix(0.40, 0.04, puddle));
          if (uReflectOn > 0.5){
            vec4 rp = uReflectVP*vec4(P, 1.0);
            vec2 ruv = rp.xy/max(rp.w, 1e-4)*0.5 + 0.5;
            // distort by the water normal, then validate
            ruv += (N.xy - vNormalW.xy)*0.05*clamp(1.0/max(viewDist*0.15, 1.0), 0.0, 1.0);
            if (all(greaterThan(ruv, vec2(0.002))) && all(lessThan(ruv, vec2(0.998)))){
              vec3 planar = texture2D(uReflect, ruv).rgb;
              float edge = min(min(ruv.x, 1.0-ruv.x), min(ruv.y, 1.0-ruv.y));
              refl = mix(refl, planar, smoothstep(0.0, 0.06, edge)*0.92);
            }
          }
          col = mix(col, refl, clamp(F*reflAmt, 0.0, 0.90));
        }

        // --- dew / wet sparkle -------------------------------------------
        float sparkleAmt = max(uDew, wetGrass*0.35)*detail;
        if (sparkleAmt > 0.004){
          vec2 sq = floor(q*520.0);
          float g = hash12(sq);
          float glint = step(0.9955, g)*pow(max(dot(normalize(reflect(-V, normalize(vNormalW + vec3(hash22(sq)*2.0-1.0, 0.0)*0.9))), uSunDir), 0.0), 220.0);
          col += uSunColor*glint*sparkleAmt*26.0*shadow;
        }

        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `)}),r=new de({vertexShader:`
      #include <common>
      ${Ke}
      ${ya}
      void main(){
        vec3 p = position;
        p.z += pitchHeight(p.xy);
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0);
      }
    `,fragmentShader:`
      #include <common>
      #include <packing>
      void main(){ gl_FragColor = packDepthToRGBA(gl_FragCoord.z); }
    `}),l=new ve(n,o);return l.customDepthMaterial=r,l.receiveShadow=!0,l.name="pitch",l.matrixAutoUpdate=!1,l.updateMatrix(),{mesh:l,mat:o,setReflection(c,u,h){i.uReflect.value=c,u&&i.uReflectVP.value.copy(u),i.uReflectOn.value=h?1:0},setDew(c){i.uDew.value=c},setMow(c,u){i.uMow.value.set(c,u)}}}const pi=[{grid:0,span:0,segs:0},{grid:220,span:14,segs:3},{grid:392,span:19,segs:4}];function yi(e){const t=[],a=[],s=[],n=[];for(let o=0;o<=e;o++){const r=o/e,l=(1-r*.82)*.5;t.push(-l,0,r,l,0,r),s.push(-1,1),n.push(r,r)}for(let o=0;o<e;o++){const r=o*2;a.push(r,r+1,r+2,r+1,r+3,r+2)}const i=new Ut;return i.setAttribute("position",new Xe(t,3)),i.setAttribute("aSide",new Xe(s,1)),i.setAttribute("aAlong",new Xe(n,1)),i.setIndex(a),i}function gi(e,t,a={}){const s=Math.max(0,Math.min(2,a.tier|0)),n=pi[s];if(!n.grid)return{mesh:null,update(){},setDensity(){}};const i=yi(n.segs),o=n.grid*n.grid,r=new Float32Array(o*2),l=new Float32Array(o*4);let c=0;for(let m=0;m<n.grid;m++)for(let p=0;p<n.grid;p++)r[c*2]=(p+.5)/n.grid-.5,r[c*2+1]=(m+.5)/n.grid-.5,l[c*4]=Math.random(),l[c*4+1]=Math.random(),l[c*4+2]=Math.random(),l[c*4+3]=Math.random(),c++;i.setAttribute("aCell",new we(r,2)),i.setAttribute("aRnd",new we(l,4)),i.instanceCount=o,i.boundingSphere=new At(new B,1e4);const u=je(e.uniforms(),{uTurf:t.uniforms.uTurf,uTurfSpan:t.uniforms.uTurfSpan,uOrigin:{value:new De},uSpan:{value:n.span},uHeight:{value:.032},uPush:{value:Array.from({length:12},()=>new qa)},uPushCount:{value:0},uFade:{value:1}}),h=new de({uniforms:u,lights:!0,side:Fe,vertexShader:Qe(ya+`
      attribute vec2 aCell;
      attribute vec4 aRnd;
      attribute float aSide;
      attribute float aAlong;
      uniform sampler2D uTurf;
      uniform vec2 uTurfSpan;
      uniform vec2 uOrigin;
      uniform float uSpan;
      uniform float uHeight;
      uniform vec4 uPush[12];
      uniform float uPushCount;
      uniform float uFade;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec4 vBlade;      // along, lean, colour jitter, flatten
    `)+`
      void main(){
        // blade root, snapped to the world so the patch can slide freely
        vec2 root = uOrigin + aCell*uSpan + (aRnd.xy - 0.5)*(uSpan/float(${n.grid}))*2.2;
        float distC = length(root - uCamPos.xy);
        float radius = uSpan*0.5;

        vec2 tuv = root/uTurfSpan + 0.5;
        vec4 scar = texture2D(uTurf, tuv);
        float flatten = clamp(scar.r, 0.0, 1.0);
        float soil = clamp(scar.g, 0.0, 1.0);

        // height: mown short, with clump variation, killed by wear and edges
        float clump = fbm(root*2.3, 2);
        float h = uHeight*(0.55 + 0.75*aRnd.z)*(0.72 + 0.55*clump);
        h *= 1.0 - soil*0.85;
        h *= 1.0 - flatten*0.72;
        // Blades only earn their cost where a pixel can resolve one, so the
        // patch is anchored ahead of the camera and fades out with distance
        // from it, not from the ball.
        float edgeFade = 1.0 - smoothstep(radius*0.70, radius*0.99, length(root - uOrigin));
        float camFade = 1.0 - smoothstep(radius*0.55, radius*1.05, distC);
        h *= edgeFade*camFade*uFade;
        // outside the playing surface the grass is cut differently (shorter)
        float outside = smoothstep(${M.halfL.toFixed(1)}, ${(M.halfL+6).toFixed(1)}, abs(root.x))
                      + smoothstep(${M.halfW.toFixed(1)}, ${(M.halfW+6).toFixed(1)}, abs(root.y));
        h *= 1.0 - clamp(outside, 0.0, 1.0)*0.45;

        if (h < 0.0015){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vWorld = vec3(0.0); vNormalW = vec3(0,0,1); vBlade = vec4(0.0); return; }

        // the mow direction decides which way the blade lies
        vec2 cid = floor(root/5.0);
        float chk = mod(cid.x + cid.y, 2.0);
        vec2 lay = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), chk);
        float layDir = (fract(aRnd.w*7.31) > 0.5) ? 1.0 : -1.0;
        float yaw = atan(lay.y, lay.x) + (aRnd.w - 0.5)*1.5 + (layDir < 0.0 ? PI : 0.0);

        // wind: large gust envelope + local ripple, blades follow with lag
        float gust = fbm(root*0.09 + uWind*uTime*0.12, 3);
        float ripple = sin(dot(root, uWind)*2.6 - uTime*5.4 + aRnd.x*6.28);
        float wind = (gust*0.65 + ripple*0.35)*0.55;

        // players and the ball shove the blades out of the way
        vec2 shove = vec2(0.0);
        for (int i = 0; i < 12; i++){
          if (float(i) >= uPushCount) break;
          vec2 d = root - uPush[i].xy;
          float dl = length(d);
          float r = uPush[i].z;
          if (dl < r) shove += normalize(d + 1e-5)*(1.0 - dl/r)*uPush[i].w;
        }

        float t = aAlong;
        float bend = (wind*0.42 + flatten*1.25)*t*t;
        vec2 bendDir = normalize(mix(normalize(lay*layDir + 1e-5), normalize(uWind + 1e-5), 0.45) + shove*2.4);
        float lean = clamp(bend + length(shove)*1.1*t*t, 0.0, 1.45);

        // build the blade in world space directly
        float c = cos(yaw), s = sin(yaw);
        vec3 tangent = vec3(c, s, 0.0);
        float width = 0.0062*(0.7 + 0.6*aRnd.y);
        vec3 p = vec3(0.0);
        p.z = cos(lean)*t*h;
        p.xy = bendDir*sin(lean)*t*h*1.35;
        p += tangent*(aSide*width*(1.0 - t*0.8));

        // sit the blade on the real (crowned, uneven) surface
        vec3 wp = vec3(root, 0.0) + p;
        wp.z += pitchHeight(root);

        // normal: perpendicular to the blade, facing the camera-ish side
        vec3 bladeDir = normalize(vec3(bendDir*sin(lean), cos(lean)) + 1e-5);
        vec3 nrm = normalize(cross(tangent, bladeDir));
        if (dot(nrm, uCamPos - wp) < 0.0) nrm = -nrm;
        nrm = normalize(nrm + vec3(0.0, 0.0, 0.55));

        vWorld = wp;
        vNormalW = nrm;
        vBlade = vec4(t, lean, aRnd.z, flatten);

        vec4 worldPosition = vec4(wp, 1.0);
        vec3 transformedNormal = normalMatrix*nrm;
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*worldPosition;
      }
    `,fragmentShader:Ze(`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec4 vBlade;
    `)+`
      void main(){
        vec3 P = vWorld;
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(uCamPos - P);
        float t = vBlade.x;

        vec3 lush = vec3(0.0300, 0.0930, 0.0245);
        vec3 tip  = vec3(0.0700, 0.1560, 0.0430);
        vec3 alb = mix(lush, tip, clamp(t*0.85 + vBlade.z*0.35, 0.0, 1.0));
        alb = mix(alb, vec3(0.085, 0.100, 0.042), vBlade.w*0.45);
        alb = mix(alb, alb*vec3(0.5, 0.55, 0.5), uWet*0.45);

        // self shadowing inside the canopy: the base of a blade sees no sky
        float canopyAO = mix(0.42, 1.0, pow(t, 0.70));

        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = alb;
        s.rough = mix(0.62, 0.38, uWet*0.6);
        s.metal = 0.0; s.ao = canopyAO; s.spec = 1.0 + uWet*1.6;

        float shadow = getShadowMask();
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        // transmission through the blade -- the reason grass glows backlit
        float trans = pow(max(dot(-V, uSunDir), 0.0), 2.2);
        col += uSunColor*vec3(0.11, 0.26, 0.07)*trans*shadow*canopyAO*0.9;
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `}),d=new ve(i,h);d.frustumCulled=!1,d.receiveShadow=!0,d.name="grass";const f=n.span/n.grid*4;return{mesh:d,update(m,p,y){u.uOrigin.value.set(Math.round(m/f)*f,Math.round(p/f)*f);const g=u.uPush.value,b=Math.min(y.length,12);for(let k=0;k<b;k++){const x=y[k];g[k].set(x.x,x.y,x.r,x.s)}u.uPushCount.value=b},setDensity(m){u.uFade.value=m}}}const fe={innerX:M.halfL+M.runOffX+5,innerY:M.halfW+M.runOffY+4.6,corner:19,moat:3.2,base:1.25,lower:{rows:21,tread:.82,riser:.42},concourse:{depth:4.2,rise:1.1},upper:{rows:24,tread:.8,riser:.56},backWall:5,seatPitch:.54};function Js(){const{innerX:e,innerY:t,corner:a}=fe,s=e-a,n=t-a,i=Math.PI*.5*a,o=[{len:2*n,kind:"x+"},{len:i,kind:"c1"},{len:2*s,kind:"y+"},{len:i,kind:"c2"},{len:2*n,kind:"x-"},{len:i,kind:"c3"},{len:2*s,kind:"y-"},{len:i,kind:"c4"}],r=o.reduce((l,c)=>l+c.len,0);return{total:r,at(l,c={}){let u=(l%1+1)%1*r;for(const h of o){if(u>h.len){u-=h.len;continue}const d=u/h.len;switch(h.kind){case"x+":c.x=e,c.y=-n+2*n*d,c.nx=1,c.ny=0;break;case"x-":c.x=-e,c.y=n-2*n*d,c.nx=-1,c.ny=0;break;case"y+":c.x=s-2*s*d,c.y=t,c.nx=0,c.ny=1;break;case"y-":c.x=-s+2*s*d,c.y=-t,c.nx=0,c.ny=-1;break;default:{const v=d*Math.PI*.5,f=h.kind==="c1"?[1,1]:h.kind==="c2"?[-1,1]:h.kind==="c3"?[-1,-1]:[1,-1],m=h.kind==="c1"?v:h.kind==="c2"?v+Math.PI*.5:h.kind==="c3"?v+Math.PI:v+Math.PI*1.5,p=f[0]*s,y=f[1]*n,g=Math.cos(m),b=Math.sin(m);c.x=p+g*a,c.y=y+b*a,c.nx=g,c.ny=b;break}}return c}return c.x=e,c.y=0,c.nx=1,c.ny=0,c}}}function en(){const e=[],t=(n,i,o,r,l)=>e.push({u:n,v:i,tier:o,row:r,face:l});t(0,0,-1,-1,"wall"),t(0,fe.base,-1,-1,"wall");let a=fe.moat,s=fe.base;t(a,s,-1,-1,"tread");for(let n=0;n<fe.lower.rows;n++)t(a,s+fe.lower.riser,0,n,"riser"),s+=fe.lower.riser,t(a+fe.lower.tread,s,0,n,"tread"),a+=fe.lower.tread;t(a+fe.concourse.depth,s+fe.concourse.rise,-1,-1,"tread"),a+=fe.concourse.depth,s+=fe.concourse.rise,t(a,s+2.4,-1,-1,"riser"),s+=2.4;for(let n=0;n<fe.upper.rows;n++)t(a,s+fe.upper.riser,1,n,"riser"),s+=fe.upper.riser,t(a+fe.upper.tread,s,1,n,"tread"),a+=fe.upper.tread;return t(a,s+fe.backWall,-1,-1,"riser"),t(a+1.6,s+fe.backWall,-1,-1,"tread"),e}function xi(){const e=en(),t=[];for(let a=0;a<e.length;a++){const s=e[a];s.face!=="tread"||s.tier<0||t.push({u:s.u-.34,v:s.v,tier:s.tier,row:s.row})}return t}const bi=288;function ks(e,t,a,s=!1){const n=t.length,i=new Float32Array(a*n*3),o=new Float32Array(a*n*3),r=new Float32Array(a*n*2),l=new Float32Array(a*n*3),c=[],u={};for(let d=0;d<a;d++){const v=d/(a-1);e.at(v,u);for(let f=0;f<n;f++){const m=t[f],p=d*n+f;i[p*3]=u.x+u.nx*m.u,i[p*3+1]=u.y+u.ny*m.u,i[p*3+2]=m.v;const y=t[Math.max(f-1,0)],g=t[Math.min(f+1,n-1)],b=g.u-y.u,k=g.v-y.v,x=Math.hypot(b,k)||1;let S=-k/x,z=b/x;s&&z<0&&(S=-S,z=-z);let w=u.nx*S,L=u.ny*S,T=z;const A=Math.hypot(w,L,T)||1;o[p*3]=w/A,o[p*3+1]=L/A,o[p*3+2]=T/A,r[p*2]=v*e.total,r[p*2+1]=m.v,l[p*3]=v*e.total,l[p*3+1]=m.tier,l[p*3+2]=m.row}}for(let d=0;d<a-1;d++)for(let v=0;v<n-1;v++){const f=d*n+v,m=f+n;c.push(f,m,f+1,m,m+1,f+1)}const h=new Ot;return h.setAttribute("position",new vt(i,3)),h.setAttribute("normal",new vt(o,3)),h.setAttribute("uv",new vt(r,2)),h.setAttribute("aInfo",new vt(l,3)),h.setIndex(c),h.computeBoundingSphere(),h}function Nt(e,{vertex:t="",fragment:a="",uniforms:s={},extraVert:n="",side:i,instanced:o=!1}={}){const r=o?"modelMatrix*instanceMatrix":"modelMatrix",l=o?"mat3(modelMatrix*instanceMatrix)":"mat3(modelMatrix)",c=o?"normalMatrix*(mat3(instanceMatrix)*nor)":"normalMatrix*nor";return new de({uniforms:je(e.uniforms(),s),lights:!0,side:i||gn,vertexShader:Qe(n)+`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      void main(){
        vec3 pos = position;
        vec3 nor = normal;
        ${t}
        vec4 wp = ${r}*vec4(pos, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(${l}*nor);
        vec4 worldPosition = wp;
        vec3 transformedNormal = ${c};
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,fragmentShader:Ze(`
      varying vec3 vWorld;
      varying vec3 vNormalW;
    `)+a})}const ki=`
  uniform vec3 uHome1; uniform vec3 uHome2;
  uniform vec3 uAway1; uniform vec3 uAway2;
  attributeHack
  varying vec3 vInfo;
  void main(){
    vec3 P = vWorld;
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCamPos - P);
    float arc = vInfo.x, tier = vInfo.y;

    // --- concrete -----------------------------------------------------
    float grain = fbm(P.xy*vec2(2.1, 2.1) + P.z*1.7, 4);
    vec3 agg = voronoi(P.xy*7.0 + P.z*3.0);
    vec3 conc = mix(vec3(0.112, 0.115, 0.122), vec3(0.052, 0.054, 0.060), grain*0.8);
    conc = mix(conc, vec3(0.090, 0.086, 0.074), smoothstep(0.08, 0.0, agg.x)*0.5);
    // water staining runs down the risers
    float stain = smoothstep(0.35, 0.9, fbm(vec2(arc*0.6, P.z*1.1), 4))*(1.0 - abs(N.z));
    conc = mix(conc, conc*0.55, stain*0.6);
    vec3 alb = conc;
    float rough = 0.86 - grain*0.08;
    float ao = mix(0.55, 1.0, smoothstep(0.0, 6.0, P.z))*mix(0.7, 1.0, abs(N.z));

    // --- seats --------------------------------------------------------
    if (tier >= 0.0){
      float seat = arc/${fe.seatPitch.toFixed(3)};
      float si = floor(seat);
      float sf = fract(seat);
      float aisle = step(0.986, fract(si/26.0 + 0.5));   // vomitory gaps
      // section colour: ends take the two sets of club colours, sides mix
      float endness = smoothstep(32.0, 70.0, abs(P.x));
      float home = step(P.x, 0.0);
      vec3 base = mix(vec3(0.045, 0.048, 0.055),
                      mix(mix(uAway1, uAway2, 0.35), mix(uHome1, uHome2, 0.35), home),
                      endness*0.85);
      // tifo blocks: big chequers of the club colours up in the tiers
      float blockA = step(0.5, mod(floor(arc/9.0) + floor(P.z/3.2), 2.0));
      base = mix(base, mix(base, home > 0.5 ? uHome2 : uAway2, 0.75), blockA*endness*0.45);
      float shell = 1.0 - smoothstep(0.30, 0.46, abs(sf-0.5));
      shell *= 1.0 - aisle;
      float backrest = smoothstep(0.0, 0.25, fract(P.z/0.42));
      vec3 seatCol = base*(0.75 + 0.45*shell)*(0.8 + 0.3*backrest);
      float m = shell*step(0.3, abs(N.z) + 0.3);
      alb = mix(alb, seatCol, m*0.92);
      rough = mix(rough, 0.42, m);
      ao *= mix(1.0, 0.72, m);
    }

    Surface s;
    s.P = P; s.N = N; s.V = V; s.albedo = alb;
    s.rough = clamp(rough, 0.05, 1.0); s.metal = 0.0; s.ao = ao; s.spec = 1.0;
    float shadow = getShadowMask();
    vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
    col += ambientLight(s);
    col += floodLights(s)*(0.35 + 0.65*shadow);
    col = applyFog(col, P, V);
    gl_FragColor = vec4(col, 1.0);
  }
`,Mi=`
  varying vec3 vInfo;
  void main(){
    vec3 P = vWorld;
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCamPos - P);
    bool under = N.z < 0.0 || dot(N, V) < 0.0;
    float panel = step(0.5, mod(floor(vInfo.x/4.0), 2.0));
    vec3 alb = mix(vec3(0.185, 0.195, 0.210), vec3(0.150, 0.158, 0.172), panel);
    float rib = smoothstep(0.08, 0.0, abs(fract(vInfo.x/1.35)-0.5)-0.42);
    alb = mix(alb, vec3(0.085, 0.090, 0.100), rib*0.8);
    float rough = mix(0.46, 0.30, rib);
    if (under) alb *= 0.34;
    Surface s;
    s.P = P; s.N = N; s.V = V; s.albedo = alb;
    s.rough = rough; s.metal = 0.25; s.ao = under ? 0.45 : 1.0; s.spec = 1.0;
    float shadow = getShadowMask();
    vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
    col += ambientLight(s);
    col += floodLights(s)*0.6;
    // the inner lip carries an LED strip: cheap, and it reads as "modern"
    float lip = smoothstep(1.2, 0.0, vInfo.z);
    col += vec3(0.65, 0.78, 1.0)*lip*uNight*1.4;
    col = applyFog(col, P, V);
    gl_FragColor = vec4(col, 1.0);
  }
`;function wi(e,t={}){const a=new St;a.name="stadium";const s=Js(),n=en(),i=t.tier>=2?bi:192,o=V=>new ga(V).convertSRGBToLinear(),r={uHome1:{value:new B(.1,.2,.6)},uHome2:{value:new B(.9,.9,.95)},uAway1:{value:new B(.6,.1,.12)},uAway2:{value:new B(.1,.1,.12)}},l=ks(s,n,i),c=Nt(e,{uniforms:r,extraVert:`attribute vec3 aInfo;
varying vec3 vInfo;`,vertex:"vInfo = aInfo;",fragment:ki.replace("attributeHack",""),side:Fe}),u=new ve(l,c);u.receiveShadow=!0,u.name="stands",a.add(u);const h=n[n.length-1],d=[],v=fe.moat+fe.lower.rows*fe.lower.tread*.52,f=10;for(let V=0;V<=f;V++){const $=V/f,Z=ht.lerp(h.u+2.2,v,$),Q=h.v+4+Math.pow(1-$,1.4)*2.2-$*.6;d.push({u:Z,v:Q,tier:-1,row:-1,face:"tread",tip:$})}const m=ks(s,d,i,!0);{const V=m.getAttribute("aInfo"),$=d.length;for(let Z=0;Z<i;Z++)for(let Q=0;Q<$;Q++)V.setZ(Z*$+Q,(1-Q/($-1))*2);V.needsUpdate=!0}const p=Nt(e,{extraVert:`attribute vec3 aInfo;
varying vec3 vInfo;`,vertex:"vInfo = aInfo;",fragment:Mi,side:Fe}),y=new ve(m,p);y.castShadow=!!t.roofShadow,y.name="roof",a.add(y);const g=Nt(e,{instanced:!0,fragment:`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = vec3(0.075, 0.080, 0.090);
        s.rough = 0.38; s.metal = 0.72; s.ao = 0.7; s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s)*0.7;
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `}),b=t.tier>=2?72:44,k=new la(1,1,1),x=new Qa(k,g,b*3),S=new He,z=new Tt,w=new B,L={};let T=0;for(let V=0;V<b;V++){const $=V/b;s.at($,L);const Z=Math.atan2(L.ny,L.nx),Q=new B(L.x+L.nx*v,L.y+L.ny*v,h.v+5.4),le=new B(L.x+L.nx*(h.u+2.2),L.y+L.ny*(h.u+2.2),h.v+4.2),ge=Q.clone().lerp(le,.5),Le=Q.distanceTo(le);z.setFromEuler(new Ba(0,0,Z)),w.set(Le,.34,.5),S.compose(ge,z,w),x.setMatrixAt(T++,S);for(let Me=0;Me<2;Me++){const ue=.3+Me*.4,Ve=Q.clone().lerp(le,ue),Se=1.4+Me*.5;S.compose(new B(Ve.x,Ve.y,Ve.z+Se*.5),z,w.set(.26,.26,Se)),x.setMatrixAt(T++,S)}}x.count=T,x.name="trusses",a.add(x);const A=Nt(e,{fragment:`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        float g = fbm(P.xy*3.0 + P.z*2.0, 3);
        Surface s;
        s.P = P; s.N = N; s.V = V;
        s.albedo = mix(vec3(0.065,0.070,0.078), vec3(0.030,0.032,0.038), g);
        s.rough = 0.80; s.metal = 0.0; s.ao = mix(0.45, 1.0, smoothstep(0.0, 1.6, P.z)); s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s)*0.8;
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `}),D=new St;for(const V of[-1,1]){const $=new St,Z=new ve(new la(9,2.6,1.9),A);Z.position.set(V*13.5,-(M.halfW+5.2),.95),$.add(Z);const Q=new ve(new la(9,.12,1.1),A);Q.position.set(V*13.5,-(M.halfW+3.95),1.5),$.add(Q),D.add($)}a.add(D);const N=Nt(e,{uniforms:{},extraVert:"varying vec2 vFlagUv;",vertex:`
      vFlagUv = uv;
      float w = uv.x;
      pos.y += sin(uTime*7.0 + uv.x*5.0)*0.10*w*w;
      pos.z += sin(uTime*5.3 + uv.x*7.0)*0.05*w;
    `,fragment:`
      varying vec2 vFlagUv;
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        Surface s;
        s.P = P; s.N = N; s.V = V;
        s.albedo = mix(vec3(0.55,0.12,0.03), vec3(0.62,0.52,0.03), step(0.5, fract(vFlagUv.x*2.0)));
        s.rough = 0.72; s.metal = 0.0; s.ao = 1.0; s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `,side:Fe}),J=Nt(e,{fragment:`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = vec3(0.42,0.44,0.46);
        s.rough = 0.35; s.metal = 0.1; s.ao = 1.0; s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `}),se=new Ja(.022,.022,1.5,8);se.rotateX(Math.PI/2);const K=new it(.45,.3,6,2);K.rotateX(Math.PI/2),K.translate(.225,0,0);for(const V of[-1,1])for(const $ of[-1,1]){const Z=new ve(se,J);Z.position.set(V*M.halfL,$*M.halfW,.75),Z.castShadow=!0,a.add(Z);const Q=new ve(K,N);Q.position.set(V*M.halfL,$*M.halfW,1.35),Q.rotation.z=V>0?$>0?2.3:3.9:$>0?.8:-.8,a.add(Q)}return{group:a,perimeter:s,profile:n,roofTop:h,tipU:v,setTeams(V,$){const Z=o(V.c1),Q=o(V.c2),le=o($.away1||$.c1),ge=o($.away2||$.c2);r.uHome1.value.set(Z.r,Z.g,Z.b),r.uHome2.value.set(Q.r,Q.g,Q.b),r.uAway1.value.set(le.r,le.g,le.b),r.uAway2.value.set(ge.r,ge.g,ge.b)}}}function Si(e,t={}){const a=Math.max(0,Math.min(2,t.tier|0)),s=a>=2?1:a>=1?3:6,n=Js(),i=xi(),o=fe.seatPitch*s,r=[],l=[],c={};for(const y of i){const g=Math.floor(n.total/o);for(let b=0;b<g;b++){const k=(b+y.row%2*.5)/g,x=k*n.total;Math.abs(x/fe.seatPitch%26-13)<.7||Math.random()<.075||(n.at(k,c),r.push(c.x+c.nx*y.u,c.y+c.ny*y.u,y.v+.3),l.push(Math.random(),Math.random(),Math.random(),y.tier))}}const u=l.length/4,h=new it(1,1),d=new Ut;d.index=h.index,d.attributes.position=h.attributes.position,d.attributes.uv=h.attributes.uv,d.setAttribute("aPos",new we(new Float32Array(r),3)),d.setAttribute("aSeed",new we(new Float32Array(l),4)),d.instanceCount=u,d.boundingSphere=new At(new B(0,0,10),200);const v=je(e.uniforms(),{uExcite:{value:.25},uWave:{value:-99},uHome1:{value:new B(.2,.3,.8)},uHome2:{value:new B(.9,.9,.9)},uAway1:{value:new B(.7,.15,.15)},uAway2:{value:new B(.1,.1,.1)}}),f=new de({uniforms:v,lights:!0,transparent:!1,side:Fe,vertexShader:Qe(`
      attribute vec3 aPos;
      attribute vec4 aSeed;
      uniform float uExcite;
      uniform float uWave;
      varying vec2 vUv;
      varying vec4 vSeed;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vStand;
    `)+`
      void main(){
        vUv = uv;
        vSeed = aSeed;
        float id = aSeed.x + aSeed.y*7.0;
        // bored sway, excited bounce, and a travelling wave when one is called
        float phase = uTime*(1.8 + aSeed.y*1.4) + id*6.28;
        float excite = clamp(uExcite + aSeed.z*0.25, 0.0, 1.4);
        float wavePos = atan(aPos.y, aPos.x*0.8);
        float wave = uWave < -90.0 ? 0.0
          : exp(-pow((wavePos - uWave)*2.2, 2.0));
        float stand = clamp(excite*1.1 - 0.25 + wave, 0.0, 1.0);
        float hop = max(sin(phase*1.6), 0.0)*stand*0.22;
        vStand = stand;

        vec3 c = aPos;
        c.z += hop + stand*0.26;
        float h = mix(0.95, 1.30, stand) + aSeed.y*0.12;
        float w = 0.62 + aSeed.x*0.10;

        // cylindrical billboard: yaw to the camera, never pitch
        vec3 toCam = uCamPos - c;
        vec2 f = normalize(vec2(toCam.x, toCam.y) + 1e-5);
        vec3 right = vec3(-f.y, f.x, 0.0);
        vec3 sway = right*sin(phase*0.7)*0.035*(1.0 - stand*0.5);
        vec3 wp = c + right*(uv.x - 0.5)*w + vec3(0.0, 0.0, (uv.y - 0.5)*h) + sway;

        vWorld = wp;
        vNormalW = vec3(f, 0.35);
        vec4 worldPosition = vec4(wp, 1.0);
        vec3 transformedNormal = normalMatrix*vec3(f, 0.35);
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*worldPosition;
      }
    `,fragmentShader:Ze(`
      uniform vec3 uHome1; uniform vec3 uHome2;
      uniform vec3 uAway1; uniform vec3 uAway2;
      uniform float uExcite;
      varying vec2 vUv;
      varying vec4 vSeed;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying float vStand;
    `)+`
      void main(){
        vec2 uvv = vUv;
        float x = (uvv.x - 0.5)*2.0;         // -1..1 across the body
        float y = uvv.y;                      // 0 = seat, 1 = top of head

        // --- silhouette ---------------------------------------------------
        float headY = 0.82;
        float head = step(length(vec2(x*1.9, (y-headY)*1.55)), 0.26);
        float shoulderW = 0.80 + vSeed.x*0.12;
        float body = step(abs(x), shoulderW*(1.0 - smoothstep(0.55, 0.92, y)*0.45))
                   * step(y, headY - 0.055) * step(0.02, y);
        // arms up when standing: two raised columns either side of the head
        float arms = 0.0;
        if (vStand > 0.45){
          float ax = abs(abs(x) - 0.72);
          arms = step(ax, 0.17)*step(0.45, y)*step(y, 1.0);
        }
        float mask = clamp(head + body + arms, 0.0, 1.0);
        if (mask < 0.5) discard;

        // --- who is this -------------------------------------------------
        float home = step(vWorld.x, 0.0);
        float endness = smoothstep(26.0, 62.0, abs(vWorld.x));
        vec3 kitA = mix(uAway1, uHome1, home);
        vec3 kitB = mix(uAway2, uHome2, home);
        float pick = fract(vSeed.x*13.37 + vSeed.y*7.11);
        vec3 shirt = pick < 0.34 + endness*0.42 ? kitA
                   : pick < 0.52 + endness*0.30 ? kitB
                   : vec3(0.055, 0.058, 0.065) + vec3(hash12(vSeed.xy*31.0), hash12(vSeed.yz*17.0), hash12(vSeed.zx*23.0))*0.22;
        vec3 skinTone = mix(vec3(0.42, 0.28, 0.21), vec3(0.72, 0.52, 0.40), fract(vSeed.z*5.77));
        skinTone = mix(skinTone, vec3(0.16, 0.10, 0.07), step(0.72, fract(vSeed.z*5.77 + 0.3))*0.8);
        vec3 hair = mix(vec3(0.03, 0.025, 0.02), vec3(0.22, 0.16, 0.08), fract(vSeed.y*9.1));

        vec3 alb = shirt;
        if (head > 0.5){
          float hairLine = step(y, headY + 0.02 + 0.10*fract(vSeed.x*3.1));
          alb = hairLine > 0.5 ? skinTone : hair;
        }
        if (arms > 0.5 && head < 0.5 && body < 0.5) alb = mix(skinTone, shirt, step(y, 0.72));

        // Folds, and a deliberately cheap shade: this shader runs for every
        // pixel of thirty thousand people, so it gets a Lambert term, a
        // hemisphere ambient and one summed floodlight -- not the full BRDF,
        // not a shadow lookup (the stands are outside the shadow frustum).
        alb *= 0.84 + 0.22*hash12(floor(vec2(x*6.0, y*9.0)) + vSeed.xy*17.0);
        float curve = sqrt(max(1.0 - x*x*0.85, 0.0));

        vec3 P = vWorld;
        vec3 N = normalize(vec3(vNormalW.xy, 0.55) + vec3(x*0.8, 0.0, 0.0));
        vec3 V = normalize(uCamPos - P);
        float ao = (0.45 + 0.55*curve)*mix(0.55, 1.0, smoothstep(0.0, 0.5, y));
        float NoL = max(dot(N, uSunDir), 0.0);
        vec3 col = alb*RECIPROCAL_PI*uSunColor*NoL*curve;
        col += alb*skyIrradiance(N)*ao;
        if (uNight > 0.01){
          // one lumped rig: the stands are far enough that four is wasted
          vec3 lp = uFlood[0].xyz;
          vec3 d = lp - P;
          float att = uFlood[0].w*26000.0/max(dot(d, d), 64.0);
          col += alb*RECIPROCAL_PI*uFloodColor*att*0.5*uNight*ao*max(dot(N, normalize(d)), 0.25);
        }

        // --- phone flashes -------------------------------------------------
        // Only worth drawing at night, and rare enough to read as individual
        // pops rather than static.
        float flashRate = uNight*(0.00035 + uExcite*0.0016);
        float slot = floor(uTime*6.0);
        float fl = step(1.0 - flashRate, hash12(vec2(slot, vSeed.x*521.0 + vSeed.y*77.0)));
        col += vec3(1.0, 0.96, 0.88)*fl*step(y, 0.72)*step(0.48, y)*22.0;

        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `}),m=new ve(d,f);m.frustumCulled=!1,m.name="crowd",m.receiveShadow=!0;let p=.25;return{mesh:m,count:u,update(y,g){p+=(g-p)*Math.min(1,y*2.2),v.uExcite.value=p,v.uWave.value>-90&&(v.uWave.value+=y*1.7,v.uWave.value>4.2&&(v.uWave.value=-99))},startWave(){v.uWave.value<-90&&(v.uWave.value=-3.4)},setTeams(y,g){const b=w=>new ga(w).convertSRGBToLinear(),k=b(y.c1),x=b(y.c2),S=b(g.away1||g.c1),z=b(g.away2||g.c2);v.uHome1.value.set(k.r,k.g,k.b),v.uHome2.value.set(x.r,x.g,x.b),v.uAway1.value.set(S.r,S.g,S.b),v.uAway2.value.set(z.r,z.g,z.b)}}}const dt=44;function Ti(e){return new de({uniforms:je(e.uniforms()),lights:!0,vertexShader:Qe()+`
      varying vec3 vWorld; varying vec3 vNormalW;
      void main(){
        vec4 wp = modelMatrix*instanceMatrix*vec4(position, 1.0);
        vWorld = wp.xyz;
        mat3 m = mat3(modelMatrix*instanceMatrix);
        vNormalW = normalize(m*normal);
        vec4 worldPosition = wp;
        vec3 transformedNormal = normalMatrix*mat3(instanceMatrix)*normal;
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,fragmentShader:Ze(`
      varying vec3 vWorld; varying vec3 vNormalW;
    `)+`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        float r = fbm(P.xz*4.0 + P.y*2.0, 3);
        Surface s;
        s.P = P; s.N = N; s.V = V;
        s.albedo = mix(vec3(0.085,0.090,0.098), vec3(0.135,0.138,0.145), r);
        s.rough = 0.42 + r*0.18; s.metal = 0.62; s.ao = 0.85; s.spec = 1.0;
        vec3 col = directLight(s, uSunDir, uSunColor)*getShadowMask();
        col += ambientLight(s) + floodLights(s)*(0.4 + 0.6*getShadowMask());
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `})}function Pi(e,t={}){const a=new St;a.name="floodlights";const s=Ti(e),n=new la(1,1,1),i=[[1,1],[-1,1],[-1,-1],[1,-1]].map(([z,w])=>new B(z*(fe.innerX+14),w*(fe.innerY+10),0)),o=52,r=new Qa(n,s,i.length*o),l=new He,c=new Tt,u=new B,h=new B;let d=0;for(const z of i){const w=Math.atan2(-z.y,-z.x),L=2.1;for(let T=0;T<4;T++){const A=w+Math.PI*.25+T*Math.PI*.5,D=Math.cos(A)*L,N=Math.sin(A)*L;h.set(z.x+D*.5,z.y+N*.5,dt*.5),c.setFromEuler(new Ba(Math.atan2(N*.5,dt)*.9,-Math.atan2(D*.5,dt)*.9,0)),u.set(.3,.3,dt),l.compose(h,c,u),r.setMatrixAt(d++,l)}for(let T=0;T<16;T++){const A=2+T*(dt-4)/16,D=L*(1-A/dt*.45);for(let N=0;N<3;N++){const J=w+Math.PI*.25+N*Math.PI*.5;h.set(z.x+Math.cos(J+.785)*D*.5,z.y+Math.sin(J+.785)*D*.5,A),c.setFromEuler(new Ba(0,T%2?.5:-.5,J+.785)),u.set(D*1.45,.16,.16),l.compose(h,c,u),r.setMatrixAt(d++,l)}}}r.count=d,r.castShadow=!1,a.add(r);const v=Object.assign(e.uniforms(),{}),f=new de({uniforms:v,transparent:!0,depthWrite:!1,blending:ea,side:Fe,vertexShader:`
      ${ze}
      attribute vec3 aCentre;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vCentre;
      void main(){
        vUv = uv;
        vCentre = aCentre;
        // billboard each lamp so the glare always faces the camera
        vec3 toCam = normalize(uCamPos - aCentre);
        vec3 right = normalize(cross(vec3(0.0,0.0,1.0), toCam));
        vec3 up = cross(toCam, right);
        float s = 1.55 + 5.0*uNight;
        vec3 wp = aCentre + (right*(uv.x-0.5) + up*(uv.y-0.5))*s;
        vWorld = wp;
        gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
      }
    `,fragmentShader:`
      #include <common>
      ${ze}
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vCentre;
      void main(){
        float d = length(vUv - 0.5)*2.0;
        if (d > 1.0) discard;
        vec3 V = normalize(uCamPos - vCentre);
        vec3 aim = normalize(vec3(0.0,0.0,1.0) - vCentre);
        // a lamp is brightest when you are looking down its barrel
        float facing = clamp(dot(V, -aim)*0.5 + 0.55, 0.0, 1.0);
        float core = pow(max(1.0 - d, 0.0), 6.0);
        float glow = pow(max(1.0 - d, 0.0), 1.6);
        float lit = max(uNight, 0.25);
        vec3 col = uFloodColor*(core*120.0 + glow*7.0)*lit*facing;
        gl_FragColor = vec4(col, 1.0);
      }
    `}),m=new it(1,1),p=new Ut;p.index=m.index,p.attributes.position=m.attributes.position,p.attributes.uv=m.attributes.uv;const y=7,g=4,b=[],k=[];for(const z of i){const w=dt-2,L=Math.atan2(-z.y,-z.x),T=new B(-Math.sin(L),Math.cos(L),0);for(let A=0;A<g;A++)for(let D=0;D<y;D++){const N=(D-(y-1)/2)*1.5,J=w+(A-(g-1)/2)*1.25;b.push(z.x+T.x*N+Math.cos(L)*1.2,z.y+T.y*N+Math.sin(L)*1.2,J)}k.push(new B(z.x,z.y,w))}p.setAttribute("aCentre",new we(new Float32Array(b),3)),p.instanceCount=b.length/3,p.boundingSphere=new At(new B(0,0,dt),300);const x=new ve(p,f);x.frustumCulled=!1,x.renderOrder=8,a.add(x);const S=new St;if(t.shafts!==!1){const z=new de({uniforms:Object.assign(e.uniforms(),{uShaft:{value:1}}),transparent:!0,depthWrite:!1,blending:ea,side:Fe,vertexShader:`
        ${ze}
        varying vec3 vWorld;
        varying vec2 vLocal;
        varying vec3 vNormalW;
        void main(){
          vec4 wp = modelMatrix*vec4(position, 1.0);
          vWorld = wp.xyz;
          vLocal = vec2(uv.x, length(position.xy));
          vNormalW = normalize(mat3(modelMatrix)*normal);
          gl_Position = projectionMatrix*viewMatrix*wp;
        }
      `,fragmentShader:`
        #include <common>
        ${ze}
        ${Ke}
        uniform float uShaft;
        varying vec3 vWorld;
        varying vec2 vLocal;
        varying vec3 vNormalW;
        void main(){
          vec3 V = normalize(uCamPos - vWorld);
          vec3 N = normalize(vNormalW);
          // The cone stands in for a volume: a view ray through the middle of
          // the beam travels through the most lit air, a ray at the silhouette
          // through almost none. Without this the cone shows its hard edge.
          float thickness = pow(abs(dot(N, V)), 1.5);
          // dust: slowly drifting motes make the shaft breathe
          float dust = 0.55 + 0.45*fbm3(vWorld*0.09 + vec3(uWind*uTime*0.15, uTime*0.03), 3);
          float along = clamp(vLocal.x, 0.0, 1.0);
          float fade = (1.0 - along)*along*4.0;              // thin at both ends
          float ground = smoothstep(0.5, 9.0, vWorld.z);
          float a = uShaft*uNight*dust*fade*thickness*0.085*ground;
          a *= mix(0.45, 1.0, 1.0 - abs(dot(V, vec3(0.0,0.0,1.0))));
          gl_FragColor = vec4(uFloodColor*a*1.9, 1.0);
        }
      `});for(const w of k){const L=new B(w.x*.12,w.y*.12,1),A=L.clone().sub(w).length(),D=new Ja(34,3.2,A,20,1,!0);D.translate(0,A*.5,0),D.rotateX(Math.PI/2);const N=D.getAttribute("position"),J=D.getAttribute("uv");for(let K=0;K<N.count;K++)J.setX(K,N.getZ(K)/A);J.needsUpdate=!0;const se=new ve(D,z);se.position.copy(w),se.lookAt(L),se.renderOrder=6,S.add(se)}a.add(S)}return{group:a,towers:k,shafts:S,attach(z){z.setTowers(k,z.floodLevel)}}}function Ci(){const a=document.createElement("canvas");a.width=2048,a.height=192;const s=a.getContext("2d"),n=[{t:"PITCH 26 ULTRA",s:"#0a1430",f:"#8fd8ff",a:"PROCEDURAL FOOTBALL"},{t:"AURORA MOTORS",s:"#13052a",f:"#ff7ad9",a:"DRIVE THE NIGHT"},{t:"NEOGRID ENERGY",s:"#04231a",f:"#7dffb2",a:"100% RENEWABLE"},{t:"KUROGANE STEEL",s:"#2a0a0a",f:"#ffb86b",a:"FORGED FOR THE GAME"},{t:"HALCYON AIR",s:"#061a2e",f:"#ffffff",a:"FLY WITH THE CHAMPIONS"},{t:"SOLARIS BANK",s:"#2b1a00",f:"#ffd98a",a:"OFFICIAL PARTNER"}],i=2048/n.length;n.forEach((r,l)=>{const c=l*i,u=s.createLinearGradient(c,0,c+i,192);u.addColorStop(0,r.s),u.addColorStop(1,"#000000"),s.fillStyle=u,s.fillRect(c,0,i,192),s.fillStyle=r.f,s.font=`900 ${Math.round(192*.46)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,s.textAlign="center",s.textBaseline="middle",s.fillText(r.t,c+i/2,192*.4),s.font=`600 ${Math.round(192*.17)}px system-ui, sans-serif`,s.globalAlpha=.85,s.fillText(r.a,c+i/2,192*.74),s.globalAlpha=1,s.strokeStyle="rgba(255,255,255,0.10)",s.lineWidth=3,s.strokeRect(c+6,6,i-12,180)});const o=new Ns(a);return o.colorSpace=xn,o.wrapS=bn,o.wrapT=Jt,o.minFilter=Ws,o.generateMipmaps=!0,o.anisotropy=4,o}function zi(e){const t=M.halfL+M.runOffX-1.2,a=M.halfW+M.runOffY-2.2,s=.95,n=[],i=(p,y,g,b)=>{const k=Math.hypot(g-p,b-y),x=Math.max(2,Math.round(k/3));for(let S=0;S<x;S++){const z=S/x,w=(S+1)/x;n.push({a:[p+(g-p)*z,y+(b-y)*z],b:[p+(g-p)*w,y+(b-y)*w],u0:z*k/14,u1:w*k/14})}};i(t,-a,-t,-a),i(-t,a,t,a),i(t,a,t,-a),i(-t,-a,-t,a);const o=[],r=[],l=[],c=[];let u=0;for(const p of n){const y=p.b[0]-p.a[0],g=p.b[1]-p.a[1],b=Math.hypot(y,g)||1,k=-g/b*Math.sign(1),x=y/b,S=p.a[0]*k+p.a[1]*x>0?-1:1,z=.17;o.push(p.a[0],p.a[1],.02,p.b[0],p.b[1],.02,p.a[0]-k*S*z,p.a[1]-x*S*z,s,p.b[0]-k*S*z,p.b[1]-x*S*z,s);for(let w=0;w<4;w++)l.push(k*S,x*S,.26);r.push(p.u0,0,p.u1,0,p.u0,1,p.u1,1),c.push(u,u+1,u+2,u+1,u+3,u+2),u+=4}const h=new Ot;h.setAttribute("position",new Xe(o,3)),h.setAttribute("normal",new Xe(l,3)),h.setAttribute("uv",new Xe(r,2)),h.setIndex(c),h.computeBoundingSphere();const d=Ci(),v=je(e.uniforms(),{uAd:{value:d},uScroll:{value:0},uGoal:{value:0}}),f=new de({uniforms:v,lights:!0,side:Fe,vertexShader:Qe()+`
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix*vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix)*normal);
        vec4 worldPosition = wp;
        vec3 transformedNormal = normalMatrix*normal;
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,fragmentShader:Ze(`
      uniform sampler2D uAd;
      uniform float uScroll;
      uniform float uGoal;
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
    `)+`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        vec2 auv = vec2(vUv.x*0.33 + uScroll, 1.0 - vUv.y);
        vec3 led = texture2D(uAd, auv).rgb;
        led = pow(led, vec3(2.2));                 // to linear
        // pixel structure: the panels are 8 mm pitch, visible on a close shot
        float px = sin(vUv.x*2400.0)*0.5+0.5;
        float py = sin(vUv.y*120.0)*0.5+0.5;
        float grid = mix(0.72, 1.0, px*py);
        // goal flash: the boards go white and strobe
        float flash = uGoal*(0.5 + 0.5*sin(uTime*26.0));
        vec3 emis = (led*grid*5.2 + vec3(flash)*7.0)*(0.55 + 0.95*uNight);
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = led*0.1;
        s.rough = 0.22; s.metal = 0.0; s.ao = 0.9; s.spec = 1.6;
        vec3 col = emis;
        col += directLight(s, uSunDir, uSunColor)*getShadowMask()*0.5;
        col += ambientLight(s)*0.5;
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `}),m=new ve(h,f);return m.name="hoardings",{mesh:m,update(p,y){v.uScroll.value=(v.uScroll.value+p*.035)%1,v.uGoal.value=y}}}const Re=M.goalHalf,_e=M.goalHeight,Ee=M.goalDepth,Ms=.06;class Li{constructor(t,a=1){this.side=t,this.NU=Math.max(14,Math.round(34*a)),this.NV=Math.max(6,Math.round(12*a)),this.RU=Math.max(14,Math.round(34*a)),this.RV=Math.max(4,Math.round(8*a));const s=this.NU*this.NV+this.RU*this.RV;this.n=s,this.pos=new Float32Array(s*3),this.prev=new Float32Array(s*3),this.rest=new Float32Array(s*3),this.pin=new Uint8Array(s),this.springs=[],this.build()}idx(t,a){return a*this.NU+t}ridx(t,a){return this.NU*this.NV+a*this.RU+t}wall(t,a){const s=this.side*M.halfL,n=Ee+2*Re+Ee,i=t*n,o=a*_e;return i<Ee?[s+this.side*i,-Re,o]:i<Ee+2*Re?[s+this.side*Ee,-Re+(i-Ee),o]:[s+this.side*(n-i),Re,o]}build(){const{NU:t,NV:a,RU:s,RV:n}=this;for(let o=0;o<a;o++)for(let r=0;r<t;r++){const l=this.idx(r,o),c=this.wall(r/(t-1),o/(a-1));this.set(l,c),this.pin[l]=r===0||r===t-1||o===0||o===a-1?1:0}for(let o=0;o<n;o++)for(let r=0;r<s;r++){const l=this.ridx(r,o),c=r/(s-1),u=this.wall(c,1),h=[this.side*M.halfL,ht.clamp(u[1],-Re,Re),_e],d=o/(n-1),v=[ht.lerp(h[0],u[0],d),ht.lerp(h[1],u[1],d),_e-.02*d];this.set(l,v),this.pin[l]=o===0||r===0||r===s-1||o===n-1?1:0}const i=(o,r)=>{const l=this.pos[o*3]-this.pos[r*3],c=this.pos[o*3+1]-this.pos[r*3+1],u=this.pos[o*3+2]-this.pos[r*3+2];this.springs.push(o,r,Math.hypot(l,c,u))};for(let o=0;o<a;o++)for(let r=0;r<t;r++)r+1<t&&i(this.idx(r,o),this.idx(r+1,o)),o+1<a&&i(this.idx(r,o),this.idx(r,o+1)),r+1<t&&o+1<a&&i(this.idx(r,o),this.idx(r+1,o+1));for(let o=0;o<n;o++)for(let r=0;r<s;r++)r+1<s&&i(this.ridx(r,o),this.ridx(r+1,o)),o+1<n&&i(this.ridx(r,o),this.ridx(r,o+1));this.springArr=new Float32Array(this.springs),this.springs=null}set(t,a){this.pos[t*3]=a[0],this.pos[t*3+1]=a[1],this.pos[t*3+2]=a[2],this.prev[t*3]=a[0],this.prev[t*3+1]=a[1],this.prev[t*3+2]=a[2],this.rest[t*3]=a[0],this.rest[t*3+1]=a[1],this.rest[t*3+2]=a[2]}step(t,a,s){const{pos:n,prev:i,rest:o,pin:r,n:l}=this,c=-9.81*t*t*.35,u=.986,h=s.x*t*t*.25,d=s.y*t*t*.25;for(let m=0;m<l;m++){if(r[m])continue;const p=m*3;for(let y=0;y<3;y++){const g=n[p+y];let b=(g-i[p+y])*u;b+=(o[p+y]-g)*.055,y===2?b+=c:b+=y===0?h:d,i[p+y]=g,n[p+y]=g+b}}if(a){const m=a.x,p=a.y,y=a.z,g=H.r+.1,b=Math.hypot(a.vx,a.vy,a.vz);for(let k=0;k<l;k++){if(r[k])continue;const x=k*3,S=n[x]-m,z=n[x+1]-p,w=n[x+2]-y,L=Math.hypot(S,z,w);if(L<g){const T=g-L,A=1/Math.max(L,1e-4);n[x]+=S*A*T,n[x+1]+=z*A*T,n[x+2]+=w*A*T;const D=Math.min(b,36)*.0012;n[x]+=a.vx*D,n[x+1]+=a.vy*D,n[x+2]+=a.vz*D}}}const v=this.springArr,f=3;for(let m=0;m<f;m++)for(let p=0;p<v.length;p+=3){const y=v[p]*3,g=v[p+1]*3,b=v[p+2],k=n[g]-n[y],x=n[g+1]-n[y+1],S=n[g+2]-n[y+2],z=Math.hypot(k,x,S)||1e-5,w=(z-b)/z*.5,L=r[v[p]],T=r[v[p+1]];if(L&&T)continue;const A=L?0:T?1:.5,D=T?0:L?1:.5;n[y]+=k*w*A*2*.5,n[y+1]+=x*w*A*2*.5,n[y+2]+=S*w*A*2*.5,n[g]-=k*w*D*2*.5,n[g+1]-=x*w*D*2*.5,n[g+2]-=S*w*D*2*.5}}makeGeometry(){const{NU:t,NV:a,RU:s,RV:n}=this,i=[],o=new Float32Array(this.n*2),r=Ee+2*Re+Ee;for(let c=0;c<a;c++)for(let u=0;u<t;u++){const h=this.idx(u,c);if(o[h*2]=u/(t-1)*r,o[h*2+1]=c/(a-1)*_e,u+1<t&&c+1<a){const d=h,v=this.idx(u+1,c),f=this.idx(u,c+1),m=this.idx(u+1,c+1);i.push(d,v,f,v,m,f)}}for(let c=0;c<n;c++)for(let u=0;u<s;u++){const h=this.ridx(u,c);if(o[h*2]=u/(s-1)*r,o[h*2+1]=_e+c/(n-1)*Ee,u+1<s&&c+1<n){const d=h,v=this.ridx(u+1,c),f=this.ridx(u,c+1),m=this.ridx(u+1,c+1);i.push(d,v,f,v,m,f)}}const l=new Ot;return l.setAttribute("position",new vt(this.pos,3)),l.setAttribute("uv",new vt(o,2)),l.setIndex(i),l.computeVertexNormals(),l.boundingSphere=new At(new B(this.side*(M.halfL+Ee*.5),0,_e*.5),8),l}}function Ri(e,t={}){const a=new St;a.name="goals";const s=t.tier>=2?1:.62,n=new de({uniforms:je(e.uniforms()),lights:!0,vertexShader:Qe()+`
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix*vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix)*normal);
        vec4 worldPosition = wp;
        vec3 transformedNormal = normalMatrix*normal;
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,fragmentShader:Ze(`
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
    `)+`
      void main(){
        vec3 P = vWorld; vec3 N = normalize(vNormalW); vec3 V = normalize(uCamPos-P);
        // powder-coated aluminium: scuffed near the ground, chalky up high
        float scuff = fbm(vec2(vUv.x*22.0, P.z*7.0), 3);
        float low = smoothstep(1.2, 0.0, P.z);
        vec3 alb = mix(vec3(0.78, 0.785, 0.79), vec3(0.52, 0.53, 0.55), scuff*0.35*low);
        vec3 Nw = normalize(N + vec3(fbmS(vec2(vUv.x*40.0, P.z*20.0), 2))*0.03);
        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = 0.26 + scuff*0.14; s.metal = 0.08; s.ao = 1.0; s.spec = 1.4;
        float shadow = getShadowMask();
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        col += ambientLight(s);
        col += floodLights(s)*(0.40 + 0.60*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `}),i=new de({uniforms:je(e.uniforms()),lights:!0,transparent:!0,depthWrite:!1,side:Fe,vertexShader:Qe()+`
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix*vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix)*normal);
        vec4 worldPosition = wp;
        vec3 transformedNormal = normalMatrix*normal;
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,fragmentShader:Ze(`
      varying vec3 vWorld; varying vec3 vNormalW; varying vec2 vUv;
    `)+`
      void main(){
        // cord grid, 10 cm mesh, 2.2 mm cord, antialiased by screen footprint
        // Box-filtered cord grid: crisp when magnified, converging on the
        // true area coverage when a cell drops below a pixel. Without the
        // second half a net turns into a flickering white sheet at distance.
        const float MESH = 0.105;             // 10.5 cm mesh
        const float CORD = 0.023;             // cord half-width, in cells
        vec2 g = vUv/MESH;
        vec2 d = abs(fract(g) - 0.5);
        vec2 fw = fwidth(g) + 1e-5;
        vec2 sharp = clamp((CORD - d)/fw + 0.5, 0.0, 1.0);
        vec2 avg = vec2(min(1.0, 2.0*CORD));
        vec2 cov = mix(sharp, avg, clamp(fw*1.6, 0.0, 1.0));
        float a = 1.0 - (1.0 - cov.x)*(1.0 - cov.y);
        if (a < 0.006) discard;

        vec3 P = vWorld;
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(uCamPos - P);
        if (dot(N, V) < 0.0) N = -N;
        Surface s;
        s.P = P; s.N = N; s.V = V;
        s.albedo = vec3(0.80, 0.82, 0.84);
        s.rough = 0.55; s.metal = 0.0; s.ao = 0.9; s.spec = 1.0;
        float shadow = getShadowMask();
        // cords are thin: light wraps right around them
        float NoL = dot(N, uSunDir);
        vec3 col = s.albedo*RECIPROCAL_PI*wrapDiffuse(NoL, 0.8)*uSunColor*shadow*1.6;
        col += ambientLight(s)*1.2;
        col += floodLights(s)*mix(0.6, 1.0, shadow)*1.3;
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, a);
      }
    `}),o=[],r=new Ja(Ms,Ms,1,12,1,!1);r.rotateX(Math.PI/2),r.translate(0,0,.5);for(const h of[1,-1]){const d=h*M.halfL;for(const g of[-1,1]){const b=new ve(r,n);b.position.set(d,g*Re,0),b.scale.set(1,1,_e),b.castShadow=!0,a.add(b);const k=new ve(r,n);k.position.set(d+h*Ee,g*Re,0),k.scale.set(.7,.7,_e*.92),k.castShadow=!0,a.add(k)}const v=new ve(r,n);v.position.set(d,-Re,_e),v.scale.set(1,1,Re*2),v.rotation.x=-Math.PI/2,v.castShadow=!0,a.add(v);const f=new ve(r,n);f.position.set(d+h*Ee,-Re,_e*.92),f.scale.set(.7,.7,Re*2),f.rotation.x=-Math.PI/2,a.add(f);for(const g of[-1,1]){const b=new ve(r,n);b.position.set(d,g*Re,_e),b.scale.set(.6,.6,Ee),b.rotation.y=h*Math.PI/2,a.add(b)}const m=new Li(h,s),p=m.makeGeometry(),y=new ve(p,i);y.frustumCulled=!1,y.renderOrder=4,y.name=`net${h>0?"A":"B"}`,a.add(y),o.push({cloth:m,geo:p,mesh:y})}const l=new De;let c=0,u=0;for(const h of o)h.live=1.5;return{group:a,nets:o,update(h,d,v){l.copy(v),c=Math.min(c+h,.1);const f=1/90;let m=0;const p=d&&Math.abs(d.x)>M.halfL-4.5?Math.sign(d.x):0;for(const g of o)p===g.cloth.side?g.live=2.2:g.live=Math.max(0,g.live-h);u=(u+1)%6;const y=u===0;for(;c>=f&&m<4;){for(const g of o)g.live<=0&&!y||g.cloth.step(f,p===g.cloth.side?d:null,l);c-=f,m++}if(m)for(const g of o)g.live<=0&&!y||(g.geo.getAttribute("position").needsUpdate=!0,g.geo.computeVertexNormals())}}}const C={pelvis:0,chest:1,neck:2,crown:3,shL:4,elbL:5,wriL:6,fingL:7,shR:8,elbR:9,wriR:10,fingR:11,hipL:12,kneeL:13,ankL:14,toeL:15,hipR:16,kneeR:17,ankR:18,toeR:19,COUNT:20},pe={hipH:.925,spine:.465,neck:.115,head:.135,shoulder:.186,hip:.105,upperArm:.295,foreArm:.265,hand:.085,thigh:.455,shin:.425,foot:.235};function ws(e,t,a,s,n,i,o,r,l,c,u,h){let d=s-e,v=n-t,f=i-a,m=Math.hypot(d,v,f);const p=(o+r)*.998;if(m>p){const T=p/m;d*=T,v*=T,f*=T,m=p}m<1e-4&&(m=1e-4,f=-m);const y=d/m,g=v/m,b=f/m,k=F((m*m+o*o-r*r)/(2*m),-o,o),x=Math.sqrt(Math.max(o*o-k*k,0));let S=l-y*(l*y+c*g+u*b),z=c-g*(l*y+c*g+u*b),w=u-b*(l*y+c*g+u*b);const L=Math.hypot(S,z,w);return L<1e-5?(S=-b,z=0,w=y):(S/=L,z/=L,w/=L),h[0]=e+y*k+S*x,h[1]=t+g*k+z*x,h[2]=a+b*k+w*x,h}const $e=[0,0,0];function Ai(e,t,a,s){const n=e.speed||0,i=I(n/7.4),o=e.sprint?1:0,r=Math.cos(e.facing),l=Math.sin(e.facing),c=-l,u=r,h=e.animPhase;let d=pe.hipH,v=.07+i*.21+o*.05,f=e.lean*.8,m=-e.lean*.5,p=0,y=0,g=0,b=0,k=0;const x=e.state,S=e.kickAnim>0?I(1-e.kickAnim/.26):-1;if(x==="slide"){const W=I(e.stateT/O.slideTime);k=Math.min(1,W*6),d=q(pe.hipH,.3,k),v=q(v,-.95,k),b=3}else if(x==="dive"){const W=I(e.stateT/O.gkDiveTime);k=Math.min(1,W*5);const G=Math.sin(Math.PI*Math.min(W*1.15,1));d=q(pe.hipH,.42+G*.62,k),v=q(v,-.15,k);const Y=Math.sin(e.diveDir-e.facing);f=q(f,F(Y,-1,1)*1.25,k),b=2}else if(x==="getup"){const W=I(e.stateT/.55);p=(1-W)*.42,d-=p,v+=(1-W)*.5,b=3}else if(x==="stunned")d-=.12,v+=.45,b=3;else if(x==="celebrate"){const W=Math.max(0,Math.sin(e.stateT*7.2));d+=W*.18,v-=.12,b=1}const z=x==="run"?-.016+Math.cos(h*2)*.02*(.3+i):0,w=d+z,L=Math.cos(v),T=Math.sin(v),A=r*T+c*Math.sin(f)*.9,D=l*T+u*Math.sin(f)*.9,N=L*Math.cos(f*.6),J=Math.hypot(A,D,N)||1,se=A/J,K=D/J,V=N/J,$=e.x+y,Z=e.y+g,Q=(W,G,Y,R)=>{a[W*3]=G,a[W*3+1]=Y,a[W*3+2]=R};Q(C.pelvis,$,Z,w);const le=$+se*pe.spine,ge=Z+K*pe.spine,Le=w+V*pe.spine;Q(C.chest,le,ge,Le);const Me=v*.35,ue=r*Math.sin(Me),Ve=l*Math.sin(Me),Se=Math.cos(Me),Ge=le+ue*pe.neck,Je=ge+Ve*pe.neck,xt=Le+Se*pe.neck;Q(C.neck,Ge,Je,xt),Q(C.crown,Ge+ue*pe.head,Je+Ve*pe.head,xt+Se*pe.head);const Dt=c*Math.cos(m)+r*Math.sin(m),bt=u*Math.cos(m)+l*Math.sin(m),oa=c*Math.cos(-m*.6)+r*Math.sin(-m*.6),X=u*Math.cos(-m*.6)+l*Math.sin(-m*.6);for(let W=0;W<2;W++){const G=W===0?1:-1,Y=$+oa*pe.hip*G,R=Z+X*pe.hip*G,te=w-.015;Q(W===0?C.hipL:C.hipR,Y,R,te);const _=(h+(W===0?0:Math.PI))%pt/pt,P=.42+i*.95+o*.12;let be,Pe;const Ae=.58;if(_<Ae){const ce=_/Ae;be=q(P*.5,-P*.45,ce),Pe=.058+Math.sin(Math.PI*ce)*.006}else{const ce=(_-Ae)/(1-Ae),lt=ce*ce*(3-2*ce);be=q(-P*.45,P*.5,lt),Pe=.058+Math.sin(Math.PI*ce)*(.085+i*.17)}n<.35&&(be*=.12,Pe=.058);let ie=Y+r*be,xe=R+l*be,ee=Pe,Oe=0;if(S>=0&&e.kickFoot>=0==(W===1)){const ce=S,lt=ce<.34?q(0,-.62,ce/.34):ce<.62?q(-.62,.78,(ce-.34)/.28):q(.78,.3,(ce-.62)/.38),Xt=ce<.34?.1+ce*.5:ce<.62?.22+Math.sin((ce-.34)/.28*Math.PI)*.28:.42-(ce-.62)*.6;ie=Y+r*lt,xe=R+l*lt,ee=Math.max(.055,Xt),Oe=lt*.5}if(x==="slide"){const ce=W===0?1:.45;ie=$+r*(.55+ce*.5),xe=Z+l*(.55+ce*.5)+c*.12*G,ee=q(ee,.09+(1-ce)*.18,k)}else if(x==="dive"){const ce=W===0?.9:.55;ie=$-r*.15+c*ce*.35*G,xe=Z-l*.15+u*ce*.35*G,ee=q(ee,w-.25,k*.8)}else x==="celebrate"&&(ie=Y+r*(W===0?.2:-.2),xe=R+l*(W===0?.2:-.2));ws(Y,R,te,ie,xe,ee,pe.thigh,pe.shin,r,l,.12,$e),Q(W===0?C.kneeL:C.kneeR,$e[0],$e[1],$e[2]),Q(W===0?C.ankL:C.ankR,ie,xe,ee);const ct=F(Oe+(ee-.058)*1.2,-.5,.9);Q(W===0?C.toeL:C.toeR,ie+r*pe.foot*Math.cos(ct),xe+l*pe.foot*Math.cos(ct),ee+Math.sin(ct)*pe.foot*.5)}for(let W=0;W<2;W++){const G=W===0?1:-1,Y=le+Dt*pe.shoulder*G,R=ge+bt*pe.shoulder*G,te=Le+.055;Q(W===0?C.shL:C.shR,Y,R,te);let j,_,P;const be=Math.sin(h+(W===0?Math.PI:0))*(.22+i*.55);if(b===1){const ee=Math.sin(t*6+G)*.12;j=Y-r*.1+c*G*(.3+ee),_=R-l*.1+u*G*(.3+ee),P=te+.62}else if(b===2)j=Y+r*.12+c*G*.78,_=R+l*.12+u*G*.78,P=te+.3+(G>0?.1:-.05);else if(b===3)j=Y-r*.34+c*G*.26,_=R-l*.34+u*G*.26,P=te-.42;else{const ee=e.hasBall?.7:1,Oe=.03+.14*i+be*.42*ee;j=Y+r*Oe+c*G*(.03+i*.03),_=R+l*Oe+u*G*(.03+i*.03),P=te-.555+i*.13+Math.abs(be)*.09}ws(Y,R,te,j,_,P,pe.upperArm,pe.foreArm,-r*.8+c*G*.22,-l*.8+u*G*.22,-.45,$e),Q(W===0?C.elbL:C.elbR,$e[0],$e[1],$e[2]),Q(W===0?C.wriL:C.wriR,j,_,P);const Pe=j-$e[0],Ae=_-$e[1],ie=P-$e[2],xe=Math.hypot(Pe,Ae,ie)||1;Q(W===0?C.fingL:C.fingR,j+Pe/xe*pe.hand,_+Ae/xe*pe.hand,P+ie/xe*pe.hand)}return s&&(s.fx=r,s.fy=l,s.lean=v,s.roll=f,s.spine=[se,K,V],s.stride=i,s.airborne=x==="dive"?1:0,s.contact=x==="run"&&n>.4?1:0),a}function Wt(e=.75,t=10,a=4,s=.15,n=.15,i=1){const o=[],r=[],l=[],c=[],u=[];for(let f=3;f>=1;f--){const m=f/3*Math.PI*.5;u.push({z:-Math.sin(m)*s*.9,r:Math.cos(m),nz:-Math.sin(m),v:0})}for(let f=0;f<=a;f++){const m=f/a;u.push({z:m,r:1+(e-1)*m,nz:0,v:m})}for(let f=1;f<=3;f++){const m=f/3*Math.PI*.5;u.push({z:1+Math.sin(m)*n*.9*e,r:e*Math.cos(m),nz:Math.sin(m),v:1})}for(let f=0;f<u.length;f++){const m=u[f];for(let p=0;p<=t;p++){const y=p/t*Math.PI*2,g=Math.cos(y)*i,b=Math.sin(y);o.push(g*m.r,b*m.r,m.z);const k=Math.hypot(g,b,m.nz)||1;r.push(g/k,b/k,m.nz/k),l.push(p/t,m.v)}}const d=t+1;for(let f=0;f<u.length-1;f++)for(let m=0;m<t;m++){const p=f*d+m,y=p+d;c.push(p,p+1,y,y,p+1,y+1)}const v=new Ot;return v.setAttribute("position",new Xe(o,3)),v.setAttribute("normal",new Xe(r,3)),v.setAttribute("uv",new Xe(l,2)),v.setIndex(c),v}function Di(e=16){const t=[[0,.98,1],[.14,.9,.98],[.32,.92,1.02],[.52,1,1.06],[.72,1.06,1.02],[.88,.98,.94],[1,.62,.8]],a=[],s=[],n=[],i=[],o=.66;for(let c=0;c<t.length;c++){const[u,h,d]=t[c];for(let v=0;v<=e;v++){const f=v/e*Math.PI*2,m=Math.cos(f)*h*o*d,p=Math.sin(f)*h;a.push(m,p,u);const y=Math.cos(f)/(o*d),g=Math.sin(f),b=t[Math.max(c-1,0)],k=t[Math.min(c+1,t.length-1)],x=(k[1]-b[1])/Math.max(k[0]-b[0],.001),S=Math.hypot(y,g,-x)||1;s.push(y/S,g/S,-x/S),n.push(v/e,u)}}const r=e+1;for(let c=0;c<t.length-1;c++)for(let u=0;u<e;u++){const h=c*r+u,d=h+r;i.push(h,h+1,d,d,h+1,d+1)}const l=new Ot;return l.setAttribute("position",new Xe(a,3)),l.setAttribute("normal",new Xe(s,3)),l.setAttribute("uv",new Xe(n,2)),l.setIndex(i),l}function Fi(){const a=document.createElement("canvas");a.width=960,a.height=128;const s=a.getContext("2d");s.clearRect(0,0,a.width,128),s.fillStyle="#ffffff",s.font=`900 ${Math.round(128*.92)}px "Arial Black", Impact, system-ui, sans-serif`,s.textAlign="center",s.textBaseline="middle";for(let i=0;i<10;i++)s.fillText(String(i),96*i+96/2,128*.52);const n=new Ns(a);return n.colorSpace=kn,n.minFilter=Ws,n.anisotropy=4,n}const Ni=`
  attribute vec4 aColA;   // shirt primary rgb, pattern id
  attribute vec4 aColB;   // shirt secondary rgb, squad number
  attribute vec4 aColC;   // shorts rgb, sweat 0..1
  attribute vec4 aColD;   // socks rgb, mud 0..1
  attribute vec4 aColE;   // skin rgb, hair style
  attribute vec4 aColF;   // hair rgb, user highlight
  attribute vec4 aFlags;  // isGK, speed, seed, team
`,Wi=`
  // Woven cloth: warp and weft at right angles, plus a little slub noise.
  vec3 weaveNormal(vec2 uv, vec3 N, vec3 T, vec3 B, float scale, float amp){
    float warp = sin(uv.x*scale*6.2831);
    float weft = sin(uv.y*scale*6.2831*1.12);
    float slub = fbm(uv*scale*0.45, 2) - 0.5;
    vec3 n = normalize(N + T*(warp*amp + slub*amp*0.6) + B*(weft*amp));
    return n;
  }
  // Charlie sheen lobe on top of a wrapped diffuse: reads as cloth, not vinyl.
  vec3 clothShade(Surface s, vec3 L, vec3 radiance, vec3 sheenColor, float sheenRough){
    vec3 H = normalize(L+s.V);
    float NoL = max(dot(s.N, L), 0.0);
    float NoV = max(dot(s.N, s.V), 1e-4);
    float NoH = max(dot(s.N, H), 0.0);
    float VoH = max(dot(s.V, H), 0.0);
    float wrap = wrapDiffuse(dot(s.N, L), 0.22);
    vec3 diff = s.albedo*RECIPROCAL_PI*wrap;
    float Ds = D_Charlie(NoH, sheenRough);
    float Vs = V_Ashikhmin(NoV, NoL);
    vec3 sheen = sheenColor*Ds*Vs;
    float a = max(s.rough*s.rough, 2e-3);
    vec3 F = F_Schlick(vec3(0.035), VoH);
    vec3 spec = F*D_GGX(NoH, a)*V_SmithGGX(NoV, NoL, a);
    return (diff + sheen + spec*0.6)*radiance*max(NoL, 0.0001);
  }
`;function Mt(e,t){return Qe(Ni+`
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying vec2 vUv;
    varying vec4 vA; varying vec4 vB; varying vec4 vC;
    varying vec4 vD; varying vec4 vE; varying vec4 vF; varying vec4 vFl;
    ${e}
  `)+`
    void main(){
      vUv = uv;
      vA = aColA; vB = aColB; vC = aColC; vD = aColD; vE = aColE; vF = aColF; vFl = aFlags;
      vec3 pos = position;
      vec3 nor = normal;
      ${t}
      vec4 wp = modelMatrix*instanceMatrix*vec4(pos, 1.0);
      mat3 im = mat3(instanceMatrix);
      vWorld = wp.xyz;
      vNormalW = normalize(mat3(modelMatrix)*(im*nor));
      vec4 worldPosition = wp;
      vec3 transformedNormal = normalMatrix*(im*nor);
      ${rt}
      gl_Position = projectionMatrix*viewMatrix*wp;
    }
  `}function Yt(e,t=""){return Ze(`
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying vec2 vUv;
    varying vec4 vA; varying vec4 vB; varying vec4 vC;
    varying vec4 vD; varying vec4 vE; varying vec4 vF; varying vec4 vFl;
    ${Wi}
    ${t}
  `)+e}const _t=`
  vec3 N = normalize(vNormalW);
  vec3 up = normalize(vec3(0.0, 0.0, 1.0));
  vec3 T = normalize(cross(up, N) + 1e-5);
  vec3 B = cross(N, T);
`;function Vi(e,t={}){const s=t.tier|0,n=s>=2?12:8,i=new St;i.name="players";const o={aColA:new we(new Float32Array(96),4),aColB:new we(new Float32Array(96),4),aColC:new we(new Float32Array(96),4),aColD:new we(new Float32Array(96),4),aColE:new we(new Float32Array(96),4),aColF:new we(new Float32Array(96),4),aFlags:new we(new Float32Array(96),4)};for(const W in o)o[W].setUsage(Vs);const r=Fi(),l=()=>je(e.uniforms(),{uNum:{value:r}}),c=W=>{const G=W.clone();for(const Y in o)G.setAttribute(Y,o[Y]);return G},u=new de({uniforms:l(),lights:!0,vertexShader:Mt("",`
      // the shirt is loose: the hem and the back flutter with pace and wind
      float loose = smoothstep(0.55, 0.0, pos.z)*0.6 + smoothstep(0.35, 0.95, pos.z)*0.25;
      float sp = aFlags.y;
      float f = sin(pos.z*9.0 - uTime*(7.0 + sp*2.5) + aFlags.z*6.28)
              * (0.012 + sp*0.0075 + length(uWind)*0.006);
      pos += nor*f*loose;
    `),fragmentShader:Yt(`
      uniform sampler2D uNum;
      void main(){
        vec3 P = vWorld;
        ${_t}
        vec3 V = normalize(uCamPos - P);
        float u = vUv.x, v = vUv.y;
        float pattern = vA.w;
        vec3 c1 = vA.xyz, c2 = vB.xyz;
        float back = smoothstep(0.18, 0.32, abs(u - 0.5));   // 1 on the back/front midline

        // --- kit pattern -------------------------------------------------
        vec3 alb = c1;
        if (pattern < 0.5){                      // plain, with a tonal panel
          alb = mix(c1, c1*0.86, smoothstep(0.45, 0.55, abs(u-0.5)));
        } else if (pattern < 1.5){                // vertical stripes
          float s = step(0.5, fract(u*10.0));
          alb = mix(c1, c2, s);
        } else if (pattern < 2.5){                // hoops
          float s = step(0.5, fract(v*7.0));
          alb = mix(c1, c2, s);
        } else if (pattern < 3.5){                // sash
          float d = abs(fract(u + v*0.85 + 0.25) - 0.5);
          alb = mix(c2, c1, smoothstep(0.10, 0.16, d));
        } else {                                  // halves
          alb = mix(c1, c2, step(0.5, fract(u + 0.25)));
        }
        // collar + sleeve trim + hem piping
        float collar = smoothstep(0.90, 0.97, v);
        alb = mix(alb, c2, collar*0.9);
        alb = mix(alb, c2*0.9, smoothstep(0.055, 0.0, v)*0.8);

        // --- squad number on the back ------------------------------------
        float num = vB.w;
        if (num > 0.5){
          vec2 nuv = vec2((u - 0.5)*3.6 + 0.5, (v - 0.555)*4.0);
          float tens = floor(num/10.0);
          float ones = mod(num, 10.0);
          float glyph = 0.0;
          if (tens < 0.5){
            if (nuv.x > 0.25 && nuv.x < 0.75 && nuv.y > 0.0 && nuv.y < 1.0)
              glyph = texture2D(uNum, vec2((ones + (nuv.x-0.25)*2.0)/10.0, 1.0-nuv.y)).r;
          } else {
            if (nuv.x > 0.06 && nuv.x < 0.94 && nuv.y > 0.0 && nuv.y < 1.0){
              float which = step(0.5, nuv.x);
              float local = (nuv.x - (which > 0.5 ? 0.5 : 0.06))/0.44;
              float d = mix(tens, ones, which);
              glyph = texture2D(uNum, vec2((d + local)/10.0, 1.0-nuv.y)).r;
            }
          }
          // A striped or hooped kit cannot carry a flat number, so the panel
          // behind it settles to the primary colour first -- which is what
          // real kits do -- and the digits get an outline either way.
          float onBack = step(abs(u - 0.5), 0.42);
          float panel = (1.0 - smoothstep(0.26, 0.36, abs(nuv.x - 0.5)))
                      * (1.0 - smoothstep(0.46, 0.60, abs(nuv.y - 0.5)));
          alb = mix(alb, c1, clamp(panel, 0.0, 1.0)*0.80*onBack*step(0.5, pattern));
          float lum = dot(c1, vec3(0.299, 0.587, 0.114));
          vec3 numCol = lum > 0.20 ? vec3(0.025) : vec3(0.86);
          vec3 numEdge = lum > 0.20 ? vec3(0.86) : vec3(0.025);
          float core = smoothstep(0.45, 0.62, glyph);
          float edge = smoothstep(0.10, 0.32, glyph) - core;
          alb = mix(alb, numEdge, clamp(edge, 0.0, 1.0)*0.85*onBack);
          alb = mix(alb, numCol, core*onBack);
        }

        // --- fabric ------------------------------------------------------
        float px = max(length(vec2(dFdx(vUv.x), dFdy(vUv.x))), 1e-5);
        float micro = 1.0 - smoothstep(0.004, 0.03, px);
        vec3 Nw = weaveNormal(vUv*vec2(1.0, 2.0), N, T, B, 190.0, 0.055*micro);
        // folds that follow the body
        float fold = fbmS(vec2(u*9.0, v*14.0) + vFl.z*17.0, 3);
        Nw = normalize(Nw + T*fold*0.22 + B*fold*0.12);
        alb *= 0.93 + 0.14*fbm(vUv*vec2(14.0, 22.0) + vFl.z*5.0, 3);
        alb *= 1.0 - max(fold, 0.0)*0.10;

        // --- sweat + mud --------------------------------------------------
        float sweat = vC.w;
        float sweatMask = smoothstep(0.45, 0.95, fbm(vUv*vec2(5.0, 7.0) + 3.1, 3))
                        * (smoothstep(0.75, 0.35, v) + smoothstep(0.55, 0.95, v)*0.6);
        sweatMask = clamp(sweatMask*sweat*1.6, 0.0, 1.0);
        float mud = clamp(vD.w*smoothstep(0.42, 0.0, v)*fbm(vUv*11.0, 3)*2.2, 0.0, 1.0);
        alb = mix(alb, alb*0.45, sweatMask);
        alb = mix(alb, vec3(0.075, 0.055, 0.038), mud*0.85);


        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = mix(0.68, 0.30, sweatMask) + mud*0.2;
        s.metal = 0.0;
        s.ao = 0.78 + 0.22*v;
        s.spec = 1.0 + sweatMask*2.0;
        float shadow = getShadowMask();
        vec3 sheenCol = vec3(0.085)*(1.0 + 1.6*sweatMask);
        vec3 col = clothShade(s, uSunDir, uSunColor*shadow, sheenCol, 0.32);
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `)}),h=(W,G,Y="")=>new de({uniforms:l(),lights:!0,vertexShader:Mt("",`
      float f = sin(pos.z*11.0 - uTime*8.0 + aFlags.z*6.28)*0.006*aFlags.y;
      pos += nor*f*smoothstep(0.7, 0.0, pos.z);
    `),fragmentShader:Yt(`
      void main(){
        vec3 P = vWorld;
        ${_t}
        vec3 V = normalize(uCamPos - P);
        float u = vUv.x, v = vUv.y;
        vec3 alb = ${W};
        ${Y}
        float px = max(length(vec2(dFdx(vUv.x), dFdy(vUv.x))), 1e-5);
        float micro = 1.0 - smoothstep(0.004, 0.03, px);
        vec3 Nw = weaveNormal(vUv*vec2(1.0, 3.0), N, T, B, 150.0, 0.05*micro);
        float fold = fbmS(vec2(u*11.0, v*18.0) + vFl.z*9.0, 3);
        Nw = normalize(Nw + T*fold*0.25);
        alb *= 0.92 + 0.15*fbm(vUv*vec2(12.0, 26.0), 3);
        float mud = clamp(vD.w*fbm(vUv*13.0, 3)*2.0*smoothstep(0.8, 0.1, v), 0.0, 1.0);
        alb = mix(alb, vec3(0.070, 0.052, 0.036), mud*0.9);
        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = ${G}; s.metal = 0.0; s.ao = 0.80 + 0.2*v; s.spec = 1.0 + vC.w;
        float shadow = getShadowMask();
        vec3 col = clothShade(s, uSunDir, uSunColor*shadow, vec3(0.075), 0.34);
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `)}),d=h("mix(vC.xyz, vA.xyz, step(0.47, abs(u-0.5))*0.55)","0.66"),v=h("mix(vD.xyz, vA.xyz, smoothstep(0.80, 0.92, v)*0.85)","0.72","alb = mix(alb, vD.xyz*0.75, step(0.5, fract(v*6.0))*0.10);"),f=W=>Yt(`
    void main(){
      vec3 P = vWorld;
      ${_t}
      vec3 V = normalize(uCamPos - P);
      float u = vUv.x, v = vUv.y;
      vec3 skin = vE.xyz;
      vec3 alb = skin;
      float roughv = 0.52;
      ${W}
      // skin has pores, not a mirror finish
      vec3 Nw = normalize(N + T*(fbmS(vUv*vec2(60.0, 90.0), 2)*0.06));
      alb *= 0.95 + 0.10*fbm(vUv*vec2(30.0, 40.0), 2);
      Surface s;
      s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
      s.rough = roughv - vC.w*0.18; s.metal = 0.0; s.ao = 0.84; s.spec = 1.0 + vC.w*1.8;
      float shadow = getShadowMask();
      // wrapped diffuse + a warm transmission term: the cheap subsurface trick
      float NoL = dot(s.N, uSunDir);
      vec3 col = s.albedo*RECIPROCAL_PI*wrapDiffuse(NoL, 0.45)*uSunColor*shadow;
      col += vec3(0.26, 0.085, 0.045)*s.albedo*max(0.0, 0.28-abs(NoL))*uSunColor*0.30*shadow;
      vec3 H = normalize(uSunDir+V);
      float a = max(s.rough*s.rough, 2e-3);
      col += F_Schlick(vec3(0.028*s.spec), max(dot(V,H),0.0))
           * D_GGX(max(dot(s.N,H),0.0), a)*V_SmithGGX(max(dot(s.N,V),1e-4), max(NoL,0.0), a)
           * uSunColor*max(NoL, 0.0)*shadow;
      col += ambientLight(s);
      col += floodLights(s)*(0.35 + 0.65*shadow);
      col = applyFog(col, P, V);
      gl_FragColor = vec4(col, 1.0);
    }
  `),m=new de({uniforms:l(),lights:!0,vertexShader:Mt("",""),fragmentShader:f("")}),p=new de({uniforms:l(),lights:!0,vertexShader:Mt("",""),fragmentShader:f(`
      float cuff = vFl.x > 0.5 ? 0.92 : 0.58;           // keepers wear long sleeves
      float isShirt = 1.0 - smoothstep(cuff - 0.06, cuff, v);
      vec3 shirt = mix(vA.xyz, vB.xyz, smoothstep(0.86, 1.0, v)*0.7);
      alb = mix(alb, shirt, isShirt);
      roughv = mix(roughv, 0.66, isShirt);
    `)}),y=new de({uniforms:l(),lights:!0,vertexShader:Mt("",""),fragmentShader:f(`
      // the face: brow shadow, eye sockets, mouth line, hairline at the back
      float front = cos((u - 0.0)*6.2831);         // 1 at u=0 (facing forward)
      float eye = smoothstep(0.55, 0.85, front)*smoothstep(0.06, 0.0, abs(v - 0.60));
      float brow = smoothstep(0.45, 0.9, front)*smoothstep(0.05, 0.0, abs(v - 0.66));
      float mouth = smoothstep(0.75, 1.0, front)*smoothstep(0.035, 0.0, abs(v - 0.45));
      alb = mix(alb, alb*0.30, clamp(eye*1.2, 0.0, 1.0));
      alb = mix(alb, alb*0.62, brow*0.7);
      alb = mix(alb, alb*0.55, mouth*0.8);
      alb = mix(alb, vF.xyz, smoothstep(0.62, 0.95, 1.0-front)*smoothstep(0.52, 0.78, v)*0.85);
      roughv = 0.44;
    `)}),g=new de({uniforms:l(),lights:!0,vertexShader:Mt("",`
      // hair style: the cap is scaled and flattened per player
      float style = vE.w;
      pos.xy *= mix(0.96, 1.12, style);
      pos.z *= mix(0.72, 1.18, style);
      pos += nor*fbm(uv*vec2(14.0, 9.0) + style*7.0, 3)*0.07*style;
    `),fragmentShader:Yt(`
      void main(){
        vec3 P = vWorld;
        ${_t}
        vec3 V = normalize(uCamPos - P);
        vec3 alb = vF.xyz;
        float strand = fbm(vUv*vec2(130.0, 34.0), 3);
        alb *= 0.72 + 0.55*strand;
        vec3 Nw = normalize(N + T*(strand-0.5)*0.5);
        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = 0.36; s.metal = 0.0; s.ao = 0.7; s.spec = 1.4;
        float shadow = getShadowMask();
        // anisotropic-ish highlight along the strand direction
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `)}),b=new de({uniforms:l(),lights:!0,vertexShader:Mt("",""),fragmentShader:Yt(`
      void main(){
        vec3 P = vWorld;
        ${_t}
        vec3 V = normalize(uCamPos - P);
        float u = vUv.x, v = vUv.y;
        float seed = vFl.z;
        vec3 bootCol = mix(vec3(0.015, 0.016, 0.020), vA.xyz*0.55,
                           step(0.55, fract(seed*3.77)));
        bootCol = mix(bootCol, vec3(0.55, 0.52, 0.03), step(0.82, fract(seed*7.13))*0.8);
        vec3 alb = bootCol;
        // sole, plus a trim flash down the side
        alb = mix(alb, vec3(0.16, 0.16, 0.17), smoothstep(0.10, 0.0, v)*0.9);
        float trim = smoothstep(0.06, 0.0, abs(fract(u+0.25)-0.5)-0.18);
        alb = mix(alb, vec3(0.85, 0.85, 0.88), trim*0.25);
        // grass stain + mud
        float stain = fbm(vUv*vec2(18.0, 9.0), 3);
        alb = mix(alb, vec3(0.055, 0.085, 0.030), smoothstep(0.55, 0.9, stain)*0.5);
        alb = mix(alb, vec3(0.060, 0.044, 0.030), clamp(vD.w*1.4, 0.0, 1.0)*0.8);
        vec3 Nw = normalize(N + T*(fbmS(vUv*vec2(45.0, 30.0), 2)*0.1));
        Surface s;
        s.P = P; s.N = Nw; s.V = V; s.albedo = alb;
        s.rough = mix(0.22, 0.52, stain); s.metal = 0.0; s.ao = 0.7; s.spec = 2.2;
        float shadow = getShadowMask();
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `)}),k=c(Wt(.74,n,3,.17,.15)),x=c(Wt(.82,n,2,.15,.17)),S=c(Di(s>=2?20:12)),z=c(Wt(.96,n+2,3,.44,.4,.88)),w=c(Wt(.92,n+2,2,.1,.8,.92)),L=c(Wt(.58,n,2,.24,.17,1.25)),T=c(Wt(.85,8,1,1,1,.8)),A=(W,G,Y)=>{const R=new Qa(W,G,24);return R.castShadow=!0,R.receiveShadow=!1,R.frustumCulled=!1,R.name=Y,R.count=0,i.add(R),R},D={torso:A(S,u,"torso"),head:A(z,y,"head"),hair:A(w,g,"hair"),thighL:A(k,d,"thighL"),thighR:A(k,d,"thighR"),shinL:A(x,v,"shinL"),shinR:A(x,v,"shinR"),armUL:A(k,p,"armUL"),armUR:A(k,p,"armUR"),armLL:A(x,m,"armLL"),armLR:A(x,m,"armLR"),handL:A(T,m,"handL"),handR:A(T,m,"handR"),bootL:A(L,b,"bootL"),bootR:A(L,b,"bootR")},N=new Float32Array(C.COUNT*3),J={},se=new He,K=new B,V=new B,$=new B,Z=new Tt,Q=new Tt,le=new B,ge=new B,Le=new B,Me=new B(0,0,1);function ue(W,G,Y,R,te,j,_,P){K.set(W,G,Y),V.set(R,te,j),$.subVectors(V,K);const be=$.length()||1e-4;if($.divideScalar(be),Z.setFromUnitVectors(Me,$),P){le.set(1,0,0).applyQuaternion(Z),ge.set(0,1,0).applyQuaternion(Z);const Pe=Math.atan2(P.dot(ge),P.dot(le));Z.multiply(Q.setFromAxisAngle(Me,Pe))}return se.compose(K,Z,Le.set(_,_,be)),se}const Ve=new B,Se=new Map,Ge=W=>{let G=Se.get(W);return G||(G=new ga(W).convertSRGBToLinear(),Se.set(W,G)),G},Je=["#f2cfa8","#e3b084","#c88e5e","#9c663c","#6f452a","#4a2f1d"],xt=["#120d0a","#2b1f17","#4a3222","#8a6a3f","#c9a85f","#0d0d0d","#5a1f12"],Dt={plain:0,stripes:1,hoops:2,sash:3,halves:4};let bt="";function oa(W){const G=W.teams.map(R=>R.club.id+R.kit).join("|");if(G===bt)return;bt=G;const Y=W.players;for(let R=0;R<Y.length&&R<24;R++){const te=Y[R],j=W.teams[te.team],_=j.club,P=j.kit===1,be=te.isGK,Pe=be?P?"#1d2630":"#2bd07a":P?_.away1:_.c1,Ae=be?P?"#49566a":"#0d7a45":P?_.away2:_.c2,ie=be?P?"#121820":"#0f3f27":P?_.away2:_.c3||_.c2,xe=be?Pe:P?_.away1:_.c1,ee=be?0:Dt[_.pat]!==void 0?Dt[_.pat]:0,Oe=te.uid*2654435761%1e3/1e3,et=Ge(Je[Math.floor(Oe*971)%Je.length]),ct=Ge(xt[Math.floor(Oe*613)%xt.length]),ce=Ge(Pe),lt=Ge(Ae),Xt=Ge(ie),Pa=Ge(xe),kt=(ia,ra,ln,un,fn,hn)=>{ia.array[ra*4]=ln,ia.array[ra*4+1]=un,ia.array[ra*4+2]=fn,ia.array[ra*4+3]=hn};kt(o.aColA,R,ce.r,ce.g,ce.b,ee),kt(o.aColB,R,lt.r,lt.g,lt.b,te.shirt||0),kt(o.aColC,R,Xt.r,Xt.g,Xt.b,0),kt(o.aColD,R,Pa.r,Pa.g,Pa.b,0),kt(o.aColE,R,et.r,et.g,et.b,Oe),kt(o.aColF,R,ct.r,ct.g,ct.b,0),kt(o.aFlags,R,be?1:0,0,Oe,te.team)}for(const R in o)o[R].needsUpdate=!0}function X(W,G,Y){const R=W.players,te=Math.min(R.length,24);for(const j in D)D[j].count=te;for(let j=0;j<te;j++){const _=R[j];Ai(_,G,N,J);const P=(et,ct)=>N[et*3+ct];Ve.set(J.fx,J.fy,0),D.torso.setMatrixAt(j,ue(P(C.pelvis,0),P(C.pelvis,1),P(C.pelvis,2),P(C.neck,0),P(C.neck,1),P(C.neck,2),.168,Ve)),D.head.setMatrixAt(j,ue(P(C.neck,0),P(C.neck,1),P(C.neck,2),P(C.crown,0),P(C.crown,1),P(C.crown,2),.105,Ve)),D.hair.setMatrixAt(j,ue(P(C.neck,0)+(P(C.crown,0)-P(C.neck,0))*.45,P(C.neck,1)+(P(C.crown,1)-P(C.neck,1))*.45,P(C.neck,2)+(P(C.crown,2)-P(C.neck,2))*.45,P(C.crown,0),P(C.crown,1),P(C.crown,2),.108,Ve));const Pe=.078,Ae=.058,ie=.05,xe=.042;D.thighL.setMatrixAt(j,ue(P(C.hipL,0),P(C.hipL,1),P(C.hipL,2),P(C.kneeL,0),P(C.kneeL,1),P(C.kneeL,2),Pe,null)),D.thighR.setMatrixAt(j,ue(P(C.hipR,0),P(C.hipR,1),P(C.hipR,2),P(C.kneeR,0),P(C.kneeR,1),P(C.kneeR,2),Pe,null)),D.shinL.setMatrixAt(j,ue(P(C.kneeL,0),P(C.kneeL,1),P(C.kneeL,2),P(C.ankL,0),P(C.ankL,1),P(C.ankL,2),Ae,null)),D.shinR.setMatrixAt(j,ue(P(C.kneeR,0),P(C.kneeR,1),P(C.kneeR,2),P(C.ankR,0),P(C.ankR,1),P(C.ankR,2),Ae,null)),D.armUL.setMatrixAt(j,ue(P(C.shL,0),P(C.shL,1),P(C.shL,2),P(C.elbL,0),P(C.elbL,1),P(C.elbL,2),ie,null)),D.armUR.setMatrixAt(j,ue(P(C.shR,0),P(C.shR,1),P(C.shR,2),P(C.elbR,0),P(C.elbR,1),P(C.elbR,2),ie,null)),D.armLL.setMatrixAt(j,ue(P(C.elbL,0),P(C.elbL,1),P(C.elbL,2),P(C.wriL,0),P(C.wriL,1),P(C.wriL,2),xe,null)),D.armLR.setMatrixAt(j,ue(P(C.elbR,0),P(C.elbR,1),P(C.elbR,2),P(C.wriR,0),P(C.wriR,1),P(C.wriR,2),xe,null));const ee=_.isGK?.062:.048;D.handL.setMatrixAt(j,ue(P(C.wriL,0),P(C.wriL,1),P(C.wriL,2),P(C.fingL,0),P(C.fingL,1),P(C.fingL,2),ee,null)),D.handR.setMatrixAt(j,ue(P(C.wriR,0),P(C.wriR,1),P(C.wriR,2),P(C.fingR,0),P(C.fingR,1),P(C.fingR,2),ee,null)),D.bootL.setMatrixAt(j,ue(P(C.ankL,0),P(C.ankL,1),P(C.ankL,2),P(C.toeL,0),P(C.toeL,1),P(C.toeL,2),.047,null)),D.bootR.setMatrixAt(j,ue(P(C.ankR,0),P(C.ankR,1),P(C.ankR,2),P(C.toeR,0),P(C.toeR,1),P(C.toeR,2),.047,null));const Oe=Math.min(1,(1-_.stamina)*1.5+_.speed/9*.35);if(o.aColC.array[j*4+3]=Oe,o.aFlags.array[j*4+1]=Math.min(1,_.speed/8),(_.state==="slide"||_.state==="dive")&&(o.aColD.array[j*4+3]=Math.min(1,(o.aColD.array[j*4+3]||0)+.02)),Y&&_.state==="run"&&_.speed>1.2){const et=N[C.ankL*3+2]<N[C.ankR*3+2]?C.ankL:C.ankR;N[et*3+2]<.075&&Y.add(N[et*3],N[et*3+1],.17+_.speed*.012,_.facing,.55,_.speed>6?.22:.07,.12,Math.min(.5,_.speed*.05))}Y&&(_.state==="slide"||_.state==="dive")&&_.speed>1.5&&Y.add(_.x,_.y,.55,_.facing,.95,.75,.6,1)}for(const j in D)D[j].instanceMatrix.needsUpdate=!0;o.aColC.needsUpdate=!0,o.aColD.needsUpdate=!0,o.aFlags.needsUpdate=!0}return{group:i,parts:D,setSquads:oa,update:X,attrs:o}}function Gi(){const e=(1+Math.sqrt(5))/2,t=[];for(const n of[-1,1])for(const i of[-1,1])t.push([0,n,i*e],[n,i*e,0],[i*e,0,n]);const a=t.map(n=>new B(...n).normalize()),s=[];for(let n=0;n<a.length;n++)for(let i=n+1;i<a.length;i++)for(let o=i+1;o<a.length;o++){const r=a[n].distanceTo(a[i]),l=a[i].distanceTo(a[o]),c=a[n].distanceTo(a[o]),u=1.0515;Math.abs(r-u)<.02&&Math.abs(l-u)<.02&&Math.abs(c-u)<.02&&s.push(new B().add(a[n]).add(a[i]).add(a[o]).normalize())}return{pent:a,hex:s}}function Bi(e,t={}){const{pent:a,hex:s}=Gi(),n=a.concat(s),i=new Float32Array(96);for(let x=0;x<32;x++){const S=n[x]||new B(0,0,1);i[x*3]=S.x,i[x*3+1]=S.y,i[x*3+2]=S.z}const o=[];for(let x=0;x<32;x++)o.push(new B(i[x*3],i[x*3+1],i[x*3+2]));const r=new Mn(H.r,t.tier>=2?5:3),l=je(e.uniforms(),{uCentres:{value:o},uDirt:{value:0},uSpinBlur:{value:0},uDeform:{value:new qa(0,0,1,0)}}),c=new de({uniforms:l,lights:!0,vertexShader:Qe(`
      uniform vec4 uDeform;
    `)+`
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
      void main(){
        vLocal = normalize(position);
        // A struck ball is not a sphere for the first few milliseconds: squash
        // it along the contact axis and let it bulge at the equator.
        vec3 pos = position;
        if (uDeform.w > 0.001){
          vec3 ax = normalize(uDeform.xyz);
          float along = dot(pos, ax);
          vec3 perp = pos - ax*along;
          pos = perp*(1.0 + 0.42*uDeform.w) + ax*along*(1.0 - 0.52*uDeform.w);
        }
        vec4 wp = modelMatrix*vec4(pos, 1.0);
        vWorld = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix)*normal);
        vec4 worldPosition = wp;
        vec3 transformedNormal = normalMatrix*normal;
        ${rt}
        gl_Position = projectionMatrix*viewMatrix*wp;
      }
    `,fragmentShader:Ze(`
      uniform vec3 uCentres[32];
      uniform float uDirt;
      uniform float uSpinBlur;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vLocal;
    `)+`
      void main(){
        vec3 P = vWorld;
        vec3 V = normalize(uCamPos - P);
        vec3 L = normalize(vLocal);

        // --- spherical Voronoi over the 32 panel centres ------------------
        float d1 = -2.0, d2 = -2.0;
        int id = 0;
        for (int i = 0; i < 32; i++){
          float d = dot(L, uCentres[i]);
          if (d > d1){ d2 = d1; d1 = d; id = i; }
          else if (d > d2) d2 = d;
        }
        float seam = acos(clamp(d1, -1.0, 1.0)) ;
        float gap = (d1 - d2);                 // 0 exactly on a seam
        float fid = float(id);
        bool pentagon = fid < 12.5;

        // --- seam groove + stitching --------------------------------------
        // Seam width is fixed in panel space; the screen footprint only
        // decides how much of it a pixel can still resolve, so a distant ball
        // fades toward its average instead of going solid black.
        float px = max(length(vec2(dFdx(gap), dFdy(gap))), 1e-7);
        const float SEAM = 0.0062;
        float grooveSharp = 1.0 - smoothstep(SEAM*0.35, SEAM*1.15, gap);
        float resolve = 1.0 - smoothstep(SEAM*0.6, SEAM*3.0, px);
        float groove = mix(0.16, grooveSharp, resolve);
        // stitch dashes: run along the seam, so modulate by the position
        // perpendicular to the gradient of the panel distance
        float along = atan(L.y, L.x)*12.0 + L.z*21.0;
        float stitch = smoothstep(0.35, 0.65, abs(fract(along*1.7) - 0.5)*2.0);
        float stitchMask = grooveSharp*stitch*resolve;

        // --- leather --------------------------------------------------------
        float grain = fbm3(L*170.0, 3);
        float dimple = fbm3(L*62.0, 2);
        vec3 panelTint = vec3(0.905, 0.912, 0.920);
        // a few panels are printed dark, like a real match ball
        float printSel = fract(fid*0.6180339887);
        vec3 print = printSel > 0.78 ? vec3(0.030, 0.035, 0.055)
                   : printSel > 0.62 ? vec3(0.055, 0.30, 0.55)
                   : panelTint;
        // swirl graphic inside the printed panels
        // a restrained graphic inside the printed panels
        float swirl = smoothstep(0.40, 0.52, abs(sin(seam*9.0 + fid*2.1)));
        vec3 alb = mix(print, panelTint, swirl*0.35);
        alb *= 0.965 + 0.055*grain;
        alb = mix(alb, vec3(0.055, 0.057, 0.062), groove*0.92);
        alb = mix(alb, vec3(0.92, 0.92, 0.90), stitchMask*0.65);
        if (pentagon) alb *= 0.97;

        // --- dirt, grass and water -----------------------------------------
        float dirtMask = clamp(uDirt*(0.25 + fbm3(L*7.0, 3)*1.3), 0.0, 1.0);
        alb = mix(alb, vec3(0.085, 0.062, 0.040), dirtMask*0.5);
        float grassMask = clamp(uDirt*1.2*smoothstep(0.55, 0.9, fbm3(L*11.0 + 3.0, 3)), 0.0, 1.0);
        alb = mix(alb, vec3(0.055, 0.080, 0.028), grassMask*0.55);

        // --- normal ---------------------------------------------------------
        vec3 N = normalize(vNormalW);
        // build a tangent frame on the sphere
        vec3 T = normalize(cross(vec3(0.0, 0.0, 1.0), N) + 1e-5);
        vec3 B = cross(N, T);
        float gx = fbm3(L*170.0 + vec3(0.7, 0.0, 0.0), 3) - grain;
        float gy = fbm3(L*170.0 + vec3(0.0, 0.7, 0.0), 3) - grain;
        float detail = 1.0 - smoothstep(0.004, 0.05, max(length(vec2(dFdx(L.x), dFdy(L.x))), 1e-6));
        N = normalize(N + (T*gx + B*gy)*7.0*detail);
        // the groove itself is a dent
        N = normalize(mix(N, normalize(N + (T*dFdx(groove) + B*dFdy(groove))*-40.0), 0.6));
        N = normalize(N + (T + B)*stitchMask*0.08);

        float wet = uWet;
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = alb;
        s.rough = clamp(mix(0.34, 0.16, wet) + dirtMask*0.35 + dimple*0.06, 0.04, 1.0);
        s.metal = 0.0;
        s.ao = mix(1.0, 0.55, groove)*(0.85 + 0.15*dimple);
        s.spec = 1.6 + wet*2.2;

        float shadow = getShadowMask();
        vec3 col = directLight(s, uSunDir, uSunColor)*shadow;
        col += ambientLight(s);
        col += floodLights(s)*(0.35 + 0.65*shadow);
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, 1.0);
      }
    `}),u=new ve(r,c);u.castShadow=!0,u.name="ball",u.matrixAutoUpdate=!1;const h=new Tt,d=new Tt,v=new Tt,f=new B,m=new B,p=new B(1,1,1),y=new B,g=new B(0,0,1);let b=0,k=0;return{mesh:u,update(x,S){const z=Math.hypot(x.vx,x.vy,x.vz);g.set(x.vx-y.x,x.vy-y.y,x.vz-y.z);const w=g.length();if(y.set(x.vx,x.vy,x.vz),w>4.5&&S<.2&&(k=Math.min(.62,w/42),v.copy(h).invert(),g.divideScalar(w).applyQuaternion(v),l.uDeform.value.set(g.x,g.y,g.z,k)),k>0&&(k=Math.max(0,k-S*7.5),l.uDeform.value.w=k),x.rolling){f.set(-x.vy,x.vx,0);const A=f.length();if(A>1e-4){f.divideScalar(A);const D=Math.hypot(x.vx,x.vy)/H.r;d.setFromAxisAngle(f,D*S),h.premultiply(d)}}else{f.set(x.wx,x.wy,x.wz);const A=f.length();A>1e-4&&(f.divideScalar(A),d.setFromAxisAngle(f,A*S),h.premultiply(d)),f.set(-x.vy,x.vx,0);const D=f.length();D>1e-4&&(f.divideScalar(D),d.setFromAxisAngle(f,Math.min(z,30)*.45*S),h.premultiply(d))}h.normalize(),m.set(x.x,x.y,x.z),u.matrix.compose(m,h,p),u.matrixWorldNeedsUpdate=!0;const L=x.z<H.r*1.6,T=L?Math.min(1,.25+Math.hypot(x.vx,x.vy)*.03):0;b+=(T-b)*Math.min(1,S*(L?.35:.08)),l.uDirt.value=b*(.4+.6*e.u.uWet.value),l.uSpinBlur.value=Math.min(1,z/28)},reset(){b=0,h.identity()}}}const Gt={CLOD:0,DUST:1,SPRAY:2,CONFETTI:3};function Ei(e,t={}){const a=t.tier>=2?3072:t.tier>=1?1024:384,s=new it(1,1),n=new Ut;n.index=s.index,n.attributes.position=s.attributes.position,n.attributes.uv=s.attributes.uv;const i=new we(new Float32Array(a*3),3),o=new we(new Float32Array(a*3),3),r=new we(new Float32Array(a*4),4),l=new we(new Float32Array(a*4),4);for(const f of[i,o,r,l])f.setUsage(Vs);n.setAttribute("aP0",i),n.setAttribute("aV0",o),n.setAttribute("aData",r),n.setAttribute("aCol",l),n.instanceCount=a,n.boundingSphere=new At(new B,1e4);const c=new de({uniforms:je(e.uniforms()),lights:!0,transparent:!0,depthWrite:!1,side:Fe,vertexShader:Qe(`
      attribute vec3 aP0;
      attribute vec3 aV0;
      attribute vec4 aData;   // t0, life, size, type
      attribute vec4 aCol;    // rgb, seed
      varying vec2 vUv;
      varying vec4 vCol;
      varying float vType;
      varying float vAge;
      varying vec3 vWorld;
      varying vec3 vNormalW;
    `)+`
      void main(){
        vUv = uv; vCol = aCol; vType = aData.w;
        float age = uTime - aData.x;
        float life = max(aData.y, 1e-3);
        vAge = age/life;
        if (age < 0.0 || age > life){
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          vWorld = vec3(0.0); vNormalW = vec3(0.0,0.0,1.0);
          return;
        }
        // ballistic with linear drag, closed form
        float k = vType < 0.5 ? 0.9 : vType < 1.5 ? 2.6 : vType < 2.5 ? 1.1 : 1.9;
        float e = (1.0 - exp(-k*age))/k;
        vec3 p = aP0 + aV0*e + vec3(0.0, 0.0, -9.81)*(age*e*0.5);
        // dust rises and spreads; confetti flutters
        if (vType > 0.5 && vType < 1.5) p.z += age*0.35;
        if (vType > 2.5 && vType < 3.5){
          p.x += sin(age*3.1 + aCol.w*6.28)*0.35;
          p.y += cos(age*2.7 + aCol.w*6.28)*0.35;
        }
        p.z = max(p.z, vType < 0.5 ? 0.012 : 0.0);

        float grow = vType > 0.5 && vType < 1.5 ? (1.0 + vAge*3.4) : 1.0;
        float size = aData.z*grow*(1.0 - smoothstep(0.75, 1.0, vAge)*0.6);

        // billboard, with spin for the solid types
        vec3 toCam = normalize(uCamPos - p);
        vec3 right = normalize(cross(vec3(0.0,0.0,1.0), toCam) + 1e-5);
        vec3 up = cross(toCam, right);
        float spin = (aCol.w - 0.5)*age*(vType > 2.5 ? 9.0 : 4.0);
        vec2 q = (uv - 0.5)*size;
        vec2 r = vec2(q.x*cos(spin) - q.y*sin(spin), q.x*sin(spin) + q.y*cos(spin));
        vec3 wp = p + right*r.x + up*r.y;
        vWorld = wp;
        vNormalW = toCam;
        gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
      }
    `,fragmentShader:Ze(`
      varying vec2 vUv;
      varying vec4 vCol;
      varying float vType;
      varying float vAge;
      varying vec3 vWorld;
      varying vec3 vNormalW;
    `)+`
      void main(){
        vec2 c = vUv - 0.5;
        float d = length(c)*2.0;
        float a = 1.0;
        vec3 alb = vCol.rgb;
        if (vType < 0.5){                       // grass clod: ragged chunk
          float edge = 0.55 + 0.45*fbm(vUv*6.0 + vCol.w*31.0, 2);
          if (d > edge) discard;
          a = 1.0;
        } else if (vType < 1.5){                // dust: soft puff
          a = exp(-d*d*2.6)*(1.0 - vAge)*0.55;
          alb *= 1.0 + vAge*0.4;
        } else if (vType < 2.5){                // spray droplet
          if (d > 0.9) discard;
          a = (1.0 - vAge*0.7)*0.8;
        } else if (vType < 3.5){                // confetti / streamer
          if (abs(c.x) > 0.42 || abs(c.y) > 0.16) discard;
          a = 1.0;
        } else {                                 // spark
          a = exp(-d*d*5.0);
        }
        a *= smoothstep(1.0, 0.82, vAge);
        if (a < 0.01) discard;

        vec3 P = vWorld;
        vec3 N = normalize(vNormalW);
        vec3 V = N;
        Surface s;
        s.P = P; s.N = N; s.V = V; s.albedo = alb;
        s.rough = 0.8; s.metal = 0.0; s.ao = 1.0; s.spec = 0.6;
        vec3 col;
        if (vType > 3.5){
          col = alb*6.0;
        } else {
          float shadow = getShadowMask();
          col = alb*RECIPROCAL_PI*uSunColor*mix(0.35, 1.0, shadow)*1.4;
          col += skyIrradiance(vec3(0.0,0.0,1.0))*alb*0.5;
          col += floodLights(s)*0.8;
        }
        col = applyFog(col, P, V);
        gl_FragColor = vec4(col, a);
      }
    `}),u=new ve(n,c);u.frustumCulled=!1,u.renderOrder=5,u.name="particles";let h=0,d=0;const v={mesh:u,setTime(f){d=f},emit(f,m,p,y,g,b,k,x,S,z,w,L){const T=h;h=(h+1)%a,i.array[T*3]=m,i.array[T*3+1]=p,i.array[T*3+2]=y,o.array[T*3]=g,o.array[T*3+1]=b,o.array[T*3+2]=k,r.array[T*4]=d,r.array[T*4+1]=S,r.array[T*4+2]=x,r.array[T*4+3]=f,l.array[T*4]=z,l.array[T*4+1]=w,l.array[T*4+2]=L,l.array[T*4+3]=Math.random(),v.dirty=!0},dirty:!1,kickSpray(f,m,p,y,g,b){const k=Math.min(10,3+Math.round(g*6));for(let x=0;x<k;x++){const S=1.4+Math.random()*3.4*g,z=Math.atan2(y,p)+(Math.random()-.5)*1.5;v.emit(Gt.CLOD,f,m,.03,-Math.cos(z)*S,-Math.sin(z)*S,1.6+Math.random()*3.2*g,.045+Math.random()*.055,.8+Math.random()*.5,.055+Math.random()*.05,.11+Math.random()*.06,.03)}if(v.emit(Gt.DUST,f,m,.05,-p*.5,-y*.5,.5,.35+g*.3,.75,.1,.11,.085),b>.35)for(let x=0;x<6;x++){const S=Math.random()*6.283;v.emit(Gt.SPRAY,f,m,.04,Math.cos(S)*(1+Math.random()*3),Math.sin(S)*(1+Math.random()*3),2+Math.random()*3,.03+Math.random()*.03,.55,.55,.62,.7)}},celebrate(f,m){const p=[[.9,.2,.25],[.95,.85,.2],[.2,.55,.95],[.95,.95,.95],[.25,.85,.45]];for(let y=0;y<160;y++){const g=Math.random()*6.283,b=Math.random()*14,k=p[Math.random()*p.length|0];v.emit(Gt.CONFETTI,f+Math.cos(g)*b,m+Math.sin(g)*b,14+Math.random()*10,(Math.random()-.5)*2.5,(Math.random()-.5)*2.5,-.5-Math.random(),.16+Math.random()*.12,7+Math.random()*4,k[0],k[1],k[2])}},flush(){v.dirty&&(i.needsUpdate=!0,o.needsUpdate=!0,r.needsUpdate=!0,l.needsUpdate=!0,v.dirty=!1)}};return v}function Hi(e,t={}){const a=t.tier>=2?9e3:t.tier>=1?3500:1200,s=new it(1,1),n=new Ut;n.index=s.index,n.attributes.position=s.attributes.position,n.attributes.uv=s.attributes.uv;const i=new Float32Array(a*4);for(let c=0;c<a;c++)i[c*4]=Math.random(),i[c*4+1]=Math.random(),i[c*4+2]=Math.random(),i[c*4+3]=Math.random();n.setAttribute("aSeed",new we(i,4)),n.instanceCount=a,n.boundingSphere=new At(new B,1e4);const o=Object.assign(e.uniforms(),{uRain:{value:0}}),r=new de({uniforms:o,transparent:!0,depthWrite:!1,blending:ea,side:Fe,vertexShader:`
      #include <common>
      ${ze}
      attribute vec4 aSeed;
      uniform float uRain;
      varying float vA;
      varying vec2 vUv;
      void main(){
        vUv = uv;
        float SPAN = 62.0;
        float H = 30.0;
        float fall = 22.0 + aSeed.z*11.0;
        // a column of rain that follows the camera, wrapped in all three axes
        vec3 c = uCamPos;
        float t = uTime*fall + aSeed.w*1000.0;
        vec3 p;
        p.x = c.x + (fract(aSeed.x + uTime*0.02) - 0.5)*SPAN*2.0;
        p.y = c.y + (fract(aSeed.y*1.7 + uTime*0.013) - 0.5)*SPAN*2.0;
        p.z = H - mod(t, H);
        // wind shear
        p.xy += uWind*(H - p.z)*0.10;
        float len = 0.55 + aSeed.z*0.9;
        vec3 toCam = normalize(uCamPos - p);
        vec3 right = normalize(cross(vec3(0.0,0.0,1.0), toCam) + 1e-5);
        vec3 wp = p + right*(uv.x-0.5)*0.016 + vec3(0.0,0.0,1.0)*(uv.y-0.5)*len
                + vec3(uWind*0.06, 0.0)*(uv.y-0.5)*len;
        // fade the column out at its edge so the box never shows itself
        float far = length(p.xy - uCamPos.xy)/SPAN;
        vA = uRain*(0.25 + 0.75*aSeed.z)*(1.0 - smoothstep(0.45, 1.0, far));
        if (uRain < 0.01){ gl_Position = vec4(2.0,2.0,2.0,1.0); return; }
        gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
      }
    `,fragmentShader:`
      #include <common>
      ${ze}
      varying float vA;
      varying vec2 vUv;
      void main(){
        float a = vA*(1.0 - abs(vUv.x-0.5)*2.0)*smoothstep(0.0, 0.3, vUv.y);
        vec3 lit = (uSkyHorizon*2.5 + uFloodColor*uNight*0.18);
        gl_FragColor = vec4(lit*a*1.6, a);
      }
    `}),l=new ve(n,r);return l.frustumCulled=!1,l.renderOrder=7,l.name="rain",{mesh:l,set(c){o.uRain.value=c}}}function Ui(e){const a=new Ot,s=new Float32Array(156),n=new Float32Array(104),i=[];for(let d=0;d<26;d++)if(n[d*2*2]=d/25,n[d*2*2+1]=0,n[(d*2+1)*2]=d/25,n[(d*2+1)*2+1]=1,d+1<26){const v=d*2;i.push(v,v+1,v+2,v+1,v+3,v+2)}a.setAttribute("position",new vt(s,3)),a.setAttribute("uv",new vt(n,2)),a.setIndex(i),a.boundingSphere=new At(new B,1e4);const o=Object.assign(e.uniforms(),{uAmt:{value:0}}),r=new de({uniforms:o,transparent:!0,depthWrite:!1,blending:ea,side:Fe,vertexShader:`
      #include <common>
      ${ze}
      varying vec2 vUv;
      void main(){
        vUv = uv;
        gl_Position = projectionMatrix*viewMatrix*vec4(position, 1.0);
      }
    `,fragmentShader:`
      #include <common>
      ${ze}
      uniform float uAmt;
      varying vec2 vUv;
      void main(){
        float a = uAmt*pow(vUv.x, 2.2)*(1.0 - abs(vUv.y-0.5)*2.0);
        vec3 c = mix(uSkyHorizon*1.2, uFloodColor, uNight)*0.5 + vec3(0.25);
        gl_FragColor = vec4(c*a*0.9, a);
      }
    `}),l=new ve(a,r);l.frustumCulled=!1,l.renderOrder=6,l.name="balltrail";const c=[],u=new B,h=new B;return{mesh:l,update(d,v){const f=Math.hypot(d.vx,d.vy,d.vz);for(c.push(d.x,d.y,d.z);c.length>78;)c.shift();const m=Math.max(0,Math.min(1,(f-13)/20));if(o.uAmt.value=m,l.visible=m>.02,!l.visible){c.length=0;return}const p=c.length/3;for(let y=0;y<26;y++){const g=Math.max(0,p-26+y),b=c[g*3]||d.x,k=c[g*3+1]||d.y,x=c[g*3+2]||d.z;u.set(b-v.x,k-v.y,x-v.z);const S=c[Math.min(g+1,p-1)*3]-b,z=c[Math.min(g+1,p-1)*3+1]-k,w=c[Math.min(g+1,p-1)*3+2]-x;h.set(S,z,w).cross(u),h.lengthSq()<1e-8&&h.set(1,0,0),h.normalize().multiplyScalar(.055*(.35+y/26)),s[y*2*3]=b-h.x,s[y*2*3+1]=k-h.y,s[y*2*3+2]=x-h.z,s[(y*2+1)*3]=b+h.x,s[(y*2+1)*3+1]=k+h.y,s[(y*2+1)*3+2]=x+h.z}a.getAttribute("position").needsUpdate=!0}}}function Oi(e){const t=new wn(.4,.56,40,1),a=Object.assign(e.uniforms(),{uColor:{value:new B(.25,1,.55)},uCentre:{value:new B},uAim:{value:new De(1,0)},uOn:{value:0}}),s=new de({uniforms:a,transparent:!0,depthWrite:!1,blending:ea,side:Fe,vertexShader:`
      #include <common>
      ${ze}
      ${Ke}
      ${ya}
      uniform vec3 uCentre;
      varying vec2 vLocal;
      void main(){
        vLocal = position.xy;
        vec3 wp = vec3(uCentre.xy + position.xy, 0.0);
        wp.z = pitchHeight(wp.xy) + 0.012;
        gl_Position = projectionMatrix*viewMatrix*vec4(wp, 1.0);
      }
    `,fragmentShader:`
      #include <common>
      ${ze}
      uniform vec3 uColor;
      uniform vec2 uAim;
      uniform float uOn;
      varying vec2 vLocal;
      void main(){
        float r = length(vLocal);
        float band = smoothstep(0.40, 0.44, r)*smoothstep(0.56, 0.52, r);
        // a brighter arc pointing at the ball, so you can read the angle
        vec2 d = normalize(vLocal + 1e-5);
        float arc = pow(max(dot(d, normalize(uAim + 1e-5)), 0.0), 6.0);
        float pulse = 0.72 + 0.28*sin(uTime*5.0);
        float a = band*uOn*(0.55 + 0.75*arc)*pulse;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor*a*2.2, a);
      }
    `}),n=new ve(t,s);n.frustumCulled=!1,n.renderOrder=3,n.name="indicator";let i=0;return{mesh:n,setColor(o){const r=new ga(o).convertSRGBToLinear();a.uColor.value.set(r.r+.12,r.g+.12,r.b+.12)},update(o,r,l,c){i+=((c&&o?1:0)-i)*Math.min(1,l*6),a.uOn.value=i,n.visible=i>.01,o&&(a.uCentre.value.set(o.x,o.y,0),a.uAim.value.set(r.x-o.x,r.y-o.y))}}}const Ii=`
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,Wa=`
uniform mat4 uInvVP;
uniform mat4 uVP;
uniform vec2 uClip;          // near, far
float linearDepth(float d){
  float z = d*2.0 - 1.0;
  return (2.0*uClip.x*uClip.y)/(uClip.y + uClip.x - z*(uClip.y - uClip.x));
}
vec3 worldFromDepth(vec2 uv, float d){
  vec4 ndc = vec4(uv*2.0 - 1.0, d*2.0 - 1.0, 1.0);
  vec4 w = uInvVP*ndc;
  return w.xyz/w.w;
}
`;function wt(e,t,a={}){const s=new de({uniforms:t,vertexShader:Ii,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:a.blending||Pn,transparent:!!a.blending}),n=new ve(new it(2,2),s);n.frustumCulled=!1;const i=new Za;i.add(n);const o=new Cn;return{mat:s,uniforms:t,render(r,l){r.setRenderTarget(l||null),r.render(i,o)}}}const qt=e=>({type:e,format:Ka,depthBuffer:!1,stencilBuffer:!1,minFilter:gt,magFilter:gt,wrapS:Jt,wrapT:Jt});function Xi(e,t,a={}){const s=a.tier|0,n=ja;let i=2,o=2;const r=new ft(2,2,{type:n,format:Ka,minFilter:gt,magFilter:gt,depthBuffer:!0,stencilBuffer:!1,samples:0});r.depthTexture=new Sn(2,2),r.depthTexture.type=Tn;const l=new ft(2,2,qt(n)),c=new ft(2,2,qt(n)),u=s>=2?5:s>=1?4:3,h=[];for(let N=0;N<u;N++)h.push(new ft(2,2,qt(n)));const d=[];for(let N=0;N<u;N++)d.push(new ft(2,2,qt(n)));const v=new ft(2,2,qt(n)),f={uScene:{value:r.texture},uDepth:{value:r.depthTexture},uInvVP:{value:new He},uVP:{value:new He},uPrevVP:{value:new He},uClip:{value:new De(.4,400)},uRes:{value:new De(2,2)},uTexel:{value:new De(.5,.5)},uSunScreen:{value:new B(0,0,-1)},uShadowDir:{value:new B(0,0,1)},uShadowMap:{value:null},uShadowMat:{value:new He},uFrame:{value:0},uDof:{value:0},uFocus:{value:25},uMotion:{value:s>=2?1:.5},uGradeLift:{value:new B},uGradeGamma:{value:new B(1,1,1)},uGradeGain:{value:new B(1,1,1)},uSat:{value:1},uFlash:{value:0},uSlowmo:{value:0},uVignette:{value:.32}},m=t.uniforms(),p=wt(`
    #include <common>
    #include <packing>
    ${ze}
    ${Ke}
    ${ns}
    ${Wa}
    uniform sampler2D uDepth;
    uniform sampler2D uShadowMap;
    uniform mat4 uShadowMat;
    uniform vec3 uShadowDir;
    uniform vec2 uRes;
    uniform float uFrame;
    uniform float uSteps;
    varying vec2 vUv;

    float shadowAt(vec3 p){
      vec4 sc = uShadowMat*vec4(p, 1.0);
      vec3 c = sc.xyz/max(sc.w, 1e-5);
      if (any(lessThan(c.xy, vec2(0.02))) || any(greaterThan(c.xy, vec2(0.98)))) return 1.0;
      float d = unpackRGBAToDepth(texture2D(uShadowMap, c.xy));
      return step(c.z - 0.0025, d);
    }

    void main(){
      float depth = texture2D(uDepth, vUv).x;
      vec3 target = worldFromDepth(vUv, min(depth, 0.9999));
      vec3 ray = target - uCamPos;
      float dist = length(ray);
      vec3 dir = ray/max(dist, 1e-4);
      float march = min(dist, 160.0);

      // --- volumetric in-scattering -------------------------------------
      // Under floodlights the sun is a moon and this pass would march 32 steps
      // to add nothing, so it is skipped and only the contact shadows run.
      float sunLum = dot(uSunColor, vec3(0.2126, 0.7152, 0.0722));
      int steps = sunLum < 0.12 ? 0 : int(uSteps);
      float dither = hash12(vUv*uRes + uFrame*1.37);
      float stepLen = march/float(max(steps, 1));
      vec3 acc = vec3(0.0);
      float c = dot(dir, uSunDir);
      float phase = miePhase(c, 0.74)*0.9 + rayleighPhase(c)*0.25;
      for (int i = 0; i < 48; i++){
        if (i >= steps) break;
        float t = (float(i) + dither)*stepLen;
        vec3 p = uCamPos + dir*t;
        if (p.z < -0.5) break;
        float dens = exp(-max(p.z, 0.0)*uFogParams.y*18.0);
        // One octave of turbulence, not three: this runs 24 times per pixel
        // and the shafts only need to stop looking like clean cones.
        dens *= 0.78 + 0.44*vnoise3(p*0.055 + vec3(uWind*uTime*0.08, 0.0));
        acc += shadowAt(p)*dens;
      }
      vec3 vol = uSunColor*phase*acc*stepLen*uFogParams.x*0.85;

      // --- contact shadows ------------------------------------------------
      float occ = 0.0;
      if (depth < 0.9999){
        vec3 P = target;
        float lin0 = linearDepth(depth);
        float jitter = 0.4 + 0.6*hash12(vUv*uRes*1.7 + uFrame*0.77);
        float reach = 0.42;
        for (int i = 1; i <= 10; i++){
          float f = float(i)/10.0;
          // march toward the light that actually casts the shadow map; at
          // night that is near-vertical, so the ground cannot shadow itself
          vec3 sp = P + uShadowDir*(f*reach*jitter) + vec3(0.0, 0.0, 0.006);
          vec4 cp = uVP*vec4(sp, 1.0);
          vec2 suv = cp.xy/cp.w*0.5 + 0.5;
          if (any(lessThan(suv, vec2(0.0))) || any(greaterThan(suv, vec2(1.0)))) break;
          float sd = texture2D(uDepth, suv).x;
          float linS = linearDepth(sd);
          float linP = linearDepth(cp.z/cp.w*0.5 + 0.5);
          float diff = linP - linS;
          if (diff > 0.02 && diff < 0.55){
            occ = max(occ, 1.0 - f*0.85);
          }
        }
      }
      gl_FragColor = vec4(vol, occ);
    }
  `,Object.assign({},m,{uDepth:f.uDepth,uShadowMap:f.uShadowMap,uShadowMat:f.uShadowMat,uInvVP:f.uInvVP,uVP:f.uVP,uClip:f.uClip,uRes:f.uRes,uFrame:f.uFrame,uSteps:{value:s>=2?24:8},uShadowDir:f.uShadowDir})),y=wt(`
    #include <common>
    ${ze}
    ${Ke}
    ${Wa}
    uniform sampler2D uScene;
    uniform sampler2D uDepth;
    uniform vec2 uRes;
    uniform float uFrame;
    varying vec2 vUv;
    void main(){
      float depth = texture2D(uDepth, vUv).x;
      if (depth > 0.9999){ gl_FragColor = vec4(0.0); return; }
      vec3 P = worldFromDepth(vUv, depth);
      // only the pitch surface reflects in screen space here
      if (abs(P.z) > 0.30 || uWet < 0.08){ gl_FragColor = vec4(0.0); return; }
      vec3 V = normalize(uCamPos - P);
      // the same ripple field the pitch shader uses, cheaply
      float rip = fbmS(P.xy*7.0 + uTime*vec2(0.25, 0.11), 2)*uWet;
      vec3 N = normalize(vec3(-rip*0.30, -rip*0.24, 1.0));
      vec3 R = reflect(-V, N);
      if (R.z < 0.02){ gl_FragColor = vec4(0.0); return; }

      float jitter = hash12(vUv*uRes + uFrame*2.31);
      vec3 col = vec3(0.0);
      float conf = 0.0;
      float t = 0.07 + jitter*0.05;
      for (int i = 0; i < 20; i++){
        vec3 p = P + R*t;
        vec4 cp = uVP*vec4(p, 1.0);
        vec2 suv = cp.xy/cp.w*0.5 + 0.5;
        if (any(lessThan(suv, vec2(0.002))) || any(greaterThan(suv, vec2(0.998)))) break;
        float sd = texture2D(uDepth, suv).x;
        float linS = linearDepth(sd);
        float linP = linearDepth(cp.z/cp.w*0.5 + 0.5);
        if (linP > linS + 0.02 && linP < linS + 1.2){
          col = texture2D(uScene, suv).rgb;
          // short rays only: this layer is for contact reflections
          conf = (1.0 - smoothstep(0.6, 2.2, t))*smoothstep(0.0, 0.1, t);
          break;
        }
        t += 0.085 + t*0.30;
      }
      gl_FragColor = vec4(col, conf);
    }
  `,Object.assign({},m,{uScene:f.uScene,uDepth:f.uDepth,uInvVP:f.uInvVP,uVP:f.uVP,uClip:f.uClip,uRes:f.uRes,uFrame:f.uFrame})),g=wt(`
    uniform sampler2D uScene;
    uniform vec2 uTexel;
    uniform float uThresh;
    varying vec2 vUv;
    void main(){
      vec3 c = texture2D(uScene, vUv).rgb;
      c += texture2D(uScene, vUv + vec2(uTexel.x, 0.0)).rgb;
      c += texture2D(uScene, vUv - vec2(uTexel.x, 0.0)).rgb;
      c += texture2D(uScene, vUv + vec2(0.0, uTexel.y)).rgb;
      c += texture2D(uScene, vUv - vec2(0.0, uTexel.y)).rgb;
      c /= 5.0;
      float l = max(max(c.r, c.g), c.b);
      float knee = max(l - uThresh, 0.0);
      float w = knee/max(l, 1e-4);
      gl_FragColor = vec4(c*w, 1.0);
    }
  `,{uScene:f.uScene,uTexel:{value:new De},uThresh:{value:1.25}}),b=wt(`
    uniform sampler2D uTex;
    uniform vec2 uTexel;
    varying vec2 vUv;
    void main(){
      // 13-tap downsample (Jimenez): stable, no pulsing on small highlights
      vec2 t = uTexel;
      vec3 a = texture2D(uTex, vUv + t*vec2(-1.0, -1.0)).rgb;
      vec3 b = texture2D(uTex, vUv + t*vec2( 1.0, -1.0)).rgb;
      vec3 c = texture2D(uTex, vUv + t*vec2(-1.0,  1.0)).rgb;
      vec3 d = texture2D(uTex, vUv + t*vec2( 1.0,  1.0)).rgb;
      vec3 e = texture2D(uTex, vUv).rgb;
      vec3 f = texture2D(uTex, vUv + t*vec2(-2.0, 0.0)).rgb;
      vec3 g = texture2D(uTex, vUv + t*vec2( 2.0, 0.0)).rgb;
      vec3 h = texture2D(uTex, vUv + t*vec2( 0.0,-2.0)).rgb;
      vec3 i = texture2D(uTex, vUv + t*vec2( 0.0, 2.0)).rgb;
      vec3 sum = (a+b+c+d)*0.125 + e*0.125 + (f+g+h+i)*0.0625;
      sum += (texture2D(uTex, vUv + t*vec2(-2.0,-2.0)).rgb
            + texture2D(uTex, vUv + t*vec2( 2.0,-2.0)).rgb
            + texture2D(uTex, vUv + t*vec2(-2.0, 2.0)).rgb
            + texture2D(uTex, vUv + t*vec2( 2.0, 2.0)).rgb)*0.03125;
      gl_FragColor = vec4(sum, 1.0);
    }
  `,{uTex:{value:null},uTexel:{value:new De}}),k=wt(`
    uniform sampler2D uTex;
    uniform sampler2D uPrev;
    uniform vec2 uTexel;
    uniform float uMix;
    varying vec2 vUv;
    void main(){
      vec2 t = uTexel;
      vec3 s = texture2D(uTex, vUv + t*vec2(-1.0, 0.0)).rgb*2.0;
      s += texture2D(uTex, vUv + t*vec2( 1.0, 0.0)).rgb*2.0;
      s += texture2D(uTex, vUv + t*vec2( 0.0,-1.0)).rgb*2.0;
      s += texture2D(uTex, vUv + t*vec2( 0.0, 1.0)).rgb*2.0;
      s += texture2D(uTex, vUv + t*vec2(-1.0,-1.0)).rgb;
      s += texture2D(uTex, vUv + t*vec2( 1.0,-1.0)).rgb;
      s += texture2D(uTex, vUv + t*vec2(-1.0, 1.0)).rgb;
      s += texture2D(uTex, vUv + t*vec2( 1.0, 1.0)).rgb;
      s += texture2D(uTex, vUv).rgb*4.0;
      s /= 16.0;
      gl_FragColor = vec4(texture2D(uPrev, vUv).rgb + s*uMix, 1.0);
    }
  `,{uTex:{value:null},uPrev:{value:null},uTexel:{value:new De},uMix:{value:1}}),x=wt(`
    #include <common>
    ${ze}
    ${Ke}
    ${Wa}
    uniform sampler2D uScene;
    uniform sampler2D uDepth;
    uniform sampler2D uAir;
    uniform sampler2D uSSR;
    uniform sampler2D uBloom;
    uniform vec2 uRes;
    uniform vec2 uTexel;
    uniform vec3 uSunScreen;
    uniform mat4 uPrevVP;
    uniform float uDof;
    uniform float uFocus;
    uniform float uMotion;
    uniform float uFrame;
    uniform float uFlash;
    uniform float uSlowmo;
    uniform float uBloomAmt;
    uniform float uSsrAmt;
    uniform vec3 uGradeLift;
    uniform vec3 uGradeGamma;
    uniform vec3 uGradeGain;
    uniform float uSat;
    varying vec2 vUv;

    // AgX-flavoured filmic curve: holds saturation in the highlights far
    // better than Reinhard and does not go chalky like plain ACES-fit.
    vec3 tonemap(vec3 x){
      x = max(x, vec3(0.0));
      // Hill's ACES RRT+ODT fit, with a touch of pre-desaturation so the
      // floodlit highlights roll off to white instead of to magenta.
      float l = dot(x, vec3(0.2126, 0.7152, 0.0722));
      x = mix(x, vec3(l), smoothstep(1.0, 7.0, l)*0.35);
      vec3 a = x*(x + 0.0245786) - 0.000090537;
      vec3 b = x*(0.983729*x + 0.4329510) + 0.238081;
      vec3 c = a/b;
      // slight toe lift so the shadows do not crush to pure black
      return pow(clamp(c, 0.0, 1.0), vec3(0.93));
    }

    vec3 sampleScene(vec2 uv){ return texture2D(uScene, uv).rgb; }

    void main(){
      vec2 uv = vUv;
      float depth = texture2D(uDepth, uv).x;
      vec3 col;

      // --- camera motion blur (reprojection) ---------------------------
      vec2 vel = vec2(0.0);
      if (uMotion > 0.01 && depth < 0.9999){
        vec3 P = worldFromDepth(uv, depth);
        vec4 pc = uPrevVP*vec4(P, 1.0);
        vec2 prevUv = pc.xy/pc.w*0.5 + 0.5;
        vel = (uv - prevUv)*0.5*uMotion;
        vel = clamp(vel, vec2(-0.035), vec2(0.035));
      }
      float dither = hash12(uv*uRes + uFrame);
      col = sampleScene(uv);
      if (dot(vel, vel) > 1e-8){
        vec3 acc = col;
        for (int i = 1; i < 6; i++){
          float f = (float(i) + dither)/6.0;
          acc += sampleScene(uv - vel*f);
          acc += sampleScene(uv + vel*f*0.35);
        }
        col = acc/11.0;
      }

      // --- depth of field (ring bokeh) ----------------------------------
      if (uDof > 0.02 && depth < 0.9999){
        float lin = linearDepth(depth);
        float coc = clamp(abs(lin - uFocus)/max(uFocus, 1.0), 0.0, 1.0);
        coc = pow(coc, 0.9)*uDof;
        if (coc > 0.004){
          vec2 r = coc*0.022*vec2(1.0, uRes.x/uRes.y);
          vec3 acc = col;
          float wsum = 1.0;
          for (int i = 0; i < 8; i++){
            float a = (float(i) + dither)*0.7853981;
            vec2 o = vec2(cos(a), sin(a))*r*(0.45 + 0.55*fract(float(i)*0.618));
            vec3 s = sampleScene(uv + o);
            float sd = texture2D(uDepth, uv + o).x;
            float sl = linearDepth(sd);
            // never pull sharp foreground into the blurred background
            float w = sl > lin - 0.5 ? 1.0 : 0.25;
            acc += s*w; wsum += w;
          }
          col = acc/wsum;
        }
      }

      // --- screen-space reflections on the wet ground --------------------
      vec4 ssr = texture2D(uSSR, uv);
      if (ssr.a > 0.002) col += ssr.rgb*ssr.a*uWet*uSsrAmt;

      // --- volumetrics + contact shadow ---------------------------------
      vec4 airS = texture2D(uAir, uv);
      col *= 1.0 - airS.a*0.55;
      col += airS.rgb;

      // --- bloom ---------------------------------------------------------
      vec3 bloom = texture2D(uBloom, uv).rgb;
      col += bloom*uBloomAmt;

      // --- lens flare ----------------------------------------------------
      if (uSunScreen.z > 0.001){
        vec2 sp = uSunScreen.xy*0.5 + 0.5;
        // the flare only exists if the sun is actually visible: 5 taps of the
        // depth buffer around it, so it fades behind the roof and the stands
        float vis = 0.0;
        for (int i = 0; i < 5; i++){
          vec2 o = vec2(float(i-2)*0.012, float((i*3)%5-2)*0.012);
          vis += step(0.99995, texture2D(uDepth, clamp(sp+o, 0.0, 1.0)).x);
        }
        vis /= 5.0;
        vec2 d = uv - sp;
        float aspect = uRes.x/uRes.y;
        d.x *= aspect;
        float r = length(d);
        vec3 flare = vec3(0.0);
        // anamorphic streak
        float streak = exp(-pow(abs(d.y)*90.0, 1.6))*exp(-abs(d.x)*2.4);
        flare += vec3(0.45, 0.62, 1.0)*streak*0.55;
        // halo + ghosts
        flare += vec3(1.0, 0.86, 0.62)*exp(-r*r*34.0)*0.65;
        for (int i = 1; i <= 4; i++){
          float f = -0.35*float(i);
          vec2 g = d*f;
          float gr = length(g);
          vec3 tint = i == 1 ? vec3(0.35,0.55,1.0) : i == 2 ? vec3(1.0,0.55,0.35)
                    : i == 3 ? vec3(0.45,1.0,0.65) : vec3(0.85,0.55,1.0);
          flare += tint*exp(-pow(gr*7.0, 2.0))*0.16;
        }
        float ring = exp(-pow((r - 0.34)*11.0, 2.0))*0.10;
        flare += vec3(0.6, 0.75, 1.0)*ring;
        col += flare*uSunScreen.z*vis*uSunColor*0.09;
      }

      // --- exposure, tonemap, grade -------------------------------------
      col *= uExposure*(1.0 + uFlash*2.2);
      col = tonemap(col);
      col = pow(max(col, 0.0), uGradeGamma)*uGradeGain + uGradeLift;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      // replay / slow-motion gets a cooler, crushed look
      col = mix(col, mix(vec3(l), col*vec3(0.92, 0.97, 1.08), 1.1), uSlowmo*0.5);
      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    }
  `,Object.assign({},m,{uScene:f.uScene,uDepth:f.uDepth,uAir:{value:l.texture},uSSR:{value:c.texture},uBloom:{value:d[0].texture},uRes:f.uRes,uTexel:f.uTexel,uSunScreen:f.uSunScreen,uInvVP:f.uInvVP,uVP:f.uVP,uPrevVP:f.uPrevVP,uClip:f.uClip,uDof:f.uDof,uFocus:f.uFocus,uMotion:f.uMotion,uFrame:f.uFrame,uFlash:f.uFlash,uSlowmo:f.uSlowmo,uBloomAmt:{value:.52},uSsrAmt:{value:s>=2?.55:0},uGradeLift:f.uGradeLift,uGradeGamma:f.uGradeGamma,uGradeGain:f.uGradeGain,uSat:f.uSat})),S=wt(`
    #include <common>
    ${Ke}
    uniform sampler2D uTex;
    uniform vec2 uRes;
    uniform vec2 uTexel;
    uniform float uTime;
    uniform float uAA;
    uniform float uSharp;
    uniform float uGrain;
    uniform float uCA;
    uniform float uVignette;
    varying vec2 vUv;

    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main(){
      vec2 uv = vUv;
      vec2 t = uTexel;
      // chromatic aberration grows toward the corners, like real glass
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      vec3 col;
      if (uCA > 0.0001){
        vec2 off = cc*r2*uCA;
        col.r = texture2D(uTex, uv + off).r;
        col.g = texture2D(uTex, uv).g;
        col.b = texture2D(uTex, uv - off).b;
      } else {
        col = texture2D(uTex, uv).rgb;
      }

      // --- FXAA (luma edge, 3 taps either side) -------------------------
      if (uAA > 0.5){
        vec3 nw = texture2D(uTex, uv + vec2(-t.x, -t.y)).rgb;
        vec3 ne = texture2D(uTex, uv + vec2( t.x, -t.y)).rgb;
        vec3 sw = texture2D(uTex, uv + vec2(-t.x,  t.y)).rgb;
        vec3 se = texture2D(uTex, uv + vec2( t.x,  t.y)).rgb;
        float lNW = lum(nw), lNE = lum(ne), lSW = lum(sw), lSE = lum(se), lM = lum(col);
        float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
        float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
        vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
        float dirReduce = max((lNW + lNE + lSW + lSE)*0.25*0.06, 1.0/128.0);
        float rcp = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);
        dir = clamp(dir*rcp, vec2(-8.0), vec2(8.0))*t;
        vec3 a = 0.5*(texture2D(uTex, uv + dir*(1.0/3.0 - 0.5)).rgb
                    + texture2D(uTex, uv + dir*(2.0/3.0 - 0.5)).rgb);
        vec3 b = a*0.5 + 0.25*(texture2D(uTex, uv + dir*-0.5).rgb
                             + texture2D(uTex, uv + dir*0.5).rgb);
        float lB = lum(b);
        col = (lB < lMin || lB > lMax) ? a : b;
      }

      // --- contrast adaptive sharpen ------------------------------------
      if (uSharp > 0.001){
        vec3 n = texture2D(uTex, uv + vec2(0.0, -t.y)).rgb;
        vec3 s = texture2D(uTex, uv + vec2(0.0,  t.y)).rgb;
        vec3 w = texture2D(uTex, uv + vec2(-t.x, 0.0)).rgb;
        vec3 e = texture2D(uTex, uv + vec2( t.x, 0.0)).rgb;
        vec3 mn = min(col, min(min(n, s), min(w, e)));
        vec3 mx = max(col, max(max(n, s), max(w, e)));
        vec3 amp = sqrt(clamp(min(mn, 1.0 - mx)/max(mx, 1e-4), 0.0, 1.0));
        vec3 sharp = col*(1.0 + uSharp*amp*4.0) - (n + s + w + e)*uSharp*amp;
        col = clamp(sharp, 0.0, 4.0);
      }

      // --- grain + vignette ---------------------------------------------
      float g = hash12(uv*uRes + fract(uTime)*137.0) - 0.5;
      col += g*uGrain*(1.0 - lum(col)*0.6);
      float vig = 1.0 - uVignette*pow(r2*2.0, 1.35);
      col *= clamp(vig, 0.0, 1.0);

      // we own the whole pipeline, so the sRGB transfer is ours to apply
      col = clamp(col, 0.0, 1.0);
      vec3 lo = col*12.92;
      vec3 hi = 1.055*pow(col, vec3(1.0/2.4)) - 0.055;
      gl_FragColor = vec4(mix(lo, hi, step(0.0031308, col)), 1.0);
    }
  `,{uTex:{value:v.texture},uRes:f.uRes,uTexel:f.uTexel,uTime:m.uTime,uAA:{value:s>=1?1:0},uSharp:{value:s>=1?.35:.2},uGrain:{value:.016},uCA:{value:s>=1?.0022:0},uVignette:f.uVignette}),z=new He,w=new He,L=new B,T=new B;let A=0;const D={sceneRT:r,shared:f,enableSSR:s>=2,enableAir:s>=1,setSize(N,J){i=Math.max(2,Math.floor(N)),o=Math.max(2,Math.floor(J)),r.setSize(i,o);const se=Math.max(2,i>>1),K=Math.max(2,o>>1);l.setSize(se,K),c.setSize(se,K),v.setSize(i,o);for(let V=0;V<u;V++){const $=1<<V+1;h[V].setSize(Math.max(2,Math.floor(i/$)),Math.max(2,Math.floor(o/$))),d[V].setSize(Math.max(2,Math.floor(i/$)),Math.max(2,Math.floor(o/$)))}f.uRes.value.set(i,o),f.uTexel.value.set(1/i,1/o)},beginFrame(N,J,se,K){K&&f.uShadowDir.value.copy(K),z.copy(w),w.multiplyMatrices(N.projectionMatrix,N.matrixWorldInverse),f.uVP.value.copy(w),f.uInvVP.value.copy(w).invert(),f.uPrevVP.value.copy(z),f.uClip.value.set(N.near,N.far),f.uFrame.value=A=(A+1)%1024,J&&J.shadow&&J.shadow.map&&(f.uShadowMap.value=J.shadow.map.texture,f.uShadowMat.value.copy(J.shadow.matrix)),N.getWorldDirection(T);const V=T.dot(se);if(V>.02){L.copy(se).multiplyScalar(900).add(N.position).applyMatrix4(w);const $=Math.max(Math.abs(L.x),Math.abs(L.y)),Z=Math.min(1,V*2.2)*(1-Math.min(1,Math.max(0,$-1)*1.6));f.uSunScreen.value.set(L.x,L.y,Math.max(0,Z))}else f.uSunScreen.value.z=0},setSunVisibility(N){f.uSunScreen.value.z*=N},setGrade(N){f.uGradeLift.value.copy(N.lift),f.uGradeGamma.value.copy(N.gamma),f.uGradeGain.value.copy(N.gain),f.uSat.value=N.sat},setCinematic({dof:N=0,focus:J=25,flash:se=0,slowmo:K=0,vignette:V=.32}){f.uDof.value=N,f.uFocus.value=J,f.uFlash.value=se,f.uSlowmo.value=K,f.uVignette.value=V},render(){const N=Math.max(2,i>>1),J=Math.max(2,o>>1);D.enableAir&&(p.uniforms.uRes.value.set(N,J),p.render(e,l)),D.enableSSR&&(y.uniforms.uRes.value.set(N,J),y.render(e,c)),x.uniforms.uSsrAmt.value=D.enableSSR?.55:0,g.uniforms.uTexel.value.set(1/i,1/o),g.render(e,h[0]);for(let K=1;K<u;K++)b.uniforms.uTex.value=h[K-1].texture,b.uniforms.uTexel.value.set(1/h[K-1].width,1/h[K-1].height),b.render(e,h[K]);let se=h[u-1];for(let K=u-2;K>=0;K--)k.uniforms.uTex.value=se.texture,k.uniforms.uPrev.value=h[K].texture,k.uniforms.uTexel.value.set(1/se.width,1/se.height),k.uniforms.uMix.value=.72,k.render(e,d[K]),se=d[K];x.uniforms.uBloom.value=se.texture,x.uniforms.uAir.value=D.enableAir?l.texture:null,x.render(e,v),S.uniforms.uTex.value=v.texture,S.render(e,null)},dispose(){r.dispose(),l.dispose(),c.dispose(),v.dispose();for(const N of h)N.dispose();for(const N of d)N.dispose()}};return D}function $i(e){const t=e.getContext();let a="";try{const l=t.getExtension("WEBGL_debug_renderer_info");l&&(a=String(t.getParameter(l.UNMASKED_RENDERER_WEBGL)||""))}catch{}const s=a.toLowerCase(),n=/android|iphone|ipad|mobile/i.test(navigator.userAgent),i=navigator.deviceMemory||(navigator.hardwareConcurrency>=8?8:4),o=/adreno\s*(7[2-9]\d|8\d\d)|apple\s*(a1[5-9]|m[1-9])|mali-g(7[0-9]|8\d|9\d)/.test(s);return/swiftshader|software|llvmpipe/.test(s)?0:n?o?2:i>=6?1:0:i>=8?2:1}function Yi(e,t={}){const a=new Rn({canvas:e,antialias:!1,alpha:!1,stencil:!1,depth:!0,powerPreference:"high-performance",preserveDrawingBuffer:!1,failIfMajorPerformanceCaveat:!1});a.setPixelRatio(1),a.outputColorSpace=An,a.toneMapping=Dn,a.shadowMap.enabled=!0,a.shadowMap.type=Fn,a.shadowMap.autoUpdate=!1,a.autoClear=!0,a.setClearColor(0,1);let s=t.tier!==void 0?t.tier:$i(a);return t.tierCap!==void 0&&(s=Math.min(s,t.tierCap)),{renderer:a,tier:s}}function _i(e,t={}){const{renderer:a,tier:s}=Yi(e,t),n={tier:s,maxTier:s},i=oi(),o=new Za;o.matrixWorldAutoUpdate=!0;const r=new is(32,16/9,.32,520);r.up.set(0,0,1);const l=new zn(16777215,1);l.castShadow=!0;const c=s>=2?4096:s>=1?2048:1024;l.shadow.mapSize.set(c,c),l.shadow.bias=-6e-4,l.shadow.normalBias=.035,l.shadow.radius=s>=2?3.2:2;const u=s>=2?96:s>=1?78:46,h=s>=2?78:s>=1?60:34;l.shadow.camera.left=-u,l.shadow.camera.right=u,l.shadow.camera.top=h,l.shadow.camera.bottom=-h,l.shadow.camera.near=1,l.shadow.camera.far=420,l.shadow.camera.up.set(0,0,1),o.add(l),o.add(l.target);const d=fi(i);o.add(d.mesh);const v=hi(a,s>=2?2048:s>=1?1024:512),f=vi(i,v,{tier:s});o.add(f.mesh);const m=gi(i,v,{tier:s});m.mesh&&o.add(m.mesh);const p=wi(i,{tier:s,roofShadow:s>=1});o.add(p.group);const y=Si(i,{tier:s});o.add(y.mesh);const g=Pi(i,{shafts:s>=1});o.add(g.group),i.setTowers(g.towers,i.floodLevel);const b=zi(i);o.add(b.mesh);const k=Ri(i,{tier:s});o.add(k.group);const x=Vi(i,{tier:s});o.add(x.group);const S=Bi(i,{tier:s});o.add(S.mesh);const z=Oi(i);o.add(z.mesh);const w=Ei(i,{tier:s});o.add(w.mesh);const L=Hi(i,{tier:s});o.add(L.mesh);const T=Ui(i);o.add(T.mesh);const A=Xi(a,i,{tier:s}),D=new is(32,16/9,.32,520);D.up.set(0,0,-1);const N=new ft(2,2,{type:ja,minFilter:gt,magFilter:gt,depthBuffer:!0,stencilBuffer:!1}),J=new He;let se=!1,K=1,V=1,$=1,Z=1;function Q(X,W,G,Y){K=Math.max(2,X),V=Math.max(2,W),Z=G,$=Y;const R=Math.max(2,Math.round(K*Z*$)),te=Math.max(2,Math.round(V*Z*$));a.setSize(R,te,!1),e.style.width=K+"px",e.style.height=V+"px",A.setSize(R,te);const j=Math.max(2,Math.round(R*(s>=2?.5:.34))),_=Math.max(2,Math.round(te*(s>=2?.5:.34)));N.setSize(j,_),r.aspect=K/V,r.updateProjectionMatrix()}const le={dof:0,focus:24,flash:0,slowmo:0,vignette:.3,excite:.25};let ge=1;const Le=[],Me=new B,ue=new B,Ve=new B,Se=new B,Ge=new B;let Je=0;function xt(X){if(Me.set(X.px,X.py,X.pz),ue.set(X.tx,X.ty,X.tz),r.position.copy(Me),r.fov=ht.radToDeg(X.fov),r.updateProjectionMatrix(),r.lookAt(ue),X.shakeX||X.shakeY){const W=1/Math.max(V,1)*1.6;r.rotateY(X.shakeX*W),r.rotateX(-X.shakeY*W)}r.updateMatrixWorld(!0)}function Dt(){const X=i.shadowDir;Math.abs(X.z)>.86?l.shadow.camera.up.set(0,1,0):l.shadow.camera.up.set(0,0,1),l.target.position.copy(Ge),l.position.copy(Ge).addScaledVector(X,190),l.target.updateMatrixWorld(),l.updateMatrixWorld(),l.shadow.camera.updateProjectionMatrix()}function bt(X){i.setPreset(X),i.setTowers(g.towers,i.floodLevel),A.setGrade(i.grade),L.set(i.rain),f.setDew(X==="day"?.12:X==="dusk"?.22:.05),g.shafts.visible=i.preset.night>.2&&s>=1}return bt("night"),{THREE:Ln,renderer:a,scene:o,camera:r,env:i,post:A,caps:n,turf:v,fx:w,players:x,grass:m,crowd:y,setSize:Q,setPreset:bt,get tier(){return s},setQuality(X){A.enableSSR=s>=2&&X>=1,A.enableAir=s>=1&&X>=.55,m.setDensity&&m.setDensity(X>=1?1:X>=.55?.65:0),g.shafts.visible=i.preset.night>.2&&s>=1&&X>=.55,L.set(i.rain*(X>=.55?1:.4)),A.shared.uMotion.value=X>=1?1:X>=.55?.6:0,ge=X},setMatch(X){x.setSquads(X);const W=X.teams[X.userTeam];z.setColor(W.kit===1?W.club.away1:W.club.c1);const G=X.teams[0].club,Y=X.teams[1].club;p.setTeams(G,Y),y.setTeams(G,Y),v.clear(),S.reset()},render(X,W,G,Y){Je+=G,w.setTime(Je);const R=X.ball;xt(W),i.update(G,Je,r.position);const te=X.phase==="goal",j=te?X.phaseT:99;le.flash=ye(le.flash,te&&j<.5?.35:0,6,G),le.slowmo=ye(le.slowmo,Y==="replay"?1:te?.5:0,3,G);const _=Y==="replay"?.55:te?.42:0;le.dof=ye(le.dof,s>=2&&ge>=1?_:0,2.5,G),le.focus=ye(le.focus,r.position.distanceTo(Ve.set(R.x,R.y,R.z)),4,G),le.vignette=ye(le.vignette,te||Y==="replay"?.46:.3,2,G),A.setCinematic(le);const P=I((Math.abs(R.x)-26)/20),be=te?1.25:Y==="replay"?.7:.22+P*.55+I((Math.hypot(R.vx,R.vy)-14)/20)*.25;y.update(G,be),b.update(G,te?1:0),Ge.set(F(R.x*.75,-40,40),F(R.y*.6,-26,26),0),Le.length=0;for(const ie of X.players)Math.abs(ie.x-R.x)<24&&Math.abs(ie.y-R.y)<20&&Le.length<11&&Le.push({x:ie.x,y:ie.y,r:.42,s:.5+ie.speed*.05});if(Le.push({x:R.x,y:R.y,r:.3,s:.8}),m.mesh){r.getWorldDirection(Se);let ie,xe;if(Se.z<-.05){const ee=Math.min(-r.position.z/Se.z,26);ie=r.position.x+Se.x*ee,xe=r.position.y+Se.y*ee}else{const ee=Math.hypot(Se.x,Se.y)||1;ie=r.position.x+Se.x/ee*12,xe=r.position.y+Se.y/ee*12}m.update(ie,xe,Le)}x.update(X,Je,v),z.update(X.user&&X.user.player,R,G,Y==="play"&&!X.noUser&&X.phase!=="goal"),S.update(R,G),T.update(R,r.position),k.update(G,R,i.u.uWind.value);const Pe=Math.hypot(R.vx,R.vy);R.z<H.r*1.5&&Pe>6&&(v.add(R.x,R.y,.1,Math.atan2(R.vy,R.vx),.3,.02,.18,.3),i.u.uWet.value>.3&&Math.random()<.5&&w.emit(Gt.SPRAY,R.x,R.y,.05,-R.vx*.1+(Math.random()-.5)*2,-R.vy*.1+(Math.random()-.5)*2,1.5+Math.random()*2,.025,.4,.6,.66,.72)),v.update(G),w.flush(),Dt(),a.shadowMap.needsUpdate=!0;const Ae=i.u.uSunDir.value;if(se=i.u.uWet.value>.34&&s>=1&&ge>=.55,f.setReflection(N.texture,J,se),se){D.fov=r.fov,D.aspect=r.aspect,D.near=r.near,D.far=r.far,D.position.set(Me.x,Me.y,-Me.z),D.up.set(0,0,-1),D.lookAt(ue.x,ue.y,-ue.z),D.updateProjectionMatrix(),D.updateMatrixWorld(!0),J.multiplyMatrices(D.projectionMatrix,D.matrixWorldInverse);const ie=[m.mesh,y.mesh,w.mesh,L.mesh,T.mesh,f.mesh],xe=ie.map(ee=>ee?ee.visible:!1);for(const ee of ie)ee&&(ee.visible=!1);d.setCamera(D),a.setRenderTarget(N),a.clear(),a.render(o,D);for(let ee=0;ee<ie.length;ee++)ie[ee]&&(ie[ee].visible=xe[ee])}d.setCamera(r),A.beginFrame(r,l,Ae,i.shadowDir),a.setRenderTarget(A.sceneRT),a.clear(),a.render(o,r),A.render()},event(X,W,G){const Y=G.ball;switch(X){case"pass":case"shot":case"clear":case"cross":{const R=W&&W.p;R&&(w.kickSpray(R.x,R.y,Math.cos(R.facing),Math.sin(R.facing),X==="shot"?1:.6,i.u.uWet.value),v.add(R.x,R.y,.3,R.facing,.8,X==="shot"?.45:.2,.5,.4));break}case"tackle":case"slideWin":{const R=W&&W.p;R&&w.kickSpray(R.x,R.y,Math.cos(R.facing),Math.sin(R.facing),1.2,i.u.uWet.value);break}case"bounce":if(i.u.uWet.value>.3)for(let R=0;R<5;R++){const te=Math.random()*6.283;w.emit(Gt.SPRAY,Y.x,Y.y,.04,Math.cos(te)*2,Math.sin(te)*2,1.5+Math.random()*2,.03,.45,.6,.66,.72)}v.add(Y.x,Y.y,.14,0,.35,.05,.6,0);break;case"goal":{const R=G.lastGoal,te=R&&R.scorer?R.scorer.x:Y.x*.7,j=R&&R.scorer?R.scorer.y:Y.y*.5;w.celebrate(te,j),y.startWave();break}}},dispose(){A.dispose(),N.dispose(),v.dispose(),a.dispose()}}}const Ss={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",KeyW:"up",KeyS:"down",KeyA:"left",KeyD:"right",KeyJ:"pass",Space:"pass",KeyK:"shoot",Semicolon:"shoot",KeyL:"through",KeyI:"through",KeyH:"tackle",KeyN:"tackle",ShiftLeft:"sprint",ShiftRight:"sprint",KeyQ:"switch",Escape:"pause",KeyP:"pause",KeyR:"replay"};function qi(e={}){const t=typeof window<"u"&&("ontouchstart"in window||(navigator.maxTouchPoints||0)>0),a={controls:e.controls||null,touchMode:t,keys:Object.create(null),edge:Object.create(null),padPrev:[],onPause:e.onPause||null,onReplay:e.onReplay||null,anyPressed:!1};return window.addEventListener("keydown",s=>{const n=Ss[s.code];n&&(a.keys[n]||(a.edge[n]=!0),a.keys[n]=!0,n==="pause"&&a.onPause&&a.onPause(),n==="replay"&&a.onReplay&&a.onReplay(),(s.code==="Space"||s.code.startsWith("Arrow"))&&s.preventDefault())}),window.addEventListener("keyup",s=>{const n=Ss[s.code];n&&(a.keys[n]=!1)}),window.addEventListener("blur",()=>{for(const s in a.keys)a.keys[s]=!1}),a}function Ts(e){if(!e||!e.user)return!1;if(e.carrier&&e.carrier===e.user.player)return!0;const t=e.restart;return!!(t&&t.taker===e.user.player)}function Ki(e,t,a){const s=t.cmd;let n=0,i=0,o=!1,r=!1,l=!1,c=!1,u=!1,h=!1;const d=e.controls;if(d){const g=d.state.stick;g.active&&(n+=g.dx,i+=g.dy);const b=d.state.buttons;r=r||b.pass,l=l||b.shoot,c=c||b.through,u=u||b.tackle,o=o||b.sprint}const v=e.keys;v.left&&(n-=1),v.right&&(n+=1),v.up&&(i-=1),v.down&&(i+=1),o=o||!!v.sprint,r=r||!!v.pass,l=l||!!v.shoot,c=c||!!v.through,u=u||!!v.tackle,h=h||!!v.switch;const f=navigator.getGamepads?navigator.getGamepads():[];for(const g of f){if(!g||!g.connected)continue;const b=g.axes[0]||0,k=g.axes[1]||0;Math.hypot(b,k)>.18&&(n+=b,i+=k);const x=S=>!!(g.buttons[S]&&g.buttons[S].pressed);r=r||x(0),u=u||x(1),l=l||x(2),c=c||x(3),h=h||x(4),o=o||x(7)||x(5)||x(6),x(9)&&!e.padPrev[9]&&e.onPause&&e.onPause(),e.padPrev[9]=x(9);break}const m=si(a),p=oe(n,i),y=Math.min(1,p.m);return s.mx=(m.fwdX*-p.y+m.rightX*p.x)*y,s.my=(m.fwdY*-p.y+m.rightY*p.x)*y,s.sprint=o,s.pass=r,s.shoot=l,s.through=c,s.tackle=u,s.switchBtn=h||r&&!Ts(t),e.anyPressed=r||l||c||u||o,d&&d.setHasBall(Ts(t)),s}function ji(){const e={ctx:null,master:null,ready:!1,muted:!1,crowd:null,crowdGain:null,crowdFilter:null,level:.25,targetLevel:.25,lastKick:0};return e.init=()=>{if(e.ctx)return e;const t=window.AudioContext||window.webkitAudioContext;return t&&(e.ctx=new t,e.master=e.ctx.createGain(),e.master.gain.value=.9,e.master.connect(e.ctx.destination),Zi(e),e.ready=!0),e},e.resume=()=>{e.ctx&&e.ctx.state==="suspended"&&e.ctx.resume()},e.setMuted=t=>{e.muted=t,e.master&&(e.master.gain.value=t?0:.9)},e.update=(t,a)=>{if(!e.ready)return;const s=a.ball;let i=.2+(1-Math.min(1,Math.abs(Math.abs(s.x)-52.5)/34))*.3;a.phase==="goal"&&(i=1),a.phase==="deadball"&&(i*=.85),e.targetLevel+=(i-e.targetLevel)*Math.min(1,t*1.6),e.level+=(e.targetLevel-e.level)*Math.min(1,t*2.2),e.crowdGain&&(e.crowdGain.gain.value=.085*e.level),e.crowdFilter&&(e.crowdFilter.frequency.value=420+e.level*1250)},e.play=(t,a)=>{if(!e.ready||e.muted)return;const s=e.ctx.currentTime;switch(t){case"kick":Kt(e,s,a&&a.power||.6);break;case"pass":Kt(e,s,.38);break;case"shot":Kt(e,s,.95);break;case"header":Kt(e,s,.5,170);break;case"bounce":Kt(e,s,.22*(a&&a.bounce||.4),120);break;case"post":Qi(e,s);break;case"net":Ji(e,s);break;case"tackle":Ps(e,s);break;case"whistle":er(e,s,a&&a.kind);break;case"goal":Va(e,s,1);break;case"save":Va(e,s,.45),Ps(e,s);break;case"ooh":Va(e,s,.3);break;case"ui":Cs(e,s,660);break;case"uiBig":Cs(e,s,420,.16);break}},e}function Zi(e){const t=e.ctx,a=4*t.sampleRate,s=t.createBuffer(1,a,t.sampleRate),n=s.getChannelData(0);let i=0;for(let c=0;c<a;c++){i=i*.96+(Math.random()*2-1)*.04;const u=1+.4*Math.sin(c/t.sampleRate*.7)+.2*Math.sin(c/t.sampleRate*2.3);n[c]=i*u}const o=t.createBufferSource();o.buffer=s,o.loop=!0;const r=t.createBiquadFilter();r.type="bandpass",r.frequency.value=700,r.Q.value=.6;const l=t.createGain();l.gain.value=.02,o.connect(r),r.connect(l),l.connect(e.master),o.start(),e.crowd=o,e.crowdGain=l,e.crowdFilter=r}function Ht(e,t,a,s,n,i){const o=e.ctx.createGain();return o.gain.setValueAtTime(0,a),o.gain.linearRampToValueAtTime(i,a+s),o.gain.exponentialRampToValueAtTime(1e-4,a+s+n),t.connect(o),o.connect(e.master),o}function Kt(e,t,a,s){const n=e.ctx,i=n.createOscillator();i.type="sine";const o=(s||190)*(.85+a*.5);i.frequency.setValueAtTime(o,t),i.frequency.exponentialRampToValueAtTime(o*.35,t+.09),Ht(e,i,t,.002,.1+a*.05,.3+a*.42),i.start(t),i.stop(t+.22);const r=Ta(e,.05),l=n.createBiquadFilter();l.type="highpass",l.frequency.value=1400,r.connect(l),Ht(e,l,t,.001,.05,.14+a*.22),r.start(t),r.stop(t+.07)}function Ta(e,t){const a=e.ctx,s=Math.max(1,Math.floor(t*a.sampleRate)),n=a.createBuffer(1,s,a.sampleRate),i=n.getChannelData(0);for(let r=0;r<s;r++)i[r]=Math.random()*2-1;const o=a.createBufferSource();return o.buffer=n,o}function Qi(e,t){for(const[a,s]of[[520,.3],[1180,.18],[1960,.1]]){const n=e.ctx.createOscillator();n.type="triangle",n.frequency.value=a,Ht(e,n,t,.001,.5,s),n.start(t),n.stop(t+.6)}}function Ji(e,t){const a=Ta(e,.3),s=e.ctx.createBiquadFilter();s.type="bandpass",s.frequency.setValueAtTime(2600,t),s.frequency.exponentialRampToValueAtTime(700,t+.22),s.Q.value=1.2,a.connect(s),Ht(e,s,t,.004,.25,.3),a.start(t),a.stop(t+.3)}function Ps(e,t){const a=Ta(e,.18),s=e.ctx.createBiquadFilter();s.type="bandpass",s.frequency.value=900,s.Q.value=.8,a.connect(s),Ht(e,s,t,.003,.14,.26),a.start(t),a.stop(t+.2)}function er(e,t,a){const s=a==="halftime"||a==="fulltime"||a==="goal",n=s?.85:.34,i=e.ctx.createOscillator();i.type="sine",i.frequency.setValueAtTime(2550,t);const o=e.ctx.createOscillator();o.frequency.value=28;const r=e.ctx.createGain();r.gain.value=140,o.connect(r),r.connect(i.frequency),o.start(t),o.stop(t+n+.1);const l=e.ctx.createGain();l.gain.setValueAtTime(0,t),l.gain.linearRampToValueAtTime(.2,t+.02),l.gain.setValueAtTime(.2,t+n*.7),l.gain.exponentialRampToValueAtTime(1e-4,t+n),i.connect(l),l.connect(e.master),i.start(t),i.stop(t+n+.05),s&&setTimeout(()=>e.play("whistleShort"),0)}function Va(e,t,a){const s=Ta(e,2.2),n=e.ctx.createBiquadFilter();n.type="bandpass",n.frequency.setValueAtTime(600,t),n.frequency.linearRampToValueAtTime(1500,t+.35),n.frequency.linearRampToValueAtTime(800,t+1.8),n.Q.value=.5,s.connect(n);const i=e.ctx.createGain();i.gain.setValueAtTime(1e-4,t),i.gain.linearRampToValueAtTime(.16*a,t+.18),i.gain.exponentialRampToValueAtTime(1e-4,t+2*(.5+a*.5)),n.connect(i),i.connect(e.master),s.start(t),s.stop(t+2.2)}function Cs(e,t,a,s=.08){const n=e.ctx.createOscillator();n.type="square",n.frequency.setValueAtTime(a,t),n.frequency.exponentialRampToValueAtTime(a*1.5,t+s),Ht(e,n,t,.002,s,.07),n.start(t),n.stop(t+s+.05)}const zs=["pass","shoot","through","tackle","sprint"];function tr(e,t={}){const a={},s=p=>e.querySelector(p);a.pad=s("#pad"),a.zone=s("#stickZone"),a.stick=s("#stick"),a.knob=s("#stickKnob"),a.ring=s("#stickRing");const n={visible:!1,stick:{active:!1,id:-1,dx:0,dy:0,ox:0,oy:0,r:64},buttons:Object.create(null),edge:Object.create(null),hasBall:!1};for(const p of zs)n.buttons[p]=!1;const i=Array.from(e.querySelectorAll("[data-act]"));for(const p of i){const y=p.dataset.act,g=k=>{p.setPointerCapture?.(k.pointerId),p.classList.add("on"),n.buttons[y]=!0,n.edge[y]=!0,t.onPress?.(y),k.preventDefault(),k.stopPropagation()},b=k=>{p.classList.remove("on"),n.buttons[y]=!1,k&&k.preventDefault()};p.addEventListener("pointerdown",g,{passive:!1}),p.addEventListener("pointerup",b,{passive:!1}),p.addEventListener("pointercancel",b),p.addEventListener("lostpointercapture",b),p.addEventListener("contextmenu",k=>k.preventDefault())}const o=n.stick,r=(p,y)=>{a.stick.style.transform=`translate(${p}px, ${y}px)`},l=(p,y)=>{a.knob.style.transform=`translate(${p*o.r*.52}px, ${y*o.r*.52}px)`},c=p=>{if(o.active)return;const y=a.zone.getBoundingClientRect();o.active=!0,o.id=p.pointerId,o.ox=p.clientX,o.oy=p.clientY,o.dx=0,o.dy=0,a.stick.classList.add("on"),r(p.clientX-y.left,p.clientY-y.top),l(0,0),a.zone.setPointerCapture?.(p.pointerId),p.preventDefault()},u=p=>{if(!o.active||p.pointerId!==o.id)return;const y=a.zone.getBoundingClientRect();let g=p.clientX-o.ox,b=p.clientY-o.oy;const k=Math.hypot(g,b),x=o.r*.13;if(k<x)o.dx=0,o.dy=0;else{const S=Math.min(1,(k-x)/(o.r*.74));o.dx=g/k*S,o.dy=b/k*S}k>o.r&&(o.ox+=g*.16,o.oy+=b*.16,r(o.ox-y.left,o.oy-y.top)),l(o.dx,o.dy),p.preventDefault()},h=p=>{!o.active||p&&p.pointerId!==o.id||(o.active=!1,o.id=-1,o.dx=0,o.dy=0,a.stick.classList.remove("on"),l(0,0))};a.zone.addEventListener("pointerdown",c,{passive:!1}),a.zone.addEventListener("pointermove",u,{passive:!1}),a.zone.addEventListener("pointerup",h),a.zone.addEventListener("pointercancel",h),a.zone.addEventListener("lostpointercapture",h),a.zone.addEventListener("contextmenu",p=>p.preventDefault());const d={attack:{pass:"パス",shoot:"シュート",through:"スルー",tackle:"クロス"},defend:{pass:"切替",shoot:"タックル",through:"プレス",tackle:"スライド"}};function v(p){if(n.hasBall===p)return;n.hasBall=p;const y=p?d.attack:d.defend;for(const g of i){const b=y[g.dataset.act];b&&(g.querySelector(".lbl").textContent=b)}a.pad.classList.toggle("attacking",p)}function f(p){if(n.visible=p,a.pad.classList.toggle("hidden",!p),!p){h(null);for(const y of zs)n.buttons[y]=!1}}function m(p,y){const g=Math.max(.74,Math.min(1.5,Math.min(p,y)/420));a.pad.style.setProperty("--cs",g),o.r=64*g}return f(!1),{state:n,setHasBall:v,setVisible:f,layout:m,takeEdge(p){const y=!!n.edge[p];return n.edge[p]=!1,y}}}function ar(e){const t=m=>e.querySelector(m),a={hud:t("#hud"),homeAbbr:t("#sbHomeAbbr"),awayAbbr:t("#sbAwayAbbr"),homeKit:t("#sbHomeKit"),awayKit:t("#sbAwayKit"),score:t("#sbScore"),clock:t("#sbClock"),half:t("#sbHalf"),sub:t("#sbSub"),radar:t("#radarCv"),pcard:t("#pcard"),pnum:t("#pcNum"),pname:t("#pcName"),sta:t("#pcSta"),ctrl:t("#pcCtrl"),toast:t("#toast"),toastBig:t("#toastBig"),toastSub:t("#toastSub"),notice:t("#notice"),noticeText:t("#noticeText"),replay:t("#replayTag"),fps:t("#fpsTag")},s=a.radar.getContext("2d");let n=0,i=0;const o={toastUntil:0,noticeUntil:0,lastGoal:-99,lastNotice:"",shownScore:"",shownClock:"",noticeIdx:0};function r(m){o.noticeIdx=m.notices.length;const p=m.teams[0],y=m.teams[1];a.homeAbbr.textContent=p.club.abbr,a.awayAbbr.textContent=y.club.abbr,a.homeKit.style.background=`linear-gradient(180deg,${p.kit===1?p.club.away1:p.club.c1},${p.kit===1?p.club.away2:p.club.c2})`,a.awayKit.style.background=`linear-gradient(180deg,${y.kit===1?y.club.away1:y.club.c1},${y.kit===1?y.club.away2:y.club.c2})`}function l(m){a.hud.classList.toggle("on",!!m)}function c(m,p,y=2.4){a.toastBig.textContent=m,a.toastSub.textContent=p||"",a.toast.classList.add("on"),o.toastUntil=performance.now()/1e3+y}function u(m,p=""){m===o.lastNotice&&a.notice.classList.contains("on")||(o.lastNotice=m,a.noticeText.textContent=m,a.notice.className=`notice on ${p}`,o.noticeUntil=performance.now()/1e3+2.6)}function h(m){const p=a.radar,y=p.clientWidth,g=p.clientHeight,b=Math.min(2,window.devicePixelRatio||1);(n!==y||i!==g)&&(n=y,i=g,p.width=Math.round(y*b),p.height=Math.round(g*b)),s.setTransform(b,0,0,b,0,0),s.clearRect(0,0,y,g);const k=4,x=(y-k*2)/M.length,S=(g-k*2)/M.width,z=T=>k+(T+M.halfL)*x,w=T=>k+(T+M.halfW)*S;s.fillStyle="rgba(18,54,34,0.55)",s.fillRect(k,k,y-k*2,g-k*2),s.strokeStyle="rgba(255,255,255,0.22)",s.lineWidth=1,s.strokeRect(k,k,y-k*2,g-k*2),s.beginPath(),s.moveTo(z(0),k),s.lineTo(z(0),g-k),s.stroke(),s.beginPath(),s.arc(z(0),w(0),M.centreR*x,0,Math.PI*2),s.stroke();for(const T of[-1,1])s.strokeRect(z(T*M.halfL)-(T>0?M.boxDepth*x:0),w(-M.boxHalfW),M.boxDepth*x,M.boxHalfW*2*S);for(const T of m.players){if(T.sentOff)continue;const A=m.teams[T.team];s.fillStyle=A.kit===1?A.club.away1:A.club.c1,s.beginPath(),s.arc(z(T.x),w(T.y),T.user?2.9:1.9,0,Math.PI*2),s.fill(),T.user&&(s.strokeStyle="#eafff4",s.lineWidth=1.2,s.stroke())}const L=m.ball;s.fillStyle="#ffffff",s.beginPath(),s.arc(z(L.x),w(L.y),1.6,0,Math.PI*2),s.fill()}let d=0;function v(m,p={}){const y=performance.now()/1e3,g=p.dt||.016,b=`${m.teams[0].score} <em>-</em> ${m.teams[1].score}`;b!==o.shownScore&&(a.score.innerHTML=b,o.shownScore=b);const k=Un(m.played);k!==o.shownClock&&(a.clock.textContent=k,o.shownClock=k),a.half.textContent=m.half===1?"1ST":"2ND";const x=m.restart&&m.restart.kind;let S="";m.phase==="halftime"?S="ハーフタイム":m.phase==="fulltime"?S="フルタイム":m.addedTime>0&&m.played>m.halfTime*m.half-1?S=`+${Math.ceil(m.addedTime/60)}`:x&&m.phase==="deadball"&&(S={kickoff:"キックオフ",throwin:"スローイン",corner:"コーナーキック",goalkick:"ゴールキック",freekick:"フリーキック",penalty:"ペナルティキック"}[x]||""),a.sub.textContent=S,a.sub.classList.toggle("on",!!S);const z=m.user&&m.user.player;if(z&&!p.replay){a.pcard.classList.add("on"),a.pnum.textContent=z.shirt,a.pname.textContent=z.name;const w=m.teams[z.team],L=w.kit===1?w.club.away1:w.club.c1,T=w.kit===1?w.club.away2:w.club.c2;a.pnum.style.background=`linear-gradient(180deg,${T},${L})`,a.pnum.style.color="#0a1119";const A=I(z.stamina);a.sta.style.width=`${(A*100).toFixed(0)}%`,a.sta.parentElement.classList.toggle("low",A<.3),a.ctrl.style.width=`${(I(z.k.dribble*.5+z.k.pass*.5)*100).toFixed(0)}%`}else a.pcard.classList.remove("on");if(m.phase==="goal"&&o.lastGoal!==m.t&&m.phaseT<.4){o.lastGoal=m.t;const w=m.lastGoal,L=w&&w.scorer?w.scorer.name:"";c("GOAL",L?`${L}  ${m.teams[0].score} - ${m.teams[1].score}`:"",3.2)}for(m.phase==="halftime"&&m.phaseT<.3&&c("HALF TIME",`${m.teams[0].score} - ${m.teams[1].score}`,2.6),a.toast.classList.contains("on")&&y>o.toastUntil&&a.toast.classList.remove("on");o.noticeIdx<m.notices.length;){const w=m.notices[o.noticeIdx++];w.until>m.t&&u(w.text,w.kind==="bad"?"bad":w.kind==="warn"?"warn":"")}a.notice.classList.contains("on")&&y>o.noticeUntil&&(a.notice.classList.remove("on"),o.lastNotice=""),a.replay.classList.toggle("on",!!p.replay),d+=g,p.radar!==!1&&d>.05?(d=0,a.radar.parentElement.style.display="",h(m)):p.radar===!1&&(a.radar.parentElement.style.display="none")}function f(m){if(!m){a.fps.classList.add("hidden");return}a.fps.classList.remove("hidden"),a.fps.textContent=m}return{setTeams:r,update:v,toast:c,notice:u,show:l,setFps:f,el:a}}const ke=e=>document.querySelector(e),Ls=["boot","title","setup","pause","settings","howto","install","result"];function sr(e){const t=or(),a={cfg:t,screen:"boot",show(c){for(const u of Ls){const h=document.getElementById("s-"+u);h&&h.classList.toggle("hidden",u!==c)}if(a.screen=c||"none",!c)for(const u of Ls)document.getElementById("s-"+u)?.classList.add("hidden")},hide(){a.show(null)}},s=c=>`<span class="crest" style="background:linear-gradient(135deg,${c.c1} 0 55%,${c.c2} 55% 100%)"></span>`;function n(c,u){c.innerHTML="";for(const h of ot){const d=document.createElement("button");d.className="tcard",d.type="button",d.dataset.id=h.id,d.innerHTML=`${s(h)}<span><span class="tname">${h.name}</span>
        <span class="trate">OVR ${Ra(h.id)}</span></span>`,d.addEventListener("click",()=>{u==="home"?(t.home=h.id,t.away===h.id&&(t.away=ot.find(v=>v.id!==h.id).id),t.homeFormation=hs(h.style)):(t.away=h.id,t.home===h.id&&(t.home=ot.find(v=>v.id!==h.id).id)),t.awayFormation=hs(ua(t.away).style),o(),e.sfx?.("ui")}),c.appendChild(d)}}n(ke("#gridHome"),"home"),n(ke("#gridAway"),"away");function i(c,u,h,d,v){c.innerHTML="";for(const f of u){const m=document.createElement("button");m.type="button",m.className=c.classList.contains("chips")?"chip":"opt",m.dataset.v=f.v,m.innerHTML=v(f),m.addEventListener("click",()=>{d(f.v),o(),e.sfx?.("ui")}),c.appendChild(m)}}i(ke("#formList"),Ha.map(c=>({v:c.id,f:c})),()=>t.homeFormation,c=>{t.homeFormation=c},c=>`${c.f.name}<span class="sub">${c.f.desc}</span>`),i(ke("#diffList"),Ea.map(c=>({v:c.id,d:c})),()=>t.difficulty,c=>{t.difficulty=c},c=>`${c.d.name}<span class="sub">${c.d.en}</span>`),i(ke("#lenList"),Gn.map(c=>({v:c})),()=>t.halfMinutes,c=>{t.halfMinutes=c},c=>`${c.v}分`),i(ke("#themeList"),[{v:"night",n:"ナイター"},{v:"day",n:"デイゲーム"},{v:"dusk",n:"夕暮れ"}],()=>t.theme,c=>{t.theme=c},c=>c.n);function o(){for(const[d,v]of[["#gridHome",t.home],["#gridAway",t.away]])document.querySelectorAll(`${d} .tcard`).forEach(f=>f.classList.toggle("sel",f.dataset.id===v));const c=(d,v)=>document.querySelectorAll(`${d} > *`).forEach(f=>f.classList.toggle("sel",f.dataset.v===String(v)));c("#formList",t.homeFormation),c("#diffList",t.difficulty),c("#lenList",t.halfMinutes),c("#themeList",t.theme);const u=ua(t.home),h=ua(t.away);ke("#vsHome").innerHTML=`${s(u)}<span>${u.name}<br><span class="trate">${u.en} · OVR ${Ra(u.id)}</span></span>`,ke("#vsAway").innerHTML=`<span>${h.name}<br><span class="trate">${h.en} · OVR ${Ra(h.id)}</span></span>${s(h)}`,ha(t)}const r=(c,u)=>{const h=ke(c);h.checked=!!t[u],h.addEventListener("change",()=>{t[u]=h.checked,ha(t),e.onSettings?.(t)})},l=(c,u,h=Number)=>{const d=ke(c);d.value=String(t[u]),d.addEventListener("change",()=>{t[u]=h(d.value),ha(t),e.onSettings?.(t)})};return r("#optSound","sound"),r("#optRadar","radar"),r("#optReplay","replay"),l("#optQuality","quality"),l("#optAssist","assist"),l("#optHud","hud"),document.querySelectorAll("[data-go]").forEach(c=>{c.addEventListener("click",()=>{const u=c.dataset.go;e.sfx?.("ui"),u==="setup"?(o(),a.show("setup")):u==="settings"?(a.prevScreen=a.screen,a.show("settings")):a.show(u)})}),ke("#settingsClose").addEventListener("click",()=>{e.sfx?.("ui"),a.show(a.prevScreen==="pause"?"pause":"title")}),ke("#howtoClose").addEventListener("click",()=>{e.sfx?.("ui"),a.show("title")}),ke("#installClose").addEventListener("click",()=>{e.sfx?.("ui"),a.show("title")}),ke("#kickoff").addEventListener("click",()=>{e.sfx?.("uiBig"),e.onKickoff?.({...t})}),ke("#resume").addEventListener("click",()=>{e.sfx?.("ui"),e.onResume?.()}),ke("#restart").addEventListener("click",()=>{e.sfx?.("uiBig"),e.onKickoff?.({...t})}),ke("#quit").addEventListener("click",()=>{e.sfx?.("ui"),e.onQuit?.(),a.show("title")}),ke("#rematch").addEventListener("click",()=>{e.sfx?.("uiBig"),e.onKickoff?.({...t})}),ke("#toSetup").addEventListener("click",()=>{e.sfx?.("ui"),o(),a.show("setup")}),ke("#toTitle").addEventListener("click",()=>{e.sfx?.("ui"),e.onQuit?.(),a.show("title")}),a.syncSetup=o,o(),a}function nr(e){const[t,a]=e.teams,s=t.stats.possSec+a.stats.possSec||1;document.getElementById("ftScore").innerHTML=`${t.club.name} <b>${t.score}</b>–<b>${a.score}</b> ${a.club.name}`;const n=[["ポゼッション",`${Math.round(t.stats.possSec/s*100)}%`,`${Math.round(a.stats.possSec/s*100)}%`],["シュート",t.stats.shots,a.stats.shots],["セーブ",t.stats.saves,a.stats.saves],["パス成功",`${t.stats.passOk}/${t.stats.passes}`,`${a.stats.passOk}/${a.stats.passes}`],["パス成功率",Rs(t.stats.passOk,t.stats.passes),Rs(a.stats.passOk,a.stats.passes)],["タックル",t.stats.tackles,a.stats.tackles],["ファウル",t.stats.fouls,a.stats.fouls],["オフサイド",t.stats.offsides,a.stats.offsides],["カード",`${t.stats.yellow}🟨 ${t.stats.red}🟥`,`${a.stats.yellow}🟨 ${a.stats.red}🟥`]];document.getElementById("ftStats").innerHTML=n.map(([o,r,l])=>`<tr><td>${r}</td><td>${o}</td><td>${l}</td></tr>`).join("");const i=[];for(const o of e.teams)for(const r of o.players.concat(o.bench?[]:[]))r.stats.goals>0&&i.push(`${o.club.abbr} #${r.shirt} ${r.name} ×${r.stats.goals}`);document.getElementById("ftScorers").innerHTML=i.length?"<b>得点者</b><br>"+i.join("<br>"):""}const Rs=(e,t)=>t?Math.round(e/t*100)+"%":"—",tn="pitch26.cfg.v1";function or(){const e={home:"AUR",away:"IRO",homeFormation:"433",awayFormation:"442",difficulty:"pro",halfMinutes:4,theme:"night",sound:!0,radar:!0,replay:!0,quality:1,assist:.6,hud:1,userTeam:0};try{const t=localStorage.getItem(tn);t&&Object.assign(e,JSON.parse(t))}catch{}return ot.some(t=>t.id===e.home)||(e.home="AUR"),ot.some(t=>t.id===e.away)||(e.away="IRO"),e.home===e.away&&(e.away=ot.find(t=>t.id!==e.home).id),e.halfMinutes=F(Number(e.halfMinutes)||4,1,20),e}function ha(e){try{localStorage.setItem(tn,JSON.stringify(e))}catch{}}const As=30,ir=9;function an(e){const t=As*ir,a=e.players.length;return{slots:t,n:a,hz:As,buf:new Float32Array(t*(a*5+5)),stride:a*5+5,head:0,count:0,acc:0,playing:!1,t:0,speed:1,from:0,len:0,cam:null}}function rr(e,t,a){e.acc+=a;const s=1/e.hz;if(e.acc<s)return;e.acc=Math.min(e.acc-s,s);const n=e.head*e.stride,i=e.buf,o=t.players;for(let l=0;l<o.length;l++){const c=o[l],u=n+l*5;i[u]=c.x,i[u+1]=c.y,i[u+2]=c.facing,i[u+3]=c.animPhase,i[u+4]=c.speed+(c.state==="slide"?1e3:c.state==="dive"?2e3:0)}const r=n+o.length*5;i[r]=t.ball.x,i[r+1]=t.ball.y,i[r+2]=t.ball.z,i[r+3]=t.ball.spinVis,i[r+4]=t.t,e.head=(e.head+1)%e.slots,e.count=Math.min(e.count+1,e.slots)}function cr(e,t=6,a=.55){if(e.count<10)return!1;const s=Math.min(e.count,Math.floor(t*e.hz));return e.from=(e.head-s+e.slots)%e.slots,e.len=s,e.t=0,e.speed=a,e.playing=!0,!0}function lr(e){e.playing=!1}function ur(e,t,a){if(!e.playing)return!1;e.t+=a*e.speed;const s=e.t*e.hz;if(s>=e.len-1)return e.playing=!1,!1;const n=Math.floor(s),i=Math.min(n+1,e.len-1),o=s-n,r=(e.from+n)%e.slots*e.stride,l=(e.from+i)%e.slots*e.stride,c=e.buf,u=t.players,h=(m,p)=>m+(p-m)*o;for(let m=0;m<u.length;m++){const p=u[m],y=r+m*5,g=l+m*5;p.x=h(c[y],c[g]),p.y=h(c[y+1],c[g+1]);let b=c[g+2]-c[y+2];for(;b>Math.PI;)b-=Math.PI*2;for(;b<-Math.PI;)b+=Math.PI*2;p.facing=c[y+2]+b*o,p.animPhase=c[y+3];const k=c[y+4];p.state=k>1500?"dive":k>500?"slide":"run",p.speed=k%1e3,p.lean=0,p.kickAnim=0}const d=r+u.length*5,v=l+u.length*5,f=t.ball;return f.x=h(c[d],c[v]),f.y=h(c[d+1],c[v+1]),f.z=h(c[d+2],c[v+2]),f.spinVis=c[d+3],f.vx=(c[v]-c[d])*e.hz,f.vy=(c[v+1]-c[d+1])*e.hz,f.vz=(c[v+2]-c[d+2])*e.hz,f.rolling=f.z<.18&&Math.abs(f.vz)<.6,!0}function fr(e,t){const a=t.ball,s=e.len?Math.min(1,e.t*e.hz/e.len):0,n=Math.sign(a.x)||1,i=-Math.PI*.52,o=-Math.PI*.09,r=i+(o-i)*(s*s*(3-2*s)),l=32-s*9,c=a.x*.75+n*10,u=a.y*.6;return{px:c+Math.cos(r)*l*n,py:u+Math.sin(r)*l,pz:11.5-s*3.4,tx:c,ty:u,tz:1.1}}const hr=document.getElementById("gl"),Ye=Jo(),me=ji();let Te=null,st=null,at=null,yt=null,U=null,Pt=null,Ct=null,ae=null,re="boot",ma=null;const aa=new URLSearchParams(location.search),mr=aa.has("fps"),dr=aa.has("tier")?Number(aa.get("tier")):void 0,tt={t:0,n:0,v:0},he={avg:16.7,scale:1,cool:0,frames:0,floor:.5,target:1e3/60};function vr(){const e=window.devicePixelRatio||1,t=ae?ae.quality:1,a=t>=1?2:t>=.6?1.5:1.1;return Math.min(e,a)}function Rt(){const e=Math.max(320,window.innerWidth),t=Math.max(240,window.innerHeight);ei(Ye,e,t),Te&&Te.setSize(e,t,vr(),he.scale),st&&st.layout(e,t),$a()}window.addEventListener("resize",Rt);window.addEventListener("orientationchange",()=>setTimeout(Rt,150));function $a(){const e=document.getElementById("rotate");if(!e)return;const t=window.innerHeight>window.innerWidth&&window.innerWidth<540;e.classList.toggle("hidden",!(t&&re==="menu"&&!e.dataset.dismissed))}let Ya=60;(function(){let t=0,a=0;const s=n=>{if(a||(a=n),++t<40)return requestAnimationFrame(s);const i=1e3/((n-a)/t);Ya=F(Math.round(i/5)*5,30,240),he.target=1e3/Math.min(Ya,120)};requestAnimationFrame(s)})();function pr(e){if(he.avg=he.avg*.92+Math.min(e*1e3,90)*.08,he.frames++,he.cool>0){he.cool-=e;return}if(!(he.frames<12))if(he.frames=0,he.avg>he.target*1.22&&he.scale>he.floor){const t=he.avg/he.target;he.scale=Math.max(he.floor,he.scale-(t>2?.26:t>1.5?.16:.09)),he.cool=.5,Rt()}else he.avg<he.target*1.02&&he.scale<1&&(he.scale=Math.min(1,he.scale+.05),he.cool=2.4,Rt())}function sn(e){ae={...ae,...e},ha(ae),U=qs({home:ae.home,away:ae.away,homeFormation:ae.homeFormation,awayFormation:ae.awayFormation,difficulty:ae.difficulty,halfMinutes:ae.halfMinutes,userTeam:0}),U.diff.assist=ae.assist,Pt=an(U),Te.setPreset(ae.theme),Te.setMatch(U),at.setTeams(U),at.show(!0),st.setVisible(yt.touchMode),re="play",Ct.hide(),me.init(),me.resume(),me.setMuted(!ae.sound),yr(),Rt();for(let t=0;t<40;t++)fa(Ye,U,1/60,da())}function yr(){const e=document.documentElement;!document.fullscreenElement&&e.requestFullscreen&&e.requestFullscreen({navigationUI:"hide"}).catch(()=>{}),screen.orientation&&screen.orientation.lock&&screen.orientation.lock("landscape").catch(()=>{})}let jt=null;function da(){const t={attackDir:U?U.teams[U.userTeam].side:1,quality:ae?ae.quality:1};return jt?(t.override=jt,t.snap=!0,t.shakeScale=0,jt.fovDeg&&(t.fovDeg=jt.fovDeg),t):(U&&U.phase==="goal"&&U.lastGoal&&U.lastGoal.scorer&&(t.focus=U.lastGoal.scorer),t)}function gr(){const e=U.players,t=new Float32Array(e.length*7+10);for(let n=0;n<e.length;n++){const i=e[n],o=n*7;t[o]=i.x,t[o+1]=i.y,t[o+2]=i.facing,t[o+3]=i.animPhase,t[o+4]=i.speed,t[o+5]=i.vx,t[o+6]=i.vy}const a=e.length*7,s=U.ball;return t[a]=s.x,t[a+1]=s.y,t[a+2]=s.z,t[a+3]=s.vx,t[a+4]=s.vy,t[a+5]=s.vz,t[a+6]=s.spinVis,{arr:t,states:e.map(n=>n.state)}}function xr(e){const t=U.players,a=e.arr;for(let i=0;i<t.length;i++){const o=t[i],r=i*7;o.x=a[r],o.y=a[r+1],o.facing=a[r+2],o.animPhase=a[r+3],o.speed=a[r+4],o.vx=a[r+5],o.vy=a[r+6],o.state=e.states[i]}const s=t.length*7,n=U.ball;n.x=a[s],n.y=a[s+1],n.z=a[s+2],n.vx=a[s+3],n.vy=a[s+4],n.vz=a[s+5],n.spinVis=a[s+6]}function nn(){ae.replay&&cr(Pt,4.2,.6)&&(ma=gr(),re="replay")}function on(){lr(Pt),ma&&(xr(ma),ma=null),re="play"}function br(){for(const e of U.events){const t=e.data||{};switch(Te.event(e.name,t,U),e.name){case"pass":me.play("kick",{power:.45+(t.power||0)*.3});break;case"cross":me.play("kick",{power:.8});break;case"clear":me.play("kick",{power:.85});break;case"shot":me.play("shot");break;case"header":me.play("header");break;case"bounce":me.play("bounce",t);break;case"post":me.play("post"),me.play("ooh"),U.shake=Math.max(U.shake,.5);break;case"net":me.play("net");break;case"tackle":case"slideWin":me.play("tackle");break;case"save":me.play("save");break;case"whistle":me.play("whistle",t);break;case"switch":me.play("ui");break;case"goal":me.play("goal");break;case"replayRequest":nn();break}}}let _a=0,ut=0,rn=!1;function cn(e){requestAnimationFrame(cn);const t=e||performance.now();let a=(t-_a)/1e3;if(_a=t,(!isFinite(a)||a<=0)&&(a=1/60),a=Math.min(a,.1),tt.t+=a,tt.n++,tt.t>.4&&(tt.v=tt.n/tt.t,tt.t=0,tt.n=0),(re==="play"||re==="replay")&&pr(a),re==="play")Ki(yt,U,Ye),rn||Xa(U,a),br(),rr(Pt,U,a),me.update(a,U),fa(Ye,U,a,da()),Te.render(U,Ye,a,re),at.update(U,{dt:a,radar:ae.radar}),U.phase==="fulltime"&&U.phaseT>1.6&&(re="result",st.setVisible(!1),at.show(!1),nr(U),Ct.show("result"));else if(re==="replay"){const s=ur(Pt,U,a);me.update(a,U);const n=fr(Pt,U);fa(Ye,U,a,{...da(),mode:"replay",override:n,shakeScale:0}),Te.render(U,Ye,a,re),at.update(U,{dt:a,radar:ae.radar,replay:!0});const i=yt.anyPressed;(!s||i)&&on()}else re==="paused"||re==="result"?(ut+=a,ut>=1/30&&(ut=0,me.update(a*.2,U),Te.render(U,Ye,a,re),re==="paused"&&at.update(U,{dt:a,radar:ae.radar}))):U&&(ut+=a,ut>=1/30&&(Xa(U,ut),fa(Ye,U,ut,{...da(),mode:"wide"}),Te.render(U,Ye,ut,re),ut=0));mr&&at.setFps(`${tt.v.toFixed(0)}fps ${Ya}Hz  s${he.scale.toFixed(2)}  T${Te?Te.tier:"-"}  ${U?U.phase:""}`)}function Ds(){re!=="play"&&re!=="replay"||(re==="replay"&&on(),re="paused",st.setVisible(!1),Ct.show("pause"))}function Ga(){re==="paused"&&(re="play",st.setVisible(yt.touchMode),Ct.hide(),me.resume(),_a=performance.now())}function Fs(){U=qs({home:ae.home,away:ae.away,homeFormation:ae.homeFormation,awayFormation:ae.awayFormation,difficulty:ae.difficulty,halfMinutes:ae.halfMinutes,noUser:!0}),Pt=an(U),Te.setPreset(ae.theme),Te.setMatch(U),at.setTeams(U)}async function kr(){Ct=sr({onKickoff:e=>sn(e),onResume:Ga,onQuit:()=>{re="menu",at.show(!1),st.setVisible(!1),Fs(),$a()},onSettings:e=>{ae={...ae,...e},me.setMuted(!ae.sound),U&&(U.diff.assist=ae.assist),Te&&Te.setQuality(ae.quality),Rt()},sfx:e=>{me.init(),me.resume(),me.play(e)}}),ae=Ct.cfg,Te=_i(hr,{tier:dr,tierCap:ae.quality>=1?2:ae.quality>=.6?1:0}),aa.has("theme")&&(ae.theme=aa.get("theme")),Te.setQuality(ae.quality),at=ar(document),st=tr(document,{onPress:()=>{me.init(),me.resume()}}),yt=qi({controls:st,onPause:()=>{re==="paused"?Ga():Ds()},onReplay:()=>{re==="play"&&nn()}}),window.addEventListener("pointerdown",e=>{e.pointerType!=="touch"&&e.pointerType!=="pen"||yt.touchMode||(yt.touchMode=!0,(re==="play"||re==="replay")&&st.setVisible(!0))},{capture:!0,passive:!0}),document.getElementById("bPause").addEventListener("pointerdown",e=>{e.preventDefault(),re==="paused"?Ga():Ds()},{passive:!1}),document.getElementById("rotate").addEventListener("click",e=>{e.currentTarget.dataset.dismissed="1",e.currentTarget.classList.add("hidden")}),Rt(),Fs(),re="menu",Ct.show("title"),$a(),requestAnimationFrame(cn),Mr(),wr()}function Mr(){let e=null;const t=document.getElementById("installBtn");window.addEventListener("beforeinstallprompt",a=>{a.preventDefault(),e=a,t.hidden=!1}),t.addEventListener("click",()=>{e&&(t.hidden=!0,e.prompt(),e=null)})}async function wr(){if(location.protocol!=="file:")try{const{registerSW:e}=await Vn(async()=>{const{registerSW:t}=await import("./virtual_pwa-register-DfORtStj.js");return{registerSW:t}},__vite__mapDeps([0,1]),import.meta.url);e({immediate:!0})}catch{}}window.__pitch26={get perf(){return he},get world(){return U},get state(){return re},get cam(){return Ye},get input(){return yt},get gfx(){return Te},get fpsValue(){return tt.v},start:e=>sn(e||{}),setCmd:e=>{U&&Object.assign(U.cmd,e)},setCam:e=>{jt=e},freeze:e=>{rn=!!e},tick:e=>{for(let t=0;t<(e||1);t++)Xa(U,1/60)},pitch:M};kr();export{Vn as _};
