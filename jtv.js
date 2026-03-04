(function(){
      document.addEventListener("DOMContentLoaded", async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const channelId = urlParams.get('id');
        const apiUrl = "https://misty-feather-bb3c.pakivac483-abf.workers.dev/";

        if(!channelId) return;

        shaka.polyfill.installAll();
        const video = document.getElementById("video");
        const container = document.getElementById("player-container");
        
        const player = new shaka.Player(video);
        const ui = new shaka.ui.Overlay(player, container, video);

        // White Seekbar and Control Panel
        ui.configure({
            controlPanelElements: ["mute", "play_pause", "time_and_duration", "spacer", "quality", "picture_in_picture", "fullscreen"],
            seekBarColors: {
                base: "rgba(255, 255, 255, 0.3)",
                buffered: "rgba(255, 255, 255, 0.5)",
                played: "rgb(255, 255, 255)"
            }
        });

        try {
          const response = await fetch(apiUrl);
          const data = await response.json();
          const channelData = data.find(c => c.name === channelId);

          if (!channelData) return;

          // Extract token from mpd_url
          const tokenValue = channelData.mpd_url.split('?')[1] || "";

          // DRM Setup
          if (channelData.license_key) {
            const [kId, k] = channelData.license_key.split(':');
            player.configure({
              drm: { clearKeys: { [kId.trim()]: k.trim() } }
            });
          }

          player.configure({
            manifest: { defaultPresentationDelay: 5 },
            streaming: { lowLatencyMode: true, bufferingGoal: 10 }
          });

          // Networking Filter
          player.getNetworkingEngine().registerRequestFilter((type, request) => {
            request.headers["Referer"] = "https://www.jiotv.com/";
            request.headers["User-Agent"] = "plaYtv/7.1.5 (Linux;Android 13) ExoPlayerLib/2.11.6";
            
            if (tokenValue) {
                request.headers["Cookie"] = tokenValue;

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
          console.error("Stream Error:", err);
        }

        video.addEventListener("play", () => { video.muted = false; });
      });
    })();
