// ═══════════════════════════════════════
// VISUAL CONCENTRATION EXERCISE
// ═══════════════════════════════════════

var VIS_SHAPES = [
  // Basic shapes
  { shape:'circle',   color:'#e05555', label:'Red Circle'          },
  { shape:'triangle', color:'#55a855', label:'Green Triangle'       },
  { shape:'square',   color:'#d4c455', label:'Yellow Square'        },
  { shape:'circle',   color:'#5588d4', label:'Blue Circle'          },
  { shape:'triangle', color:'#d455a8', label:'Pink Triangle'        },
  { shape:'square',   color:'#d48855', label:'Orange Square'        },
  { shape:'circle',   color:'#a855d4', label:'Purple Circle'        },
  { shape:'triangle', color:'#55c8d4', label:'Cyan Triangle'        },
  { shape:'square',   color:'#d45555', label:'Red Square'           },
  { shape:'circle',   color:'#55d488', label:'Mint Circle'          },
  { shape:'circle',   color:'#ffffff', label:'White Circle'         },
  { shape:'square',   color:'#ffffff', label:'White Square'         },
  { shape:'triangle', color:'#ffffff', label:'White Triangle'       },
  { shape:'circle',   color:'#8855d4', label:'Indigo Circle'        },
  { shape:'square',   color:'#55c8c8', label:'Teal Square'          },
  // Lines & symbols
  { shape:'vline',    color:'#e05555', label:'Red Vertical Line'    },
  { shape:'hline',    color:'#55a855', label:'Green Horiz. Line'    },
  { shape:'vline',    color:'#5588d4', label:'Blue Vertical Line'   },
  { shape:'hline',    color:'#d4c455', label:'Yellow Horiz. Line'   },
  { shape:'plus',     color:'#e05555', label:'Red Cross'            },
  { shape:'plus',     color:'#55a855', label:'Green Cross'          },
  { shape:'plus',     color:'#5588d4', label:'Blue Cross'           },
  { shape:'times',    color:'#a855d4', label:'Purple X'             },
  { shape:'times',    color:'#d48855', label:'Orange X'             },
  { shape:'minus',    color:'#5588d4', label:'Blue Line'            },
  { shape:'minus',    color:'#d4c455', label:'Yellow Line'          },
  { shape:'hash',     color:'#55a855', label:'Green Grid'           },
  { shape:'hash',     color:'#d455a8', label:'Pink Grid'            },
  { shape:'percent',  color:'#d4c455', label:'Yellow Percent'       },
  { shape:'percent',  color:'#a855d4', label:'Purple Percent'       },
  // Pentagrams & esoteric
  { shape:'pentagram',color:'#e05555', label:'Red Pentagram'        },
  { shape:'pentagram',color:'#5588d4', label:'Blue Pentagram'       },
  { shape:'pentagram',color:'#d4c455', label:'Yellow Pentagram'     },
  { shape:'pentagram',color:'#55a855', label:'Green Pentagram'      },
  { shape:'pentagram',color:'#a855d4', label:'Violet Pentagram'     },
  { shape:'hexagram', color:'#d4c455', label:'Yellow Hexagram'      },
  { shape:'hexagram', color:'#5588d4', label:'Blue Hexagram'        },
  { shape:'hexagram', color:'#e05555', label:'Red Hexagram'         },
  { shape:'diamond',  color:'#e05555', label:'Red Diamond'          },
  { shape:'diamond',  color:'#5588d4', label:'Blue Diamond'         },
  { shape:'diamond',  color:'#d4c455', label:'Yellow Diamond'       },
];

// Complex objects — SVG-drawn real-world items
var VIS_COMPLEX = [
  { shape:'svg_candle',    label:'Candle'          },
  { shape:'svg_rose',      label:'Rose'            },
  { shape:'svg_eye',       label:'Eye'             },
  { shape:'svg_flame',     label:'Flame'           },
  { shape:'svg_moon',      label:'Crescent Moon'   },
  { shape:'svg_sun',       label:'Sun'             },
  { shape:'svg_star',      label:'Star'            },
  { shape:'svg_key',       label:'Key'             },
  { shape:'svg_hourglass', label:'Hourglass'       },
  { shape:'svg_compass',   label:'Compass'         },
  { shape:'svg_tree',      label:'Tree'            },
  { shape:'svg_mountain',  label:'Mountain'        },
  { shape:'svg_wave',      label:'Wave'            },
  { shape:'svg_crystal',   label:'Crystal'         },
  { shape:'svg_hand',      label:'Open Hand'       },
  { shape:'svg_spiral',    label:'Spiral'          },
  { shape:'svg_lotus',     label:'Lotus'           },
  { shape:'svg_anchor',    label:'Anchor'          },
  { shape:'svg_lantern',   label:'Lantern'         },
  { shape:'svg_chalice',   label:'Chalice'         },
  { shape:'svg_sphere',    label:'Sphere'          },
  { shape:'svg_infinity',  label:'Infinity'        },
  { shape:'svg_cross',     label:'Cross'           },
  { shape:'svg_crescent',  label:'Crescent & Star' },
  { shape:'svg_alchemy',   label:'Alchemical Sun'  },
  { shape:'svg_trident',   label:'Trident'         },
  { shape:'svg_ouroboros', label:'Ouroboros'       },
  { shape:'svg_vesica',    label:'Vesica Piscis'   },
];

var VIS_HOUSEHOLD = [
  { shape:'emoji', emoji:'🍎', label:'Apple'      },
  { shape:'emoji', emoji:'🍊', label:'Orange'     },
  { shape:'emoji', emoji:'🍋', label:'Lemon'      },
  { shape:'emoji', emoji:'🍇', label:'Grapes'     },
  { shape:'emoji', emoji:'🍓', label:'Strawberry' },
  { shape:'emoji', emoji:'🍌', label:'Banana'     },
  { shape:'emoji', emoji:'🥝', label:'Kiwi'       },
  { shape:'emoji', emoji:'🍑', label:'Peach'      },
  { shape:'emoji', emoji:'🥦', label:'Broccoli'   },
  { shape:'emoji', emoji:'🥕', label:'Carrot'     },
  { shape:'emoji', emoji:'🍄', label:'Mushroom'   },
  { shape:'emoji', emoji:'🌽', label:'Corn'       },
  { shape:'emoji', emoji:'🍴', label:'Fork'       },
  { shape:'emoji', emoji:'🥄', label:'Spoon'      },
  { shape:'emoji', emoji:'🔪', label:'Knife'      },
  { shape:'emoji', emoji:'☕', label:'Cup'        },
  { shape:'emoji', emoji:'🍵', label:'Tea Cup'    },
  { shape:'emoji', emoji:'🥛', label:'Glass'      },
  { shape:'emoji', emoji:'🪴', label:'Plant'      },
  { shape:'emoji', emoji:'📚', label:'Books'      },
  { shape:'emoji', emoji:'🕯️', label:'Candle'    },
  { shape:'emoji', emoji:'🪞', label:'Mirror'     },
  { shape:'emoji', emoji:'🪑', label:'Chair'      },
  { shape:'emoji', emoji:'🛋️', label:'Couch'     },
  { shape:'emoji', emoji:'🧲', label:'Magnet'     },
  { shape:'emoji', emoji:'🔑', label:'Key'        },
  { shape:'emoji', emoji:'⌚', label:'Watch'      },
  { shape:'emoji', emoji:'📿', label:'Beads'      },
  { shape:'emoji', emoji:'🪬', label:'Amulet'     },
  { shape:'emoji', emoji:'🕌', label:'Tower'      },
  { shape:'emoji', emoji:'🌙', label:'Moon'        },
  { shape:'emoji', emoji:'⭐', label:'Star'        },
  { shape:'emoji', emoji:'🌊', label:'Wave'        },
  { shape:'emoji', emoji:'🔥', label:'Flame'       },
  { shape:'emoji', emoji:'💎', label:'Diamond'     },
  { shape:'emoji', emoji:'🪨', label:'Stone'       },
  { shape:'emoji', emoji:'🌸', label:'Blossom'     },
  { shape:'emoji', emoji:'🍂', label:'Leaf'        },
  { shape:'emoji', emoji:'🪶', label:'Feather'     },
  { shape:'emoji', emoji:'🐚', label:'Shell'       },
];

// ── Custom Visualization Images ──────────────────────────
// Uploaded audio blobs live in IndexedDB (localStorage is too small for
// real-length tracks). Only lightweight metadata stays in localStorage so
// the synchronous sound-grid/label code keeps working unchanged.
var AUD_DB_NAME = 'presence_audio';
var AUD_DB_STORE = 'sounds';
var _audDbPromise = null;
function audDb() {
  if (_audDbPromise) return _audDbPromise;
  _audDbPromise = new Promise(function(resolve, reject) {
    if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    var req = indexedDB.open(AUD_DB_NAME, 1);
    req.onupgradeneeded = function() {
      var db = req.result;
      if (!db.objectStoreNames.contains(AUD_DB_STORE)) db.createObjectStore(AUD_DB_STORE);
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
  return _audDbPromise;
}
function audDbPut(id, blob) {
  return audDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(AUD_DB_STORE, 'readwrite');
      tx.objectStore(AUD_DB_STORE).put(blob, id);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { reject(tx.error); };
      tx.onabort = function() { reject(tx.error || new Error('aborted')); };
    });
  });
}
function audDbGet(id) {
  return audDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(AUD_DB_STORE, 'readonly');
      var rq = tx.objectStore(AUD_DB_STORE).get(id);
      rq.onsuccess = function() { resolve(rq.result || null); };
      rq.onerror = function() { reject(rq.error); };
    });
  });
}
function audDbDelete(id) {
  return audDb().then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction(AUD_DB_STORE, 'readwrite');
      tx.objectStore(AUD_DB_STORE).delete(id);
      tx.oncomplete = function() { resolve(); };
      tx.onerror = function() { resolve(); };
    });
  }).catch(function() {});
}
function loadCustomAudSounds() {
  try { var s = localStorage.getItem('presence_custom_aud'); return s ? JSON.parse(s) : []; } catch(e) { return []; }
}
function saveCustomAudSounds(sounds) {
  try { localStorage.setItem('presence_custom_aud', JSON.stringify(sounds)); } catch(e) { showToast('Storage full — try deleting some sounds.', 3000); }
}
function deleteCustomAudSound(id) {
  saveCustomAudSounds(loadCustomAudSounds().filter(function(s) { return s.id !== id; }));
  audDbDelete(id);
  renderCustomAudSoundList();
  if (document.getElementById('soundGrid')) buildSoundGrid();
}
function renderCustomAudSoundList() {
  var list = document.getElementById('customAudSoundList');
  if (!list) return;
  var sounds = loadCustomAudSounds();
  // Prune stale YouTube entries from the dropped YouTube feature.
  var cleaned = sounds.filter(function(s) { return s.kind !== 'youtube'; });
  if (cleaned.length !== sounds.length) { saveCustomAudSounds(cleaned); sounds = cleaned; }
  if (!sounds.length) {
    list.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:4px 0;opacity:.6;">No sounds uploaded yet.</div>';
    return;
  }
  list.innerHTML = sounds.map(function(s) {
    var icon = s.kind === 'url' ? '<span style="color:#6eb8a4;">&#128279;</span>' : '&#127911;';
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'
      + '<span style="font-size:18px;flex-shrink:0;">' + icon + '</span>'
      + '<span style="flex:1;font-size:10px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(s.name) + '</span>'
      + '<button onclick="deleteCustomAudSound(\'' + s.id + '\')" style="background:none;border:none;color:var(--muted);font-size:14px;cursor:pointer;padding:4px 6px;flex-shrink:0;">✕</button>'
      + '</div>';
  }).join('');
}
function getAudSoundLabel(id) {
  var s = SOUNDS.find(function(x) { return x.id === id; });
  if (s) return s.label;
  var c = loadCustomAudSounds().find(function(x) { return x.id === id; });
  return c ? c.name : id;
}
function loadCustomVisImages() {
  try { var s = localStorage.getItem('presence_custom_vis'); return s ? JSON.parse(s) : []; } catch(e) { return []; }
}
function saveCustomVisImages(imgs) {
  try { localStorage.setItem('presence_custom_vis', JSON.stringify(imgs)); } catch(e) { showToast('Storage full — try deleting some images.', 3000); }
}
function deleteCustomVisImage(id) {
  saveCustomVisImages(loadCustomVisImages().filter(function(img) { return img.id !== id; }));
  renderCustomVisImageList();
}
function renderCustomVisImageList() {
  var list = document.getElementById('customVisImageList');
  if (!list) return;
  var imgs = loadCustomVisImages();
  if (!imgs.length) {
    list.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:4px 0;opacity:.6;">No images uploaded yet.</div>';
    return;
  }
  list.innerHTML = imgs.map(function(img) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'
      + '<img src="' + img.dataUrl + '" style="width:40px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0;">'
      + '<span style="flex:1;font-size:10px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(img.name) + '</span>'
      + '<button onclick="deleteCustomVisImage(\'' + img.id + '\')" style="background:none;border:none;color:var(--muted);font-size:14px;cursor:pointer;padding:4px 6px;flex-shrink:0;">✕</button>'
      + '</div>';
  }).join('');
}
// Resize image to max 800px before storing (keeps localStorage manageable)
function resizeImageForStorage(dataUrl, callback) {
  var img = new Image();
  img.onload = function() {
    var max = 800, w = img.width, h = img.height;
    if (w > max || h > max) {
      var scale = max / Math.max(w, h);
      w = Math.round(w * scale); h = Math.round(h * scale);
    }
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.src = dataUrl;
}

var VIS_REALLIFE = [
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/Candle_flame.JPG?width=600',                label:'Candle'          },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/Red_rose.jpg?width=600',                    label:'Red Rose'        },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/Red_Delicious_Apple_2021.jpg?width=600',                                       label:'Apple'           },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/Fork_(all_alone).jpg?width=600',                                               label:'Fork'            },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/Marlboro_red_pack_front_NZ.jpg?width=600',                                     label:'Cigarette Pack'  },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/A_small_cup_of_coffee.JPG?width=600',       label:'Coffee Cup'      },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/Matchbox.jpg?width=600',                    label:'Matchbox'        },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/Sharp_pencil_25.jpg?width=600',             label:'Pencil'          },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/Orange-Whole-%26-Split.jpg?width=600',      label:'Orange'          },
  { shape:'photo', src:'https://commons.wikimedia.org/wiki/Special:FilePath/SpoonOnTable.jpg?width=600',               label:'Spoon'           },
  { shape:'photo', src:'notepad.jpg',       label:'Notepad'         },
  { shape:'photo', src:'ghost_sticker.jpg', label:'Ghost Sticker'   },
];

var VIS_OBJECTS = VIS_SHAPES; // default
var currentVisCategory = 'shapes';

var VIS_OBJECTS = [
  { shape:'circle',   color:'#e05555', label:'Red Circle'       },
  { shape:'triangle', color:'#55a855', label:'Green Triangle'    },
  { shape:'square',   color:'#d4c455', label:'Yellow Square'     },
  { shape:'circle',   color:'#5588d4', label:'Blue Circle'       },
  { shape:'triangle', color:'#d455a8', label:'Pink Triangle'     },
  { shape:'square',   color:'#d48855', label:'Orange Square'     },
  { shape:'circle',   color:'#a855d4', label:'Purple Circle'     },
  { shape:'triangle', color:'#55c8d4', label:'Cyan Triangle'     },
  { shape:'square',   color:'#d45555', label:'Red Square'        },
  { shape:'circle',   color:'#55d488', label:'Mint Circle'       },
  { shape:'vline',    color:'#e05555', label:'Red Vertical Line' },
  { shape:'hline',    color:'#55a855', label:'Green Horiz. Line' },
  { shape:'vline',    color:'#5588d4', label:'Blue Vertical Line'},
  { shape:'hline',    color:'#d4c455', label:'Yellow Horiz. Line'},
  { shape:'plus',     color:'#e05555', label:'Red Plus'          },
  { shape:'plus',     color:'#55a855', label:'Green Plus'        },
  { shape:'minus',    color:'#5588d4', label:'Blue Minus'        },
  { shape:'minus',    color:'#d4c455', label:'Yellow Minus'      },
  { shape:'times',    color:'#a855d4', label:'Purple Times'      },
  { shape:'times',    color:'#d48855', label:'Orange Times'      },
  { shape:'divide',   color:'#e05555', label:'Red Divide'        },
  { shape:'divide',   color:'#55c8d4', label:'Cyan Divide'       },
  { shape:'hash',     color:'#55a855', label:'Green Hash'        },
  { shape:'hash',     color:'#d455a8', label:'Pink Hash'         },
  { shape:'percent',  color:'#d4c455', label:'Yellow Percent'    },
  { shape:'percent',  color:'#a855d4', label:'Purple Percent'    },
];

var currentVisObject = null;
var visSessionStartTime = null;  // start of entire session
var visRepStartTime = null;      // start of current rep
var visOpenEyesMode = false;     // open eyes vs closed eyes mode
var visTimerHandle = null;
var visObjFadeTimeout = null;
var visReps = [];                // array of {seconds, object}
var visTotalXP = 0;
var visRepActive = false;        // true only when user has closed eyes and started a rep

function renderComplexVisObject(obj, s) {
  var c = '#d4b08e'; // warm default color
  var h = s/2;
  var svgs = {
    svg_rose: '<circle cx="'+h+'" cy="'+h+'" r="'+(s*0.14)+'" fill="'+c+'"/><circle cx="'+h+'" cy="'+(h-s*0.22)+'" r="'+(s*0.18)+'" fill="'+c+'" opacity=".7"/><circle cx="'+(h-s*0.18)+'" cy="'+(h-s*0.12)+'" r="'+(s*0.15)+'" fill="'+c+'" opacity=".65"/><circle cx="'+(h+s*0.18)+'" cy="'+(h-s*0.12)+'" r="'+(s*0.15)+'" fill="'+c+'" opacity=".65"/><circle cx="'+(h+s*0.18)+'" cy="'+(h+s*0.08)+'" r="'+(s*0.13)+'" fill="'+c+'" opacity=".6"/><circle cx="'+(h-s*0.18)+'" cy="'+(h+s*0.08)+'" r="'+(s*0.13)+'" fill="'+c+'" opacity=".6"/><line x1="'+h+'" y1="'+(h+s*0.14)+'" x2="'+h+'" y2="'+(h+s*0.42)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/>',
    svg_candle: '<rect x="'+(h-s*0.07)+'" y="'+(h-s*0.25)+'" width="'+(s*0.14)+'" height="'+(s*0.35)+'" rx="'+(s*0.02)+'" fill="'+c+'"/><ellipse cx="'+h+'" cy="'+(h-s*0.25)+'" rx="'+(s*0.07)+'" ry="'+(s*0.03)+'" fill="'+c+'" opacity=".5"/><path d="M'+h+','+(h-s*0.28)+' Q'+(h+s*0.06)+','+(h-s*0.38)+' '+h+','+(h-s*0.42)+' Q'+(h-s*0.06)+','+(h-s*0.38)+' '+h+','+(h-s*0.28)+'z" fill="#f5c842"/>',
    svg_flame: '<path d="M'+h+','+(h+s*0.32)+' Q'+(h-s*0.28)+','+(h+s*0.1)+' '+(h-s*0.18)+','+(h-s*0.05)+' Q'+(h-s*0.08)+','+(h-s*0.3)+' '+h+','+(h-s*0.38)+' Q'+(h+s*0.08)+','+(h-s*0.3)+' '+(h+s*0.18)+','+(h-s*0.05)+' Q'+(h+s*0.28)+','+(h+s*0.1)+' '+h+','+(h+s*0.32)+'z" fill="#e05555"/><path d="M'+h+','+(h+s*0.18)+' Q'+(h-s*0.12)+','+(h+s*0.05)+' '+h+','+(h-s*0.18)+' Q'+(h+s*0.12)+','+(h+s*0.05)+' '+h+','+(h+s*0.18)+'z" fill="#f5c842"/>',
    svg_eye: '<ellipse cx="'+h+'" cy="'+h+'" rx="'+(s*0.38)+'" ry="'+(s*0.22)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.03)+'"/><circle cx="'+h+'" cy="'+h+'" r="'+(s*0.14)+'" fill="'+c+'"/><circle cx="'+h+'" cy="'+h+'" r="'+(s*0.07)+'" fill="var(--bg)"/>',
    svg_moon: '<path d="M'+(h+s*0.08)+','+(h-s*0.35)+' A'+(s*0.35)+','+(s*0.35)+' 0 1 0 '+(h+s*0.08)+','+(h+s*0.35)+' A'+(s*0.22)+','+(s*0.22)+' 0 1 1 '+(h+s*0.08)+','+(h-s*0.35)+'z" fill="'+c+'"/>',
    svg_sun: '<circle cx="'+h+'" cy="'+h+'" r="'+(s*0.2)+'" fill="'+c+'"/>'+(function(){var rays='';for(var i=0;i<12;i++){var a=i*30*Math.PI/180;var x1=h+Math.cos(a)*s*0.25;var y1=h+Math.sin(a)*s*0.25;var x2=h+Math.cos(a)*s*0.38;var y2=h+Math.sin(a)*s*0.38;rays+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(s*0.025)+'" stroke-linecap="round"/>';}return rays;})(),
    svg_star: (function(){var pts='';for(var i=0;i<5;i++){var ao=i*72-90;var ai=ao+36;var ox=h+Math.cos(ao*Math.PI/180)*s*0.38;var oy=h+Math.sin(ao*Math.PI/180)*s*0.38;var ix=h+Math.cos(ai*Math.PI/180)*s*0.16;var iy=h+Math.sin(ai*Math.PI/180)*s*0.16;pts+=ox+','+oy+' '+ix+','+iy+' ';}return '<polygon points="'+pts+'" fill="'+c+'"/>';}()),
    svg_key: '<rect x="'+(h-s*0.04)+'" y="'+(h-s*0.05)+'" width="'+(s*0.3)+'" height="'+(s*0.08)+'" rx="'+(s*0.02)+'" fill="'+c+'"/><rect x="'+(h+s*0.12)+'" y="'+(h-s*0.05)+'" width="'+(s*0.06)+'" height="'+(s*0.14)+'" rx="'+(s*0.01)+'" fill="'+c+'"/><rect x="'+(h+s*0.2)+'" y="'+(h-s*0.05)+'" width="'+(s*0.06)+'" height="'+(s*0.1)+'" rx="'+(s*0.01)+'" fill="'+c+'"/><circle cx="'+(h-s*0.16)+'" cy="'+h+'" r="'+(s*0.16)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.06)+'"/>',
    svg_hourglass: '<path d="M'+(h-s*0.28)+','+(h-s*0.35)+' L'+(h+s*0.28)+','+(h-s*0.35)+' L'+h+','+(h)+' L'+(h+s*0.28)+','+(h+s*0.35)+' L'+(h-s*0.28)+','+(h+s*0.35)+' L'+h+','+h+'z" fill="'+c+'" opacity=".7"/><line x1="'+(h-s*0.28)+'" y1="'+(h-s*0.35)+'" x2="'+(h+s*0.28)+'" y2="'+(h-s*0.35)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><line x1="'+(h-s*0.28)+'" y1="'+(h+s*0.35)+'" x2="'+(h+s*0.28)+'" y2="'+(h+s*0.35)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/>',
    svg_compass: '<circle cx="'+h+'" cy="'+h+'" r="'+(s*0.38)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.025)+'"/><polygon points="'+h+','+(h-s*0.3)+' '+(h+s*0.06)+','+h+' '+h+','+(h+s*0.1)+' '+(h-s*0.06)+','+h+'" fill="'+c+'"/><polygon points="'+h+','+(h+s*0.3)+' '+(h+s*0.06)+','+h+' '+h+','+(h-s*0.1)+' '+(h-s*0.06)+','+h+'" fill="'+c+'" opacity=".35"/>',
    svg_tree: '<polygon points="'+h+','+(h-s*0.38)+' '+(h-s*0.3)+','+(h+s*0.05)+' '+(h+s*0.3)+','+(h+s*0.05)+'" fill="'+c+'"/><polygon points="'+h+','+(h-s*0.22)+' '+(h-s*0.34)+','+(h+s*0.16)+' '+(h+s*0.34)+','+(h+s*0.16)+'" fill="'+c+'"/><rect x="'+(h-s*0.07)+'" y="'+(h+s*0.15)+'" width="'+(s*0.14)+'" height="'+(s*0.18)+'" fill="'+c+'" opacity=".7"/>',
    svg_mountain: '<polygon points="'+h+','+(h-s*0.36)+' '+(h-s*0.38)+','+(h+s*0.3)+' '+(h+s*0.38)+','+(h+s*0.3)+'" fill="'+c+'" opacity=".55"/><polygon points="'+(h-s*0.14)+','+(h-s*0.08)+' '+(h-s*0.34)+','+(h+s*0.3)+' '+h+','+(h+s*0.3)+'" fill="'+c+'"/>',
    svg_wave: (function(){var p='M'+(h-s*0.42)+','+h;for(var i=0;i<=8;i++){var x=(h-s*0.42)+i*s*0.105;var y=h+Math.sin(i*Math.PI/2)*s*0.18;p+=(i===0?' ':'L')+x+','+y;}return '<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.04)+'" stroke-linecap="round"/>';}()),
    svg_crystal: '<polygon points="'+h+','+(h-s*0.38)+' '+(h+s*0.22)+','+(h-s*0.08)+' '+(h+s*0.22)+','+(h+s*0.22)+' '+h+','+(h+s*0.38)+' '+(h-s*0.22)+','+(h+s*0.22)+' '+(h-s*0.22)+','+(h-s*0.08)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.025)+'"/><line x1="'+h+'" y1="'+(h-s*0.38)+'" x2="'+h+'" y2="'+(h+s*0.38)+'" stroke="'+c+'" stroke-width="'+(s*0.015)+'" opacity=".4"/><line x1="'+(h-s*0.22)+'" y1="'+(h-s*0.08)+'" x2="'+(h+s*0.22)+'" y2="'+(h+s*0.22)+'" stroke="'+c+'" stroke-width="'+(s*0.015)+'" opacity=".4"/>',
    svg_hand: '<path d="M'+(h)+','+(h+s*0.35)+' L'+(h)+','+(h-s*0.1)+' Q'+(h)+','+(h-s*0.18)+' '+(h+s*0.06)+','+(h-s*0.18)+' Q'+(h+s*0.12)+','+(h-s*0.18)+' '+(h+s*0.12)+','+(h-s*0.1)+' L'+(h+s*0.12)+','+(h-s*0.25)+' Q'+(h+s*0.12)+','+(h-s*0.33)+' '+(h+s*0.18)+','+(h-s*0.33)+' Q'+(h+s*0.24)+','+(h-s*0.33)+' '+(h+s*0.24)+','+(h-s*0.25)+' L'+(h+s*0.24)+','+(h-s*0.1)+' L'+(h+s*0.3)+','+(h-s*0.1)+' Q'+(h+s*0.3)+','+(h-s*0.25)+' '+(h+s*0.24)+','+(h-s*0.28)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.04)+'" stroke-linejoin="round"/><line x1="'+(h-s*0.12)+'" y1="'+(h)+'" x2="'+(h-s*0.12)+'" y2="'+(h-s*0.22)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'" stroke-linecap="round"/>',
    svg_spiral: (function(){var p='';var steps=80;for(var i=0;i<=steps;i++){var a=i*0.22;var r=s*0.04+a*s*0.006;var x=h+Math.cos(a)*r;var y=h+Math.sin(a)*r;p+=(i===0?'M':'L')+x.toFixed(1)+','+y.toFixed(1);}return '<path d="'+p+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.025)+'" stroke-linecap="round"/>';}()),
    svg_lotus: (function(){var petals='';for(var i=0;i<8;i++){var a=i*45*Math.PI/180;var x1=h+Math.cos(a)*s*0.12;var y1=h+Math.sin(a)*s*0.12;var x2=h+Math.cos(a)*s*0.36;var y2=h+Math.sin(a)*s*0.36;var cx1=h+Math.cos(a-0.5)*s*0.3;var cy1=h+Math.sin(a-0.5)*s*0.3;var cx2=h+Math.cos(a+0.5)*s*0.3;var cy2=h+Math.sin(a+0.5)*s*0.3;petals+='<path d="M'+x1+','+y1+' Q'+cx1+','+cy1+' '+x2+','+y2+' Q'+cx2+','+cy2+' '+x1+','+y1+'z" fill="'+c+'" opacity=".7"/>';}return petals+'<circle cx="'+h+'" cy="'+h+'" r="'+(s*0.1)+'" fill="'+c+'"/>';}()),
    svg_anchor: '<circle cx="'+h+'" cy="'+(h-s*0.22)+'" r="'+(s*0.1)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><line x1="'+h+'" y1="'+(h-s*0.12)+'" x2="'+h+'" y2="'+(h+s*0.35)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><line x1="'+(h-s*0.24)+'" y1="'+(h-s*0.22)+'" x2="'+(h+s*0.24)+'" y2="'+(h-s*0.22)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><path d="M'+(h-s*0.22)+','+(h+s*0.22)+' Q'+(h-s*0.3)+','+(h+s*0.35)+' '+h+','+(h+s*0.35)+' Q'+(h+s*0.3)+','+(h+s*0.35)+' '+(h+s*0.22)+','+(h+s*0.22)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/>',
    svg_lantern: '<rect x="'+(h-s*0.18)+'" y="'+(h-s*0.22)+'" width="'+(s*0.36)+'" height="'+(s*0.38)+'" rx="'+(s*0.04)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.03)+'"/><line x1="'+h+'" y1="'+(h-s*0.38)+'" x2="'+h+'" y2="'+(h-s*0.22)+'" stroke="'+c+'" stroke-width="'+(s*0.03)+'"/><line x1="'+(h-s*0.18)+'" y1="'+(h-s*0.1)+'" x2="'+(h+s*0.18)+'" y2="'+(h-s*0.1)+'" stroke="'+c+'" stroke-width="'+(s*0.025)+'" opacity=".5"/><line x1="'+(h-s*0.18)+'" y1="'+h+'" x2="'+(h+s*0.18)+'" y2="'+h+'" stroke="'+c+'" stroke-width="'+(s*0.025)+'" opacity=".5"/><ellipse cx="'+h+'" cy="'+(h-s*0.02)+'" rx="'+(s*0.08)+'" ry="'+(s*0.1)+'" fill="'+c+'" opacity=".6"/><path d="M'+(h-s*0.08)+','+(h+s*0.16)+' Q'+h+','+(h+s*0.28)+' '+(h+s*0.08)+','+(h+s*0.16)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.03)+'"/>',
    svg_chalice: '<path d="M'+(h-s*0.28)+','+(h-s*0.3)+' Q'+(h-s*0.32)+','+(h+s*0.02)+' '+h+','+(h+s*0.1)+' Q'+(h+s*0.32)+','+(h+s*0.02)+' '+(h+s*0.28)+','+(h-s*0.3)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><line x1="'+h+'" y1="'+(h+s*0.1)+'" x2="'+h+'" y2="'+(h+s*0.3)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><line x1="'+(h-s*0.2)+'" y1="'+(h+s*0.3)+'" x2="'+(h+s*0.2)+'" y2="'+(h+s*0.3)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><line x1="'+(h-s*0.28)+'" y1="'+(h-s*0.3)+'" x2="'+(h+s*0.28)+'" y2="'+(h-s*0.3)+'" stroke="'+c+'" stroke-width="'+(s*0.03)+'" opacity=".6"/>',
    svg_sphere: '<circle cx="'+h+'" cy="'+h+'" r="'+(s*0.36)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.03)+'"/><ellipse cx="'+h+'" cy="'+h+'" rx="'+(s*0.36)+'" ry="'+(s*0.14)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.02)+'" opacity=".5"/><line x1="'+h+'" y1="'+(h-s*0.36)+'" x2="'+h+'" y2="'+(h+s*0.36)+'" stroke="'+c+'" stroke-width="'+(s*0.02)+'" opacity=".4"/>',
    svg_infinity: '<path d="M'+(h-s*0.02)+','+h+' C'+(h-s*0.1)+','+(h-s*0.2)+' '+(h-s*0.38)+','+(h-s*0.2)+' '+(h-s*0.38)+','+h+' C'+(h-s*0.38)+','+(h+s*0.2)+' '+(h-s*0.1)+','+(h+s*0.2)+' '+(h-s*0.02)+','+h+' C'+(h+s*0.1)+','+(h-s*0.2)+' '+(h+s*0.38)+','+(h-s*0.2)+' '+(h+s*0.38)+','+h+' C'+(h+s*0.38)+','+(h+s*0.2)+' '+(h+s*0.1)+','+(h+s*0.2)+' '+(h-s*0.02)+','+h+'z" fill="none" stroke="'+c+'" stroke-width="'+(s*0.05)+'"/>',
    svg_cross: '<line x1="'+h+'" y1="'+(h-s*0.38)+'" x2="'+h+'" y2="'+(h+s*0.38)+'" stroke="'+c+'" stroke-width="'+(s*0.09)+'" stroke-linecap="round"/><line x1="'+(h-s*0.3)+'" y1="'+(h-s*0.1)+'" x2="'+(h+s*0.3)+'" y2="'+(h-s*0.1)+'" stroke="'+c+'" stroke-width="'+(s*0.09)+'" stroke-linecap="round"/>',
    svg_crescent: '<path d="M'+h+','+(h-s*0.36)+' A'+(s*0.36)+','+(s*0.36)+' 0 1 0 '+h+','+(h+s*0.36)+' A'+(s*0.24)+','+(s*0.3)+' 0 1 1 '+h+','+(h-s*0.36)+'z" fill="'+c+'"/><polygon points="'+(h+s*0.2)+','+(h-s*0.3)+' '+(h+s*0.42)+','+h+' '+(h+s*0.2)+','+(h+s*0.3)+' '+(h+s*0.3)+','+h+'" fill="'+c+'"/>',
    svg_alchemy: '<circle cx="'+h+'" cy="'+h+'" r="'+(s*0.3)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.03)+'"/>'+(function(){var r='';for(var i=0;i<8;i++){var a=i*45*Math.PI/180;r+='<line x1="'+(h+Math.cos(a)*s*0.14)+'" y1="'+(h+Math.sin(a)*s*0.14)+'" x2="'+(h+Math.cos(a)*s*0.3)+'" y2="'+(h+Math.sin(a)*s*0.3)+'" stroke="'+c+'" stroke-width="'+(s*0.03)+'"/>';}return r;})()+'<circle cx="'+h+'" cy="'+h+'" r="'+(s*0.08)+'" fill="'+c+'"/>',
    svg_trident: '<line x1="'+h+'" y1="'+(h-s*0.38)+'" x2="'+h+'" y2="'+(h+s*0.38)+'" stroke="'+c+'" stroke-width="'+(s*0.05)+'"/><path d="M'+(h-s*0.22)+','+(h-s*0.38)+' C'+(h-s*0.22)+','+(h-s*0.18)+' '+(h-s*0.04)+','+(h-s*0.1)+' '+h+','+(h-s*0.1)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><path d="M'+(h+s*0.22)+','+(h-s*0.38)+' C'+(h+s*0.22)+','+(h-s*0.18)+' '+(h+s*0.04)+','+(h-s*0.1)+' '+h+','+(h-s*0.1)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><line x1="'+(h-s*0.22)+'" y1="'+(h-s*0.38)+'" x2="'+(h-s*0.22)+'" y2="'+(h-s*0.24)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/><line x1="'+(h+s*0.22)+'" y1="'+(h-s*0.38)+'" x2="'+(h+s*0.22)+'" y2="'+(h-s*0.24)+'" stroke="'+c+'" stroke-width="'+(s*0.04)+'"/>',
    svg_ouroboros: '<circle cx="'+h+'" cy="'+h+'" r="'+(s*0.32)+'" fill="none" stroke="'+c+'" stroke-width="'+(s*0.08)+'"/><path d="M'+(h)+','+(h-s*0.32)+' L'+(h+s*0.08)+','+(h-s*0.42)+' L'+(h-s*0.08)+','+(h-s*0.42)+'Z" fill="'+c+'"/>',
    svg_vesica: '<ellipse cx="'+(h-s*0.14)+'" cy="'+h+'" rx="'+(s*0.28)+'" ry="'+(s*0.38)+'" fill="'+c+'" fill-opacity=".12" stroke="'+c+'" stroke-width="'+(s*0.05)+'"/><ellipse cx="'+(h+s*0.14)+'" cy="'+h+'" rx="'+(s*0.28)+'" ry="'+(s*0.38)+'" fill="'+c+'" fill-opacity=".12" stroke="'+c+'" stroke-width="'+(s*0.05)+'"/>',
  };
  // Pentagram & hexagram in main shapes — handle here too
  if (obj.shape === 'pentagram') {
    var col = obj.color || c;
    var pts='';for(var i=0;i<5;i++){var ao=i*72-90;var ai=ao+36;pts+=(h+Math.cos(ao*Math.PI/180)*s*0.4)+','+(h+Math.sin(ao*Math.PI/180)*s*0.4)+' '+(h+Math.cos(ai*Math.PI/180)*s*0.16)+','+(h+Math.sin(ai*Math.PI/180)*s*0.16)+' ';}
    return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'"><polygon points="'+pts+'" fill="'+col+'"/></svg>';
  }
  if (obj.shape === 'hexagram') {
    var col = obj.color || c;
    var up='',dn='';for(var i=0;i<3;i++){var a=i*120-90;up+=(h+Math.cos(a*Math.PI/180)*s*0.4)+','+(h+Math.sin(a*Math.PI/180)*s*0.4)+' ';}for(var i=0;i<3;i++){var a=i*120+90;dn+=(h+Math.cos(a*Math.PI/180)*s*0.4)+','+(h+Math.sin(a*Math.PI/180)*s*0.4)+' ';}
    return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'"><polygon points="'+up+'" fill="none" stroke="'+col+'" stroke-width="'+(s*0.03)+'"/><polygon points="'+dn+'" fill="none" stroke="'+col+'" stroke-width="'+(s*0.03)+'"/></svg>';
  }
  if (obj.shape === 'diamond') {
    var col = obj.color || c;
    return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'"><polygon points="'+h+','+(h-s*0.4)+' '+(h+s*0.32)+','+h+' '+h+','+(h+s*0.4)+' '+(h-s*0.32)+','+h+'" fill="'+col+'"/></svg>';
  }
  var inner = svgs[obj.shape] || '';
  return '<svg viewBox="0 0 '+s+' '+s+'" width="'+s+'" height="'+s+'">'+inner+'</svg>';
}

// ── INTERMEDIATE VISUALIZATION ────────────────────────
window.visCurrentDifficulty = 'beginner';
window.visIntermediateExercise = null;

function startVisIntermediateSession(type) {
  window.visIntermediateExercise = type;
  // Pick an object to use as the base
  currentVisObject = pickVisObject();
  showScreen('visIntermediateScreen');
  renderVisIntermediateSession(type);
}

// ── SCENE AUDIO ENGINE ───────────────────────────────
var sceneAudioCtx = null;
var sceneAudioNodes = [];
var sceneAudioElement = null;

function stopSceneAudio() {
  if (sceneAudioElement) {
    try { sceneAudioElement.pause(); sceneAudioElement.currentTime = 0; } catch(e) {}
    sceneAudioElement = null;
  }
  sceneAudioNodes.forEach(function(n) { try { n.stop(); } catch(e) {} });
  sceneAudioNodes = [];
  if (sceneAudioCtx) { try { sceneAudioCtx.close(); } catch(e) {} sceneAudioCtx = null; }
}

function startSceneAudio(soundType, scene) {
  stopSceneAudio();
  try {
    if (scene && scene.audio) {
      sceneAudioElement = document.getElementById('multiSenseAudio') || new Audio(scene.audio);
      sceneAudioElement.loop = true;
      sceneAudioElement.volume = scene.volume || 0.55;
      var playPromise = sceneAudioElement.play();
      if (playPromise && playPromise.catch) playPromise.catch(function() {});
      return;
    }

    sceneAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var ctx = sceneAudioCtx;
    var master = ctx.createGain();
    master.gain.setValueAtTime(0.18, ctx.currentTime);
    master.connect(ctx.destination);

    if (soundType === 'clock') {
      function tick(time, isPrimary) {
        var buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < d.length; i++) {
          var t = i / ctx.sampleRate;
          d[i] = Math.sin(2 * Math.PI * (isPrimary ? 380 : 300) * t) * Math.exp(-t * 60) * 0.8;
        }
        var src = ctx.createBufferSource(); src.buffer = buf;
        var g = ctx.createGain(); g.gain.setValueAtTime(1, time);
        src.connect(g); g.connect(master); src.start(time);
        sceneAudioNodes.push(src);
      }
      var now = ctx.currentTime + 0.3;
      for (var i = 0; i < 120; i++) tick(now + i * 0.9, i % 2 === 0);

    } else if (soundType === 'fire') {
      var buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 800; filt.Q.value = 0.5;
      var filt2 = ctx.createBiquadFilter(); filt2.type = 'lowpass'; filt2.frequency.value = 1200;
      src.connect(filt); filt.connect(filt2); filt2.connect(master); src.start(); sceneAudioNodes.push(src);
      function pop(time) {
        var pb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
        var pd = pb.getChannelData(0);
        for (var i = 0; i < pd.length; i++) pd[i] = (Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*0.005));
        var ps = ctx.createBufferSource(); ps.buffer = pb;
        var pg = ctx.createGain(); pg.gain.setValueAtTime(0.6, time);
        ps.connect(pg); pg.connect(master); ps.start(time); sceneAudioNodes.push(ps);
      }
      var now = ctx.currentTime + 0.5;
      for (var i = 0; i < 40; i++) { now += 0.8 + Math.random() * 3.5; pop(now); }

    } else if (soundType === 'rain') {
      var buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      var d = buf.getChannelData(0);
      var b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (var i = 0; i < d.length; i++) {
        var w = Math.random()*2-1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
      }
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = 600;
      src.connect(filt); filt.connect(master); src.start(); sceneAudioNodes.push(src);

    } else if (soundType === 'water') {
      var buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random()*2-1)*0.3;
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var filt = ctx.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2000; filt.Q.value = 0.3;
      src.connect(filt); filt.connect(master); src.start(); sceneAudioNodes.push(src);

    } else if (soundType === 'bell') {
      function bellTone(freq, amp, decay, time) {
        var osc = ctx.createOscillator(); var g = ctx.createGain();
        osc.frequency.setValueAtTime(freq, time); osc.type = 'sine';
        g.gain.setValueAtTime(amp, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + decay);
        osc.connect(g); g.connect(master); osc.start(time); osc.stop(time + decay);
        sceneAudioNodes.push(osc);
      }
      var now = ctx.currentTime + 0.4;
      function ring(t) { bellTone(220,0.4,8,t); bellTone(440,0.25,6,t); bellTone(660,0.15,4,t); bellTone(880,0.08,3,t); }
      ring(now); ring(now+12); ring(now+26); ring(now+42);

    } else {
      // Near-silence: very faint hum
      var osc = ctx.createOscillator(); var g = ctx.createGain();
      osc.frequency.value = 60; osc.type = 'sine';
      g.gain.setValueAtTime(0.012, ctx.currentTime);
      osc.connect(g); g.connect(master); osc.start(); sceneAudioNodes.push(osc);
    }
  } catch(e) { console.warn('Scene audio failed:', e); }
}

function getSceneIllustration(sceneId, size) {
  size = size || 220; var h = size / 2; var c = '#c8b49a';
  var illustrations = {
    grandfather_clock:
      '<rect x="'+(h-size*0.22)+'" y="'+(h-size*0.44)+'" width="'+(size*0.44)+'" height="'+(size*0.88)+'" rx="'+(size*0.03)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.025)+'"/>'
      +'<rect x="'+(h-size*0.16)+'" y="'+(h-size*0.38)+'" width="'+(size*0.32)+'" height="'+(size*0.28)+'" rx="'+(size*0.02)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.018)+'"/>'
      +'<circle cx="'+h+'" cy="'+(h-size*0.24)+'" r="'+(size*0.11)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.018)+'"/>'
      +'<line x1="'+h+'" y1="'+(h-size*0.24)+'" x2="'+h+'" y2="'+(h-size*0.35)+'" stroke="'+c+'" stroke-width="'+(size*0.022)+'" stroke-linecap="round"/>'
      +'<line x1="'+h+'" y1="'+(h-size*0.24)+'" x2="'+(h+size*0.07)+'" y2="'+(h-size*0.2)+'" stroke="'+c+'" stroke-width="'+(size*0.016)+'" stroke-linecap="round"/>'
      +'<ellipse cx="'+h+'" cy="'+(h+size*0.08)+'" rx="'+(size*0.04)+'" ry="'+(size*0.13)+'" fill="'+c+'" opacity=".7"/>'
      +'<rect x="'+(h-size*0.2)+'" y="'+(h+size*0.28)+'" width="'+(size*0.4)+'" height="'+(size*0.1)+'" rx="'+(size*0.02)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.018)+'"/>',
    candle_dark_room:
      '<rect x="'+(h-size*0.06)+'" y="'+(h-size*0.1)+'" width="'+(size*0.12)+'" height="'+(size*0.38)+'" rx="'+(size*0.015)+'" fill="'+c+'" opacity=".8"/>'
      +'<ellipse cx="'+h+'" cy="'+(h-size*0.1)+'" rx="'+(size*0.06)+'" ry="'+(size*0.025)+'" fill="'+c+'" opacity=".4"/>'
      +'<path d="M'+h+','+(h-size*0.13)+' Q'+(h+size*0.05)+','+(h-size*0.24)+' '+h+','+(h-size*0.3)+' Q'+(h-size*0.05)+','+(h-size*0.24)+' '+h+','+(h-size*0.13)+'z" fill="#f5c842"/>'
      +'<path d="M'+h+','+(h-size*0.15)+' Q'+(h+size*0.025)+','+(h-size*0.22)+' '+h+','+(h-size*0.26)+' Q'+(h-size*0.025)+','+(h-size*0.22)+' '+h+','+(h-size*0.15)+'z" fill="#fff" opacity=".6"/>'
      +'<ellipse cx="'+h+'" cy="'+(h+size*0.3)+'" rx="'+(size*0.3)+'" ry="'+(size*0.04)+'" fill="'+c+'" opacity=".15"/>'
      +'<rect x="'+(h-size*0.42)+'" y="'+(h+size*0.26)+'" width="'+(size*0.84)+'" height="'+(size*0.025)+'" fill="'+c+'" opacity=".3"/>',
    forest_stream:
      (function(){var s='<path d="M'+(h-size*0.42)+','+(h+size*0.15)+' Q'+(h-size*0.1)+','+(h+size*0.05)+' '+h+','+(h+size*0.15)+' Q'+(h+size*0.1)+','+(h+size*0.25)+' '+(h+size*0.42)+','+(h+size*0.12)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.03)+'" opacity=".6"/>';for(var i=0;i<5;i++){var x=h-size*0.35+i*size*0.17;var y=h+size*0.1+Math.sin(i*1.3)*size*0.04;s+='<ellipse cx="'+x+'" cy="'+y+'" rx="'+(size*0.07)+'" ry="'+(size*0.045)+'" fill="'+c+'" opacity="'+(0.35+i*0.04)+'"/>';}s+='<line x1="'+(h-size*0.18)+'" y1="'+(h-size*0.4)+'" x2="'+(h-size*0.1)+'" y2="'+(h+size*0.06)+'" stroke="'+c+'" stroke-width="'+(size*0.03)+'" opacity=".45"/><line x1="'+(h+size*0.14)+'" y1="'+(h-size*0.44)+'" x2="'+(h+size*0.08)+'" y2="'+(h+size*0.04)+'" stroke="'+c+'" stroke-width="'+(size*0.025)+'" opacity=".4"/>';return s;})(),
    iron_bell:
      '<line x1="'+(h-size*0.22)+'" y1="'+(h-size*0.42)+'" x2="'+(h+size*0.22)+'" y2="'+(h-size*0.42)+'" stroke="'+c+'" stroke-width="'+(size*0.035)+'" stroke-linecap="round"/>'
      +'<line x1="'+h+'" y1="'+(h-size*0.42)+'" x2="'+h+'" y2="'+(h-size*0.28)+'" stroke="'+c+'" stroke-width="'+(size*0.025)+'"/>'
      +'<path d="M'+(h-size*0.22)+','+(h-size*0.28)+' Q'+(h-size*0.3)+','+(h-size*0.05)+' '+(h-size*0.26)+','+(h+size*0.18)+' L'+(h+size*0.26)+','+(h+size*0.18)+' Q'+(h+size*0.3)+','+(h-size*0.05)+' '+(h+size*0.22)+','+(h-size*0.28)+'z" fill="none" stroke="'+c+'" stroke-width="'+(size*0.032)+'"/>'
      +'<line x1="'+(h-size*0.28)+'" y1="'+(h+size*0.18)+'" x2="'+(h+size*0.28)+'" y2="'+(h+size*0.18)+'" stroke="'+c+'" stroke-width="'+(size*0.032)+'" stroke-linecap="round"/>'
      +'<circle cx="'+h+'" cy="'+(h+size*0.24)+'" r="'+(size*0.04)+'" fill="'+c+'"/>'
      +'<line x1="'+h+'" y1="'+(h+size*0.18)+'" x2="'+h+'" y2="'+(h+size*0.24)+'" stroke="'+c+'" stroke-width="'+(size*0.022)+'"/>',
    stone_fireplace:
      '<rect x="'+(h-size*0.44)+'" y="'+(h-size*0.44)+'" width="'+(size*0.88)+'" height="'+(size*0.88)+'" rx="0" fill="none" stroke="'+c+'" stroke-width="'+(size*0.02)+'" opacity=".3"/>'
      +'<rect x="'+(h-size*0.3)+'" y="'+(h-size*0.1)+'" width="'+(size*0.6)+'" height="'+(size*0.54)+'" fill="'+c+'" opacity=".08"/>'
      +(function(){var s='';var cols=['#c04020','#d4762a','#e8b430','#d4762a','#c04020'];for(var i=0;i<5;i++){var x=h-size*0.24+i*size*0.12;var fh=size*(0.2+Math.sin(i*1.9)*0.07);s+='<path d="M'+x+','+(h+size*0.4)+' Q'+(x-size*0.035)+','+(h+size*0.4-fh*0.5)+' '+x+','+(h+size*0.4-fh)+' Q'+(x+size*0.035)+','+(h+size*0.4-fh*0.5)+' '+x+','+(h+size*0.4)+'z" fill="'+cols[i]+'" opacity=".8"/>';}return s;})()
      +'<rect x="'+(h-size*0.26)+'" y="'+(h+size*0.16)+'" width="'+(size*0.18)+'" height="'+(size*0.1)+'" rx="'+(size*0.01)+'" fill="'+c+'" opacity=".4"/>'
      +'<rect x="'+(h+size*0.04)+'" y="'+(h+size*0.18)+'" width="'+(size*0.2)+'" height="'+(size*0.08)+'" rx="'+(size*0.01)+'" fill="'+c+'" opacity=".35"/>',
    rain_on_window:
      '<rect x="'+(h-size*0.38)+'" y="'+(h-size*0.44)+'" width="'+(size*0.76)+'" height="'+(size*0.88)+'" rx="'+(size*0.02)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.025)+'"/>'
      +'<line x1="'+h+'" y1="'+(h-size*0.44)+'" x2="'+h+'" y2="'+(h+size*0.44)+'" stroke="'+c+'" stroke-width="'+(size*0.015)+'" opacity=".35"/>'
      +'<line x1="'+(h-size*0.38)+'" y1="'+h+'" x2="'+(h+size*0.38)+'" y2="'+h+'" stroke="'+c+'" stroke-width="'+(size*0.015)+'" opacity=".35"/>'
      +(function(){var s='';var drops=[[h-size*0.24,h-size*0.32,h-size*0.2,h-size*0.08],[h-size*0.04,h-size*0.4,h-size*0.07,h+size*0.08],[h+size*0.18,h-size*0.24,h+size*0.14,h+size*0.18],[h+size*0.28,h-size*0.36,h+size*0.24,h-size*0.02],[h-size*0.3,h-size*0.12,h-size*0.32,h+size*0.22],[h+size*0.06,h-size*0.18,h+size*0.03,h+size*0.3]];drops.forEach(function(d){s+='<path d="M'+d[0]+','+d[1]+' Q'+(d[0]+size*0.012)+','+(d[1]+size*0.05)+' '+d[2]+','+d[3]+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.013)+'" opacity=".55"/>';});return s;})(),
    singing_bowl:
      '<ellipse cx="'+h+'" cy="'+(h+size*0.18)+'" rx="'+(size*0.34)+'" ry="'+(size*0.1)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.03)+'"/>'
      +'<path d="M'+(h-size*0.34)+','+(h+size*0.18)+' Q'+(h-size*0.4)+','+(h-size*0.06)+' '+(h-size*0.28)+','+(h-size*0.2)+' Q'+(h-size*0.1)+','+(h-size*0.28)+' '+h+','+(h-size*0.28)+' Q'+(h+size*0.1)+','+(h-size*0.28)+' '+(h+size*0.28)+','+(h-size*0.2)+' Q'+(h+size*0.4)+','+(h-size*0.06)+' '+(h+size*0.34)+','+(h+size*0.18)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.03)+'"/>'
      +'<ellipse cx="'+h+'" cy="'+(h+size*0.26)+'" rx="'+(size*0.36)+'" ry="'+(size*0.06)+'" fill="'+c+'" opacity=".12"/>'
      +'<line x1="'+(h+size*0.36)+'" y1="'+(h+size*0.04)+'" x2="'+(h+size*0.48)+'" y2="'+(h-size*0.32)+'" stroke="'+c+'" stroke-width="'+(size*0.022)+'" stroke-linecap="round"/>',
    old_library:
      (function(){var s='';var cols=[0.28,0.35,0.25,0.38,0.3,0.32,0.26,0.36];for(var i=0;i<8;i++){var bx=h-size*0.44+i*size*0.12;var bh=size*(0.32+Math.sin(i*0.8)*0.06);s+='<rect x="'+bx+'" y="'+(h-size*0.44)+'" width="'+(size*0.1)+'" height="'+bh+'" rx="'+(size*0.008)+'" fill="'+c+'" opacity="'+(0.3+Math.sin(i*1.3)*0.2)+'"/>';}return s;})()
      +'<rect x="'+(h-size*0.24)+'" y="'+(h+size*0.04)+'" width="'+(size*0.48)+'" height="'+(size*0.34)+'" rx="'+(size*0.02)+'" fill="none" stroke="'+c+'" stroke-width="'+(size*0.02)+'" opacity=".5"/>'
      +'<circle cx="'+(h-size*0.06)+'" cy="'+(h+size*0.02)+'" r="'+(size*0.07)+'" fill="none" stroke="#d4b08e" stroke-width="'+(size*0.02)+'" opacity=".7"/>'
      +'<line x1="'+(h-size*0.06)+'" y1="'+(h-size*0.05)+'" x2="'+(h-size*0.06)+'" y2="'+(h+size*0.02)+'" stroke="#d4b08e" stroke-width="'+(size*0.018)+'" opacity=".7"/>',
  };
  var inner = illustrations[sceneId] || ('<text x="'+h+'" y="'+(h+size*0.2)+'" text-anchor="middle" font-size="'+(size*0.55)+'">'+(currentMultiSenseScene?currentMultiSenseScene.icon:'')+'</text>');
  return '<svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" style="overflow:visible;">'+inner+'</svg>';
}

// ── MULTI-SENSE SCENES ────────────────────────────────
var MULTI_SENSE_SCENES = [
  {id:'grandfather_clock',name:'Grandfather Clock',icon:'🕰',
   sight:'A tall dark mahogany case. Brass pendulum swinging behind the glass. Roman numerals on an ivory face. The hands are ornate, slightly tarnished.',
   sound_desc:'A steady resonant tick — not sharp but full. The tick and the tock are not the same. The tick is heavier. The whole room breathes with it.',
   touch:'The wood is smooth and slightly cool. The glass door has a small brass latch. The pendulum is heavier than expected.',
   smell:'Old wood, linseed oil, faint dust. A smell of permanence.',
   instruction:'Close your eyes. Build the clock completely. Then let it tick. Hold the sound and the image together without losing either.'},
  {id:'candle_dark_room',name:'Candle in a Dark Room',icon:'🕯',
   sight:'A single white candle on a wooden table. The flame is alive — it breathes, tilts, recovers. The light it casts is warm and circular. Everything beyond its reach is dark.',
   sound_desc:'Near-silence. A faint crackle from the wick. Occasionally the flame flickers and the crackle changes pitch. The silence around it has weight.',
   touch:'The wax is warm near the flame, cool further down. The table beneath your hand is solid. The air close to the flame is noticeably warmer.',
   smell:'Melting wax, a faint smokiness. The scent of something burning cleanly.',
   instruction:'Close your eyes. Light the candle in your mind. Hold the flame — its movement, its sound, its warmth. When it goes out, tap.'},
  {id:'forest_stream',name:'Forest Stream',icon:'🌿',
   sight:'A narrow stream between moss-covered stones. The water is clear and fast. Light filters through trees in shifting columns. The stones are dark with moisture.',
   sound_desc:'Constant moving water — not one sound but many. High notes over small stones, a lower murmur in deeper channels. Birds above. Wind in leaves.',
   touch:'Cold water over your hand. The stones are slick. The moss is soft and damp. The air carries moisture.',
   smell:'Earth, wet stone, green growing things. Something clean and ancient.',
   instruction:'Close your eyes. Step to the edge of the stream. Build the sound first, then the sight, then the cold. Hold all three.'},
  {id:'iron_bell',name:'Iron Bell',icon:'🔔',
   sight:'A large iron bell hanging from a wooden beam. The surface is dark grey, slightly pitted with age. A rope hangs from the clapper. The beam above is thick and old.',
   sound_desc:'A single strike fills the air and does not stop immediately. The tone blooms outward, sustains, then slowly diminishes. The silence after is different from the silence before.',
   touch:'Iron is cold and slightly rough. The bell is much heavier than it appears. After the strike, the vibration can be felt in a hand that touches it.',
   smell:'Old metal, old rope, the faint smell of the wood above.',
   instruction:'Close your eyes. Build the bell. Then strike it once in your mind. Hold the ringing as it fades. Tap when the sound is completely gone.'},
  {id:'stone_fireplace',name:'Stone Fireplace',icon:'🔥',
   sight:'A wide fireplace built of grey stone. A large fire, well established. The logs are split hardwood. The flames are complex: yellow at the tips, orange in the body, blue at the base.',
   sound_desc:'Crackling and popping as the wood expands. A deeper hiss from sap. Occasional loud snaps. Beneath all of it, a low roar you feel as much as hear.',
   touch:'Radiant heat on your face and hands. The stone surround is warm even at the sides. The floor in front is hot.',
   smell:'Wood smoke, burning sap, something sweet from the birch. Heat carries the smell forward.',
   instruction:'Close your eyes. Build the fire. Let it make sound. Feel the heat on your face. Hold the whole scene until it collapses.'},
  {id:'rain_on_window',name:'Rain on a Window',icon:'🌧',
   sight:'A single large window. Outside, steady rain. The drops hit the glass and run in irregular lines downward. The world beyond is grey and indistinct. You are dry, inside.',
   sound_desc:'Rain on glass is not uniform. Individual drops, streams, the soft roar of it collectively. Occasionally a heavier drop taps distinctly.',
   touch:'The glass is cold if you press your hand to it. The contrast with the warmth of the room is sharp.',
   smell:'Petrichor. The particular smell of rain arriving, then the smell of it ongoing. Something earthy and clean.',
   instruction:'Close your eyes. Stand at the window. Build the sound of rain first. Then see the drops. Hold inside and outside simultaneously.'},
  {id:'singing_bowl',name:'Tibetan Singing Bowl',icon:'🎵',
   sight:'A brass bowl resting on a folded cloth. The surface shows fine concentric lines from its making. A wooden striker rests beside it.',
   sound_desc:'When struck, a tone emerges and builds. Run the striker around the rim and the sound rises, sustains, becomes almost physical. Complex overtones appear above the fundamental.',
   touch:'The bowl is smooth and cool. When the tone sounds, it vibrates subtly under your fingers. The striker is light wood, slightly rough.',
   smell:'Old brass. The cloth beneath carries a faint incense smell from many years of use.',
   instruction:'Close your eyes. Build the bowl. Strike it once. Let the tone rise and sustain. Hold the sound, the vibration, and the image together until all three fade.'},
  {id:'old_library',name:'Old Library',icon:'📚',
   sight:'A room lined floor-to-ceiling with books. Dark wood shelves, a reading table, a lamp with a green glass shade. Afternoon light through tall windows. Dust visible in the light.',
   sound_desc:'Deep quiet. Occasionally the settling of the building. A clock somewhere, barely audible. The silence is active, not empty.',
   touch:'The leather of the chair is cool and smooth. The books are slightly rough. The table is solid oak.',
   smell:'Old paper. The particular smell of books aging — slightly sweet, slightly musty. Leather. Wood polish.',
   instruction:'Close your eyes. Enter the library. Hear the silence. Smell the books. Sit at the table and hold the entire room in your mind.'}
];

var currentMultiSenseScene = null;

var MULTI_SENSE_MEDIA = {
  grandfather_clock: {
    image: 'grandfather_clock.jpg',
    imagePage: '',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/f/ff/Grandfather_Clock_Ticking.ogg/Grandfather_Clock_Ticking.ogg.mp3',
    audioOgg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Grandfather_Clock_Ticking.ogg',
    audioPage: 'https://commons.wikimedia.org/wiki/File:Grandfather_Clock_Ticking.ogg',
    volume: 0.62
  },
  candle_dark_room: {
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Candle_flame.JPG?width=900',
    imagePage: 'https://commons.wikimedia.org/wiki/File:Candle_flame.JPG',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b1/Campfire_sound_ambience.ogg/Campfire_sound_ambience.ogg.mp3',
    audioOgg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Campfire_sound_ambience.ogg',
    audioPage: 'https://commons.wikimedia.org/wiki/File:Campfire_sound_ambience.ogg',
    volume: 0.22
  },
  forest_stream: {
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Forest_stream.jpg?width=900',
    imagePage: 'https://commons.wikimedia.org/wiki/File:Forest_stream.jpg',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/f/f2/Sound_Effects_-_The_sound_of_a_small_stream.ogg/Sound_Effects_-_The_sound_of_a_small_stream.ogg.mp3',
    audioOgg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sound_Effects_-_The_sound_of_a_small_stream.ogg',
    audioPage: 'https://commons.wikimedia.org/wiki/File:Sound_Effects_-_The_sound_of_a_small_stream.ogg',
    volume: 0.45
  },
  iron_bell: {
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Iron_bells.JPG?width=900',
    imagePage: 'https://commons.wikimedia.org/wiki/File:Iron_bells.JPG',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/2c/Striking_a_bell_15cm_large.ogg/Striking_a_bell_15cm_large.ogg.mp3',
    audioOgg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Striking_a_bell_15cm_large.ogg',
    audioPage: 'https://commons.wikimedia.org/wiki/File:Striking_a_bell_15cm_large.ogg',
    volume: 0.42
  },
  stone_fireplace: {
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Fireplace.jpg?width=900',
    imagePage: 'https://commons.wikimedia.org/wiki/File:Fireplace.jpg',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b1/Campfire_sound_ambience.ogg/Campfire_sound_ambience.ogg.mp3',
    audioOgg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Campfire_sound_ambience.ogg',
    audioPage: 'https://commons.wikimedia.org/wiki/File:Campfire_sound_ambience.ogg',
    volume: 0.42
  },
  rain_on_window: {
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rain_on_a_window.jpg?width=900',
    imagePage: 'https://commons.wikimedia.org/wiki/File:Rain_on_a_window.jpg',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/4/41/Rain_against_the_window.ogg/Rain_against_the_window.ogg.mp3',
    audioOgg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rain_against_the_window.ogg',
    audioPage: 'https://commons.wikimedia.org/wiki/File:Rain_against_the_window.ogg',
    volume: 0.5
  },
  singing_bowl: {
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tibetan_singing_bowl.jpg?width=900',
    imagePage: 'https://commons.wikimedia.org/wiki/File:Tibetan_singing_bowl.jpg',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/25/SingingBowl1.ogg/SingingBowl1.ogg.mp3',
    audioOgg: 'https://commons.wikimedia.org/wiki/Special:FilePath/SingingBowl1.ogg',
    audioPage: 'https://commons.wikimedia.org/wiki/File:SingingBowl1.ogg',
    volume: 0.48
  },
  old_library: {
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Austria_-_Admont_Abbey_Library_-_1277.jpg?width=900',
    imagePage: 'https://commons.wikimedia.org/wiki/File:Austria_-_Admont_Abbey_Library_-_1277.jpg',
    audio: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/5/56/Clock_ticking.ogg/Clock_ticking.ogg.mp3',
    audioOgg: 'https://commons.wikimedia.org/wiki/Special:FilePath/Clock_ticking.ogg',
    audioPage: 'https://commons.wikimedia.org/wiki/File:Clock_ticking.ogg',
    volume: 0.18
  }
};

MULTI_SENSE_SCENES.forEach(function(scene) {
  var media = MULTI_SENSE_MEDIA[scene.id];
  if (media) Object.assign(scene, media);
});

function pickMultiSenseScene() {
  var idx = Math.floor(Math.random() * MULTI_SENSE_SCENES.length);
  if (currentMultiSenseScene && MULTI_SENSE_SCENES.length > 1) {
    while (MULTI_SENSE_SCENES[idx].id === currentMultiSenseScene.id) {
      idx = Math.floor(Math.random() * MULTI_SENSE_SCENES.length);
    }
  }
  currentMultiSenseScene = MULTI_SENSE_SCENES[idx];
  return currentMultiSenseScene;
}

function escapeMediaText(value) {
  return String(value || '').replace(/[&<>"']/g, function(ch) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
  });
}

function renderMultiSenseMedia(scene) {
  var html = '<div class="multi-sense-media">';
  if (scene.image) {
    html += '<img class="multi-sense-photo" src="' + escapeMediaText(scene.image) + '" alt="' + escapeMediaText(scene.name) + ' reference photo" loading="lazy"/>';
  } else {
    html += '<div style="text-align:center;">' + getSceneIllustration(scene.id, 220) + '</div>';
  }
  if (scene.audio) {
    html += '<audio class="multi-sense-audio" id="multiSenseAudio" controls loop preload="metadata">'
      + '<source src="' + escapeMediaText(scene.audio) + '" type="audio/mpeg">';
    if (scene.audioOgg) html += '<source src="' + escapeMediaText(scene.audioOgg) + '" type="audio/ogg">';
    html += '</audio>';
  }
  if (scene.imagePage || scene.audioPage) {
    html += '<div class="multi-sense-credit">Source: ';
    if (scene.imagePage) html += '<a href="' + escapeMediaText(scene.imagePage) + '" target="_blank" rel="noopener">image</a>';
    if (scene.imagePage && scene.audioPage) html += ' · ';
    if (scene.audioPage) html += '<a href="' + escapeMediaText(scene.audioPage) + '" target="_blank" rel="noopener">sound</a>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderVisIntermediateSession(type) {
  var screen = document.getElementById('visIntermediateContent');
  if (!screen) return;
  if (type === 'multisense') {
    var scene = currentMultiSenseScene || pickMultiSenseScene();
    screen.innerHTML =
      renderMultiSenseMedia(scene)
      + '<div style="font-size:20px; font-family:Cormorant Garamond,serif; font-weight:300; color:var(--text); margin-bottom:20px; letter-spacing:.02em;">' + scene.name + '</div>'
      + '<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:18px; margin-bottom:12px;">'
      + '<div style="font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:#d4956e; margin-bottom:8px;">Sight</div>'
      + '<div style="font-size:11px; color:var(--muted); line-height:1.75;">' + scene.sight + '</div>'
      + '</div>'
      + '<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:18px; margin-bottom:12px;">'
      + '<div style="font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:#d4956e; margin-bottom:8px;">Sound</div>'
      + '<div style="font-size:11px; color:var(--muted); line-height:1.75;">' + scene.sound_desc + '</div>'
      + '</div>'
      + '<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:18px; margin-bottom:16px;">'
      + '<div style="font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:#d4956e; margin-bottom:8px;">Touch &amp; Smell</div>'
      + '<div style="font-size:11px; color:var(--muted); line-height:1.75;">' + scene.touch + '<br><br>' + scene.smell + '</div>'
      + '</div>'
      + '<div style="font-size:11px; color:var(--text); line-height:1.75; font-style:italic; padding:0 4px; margin-bottom:24px;">' + scene.instruction + '</div>';
    startSceneAudio(scene.sound || 'silence', scene);
    var fadedBtn = document.getElementById('visIntermediateFadedBtn');
    if (fadedBtn) fadedBtn.textContent = 'Scene Collapsed';
    var switchBtn = document.getElementById('visIntermediateSwitchBtn');
    if (switchBtn) switchBtn.textContent = 'Different Scene';
  } else if (type === 'allangles') {
    var obj = currentVisObject ? currentVisObject.label : 'your chosen object';
    var angles = [['Front','Hold the front face. Study every edge, every detail.'],['Right','Rotate 90deg clockwise. See the right profile completely.'],['Back','Rotate again. See what was hidden.'],['Left','Complete the horizontal rotation. Left profile.'],['Above','Rise above it. Look straight down.'],['Below','Move beneath it. Look straight up.']];
    var stepsHTML = '<div style="font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:#d4956e; margin-bottom:12px;">Six Perspectives</div>';
    angles.forEach(function(a){stepsHTML+='<div style="display:flex;gap:12px;margin-bottom:10px;align-items:baseline;"><div style="font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--text);min-width:44px;">'+a[0]+'</div><div style="font-size:11px;color:var(--muted);line-height:1.6;">'+a[1]+'</div></div>';});
    screen.innerHTML =
      '<div style="text-align:center; margin-bottom:20px;">'
      + renderVisObject(currentVisObject, 160)
      + '<div style="font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); margin-top:12px;">' + obj + '</div>'
      + '</div>'
      + '<div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:18px; margin-bottom:16px;">' + stepsHTML + '</div>'
      + '<div style="font-size:11px; color:var(--text); line-height:1.75; font-style:italic; padding:0 4px; margin-bottom:24px;">Mouni Sadhu: the object must become as real as a physical thing. Rotate it slowly. Hold each angle before moving to the next. Tap when the image finally collapses.</div>';
    var fadedBtn = document.getElementById('visIntermediateFadedBtn');
    if (fadedBtn) fadedBtn.textContent = 'Image Collapsed';
    var switchBtn = document.getElementById('visIntermediateSwitchBtn');
    if (switchBtn) switchBtn.textContent = 'Switch Object';
  }
}

function switchVisDifficulty(diff) {
  window.visCurrentDifficulty = diff;
  var bBtn = document.getElementById('visDiffBeginner');
  var iBtn = document.getElementById('visDiffIntermediate');
  var bSec = document.getElementById('visBeginnerSection');
  var iSec = document.getElementById('visIntermediateSection');
  var beginBtn = document.getElementById('exSetupBeginBtn');
  if (diff === 'beginner') {
    if (bBtn) bBtn.classList.add('active');
    if (iBtn) iBtn.classList.remove('active');
    if (bSec) bSec.style.display = '';
    if (iSec) iSec.style.display = 'none';
    if (beginBtn) beginBtn.style.display = '';
    window.visIntermediateExercise = null;
  } else {
    if (bBtn) bBtn.classList.remove('active');
    if (iBtn) iBtn.classList.add('active');
    if (bSec) bSec.style.display = 'none';
    if (iSec) iSec.style.display = '';
    if (beginBtn) beginBtn.style.display = 'none'; // cards act as selectors
  }
}

function pickVisObject() {
  if (currentVisCategory === 'custom') {
    var customImgs = loadCustomVisImages();
    if (!customImgs.length) return VIS_SHAPES[0];
    var c = customImgs[Math.floor(Math.random() * customImgs.length)];
    return { shape: 'photo', src: c.dataUrl, label: c.name };
  }
  var pool = currentVisCategory === 'objects'  ? VIS_HOUSEHOLD
            : currentVisCategory === 'complex'  ? VIS_COMPLEX
            : currentVisCategory === 'reallife' ? VIS_REALLIFE
            : VIS_SHAPES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderVisObject(obj, size) {
  if (!obj) return '';
  size = size || 120;
  var half = size / 2;
  if (obj.shape === 'photo') {
    return '<div style="width:'+size+'px;height:'+size+'px;display:flex;align-items:center;justify-content:center;">'
      + '<img src="'+obj.src+'" alt="'+obj.label+'" style="max-width:'+size+'px;max-height:'+size+'px;object-fit:contain;border-radius:8px;display:block;">'
      + '</div>';
  }
  if (obj.shape === 'emoji') {
    var fontSize = Math.round(size * 0.72);
    return '<div style="width:' + size + 'px;height:' + size + 'px;display:flex;align-items:center;justify-content:center;font-size:' + fontSize + 'px;line-height:1;">' + obj.emoji + '</div>';
  }
  // Complex SVG objects
  if (obj.shape && obj.shape.startsWith('svg_')) {
    return renderComplexVisObject(obj, size);
  }
  var col = obj.color;
  if (obj.shape === 'circle') {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<circle cx="' + half + '" cy="' + half + '" r="' + (half * 0.85) + '" fill="' + col + '" opacity="0.9"/>'
      + '</svg>';
  } else if (obj.shape === 'triangle') {
    var h = size * 0.85;
    var margin = (size - h) / 2;
    var p1 = half + ',' + margin;
    var p2 = (size - margin) + ',' + (margin + h);
    var p3 = margin + ',' + (margin + h);
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<polygon points="' + p1 + ' ' + p2 + ' ' + p3 + '" fill="' + col + '" opacity="0.9"/>'
      + '</svg>';
  } else if (obj.shape === 'vline') {
    var cx = half;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<rect x="' + (cx - size*0.07) + '" y="' + size*0.08 + '" width="' + size*0.14 + '" height="' + size*0.84 + '" fill="' + col + '" opacity="0.9" rx="3"/>'
      + '</svg>';
  } else if (obj.shape === 'hline') {
    var cy = half;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<rect x="' + size*0.08 + '" y="' + (cy - size*0.07) + '" width="' + size*0.84 + '" height="' + size*0.14 + '" fill="' + col + '" opacity="0.9" rx="3"/>'
      + '</svg>';
  } else if (obj.shape === 'plus') {
    var t = size*0.14; var m2 = size*0.08;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<rect x="' + m2 + '" y="' + (half-t/2) + '" width="' + (size-m2*2) + '" height="' + t + '" fill="' + col + '" opacity="0.9" rx="3"/>'
      + '<rect x="' + (half-t/2) + '" y="' + m2 + '" width="' + t + '" height="' + (size-m2*2) + '" fill="' + col + '" opacity="0.9" rx="3"/>'
      + '</svg>';
  } else if (obj.shape === 'minus') {
    var t2 = size*0.14; var m3 = size*0.08;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<rect x="' + m3 + '" y="' + (half-t2/2) + '" width="' + (size-m3*2) + '" height="' + t2 + '" fill="' + col + '" opacity="0.9" rx="3"/>'
      + '</svg>';
  } else if (obj.shape === 'times') {
    var sw = size*0.12;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<line x1="' + size*0.15 + '" y1="' + size*0.15 + '" x2="' + size*0.85 + '" y2="' + size*0.85 + '" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" opacity="0.9"/>'
      + '<line x1="' + size*0.85 + '" y1="' + size*0.15 + '" x2="' + size*0.15 + '" y2="' + size*0.85 + '" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" opacity="0.9"/>'
      + '</svg>';
  } else if (obj.shape === 'divide') {
    var t3 = size*0.14; var m4 = size*0.08; var r2 = size*0.07;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<rect x="' + m4 + '" y="' + (half-t3/2) + '" width="' + (size-m4*2) + '" height="' + t3 + '" fill="' + col + '" opacity="0.9" rx="3"/>'
      + '<circle cx="' + half + '" cy="' + size*0.22 + '" r="' + r2 + '" fill="' + col + '" opacity="0.9"/>'
      + '<circle cx="' + half + '" cy="' + size*0.78 + '" r="' + r2 + '" fill="' + col + '" opacity="0.9"/>'
      + '</svg>';
  } else if (obj.shape === 'hash') {
    var sw2 = size*0.09; var g = size*0.3;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<line x1="' + (half-g/2) + '" y1="' + size*0.1 + '" x2="' + (half-g/2) + '" y2="' + size*0.9 + '" stroke="' + col + '" stroke-width="' + sw2 + '" stroke-linecap="round" opacity="0.9"/>'
      + '<line x1="' + (half+g/2) + '" y1="' + size*0.1 + '" x2="' + (half+g/2) + '" y2="' + size*0.9 + '" stroke="' + col + '" stroke-width="' + sw2 + '" stroke-linecap="round" opacity="0.9"/>'
      + '<line x1="' + size*0.1 + '" y1="' + (half-g/2) + '" x2="' + size*0.9 + '" y2="' + (half-g/2) + '" stroke="' + col + '" stroke-width="' + sw2 + '" stroke-linecap="round" opacity="0.9"/>'
      + '<line x1="' + size*0.1 + '" y1="' + (half+g/2) + '" x2="' + size*0.9 + '" y2="' + (half+g/2) + '" stroke="' + col + '" stroke-width="' + sw2 + '" stroke-linecap="round" opacity="0.9"/>'
      + '</svg>';
  } else if (obj.shape === 'percent') {
    var sw3 = size*0.1; var r3 = size*0.12;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<circle cx="' + size*0.28 + '" cy="' + size*0.28 + '" r="' + r3 + '" fill="none" stroke="' + col + '" stroke-width="' + sw3 + '" opacity="0.9"/>'
      + '<circle cx="' + size*0.72 + '" cy="' + size*0.72 + '" r="' + r3 + '" fill="none" stroke="' + col + '" stroke-width="' + sw3 + '" opacity="0.9"/>'
      + '<line x1="' + size*0.78 + '" y1="' + size*0.18 + '" x2="' + size*0.22 + '" y2="' + size*0.82 + '" stroke="' + col + '" stroke-width="' + sw3 + '" stroke-linecap="round" opacity="0.9"/>'
      + '</svg>';
  } else if (obj.shape === 'pentagram') {
    // Five-pointed star — these previously fell through to the square
    // fallback, so "Violet Pentagram" rendered as a violet square.
    var pR = half * 0.92, pr = pR * 0.382, pPts = [];
    for (var pi = 0; pi < 10; pi++) {
      var pa = -Math.PI / 2 + pi * Math.PI / 5;
      var prad = (pi % 2 === 0) ? pR : pr;
      pPts.push((half + Math.cos(pa) * prad).toFixed(1) + ',' + (half + Math.sin(pa) * prad).toFixed(1));
    }
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<polygon points="' + pPts.join(' ') + '" fill="' + col + '" opacity="0.9"/>'
      + '</svg>';
  } else if (obj.shape === 'hexagram') {
    var hR = half * 0.88;
    var triAt = function(rot) {
      var pts = [];
      for (var hi = 0; hi < 3; hi++) {
        var ha = rot + hi * 2 * Math.PI / 3;
        pts.push((half + Math.cos(ha) * hR).toFixed(1) + ',' + (half + Math.sin(ha) * hR).toFixed(1));
      }
      return pts.join(' ');
    };
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<polygon points="' + triAt(-Math.PI / 2) + '" fill="' + col + '" opacity="0.75"/>'
      + '<polygon points="' + triAt(Math.PI / 2) + '" fill="' + col + '" opacity="0.75"/>'
      + '</svg>';
  } else if (obj.shape === 'diamond') {
    var dm = size * 0.08;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<polygon points="' + half + ',' + dm + ' ' + (size - dm) + ',' + half + ' ' + half + ',' + (size - dm) + ' ' + dm + ',' + half + '" fill="' + col + '" opacity="0.9"/>'
      + '</svg>';
  } else {
    var m5 = size * 0.075;
    var w2 = size - m5 * 2;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
      + '<rect x="' + m5 + '" y="' + m5 + '" width="' + w2 + '" height="' + w2 + '" fill="' + col + '" opacity="0.9" rx="4"/>'
      + '</svg>';
  }
}

function setupVisPreview() {
  currentVisObject = pickVisObject();
  var wrap = document.getElementById('visPreviewWrap');
  if (wrap) wrap.innerHTML = renderVisObject(currentVisObject, 230);
}

function fmtTimer(totalSec) {
  var m = Math.floor(totalSec / 60);
  var s = totalSec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

function startVisSession() {
  if (!currentVisObject) currentVisObject = pickVisObject();
  var studyObj = document.getElementById('visStudyObject');
  var studyLabel = document.getElementById('visStudyLabel');
  var studyStartBtn = document.getElementById('visStudyStartBtn');
  if (studyObj) studyObj.innerHTML = renderVisObject(currentVisObject, 275);
  if (studyLabel) studyLabel.textContent = currentVisObject.label;
  if (studyStartBtn) studyStartBtn.textContent = visOpenEyesMode ? 'Start with Open Eyes' : 'Close Eyes & Start';
  showScreen('visStudyScreen');
}

var visHalts = 0; // halt taps this rep

function beginVisSession() {
  visSessionStartTime = Date.now();
  visRepStartTime = Date.now();
  visReps = [];
  visTotalXP = 0;
  visHalts = 0;
  visRepActive = false;

  // Update labels based on mode before showing session
  var beginRepBtn2 = document.getElementById('visBeginRepBtn');
  var holdLabel2 = document.getElementById('visHoldLabel');
  var lostBtn2 = document.getElementById('visLostBtn');
  if (lostBtn2) lostBtn2.textContent = 'Image Faded';
  if (visOpenEyesMode) {
    if (beginRepBtn2) beginRepBtn2.textContent = 'Start with Open Eyes';
    if (holdLabel2) holdLabel2.textContent = 'Fix your gaze. Hold awareness.';
  } else {
    if (beginRepBtn2) beginRepBtn2.textContent = 'Close Eyes & Start';
    if (holdLabel2) holdLabel2.textContent = 'Hold the image.';
  }

  showScreen('visSessionScreen');
  requestExerciseWakeLock();
  startVisRep();
  tickVisDualTimer();
}

function recordHalt() {
  visHalts++;
  // Flash "Halt." on screen
  var flash = document.getElementById('visHaltFlash');
  var countEl = document.getElementById('visHaltCount');
  if (flash) {
    flash.classList.remove('show');
    void flash.offsetWidth; // reflow to restart animation
    flash.classList.add('show');
  }
  if (countEl) countEl.textContent = visHalts + ' halt' + (visHalts !== 1 ? 's' : '') + ' this rep';
}

function startVisRep() {
  visHalts = 0;
  visRepActive = true;
  visRepPausedMs = 0;
  visRefreshPauseStart = null;
  // Hide switch button once rep begins
  var switchBtn = document.getElementById('visSwitchObjectBtn');
  if (switchBtn) switchBtn.style.display = 'none';
  var countEl = document.getElementById('visHaltCount');
  if (countEl) countEl.textContent = '';
  visRepStartTime = Date.now();

  var sessionWrap = document.getElementById('visObjectSession');
  var repFlash = document.getElementById('visRepFlash');
  var stateLabel = document.getElementById('visStateLabel');
  var holdLabel = document.getElementById('visHoldLabel');
  var lostBtn = document.getElementById('visLostBtn');
  var beginRepBtn = document.getElementById('visBeginRepBtn');

  // Hide study elements, show active rep UI
  if (repFlash) repFlash.style.display = 'none';
  if (stateLabel) stateLabel.textContent = visOpenEyesMode ? 'Eyes open.' : 'Eyes closed.';
  if (holdLabel) holdLabel.style.display = '';
  if (lostBtn) lostBtn.style.display = '';
  if (beginRepBtn) beginRepBtn.style.display = 'none';
  var refreshBtn2 = document.getElementById('visRefreshBtn');
  if (refreshBtn2) refreshBtn2.style.display = '';

  // Show object — linger 5s then fade out in both modes
  if (sessionWrap) {
    sessionWrap.innerHTML = renderVisObject(currentVisObject, 260);
    sessionWrap.style.transition = '';
    sessionWrap.style.opacity = '1';
    visObjFadeTimeout = setTimeout(function() {
      sessionWrap.style.transition = 'opacity 1.2s ease';
      sessionWrap.style.opacity = '0';
      visObjFadeTimeout = setTimeout(function() {
        sessionWrap.innerHTML = '';
        sessionWrap.style.transition = '';
        sessionWrap.style.opacity = '1';
      }, 1200);
    }, 5000);
  }

  updateRepCount();
}

function tickVisDualTimer() {
  var now = Date.now();
  var sessionSec = Math.floor((now - visSessionStartTime) / 1000);
  var sessionEl = document.getElementById('visSessionTimer');
  var repEl = document.getElementById('visRepTimer');
  if (sessionEl) sessionEl.textContent = fmtTimer(sessionSec);
  if (repEl) {
    if (visRepActive) {
      var pauseOffset = visRefreshPauseStart ? (now - visRefreshPauseStart) : 0;
      var repSec = Math.floor((now - visRepStartTime - visRepPausedMs - pauseOffset) / 1000);
      repEl.textContent = fmtTimer(Math.max(0, repSec));
    } else {
      repEl.textContent = '—';
    }
  }
  visTimerHandle = requestAnimationFrame(tickVisDualTimer);
}

function updateRepCount() {
  var el = document.getElementById('visRepCount');
  if (!el) return;
  // Only show counter when a rep is actively running
  if (!visRepActive) {
    el.textContent = '';
  } else {
    el.textContent = visReps.length > 0
      ? 'rep ' + (visReps.length + 1) + '  ·  ' + visReps.length + ' completed'
      : 'rep 1';
  }
}

function imageFaded() {
  visRepActive = false;
  clearTimeout(visObjFadeTimeout);
  visObjFadeTimeout = null;
  var repSec = Math.floor((Date.now() - visRepStartTime - visRepPausedMs) / 1000);
  visReps.push({ seconds: repSec, object: currentVisObject, halts: visHalts });

  // Show rep result and new object to study
  var repFlash = document.getElementById('visRepFlash');
  var repTimeEl = document.getElementById('visRepTime');
  var stateLabel = document.getElementById('visStateLabel');
  var holdLabel = document.getElementById('visHoldLabel');
  var lostBtn = document.getElementById('visLostBtn');
  var beginRepBtn = document.getElementById('visBeginRepBtn');
  var sessionWrap = document.getElementById('visObjectSession');

  // Show how long they held it
  if (repTimeEl) repTimeEl.textContent = repSec;
  if (repFlash) repFlash.style.display = 'block';
  if (holdLabel) holdLabel.style.display = 'none';
  if (lostBtn) lostBtn.style.display = 'none';
  var refreshBtn = document.getElementById('visRefreshBtn');
  if (refreshBtn) refreshBtn.style.display = 'none';

  // Display same object for next rep
  if (stateLabel) stateLabel.textContent = '';
  if (sessionWrap) {
    sessionWrap.style.opacity = '1';
    sessionWrap.style.marginTop = '16px';
    sessionWrap.innerHTML = renderVisObject(currentVisObject, 260);
  }

  // Show switch object button between reps
  var switchBtn = document.getElementById('visSwitchObjectBtn');
  if (switchBtn) switchBtn.style.display = '';

  // Show begin rep button with next rep number
  if (beginRepBtn) {
    beginRepBtn.textContent = 'Begin Rep ' + (visReps.length + 1);
    beginRepBtn.style.display = '';
  }
  updateRepCount();
}

function endVisSession() {
  cancelAnimationFrame(visTimerHandle);
  hideVisRefresh();
  // Only record in-progress rep if user actually started it (not just studying)
  if (visRepActive && visRepStartTime) {
    var repSec = Math.floor((Date.now() - visRepStartTime - visRepPausedMs) / 1000);
    if (repSec > 2) visReps.push({ seconds: repSec, object: currentVisObject, halts: visHalts });
  }
  showVisSessionResult();
}

function showVisSessionResult() {
  var totalSec = Math.floor((Date.now() - visSessionStartTime) / 1000);
  var bestRep = visReps.reduce(function(a,b) { return b.seconds > a.seconds ? b : a; }, { seconds: 0 });

  document.getElementById('visResultSub').textContent =
    visReps.length + ' rep' + (visReps.length !== 1 ? 's' : '') + ' · session ' + fmtTimer(totalSec);
  document.getElementById('visNotes').value = '';
  document.getElementById('visAdaptWrap').innerHTML = '';

  // Render reps list
  var wrap = document.getElementById('visRepsWrap');
  if (wrap) {
    wrap.innerHTML = visReps.map(function(r, i) {
      var isBest = r.seconds === bestRep.seconds && i === visReps.indexOf(bestRep);
      var haltStr = r.halts ? r.halts + ' halt' + (r.halts !== 1 ? 's' : '') : '';
    return '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:6px;">'
        + '<div style="display:flex; align-items:center; gap:10px;">'
        + renderVisObject(r.object, 28)
        + '<div><div style="font-size:10px; letter-spacing:.1em; color:var(--muted);">Rep ' + (i+1) + ' · ' + r.object.label + '</div>'
        + (haltStr ? '<div style="font-size:9px; color:#d4956e; opacity:0.7;">' + haltStr + '</div>' : '')
        + '</div>'
        + '</div>'
        + '<div style="display:flex; align-items:center; gap:8px;">'
        + (isBest ? '<span style="font-size:8px; letter-spacing:.1em; color:#d4956e;">best</span>' : '')
        + '<span style="font-family:serif; font-size:20px; color:#d4b08e;">' + fmtTimer(r.seconds) + '</span>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  saveVisSessionResult();
}

function saveVisSessionResult() {
  releaseExerciseWakeLock();
  var notes = document.getElementById('visNotes').value.trim();
  var totalXP = visReps.reduce(function(a,r) { return a + r.seconds; }, 0);
  var bestSec = visReps.reduce(function(a,r) { return r.seconds > a ? r.seconds : a; }, 0);

  concState.xp += totalXP;
  if (isConcNewSession()) concState.totalSessions++;
  if (bestSec > concState.bestSeconds) concState.bestSeconds = bestSec;

  var concDidLevelUp2 = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);

  var _visWallSec = visSessionStartTime ? Math.floor((Date.now() - visSessionStartTime) / 1000) : 0;
  var _akashaDeltaVis = recordExerciseCompletion({
    entry: {
      date: new Date().toISOString(),
      seconds: bestSec,
      xpEarned: totalXP,
      reps: visReps.length,
      notes: notes,
      type: 'visualization',
      object: visReps.length > 0 ? visReps[0].object.label : ''
    },
    exId: 'visual',
    omniaSeconds: totalXP,
    reachedRec: omniaReachedRecommendation('visual', _visWallSec)
  });

  currentVisObject = pickVisObject();
  var wrap = document.getElementById('visPreviewWrap');
  if (wrap) wrap.innerHTML = renderVisObject(currentVisObject, 175);

  var _concDidLevelUpVis = concDidLevelUp2;
  var _visOriginMode = currentMode;
  var _totalSecVis = Math.floor((Date.now() - visSessionStartTime) / 1000);
  showSessionComplete({
    title: 'Sharp as ever.',
    sub: visReps.length + ' rep' + (visReps.length !== 1 ? 's' : ''),
    xp: totalXP,
    akashaDelta: _akashaDeltaVis,
    stat3: { label: 'Session', color: 'blue', value: fmtTimer(_totalSecVis) },
    onDone: function() {
      renderConcHome();
      showScreen('homeScreen');
      returnAfterExercise(_visOriginMode);
      if (_concDidLevelUpVis) setTimeout(function() { showConcLevelUp(concState.level); }, 400);
    }
  });
}

// ── Exercise tab switching ──
var currentExercise = 'clock';
var concHistoryFrom = 'home';
var concHistoryFilter = 'all';
// Which tab was active when the exercise setup screen was opened — 'guide'
// if launched from a Guide Path card, otherwise 'concentration'. Lets the
// setup screen's Back button return to wherever the user actually came
// from, the same way a completed session already does via returnAfterExercise.
var exSetupOriginMode = 'concentration';

var EXERCISE_DEFS = {
  clock: {
    icon: '&#9200;',
    name: 'Clock Exercise',
    desc: '',
    setupHTML: function() {
      var best = (concState.history || []).reduce(function(b, s) {
        return isClockSession(s) && s.seconds > b ? s.seconds : b;
      }, 0);
      var mastered = best >= 900;

      // ── Hero clock face (matches the in-session clock styling) ──
      var ticks = '';
      for (var t = 0; t < 12; t++) {
        var ang = t * 30 * Math.PI / 180;
        var x1 = (120 + Math.sin(ang) * 96).toFixed(1), y1 = (120 - Math.cos(ang) * 96).toFixed(1);
        var x2 = (120 + Math.sin(ang) * 104).toFixed(1), y2 = (120 - Math.cos(ang) * 104).toFixed(1);
        ticks += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
      }
      var _ct = getClockTheme();
      var _faceFill = (_ct.face && _ct.face !== 'none') ? _ct.face : 'rgba(224,124,58,.045)';
      var _heroBg = (_ct.bg && _ct.bg !== 'none') ? _ct.bg : '';
      var heroHtml = '<div class="clk-hero-card" id="clkHeroCard"' + (_heroBg ? ' style="background:' + _heroBg + ';"' : '') + '>'
        + '<div class="clk-hero" id="clkHero"><div class="clk-hero-glow"></div>'
        + '<svg viewBox="0 0 240 240" width="148" height="148" id="clkHeroSvg">'
        +   '<circle class="clk-face" cx="120" cy="120" r="112" fill="' + _faceFill + '"/>'
        +   '<circle class="clk-rim" cx="120" cy="120" r="112"/>'
        +   '<circle class="clk-rim-inner" cx="120" cy="120" r="104"/>'
        +   '<g class="clk-ticks" stroke="' + _ct.ticks + '">' + ticks + '</g>'
        +   '<line class="clk-hand" x1="120" y1="120" x2="120" y2="30" stroke="' + _ct.hand + '" style="animation:none;"/>'
        +   '<circle class="clk-hub" cx="120" cy="120" r="6" fill="' + _ct.hand + '"/>'
        + '</svg></div>'
        + '<button type="button" class="clk-customize-btn" onclick="openClockSettings(\'exSetupScreen\')">Customize in Settings &#8594;</button>'
        + '</div>';

      // ── Record ──
      var recordHtml = '<div class="clk-record"><div class="clk-record-label">Your Record</div>';
      if (best > 0) {
        var rTime = best >= 60
          ? Math.floor(best / 60) + '<small>m</small> ' + (best % 60) + '<small>s</small>'
          : best + '<small>s</small>';
        recordHtml += '<div class="clk-record-time">' + rTime + '</div>';
      } else {
        recordHtml += '<div class="clk-record-none">Not set yet</div>';
      }
      recordHtml += '</div>';

      // ── Progress track: a single 0 → 15 min arc with a 10 min waypoint ──
      var fillPct = Math.min(100, best / 900 * 100);
      var mark10 = 600 / 900 * 100; // 66.7%
      var trackHtml;
      if (mastered) {
        trackHtml = '<div class="clk-mastered">'
          + '<div class="clk-mastered-t">This exercise has been mastered</div>'
          + '<div class="clk-mastered-s">Fifteen minutes of unbroken focus</div>'
          + '</div>';
      } else {
        trackHtml = '<div class="clk-track-wrap">'
          + '<div class="clk-track-top"><span class="l">Progress</span><span class="r">Goal · 15 min</span></div>'
          + '<div class="clk-track">'
          +   '<div class="clk-track-fill" style="width:' + fillPct.toFixed(1) + '%;"></div>'
          +   '<div class="clk-track-mark" style="left:' + mark10.toFixed(1) + '%;"></div>'
          + '</div>'
          + '<div class="clk-track-foot">'
          +   '<span style="left:0; transform:none;">0</span>'
          +   '<span style="left:' + mark10.toFixed(1) + '%;">10 min</span>'
          +   '<span style="right:0; left:auto; transform:none;">15 min</span>'
          + '</div>'
          + '</div>';
      }

      // ── Omnia's head peeks over the top-right of the preview card and
      //    beckons a tap to open the full-screen tutorial. ──
      var omniaHtml = '<button type="button" class="clk-omnia-peek" onclick="openExExplainer(\'clock\')" aria-label="Open tutorial">'
        + '<span class="clk-omnia-peek-head"><span class="clk-omnia-spin">' + omniaHeadOnlySVG(34, 32) + '</span></span>'
        + '</button>';

      var historyHtml = '<button type="button" class="clk-history-link" onclick="concHistoryFrom=\'exSetupScreen\'; concHistoryFilter=\'clock\'; renderConcHistory(); showScreen(\'concHistoryScreen\');">View History</button>';

      return '<div class="clk-setup">' + omniaHtml + heroHtml + recordHtml + trackHtml + historyHtml + '</div>';
    },
    begin: function() { startConcentration(); }
  },
  visual: {
    icon: '&#128065;',
    name: 'Visualization',
    desc: 'Study the object below, then close your eyes and hold its image in your mind. When the image fades, tap Image Faded. Build the clarity and stability of your inner vision.',
    setupHTML: function() {
      return '<div>'
        + '<div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">'
        + '<button class="exercise-tab active" id="visCatShapes" style="font-size:8px; padding:6px 12px;">Shapes</button>'
        + '<button class="exercise-tab" id="visCatObjects" style="font-size:8px; padding:6px 12px;">Objects</button>'
        + '<button class="exercise-tab" id="visCatRealLife" style="font-size:8px; padding:6px 12px;">Real Life</button>'
        + (loadCustomVisImages().length ? '<button class="exercise-tab" id="visCatCustom" style="font-size:8px; padding:6px 12px;">Custom</button>' : '')
        + '</div>'
        + '<div style="display:flex; align-items:center; gap:10px; margin-bottom:24px;">'
        + '<span style="font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:var(--muted);">Closed Eyes</span>'
        + '<label style="position:relative; display:inline-block; width:38px; height:22px; cursor:pointer; flex-shrink:0;">'
        + '<input type="checkbox" id="visModeToggle" style="opacity:0; position:absolute; width:0; height:0;">'
        + '<span id="visModeSlider" style="position:absolute; inset:0; background:rgba(212,149,110,.2); border-radius:22px; transition:background .2s;"><span id="visModeDot" style="position:absolute; left:3px; top:3px; width:16px; height:16px; background:#d4956e; border-radius:50%; transition:transform .2s; opacity:.5;"></span></span>'
        + '</label>'
        + '<span style="font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:var(--muted);">Open Eyes</span>'
        + '</div>'
        + '<div class="vis-object-label" style="margin-bottom:16px;">Memorize this object</div>'
        + '<div class="vis-object-wrap" id="visPreviewWrap" style="margin:0 auto 20px; width:240px; height:240px;"></div>'
        + '</div>';
    },
    begin: function() {
      startVisSession();
    }
  },
  multisense: {
    icon: '🎵',
    name: 'Multi-Sense Visualization',
    desc: 'Inhabit a full scene — sight, sound, touch, smell — and hold it completely in your mind.',
    setupHTML: function() { return ''; },
    begin: function() {
      window.visCurrentDifficulty = 'intermediate';
      window.visIntermediateExercise = 'multisense';
      pickMultiSenseScene();
      showScreen('visIntermediateScreen');
      renderVisIntermediateSession('multisense');
    }
  },
  allangles: {
    icon: '🔄',
    name: 'All Angles Visualization',
    desc: 'Visualize an object from every angle — front, back, sides, above, below. Rotate it slowly in your mind. Based on Mouni Sadhu&#39;s method.',
    setupHTML: function() { return ''; },
    begin: function() {
      window.visCurrentDifficulty = 'intermediate';
      window.visIntermediateExercise = 'allangles';
      currentVisObject = pickVisObject();
      showScreen('visIntermediateScreen');
      renderVisIntermediateSession('allangles');
    }
  },
  auditory: {
    icon: '&#127911;',
    name: 'Auditory',
    // No instruction block — Omnia's head beside the grid opens the tutorial.
    desc: '',
    setupHTML: function() {
      return '<div class="aud-setup">'
        + '<div class="aud-setup-head">'
        + '<div class="vis-object-label" style="margin:0;">Choose a sound</div>'
        + '<button type="button" class="aud-omnia-peek" onclick="openExExplainer(\'auditory\')" aria-label="How Auditory works">'
        + '<span class="clk-omnia-peek-head"><span class="clk-omnia-spin">' + omniaHeadOnlySVG(34, 32) + '</span></span>'
        + '</button>'
        + '</div>'
        + '<div class="sound-grid" id="soundGrid"></div></div>';
    },
    begin: function() { startAuditorySession(); }
  },
  sense: {
    icon: '&#10042;',
    name: 'Sense Concentration',
    // No instruction block — Omnia's head in the setup opens the tutorial.
    desc: '',
    setupHTML: function() { return buildSenseSetupHTML(); },
    begin: function() { startSenseSession(); }
  },
  thought: {
    icon: '&#9711;',
    name: 'Thought Control',
    // No instruction block — Omnia's head in the setup opens the tutorial.
    desc: '',
    setupHTML: function() { return buildTCSetupHTML(); },
    begin: function() { startThoughtControl(); }
  },
  asana: {
    icon: '&#129485;',
    name: 'Asana',
    desc: 'Sit completely motionless for the full duration. No fidgeting, no adjusting, no scratching. An alarm will sound when the session ends.',
    setupHTML: function() {
      var as = guideAsanaStats();
      var html = '<div style="margin-bottom:20px;">'
        + '<div style="font-size:9px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); margin-bottom:2px; font-family:\'DM Mono\',monospace;">Session Target</div>';
      if (as.showStepper) {
        var stepVal = as.qualTarget;
        var capNote = as.locked
          ? 'your chosen start · auto-advance off'
          : (as.cap || 30) + ' min reached · adjust freely';
        html += '<div class="asana-stepper">'
          + '<button class="asana-step-btn" onclick="adjustAsanaDuration(-1)">&#8722;</button>'
          + '<div class="asana-step-val" id="asanaStepperVal">' + stepVal + ' min</div>'
          + '<button class="asana-step-btn" onclick="adjustAsanaDuration(1)">&#43;</button>'
          + '</div>'
          + '<div style="text-align:center; font-size:9px; color:var(--muted); font-family:\'DM Mono\',monospace; letter-spacing:.08em; margin-top:6px;">' + capNote + '</div>';
      } else {
        var pct = Math.round((as.qualAtTier / as.tierRequired) * 100);
        var sessWord = as.tierRequired === 1 ? 'session' : 'sessions';
        var remaining = as.tierRequired - as.qualAtTier;
        var nextTier = as.qualTarget + 1;
        html += '<div class="asana-tier-block">'
          + '<div class="asana-tier-num">' + as.qualTarget + '</div>'
          + '<div class="asana-tier-unit">min</div>'
          + '</div>'
          + '<div class="asana-tier-bar"><div class="asana-tier-bar-fill" style="width:' + pct + '%;"></div></div>'
          + '<div class="asana-tier-prog" style="text-align:center; margin-top:8px;">' + as.qualAtTier + ' / ' + as.tierRequired + ' ' + sessWord + ' · ' + remaining + ' more to reach ' + nextTier + ' min</div>';
      }
      html += '</div>'
        + '<div style="text-align:center; padding:8px 0; font-size:11px; color:var(--muted); line-height:1.6; font-family:\'Cormorant Garamond\',serif; font-style:italic;">Settle into your posture before beginning.<br>An alarm will sound when the time is up.</div>';
      return html;
    },
    begin: function() { startAsana(); }
  }
};

// Per-exercise banner styling. `rgb` drives all the colour washes/glows via a
// CSS var; `light` is the title colour; `symInner` is rendered at two sizes
// (foreground symbol + faint background watermark) for depth.
var EX_BANNER_CONFIG = {
  clock: {
    rgb: '224,124,58', light: '#e8a070', label: 'Concentration', title: 'Clock',
    tagline: 'Watch the seconds hand.',
    symInner:
      '<circle cx="50" cy="50" r="38" stroke="#e8a070" stroke-width="2.2" opacity="0.85"/>'
      + '<circle cx="50" cy="50" r="3.2" fill="#e8a070"/>'
      + '<line x1="50" y1="50" x2="50" y2="24" stroke="#e8a070" stroke-width="3" stroke-linecap="round"/>'
      + '<line x1="50" y1="50" x2="71" y2="50" stroke="#e8a070" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>'
      + '<line x1="50" y1="13" x2="50" y2="19" stroke="#e8a070" stroke-width="2.4" opacity="0.6"/>'
      + '<line x1="50" y1="81" x2="50" y2="87" stroke="#e8a070" stroke-width="2.4" opacity="0.6"/>'
      + '<line x1="13" y1="50" x2="19" y2="50" stroke="#e8a070" stroke-width="2.4" opacity="0.6"/>'
      + '<line x1="81" y1="50" x2="87" y2="50" stroke="#e8a070" stroke-width="2.4" opacity="0.6"/>',
  },
  visual: {
    rgb: '110,159,212', light: '#8ab8e0', label: 'Concentration · Visualization',
    tagline: 'Hold a still image without it fading.',
    symInner:
      '<path d="M9 50 Q50 18 91 50 Q50 82 9 50 Z" stroke="#8ab8e0" stroke-width="2.2" opacity="0.82"/>'
      + '<circle cx="50" cy="50" r="15" stroke="#8ab8e0" stroke-width="2.2" opacity="0.9"/>'
      + '<circle cx="50" cy="50" r="6" fill="#8ab8e0"/>',
  },
  auditory: {
    rgb: '110,184,164', light: '#8eccc0', label: 'Concentration · Auditory',
    tagline: 'Hold a single tone in the mind.',
    symInner:
      '<line x1="50" y1="18" x2="50" y2="82" stroke="#8eccc0" stroke-width="2.2" stroke-linecap="round" opacity="0.4"/>'
      + '<path d="M50 30 Q70 40 70 50 Q70 60 50 70" stroke="#8eccc0" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.85"/>'
      + '<path d="M50 20 Q84 36 84 50 Q84 64 50 80" stroke="#8eccc0" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.5"/>'
      + '<path d="M50 42 Q58 46 58 50 Q58 54 50 58" stroke="#8eccc0" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
  },
  thought: {
    rgb: '120,152,184', light: '#98b4cc', label: 'Concentration · Thought Control',
    tagline: 'Still the stream. Fewer thoughts.',
    symInner:
      '<circle cx="50" cy="50" r="36" stroke="#98b4cc" stroke-width="2.2" opacity="0.85"/>'
      + '<circle cx="50" cy="50" r="22" stroke="#98b4cc" stroke-width="1.8" opacity="0.45"/>'
      + '<circle cx="50" cy="50" r="6" fill="#98b4cc" opacity="0.7"/>',
  },
  asana: {
    rgb: '196,120,120', light: '#d49898', label: 'Concentration · Asana',
    tagline: 'Sit motionless. Total stillness.',
    symInner:
      '<circle cx="50" cy="24" r="9" stroke="#d49898" stroke-width="2.2" opacity="0.88"/>'
      + '<path d="M50 33 L50 56" stroke="#d49898" stroke-width="2.4" stroke-linecap="round" opacity="0.72"/>'
      + '<path d="M28 48 L50 42 L72 48" stroke="#d49898" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.7"/>'
      + '<path d="M30 72 Q50 56 70 72" stroke="#d49898" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.78"/>',
  },
  sense: {
    rgb: '207,143,176', light: '#e0a8c4', label: 'Concentration · Senses', title: 'Senses',
    tagline: 'Hold an imagined sensation.',
    symInner:
      '<circle cx="50" cy="50" r="13" stroke="#e0a8c4" stroke-width="2.4" opacity="0.9"/>'
      + '<circle cx="50" cy="22" r="8" stroke="#e0a8c4" stroke-width="2.2" opacity="0.85"/>'
      + '<circle cx="26" cy="64" r="8" stroke="#e0a8c4" stroke-width="2.2" opacity="0.6"/>'
      + '<circle cx="74" cy="64" r="8" stroke="#e0a8c4" stroke-width="2.2" opacity="0.6"/>',
  },
};

function updateExSetupBanner(ex) {
  var cfg = EX_BANNER_CONFIG[ex] || EX_BANNER_CONFIG.clock;
  var banner = document.getElementById('exSetupBanner');
  if (!banner) return;
  var visualMinimal = ex === 'visual';
  banner.style.setProperty('--exb-rgb', cfg.rgb);
  banner.style.setProperty('--exb-light', cfg.light);
  banner.classList.toggle('ex-banner--no-ripple', ex === 'clock');
  banner.classList.toggle('ex-banner--visual-minimal', visualMinimal);
  var label = document.getElementById('exBannerLabel');
  var title = document.getElementById('exBannerTitle');
  var tag   = document.getElementById('exBannerTagline');
  var sym   = document.getElementById('exBannerSym');
  var wm    = document.getElementById('exBannerWatermark');
  if (label) label.textContent = visualMinimal ? 'Concentration' : (cfg.label || 'Concentration');
  if (title) {
    title.textContent = visualMinimal ? '' : (cfg.title || (EXERCISE_DEFS[ex] && EXERCISE_DEFS[ex].name) || '');
    title.classList.toggle('clk-title-glow', ex === 'clock');
  }
  if (tag)   tag.textContent = cfg.tagline || '';
  if (sym)   sym.innerHTML = visualMinimal ? '' : '<svg width="96" height="96" viewBox="0 0 100 100" fill="none">' + cfg.symInner + '</svg>';
  if (wm)    wm.innerHTML = visualMinimal ? '' : '<svg width="220" height="220" viewBox="0 0 100 100" fill="none">' + cfg.symInner + '</svg>';
}

// Omnia's crystal — used as the clickable "explain this exercise" head.
// Just Omnia's crystalline head (the top diamond) — no body. Used where we
// want a large, clear head-only beacon (e.g. the Clock tutorial peek).
function omniaHeadOnlySVG(w, h) {
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 56 52" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<defs>'
    +   '<clipPath id="omniaHeadClip"><polygon points="28,3 53,24 28,49 3,24"/></clipPath>'
    +   '<linearGradient id="omniaShineGrad" x1="0" y1="0" x2="1" y2="0">'
    +     '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>'
    +     '<stop offset="0.5" stop-color="#ffffff" stop-opacity="0.9"/>'
    +     '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>'
    +   '</linearGradient>'
    + '</defs>'
    + '<polygon points="28,3 53,24 28,49 3,24" fill="#ceeaff" stroke="#90cce8" stroke-width="1" opacity=".95"/>'
    + '<polygon points="28,3 53,24 28,24" fill="#e8f8ff" opacity=".55"/>'
    + '<polygon points="28,3 3,24 28,24" fill="#b4daf5" opacity=".35"/>'
    + '<polygon points="28,49 53,24 28,24" fill="#a8d4f0" opacity=".42"/>'
    + '<polygon points="28,49 3,24 28,24" fill="#9ccdf0" opacity=".55"/>'
    + '<g clip-path="url(#omniaHeadClip)"><rect class="clk-omnia-shine" x="-4" y="-6" width="14" height="64" fill="url(#omniaShineGrad)"/></g>'
    + '</svg>';
}

function omniaHeadSVG(w, h) {
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 72 118" fill="none" xmlns="http://www.w3.org/2000/svg">'
    + '<polygon points="36,2 50,14 36,26 22,14" fill="#ceeaff" stroke="#90cce8" stroke-width=".8" opacity=".95"/>'
    + '<polygon points="36,2 50,14 36,13" fill="#e8f8ff" opacity=".55"/>'
    + '<polygon points="36,2 22,14 36,13" fill="#b4daf5" opacity=".35"/>'
    + '<polygon points="36,26 56,37 60,59 36,70 12,59 16,37" fill="#b8dcf5" stroke="#88c4e0" stroke-width=".7" opacity=".88"/>'
    + '<polygon points="36,26 56,37 36,45" fill="#d4ecff" opacity=".44"/>'
    + '<polygon points="36,26 16,37 36,45" fill="#a8d4f0" opacity=".28"/>'
    + '<polygon points="36,70 60,59 52,88 36,100 20,88 12,59" fill="#a8d4f0" stroke="#88c4e0" stroke-width=".7" opacity=".82"/>'
    + '<polygon points="36,100 52,88 36,116" fill="#98c8e8" stroke="#88c4e0" stroke-width=".6" opacity=".7"/>'
    + '<polygon points="36,100 20,88 36,116" fill="#88c0e0" stroke="#88c4e0" stroke-width=".6" opacity=".52"/>'
    + '</svg>';
}

// Condensed, Omnia-voiced walkthroughs shown in the explainer modal.
var EX_EXPLAINERS = {
  clock: {
    title: 'Clock',
    steps: [
      'Watch the <strong>second hand</strong> and keep your eyes and attention fixed on its sweep.',
      'Let <strong>no other thought</strong> enter. The moving hand is the only thing in your mind.',
      'The instant a thought slips in, <strong>tap the screen</strong> — the session ends there.',
      'Your time is logged. Day by day, the gap before the first thought grows longer.'
    ]
  },
  soulmirror: {
    title: 'Soul Mirror',
    steps: [
      'The Mirror holds two columns: <strong>traits to cultivate</strong> and <strong>traits to overcome</strong>.',
      'Work through them <strong>one at a time</strong>. Honesty here is the whole exercise — name what is truly yours.',
      'When a trait is genuinely transformed, mark it <strong>complete</strong> and it darkens. Tapped by mistake? Restore it with the <strong>↩</strong> button.',
      'Use <strong>Mirror Notes</strong> to record what you observe. This is the slow work that reshapes character.'
    ]
  },
  auditory: {
    title: 'Auditory',
    steps: [
      'Choose a <strong>sound</strong> and simply listen. Let it fill the mind completely — nothing else.',
      'When you are settled, tap <strong>Start</strong>. The sound falls silent and you hold it <strong>in imagination alone</strong>.',
      'Each time the mind wanders from the imagined sound, <strong>tap the screen</strong> to log the halt honestly.',
      'When the inner tone collapses, tap <strong>Lost Focus</strong> to end the rep. Rep by rep, the imagined sound grows steady.'
    ]
  },
  autosug: {
    title: 'Autosuggestion',
    steps: [
      'Pick <strong>one trait</strong> from your Soul Mirror to impress upon the subconscious.',
      'Repeat its phrase in the <strong>present tense</strong>, as if it is already true — <strong>tap once</strong> with each repetition.',
      'Reach the day\'s count to complete the session. Repetition, not force, is what <strong>influences the subconscious</strong>.',
      'Return <strong>daily</strong>. The mind accepts as real whatever it is told often enough.'
    ]
  },
  sense: {
    title: 'Senses',
    steps: [
      'Choose a sense to train — <strong>Feeling</strong>, <strong>Smell</strong>, or <strong>Taste</strong> — and set your minutes goal.',
      'A sensation is revealed when the session begins. <strong>Summon it</strong> from imagination alone, with nothing before you.',
      'Hold it <strong>vividly and unbroken</strong>. When it fades or another impression intrudes, gently rebuild it.',
      'Sit with it until the bell. Session by session, the imagined sense grows as real as the outer one.'
    ]
  },
  thought: {
    title: 'Thought Control',
    steps: [
      '<strong>Observation</strong>: watch thoughts arise and pass without following them. Tap when you get lost in one.',
      '<strong>Focus</strong>: hold one chosen thought exclusively. Tap the moment another intrudes.',
      '<strong>Vacancy</strong>: hold the mind completely empty — the hardest of the three. Tap at the first flicker of content.',
      'Set your minutes goal and sit until the bell. Each tap is honest bookkeeping — <strong>fewer taps each week</strong> is the progress.'
    ]
  },
  pore: {
    title: 'Pore Breathing',
    steps: [
      'Sit quietly and choose your number of <strong>breaths</strong>. Each breath is one full inhale and exhale.',
      'As you <strong>inhale</strong>, imagine drawing living light in through every pore of the skin.',
      'As you <strong>exhale</strong>, release darkness and fatigue back out through the same pores.',
      'The whole body breathes <strong>as one organ</strong>. With practice, vitality gathers and the breath grows still.'
    ]
  },
  achievements: {
    title: 'Achievements',
    steps: [
      'Every milestone you cross — streaks, sessions, hours held, bodies built — is <strong>recorded here</strong>.',
      'Tap any achievement to see <strong>what it asks</strong> and how close you already are.',
      'Locked ones show the <strong>path to earn them</strong>; earned ones keep the moment you crossed the threshold.',
      'They gather quietly as you practice. Return now and then to see <strong>how far you\'ve come</strong>.'
    ]
  },
  faq: {
    title: 'FAQ',
    steps: [
      'Common questions about practice, progress, and the path are <strong>answered here</strong>.',
      'Tap any question to <strong>expand its answer</strong>; tap again to fold it away.',
      'The answers cover <strong>sync, streaks, exercises, and Omnia</strong> — scroll to find your topic.',
      'This page grows as the practice deepens. Return whenever something is <strong>unclear</strong>.'
    ]
  },
  playground: {
    title: 'Playground',
    steps: [
      'The Playground is the <strong>Laboratory</strong> — a look at practices still brewing.',
      'Each card is an <strong>experiment</strong> in consciousness that isn\'t quite ready yet.',
      'Cards marked <strong>Soon</strong> are on the way, and will open right here once they\'re done.',
      'Check back as the work continues — <strong>new practices</strong> arrive over time.'
    ]
  },
  akasha: {
    title: 'Akasha',
    kind: 'Currency',
    steps: [
      'Akasha is Omnia\'s currency — the <strong>fuel</strong> that builds her bodies and carries her through each Step.',
      'Earn it by <strong>completing exercises</strong>: reaching or beating your recommendation pays the most.',
      'Collect Omnia\'s <strong>daily gift</strong> and claim gifts from the <strong>7x2 Challenge</strong> for a steady bonus on top.',
      'Spend it on <strong>generators, upgrades, and forms</strong>. Your wallet has no limit; each generator\'s reservoir fills until you return to collect it.'
    ]
  }
};

var _currentExExplainerKey = null;
function openExExplainer(ex) {
  var data = EX_EXPLAINERS[ex];
  if (!data) return;
  _currentExExplainerKey = ex;
  var omniaEl = document.getElementById('exExplainOmnia');
  var titleEl = document.getElementById('exExplainTitle');
  var kindEl = document.getElementById('exExplainKind');
  var stepsEl = document.getElementById('exExplainSteps');
  if (omniaEl) omniaEl.innerHTML = omniaHeadSVG(54, 88);
  if (titleEl) titleEl.textContent = data.title || 'How it works';
  if (kindEl) kindEl.textContent = data.kind || 'Tutorial';
  if (stepsEl) stepsEl.innerHTML = data.steps.map(function(s, i) {
    return '<div class="ex-explain-step"><div class="ex-explain-step-num">' + (i + 1) + '</div>'
      + '<div class="ex-explain-step-text">' + s + '</div></div>';
  }).join('');
  var overlay = document.getElementById('exExplainOverlay');
  if (overlay) overlay.classList.add('show');
}

function closeExExplainer() {
  var overlay = document.getElementById('exExplainOverlay');
  if (overlay) overlay.classList.remove('show');
}

// TEMPORARY (testing): swipe right off the Akasha explainer to reach a
// per-exercise Akasha breakdown screen. Remove alongside akashaStatsScreen
// and the local ledger entries in omnia-rewards-client.js once the economy's
// been evaluated.
(function() {
  var overlay = document.getElementById('exExplainOverlay');
  if (!overlay) return;
  var startX = 0, startY = 0, tracking = false;
  overlay.addEventListener('touchstart', function(e) {
    tracking = _currentExExplainerKey === 'akasha' && e.touches.length === 1;
    if (!tracking) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  overlay.addEventListener('touchend', function(e) {
    if (!tracking) return;
    tracking = false;
    var touch = e.changedTouches[0];
    var dx = touch.clientX - startX;
    var dy = touch.clientY - startY;
    if (dx > 70 && Math.abs(dy) < 60) {
      closeExExplainer();
      if (typeof renderAkashaStats === 'function') renderAkashaStats();
      showScreen('akashaStatsScreen');
    }
  }, { passive: true });
})();
document.getElementById('akashaStatsBack').addEventListener('click', function() {
  showScreen('homeScreen');
});

// Inline Omnia explainer on the Clock setup screen — expands the steps in place
// with a gentle crystal pop, rather than opening a modal.
function toggleClkOmnia() {
  var el = document.getElementById('clkOmnia');
  if (el) el.classList.toggle('open');
}

function openExerciseSetup(ex) {
  suppressTutorialForExerciseEntry();
  currentExercise = ex;
  exSetupOriginMode = (typeof currentMode !== 'undefined') ? currentMode : 'concentration';
  stopAllAudio();
  var def = EXERCISE_DEFS[ex];
  if (!def) return;
  updateExSetupBanner(ex);
  // Per-exercise ambience hook — CSS keys off data-ex for setup backdrops.
  var scr = document.getElementById('exSetupScreen');
  if (scr) scr.dataset.ex = ex;
  document.getElementById('exSetupIcon').innerHTML = def.icon;
  document.getElementById('exSetupName').textContent = def.name;
  var _descEl = document.getElementById('exSetupDesc');
  var _descHtml = typeof def.desc === 'function' ? def.desc() : (def.desc || '');
  _descEl.innerHTML = _descHtml;
  _descEl.style.display = _descHtml.trim() ? '' : 'none';
  _descEl.style.marginBottom = _descHtml.trim() ? '32px' : '0';
  if (ex === 'visual') {
    document.getElementById('exSetupDesc').innerHTML +=
      '<div style="margin-top:12px;">'
      + '<button onclick="showScreen(\'visTutorialScreen\')" style="background:none; border:none; padding:0; font-family:\'DM Mono\',monospace; font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:#d4956e; cursor:pointer; text-decoration:underline; text-underline-offset:3px;">Read Full Tutorial &nbsp;&#8594;</button>'
      + '</div>';
  }
  var contentEl = document.getElementById('exSetupContent');
  var html = typeof def.setupHTML === 'function' ? def.setupHTML() : def.setupHTML;
  contentEl.innerHTML = html;
  showScreen('exSetupScreen');
  // Wire dynamic content AFTER screen is shown so elements are in visible DOM
  if (ex === 'visual') {
    setupVisPreview();
    var shapesBtn2 = document.getElementById('visCatShapes');
    var objectsBtn2 = document.getElementById('visCatObjects');
    if (shapesBtn2) shapesBtn2.addEventListener('click', function() { switchVisCategory('shapes'); });
    if (objectsBtn2) objectsBtn2.addEventListener('click', function() { switchVisCategory('objects'); });
    var realLifeBtn2 = document.getElementById('visCatRealLife');
    if (realLifeBtn2) realLifeBtn2.addEventListener('click', function() { switchVisCategory('reallife'); });
    var customBtn2 = document.getElementById('visCatCustom');
    if (customBtn2) customBtn2.addEventListener('click', function() { switchVisCategory('custom'); });
    // Open/closed eyes toggle
    var modeToggle = document.getElementById('visModeToggle');
    var modeDot = document.getElementById('visModeDot');
    var modeSlider = document.getElementById('visModeSlider');
    // Reflect current state
    if (modeToggle) modeToggle.checked = visOpenEyesMode;
    if (modeDot) modeDot.style.transform = visOpenEyesMode ? 'translateX(16px)' : '';
    if (modeDot) modeDot.style.opacity = visOpenEyesMode ? '1' : '.5';
    if (modeToggle) modeToggle.addEventListener('change', function() {
      visOpenEyesMode = modeToggle.checked;
      if (modeDot) modeDot.style.transform = visOpenEyesMode ? 'translateX(16px)' : '';
      if (modeDot) modeDot.style.opacity = visOpenEyesMode ? '1' : '.5';
    });
  }
  if (ex === 'auditory') { buildSoundGrid(); }
  if (ex === 'clock') { activeClockEditPart = null; applyHeroClockTheme(); }
  // Give the Clock's Begin button a glowing copper treatment to match the
  // rest of its themed setup page; other exercises keep the plain style.
  var _beginBtn = document.getElementById('exSetupBeginBtn');
  if (_beginBtn) _beginBtn.classList.toggle('clk-begin-glow', ex === 'clock');
}

function setAsanaDuration(min) {
  localStorage.setItem('presence_asana_duration', min);
}

function adjustAsanaDuration(delta) {
  var next;
  var floor = (typeof guideFloorMin === 'function') ? guideFloorMin('asana') : 0;
  if (floor) {
    // Advanced override active → the stepper edits that starting floor.
    next = guideClamp(floor + delta, 1, GUIDE_FLOOR_CAP);
    if (!guideState._advancedFloors) guideState._advancedFloors = {};
    guideState._advancedFloors.asana = next;
    saveGuideState(guideState);
  } else {
    // Foundational ceiling → free manual duration.
    var current = parseInt(localStorage.getItem('presence_asana_duration'), 10) || 30;
    next = Math.max(1, Math.min(GUIDE_FLOOR_CAP, current + delta));
    localStorage.setItem('presence_asana_duration', next);
  }
  var el = document.getElementById('asanaStepperVal');
  if (el) el.textContent = next + ' min';
}

// Exercise card clicks
document.getElementById('concBeginnerGrid').addEventListener('click', function(e) {
  var card = e.target.closest('.exercise-card');
  if (card && card.dataset.exercise) openExerciseSetup(card.dataset.exercise);
});

document.getElementById('concExpertGrid').addEventListener('click', function(e) {
  var card = e.target.closest('.exercise-card[data-exercise]');
  if (!card) return;
  var def = EXERCISE_DEFS[card.dataset.exercise];
  if (def && def.begin) {
    suppressTutorialForExerciseEntry();
    def.begin();
  }
});

document.getElementById('exerciseGrid').addEventListener('click', function(e) {
  var card = e.target.closest('.exercise-card');
  if (!card || !card.dataset.exercise) return;
  if (card.dataset.exercise === 'soulmirror') {
    if (typeof _smOriginMode !== 'undefined') _smOriginMode = 'concentration';
    suppressTutorialForExerciseEntry();
    // Reset to mirror tab (in whichever mirror mode was last used)
    document.querySelectorAll('.soul-tab').forEach(function(t) {
      t.style.borderBottomColor = 'transparent';
      t.style.color = 'var(--muted)';
    });
    var mt = document.querySelector('.soul-tab[data-tab="mirror"]');
    if (mt) { mt.style.borderBottomColor = '#a47eb8'; mt.style.color = '#c4a8d4'; }
    var smDd = document.getElementById('soulMirrorDropdown');
    if (smDd) smDd.style.display = 'none';
    soulMirrorShowPanel('mirror');
    renderSoulMirrorTraits();
    showScreen('soulMirrorScreen');
  } else if (card.dataset.exercise === 'multisense' || card.dataset.exercise === 'allangles') {
    var def = EXERCISE_DEFS[card.dataset.exercise];
    if (def) {
      suppressTutorialForExerciseEntry();
      def.begin();
    }
  } else {
    openExerciseSetup(card.dataset.exercise);
  }
});

// ── Discard session (red X button on all session screens) ─
function discardSession(type, _c) {
  if (!_c) { showConfirm('Discard Session', 'No data will be saved.', function(){ discardSession(type, true); }); return; }
  switch (type) {
    case 'awareness':
      releaseExerciseWakeLock();
      clearTimeout(sessionTimerHandle);
      sessionStartTime = null;
      renderHome();
      showScreen('homeScreen');
      break;
    case 'clock':
      releaseExerciseWakeLock();
      if (concCountInterval) { clearInterval(concCountInterval); concCountInterval = null; }
      if (concAutoStopTimer) { clearTimeout(concAutoStopTimer); concAutoStopTimer = null; }
      cancelAnimationFrame(concTimerHandle);
      concStartTime = null;
      concPendingBegin = false;
      var cd = document.getElementById('clockCountdown');
      if (cd) { cd.classList.remove('show'); cd.textContent = ''; }
      showScreen('homeScreen');
      switchMode('concentration');
      break;
    case 'vis':
      releaseExerciseWakeLock();
      cancelAnimationFrame(visTimerHandle);
      visTimerHandle = null;
      visSessionStartTime = null;
      stopAllAudio();
      showScreen('homeScreen');
      switchMode('concentration');
      break;
    case 'auditory':
      releaseExerciseWakeLock();
      cancelAnimationFrame(audTimerHandle);
      stopAllAudio();
      stopWaveAnimation();
      audRepActive = false;
      audSessionStartTime = null;
      showScreen('homeScreen');
      switchMode('concentration');
      break;
    case 'tc':
      releaseExerciseWakeLock();
      cancelAnimationFrame(tcTimerHandle);
      clearInterval(_tcAlarmInterval);
      _tcAlarmInterval = null;
      // A discard mid pre-session-countdown must cancel the pending
      // interval/timer too, or the session silently begins in the
      // background after the user has already left the screen.
      clearInterval(_tcCountInterval);
      _tcCountInterval = null;
      clearTimeout(_tcCountBeginTimer);
      _tcCountBeginTimer = null;
      tcStartTime = null;
      var tco = document.getElementById('tcTimesUpOverlay');
      if (tco) tco.style.display = 'none';
      var tcc = document.getElementById('tcCountdownOverlay');
      if (tcc) tcc.style.display = 'none';
      showScreen('homeScreen');
      switchMode('concentration');
      break;
    case 'asana':
      clearTimeout(asanaTimerHandle);
      asanaTimerHandle = null;
      asanaStartTime = null;
      // A discard mid pre-session-countdown must cancel the pending
      // interval/timer too, or the session silently begins in the
      // background after the user has already left the screen.
      clearInterval(_asanaCountInterval);
      _asanaCountInterval = null;
      clearTimeout(_asanaCountBeginTimer);
      _asanaCountBeginTimer = null;
      var asc = document.getElementById('asanaCountdownOverlay');
      if (asc) asc.style.display = 'none';
      releaseExerciseWakeLock();
      showScreen('homeScreen');
      switchMode('concentration');
      break;
    case 'sense':
      clearTimeout(senseTimerHandle);
      senseTimerHandle = null;
      senseStartTime = null;
      releaseExerciseWakeLock();
      showScreen('homeScreen');
      switchMode('concentration');
      break;
    case 'prayer':
      releaseExerciseWakeLock();
      cancelAnimationFrame(prayerSessionTimerHandle);
      prayerSessionTimerHandle = null;
      prayerSessionStart = null;
      _pendingPrayer = null;
      showScreen('homeScreen');
      switchMode('prayer');
      break;
  }
}

// ── Expanded / carousel view ──────────────────────────────
var concViewMode = 'grid';

function applyConcCarouselToGrid(wrapper) {
  var gridEl = wrapper.querySelector('.exercise-grid');
  var dotsEl = wrapper.querySelector('.carousel-dots');
  if (!gridEl || !dotsEl) return;
  if (concViewMode === 'carousel') {
    gridEl.classList.add('carousel-mode');
    gridEl.scrollLeft = 0;
    // Build dot indicators
    var cards = gridEl.querySelectorAll('.exercise-card');
    dotsEl.innerHTML = '';
    cards.forEach(function(c, i) {
      var dot = document.createElement('span');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dotsEl.appendChild(dot);
    });
    dotsEl.classList.add('visible');
    // Attach scroll listener (store ref so we can remove it later)
    if (gridEl._carouselFn) gridEl.removeEventListener('scroll', gridEl._carouselFn);
    gridEl._carouselFn = function() {
      var idx = Math.round(gridEl.scrollLeft / gridEl.clientWidth);
      dotsEl.querySelectorAll('.carousel-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === idx);
      });
    };
    gridEl.addEventListener('scroll', gridEl._carouselFn, { passive: true });
  } else {
    gridEl.classList.remove('carousel-mode');
    dotsEl.classList.remove('visible');
    if (gridEl._carouselFn) {
      gridEl.removeEventListener('scroll', gridEl._carouselFn);
      gridEl._carouselFn = null;
    }
  }
}

function toggleConcView() {
  concViewMode = concViewMode === 'grid' ? 'carousel' : 'grid';
  var btn = document.getElementById('concViewToggle');
  if (btn) {
    btn.textContent = concViewMode === 'carousel' ? '⊟' : '⊞';
    btn.classList.toggle('active', concViewMode === 'carousel');
    btn.title = concViewMode === 'carousel' ? 'Grid view' : 'Expanded view';
  }
  [
    document.getElementById('concBeginnerGrid'),
    document.getElementById('concExpertGrid')
  ].forEach(function(w) { if (w) applyConcCarouselToGrid(w); });
}

document.getElementById('concViewToggle').addEventListener('click', toggleConcView);

// Level tab toggle
(function() {
  var tabs = [
    { btn: document.getElementById('concLevelBeginner'), grid: document.getElementById('concBeginnerGrid') },
    { btn: document.getElementById('concLevelExpert'),   grid: document.getElementById('concExpertGrid') }
  ];
  tabs.forEach(function(t) {
    if (!t.btn) return;
    t.btn.addEventListener('click', function() {
      tabs.forEach(function(x) { x.btn.classList.remove('active'); x.grid.style.display = 'none'; });
      t.btn.classList.add('active');
      t.grid.style.display = '';
      // Re-apply carousel state to newly visible grid
      if (concViewMode === 'carousel') applyConcCarouselToGrid(t.grid);
    });
  });
})();

// Setup screen back and begin
document.getElementById('exSetupBack').addEventListener('click', function() {
  stopAllAudio();
  showScreen('homeScreen');
  if (typeof returnAfterExercise === 'function') returnAfterExercise(exSetupOriginMode);
  else switchMode('concentration');
});
document.getElementById('visTutorialBack').addEventListener('click', function() {
  showScreen('exSetupScreen');
});

document.getElementById('exSetupBeginBtn').addEventListener('click', function() {
  var def = EXERCISE_DEFS[currentExercise];
  if (def && def.begin) {
    suppressTutorialForExerciseEntry();
    def.begin();
  }
});

function switchVisCategory(cat) {
  currentVisCategory = cat;
  var shapesBtn = document.getElementById('visCatShapes');
  var objectsBtn = document.getElementById('visCatObjects');
  var realLifeBtn = document.getElementById('visCatRealLife');
  var customBtn = document.getElementById('visCatCustom');
  if (shapesBtn) shapesBtn.classList.toggle('active', cat === 'shapes');
  if (objectsBtn) objectsBtn.classList.toggle('active', cat === 'objects');
  if (realLifeBtn) realLifeBtn.classList.toggle('active', cat === 'reallife');
  if (customBtn) customBtn.classList.toggle('active', cat === 'custom');
  setupVisPreview();
}
// visCat listeners wired dynamically in openExerciseSetup

// Exercise routing now handled by exSetupBeginBtn

document.getElementById('visStudyStartBtn').addEventListener('click', beginVisSession);
document.getElementById('visStudyCancelBtn').addEventListener('click', function() {
  showScreen('homeScreen');
  switchMode('concentration');
});
document.getElementById('visEndSessionBtn').addEventListener('click', function() {
  var _visElapsed = visSessionStartTime ? Math.floor((Date.now() - visSessionStartTime) / 1000) : 0;
  omniaConfirmEarlyEnd('visual', _visElapsed, endVisSession);
});
document.getElementById('visMainArea').addEventListener('click', function() {
  // Only register halts when actively concentrating (Image Faded button visible)
  var lostBtn = document.getElementById('visLostBtn');
  if (visRepActive && lostBtn && lostBtn.style.display !== 'none') {
    recordHalt();
  }
});

document.getElementById('visBeginRepBtn').addEventListener('click', function() {
  var rb = document.getElementById('visRefreshBtn');
  if (rb) rb.style.display = 'none';
  startVisRep();
});

// ── Refresh image overlay ──
var visRefreshTimer = null;

var visRefreshPauseStart = null; // timestamp when overlay opened
var visRepPausedMs = 0;           // total ms paused this rep

function showVisRefresh() {
  if (!currentVisObject) return;
  var overlay = document.getElementById('visRefreshOverlay');
  if (!overlay) return;
  document.getElementById('visRefreshObject').innerHTML = renderVisObject(currentVisObject, 320);
  document.getElementById('visRefreshLabel').textContent = currentVisObject.label;
  var remaining = 15;
  document.getElementById('visRefreshCountdown').textContent = remaining + 's';
  overlay.style.display = 'flex';
  // Pause the rep timer
  visRefreshPauseStart = Date.now();
  visRefreshTimer = setInterval(function() {
    remaining--;
    if (remaining <= 0) {
      hideVisRefresh();
    } else {
      var cd = document.getElementById('visRefreshCountdown');
      if (cd) cd.textContent = remaining + 's';
    }
  }, 1000);
}

function hideVisRefresh() {
  if (visRefreshTimer) { clearInterval(visRefreshTimer); visRefreshTimer = null; }
  // Resume rep timer — accumulate paused time
  if (visRefreshPauseStart) {
    visRepPausedMs += Date.now() - visRefreshPauseStart;
    visRefreshPauseStart = null;
  }
  var overlay = document.getElementById('visRefreshOverlay');
  if (overlay) overlay.style.display = 'none';
}

document.getElementById('visRefreshBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  showVisRefresh();
});
document.getElementById('visSwitchObjectBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  // Pick a new object and update the display between reps
  currentVisObject = pickVisObject();
  var sessionWrap = document.getElementById('visObjectSession');
  if (sessionWrap) {
    sessionWrap.style.opacity = '1';
    sessionWrap.style.marginTop = '16px';
    sessionWrap.innerHTML = renderVisObject(currentVisObject, 260);
  }
});
document.getElementById('visIntermediateFadedBtn').addEventListener('click', function() {
  stopSceneAudio();
  // Record this as a concentration session with the time spent
  var xpEarned = 50; // flat XP for completing an intermediate session
  concState.xp += xpEarned;
  if (isConcNewSession()) concState.totalSessions++;
  var didLevelUp = awardLevelUps(concState, concSumXpToLevel, concXpForLevel);
  recordExerciseCompletion({
    entry: {
      date: new Date().toISOString(),
      type: window.visIntermediateExercise === 'allangles' ? 'all-angles' : 'multi-sense',
      object: currentVisObject ? currentVisObject.label : '',
      xpEarned: xpEarned
    },
    skipOmnia: true // intermediate visual drills earn XP only, no Omnia award
  });
  var _dm = mintDarkMatterFromPractice(DARK_MATTER_PER_ADVANCED);
  showToast('+' + xpEarned + ' XP' + (_dm ? ' · +' + _dm + ' ◆ Dark Matter' : ''));
  if(didLevelUp) setTimeout(function(){showConcLevelUp(concState.level);},600);
  renderConcHome();
  showScreen('homeScreen');
  switchMode('concentration');
});

document.getElementById('visIntermediateSwitchBtn').addEventListener('click', function() {
  if (window.visIntermediateExercise === 'multisense') {
    pickMultiSenseScene();
  } else {
    currentVisObject = pickVisObject();
  }
  renderVisIntermediateSession(window.visIntermediateExercise);
});

document.getElementById('visRefreshCancelBtn').addEventListener('click', function(e) {
  e.stopPropagation();
  hideVisRefresh();
});
document.getElementById('visLostBtn').addEventListener('click', imageFaded);
document.getElementById('visSaveBtn').addEventListener('click', saveVisSessionResult);
document.getElementById('visViewHistoryBtn').addEventListener('click', function() {
  concHistoryFrom='home'; concHistoryFilter='all'; renderConcHistory(); showScreen('concHistoryScreen');
});

// ── Concentration level-up overlay ──
function showConcLevelUp(level) {
  var overlay = document.getElementById('levelupOverlay');
  var bg = document.getElementById('levelupBg');
  var particles = document.getElementById('levelupParticles');
  var color = '#d4956e'; // always orange for concentration
  var group = getSymbolGroup(level);
  var fillRoman = getSymbolLevelRoman(level);
  var title = getConcRank(level);
  var tierName = 'Concentration';

  document.getElementById('levelupNum').textContent = level;
  document.getElementById('levelupTitle').textContent = title;
  document.getElementById('levelupTier').textContent = tierName + ' · ' + group.name;
  document.getElementById('levelupFill').textContent = fillRoman;
  document.getElementById('levelupSymbol').innerHTML = renderSymbolSVG(group.id, color, 80);
  document.getElementById('levelupNum').style.color = color;
  document.getElementById('levelupTitle').style.color = color;
  document.getElementById('levelupTier').style.color = color;
  document.getElementById('levelupFill').style.color = color;
  document.getElementById('levelupContinue').style.borderColor = color + '44';
  document.getElementById('levelupContinue').style.color = color;

  bg.style.background = 'radial-gradient(ellipse 80% 60% at 50% 40%, ' + color + '18 0%, #07080d 70%)';

  particles.innerHTML = '';
  for (var i = 0; i < 18; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var size = Math.random() * 6 + 3;
    p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;'
      + 'left:' + (Math.random() * 100) + '%;'
      + 'top:' + (40 + Math.random() * 40) + '%;'
      + 'background:' + color + ';'
      + 'animation-delay:' + (Math.random() * 1.2) + 's;'
      + 'animation-duration:' + (1.5 + Math.random()) + 's;';
    particles.appendChild(p);
  }

  overlay.classList.add('show');
}
