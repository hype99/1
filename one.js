const CONFIG = {
    api: "https://service-apiiiii.vercel.app/api/channel?id=",
    tg: "https://telegram.me/CricHype"
};

function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}

function addWatermark() {

    if (document.getElementById("crichype-watermark")) return;

    const style = document.createElement("style");
    style.textContent = `
        #playerContainer{
            position:relative;
            overflow:hidden;
        }

        #crichype-watermark{
            position:absolute;
            left:50px;
            top:60px;
            z-index:999999;

            color:rgba(255,255,255,.28);
            font-family:Inter,sans-serif;
            font-size:20px;
            font-weight:900;
            letter-spacing:1px;
            text-transform:uppercase;

            pointer-events:none;
            user-select:none;

            text-shadow:0 0 8px rgba(0,0,0,.9);

            animation:crichypeMove 30s linear infinite;
        }

        @keyframes crichypeMove{
            0%{left:50px;top:60px;}
            25%{left:90px;top:90px;}
            50%{left:70px;top:130px;}
            75%{left:100px;top:80px;}
            100%{left:50px;top:60px;}
        }

        #custom-pip-btn{
            display:flex;
            align-items:center;
            justify-content:center;
            width:32px;
            height:32px;
            cursor:pointer;
            color:#fff;
        }

        #custom-pip-btn svg{
            width:22px;
            height:22px;
            fill:currentColor;
        }
    `;

    document.head.appendChild(style);

    const wm = document.createElement("div");
    wm.id = "crichype-watermark";
    wm.textContent = "CricHype";

    document.getElementById("playerContainer").appendChild(wm);
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
    <svg viewBox="0 0 24 24">
        <path d="M19 7H5v10h14V7zm0-2c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h14zm-1 7h-6v4h6v-4z"/>
    </svg>`;

    btn.onclick = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fullscreen = controls.querySelector(".shaka-fullscreen-button");

    if (fullscreen) {
        controls.insertBefore(btn, fullscreen);
    } else {
        controls.appendChild(btn);
    }
}

async function initApp() {

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

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
        console.error(err);
        window.location.href = CONFIG.tg;
    }
}

function loadIframe(url) {

    const iframe = document.getElementById("iframePlayer");
    const pc = document.getElementById("playerContainer");

    iframe.src = url;

    iframe.classList.remove("hidden");
    pc.classList.add("hidden");

    showToast("Switching to Web Player...");
}

async function loadShaka(data) {

    const container = document.getElementById("playerContainer");
    const video = document.getElementById("video");
    const iframe = document.getElementById("iframePlayer");

    container.classList.remove("hidden");
    iframe.classList.add("hidden");

    const ui = video["ui"];
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
            request.headers.Authorization = data.Auth;
        });
    }

    try {

        await player.load(data.url);

        addWatermark();

        setTimeout(addPiPButton, 500);

        showToast("Live Stream Started");

    } catch (e) {

        console.error("Shaka Load Error", e);

        document.getElementById("errorOverlay").classList.add("show");
    }
}

document.addEventListener("shaka-ui-loaded", initApp);

document.addEventListener("contextmenu", e => e.preventDefault());
