'use strict';
/* =====================================================================
   RENDERER - canvas painting of the whole map & effects.
===================================================================== */

const COL = {
  ink:'#2e2416',
  sea:'rgba(126,160,168,0.55)', seaCoast:'rgba(74,104,112,0.8)',
  river:'rgba(64,104,112,0.75)',
  rail:'#6b543a',
  paper1:'#eee3c8', paper2:'#dbcba4',
  ger:'#46525c', gerHi:'#8b98a3',
  sov:'#9e362b', sovHi:'#d05a4a',
  gold:'#c9a227'
};

/* =====================================================================
   WEAPON SPRITES - small, hand-drawn, semi-realistic silhouettes.
   All face right; origin at ground centre. scale s: 1 ~ 30px tank.
===================================================================== */
const SPR = {
  assets:{},
  asset(ctx, s, key, w, h, x=0, y=0, flip=false, crop=null){
    const img = this.assets && this.assets[key];
    if(!img || !img.complete || !img.naturalWidth) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((flip ? -1 : 1) * s, s);
    if(crop){
      ctx.drawImage(img, crop.sx*img.naturalWidth, crop.sy*img.naturalHeight,
        crop.sw*img.naturalWidth, crop.sh*img.naturalHeight, -w/2, -h/2, w, h);
    } else {
      ctx.drawImage(img, -w/2, -h/2, w, h);
    }
    ctx.restore();
    return true;
  },
  shadow(ctx, w){
    ctx.fillStyle = 'rgba(40,32,18,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 0, w, w*0.28, 0, 0, 7); ctx.fill();
  },
  soldier(ctx, s, side, elite){
    ctx.save(); ctx.scale(s, s);
    const uni = elite==='guards' ? '#6e6f4e' : elite==='gd' ? '#4d5748' : (side==='GER' ? '#5a6355' : '#77694a');
    const helm = side==='GER' ? '#3d453b' : '#4a452f';
    ctx.fillStyle = helm;
    ctx.fillRect(-1.7, -2.6, 1.4, 2.6); ctx.fillRect(0.4, -2.6, 1.4, 2.6);       // legs
    ctx.fillStyle = uni;
    ctx.beginPath(); ctx.moveTo(-2.1,-7.6); ctx.lineTo(2.1,-7.6); ctx.lineTo(2.7,-2.2); ctx.lineTo(-2.7,-2.2); ctx.closePath(); ctx.fill();
    if(elite === 'guards'){                    // Guards: red-banded shoulder boards
      ctx.fillStyle = '#a83227'; ctx.fillRect(-1.7,-7.4,1.3,1.7); ctx.fillRect(0.5,-7.4,1.3,1.7);
    }
    if(elite === 'gd'){                        // Grossdeutschland: white straps, GD monogram
      ctx.fillStyle = '#e8e4da'; ctx.fillRect(-1.7,-7.4,1.1,1.7); ctx.fillRect(0.7,-7.4,1.1,1.7);
    }
    ctx.fillStyle = '#d8b08c'; ctx.beginPath(); ctx.arc(0,-8.5,1.5,0,7); ctx.fill();
    ctx.fillStyle = helm;
    if(side==='SOV' && elite !== 'guards'){    // Soviet pilotka sidecap
      ctx.beginPath(); ctx.moveTo(-2,-8.2); ctx.lineTo(2,-8.2); ctx.lineTo(1.2,-9.9); ctx.lineTo(-1.4,-9.6); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0,-8.7,1.9,Math.PI,0); ctx.fill(); ctx.fillRect(-2,-8.8,4,0.8);
    }
    if(elite === 'guards'){ ctx.fillStyle = '#e8c95a'; ctx.beginPath(); ctx.arc(-0.6,-9.3,0.6,0,7); ctx.fill(); }
    ctx.strokeStyle = '#2b241c'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-2.4,-3.6); ctx.lineTo(5.2,-6.6); ctx.stroke();  // rifle
    ctx.restore();
  },
  panzer(ctx, s){          // Panzer IV - dunkelgelb, boxy turret, long 7.5cm
    if(this.asset(ctx, s, 'panzer', 44, 18, 2, -2, true)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#33363a';
    ctx.beginPath(); ctx.roundRect(-15, 1.2, 30, 5.6, 2.8); ctx.fill();
    ctx.fillStyle = '#1f2226';
    [-11.5,-7,-2.5,2,6.5,11].forEach(x => { ctx.beginPath(); ctx.arc(x, 4, 1.7, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#8a7a52';
    ctx.beginPath(); ctx.roundRect(-15.5, -1.8, 31, 4.6, 1); ctx.fill();
    ctx.fillStyle = '#7a6c46';
    ctx.beginPath(); ctx.roundRect(-6.5, -6.8, 13.5, 5.4, 1.6); ctx.fill();
    ctx.fillStyle = '#7a6c46'; ctx.beginPath(); ctx.arc(2.5, -7.2, 1.7, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#6b5e3d'; ctx.fillRect(2.2, -8.4, 2.6, 1.1);   // commander hatch
    ctx.strokeStyle = '#453f30'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(20.5, -4); ctx.stroke();
    ctx.fillStyle = '#453f30'; ctx.fillRect(19.5, -4.7, 2.8, 1.4);
    ctx.strokeStyle = '#6b5e3d'; ctx.lineWidth = 0.8;               // side skirt hint
    ctx.beginPath(); ctx.moveTo(-15, -0.4); ctx.lineTo(14, -0.4); ctx.stroke();
    SPR.cross(ctx, -12.5, -3.2, 1.1);
    ctx.restore();
  },
  t34(ctx, s){             // T-34 - sloped glacis, rounded turret
    if(this.asset(ctx, s, 't34', 44, 18, 2, -2, true)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#33362e';
    ctx.beginPath(); ctx.roundRect(-14, 1.2, 28, 5.6, 2.8); ctx.fill();
    ctx.fillStyle = '#21241d';
    [-10,-5.5,-1,3.5,8].forEach(x => { ctx.beginPath(); ctx.arc(x, 4, 2, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#4f5d3a';
    ctx.beginPath();
    ctx.moveTo(-14.5, -1.8); ctx.lineTo(-14.5, 2.6); ctx.lineTo(14.5, 2.6); ctx.lineTo(14.5, -1.4);
    ctx.lineTo(7, -3.8); ctx.lineTo(-9, -3.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5d6b47';
    ctx.beginPath(); ctx.ellipse(-1.5, -4.6, 6.8, 3.3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#52603e'; ctx.fillRect(1.5, -6.2, 2.4, 1.5);   // gun mantlet
    ctx.strokeStyle = '#3a4229'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(4, -4.6); ctx.lineTo(18, -4.6); ctx.stroke();
    ctx.fillStyle = '#3d4a2c';                                      // lend-era rear fuel drums
    ctx.fillRect(-16.6, -3.6, 3.2, 2.1); ctx.fillRect(-16.6, -0.9, 3.2, 2.1);
    ctx.fillStyle = '#c9a227';  // red star (gold-ish for visibility)
    ctx.beginPath(); ctx.arc(-3.5, -5.6, 1.4, 0, 7); ctx.fill();
    ctx.restore();
  },
  tiger(ctx, s){           // Tiger I - long, tall, interleaved wheels
    if(this.asset(ctx, s, 'tiger', 49, 20, 3, -2, true)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#33363a';
    ctx.beginPath(); ctx.roundRect(-17, 1.6, 34, 6, 3); ctx.fill();
    ctx.fillStyle = '#1f2226';
    for(let i=0; i<7; i++){ ctx.beginPath(); ctx.arc(-13 + i*4.35, 4.4, 1.8, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#8a7a52';
    ctx.beginPath(); ctx.roundRect(-17.5, -1.8, 35, 4.8, 1); ctx.fill();
    ctx.fillStyle = '#7a6c46';
    ctx.beginPath(); ctx.roundRect(-8, -7.6, 17, 6, 1.6); ctx.fill();
    ctx.fillStyle = '#6b5e3d'; ctx.beginPath(); ctx.arc(6, -7.9, 2.1, Math.PI, 0); ctx.fill();  // cupola
    ctx.strokeStyle = '#453f30'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(9, -4.4); ctx.lineTo(26, -4.4); ctx.stroke();
    ctx.fillStyle = '#453f30'; ctx.fillRect(25, -5.2, 3, 1.6);
    ctx.strokeStyle = '#6b5e3d'; ctx.lineWidth = 0.7;                 // zimmerit hint
    ctx.beginPath(); ctx.moveTo(-7.4, -6.4); ctx.lineTo(8.4, -6.4); ctx.stroke();
    SPR.cross(ctx, -14.5, -3.4, 1.1);
    ctx.restore();
  },
  katyusha(ctx, s){        // BM-13 on a lend-lease Studebaker US6
    if(this.asset(ctx, s, 'katyusha', 44, 20, 2, -2, true)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#2c3324';
    [-11,-6.5,-2,3,7].forEach(x => { ctx.beginPath(); ctx.arc(x, 3.6, 1.9, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#4f5d3a';
    ctx.fillRect(-15, -0.5, 21, 2.6);                       // bed
    ctx.fillStyle = '#546140';                              // US6 cab - flat vertical front
    ctx.beginPath();
    ctx.moveTo(6.5, -0.6); ctx.lineTo(6.5, -5.6); ctx.lineTo(12.8, -5.6); ctx.lineTo(13.6, -3.4); ctx.lineTo(13.6, -0.6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a9c0c8'; ctx.fillRect(9.4, -5, 3, 1.5);       // windshield
    ctx.fillStyle = '#3d4a2c'; ctx.fillRect(12.9, -4.9, 1.6, 2.6);  // front grille
    ctx.save();                                             // rocket erector
    ctx.translate(-6, -1.6); ctx.rotate(-0.42);
    ctx.fillStyle = '#434d33'; ctx.fillRect(-9, -3.4, 19, 3.6);
    ctx.fillStyle = '#7a2c1e';
    for(let i=0; i<5; i++) ctx.fillRect(-8.4 + i*3.7, -3.4, 1.7, 3.6);
    ctx.restore();
    ctx.restore();
  },
  stuka(ctx, s){           // Ju 87 - gull wing, fixed spats, greenhouse
    if(this.asset(ctx, s, 'ju87', 34, 15, 0, -1, false)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#4a5560';
    ctx.beginPath();
    ctx.moveTo(14, -1.2);
    ctx.quadraticCurveTo(8, -3.6, 1.5, -3.3);
    ctx.lineTo(-1.5, -4.6); ctx.lineTo(-4.5, -3.4);
    ctx.quadraticCurveTo(-11, -2.7, -15, -1.4);
    ctx.lineTo(-15.6, 1.4); ctx.lineTo(-9, 2.2);
    ctx.quadraticCurveTo(0, 2.8, 8, 2.4);
    ctx.quadraticCurveTo(13, 1.8, 14, -1.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d4750';                              // gull wing
    ctx.beginPath(); ctx.moveTo(5, -0.6); ctx.lineTo(-5.5, -0.6); ctx.lineTo(-7, 2); ctx.lineTo(3.5, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3d4750'; ctx.fillRect(2.6, 1.6, 1.2, 3);      // gear leg
    ctx.beginPath(); ctx.ellipse(3.6, 5.8, 1.2, 2.2, 0, 0, 7); ctx.fill();
    ctx.beginPath();                                        // tailfin
    ctx.moveTo(-14.8, -1.2); ctx.lineTo(-17.6, -6.2); ctx.lineTo(-13.6, -5.6); ctx.lineTo(-11.8, -1.6);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(-16.4, -0.4, 5, 1.1);                      // tailplane
    ctx.fillStyle = '#9fb6bf'; ctx.fillRect(-3.4, -4.2, 2.6, 1.3);  // canopy glass
    SPR.cross(ctx, -7.5, -0.2, 0.9);
    ctx.restore();
  },
  il2(ctx, s){             // Il-2 Shturmovik - armored tub, straight wing
    if(this.asset(ctx, s, 'il2', 34, 15, 0, -1, false)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#445036';
    ctx.beginPath();
    ctx.moveTo(13, -1);
    ctx.quadraticCurveTo(9, -3.4, 3, -3.2);
    ctx.lineTo(-2, -3.8); ctx.lineTo(-5, -3);
    ctx.quadraticCurveTo(-10.5, -2.4, -14.5, -1.2);
    ctx.lineTo(-15, 1.6); ctx.lineTo(-8, 2.4);
    ctx.quadraticCurveTo(0, 3, 8, 2.6);
    ctx.quadraticCurveTo(12.5, 1.8, 13, -1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#39442c';                              // straight wing
    ctx.beginPath(); ctx.moveTo(4.5, -0.4); ctx.lineTo(-6.5, -0.4); ctx.lineTo(-7, 2.2); ctx.lineTo(4, 2.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#39442c';
    ctx.beginPath(); ctx.ellipse(1.5, 4.4, 1.1, 2, 0, 0, 7); ctx.fill();   // wheel fairing
    ctx.beginPath();
    ctx.moveTo(-14.2, -1); ctx.lineTo(-16.8, -5.4); ctx.lineTo(-13.2, -5); ctx.lineTo(-11.4, -1.4);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(-15.8, -0.2, 4.6, 1.1);
    ctx.fillStyle = '#9fb6bf'; ctx.fillRect(6.5, -2.6, 3, 1.3);
    ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(-9, -0.4, 1.1, 0, 7); ctx.fill();
    ctx.restore();
  },
  stug(ctx, s){            // StuG III - low fixed casement, no turret
    if(this.asset(ctx, s, 'stug', 42, 18, 2, -2, true)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#33363a';
    ctx.beginPath(); ctx.roundRect(-14, 1.4, 28, 5.2, 2.6); ctx.fill();
    ctx.fillStyle = '#1f2226';
    [-10,-6,-2,2,6,10].forEach(x => { ctx.beginPath(); ctx.arc(x, 3.9, 1.6, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#8a7a52';
    ctx.beginPath(); ctx.roundRect(-14.5, -1.6, 29, 4.2, 1); ctx.fill();
    ctx.fillStyle = '#7a6c46';
    ctx.beginPath(); ctx.moveTo(-8.5, -1.8); ctx.lineTo(-6.5, -6.4); ctx.lineTo(8.5, -6.4); ctx.lineTo(9.5, -1.8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#453f30'; ctx.fillRect(8.8, -4.8, 2.2, 2);      // mantlet
    ctx.strokeStyle = '#453f30'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(10.2, -3.8); ctx.lineTo(19.5, -3.2); ctx.stroke();
    SPR.cross(ctx, -12, -3.6, 1.0);
    ctx.restore();
  },
  kv1(ctx, s){             // KV-1 - 52 tonnes of boxy armour
    if(this.asset(ctx, s, 'kv1', 44, 20, 2, -2, true)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#33362e';
    ctx.beginPath(); ctx.roundRect(-16, 1.2, 32, 6.4, 3); ctx.fill();
    ctx.fillStyle = '#21241d';
    [-12,-7.5,-3,1.5,6,10.5].forEach(x => { ctx.beginPath(); ctx.arc(x, 4.2, 2.1, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#4f5d3a';
    ctx.beginPath(); ctx.roundRect(-16, -2, 32, 4.4, 1); ctx.fill();
    ctx.fillStyle = '#5d6b47';
    ctx.beginPath(); ctx.roundRect(-7, -7.4, 13, 5.6, 1.4); ctx.fill();
    ctx.fillStyle = '#52603e'; ctx.fillRect(-7.4, -7.9, 13.8, 1.5);
    ctx.strokeStyle = '#3a4229'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(6, -4.6); ctx.lineTo(19, -4.6); ctx.stroke();
    ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(-4, -6, 1.3, 0, 7); ctx.fill();
    ctx.restore();
  },
  su76(ctx, s){            // SU-76 - open-top casement on a light chassis
    if(this.asset(ctx, s, 'su76', 42, 18, 2, -2, true)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#33362e';
    ctx.beginPath(); ctx.roundRect(-12, 1.4, 24, 4.6, 2.3); ctx.fill();
    ctx.fillStyle = '#21241d';
    [-8,-4.5,-1,2.5,6].forEach(x => { ctx.beginPath(); ctx.arc(x, 3.5, 1.5, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#4f5d3a';
    ctx.beginPath(); ctx.roundRect(-12, -1.2, 24, 3.4, 0.8); ctx.fill();
    ctx.fillStyle = '#5d6b47';
    ctx.beginPath(); ctx.moveTo(-9, -1.4); ctx.lineTo(-9, -6.4); ctx.lineTo(2, -6.4); ctx.lineTo(5, -1.4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a4229'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(3.5, -4.2); ctx.lineTo(13.5, -3.4); ctx.stroke();
    ctx.restore();
  },
  nebelwerfer(ctx, s){     // Nebelwerfer 41 - towed six-tube launcher
    if(this.asset(ctx, s, 'nebel', 36, 19, 2, -2, true)) return;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#3c4531'; ctx.fillRect(-10, 1.2, 15, 1.8);      // trail
    ctx.fillStyle = '#23251f';
    [-2.2, 1.8].forEach(x => { ctx.beginPath(); ctx.arc(x, 2.4, 2.1, 0, 7); ctx.fill(); });
    ctx.save();
    ctx.translate(-2, 0.4); ctx.rotate(-0.5);
    ctx.fillStyle = '#434d33'; ctx.fillRect(-7, -1.6, 14, 2.8);
    ctx.fillStyle = '#2c3324';
    for(let i=0; i<3; i++) ctx.fillRect(-6.4 + i*4.6, -1.6, 1.2, 2.8);
    ctx.restore();
    ctx.fillStyle = '#434d33'; ctx.fillRect(4.5, -2.4, 5, 3.2);      // ammo carrier
    ctx.restore();
  },
  cross(ctx, x, y, s){     // Balkenkreuz
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#e8e4da'; ctx.fillRect(-2.1, -0.7, 4.2, 1.4); ctx.fillRect(-0.7, -2.1, 1.4, 4.2);
    ctx.fillStyle = '#1a1c1e'; ctx.fillRect(-1.5, -0.45, 3, 0.9); ctx.fillRect(-0.45, -1.5, 0.9, 3);
    ctx.restore();
  },
  heavy(ctx, s, side){ return side === 'GER' ? SPR.tiger(ctx, s) : SPR.katyusha(ctx, s); },
  tank(ctx, s, side){ return side === 'GER' ? SPR.panzer(ctx, s) : SPR.t34(ctx, s); },
  /* waving flags - real flag renders when loaded, hand-drawn otherwise (dir = +/-1) */
  flag(ctx, x, y, side, s, t, phase, dir){
    const img = this.flagImgs && this.flagImgs[side] && this.flagImgs[side].complete && this.flagImgs[side].naturalWidth;
    if(img){
      ctx.save(); ctx.translate(x, y); ctx.scale(s*(dir||1), s);
      const w = 15, h = 9, slices = 4;
      for(let i=0; i<slices; i++){
        const u0 = i/slices, u1 = (i+1)/slices;
        const dy  = Math.sin(t*3.2 + phase + u0*2.6) * 0.8;
        const dy1 = Math.sin(t*3.2 + phase + u1*2.6) * 0.8;
        ctx.drawImage(this.flagImgs[side],
          u0*this.flagImgs[side].naturalWidth, 0, this.flagImgs[side].naturalWidth/slices, this.flagImgs[side].naturalHeight,
          u0*w, dy - h, (u1-u0)*w + 0.3, h + (dy1-dy));
      }
      ctx.strokeStyle = 'rgba(25,16,8,0.4)'; ctx.lineWidth = 0.7;
      ctx.strokeRect(0, -h, w, h);
      ctx.restore();
      return;
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (dir||1), s);
    const w = 12, h = 8;
    const wv  = Math.sin(t*3.2 + phase) * 1.2;
    const wv2 = Math.sin(t*3.2 + phase + 0.9) * 1.2;
    if(side === 'GER'){
      const stripes = [['#1c1c1c', -1], ['#efe9dc', 0], ['#a02525', 1]];
      for(const [col, i] of stripes){
        ctx.fillStyle = col;
        ctx.beginPath();
        const y0 = i*h/3, y1 = (i+1)*h/3;
        ctx.moveTo(0, y0); ctx.lineTo(w, y0 + wv); ctx.lineTo(w, y1 + wv2); ctx.lineTo(0, y1);
        ctx.closePath(); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#b5321f';
      ctx.beginPath();
      ctx.moveTo(0, -h); ctx.lineTo(w, -h + wv); ctx.lineTo(w, wv2); ctx.lineTo(0, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8c95a';
      ctx.beginPath();                                  // star
      for(let i=0; i<5; i++){
        const a = -Math.PI/2 + i*2*Math.PI/5;
        ctx.lineTo(2.8 + Math.cos(a)*1.5, -h + 2.6 + Math.sin(a)*1.5);
        const a2 = a + Math.PI/5;
        ctx.lineTo(2.8 + Math.cos(a2)*0.6, -h + 2.6 + Math.sin(a2)*0.6);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e8c95a'; ctx.lineWidth = 0.9; // hammer & sickle
      ctx.beginPath(); ctx.arc(6.6, -h + 4.2, 2.1, -2.6, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5.4, -h + 6.2); ctx.lineTo(8.8, -h + 3); ctx.stroke();
      ctx.fillRect(8.2, -h + 2.4, 1.9, 1.3);
    }
    ctx.restore();
  }
};

class Renderer {
  constructor(canvas, game){
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.view = { scale:1, ox:0, oy:0 };
    this.floaters = [];     // {x,y(map), text, color, t, dur, big}
    this.puffs = [];        // {x,y(map), vx,vy, t,dur, r, color}
    this.flashes = [];      // {x,y(map), t,dur,r}
    this.captures = [];     // {id, side, t, dur}
    this.deployType = null; // dock selection: 'inf'|'tank'|'heavy'|'air'|null
    this.shake = 0;
    this.snow = [];
    this.rain = [];
    // Keep terrain marks stable between frames. Redrawing these with Math.random()
    // made the map shimmer instead of feeling like a printed staff map.
    this.marshMotes = Array.from({length:46}, (_, i) => ({
      a: (i * 2.3999632297) % (Math.PI * 2),
      r: Math.sqrt((i + 0.5) / 46),
      size: 1.8 + (i % 4) * 0.55
    }));
    this.time = 0;
    this.sel = null; this.target = null;   // ui selection (ids)
    this.tutCities = [];                   // field manual: cities to ring
    this.flagImgs = { GER:new Image(), SOV:new Image() };
    this.flagImgs.GER.src = 'assets/flag-ger.svg?v=46';
    this.flagImgs.SOV.src = 'assets/flag-sov.svg?v=47';
    this.equipmentImgs = {};
    for(const [key, src] of Object.entries({
      panzer:'assets/equipment/icons/panzer-iv.svg?v=2',
      tiger:'assets/equipment/icons/tiger-i.svg?v=2',
      t34:'assets/equipment/icons/t34-76.svg?v=2',
      stug:'assets/equipment/icons/stug-iii.svg?v=2',
      kv1:'assets/equipment/icons/kv-1.svg?v=2',
      su76:'assets/equipment/icons/su-76.svg?v=2',
      katyusha:'assets/equipment/icons/katyusha.svg?v=2',
      nebel:'assets/equipment/icons/nebelwerfer.svg?v=2',
      ju87:'assets/equipment/icons/ju-87.svg?v=2',
      il2:'assets/equipment/icons/il-2.svg?v=2'
    })){
      const img = new Image();
      img.src = src; this.equipmentImgs[key] = img;
    }
    SPR.assets = this.equipmentImgs;
    this.resize();
    this.makeNoise();
    window.addEventListener('resize', () => this.resize());
  }

  resize(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fit the map between the top bar and the bottom command strip -
    // stretched wide (cinematic war-map look), then zoom/pan apply on top
    const area = { x:4, y:64, w:this.w - 8, h:this.h - 64 - 150 };
    this.area = area;
    let scx = area.w / MAPGEO.Wm, scy = area.h / MAPGEO.Hm;
    const base = Math.min(scx, scy);
    this.base = {
      sx1: Math.min(scx, base*1.55)*0.99,
      sy1: scy*0.99,
      ox: 0, oy: 0
    };
    this.base.ox = area.x + (area.w - MAPGEO.Wm*this.base.sx1)/2;
    this.base.oy = area.y + (area.h - MAPGEO.Hm*this.base.sy1)/2;
    if(this.zoom === undefined){ this.zoom = 1; this.pan = { x:0, y:0 }; }
    this.applyView();
    // weather particles
    this.snow = Array.from({length:130}, () => ({ x:Math.random()*this.w, y:Math.random()*this.h, v:18+Math.random()*30, dr:Math.random()*24-12, r:0.8+Math.random()*1.8 }));
    this.rain = Array.from({length:90}, () => ({ x:Math.random()*this.w, y:Math.random()*this.h, v:380+Math.random()*220 }));
  }

  makeNoise(){
    const n = document.createElement('canvas'); n.width = n.height = 160;
    const c = n.getContext('2d');
    const img = c.createImageData(160, 160);
    for(let i=0; i<img.data.length; i+=4){
      const v = 120 + Math.random()*80;
      img.data[i]=v; img.data[i+1]=v; img.data[i+2]=v;
      img.data[i+3]= Math.random()<0.5 ? 14 : 5;
    }
    c.putImageData(img, 0, 0);
    this.noise = this.ctx.createPattern(n, 'repeat');
  }

  applyView(){
    this.view.sx1 = this.base.sx1 * this.zoom;
    this.view.sy1 = this.base.sy1 * this.zoom;
    this.view.ox  = this.base.ox + this.pan.x;
    this.view.oy  = this.base.oy + this.pan.y;
    this.view.scale = (this.view.sx1 + this.view.sy1)/2;
    // keep the map on the table
    const mw = MAPGEO.Wm*this.view.sx1, mh = MAPGEO.Hm*this.view.sy1;
    const mx = Math.max(0, (mw - this.area.w)/2 + 70), my = Math.max(0, (mh - this.area.h)/2 + 60);
    this.pan.x = clamp(this.pan.x, -mx, mx);
    this.pan.y = clamp(this.pan.y, -my, my);
  }
  wheelZoom(mx, my, deltaY){
    const factor = deltaY < 0 ? 1.16 : 1/1.16;
    const nz = clamp(this.zoom * factor, 1, 4);
    const f = nz / this.zoom;
    this.pan.x = (mx - this.base.ox)*(1 - f) + this.pan.x * f;
    this.pan.y = (my - this.base.oy)*(1 - f) + this.pan.y * f;
    this.zoom = nz;
    this.applyView();
  }
  panBy(dx, dy){
    this.pan.x += dx; this.pan.y += dy;
    this.applyView();
  }

  /* ---------- coordinate helpers ---------- */
  sx(x){ return this.view.ox + x*this.view.sx1; }
  sy(y){ return this.view.oy + y*this.view.sy1; }
  toScreen(lon, lat){ const p = projLL(lon, lat); return { x:this.sx(p.x), y:this.sy(p.y) }; }
  toMap(px, py){ return { x:(px-this.view.ox)/this.view.sx1, y:(py-this.view.oy)/this.view.sy1 }; }
  cityScreen(id){
    const d = this.game.cities[id].def;
    return this.toScreen(d.lon, d.lat);
  }
  hitCity(px, py){
    let best = null, bd = 22*22;
    for(const id in this.game.cities){
      const s = this.cityScreen(id);
      const d = (s.x-px)**2 + (s.y-py)**2;
      if(d < bd){ bd = d; best = id; }
    }
    return best;
  }

  /* ---------- fx API (called by main) ---------- */
  floater(id, text, color, big){
    const s = this.cityScreen(id);
    this.floaters.push({ x:s.x, y:s.y-26, text, color, t:0, dur:big?2.4:1.6, big:!!big });
  }
  floaterXY(px, py, text, color, big){
    this.floaters.push({ x:px, y:py-10, text, color, t:0, dur:big?2.4:1.6, big:!!big });
  }
  floaterLL(lon, lat, text, color, big){
    const s = this.toScreen(lon, lat);
    this.floaters.push({ x:s.x, y:s.y-20, text, color, t:0, dur:big?2.4:1.6, big:!!big });
  }
  boom(id){
    const s = this.cityScreen(id);
    this.flashes.push({ x:s.x, y:s.y, t:0, dur:0.8, r:34 });
    for(let i=0; i<14; i++){
      const a = Math.random()*Math.PI*2, v = 14+Math.random()*46;
      this.puffs.push({ x:s.x, y:s.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v-14, t:0, dur:0.9+Math.random()*0.9, r:2+Math.random()*4, color:Math.random()<0.5?'#e8934a':'#5a5148' });
    }
    this.shake = Math.min(7, this.shake + 4);
  }
  captureFx(id, side){ this.captures.push({ id, side, t:0, dur:1.4 }); this.boom(id); }

  /* ===================================================================== */
  draw(dt, ui){
    this.time += dt;
    const ctx = this.ctx, g = this.game;
    ctx.clearRect(0, 0, this.w, this.h);

    // desk
    const dg = ctx.createRadialGradient(this.w/2, this.h/3, 60, this.w/2, this.h/2, this.h);
    dg.addColorStop(0, '#2a2318'); dg.addColorStop(1, '#100d09');
    ctx.fillStyle = dg; ctx.fillRect(0, 0, this.w, this.h);

    ctx.save();
    if(this.shake > 0.2){
      ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
      this.shake *= Math.pow(0.02, dt);
    } else this.shake = 0;

    // ---- paper map ----
    const x0 = this.sx(0)-14, y0 = this.sy(0)-14, x1 = this.sx(MAPGEO.Wm)+14, y1 = this.sy(MAPGEO.Hm)+14;
    ctx.save();
    ctx.shadowColor = '#000c'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 8;
    // The Godot port's strength is its clean, almost flat cartographic base.
    // Keep only a restrained vertical warmth so the paper reads consistently.
    const pg = ctx.createLinearGradient(0, y0, 0, y1);
    pg.addColorStop(0, '#eee5cf'); pg.addColorStop(0.56, '#e8ddc1'); pg.addColorStop(1, '#e2d4b3');
    ctx.fillStyle = pg;
    ctx.fillRect(x0, y0, x1-x0, y1-y0);
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, x1-x0, y1-y0); ctx.clip();

    // graticule
    ctx.strokeStyle = 'rgba(60,48,30,0.09)'; ctx.lineWidth = 1;
    for(let lon=10; lon<=50; lon+=5){
      const a = this.toScreen(lon, MAPGEO.latMax), b = this.toScreen(lon, MAPGEO.latMin);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for(let lat=45; lat<=60; lat+=5){
      const a = this.toScreen(MAPGEO.lonMin, lat), b = this.toScreen(MAPGEO.lonMax, lat);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // noise
    ctx.fillStyle = this.noise; ctx.fillRect(x0, y0, x1-x0, y1-y0);

    // political tints (the 1941 map)
    for(const t of TINTS) this.polygon(t.pts, t.fill, t.a, null);

    // the Road of Life - Leningrad's frozen lifeline across Lake Ladoga
    {
      const len = g.cities.leningrad;
      if(len && len.owner === 'SOV' && (len.g.inf + len.g.tank + len.g.heavy > 0)){
        const winter = g.season().key === 'winter';
        const route = [[30.31,59.98],[30.95,60.13],[31.75,60.31],[32.75,60.44]];
        const pts = route.map(p => this.toScreen(p[0], p[1]));
        if(!len.supplied || winter){
          ctx.setLineDash([7,5]);
          ctx.strokeStyle = winter ? 'rgba(245,250,255,0.9)' : 'rgba(100,120,130,0.28)';
          ctx.lineWidth = winter ? 2.4 : 1.3;
          ctx.beginPath();
          pts.forEach((p,i) => i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = `italic ${winter ? '600 9px' : '600 8px'} 'Cormorant SC',Georgia,serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = winter ? 'rgba(240,246,252,0.9)' : 'rgba(100,120,130,0.4)';
          const lab = this.toScreen(31.9, 60.02);
          ctx.fillText('ROAD OF LIFE', lab.x, lab.y);
        }
        if(winter && !len.supplied){
          // trucks of the iced highway, running day and night
          for(let i=0; i<3; i++){
            const tt = (this.time*0.13 + i*0.34) % 1;
            const seg = Math.min(2, Math.floor(tt*3));
            const f = tt*3 - seg;
            const A = pts[seg], B = pts[seg+1];
            const x = A.x + (B.x-A.x)*f, y = A.y + (B.y-A.y)*f;
            ctx.fillStyle = '#2b3038';
            ctx.fillRect(x-3, y-2, 6, 3.4);
            ctx.fillStyle = '#c8d4da';
            ctx.fillRect(x+1.2, y-1.6, 1.4, 1.2);
          }
        }
      }
    }

    // water features - drawn explicitly so the map reads like a map at a glance
    for(const lake of LAKES) this.polygon(lake.pts, '#8eaeb0', 0.22, 'rgba(64,104,112,0.35)', 1);
    for(const river of RIVERS){
      const pts = river.pts.map(p => this.toScreen(p[0], p[1]));
      if(pts.length < 2) continue;
      ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.strokeStyle = river.name ? 'rgba(64,104,112,0.64)' : 'rgba(84,119,124,0.42)';
      ctx.lineWidth = river.w * (0.72 + Math.min(0.28, this.zoom * 0.07));
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // pripet marsh - stable stippling keeps the printed-map feel
    const mc = this.toScreen(MARSH.cx, MARSH.cy);
    ctx.fillStyle = 'rgba(64,110,110,0.13)';
    for(const mote of this.marshMotes){
      const px = mc.x + Math.cos(mote.a)*mote.r*MARSH.rx*COSMID*this.view.scale;
      const py = mc.y + Math.sin(mote.a)*mote.r*MARSH.ry*this.view.scale;
      ctx.beginPath(); ctx.arc(px, py, 3.2, 0, 7); ctx.fill();
    }
    // carpathians
    ctx.strokeStyle = 'rgba(90,72,44,0.55)'; ctx.lineWidth = 1.4;
    for(const p of CARPATH){
      const s = this.toScreen(p[0], p[1]);
      ctx.beginPath();
      ctx.moveTo(s.x-7, s.y+3); ctx.lineTo(s.x, s.y-5); ctx.lineTo(s.x+7, s.y+3);
      ctx.moveTo(s.x-12, s.y+5); ctx.lineTo(s.x-6, s.y-2); ctx.lineTo(s.x, s.y+4);
      ctx.stroke();
    }

    // 1941 frontier - a highlighter band under a dashed front line
    const front = BORDER41.map(p => this.toScreen(p[0], p[1]));
    const frontPath = () => {
      ctx.beginPath();
      front.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    };
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    frontPath(); ctx.strokeStyle = 'rgba(232,201,90,0.17)'; ctx.lineWidth = 10; ctx.stroke();
    frontPath(); ctx.strokeStyle = 'rgba(74,40,26,0.30)'; ctx.lineWidth = 4.5; ctx.stroke();
    ctx.setLineDash([10, 6]);
    frontPath(); ctx.strokeStyle = 'rgba(138,47,36,0.92)'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.setLineDash([2, 14]);
    frontPath(); ctx.strokeStyle = 'rgba(244,216,130,0.95)'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(244,216,130,0.62)'; ctx.lineWidth = 1.2;
    for(let i=0; i<front.length-1; i++){
      const a = front[i], b = front[i+1];
      const mx = (a.x+b.x)/2, my = (a.y+b.y)/2;
      const dx = b.x-a.x, dy = b.y-a.y, d = Math.hypot(dx,dy) || 1;
      const nx = -dy/d, ny = dx/d;
      ctx.beginPath();
      ctx.moveTo(mx-nx*3.2, my-ny*3.2);
      ctx.lineTo(mx+nx*3.2, my+ny*3.2);
      ctx.stroke();
    }
    ctx.restore();

    // rails
    // map labels
    for(const L of LABELS) this.label(L);

    // marsh / city layers
    for(const [a, b] of EDGES) this.rail(a, b, g);
    for(const id in g.cities) this.cityBody(id, g);

    // marches
    for(const m of g.marches) this.march(m, g);

    // battles fx
    for(const b of g.battles) this.battleFx(b, g);

    // planes
    for(const p of g.planes) this.plane(p, g);

    // Clash-style drop groups - landing, then marching to their city
    for(const d of g.drops) this.drop(d, g);

    // capture banners
    for(let i=this.captures.length-1; i>=0; i--){
      const c = this.captures[i];
      c.t += dt;
      if(c.t > c.dur){ this.captures.splice(i, 1); continue; }
      this.captureBanner(c);
    }

    // selection
    this.selection(g);

    // field manual cue rings
    if(this.tutCities && this.tutCities.length){
      const pulse = (Math.sin(this.time * 3.2) + 1) / 2;
      for(const id of this.tutCities){
        if(!g.cities[id]) continue;
        const s = this.cityScreen(id);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 22 + pulse * 13, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(233,196,106,${0.85 - pulse * 0.4})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s.x, s.y, 17, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(20,15,8,0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // particles (map-anchored, stored in screen coords)
    this.particles(dt);

    // season tint
    const sk = g.season().key;
    if(sk === 'winter'){ ctx.fillStyle = 'rgba(214,228,240,0.10)'; ctx.fillRect(x0, y0, x1-x0, y1-y0); }
    if(sk === 'mud'){ ctx.fillStyle = 'rgba(96,74,40,0.09)'; ctx.fillRect(x0, y0, x1-x0, y1-y0); }

    // floaters
    this.floatersFn(dt);

    ctx.restore();  // un-clip

    // paper frame
    ctx.strokeStyle = '#8a734d'; ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, x1-x0, y1-y0);
    ctx.strokeStyle = 'rgba(60,48,30,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(x0+4, y0+4, x1-x0-8, y1-y0-8);

    // weather overlay (screen space)
    this.weather(dt);

    // vignette
    const vg = ctx.createRadialGradient(this.w/2, this.h/2, this.h*0.44, this.w/2, this.h/2, this.h*0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, this.w, this.h);

    ctx.restore(); // un-shake
  }

  polygon(pts, fill, alpha, stroke, sw){
    const ctx = this.ctx;
    ctx.beginPath();
    pts.forEach((p, i) => { const s = this.toScreen(p[0], p[1]); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
    ctx.closePath();
    ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill();
    ctx.globalAlpha = 1;
    if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.stroke(); }
  }

  rail(a, b, g){
    const ctx = this.ctx;
    const A = this.cityScreen(a), B = this.cityScreen(b);
    const active = g.marches.some(m => (m.from===a && m.to===b) || (m.from===b && m.to===a));
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
    ctx.strokeStyle = active ? '#8a6a3a' : COL.rail; ctx.lineWidth = active ? 2.6 : 2;
    ctx.stroke();
    if(!active){
      ctx.setLineDash([3.5, 4.5]);
      ctx.strokeStyle = 'rgba(240,230,205,0.55)'; ctx.lineWidth = 0.9;
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  label(L){
    const ctx = this.ctx;
    const s = this.toScreen(L.lon, L.lat);
    ctx.save();
    ctx.translate(s.x, s.y);
    if(L.rot) ctx.rotate(L.rot * Math.PI/180);
    ctx.font = `${L.ital ? 'italic ' : ''}${L.sea ? '600 ' : '700 '}${L.size || 11}px ${L.sea || L.ital || L.river ? "'Cormorant SC',Georgia,serif" : "'Oswald',Arial"}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if(L.red){
      ctx.font = "700 9px 'Oswald',Arial";
      const w = ctx.measureText(L.t).width;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(28,20,12,0.62)'; ctx.strokeText(L.t, 0, 0);
      ctx.fillStyle = 'rgba(244,216,130,0.96)'; ctx.fillText(L.t, 0, 0);
      ctx.strokeStyle = 'rgba(244,216,130,0.58)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-w/2, 7); ctx.lineTo(w/2, 7); ctx.stroke();
    } else {
      if(L.sea){ ctx.fillStyle = 'rgba(58,88,96,0.6)'; }
      else if(L.river){ ctx.fillStyle = 'rgba(64,104,112,0.65)'; }
      else { ctx.fillStyle = 'rgba(74,60,38,0.5)'; }
      ctx.fillText(L.t, 0, 0);
    }
    ctx.restore();
  }

  cityBody(id, g){
    const ctx = this.ctx, c = g.cities[id], d = c.def;
    const s = this.cityScreen(id);
    const cap = !!d.flags.cap, obj = OBJECTIVES.includes(id);
    const isGer = c.owner === 'GER';
    const fs = cap ? 3.0 : 2.6;                      // flag scale

    // enemy column inbound - a warning you can see before the blow lands
    if(g.incomingOn(id, c.owner)){
      const p = (Math.sin(this.time*7)+1)/2;
      ctx.beginPath(); ctx.arc(s.x + 16, s.y - 16, 6.5, 0, 7);
      ctx.fillStyle = `rgba(160,30,20,${0.75 + p*0.25})`; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 10px Oswald,Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', s.x + 16, s.y - 15.5);
    }

    // battle glow at the base
    if(c.fighting){
      const p = (Math.sin(this.time*10)+1)/2;
      ctx.beginPath(); ctx.arc(s.x, s.y, 10+p*5, 0, 7);
      ctx.strokeStyle = 'rgba(255,120,60,0.85)'; ctx.lineWidth = 2.5; ctx.stroke();
    }

    // objective city - thin gold ring on the ground
    if(obj){
      ctx.beginPath(); ctx.ellipse(s.x, s.y+2, 13, 5, 0, 0, 7);
      ctx.strokeStyle = 'rgba(201,162,39,0.8)'; ctx.lineWidth = 1.6;
      ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);
    }

    // A clean static flag is easier to read at map scale than a waving one.
    // Animated flags remain reserved for marching formations.
    const fw = cap ? 30 : 23, fh = cap ? 18 : 14;
    this.mapFlag(ctx, s.x, s.y, c.owner, cap ? 3 : 2.3, fw, fh);

    // cut-off marker beside the flag - a siege, ticking day by day
    if(!c.supplied && c.g.inf + c.g.tank + c.g.heavy > 0){
      const p = (Math.sin(this.time*4)+1)/2;
      ctx.beginPath(); ctx.arc(s.x - fw/2 - 11, s.y - 4, 6 + p*1.5, 0, 7);
      ctx.fillStyle = `rgba(124,36,23,${0.6 + p*0.4})`; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 8px Oswald,Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', s.x - fw/2 - 11, s.y - 3.5);
    }

    // name
    ctx.font = `600 ${cap ? 12.5 : 11}px Oswald,Arial,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(238,227,200,0.85)'; ctx.lineJoin = 'round';
    ctx.strokeText(d.name, s.x, s.y + fh/2 + 2);
    ctx.fillStyle = '#33291a';
    ctx.fillText(d.name, s.x, s.y + fh/2 + 2);

    // real men under arms
    const men = g.displayMen(c.g);
    const bw = Math.max(44, String(fmt(men)).length*7 + 12), bh = 15;
    const by = s.y + fh/2 + 16;
    ctx.beginPath(); ctx.roundRect(s.x - bw/2, by, bw, bh, 3);
    ctx.fillStyle = 'rgba(28,23,16,0.85)'; ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = isGer ? COL.gerHi : COL.sovHi;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '700 10px Oswald,Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(fmt(men), s.x, by + bh/2 + 0.5);

    // little weapons under the numbers - the garrison in miniature
    const items = [];
    const soldiers = clamp(Math.floor(c.g.inf/700), 0, 3);
    for(let i=0; i<soldiers; i++) items.push('inf');
    const tanks = c.g.tank >= 20 ? clamp(Math.floor(c.g.tank/80), 1, 2) : 0;
    for(let i=0; i<tanks; i++) items.push('tank');
    if(c.g.heavy >= 20) items.push('heavy');
    if(items.length){
      const sc = cap ? 0.52 : 0.48, gap = 14;
      const x0 = s.x - (items.length-1)*gap/2;
      const yy = by + bh + 12;
      ctx.save();
      ctx.globalAlpha = 0.78;
      items.forEach((it, i) => {
        ctx.save(); ctx.translate(x0 + i*gap, yy);
        SPR.shadow(ctx, 6);
        if(it === 'inf') SPR.soldier(ctx, sc*1.15, c.owner);
        else if(it === 'tank') SPR.tank(ctx, sc*0.55, c.owner);
        else SPR.heavy(ctx, sc*0.55, c.owner);
        ctx.restore();
      });
      ctx.restore();
    }
  }

  mapFlag(ctx, x, y, side, scale, w, h){
    const img = this.flagImgs[side];
    const top = y - h - 3;
    ctx.save();
    const left = x - w/2;
    if(img && img.complete && img.naturalWidth){
      ctx.drawImage(img, left, top, w, h);
    } else {
      ctx.fillStyle = side === 'GER' ? COL.ger : COL.sov;
      ctx.fillRect(left, top, w, h);
    }
    ctx.strokeStyle = 'rgba(46,36,22,0.58)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(left, top, w, h);
    ctx.restore();
  }

  march(m, g){
    const ctx = this.ctx;
    const A = this.cityScreen(m.from), B = this.cityScreen(m.to);
    const t = clamp(m.prog / m.dur, 0, 1);
    const x = A.x + (B.x-A.x)*t, y = A.y + (B.y-A.y)*t;
    const ang = Math.atan2(B.y-A.y, B.x-A.x);

    // trail
    ctx.beginPath();
    ctx.moveTo(A.x, A.y); ctx.lineTo(x, y);
    ctx.strokeStyle = m.side==='GER' ? 'rgba(139,152,163,0.5)' : 'rgba(208,90,74,0.5)';
    ctx.lineWidth = 2.5; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);

    // pick the formation's dominant arm
    const dom = Math.max(m.g.inf*0.5, m.g.tank*8, m.g.heavy*25);
    ctx.save();
    ctx.translate(x, y);
    SPR.shadow(ctx, 14);
    if(dom === m.g.tank*8 && m.g.tank > 0){
      // tank column: lead tank + one trailing
      ctx.save(); ctx.translate(8, Math.sin(this.time*9+m.id)*1.2); SPR.tank(ctx, 0.72, m.side); ctx.restore();
      ctx.save(); ctx.translate(-11, 3 + Math.sin(this.time*9+m.id+2)*1.2); SPR.tank(ctx, 0.55, m.side); ctx.restore();
      if(m.g.inf > 800){ ctx.save(); ctx.translate(-2, 5); SPR.soldier(ctx, 0.8, m.side); ctx.restore(); }
    } else if(dom === m.g.heavy*25 && m.g.heavy > 0){
      ctx.save(); ctx.translate(6, Math.sin(this.time*9+m.id)*1.2); SPR.heavy(ctx, 0.75, m.side); ctx.restore();
      ctx.save(); ctx.translate(-10, 3.5); SPR.soldier(ctx, 0.8, m.side); ctx.restore();
    } else {
      // infantry column on the march - with a standard bearer
      const bob = i => Math.sin(this.time*10 + m.id*2 + i*1.9)*1.1;
      ctx.save(); ctx.translate(9, bob(0)); SPR.soldier(ctx, 1.05, m.side); ctx.restore();
      ctx.save(); ctx.translate(0, 3 + bob(1)); SPR.soldier(ctx, 0.95, m.side); ctx.restore();
      ctx.save(); ctx.translate(-9, bob(2)); SPR.soldier(ctx, 1, m.side); ctx.restore();
      ctx.strokeStyle = '#4a3b28'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(9, -17); ctx.stroke();
      SPR.flag(ctx, 9, -16, m.side, 0.55, this.time, m.id, 1);
    }
    if(m.air){
      ctx.font = '700 9px Oswald,Arial'; ctx.fillStyle = '#f3e7c8';
      ctx.textAlign = 'center'; ctx.fillText('AIR', 0, -14);
    }
    ctx.restore();
  }

  battleFx(b, g){
    const ctx = this.ctx;
    const s = this.cityScreen(b.cityId);
    const p = b.t / b.dur;
    if(Math.random() < 0.5){
      const a = Math.random()*Math.PI*2, rr = rand(2, 16);
      this.flashes.push({ x:s.x + Math.cos(a)*rr, y:s.y + Math.sin(a)*rr, t:0, dur:0.25, r:rand(5, 12) });
    }
    // expanding shock ring once
    if(p < 0.5){
      ctx.beginPath(); ctx.arc(s.x, s.y, 10 + p*70, 0, 7);
      ctx.strokeStyle = `rgba(232,120,60,${0.5*(1-p*2)})`; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  plane(p, g){
    const ctx = this.ctx;
    const from = this.toScreen(p.fromLL.lon, p.fromLL.lat);
    const to = this.cityScreen(p.toCity);
    const t = clamp(p.t/p.dur, 0, 1);
    const mx = (from.x+to.x)/2, my = (from.y+to.y)/2 - 55;
    const q = (1-t)*(1-t)*from.x + 2*(1-t)*t*mx + t*t*to.x;
    const qy = (1-t)*(1-t)*from.y + 2*(1-t)*t*my + t*t*to.y;
    const dt2 = 0.03;
    const t2 = Math.min(1, t+dt2);
    const q2x = (1-t2)*(1-t2)*from.x + 2*(1-t2)*t2*mx + t2*t2*to.x;
    const q2y = (1-t2)*(1-t2)*from.y + 2*(1-t2)*t2*my + t2*t2*to.y;
    // contrail
    ctx.beginPath(); ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mx, my, q, qy);
    ctx.strokeStyle = `rgba(240,234,215,${0.35*(1-t*0.6)})`; ctx.lineWidth = 1.2;
    ctx.setLineDash([2,5]); ctx.stroke(); ctx.setLineDash([]);
    // silhouette - a real Stuka or Il-2
    const ang = Math.atan2(q2y-qy, q2x-q + 0.0001);
    ctx.save(); ctx.translate(q, qy); ctx.rotate(ang + Math.PI/2);
    if(p.side === 'GER') SPR.stuka(ctx, 0.62); else SPR.il2(ctx, 0.62);
    ctx.restore();
  }

  /* ---- Clash-style drop groups: land with a pop, then march to their city ---- */
  drop(d, g){
    const ctx = this.ctx;
    const x = this.sx(d.x), y = this.sy(d.y);
    if(d.target === null){
      // landing: dust ring + the squad assembles
      const p = clamp(d.t/d.land, 0, 1);
      const e = 1 - Math.pow(1-p, 3);
      ctx.beginPath(); ctx.arc(x, y, 8 + 26*(1-e), 0, 7);
      ctx.strokeStyle = `rgba(150,125,80,${0.7*(1-p)})`; ctx.lineWidth = 2.5; ctx.stroke();
      this.formation(d, x, y + 4, 0, 0.45 + 0.55*e);
    } else {
      const to = this.cityScreen(d.target);
      const t = clamp(d.prog/d.dur, 0, 1);
      const cx = x + (to.x - x)*t, cy = y + (to.y - y)*t;
      const ang = Math.atan2(to.y - y, to.x - x);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy);
      ctx.strokeStyle = d.side==='GER' ? 'rgba(139,152,163,0.4)' : 'rgba(208,90,74,0.4)';
      ctx.lineWidth = 2; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
      if(Math.random() < 0.3 && t < 0.96){
        this.puffs.push({ x:cx - Math.cos(ang)*14, y:cy + 6, vx:-Math.cos(ang)*9, vy:-2, t:0, dur:0.5, r:2, color:'#8a7a5e' });
      }
      this.formation(d, cx, cy, ang, 1);
    }
  }
  formation(d, x, y, ang, scale){
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(scale, scale);
    SPR.shadow(ctx, 15);
    const bob = i => Math.sin(this.time*10 + d.id*2 + i*1.8) * 1.1;
    const K = d.key;
    if(K === 'tank'){
      // armoured column - three tanks nose to tail
      SPR.tank(ctx, 0.62, d.side);
      ctx.save(); ctx.translate(-14, 3.5); SPR.tank(ctx, 0.5, d.side); ctx.restore();
      ctx.save(); ctx.translate(-26, 6.5); SPR.tank(ctx, 0.44, d.side); ctx.restore();
      if(d.side === 'GER') SPR.cross(ctx, 0, 8, 0.8);
    } else if(K === 'stug'){
      // assault-gun triple - low wedges
      SPR.stug(ctx, 0.66);
      ctx.save(); ctx.translate(-15, 3.5); SPR.stug(ctx, 0.54); ctx.restore();
      ctx.save(); ctx.translate(-28, 6.5); SPR.stug(ctx, 0.48); ctx.restore();
    } else if(K === 'kv1'){
      // KV heavies - big, spaced, menaced
      SPR.kv1(ctx, 0.6);
      ctx.save(); ctx.translate(-17, 3.5); SPR.kv1(ctx, 0.5); ctx.restore();
      ctx.save(); ctx.translate(-32, 6.5); SPR.kv1(ctx, 0.44); ctx.restore();
    } else if(K === 'su76'){
      SPR.su76(ctx, 0.7);
      ctx.save(); ctx.translate(-14, 3.5); SPR.su76(ctx, 0.56); ctx.restore();
      ctx.save(); ctx.translate(-26, 6.5); SPR.su76(ctx, 0.5); ctx.restore();
    } else if(K === 'nebelwerfer'){
      // a rocket battery unlimbering with its crews
      SPR.nebelwerfer(ctx, 0.9);
      ctx.save(); ctx.translate(-13, 4 + bob(0)); SPR.soldier(ctx, 0.72, d.side); ctx.restore();
      ctx.save(); ctx.translate(-20, 6 + bob(1)); SPR.soldier(ctx, 0.68, d.side); ctx.restore();
    } else if(K === 'heavy'){
      // a Tiger or a Katyusha battery with its crews
      SPR.heavy(ctx, 0.68, d.side);
      ctx.save(); ctx.translate(-9, 6 + bob(0)); SPR.soldier(ctx, 0.72, d.side); ctx.restore();
      ctx.save(); ctx.translate(-16, 8 + bob(1)); SPR.soldier(ctx, 0.68, d.side); ctx.restore();
    } else if(K === 'guards' || K === 'gd' || K === 'inf'){
      // platoon behind its standard - Guards & Grossdeutschland wear their distinction
      const elite = K === 'guards' ? 'guards' : K === 'gd' ? 'gd' : undefined;
      ctx.strokeStyle = '#4a3b28'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(12, -6); ctx.lineTo(12, -19); ctx.stroke();
      SPR.flag(ctx, 12, -18, d.side, 0.55, this.time, d.id, 1);
      ctx.save(); ctx.translate(8, 2 + bob(0)); SPR.soldier(ctx, 1.0, d.side, elite); ctx.restore();
      ctx.save(); ctx.translate(0, 4.5 + bob(1)); SPR.soldier(ctx, 0.92, d.side, elite); ctx.restore();
      ctx.save(); ctx.translate(-8, 2.5 + bob(2)); SPR.soldier(ctx, 0.96, d.side, elite); ctx.restore();
      ctx.save(); ctx.translate(-15, 5 + bob(3)); SPR.soldier(ctx, 0.9, d.side, elite); ctx.restore();
    }
    ctx.restore();
  }

  captureBanner(c){
    const ctx = this.ctx;
    const s = this.cityScreen(c.id);
    const p = c.t / c.dur;
    if(p > 1) return;
    const col = c.side === 'GER' ? COL.gerHi : COL.sovHi;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1-p)*2);
    // rising banner
    const by = s.y - 26 - p*10;
    ctx.strokeStyle = '#4a3b28'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(s.x, by+16); ctx.lineTo(s.x, by-2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x, by-2); ctx.lineTo(s.x + 14 + Math.sin(this.time*6)*1.5, by+1); ctx.lineTo(s.x, by+6);
    ctx.closePath();
    ctx.fillStyle = c.side === 'GER' ? COL.ger : COL.sov; ctx.fill();
    ctx.font = '700 13px Oswald,Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText('* CAPTURED', s.x, by - 14);
    ctx.restore();
  }

  selection(g){
    const ctx = this.ctx;
    // deployment aiming mode - green zones for drops, red crosshairs for air
    if(this.deployType){
      const p = (Math.sin(this.time*6)+1)/2;
      for(const id in g.cities){
        const c = g.cities[id];
        const s = this.cityScreen(id);
        if(this.deployType === 'air'){
          if(c.owner === g.playerSide) continue;
          ctx.setLineDash([]);
          ctx.strokeStyle = `rgba(255,80,50,${0.5 + p*0.5})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(s.x, s.y, 14 + p*3, 0, 7); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s.x-19, s.y); ctx.lineTo(s.x-11, s.y);
          ctx.moveTo(s.x+11, s.y); ctx.lineTo(s.x+19, s.y);
          ctx.moveTo(s.x, s.y-19); ctx.lineTo(s.x, s.y-11);
          ctx.moveTo(s.x, s.y+11); ctx.lineTo(s.x, s.y+19);
          ctx.stroke();
        } else if(c.owner === g.playerSide){
          // the drop zone: anywhere within this circle
          ctx.setLineDash([6,5]);
          ctx.strokeStyle = `rgba(130,200,110,${0.3 + p*0.35})`; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(s.x, s.y, 2.3*this.view.sx1, 2.3*this.view.sy1, 0, 0, 7); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = `rgba(130,200,110,${0.55 + p*0.4})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(s.x, s.y, 13 + p*3, 0, 7); ctx.stroke();
        }
      }
    }
    if(!this.sel) return;
    if(!g.cities[this.sel]) { this.sel = null; return; }
    const s = this.cityScreen(this.sel);
    const p = (Math.sin(this.time*5)+1)/2;
    ctx.beginPath(); ctx.arc(s.x, s.y, 13 + p*3, 0, 7);
    ctx.strokeStyle = COL.gold; ctx.lineWidth = 2.2; ctx.stroke();
    // valid targets
    for(const nb of (g.adj[this.sel]||[])){
      const t = this.cityScreen(nb);
      ctx.beginPath(); ctx.arc(t.x, t.y, 15 + p*2.5, 0, 7);
      ctx.setLineDash([4,4]);
      ctx.strokeStyle = g.cities[nb].owner === g.cities[this.sel].owner ? 'rgba(120,170,120,0.9)' : 'rgba(255,90,60,0.9)';
      ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
    }
    if(this.target && g.cities[this.target]){
      const t = this.cityScreen(this.target);
      ctx.beginPath(); ctx.arc(t.x, t.y, 19, 0, 7);
      ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = 'rgba(255,90,60,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  particles(dt){
    const ctx = this.ctx;
    for(let i=this.puffs.length-1; i>=0; i--){
      const p = this.puffs[i];
      p.t += dt;
      if(p.t > p.dur){ this.puffs.splice(i, 1); continue; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 8*dt;
      const a = 1 - p.t/p.dur;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r*(1+p.t*2), 0, 7);
      ctx.fillStyle = p.color; ctx.globalAlpha = a*0.7; ctx.fill(); ctx.globalAlpha = 1;
    }
    for(let i=this.flashes.length-1; i>=0; i--){
      const f = this.flashes[i];
      f.t += dt;
      if(f.t > f.dur){ this.flashes.splice(i, 1); continue; }
      const a = 1 - f.t/f.dur;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(0.5+f.t/f.dur), 0, 7);
      const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      gr.addColorStop(0, `rgba(255,220,140,${a})`); gr.addColorStop(0.5, `rgba(255,140,60,${a*0.8})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = gr; ctx.fill();
    }
  }

  floatersFn(dt){
    const ctx = this.ctx;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for(let i=this.floaters.length-1; i>=0; i--){
      const f = this.floaters[i];
      f.t += dt;
      if(f.t > f.dur){ this.floaters.splice(i, 1); continue; }
      const a = f.t < 0.15 ? f.t/0.15 : 1 - Math.max(0, (f.t-0.6))/(f.dur-0.6);
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = `700 ${f.big ? 17 : 13}px Oswald,Arial`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,15,8,0.75)';
      ctx.strokeText(f.text, f.x, f.y - f.t*22);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - f.t*22);
      ctx.globalAlpha = 1;
    }
  }

  weather(dt){
    const ctx = this.ctx;
    const sk = this.game.season().key;
    if(sk === 'winter'){
      ctx.fillStyle = 'rgba(240,246,252,0.8)';
      for(const f of this.snow){
        f.y += f.v*dt; f.x += Math.sin(this.time*1.5 + f.dr)*f.dr*dt*0.4;
        if(f.y > this.h){ f.y = -4; f.x = Math.random()*this.w; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill();
      }
    } else if(sk === 'mud'){
      ctx.strokeStyle = 'rgba(180,190,200,0.28)'; ctx.lineWidth = 1;
      for(const r of this.rain){
        r.y += r.v*dt; r.x -= r.v*dt*0.12;
        if(r.y > this.h){ r.y = -10; r.x = Math.random()*(this.w+80); }
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 3, r.y + 13); ctx.stroke();
      }
    }
  }
}
/* roundRect polyfill for older browsers */
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
    r = Math.min(r, w/2, h/2);
    this.moveTo(x+r, y);
    this.arcTo(x+w, y, x+w, y+h, r);
    this.arcTo(x+w, y+h, x, y+h, r);
    this.arcTo(x, y+h, x, y, r);
    this.arcTo(x, y, x+w, y, r);
    this.closePath();
  };
}
