/* ─── First-Time Tutorial ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',function(){(function(){
  var VISITED='presence_visited';

  var STEPS=[
    /* 0 */ {mode:'full', sparks:true, eyeTap:true, darkFull:true, greetPulse:true,
              text:'Hi there! I\'m Omnia.'},
    /* 1 */ {mode:'full', inEye:true, blueText:true, darkFull:true, blinkNext:true,
              text:'I\'ll train you to master your mind.'},
    /* 2 */ {mode:'question', label:'About you',
              text:'What\'s your biggest challenge right now?',
              answerKey:'challenge',
              choices:['I can\'t stop thinking','I lose focus easily','I feel scattered']},
    /* 3 */ {mode:'full', darkFull:true, dynamicText:function(){
              var a=tutAnswers.challenge||'';
              if(a==="I can't stop thinking") return 'Through this practice, you\'ll learn to quiet every thought.';
              if(a==="I lose focus easily")   return 'Concentration exercises will still your restless mind.';
              return 'These exercises are proven. Trust the process.';
            }},
    /* 4 */ {mode:'question', label:'Daily goal',
              text:'What\'s your daily training goal?',
              answerKey:'goal',
              choices:[
                {label:'10 min / day', subtext:'That\'s enough to start. I adapt as you grow.'},
                {label:'20 min / day', subtext:'Serious about this. I like it.'},
                {label:'30 min / day', subtext:'A complete lifestyle change. Perfect.'},
                {label:'60+ min / day', subtext:'A full overhaul. I\'ll get you there.'}
              ]},
    /* 5 */ {mode:'full', darkFull:true, commitBtn:true, achievementList:true,
              omniaMorphBack:true,
              text:'Here\'s what you can achieve in 3 months.'},
    /* 6 */ {mode:'question', label:'Experience',
              text:'How experienced are you with concentration exercises?',
              answerKey:'experience', hasBarChart:true,
              choices:[
                {label:'Just starting',    bars:1},
                {label:'Some experience',  bars:2},
                {label:'Getting serious',  bars:3},
                {label:'Experienced',      bars:4},
                {label:'Advanced',         bars:5}
              ]},
    /* 7 */ {mode:'question', label:'',
              text:'Where would you like to start?',
              recommendedKey:'experience',
              choices:['Start from Scratch','Find my Level'], launchClock:true},
  ];

  /* Total tutorial length for the unified progress bar */
  var TUT_EXTRA = 6; // post-session, streak-celeb, streak-commit, reminder, acct-prompt, guide-intro
  var TUT_TOTAL = STEPS.length + TUT_EXTRA;
  window.__tutTotal    = TUT_TOTAL;
  window.__tutStepsLen = STEPS.length;

  var ov=document.getElementById('tutOverlay');
  var tc=document.getElementById('tutContent');
  var cv=document.getElementById('tutSparkCanvas');
  var sp=document.getElementById('tutSpotlight');
  var ow=document.getElementById('tutOmniaWrap');
  var bl=document.getElementById('tutBubble');
  var bt=document.getElementById('tutBubbleText');
  var th=document.getElementById('tutTapHint');
  var sk=document.getElementById('tutSkipBtn');
  var df=document.getElementById('tutDrawerFloat');
  var fb=document.getElementById('tutFloatBubble');
  var ft=document.getElementById('tutFloatText');
  var db=document.getElementById('tutDoneBtn');
  var cp=document.getElementById('tutDrawerCapture');
  var pc=document.getElementById('tutPathChoice');
  var cg=document.getElementById('tutCorgi');
  var clkBg=document.getElementById('tutClockBg');
  var objBg=document.getElementById('tutObjBg');
  if(!ov) return;

  var cur=0, eyeOn=false, rdy=false, pRAF, parts=[];
  var tutAudCtx=null, tutCreekNodes=[], corgiTimer=null;
  var tutorialEyeMorphRaf=null;
  var tutorialEyeAnchorY=null;
  var tutAnswers={};

  var qp=document.getElementById('tutQuestionPanel');
  var ql=document.getElementById('tutQuestionLabel');
  var qt=document.getElementById('tutQuestionText');
  var qc=document.getElementById('tutQuestionChoices');
  var cb=document.getElementById('tutContinueBtn');
  var bk=document.getElementById('tutBackBtn');
  /* Steps 0-2 are intro + first question — going back into the eye-morph sequence
     leaves Omnia in an inconsistent state, so back is only enabled from step 3. */
  var BACK_MIN_STEP=3;

  function showQuestion(s){
    /* If Omnia / bubble / done-button are on screen from the previous step,
       fade them out together first so the swap into the question panel reads as
       one continuous transition rather than a hard cut. The setup body then
       runs after the fade completes. */
    var hadTc=tc.classList.contains('tut-vis');
    var hadDb=db.style.display==='block';
    var setupQuestion=function(){
      tc.style.opacity=''; tc.style.transition='';
      db.style.opacity=''; db.style.transition='';
      ov.style.display='block'; ov.style.opacity='1'; ov.style.pointerEvents='none';
      ov.style.background='rgba(7,8,13,1)';
      ov.classList.remove('tut-spot');
      tc.classList.remove('tut-vis');
      /* Hard-reset the speech bubble so no stale class, inline opacity or text
         can resurface when the next full step's finishStep runs. Without this,
         leftover state from the previous full step (e.g. opacity:0 inline from
         the blinkNext fade plus a still-cached text node) can briefly paint the
         old bubble between the question fade and the next step's fade-in. */
      bl.classList.remove('tut-soft-enter','tut-vis','tut-bubble-exit');
      bl.style.opacity=''; bl.style.transition='';
      bt.innerHTML='';
      stopSparks(); clearPulse(); darkSpot();
      th.style.display='none'; sk.style.display='none'; db.style.display='none';
      db.classList.remove('tut-done-commit');
      _showQuestionBody(s);
    };
    if(hadTc||hadDb){
      if(hadTc){
        tc.style.transition='opacity 0.28s ease';
        tc.style.opacity='0';
      }
      if(hadDb){
        db.style.transition='opacity 0.28s ease';
        db.style.opacity='0';
      }
      setTimeout(setupQuestion,300);
    } else {
      setupQuestion();
    }
  }
  function _showQuestionBody(s){
    if(ql) ql.textContent=s.label||'';
    if(qt) qt.textContent=s.text||'';
    if(qc){
      qc.innerHTML='';
      (s.choices||[]).forEach(function(choice,idx){
        var label=typeof choice==='object'?choice.label:choice;
        var subtext=typeof choice==='object'?choice.subtext:null;
        var bars=typeof choice==='object'?choice.bars:null;
        var btn=document.createElement('button');
        btn.className='tut-q-btn'+(s.launchClock?' tut-q-launch':'');
        /* data-bars drives per-level color theming on bar-chart questions */
        if(s.hasBarChart&&bars) btn.setAttribute('data-bars',String(bars));
        /* data-launch-idx drives per-option color theming and per-option
           recommended-glow color for the launch step ("Where would you like
           to start?") */
        else if(s.launchClock) btn.setAttribute('data-launch-idx',String(idx));
        /* Non-bar / non-launch questions get a per-index accent color so each
           option pops with its own identity (challenge + goal screens) */
        else btn.classList.add('tut-q-color-'+(idx%5));

        /* Recommended badge for launch choices */
        if(s.launchClock&&s.recommendedKey){
          var expBars=(tutAnswers[s.recommendedKey+'Bars'])||1;
          var rec=(expBars<=2&&idx===0)||(expBars>=3&&idx===1);
          if(rec) btn.classList.add('tut-q-recommended');
        }

        /* Bar chart layout */
        if(s.hasBarChart&&bars){
          var inner=document.createElement('span');
          inner.className='tut-q-btn-inner';
          var lbl=document.createElement('span');
          lbl.textContent=label;
          var barWrap=document.createElement('span');
          barWrap.className='tut-q-bars';
          for(var b=1;b<=5;b++){
            var bar=document.createElement('span');
            bar.className='tut-q-bar'+(b<=bars?' filled':'');
            barWrap.appendChild(bar);
          }
          inner.appendChild(lbl); inner.appendChild(barWrap);
          btn.appendChild(inner);
        } else {
          btn.textContent=label;
          if(subtext){
            var sub=document.createElement('span');
            sub.className='tut-q-btn-sub';
            sub.textContent=subtext;
            btn.appendChild(sub);
          }
        }

        btn.addEventListener('click',function(){
          btn.classList.add('tut-q-selected');
          btn.style.animation='tutChoicePop 0.34s cubic-bezier(0.34,1.56,0.64,1)';
          if(s.launchClock){
            if (typeof guideApplyTutorialPathChoice === 'function') {
              var expBars = tutAnswers.experienceBars || 1;
              guideApplyTutorialPathChoice(label === 'Find my Level' ? 'experienced' : 'beginner', expBars, label, tutAnswers.goal);
            }
            setTimeout(function(){
              qp.classList.remove('tut-vis');
              window._tutorialFirstClock=true;
              window._tutorialAnswers=JSON.parse(JSON.stringify(tutAnswers));
              document.body.classList.remove('tut-live');
              ov.style.transition='none';
              ov.style.opacity='0';
              ov.style.display='none';
              ov.style.pointerEvents='none';
              tc.classList.remove('tut-vis','tut-content-bottom');
              df.classList.remove('tut-float-on');
              th.style.display='none'; sk.style.display='none';
              if(bk) bk.style.display='none';
              stopSparks(); darkSpot(); resetTutorialEye();
              suppressTutorialForExerciseEntry();
              var hs=document.getElementById('homeScreen');
              if(hs) hs.style.display='flex';
              currentExercise='clock';
              startConcentration();
              var tip=document.getElementById('tutClockTip');
              if(tip){
                // Tip stays visible until the user presses Begin (handled in
                // beginCountdown) so the instructions don't disappear mid-read.
                setTimeout(function(){tip.classList.add('tut-ct-show');},400);
              }
            },340);
            return;
          }
          if(s.answerKey) tutAnswers[s.answerKey]=label;
          if(s.answerKey&&bars!=null) tutAnswers[s.answerKey+'Bars']=bars;
          hideQuestion();
          setTimeout(function(){ go(cur+1); },300);
        });
        qc.appendChild(btn);
      });
    }
    setTimeout(function(){qp.classList.add('tut-vis');},60);
    rdy=false;
  }
  function hideQuestion(){
    qp.style.opacity='0';
    setTimeout(function(){
      qp.classList.remove('tut-vis');
      qp.style.opacity='';
    },280);
  }

  function tutorialCanBootOnHome(){
    var homeEl=document.getElementById('homeScreen');
    return !!homeEl && homeEl.style.display==='flex' && !document.querySelector('.screen.active');
  }

  /* ── Particles ── */
  function mkP(){
    var cx=window.innerWidth/2, cy=window.innerHeight*0.45;
    var a=Math.random()*Math.PI*2, sp2=1+Math.random()*2.6;
    var cols=['#b8eaff','#7eb8a4','#d4b08e','#c4a8d4','#fff','#8ecce0'];
    return{x:cx+(Math.random()-.5)*80,y:cy+(Math.random()-.5)*60,
           vx:Math.cos(a)*sp2,vy:Math.sin(a)*sp2-2,
           s:1.5+Math.random()*2.8,c:cols[Math.random()*cols.length|0],
           l:0.7+Math.random()*0.6,d:0.007+Math.random()*0.013};
  }
  function startSparks(){
    cv.width=window.innerWidth; cv.height=window.innerHeight;
    var ctx=cv.getContext('2d');
    parts=[];for(var i=0;i<70;i++) parts.push(mkP());
    function fr(){
      ctx.clearRect(0,0,cv.width,cv.height);
      parts.forEach(function(p,i){
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.l-=p.d;
        if(p.l<=0){parts[i]=mkP();return;}
        ctx.save();ctx.globalAlpha=Math.max(0,p.l);
        ctx.fillStyle=p.c;ctx.shadowBlur=8;ctx.shadowColor=p.c;
        ctx.beginPath();ctx.arc(p.x,p.y,p.s,0,Math.PI*2);ctx.fill();
        ctx.restore();
      });
      pRAF=requestAnimationFrame(fr);
    }
    fr();
  }
  function stopSparks(){
    if(pRAF){cancelAnimationFrame(pRAF);pRAF=null;}
    parts=[];
    var ctx=cv.getContext('2d');
    if(ctx) ctx.clearRect(0,0,cv.width,cv.height);
  }

  /* ── Spotlight ── */
  function litSpot(sel){
    var el=document.querySelector(sel);
    if(!el){sp.classList.remove('tut-lit');return;}
    var r=el.getBoundingClientRect(),p=10;
    sp.style.left=(r.left-p)+'px';sp.style.top=(r.top-p)+'px';
    sp.style.width=(r.width+p*2)+'px';sp.style.height=(r.height+p*2)+'px';
    requestAnimationFrame(function(){sp.classList.add('tut-lit');});
  }
  function litSpotMulti(sels){
    var els=sels.map(function(s){return document.querySelector(s);}).filter(Boolean);
    if(!els.length){sp.classList.remove('tut-lit');return;}
    var p=10,rects=els.map(function(e){return e.getBoundingClientRect();});
    var left=Math.min.apply(null,rects.map(function(r){return r.left;}))-p;
    var top=Math.min.apply(null,rects.map(function(r){return r.top;}))-p;
    var right=Math.max.apply(null,rects.map(function(r){return r.right;}))+p;
    var bottom=Math.max.apply(null,rects.map(function(r){return r.bottom;}))+p;
    sp.style.left=left+'px';sp.style.top=top+'px';
    sp.style.width=(right-left)+'px';sp.style.height=(bottom-top)+'px';
    requestAnimationFrame(function(){sp.classList.add('tut-lit');});
  }
  function darkSpot(){sp.classList.remove('tut-lit');}

  /* ── tc positioning ── */
  function positionTcBeside(targetSel,side){
    var el=document.querySelector(targetSel);
    if(!el) return;
    var r=el.getBoundingClientRect();
    var midY=r.top+r.height/2;
    var gap=18;
    tc.style.bottom='auto';
    tc.style.transform='translateY(-50%)';
    tc.style.top=Math.max(80,Math.min(window.innerHeight-200,midY))+'px';
    if(side==='left'){
      var leftAvail=Math.max(148,r.left-gap-12);
      var leftW=Math.max(148,Math.min(leftAvail,260));
      tc.style.left='12px';tc.style.right='auto';
      tc.style.maxWidth=leftW+'px';
    }
    else{
      var availW=window.innerWidth-r.right-gap-12;
      var contentW=Math.max(156,Math.min(availW,280));
      tc.style.right='12px';tc.style.left='auto';
      tc.style.maxWidth=contentW+'px';
    }
  }
  function withoutTcTransition(fn){
    var prev=tc.style.transition;
    tc.style.transition='none';
    fn();
    void tc.offsetHeight;
    tc.style.transition=prev;
  }
  function resetTcPosition(preserveLow){
    withoutTcTransition(function(){
      tc.style.top='';tc.style.bottom='';tc.style.left='';tc.style.right='';tc.style.transform='';tc.style.maxWidth='';
      if(!preserveLow) tc.classList.remove('tut-content-low');
      tc.classList.remove('tut-clock-callout');
      tc.classList.remove('tut-obj-callout');
      tc.classList.remove('tut-obj-callout-left');
      tc.classList.remove('tut-obj-bubble-above');
      tc.classList.remove('tut-eye-stage');
      bl.style.bottom='';
      ow.style.bottom=''; ow.style.transition=''; ow.style.transform='';
    });
  }
  function captureTutorialEyeAnchor(){
    var r=ow.getBoundingClientRect();
    tutorialEyeAnchorY=r.top+r.height/2;
  }
  function applyTutorialEyeAnchor(){
    if(tutorialEyeAnchorY==null) return;
    var r=ow.getBoundingClientRect();
    var currentY=r.top+r.height/2;
    var delta=tutorialEyeAnchorY-currentY;
    if(Math.abs(delta)<0.5) return;
    var top=parseFloat(window.getComputedStyle(tc).top);
    withoutTcTransition(function(){
      tc.style.top=((isNaN(top)?window.innerHeight/2:top)+delta)+'px';
    });
  }

  /* ── Scroll exercise card into view ── */
  function scrollToCard(sel,cb){
    var scrollEl=document.getElementById('concScrollArea');
    var card=document.querySelector(sel);
    if(!scrollEl||!card){if(cb)cb();return;}
    var r=card.getBoundingClientRect(),cr=scrollEl.getBoundingClientRect();
    if(r.top>=cr.top&&r.bottom<=cr.bottom){if(cb)cb();return;}
    scrollEl.scrollTo({top:Math.max(0,scrollEl.scrollTop+(r.top-cr.top)-40),behavior:'smooth'});
    setTimeout(cb||function(){},620);
  }

  /* ── Panel ── */
  function goPanel(p){
    if(p==='concentration') switchMode('concentration');
    else if(p==='awareness') switchMode('awareness');
  }

  /* ── Card stagger ── */
  function staggerCards(){
    document.querySelectorAll('#exerciseGrid .exercise-card').forEach(function(c,i){
      c.style.opacity='0';c.style.transform='translateY(14px)';
      c.style.transition='opacity 0.4s ease,transform 0.4s ease';
      setTimeout(function(){c.style.opacity='1';c.style.transform='translateY(0)';},200+i*160);
    });
  }

  /* ── Eye morph (ported from codex/omnia-path-guide) ── */
  function clearTutorialEyeMorph(){
    var svg=document.getElementById('tutOmniaShardSvg');
    if(tutorialEyeMorphRaf){cancelAnimationFrame(tutorialEyeMorphRaf);tutorialEyeMorphRaf=null;}
    if(svg){svg.innerHTML='';svg.style.opacity='0';}
    ow.classList.remove('tut-morphing');
  }
  function tutorialEyeOutline(color){
    return '<g id="tutShardOutline" opacity="0" stroke="'+color+'" stroke-linecap="round" stroke-linejoin="round">'
      +'<path d="M7 65 C21 37 39 28 50 28 C61 28 79 37 93 65 C79 93 61 102 50 102 C39 102 21 93 7 65 Z" fill="rgba(184,234,255,.055)" stroke-width="2.45"/>'
      +'<path d="M17 65 C31 46 40 41 50 41 C60 41 69 46 83 65 C69 84 60 89 50 89 C40 89 31 84 17 65 Z" fill="none" stroke-width="1.1" opacity=".66"/>'
      +'<circle cx="50" cy="65" r="18.5" fill="rgba(14,43,62,.42)" stroke-width="1.65"/>'
      +'<circle cx="50" cy="65" r="7.6" fill="#06131f" stroke-width="1.1"/>'
      +'<circle cx="57" cy="57" r="3.4" fill="#eefbff" stroke="none" opacity=".82"/>'
      +'<path d="M24 48 L50 65 L76 48 M24 82 L50 65 L76 82" fill="none" stroke-width=".82" opacity=".46"/>'
      +'</g>';
  }
  function toEye(done){
    var svg=document.getElementById('tutOmniaShardSvg');
    if(!svg||typeof OMNIA_CRYSTAL_MORPH_SHARDS==='undefined'||typeof OMNIA_MORPH_TARGETS==='undefined'){
      eyeOn=true;ow.classList.add('eye-state');if(done)done();return;
    }
    clearTutorialEyeMorph();
    var from=OMNIA_CRYSTAL_MORPH_SHARDS,to=OMNIA_MORPH_TARGETS.eye,color='#b8eaff',revealed=false;
    svg.innerHTML='<defs><filter id="tutShardGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    var polys=from.map(function(poly,idx){
      var el=document.createElementNS('http://www.w3.org/2000/svg','polygon');
      el.setAttribute('points',omniaPointString(poly));
      el.setAttribute('fill',color);el.setAttribute('fill-opacity',idx===8?'.18':'.26');
      el.setAttribute('stroke',color);el.setAttribute('stroke-width',idx===8?'1.1':'1.35');
      el.setAttribute('stroke-opacity','.86');el.setAttribute('filter','url(#tutShardGlow)');
      svg.appendChild(el);return el;
    });
    svg.insertAdjacentHTML('beforeend',tutorialEyeOutline(color));
    var outline=svg.querySelector('#tutShardOutline');
    ow.classList.add('tut-morphing');
    svg.style.opacity='.3';
    var start=performance.now(),inwardMs=820,holdMs=0,totalMs=inwardMs+holdMs;
    function frame(now){
      var elapsed=now-start,t;
      if(elapsed<=inwardMs){
        t=omniaEaseMorph(elapsed/inwardMs);
        svg.style.opacity=String(.3+t*.7);
        if(outline) outline.setAttribute('opacity',String(Math.max(0,(t-.56)/.44)));
        polys.forEach(function(poly,idx){poly.setAttribute('points',omniaPointString(omniaLerpPoly(from[idx],to[idx],t)));});
        if(!revealed&&elapsed>=inwardMs*.82){revealed=true;eyeOn=true;ow.classList.add('eye-state');if(done){var _d=done;done=null;_d();}}
      }else if(elapsed<=totalMs){
        svg.style.opacity='1';
        if(outline) outline.setAttribute('opacity','1');
        polys.forEach(function(poly,idx){poly.setAttribute('points',omniaPointString(to[idx]));});
        if(!revealed){revealed=true;eyeOn=true;ow.classList.add('eye-state');}
      }else{
        tutorialEyeMorphRaf=null;
        ow.classList.remove('tut-morphing');
        svg.style.opacity='1';
        if(outline) outline.setAttribute('opacity','1');
        polys.forEach(function(poly,idx){poly.setAttribute('points',omniaPointString(to[idx]));});
        if(done)done();return;
      }
      tutorialEyeMorphRaf=requestAnimationFrame(frame);
    }
    tutorialEyeMorphRaf=requestAnimationFrame(frame);
  }
  function blinkCrystalEye(done){
    ow.classList.remove('eye-blink');
    void ow.offsetWidth;
    ow.classList.add('eye-blink');
    setTimeout(function(){ow.classList.remove('eye-blink');if(done)done();},720);
  }
  function fromEyeToOmnia(done){
    var svg=document.getElementById('tutOmniaShardSvg');
    if(!svg||typeof OMNIA_CRYSTAL_MORPH_SHARDS==='undefined'||typeof OMNIA_MORPH_TARGETS==='undefined'){
      resetTutorialEye();if(done)done();return;
    }
    if(tutorialEyeMorphRaf){cancelAnimationFrame(tutorialEyeMorphRaf);tutorialEyeMorphRaf=null;}
    var from=OMNIA_MORPH_TARGETS.eye,to=OMNIA_CRYSTAL_MORPH_SHARDS,color='#b8eaff';
    var polys=[].slice.call(svg.querySelectorAll('polygon'));
    if(polys.length!==from.length){
      svg.innerHTML='<defs><filter id="tutShardGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
      polys=from.map(function(poly,idx){
        var el=document.createElementNS('http://www.w3.org/2000/svg','polygon');
        el.setAttribute('points',omniaPointString(poly));
        el.setAttribute('fill',color);el.setAttribute('fill-opacity',idx===8?'.18':'.26');
        el.setAttribute('stroke',color);el.setAttribute('stroke-width',idx===8?'1.1':'1.35');
        el.setAttribute('stroke-opacity','.86');el.setAttribute('filter','url(#tutShardGlow)');
        svg.appendChild(el);return el;
      });
      svg.insertAdjacentHTML('beforeend',tutorialEyeOutline(color));
    }
    var outline=svg.querySelector('#tutShardOutline');
    var crystal=ow.querySelector('.tut-crystal-svg');
    ow.classList.add('tut-morphing','tut-returning');
    svg.style.opacity='1';
    if(crystal){
      crystal.style.opacity='0';
      crystal.style.filter='blur(8px) drop-shadow(0 0 14px rgba(142,204,224,.18))';
    }
    var start=performance.now(),returnMs=1240;
    function frame(now){
      var elapsed=now-start;
      var t=omniaEaseMorph(Math.min(1,elapsed/returnMs));
      polys.forEach(function(poly,idx){poly.setAttribute('points',omniaPointString(omniaLerpPoly(from[idx],to[idx],t)));});
      if(outline) outline.setAttribute('opacity',String(Math.max(0,1-t*1.35)));
      var crystalT=omniaEaseMorph(Math.max(0,Math.min(1,(t-.46)/.54)));
      var shardFade=Math.max(0,1-Math.max(0,(t-.68)/.32));
      svg.style.opacity=String(shardFade);
      if(crystal){
        crystal.style.opacity=String(crystalT);
        crystal.style.filter='blur('+((1-crystalT)*8).toFixed(2)+'px) drop-shadow(0 0 '+(14+crystalT*5).toFixed(1)+'px rgba(142,204,224,'+(.18+crystalT*.32).toFixed(2)+'))';
      }
      if(elapsed>=returnMs){
        // Disable crystal transition so the filter/opacity cleanup doesn't trigger a snap
        // (morph leaves filter as blur()+drop-shadow() which can't smoothly transition to drop-shadow())
        if(crystal) crystal.style.transition='none';
        crystal.style.opacity='1';
        ow.classList.remove('eye-state','tut-returning','tut-crystal-return');
        clearTutorialEyeMorph();
        // Commit the morph-end state (blur(0.00px) drop-shadow(19px)) as transition baseline.
        // CSS default is blur(0px) drop-shadow(12px) — same list length → smooth 0.28s interpolation.
        void crystal.offsetWidth;
        crystal.style.transition='';
        crystal.style.opacity='';
        crystal.style.filter='';
        eyeOn=false;if(done)done();return;
      }
      tutorialEyeMorphRaf=requestAnimationFrame(frame);
    }
    tutorialEyeMorphRaf=requestAnimationFrame(frame);
  }
  function resetTutorialEye(){
    eyeOn=false;clearTutorialEyeMorph();
    ow.classList.remove('eye-state','eye-blink','tut-returning','tut-crystal-return');
    ow.style.transform='';
  }

  /* ── Clock background ── */
  var clockAnimRAF=null, clockSecAngle=0, clockLastTime=0;
  function showClockBg(){
    var svg=document.getElementById('tutClockSvg');
    if(svg){
      var h='<circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>';
      for(var i=0;i<60;i++){
        var angle=(i*6-90)*Math.PI/180;
        var isMajor=i%5===0;
        var r1=isMajor?78:83; var r2=88;
        var x1=100+r1*Math.cos(angle); var y1=100+r1*Math.sin(angle);
        var x2=100+r2*Math.cos(angle); var y2=100+r2*Math.sin(angle);
        h+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" class="'+(isMajor?'tut-clock-tick-major':'tut-clock-tick')+'"/>';
      }
      h+='<g id="tutClockSecHand" class="tut-clock-hand-group">';
      h+='<line x1="100" y1="100" x2="100" y2="20" class="tut-clock-hand-main"/>';
      h+='<line x1="100" y1="100" x2="100" y2="118" class="tut-clock-hand-tail"/>';
      h+='</g>';
      h+='<circle cx="100" cy="100" r="5" class="tut-clock-center"/>';
      svg.innerHTML=h;
    }
    clkBg.classList.add('tut-bg-on');
    clockLastTime=performance.now();
    var secHand=document.getElementById('tutClockSecHand');
    if(!secHand) return;
    function tick(now){
      var dt=(now-clockLastTime)/1000; clockLastTime=now;
      clockSecAngle=(clockSecAngle+dt*6)%360;
      secHand.style.transform='rotate('+clockSecAngle+'deg)';
      clockAnimRAF=requestAnimationFrame(tick);
    }
    clockAnimRAF=requestAnimationFrame(tick);
  }
  function hideClockBg(){
    clkBg.classList.remove('tut-bg-on');
    if(clockAnimRAF){cancelAnimationFrame(clockAnimRAF);clockAnimRAF=null;}
  }

  /* ── Object flash ── */
  var objFlashTimer=null;
  var OBJ_SETS=[
    ['◯','△','□','⬡','★','◇'],
    ['🍎','🌹','🕯️','🗝️','📚','🌙'],
    ['🌊','🔥','🌿','🪨','⚡','❄️']
  ];
  function showObjFlash(){
    var setIdx=0;
    function nextSet(){
      objBg.innerHTML='';
      var set=OBJ_SETS[setIdx%OBJ_SETS.length]; setIdx++;
      set.forEach(function(o,i){
        var el=document.createElement('span');
        el.className='tut-obj'; el.textContent=o;
        el.style.animationDelay=(i*55)+'ms';
        objBg.appendChild(el);
      });
    }
    nextSet();
    objBg.classList.add('tut-bg-on');
    objFlashTimer=setInterval(nextSet,1400);
  }
  function hideObjFlash(){
    objBg.classList.remove('tut-bg-on');
    if(objFlashTimer){clearInterval(objFlashTimer);objFlashTimer=null;}
    setTimeout(function(){objBg.innerHTML='';},500);
  }

  /* ── Creek sound ── */
  function startTutCreek(){
    try{
      tutAudCtx=new(window.AudioContext||window.webkitAudioContext)();
      var ctx=tutAudCtx, when=ctx.currentTime+0.05, dur=20;
      var buf=ctx.createBuffer(2,ctx.sampleRate*dur,ctx.sampleRate);
      for(var ch=0;ch<2;ch++){
        var data=buf.getChannelData(ch);
        var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for(var i=0;i<data.length;i++){
          var w=Math.random()*2-1;
          b0=.99886*b0+w*.0555179; b1=.99332*b1+w*.0750759;
          b2=.96900*b2+w*.1538520; b3=.86650*b3+w*.3104856;
          b4=.55000*b4+w*.5329522; b5=-.7616*b5-w*.0168980;
          data[i]=(b0+b1+b2+b3+b4+b5+b6+w*.5362)*0.11; b6=w*0.115926;
        }
      }
      var src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
      var filt=ctx.createBiquadFilter(); filt.type='bandpass'; filt.frequency.value=600; filt.Q.value=0.5;
      var gain=ctx.createGain();
      gain.gain.setValueAtTime(0,when);
      gain.gain.linearRampToValueAtTime(0.38,when+1.5);
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      src.start(when);
      tutCreekNodes=[src,gain];
    }catch(e){}
  }
  function stopTutCreek(){
    if(!tutCreekNodes.length||!tutAudCtx) return;
    try{
      var g=tutCreekNodes[1];
      g.gain.linearRampToValueAtTime(0,tutAudCtx.currentTime+1.2);
      var _nodes=tutCreekNodes, _ctx=tutAudCtx;
      tutCreekNodes=[]; tutAudCtx=null;
      setTimeout(function(){
        _nodes.forEach(function(n){try{n.stop&&n.stop();}catch(e){}});
        try{_ctx.close();}catch(e){}
      },1400);
    }catch(e){}
  }

  /* ── Thought word animation ── */
  var thoughtAnimTimer=null;
  var THOUGHT_WORDS=['think','remember','worry','what if','later','yesterday','maybe','should','could','want','need','when','how','why','if only','a thought','a memory','distraction'];
  var thoughtBgEl=null;
  function showThoughtAnim(){
    if(!thoughtBgEl) thoughtBgEl=document.getElementById('tutThoughtBg');
    if(!thoughtBgEl) return;
    thoughtBgEl.innerHTML='';thoughtBgEl.classList.add('tut-bg-on');
    var count=0,maxCount=28;
    function spawn(){
      if(count>=maxCount) return;
      count++;
      var ratio=count/maxCount;
      var numW=Math.max(1,Math.round(5*(1-ratio*0.85)));
      for(var i=0;i<numW;i++){
        var w=document.createElement('span');
        w.className='tut-thought-word';
        w.textContent=THOUGHT_WORDS[Math.floor(Math.random()*THOUGHT_WORDS.length)];
        var dur=2.2+Math.random()*2;
        var peak=Math.max(0.08,(0.5+Math.random()*0.35)*(1-ratio*0.8));
        w.style.left=(15+Math.random()*70)+'%';
        w.style.bottom=(15+Math.random()*20)+'%';
        w.style.fontSize=(10+Math.random()*7)+'px';
        w.style.setProperty('--dur',dur+'s');
        w.style.setProperty('--peak',String(peak));
        w.style.setProperty('--fade',String(peak*0.25));
        thoughtBgEl.appendChild(w);
        (function(el2,d){setTimeout(function(){if(el2.parentNode)el2.parentNode.removeChild(el2);},d*1000+200);})(w,dur);
      }
      thoughtAnimTimer=setTimeout(spawn,400+ratio*1400);
    }
    spawn();
  }
  function hideThoughtAnim(){
    if(thoughtBgEl) thoughtBgEl.classList.remove('tut-bg-on');
    if(thoughtAnimTimer){clearTimeout(thoughtAnimTimer);thoughtAnimTimer=null;}
    if(thoughtBgEl) setTimeout(function(){thoughtBgEl.innerHTML='';},500);
  }

  /* ── Corgi (fixed: use inline left for both positions) ── */
  function launchCorgi(){
    if(corgiTimer) clearTimeout(corgiTimer);
    cg.style.display='block';
    cg.style.transition='none';
    cg.style.left='-90px';
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        cg.style.transition='left 3s cubic-bezier(.35,.05,.2,1)';
        cg.style.left='calc(100vw + 100px)';
        corgiTimer=setTimeout(function(){
          cg.style.display='none';
          cg.style.left='-90px';
          cg.style.transition='none';
        },3200);
      });
    });
  }

  /* ── Drawer pulse ── */
  function pulseItem(sel){
    document.querySelectorAll('.drawer-item.tut-pulse').forEach(function(e){e.classList.remove('tut-pulse');});
    var el=document.querySelector(sel); if(el) el.classList.add('tut-pulse');
  }
  function clearPulse(){
    document.querySelectorAll('.drawer-item.tut-pulse').forEach(function(e){e.classList.remove('tut-pulse');});
  }

  /* ── Path choice ── */
  function showPathChoice(){
    setTutorialText(ft,'Tell me — is this your first time on this path, or are you a bit more advanced?');
    df.classList.add('tut-float-on');
    setTimeout(function(){fb.classList.add('tut-vis'); pc.classList.add('tut-vis');},60);
  }
  function hidePathChoice(){
    pc.classList.remove('tut-vis');
  }

  /* ── Tutorial copy ── */
  var TUT_KEYWORDS=[
    'secret societies','complete attention','seconds hand','Thought Control','Soul Mirror',
    'Journal Log','pore breathing','daily regiment','know thyself','inner transformation',
    'Namaste','Omnia','meditation','Concentration','concentration','imagination','Master',
    'Practice','level up','XP','title','rank','ranks','ascend','clock','focus','mind',
    'Visualization','visualization','objects','eyes open','perseverance','sounds','asana',
    'motionless','traits','purifying','streak','progress','Guide','agenda','Akasha',
    'upgrades','cosmetics','corgi','tutorial','path','advanced'
  ].sort(function(a,b){return b.length-a.length;});
  var tutKeywordPattern=new RegExp('('+TUT_KEYWORDS.map(function(k){
    return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }).join('|')+')','gi');
  function escapeTutorialText(text){
    return String(text||'').replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function highlightTutorialText(text){
    return escapeTutorialText(text).replace(tutKeywordPattern,'<span class="tut-key">$1</span>');
  }
  function setTutorialText(el,text){
    if(el) el.innerHTML=highlightTutorialText(text||'');
  }

  /* ── Continue button helpers ── */
  var _cbHideTimer=null;
  function showContinueBtn(){
    if(!cb) return;
    clearTimeout(_cbHideTimer);
    cb.style.display='block';
    void cb.offsetWidth;
    cb.classList.add('tut-cont-show');
  }
  function hideContinueBtn(){
    if(!cb) return;
    cb.classList.remove('tut-cont-show');
    _cbHideTimer=setTimeout(function(){cb.style.display='none';},380);
  }

  /* ── Finish step: show bubble + set rdy ── */
  function finishStep(s,delay,bubbleDelay){
    /* Remove tut-vis BEFORE clearing inline opacity. If we cleared inline first
       while tut-vis was still on, the computed opacity would briefly resolve to
       1 (CSS .tut-vis rule) before the class removal kicks in — flashing the
       previous step's stale bubble text. Removing the class first keeps the
       computed opacity at 0 throughout the cleanup. */
    bl.classList.remove('tut-vis','tut-bubble-exit');
    bl.style.opacity=''; bl.style.transition='';
    /* Force sync reflow so iOS Safari commits the hidden state before any
       subsequent style/text changes can trigger a paint with stale content. */
    void bl.offsetWidth;
    if(s.blueText) bl.classList.add('tut-blue'); else bl.classList.remove('tut-blue');
    var stepText=typeof s.dynamicText==='function'?s.dynamicText():(s.text||'');
    if(stepText){
      setTutorialText(bt,stepText);
      /* Achievement list bullets (Step 5) — each row uses a distinct accent color
         so the bubble pops more visually instead of reading as a uniform green list */
      if(s.achievementList){
        var achSVGs=[
          /* Calm mind — cool blue */
          '<svg class="tut-achievement-icon" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" stroke="#8ecce0" stroke-width="1.5"/><path d="M7 11c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4" stroke="#8ecce0" stroke-width="1.5" stroke-linecap="round"/><circle cx="11" cy="11" r="1.5" fill="#8ecce0"/></svg>',
          /* Focus — warm gold star */
          '<svg class="tut-achievement-icon" viewBox="0 0 22 22" fill="none"><path d="M11 3l2 6h6l-5 3.6 1.9 6L11 15l-4.9 3.6L8 12.6 3 9h6z" stroke="#f4c264" stroke-width="1.4" stroke-linejoin="round" fill="rgba(244,194,100,0.12)"/></svg>',
          /* Habit / calendar — lavender */
          '<svg class="tut-achievement-icon" viewBox="0 0 22 22" fill="none"><rect x="4" y="5" width="14" height="13" rx="2" stroke="#c4a8d4" stroke-width="1.5"/><path d="M7 2v4M15 2v4M4 10h14" stroke="#c4a8d4" stroke-width="1.5" stroke-linecap="round"/></svg>'
        ];
        var achTexts=[
          '10–15+ min of a completely stilled mind',
          'Unbreakable focus — in work, motivation, happiness',
          'A meditation habit that actually works'
        ];
        var achList=document.createElement('div');
        achList.className='tut-achievement-list';
        achTexts.forEach(function(txt,i){
          var row=document.createElement('div');
          row.className='tut-achievement-row';
          row.innerHTML=achSVGs[i]+'<span class="tut-achievement-text">'+txt+'</span>';
          achList.appendChild(row);
        });
        bt.appendChild(achList);
      }
      /* Show the bubble immediately. The 0.46s tutBubbleEnter bounce-in already
         provides perceived "entry" time; the previous 120ms settle was masked by
         the stale-text flash we just fixed, and now reads as dead air. */
      setTimeout(function(){bl.classList.add('tut-vis');},(bubbleDelay!=null?bubbleDelay:0));
    }
    var _useContinueBtn=!s.eyeTap&&!s.last&&!s.commitBtn;
    th.textContent=s.eyeTap?'Tap the screen':s.last?'Tap to start':'Tap to continue';
    th.style.display=s.eyeTap?'block':'none'; sk.style.display='block';
    if(s.last||s.commitBtn){
      db.style.display='block';
      df.classList.add('tut-float-on');
      if(s.commitBtn){
        db.textContent="I'm Committed →";
        /* Commit step uses the same gradient pill as the Continue button */
        db.classList.add('tut-done-commit');
      } else {
        db.textContent='Begin →';
        db.classList.remove('tut-done-commit');
      }
    } else {
      db.classList.remove('tut-done-commit');
    }
    var _d=delay||700;
    setTimeout(function(){
      rdy=true;
      if(_useContinueBtn) showContinueBtn();
    },_d);
  }

  /* ── Show step ── */
  function go(i){
    if(i>=STEPS.length){end();return;}
    hideContinueBtn();
    var s=STEPS[i];
    var prev=STEPS[cur];
    /* Set inside the full-mode block; consumed by the finishStep call below
       so we can stage the bubble after tc finishes fading in. */
    var enteringFromQuestion=false;
    // Capture Omnia's screen position BEFORE any resets, for smooth FLIP transitions
    var prevOwRect=tc.classList.contains('tut-vis') ? ow.getBoundingClientRect() : null;
    var prevOmniaBelow=!!(prev&&prev.mode==='full'&&prev.omniaBelow&&prevOwRect);
    var sideStepAhead=!!(s.mode==='spot'&&(s.omniaLeft||s.omniaRight)&&!s.scrollTo);
    var willFlip=prevOmniaBelow&&sideStepAhead;
    var willFlipToClock=!!(prev&&prev.mode==='spot'&&s.mode==='full'&&s.omniaClock&&prevOwRect);
    var sideStep=!!(s.mode==='spot'&&(s.omniaLeft||s.omniaRight));
    var prevSideStep=!!(prev&&prev.mode==='spot'&&(prev.omniaLeft||prev.omniaRight));
    var keepSidePosition=!!(sideStep&&prevSideStep&&s.target&&s.target===prev.target&&
      !!s.omniaLeft===!!prev.omniaLeft&&!!s.omniaRight===!!prev.omniaRight);
    var keepLowAnchor=tc.classList.contains('tut-content-low')&&!!s.omniaLow;
    var keepObjCallout=tc.classList.contains('tut-obj-callout')&&!!s.omniaObjCallout;
    var willScrollSlide=!!(s.mode==='spot'&&(s.omniaLeft||s.omniaRight)&&s.scrollTo&&prevOwRect&&prev&&(prev.omniaLow||prev.omniaMid));
    /* Slide-exit: animate bubble out left before showing new content */
    /* Skip exit animation if bubble was already faded via inline style (eyeTap/blinkNext
       handlers set style.opacity='0' before calling go()). The tutBubbleExit keyframe
       starts at opacity:1 with fill-mode:both, which would override the inline opacity
       and flash the old bubble text back into view. */
    var needsExit=!!(bl.classList.contains('tut-vis')&&bl.style.opacity!=='0'&&!willFlip&&!willFlipToClock&&!keepObjCallout&&!willScrollSlide&&!s.greetPulse&&(s.mode==='full'||s.mode==='spot'));
    if(keepLowAnchor) captureTutorialEyeAnchor();
    cur=i; rdy=false;
    /* Back button visibility — only show once we're past the intro + first question */
    if(bk){
      if(i>=BACK_MIN_STEP&&!s.launchClock) bk.style.display='block';
      else bk.style.display='none';
    }
    /* Progress bar */
    var _pf=document.getElementById('tutProgressFill');
    if(_pf) _pf.style.width=Math.round((i+1)/TUT_TOTAL*100)+'%';
    /* greetPulse: bounce Omnia happily on step 0 */
    if(s.greetPulse){
      ow.classList.remove('tut-greet-pulse');
      void ow.offsetWidth;
      ow.classList.add('tut-greet-pulse');
      ow.addEventListener('animationend',function h(){ow.classList.remove('tut-greet-pulse');ow.removeEventListener('animationend',h);},{once:true});
    }
    var keepEyeAnchor=!!(tutorialEyeAnchorY!=null&&((s.inEye&&(i===1||i===2))||s.morphCrystal));
    var keepFigureAnchor=keepEyeAnchor||keepLowAnchor;
    if(!keepFigureAnchor) tutorialEyeAnchorY=null;

    if(!s.greetPulse) ow.classList.remove('tut-greet-pulse');
    if(!s.clockBg) hideClockBg();
    if(!s.objFlash) hideObjFlash();
    if(!s.thoughtBg) hideThoughtAnim();
    if(s.stopCreek) stopTutCreek();
    if(!s.asana) ow.classList.remove('asana-state');
    document.querySelectorAll('.tut-elem-glow').forEach(function(e){e.classList.remove('tut-elem-glow');});
    hidePathChoice();
    if(!keepSidePosition && !willFlip && !willFlipToClock && !keepObjCallout && !willScrollSlide) resetTcPosition(keepLowAnchor);
    tc.classList.toggle('tut-eye-stage',!!(s.eyeTap||s.inEye||s.morphCrystal));

    /* ── DRAWER mode ── */
    if(s.mode==='drawer'){
      th.style.display='none'; sk.style.display='none';
      ov.style.opacity='0'; ov.style.pointerEvents='none';
      stopSparks();
      df.classList.remove('tut-float-on');
      fb.classList.remove('tut-vis');
      db.style.display='none';
      if(!s.spotDrawer) darkSpot();
      cp.classList.add('tut-cap-on');
      openDrawer();
      setTimeout(function(){
        if(s.spotDrawer&&s.target) litSpot(s.target);
        else if(s.target) pulseItem(s.target);
        if(s.omniaRight||s.omniaLeft){
          tc.classList.add('tut-vis'); tc.classList.remove('tut-content-bottom');
          if(s.target) positionTcBeside(s.target,s.omniaRight?'right':'left');
          bl.classList.remove('tut-vis');
          if(s.blueText) bl.classList.add('tut-blue'); else bl.classList.remove('tut-blue');
          if(s.text){setTutorialText(bt,s.text);setTimeout(function(){bl.classList.add('tut-vis');},80);}
        } else {
          tc.classList.remove('tut-vis','tut-content-bottom');
          setTutorialText(ft,s.text||'');
          df.classList.add('tut-float-on');
          setTimeout(function(){fb.classList.add('tut-vis');},60);
        }
        if(s.last) db.style.display='block';
        rdy=true;
      },480);
      return;
    }

    /* ── GUIDE mode ── */
    if(s.mode==='guide'){
      tc.classList.remove('tut-vis','tut-content-bottom');
      th.style.display='none'; sk.style.display='none';
      ov.style.opacity='0'; ov.style.pointerEvents='none';
      stopSparks();
      cp.classList.remove('tut-cap-on');
      clearPulse();
      if(s.target){
        setTimeout(function(){
          litSpot(s.target);
          if(s.clickTarget){var el=document.querySelector(s.target);if(el)el.click();}
        },220);
      } else {
        darkSpot();
      }
      if(s.pathChoice){
        var fresh=loadGuideState();
        if(fresh._pathLockedV2){setTimeout(function(){go(s.skipTo!=null?s.skipTo:cur+3);},120);return;}
        showPathChoice();
        return;
      }
      if(s.corgi) launchCorgi();
      df.classList.remove('tut-float-on');
      fb.classList.remove('tut-vis');
      db.style.display='none';
      setTutorialText(ft,s.text||'');
      df.classList.add('tut-float-on');
      setTimeout(function(){fb.classList.add('tut-vis');},60);
      cp.classList.add('tut-cap-on');
      setTimeout(function(){rdy=true;},700);
      return;
    }

    /* ── QUESTION mode ── */
    if(s.mode==='question'){
      hidePathChoice();
      closeDrawer();
      showQuestion(s);
      return;
    }

    /* ── FULL / SPOT modes ── */
    ov.style.display='block'; ov.style.opacity='1'; ov.style.pointerEvents='auto';
    df.classList.remove('tut-float-on');
    fb.classList.remove('tut-vis');
    darkSpot(); clearPulse(); cp.classList.remove('tut-cap-on');
    closeDrawer();

    if(s.panel) goPanel(s.panel);
    if(s.cards) setTimeout(staggerCards,250);
    if(s.sparks) startSparks(); else stopSparks();
    if((s.inEye||s.morphEye)&&!eyeOn){eyeOn=true;ow.classList.add('eye-state');}
    if(s.playCreek) setTimeout(startTutCreek,400);
    if(s.clockBg) setTimeout(showClockBg,300);
    if(s.objFlash) setTimeout(showObjFlash,300);
    if(s.thoughtBg) setTimeout(showThoughtAnim,300);
    if(s.asana) ow.classList.add('asana-state');

    if(s.mode==='full'){
      ov.classList.remove('tut-spot');
      ov.style.background=s.darkFull||(s.morphCrystal&&eyeOn)
        ? 'rgba(7,8,13,1)'
        : 'rgba(7,8,13,0.92)';
      if(s.omniaClock){
        if(willFlipToClock){
          var clockOwFrom=prevOwRect;
          // Hide the prior bubble instantly (no opacity transition) so it can't be seen
          // briefly at the new corner location, and so emptying its text doesn't visibly
          // shrink tc before the FLIP setup runs.
          var clockPrevBlTrans=bl.style.transition;
          bl.style.transition='none';
          bl.classList.remove('tut-vis');
          void bl.offsetWidth;
          bl.style.transition=clockPrevBlTrans;
          setTutorialText(bt,'');
          th.textContent='Tap to continue';
          th.style.display='block'; sk.style.display='block';
          withoutTcTransition(function(){
            // Clear prior step's inline anchor (positionTcBeside leftovers) so tut-clock-callout
            // CSS can settle tc into its corner before we measure the FLIP destination.
            tc.style.top='';tc.style.bottom='';tc.style.left='';tc.style.right='';
            tc.style.transform='';tc.style.maxWidth='';
            tc.classList.add('tut-vis','tut-clock-callout');
            tc.classList.remove('tut-content-bottom','tut-obj-callout','tut-content-low');
          });
          var clockOwTo=ow.getBoundingClientRect();
          // FLIP by centers (not top-left): ow's CSS size shrinks from 124x146 to 100x118
          // when tut-clock-callout applies, so a top-left FLIP would visually snap Omnia
          // by (width_diff/2, height_diff/2) at the start of the slide.
          var clockFromCX=clockOwFrom.left+clockOwFrom.width/2;
          var clockFromCY=clockOwFrom.top+clockOwFrom.height/2;
          var clockToCX=clockOwTo.left+clockOwTo.width/2;
          var clockToCY=clockOwTo.top+clockOwTo.height/2;
          var clockDX=clockFromCX-clockToCX, clockDY=clockFromCY-clockToCY;
          ow.style.transition='none';
          ow.style.transform='translate('+clockDX+'px,'+clockDY+'px)';
          void ow.offsetWidth;
          ow.style.transition='transform 0.52s cubic-bezier(.22,.9,.23,1)';
          ow.style.transform='none';
          setTimeout(function(){
            if(s.blueText) bl.classList.add('tut-blue'); else bl.classList.remove('tut-blue');
            if(s.text) setTutorialText(bt,s.text);
            bl.classList.add('tut-vis');
          },260);
          setTimeout(function(){
            ow.style.transition=''; ow.style.transform='';
          },560);
          setTimeout(function(){rdy=true;},700);
          return;
        } else {
          tc.classList.add('tut-vis','tut-clock-callout');
          tc.classList.remove('tut-content-bottom');
        }
      } else if(s.omniaBelow){
        tc.classList.add('tut-vis','tut-content-bottom');
        if(s.omniaObjCallout) tc.classList.add('tut-obj-callout');
      } else {
        tc.classList.add('tut-vis'); tc.classList.remove('tut-content-bottom');
      }
      /* Smooth entry from a question step — fade tc (Omnia + bubble) up
         instead of snapping it in, and suppress the bubble's bouncy enter
         animation (which reads as a hop after the question fade). Skip for
         morph step which manages its own opacity. tut-soft-enter is added
         here and cleared by setupQuestion when leaving for the next question
         (or by the default branch below for any non-question-entry full step).
         Bubble is staged behind tc by ~320ms so it appears AFTER tc has nearly
         finished fading in, eliminating any race where bl could briefly paint
         while tc is still ramping. */
      enteringFromQuestion=!!(prev&&prev.mode==='question'&&!(s.morphCrystal&&eyeOn));
      if(enteringFromQuestion){
        tc.style.transition='none';
        tc.style.opacity='0';
        void tc.offsetWidth;
        tc.style.transition='opacity 0.4s ease-out';
        requestAnimationFrame(function(){tc.style.opacity='1';});
        setTimeout(function(){tc.style.opacity='';tc.style.transition='';},460);
        bl.classList.add('tut-soft-enter');
        /* Belt-and-suspenders: also force bl invisible up front so even if a
           lingering inline opacity, transition or text content slipped past the
           setupQuestion reset, nothing can paint until finishStep deliberately
           shows the bubble. */
        bl.classList.remove('tut-vis','tut-bubble-exit');
        bl.style.opacity='0';
        bl.style.transition='none';
        void bl.offsetWidth;
        /* omniaMorphBack: kick off the eye→crystal morph as Omnia re-enters
           the scene. fromEyeToOmnia is ~1240ms; the bubble delay below waits
           until the crystal is mostly formed so the morph isn't covered up. */
        if(s.omniaMorphBack&&eyeOn){
          fromEyeToOmnia(function(){});
        }
      } else {
        bl.classList.remove('tut-soft-enter');
      }
      if(s.morphCrystal&&eyeOn){
        // Lock ow's screen position throughout the morph. Anything that resizes
        // the bubble or tc (text swap, class changes, morph end cleanup) otherwise
        // tugs ow vertically because tc is centered with translate(-50%,-50%).
        var morphAnchorY=prevOwRect?(prevOwRect.top+prevOwRect.height/2):null;
        var anchorOwToMorph=function(){
          if(morphAnchorY==null) return;
          var r=ow.getBoundingClientRect();
          var delta=morphAnchorY-(r.top+r.height/2);
          if(Math.abs(delta)<0.5) return;
          var topPx=parseFloat(window.getComputedStyle(tc).top);
          if(isNaN(topPx)) topPx=window.innerHeight/2;
          withoutTcTransition(function(){
            tc.style.top=(topPx+delta)+'px';
          });
        };
        // Pre-empt the text-swap shift: hide the bubble instantly (no fade),
        // load the new short text now while it's invisible, and snap tc.top so
        // ow is back at its step-2 position before the morph even starts. The
        // bubble fades back in midway through the morph.
        var morphPrevBlTrans=bl.style.transition;
        bl.style.transition='none';
        bl.classList.remove('tut-vis');
        void bl.offsetWidth;
        if(s.text){
          if(s.blueText) bl.classList.add('tut-blue'); else bl.classList.remove('tut-blue');
          setTutorialText(bt,s.text);
        }
        anchorOwToMorph();
        bl.style.transition=morphPrevBlTrans;
        void bl.offsetWidth;
        // Fade the new bubble in late in the morph so it doesn't compete visually.
        setTimeout(function(){
          anchorOwToMorph();
          bl.classList.add('tut-vis');
        },820);
        applyTutorialEyeAnchor();
        anchorOwToMorph();
        var concentrationSceneRevealed=false;
        var revealConcentrationScene=function(){
          if(concentrationSceneRevealed) return;
          concentrationSceneRevealed=true;
          if(s.spotPanel){
            var glowEl=document.querySelector(s.spotPanel);
            var el=document.querySelector(s.spotPanel);
            if(el){
              var r=el.getBoundingClientRect(),p=10;
              // Snap and show the spotlight before fading the overlay so the app never
              // flashes in unframed between the dark intro and the highlighted tab.
              sp.style.transition='none';
              sp.style.left=(r.left-p)+'px'; sp.style.top=(r.top-p)+'px';
              sp.style.width=(r.width+p*2)+'px'; sp.style.height=(r.height+p*2)+'px';
              void sp.offsetWidth;
              sp.classList.add('tut-lit');
              requestAnimationFrame(function(){ sp.style.transition=''; });
            }
            setTimeout(function(){ ov.style.background='rgba(7,8,13,0)'; },220);
            if(glowEl) setTimeout(function(){ glowEl.classList.add('tut-elem-glow'); }, 420);
          }
        };
        var concentrationRevealTimer=setTimeout(revealConcentrationScene,900);
        fromEyeToOmnia(function(){
          clearTimeout(concentrationRevealTimer);
          revealConcentrationScene();
          // Re-anchor after the morph end class flips and crystal style cleanup,
          // which can nudge ow as the wrap reverts from eye-state to default.
          anchorOwToMorph();
          captureTutorialEyeAnchor();
          applyTutorialEyeAnchor();
          tutorialEyeAnchorY=null;
          setTimeout(function(){rdy=true;},400);
        });
        th.textContent='Tap to continue'; th.style.display='block'; sk.style.display='block';
        return;
      }
    } else {
      ov.classList.add('tut-spot');
      ov.style.background='rgba(7,8,13,0.08)';
      if(s.omniaLeft||s.omniaRight){
        // Smooth FLIP slide when coming from a full/omniaBelow step
        if(willFlip){
          var flipTarget=document.querySelector(s.targets?s.targets[0]:s.target);
          if(flipTarget){
            // owFromRect already captured before any resets — Omnia's current screen pos
            var owFrom=prevOwRect;
            var prevBubbleTransition=bl.style.transition;
            bl.style.transition='none';
            bl.classList.remove('tut-vis');
            if(s.blueText) bl.classList.add('tut-blue'); else bl.classList.remove('tut-blue');
            if(s.text) setTutorialText(bt,s.text);
            void bl.offsetWidth;
            bl.style.transition=prevBubbleTransition;
            th.textContent=s.eyeTap?'Tap the screen':'Tap to continue';
            th.style.display='block'; sk.style.display='block';
            // Remove position-altering classes and apply the destination layout
            // in one transition-free pass; Omnia's own FLIP handles the motion.
            withoutTcTransition(function(){
              tc.classList.remove('tut-content-bottom','tut-obj-callout','tut-clock-callout');
              if(!keepLowAnchor) tc.classList.remove('tut-content-low');
              positionTcBeside(s.targets?s.targets[0]:s.target, s.omniaLeft?'left':'right');
              if(s.omniaNarrowLeft) tc.style.maxWidth='min(220px,46vw)';
            });
            if(s.targets) litSpotMulti(s.targets); else litSpot(s.target);
            // FLIP on ow: measure destination, then invert+animate
            var owTo=ow.getBoundingClientRect();
            var owDX=owFrom.left-owTo.left, owDY=owFrom.top-owTo.top;
            ow.style.transition='none';
            ow.style.transform='translate('+owDX+'px,'+owDY+'px)';
            void ow.offsetWidth;
            ow.style.transition='transform 0.52s cubic-bezier(.22,.9,.23,1)';
            ow.style.transform='none';
            setTimeout(function(){
              bl.classList.add('tut-vis');
            },260);
            setTimeout(function(){
              ow.style.transition=''; ow.style.transform='';
            },560);
            setTimeout(function(){rdy=true;},700);
            return;
          }
        }
        // Slide Omnia from his prior (low/mid) position to the new side anchor after scroll.
        if(willScrollSlide){
          var slideFrom=prevOwRect;
          var prevBlTrans=bl.style.transition;
          // Hide bubble instantly (no fade) so any in-flight opacity transition can't
          // paint the new text in the old bubble during/after the scroll.
          bl.style.transition='none';
          bl.classList.remove('tut-vis');
          void bl.offsetWidth;
          // Keep tc visible at its current low position while the card scrolls.
          scrollToCard(s.scrollTo,function(){
            var targetSel=s.targets?s.targets[0]:s.target;
            if(s.targets) litSpotMulti(s.targets); else litSpot(s.target);
            // Snap tc to its destination layout without transitioning so the FLIP on ow is clean.
            withoutTcTransition(function(){
              tc.classList.remove('tut-content-low','tut-content-bottom','tut-clock-callout');
              positionTcBeside(targetSel,s.omniaLeft?'left':'right');
              if(s.omniaNarrowLeft) tc.style.maxWidth='min(220px,46vw)';
            });
            tc.classList.add('tut-vis');
            // Pre-load step text while the bubble is still forcibly hidden.
            if(s.blueText) bl.classList.add('tut-blue'); else bl.classList.remove('tut-blue');
            if(s.text) setTutorialText(bt,s.text);
            void bl.offsetWidth;
            // FLIP: slide ow from prior screen position to its new anchor.
            // Use center-based FLIP because ow changes size (92x108→124x146) between steps.
            var slideTo=ow.getBoundingClientRect();
            var slFromCX=slideFrom.left+slideFrom.width/2, slFromCY=slideFrom.top+slideFrom.height/2;
            var slToCX=slideTo.left+slideTo.width/2, slToCY=slideTo.top+slideTo.height/2;
            var slDX=slFromCX-slToCX, slDY=slFromCY-slToCY;
            ow.style.transition='none';
            ow.style.transform='translate('+slDX+'px,'+slDY+'px)';
            void ow.offsetWidth;
            ow.style.transition='transform 0.6s cubic-bezier(.22,.9,.23,1)';
            ow.style.transform='none';
            setTimeout(function(){
              bl.style.transition='opacity 0.22s ease';
              void bl.offsetWidth;
              bl.classList.add('tut-vis');
              setTimeout(function(){ bl.style.transition=prevBlTrans; },260);
            },280);
            setTimeout(function(){
              ow.style.transition=''; ow.style.transform='';
            },640);
            th.textContent=s.eyeTap?'Tap the screen':'Tap to continue';
            th.style.display='block'; sk.style.display='block';
            setTimeout(function(){rdy=true;},760);
          });
          return;
        }
        tc.classList.remove('tut-vis','tut-content-bottom');
        var doSpot=function(){
          if(s.targets) litSpotMulti(s.targets); else litSpot(s.target);
          positionTcBeside(s.targets?s.targets[0]:s.target,s.omniaLeft?'left':'right');
          if(s.omniaNarrowLeft){tc.style.maxWidth='min(220px,46vw)';}
          tc.classList.add('tut-vis');
          finishStep(s);
        };
        if(s.scrollTo){scrollToCard(s.scrollTo,doSpot);return;}
        // Fire spotlight immediately so it fades in alongside the overlay fade (prevents flash)
        if(s.targets) litSpotMulti(s.targets); else if(s.target) litSpot(s.target);
        setTimeout(function(){
          positionTcBeside(s.targets?s.targets[0]:s.target,s.omniaLeft?'left':'right');
          if(s.omniaNarrowLeft){tc.style.maxWidth='min(220px,46vw)';}
          tc.classList.add('tut-vis');
          finishStep(s);
        },200); return;
      } else if(s.omniaMid||s.omniaLow){
        tc.classList.add('tut-vis');
        tc.classList.remove('tut-content-bottom');
        if(s.omniaLow) tc.classList.add('tut-content-low');
        var doSpotMid=function(){
          if(s.targets) litSpotMulti(s.targets); else litSpot(s.target);
          finishStep(s);
          if(keepLowAnchor) applyTutorialEyeAnchor();
        };
        setTimeout(doSpotMid,200); return;
      } else {
        tc.classList.add('tut-vis');
        tc.classList.add('tut-content-bottom');
        if(s.omniaObjCallout) tc.classList.add('tut-obj-callout');
        if(s.omniaObjCallout&&!s.omniaObjSlideLeft) tc.classList.remove('tut-obj-callout-left','tut-obj-bubble-above');
        var doSpot2=function(){if(s.targets) litSpotMulti(s.targets); else litSpot(s.target);};
        if(s.scrollTo){scrollToCard(s.scrollTo,function(){doSpot2();finishStep(s);});return;}
        setTimeout(doSpot2,180);
        if(keepObjCallout){
          var objOwFrom=ow.getBoundingClientRect();
          var objBubbleTransition=bl.style.transition;
          bl.style.transition='opacity 0.24s ease';
          bl.classList.remove('tut-vis');
          if(s.blueText) bl.classList.add('tut-blue'); else bl.classList.remove('tut-blue');
          th.textContent=s.eyeTap?'Tap the screen':'Tap to continue';
          th.style.display='block'; sk.style.display='block';
          if(s.omniaObjSlideLeft){
            // Apply all destination layout changes upfront (invisible — bubble has opacity:0)
            // so we can measure final positions for a 2D FLIP slide (left + up together).
            withoutTcTransition(function(){
              tc.classList.add('tut-obj-callout-left');
              tc.classList.add('tut-obj-bubble-above');
            });
            if(s.text) setTutorialText(bt,s.text);
            // Compute bubble bottom: just above the spotlit card
            var bubTargetSel=s.targets?s.targets[0]:s.target;
            var bubTargetEl=bubTargetSel?document.querySelector(bubTargetSel):null;
            var bubBottom=184;
            if(bubTargetEl){
              var btRect=bubTargetEl.getBoundingClientRect();
              bubBottom=Math.max(184,(window.innerHeight-btRect.top)+18);
            }
            bl.style.bottom=bubBottom+'px';
            // Compute Omnia's target bottom so he sits just under the bubble's arrow tip
            var owH=ow.getBoundingClientRect().height||92;
            // arrow tip is at (window.innerHeight - bubBottom + 8) from screen top
            var arrowTipFromTop=window.innerHeight-bubBottom+8;
            var owTargetBottom=window.innerHeight-arrowTipFromTop-10-owH; // 10px gap
            owTargetBottom=Math.max(72,owTargetBottom);
            // Set Omnia's final inline bottom, then measure his true final rect
            ow.style.transition='none';
            ow.style.bottom=owTargetBottom+'px';
            void ow.offsetWidth;
            var objOwFinal=ow.getBoundingClientRect();
            // 2D FLIP: translate from old position to new, animate back to none
            var objDX=objOwFrom.left-objOwFinal.left;
            var objDY=objOwFrom.top-objOwFinal.top;
            ow.style.transform='translate('+objDX+'px,'+objDY+'px)';
            void ow.offsetWidth;
            ow.style.transition='transform 0.95s cubic-bezier(.42,0,.2,1)';
            ow.style.transform='none';
            setTimeout(function(){
              ow.style.transition=''; ow.style.transform='';
            },1000);
          } else {
            tc.classList.remove('tut-obj-callout-left','tut-obj-bubble-above');
          }
          setTimeout(function(){
            if(!s.omniaObjSlideLeft) tc.classList.add('tut-obj-bubble-above');
            bl.style.transition=objBubbleTransition;
            void bl.offsetWidth;
            bl.classList.add('tut-vis');
          },300);
          setTimeout(function(){rdy=true;},1120);
          return;
        }
      }
    }

    /* Stagger the bubble's appearance after tc has nearly finished its
       fade-up when entering from a question — guarantees no overlap that could
       paint a stale bubble. When omniaMorphBack is also running we wait longer
       so the bubble doesn't cover the morph, and push rdy past the morph end
       so the commit button is tappable only after Omnia has fully reformed. */
    var _qBubbleDelay,_qReadyDelay;
    if(enteringFromQuestion){
      /* Only stretch when an eye→crystal morph is actually firing this entry.
         Going back to STEPS[5] after the morph already happened (eyeOn=false)
         should use the short delay so the bubble doesn't hang for 1.1s. */
      if(s.omniaMorphBack&&eyeOn){
        _qBubbleDelay=1100;
        _qReadyDelay=1320;
      } else {
        _qBubbleDelay=340;
      }
    }
    if(needsExit){
      bl.classList.add('tut-bubble-exit');
      setTimeout(function(){
        bl.classList.remove('tut-vis','tut-bubble-exit');
        finishStep(s,_qReadyDelay,_qBubbleDelay);
        if(keepFigureAnchor) applyTutorialEyeAnchor();
      },160);
    } else {
      finishStep(s,_qReadyDelay,_qBubbleDelay);
      if(keepFigureAnchor) applyTutorialEyeAnchor();
    }
  }

  /* ── End ── */
  function end(){
    window.__tutInProgress = false;
    localStorage.setItem(VISITED,'1');
    document.body.classList.remove('tut-live');
    document.querySelectorAll('.tut-elem-glow').forEach(function(e){e.classList.remove('tut-elem-glow');});
    if(qp) qp.classList.remove('tut-vis');
    hideContinueBtn();
    stopSparks(); clearPulse(); darkSpot();
    hideClockBg(); hideObjFlash(); stopTutCreek(); hideThoughtAnim();
    if(corgiTimer){clearTimeout(corgiTimer); cg.style.display='none';}
    resetTutorialEye();
    tutorialEyeAnchorY=null;
    ow.classList.remove('asana-state','tut-omnia-nod');
    cp.classList.remove('tut-cap-on');
    closeDrawer();
    tc.classList.remove('tut-vis','tut-content-bottom');
    resetTcPosition();
    th.style.display='none'; sk.style.display='none';
    if(bk) bk.style.display='none';
    ov.style.opacity='0';
    df.classList.remove('tut-float-on');
    hidePathChoice();
    setTimeout(function(){ov.style.display='none';},500);
    document.querySelectorAll('#exerciseGrid .exercise-card').forEach(function(c){
      c.style.opacity=''; c.style.transform=''; c.style.transition='';
    });
  }

  // The Skip button is shown throughout the tutorial but was never wired up —
  // tapping it did nothing, trapping the user. End the tutorial on tap (and
  // stop the tap from also advancing a step via the overlay handler).
  if(sk) sk.addEventListener('click',function(e){ e.stopPropagation(); end(); });

  /* ── Tap handlers ── */
  ov.addEventListener('click',function(){
    if(!rdy) return;
    var s=STEPS[cur];
    if(s.eyeTap&&!eyeOn){
      rdy=false;
      captureTutorialEyeAnchor();
      th.style.display='none';
      bl.style.transition='opacity 0.22s ease';
      bl.style.opacity='0';
      toEye(function(){go(cur+1);});
    } else if(s.blinkNext&&eyeOn){
      rdy=false;
      th.style.display='none';
      bl.style.transition='opacity 0.22s ease';
      bl.style.opacity='0';
      setTimeout(function(){
        bl.classList.remove('tut-vis');
        bt.innerHTML='';
      },240); // clear stale content after fade (220ms) so finishStep(STEPS[3]) starts clean
      blinkCrystalEye(function(){go(cur+1);});
    } else {
      if(s.last){db.click();}else if(s.commitBtn){db.click();}else{go(cur+1);}
    }
  });

  if(cb) cb.addEventListener('click',function(){
    if(!rdy) return;
    var s=STEPS[cur];
    ow.classList.remove('tut-omnia-nod');
    void ow.offsetWidth;
    ow.classList.add('tut-omnia-nod');
    ow.addEventListener('animationend',function h(){ow.classList.remove('tut-omnia-nod');ow.removeEventListener('animationend',h);},{once:true});
    if(s.last||s.commitBtn){db.click();}else{go(cur+1);}
  });

  cp.addEventListener('click',function(){
    var s=STEPS[cur];
    if(!rdy||!s) return;
    if(s.mode==='drawer'&&s.last) return;
    if(s.openGuide){
      rdy=false; cp.classList.remove('tut-cap-on');
      var nextI=cur+1;
      closeDrawer();
      setTimeout(function(){switchMode('guide');setTimeout(function(){go(nextI);},350);},300);
      return;
    }
    go(s.nextIdx!=null?s.nextIdx:cur+1);
  });

  db.addEventListener('click',function(e){
    e.stopPropagation();
    var s=STEPS[cur];
    if(s&&s.launchClock){
      // Clear tutorial state synchronously — no transitions, no timeouts
      window._tutorialFirstClock=true;
      window._tutorialAnswers=JSON.parse(JSON.stringify(tutAnswers));
      document.body.classList.remove('tut-live');
      if(qp) qp.classList.remove('tut-vis');
      ov.style.transition='none';
      ov.style.opacity='0';
      ov.style.display='none';
      ov.style.pointerEvents='none';
      tc.classList.remove('tut-vis','tut-content-bottom');
      df.classList.remove('tut-float-on');
      db.style.display='none';
      th.style.display='none';
      sk.style.display='none';
      if(bk) bk.style.display='none';
      stopSparks(); darkSpot(); resetTutorialEye();
      suppressTutorialForExerciseEntry();
      localStorage.setItem('presence_tutorialPending','1');
      // Ensure home screen is the active base before switching to clock screen
      var hs=document.getElementById('homeScreen');
      if(hs) hs.style.display='flex';
      currentExercise='clock';
      startConcentration();
      var tip=document.getElementById('tutClockTip');
      if(tip){
        // Tip stays visible until the user presses Begin (handled in
        // beginCountdown) so the instructions don't disappear mid-read.
        setTimeout(function(){tip.classList.add('tut-ct-show');},400);
      }
    } else if(s&&s.commitBtn){
      go(cur+1);
    } else {
      end();
    }
  });
  /* ── Back button: walk back one step at a time, clearing the answer of the
     step we're returning to so the user can re-pick. Disabled while not rdy to
     avoid mid-animation re-entry. ── */
  if(bk){
    bk.addEventListener('click',function(e){
      e.stopPropagation();
      /* During post-session stages, back navigates between those stages */
      if(window.__tutPostBackFn){ window.__tutPostBackFn(); return; }
      if(!rdy) return;
      /* Block clicks below the floor; cur===BACK_MIN_STEP (=3) is still allowed
         and walks back to step 2, the first question. */
      if(cur<BACK_MIN_STEP) return;
      var target=cur-1;
      var targetStep=STEPS[target];
      if(targetStep&&targetStep.answerKey){
        delete tutAnswers[targetStep.answerKey];
        delete tutAnswers[targetStep.answerKey+'Bars'];
      }
      /* If we're currently on a question step, fade its panel out before swapping */
      if(qp&&qp.classList.contains('tut-vis')){
        hideQuestion();
        setTimeout(function(){go(target);},300);
      } else {
        go(target);
      }
    });
  }

  /* ── Path choice buttons ── */
  document.getElementById('tutPathNew').addEventListener('click',function(e){
    e.stopPropagation();
    if (typeof guideApplyTutorialPathChoice === 'function') guideApplyTutorialPathChoice('beginner', (tutAnswers.experienceBars || 1), 'Path tutorial: new', tutAnswers.goal);
    hidePathChoice();
    df.classList.remove('tut-float-on'); fb.classList.remove('tut-vis');
    setTimeout(function(){go(23);},300);
  });
  document.getElementById('tutPathExp').addEventListener('click',function(e){
    e.stopPropagation();
    if (typeof guideApplyTutorialPathChoice === 'function') guideApplyTutorialPathChoice('experienced', (tutAnswers.experienceBars || 3), 'Path tutorial: experienced', tutAnswers.goal);
    hidePathChoice();
    df.classList.remove('tut-float-on'); fb.classList.remove('tut-vis');
    setTimeout(function(){go(24);},300);
  });

  /* ── Boot ── */
  function boot(){
    if(localStorage.getItem(VISITED)) return;
    if(!tutorialCanBootOnHome()) return;
    window.__tutInProgress = true;
    document.body.classList.add('tut-live');
    ov.style.display='block'; ov.style.opacity='0'; ov.style.pointerEvents='auto';
    ov.style.transition='opacity 0.7s ease,background 0.4s ease';
    setTimeout(function(){ov.style.opacity='1';go(0);},120);
  }

  window.__tutReplay=function(){
    cur=0; eyeOn=false; rdy=false;
    window.__tutInProgress = true;
    document.body.classList.add('tut-live');
    stopSparks(); darkSpot(); hideClockBg(); hideObjFlash(); stopTutCreek(); hideThoughtAnim();
    if(corgiTimer){clearTimeout(corgiTimer);cg.style.display='none';}
    resetTutorialEye();
    ow.classList.remove('asana-state');
    tc.classList.remove('tut-vis','tut-content-bottom');
    bl.classList.remove('tut-soft-enter','tut-vis','tut-bubble-exit','tut-blue');
    db.classList.remove('tut-done-commit');
    resetTcPosition();
    th.style.display='none'; sk.style.display='none';
    if(bk) bk.style.display='none';
    df.classList.remove('tut-float-on'); fb.classList.remove('tut-vis');
    hidePathChoice(); cp.classList.remove('tut-cap-on');
    clearPulse(); closeDrawer();
    ov.style.display='block'; ov.style.opacity='0'; ov.style.pointerEvents='auto';
    ov.style.transition='opacity 0.7s ease';
    setTimeout(function(){ov.style.opacity='1';go(0);},120);
  };

  if(!localStorage.getItem(VISITED)){
    window.__tutBoot=function(){
      if(localStorage.getItem(VISITED)) return;
      setTimeout(function(){
        if(localStorage.getItem(VISITED)) return;
        if(!tutorialCanBootOnHome()) return;
        window.__tutBoot=null;
        boot();
      },900);
    };
    var homeEl=document.getElementById('homeScreen');
    if(homeEl){
      var _poller=setInterval(function(){
        if(homeEl.style.display==='flex'&&!localStorage.getItem(VISITED)){
          clearInterval(_poller);
          if(window.__tutBoot) window.__tutBoot();
        }
      },300);
    }
  }

})();});
