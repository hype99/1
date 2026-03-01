async function initPlayer() {
            const urlParams = new URLSearchParams(window.location.search);
            const channelId = urlParams.get('id'); 

            if (!channelId) {
                showError("Invalid Request", "Please provide a channel ID in the URL (e.g., ?id=1HD)");
                return;
            }

            try {
                // Fetching your Worker API
                const response = await fetch('https://misty-feather-bb3c.pakivac483-abf.workers.dev/');
                if (!response.ok) throw new Error('Failed to fetch channel data');
                
                const channels = await response.json();
                const channelData = channels.find(c => c.name === channelId);

                if (!channelData) {
                    showError("Not Found", `Channel "${channelId}" was not found in the API.`);
                    return;
                }

                const video = document.getElementById('video');
                const ui = video['ui'];
                const controls = ui.getControls();
                const player = controls.getPlayer();

                // UI Configuration - Added "picture_in_picture" to controlPanelElements
                ui.configure({
                    controlPanelElements: [
                        "play_pause", 
                        "time_and_duration", 
                        "spacer", 
                        "mute", 
                        "volume", 
                        "quality", 
                        "picture_in_picture", // PiP Option Added Here
                        "fullscreen"
                    ],
                    addSeekBar: true
                });

                // DRM Setup
                if (channelData.license_key) {
                    const [keyId, key] = channelData.license_key.split(':');
                    player.configure({
                        drm: {
                            clearKeys: { [keyId.trim()]: key.trim() }
                        }
                    });
                }

                // Header and Token Handling
                const token = channelData.mpd_url.split('?')[1] || "";

                player.getNetworkingEngine().registerRequestFilter((type, request) => {
                    request.headers['Referer'] = 'https://www.jiotv.com/';
                    request.headers['User-Agent'] = "plaYtv/7.1.5 (Linux;Android 13) ExoPlayerLib/2.11.6";
                    
                    if (token) {
                        request.headers['Cookie'] = token;
                        if (!request.uris[0].includes('__hdnea__')) {
                            const separator = request.uris[0].includes('?') ? '&' : '?';
                            request.uris[0] += separator + token;
                        }
                    }
                });

                // Error handling
                player.addEventListener('error', (event) => {
                    if (event.detail.code === 4003) {
                        console.error("DRM Key Error");
                    }
                });

                await player.load(channelData.mpd_url);
                console.log("Stream loaded successfully!");

            } catch (error) {
                console.error("Main Error:", error);
                showError("Stream Error", "The channel is currently unavailable or the link has expired.");
            }
        }

        function showError(title, message) {
            const errorDiv = document.getElementById('error-message');
            errorDiv.innerHTML = `
                <div class="error-card">
                    <h2>${title}</h2>
                    <p>${message}</p>
                    <a href="https://t.me/+89_DpZx6uUs2Mjk9" class="telegram-button">Join Support</a>
                </div>
            `;
            errorDiv.style.display = 'block';
            document.getElementById('video-container').style.display = 'none';
        }

        // Initialize when UI is ready
        document.addEventListener('shaka-ui-loaded', initPlayer);
