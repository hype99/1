const DATA_URL = "https://raw.githubusercontent.com/Jitendra-unatti/fancode/refs/heads/main/data/fancode.json";
const matchId = parseInt(new URLSearchParams(window.location.search).get("id"));
const video = document.getElementById("video");
let player = null;

function qualityBadge(res) {
  if (res >= 1080) return `<span class="badge fhd">${res}p</span>`;
  if (res >= 720)  return `<span class="badge hd">${res}p</span>`;
  return `<span class="badge">${res}p</span>`;
}

function parseQualities(m3u8Text) {
  const lines = m3u8Text.split("\n");
  const qualities = [];
  lines.forEach((line, i) => {
    if (line.includes("RESOLUTION=")) {
      const height = parseInt(line.split("RESOLUTION=")[1].split(",")[0].split("x")[1]);
      const fps = line.includes("FRAME-RATE=50") ? "50fps" : "25fps";
      const url = (lines[i + 1] || "").trim();
      if (url) qualities.push({ height, fps, url });
    }
  });
  return qualities.sort((a, b) => b.height - a.height);
}

function renderQualities(qualities) {
  const list = document.getElementById("quality-list");
  list.innerHTML = "";
  if (!qualities.length) {
    list.innerHTML = `<div class="qs-error">❌ No streams available.</div>`;
    return;
  }
  qualities.forEach(q => {
    const btn = document.createElement("div");
    btn.className = "qs-btn";
    btn.innerHTML = `
      <span>▶ ${q.height}p ${q.fps === "50fps" ? "<small style='color:#94a3b8;font-weight:500'> · 50fps</small>" : ""}</span>
      ${qualityBadge(q.height)}
    `;
    btn.onclick = () => startPlayer(q.url);
    list.appendChild(btn);
  });
}

async function loadMatch() {
  if (!matchId) { showError("No match ID provided."); return; }
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    const match = (data.matches || []).find(m => m.match_id === matchId);
    if (!match) { showError(`Match ID ${matchId} not found.`); return; }

    document.getElementById("match-title").textContent = match.title;
    document.getElementById("match-tournament").textContent = match.tournament;

    const streamAuto = match.auto_streams?.[0]?.auto || "";
    if (!streamAuto) { showError("Stream not available."); return; }

    renderQualities(parseQualities(streamAuto));
  } catch {
    showError("Failed to load match data. Please try again.");
  }
}

function showError(msg) {
  document.getElementById("match-title").textContent = "Error";
  document.getElementById("quality-list").innerHTML = `<div class="qs-error">❌ ${msg}</div>`;
}

async function startPlayer(streamUrl) {
  document.getElementById("quality-screen").classList.add("hidden");
  document.getElementById("player-screen").classList.add("visible");
  document.getElementById("back-btn").classList.add("visible");

  if (player) { await player.destroy(); player = null; }

  try {
    player = new shaka.Player();
    await player.attach(video);

    const ui = new shaka.ui.Overlay(player, document.querySelector(".shaka-video-container"), video);
    ui.configure({
      seekBarColors: { base: "rgba(255,255,255,.2)", buffered: "rgba(255,255,255,.4)", played: "rgb(255,0,0)" },
      controlPanelElements: ["play_pause","mute","time_and_duration","spacer","quality","picture_in_picture","fullscreen","overflow_menu"]
    });

    player.configure({
      streaming: { bufferingGoal: 10, rebufferingGoal: 2, bufferBehind: 30 }
    });

    video.muted = false;
    video.volume = 1;
    await player.load(streamUrl);
    try { await video.play(); } catch { video.muted = true; await video.play(); }

  } catch (err) {
    console.error("Player error:", err);
    video.src = streamUrl;
    try { await video.play(); } catch { video.muted = true; await video.play(); }
  }
}

function showQualityScreen() {
  if (player) { player.destroy(); player = null; }
  document.getElementById("player-screen").classList.remove("visible");
  document.getElementById("back-btn").classList.remove("visible");
  document.getElementById("quality-screen").classList.remove("hidden");
}

document.getElementById("back-btn").addEventListener("click", showQualityScreen);
document.addEventListener("DOMContentLoaded", loadMatch);
