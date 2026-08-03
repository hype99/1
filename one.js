const CONFIG = {
    api: "https://service-apiiiii.vercel.app/api/channel?id=",
    tg: "https://telegram.me/CricHype"
};

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

async function initApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = CONFIG.tg;
        return;
    }

    try {
        const response = await fetch(CONFIG.api + id);
        if (!response.ok) {
            window.location.href = CONFIG.tg;
            return;
        }

        const data = await response.json();

        if (data.reurl && data.reurl.trim() !== "") {
            window.location.href = data.reurl;
            return;
        }

        if (data.ifurl && data.ifurl.trim() !== "") {
            loadIframe(data.ifurl);
            return;
        }

        loadShaka(data);

    } catch (err) {
        console.error("Initialization error:", err);
        window.location.href = CONFIG.tg;
    }
}

function loadIframe(url) {
    const iframe = document.getElementById('iframePlayer');
    const pc = document.getElementById('playerContainer');

    iframe.src = url;
    iframe.classList.remove('hidden');
    pc.classList.add('hidden');

    showToast("Switching to Web Player...");
}

async function loadShaka(data) {
    const container = document.getElementById('playerContainer');
    const video = document.getElementById('video');
    const iframe = document.getElementById('iframePlayer');

    container.classList.remove('hidden');
    iframe.classList.add('hidden');

    const ui = video['ui'];
    const player = ui.getControls().getPlayer();

    if (data.k1 && data.k2) {
        player.configure({
            drm: {
                clearKeys: {
                    [data.k1]: data.k2
                }
            }
        });
    }

    if (data.Auth) {
        player.getNetworkingEngine().registerRequestFilter((type, request) => {
            request.headers["Authorization"] = data.Auth;
        });
    }

    try {
        await player.load(data.url);
        showToast("Live Stream Started");

        // Add PiP button after controls are created
        setTimeout(addPiPButton, 500);

    } catch (e) {
        console.error("Shaka Load Error", e);
        document.getElementById("errorOverlay").classList.add("show");
    }
}

function addPiPButton() {
    if (!document.pictureInPictureEnabled) return;

    if (document.getElementById("custom-pip-btn")) return;

    const controls = document.querySelector(".shaka-controls-button-panel");
    const video = document.getElementById("video");

    if (!controls) return;

    const btn = document.createElement("button");
    btn.id = "custom-pip-btn";
    btn.className = "shaka-overflow-button";
    btn.title = "Picture in Picture";
    btn.innerHTML = `
<svg class="shaka-pip-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path fill="currentColor"
        d="M19 7H5v10h14V7zm0-2c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h14zm-1 7h-6v4h6v-4z"/>
</svg>`;

    btn.onclick = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Insert before Fullscreen button
    const fullscreenBtn = controls.querySelector(".shaka-fullscreen-button");

    if (fullscreenBtn) {
        controls.insertBefore(btn, fullscreenBtn);
    } else {
        controls.appendChild(btn);
    }
}

document.addEventListener("shaka-ui-loaded", initApp);
document.addEventListener("contextmenu", e => e.preventDefault());
