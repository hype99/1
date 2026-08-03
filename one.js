const CONFIG = {
    api: "https://service-apiiiii.vercel.app/api/channel?id=",
    tg: "https://telegram.me/CricHype"
};

/* ==========================================
   WATERMARK CONFIG
   ========================================== */

const WATERMARK = {
    text: "Your Watermark",
    left: 70,
    top: 60,
    opacity: 0.28,
    fontSize: 18,
    color: "#ffffff"
};

function createWatermark() {

    if (document.getElementById("dynamicWatermark")) return;

    const style = document.createElement("style");

    style.textContent = `
        #dynamicWatermark{
            position:fixed;
            left:${WATERMARK.left}px;
            top:${WATERMARK.top}px;
            color:${WATERMARK.color};
            opacity:${WATERMARK.opacity};
            font-size:${WATERMARK.fontSize}px;
            font-family:Arial,sans-serif;
            font-weight:500;
            pointer-events:none;
            z-index:999999;
            user-select:none;
            text-shadow:0 0 2px rgba(0,0,0,.5);
        }
    `;

    document.head.appendChild(style);

    const wm = document.createElement("div");

    wm.id = "dynamicWatermark";
    wm.textContent = WATERMARK.text;

    document.body.appendChild(wm);
}

/* ==========================================
   TOAST
   ========================================== */

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

/* ==========================================
   APP INIT
   ========================================== */

async function initApp() {

    createWatermark();

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

/* ==========================================
   IFRAME
   ========================================== */

function loadIframe(url) {

    const iframe = document.getElementById('iframePlayer');
    const pc = document.getElementById('playerContainer');

    iframe.src = url;

    iframe.classList.remove('hidden');

    if (pc)
        pc.classList.add('hidden');

    showToast("Switching to Web Player...");
}

/* ==========================================
   PICTURE IN PICTURE BUTTON
   ========================================== */

function addPiPButton(video) {

    if (document.getElementById("pipControl")) return;

    const controls = document.querySelector(".shaka-controls-button-panel");

    if (!controls) return;

    const settingsBtn = controls.querySelector(".shaka-overflow-menu-button");
    const fullscreenBtn = controls.querySelector(".shaka-fullscreen-button");

    if (!settingsBtn || !fullscreenBtn) return;

    const btn = document.createElement("button");

    btn.id = "pipControl";

    btn.className = settingsBtn.className;

    btn.setAttribute("aria-label", "Picture in Picture");

    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg"
             width="24"
             height="24"
             viewBox="0 0 24 24"
             fill="white">
            <path d="M19 7H5v10h14V7zm-1 8h-6v-4h6v4z"/>
        </svg>
    `;

    btn.onclick = async () => {

        try {

            if (!document.pictureInPictureElement) {

                await video.requestPictureInPicture();

            } else {

                await document.exitPictureInPicture();

            }

        } catch (e) {

            console.error(e);

        }

    };

    controls.insertBefore(btn, fullscreenBtn);
}

/* ==========================================
   SHAKA PLAYER
   ========================================== */

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
            request.headers['Authorization'] = data.Auth;
        });

    }

    try {

        await player.load(data.url);

        showToast("Live Stream Started");

        setTimeout(() => {
            addPiPButton(video);
        }, 500);

    } catch (e) {

        console.error("Shaka Load Error", e);

        document
            .getElementById('errorOverlay')
            .classList
            .add('show');

    }
}

/* ==========================================
   EVENTS
   ========================================== */

document.addEventListener('shaka-ui-loaded', initApp);

document.addEventListener('contextmenu', e => e.preventDefault());
