const video = document.getElementById('video');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
const unmuteIcon = document.getElementById('unmuteIcon');
video.muted = true;
video.setAttribute('muted', '');
video.setAttribute('playsinline', '');

function tryAutoplay() {
    var playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(function () {
            // Retry on user interaction as last resort
            document.addEventListener('touchstart', playOnce, { once: true });
            document.addEventListener('click', playOnce, { once: true });
        });
    }
}

function playOnce() {
    video.muted = true;
    video.play();
}
tryAutoplay();
window.addEventListener('load', tryAutoplay);
document.addEventListener('DOMContentLoaded', tryAutoplay);

// Handle tab visibility (browsers pause hidden tabs)
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        video.play();
    }
});
function track(event, data) {
    const payload = { type: 'creative_event', event: event, data: data || {}, ts: Date.now() };
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(payload, '*');
        }
    } catch (e) { /* postMessage to cross-origin parent is fine */ }
    if (window.console) console.log('[creative]', event, payload.data);


    if (typeof fnfetchAPI === 'function' && window.trackingType) {
        fnfetchAPI(window.trackingType + encodeURIComponent(event));
    }
}
let lastAudible = !video.muted && video.volume > 0;
function syncMuteIcon() {
    const audible = !video.muted && video.volume > 0;
    muteIcon.style.display = audible ? 'none' : 'block';
    unmuteIcon.style.display = audible ? 'block' : 'none';
    if (audible !== lastAudible) {
        track(audible ? 'audio_audible' : 'audio_inaudible', {
            muted: video.muted,
            volume: video.volume
        });
        lastAudible = audible;
    }
}
video.addEventListener('volumechange', syncMuteIcon);
syncMuteIcon();
let firstPlayTracked = false;
video.addEventListener('playing', function () {
    if (firstPlayTracked) return;
    firstPlayTracked = true;
    const audible = !video.muted && video.volume > 0;
    track(audible ? 'video_played_audible' : 'video_played_muted', {
        muted: video.muted,
        volume: video.volume
    });
});
function toggleMute() {
    const willBeMuted = !video.muted;
    track('mute_button_clicked', { to: willBeMuted ? 'muted' : 'unmuted' });
    video.muted = willBeMuted;
    if (video.volume === 0) video.volume = 1;
}
let selectedOption = null;
const submitBtn = document.getElementById('submitBtn');
function selectOption(el) {
    if (submitBtn.classList.contains('submitted')) return;
    document.querySelectorAll('.poll-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedOption = el.dataset.value;
    submitBtn.classList.add('active');
    track('poll_option_selected', { option: selectedOption });
    track('poll_answer_' + selectedOption, {});
}
function submitVote() {
    if (!selectedOption || submitBtn.classList.contains('submitted')) return;

    track('poll_vote_submitted', { option: selectedOption });
    track('poll_vote_submitted_' + selectedOption, {});

    submitBtn.textContent = 'Thank You!';
    submitBtn.classList.remove('active');
    submitBtn.classList.add('submitted');

    const fakeResults = { 1: 5, 2: 12, 3: 18, 4: 30, 5: 35 };

    document.querySelectorAll('.poll-option').forEach(opt => {
        const val = opt.dataset.value;
        const pct = fakeResults[val];
        opt.querySelector('.result-bar').style.width = pct + '%';
        opt.querySelector('.result-pct').textContent = pct + '%';
        opt.classList.add('voted');
    });
}
function fnfetchAPI(trackingURL) {
    fetch(trackingURL, { method: "GET" })
        .then((response) => console.log("Tracking sent:", response.status))
        .catch((error) => console.error("Tracking error:", error));
}
window.trackingPath = "assets/";
window.trackingType = "https://staging-dmp-producer.iion.io/tracker/impressions?platform=Aniview&campaign_id=14499539&event_name=";
window.setTracker = "%%CLICK_URL_UNESC%%";
window.landingPageUrl = window.setTracker + "";