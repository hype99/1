async function loadShaka(data) {
    const container = document.getElementById('playerContainer');
    const video = document.getElementById('video');
    const iframe = document.getElementById('iframePlayer');

    container.classList.remove('hidden');
    iframe.classList.add('hidden');

    const ui = video['ui'];
    const player = ui.getControls().getPlayer();

    // Configure Shaka UI
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
    } catch (e) {
        console.error("Shaka Load Error", e);
        document.getElementById('errorOverlay').classList.add('show');
    }
}
