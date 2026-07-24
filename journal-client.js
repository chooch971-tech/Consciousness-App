// ══════════════════════════════════════════════════════
// JOURNAL LOG SYSTEM
// ══════════════════════════════════════════════════════

var journalEditKey = null; // date key currently open in the editor

function loadJournal(){
  try{var s=localStorage.getItem('presence_journal_v1');return s?JSON.parse(s):{};}
  catch(e){return{};}
}
function saveJournal(j){localStorage.setItem('presence_journal_v1',JSON.stringify(j));}

function getJournalKey(date){
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
}

var JOURNAL_EMPTY_ICON='<svg width="58" height="94" viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg"><polygon points="40,3 54,14 40,25 26,14" fill="#9fd0ec" opacity=".55"/><polygon points="40,25 60,36 64,58 40,70 16,58 20,36" fill="#7fb8d8" opacity=".5"/><polygon points="40,70 64,58 56,88 40,100 24,88 16,58" fill="#6aa6c8" opacity=".42"/><polygon points="40,100 56,88 40,114" fill="#5e9ac0" opacity=".4"/><polygon points="40,100 24,88 40,114" fill="#5290b8" opacity=".32"/></svg>';

var JOURNAL_CONC_ICONS={clock:'⊙',visualization:'◉',auditory:'◈',thought:'◌',asana:'✦',pore_breathing:'❂',soulmirror:'◆',autosuggestion:'✱',sense:'✺'};

function dateFromKey(k){var p=k.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}

function journalDayLabel(dateKey){
  return dateFromKey(dateKey).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
}

function journalSectionLabel(dateKey){
  var todayKey=getJournalKey(new Date());
  var y=new Date();y.setDate(y.getDate()-1);
  if(dateKey===todayKey)return 'Today';
  if(dateKey===getJournalKey(y))return 'Yesterday';
  return dateFromKey(dateKey).toLocaleDateString('en-US',{month:'long',year:'numeric'});
}

// All day-keys (YYYY-MM-DD) that have a logged session or a written entry, sorted newest-first.
function journalAllDayKeys(){
  var set={};
  (state.history||[]).forEach(function(h){if(h.date)set[getJournalKey(new Date(h.date))]=1;});
  (concState.history||[]).forEach(function(h){if(h.date)set[getJournalKey(new Date(h.date))]=1;});
  var journal=loadJournal();
  Object.keys(journal).forEach(function(k){
    if(/^\d{4}-\d{2}-\d{2}$/.test(k)){
      var e=journal[k];
      if(e&&((e.title&&e.title.trim())||(e.note&&e.note.trim())))set[k]=1;
    }
  });
  return Object.keys(set).sort(function(a,b){return a<b?1:a>b?-1:0;});
}

function getSessionsForDay(dateKey){
  var arr=[];
  (state.history||[]).forEach(function(h){if(h.date&&getJournalKey(new Date(h.date))===dateKey)arr.push({type:'aw',data:h});});
  (concState.history||[]).forEach(function(h){if(h.date&&getJournalKey(new Date(h.date))===dateKey)arr.push({type:'conc',data:h});});
  arr.sort(function(a,b){return new Date(a.data.date)-new Date(b.data.date);});
  return arr;
}

function journalSessionInfo(s){
  var h=s.data;
  if(s.type==='aw'){
    var name=h.mode==='vacancy'?'Vacancy of Mind':h.mode==='thought'?'Thought Observation':'Awareness';
    return {type:'aw',icon:'◎',name:name,val:fmtDuration(h.durationMin||0),sub:(h.score?parseFloat(h.score).toFixed(1)+'/5':''),pb:false};
  }
  var key=h.exercise==='asana'?'asana':h.exercise==='pore_breathing'?'pore_breathing':h.exercise==='autosuggestion'?'autosuggestion':(h.type||'clock');
  var senseModeName=key==='sense'&&typeof SENSE_MODE_DEFS!=='undefined'&&SENSE_MODE_DEFS[h.mode]?SENSE_MODE_DEFS[h.mode].label:'Feeling';
  var name2=key==='asana'?'Asana':key==='pore_breathing'?'Pore Breathing':key==='autosuggestion'?'Autosuggestion':key==='visualization'?'Visualization':key==='auditory'?'Auditory':key==='thought'?'Thought Control':key==='sense'?('Senses · '+senseModeName):'Clock';
  var val2=key==='autosuggestion'?((h.taps||40)+' taps'):(key==='asana'||key==='pore_breathing')?fmtAsanaTime(h.seconds||0):fmtTimer(h.seconds||0);
  var isBest=h.seconds&&concState.bestSeconds&&h.seconds>=concState.bestSeconds;
  var sub2=key==='sense'?((h.eyesMode==='open'?'Open eyes':'Closed eyes')+(h.cue?' · '+h.cue:'')):'';
  return {type:'conc',icon:(JOURNAL_CONC_ICONS[key]||'⊙'),name:name2,val:val2,sub:sub2,pb:isBest};
}

function journalSessionSummary(sessions){
  if(!sessions.length)return '';
  var aw=sessions.filter(function(s){return s.type==='aw';}).length;
  var conc=sessions.length-aw;
  var parts=[];
  if(aw)parts.push(aw+' awareness');
  if(conc)parts.push(conc+' concentration');
  return parts.join(' · ')+(sessions.length===1?' session logged':' sessions logged');
}

function journalCardTitle(entry){
  if(entry.title&&entry.title.trim())return entry.title.trim();
  if(entry.note&&entry.note.trim()){
    var first=entry.note.trim().split('\n')[0];
    return first.length>60?first.slice(0,60)+'…':first;
  }
  return 'Practice Log';
}

function journalCardPreview(entry,sessions){
  var hasTitle=entry.title&&entry.title.trim();
  var hasNote=entry.note&&entry.note.trim();
  if(hasTitle&&hasNote)return entry.note.trim();
  if(!hasTitle&&hasNote){
    var rest=entry.note.trim().split('\n').slice(1).join(' ').trim();
    return rest||journalSessionSummary(sessions);
  }
  return journalSessionSummary(sessions);
}

function journalChipsHTML(sessions){
  if(!sessions.length)return '';
  var seen={},chips=[];
  sessions.forEach(function(s){
    var info=journalSessionInfo(s);
    if(seen[info.name])return;seen[info.name]=1;
    chips.push('<span class="jl-card__chip'+(info.type==='conc'?' jl-card__chip--conc':'')+'">'+escHtml(info.name)+'</span>');
  });
  var shown=chips.slice(0,3);
  if(chips.length>3)shown.push('<span class="jl-card__chip">+'+(chips.length-3)+'</span>');
  return '<div class="jl-card__chips">'+shown.join('')+'</div>';
}

function journalCardStatsHTML(dateKey,sessions,prCount){
  if(!sessions.length)return '';
  var st=journalDayStats(dateKey);
  var bits=[];
  if(st.totalMin>0)bits.push('<span class="jl-card__stat"><b>'+fmtDuration(st.totalMin)+'</b> practiced</span>');
  bits.push('<span class="jl-card__stat"><b>'+st.count+'</b> session'+(st.count!==1?'s':'')+'</span>');
  var html='<div class="jl-card__stats">'+bits.join('<span class="jl-card__dot">·</span>');
  if(prCount>0)html+='<span class="jl-card__pr">★ '+prCount+' record'+(prCount!==1?'s':'')+'</span>';
  html+='</div>';
  return html;
}

function journalLogHTML(dateKey){
  var sessions=getSessionsForDay(dateKey);
  if(!sessions.length)return '';
  var html='<div class="jl-log"><div class="jl-log__label">Logged · '+sessions.length+'</div>';
  sessions.forEach(function(s){
    var info=journalSessionInfo(s);
    var time=new Date(s.data.date).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    var meta=time+(info.sub?' · '+info.sub:'');
    html+='<div class="jl-log__item">'
      +'<div class="jl-log__icon jl-log__icon--'+info.type+'">'+info.icon+'</div>'
      +'<div class="jl-log__info"><div class="jl-log__name">'+escHtml(info.name)+'</div><div class="jl-log__meta">'+meta+'</div></div>'
      +'<div class="jl-log__val">'+info.val+(info.pb?'<span class="jl-log__pb">PB</span>':'')+'</div>'
      +'</div>';
  });
  html+='</div>';
  return html;
}

// ── Progress ──
function awLevelFromXp(xp){var l=1;while(l<777&&xp>=sumXpToLevel(l+1))l++;return l;}
function concLevelFromXp(xp){var l=1;while(l<777&&xp>=concSumXpToLevel(l+1))l++;return l;}

function journalDayStats(dateKey){
  var sessions=getSessionsForDay(dateKey);
  var awMin=0,concSec=0,xp=0;
  sessions.forEach(function(s){
    var h=s.data;
    xp+=(h.xpEarned||0);
    if(s.type==='aw')awMin+=(h.durationMin||0);
    if(s.type==='conc')concSec+=(h.seconds||0);
  });
  var totalMin=awMin+Math.round(concSec/60);
  return {count:sessions.length,totalMin:totalMin,xp:xp,hasAw:sessions.some(function(s){return s.type==='aw';}),hasConc:sessions.some(function(s){return s.type==='conc';})};
}

// Cumulative level/XP at the end of the given day, anchored to current state so the latest day matches exactly.
function journalSnapshot(dateKey){
  var end=dateFromKey(dateKey);end.setHours(23,59,59,999);
  var awAfter=0,concAfter=0;
  (state.history||[]).forEach(function(h){if(h.date&&new Date(h.date)>end)awAfter+=(h.xpEarned||0);});
  (concState.history||[]).forEach(function(h){if(h.date&&new Date(h.date)>end)concAfter+=(h.xpEarned||0);});
  var awXp=Math.max(0,(state.xp||0)-awAfter);
  var concXp=Math.max(0,(concState.xp||0)-concAfter);
  return {awLevel:awLevelFromXp(awXp),concLevel:concLevelFromXp(concXp)};
}

// Map of dateKey -> [PR label strings]. Walks history chronologically, keeping only
// the day's best new record per metric so a single day shows at most one of each.
function journalComputePRs(){
  var prs={};
  function setBest(store,k,v){if(!store[k]||v>store[k])store[k]=v;}
  var awDur={},awScore={},concBest={};
  var aw=(state.history||[]).filter(function(h){return h.date;}).slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  var maxDur=0,maxScore=0;
  aw.forEach(function(h){
    var k=getJournalKey(new Date(h.date)),dur=h.durationMin||0,sc=parseFloat(h.score||0);
    if(dur>maxDur&&maxDur>0)setBest(awDur,k,dur);
    if(dur>maxDur)maxDur=dur;
    if(sc>maxScore&&maxScore>0)setBest(awScore,k,sc);
    if(sc>maxScore)maxScore=sc;
  });
  var conc=(concState.history||[]).filter(function(h){return h.date&&h.seconds;}).slice().sort(function(a,b){return new Date(a.date)-new Date(b.date);});
  var maxSec=0;
  conc.forEach(function(h){
    var k=getJournalKey(new Date(h.date)),s=h.seconds||0;
    if(s>maxSec&&maxSec>0)setBest(concBest,k,s);
    if(s>maxSec)maxSec=s;
  });
  function emit(store,label,fmt){Object.keys(store).forEach(function(k){(prs[k]=prs[k]||[]).push(label+' — '+fmt(store[k]));});}
  emit(awDur,'Longest awareness session',fmtDuration);
  emit(awScore,'Best focus score',function(v){return v.toFixed(1)+'/5';});
  emit(concBest,'New concentration record',fmtTimer);
  return prs;
}

function journalProgressHTML(dateKey){
  var st=journalDayStats(dateKey);
  if(!st.count)return '';
  var snap=journalSnapshot(dateKey);
  var prs=(journalComputePRs()[dateKey])||[];
  var html='<div class="jl-prog"><div class="jl-prog__label">Progress</div>';
  // day totals
  html+='<div class="jl-prog__tiles">'
    +'<div class="jl-prog__tile"><div class="jl-prog__val">'+(st.totalMin>0?fmtDuration(st.totalMin):'—')+'</div><div class="jl-prog__key">Practiced</div></div>'
    +'<div class="jl-prog__tile"><div class="jl-prog__val">'+st.count+'</div><div class="jl-prog__key">Sessions</div></div>'
    +'<div class="jl-prog__tile"><div class="jl-prog__val">+'+st.xp+'</div><div class="jl-prog__key">XP earned</div></div>'
    +'</div>';
  // cumulative snapshot
  html+='<div class="jl-prog__snap">';
  if(st.hasAw){
    html+='<div class="jl-prog__snap-item"><div class="jl-prog__snap-glyph jl-prog__snap-glyph--aw">◎</div>'
      +'<div><div class="jl-prog__snap-lvl">Level '+snap.awLevel+'</div><div class="jl-prog__snap-sub">Awareness · '+getRankTitle(snap.awLevel)+'</div></div></div>';
  }
  if(st.hasConc){
    html+='<div class="jl-prog__snap-item"><div class="jl-prog__snap-glyph jl-prog__snap-glyph--conc">⊙</div>'
      +'<div><div class="jl-prog__snap-lvl">Level '+snap.concLevel+'</div><div class="jl-prog__snap-sub">Concentration · '+getConcRank(snap.concLevel)+'</div></div></div>';
  }
  html+='</div>';
  // PR highlights
  prs.forEach(function(t){
    html+='<div class="jl-pr"><div class="jl-pr__icon">★</div><div class="jl-pr__text">'+escHtml(t)+'</div></div>';
  });
  html+='</div>';
  return html;
}

// ── List view ──
function renderJournal(){
  var container=document.getElementById('journalContent');
  if(!container)return;
  var keys=journalAllDayKeys();
  if(!keys.length){
    container.innerHTML='<div class="jl-empty-state">'
      +'<div class="jl-empty-state__icon">'+JOURNAL_EMPTY_ICON+'</div>'
      +'<div class="jl-empty-state__title">No Entries</div>'
      +'<div class="jl-empty-state__sub">Practice an exercise or tap the + button to begin your journal.</div>'
      +'</div>';
    return;
  }
  var journal=loadJournal();
  var writtenKeys=keys.filter(function(k){var e=journal[k]||{};return !!(e.title&&e.title.trim())||!!(e.note&&e.note.trim());});
  if(!writtenKeys.length){
    container.innerHTML='<div class="jl-empty-state">'
      +'<div class="jl-empty-state__icon">'+JOURNAL_EMPTY_ICON+'</div>'
      +'<div class="jl-empty-state__title">No Entries</div>'
      +'<div class="jl-empty-state__sub">Tap the + button to begin your journal.</div>'
      +'</div>';
    return;
  }
  var prMap=journalComputePRs();
  var html='<div class="jl-list">';
  var lastSection=null;
  writtenKeys.forEach(function(k){
    var section=journalSectionLabel(k);
    if(section!==lastSection){html+='<div class="jl-section-head">'+section+'</div>';lastSection=section;}
    var entry=journal[k]||{};
    var sessions=getSessionsForDay(k);
    var preview=journalCardPreview(entry,sessions);
    var hasNote=entry.note&&entry.note.trim();
    html+='<div class="jl-card" onclick="openJournalEntry(\''+k+'\')">'
      +'<div class="jl-card__body">'
      +'<div class="jl-card__title">'+escHtml(journalCardTitle(entry))+'</div>'
      +(preview?'<div class="jl-card__preview'+(hasNote?'':' jl-card__preview--empty')+'">'+escHtml(preview)+'</div>':'')
      +journalChipsHTML(sessions)
      +journalCardStatsHTML(k,sessions,(prMap[k]||[]).length)
      +'</div>'
      +'<div class="jl-card__foot">'
      +'<span class="jl-card__date">'+journalDayLabel(k)+'</span>'
      +'<button class="jl-card__menu" onclick="event.stopPropagation();journalDeleteEntry(\''+k+'\')" aria-label="Delete entry">&#8943;</button>'
      +'</div>'
      +'</div>';
  });
  html+='</div>';
  container.innerHTML=html;
}

// ── Editor ──
function journalAutoGrow(){
  var ta=document.getElementById('journalBodyInput');
  if(!ta)return;
  ta.style.height='auto';
  ta.style.height=Math.max(260,ta.scrollHeight)+'px';
}

function openJournalEntry(dateKey){
  journalEditKey=dateKey;
  var journal=loadJournal();
  var entry=journal[dateKey]||{};
  document.getElementById('journalEntryDate').textContent=journalDayLabel(dateKey);
  document.getElementById('journalTitleInput').value=entry.title||'';
  document.getElementById('journalBodyInput').value=entry.note||'';
  var hasWritten=!!(entry.title&&entry.title.trim())||!!(entry.note&&entry.note.trim());
  document.getElementById('journalEntryDelete').style.display=hasWritten?'flex':'none';
  document.getElementById('journalEntryLog').innerHTML=hasWritten?journalProgressHTML(dateKey)+journalLogHTML(dateKey):'';
  showScreen('journalEntryScreen');
  journalAutoGrow();
}

function closeJournalEntry(){
  journalEditKey=null;
  renderJournal();
  showScreen('journalScreen');
}

function _persistJournalEntry(){
  if(!journalEditKey)return;
  var title=document.getElementById('journalTitleInput').value.trim();
  var note=document.getElementById('journalBodyInput').value.trim();
  var journal=loadJournal();
  if(!title&&!note){
    if(journal[journalEditKey]){
      delete journal[journalEditKey].title;delete journal[journalEditKey].note;
      if(!Object.keys(journal[journalEditKey]).length)delete journal[journalEditKey];
      saveJournal(journal);
    }
  } else {
    if(!journal[journalEditKey])journal[journalEditKey]={};
    if(title)journal[journalEditKey].title=title;else delete journal[journalEditKey].title;
    if(note)journal[journalEditKey].note=note;else delete journal[journalEditKey].note;
    saveJournal(journal);
  }
}
function saveJournalEntry(){
  _persistJournalEntry();
  closeJournalEntry();
  showToast('Saved');
}

function _journalRemoveWritten(dateKey){
  var journal=loadJournal();
  if(journal[dateKey]){
    delete journal[dateKey].title;delete journal[dateKey].note;
    if(!Object.keys(journal[dateKey]).length)delete journal[dateKey];
    saveJournal(journal);
  }
}

function deleteJournalEntry(){
  if(!journalEditKey)return;
  var k=journalEditKey;
  showConfirm('Delete Entry','Your written note will be removed. Logged sessions stay in your history.',function(){
    _journalRemoveWritten(k);
    closeJournalEntry();
    showToast('Entry deleted');
  });
}

function journalDeleteEntry(dateKey){
  showConfirm('Delete Entry','Your written note will be removed. Logged sessions stay in your history.',function(){
    _journalRemoveWritten(dateKey);
    renderJournal();
    showToast('Entry deleted');
  });
}

document.getElementById('journalBack').addEventListener('click',function(){
  renderHomeForNavigation();showScreen('homeScreen');
});
document.getElementById('journalFab').addEventListener('click',function(){
  openJournalEntry(getJournalKey(new Date()));
});
document.getElementById('journalEntryBack').addEventListener('click',function(){_persistJournalEntry();closeJournalEntry();});
document.getElementById('journalEntrySave').addEventListener('click',saveJournalEntry);
document.getElementById('journalEntryDelete').addEventListener('click',deleteJournalEntry);
document.getElementById('journalBodyInput').addEventListener('input',journalAutoGrow);
