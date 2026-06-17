/* ============================================================
   QUEST — procedural pixel-art world map (canvas)
   Drawn on a tile grid, scaled crisp via CSS image-rendering.
   Swap this out for a real Map.png later if desired.
   ============================================================ */

(function () {
  "use strict";

  /* ---- level / progress wiring ---- */
  var LEVEL = 5, MAX = 99;
  var fill = document.getElementById("xpFill");
  var label = document.getElementById("levelValue");
  if (fill) {
    // start at 0 then animate to the real value on next frame
    requestAnimationFrame(function () {
      fill.style.width = (LEVEL / MAX) * 100 + "%";
    });
  }
  if (label) label.textContent = String(LEVEL).padStart(2, "0");

  /* ---- canvas setup ---- */
  var canvas = document.getElementById("worldMap");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var TILE = 14;
  var COLS = Math.floor(canvas.width / TILE);   // 44
  var ROWS = Math.floor(canvas.height / TILE);  // 22

  /* palette */
  var C = {
    waterA: "#1d4e74", waterB: "#2a6797", waterHi: "#4f93c4",
    sand:   "#caa468", sandB: "#b8924f",
    grassA: "#3c7a3a", grassB: "#469044", grassC: "#2f6630",
    dirt:   "#9c6b3c", dirtB: "#86592f",
    rock:   "#6c6f82", rockB: "#565a6e", snow: "#e6eef7",
    trunk:  "#5a3a22", leafA: "#286b2c", leafB: "#357f38", leafHi: "#54a84e",
    stone:  "#8c90a3", stoneB: "#6a6e80", flag: "#c5453f",
    p1: "#43e8cf", p2: "#f5b942"
  };

  /* deterministic RNG so the world is always the same */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(7);

  /* ---- build terrain grid ----
     codes: g grass, w water, s sand, d dirt-path, m mountain, n snow, t tree */
  var grid = [];
  for (var y = 0; y < ROWS; y++) {
    grid[y] = [];
    for (var x = 0; x < COLS; x++) grid[y][x] = "g";
  }

  // lake (ellipse) with sandy shore
  var lcx = COLS * 0.30, lcy = ROWS * 0.62, lrx = 7, lry = 4.2;
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    var dl = Math.pow((x - lcx) / lrx, 2) + Math.pow((y - lcy) / lry, 2);
    if (dl < 1) grid[y][x] = "w";
    else if (dl < 1.4) grid[y][x] = "s";
  }

  // river flowing from top into the lake
  for (y = 0; y < lcy; y++) {
    var rx = Math.round(lcx + Math.sin(y * 0.5) * 2.2);
    for (var w = -1; w <= 1; w++) {
      var xx = rx + w;
      if (xx >= 0 && xx < COLS && grid[y][xx] === "g") grid[y][xx] = "w";
    }
  }

  // mountain range, top-right, snow-capped peaks
  for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
    var mh = (x - COLS * 0.7) * 0.9 - (y - 1) * 1.4 + (rnd() * 2 - 1);
    if (x > COLS * 0.62 && y < ROWS * 0.42 && mh > 0) {
      grid[y][x] = (y <= 1 || mh > 5) ? "n" : "m";
    }
  }

  // winding dirt path from bottom-left up toward the castle
  var px = 5;
  for (y = ROWS - 1; y >= 4; y--) {
    px += Math.round((rnd() - 0.45) * 1.6);
    px = Math.max(2, Math.min(COLS - 6, px));
    if (grid[y][px] === "g") grid[y][px] = "d";
    if (grid[y][px + 1] === "g") grid[y][px + 1] = "d";
  }

  // castle landmark (3x3 of stone) near upper-center on grass
  var cx0 = Math.round(COLS * 0.52), cy0 = 4;
  for (y = cy0; y < cy0 + 3; y++) for (x = cx0; x < cx0 + 3; x++) {
    if (grid[y] && grid[y][x] === "g") grid[y][x] = "C";
  }

  // forests: scattered tree clusters on grass
  for (var i = 0; i < 70; i++) {
    var tx = Math.floor(rnd() * COLS), ty = Math.floor(rnd() * ROWS);
    if (grid[ty][tx] === "g") {
      grid[ty][tx] = "t";
      // small cluster
      if (rnd() > .4 && grid[ty][tx + 1] === "g") grid[ty][tx + 1] = "t";
      if (rnd() > .5 && grid[ty + 1] && grid[ty + 1][tx] === "g") grid[ty + 1][tx] = "t";
    }
  }

  /* ---- tile drawing helpers ---- */
  function px2(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
  var P = TILE / 7; // sub-pixel block size for detailing

  function drawGrass(x, y, gx, gy) {
    var base = ((gx + gy) % 2) ? C.grassA : C.grassB;
    px2(x, y, TILE, TILE, base);
    // a few darker tufts, deterministic per cell
    var r = mulberry32(gx * 73 + gy * 911);
    for (var k = 0; k < 3; k++) {
      var bx = x + Math.floor(r() * 6) * P, by = y + Math.floor(r() * 6) * P;
      px2(bx, by, P, P, r() > .5 ? C.grassC : C.grassHi || C.grassA);
    }
  }
  function drawSand(x, y, gx, gy) {
    px2(x, y, TILE, TILE, ((gx + gy) % 2) ? C.sand : C.sandB);
  }
  function drawDirt(x, y, gx, gy) {
    px2(x, y, TILE, TILE, ((gx + gy) % 2) ? C.dirt : C.dirtB);
    var r = mulberry32(gx * 17 + gy * 5);
    px2(x + Math.floor(r() * 6) * P, y + Math.floor(r() * 6) * P, P, P, C.dirtB);
  }
  function drawMountain(x, y, snow) {
    px2(x, y, TILE, TILE, C.rock);
    // shaded right side
    px2(x + TILE / 2, y, TILE / 2, TILE, C.rockB);
    if (snow) { px2(x, y, TILE, TILE / 3, C.snow); px2(x, y + TILE / 3, TILE, P, "#bcd0e6"); }
  }
  function drawTree(x, y, gx, gy) {
    drawGrass(x, y, gx, gy);
    // trunk
    px2(x + TILE / 2 - P, y + TILE - 2 * P, 2 * P, 2 * P, C.trunk);
    // canopy
    px2(x + P, y + P, TILE - 2 * P, TILE - 3 * P, C.leafA);
    px2(x + 2 * P, y, TILE - 4 * P, 2 * P, C.leafB);
    px2(x + 2 * P, y + 2 * P, 2 * P, 2 * P, C.leafHi);
  }
  function drawCastle(x, y) {
    drawGrass(x, y, 0, 0);
    px2(x + P, y + P, TILE - 2 * P, TILE - P, C.stoneB);
    px2(x + P, y + P, TILE - 2 * P, TILE / 2, C.stone);
    // crenellations
    px2(x + P, y, P, P, C.stone);
    px2(x + TILE / 2 - P / 2, y, P, P, C.stone);
    px2(x + TILE - 2 * P, y, P, P, C.stone);
    // window
    px2(x + TILE / 2 - P / 2, y + TILE / 2, P, 2 * P, "#1a1a2a");
  }
  // water gets animated shimmer; shade chosen by phase
  function drawWater(x, y, gx, gy, t) {
    var wave = Math.sin((gx + gy) * 0.8 + t * 2);
    px2(x, y, TILE, TILE, wave > 0 ? C.waterB : C.waterA);
    // highlight glints
    if (Math.sin((gx * 1.7 - gy) + t * 3) > 0.7) {
      px2(x + 2 * P, y + 2 * P, 2 * P, P, C.waterHi);
    }
  }

  /* ---- render the static layer once to an offscreen buffer ---- */
  var off = document.createElement("canvas");
  off.width = canvas.width; off.height = canvas.height;
  var octx = off.getContext("2d");

  (function renderStatic() {
    var save = ctx; ctx = octx;            // temporarily draw to offscreen
    for (var gy = 0; gy < ROWS; gy++) for (var gx = 0; gx < COLS; gx++) {
      var x = gx * TILE, y = gy * TILE, c = grid[gy][gx];
      switch (c) {
        case "g": drawGrass(x, y, gx, gy); break;
        case "s": drawSand(x, y, gx, gy); break;
        case "d": drawDirt(x, y, gx, gy); break;
        case "m": drawMountain(x, y, false); break;
        case "n": drawMountain(x, y, true); break;
        case "t": drawTree(x, y, gx, gy); break;
        case "C": drawCastle(x, y); break;
        case "w": drawGrass(x, y, gx, gy); break; // water painted live on top
      }
    }
    ctx = save;
  })();

  /* ---- player markers (J1 teal, J2 amber) standing in the world ---- */
  var markers = [
    { gx: 8,  gy: 16, color: C.p1, label: "1" },
    { gx: 30, gy: 14, color: C.p2, label: "2" }
  ];
  function drawMarker(m, t) {
    var x = m.gx * TILE, y = m.gy * TILE;
    var bob = Math.round(Math.sin(t * 4 + m.gx) * 2); // little hop
    // glow ring
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4);
    px2(x - P, y + TILE - P, TILE + 2 * P, 2 * P, m.color);
    ctx.restore();
    // pole + flag
    px2(x + TILE / 2 - P / 2, y - 2 * P + bob, P, TILE / 2 + 2 * P, "#2a2a38");
    px2(x + TILE / 2 + P / 2, y - 2 * P + bob, 3 * P, 2 * P, m.color);
  }

  /* ---- animation loop ---- */
  var start = performance.now();
  function frame(now) {
    var t = (now - start) / 1000;
    ctx.drawImage(off, 0, 0);
    // animated water on top of grass base
    for (var gy = 0; gy < ROWS; gy++) for (var gx = 0; gx < COLS; gx++) {
      if (grid[gy][gx] === "w") drawWater(gx * TILE, gy * TILE, gx, gy, t);
    }
    markers.forEach(function (m) { drawMarker(m, t); });
    requestAnimationFrame(frame);
  }

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    // single static render
    ctx.drawImage(off, 0, 0);
    for (var gy = 0; gy < ROWS; gy++) for (var gx = 0; gx < COLS; gx++)
      if (grid[gy][gx] === "w") drawWater(gx * TILE, gy * TILE, gx, gy, 0);
    markers.forEach(function (m) { drawMarker(m, 0); });
  } else {
    requestAnimationFrame(frame);
  }
})();
