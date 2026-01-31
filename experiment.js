// experiment.js (Space Defense Pilot) - tidy pigeon-style CSV + "finish ship" round ending

let participantId = null;
let score = 0;

// ======= GLOBAL EVENT LOG (pigeon-style; one row per event) =======
let sessionT0 = null;       // performance.now() at first gameplay
let sessionDateStr = null;  // YYYY-MM-DD
let eventRows = [];         // array of row objects

function pad2(n) { return String(n).padStart(2, "0"); }
function pad6(n) { return String(n).padStart(6, "0"); }

// Format like pigeon "0:00:33.321872" (H:MM:SS.microseconds)
function formatSessionTime(msSinceSessionStart) {
  const totalMicros = Math.max(0, Math.round(msSinceSessionStart * 1000));
  const micros = totalMicros % 1000000;
  const totalSecs = Math.floor(totalMicros / 1000000);
  const s = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const m = totalMins % 60;
  const h = Math.floor(totalMins / 60);
  return `${h}:${pad2(m)}:${pad2(s)}.${pad6(micros)}`;
}

function localDateYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

// Push one “pigeon-style” row
function pushEventRow({
  nowPerf,
  x = "",
  y = "",
  event,
  trialTimeSec,
  trialType,
  targetCount,
  backgroundCount,
  trialNum,
  trialColor,
  subject,
  pointsDelta = "",
  scoreTotal = "",
  fired = "",
}) {
  const sessionMs = nowPerf - sessionT0;
  eventRows.push({
    SessionTime: formatSessionTime(sessionMs),
    Xcord: x === "" ? "" : Math.round(Number(x)),
    Ycord: y === "" ? "" : Math.round(Number(y)),
    Event: event,
    TrialTime: trialTimeSec === "" ? "" : Number(trialTimeSec),
    TrialType: trialType,
    TargetClickNum: targetCount,
    BackgroundClickNum: backgroundCount,
    TrialNum: trialNum,
    TrialColor: trialColor,
    Subject: subject,
    Date: sessionDateStr,

    // extra tidy columns (optional)
    PointsDelta: pointsDelta,
    ScoreTotal: scoreTotal,
    Fired: fired,
  });
}

// Convert eventRows to CSV with fixed column order
function buildEventCSV() {
  const cols = [
    // pigeon-style core columns
    "SessionTime","Xcord","Ycord","Event","TrialTime","TrialType",
    "TargetClickNum","BackgroundClickNum","TrialNum","TrialColor",
    "Subject", "Date",
    // extra columns
    "PointsDelta","ScoreTotal","Fired",
  ];

  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replaceAll('"','""')}"`;
    }
    return s;
  };

  const lines = [];
  lines.push(cols.join(","));
  for (const row of eventRows) {
    lines.push(cols.map(c => escape(row[c])).join(","));
  }
  return lines.join("\n");
}

// ======= LEADERBOARD (cosmetic) =======
const TOP5 = [
  { id: "007", score: 1700 },
  { id: "010", score: 1428 },
  { id: "021", score: 1322 },
  { id: "003", score: 1072 },
  { id: "014", score: 1034 },
];

function getLeaderboardRows(finalScore) {
  const rows = TOP5.map(x => ({ ...x }));
  if (participantId) {
    const exists = rows.some(r => r.id === participantId);
    if (!exists) rows.push({ id: participantId, score: finalScore });
    else rows.forEach(r => { if (r.id === participantId) r.score = finalScore; });
  }
  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, 5);
}

// ======= CONTINGENCIES (human-friendly) =======
const CONTINGENCIES = [
  { label: "100%", p: 1.0,  color: "#4aa3ff" },
  { label: "80%",  p: 0.80, color: "#35d07f" },
  { label: "60%",  p: 0.60, color: "#ffd166" },
  { label: "50%",  p: 0.50, color: "#ffb703" },
  { label: "40%",  p: 0.40, color: "#ff7a59" },
  { label: "20%",  p: 0.20, color: "#b983ff" },
];

const TOTAL_ROUNDS = 18;
const POINTS_DESTROY = 20;
const POINTS_CRASH = -2;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function buildTrialOrder() {
  const base = [];
  for (let r = 0; r < 3; r++) for (const c of CONTINGENCIES) base.push({ ...c });

  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }

  for (let i = 1; i < base.length; i++) {
    if (base[i].label === base[i - 1].label) {
      for (let k = i + 1; k < base.length; k++) {
        if (base[k].label !== base[i - 1].label) {
          [base[i], base[k]] = [base[k], base[i]];
          break;
        }
      }
    }
  }

  for (let i = 1; i < base.length; i++) {
    if (base[i].label === base[i - 1].label) return buildTrialOrder();
  }
  return base;
}

// ======= jsPsych init =======
const jsPsych = initJsPsych({
  on_finish: () => {
    // Build tidy event CSV (pigeon-style)
    const csv = buildEventCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const rows = getLeaderboardRows(score);
    const inTop5 = rows.some(r => r.id === participantId);

    document.body.innerHTML = `
      <div style="max-width:860px;margin:28px auto;">
        <h2>Mission complete</h2>
        <p>Final score: <b>${score}</b></p>
        <p>${inTop5 ? "Nice — you made the Top 5 defenders!" : "Thanks for protecting the planet!"}</p>

        <h3 style="margin-top:18px;">Top Scores</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <thead><tr><th>Rank</th><th>Participant</th><th>Score</th></tr></thead>
          <tbody>
            ${rows.map((r, idx) => {
              const hi = (participantId && r.id === participantId) ? 'style="background:#fff2a8;"' : "";
              return `<tr ${hi}><td>${idx+1}</td><td>${r.id}</td><td>${r.score}</td></tr>`;
            }).join("")}
          </tbody>
        </table>

        <a id="dl" style="display:inline-block;margin-top:16px;font-size:18px;" href="#">
          Download data (CSV)
        </a>
      </div>
    `;

    const a = document.getElementById("dl");
    a.href = url;
    a.download = `space_defense_${participantId || "NA"}_${Date.now()}.csv`;
  },
});

// ======= Participant ID =======
const idTrial = {
  type: jsPsychHtmlKeyboardResponse,
  choices: "NO_KEYS",
  stimulus: `
    <div style="max-width:860px;margin:28px auto;">
      <h1>Space Defense</h1>
      <p>Enter your participant number to begin.</p>
      <input id="pid" maxlength="3" placeholder="e.g., 001" autofocus />
      <button id="go" disabled>Continue</button>
      <p style="opacity:0.8;">Use exactly 3 digits (leading zeros ok).</p>
    </div>
  `,
  on_load: () => {
    const input = document.getElementById("pid");
    const btn = document.getElementById("go");

    function validate() {
      const v = input.value.trim();
      const ok = /^[0-9]{3}$/.test(v);
      btn.disabled = !ok;
      return ok;
    }

    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "").slice(0, 3);
      validate();
    });

    btn.addEventListener("click", () => {
      if (!validate()) return;
      participantId = input.value.trim();
      jsPsych.finishTrial({ participant_id: participantId });
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && validate()) btn.click();
    });
  },
};

// ======= Leaderboard + narrative =======
const leaderboardTrial = {
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: () => `
    <div style="max-width:860px;margin:28px auto;">
      <h2>Top Defenders</h2>
      <p>Try to beat the leaderboard.</p>
      <table border="1" cellpadding="8" cellspacing="0">
        <thead><tr><th>Rank</th><th>Participant</th><th>Score</th></tr></thead>
        <tbody>
          ${TOP5.slice().sort((a,b)=>b.score-a.score).map((r, idx) =>
            `<tr><td>${idx+1}</td><td>${r.id}</td><td>${r.score}</td></tr>`
          ).join("")}
        </tbody>
      </table>
      <p style="margin-top:12px;">Press <b>Space</b> for the mission briefing.</p>
    </div>
  `,
};

const storyTrial = {
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
    <div style="max-width:860px;margin:28px auto;">
      <h2>Mission briefing</h2>
      <p>
        Your home planet is under attack! Invaders are trying to steal your planet's magic, which is 
        stored at the Core of your planet. You have been appointed by your leader as the head 
        general for protecting your planet using a laser beam machine to take down enemy ships. Good
        luck!
      </p>
      <p>Press <b>Space</b> to continue.</p>
    </div>
  `,
};

const instructionsTrial = {
  type: jsPsychHtmlKeyboardResponse,
  choices: [" "],
  stimulus: `
    <div style="max-width:860px;margin:28px auto;">
      <h2>How to play</h2>
      <p>Click <b>on the CORE</b> to attempt a laser shot.</p>
      <p>Ships need <b>5 hits</b> to be destroyed.</p>
      <p>Destroy a ship → <b>+${POINTS_DESTROY}</b> points.</p>
      <p>If a ship reaches the CORE → <b>${POINTS_CRASH}</b> points.</p>
      <p>Your score <b>carries across rounds</b>.</p>
      <p>You’ll start with a short practice round.</p>
      <p>Press <b>Space</b> to begin practice.</p>
    </div>
  `,
};

// Between-round screen (shows CURRENT score correctly)
function roundCompleteScreen(isPractice) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    choices: [" "],
    stimulus: () => `
      <div style="max-width:860px;margin:28px auto;">
        <h2>${isPractice ? "Practice complete" : "Round complete"}</h2>
        <p>Current total score: <b>${score}</b></p>
        <p>Press <b>Space</b> to continue.</p>
      </div>
    `,
  };
}

// ======= GAME TRIAL =======
function makeDefenseTrial({ roundIndex, settingLabel, pFire, buttonColor, isPractice = false }) {
  const TRIAL_MS = 20000;

  // Square canvas
  const W = 720;
  const H = 720;

  const btn = { cx: W / 2, cy: H / 2, r: 92 };
  const SHIP_HITS_NEEDED = 5;

  const SHIP_SPEED_MIN = 70;
  const SHIP_SPEED_MAX = 105;

  // Laser speed
  const LASER_TRAVEL_MS = 240;

  const RESPAWN_MS = 520;
  const POINTS_FLASH_MS = 520;

  function initStars(n = 190) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.7 + 0.2,
        a: Math.random() * 0.6 + 0.25,
        tw: Math.random() * 0.02 + 0.002,
      });
    }
    return stars;
  }

  function drawStars(ctx, stars, t) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      const tw = 0.65 + 0.35 * Math.sin(t * s.tw * 60 + (s.x + s.y));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a * tw})`;
      ctx.fill();
    }

    // planets
    ctx.beginPath();
    ctx.arc(120, 130, 54, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(90,140,255,0.10)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(600, 170, 44, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,140,200,0.08)";
    ctx.fill();
  }

  function drawButton(ctx) {
    ctx.beginPath();
    ctx.arc(btn.cx, btn.cy, btn.r + 16, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(btn.cx, btn.cy, btn.r, 0, Math.PI * 2);
    ctx.fillStyle = buttonColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(btn.cx, btn.cy, btn.r * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CORE", btn.cx, btn.cy + 8);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Click to fire", btn.cx, btn.cy + 32);
    ctx.textAlign = "left";
  }

  function spawnShip() {
    const edge = Math.floor(Math.random() * 4);
    let x, y;

    if (edge === 0) { x = Math.random() * W; y = -35; }
    if (edge === 1) { x = W + 35; y = Math.random() * H; }
    if (edge === 2) { x = Math.random() * W; y = H + 35; }
    if (edge === 3) { x = -35; y = Math.random() * H; }

    const dx = btn.cx - x;
    const dy = btn.cy - y;
    const d = Math.hypot(dx, dy) || 1;

    const speed = SHIP_SPEED_MIN + Math.random() * (SHIP_SPEED_MAX - SHIP_SPEED_MIN);
    return {
      id: Math.floor(Math.random() * 1e9),
      x, y,
      vx: (dx / d) * speed,
      vy: (dy / d) * speed,
      hits: 0,
      exploding: false,
      expl_t0: 0,
      crashed: false,
    };
  }

  function drawShip(ctx, s) {
    const ang = Math.atan2(s.vy, s.vx);
    const size = 18;

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.75);
    ctx.lineTo(-size, size * 0.75);
    ctx.closePath();
    ctx.fillStyle = "rgba(220,220,255,0.95)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(90,160,255,0.9)";
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${s.hits}/${SHIP_HITS_NEEDED}`, s.x, s.y - 24);
    ctx.textAlign = "left";
  }

  function drawExplosion(ctx, x, y, frac, crashed) {
    const r = 10 + frac * 72;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = crashed
      ? `rgba(255,80,80,${0.25 * (1 - frac)})`
      : `rgba(255,210,80,${0.25 * (1 - frac)})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = crashed
      ? `rgba(255,180,180,${0.25 * (1 - frac)})`
      : `rgba(255,255,255,${0.20 * (1 - frac)})`;
    ctx.fill();
  }

  return {
    type: jsPsychHtmlKeyboardResponse,
    choices: "NO_KEYS",
    stimulus: () => `
      <div style="max-width:980px;margin:18px auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>Participant: <b>${participantId || "NA"}</b></div>
          <div>Score: <b id="score">${score}</b></div>
          <div>
            ${isPractice ? "<b>Practice</b>" : `Round: <b>${roundIndex + 1}/${TOTAL_ROUNDS}</b>`}
          </div>
        </div>

        <div style="margin-top:8px;opacity:0.9;">
          Protect the CORE. Destroy ships (+${POINTS_DESTROY}). Crashes (${POINTS_CRASH}).
        </div>

        <div style="margin-top:12px; position:relative;">
          <div id="bigPoints"
               style="position:absolute;top:14px;left:50%;transform:translateX(-50%);
                      font-size:46px;font-weight:800;color:#ff2d2d;opacity:0;pointer-events:none;">
            +${POINTS_DESTROY}
          </div>
          <canvas id="game" width="${W}" height="${H}" style="border:1px solid #222;border-radius:12px;"></canvas>
        </div>
      </div>
    `,
    on_load: () => {
      // Initialize session clock once
      if (sessionT0 === null) {
        sessionT0 = performance.now();
        sessionDateStr = localDateYYYYMMDD();
      }

      const canvas = document.getElementById("game");
      const ctx = canvas.getContext("2d");
      const scoreEl = document.getElementById("score");
      const bigPoints = document.getElementById("bigPoints");

      const stars = initStars();

      let ended = false;
      const t0 = performance.now();      // trial start (perf)
      let last = t0;

      // counts like pigeon
      let targetCount = 0;
      let backgroundCount = 0;

      // “time up” logic: don’t end until ship resolves
      let timeUp = false;
      let stopSpawning = false;

      let ship = spawnShip();
      let shipRespawnAt = 0;

      let laser = null; // { t0, from, to, ship_id, will_hit }
      let inputLockedUntil = 0;

      const trialNum = isPractice ? 0 : (roundIndex + 1);
      const trialType = settingLabel.replace("%", "").replace("PRACTICE_", "").replace("_", "");
      const trialColor = buttonColor;
      const pFireVal = pFire;

      // trial_start row (like pigeons have start signals)
      pushEventRow({
        nowPerf: t0,
        event: "trial_start",
        trialTimeSec: 0,
        trialType,
        targetCount,
        backgroundCount,
        trialNum,
        trialColor,
        subject: participantId,
        pointsDelta: "",
        scoreTotal: score,
        pFire: pFireVal,
        isPractice: isPractice ? 1 : 0
      });

      function flashPoints(text) {
        bigPoints.textContent = text;
        bigPoints.style.opacity = "1";
        setTimeout(() => { bigPoints.style.opacity = "0"; }, POINTS_FLASH_MS);
      }

      function insideButton(x, y) {
        return Math.hypot(x - btn.cx, y - btn.cy) <= btn.r;
      }

      function getXY(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (W / rect.width);
        const y = (e.clientY - rect.top) * (H / rect.height);
        return { x: clamp(x, 0, W), y: clamp(y, 0, H) };
      }

      function startLaser(now) {
        const fired = Math.random() < pFireVal;

        if (!fired) {
          inputLockedUntil = now + 110;
          return { fired: false };
        }

        inputLockedUntil = now + LASER_TRAVEL_MS;

        const target = ship && !ship.exploding
          ? { x: ship.x, y: ship.y }
          : { x: btn.cx, y: btn.cy - 170 };

        laser = {
          t0: now,
          from: { x: btn.cx, y: btn.cy },
          to: target,
          ship_id: ship && !ship.exploding ? ship.id : null,
          will_hit: !!(ship && !ship.exploding)
        };

        return { fired: true };
      }

      function applyLaserArrival(now) {
        if (!laser) return;
        if (now - laser.t0 < LASER_TRAVEL_MS) return;

        // Laser arrived
        if (laser.will_hit && ship && !ship.exploding && ship.id === laser.ship_id) {
          ship.hits += 1;

          // ship destroyed
          if (ship.hits >= SHIP_HITS_NEEDED) {
            ship.exploding = true;
            ship.expl_t0 = now;
            ship.crashed = false;

            score += POINTS_DESTROY;
            scoreEl.textContent = String(score);
            flashPoints(`+${POINTS_DESTROY}`);

            pushEventRow({
              nowPerf: now,
              event: "ship_destroy",
              trialTimeSec: (now - t0) / 1000,
              trialType,
              targetCount,
              backgroundCount,
              trialNum,
              trialColor,
              subject: participantId,
              pointsDelta: POINTS_DESTROY,
              scoreTotal: score,
            });
          }
        }

        laser = null;
      }

      function drawLaser(now) {
        if (!laser) return;
        const frac = clamp((now - laser.t0) / LASER_TRAVEL_MS, 0, 1);

        const x = laser.from.x + (laser.to.x - laser.from.x) * frac;
        const y = laser.from.y + (laser.to.y - laser.from.y) * frac;

        ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.lineWidth = 2.7;
        ctx.beginPath();
        ctx.moveTo(laser.from.x, laser.from.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(laser.from.x, laser.from.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.fill();
      }

      function onClick(e) {
        if (ended) return;
        const now = performance.now();
        if (now < inputLockedUntil) return;

        const { x, y } = getXY(e);
        const onBtn = insideButton(x, y);

        let fired = 0;
        if (onBtn) {
          const res = startLaser(now);
          fired = res.fired ? 1 : 0;
          targetCount += 1;

          pushEventRow({
            nowPerf: now,
            x, y,
            event: "target_click",
            trialTimeSec: (now - t0) / 1000,
            trialType,
            targetCount,
            backgroundCount,
            trialNum,
            trialColor,
            subject: participantId,
            pointsDelta: "",
            scoreTotal: score,
            fired,
          });
        } else {
          backgroundCount += 1;

          pushEventRow({
            nowPerf: now,
            x, y,
            event: "background_click",
            trialTimeSec: (now - t0) / 1000,
            trialType,
            targetCount,
            backgroundCount,
            trialNum,
            trialColor,
            subject: participantId,
            pointsDelta: "",
            scoreTotal: score,
            fired: 0,
          });
        }
      }

      canvas.addEventListener("pointerdown", onClick);

      function endTrial(now) {
        if (ended) return;
        ended = true;
        canvas.removeEventListener("pointerdown", onClick);

        // trial_end row
        pushEventRow({
          nowPerf: now,
          event: "trial_end",
          trialTimeSec: (now - t0) / 1000,
          trialType,
          targetCount,
          backgroundCount,
          trialNum,
          trialColor,
          subject: participantId,
          pointsDelta: "",
          scoreTotal: score,
          pFire: pFireVal,
          isPractice: isPractice ? 1 : 0
        });

        jsPsych.finishTrial({ score_total: score });
      }

      function loop(now) {
        if (ended) return;

        const dt = (now - last) / 1000;
        last = now;

        // Mark timeUp, but don't end immediately
        if (!timeUp && (now - t0) >= TRIAL_MS) {
          timeUp = true;
          stopSpawning = true; // key: no new ships after time is up
        }

        applyLaserArrival(now);

        if (ship) {
          if (ship.exploding) {
            const frac = clamp((now - ship.expl_t0) / 650, 0, 1);
            if (frac >= 1) {
              ship = null;
              shipRespawnAt = now + RESPAWN_MS;
            }
          } else {
            ship.x += ship.vx * dt;
            ship.y += ship.vy * dt;

            const d = Math.hypot(ship.x - btn.cx, ship.y - btn.cy);
            if (d <= btn.r + 6) {
              ship.exploding = true;
              ship.expl_t0 = now;
              ship.crashed = true;

              score += POINTS_CRASH;
              scoreEl.textContent = String(score);
              flashPoints(String(POINTS_CRASH));

              pushEventRow({
                nowPerf: now,
                event: "ship_crash",
                trialTimeSec: (now - t0) / 1000,
                trialType,
                targetCount,
                backgroundCount,
                trialNum,
                trialColor,
                subject: participantId,
                pointsDelta: POINTS_CRASH,
                scoreTotal: score,
              });
            }
          }
        } else {
          // Spawn logic: only spawn if time NOT up
          if (!stopSpawning && now >= shipRespawnAt) ship = spawnShip();
        }

        // draw
        drawStars(ctx, stars, now / 1000);
        drawButton(ctx);
        drawLaser(now);

        if (ship) {
          if (ship.exploding) {
            const frac = clamp((now - ship.expl_t0) / 650, 0, 1);
            drawExplosion(ctx, ship.x, ship.y, frac, ship.crashed);
          } else {
            drawShip(ctx, ship);
          }
        }

        ctx.fillStyle = "rgba(255,255,255,0.68)";
        ctx.font = "13px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Defend the planet...", 16, 26);

        // ======= NEW END RULE =======
        // If time is up, end ONLY when the current ship has fully resolved (ship === null)
        // and there is no in-flight laser.
        if (timeUp && ship === null && laser === null) {
          endTrial(now);
          return;
        }

        requestAnimationFrame(loop);
      }

      requestAnimationFrame(loop);
    },
  };
}

// ======= Build timeline =======
const order = buildTrialOrder();

// Practice (100%)
const practice = makeDefenseTrial({
  roundIndex: 0,
  settingLabel: "PRACTICE_100%",
  pFire: 1.0,
  buttonColor: "#4aa3ff",
  isPractice: true
});

const gameTrials = order.map((c, idx) =>
  makeDefenseTrial({
    roundIndex: idx,
    settingLabel: c.label,
    pFire: c.p,
    buttonColor: c.color,
    isPractice: false
  })
);

const timeline = [
  idTrial,
  leaderboardTrial,
  storyTrial,
  instructionsTrial,
  practice,
  roundCompleteScreen(true),
];

for (let i = 0; i < gameTrials.length; i++) {
  timeline.push(gameTrials[i]);
  timeline.push(roundCompleteScreen(false));
}

jsPsych.run(timeline);