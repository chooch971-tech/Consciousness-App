// ══════════════════════════════════════════════════════

// Which mode (concentration/guide) to return to when the Soul Mirror /
// Autosuggestion / Pore Breathing screen's back button is tapped — set at
// each entry point, same pattern as exSetupOriginMode for every other
// exercise's setup screen.
var _smOriginMode = 'concentration';

function loadSoulMirror(){
  var data;
  try{var s=localStorage.getItem('presence_soul_mirror_v1');data=s?JSON.parse(s):{positive:[],negative:[],notes:''};}
  catch(e){data={positive:[],negative:[],notes:''};}
  // Traits were once stored as plain strings; normalize to objects so they can
  // carry completion state ("done" traits darken in the mirror) for the
  // Autosuggestion practice.
  ['positive','negative'].forEach(function(k){
    data[k]=(data[k]||[]).map(function(t){return typeof t==='string'?{text:t,done:false}:t;});
  });
  return data;
}
function saveSoulMirror(data){
  data._lastEditDate = guideLocalDayKey();
  localStorage.setItem('presence_soul_mirror_v1',JSON.stringify(data));
}

// ── "Finished with the Mirror" milestone ────────────────────────────────
// Once the soul-mirror inventory is thorough enough (Bardon asks for an
// exhaustive list), Omnia stops prompting daily reflection and shifts the
// recommended practice to Pore Breathing — the energetic transformation work.
// The Mirror itself stays fully editable; this only changes the recommendation.
var SOUL_MIRROR_NEG_GOAL = 100;
var SOUL_MIRROR_POS_GOAL = 60;
function soulMirrorThresholdMet(data){
  data = data || loadSoulMirror();
  return (data.negative||[]).length >= SOUL_MIRROR_NEG_GOAL
      && (data.positive||[]).length >= SOUL_MIRROR_POS_GOAL;
}
function soulMirrorIsFinished(){
  try { return !!loadSoulMirror().mirrorFinished; } catch(e){ return false; }
}
function soulMirrorFinish(){
  showConfirm('Finished with the Mirror?',
    'Your soul-mirror inventory is complete. Omnia will shift your recommended reflection to Pore Breathing — the work of transformation. You can still edit the Mirror anytime.',
    function(){
      var data=loadSoulMirror();
      data.mirrorFinished=true;
      saveSoulMirror(data);
      renderSoulMirrorTraits();
      if(typeof renderPathQuests==='function'){ try{renderPathQuests();}catch(e){} }
      if(typeof omniaPickRecommendation==='function'){ try{omniaPickRecommendation(true);}catch(e){} }
      showToast('Mirror complete · Pore Breathing is now your path');
    });
}

var soulMirrorQuery='';

// ── Bardon-style classification of negative traits ──────────────
// Each negative trait can carry an element (the four temperaments) and a
// severity (how strongly it grips). Both are optional; users assign them by
// tapping a trait to open its editor, and can group the list by either.
var SOUL_ELEMENTS = {
  fire:  { label:'Fire',  color:'224,122,74'  },
  water: { label:'Water', color:'90,159,212'  },
  air:   { label:'Air',   color:'216,196,90'  },
  earth: { label:'Earth', color:'126,184,126' },
};
var SOUL_ELEMENT_ORDER = ['fire','water','air','earth'];
var SOUL_SEVERITY = {
  3: { label:'Major',    color:'224,90,90'   },
  2: { label:'Moderate', color:'224,168,90'  },
  1: { label:'Minor',    color:'168,184,120' },
};
var SOUL_SEVERITY_ORDER = [3,2,1];

function loadSoulSections(){
  var d={posOpen:true,negOpen:true,negGroup:'none'};
  try{var s=JSON.parse(localStorage.getItem('presence_soul_sections'));if(s)return Object.assign(d,s);}catch(e){}
  return d;
}
function saveSoulSections(s){localStorage.setItem('presence_soul_sections',JSON.stringify(s));}
var soulSections=loadSoulSections();
var soulExpandedNeg=null; // index of the negative trait whose editor is open
var soulAutoSugState=null; // current autosug object from loadSoulMirror(), refreshed on each render

function soulEmpty(msg){return '<div style="font-size:0.6875rem;color:var(--muted);font-style:italic;padding:8px 0;">'+msg+'</div>';}
function soulNoMatch(){return '<div style="font-size:0.6875rem;color:var(--muted);font-style:italic;padding:8px 0;">No matches for "'+escHtml(soulMirrorQuery.trim())+'".</div>';}

// A positive trait card — clean and simple (no element/severity).
function soulPosCard(t,i){
  var done=!!t.done;
  var inProg=!done&&soulAutoSugState&&soulAutoSugState.kind==='positive'&&soulAutoSugState.text===t.text;
  var bg,borderMain,borderLeft,extra='',textStyle='';
  if(inProg){
    bg='212,180,100'; borderMain='rgba(212,180,100,.22)'; borderLeft='rgba(212,180,100,.85)';
    extra='<div style="font-size:0.5rem;letter-spacing:.18em;text-transform:uppercase;color:rgb(212,180,100);margin-top:4px;">◉ In Progress</div>';
  } else if(done){
    bg='126,184,164'; borderMain='rgba(126,184,164,.2)'; borderLeft='rgba(126,184,164,.7)';
    extra='<div style="font-size:0.5rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-top:4px;">✓ Transformed</div>';
    textStyle='text-decoration:line-through;opacity:.7;';
  } else {
    bg='126,184,164'; borderMain='rgba(126,184,164,.18)'; borderLeft='rgba(126,184,164,.85)';
  }
  return '<div style="display:flex;align-items:center;gap:12px;padding:13px 14px;background:rgba('+bg+',.06);border:1px solid '+borderMain+';border-left:3px solid '+borderLeft+';border-radius:10px;margin-bottom:8px;">'
    +'<div style="flex:1;min-width:0;">'
      +'<div style="font-size:0.8125rem;color:var(--text);line-height:1.3;'+textStyle+'">'+escHtml(t.text)+'</div>'
      +extra
    +'</div>'
    +(done?'<button onclick="soulRestoreTrait(\'positive\','+i+')" aria-label="Mark as not complete" title="Mark as not complete" style="flex-shrink:0;background:none;border:none;color:rgba(126,184,164,.8);font-size:0.9375rem;cursor:pointer;padding:4px 6px;line-height:1;">&#8617;</button>':'')
    +'<button onclick="deletePositiveTrait('+i+')" aria-label="Remove trait" style="flex-shrink:0;background:none;border:none;color:rgba(255,255,255,.28);font-size:0.875rem;cursor:pointer;padding:4px 6px;line-height:1;">✕</button>'
    +'</div>';
}

// A negative trait card — shows element/severity badges, tap to open editor.
function soulNegCard(t,i){
  var done=!!t.done;
  var inProg=!done&&soulAutoSugState&&soulAutoSugState.kind==='negative'&&soulAutoSugState.text===t.text;
  var el=(t.element&&SOUL_ELEMENTS[t.element])?t.element:null;
  var border=inProg?'212,180,100':done?'126,184,164':el?SOUL_ELEMENTS[el].color:'196,120,140';
  var expanded=soulExpandedNeg===i;

  var badges='';
  if(el){var e=SOUL_ELEMENTS[el];badges+='<span class="soul-elem-pill" style="color:rgb('+e.color+');background:rgba('+e.color+',.13);border:1px solid rgba('+e.color+',.4);">'+e.label+'</span>';}
  if(t.severity&&SOUL_SEVERITY[t.severity]){var sv=SOUL_SEVERITY[t.severity];badges+='<span class="soul-sev-pill" style="color:rgb('+sv.color+');background:rgba('+sv.color+',.12);border-color:rgba('+sv.color+',.35);">'+sv.label+'</span>';}
  if(!el&&!t.severity)badges+='<span style="font-size:0.5rem;color:var(--muted);letter-spacing:.06em;">tap to classify</span>';

  var stateBadge=inProg?'<div style="font-size:0.5rem;letter-spacing:.18em;text-transform:uppercase;color:rgb(212,180,100);margin-top:4px;">◉ In Progress</div>'
    :done?'<div style="font-size:0.5rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-top:4px;">✓ Transformed</div>':'';
  var textStyle=done?'text-decoration:line-through;opacity:.7;':'';

  var head='<div style="display:flex;align-items:center;gap:12px;padding:13px 14px;">'
    +'<div onclick="soulToggleNegEditor('+i+')" style="flex:1;min-width:0;cursor:pointer;">'
      +'<div style="font-size:0.8125rem;color:var(--text);line-height:1.3;'+textStyle+'">'+escHtml(t.text)+'</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px;">'+badges+'</div>'
      +stateBadge
    +'</div>'
    +(done?'<button onclick="event.stopPropagation();soulRestoreTrait(\'negative\','+i+')" aria-label="Mark as not complete" title="Mark as not complete" style="flex-shrink:0;background:none;border:none;color:rgba(126,184,164,.8);font-size:0.9375rem;cursor:pointer;padding:4px 6px;line-height:1;">&#8617;</button>':'')
    +'<button onclick="deleteNegativeTrait('+i+')" aria-label="Remove trait" style="flex-shrink:0;background:none;border:none;color:rgba(255,255,255,.28);font-size:0.875rem;cursor:pointer;padding:4px 6px;line-height:1;">✕</button>'
    +'</div>';

  var editor='';
  if(expanded){
    var elemBtns=SOUL_ELEMENT_ORDER.map(function(k){
      var e=SOUL_ELEMENTS[k];var sel=t.element===k;
      return '<button class="soul-edit-chip" onclick="soulSetNegElement('+i+',\''+k+'\')" style="'+(sel?'color:rgb('+e.color+');background:rgba('+e.color+',.16);border-color:rgba('+e.color+',.5);':'')+'">'+e.label+'</button>';
    }).join('');
    var sevBtns=SOUL_SEVERITY_ORDER.map(function(s){
      var sv=SOUL_SEVERITY[s];var sel=t.severity===s;
      return '<button class="soul-edit-chip" onclick="soulSetNegSeverity('+i+','+s+')" style="'+(sel?'color:rgb('+sv.color+');background:rgba('+sv.color+',.16);border-color:rgba('+sv.color+',.5);':'')+'">'+sv.label+'</button>';
    }).join('');
    editor='<div style="padding:12px 14px 13px;border-top:1px solid rgba(255,255,255,.06);">'
      +'<div style="font-size:0.5rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:7px;">Element</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:13px;">'+elemBtns+'</div>'
      +'<div style="font-size:0.5rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:7px;">Severity</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;">'+sevBtns+'</div>'
      +'</div>';
  }

  var borderAlpha=inProg?'.22':done?'.2':'.18';
  var leftAlpha=inProg?'.85':done?'.7':'.85';
  return '<div style="background:rgba('+border+',.06);border:1px solid rgba('+border+','+borderAlpha+');border-left:3px solid rgba('+border+','+leftAlpha+');border-radius:10px;margin-bottom:8px;">'+head+editor+'</div>';
}

function soulGroupHead(label,count,color){
  return '<div class="soul-group-head"><span class="soul-group-head-label" style="color:rgb('+color+');">'+label+'</span><span class="soul-group-head-count">'+count+'</span><span class="soul-group-head-rule"></span></div>';
}
// Render negative cards grouped into ordered buckets, with an "Unassigned" tail.
function soulRenderNegBy(shown,groups,keyFn){
  var html='';
  groups.forEach(function(g){
    var items=shown.filter(function(o){return keyFn(o)===g.key;});
    if(!items.length)return;
    html+=soulGroupHead(g.label,items.length,g.color);
    html+=items.map(function(o){return soulNegCard(o.t,o.i);}).join('');
  });
  var un=shown.filter(function(o){return keyFn(o)==null;});
  if(un.length){
    html+=soulGroupHead('Unassigned',un.length,'150,150,160');
    html+=un.map(function(o){return soulNegCard(o.t,o.i);}).join('');
  }
  return html;
}
function soulRenderNegGrouped(shown,group){
  if(group==='element')return soulRenderNegBy(shown,
    SOUL_ELEMENT_ORDER.map(function(k){return {key:k,label:SOUL_ELEMENTS[k].label,color:SOUL_ELEMENTS[k].color};}),
    function(o){return (o.t.element&&SOUL_ELEMENTS[o.t.element])?o.t.element:null;});
  if(group==='severity')return soulRenderNegBy(shown,
    SOUL_SEVERITY_ORDER.map(function(s){return {key:s,label:SOUL_SEVERITY[s].label,color:SOUL_SEVERITY[s].color};}),
    function(o){return (o.t.severity&&SOUL_SEVERITY[o.t.severity])?o.t.severity:null;});
  return shown.map(function(o){return soulNegCard(o.t,o.i);}).join('');
}

function soulSyncGroupButtons(){
  document.querySelectorAll('.soul-group-btn').forEach(function(b){
    b.classList.toggle('sel',b.dataset.group===soulSections.negGroup);
  });
}
function soulApplyCollapse(){
  var ps=document.getElementById('positiveSection');
  var ns=document.getElementById('negativeSection');
  var pc=document.getElementById('positiveChevron');
  var nc=document.getElementById('negativeChevron');
  if(ps)ps.style.display=soulSections.posOpen?'':'none';
  if(ns)ns.style.display=soulSections.negOpen?'':'none';
  if(pc)pc.style.transform=soulSections.posOpen?'':'rotate(-90deg)';
  if(nc)nc.style.transform=soulSections.negOpen?'':'rotate(-90deg)';
}

function renderSoulMirrorTraits(){
  var data=loadSoulMirror();
  soulAutoSugState=data.autosug||null;
  var q=soulMirrorQuery.trim().toLowerCase();
  var matches=function(t){return !q || (t.text||'').toLowerCase().indexOf(q)!==-1;};

  // "Finished with the Mirror" milestone — flashing invite once the inventory
  // is deep enough, then a quiet confirmation banner after the user accepts.
  var finishWrap=document.getElementById('soulMirrorFinishWrap');
  if(finishWrap){
    if(data.mirrorFinished){
      finishWrap.innerHTML='<div class="soul-finished-banner"><span style="font-size:0.8125rem;flex-shrink:0;">≋</span><span>Mirror complete · Omnia now guides you to Pore Breathing. Edit the Mirror anytime.</span></div>';
    } else if(soulMirrorThresholdMet(data)){
      finishWrap.innerHTML='<button onclick="soulMirrorFinish()" class="soul-finish-btn">✦ Finished with Mirror</button>';
    } else {
      finishWrap.innerHTML='';
    }
  }

  // Positive list — never grouped.
  var posEl=document.getElementById('positiveTraitsList');
  var posCount=document.getElementById('positiveCount');
  if(posCount)posCount.textContent=data.positive.length;
  if(posEl){
    var posShown=data.positive.map(function(t,i){return {t:t,i:i};}).filter(function(o){return matches(o.t);});
    if(!data.positive.length)posEl.innerHTML=soulEmpty('No positive traits added yet.');
    else if(!posShown.length)posEl.innerHTML=soulNoMatch();
    else posEl.innerHTML=posShown.map(function(o){return soulPosCard(o.t,o.i);}).join('');
  }

  // Negative list — optionally grouped by element or severity. Original
  // indices are preserved so edit/delete still target the right entry.
  var negEl=document.getElementById('negativeTraitsList');
  var negCount=document.getElementById('negativeCount');
  if(negCount)negCount.textContent=data.negative.length;
  if(negEl){
    var negShown=data.negative.map(function(t,i){return {t:t,i:i};}).filter(function(o){return matches(o.t);});
    if(!data.negative.length)negEl.innerHTML=soulEmpty('No negative traits added yet.');
    else if(!negShown.length)negEl.innerHTML=soulNoMatch();
    else negEl.innerHTML=soulRenderNegGrouped(negShown,soulSections.negGroup);
  }

  var notesEl=document.getElementById('soulMirrorNotes');
  if(notesEl) notesEl.value=data.notes||'';
  soulSyncGroupButtons();
  soulApplyCollapse();
}

// Editor / classification setters for negative traits.
function soulToggleNegEditor(i){ soulExpandedNeg=(soulExpandedNeg===i)?null:i; renderSoulMirrorTraits(); }
function soulSetNegElement(i,el){
  var data=loadSoulMirror();var t=data.negative[i];if(!t)return;
  t.element=(t.element===el)?null:el; // tap again to clear
  saveSoulMirror(data);renderSoulMirrorTraits();
}
function soulSetNegSeverity(i,s){
  var data=loadSoulMirror();var t=data.negative[i];if(!t)return;
  t.severity=(t.severity===s)?null:s; // tap again to clear
  saveSoulMirror(data);renderSoulMirrorTraits();
}

function deletePositiveTrait(i){
  showConfirm('Remove trait','This positive trait will be permanently removed.',function(){
    var data=loadSoulMirror();
    var removed=data.positive.splice(i,1)[0];
    if(data.autosug&&removed&&data.autosug.kind==='positive'&&data.autosug.text===removed.text)delete data.autosug;
    saveSoulMirror(data);renderSoulMirrorTraits();renderAutosug();
  });
}
function deleteNegativeTrait(i){
  showConfirm('Remove trait','This negative trait will be permanently removed.',function(){
    var data=loadSoulMirror();
    var removed=data.negative.splice(i,1)[0];
    if(data.autosug&&removed&&data.autosug.kind==='negative'&&data.autosug.text===removed.text)delete data.autosug;
    soulExpandedNeg=null; // indices shifted — close any open editor
    if(removed&&typeof achState!=='undefined'){achState.counters=achState.counters||{};achState.counters.traitsGone=(achState.counters.traitsGone||0)+1;achSave();if(typeof achEvaluate==='function')achEvaluate();}
    saveSoulMirror(data);renderSoulMirrorTraits();renderAutosug();
  });
}

// Collapse toggles (sections are open by default; state persists).
document.getElementById('positiveToggle').addEventListener('click',function(){
  soulSections.posOpen=!soulSections.posOpen;saveSoulSections(soulSections);soulApplyCollapse();
});
document.getElementById('negativeToggle').addEventListener('click',function(){
  soulSections.negOpen=!soulSections.negOpen;saveSoulSections(soulSections);soulApplyCollapse();
});
// Group-by control for negative traits.
document.querySelectorAll('.soul-group-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    soulSections.negGroup=btn.dataset.group;saveSoulSections(soulSections);renderSoulMirrorTraits();
  });
});

// Trait add/cancel wiring
document.getElementById('addPositiveBtn').addEventListener('click',function(){
  if(!soulSections.posOpen){soulSections.posOpen=true;saveSoulSections(soulSections);soulApplyCollapse();}
  document.getElementById('positiveAddForm').style.display='block';
  document.getElementById('positiveTraitInput').focus();
});
document.getElementById('positiveTraitCancel').addEventListener('click',function(){
  document.getElementById('positiveAddForm').style.display='none';
  document.getElementById('positiveTraitInput').value='';
});
document.getElementById('positiveTraitSave').addEventListener('click',function(){
  var val=document.getElementById('positiveTraitInput').value.trim();
  if(!val)return;
  var data=loadSoulMirror();data.positive.push({text:val,done:false});saveSoulMirror(data);
  document.getElementById('positiveTraitInput').value='';
  document.getElementById('positiveAddForm').style.display='none';
  renderSoulMirrorTraits();
});
document.getElementById('addNegativeBtn').addEventListener('click',function(){
  if(!soulSections.negOpen){soulSections.negOpen=true;saveSoulSections(soulSections);soulApplyCollapse();}
  document.getElementById('negativeAddForm').style.display='block';
  document.getElementById('negativeTraitInput').focus();
});
document.getElementById('negativeTraitCancel').addEventListener('click',function(){
  document.getElementById('negativeAddForm').style.display='none';
  document.getElementById('negativeTraitInput').value='';
});
document.getElementById('negativeTraitSave').addEventListener('click',function(){
  var val=document.getElementById('negativeTraitInput').value.trim();
  if(!val)return;
  var data=loadSoulMirror();data.negative.push({text:val,done:false});saveSoulMirror(data);
  document.getElementById('negativeTraitInput').value='';
  document.getElementById('negativeAddForm').style.display='none';
  renderSoulMirrorTraits();
});
// Search filters both trait lists live as you type.
(function(){
  var search=document.getElementById('soulMirrorSearch');
  var clear=document.getElementById('soulMirrorSearchClear');
  if(search){
    search.addEventListener('input',function(){
      soulMirrorQuery=search.value;
      if(clear)clear.style.display=search.value?'block':'none';
      renderSoulMirrorTraits();
    });
  }
  if(clear){
    clear.addEventListener('click',function(){
      soulMirrorQuery='';
      if(search)search.value='';
      clear.style.display='none';
      renderSoulMirrorTraits();
      if(search)search.focus();
    });
  }
})();
document.getElementById('positiveTraitInput').addEventListener('keydown',function(e){if(e.key==='Enter')document.getElementById('positiveTraitSave').click();});
document.getElementById('negativeTraitInput').addEventListener('keydown',function(e){if(e.key==='Enter')document.getElementById('negativeTraitSave').click();});
document.getElementById('soulMirrorSaveNotes').addEventListener('click',function(){
  var data=loadSoulMirror();
  data.notes=document.getElementById('soulMirrorNotes').value.trim();
  saveSoulMirror(data);showToast('Notes saved');
});

// Tab switching. The Mirror tab is a dropdown holding two modes: the classic
// trait mirror and the Autosuggestion practice.
var soulMirrorMode='mirror'; // 'mirror' | 'autosug'

function soulMirrorShowPanel(tab){
  var isMirror=tab==='mirror';
  var screenEl=document.getElementById('soulMirrorScreen');
  if(screenEl) screenEl.classList.toggle('soul-tab-breathing', tab==='breathing');
  document.getElementById('soulMirrorPanel').style.display=(isMirror&&soulMirrorMode==='mirror')?'block':'none';
  document.getElementById('soulAutosugPanel').style.display=(isMirror&&soulMirrorMode==='autosug')?'block':'none';
  document.getElementById('soulBreathingPanel').style.display=tab==='breathing'?'flex':'none';
  var label=document.getElementById('soulMirrorTabLabel');
  if(label)label.textContent=soulMirrorMode==='autosug'?'Autosuggestion':'Mirror';
  if(isMirror&&soulMirrorMode==='autosug'){renderAutosug();autosugAcquireWakeLock();}
  else if(isMirror&&soulMirrorMode==='mirror'){renderSoulMirrorTraits();autosugReleaseWakeLock();}
  else autosugReleaseWakeLock();
}

function soulDdSetOpen(open) {
  var dd = document.getElementById('soulMirrorDropdown');
  if (dd) dd.style.display = open ? 'block' : 'none';
  // iOS -webkit-overflow-scrolling:touch steals touch events regardless of
  // z-index. Disable pointer events on the scrollable panels while the
  // dropdown is open so the Autosuggestion button is actually tappable.
  var pe = open ? 'none' : '';
  ['soulMirrorPanel','soulAutosugPanel','soulBreathingPanel'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.pointerEvents = pe;
  });
}

document.getElementById('soulMirrorTabs').addEventListener('click',function(e){
  var dd=document.getElementById('soulMirrorDropdown');
  var opt=e.target.closest('.soul-mode-opt');
  if(opt){
    soulMirrorMode=opt.dataset.mode;
    soulDdSetOpen(false);
    soulMirrorShowPanel('mirror');
    return;
  }
  var btn=e.target.closest('.soul-tab');if(!btn)return;
  var tab=btn.dataset.tab;
  document.querySelectorAll('.soul-tab').forEach(function(t){t.style.borderBottomColor='transparent';t.style.color='var(--muted)';});
  btn.style.borderBottomColor='#a47eb8';btn.style.color='#c4a8d4';
  if(tab==='mirror'){
    // toggle the mode dropdown; the current mode's panel shows underneath
    soulDdSetOpen(dd.style.display==='none');
    soulMirrorShowPanel('mirror');
    return;
  }
  soulDdSetOpen(false);
  soulMirrorShowPanel(tab);
});

// Close dropdown (and restore pointer events) when tapping outside it
document.addEventListener('touchstart', function(e) {
  var dd = document.getElementById('soulMirrorDropdown');
  if (!dd || dd.style.display === 'none') return;
  var tabs = document.getElementById('soulMirrorTabs');
  if (tabs && !tabs.contains(e.target)) soulDdSetOpen(false);
}, { passive: true });

document.getElementById('soulMirrorBack').addEventListener('click',function(){
  stopPoreBreath();
  autosugReleaseWakeLock();
  var dd=document.getElementById('soulMirrorDropdown');
  if(dd)dd.style.display='none';
  showScreen('homeScreen');
  if (typeof returnAfterExercise === 'function') returnAfterExercise(_smOriginMode);
  else switchMode('concentration');
});

// ══════════════════════════════════════════════════════
// AUTOSUGGESTION (Soul Mirror · second mode)
// Pick one trait from the mirror, then tap once for every
// silent repetition of the formula — forty in a sitting.
// ══════════════════════════════════════════════════════

// Tap count is a Settings → Soul Mirror → Autosuggestion option, range 7-40.
var AUTOSUG_TAPS_DEFAULT=40;
var AUTOSUG_TAPS_MIN=7;
var AUTOSUG_TAPS_MAX=40;
function getAutosugTapsSetting(){
  var raw=Number(typeof concState!=='undefined'&&concState&&concState.autosugTaps);
  if(!Number.isFinite(raw))return AUTOSUG_TAPS_DEFAULT;
  return Math.max(AUTOSUG_TAPS_MIN,Math.min(AUTOSUG_TAPS_MAX,Math.round(raw)));
}
var AUTOSUG_TAPS=getAutosugTapsSetting();
function setAutosugTaps(n){
  AUTOSUG_TAPS=Math.max(AUTOSUG_TAPS_MIN,Math.min(AUTOSUG_TAPS_MAX,Math.round(Number(n)||AUTOSUG_TAPS_DEFAULT)));
  concState.autosugTaps=AUTOSUG_TAPS;
  saveConcState();
  syncAutosugTapsUI();
}
function adjustAutosugTaps(delta){
  setAutosugTaps(AUTOSUG_TAPS+delta);
}
function syncAutosugTapsUI(){
  var val=document.getElementById('autosugTapsVal');
  if(val)val.textContent=AUTOSUG_TAPS;
}
function _wireAutosugTapsStepper(){
  var minus=document.getElementById('autosugTapsMinus');
  var plus=document.getElementById('autosugTapsPlus');
  if(minus)minus.addEventListener('click',function(){adjustAutosugTaps(-1);});
  if(plus)plus.addEventListener('click',function(){adjustAutosugTaps(1);});
  syncAutosugTapsUI();
}
_wireAutosugTapsStepper();
var AUTOSUG_XP=30;
var autosugCount=0;
var autosugStartTime=null;
// Keep the phone awake during the practice (Screen Wake Lock API — works in
// installed/HTTPS contexts; harmlessly does nothing where unsupported).
// Uses the shared holder from asana-client.js (loaded earlier) because this
// one is asked for repeatedly — soulMirrorShowPanel() re-acquires on every
// switch into Autosuggestion and the visibilitychange handler below asks
// again on every return — and the old inline version leaked a lock on each
// repeat call, leaving the screen permanently awake.
var _autosugWakeLockHolder = (typeof makeWakeLockHolder === 'function')
  ? makeWakeLockHolder()
  : { acquire: function(){}, release: function(){} };
function autosugAcquireWakeLock(){ _autosugWakeLockHolder.acquire(); }
function autosugReleaseWakeLock(){ _autosugWakeLockHolder.release(); }
document.addEventListener('visibilitychange',function(){
  // The browser drops wake locks when the tab is hidden — re-acquire if the
  // user comes back mid-practice.
  if(document.visibilityState!=='visible')return;
  var screenEl=document.getElementById('soulMirrorScreen');
  var panel=document.getElementById('soulAutosugPanel');
  if(screenEl&&screenEl.classList.contains('active')&&panel&&panel.style.display!=='none')autosugAcquireWakeLock();
});

function autosugSelection(data){
  var a=data.autosug;
  if(!a||!a.text)return null;
  var list=a.kind==='positive'?data.positive:data.negative;
  var t=list.find(function(x){return x.text===a.text;});
  return (t&&!t.done)?a:null;
}

function autosugDayCount(startKey){
  var p=(startKey||'').split('-');
  if(p.length!==3)return 1;
  var s=new Date(+p[0],+p[1]-1,+p[2]);
  var n=new Date();n.setHours(0,0,0,0);
  return Math.max(1,Math.round((n-s)/86400000)+1);
}

function autosugPick(kind,i){
  var data=loadSoulMirror();
  var t=(kind==='positive'?data.positive:data.negative)[i];
  if(!t||t.done)return;
  data.autosug={kind:kind,text:t.text,start:guideLocalDayKey()};
  saveSoulMirror(data);
  autosugCount=0;autosugStartTime=null;
  renderAutosug();
}

function autosugChangeTrait(){
  function _doChange(){
    var data=loadSoulMirror();
    delete data.autosug;
    saveSoulMirror(data);
    autosugCount=0;autosugStartTime=null;
    renderAutosug();
  }
  if(autosugCount>0&&autosugCount<AUTOSUG_TAPS){
    showConfirm('Change trait?','You have not completed your current trait. It is heavily advised you work through it before switching. Proceed anyway?',_doChange);
  }else{
    _doChange();
  }
}

function autosugMarkComplete(){
  showConfirm('Trait transformed?','This trait will be marked complete and darkened in your Soul Mirror. If you tap it by mistake, you can restore it anytime with the ↩ button on the trait.',function(){
    var data=loadSoulMirror();
    var a=data.autosug;
    if(a){
      var list=a.kind==='positive'?data.positive:data.negative;
      var t=list.find(function(x){return x.text===a.text;});
      if(t)t.done=true;
      delete data.autosug;
    }
    saveSoulMirror(data);
    autosugCount=0;autosugStartTime=null;
    renderSoulMirrorTraits();
    renderAutosug();
    showToast('Trait transformed');
  });
}

// Undo an accidental (or premature) completion: clears the trait's done flag so
// it returns to the active list and can be worked on again.
function soulRestoreTrait(kind,i){
  var data=loadSoulMirror();
  var list=kind==='positive'?data.positive:data.negative;
  var t=list&&list[i];
  if(t&&t.done){
    t.done=false;
    saveSoulMirror(data);
    renderSoulMirrorTraits();
    renderAutosug();
    showToast('Trait restored');
  }
}

// A clear, unmissable completion sound: three rising bell strikes.
function playAutosugComplete(){
  try{
    var Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    var ctx=new Ctx();
    var t0=ctx.currentTime+0.05;
    [0,0.25,0.5].forEach(function(off,k){
      [660,990,1485].forEach(function(f,i){
        var o=ctx.createOscillator();o.type='sine';
        o.frequency.value=f*(1+k*0.06);
        var g=ctx.createGain();
        g.gain.setValueAtTime(0.55/(i+1),t0+off);
        g.gain.exponentialRampToValueAtTime(0.001,t0+off+2.4);
        o.connect(g);g.connect(ctx.destination);
        o.start(t0+off);o.stop(t0+off+2.5);
      });
    });
    setTimeout(function(){try{ctx.close();}catch(e){}},3600);
  }catch(e){}
}

function autosugTap(){
  if(autosugCount>=AUTOSUG_TAPS)return;
  if(autosugCount===0)autosugStartTime=Date.now();
  autosugCount++;
  var num=document.getElementById('autosugCountNum');
  if(num)num.textContent=autosugCount;
  var bar=document.getElementById('autosugBar');
  if(bar)bar.style.width=(autosugCount/AUTOSUG_TAPS*100)+'%';
  if(navigator.vibrate){try{navigator.vibrate(8);}catch(e){}}
  var pad=document.getElementById('autosugPad');
  if(pad){
    pad.style.borderColor='rgba(216,184,236,.85)';
    setTimeout(function(){if(pad)pad.style.borderColor='rgba(196,168,212,.4)';},120);
  }
  if(autosugCount>=AUTOSUG_TAPS)autosugFinish();
}

function autosugFinish(){
  playAutosugComplete();
  if(navigator.vibrate){try{navigator.vibrate([70,50,70]);}catch(e){}}
  // A little XP only — deliberately no akasha for this practice.
  var xpEarned=AUTOSUG_XP;
  concState.xp+=xpEarned;
  if(isConcNewSession())concState.totalSessions++;
  var didLevelUp=awardLevelUps(concState, concSumXpToLevel, concXpForLevel);
  var secs=autosugStartTime?Math.floor((Date.now()-autosugStartTime)/1000):0;
  var autosuggestionHistoryEntry={
    date:new Date().toISOString(),
    exercise:'autosuggestion',
    taps:AUTOSUG_TAPS,
    seconds:secs,
    xpEarned:xpEarned
  };
  concState.history.unshift(autosuggestionHistoryEntry);
  recordPracticeReviewEntry('concentration',autosuggestionHistoryEntry);
  if(concState.history.length>100)concState.history.length=100;
  saveConcState();
  // Tally this session against the active trait so the Soul Mirror star can
  // track per-trait progress (benchmark: a negative trait practiced 4+ times).
  try{
    var _sm=loadSoulMirror();
    if(_sm.autosug){
      var _list=_sm.autosug.kind==='positive'?_sm.positive:_sm.negative;
      var _t=_list.find(function(x){return x.text===_sm.autosug.text;});
      if(_t){_t.sessions=(_t.sessions||0)+1;saveSoulMirror(_sm);}
    }
  }catch(e){}
  if(syncEnabled&&authToken)syncPushData();
  showToast('Autosuggestion complete · +'+xpEarned+' XP');
  if(didLevelUp)setTimeout(function(){showConcLevelUp(concState.level);},800);
  renderConcHome();
  renderAutosug();
}

function autosugBeginAgain(){
  autosugCount=0;autosugStartTime=null;
  renderAutosug();
}

function renderAutosug(){
  var body=document.getElementById('autosugBody');
  if(!body)return;
  var data=loadSoulMirror();
  var sel=autosugSelection(data);

  if(!sel){
    var negAvail=data.negative.map(function(t,i){return{t:t,i:i};}).filter(function(x){return !x.t.done;});
    var posAvail=data.positive.map(function(t,i){return{t:t,i:i};}).filter(function(x){return !x.t.done;});
    var html='<div style="font-size:0.875rem; color:var(--muted); line-height:1.8; margin-bottom:24px; font-family:Cormorant Garamond,serif; font-style:italic;">'
      +'Choose one trait from your mirror to transform. Each sitting, tap once for every silent repetition of your formula — forty taps, spoken with full conviction.'
      +'</div>';
    if(!negAvail.length&&!posAvail.length){
      html+='<div style="font-size:0.6875rem;color:var(--muted);font-style:italic;padding:8px 0;">Your mirror is empty. Add traits in the Mirror mode first.</div>';
    }else{
      if(negAvail.length){
        html+='<div style="font-size:0.5625rem; letter-spacing:.25em; text-transform:uppercase; color:#c4788c; margin-bottom:12px;">Negative Traits</div>';
        html+=negAvail.map(function(x){
          return '<button onclick="autosugPick(\'negative\','+x.i+')" style="display:block;width:100%;text-align:left;padding:12px 14px;background:rgba(196,120,140,.05);border:1px solid rgba(196,120,140,.18);border-radius:8px;margin-bottom:6px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:0.6875rem;cursor:pointer;">'+escHtml(x.t.text)+'</button>';
        }).join('');
      }
      if(posAvail.length){
        html+='<div style="font-size:0.5625rem; letter-spacing:.25em; text-transform:uppercase; color:var(--accent); margin:20px 0 12px;">Positive Traits</div>';
        html+=posAvail.map(function(x){
          return '<button onclick="autosugPick(\'positive\','+x.i+')" style="display:block;width:100%;text-align:left;padding:12px 14px;background:rgba(126,184,164,.05);border:1px solid rgba(126,184,164,.18);border-radius:8px;margin-bottom:6px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:0.6875rem;cursor:pointer;">'+escHtml(x.t.text)+'</button>';
        }).join('');
      }
    }
    body.innerHTML=html;
    return;
  }

  var day=autosugDayCount(sel.start);
  var done=autosugCount>=AUTOSUG_TAPS;
  var pct=autosugCount/AUTOSUG_TAPS*100;
  body.innerHTML=
    '<div style="border:1px solid rgba(196,168,212,.38); border-left:3px solid #c4a8d4; border-radius:12px; padding:16px 18px; margin-bottom:18px; background:linear-gradient(135deg, rgba(164,126,184,.18) 0%, rgba(120,90,160,.07) 100%); box-shadow:0 4px 20px rgba(120,80,160,.12);">'
      +'<div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">'
        +'<div style="min-width:0;">'
          +'<div style="font-size:0.5625rem; letter-spacing:.25em; text-transform:uppercase; color:#c8a8e0; margin-bottom:6px;">Working On</div>'
          +'<div style="font-family:Cormorant Garamond,serif; font-size:1.375rem; font-weight:300; color:#f2eaf8; overflow-wrap:break-word;">'+escHtml(sel.text)+'</div>'
        +'</div>'
        +'<div style="text-align:right; flex-shrink:0;">'
          +'<div style="font-family:Cormorant Garamond,serif; font-size:2.125rem; color:#d8c2ec; line-height:1; text-shadow:0 0 16px rgba(196,168,212,.55);">Day '+day+'</div>'
          +'<div style="font-size:0.5625rem; color:#9a86b0; letter-spacing:.1em; margin-top:4px;">since '+escHtml(sel.start)+'</div>'
        +'</div>'
      +'</div>'
    +'</div>'
    +'<div id="autosugPad" onclick="autosugTap()" style="border:1px solid rgba(196,168,212,.4); border-radius:16px; min-height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; -webkit-tap-highlight-color:transparent; user-select:none; -webkit-user-select:none; background:radial-gradient(circle at 50% 36%, rgba(176,134,204,.22) 0%, rgba(120,86,158,.08) 55%, rgba(120,86,158,.02) 100%); box-shadow:inset 0 0 70px rgba(164,126,184,.12), 0 4px 24px rgba(110,74,150,.14); transition:border-color .12s, box-shadow .12s;">'
      +(done
        ?'<div style="font-family:Cormorant Garamond,serif; font-size:2.5rem; font-weight:300; color:#e6d4f6; line-height:1; text-shadow:0 0 22px rgba(196,168,212,.7);">Complete</div>'
         +'<div style="font-size:0.625rem; color:#7eb8a4; letter-spacing:.18em; text-transform:uppercase; margin-top:12px;">&#10003; +'+AUTOSUG_XP+' XP</div>'
        :'<div style="font-family:Cormorant Garamond,serif; font-size:4.5rem; font-weight:300; line-height:1;"><span id="autosugCountNum" style="color:#f4ecfa; text-shadow:0 0 24px rgba(196,168,212,.4);">'+autosugCount+'</span><span style="font-size:1.625rem; color:#b89ccc;"> / '+AUTOSUG_TAPS+'</span></div>'
         +'<div style="font-size:0.5625rem; color:#bfa4d8; letter-spacing:.2em; text-transform:uppercase; margin-top:14px;">Tap with each repetition</div>')
    +'</div>'
    +'<div style="height:6px; border-radius:3px; background:rgba(164,126,184,.15); margin-top:14px; overflow:hidden;">'
      +'<div id="autosugBar" style="height:100%; width:'+pct+'%; background:linear-gradient(90deg, #8e6aae, #d8b8ec); border-radius:3px; box-shadow:0 0 12px rgba(196,168,212,.55); transition:width .15s;"></div>'
    +'</div>'
    +'<div style="display:flex; gap:8px; margin-top:18px;">'
      +(done
        ?'<button onclick="autosugBeginAgain()" class="btn primary" style="flex:1; font-size:0.5625rem; background:linear-gradient(135deg, rgba(164,126,184,.28), rgba(196,168,212,.14)); border-color:rgba(196,168,212,.5); color:#e6d4f6;">Begin Again</button>'
        :'<button onclick="autosugChangeTrait()" class="btn ghost" style="flex:1; font-size:0.5625rem; color:#bfa4d8; border-color:rgba(196,168,212,.28);">Change Trait</button>')
      +'<button onclick="autosugMarkComplete()" class="btn ghost" style="flex:1; font-size:0.5625rem; color:#d4b8ec; border-color:rgba(196,168,212,.45); background:rgba(164,126,184,.08);">Trait Complete</button>'
    +'</div>';
}
