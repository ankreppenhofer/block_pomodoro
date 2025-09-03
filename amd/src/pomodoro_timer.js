/**
 * Pomodoro Timer (AMD) — scoped by course, increments only when focus ends.
 * WS: block_pomodoro_increment_session(courseid:int, startts:int [UNIX seconds])
 *     block_pomodoro_get_status(courseid:int)
 */
define(['core/ajax', 'core/notification'], function(Ajax, Notification) {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const now = () => Date.now();
    const readInt = (v, d) => {
        const n = parseInt(v ?? '', 10);
        return Number.isFinite(n) ? n : d;
    };
    const fmt = (ms) => {
        const s = Math.max(0, Math.floor(ms / 1000));
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const r = (s % 60).toString().padStart(2, '0');
        return `${m}:${r}`;
    };

    const scoped = (courseid) => {
        const cid = Number.isFinite(courseid) && courseid > 0 ? courseid : 'global';
        const p = `pomodoro:${cid}`;
        return {
            END: `${p}:endTimestamp`, RUNNING: `${p}:running`, PHASE: `${p}:phase`,
            BREAKKIND: `${p}:breakKind`, MSG: `${p}:msg`, CHANNEL: `${p}:channel`,
        };
    };

    const renderTomatoes = (el, sessionscount, interval) => {
        if (!el) {
            return;
        }
        const n = Math.max(0, Number(sessionscount) || 0);
        const m = Math.max(1, Number(interval) || 0);
        const filled = ((n % m) === 0 && n !== 0) ? m : (n % m); // Show full row on the long-break step
        el.innerHTML = Array.from({length: m}, (_, i) =>
            `<span class="tomato ${i < filled ? 'filled' : ''}" aria-hidden="true"></span>`
        ).join('');
    };

    return {
        init() {
            const display = $('pomodoro-timer-display');
            if (!display) {
                return;
            }

            const courseid = readInt(display.getAttribute('data-courseid'), 0);
            const K = scoped(courseid);

            const wellnessSec = readInt(display.getAttribute('data-wellness-sec'), 30);
            let focusMs;
            const focusSec = readInt(display.getAttribute('data-focus-sec'), NaN);
            if (Number.isFinite(focusSec)) {
                focusMs = focusSec * 1000;
            } else {
                let focusMin = readInt(display.getAttribute('data-focus-min'), NaN);
                if (!Number.isFinite(focusMin)) {
                    const dur = display.getAttribute('data-duration') || '25:00';
                    const [mm = '25'] = dur.split(':');
                    focusMin = readInt(mm, 25);
                }
                focusMs = focusMin * 60 * 1000;
            }
            let shortbreakMs,
                longbreakMs;
            const sbSec = readInt(display.getAttribute('data-shortbreak-sec'), NaN);
            const lbSec = readInt(display.getAttribute('data-longbreak-sec'), NaN);
            if (Number.isFinite(sbSec)) {
                shortbreakMs = sbSec * 1000;
            }
            if (Number.isFinite(lbSec)) {
                longbreakMs = lbSec * 1000;
            }
            if (!Number.isFinite(shortbreakMs)) {
                shortbreakMs = readInt(display.getAttribute('data-shortbreak-min'), 5) * 60 * 1000;
            }
            if (!Number.isFinite(longbreakMs)) {
                longbreakMs = readInt(display.getAttribute('data-longbreak-min'), 15) * 60 * 1000;
            }

            const longbreakInterval = readInt(display.getAttribute('data-longbreak-interval'), 3);
            const cfg = {courseid, wellnessSec, focusMs, shortbreakMs, longbreakMs, longbreakInterval};

            // UI: show interval number
            const intervalEl = $('pomodoro-interval');
            if (intervalEl) {
                intervalEl.textContent = String(longbreakInterval);
            }

            let intervalId = null;
            let channel = null;

            const sendMessage = (msg) => {
                if (channel) {
                    channel.postMessage(msg);
                } else {
                    localStorage.setItem(K.MSG, JSON.stringify({...msg, t: now()}));
                    setTimeout(() => localStorage.removeItem(K.MSG), 50);
                }
            };
            const clearTick = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            };
            const alarm = () => {
                try {
                    const a = new Audio('https://www.freespecialeffects.co.uk/soundfx/scifi/electronic.wav');
                    a.play().catch(() => {});
                } catch (err) {}
            };
            const setPhase = (p, k) => {
                localStorage.setItem(K.PHASE, p);
                if (k) {
                    localStorage.setItem(K.BREAKKIND, k);
                } else {
                    localStorage.removeItem(K.BREAKKIND);
                }
            };
            const getPhase = () => localStorage.getItem(K.PHASE) || '';
            const ajax = (name, args) => Ajax.call([{methodname: name, args}])[0].catch(Notification.exception);
            const nextIsLongBreak = (c, i) => i > 0 && c > 0 && (c % i) === 0;

            const startLocalTimer = (endTs, el, onDone) => {
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
                        sendMessage({type: 'stopped'});
                        if (onDone) {
                            onDone();
                        }
                        return;
                    }
                    el.textContent = fmt(left);
                };
                tick();
                intervalId = setInterval(tick, 1000);
            };
            const stopAndReset = (el, play = false) => {
                clearTick();
                localStorage.removeItem(K.END);
                localStorage.setItem(K.RUNNING, '0');
                sendMessage({type: 'stopped'});
                if (el) {
                    el.textContent = '00:00';
                }
                if (play) {
                    alarm();
                }
            };
            const handleMessage = (msg, el) => {
                if (!msg) {
                    return;
                }
                if (msg.type === 'start' && msg.end) {
                    startLocalTimer(Number(msg.end), el);
                    localStorage.setItem(K.END, String(msg.end));
                    localStorage.setItem(K.RUNNING, '1');
                    return;
                }
                if (msg.type === 'stop' || msg.type === 'stopped') {
                    if (localStorage.getItem(K.END)) {
                        stopAndReset(el, false);
                    }
                }
            };

            const openDlg = (d) => {
                if (d && typeof d.showModal === 'function') {
                    d.showModal();
                }
            };
            const closeDlg = (d) => {
                if (d && d.open) {
                    d.close();
                }
            };

            const startWellness = (onAfter) => {
                setPhase('wellness');
                const dlg = $('wellness-modal');
                const cd = $('wellness-countdown');
                if (!dlg || !cd) {
                    onAfter();
                    return;
                }
                const end = now() + cfg.wellnessSec * 1000;
                openDlg(dlg);
                startLocalTimer(end, cd, () => {
                    closeDlg(dlg);
                    onAfter();
                });
                const skip = $('skip-wellness');
                if (skip) {
                    skip.type = 'button';
                    skip.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeDlg(dlg);
                        onAfter();
                    };
                }
            };

            const startBreak = (el, ms, kind) => {
                setPhase('break', kind);
                const dlg = $('break-modal');
                const cd = $('break-countdown');
                if (cd) {
                    cd.textContent = fmt(ms);
                }
                openDlg(dlg);
                const end = now() + ms;
                startLocalTimer(end, cd || el, () => {
                    alarm();
                    closeDlg(dlg);
                    stopAndReset(el, false);
                });
                const ok = $('dismiss-break');
                if (ok) {
                    ok.type = 'button';
                    ok.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeDlg(dlg);
                    };
                }
            };

            const startFocus = (el, ms) => {
                const focusDur = Number.isFinite(ms) && ms > 0 ? ms : 25 * 60 * 1000;
                setPhase('focus');
                const starttsSec = Math.floor(now() / 1000);
                const end = now() + focusDur;
                localStorage.setItem(K.END, String(end));
                localStorage.setItem(K.RUNNING, '1');
                sendMessage({type: 'start', end});
                startLocalTimer(end, el, () => {
                    ajax('block_pomodoro_increment_session', {courseid: cfg.courseid, startts: starttsSec})
                        .then((res) => {
                            alarm();
                            const count = res && typeof res.sessionscount === 'number' ? res.sessionscount : 1;
                            renderTomatoes($('pomodoro-tomatoes'), count, cfg.longbreakInterval);
                            const isLong = nextIsLongBreak(count, cfg.longbreakInterval);
                            startBreak(el, isLong ? cfg.longbreakMs : cfg.shortbreakMs, isLong ? 'long' : 'short');
                            return null;
                        })
                        .catch(Notification.exception);
                });
            };

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
                        openDlg($('break-modal'));
                    }
                    if (phase === 'wellness') {
                        openDlg($('wellness-modal'));
                    }
                    startLocalTimer(existing, target || display);
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
                            startLocalTimer(val, display);
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
                    } catch (err) {}
                }
            });

            const startBtn = $('start');
            if (startBtn) {
                startBtn.type = 'button';
                startBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startWellness(() => startFocus(display, cfg.focusMs));
                };
            }
            const stopBtn = $('stop');
            if (stopBtn) {
                stopBtn.type = 'button';
                stopBtn.onclick = (e) => {
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
