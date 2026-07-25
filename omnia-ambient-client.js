/* ── Omnia animations: scheduler + registered animations ── */
function initOmniaAnims(){
  var peek=document.getElementById('omniaTabPeek');
  if(!peek) return;

  var TAB_PEEK_HISTORY_KEY='presenceOmniaTabPeekLastShown';
  var TAB_PEEK_COOLDOWN_MS=7*24*60*60*1000;
  var peekHistory={};
  try {
    peekHistory=JSON.parse(localStorage.getItem(TAB_PEEK_HISTORY_KEY)||'{}')||{};
  } catch(e) {
    peekHistory={};
  }
  function tabPeekIsReady(tab){
    return Date.now()-Number(peekHistory[tab]||0)>=TAB_PEEK_COOLDOWN_MS;
  }
  function rememberTabPeek(tab){
    peekHistory[tab]=Date.now();
    try {
      localStorage.setItem(TAB_PEEK_HISTORY_KEY,JSON.stringify(peekHistory));
    } catch(e) {}
  }

  // ─── Scheduler ───
  var registry=[];
  var current=null;
  var ambientTimer=null;

  function register(anim){
    registry.push(Object.assign({lastShown:0, lastClicked:0}, anim));
  }
  function pickNext(){
    var now=Date.now();
    var pool=registry.filter(function(a){
      if(current===a) return false;
      if(a.tabs && a.tabs.indexOf(currentMode)<0) return false;
      if(a.canShow && !a.canShow()) return false;
      var cd=(a.lastClicked>a.lastShown) ? a.cooldownClicked : a.cooldownShown;
      var since=now - Math.max(a.lastShown, a.lastClicked);
      return since > cd;
    });
    if(!pool.length) return null;
    pool.sort(function(a,b){
      return Math.max(a.lastShown,a.lastClicked) - Math.max(b.lastShown,b.lastClicked);
    });
    return pool[0];
  }
  function trigger(){
    if(document.body.classList.contains('tut-live')) return;
    if(document.getElementById('homeScreen').style.display==='none') return;
    // If peek is showing but the user switched to a tab it shouldn't appear on, dismiss it
    if(current && current.id==='peek' && peekVisible && !peekShooting){
      if(!current.tabs || current.tabs.indexOf(currentMode)<0){
        clearTimeout(peekHideTimer);
        peek.classList.remove('peek-in');
        peekVisible=false;
        var dDismiss=peekDone; peekDone=null;
        if(dDismiss) dDismiss(false);
        current=null;
        return;
      }
    }
    // If peek is already showing on the wrong side, snap it to the correct side
    if(current && current.id==='peek' && peekVisible && !peekShooting){
      var shouldBe=(currentMode==='concentration')?'right':'left';
      if(peekSide!==shouldBe){
        clearTimeout(peekHideTimer);
        peek.style.transition='none';
        peek.classList.remove('peek-in','side-right','side-left');
        peek.classList.add(shouldBe==='left'?'side-left':'side-right');
        peekSide=shouldBe;
        void peek.offsetWidth;
        peek.style.transition='';
        peek.classList.add('peek-in');
        peekHideTimer=setTimeout(function(){
          if(!peekVisible||peekShooting) return;
          peek.classList.remove('peek-in');
          peekVisible=false;
          var d=peekDone; peekDone=null;
          if(d) d(false);
        },5500);
      }
      return;
    }
    if(current) return;
    var anim=pickNext();
    if(!anim) return;
    anim.lastShown=Date.now();
    current=anim;
    anim.show(function(clicked){
      if(clicked) anim.lastClicked=Date.now();
      current=null;
    });
  }
  function scheduleAmbient(){
    clearTimeout(ambientTimer);
    var delay=60000 + Math.random()*60000;
    ambientTimer=setTimeout(function(){ trigger(); scheduleAmbient(); }, delay);
  }
  // Dismiss any visible animation instantly (called when leaving home screen)
  window._omniaQuickDismiss=function(){
    if(peekVisible && !peekShooting){
      clearTimeout(peekHideTimer);
      peek.classList.remove('peek-in');
      peekVisible=false;
      var d=peekDone; peekDone=null;
      if(d) d(false);
    }
    // headphones dismiss is handled per-instance via its own dismiss fn
    // stored on the element
    var hp=document.querySelector('.omnia-headphones-anim');
    if(hp && hp._dismiss) hp._dismiss(false);
  };

  // ─── Animation 1: side peek ───
  var peekHideTimer=null, peekVisible=false, peekShooting=false, peekSide='right', peekDone=null;

  function setPeekSide(side){
    peek.style.transition='none';
    peek.classList.remove('side-right','side-left');
    peek.classList.add(side==='left' ? 'side-left' : 'side-right');
    void peek.offsetWidth;
    peek.style.transition='';
    peekSide=side;
  }
  function spawnTrail(direction){
    var rect=peek.getBoundingClientRect();
    var cx=rect.left+rect.width/2;
    var cy=rect.top+rect.height/2;
    var streakClass=direction==='left'?'streak-l':'streak-r';
    for(var i=0;i<5;i++){
      var s=document.createElement('div');
      s.className='omnia-streak '+streakClass;
      var offX=direction==='left'?-30:30;
      s.style.left=(cx+offX-60)+'px';
      s.style.top=(cy+(Math.random()*70-35))+'px';
      s.style.animationDelay=(i*45)+'ms';
      document.body.appendChild(s);
      setTimeout(function(el){return function(){el.remove();};}(s),700+i*45);
    }
    for(var j=0;j<10;j++){
      var sp=document.createElement('div');
      sp.className='omnia-spark';
      var a=Math.random()*Math.PI*2;
      var d=25+Math.random()*55;
      sp.style.left=(cx-3)+'px';
      sp.style.top=(cy-3)+'px';
      sp.style.setProperty('--dx',Math.cos(a)*d+'px');
      sp.style.setProperty('--dy',Math.sin(a)*d+'px');
      sp.style.animationDelay=(Math.random()*120)+'ms';
      document.body.appendChild(sp);
      setTimeout(function(el){return function(){el.remove();};}(sp),900);
    }
  }
  peek.addEventListener('click',function(){
    if(peekShooting||!peekVisible) return;
    peekShooting=true;
    clearTimeout(peekHideTimer);
    spawnTrail(peekSide==='left'?'right':'left');
    peek.style.transition='transform 0.4s cubic-bezier(.6,0,.2,1)';
    if(peekSide==='left'){
      peek.style.transform='translateX(calc(100vw + 200px)) rotate(45deg)';
    } else {
      peek.style.transform='translateX(calc(-100vw - 200px)) rotate(-45deg)';
    }
    setTimeout(function(){
      peek.classList.remove('peek-in');
      peek.style.transition='none';
      peek.style.transform='';
      void peek.offsetWidth;
      peek.style.transition='';
      peekVisible=false; peekShooting=false;
      var d=peekDone; peekDone=null;
      if(d) d(true);
    },440);
  });
  register({
    id:'peek',
    tabs:['awareness','concentration'],
    cooldownShown:TAB_PEEK_COOLDOWN_MS,
    cooldownClicked:TAB_PEEK_COOLDOWN_MS,
    canShow:function(){
      return tabPeekIsReady(currentMode);
    },
    show:function(done){
      // Keep this bit of character occasional across app restarts, independently
      // for Awareness and Concentration.
      rememberTabPeek(currentMode);
      var side=(currentMode==='concentration')?'right':'left';
      setPeekSide(side);
      peek.classList.add('peek-in');
      peekVisible=true;
      peekDone=done;
      clearTimeout(peekHideTimer);
      peekHideTimer=setTimeout(function(){
        if(!peekVisible || peekShooting) return;
        peek.classList.remove('peek-in');
        peekVisible=false;
        var d=peekDone; peekDone=null;
        if(d) d(false);
      },2500);
    }
  });

  // ─── Triggers ───
  ['modeAwareness','modeConcentration','modePrayer'].forEach(function(id){
    var btn=document.getElementById(id);
    if(!btn) return;
    btn.addEventListener('click',function(){
      // Snap immediately if peek is showing on wrong side,
      // then allow a small delay before triggering a fresh animation.
      trigger();
      setTimeout(trigger, 80);
    });
  });
  scheduleAmbient();
  // Give an eligible tab one quiet chance shortly after app open.
  setTimeout(trigger, 8000);
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initOmniaAnims);
  document.addEventListener('DOMContentLoaded',function(){ if(typeof applyOmniaStepVisuals==='function') applyOmniaStepVisuals(); });
} else {
  initOmniaAnims();
  if(typeof applyOmniaStepVisuals==='function') applyOmniaStepVisuals();
}
