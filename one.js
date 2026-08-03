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
                if (!response.ok) { window.location.href = CONFIG.tg; return; }

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
            if(pc) pc.classList.add('hidden');
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
          async function loadShaka(data) {
            const container = document.getElementById('playerContainer');
            const video = document.getElementById('video');
            const iframe = document.getElementById('iframePlayer');

            container.classList.remove('hidden');
            iframe.classList.add('hidden');

            const ui = video['ui'];
            const player = ui.getControls().getPlayer();

            ui.configure({
              controlPanelElements: [
                'play_pause',
                'time_and_duration',
                'spacer',
                'mute',
                'volume',
                'picture_in_picture',
                'fullscreen',
                'overflow_menu'
              ],
              overflowMenuButtons: [
                'quality',
                'language',
                'captions'
              ]
            });
            
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
            }
        }

        document.addEventListener('shaka-ui-loaded', initApp);
        document.addEventListener('contextmenu', e => e.preventDefault());
