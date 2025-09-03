/**
 * Pomodoro Timer (AMD) — scoped by course, increments only when focus ends.
 * WS: block_pomodoro_increment_session(courseid:int, startts:int [UNIX seconds])
 *     block_pomodoro_get_status(courseid:int)
 */
define(['core/ajax', 'core/notification'], function(Ajax, Notification) {
    'use strict';

    // =====================
    // Module-level shared mutable state (per page load)
    // =====================
    /**
     * @typedef {Object} Config
     * @property {number} courseid
     * @property {number} wellnessSec
     * @property {number} focusMs
     * @property {number} shortbreakMs
     * @property {number} longbreakMs
     * @property {number} longbreakInterval
     */
    /** @type {null|Config} */
    let cfg = null; // Set in init().
    /**
     * @typedef {Object} ScopedKeys
     * @property {string} END End timestamp key.
     * @property {string} REMAINING
     * @property {string} RUNNING Running state key.
     * @property {string} PHASE
     * @property {string} BREAKKIND
     * @property {string} MSG
     * @property {string} CHANNEL
     */
    /** @type {null|ScopedKeys} */
    let K = null; // Key names (scoped localStorage) set in init().
    /** @type {null|BroadcastChannel} */
    let channel = null; // Broadcast channel instance.
    /** @type {null|number} */
    let intervalId = null; // Active countdown interval id.
    const frames = 25;
    let currentFrame = 1;
    let growInterval = null;
    let plantImg = null;
    const frameInterval = 1000;

    function updatePlantFrame() {
        if (currentFrame < frames) {
            currentFrame++;
            plantImg.src = M.util.image_url(`plant_${currentFrame}`, 'block_pomodoro');
        } else {
            clearInterval(growInterval);
        }
    }

    // =====================
    // Utility helpers
    // =====================
    /**
     * Clears the active countdown interval, if any.
     */
    function clearTick() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    /**
     * Plays an alarm sound (simple beep using Audio API).
     * @param {string} [kind] Type of alarm sound to play ('click' or other).
     */
    function alarm(kind = '') {
        try {
            const soundUrl = kind === 'click'
                ? `${M.cfg.wwwroot}/blocks/pomodoro/sounds/press.mp3`
                : `${M.cfg.wwwroot}/blocks/pomodoro/sounds/alert.mp3`;
            const audio = new Audio(soundUrl);
            audio.play().catch(() => {
                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }
            });
        } catch {
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
        }
    }

    /**
     * Shorthand getElementById.
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    function $(id) {
        return document.getElementById(id);
    }

    /**
     * Now in ms.
     * @returns {number}
     */
    function now() {
        return Date.now();
    }

    /**
     * Parse an integer with default.
     * @param {string|number|undefined|null} v
     * @param {number} d Default value
     * @returns {number}
     */
    function readInt(v, d) {
        const n = parseInt(v ?? '', 10);
        return Number.isFinite(n) ? n : d;
    }

    /**
     * Format milliseconds as mm:ss.
     * @param {number} ms
     * @returns {string}
     */
    function formatTime(ms) {
        const s = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const r = (s % 60).toString().padStart(2, '0');
        return `${m}:${r}`;
    }

    // =====================
    // UI Functions
    // =====================
    /**
     * Returns the display element for the Pomodoro timer.
     * @returns {HTMLElement|null}
     */
    function getTimerElement() {
        return $('pomodoro-timer-display');
    }

    /**
     * Renders tomato icons for Pomodoro sessions.
     * @param {HTMLElement} el The container element.
     * @param {number} sessionscount Number of completed sessions.
     * @param {number} interval Number of sessions per long break.
     */
    function renderTomatoes(el, sessionscount, interval) {
        const tomato = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="25" height="25" \n' +
            '                style="vertical-align:middle; margin-right:6px;">\n' +
            '                <polygon style="fill:#AB2300;" points="512,155.826 478.609,155.826 ..."/>\n' +
            '               <polygon style="fill:#AB2300;" points="512,155.826 478.609,155.826 478.609,100.174 445.217,100.174 445.217,66.783 \n' +
            '                    411.826,66.783 411.826,33.391 300.522,33.391 300.522,66.783 267.13,66.783 267.13,0 233.739,0 233.739,66.783 211.478,66.783 \n' +
            '                    211.478,33.391 100.174,33.391 100.174,66.783 66.783,66.783 66.783,100.174 33.391,100.174 33.391,155.826 0,155.826 0,345.043 \n' +
            '                    33.391,345.043 33.391,411.826 66.783,411.826 66.783,445.217 100.174,445.217 100.174,478.609 166.957,478.609 166.957,512 \n' +
            '                    345.043,512 345.043,478.609 411.826,478.609 411.826,445.217 445.217,445.217 445.217,411.826 478.609,411.826 478.609,345.043 \n' +
            '                    512,345.043 "/>\n' +
            '                <polygon style="fill:#4E901E;" points="445.217,100.174 445.217,66.783 411.826,66.783 411.826,33.391 300.522,33.391 \n' +
            '                    300.522,66.783 289.391,66.783 267.13,66.783 267.13,0 233.739,0 233.739,66.783 222.609,66.783 211.478,66.783 211.478,33.391 \n' +
            '                    100.174,33.391 100.174,66.783 66.783,66.783 66.783,100.174 33.391,100.174 33.391,155.826 66.783,155.826 133.565,155.826 \n' +
            '                    133.565,222.609 222.609,222.609 222.609,189.217 289.391,189.217 289.391,222.609 378.435,222.609 378.435,155.826 \n' +
            '                    445.217,155.826 478.609,155.826 478.609,100.174 "/>\n' +
            '                <polygon points="233.739,100.174 233.739,122.435 267.13,122.435 267.13,100.174 300.522,100.174 300.522,66.783 267.13,66.783 \n' +
            '                    267.13,0 233.739,0 233.739,66.783 211.478,66.783 211.478,100.174 "/>\n' +
            '                <rect x="222.609" y="155.826" width="66.783" height="33.391"/>\n' +
            '                <polygon points="378.435,122.435 345.043,122.435 345.043,155.826 345.043,189.217 289.391,189.217 289.391,222.609 \n' +
            '                    345.043,222.609 378.435,222.609 378.435,189.217 378.435,155.826 445.217,155.826 478.609,155.826 478.609,122.435 \n' +
            '                    478.609,100.174 445.217,100.174 445.217,122.435 "/>\n' +
            '                <rect x="411.826" y="66.783" width="33.391" height="33.391"/>\n' +
            '                <rect x="300.522" y="33.391" width="111.304" height="33.391"/>\n' +
            '                <rect x="100.174" y="33.391" width="111.304" height="33.391"/>\n' +
            '                <rect x="66.783" y="66.783" width="33.391" height="33.391"/>\n' +
            '                <polygon points="133.565,155.826 133.565,189.217 133.565,222.609 166.957,222.609 222.609,222.609 222.609,189.217 \n' +
            '                    166.957,189.217 166.957,155.826 166.957,122.435 133.565,122.435 66.783,122.435 66.783,100.174 33.391,100.174 33.391,122.435 \n' +
            '                    33.391,155.826 66.783,155.826 "/>\n' +
            '                <rect x="33.391" y="345.043" width="33.391" height="66.783"/>\n' +
            '                <rect x="66.783" y="411.826" width="33.391" height="33.391"/>\n' +
            '                <rect x="100.174" y="445.217" width="66.783" height="33.391"/>\n' +
            '                <rect x="166.957" y="478.609" width="178.087" height="33.391"/>\n' +
            '                <rect x="345.043" y="445.217" width="66.783" height="33.391"/>\n' +
            '                <rect x="411.826" y="411.826" width="33.391" height="33.391"/>\n' +
            '                <rect x="445.217" y="345.043" width="33.391" height="66.783"/>\n' +
            '                <rect x="478.609" y="155.826" width="33.391" height="189.217"/>\n' +
            '                <rect y="155.826" width="33.391" height="189.217"/>\n' +
            '                <g>\n' +
            '                    <rect x="66.783" y="189.217" style="fill:#FFFFFF;" width="33.391" height="55.652"/>\n' +
            '                    <rect x="66.783" y="278.261" style="fill:#FFFFFF;" width="33.391" height="33.391"/>\n' +
            '                </g>\n' +
            '            </svg>';
        if (!el) {
            return;
        }
        const n = Math.max(0, Number(sessionscount) || 0);
        const m = Math.max(1, Number(interval) || 0);
        const filled = ((n % m) === 0 && n !== 0) ? m : (n % m);
        el.innerHTML = Array.from({length: m}, (_, i) =>
            i < filled ? tomato : '<span class="tomato" aria-hidden="true"></span>'
        ).join('');
    }

    /**
     * Opens the dialog element.
     * @param {HTMLDialogElement} d The dialog element to open.
     */
    function openDialog(d) {
        if (d && typeof d.showModal === 'function') {
            d.showModal();
        }
    }

    /**
     * Closes the dialog element.
     * @param {HTMLDialogElement} d The dialog element to open.
     */
    function closeDialog(d) {
        if (d && d.open) {
            d.close();
        }
    }

    // =====================
    // Pomodoro Logic
    // =====================
    /**
     * Extracts Pomodoro configuration from the timer display element. Fallback to defaults if attributes are missing or invalid.
     * @param {HTMLElement} timerDisplay The timer display element.
     * @returns {Config}
     */
    function getConfig(timerDisplay) {
        const courseid = readInt(timerDisplay.getAttribute('data-courseid'), 0);
        const wellnessSec = readInt(timerDisplay.getAttribute('data-wellness-sec'), 30);
        let focusMs;
        const focusSec = readInt(timerDisplay.getAttribute('data-focus-sec'), NaN);
        if (Number.isFinite(focusSec)) {
            focusMs = focusSec * 1000;
        } else {
            let focusMin = readInt(timerDisplay.getAttribute('data-focus-min'), NaN);
            if (!Number.isFinite(focusMin)) {
                const dur = timerDisplay.getAttribute('data-duration') || '25:00';
                const parts = dur.split(':');
                const mm = parts[0] || '25';
                focusMin = readInt(mm, 25);
            }
            focusMs = focusMin * 60 * 1000;
        }
        let shortbreakMs;
        let longbreakMs;
        const sbSec = readInt(timerDisplay.getAttribute('data-shortbreak-sec'), NaN);
        const lbSec = readInt(timerDisplay.getAttribute('data-longbreak-sec'), NaN);
        if (Number.isFinite(sbSec)) {
            shortbreakMs = sbSec * 1000;
        }
        if (Number.isFinite(lbSec)) {
            longbreakMs = lbSec * 1000;
        }
        if (!Number.isFinite(shortbreakMs)) {
            shortbreakMs = readInt(timerDisplay.getAttribute('data-shortbreak-min'), 5) * 60 * 1000;
        }
        if (!Number.isFinite(longbreakMs)) {
            longbreakMs = readInt(timerDisplay.getAttribute('data-longbreak-min'), 15) * 60 * 1000;
        }
        const longbreakInterval = readInt(timerDisplay.getAttribute('data-longbreak-interval'), 3);
        return {courseid, wellnessSec, focusMs, shortbreakMs, longbreakMs, longbreakInterval};
    }

    /**
     * Determines if the next break is a long break.
     * @param {number} c Number of completed sessions.
     * @param {number} i Interval for long breaks.
     */
    function nextIsLongBreak(c, i) {
        return i > 0 && c > 0 && (c % i) === 0;
    }

    /**
     * Starts the countdown timer.
     * @param {number} endTs Timestamp (ms) when the timer ends.
     * @param {HTMLElement} el Element to display the countdown.
     * @param {Function} onDone Callback when timer finishes.
     */
    function startTimer(endTs, el, onDone) {
        const playButton = document.getElementById('start');
        const pauseButton = document.getElementById('pause');
        if (!el || !Number.isFinite(endTs)) {
            return;
        }
        if (endTs <= now()) {
            localStorage.removeItem(K.END);
            localStorage.setItem(K.RUNNING, '0');
            return;
        }

        clearTick();
        const tick = () => {
            const left = endTs - now();
            if (left <= 0) {
                clearTick();
                el.textContent = '00:00';
                localStorage.removeItem(K.END);
                localStorage.setItem(K.RUNNING, '0');
                sendMessage({type: 'stop'});
                if (onDone) {
                    onDone();
                }
                return;
            }
            el.textContent = formatTime(left);
        };
        tick();
        intervalId = setInterval(tick, 1000);

        playButton.classList.add('hidden');
        pauseButton.classList.remove('hidden');
    }

    /**
     * Stop the timer and reset the display.
     * @param {HTMLElement} el The element to update with reset time.
     * @param {boolean} play Whether to play the alarm sound.
     */
    function stopAndReset(el, play = false) {
        let playButton = document.getElementById('start');
        let pauseButton = document.getElementById('pause');
        clearTick();
        localStorage.removeItem(K.END);
        localStorage.setItem(K.RUNNING, '0');
        sendMessage({type: 'stop'});
        if (el) {
            el.textContent = formatTime(cfg.focusMs);
        }
        if (play) {
            alarm();
        }
    }

    /**
     * Starts or pauses the Pomodoro timer.
     * @param {Function} onAfter Callback to execute after starting wellness or focus.
     */
    function startPausePomodoro(onAfter) {
        if (!cfg) {
            return;
        }
        const display = getTimerElement();
        if (!display) {
            return;
        }

        const remainRaw = localStorage.getItem(K.REMAINING);
        const running = localStorage.getItem(K.RUNNING) === '1';
        const endRaw = localStorage.getItem(K.END);

        // Resume
        if (remainRaw !== null) {
            const remain = Number(remainRaw);
            if (Number.isFinite(remain) && remain > 0) {
                localStorage.removeItem(K.REMAINING);
                startFocus(display, remain);
            }
            return;
        }

        // Start
        if (!running) {
            // Not running, start wellness then focus
            startWellness(onAfter);
            return;
        }

        // Pause
        if (endRaw !== null) {
            const end = Number(endRaw);
            const left = end - now();
            if (left > 0) {
                localStorage.setItem(K.REMAINING, String(left));
                sendMessage({type: 'pause', remaining: left});
                if (display) {
                    display.textContent = formatTime(left);
                }
                const playButton = document.getElementById('start');
                const pauseButton = document.getElementById('pause');
                pauseButton.classList.add('hidden');
                playButton.classList.remove('hidden');
            }
        }
        clearTick();
        localStorage.setItem(K.RUNNING, '0');
    }

    /**
     * Start the wellness countdown and call the callback after completion.
     * @param {Function} onAfter Callback to execute after wellness period ends.
     */
    function startWellness(onAfter) {
        setPhase('wellness');
        const modal = $('wellness-modal');
        const countdown = $('wellness-countdown');
        if (!cfg) {
            return;
        }
        if (!modal || !countdown) {
            onAfter();
            return;
        }
        const end = now() + cfg.wellnessSec * 1000;
        openDialog(modal);
        startTimer(end, countdown, () => {
            closeDialog(modal);
            onAfter();
        });
        const skip = $('skip-wellness');
        if (skip) {
            skip.type = 'button';
            skip.onclick = (e) => {
                alarm('click');
                e.preventDefault();
                e.stopPropagation();
                closeDialog(modal);
                onAfter();
            };
        }
    }

    /**
     * Start a break timer and handle break modal UI.
     * @param {HTMLElement} el The element to update with the break time.
     * @param {number} ms Duration of the break in milliseconds.
     * @param {string} kind Type of break ('short' or 'long').
     */
    function startBreak(el, ms, kind) {
        setPhase('break', kind);
        const dlg = $('break-modal');
        const cd = $('break-countdown');
        if (cd) {
            cd.textContent = formatTime(ms);
        }
        openDialog(dlg);
        const end = now() + ms;
        startTimer(end, cd || el, () => {
            alarm();
            closeDialog(dlg);
            stopAndReset(el, false);
        });
        const ok = $('dismiss-break');
        if (ok) {
            ok.type = 'button';
            ok.onclick = (e) => {
                alarm('click');
                e.preventDefault();
                e.stopPropagation();
                closeDialog(dlg);
            };
        }
    }

    /**
     * Starts the focus timer.
     * @param {HTMLElement} el The element to display the countdown.
     * @param {number} ms Duration of the focus period in milliseconds.
     */
    function startFocus(el, ms) {
        if (!cfg) {
            return;
        }
        const focusDur = Number.isFinite(ms) && ms > 0 ? ms : 25 * 60 * 1000;
        setPhase('focus');
        const starttsSec = Math.floor(now() / 1000);
        const end = now() + focusDur;
        localStorage.setItem(K.END, String(end));
        localStorage.setItem(K.RUNNING, '1');
        sendMessage({type: 'start', end});
        if(!cfg) return;
        plantImg = document.getElementById('plant-img');
        if(!plantImg) return;

        clearInterval(growInterval);
        currentFrame = 1;
        plantImg.src = M.util.image_url('plant_1', 'block_pomodoro');

        growInterval = setInterval(() => {
            updatePlantFrame();
            if(currentFrame === frames) {
                clearInterval(growInterval);
            }
        } , frameInterval);
        startTimer(end, el, () => {
            ajax('block_pomodoro_increment_session', {courseid: cfg.courseid, startts: starttsSec})
                .then((res) => {
                    alarm();
                    const count = res && typeof res.sessionscount === 'number' ? res.sessionscount : 1;
                    renderTomatoes($('pomodoro-tomatoes'), count, cfg.longbreakInterval);
                    const isLong = nextIsLongBreak(count, cfg.longbreakInterval);
                    startBreak(el, isLong ? cfg.longbreakMs : cfg.shortbreakMs, isLong ? 'long' : 'short');
                    const playButton = document.getElementById('start');
                    const pauseButton = document.getElementById('pause');
                    pauseButton.classList.add('hidden');
                    playButton.classList.remove('hidden');
                    return null;
                })
                .catch(Notification.exception);
        });
    }

    // =====================
    // State Storage & Inter-tab Communication
    // =====================
    /**
     * Returns scoped localStorage key names for a given course.
     * @param {number} courseid The course ID to scope keys.
     */
    function scoped(courseid) {
        /** @returns {ScopedKeys} */
        const cid = Number.isFinite(courseid) && courseid > 0 ? courseid : 'global';
        const p = `pomodoro:${cid}`;
        return {
            END: `${p}:endTimestamp`,
            RUNNING: `${p}:running`,
            PHASE: `${p}:phase`,
            BREAKKIND: `${p}:breakKind`,
            MSG: `${p}:msg`,
            CHANNEL: `${p}:channel`
        };
    }

    /**
     * Sets the current phase and optional break kind in localStorage.
     * @param {string} p Phase name.
     * @param {string} [k] Optional break kind.
     */
    function setPhase(p, k) {
        localStorage.setItem(K.PHASE, p);
        if (k) {
            localStorage.setItem(K.BREAKKIND, k);
        } else {
            localStorage.removeItem(K.BREAKKIND);
        }
    }

    /**
     * Gets the current phase from localStorage.
     * @returns {string} The current phase name.
     */
    function getPhase() {
        return localStorage.getItem(K.PHASE) || '';
    }

    /**
     * Send a message to other tabs or via BroadcastChannel.
     * @param {Object} msg The message object to send.
     */
    function sendMessage(msg) {
        if (channel) {
            channel.postMessage(msg);
        } else {
            localStorage.setItem(K.MSG, JSON.stringify(Object.assign({}, msg, {t: now()})));
            setTimeout(function() {
                localStorage.removeItem(K.MSG);
            }, 50);
        }
    }

    /**
     * Handle incoming messages for timer synchronization.
     * @param {Object} msg The message object.
     * @param {HTMLElement} el The display element to update.
     */
    function handleMessage(msg, el) {
        if (!msg) {
            return;
        }
        if (msg.type === 'start' && msg.end) {
            startTimer(Number(msg.end), el);
            localStorage.setItem(K.END, String(msg.end));
            localStorage.setItem(K.RUNNING, '1');
            return;
        }
        if (msg.type === 'pause' && typeof msg.remaining !== 'undefined') {
            clearTick();
            localStorage.setItem(K.REMAINING, String(msg.remaining));
            localStorage.setItem(K.RUNNING, '0');
            if (el) {
                el.textContent = formatTime(msg.remaining);
            }
            return;
        }
        if ((msg.type === 'stop') && localStorage.getItem(K.END)) {
            stopAndReset(el, false);
        }
    }

    /**
     * Make an AJAX call using Moodle's core Ajax API.
     * @param {string} name The web service method name.
     * @param {Object} args Arguments for the web service call.
     * @returns {Promise<any>} Promise resolving to the response.
     */
    function ajax(name, args) {
        return Ajax.call([{methodname: name, args}])[0].catch(Notification.exception);
    }

    return {
        init() {
            plantImg = document.getElementById('plant-img');
            const display = getTimerElement();
            if (!display) {
                return;
            }
            cfg = getConfig(display);
            K = scoped(cfg.courseid);

            // UI: show interval number
            const intervalEl = $('pomodoro-interval');
            if (intervalEl) {
                intervalEl.textContent = String(cfg.longbreakInterval);
            }

            // Broadcast channel
            if (typeof BroadcastChannel !== 'undefined') {
                channel = new BroadcastChannel(K.CHANNEL);
                channel.onmessage = (e) => handleMessage(e.data, display);
            }

            // Initial tomatoes from server
            ajax('block_pomodoro_get_status', {courseid: cfg.courseid})
                .then((res) => {
                    const count = res && typeof res.sessionscount === 'number' ? res.sessionscount : 0;
                    renderTomatoes($('pomodoro-tomatoes'), count, cfg.longbreakInterval);
                    return null;
                })
                .catch(Notification.exception);

            // Resume (only if future)
            const existingRaw = localStorage.getItem(K.END);
            if (existingRaw !== null) {
                const existing = Number(existingRaw);
                const phase = getPhase();
                let target;
                if (phase === 'wellness') {
                    target = $('wellness-countdown');
                } else if (phase === 'break') {
                    target = $('break-countdown');
                } else {
                    target = display;
                }
                if (Number.isFinite(existing) && existing > now() + 250) {
                    if (phase === 'break') {
                        openDialog($('break-modal'));
                    }
                    if (phase === 'wellness') {
                        openDialog($('wellness-modal'));
                    }
                    startTimer(existing, target || display);
                } else {
                    localStorage.removeItem(K.END);
                    localStorage.setItem(K.RUNNING, '0');
                }
            }

            // Storage sync for this course key
            window.addEventListener('storage', (e) => {
                if (e.key === K.END) {
                    if (e.newValue !== null) {
                        const val = Number(e.newValue);
                        if (Number.isFinite(val) && val > now() + 250) {
                            startTimer(val, display);
                        } else {
                            localStorage.removeItem(K.END);
                            localStorage.setItem(K.RUNNING, '0');
                        }
                    } else {
                        localStorage.setItem(K.RUNNING, '0');
                    }
                    return;
                }
                if (e.key === K.MSG && e.newValue) {
                    try {
                        handleMessage(JSON.parse(e.newValue), display);
                    } catch (err) {
                        // Ignore malformed or transient values during storage sync
                        if (window && window.console && typeof window.console.debug === 'function') {
                            window.console.debug('Pomodoro: storage MSG parse ignored', err);
                        }
                    }
                }
            });

            const startBtn = $('start');
            if (startBtn) {
                startBtn.type = 'button';
                startBtn.onclick = (e) => {
                    alarm('click');
                    e.preventDefault();
                    e.stopPropagation();
                    startPausePomodoro(() => startFocus(display, cfg.focusMs));
                };
            }
            const pauseBtn = $('pause');
            if (pauseBtn) {
                pauseBtn.type = 'button';
                pauseBtn.onclick = (e) => {
                    alarm('click');
                    e.preventDefault();
                    e.stopPropagation();
                    startPausePomodoro(null);
                };
            }
            const resetBtn = $('reset');
            if (resetBtn) {
                resetBtn.type = 'button';
                resetBtn.onclick = (e) => {
                    alarm('click');
                    e.preventDefault();
                    e.stopPropagation();
                    stopAndReset(display, false);
                };
            }

            window.addEventListener('beforeunload', () => {
                if (channel) {
                    channel.close();
                }
            });
        }
    };
});
