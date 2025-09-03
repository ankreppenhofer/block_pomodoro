<?php
// This file is part of Moodle - http://moodle.org/.

defined('MOODLE_INTERNAL') || die();

/**
 * Block definition class for the block_pomodoro plugin.
 *
 * @package   block_pomodoro
 */
class block_pomodoro extends block_base {

    public function init() {
        $this->title = get_string('pluginname', 'block_pomodoro');
    }

    public function get_content() {
        global $OUTPUT, $COURSE;

        if ($this->content !== null) {
            return $this->content;
        }

        $this->content = new stdClass();
        $this->content->footer = '';

        $courseid = isset($COURSE->id) ? (int)$COURSE->id : 0;

        // Defaults, could be moved to admin settings later.
        $data = [
            'courseid' => $courseid,
            'focusmin' => 25,
            'shortbreakmin' => 5,
            'longbreakmin' => 15,
            'longbreakinterval' => 3,
        ];

        $this->content->text = $OUTPUT->render_from_template('block_pomodoro/pomodoro_timer', $data);
        return $this->content;
    }

    public function applicable_formats() {
        return [
            'admin' => false,
            'site-index' => true,
            'course-view' => true,
            'mod' => false,
            'my' => true,
        ];
    }
}
