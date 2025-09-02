/**
 * Pomodoro Timer.
 *
 * @module     block_pomodoro/pomodoro_timer
 * @copyright  2025 Alissa Cenga <alissa.cenga@tuwien.ac.at>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
export const init = () => {
    let pomodoro = document.getElementById("pomodoro-timer");
    let currentTimer = pomodoro;



    function hideAll() {
        let timers = document.querySelectorAll(".timer-display");
        timers.forEach((timer) => (timer.style.display = "none"));
    }

    let myInterval = null;

    function startTimer(timerdisplay) {
        console.log('entered here');
        if (myInterval) {
            clearInterval(myInterval);
        }

        const timerDuration = timerdisplay
            .getAttribute("data-duration")
            .split(":")[0];
        console.log(timerDuration);

        let durationinmiliseconds = timerDuration * 60 * 1000;
        let endTimestamp = Date.now() + durationinmiliseconds;

        myInterval = setInterval(function () {
            const timeRemaining = new Date(endTimestamp - Date.now());

            if (timeRemaining <= 0) {
                clearInterval(myInterval);
                timerdisplay.textContent = "00:00";
                const alarm = new Audio(
                    "https://www.freespecialeffects.co.uk/soundfx/scifi/electronic.wav"
                );
                alarm.play();
            } else {
                const minutes = Math.floor(timeRemaining / 60000);
                const seconds = ((timeRemaining % 60000) / 1000).toFixed(0);
                const formattedTime = `${minutes}:${seconds
                    .toString()
                    .padStart(2, "0")}`;
                console.log(formattedTime);
                timerdisplay.textContent = formattedTime;
            }
        }, 1000);
    }

    document.getElementById("start").addEventListener("click", function () {
        startTimer(currentTimer);
    });

    document.getElementById("stop").addEventListener("click", function () {
        if (currentTimer) {
            clearInterval(myInterval);
        }
    });
}