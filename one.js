<script>
    (function () {
        function shareLink() {
            var url = window.location.href;
            var text = "Check out this live match streaming on Cric Hype!";
            if (navigator.share) {
                navigator.share({ title: "Watch Live Cricket", text: text, url: url }).catch(err => console.log(err));
            } else {
                navigator.clipboard.writeText(url).then(() => {
                    showToast("Link copied to clipboard!");
                });
            }
        }
        window.shareLink = shareLink;
    })();

    const CONFIG = {
        api: "https://service-crichype.vercel.app/api/channel?id=",
        tg: "https://telegram.me/CricHype",
        maxRetries: 3,
        retryDelay: 1500
    };

    // Global player instances
    let playerInstance = null;
    let uiInstance = null;
    let currentData = null;

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    function showError(msg) {
        const overlay = document.getElementById('errorOverlay');
        const errorMsg = document.getElementById('errorMsg');
        errorMsg.textContent = msg || "Stream is currently offline";
        overlay.classList.add('show');
    }

    function hideError() {
        document.getElementById('errorOverlay').classList.remove('show');
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isHtmlUrl(url) {
        return url && (url.endsWith('.html') || url.includes('.html?') || url.includes('.html#'));
    }

    function loadIframe(url) {
        const iframe = document.getElementById('iframePlayer');
        const pc = document.getElementById('playerContainer');
        iframe.src = url;
        iframe.classList.remove('hidden');
        if(pc) pc.classList.add('hidden');
        hideError();
        showToast("Switching to Web Player...");
    }

    async function loadShaka(data, retryCount = 0) {
        const container = document.getElementById('playerContainer');
        const video = document.getElementById('video');
        const iframe = document.getElementById('iframePlayer');
        
        container.classList.remove('hidden');
        iframe.classList.add('hidden');
        hideError();

        // Check browser support
        if (!window.shaka || !shaka.Player.isBrowserSupported()) {
            showError("This browser is not supported for this stream.");
            return;
        }

        try {
            // Initialize or reuse UI
            if (!uiInstance) {
                uiInstance = new shaka.ui.Overlay(
                    new shaka.Player(video), 
                    container, 
                    video
                );
                playerInstance = uiInstance.getControls().getPlayer();
                
                // Add error listener
                playerInstance.addEventListener("error", event => {
                    const code = event.detail && event.detail.code ? event.detail.code : "unknown";
                    showError(`Playback error (${code}). Tap Retry.`);
                });
            }

            const player = playerInstance;

            // Configure DRM if keys provided
            if (data.k1 && data.k2) {
                player.configure({
                    drm: {
                        clearKeys: {
                            [data.k1]: data.k2
                        }
                    }
                });
            }

            // Add request filter for headers
            player.getNetworkingEngine().registerRequestFilter((type, request) => {
                // Add common headers
                request.headers['Origin'] = window.location.origin;
                request.headers['Referer'] = window.location.href;
                request.headers['User-Agent'] = navigator.userAgent;
                request.headers['Accept'] = '*/*';
                
                // Add custom auth if provided
                if (data.Auth) {
                    request.headers['Authorization'] = data.Auth;
                }
            });

            // Try to load the stream
            await player.load(data.url);
            showToast("Live Stream Started");
            
        } catch (err) {
            const code = err && err.code ? err.code : "unknown";
            console.error("Shaka Load Error:", err);
            
            // Retry logic
            if (retryCount < CONFIG.maxRetries) {
                showToast(`Retrying... (${retryCount + 1}/${CONFIG.maxRetries})`);
                await delay(CONFIG.retryDelay * (retryCount + 1));
                
                // Cleanup and retry
                if (playerInstance) {
                    try {
                        await playerInstance.unload();
                    } catch (e) {}
                }
                return loadShaka(data, retryCount + 1);
            }
            
            // All retries failed - try iframe fallback
            if (data.ifurl && data.ifurl.trim() !== "") {
                loadIframe(data.ifurl);
            } else {
                showError(`Failed to load stream (${code}). Please try again.`);
            }
        }
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
            currentData = data;

            // Check for redirect URL
            if (data.reurl && data.reurl.trim() !== "") {
                window.location.href = data.reurl;
                return;
            }

            // Check for iframe URL
            if (data.ifurl && data.ifurl.trim() !== "") {
                loadIframe(data.ifurl);
                return;
            }

            // Check if it's an HTML URL
            if (data.url && isHtmlUrl(data.url)) {
                loadIframe(data.url);
                return;
            }

            // Load with Shaka
            await loadShaka(data);

        } catch (err) {
            console.error("Initialization error:", err);
            window.location.href = CONFIG.tg;
        }
    }

    // Retry button handler
    document.addEventListener('DOMContentLoaded', function() {
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', async function() {
                hideError();
                if (currentData) {
                    // If it was an iframe, reload it
                    if (document.getElementById('iframePlayer').classList.contains('hidden') === false) {
                        loadIframe(currentData.ifurl || currentData.url);
                    } else {
                        // Cleanup and restart Shaka
                        if (playerInstance) {
                            try {
                                await playerInstance.unload();
                            } catch (e) {}
                        }
                        await loadShaka(currentData);
                    }
                } else {
                    initApp();
                }
            });
        }

        // Share button handler
        const shareBtn = document.getElementById('btnShare');
        if (shareBtn) {
            shareBtn.addEventListener('click', function() {
                if (typeof shareLink === 'function') {
                    shareLink();
                }
            });
        }
    });

    // Initialize when Shaka UI is loaded
    document.addEventListener('shaka-ui-loaded', function() {
        // Small delay to ensure everything is ready
        setTimeout(initApp, 100);
    });

    // Fallback if shaka-ui-loaded doesn't fire
    setTimeout(function() {
        if (!uiInstance && document.getElementById('video')) {
            initApp();
        }
    }, 3000);

    // Prevent context menu
    document.addEventListener('contextmenu', e => e.preventDefault());

    // Handle visibility change to reload stream when tab becomes active
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && playerInstance && currentData) {
            // Check if stream is still playing
            try {
                if (playerInstance.isBuffering()) {
                    // Stream might be buffering, stay patient
                }
            } catch (e) {}
        }
    });
</script>
