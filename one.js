function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), 3000);
        }

        let activeHls = null;
        let plyrInstance = null;

        function loadHlsPlayer(hlsUrl, authToken = null) {
            return new Promise((resolve, reject) => {
                const hlsContainer = document.getElementById('hlsPlayerContainer');
                const shakaContainer = document.getElementById('playerContainer');
                const iframeElem = document.getElementById('iframePlayer');
                const videoElem = document.getElementById('hlsVideo');
                
                shakaContainer.classList.add('hidden');
                iframeElem.classList.add('hidden');
                hlsContainer.classList.remove('hidden');
                
                if (activeHls) {
                    try { activeHls.destroy(); } catch(e) {}
                    activeHls = null;
                }
                if (plyrInstance) {
                    plyrInstance.destroy();
                    plyrInstance = null;
                }
                
                if (Hls.isSupported()) {
                    const hls = new Hls({ maxMaxBufferLength: 100, enableWorker: true, manifestLoadingTimeOut: 10000, levelLoadingTimeOut: 10000 });
                    activeHls = hls;
                    
                    if (authToken) {
                        hls.config.xhrSetup = function(xhr, url) {
                            xhr.setRequestHeader('Authorization', authToken);
                        };
                    }
                    
                    hls.loadSource(hlsUrl);
                    hls.attachMedia(videoElem);
                    
                    hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                        const levels = hls.levels;
                        const qualityOptions = levels.map(level => level.height);
                        const playerOptions = {
                            quality: { default: qualityOptions[0] || 720, options: qualityOptions, forced: true, onChange: (quality) => {
                                hls.levels.forEach((level, idx) => { if (level.height === quality) hls.currentLevel = idx; });
                            } },
                            settings: ['quality', 'speed', 'loop'],
                            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen']
                        };
                        plyrInstance = new Plyr(videoElem, playerOptions);
                        showToast("HLS Live Stream Started");
                        resolve();
                    });
                    
                    hls.on(Hls.Events.ERROR, function(event, data) {
                        if (data.fatal) reject(new Error("HLS stream error"));
                    });
                    
                    videoElem.play().catch(e => console.warn("Autoplay prevented:", e));
                } else if (videoElem.canPlayType('application/vnd.apple.mpegurl')) {
                    videoElem.src = hlsUrl;
                    plyrInstance = new Plyr(videoElem, { controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'] });
                    videoElem.addEventListener('loadedmetadata', () => { showToast("HLS Stream Started"); resolve(); });
                    videoElem.play().catch(e => console.warn("Autoplay failed:", e));
                } else {
                    reject(new Error("HLS not supported"));
                }
            });
        }

        async function loadShaka(data) {
            const container = document.getElementById('playerContainer');
            const video = document.getElementById('video');
            const iframe = document.getElementById('iframePlayer');
            const hlsContainer = document.getElementById('hlsPlayerContainer');
            
            hlsContainer.classList.add('hidden');
            iframe.classList.add('hidden');
            container.classList.remove('hidden');
            
            if (!shaka.Player.isBrowserSupported()) {
                showToast("Browser not supported");
                document.getElementById('errorOverlay').classList.add('show');
                return;
            }
            
            const ui = video['ui'];
            let player;
            if (ui) {
                player = ui.getControls().getPlayer();
            } else {
                const uiElement = document.getElementById('playerContainer');
                const newUi = new shaka.ui.Overlay(shaka.Player, uiElement, video);
                player = newUi.getPlayer();
                video['ui'] = newUi;
            }
            
            if (data.k1 && data.k2) {
                player.configure({ drm: { clearKeys: { [data.k1]: data.k2 } } });
            }
            
            if (data.Auth) {
                player.getNetworkingEngine().registerRequestFilter((type, request) => {
                    request.headers['Authorization'] = data.Auth;
                });
            }
            
            try {
                await player.load(data.url);
                showToast("Live Stream Started");
            } catch (e) {
                console.error("Shaka Load Error", e);
                document.getElementById('errorOverlay').classList.add('show');
                document.getElementById('errorMsg').innerText = "Stream load error. Try refreshing.";
            }
        }
        
        function loadIframe(url) {
            const iframe = document.getElementById('iframePlayer');
            const pc = document.getElementById('playerContainer');
            const hlsContainer = document.getElementById('hlsPlayerContainer');
            iframe.src = url;
            iframe.classList.remove('hidden');
            pc.classList.add('hidden');
            hlsContainer.classList.add('hidden');
            showToast("Switching to Web Player...");
        }
        
        async function initApp() {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            
            if (!id) {
                window.location.href = "https://telegram.me/CricHype";
                return;
            }
            
            try {
                const response = await fetch(`https://service-crichype.vercel.app/api/channel?id=${id}`);
                if (!response.ok) {
                    window.location.href = "https://telegram.me/CricHype";
                    return;
                }
                
                const data = await response.json();
                
                if (data.reurl && data.reurl.trim() !== "") {
                    window.location.href = data.reurl;
                    return;
                }
                
                if (data.hlsurl && data.hlsurl.trim() !== "") {
                    document.getElementById('errorOverlay').classList.remove('show');
                    try {
                        await loadHlsPlayer(data.hlsurl, data.Auth || null);
                    } catch (hlsErr) {
                        document.getElementById('errorOverlay').classList.add('show');
                        document.getElementById('errorMsg').innerText = "HLS stream unavailable. Please try again later.";
                    }
                    return;
                }
                
                if (data.ifurl && data.ifurl.trim() !== "") {
                    loadIframe(data.ifurl);
                    return;
                }
                
                if (data.url) {
                    loadShaka(data);
                } else {
                    throw new Error("No stream source provided");
                }
                
            } catch (err) {
                console.error("Initialization error:", err);
                window.location.href = "https://telegram.me/CricHype";
            }
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof shaka !== 'undefined') {
                initApp().catch(e => console.error(e));
            } else {
                window.addEventListener('shaka-ui-loaded', () => {
                    initApp().catch(e => console.error(e));
                });
                setTimeout(() => {
                    if (typeof shaka === 'undefined') {
                        initApp().catch(e => console.error(e));
                    }
                }, 1500);
            }
        });
        
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        const retryBtn = document.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.onclick = (e) => {
                if (activeHls) {
                    try { activeHls.destroy(); } catch(ex) {}
                }
                if (plyrInstance) {
                    plyrInstance.destroy();
                }
                location.reload();
            };
        }
