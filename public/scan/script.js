/* Author: William Leonard, Saxon Enterprises, Inc., wfleonard@saxonenterprises.net
   BusinessPulse landing page: heartbeat monitor, returns calculator, scan form. */
(function () {
  "use strict";

  /* ---------- Scenario assumptions ----------
     seo: added organic search visits at month 12, as a share of current visitors
     ai:  added visits from AI answer referrals at month 12, as a share of current visitors */
  var SCENARIOS = {
    conservative: { seo: 0.15, ai: 0.03, hint: "Search traffic up 15% and AI referrals adding 3% by month 12." },
    expected:     { seo: 0.30, ai: 0.06, hint: "Search traffic up 30% and AI referrals adding 6% by month 12." },
    strong:       { seo: 0.50, ai: 0.10, hint: "Search traffic up 50% and AI referrals adding 10% by month 12." }
  };
  var MONTHS = 12;

  // Growth builds gradually: about 60% of the full effect by month 4, full effect by month 12.
  function ramp(m) {
    return (1 - Math.exp(-m / 4)) / (1 - Math.exp(-MONTHS / 4));
  }

  var $ = function (id) { return document.getElementById(id); };
  var fmtInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  var fmtMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  function shortMoney(v) {
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M";
    if (v >= 1e3) return "$" + (v / 1e3).toFixed(v >= 1e4 ? 0 : 1) + "k";
    return "$" + Math.round(v);
  }

  /* ---------- Calculator ---------- */
  var inputs = {
    visitors: $("visitors"),
    conv: $("conv"),
    value: $("value"),
    cost: $("cost")
  };

  function readState() {
    var checked = document.querySelector('input[name="scenario"]:checked');
    return {
      visitors: Number(inputs.visitors.value),
      conv: Number(inputs.conv.value) / 100,
      value: Number(inputs.value.value),
      cost: Number(inputs.cost.value),
      scenario: checked ? checked.value : "expected"
    };
  }

  function compute(s) {
    var sc = SCENARIOS[s.scenario];
    var rows = [];
    var totals = { revenue: 0, customers: 0, aiCustomers: 0 };
    for (var m = 1; m <= MONTHS; m++) {
      var r = ramp(m);
      var seoVisits = s.visitors * sc.seo * r;
      var aiVisits = s.visitors * sc.ai * r;
      var seoCust = seoVisits * s.conv;
      var aiCust = aiVisits * s.conv;
      var row = {
        month: m,
        visits: seoVisits + aiVisits,
        seoRev: seoCust * s.value,
        aiRev: aiCust * s.value
      };
      rows.push(row);
      totals.revenue += row.seoRev + row.aiRev;
      totals.customers += seoCust + aiCust;
      totals.aiCustomers += aiCust;
    }
    totals.visitsM12 = rows[MONTHS - 1].visits;
    totals.spend = s.cost * MONTHS;
    return { rows: rows, totals: totals };
  }

  function niceMax(v) {
    if (v <= 0) return 100;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * p >= v) return steps[i] * p;
    }
    return 10 * p;
  }

  var SVG_NS = "http://www.w3.org/2000/svg";
  function el(name, attrs, text) {
    var n = document.createElementNS(SVG_NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function drawChart(rows, cost) {
    var svg = $("chart");
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var W = 640, H = 280, padL = 56, padR = 12, padT = 14, padB = 30;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var maxVal = 0;
    rows.forEach(function (r) { maxVal = Math.max(maxVal, r.seoRev + r.aiRev); });
    var yMax = niceMax(Math.max(maxVal, cost) * 1.05);
    var y = function (v) { return padT + plotH - (v / yMax) * plotH; };

    // grid and y ticks (5 intervals)
    for (var i = 0; i <= 4; i++) {
      var v = (yMax / 4) * i;
      var yy = y(v);
      svg.appendChild(el("line", { "class": "grid", x1: padL, x2: W - padR, y1: yy, y2: yy }));
      svg.appendChild(el("text", { "class": "tick", x: padL - 8, y: yy + 4, "text-anchor": "end" }, shortMoney(v)));
    }

    var band = plotW / rows.length;
    var bw = Math.min(30, band * 0.62);
    var g = el("g", { "class": "bar-g" });
    rows.forEach(function (r, idx) {
      var cx = padL + band * idx + band / 2;
      var x = cx - bw / 2;
      var seoTop = y(r.seoRev);
      var totTop = y(r.seoRev + r.aiRev);
      var seoRect = el("rect", { "class": "seo", x: x, y: seoTop, width: bw, height: Math.max(0, padT + plotH - seoTop), rx: 2 });
      var aiRect = el("rect", { "class": "aeo", x: x, y: totTop, width: bw, height: Math.max(0, seoTop - totTop), rx: 2 });
      var title = el("title", {}, "Month " + r.month + ": " + fmtMoney.format(r.seoRev) + " from search, " + fmtMoney.format(r.aiRev) + " from AI answers");
      seoRect.appendChild(title);
      aiRect.appendChild(title.cloneNode(true));
      g.appendChild(seoRect);
      g.appendChild(aiRect);
      svg.appendChild(el("text", { "class": "tick", x: cx, y: H - 10, "text-anchor": "middle" }, "M" + r.month));
    });
    svg.appendChild(g);

    // investment line
    var cy = y(cost);
    svg.appendChild(el("line", { "class": "cost", x1: padL, x2: W - padR, y1: cy, y2: cy }));
  }

  function update() {
    var s = readState();
    $("visitorsOut").textContent = fmtInt.format(s.visitors);
    $("convOut").textContent = (s.conv * 100).toFixed(1).replace(/\.0$/, "") + "%";
    $("valueOut").textContent = fmtMoney.format(s.value);
    $("costOut").textContent = fmtMoney.format(s.cost);
    $("scenarioHint").textContent = SCENARIOS[s.scenario].hint;

    var out = compute(s);
    var t = out.totals;
    $("rRevenue").textContent = fmtMoney.format(t.revenue);
    $("rVisits").textContent = "+" + fmtInt.format(t.visitsM12);
    $("rCustomers").textContent = "+" + fmtInt.format(t.customers);
    $("rAi").textContent = "+" + fmtInt.format(t.aiCustomers);

    var roiEl = $("rRoi");
    var multiple = t.spend > 0 ? t.revenue / t.spend : 0;
    if (multiple >= 1) {
      roiEl.textContent = multiple.toFixed(1) + "x your " + fmtMoney.format(t.spend) + " yearly investment";
      roiEl.classList.remove("neg");
    } else {
      roiEl.textContent = "Below your " + fmtMoney.format(t.spend) + " yearly investment at these numbers";
      roiEl.classList.add("neg");
    }

    drawChart(out.rows, s.cost);
  }

  Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener("input", update); });
  document.querySelectorAll('input[name="scenario"]').forEach(function (r) {
    r.addEventListener("change", update);
  });
  $("calcForm").addEventListener("submit", function (e) { e.preventDefault(); });
  update();

  /* ---------- Heartbeat monitor ---------- */
  var canvas = $("ecg");
  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var trace = getComputedStyle(document.documentElement).getPropertyValue("--trace").trim() || "#ff5a5f";
  var gridColor = getComputedStyle(document.documentElement).getPropertyValue("--monitor-line").trim() || "#22323d";
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  var cw = 0, ch = 140;

  function sizeCanvas() {
    cw = canvas.clientWidth || 400;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // One heartbeat, x in [0,1) -> y offset in [-1,1]. Weak first beat, strong later beats.
  function beat(x, amp) {
    if (x < 0.30) return 0;
    if (x < 0.36) return -0.12 * amp * Math.sin((x - 0.30) / 0.06 * Math.PI);
    if (x < 0.40) return 0;
    if (x < 0.43) return 0.18 * amp * ((x - 0.40) / 0.03);
    if (x < 0.47) return 0.18 * amp - 1.1 * amp * ((x - 0.43) / 0.04);
    if (x < 0.51) return -0.92 * amp + 1.14 * amp * ((x - 0.47) / 0.04);
    if (x < 0.53) return 0.22 * amp * (1 - (x - 0.51) / 0.02);
    if (x < 0.62) return 0;
    if (x < 0.74) return -0.2 * amp * Math.sin((x - 0.62) / 0.12 * Math.PI);
    return 0;
  }

  var period = 170;            // px per beat
  var offset = 0;

  function ampAt(px) {
    // amplitude grows left to right: weak visibility becoming strong
    var t = Math.min(1, Math.max(0, px / Math.max(1, cw)));
    return 0.25 + 0.75 * t;
  }

  function drawECG() {
    ctx.clearRect(0, 0, cw, ch);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (var gx = 0; gx < cw; gx += 20) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, ch); ctx.stroke(); }
    for (var gy = 0; gy < ch; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(cw, gy + 0.5); ctx.stroke(); }

    var mid = ch * 0.58, scale = ch * 0.42;
    ctx.beginPath();
    for (var px = 0; px <= cw; px++) {
      var phase = (((px + offset) % period) + period) % period / period;
      var yv = mid + beat(phase, ampAt(px)) * scale;
      if (px === 0) ctx.moveTo(px, yv); else ctx.lineTo(px, yv);
    }
    ctx.strokeStyle = trace;
    ctx.lineWidth = 2;
    ctx.shadowColor = trace;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function loop() {
    offset += 1.2;
    drawECG();
    requestAnimationFrame(loop);
  }

  sizeCanvas();
  drawECG();
  window.addEventListener("resize", function () { sizeCanvas(); drawECG(); });
  if (!reduceMotion) requestAnimationFrame(loop);

  /* ---------- Scan request form ---------- */
  var form = $("scanForm");
  var msg = $("formMsg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var fields = [$("bizName"), $("bizSite"), $("bizEmail")];
    var firstBad = null;
    fields.forEach(function (f) {
      var ok = f.value.trim() !== "" && f.checkValidity();
      f.setAttribute("aria-invalid", ok ? "false" : "true");
      if (!ok && !firstBad) firstBad = f;
    });
    if (firstBad) {
      msg.className = "form-msg err";
      msg.textContent = "Please fill in all three fields. The website needs to start with https:// or http://.";
      firstBad.focus();
      return;
    }
    // Send to BusinessPulse: saved as a scan request on the dashboard and emailed to us.
    var submit = form.querySelector('button[type="submit"]');
    var name = $("bizName").value.trim();
    var ids = { businessName: "bizName", website: "bizSite", email: "bizEmail" };
    submit.disabled = true;
    msg.className = "form-msg";
    msg.textContent = "Sending...";
    fetch("/api/scan-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: name, website: $("bizSite").value.trim(), email: $("bizEmail").value.trim() })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (!result.ok) {
          var fieldErrs = result.data.fields || {};
          Object.keys(fieldErrs).forEach(function (k) { if (ids[k]) $(ids[k]).setAttribute("aria-invalid", "true"); });
          var serverErr = new Error(result.data.error || "");
          serverErr.fromServer = true;
          throw serverErr;
        }
        msg.className = "form-msg ok";
        msg.textContent = "Thanks, " + name + ". We will be in touch about your free scan.";
        form.reset();
        if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { method: "scan_form" });
      })
      .catch(function (err) {
        msg.className = "form-msg err";
        msg.textContent = (err && err.fromServer && err.message) ||
          "Sorry, your request didn't go through. Please try again, or email wfleonard@saxonenterprises.net.";
      })
      .then(function () { submit.disabled = false; });
  });

  /* ---------- Copy email ---------- */
  $("copyEmail").addEventListener("click", function () {
    var text = $("emailText").textContent;
    var btn = this;
    function selectFallback() {
      var range = document.createRange();
      range.selectNodeContents($("emailText"));
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      btn.textContent = "Selected";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { btn.textContent = "Copied"; }, selectFallback);
    } else {
      selectFallback();
    }
    setTimeout(function () { btn.textContent = "Copy"; }, 2000);
  });
})();
