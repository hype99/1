let currentShakaPlayer = null;
        let currentUi = null;
        let activeChannelName = null;

        function showToast(msg) {
            const toastEl = document.getElementById('toast');
            toastEl.textContent = msg;
            toastEl.classList.add('show');
            setTimeout(() => toastEl.classList.remove('show'), 3200);
        }

        function hideErrorOverlay() {
            const errorDiv = document.getElementById('errorOverlay');
            errorDiv.classList.remove('show');
        }

        function showErrorOverlay(message = "Stream unavailable. Try another channel.") {
            const errorDiv = document.getElementById('errorOverlay');
            const errorMsg = document.getElementById('errorMsg');
            errorMsg.innerText = message;
            errorDiv.classList.add('show');
        }

        function resetPlayerUI() {
            const container = document.getElementById('playerContainer');
            const iframe = document.getElementById('iframePlayer');
            container.classList.add('hidden');
            iframe.classList.add('hidden');
            iframe.src = '';
            if (currentShakaPlayer) {
                try {
                    currentShakaPlayer.destroy();
                } catch(e) { console.warn(e); }
                currentShakaPlayer = null;
            }
            if (currentUi) {
                currentUi = null;
            }
            hideErrorOverlay();
        }

        async function loadChannel(channelObj, channelDisplayName) {
            resetPlayerUI();
            activeChannelName = channelDisplayName || channelObj.name || "Channel";
            
            if (channelObj.reurl && channelObj.reurl.trim() !== "") {
                showToast(`Redirecting to external stream...`);
                window.location.href = channelObj.reurl;
                return;
            }
            
            if (channelObj.ifurl && channelObj.ifurl.trim() !== "") {
                const iframe = document.getElementById('iframePlayer');
                iframe.src = channelObj.ifurl;
                iframe.classList.remove('hidden');
                document.getElementById('playerContainer').classList.add('hidden');
                showToast(`Now playing: ${activeChannelName} (Web Player)`);
                hideErrorOverlay();
                return;
            }
            
            if (channelObj.url && channelObj.url.trim() !== "") {
                const containerDiv = document.getElementById('playerContainer');
                const videoEl = document.getElementById('video');
                containerDiv.classList.remove('hidden');
                document.getElementById('iframePlayer').classList.add('hidden');
                
                if (!window.shaka || !shaka.Player.isBrowserSupported()) {
                    showErrorOverlay("Browser not supported for Shaka player. Use Chrome.");
                    return;
                }
                
                try {
                    if (currentShakaPlayer) {
                        await currentShakaPlayer.destroy();
                        currentShakaPlayer = null;
                    }
                    
                    const player = new shaka.Player(videoEl);
                    currentShakaPlayer = player;
                    
                    const uiElements = new shaka.ui.Overlay(player, containerDiv, videoEl);
                    currentUi = uiElements;
                    
                    if (channelObj.k1 && channelObj.k2) {
                        player.configure({
                            drm: {
                                clearKeys: {
                                    [channelObj.k1]: channelObj.k2
                                }
                            }
                        });
                    }
                    
                    if (channelObj.Auth && channelObj.Auth.trim() !== "") {
                        player.getNetworkingEngine().registerRequestFilter((type, request) => {
                            request.headers['Authorization'] = channelObj.Auth;
                        });
                    }
                    
                    await player.load(channelObj.url);
                    showToast(`Now playing: ${activeChannelName}`);
                    hideErrorOverlay();
                } catch (error) {
                    console.error("Shaka Load Error:", error);
                    let errMsg = error.message || "Stream loading failed";
                    if (errMsg.includes("HTTP 404")) errMsg = "Stream source not found";
                    else if (errMsg.includes("CORS")) errMsg = "CORS restriction";
                    showErrorOverlay(`Failed to load ${activeChannelName}. ${errMsg.substring(0, 80)}`);
                }
                return;
            }
            
            showErrorOverlay("Invalid stream data. No playable source.");
        }
        
        async function fetchAndRenderChannels() {
            const channelsListDiv = document.getElementById('channelsList');
            try {
                const response = await fetch("https://service-crichype.vercel.app/api/new");
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                let channels = await response.json();
                
                if (!Array.isArray(channels) || channels.length === 0) {
                    channelsListDiv.innerHTML = `<div style="padding: 14px; color: var(--text-muted);"><i class="fas fa-exclamation-triangle"></i> No channels available</div>`;
                    return;
                }
                
                channels = channels.filter(ch => ch && (ch.url || ch.ifurl || ch.reurl));
                
                if (channels.length === 0) {
                    channelsListDiv.innerHTML = `<div style="padding: 14px; color: var(--text-muted);">No playable channels found.</div>`;
                    return;
                }
                
                channelsListDiv.innerHTML = "";
                channels.forEach((channel, idx) => {
                    const channelName = channel.name || (channel.ifurl ? `Embed ${idx+1}` : (channel.url ? `Stream ${idx+1}` : `Channel ${idx+1}`));
                    const btn = document.createElement('button');
                    btn.className = 'channel-btn';
                    btn.innerHTML = `<i class="fas fa-play-circle"></i> ${escapeHtml(channelName)}`;
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.querySelectorAll('.channel-btn').forEach(btn => btn.classList.remove('active-channel'));
                        btn.classList.add('active-channel');
                        loadChannel(channel, channelName);
                    });
                    channelsListDiv.appendChild(btn);
                });
                
                if (channels.length > 0) {
                    const firstChannel = channels[0];
                    const firstName = firstChannel.name || (firstChannel.ifurl ? `Embed 1` : (firstChannel.url ? `Stream 1` : `Channel 1`));
                    const firstBtn = channelsListDiv.querySelector('.channel-btn');
                    if (firstBtn) firstBtn.classList.add('active-channel');
                    await loadChannel(firstChannel, firstName);
                } else {
                    showToast("No playable channels from API");
                }
                
            } catch (err) {
                console.error("Error fetching channels:", err);
                channelsListDiv.innerHTML = `<div style="padding: 14px; color: var(--text-muted);"><i class="fas fa-link"></i> Failed to load channel list. Please refresh page.</div>`;
                showToast("Could not fetch channel list. Check network.");
            }
        }
        
        function escapeHtml(str) {
            if(!str) return "";
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }
        
        function setupRetryButton() {
            const retryBtn = document.getElementById('manualRetryBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    window.location.reload();
                });
            }
        }
        
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        document.addEventListener('DOMContentLoaded', () => {
            setupRetryButton();
            fetchAndRenderChannels().catch(err => {
                console.error(err);
                showToast("Initialization error. Refresh or check connection.");
            });
        });
        
        window.addEventListener('shaka-ui-loaded', () => {
            console.log("shaka-ui-loaded ignored");
        });
        
        window.addEventListener('online', () => {
            showToast("Connection restored. Switch channel if needed.");
        });
