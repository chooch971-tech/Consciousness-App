function renderOmniaEngine() {
  omniaResolveUpgradeBuilds();
  omniaAccrue();
  applyOmniaMetaMarks();
  applyOmniaCosmetics();
  applyOmniaStepVisuals();
  var stage = omniaStage();
  var step = omniaCurrentStep();
  var canAdvance = omniaStepReady(step);
  var cap = omniaReservoirCap();
  var reservoir = Math.min(cap, omniaState.reservoir || 0);
  // A pending (unacknowledged) body award gets the full acknowledgment
  // screen — it stays pending until the player dismisses it.
  if (omniaState.lastBodyAward) maybeShowBodyLevelAward();

  var stageName = document.getElementById('omniaStageName');
  var stageSub = document.getElementById('omniaStageSub');
  var wallet = document.getElementById('omniaAkashaWallet');
  var resText = document.getElementById('omniaReservoirText');
  var resFill = document.getElementById('omniaReservoirFill');
  var rateText = document.getElementById('omniaRateText');
  var stripStep = document.getElementById('omniaStripStep');
  if (stageName) stageName.textContent = stage.name;
  if (stageSub) stageSub.textContent = stage.sub;
  var akashaAmt = Math.floor(omniaState.akasha || 0);
  if (wallet) wallet.textContent = akashaAmt;
  var walletCorner = document.getElementById('omniaAkashaWalletCorner');
  if (walletCorner) walletCorner.textContent = akashaAmt.toLocaleString();
  var walletCornerParent = walletCorner && walletCorner.parentElement;
  if (walletCornerParent) {
    walletCornerParent.title = akashaAmt.toLocaleString() + ' akasha';
    walletCornerParent.classList.remove('oe-akasha-corner--capped');
    walletCornerParent.onclick = function() {
      if (typeof openExExplainer === 'function') openExExplainer('akasha');
    };
  }
  if (stripStep) stripStep.textContent = 'Step ' + step.roman;
  var bardonTrack = document.getElementById('omniaBardonTrack');
  if (bardonTrack) {
    var currentStep = omniaState.bardonStep || 1;
    var dotsHtml = '';
    for (var i = 1; i <= 10; i++) {
      var dotCls = 'oe-bardon-dot' + (i < currentStep ? ' done' : (i === currentStep ? ' active' : ''));
      dotsHtml += '<div class="' + dotCls + '" title="Step ' + i + '"></div>';
    }
    bardonTrack.innerHTML = dotsHtml;
  }
  // Aura opacity scales with body level; high baseline so the bubble glow is
  // consistently visible. Path and Upgrade tabs share the same formula so
  // their Omnia bubbles always look identical.
  var auraFor = function(lvl) { return Math.min(0.98, 0.85 + (lvl || 0) * 0.015); };
  var pLvl = omniaState.bodies.physical, aLvl = omniaState.bodies.astral, mLvl = omniaState.bodies.mental;
  // Upgrade tab
  var aP = document.getElementById('omniaAuraPhysical');
  var aA = document.getElementById('omniaAuraAstral');
  var aM = document.getElementById('omniaAuraMental');
  if (aP) aP.style.opacity = auraFor(pLvl);
  if (aA) aA.style.opacity = auraFor(aLvl);
  if (aM) aM.style.opacity = auraFor(mLvl);
  // Path tab — mirror exactly so both bubbles match
  var gP = document.getElementById('guidePathAuraPhysical');
  var gA = document.getElementById('guidePathAuraAstral');
  var gM = document.getElementById('guidePathAuraMental');
  if (gP) gP.style.opacity = auraFor(pLvl);
  if (gA) gA.style.opacity = auraFor(aLvl);
  if (gM) gM.style.opacity = auraFor(mLvl);
  if (resText) resText.textContent = Math.floor(reservoir) + ' / ' + cap;
  if (resFill) resFill.style.width = Math.min(100, reservoir / cap * 100) + '%';
  // Akasha Well: fluid level rises inside the orb (wave surface sits at y≈12
  // in the fluid group's coords; orb spans y 14–136, so empty=125, full=1).
  var wellFluid = document.getElementById('omniaWellFluid');
  if (wellFluid) {
    var fillFrac = cap > 0 ? Math.min(1, reservoir / cap) : 0;
    wellFluid.style.transform = 'translateY(' + (125 - fillFrac * 124).toFixed(1) + 'px)';
  }
  var wellAmt = document.getElementById('omniaWellAmt');
  if (wellAmt) wellAmt.textContent = Math.floor(reservoir);
  var wellEl = document.getElementById('omniaWell');
  var wellFull = reservoir >= cap - 0.5;
  if (wellEl) wellEl.classList.toggle('full', wellFull);
  var wellSub = document.getElementById('omniaWellSub');
  if (wellSub) wellSub.textContent = reservoir >= 1 ? (wellFull ? 'full · tap to collect' : 'tap to collect') : 'filling…';
  var stepNum2 = omniaState.bardonStep || 1;
  var rateBadge = document.getElementById('omniaGenRateNum');
  if (rateBadge) rateBadge.textContent = omniaRatePerHour();
  var genTitleEl = document.getElementById('omniaGenTitle');
  if (genTitleEl) genTitleEl.textContent = 'Akasha Generator' + (omniaGenUnlockedCount() >= 2 ? 's' : '');
  var genBoostEl = document.getElementById('omniaGenBoost');
  if (genBoostEl) {
    var genBoostMult = getActiveAkashaBoost();
    var genBoostPct = Math.round((genBoostMult - 1) * 100);
    if (genBoostPct > 0) {
      genBoostEl.style.display = 'inline-flex';
      var genBoostPctEl = document.getElementById('omniaGenBoostPct');
      if (genBoostPctEl) genBoostPctEl.textContent = genBoostPct;
      var genBoostTimeEl = document.getElementById('omniaGenBoostTime');
      if (genBoostTimeEl) genBoostTimeEl.textContent = fmtDuration(getAkashaBoostRemainingMin()) + ' left';
    } else {
      genBoostEl.style.display = 'none';
    }
  }
  // Compact generator indicator: one glowing diamond per active generator
  // (base + Step V + Step IX, all three in Book II) — shows how many are
  // running without a wordy label. Offline note appears while the Current builds.
  renderOmniaGenYard();

  var _inBookII = typeof darkMatterUnlocked === 'function' && darkMatterUnlocked();
  renderOmniaApotheosisProgress(_inBookII);
  var stepLabelEl = document.querySelector('#omniaEngine .oe-stage-step-label');
  var stepName = document.getElementById('omniaStepName');
  var stepText = document.getElementById('omniaStepText');
  if (_inBookII) {
    // Book II (Magical Evocation) takes the place of Book I: the "Now
    // Building" block narrates the forge, then the spheres.
    var _b2ToolIdx = bookIICurrentToolIdx();
    var _b2ToolsDone = _b2ToolIdx >= BOOK2_TOOLS.length;
    var _b2SphereN = bookIISphereCount();
    var _b2Label, _b2Name, _b2Text;
    if (!_b2ToolsDone) {
      var _b2Tool = BOOK2_TOOLS[_b2ToolIdx];
      _b2Label = 'Now Forging'; _b2Name = _b2Tool.name; _b2Text = _b2Tool.d;
    } else if (_b2SphereN < BOOK2_SPHERES.length) {
      var _b2Sp = BOOK2_SPHERES[_b2SphereN];
      _b2Label = 'Now Approaching'; _b2Name = _b2Sp.name; _b2Text = _b2Sp.d;
    } else {
      _b2Label = 'Evocation Complete'; _b2Name = 'Pluto Attained';
      _b2Text = 'Seal the spheres to begin the next Evocation — the bonus deepens.';
    }
    if (stepLabelEl && stepLabelEl.childNodes.length) stepLabelEl.childNodes[0].nodeValue = _b2Label;
    if (stepName) stepName.textContent = _b2Name;
    if (stepText) stepText.textContent = _b2Text;
  } else {
    if (stepLabelEl && stepLabelEl.childNodes.length) stepLabelEl.childNodes[0].nodeValue = 'Now Building';
    if (stepName) stepName.textContent = step.name;
    if (stepText) stepText.textContent = step.text;
  }

  // Inline session progress + advance button
  var sessionProgress = document.getElementById('omniaSessionProgress');
  var advanceBtn = document.getElementById('omniaAdvanceBtn');
  if (_inBookII) {
    // Session slot: instrument count while forging, then the ten drawn
    // spheres. Main button: forge the next phase, then sphere travel.
    var _tIdx = bookIICurrentToolIdx();
    var _tDone = _tIdx >= BOOK2_TOOLS.length;
    var _spN = bookIISphereCount();
    var _spAll = _spN >= BOOK2_SPHERES.length;
    if (sessionProgress) {
      sessionProgress.innerHTML = _tDone
        ? bookIISphereOrbRow() + 'Spheres: <strong>' + _spN + ' / ' + BOOK2_SPHERES.length + '</strong> traversed'
        : 'Instruments: <strong>' + _tIdx + ' / ' + BOOK2_TOOLS.length + '</strong> consecrated';
    }
    if (advanceBtn) {
      var _cta = null, _ctaOff = true;
      if (!_tDone) {
        var _ct = BOOK2_TOOLS[_tIdx], _cst = bookIIToolState(_ct.id);
        var _gate = (_cst.readyAt || 0) - Date.now();
        if (_gate > 0) { _cta = _ct.name + ' rests · ' + fmtToolGate(_gate); }
        else {
          var _cc = toolPhaseCost(_tIdx, _cst.p);
          _cta = TOOL_PHASES[_cst.p] + ' the ' + _ct.name + ' · ' + _cc.a.toLocaleString() + ' + ' + _cc.d + ' ◆';
          _ctaOff = (omniaState.akasha || 0) < _cc.a || (omniaState.darkMatter || 0) < _cc.d;
        }
      } else if (!_spAll) {
        var _sp2 = BOOK2_SPHERES[_spN], _rq = sphereReq(_spN), _sc = sphereCost(_spN), _bd = bookIIBodies();
        var _gate2 = ((omniaState.bookII || {}).sphereReadyAt || 0) - Date.now();
        if (_gate2 > 0) { _cta = 'The way rests · ' + fmtToolGate(_gate2); }
        else {
          var _met = (_bd.astral||1) >= _rq.astral && (_bd.mental||1) >= _rq.mental && (_bd.wisdom||1) >= _rq.wisdom;
          _cta = 'Travel to ' + _sp2.name + ' · ' + _sc.a.toLocaleString() + ' + ' + _sc.d + ' ◆';
          _ctaOff = !_met || (omniaState.akasha || 0) < _sc.a || (omniaState.darkMatter || 0) < _sc.d;
        }
      }
      var canPrestigeB2 = omniaCanPrestige();
      advanceBtn.style.display = _cta ? '' : 'none';
      if (_cta) { advanceBtn.textContent = _cta; advanceBtn.disabled = _ctaOff; }
      var prestigeBtnB2 = document.getElementById('omniaPrestigeBtn');
      if (prestigeBtnB2) {
        prestigeBtnB2.style.display = (canPrestigeB2 || _tDone) ? '' : 'none';
        prestigeBtnB2.classList.toggle('locked', !canPrestigeB2);
        var _note = prestigeBtnB2.querySelector('.pb-note');
        if (_note) _note.textContent = canPrestigeB2
          ? 'Seal the spheres · +25% akasha, forever'
          : 'Reach Pluto to begin the next Evocation';
      }
    }
  } else {
  var sessNeeded = omniaStepReqVal(step, 'recommended');
  var sessCompleted = Math.min(omniaState.completedRecommended || 0, sessNeeded);
  if (sessionProgress) {
    sessionProgress.innerHTML = '<span>Meditation sessions: <strong>' + sessCompleted + ' / ' + sessNeeded + '</strong> for Step ' + step.roman + '</span>'
      + '<button type="button" class="oe-session-info" onclick="openExExplainer(\'meditation\')" aria-label="What counts as a meditation session?">i</button>';
  }
  if (advanceBtn) {
    var next = OMNIA_BARDON_STEPS.find(function(s) { return s.step === (omniaState.bardonStep || 1) + 1; });
    var canPrestige = omniaCanPrestige();
    advanceBtn.disabled = !canAdvance || !next;
    advanceBtn.textContent = next ? ('Advance to Step ' + next.roman) : 'All Steps Complete';
    advanceBtn.style.display = (!next && canPrestige) ? 'none' : '';
    var prestigeBtn = document.getElementById('omniaPrestigeBtn');
    if (prestigeBtn) {
      // Only surface Prestige when it's actually on the horizon — the final
      // Bardon step of Book I. (Book II handles its own prestige surface.)
      prestigeBtn.style.display = (canPrestige || !next) ? '' : 'none';
      prestigeBtn.classList.toggle('locked', !canPrestige);
      var _noteB1 = prestigeBtn.querySelector('.pb-note');
      if (_noteB1) _noteB1.textContent = 'Unlock Dark Matter at Prestige 3';
    }
  }
  }
  var pipsEl = document.getElementById('omniaPrestigePips');
  if (pipsEl) {
    var pc = omniaState.prestige || 0;
    pipsEl.innerHTML = pc > 0
      ? ' · <span class="oe-prestige-pips-mark" title="' + pc + ' evocation' + (pc === 1 ? '' : 's') + ' completed · +' + Math.round((omniaPrestigeMult() - 1) * 100) + '% akasha">' + (pc <= 5 ? Array(pc + 1).join('✦') : '✦×' + pc) + '</span>'
      : '';
  }
  var turnEl = document.getElementById('omniaTurnings');
  if (turnEl) {
    var _turnHtml = renderOmniaTurnings();
    turnEl.innerHTML = _turnHtml;
    turnEl.style.display = _turnHtml ? '' : 'none';
  }

  var collectBtn = document.getElementById('omniaCollectBtn');
  if (collectBtn) {
    collectBtn.disabled = reservoir < 1;
    collectBtn.textContent = reservoir >= 1 ? 'Collect ' + Math.floor(reservoir) + ' Akasha' : 'Reservoir Empty';
  }

  var bodyGrid = document.getElementById('omniaBodyGrid');
  if (bodyGrid && _inBookII) {
    // Book II: the refined bodies (Astral/Mental/Wisdom) take the trio's place.
    bodyGrid.innerHTML = renderBookIIBodyCards();
  } else if (bodyGrid) {
    bodyGrid.innerHTML = Object.keys(OMNIA_BODY_META).map(function(body) {
      var meta = OMNIA_BODY_META[body];
      var lvl = omniaState.bodies[body] || 0;
      var cost = omniaBodyCost(body);
      var need = omniaStepReqVal(step, body);
      var pct = need > 0 ? Math.min(100, (lvl / need) * 100) : Math.min(100, (lvl % 25) * 4);
      var met = lvl >= need;
      var shortName = meta.name.replace(' Body','');
      return '<div class="oe-body" data-body-card="' + body + '" style="--body-color:' + meta.color + ';">'
        + '<div class="oe-body-name">' + shortName + '</div>'
        + '<div class="oe-body-lvl-row"><span class="oe-body-lvl" data-body-lvl="' + body + '">' + lvl + '</span><span class="oe-body-lvl-key">lvl</span></div>'
        + '<div class="oe-body-need ' + (met ? 'need-met' : '') + '">' + (need > 0 ? ('<span class="' + (met ? 'need-met' : '') + '">' + Math.min(lvl, need) + ' / ' + need + '</span> · step&nbsp;' + step.roman) : 'no step req') + '</div>'
        + '<div class="oe-body-bar"><div class="oe-body-bar-fill" style="width:' + pct + '%;"></div></div>'
        + (met
            ? '<button class="oe-body-btn capped" disabled>At Goal</button>'
            : '<button class="oe-body-btn" data-omnia-body="' + body + '"' + ((omniaState.akasha || 0) < cost ? ' disabled' : '') + '>Build <span class="oe-body-cost">' + cost + '</span></button>')
        + '</div>';
    }).join('');
  }


  var upGrid = document.getElementById('omniaUpgradeGrid');
  if (upGrid) {
    // Generators (current/gen2/gen3) live in the tappable pumps + sheet
    // above; this shared list is Deep Vessel / Attunement / Quickening only.
    upGrid.innerHTML = OMNIA_UPGRADES.filter(function(upg) {
      return upg.id !== 'current' && upg.id !== 'gen2' && upg.id !== 'gen3';
    }).map(function(upg) {
      var lvl = omniaState.upgrades[upg.id] || 1;
      var cost = omniaUpgradeCost(upg);
      var stepMax = omniaUpgradeStepMax(upg.id);
      var capped = isFinite(stepMax);
      var atMax = capped && lvl >= stepMax;
      var masteryRank = omniaUpgradeMasteryRank(upg.id, lvl);
      var displayLvl = omniaUpgradeDisplayLevel(upg.id, lvl);
      var buildingUntil = omniaUpgradeBuilding(upg.id);
      var sub = upg.sub;
      var btnHtml;
      if (buildingUntil) {
        btnHtml = '<button class="omnia-mini-btn omnia-mini-btn--building" disabled>◷ <span data-build-countdown="' + upg.id + '">' + omniaBuildLabel(buildingUntil) + '</span></button>';
      } else if (omniaUpgradeAtBandTop(upg.id) && lvl < OMNIA_UPGRADE_FINAL_LEVEL) {
        btnHtml = '<button class="omnia-mini-btn omnia-mini-btn--ready" disabled>✓ Ready</button>';
      } else if (atMax) {
        btnHtml = '<button class="omnia-mini-btn" disabled style="opacity:.45;cursor:default;">' + (lvl >= OMNIA_UPGRADE_FINAL_LEVEL ? 'Mastered' : 'Step max') + '</button>';
      } else {
        btnHtml = '<button class="omnia-mini-btn" data-omnia-upgrade="' + upg.id + '"' + ((omniaState.akasha || 0) < cost ? ' disabled' : '') + '>Upgrade ' + cost + '</button>';
      }
      var nameTail = buildingUntil
        ? ' <span style="font-size:8px;color:#8eccc0;letter-spacing:.1em;">→ ' + Math.min(20, displayLvl + 1) + ' · building</span>'
        : ' <span style="font-size:8px;color:var(--muted);letter-spacing:.1em;">/ 20</span>';
      return '<div class="omnia-upgrade-row">'
        + '<div><div class="omnia-upgrade-name">' + upg.name + ' ' + (masteryRank ? '<span class="omnia-mastery-mark">' + omniaMasteryPips(masteryRank) + '</span> ' : '') + displayLvl + nameTail + '</div><div class="omnia-upgrade-sub">' + sub + '</div></div>'
        + btnHtml
        + '</div>';
    }).join('');
  }

  var cosmeticGrid = document.getElementById('omniaCosmeticGrid');
  if (cosmeticGrid) cosmeticGrid.innerHTML = renderOmniaAppearance();

  // Story Mode: surface any newly-earned narrative beats. Runs on every engine
  // render — and the engine re-renders after step-ups, upgrades, body builds,
  // and cosmetic changes — so messages appear right when their trigger is met.
  evaluateOmniaStory();
}

function playAkashaPop() {
  if (typeof appSoundEnabled === 'function' && !appSoundEnabled()) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var t = ctx.currentTime + 0.01;
    // quick pitch-up "pop": rising blip with a fast decay
    var osc = ctx.createOscillator(); osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(1180, t + 0.09);
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.18);
    setTimeout(function() { try { ctx.close(); } catch(e) {} }, 400);
  } catch(e) {}
}

// Soft hollow "nothing to collect" thunk — a muted descending tap, deliberately
// duller than the bright collect pop, played when the pump reservoir is empty.
function playCollectEmpty() {
  if (typeof appSoundEnabled === 'function' && !appSoundEnabled()) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var t = ctx.currentTime + 0.01;
    var osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(230, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.12);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0006, t + 0.16);
    osc.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.18);
    setTimeout(function() { try { ctx.close(); } catch(e) {} }, 400);
  } catch(e) {}
}

// Light double hammer-tap on wood — plays when a pump upgrade is bought, so
// starting construction has a tactile "put to work" feel.
function playUpgradeHammer() {
  if (typeof appSoundEnabled === 'function' && !appSoundEnabled()) return;
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    function knock(t, vol) {
      // pitched thud (the wood body resonating)
      var osc = ctx.createOscillator(); osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.06);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0007, t + 0.09);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.11);
      // short filtered noise click (the hammer's contact)
      var dur = 0.045, buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      var src = ctx.createBufferSource(); src.buffer = buf;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.7;
      var ng = ctx.createGain(); ng.gain.value = vol * 0.5;
      src.connect(bp); bp.connect(ng); ng.connect(ctx.destination);
      src.start(t);
    }
    var t0 = ctx.currentTime + 0.01;
    knock(t0, 0.17);
    knock(t0 + 0.12, 0.12);
    setTimeout(function() { try { ctx.close(); } catch(e) {} }, 500);
  } catch(e) {}
}

function collectOmniaAkasha(anchorEl, gid) {
  omniaAccrue();
  var res = omniaState.reservoirs || (omniaState.reservoirs = {});
  var ids = gid ? [gid] : Object.keys(res);
  var amount = 0;
  ids.forEach(function(k) { amount += Math.floor(res[k] || 0); });
  if (amount < 1) return;
  var collected = amount;
  var remaining = collected;
  ids.forEach(function(k) {
    var take = Math.min(Math.floor(res[k] || 0), remaining);
    res[k] = (res[k] || 0) - take; remaining -= take;
    if (res[k] < 0.5) res[k] = 0;
  });
  omniaTransferAkasha(collected, 'generator-collection', { generatorId: gid || 'all' });
  saveOmniaState();
  renderOmniaEngine();

  // Keep the collection feedback tactile without repeating the collected
  // amount as a floating badge over the pump.
  if (collected > 0) {
    playAkashaPop();
    // renderOmniaEngine() rebuilds the generator yard above, so a tapped pump
    // can already be detached by the time the collection effect is positioned.
    // Resolve its freshly rendered counterpart instead of animating from 0,0.
    var anchor = (anchorEl && anchorEl instanceof Element && anchorEl.isConnected ? anchorEl : null);
    if (!anchor && gid) anchor = document.querySelector('[data-gen-tap="' + gid + '"]');
    anchor = anchor || document.getElementById('omniaGenYard') || document.getElementById('omniaWell') || document.getElementById('omniaCollectBtn');
    if (anchor) {
      var rect = anchor.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      // Keep the floating reward and sparks inside a viewport-sized clipping
      // layer. Transformed particles must never enlarge a mobile scroll canvas.
      var fxLayer = document.createElement('div');
      fxLayer.className = 'oe-collection-fx';
      fxLayer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(fxLayer);
      for (var si = 0; si < 9; si++) {
        var sp = document.createElement('div');
        sp.className = 'oe-well-spark';
        sp.style.left = cx + 'px';
        sp.style.top = cy + 'px';
        sp.style.setProperty('--dx', ((Math.random() * 2 - 1) * 90).toFixed(0) + 'px');
        sp.style.setProperty('--dy', (-(40 + Math.random() * 100)).toFixed(0) + 'px');
        sp.style.animationDelay = (Math.random() * 0.12).toFixed(2) + 's';
        fxLayer.appendChild(sp);
        (function(n) { setTimeout(function() { n.remove(); }, 1100); })(sp);
      }
      setTimeout(function() { fxLayer.remove(); }, 1150);
    }
    var card = document.querySelector('.oe-gen-card');
    if (card) {
      card.classList.remove('collect-flash');
      void card.offsetWidth; // force reflow so re-triggering the animation works
      card.classList.add('collect-flash');
      setTimeout(function() { card.classList.remove('collect-flash'); }, 750);
    }
  }

}

function renderOmniaApotheosisProgress(inBookII) {
  var el = document.getElementById('omniaApotheosis');
  if (!el) return;
  var stepNum = omniaState.bardonStep || 1;
  if (inBookII || stepNum < 7) { el.style.display = 'none'; return; }
  var finalStep = OMNIA_BARDON_STEPS[OMNIA_BARDON_STEPS.length - 1];
  var bodyKeys = ['physical', 'astral', 'mental'];
  var bodyCurrent = 0, bodyTarget = 0;
  bodyKeys.forEach(function(body) {
    var target = omniaStepReqVal(finalStep, body);
    bodyTarget += target;
    bodyCurrent += Math.min(omniaState.bodies[body] || 1, target);
  });
  var sessionTarget = omniaStepReqVal(finalStep, 'recommended');
  var sessionCurrent = Math.min(omniaState.completedRecommended || 0, sessionTarget);
  var bodyProgress = bodyTarget > 0 ? bodyCurrent / bodyTarget : 0;
  var sessionProgress = sessionTarget > 0 ? sessionCurrent / sessionTarget : 0;
  var pct = Math.min(100, Math.round((bodyProgress * 0.75 + sessionProgress * 0.25) * 100));
  el.style.display = '';
  el.classList.toggle('near', stepNum >= 9);
  el.classList.toggle('final', stepNum >= 10);
  var pctEl = document.getElementById('omniaApotheosisPct');
  var fill = document.getElementById('omniaApotheosisFill');
  var meta = document.getElementById('omniaApotheosisMeta');
  if (pctEl) pctEl.textContent = pct + '%';
  if (fill) fill.style.width = pct + '%';
  if (meta) meta.textContent = bodyCurrent.toLocaleString() + ' / ' + bodyTarget.toLocaleString()
    + ' body levels · ' + sessionCurrent.toLocaleString() + ' / ' + sessionTarget.toLocaleString() + ' guided sessions';
}

function omniaBodyCap(body) {
  var step = omniaCurrentStep();
  return omniaStepReqVal(step, body) || Infinity;
}
function omniaBodyAtCap(body) {
  return (omniaState.bodies[body] || 0) >= omniaBodyCap(body);
}
function buildOmniaBody(body) {
  if (omniaBodyAtCap(body)) return;
  var cost = omniaBodyCost(body);
  if ((omniaState.akasha || 0) < cost) return;
  omniaSpendAkasha(cost, 'body-upgrade', { body: body, level: omniaState.bodies[body] || 1 });
  omniaState.bodies[body] = (omniaState.bodies[body] || 0) + 1;
  saveOmniaState();
  fireOmniaBodyBurst(body);
  renderOmniaEngine();
  setTimeout(function() {
    var lvlEl = document.querySelector('[data-body-lvl="' + body + '"]');
    if (lvlEl) {
      lvlEl.classList.add('bump');
      setTimeout(function() { lvlEl.classList.remove('bump'); }, 360);
    }
  }, 0);
}

function fireOmniaBodyBurst(body) {
  var meta = OMNIA_BODY_META[body];
  if (!meta) return;
  var color = meta.color;
  var stage = document.getElementById('omniaCenterStage');
  var flash = document.getElementById('omniaCenterFlash');
  var card = document.querySelector('[data-body-card="' + body + '"]');
  if (card) {
    card.classList.add('pulsing');
    setTimeout(function() { card.classList.remove('pulsing'); }, 600);
  }
  if (flash) {
    flash.style.background = 'radial-gradient(circle, ' + color + '88 0%, ' + color + '22 35%, transparent 70%)';
    flash.classList.remove('firing');
    void flash.offsetWidth;
    flash.classList.add('firing');
  }
  if (stage) {
    // Spawn 14 particles flying outward
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('div');
      p.className = 'oe-particle';
      var angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      var dist = 80 + Math.random() * 50;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.background = color;
      p.style.boxShadow = '0 0 8px ' + color;
      p.style.animationDelay = (Math.random() * 0.08) + 's';
      stage.appendChild(p);
      void p.offsetWidth;
      p.classList.add('firing');
      (function(node) {
        setTimeout(function() { if (node.parentNode) node.parentNode.removeChild(node); }, 1100);
      })(p);
    }
  }
}

// True while a press-and-hold is actively repeating upgrades, so the trailing
// synthesized click doesn't apply one more on release.
var _omniaUpgradeHeld = false;

// ── Generator upgrade build timers ────────────────────────────────────────
// Buying an upgrade starts an idle-style construction timer rather than
// applying instantly; the level takes effect when the timer completes. Timers
// are wall-clock (persisted as a completion timestamp), so they keep running
// while the app is closed and resolve on return.
// The three generator cores share one collection but upgrade independently.
var OMNIA_GEN_META = [
  { id:'current', roman:'I',   vessel:'vessel',  attune:'attunement', quick:'quickening' },
  { id:'gen2',    roman:'II',  vessel:'vessel2', attune:'attune2',    quick:'quick2' },
  { id:'gen3',    roman:'III', vessel:'vessel3', attune:'attune3',    quick:'quick3' }
];
function _pumpOfUpgrade(id) {
  for (var i = 0; i < OMNIA_GEN_META.length; i++) {
    var m = OMNIA_GEN_META[i];
    if (id === m.id || id === m.vessel || id === m.attune || id === m.quick) return m;
  }
  return null;
}
function omniaPumpReservoirCap(idx) {
  var vLvl = (omniaState.upgrades && omniaState.upgrades[OMNIA_GEN_META[idx].vessel]) || 1;
  var masteryMult = 1 + 0.25 * omniaUpgradeMasteryRank(OMNIA_GEN_META[idx].vessel, vLvl);
  return Math.floor((180 + Math.pow(vLvl - 1, 2) * 30) * masteryMult);
}
// Pump rates are already independent and additive; retain this accessor name
// for the accrual and rendering paths that consume the per-pump map.
function omniaPumpShares() {
  return omniaPumpRatesPerHour();
}
// How much a pump's own hourly share would change if its Akashic Current
// were the next level up. Mutates upgrades[gid] for the single synchronous
// recompute, then restores it. The independent-rate calculation guarantees
// this preview cannot change either neighboring pump.
function omniaPreviewGenRateGain(gid) {
  var upgrades = omniaState.upgrades || (omniaState.upgrades = {});
  var before = omniaPumpShares()[gid] || 0;
  var origLvl = upgrades[gid] || 1;
  upgrades[gid] = origLvl + 1;
  var after = omniaPumpShares()[gid] || 0;
  upgrades[gid] = origLvl;
  return { before: before, after: after };
}
function omniaGenUnlockedCount() {
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) return 3;
  var s = omniaState.bardonStep || 1;
  return 1 + (s >= 5 ? 1 : 0) + (s >= 9 ? 1 : 0);
}
function omniaGenContribution(idx) {
  var gid = OMNIA_GEN_META[idx].id;
  var lvl = (omniaState.upgrades && omniaState.upgrades[gid]) || 1;
  var base = omniaGeneratorContributionCurve(lvl, idx);
  return base * ((typeof dmResonanceMult === 'function') ? dmResonanceMult(idx) : 1);
}
function omniaPumpProductionWhileBuilding(idx) {
  var meta = OMNIA_GEN_META[idx];
  if (!meta || !omniaPumpBuildingId(meta)) return 1;
  var qLvl = (omniaState.upgrades && omniaState.upgrades[meta.quick]) || 1;
  // Every Quickening mastery lets an upgrading pump retain another 10% of its
  // output. Before the first mastery, construction keeps the original fully
  // offline behavior.
  return 0.10 * omniaUpgradeMasteryRank(meta.quick, qLvl);
}

// The Quickening upgrade shortens construction, up to 60% faster at its cap.
// (Attunement no longer touches build time — it's cost-only again.)
function omniaBuildSpeedMult(upgId) {
  var pump = _pumpOfUpgrade(upgId);
  var q = (pump ? omniaState.upgrades[pump.quick] : (omniaState.upgrades && omniaState.upgrades.quickening)) || 1;
  return Math.max(0.4, 1 - (q - 1) * 0.06);
}

function omniaUpgradeMasteryBenefit(id, nextRank) {
  var pump = _pumpOfUpgrade(id);
  if (!pump) return 'A permanent generator mastery.';
  if (id === pump.id) return '+' + (nextRank * 15) + '% Akashic Current from this track in total.';
  if (id === pump.vessel) return '+' + (nextRank * 25) + '% reservoir capacity from mastery.';
  if (id === pump.attune) return 'Upgrade costs can now fall as low as ' + (50 + nextRank * 5) + '% off.';
  return 'The pump now retains ' + (nextRank * 10) + '% production while it builds.';
}
function omniaUpgradeMasteryName(id) {
  var pump = _pumpOfUpgrade(id);
  if (!pump) return 'Generator';
  if (id === pump.id) return 'Akashic Current';
  if (id === pump.vessel) return 'Deep Vessel';
  if (id === pump.attune) return 'Attunement';
  return 'Quickening';
}
// ── Tier Up ─────────────────────────────────────────────────────────────────
// One decision per generator, taken only once all four of its tracks stand at
// the top of the band. It was previously four separate per-track resets, which
// on three of them cost nothing at all — see the note in omnia-economy-client.
function omniaGenTierName(genId) {
  var pump = _pumpOfUpgrade(genId);
  return 'Generator ' + ((pump && pump.roman) || 'I');
}
function omniaGenTierBenefit(nextTier) {
  var mult = omniaMasteryScale(nextTier);
  return 'Akashic Current output and upgrade costs both scale to '
    + (mult % 1 === 0 ? mult : mult.toFixed(1)) + '× the base curve. '
    + 'Reservoir capacity, the cost discount, and construction speed you have already '
    + 'earned are all kept.';
}
function confirmOmniaGenTier(genId) {
  var pump = _pumpOfUpgrade(genId);
  if (!pump || !omniaGenTierReady(pump.id)) return false;
  if (omniaPumpBuildingId(pump)) return false;
  var nextTier = omniaGenTier(pump.id) + 1;
  var title = 'Tier ' + omniaGenTierName(pump.id) + ' to ' + omniaMasteryRoman(nextTier) + '?';
  var text = 'All four branches return to Level 1 and this generator enters Tier '
    + omniaMasteryRoman(nextTier) + '. Its output drops back to the start of the new '
    + 'band, which climbs far higher than the one before it.\n\n'
    + omniaGenTierBenefit(nextTier);
  showConfirm(title, text, function() { tierUpOmniaGenerator(pump.id); }, 'mastery');
  return true;
}
function tierUpOmniaGenerator(genId) {
  var pump = _pumpOfUpgrade(genId);
  if (!pump || !omniaGenTierReady(pump.id)) return false;
  if (omniaPumpBuildingId(pump)) return false;
  // Levels are monotonic for cloud max-merge, so the tier is what advances and
  // the displayed band falls out of it. Each track also steps one level as it
  // crosses, which is what puts the new band's Level 1 at raw tier*20 + 1 —
  // without it the old top level and the new first level would both render as
  // Level 1.
  if (!omniaState.genTiers || typeof omniaState.genTiers !== 'object') omniaState.genTiers = {};
  OMNIA_GENERATOR_TRACKS[pump.id].forEach(function(id) {
    omniaState.upgrades[id] = (omniaState.upgrades[id] || 1) + 1;
  });
  omniaState.genTiers[pump.id] = omniaGenTier(pump.id) + 1;
  saveOmniaState();
  renderOmniaEngine();
  if (_genSheetId && _pumpOfUpgrade(_genSheetId) === pump) renderGenSheet(_genSheetId);
  showToast('✦ ' + omniaGenTierName(pump.id) + ' — Tier ' + omniaMasteryRoman(omniaGenTier(pump.id)) + '', 3200, 'gold');
  playUpgradeHammer();
  return true;
}
function omniaBuildDurationMs(targetLevel, upgId) {
  // Weighty idle construction on a cubic curve, so deep upgrades are genuine
  // multi-hour commitments and Quickening — which shaves up to 60% off —
  // carries real weight. ≈11m at L2 → ~27m at L5 → ~2.4h at L10 → ~9h at
  // L16 → ~18h at L20, eased by Quickening.
  //
  // The curve is read from the level shown on the card, not the lifetime
  // level. A cubic on the lifetime level passed the 24h cap around level 21,
  // so every upgrade after the first mastery sat pinned at a full day however
  // early in its band it was — a track reading "Level 1" quoted 24 hours.
  // Each band now replays the same curve, matching its cost and production.
  var band = omniaUpgradeDisplayLevel(upgId, Math.max(1, targetLevel));
  var secs = Math.floor((600 + 8 * Math.pow(band, 3)) * omniaBuildSpeedMult(upgId));
  secs = Math.max(60, Math.min(secs, 24 * 3600));
  return secs * 1000;
}
function omniaUpgradeBuilding(id) {
  var b = omniaState.upgradeBuilds && omniaState.upgradeBuilds[id];
  return (typeof b === 'number' && b > Date.now()) ? b : 0;
}
// A pump can only build ONE upgrade at a time. Returns the id of whichever of
// its four tracks is currently under construction (0 if the pump is free).
// While building, the whole pump goes offline — it neither produces nor collects.
function omniaPumpBuildingId(meta) {
  if (!meta) return 0;
  var ids = [meta.id, meta.vessel, meta.attune, meta.quick];
  for (var i = 0; i < ids.length; i++) { if (omniaUpgradeBuilding(ids[i])) return ids[i]; }
  return 0;
}
// Apply any builds whose timer has elapsed. Returns the list of completed
// upgrade ids so callers can announce them.
function omniaResolveUpgradeBuilds() {
  if (!omniaState.upgradeBuilds) return [];
  var now = Date.now(), done = [];
  Object.keys(omniaState.upgradeBuilds).forEach(function(id) {
    var t = omniaState.upgradeBuilds[id];
    if (typeof t === 'number' && t <= now) {
      if (!omniaUpgradeAtMax(id)) omniaState.upgrades[id] = (omniaState.upgrades[id] || 1) + 1;
      delete omniaState.upgradeBuilds[id];
      done.push(id);
    }
  });
  if (done.length) saveOmniaState();
  return done;
}
function omniaBuildLabel(untilMs) {
  var s = Math.max(0, Math.ceil((untilMs - Date.now()) / 1000));
  if (s >= 3600) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  if (s >= 60) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  return s + 's';
}
// Compact "how long this upgrade takes to build" label from a raw duration.
function omniaBuildSpanLabel(ms) {
  var s = Math.max(0, Math.round(ms / 1000));
  if (s >= 3600) { var h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h + 'h' + (m ? ' ' + m + 'm' : ''); }
  if (s >= 60) return Math.round(s / 60) + 'm';
  return s + 's';
}

// ── Dark Matter pumps (Book II) ────────────────────────────────────────────
// Idle ◆ condensers that come online at Prestige 3 / 5 / 8. Deliberately
// slower than practice: even with the expanded Dark Current, the curve tapers
// after level 10 so sitting with the work remains primary. Rates are per DAY,
// not per hour — ◆ is scarce. Four tracks share the same one-build-per-pump
// construction slot. Levels live in omniaState.upgrades and reservoirs in
// omniaState.reservoirs, so generic monotonic sync merging remains intact.
var DM_GEN_META = [
  { id:'dm1', roman:'I',   prestige:3, vessel:'dmv1', stable:'dms1', resonance:'dmr1', akasha:'current' },
  { id:'dm2', roman:'II',  prestige:5, vessel:'dmv2', stable:'dms2', resonance:'dmr2', akasha:'gen2' },
  { id:'dm3', roman:'III', prestige:8, vessel:'dmv3', stable:'dms3', resonance:'dmr3', akasha:'gen3' }
];
var DM_GEN_LEVEL_CAP = 20;
var DM_VESSEL_LEVEL_CAP = 10;
var DM_STABLE_LEVEL_CAP = 10;
var DM_RESONANCE_LEVEL_CAP = 10;
var DM_GEN_BASE_DAY = [12, 18, 26], DM_GEN_PER_DAY = [2, 3, 4];
function dmGenIdx(id) {
  for (var i = 0; i < DM_GEN_META.length; i++) if (DM_GEN_META[i].id === id) return i;
  return -1;
}
function dmPumpIdxForUpgrade(id) {
  for (var i = 0; i < DM_GEN_META.length; i++) {
    var m = DM_GEN_META[i];
    if (id === m.id || id === m.vessel || id === m.stable || id === m.resonance) return i;
  }
  return -1;
}
function dmPumpOfUpgrade(id) {
  var idx = dmPumpIdxForUpgrade(id);
  return idx >= 0 ? DM_GEN_META[idx] : null;
}
function dmUpgradeTrack(id) {
  var m = dmPumpOfUpgrade(id);
  if (!m) return null;
  if (id === m.id) return 'current';
  if (id === m.vessel) return 'vessel';
  if (id === m.stable) return 'stable';
  return 'resonance';
}
function dmUpgradeLevelCap(id) {
  var track = dmUpgradeTrack(id);
  if (track === 'current') return DM_GEN_LEVEL_CAP;
  if (track === 'vessel') return DM_VESSEL_LEVEL_CAP;
  if (track === 'stable') return DM_STABLE_LEVEL_CAP;
  if (track === 'resonance') return DM_RESONANCE_LEVEL_CAP;
  return 0;
}
function dmPumpBuildingId(meta) {
  if (!meta) return 0;
  var ids = [meta.id, meta.vessel, meta.stable, meta.resonance];
  for (var i = 0; i < ids.length; i++) if (omniaUpgradeBuilding(ids[i])) return ids[i];
  return 0;
}
function dmGenUnlockedCount() {
  if (typeof darkMatterUnlocked !== 'function' || !darkMatterUnlocked()) return 0;
  var p = omniaState.prestige || 0, n = 0;
  DM_GEN_META.forEach(function(m) { if (p >= m.prestige) n++; });
  return n;
}
function dmGenRatePerDay(idx) {
  var lvl = (omniaState.upgrades && omniaState.upgrades[DM_GEN_META[idx].id]) || 1;
  var built = Math.max(0, lvl - 1);
  // Preserve levels 1–10 exactly, then let the new second half deepen at half
  // speed so idle Dark Matter remains secondary to advanced practice.
  return Math.floor(DM_GEN_BASE_DAY[idx] + DM_GEN_PER_DAY[idx] * Math.min(9, built)
    + DM_GEN_PER_DAY[idx] * 0.5 * Math.max(0, built - 9));
}
function dmPumpReservoirCap(idx) {
  var meta = DM_GEN_META[idx];
  var vessel = (omniaState.upgrades && omniaState.upgrades[meta.vessel]) || 1;
  // Starts at the original two days and reaches 4.25 days at Void Vessel 10.
  return Math.floor(dmGenRatePerDay(idx) * (2 + (vessel - 1) * 0.25));
}
function dmStabilizationMult(idx) {
  var meta = DM_GEN_META[idx];
  if (!meta || !dmPumpBuildingId(meta)) return 1;
  var lvl = (omniaState.upgrades && omniaState.upgrades[meta.stable]) || 1;
  return Math.max(0, Math.min(0.45, (lvl - 1) * 0.05));
}
function dmResonanceMult(idx) {
  var meta = DM_GEN_META[idx];
  if (!meta) return 1;
  var lvl = (omniaState.upgrades && omniaState.upgrades[meta.resonance]) || 1;
  return 1 + Math.min(0.36, (lvl - 1) * 0.04);
}
function dmUpgradePrice(id) {
  var lvl = (omniaState.upgrades && omniaState.upgrades[id]) || 1;
  var track = dmUpgradeTrack(id), d = 0, a = 0;
  if (track === 'current') {
    d = lvl <= 10
      ? Math.floor(30 * Math.pow(1.3, lvl - 1))
      : Math.floor(318 * Math.pow(1.16, lvl - 10));
  } else if (track === 'vessel') {
    d = Math.floor(24 * Math.pow(1.28, lvl - 1));
  } else if (track === 'stable') {
    d = Math.floor(36 * Math.pow(1.3, lvl - 1));
  } else if (track === 'resonance') {
    d = Math.floor(45 * Math.pow(1.32, lvl - 1));
    a = Math.floor(8000 * Math.pow(1.35, lvl - 1));
  }
  return { d:d, a:a };
}
// Slightly heavier than the akasha curve, and no Quickening applies — the
// dark current cannot be hurried.
function dmBuildDurationMs(targetLevel) {
  var secs = Math.floor(900 + 12 * Math.pow(Math.max(1, targetLevel), 3));
  return Math.max(60, Math.min(secs, 24 * 3600)) * 1000;
}
function buyDmUpgrade(id) {
  var idx = dmPumpIdxForUpgrade(id);
  if (idx < 0 || idx >= dmGenUnlockedCount()) return false;
  var lvl = (omniaState.upgrades && omniaState.upgrades[id]) || 1;
  if (lvl >= dmUpgradeLevelCap(id)) return false;
  if (dmPumpBuildingId(DM_GEN_META[idx])) return false;
  var price = dmUpgradePrice(id);
  if ((omniaState.darkMatter || 0) < price.d || (omniaState.akasha || 0) < price.a) return false;
  omniaState.darkMatter -= price.d;
  omniaState.totalDarkMatterSpent = (omniaState.totalDarkMatterSpent || 0) + price.d;
  if (price.a && !omniaSpendAkasha(price.a, 'dark-resonance-upgrade', { upgradeId:id, level:lvl })) {
    omniaState.darkMatter += price.d;
    omniaState.totalDarkMatterSpent = Math.max(0, (omniaState.totalDarkMatterSpent || 0) - price.d);
    return false;
  }
  if (!omniaState.upgradeBuilds || typeof omniaState.upgradeBuilds !== 'object') omniaState.upgradeBuilds = {};
  omniaState.upgradeBuilds[id] = Date.now() + dmBuildDurationMs(lvl + 1);
  saveOmniaState();
  renderOmniaEngine();
  playUpgradeHammer();
  if (navigator.vibrate) { try { navigator.vibrate(5); } catch(e) {} }
  return true;
}
function collectDmPump(anchorEl, gid) {
  omniaAccrue();
  var res = omniaState.reservoirs || (omniaState.reservoirs = {});
  var amount = Math.floor(res[gid] || 0);
  if (amount < 1 || dmPumpBuildingId(dmPumpOfUpgrade(gid))) return;
  res[gid] = (res[gid] || 0) - amount;
  if (res[gid] < 0.5) res[gid] = 0;
  // mint returns the credited amount (after any Dark Current cosmetic boost),
  // so the burst shows what the player actually received.
  amount = mintDarkMatter(amount) || amount;
  renderOmniaEngine();
  playAkashaPop();
  if (anchorEl && anchorEl.getBoundingClientRect) {
    var rect = anchorEl.getBoundingClientRect();
    var burst = document.createElement('div');
    burst.className = 'oe-collect-burst';
    burst.style.color = '#d8c4f4';
    burst.style.textShadow = '0 0 16px rgba(196,168,212,.95)';
    burst.textContent = '+' + amount + ' ◆';
    burst.style.left = (rect.left + rect.width / 2) + 'px';
    burst.style.top = (rect.top - 4) + 'px';
    document.body.appendChild(burst);
    setTimeout(function() { burst.remove(); }, 1050);
  }
}
// Violet condenser vat with a floating dark crystal; fluid level = reservoir.
function _dmPictureSvg(idx, fillFrac, lvl) {
  var frac = Math.max(0, Math.min(1, fillFrac || 0));
  var fluidTop = (92 - 30 * Math.max(frac, 0.07)).toFixed(1);
  var uid = 'oeDmClip' + (++_pumpUid);
  var crowned = (lvl || 1) >= 8;
  return '<svg class="oe-genpic-svg" viewBox="0 0 100 112" aria-hidden="true">'
    + '<defs><clipPath id="' + uid + '"><rect x="27" y="60" width="46" height="34" rx="8"/></clipPath></defs>'
    + '<ellipse cx="50" cy="106" rx="30" ry="4" fill="rgba(196,168,212,.08)"/>'
    + '<path d="M22 99 L78 99 L83 108 L17 108 Z" fill="rgba(196,168,212,.08)" stroke="rgba(196,168,212,.4)" stroke-width="1"/>'
    + '<rect x="26" y="59" width="48" height="36" rx="9" fill="rgba(14,8,22,.6)" stroke="' + (crowned ? 'rgba(232,200,122,.7)' : 'rgba(216,196,244,.5)') + '" stroke-width="1.4"/>'
    + '<g clip-path="url(#' + uid + ')">'
    +   '<rect x="27" y="' + fluidTop + '" width="46" height="38" fill="rgba(154,106,232,.45)"/>'
    +   '<rect x="27" y="' + fluidTop + '" width="46" height="3" fill="rgba(216,196,244,.55)"/>'
    + '</g>'
    + '<path d="M36 56 L50 47 L64 56" fill="none" stroke="rgba(196,168,212,.55)" stroke-width="1.4"/>'
    + '<g class="oe-dm-crystal">'
    +   '<path d="M50 12 L60 32 L50 52 L40 32 Z" fill="rgba(154,106,232,.35)" stroke="#c4a8d4" stroke-width="1.6"/>'
    +   '<path d="M50 20 L55 32 L50 44 L45 32 Z" fill="rgba(216,196,244,.5)"/>'
    +   (crowned ? '<path d="M50 4 L53 9 L50 14 L47 9 Z" fill="#e8c87a" opacity=".95"/>' : '')
    + '</g>'
    + '<text x="50" y="105.5" text-anchor="middle" class="oe-genpic-num" style="fill:#c4a8d4;">' + DM_GEN_META[idx].roman + '</text>'
    + '</svg>';
}

// ── Generator yard (pictured, Clash-style) + upgrade sheet ────────────────
// Tap a generator with akasha waiting (◈ badge) → collect, +N pops above it.
// Tap it with nothing to collect → its upgrade menu opens.
var _genSheetId = null;

// Akasha pump: a rocking beam-pump over a glass vat of akasha (elixir-pump
// homage). The vat's fluid level tracks the shared reservoir; the beam rocks
// while the pump is producing and freezes while it's offline upgrading.
// Pumps grow richer with THEIR OWN level: gold tank fittings at 10+, a gold
// counterweight and crown gem at 20+. clipPath ids are uniqued per render.
var _pumpUid = 0;
function _genPictureSvg(idx, fillFrac, lvl) {
  lvl = lvl || 1;
  var frac = Math.max(0, Math.min(1, fillFrac || 0));
  var fluidTop = (96 - 34 * Math.max(frac, 0.07)).toFixed(1);
  var uid = 'oePumpClip' + (++_pumpUid);
  var gold = lvl >= 10, crown = lvl >= 20;
  var rim = gold ? 'rgba(232,200,122,.75)' : 'rgba(184,234,255,.55)';
  var band = gold ? 'rgba(232,200,122,.4)' : 'rgba(142,204,224,.25)';
  return '<svg class="oe-genpic-svg" viewBox="0 0 100 112" aria-hidden="true">'
    + '<defs><clipPath id="' + uid + '"><rect x="25" y="61" width="50" height="36" rx="9"/></clipPath></defs>'
    + '<ellipse cx="50" cy="107" rx="33" ry="4.5" fill="rgba(142,204,224,.07)"/>'
    + '<path d="M20 100 L80 100 L85 109 L15 109 Z" fill="rgba(142,204,224,.08)" stroke="rgba(142,204,224,.4)" stroke-width="1"/>'
    + '<rect x="24" y="60" width="52" height="38" rx="10" fill="rgba(8,16,24,.55)" stroke="' + rim + '" stroke-width="1.4"/>'
    + '<g clip-path="url(#' + uid + ')">'
    +   '<rect x="25" y="' + fluidTop + '" width="50" height="40" fill="rgba(90,184,224,.5)"/>'
    +   '<rect x="25" y="' + fluidTop + '" width="50" height="3" fill="rgba(191,234,255,.55)"/>'
    +   '<circle class="oe-pump-bub" cx="42" cy="94" r="1.7"/>'
    +   '<circle class="oe-pump-bub b2" cx="57" cy="95" r="1.2"/>'
    + '</g>'
    + '<path d="M24 78 H76" stroke="' + band + '" stroke-width="1"/>'
    + '<path d="M24 88 H76" stroke="' + band + '" stroke-width="1"/>'
    + '<path d="M44 60 L50 25 L56 60" fill="none" stroke="rgba(142,204,224,.8)" stroke-width="1.8"/>'
    + (crown ? '<path d="M50 11 L53 16.5 L50 22 L47 16.5 Z" fill="#e8c87a" opacity=".95"/>' : '')
    + '<g class="oe-pump-beam">'
    +   '<path d="M32 28.5 L70 24" stroke="rgba(191,234,255,.85)" stroke-width="2.4" stroke-linecap="round"/>'
    +   '<circle cx="32" cy="28.5" r="4.6" fill="' + (crown ? 'rgba(232,200,122,.45)' : 'rgba(142,204,224,.3)') + '" stroke="' + (crown ? '#e8c87a' : '#bfeaff') + '" stroke-width="1.2"/>'
    + '</g>'
    + '<circle cx="50" cy="26" r="2.3" fill="#bfeaff"/>'
    + '<g class="oe-pump-rod">'
    +   '<line x1="70" y1="23" x2="70" y2="54" stroke="rgba(191,234,255,.6)" stroke-width="1.6"/>'
    +   '<rect x="65.5" y="52" width="9" height="6.5" rx="2" fill="rgba(142,204,224,.35)" stroke="rgba(191,234,255,.7)" stroke-width="1"/>'
    + '</g>'
    + '<text x="50" y="106.5" text-anchor="middle" class="oe-genpic-num">' + OMNIA_GEN_META[idx].roman + '</text>'
    + '</svg>';
}

function renderOmniaGenYard() {
  var yard = document.getElementById('omniaGenYard');
  if (!yard) return;
  var n = omniaGenUnlockedCount();
  var res = omniaState.reservoirs || {};
  var html = '';
  for (var i = 0; i < n; i++) {
    var meta = OMNIA_GEN_META[i];
    var lvl = (omniaState.upgrades && omniaState.upgrades[meta.id]) || 1;
    var buildingId = omniaPumpBuildingId(meta);
    var building = buildingId ? omniaUpgradeBuilding(buildingId) : 0;
    var pumpRes = Math.floor(res[meta.id] || 0);
    var pumpCap = omniaPumpReservoirCap(i);
    var frac = pumpCap > 0 ? (res[meta.id] || 0) / pumpCap : 0;
    var canCollect = !building && pumpRes >= 1;
    html += '<button class="oe-genpic' + (building ? ' building' : '') + '" data-gen-tap="' + meta.id + '" aria-label="Akasha Generator ' + meta.roman + '">'
      + (canCollect ? '<div class="oe-gen-collectbadge">+' + pumpRes.toLocaleString() + '</div>' : '')
      + _genPictureSvg(i, frac, lvl)
      + '<div class="oe-genpic-lvl">' + (building
          ? '<span class="oe-genpic-build">◷ <span data-build-countdown="' + buildingId + '">' + omniaBuildLabel(building) + '</span></span>'
          : (omniaUpgradeMasteryRank(meta.id, lvl) ? '<span class="omnia-mastery-mark">' + omniaMasteryPips(omniaUpgradeMasteryRank(meta.id, lvl)) + '</span> ' : '') + 'Lv ' + omniaUpgradeDisplayLevel(meta.id, lvl)) + '</div>'
      + '</button>';
  }
  html = '<div class="oe-genyard-row">' + html + '</div>';
  // Book II: the Dark Matter pump row appears below the akasha pumps, with
  // future pumps ghosted until their prestige is reached.
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) {
    var dmUnlocked = dmGenUnlockedCount(), dmRow = '';
    for (var d = 0; d < DM_GEN_META.length; d++) {
      var dmeta = DM_GEN_META[d];
      if (d >= dmUnlocked) {
        dmRow += '<div class="oe-genpic oe-genpic--locked">' + _dmPictureSvg(d, 0, 1)
          + '<div class="oe-genpic-lvl oe-genpic-lock">Prestige ' + dmeta.prestige + '</div></div>';
        continue;
      }
      var dLvl = (omniaState.upgrades && omniaState.upgrades[dmeta.id]) || 1;
      var dBuildId = dmPumpBuildingId(dmeta);
      var dBuild = dBuildId ? omniaUpgradeBuilding(dBuildId) : 0;
      var dRes = Math.floor(res[dmeta.id] || 0);
      var dCap = dmPumpReservoirCap(d);
      var dFrac = dCap > 0 ? (res[dmeta.id] || 0) / dCap : 0;
      dmRow += '<button class="oe-genpic' + (dBuild ? ' building' : '') + '" data-dm-tap="' + dmeta.id + '" aria-label="Dark Matter Pump ' + dmeta.roman + '">'
        + (!dBuild && dRes >= 1 ? '<div class="oe-gen-collectbadge oe-gen-collectbadge--dm">+' + dRes + ' ◆</div>' : '')
        + _dmPictureSvg(d, dFrac, dLvl)
        + '<div class="oe-genpic-lvl">' + (dBuild
            ? '<span class="oe-genpic-build">◷ <span data-build-countdown="' + dBuildId + '">' + omniaBuildLabel(dBuild) + '</span></span>'
            : 'Lv ' + dLvl) + '</div>'
        + '</button>';
    }
    html += '<div class="oe-dm-divider"><span>Dark Matter Pumps · ' + Math.floor(omniaState.darkMatter || 0).toLocaleString() + ' ◆</span></div>'
      + '<div class="oe-genyard-row">' + dmRow + '</div>';
  }
  yard.innerHTML = html;
  var slim = document.getElementById('omniaGenSlim');
  if (slim) slim.textContent = 'Tap a full pump to collect, or any pump to upgrade';
}

function renderDmSheet(gid) {
  var body = document.getElementById('genSheetBody');
  var idx = dmGenIdx(gid);
  if (!body || idx < 0) return;
  var meta = DM_GEN_META[idx];
  var lvl = (omniaState.upgrades && omniaState.upgrades[gid]) || 1;
  var pumpBusyId = dmPumpBuildingId(meta);
  var building = pumpBusyId ? omniaUpgradeBuilding(pumpBusyId) : 0;
  var res = Math.floor((omniaState.reservoirs || {})[gid] || 0);
  var cap = dmPumpReservoirCap(idx);
  var canCollect = !building && res >= 1;
  function row(id, name, sub, accent, glyph) {
    var trackLvl = (omniaState.upgrades && omniaState.upgrades[id]) || 1;
    var levelCap = dmUpgradeLevelCap(id);
    var atMax = trackLvl >= levelCap;
    var trackBuild = omniaUpgradeBuilding(id);
    var price = dmUpgradePrice(id);
    var priceLabel = price.a
      ? price.d.toLocaleString() + ' ◆ + ' + price.a.toLocaleString() + ' akasha'
      : price.d.toLocaleString() + ' ◆';
    var disabled = (omniaState.darkMatter || 0) < price.d || (omniaState.akasha || 0) < price.a;
    var btn;
    if (trackBuild) btn = '<button class="omnia-mini-btn omnia-mini-btn--building" disabled>◷ <span data-build-countdown="' + id + '">' + omniaBuildLabel(trackBuild) + '</span></button>';
    else if (pumpBusyId) btn = '<button class="omnia-mini-btn" disabled style="opacity:.4;cursor:default;">Waiting</button>';
    else if (atMax) btn = '<button class="omnia-mini-btn" disabled style="opacity:.45;cursor:default;">Mastered</button>';
    else btn = '<button class="omnia-mini-btn" data-dm-buy="' + id + '"' + (disabled ? ' disabled' : '') + '>Upgrade ' + priceLabel + '</button>';
    var timeLabel = (atMax || trackBuild || pumpBusyId) ? '' : omniaBuildSpanLabel(dmBuildDurationMs(trackLvl + 1));
    return '<div class="omnia-upgrade-row" style="border-left:2px solid ' + accent + '55; padding-left:11px;">'
      + '<div><div class="omnia-upgrade-name" style="color:' + accent + ';"><span style="opacity:.9;margin-right:6px;">' + glyph + '</span>' + name + ' ' + trackLvl
      + ' <span style="font-size:8px;color:rgba(220,204,240,.58);letter-spacing:.1em;">/ ' + levelCap + '</span></div>'
      + '<div class="omnia-upgrade-sub">' + sub + '</div></div>'
      + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">' + btn
      + (timeLabel ? '<span style="font-size:8px;letter-spacing:.08em;color:rgba(196,168,212,.9);">◷ ' + timeLabel + ' build</span>' : '')
      + '</div></div>';
  }
  var stablePct = Math.max(0, (((omniaState.upgrades || {})[meta.stable] || 1) - 1) * 5);
  var resonancePct = Math.round((dmResonanceMult(idx) - 1) * 100);
  body.innerHTML = '<button class="ach-info-close" id="genSheetClose" aria-label="Close">✕</button>'
    + '<div class="ach-info-medal" id="genSheetMedal" style="--gc:#c4a8d4; position:relative;' + (canCollect ? ' cursor:pointer;' : '') + '">'
    + (canCollect ? '<div class="oe-gen-collectbadge oe-gen-collectbadge--dm">+' + res.toLocaleString() + ' ◆</div>' : '')
    + _dmPictureSvg(idx, cap > 0 ? res / cap : 0, lvl) + '</div>'
    + '<div class="ach-info-kicker" style="color:#c4a8d4;">Dark Matter Pump</div>'
    + '<div class="ach-info-name">Pump ' + meta.roman + '</div>'
    + '<div class="ach-info-desc">+' + dmGenRatePerDay(idx) + ' ◆ / day · vat ' + res.toLocaleString() + ' / ' + cap.toLocaleString()
    + (building ? ' · <span style="color:#e8c87a;">' + (stablePct ? stablePct + '% production while upgrading' : 'offline while upgrading') + '</span>'
       : '') + '</div>'
    + '<div style="text-align:left; margin-top:16px;">'
    + row(meta.id, 'Dark Current', 'Condenses dark matter more quickly · deeper levels deliberately taper', '#c4a8d4', '◆')
    + row(meta.vessel, 'Void Vessel', 'Extends this pump\'s offline vat from two days toward 4.25 days', '#9a8ee8', '▽')
    + row(meta.stable, 'Stabilization', 'Retains another 5% production while any pump upgrade is building', '#b17bd8', '◌')
    + row(meta.resonance, 'Umbral Resonance', 'Paired Akasha Generator ' + meta.roman + ' +' + resonancePct + '% · next +4%', '#d7a5f2', '↔')
    + '</div>';
  var cl = document.getElementById('genSheetClose');
  if (cl) cl.onclick = closeGenSheet;
  body.onclick = function(e) {
    var b = e.target.closest('[data-dm-buy]');
    if (b && !b.disabled && buyDmUpgrade(b.getAttribute('data-dm-buy')) && _genSheetId) { renderGenSheet(_genSheetId); return; }
    var medalEl = e.target.closest('#genSheetMedal');
    if (medalEl && _genSheetId) {
      omniaAccrue();
      var avail = Math.floor((omniaState.reservoirs || {})[_genSheetId] || 0);
      if (!dmPumpBuildingId(dmPumpOfUpgrade(_genSheetId)) && avail >= 1) { collectDmPump(medalEl, _genSheetId); renderGenSheet(_genSheetId); }
      else playCollectEmpty();
    }
  };
}

// The generator's own tier control, under the four branches. It only becomes
// live once every branch is at the top of its band, so it doubles as the
// progress readout for how far off that is.
function _genTierPanel(meta) {
  var tier = omniaGenTier(meta.id);
  if (tier >= OMNIA_MASTERY_CAP) {
    return '<div class="oe-gen-tier oe-gen-tier--done">'
      + '<div class="oe-gen-tier-label">Tier ' + omniaMasteryRoman(tier) + ' · fully realised</div></div>';
  }
  var ready = omniaGenTierReady(meta.id);
  var busy = !!omniaPumpBuildingId(meta);
  var remaining = omniaGenTracksRemaining(meta.id);
  var next = omniaMasteryRoman(tier + 1);
  var sub = ready
    ? (busy ? 'Finish the current build first.'
            : 'All four branches complete. Output restarts at ' + Math.round(omniaMasteryScale(tier + 1) * 10) / 10 + '× the base curve.')
    // "short of Level 20" read like an absolute level, which is exactly what a
    // banded track is not — a Tier I branch showing 1 / 20 is at lifetime level
    // 21. Name the band target the way the cards write it, and carry the
    // outstanding level count so the line moves on every single purchase.
    // When branches are pinned at their Bardon-step ceiling, say so outright:
    // otherwise the panel reads as a shopping list for upgrades the step gate
    // will not sell.
    : (function() {
        var blocked = (typeof omniaGenStepBlocked === 'function') ? omniaGenStepBlocked(meta.id) : [];
        var line = remaining + ' of 4 branches still short of 20 / 20 · '
          + omniaGenLevelsRemaining(meta.id) + ' branch levels to go.';
        if (blocked.length) {
          line += ' ' + blocked.length + ' of them ' + (blocked.length === 1 ? 'is' : 'are')
            + ' at the Step ' + (omniaState.bardonStep || 1)
            + ' ceiling — advance the Bardon path to open more.';
        }
        return line;
      })();
  var btn = ready && !busy
    ? '<button class="omnia-mini-btn omnia-mini-btn--mastery" data-sheet-tier="' + meta.id + '">Tier Up ' + next + '</button>'
    : '<button class="omnia-mini-btn" disabled style="opacity:.4;cursor:default;">Tier Up ' + next + '</button>';
  return '<div class="oe-gen-tier' + (ready && !busy ? ' is-ready' : '') + '">'
    + '<div><div class="oe-gen-tier-label">'
    + (tier ? 'Tier ' + omniaMasteryRoman(tier) + ' → ' + next : 'Tier ' + next) + '</div>'
    + '<div class="oe-gen-tier-sub">' + sub + '</div></div>'
    + btn + '</div>';
}

function renderGenSheet(gid) {
  // Dark Matter pumps share the drawer shell but render their own sheet, so
  // every existing refresh path (ticker, collect, buy) keeps working via
  // renderGenSheet(_genSheetId).
  if (typeof dmGenIdx === 'function' && dmGenIdx(gid) >= 0) return renderDmSheet(gid);
  var body = document.getElementById('genSheetBody');
  var idx = OMNIA_GEN_META.findIndex(function(g) { return g.id === gid; });
  if (!body || idx < 0) return;
  var meta = OMNIA_GEN_META[idx];

  // While the pump is building one track, the others are blocked (one upgrade
  // per pump). Show them as "waiting" rather than a live buy button.
  var pumpBusyId = omniaPumpBuildingId(meta);
  function row(id, name, sub, accent, glyph) {
    var upg = OMNIA_UPGRADES.find(function(u) { return u.id === id; });
    var lvl = (omniaState.upgrades && omniaState.upgrades[id]) || 1;
    var cost = omniaUpgradeCost(upg);
    var stepMax = omniaUpgradeStepMax(id);
    var capped = isFinite(stepMax);
    var atMax = capped && lvl >= stepMax;
    var atBandTop = omniaUpgradeAtBandTop(id);
    var masteryReady = false;   // tiering is a generator-level action now
    var masteryRank = omniaUpgradeMasteryRank(id, lvl);
    var displayLvl = omniaUpgradeDisplayLevel(id, lvl);
    var building = omniaUpgradeBuilding(id);
    var btn;
    if (building) btn = '<button class="omnia-mini-btn omnia-mini-btn--building" disabled>◷ <span data-build-countdown="' + id + '">' + omniaBuildLabel(building) + '</span></button>';
    else if (pumpBusyId) btn = '<button class="omnia-mini-btn" disabled style="opacity:.4;cursor:default;">Waiting</button>';
    else if (atBandTop && lvl < OMNIA_UPGRADE_FINAL_LEVEL) btn = '<button class="omnia-mini-btn omnia-mini-btn--ready" disabled>✓ Ready</button>';
    else if (atMax) btn = '<button class="omnia-mini-btn" disabled style="opacity:.45;cursor:default;">' + (lvl >= OMNIA_UPGRADE_FINAL_LEVEL ? 'Complete' : 'Step max') + '</button>';
    else btn = '<button class="omnia-mini-btn" data-sheet-buy="' + id + '"' + ((omniaState.akasha || 0) < cost ? ' disabled' : '') + '>Upgrade ' + cost + '</button>';
    // Build time for the NEXT level, shown under the button so cost + duration
    // sit together. Hidden at max (no next level) and while building (the button
    // already counts the live remaining time down).
    var timeLabel = (atMax || atBandTop || building || pumpBusyId) ? '' : omniaBuildSpanLabel(omniaBuildDurationMs(lvl + 1, id));
    // Only the Akashic Current track (id === gid) moves this pump's hourly
    // rate directly — Vessel/Attunement/Quickening don't, so skip the preview
    // there, and skip it here too whenever there's no plain next-level buy.
    var ratePreview = '';
    if (id === gid && !atMax && !atBandTop && !building && !pumpBusyId) {
      var rp = omniaPreviewGenRateGain(gid);
      if (rp.after > rp.before) {
        // Round to a whole number once rates are large enough that a decimal
        // is just noise; keep one decimal at low levels so an early, sub-1
        // gain doesn't display as "the same number" on both sides.
        var fmt = function(n) { return n >= 50 ? Math.round(n).toLocaleString() : (Math.round(n * 10) / 10).toLocaleString(); };
        ratePreview = '<div class="omnia-upgrade-preview">+' + fmt(rp.before) + ' → +' + fmt(rp.after) + '/hr</div>';
      }
    }
    var right = '<div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0;">' + btn
      + (timeLabel ? '<span style="font-size:8px; letter-spacing:.08em; color:rgba(196,168,212,.9);">◷ ' + timeLabel + ' build</span>' : '') + '</div>';
    return '<div class="omnia-upgrade-row" style="border-left:2px solid ' + accent + '55; padding-left:11px;">'
      + '<div><div class="omnia-upgrade-name" style="color:' + accent + ';"><span style="opacity:.9;margin-right:6px;">' + glyph + '</span>' + name + ' ' + (masteryRank ? '<span class="omnia-mastery-mark">' + omniaMasteryPips(masteryRank) + '</span> ' : '') + displayLvl + ' <span style="font-size:8px;color:rgba(200,230,245,.55);letter-spacing:.1em;">/ 20</span></div>'
      + '<div class="omnia-upgrade-sub">' + sub + '</div>' + ratePreview + '</div>' + right + '</div>';
  }

  var contrib = Math.floor((omniaPumpShares()[gid] || 0));
  var building = pumpBusyId ? omniaUpgradeBuilding(pumpBusyId) : 0;
  var glvl = (omniaState.upgrades && omniaState.upgrades[gid]) || 1;
  var pumpRes = Math.floor((omniaState.reservoirs || {})[gid] || 0);
  var pumpCap = omniaPumpReservoirCap(idx);
  var canCollectSheet = !building && pumpRes >= 1;
  body.innerHTML = '<button class="ach-info-close" id="genSheetClose" aria-label="Close">✕</button>'
    + '<div class="ach-info-medal" id="genSheetMedal" style="--gc:#8eccc0; position:relative;' + (canCollectSheet ? ' cursor:pointer;' : '') + '">'
    + (canCollectSheet ? '<div class="oe-gen-collectbadge">+' + pumpRes.toLocaleString() + '</div>' : '')
    + _genPictureSvg(idx, pumpCap > 0 ? pumpRes / pumpCap : 0, glvl) + '</div>'
    + '<div class="ach-info-kicker">Akasha Generator</div>'
    + '<div class="ach-info-name">Generator ' + meta.roman + '</div>'
    + '<div class="ach-info-desc">+' + contrib + '/hr · reservoir ' + pumpRes.toLocaleString() + ' / ' + pumpCap.toLocaleString() + '</div>'
    // The collect/upgrading hint lives on its own reserved-height line so the
    // sheet stays exactly as tall whether or not there's akasha to collect.
    // Otherwise collecting drops the hint, the desc unwraps a line, and the
    // vertically-centered drawer re-centers — shifting the whole menu.
    + '<div class="gen-sheet-hint">'
    + (building ? '<span style="color:#e8c87a;">offline while upgrading</span>'
       : canCollectSheet ? '<span style="color:#8eccc0;">tap the pump to collect</span>' : '') + '</div>'
    + '<div style="text-align:left; margin-top:16px;">'
    + row(gid, 'Akashic Current', 'Generate akasha more quickly each hour · deeper levels give diminishing gains', '#8ecce0', '◈')
    + row(meta.vessel, 'Deep Vessel', 'This pump\'s reservoir capacity', '#9ed8c4', '▽')
    + row(meta.attune, 'Attunement', 'Cheapens this pump\'s upgrades', '#e8c87a', '✧')
    + row(meta.quick, 'Quickening', 'Speeds this pump\'s construction', '#c4a8d4', '◷')
    + '</div>'
    + _genTierPanel(meta);
  var cl = document.getElementById('genSheetClose');
  if (cl) cl.onclick = closeGenSheet;
  // Bound at render time — this script runs before the #genSheet markup is
  // parsed, so a parse-time listener would attach to nothing.
  body.onclick = function(e) {
    var m = e.target.closest('[data-sheet-tier]');
    if (m && !m.disabled) { confirmOmniaGenTier(m.getAttribute('data-sheet-tier')); return; }
    var b = e.target.closest('[data-sheet-buy]');
    if (b && !b.disabled && buyOmniaUpgrade(b.getAttribute('data-sheet-buy')) && _genSheetId) { renderGenSheet(_genSheetId); return; }
    // Tap the pump picture to collect its akasha without leaving the menu. If
    // there's nothing waiting (or it's mid-build), play the hollow empty thunk.
    var medalEl = e.target.closest('#genSheetMedal');
    if (medalEl && _genSheetId) {
      omniaAccrue();
      var avail = Math.floor((omniaState.reservoirs || {})[_genSheetId] || 0);
      var busy = omniaPumpBuildingId(_pumpOfUpgrade(_genSheetId));
      if (!busy && avail >= 1) { collectOmniaAkasha(medalEl, _genSheetId); renderGenSheet(_genSheetId); }
      else playCollectEmpty();
    }
  };
}
function openGenSheet(gid) {
  _genSheetId = gid;
  renderGenSheet(gid);
  var ov = document.getElementById('genSheet');
  if (ov && !ov._backdropBound) {
    ov._backdropBound = 1;
    ov.addEventListener('click', function(e) { if (e.target === ov) closeGenSheet(); });
  }
  if (ov) ov.classList.add('on');
}
function closeGenSheet() {
  _genSheetId = null;
  var ov = document.getElementById('genSheet');
  if (ov) ov.classList.remove('on');
}
(function() {
  var yard = document.getElementById('omniaGenYard');
  if (yard) yard.addEventListener('click', function(e) {
    var dg = e.target.closest('[data-dm-tap]');
    if (dg) {
      var did = dg.getAttribute('data-dm-tap');
      omniaAccrue();
      if (!dmPumpBuildingId(dmPumpOfUpgrade(did)) && Math.floor((omniaState.reservoirs || {})[did] || 0) >= 1) { collectDmPump(dg, did); return; }
      openGenSheet(did);
      return;
    }
    var g = e.target.closest('[data-gen-tap]');
    if (!g) return;
    var gid = g.getAttribute('data-gen-tap');
    omniaAccrue();
    if (!omniaPumpBuildingId(_pumpOfUpgrade(gid)) && Math.floor((omniaState.reservoirs || {})[gid] || 0) >= 1) { collectOmniaAkasha(g, gid); return; }
    openGenSheet(gid);
  });
})();

function buyOmniaUpgrade(id) {
  var upg = OMNIA_UPGRADES.find(function(u) { return u.id === id; });
  if (!upg) return false;
  if (omniaUpgradeAtMax(id)) return false;
  if (omniaUpgradeBuilding(id)) return false;   // this track already building
  var _pump = _pumpOfUpgrade(id);
  if (_pump && omniaPumpBuildingId(_pump)) return false;  // one upgrade per pump at a time
  var cost = omniaUpgradeCost(upg);
  if ((omniaState.akasha || 0) < cost) return false;
  omniaSpendAkasha(cost, 'generator-upgrade', { upgradeId: id, level: omniaState.upgrades[id] || 1 });
  // Spend now, but the level lands only when construction finishes.
  var targetLevel = (omniaState.upgrades[id] || 1) + 1;
  if (!omniaState.upgradeBuilds || typeof omniaState.upgradeBuilds !== 'object') omniaState.upgradeBuilds = {};
  omniaState.upgradeBuilds[id] = Date.now() + omniaBuildDurationMs(targetLevel, id);
  saveOmniaState();
  renderOmniaEngine();
  playUpgradeHammer();
  if (navigator.vibrate) { try { navigator.vibrate(5); } catch(e) {} }
  return true;
}

function performOmniaAction(kind) {
  var fig = document.querySelector('.omnia-figure');
  if (fig) {
    fig.classList.remove('attune');
    void fig.offsetWidth;
    fig.classList.add('attune');
    setTimeout(function() { fig.classList.remove('attune'); }, 1500);
  }
  if (kind === 'advance') showToast('Omnia crossed the threshold');
  else showToast('Omnia attunes to the current');
}

function advanceOmniaStep() {
  // Book II: the main button drives Evocation progress — forge the current
  // instrument's next phase while tools remain, then travel the spheres.
  if (typeof darkMatterUnlocked === 'function' && darkMatterUnlocked()) {
    if (bookIICurrentToolIdx() < BOOK2_TOOLS.length) omniaBuildToolPhase();
    else omniaTravelSphere();
    return;
  }
  var step = omniaCurrentStep();
  var next = OMNIA_BARDON_STEPS.find(function(s) { return s.step === (omniaState.bardonStep || 1) + 1; });
  if (!next || !omniaStepReady(step)) return;
  omniaState.bardonStep = next.step;
  saveOmniaState();
  performOmniaAction('advance');
  renderOmniaEngine();
}

function beginOmniaRecommendation() {
  var rec = omniaPickRecommendation(false);
  // If guided-path recommendation is a thought sub-mode, pre-set tcMode so the
  // session is saved under the correct mode (observation/focus/vacancy).
  // Same for a sense sub-mode (feeling/smell/taste) and senseMode.
  if (rec.id === 'observation' || rec.id === 'focus' || rec.id === 'vacancy') {
    if (TC_MODE_DEFS[rec.id]) tcMode = rec.id;
  } else if (rec.id === 'thought') {
    var _ts = guideThoughtStats();
    var _m = guideState.thoughtModeForced || guideCurrentThoughtMode(_ts);
    if (TC_MODE_DEFS[_m]) tcMode = _m;
  } else if (rec.id === 'feeling' || rec.id === 'smell' || rec.id === 'taste') {
    if (SENSE_MODE_DEFS[rec.id]) senseMode = rec.id;
  } else if (rec.id === 'sense') {
    var _ss = guideSenseStats();
    var _sm = guideState.senseModeForced || guideCurrentSenseMode(_ss);
    if (SENSE_MODE_DEFS[_sm]) senseMode = _sm;
  }
  var metaId = omniaMetaIdForExercise(rec.id) || rec.id;
  var meta = OMNIA_EXERCISE_META[metaId] || OMNIA_EXERCISE_META.clock;
  if (meta.open === 'soulmirror') {
    if (typeof _smOriginMode !== 'undefined') _smOriginMode = 'guide';
    switchMode('concentration');
    renderSoulMirrorTraits();
    showScreen('soulMirrorScreen');
    var breathTab = document.querySelector('.soul-tab[data-tab="breathing"]');
    if (breathTab) breathTab.click();
    return;
  }
  openExerciseSetup(meta.open);
}
