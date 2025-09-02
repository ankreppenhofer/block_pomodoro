/**
 * Pomodoro Timer.
 *
 * @module     block_pomodoro/pomodoro_timer
 * @copyright  2025 Alissa Cenga <alissa.cenga@tuwien.ac.at>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
// javascript
export const init = () => {
    const STORAGE_KEY = "pomodoro:endTimestamp";
    const RUNNING_KEY = "pomodoro:running";

    const pomodoroTimerDisplay = document.getElementById("pomodoro-timer-display");
    let myInterval = null;
    let broadcast = null;

    // Check for BroadcastChannel support and setup pomodoro channel if available
    if (typeof BroadcastChannel !== "undefined") {
        broadcast = new BroadcastChannel("pomodoro");
        broadcast.onmessage = (ev) => handleMessage(ev.data);
    }

    /**
     * Send a message to other tabs/windows.
     * @param {Object} msg - Message payload to send to other tabs.
     */
    function sendMessage(msg) {
        if (broadcast) {
            broadcast.postMessage(msg);
        } else {
            // Fallback: write a transient storage key to trigger others
            localStorage.setItem("pomodoro:msg", JSON.stringify({...msg, t: Date.now()}));
            // Remove immediately to avoid buildup
            setTimeout(() => localStorage.removeItem("pomodoro:msg"), 50);
        }
    }

    /**
     * Format milliseconds to MM:SS.
     * @param {number} ms - Milliseconds to format.
     * @returns {string} Formatted time as MM:SS.
     */
    function formatMs(ms) {
        const totalSeconds = Math.max(0, Math.floor(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
        const seconds = (totalSeconds % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
    }

    /**
     * Stops the timer, clears interval, updates display, and shared state.
     * Optionally plays alarm.
     * @param {Element} timerDisplayElement
     * @param {boolean} playAlarm
     */
    function stopAndResetTimerDisplay(timerDisplayElement, playAlarm = false) {
        if (myInterval) {
            clearInterval(myInterval);
            myInterval = null;
        }
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(RUNNING_KEY, "0");
        sendMessage({type: "stopped"});
        if (timerDisplayElement) {
            timerDisplayElement.textContent = "00:00";
        }
        if (playAlarm) {
            try {
                const alarm = new Audio(
                    "https://www.freespecialeffects.co.uk/soundfx/scifi/electronic.wav"
                );
                alarm.play().catch(() => {});
            } catch (e) {}
        }
    }

    /**
     * Starts a local countdown timer and updates the display element.
     * Clears any previous timer, sets up a new interval, and handles timer completion.
     *
     * @param {number} endTimestamp - The timestamp (in ms) when the timer should end.
     * @param {HTMLElement} timerDisplayElement - The DOM element to display the timer countdown.
     */
    function startLocalTimer(endTimestamp, timerDisplayElement) {
        if (!timerDisplayElement) {
            return;
        }
        if (myInterval) {
            clearInterval(myInterval); // Change to return; if you want to ignore new starts while running
        }

        /**
         * Updates the timer display every tick and handles timer completion.
         */
        function tick() {
            const msRemaining = endTimestamp - Date.now();
            // Run when finished
            if (msRemaining <= 0) {
                stopAndResetTimerDisplay(timerDisplayElement, true);
                return;
            }
            timerDisplayElement.textContent = formatMs(msRemaining);
        }

        // Immediate update then start interval
        tick();
        myInterval = setInterval(tick, 1000);
    }

    /**
     * Handle incoming messages from other tabs.
     * @param {{type: string, end?: number}} msg - Message object with `type` and optional `end` timestamp.
     */
    function handleMessage(msg) {
        if (!msg) {
            return;
        }
        if (msg.type === "start" && msg.end) {
            startLocalTimer(Number(msg.end), pomodoroTimerDisplay);
            localStorage.setItem(STORAGE_KEY, String(msg.end));
            localStorage.setItem(RUNNING_KEY, "1");
        } else if (msg.type === "stop" || msg.type === "stopped") {
            if (myInterval) {
                clearInterval(myInterval);
                myInterval = null;
            }
            if (pomodoroTimerDisplay) {
                pomodoroTimerDisplay.textContent = "00:00";
            }
            localStorage.removeItem(STORAGE_KEY);
            localStorage.setItem(RUNNING_KEY, "0");
        }
    }

    /**
     * Start a timer attached to the given display element.
     * @param {HTMLElement} timerdisplay - DOM element that displays the countdown.
     */
    function startTimer(timerdisplay) {
        if (!timerdisplay) {
            return;
        }
        // Clear local interval if any
        if (myInterval) {
            clearInterval(myInterval);
        }

        const durationAttr = timerdisplay.getAttribute("data-duration") || "25:00";
        const minutes = parseInt(durationAttr.split(":")[0], 10) || 25;
        const durationMs = minutes * 60 * 1000;
        const endTimestamp = Date.now() + durationMs;

        // Persist and notify other tabs
        localStorage.setItem(STORAGE_KEY, String(endTimestamp));
        localStorage.setItem(RUNNING_KEY, "1");
        sendMessage({type: "start", end: endTimestamp});

        // Start locally
        startLocalTimer(endTimestamp, timerdisplay);
    }

    /**
     * Stops the local timer, clears the interval, updates the display,
     */
    function stopTimer() {
        stopAndResetTimerDisplay(pomodoroTimerDisplay, false);
    }

    // Respond to storage events (other tabs)
    window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY) {
            if (e.newValue) {
                startLocalTimer(Number(e.newValue), pomodoroTimerDisplay);
            } else {
                // Timer removed/stopped
                if (myInterval) {
                    clearInterval(myInterval);
                    myInterval = null;
                }
                if (pomodoroTimerDisplay) {
                    pomodoroTimerDisplay.textContent = "00:00";
                }
            }
        } else if (e.key === RUNNING_KEY) {
            // Nothing else needed here; STORAGE_KEY handles actual timestamp
        } else if (e.key === "pomodoro:msg" && e.newValue) {
            try {
                const msg = JSON.parse(e.newValue);
                handleMessage(msg);
            } catch (err) {
            }
        }
    });

    // Also listen to broadcast channel messages (already wired above via broadcast.onmessage)
    // initial resume if another tab already started a timer
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
        startLocalTimer(Number(existing), pomodoroTimerDisplay);
    }

    document.getElementById("start").addEventListener("click", function() {
        startTimer(pomodoroTimerDisplay);
    });

    document.getElementById("stop").addEventListener("click", function() {
        stopTimer();
    });

    // Clean up on unload
    window.addEventListener("beforeunload", () => {
        if (broadcast) {
            broadcast.close();
        }
    });
};
