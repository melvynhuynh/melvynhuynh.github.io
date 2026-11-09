/**
 * Koi banner, drawn on a canvas in ink and watercolor. Clicking the red envelope
 * replays the animation with robotic koi, and clicking it again brings the first ones back.
 * The water is painted once below the koi, and the lotus and leaves once above them.
 */
var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function createPond(pond, startRobotic) {
  var canvas = pond.querySelector("canvas");
  var ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) return null;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0;
  var H = 0;
  var water = null;
  var foreground = null;
  var area = null;
  var kois = [];
  var ripples = [];
  var lastFrame = 0;
  var clock = 0;
  var running = false;
  var visible = true;
  var robotic = startRobotic;
  var lastRipple = 0;
  // The first koi always says hi in English, then each entrance picks another language
  var greetings = ["你好！", "مرحبا!", "Привет!", "Xin chào!", "Salut !"];
  var greetingBag = [];
  var lastGreeting = null;
  var spoken = 0;

  /**
   * Seeded random, so the drawing looks the same on every visit
   */
  function seeded(seed) {
    return function() {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function range(random, min, max) {
    return min + random() * (max - min);
  }

  function pick(random, list) {
    return list[Math.floor(random() * list.length)];
  }

  // Shuffled bag, so every language comes up before one repeats, and never twice in a row
  function nextGreeting() {
    spoken++;
    if (spoken === 1) return "Hi!";
    if (!greetingBag.length) {
      greetingBag = greetings.slice();
      for (var i = greetingBag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var swap = greetingBag[i];
        greetingBag[i] = greetingBag[j];
        greetingBag[j] = swap;
      }
      if (greetingBag[greetingBag.length - 1] === lastGreeting) greetingBag.unshift(greetingBag.pop());
    }
    lastGreeting = greetingBag.pop();
    return lastGreeting;
  }

  function layer() {
    var c = document.createElement("canvas");
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    var g = c.getContext("2d");
    g.scale(dpr, dpr);
    return { canvas: c, ctx: g };
  }

  /**
   * Water: a clear watercolor wash, soft pools, brush strokes and fine ripples
   */
  function paintWater() {
    var random = seeded(11);
    var result = layer();
    var g = result.ctx;
    var i;

    var depth = g.createLinearGradient(0, 0, W, H);
    depth.addColorStop(0, "#c4eef2");
    depth.addColorStop(0.5, "#ace5ec");
    depth.addColorStop(1, "#bdeaf0");
    g.fillStyle = depth;
    g.fillRect(0, 0, W, H);

    var pools = Math.max(9, Math.round((W * H) / 22000));
    for (i = 0; i < pools; i++) {
      var bx = random() * W;
      var by = random() * H;
      var br = range(random, 60, 220);
      var soft = g.createRadialGradient(bx, by, 0, bx, by, br);
      var tone = pick(random, ["120, 214, 226", "226, 248, 248", "150, 226, 226"]);
      soft.addColorStop(0, "rgba(" + tone + ", 0.42)");
      soft.addColorStop(1, "rgba(" + tone + ", 0)");
      g.fillStyle = soft;
      g.fillRect(bx - br, by - br, br * 2, br * 2);
    }

    g.lineCap = "round";
    var strokes = Math.round((W * H) / 420);
    for (i = 0; i < strokes; i++) {
      var sx = random() * W;
      var sy = random() * H;
      var length = range(random, 30, 130);
      g.strokeStyle = pick(random, ["#8fdde8", "#d8f6f6", "#76d3e0"]);
      g.globalAlpha = range(random, 0.06, 0.2);
      g.lineWidth = range(random, 2, 9);
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(sx + length / 2, sy + range(random, -5, 5), sx + length, sy + range(random, -4, 4));
      g.stroke();
    }
    g.globalAlpha = 1;

    // Fine ripples in white and in pencil
    var arcs = Math.round(W / 70);
    for (i = 0; i < arcs; i++) {
      var ax = random() * W;
      var ay = random() * H;
      var turn = range(random, -0.4, 0.4);
      g.strokeStyle = random() < 0.6 ? "rgba(255, 255, 255, 0.85)" : "rgba(70, 130, 145, 0.38)";
      g.lineWidth = 0.9;
      for (var r = 0; r < 3; r++) {
        var start = range(random, 0, 6);
        g.beginPath();
        g.ellipse(ax, ay, 8 + r * 8, 3 + r * 3.5, turn, start, start + range(random, 0.8, 1.7));
        g.stroke();
      }
    }

    // Grain of the paper showing through
    var grain = Math.round((W * H) / 50);
    for (i = 0; i < grain; i++) {
      g.fillStyle = random() < 0.5 ? "rgba(40, 110, 125, 0.05)" : "rgba(255, 255, 255, 0.12)";
      g.fillRect(random() * W, random() * H, range(random, 0.5, 1.5), range(random, 0.5, 1.5));
    }

    // Small leaves drifting on the water
    var leaves = Math.round(W / 120);
    for (i = 0; i < leaves; i++) {
      g.save();
      g.translate(random() * W, random() * H);
      g.rotate(random() * Math.PI * 2);
      g.fillStyle = pick(random, ["rgba(140, 186, 96, 0.8)", "rgba(178, 204, 110, 0.8)"]);
      g.strokeStyle = "rgba(50, 70, 40, 0.5)";
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(-7, 0);
      g.quadraticCurveTo(0, -4.5, 7, 0);
      g.quadraticCurveTo(0, 4.5, -7, 0);
      g.fill();
      g.stroke();
      g.restore();
    }

    return result.canvas;
  }

  // Round lotus leaf with a notch, a green wash, veins and loose pencil lines
  function lotusLeaf(g, random, x, y, radius) {
    var notch = random() * Math.PI * 2;
    var gap = 0.2;
    g.save();
    g.translate(x, y);
    g.scale(1, 0.86);
    g.rotate(notch);

    function outline(shift) {
      g.beginPath();
      g.moveTo(shift, 0);
      g.arc(shift, shift * 0.5, radius, gap, Math.PI * 2 - gap);
      g.closePath();
    }

    g.shadowColor = "rgba(30, 90, 105, 0.3)";
    g.shadowBlur = 8;
    g.shadowOffsetY = 3;
    var wash = g.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
    wash.addColorStop(0, "#c2d883");
    wash.addColorStop(0.55, "#8fbf63");
    wash.addColorStop(1, "#5f9e55");
    g.fillStyle = wash;
    outline(0);
    g.fill();
    g.shadowColor = "transparent";

    g.strokeStyle = "rgba(45, 80, 40, 0.42)";
    g.lineWidth = 0.7;
    var veins = 11;
    for (var i = 0; i < veins; i++) {
      var angle = gap + ((Math.PI * 2 - gap * 2) * (i + 0.5)) / veins;
      g.beginPath();
      g.moveTo(radius * 0.08 * Math.cos(angle), radius * 0.08 * Math.sin(angle));
      g.lineTo(radius * 0.92 * Math.cos(angle), radius * 0.92 * Math.sin(angle));
      g.stroke();
    }

    g.strokeStyle = "rgba(36, 50, 30, 0.74)";
    g.lineWidth = 0.95;
    outline(0);
    g.stroke();
    g.strokeStyle = "rgba(36, 50, 30, 0.28)";
    g.lineWidth = 0.6;
    outline(radius * 0.025);
    g.stroke();
    g.restore();
  }

  function petal(g, random, angle, length, width, deep) {
    g.save();
    g.rotate(angle);
    var wash = g.createLinearGradient(0, 0, 0, -length);
    wash.addColorStop(0, "#fff6ee");
    wash.addColorStop(0.55, deep ? "#f6a9bd" : "#fbc9d4");
    wash.addColorStop(1, deep ? "#e4648c" : "#ee86a4");
    g.fillStyle = wash;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-width, -length * 0.3, -width * 0.72, -length * 0.8, 0, -length);
    g.bezierCurveTo(width * 0.72, -length * 0.8, width, -length * 0.3, 0, 0);
    g.fill();
    g.strokeStyle = "rgba(90, 30, 50, 0.62)";
    g.lineWidth = 0.75;
    g.stroke();
    g.strokeStyle = "rgba(170, 60, 95, 0.3)";
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(0, -length * 0.14);
    g.lineTo(range(random, -1, 1), -length * 0.84);
    g.stroke();
    g.restore();
  }

  function lotus(g, random, x, y, radius) {
    var i;
    g.save();
    g.translate(x, y);
    g.scale(1, 0.92);
    g.shadowColor = "rgba(30, 90, 105, 0.28)";
    g.shadowBlur = 7;
    g.shadowOffsetY = 2;
    var turn = random() * Math.PI;
    for (i = 0; i < 9; i++) {
      petal(g, random, turn + (i / 9) * Math.PI * 2, radius, radius * 0.36, false);
    }
    g.shadowColor = "transparent";
    for (i = 0; i < 7; i++) {
      petal(g, random, turn + 0.3 + (i / 7) * Math.PI * 2, radius * 0.72, radius * 0.27, true);
    }
    for (i = 0; i < 5; i++) {
      petal(g, random, turn + 0.1 + (i / 5) * Math.PI * 2, radius * 0.46, radius * 0.18, true);
    }
    g.fillStyle = "#f0c94e";
    g.strokeStyle = "rgba(100, 70, 20, 0.7)";
    g.lineWidth = 0.7;
    g.beginPath();
    g.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = "rgba(120, 80, 20, 0.7)";
    for (i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(
        Math.cos((i / 6) * Math.PI * 2) * radius * 0.09,
        Math.sin((i / 6) * Math.PI * 2) * radius * 0.09,
        Math.max(0.5, radius * 0.018),
        0,
        Math.PI * 2
      );
      g.fill();
    }
    g.restore();
  }

  /**
   * Foreground: lotus and leaves near the corners, above the koi
   */
  function paintForeground() {
    var random = seeded(29);
    var result = layer();
    var g = result.ctx;
    var unit = Math.min(H, W * 0.6) / 280;

    lotusLeaf(g, random, W * 0.03, H * 0.1, 42 * unit);
    lotusLeaf(g, random, W * 0.115, H * 0.05, 28 * unit);
    lotusLeaf(g, random, W * 0.015, H * 0.56, 26 * unit);
    lotus(g, random, W * 0.075, H * 0.17, 28 * unit);

    lotusLeaf(g, random, W * 0.97, H * 0.88, 48 * unit);
    lotusLeaf(g, random, W * 0.86, H * 0.98, 36 * unit);
    lotusLeaf(g, random, W * 0.985, H * 0.42, 24 * unit);
    lotus(g, random, W * 0.925, H * 0.76, 34 * unit);

    lotusLeaf(g, random, W * 0.97, H * 0.06, 26 * unit);
    lotusLeaf(g, random, W * 0.12, H * 0.98, 30 * unit);
    lotus(g, random, W * 0.05, H * 0.9, 22 * unit);

    return result.canvas;
  }

  /**
   * Koi: a chain of points that follows the head
   */
  function makeKoi(settings) {
    var count = 14;
    var points = [];
    var segment = settings.length / count;
    var random = seeded(Math.round(settings.seed * 1000));
    var i;
    for (i = 0; i <= count; i++) {
      points.push({
        x: settings.x - Math.cos(settings.heading) * segment * i,
        y: settings.y - Math.sin(settings.heading) * segment * i
      });
    }

    // Fixed offsets for the pencil lines, so they do not shimmer while swimming
    var jitter = [];
    for (i = 0; i < 64; i++) {
      jitter.push({ a: range(random, -1, 1), b: range(random, -1, 1) });
    }

    // Fixed speckles on the body
    var speckles = [];
    for (i = 0; i < 46; i++) {
      speckles.push({ u: range(random, 0.08, 0.86), side: range(random, -0.85, 0.85), size: range(random, 0.5, 1.6) });
    }

    return {
      points: points,
      segment: segment,
      count: count,
      length: settings.length,
      heading: settings.heading,
      speed: settings.speed,
      phase: settings.seed,
      seed: settings.seed,
      delay: settings.delay,
      target: settings.target,
      random: random,
      jitter: jitter,
      speckles: speckles,
      speckle: settings.speckle,
      tailRoot: settings.tailRoot,
      patches: settings.patches,
      accent: settings.accent,
      accents: settings.accents,
      strokes: settings.strokes,
      greeting: settings.greeting,
      nextSay: settings.firstSay,
      say: null,
      stops: 3,
      leaving: false,
      away: 0
    };
  }

  function nextTarget(koi) {
    var random = koi.random;
    var margin = koi.length * 0.3;
    var x;
    var y;
    var tries = 0;
    do {
      x = range(random, area.x + margin, area.x + area.w - margin);
      y = range(random, area.y + margin * 0.9, area.y + area.h - margin * 0.9);
      tries++;
    } while (Math.hypot(x - koi.points[0].x, y - koi.points[0].y) < area.w * 0.2 && tries < 8);
    koi.target = { x: x, y: y };
  }

  // Swim out past one edge of the banner
  function leave(koi) {
    var random = koi.random;
    var out = koi.length * 1.9;
    var side = random();
    koi.leaving = true;
    if (side < 0.35) koi.target = { x: -out, y: range(random, 0, H) };
    else if (side < 0.7) koi.target = { x: W + out, y: range(random, 0, H) };
    else if (side < 0.85) koi.target = { x: range(random, 0, W), y: -out };
    else koi.target = { x: range(random, 0, W), y: H + out };
  }

  // Come back from outside the banner, from a random side
  function comeBack(koi) {
    var random = koi.random;
    var fromLeft = random() < 0.5;
    var heading = fromLeft ? range(random, -0.3, 0.3) : Math.PI + range(random, -0.3, 0.3);
    var startX = fromLeft ? -koi.length * 0.15 : W + koi.length * 0.15;
    var startY = range(random, area.y + area.h * 0.25, area.y + area.h * 0.75);
    koi.heading = heading;
    koi.points.forEach(function(point, i) {
      point.x = startX - Math.cos(heading) * koi.segment * i;
      point.y = startY - Math.sin(heading) * koi.segment * i;
    });
    koi.leaving = false;
    koi.stops = Math.floor(range(random, 2, 5));
    koi.greeting = true;
    koi.nextSay = clock + range(random, 0.4, 1.2);
    nextTarget(koi);
  }

  function updateKoi(koi, dt) {
    if (koi.delay > 0) {
      koi.delay -= dt;
      return;
    }
    if (koi.away > 0) {
      koi.away -= dt;
      if (koi.away <= 0) comeBack(koi);
      return;
    }

    var head = koi.points[0];
    var dx = koi.target.x - head.x;
    var dy = koi.target.y - head.y;
    if (Math.hypot(dx, dy) < koi.length * 0.35) {
      if (koi.leaving) {
        koi.away = range(koi.random, 2, 6);
        return;
      }
      koi.stops--;
      if (koi.stops <= 0) leave(koi);
      else nextTarget(koi);
      dx = koi.target.x - head.x;
      dy = koi.target.y - head.y;
    }

    var diff = Math.atan2(dy, dx) - koi.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    var maxTurn = 1.05 * dt;
    koi.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));

    var pace = koi.speed * (1 + 0.28 * Math.sin(clock * 0.7 + koi.seed));
    head.x += Math.cos(koi.heading) * pace * dt;
    head.y += Math.sin(koi.heading) * pace * dt;
    koi.phase += dt * (3 + pace * 0.07);

    for (var i = 1; i <= koi.count; i++) {
      var prev = koi.points[i - 1];
      var point = koi.points[i];
      var ax = point.x - prev.x;
      var ay = point.y - prev.y;
      var distance = Math.hypot(ax, ay) || 1;
      point.x = prev.x + (ax / distance) * koi.segment;
      point.y = prev.y + (ay / distance) * koi.segment;
    }

    if (koi.greeting && clock >= koi.nextSay && head.x > 0 && head.x < W && head.y > 0 && head.y < H) {
      koi.say = { text: nextGreeting(), born: clock, life: 3.2 };
      koi.greeting = false;
    }
  }

  // Spine with the swimming wave added, stronger towards the tail
  function spine(koi) {
    var result = [];
    for (var i = 0; i <= koi.count; i++) {
      var point = koi.points[i];
      var before = koi.points[Math.max(i - 1, 0)];
      var after = koi.points[Math.min(i + 1, koi.count)];
      var tx = before.x - after.x;
      var ty = before.y - after.y;
      var size = Math.hypot(tx, ty) || 1;
      var u = i / koi.count;
      var wave = Math.sin(koi.phase - i * 0.55) * koi.length * 0.05 * Math.pow(u, 1.4);
      result.push({
        x: point.x + (-ty / size) * wave,
        y: point.y + (tx / size) * wave,
        nx: -ty / size,
        ny: tx / size,
        angle: Math.atan2(ty, tx),
        u: u
      });
    }
    return result;
  }

  function halfWidth(koi, u) {
    return koi.length * 0.15 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 0.72);
  }

  // Body outline, optionally moved by the fixed pencil offsets
  function bodyPath(g, koi, line, wobble, key) {
    var outline = [];
    var i;
    for (i = 0; i <= koi.count; i++) {
      var w = halfWidth(koi, line[i].u);
      outline.push({ x: line[i].x + line[i].nx * w, y: line[i].y + line[i].ny * w });
    }
    for (i = koi.count; i >= 0; i--) {
      var w2 = halfWidth(koi, line[i].u);
      outline.push({ x: line[i].x - line[i].nx * w2, y: line[i].y - line[i].ny * w2 });
    }
    if (wobble) {
      outline.forEach(function(p, index) {
        var shift = koi.jitter[(index + key * 13) % koi.jitter.length];
        p.x += shift.a * wobble;
        p.y += shift.b * wobble;
      });
    }

    g.beginPath();
    g.moveTo(outline[0].x, outline[0].y);
    for (i = 1; i < outline.length - 1; i++) {
      g.quadraticCurveTo(
        outline[i].x,
        outline[i].y,
        (outline[i].x + outline[i + 1].x) / 2,
        (outline[i].y + outline[i + 1].y) / 2
      );
    }
    g.closePath();
  }

  function finPath(g, l, offset) {
    g.beginPath();
    g.moveTo(0, -l * 0.06 + offset);
    g.bezierCurveTo(l * 0.3, -l * 0.46 + offset, l * 0.72, -l * 0.5 - offset, l, -l * 0.3 + offset);
    g.bezierCurveTo(l * 1.04, -l * 0.08, l * 0.76, l * 0.3 + offset, l * 0.42, l * 0.28);
    g.bezierCurveTo(l * 0.2, l * 0.26 - offset, l * 0.06, l * 0.1, 0, l * 0.06 + offset);
  }

  // Long translucent fins: a grey wash, fine rays and two loose pencil lines
  function drawPectoralFins(g, koi, line) {
    var joint = line[3];
    var flap = Math.sin(koi.phase * 0.55) * 0.2;
    var l = koi.length * 0.2;
    var width = halfWidth(koi, joint.u) * 0.72;

    [-1, 1].forEach(function(side) {
      g.save();
      g.translate(joint.x + joint.nx * width * side, joint.y + joint.ny * width * side);
      // The local angle points to the head, so the fin sweeps backwards
      g.rotate(joint.angle + Math.PI - side * (0.98 + flap));
      g.scale(1, side);

      var wash = g.createLinearGradient(0, 0, l, 0);
      wash.addColorStop(0, "rgba(255, 252, 244, 0.92)");
      wash.addColorStop(0.55, "rgba(216, 212, 204, 0.72)");
      wash.addColorStop(1, "rgba(150, 148, 142, 0.36)");
      g.fillStyle = wash;
      finPath(g, l, 0);
      g.closePath();
      g.fill();

      g.strokeStyle = "rgba(48, 44, 38, 0.3)";
      g.lineWidth = 0.6;
      [-0.2, -0.1, 0, 0.09].forEach(function(lean) {
        g.beginPath();
        g.moveTo(l * 0.1, lean * l * 0.2);
        g.quadraticCurveTo(l * 0.5, lean * l, l * 0.92, lean * l * 0.9 - l * 0.04);
        g.stroke();
      });

      g.strokeStyle = "rgba(40, 36, 30, 0.72)";
      g.lineWidth = 0.95;
      finPath(g, l, 0);
      g.stroke();
      g.strokeStyle = "rgba(40, 36, 30, 0.3)";
      g.lineWidth = 0.6;
      finPath(g, l, l * 0.025);
      g.stroke();
      g.restore();
    });
  }

  function tailPath(g, s, offset) {
    g.beginPath();
    g.moveTo(-s * 0.1, -s * 0.05);
    g.bezierCurveTo(s * 0.3, -s * 0.3 + offset, s * 0.7, -s * 0.55, s, -s * 0.62 + offset);
    g.bezierCurveTo(s * 0.85, -s * 0.3, s * 0.7, -s * 0.1 + offset, s * 0.55, 0);
    g.bezierCurveTo(s * 0.7, s * 0.1 + offset, s * 0.85, s * 0.3, s, s * 0.62 + offset);
    g.bezierCurveTo(s * 0.7, s * 0.55, s * 0.3, s * 0.3 + offset, -s * 0.1, s * 0.05);
  }

  function drawWatercolorTail(g, koi, line) {
    var end = line[koi.count];
    var sway = Math.sin(koi.phase - koi.count * 0.55) * 0.44;
    var s = koi.length * 0.25;

    g.save();
    g.translate(end.x, end.y);
    g.rotate(end.angle + Math.PI + sway);

    var wash = g.createLinearGradient(-s * 0.1, 0, s, 0);
    wash.addColorStop(0, koi.tailRoot);
    wash.addColorStop(0.4, "rgba(214, 210, 202, 0.76)");
    wash.addColorStop(1, "rgba(146, 144, 138, 0.34)");
    g.fillStyle = wash;
    tailPath(g, s, 0);
    g.closePath();
    g.fill();

    g.strokeStyle = "rgba(48, 44, 38, 0.3)";
    g.lineWidth = 0.6;
    [-0.5, -0.36, -0.22, -0.1, 0.1, 0.22, 0.36, 0.5].forEach(function(lean) {
      g.beginPath();
      g.moveTo(s * 0.1, lean * s * 0.12);
      g.quadraticCurveTo(s * 0.5, lean * s * 0.55, s * 0.9, lean * s * 1.05);
      g.stroke();
    });

    g.strokeStyle = "rgba(40, 36, 30, 0.72)";
    g.lineWidth = 0.95;
    tailPath(g, s, 0);
    g.stroke();
    g.strokeStyle = "rgba(40, 36, 30, 0.3)";
    g.lineWidth = 0.6;
    tailPath(g, s, s * 0.022);
    g.stroke();
    g.restore();
  }

  function drawWatercolorKoi(g, koi) {
    if (koi.delay > 0 || koi.away > 0) return;
    var line = spine(koi);

    // Soft shadow on the water
    g.save();
    g.translate(koi.length * 0.03, koi.length * 0.05);
    g.fillStyle = "rgba(30, 95, 115, 0.2)";
    bodyPath(g, koi, line);
    g.fill();
    g.restore();

    drawWatercolorTail(g, koi, line);
    drawPectoralFins(g, koi, line);

    g.save();
    bodyPath(g, koi, line);
    g.fillStyle = "#f7f2e8";
    g.fill();
    g.clip();

    // Watercolor patches that fade at their edges
    koi.patches.forEach(function(patch) {
      var at = pointOn(koi, line, patch.at, patch.side);
      var radius = patch.size * koi.length;
      var pool = g.createRadialGradient(at.x, at.y, radius * 0.12, at.x, at.y, radius);
      pool.addColorStop(0, "rgba(" + patch.color + ", " + patch.strength + ")");
      pool.addColorStop(0.62, "rgba(" + patch.color + ", " + patch.strength * 0.72 + ")");
      pool.addColorStop(1, "rgba(" + patch.color + ", 0)");
      g.fillStyle = pool;
      g.fillRect(at.x - radius, at.y - radius, radius * 2, radius * 2);
    });

    // Loose brush strokes along the body
    g.lineCap = "round";
    koi.strokes.forEach(function(stroke) {
      g.strokeStyle = stroke.color;
      g.lineWidth = stroke.width * koi.length;
      g.beginPath();
      for (var u = stroke.from; u <= stroke.to + 0.001; u += 0.07) {
        var p = pointOn(koi, line, Math.min(u, 0.99), stroke.side);
        if (u === stroke.from) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      }
      g.stroke();
    });

    // Speckles of pigment
    g.fillStyle = koi.speckle;
    koi.speckles.forEach(function(speck) {
      var p = pointOn(koi, line, speck.u, speck.side);
      g.beginPath();
      g.arc(p.x, p.y, speck.size * Math.max(0.7, koi.length / 200), 0, Math.PI * 2);
      g.fill();
    });

    // Pale wet highlight along the back of the head
    var shine = pointOn(koi, line, 0.11, 0.2);
    var light = g.createRadialGradient(shine.x, shine.y, 0, shine.x, shine.y, koi.length * 0.07);
    light.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    light.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.fillStyle = light;
    g.fillRect(shine.x - koi.length * 0.07, shine.y - koi.length * 0.07, koi.length * 0.14, koi.length * 0.14);

    // A few scales, only suggested
    g.strokeStyle = "rgba(40, 34, 28, 0.26)";
    g.lineWidth = 0.6;
    for (var i = 3; i < koi.count - 2; i++) {
      [-0.42, 0.12, 0.5].forEach(function(row, index) {
        if ((i + index) % 2) return;
        var scale = pointOn(koi, line, i / koi.count, row);
        g.beginPath();
        g.arc(scale.x, scale.y, koi.length * 0.016, scale.angle - 1.2, scale.angle + 1.2);
        g.stroke();
      });
    }
    g.restore();

    // Two loose pencil outlines, one firm and one faint
    g.strokeStyle = "rgba(36, 32, 26, 0.82)";
    g.lineWidth = 1;
    bodyPath(g, koi, line, 0.5, 1);
    g.stroke();
    g.strokeStyle = "rgba(36, 32, 26, 0.34)";
    g.lineWidth = 0.7;
    bodyPath(g, koi, line, 1.5, 2);
    g.stroke();

    // Gill lines
    g.strokeStyle = "rgba(36, 32, 26, 0.55)";
    g.lineWidth = 0.8;
    [-1, 1].forEach(function(side) {
      var gillA = pointOn(koi, line, 0.2, side * 0.82);
      var gillB = pointOn(koi, line, 0.24, side * 0.3);
      var gillC = pointOn(koi, line, 0.17, side * 0.08);
      g.beginPath();
      g.moveTo(gillA.x, gillA.y);
      g.quadraticCurveTo(gillB.x, gillB.y, gillC.x, gillC.y);
      g.stroke();
    });

    // Mouth
    var mouthA = pointOn(koi, line, 0.018, -0.75);
    var mouthB = pointOn(koi, line, 0.04, 0);
    var mouthC = pointOn(koi, line, 0.018, 0.75);
    g.beginPath();
    g.moveTo(mouthA.x, mouthA.y);
    g.quadraticCurveTo(mouthB.x, mouthB.y, mouthC.x, mouthC.y);
    g.stroke();

    // Small round eyes with a highlight
    var eyeSize = Math.max(1.4, koi.length * 0.015);
    [-1, 1].forEach(function(side) {
      var eye = pointOn(koi, line, 0.075, side * 0.72);
      g.fillStyle = "#14130f";
      g.beginPath();
      g.arc(eye.x, eye.y, eyeSize, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(eye.x + eyeSize * 0.3, eye.y - eyeSize * 0.3, eyeSize * 0.32, 0, Math.PI * 2);
      g.fill();
    });
  }

  function pointOn(koi, line, u, side) {
    var index = Math.max(0, Math.min(u, 0.999)) * koi.count;
    var low = Math.floor(index);
    var from = line[low];
    var to = line[Math.min(low + 1, koi.count)];
    var mix = index - low;
    var offset = side * halfWidth(koi, u);
    return {
      x: from.x + (to.x - from.x) * mix + from.nx * offset,
      y: from.y + (to.y - from.y) * mix + from.ny * offset,
      angle: from.angle
    };
  }

  // A small polished joint
  function chromeJoint(g, x, y, radius) {
    var shine = g.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    shine.addColorStop(0, "#ffffff");
    shine.addColorStop(0.55, "#b9c8d4");
    shine.addColorStop(1, "#5d6f7e");
    g.fillStyle = shine;
    g.strokeStyle = "rgba(32, 40, 48, 0.8)";
    g.lineWidth = 0.6;
    g.beginPath();
    g.arc(x, y, radius, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  // One long white feather of a fin, with a fine rib down the middle
  function feather(g, length, width, curl) {
    var wash = g.createLinearGradient(0, 0, length, 0);
    wash.addColorStop(0, "#ffffff");
    wash.addColorStop(0.6, "#f2f7fb");
    wash.addColorStop(1, "#d3e2ee");
    g.fillStyle = wash;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(length * 0.3, -width, length * 0.72, -width + curl, length, curl);
    g.bezierCurveTo(length * 0.72, width * 0.45 + curl, length * 0.3, width * 0.62, 0, 0);
    g.fill();
    g.strokeStyle = "rgba(34, 40, 48, 0.72)";
    g.lineWidth = 0.85;
    g.stroke();
    g.strokeStyle = "rgba(92, 126, 152, 0.5)";
    g.lineWidth = 0.6;
    g.beginPath();
    g.moveTo(length * 0.06, 0);
    g.quadraticCurveTo(length * 0.5, -width * 0.2 + curl * 0.4, length * 0.92, curl);
    g.stroke();
  }

  // Feathers fanned out from a joint, from the outer one to the inner one
  function fan(g, length, angles, koi, wave) {
    var width = length * 0.17;
    angles.forEach(function(entry, index) {
      g.save();
      g.rotate(entry.angle + Math.sin(koi.phase * 0.7 + index * 0.5) * wave);
      feather(g, length * entry.size, width, length * entry.angle * 0.1);
      g.restore();
    });
    chromeJoint(g, 0, 0, Math.max(1.5, length * 0.05));
  }

  function drawSideFins(g, koi, line) {
    var flap = Math.sin(koi.phase * 0.55) * 0.18;
    [
      {
        u: 0.27,
        length: koi.length * 0.34,
        turn: 0.95 + flap,
        angles: [
          { angle: -0.5, size: 0.66 },
          { angle: -0.22, size: 0.88 },
          { angle: 0.06, size: 1 },
          { angle: 0.36, size: 0.82 }
        ]
      }
    ].forEach(function(fin) {
      [-1, 1].forEach(function(side) {
        var joint = pointOn(koi, line, fin.u, side * 0.84);
        g.save();
        g.translate(joint.x, joint.y);
        // The local angle points to the head, so the fin sweeps backwards
        g.rotate(joint.angle + Math.PI - side * fin.turn);
        g.scale(1, side);
        fan(g, fin.length, fin.angles, koi, 0.02);
        g.restore();
      });
    });
  }

  function drawRobotTail(g, koi, line) {
    var end = pointOn(koi, line, 0.96, 0);
    var sway = Math.sin(koi.phase - koi.count * 0.55) * 0.42;
    var size = koi.length * 0.44;
    g.save();
    g.translate(end.x, end.y);
    g.rotate(end.angle + Math.PI + sway);
    fan(g, size, [
      { angle: -0.66, size: 0.98 },
      { angle: 0.66, size: 0.98 },
      { angle: -0.44, size: 0.92 },
      { angle: 0.44, size: 0.92 },
      { angle: -0.22, size: 0.8 },
      { angle: 0.22, size: 0.8 },
      { angle: 0, size: 0.68 }
    ], koi, 0.05);
    g.restore();
  }

  // Big round cute eye: a white rim, a shiny dark pupil and two sparkles
  function cuteEye(g, x, y, radius) {
    g.fillStyle = "#ffffff";
    g.strokeStyle = "rgba(30, 38, 46, 0.85)";
    g.lineWidth = 0.8;
    g.beginPath();
    g.arc(x, y, radius, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    var pupil = g.createRadialGradient(x, y + radius * 0.3, radius * 0.1, x, y, radius * 0.82);
    pupil.addColorStop(0, "#3a6f9e");
    pupil.addColorStop(0.55, "#16222e");
    pupil.addColorStop(1, "#0b1016");
    g.fillStyle = pupil;
    g.beginPath();
    g.arc(x, y, radius * 0.82, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(x - radius * 0.28, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x + radius * 0.28, y + radius * 0.3, radius * 0.13, 0, Math.PI * 2);
    g.fill();
  }

  function seam(g, koi, line, u) {
    var from = pointOn(koi, line, u, -1);
    var bend = pointOn(koi, line, u + 0.04, 0);
    var to = pointOn(koi, line, u, 1);
    g.strokeStyle = "rgba(34, 42, 50, 0.55)";
    g.lineWidth = 0.75;
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.quadraticCurveTo(bend.x, bend.y, to.x, to.y);
    g.stroke();
  }

  function drawRobotKoi(g, koi) {
    if (koi.delay > 0 || koi.away > 0) return;
    var line = spine(koi);

    // Soft shadow on the water
    g.save();
    g.translate(koi.length * 0.03, koi.length * 0.05);
    g.fillStyle = "rgba(30, 95, 115, 0.2)";
    bodyPath(g, koi, line);
    g.fill();
    g.restore();

    drawRobotTail(g, koi, line);
    drawSideFins(g, koi, line);

    // Smooth white shell
    g.save();
    bodyPath(g, koi, line);
    g.fillStyle = "#fbfdfe";
    g.fill();
    g.clip();

    // Watercolor colors on the shell, fading at their edges
    koi.accents.forEach(function(accent) {
      var at = pointOn(koi, line, accent.at, accent.side);
      var radius = accent.size * koi.length;
      var pool = g.createRadialGradient(at.x, at.y, radius * 0.1, at.x, at.y, radius);
      pool.addColorStop(0, "rgba(" + koi.accent + ", 0.96)");
      pool.addColorStop(0.7, "rgba(" + koi.accent + ", 0.82)");
      pool.addColorStop(1, "rgba(" + koi.accent + ", 0)");
      g.fillStyle = pool;
      g.fillRect(at.x - radius, at.y - radius, radius * 2, radius * 2);
    });

    // Cool shade along the sides of the shell
    bodyPath(g, koi, line);
    g.strokeStyle = "rgba(112, 156, 190, 0.34)";
    g.lineWidth = koi.length * 0.06;
    g.stroke();
    g.strokeStyle = "rgba(72, 112, 146, 0.26)";
    g.lineWidth = koi.length * 0.024;
    g.stroke();

    seam(g, koi, line, 0.44);
    seam(g, koi, line, 0.62);
    seam(g, koi, line, 0.78);

    // Back of the head, and a soft shine on the dome
    seam(g, koi, line, 0.165);
    var shine = pointOn(koi, line, 0.075, -0.1);
    var light = g.createRadialGradient(shine.x, shine.y, 0, shine.x, shine.y, koi.length * 0.08);
    light.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    light.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.fillStyle = light;
    g.fillRect(shine.x - koi.length * 0.08, shine.y - koi.length * 0.08, koi.length * 0.16, koi.length * 0.16);
    g.restore();

    // Two loose pencil outlines, one firm and one faint
    g.strokeStyle = "rgba(30, 36, 44, 0.82)";
    g.lineWidth = 1;
    bodyPath(g, koi, line, 0.5, 1);
    g.stroke();
    g.strokeStyle = "rgba(30, 36, 44, 0.3)";
    g.lineWidth = 0.7;
    bodyPath(g, koi, line, 1.5, 2);
    g.stroke();

    // Mouth
    var mouthA = pointOn(koi, line, 0.02, -0.72);
    var mouthB = pointOn(koi, line, 0.04, 0);
    var mouthC = pointOn(koi, line, 0.02, 0.72);
    g.strokeStyle = "rgba(30, 36, 44, 0.62)";
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(mouthA.x, mouthA.y);
    g.quadraticCurveTo(mouthB.x, mouthB.y, mouthC.x, mouthC.y);
    g.stroke();

    // Big cute eyes
    var eyeSize = Math.max(2.2, koi.length * 0.029);
    [-1, 1].forEach(function(side) {
      var eye = pointOn(koi, line, 0.09, side * 0.68);
      cuteEye(g, eye.x, eye.y, eyeSize);
    });
  }

  /**
   * Speech bubble in front of the head of a koi, drawn in ink
   */
  function drawBubble(g, koi) {
    var say = koi.say;
    if (!say) return;
    var age = clock - say.born;
    if (age > say.life) {
      koi.say = null;
      return;
    }

    var head = koi.points[0];
    var size = Math.max(15, Math.min(H * 0.078, 34));
    g.save();
    g.font = "bold " + size + "px Charter, 'Bitstream Charter', Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    // Arabic reads right to left, so its punctuation goes on the left
    g.direction = /[؀-ۿ]/.test(say.text) ? "rtl" : "ltr";

    var padX = size * 0.75;
    var boxW = g.measureText(say.text).width + padX * 2;
    var boxH = size * 1.9;

    // In front of the head, so the bubble never covers the fish
    var ahead = koi.length * 0.1 + size;
    var centerX = head.x + Math.cos(koi.heading) * (ahead + boxW / 2);
    var centerY = head.y + Math.sin(koi.heading) * (ahead + boxH / 2);
    var boxX = Math.max(6, Math.min(W - boxW - 6, centerX - boxW / 2));
    var boxY = Math.max(6, Math.min(H - boxH - 6, centerY - boxH / 2));
    var tipX = head.x + Math.cos(koi.heading) * koi.length * 0.04;
    var tipY = head.y + Math.sin(koi.heading) * koi.length * 0.04;
    var midX = boxX + boxW / 2;
    var midY = boxY + boxH / 2;
    var reach = Math.hypot(midX - tipX, midY - tipY) || 1;
    var sideX = (-(midY - tipY) / reach) * 7;
    var sideY = ((midX - tipX) / reach) * 7;

    // Pop in, then fade out
    var grow = Math.min(age / 0.28, 1);
    var pop = 1 + 2.4 * Math.pow(grow - 1, 3) + 1.4 * Math.pow(grow - 1, 2);
    g.globalAlpha = Math.min(1, (say.life - age) / 0.35);
    g.translate(tipX, tipY);
    g.scale(pop, pop);
    g.translate(-tipX, -tipY);

    g.fillStyle = "#f7f2e8";
    g.strokeStyle = "#24201a";
    g.lineWidth = 1.4;
    g.lineJoin = "round";

    // The tail goes first: the box covers its inner end
    g.beginPath();
    g.moveTo(midX + sideX, midY + sideY);
    g.lineTo(tipX, tipY);
    g.lineTo(midX - sideX, midY - sideY);
    g.closePath();
    g.stroke();
    g.fill();

    var corner = boxH * 0.42;
    g.beginPath();
    g.moveTo(boxX + corner, boxY);
    g.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, corner);
    g.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, corner);
    g.arcTo(boxX, boxY + boxH, boxX, boxY, corner);
    g.arcTo(boxX, boxY, boxX + boxW, boxY, corner);
    g.closePath();
    g.stroke();

    // Fill without the outline of the tail inside the box
    g.fill();
    g.beginPath();
    g.moveTo(midX + sideX, midY + sideY);
    g.lineTo(tipX, tipY);
    g.lineTo(midX - sideX, midY - sideY);
    g.closePath();
    g.fill();

    g.fillStyle = "#24201a";
    g.fillText(say.text, midX, midY + 1);
    g.restore();
  }

  function drawRipples(g, dt) {
    ripples = ripples.filter(function(ripple) {
      ripple.age += dt;
      return ripple.age < 1.8;
    });
    ripples.forEach(function(ripple) {
      var progress = ripple.age / 1.8;
      g.strokeStyle = "rgba(50, 120, 140, " + 0.5 * (1 - progress) + ")";
      g.lineWidth = 0.9;
      for (var r = 0; r < 2; r++) {
        var radius = (8 + progress * 42) * (1 - r * 0.42);
        g.beginPath();
        g.ellipse(ripple.x, ripple.y, radius, radius * 0.55, 0, 0, Math.PI * 2);
        g.stroke();
      }
    });
  }

  function render(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(water, 0, 0, W, H);
    drawRipples(ctx, dt);
    kois.forEach(function(koi) {
      if (robotic) drawRobotKoi(ctx, koi);
      else drawWatercolorKoi(ctx, koi);
    });
    ctx.drawImage(foreground, 0, 0, W, H);
    kois.forEach(function(koi) {
      drawBubble(ctx, koi);
    });
  }

  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - lastFrame) / 1000 || 0, 0.05);
    lastFrame = now;
    // The banner can have no size yet if the page opens in a hidden tab
    if (!water) {
      setup();
      requestAnimationFrame(frame);
      return;
    }
    clock += dt;
    kois.forEach(function(koi) {
      updateKoi(koi, dt);
    });
    render(dt);
    requestAnimationFrame(frame);
  }

  function setRunning(value) {
    if (reduceMotion || value === running) return;
    running = value;
    if (running) {
      lastFrame = performance.now();
      requestAnimationFrame(frame);
    }
  }

  function createKois() {
    var large = Math.min(H * 0.62, W * 0.34);
    var red = "204, 40, 22";
    var ink = "28, 26, 26";
    spoken = 0;
    greetingBag = [];
    lastGreeting = null;
    kois = [
      makeKoi({
        x: -large * 0.15,
        y: area.y + area.h * 0.5,
        heading: 0,
        length: large,
        speed: large * 0.4,
        seed: 1.3,
        delay: 0.3,
        target: { x: area.x + area.w * 0.36, y: area.y + area.h * 0.46 },
        accent: red,
        accents: [
          { at: 0.09, side: 0, size: 0.075 },
          { at: 0.29, side: -0.28, size: 0.14 },
          { at: 0.46, side: 0.3, size: 0.15 },
          { at: 0.64, side: -0.22, size: 0.14 },
          { at: 0.82, side: 0.12, size: 0.1 }
        ],
        speckle: "rgba(120, 28, 12, 0.34)",
        tailRoot: "rgba(206, 52, 30, 0.72)",
        patches: [
          { at: 0.1, side: 0, size: 0.13, strength: 1, color: red },
          { at: 0.32, side: -0.3, size: 0.21, strength: 1, color: red },
          { at: 0.55, side: 0.25, size: 0.17, strength: 0.96, color: "216, 58, 30" },
          { at: 0.78, side: -0.1, size: 0.12, strength: 0.92, color: red }
        ],
        strokes: [
          { from: 0.14, to: 0.5, side: -0.42, width: 0.016, color: "rgba(150, 30, 14, 0.42)" },
          { from: 0.4, to: 0.82, side: 0.1, width: 0.012, color: "rgba(150, 30, 14, 0.36)" },
          { from: 0.2, to: 0.66, side: 0.68, width: 0.014, color: "rgba(255, 252, 244, 0.72)" }
        ],
        firstSay: 1.8,
        greeting: true
      }),
      makeKoi({
        x: area.x + area.w * 0.8,
        y: -large * 0.1,
        heading: Math.PI / 2,
        length: large,
        speed: large * 0.36,
        seed: 4.1,
        delay: 2.6,
        target: { x: area.x + area.w * 0.8, y: area.y + area.h * 0.62 },
        accent: ink,
        accents: [
          { at: 0.13, side: 0.1, size: 0.07 },
          { at: 0.3, side: 0.3, size: 0.13 },
          { at: 0.47, side: -0.32, size: 0.14 },
          { at: 0.65, side: 0.25, size: 0.13 },
          { at: 0.84, side: -0.08, size: 0.09 }
        ],
        speckle: "rgba(20, 18, 18, 0.3)",
        tailRoot: "rgba(30, 28, 28, 0.78)",
        patches: [
          { at: 0.13, side: 0, size: 0.09, strength: 1, color: ink },
          { at: 0.34, side: 0.35, size: 0.16, strength: 1, color: ink },
          { at: 0.53, side: -0.42, size: 0.13, strength: 1, color: ink },
          { at: 0.7, side: 0.3, size: 0.11, strength: 0.96, color: ink },
          { at: 0.87, side: 0, size: 0.08, strength: 0.92, color: ink }
        ],
        strokes: [
          { from: 0.24, to: 0.46, side: -0.2, width: 0.017, color: "rgba(24, 22, 22, 0.62)" },
          { from: 0.56, to: 0.8, side: 0.1, width: 0.013, color: "rgba(24, 22, 22, 0.55)" },
          { from: 0.3, to: 0.42, side: 0.5, width: 0.01, color: "rgba(255, 252, 244, 0.28)" }
        ],
        firstSay: 5.4,
        greeting: true
      })
    ];
  }

  // One still picture, with the koi already in the water
  function stillPicture() {
    for (var t = 0; t < 7; t += 0.033) {
      clock += 0.033;
      kois.forEach(function(koi) {
        updateKoi(koi, 0.033);
      });
    }
    kois.forEach(function(koi) {
      koi.say = null;
    });
    kois[0].say = { text: "Hi!", born: clock, life: Infinity };
    render(0);
  }

  // Swap the drawing and replay the animation from the start
  function toggleRobotic() {
    robotic = !robotic;
    clock = 0;
    ripples = [];
    createKois();
    if (reduceMotion) stillPicture();
  }

  function setup() {
    var box = pond.getBoundingClientRect();
    var width = Math.round(box.width);
    var height = Math.round(box.height);
    if (!width || !height) return;
    if (width === W && height === H) return;

    var first = W === 0;
    W = width;
    H = height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var marginX = Math.max(16, W * 0.07);
    var marginY = Math.max(10, H * 0.08);
    area = { x: marginX, y: marginY, w: W - marginX * 2, h: H - marginY * 2 };
    water = paintWater();
    foreground = paintForeground();

    if (first) {
      createKois();
    }
    else {
      kois.forEach(function(koi) {
        koi.leaving = false;
        nextTarget(koi);
      });
    }

    if (reduceMotion) {
      stillPicture();
    }
    else if (!running) {
      render(0);
    }
  }

  function pointerPosition(event) {
    var box = canvas.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  function onVisibility() {
    setRunning(visible && !document.hidden);
  }

  setup();
  pond.classList.add("is-ready");
  window.addEventListener("resize", setup);

  if (reduceMotion) return toggleRobotic;

  // The koi follow a click, and the water reacts to the pointer
  pond.addEventListener("pointermove", function(event) {
    var now = performance.now();
    if (event.pointerType === "touch" || now - lastRipple < 180) return;
    lastRipple = now;
    var at = pointerPosition(event);
    ripples.push({ x: at.x, y: at.y, age: 0 });
  });

  pond.addEventListener("pointerdown", function(event) {
    var at = pointerPosition(event);
    ripples.push({ x: at.x, y: at.y, age: 0 });

    var closest = null;
    var best = Infinity;
    kois.forEach(function(koi) {
      var distance = Math.hypot(koi.points[0].x - at.x, koi.points[0].y - at.y);
      if (koi.delay <= 0 && koi.away <= 0 && distance < best) {
        best = distance;
        closest = koi;
      }
    });
    if (closest) {
      closest.target = {
        x: Math.max(area.x, Math.min(at.x, area.x + area.w)),
        y: Math.max(area.y, Math.min(at.y, area.y + area.h))
      };
      closest.leaving = false;
      closest.stops = Math.max(closest.stops, 1);
    }
  });

  document.addEventListener("visibilitychange", onVisibility);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function(entries) {
      visible = entries[0].isIntersecting;
      onVisibility();
    }).observe(pond);
  }

  setRunning(!document.hidden);
  return toggleRobotic;
}

var startRobotic = location.search.indexOf("koi=robot") !== -1;
var toggleKoi = createPond(document.getElementById("pond"), startRobotic);

// The robotic koi are only a surprise: reloading the page brings the first ones back
if (startRobotic) history.replaceState(null, "", location.pathname);

document.querySelectorAll(".koi-toggle").forEach(function(link) {
  link.addEventListener("click", function(event) {
    if (!toggleKoi) return;
    event.preventDefault();
    toggleKoi();
  });
});
