const container = document.getElementById("matches-container");
const DATA_URL = "https://raw.githubusercontent.com/Jitendra-unatti/fancode/refs/heads/main/data/fancode.json";
const PLAYER_PAGE = "p";

fetch(DATA_URL)
.then(r => r.json())
.then(data => {
  let matches = Array.isArray(data.matches) ? data.matches : [];

  matches.sort((a, b) => {
    const aLive = (a.status||"").toUpperCase()==="LIVE" || (a.streamingStatus||"").toUpperCase()==="STARTED";
    const bLive = (b.status||"").toUpperCase()==="LIVE" || (b.streamingStatus||"").toUpperCase()==="STARTED";
    return (bLive ? 1 : 0) - (aLive ? 1 : 0);
  });

  matches.forEach(match => {
    const isLive = (match.status||"").toUpperCase()==="LIVE" || (match.streamingStatus||"").toUpperCase()==="STARTED";
    const imgSrc = match.image || (match.image_cdn && (match.image_cdn.APP || match.image_cdn.BG_IMAGE)) || "https://www.fancode.com/skillup-uploads/cms-media/Cricket_Fallback_Old_match-card.jpg";

    const card = document.createElement("div");
    card.className = `rounded-2xl overflow-hidden shadow-xl match-card border border-gray-800 ${isLive ? "ring-2 ring-red-600" : ""}`;

    const headerHTML = `
      <div class="relative">
        <img src="${imgSrc}" class="w-full h-48 sm:h-60 md:h-64 lg:h-72 object-cover object-top match-img">
        ${isLive ? `<span class="absolute top-3 left-3 bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md live-badge">LIVE</span>` : ""}
      </div>
    `;

    const body = document.createElement("div");
    body.className = "p-5 sm:p-6";
    body.innerHTML = `
      <h2 class="text-xl sm:text-2xl font-semibold text-white mb-1">${match.title || "Match"}</h2>
      <p class="text-gray-400 text-sm mb-1">${match.tournament || ""}</p>
      <p class="text-sm text-gray-500 mb-2">${match.startTime || ""}</p>
      <p class="text-sm text-gray-500 mb-3">${match.language || ""}</p>
    `;

    if (isLive) {
      const watchBtn = document.createElement("a");
      watchBtn.href = `${PLAYER_PAGE}?id=${match.match_id}`;
      watchBtn.className = "block w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg mt-3 text-center";
      watchBtn.innerHTML = `<i class="fas fa-tv mr-2"></i>Watch Now`;
      body.appendChild(watchBtn);
    } else {
      const noStream = document.createElement("div");
      noStream.className = "w-full bg-gray-800 text-gray-400 py-2 px-4 rounded-lg mt-3 text-center";
      noStream.innerHTML = `<i class="fas fa-clock mr-2"></i>No stream available yet`;
      body.appendChild(noStream);
    }

    card.innerHTML = headerHTML;
    card.appendChild(body);
    container.appendChild(card);
  });
});
