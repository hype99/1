(function(){
      // 1. Sandbox Check
      function isSandboxedEnv(){
        try {
          if (window.self === window.top) return false;
          if (window.frameElement && window.frameElement.hasAttribute("sandbox")) return true;
          return false;
        } catch(e) { return true; }
      }

      function triggerBlockScreen(title, message){
        const container = document.getElementById("player-container");
        const overlay = document.createElement("div");
        overlay.className = "block-overlay";
        overlay.innerHTML = `<div class="block-box"><div class="block-title">${title}</div><div>${message}</div></div>`;
        document.body.appendChild(overlay);
        if(container) container.style.display = 'none';
      }

      if(isSandboxedEnv()){
        triggerBlockScreen('Sandbox Detected', 'Please open in a standard browser (Chrome/Edge) to watch.');
        return;
      }

      // 2. Main Logic
      document.addEventListener("DOMContentLoaded", async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const channelId = urlParams.get('id');
        const apiUrl = "https://misty-feather-bb3c.pakivac483-abf.workers.dev/";

        if(!channelId) {
            triggerBlockScreen('Invalid Request', 'Please provide a channel ID (e.g. ?id=1HD)');
            return;
        }

        shaka.polyfill.installAll();
        const video = document.getElementById("video");
        const container = document.getElementById("player-container");
        const player = new shaka.Player(video);
        const ui = new shaka.ui.Overlay(player, container, video);

        ui.configure({
            controlPanelElements: ["mute", "play_pause", "time_and_duration", "spacer", "quality", "picture_in_picture", "fullscreen"]
        });

        try {
          // Fetch from your Worker API
          const response = await fetch(apiUrl);
          const data = await response.json();
          const channelData = data.find(c => c.name === channelId);

          if (!channelData) throw new Error("Channel Not Found");

          // Extract the token from the mpd_url (everything after the ?)
          const urlParts = channelData.mpd_url.split('?');
          const streamUrl = urlParts[0];
          const tokenValue = urlParts[1] || ""; // This is the __hdnea__=... string

          // DRM Configuration
          if (channelData.license_key) {
            const [kId, k] = channelData.license_key.split(':');
            player.configure({
              drm: { clearKeys: { [kId.trim()]: k.trim() } }
            });
          }

          player.configure({
            manifest: { defaultPresentationDelay: 5 },
            streaming: { lowLatencyMode: true, bufferingGoal: 12 }
          });

          // 3. Networking Filter - Injecting token from API into Headers and URIs
          player.getNetworkingEngine().registerRequestFilter((type, request) => {
            request.headers["Referer"] = "https://www.jiotv.com/";
            request.headers["User-Agent"] = "plaYtv/7.1.5 (Linux;Android 13) ExoPlayerLib/2.11.6";
            
            if (tokenValue) {
                // Add the token as a Cookie header
                request.headers["Cookie"] = tokenValue;

                // For Manifests and Segments, append the token to the URL
                const isVideoData = type === shaka.net.NetworkingEngine.RequestType.MANIFEST || 
                                    type === shaka.net.NetworkingEngine.RequestType.SEGMENT;
                
                if (isVideoData && !request.uris[0].includes("__hdnea__")) {
                    const sep = request.uris[0].includes("?") ? "&" : "?";
                    request.uris[0] += sep + tokenValue;
                }
            }
          });

          await player.load(channelData.mpd_url);
          video.play().catch(() => { video.muted = true; video.play(); });

        } catch (err) {
          console.error(err);
          triggerBlockScreen('Stream Error', 'Channel offline or connection issue.');
        }

        video.addEventListener("play", () => { video.muted = false; });
      });
    })();
