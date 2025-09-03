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
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="20" height="20" 
                style="vertical-align:middle; margin-right:6px;">
                <polygon style="fill:#AB2300;" points="512,155.826 478.609,155.826 ..."/>
               <polygon style="fill:#AB2300;" points="512,155.826 478.609,155.826 478.609,100.174 445.217,100.174 445.217,66.783 
                    411.826,66.783 411.826,33.391 300.522,33.391 300.522,66.783 267.13,66.783 267.13,0 233.739,0 233.739,66.783 211.478,66.783 
                    211.478,33.391 100.174,33.391 100.174,66.783 66.783,66.783 66.783,100.174 33.391,100.174 33.391,155.826 0,155.826 0,345.043 
                    33.391,345.043 33.391,411.826 66.783,411.826 66.783,445.217 100.174,445.217 100.174,478.609 166.957,478.609 166.957,512 
                    345.043,512 345.043,478.609 411.826,478.609 411.826,445.217 445.217,445.217 445.217,411.826 478.609,411.826 478.609,345.043 
                    512,345.043 "/>
                <polygon style="fill:#4E901E;" points="445.217,100.174 445.217,66.783 411.826,66.783 411.826,33.391 300.522,33.391 
                    300.522,66.783 289.391,66.783 267.13,66.783 267.13,0 233.739,0 233.739,66.783 222.609,66.783 211.478,66.783 211.478,33.391 
                    100.174,33.391 100.174,66.783 66.783,66.783 66.783,100.174 33.391,100.174 33.391,155.826 66.783,155.826 133.565,155.826 
                    133.565,222.609 222.609,222.609 222.609,189.217 289.391,189.217 289.391,222.609 378.435,222.609 378.435,155.826 
                    445.217,155.826 478.609,155.826 478.609,100.174 "/>
                <polygon points="233.739,100.174 233.739,122.435 267.13,122.435 267.13,100.174 300.522,100.174 300.522,66.783 267.13,66.783 
                    267.13,0 233.739,0 233.739,66.783 211.478,66.783 211.478,100.174 "/>
                <rect x="222.609" y="155.826" width="66.783" height="33.391"/>
                <polygon points="378.435,122.435 345.043,122.435 345.043,155.826 345.043,189.217 289.391,189.217 289.391,222.609 
                    345.043,222.609 378.435,222.609 378.435,189.217 378.435,155.826 445.217,155.826 478.609,155.826 478.609,122.435 
                    478.609,100.174 445.217,100.174 445.217,122.435 "/>
                <rect x="411.826" y="66.783" width="33.391" height="33.391"/>
                <rect x="300.522" y="33.391" width="111.304" height="33.391"/>
                <rect x="100.174" y="33.391" width="111.304" height="33.391"/>
                <rect x="66.783" y="66.783" width="33.391" height="33.391"/>
                <polygon points="133.565,155.826 133.565,189.217 133.565,222.609 166.957,222.609 222.609,222.609 222.609,189.217 
                    166.957,189.217 166.957,155.826 166.957,122.435 133.565,122.435 66.783,122.435 66.783,100.174 33.391,100.174 33.391,122.435 
                    33.391,155.826 66.783,155.826 "/>
                <rect x="33.391" y="345.043" width="33.391" height="66.783"/>
                <rect x="66.783" y="411.826" width="33.391" height="33.391"/>
                <rect x="100.174" y="445.217" width="66.783" height="33.391"/>
                <rect x="166.957" y="478.609" width="178.087" height="33.391"/>
                <rect x="345.043" y="445.217" width="66.783" height="33.391"/>
                <rect x="411.826" y="411.826" width="33.391" height="33.391"/>
                <rect x="445.217" y="345.043" width="33.391" height="66.783"/>
                <rect x="478.609" y="155.826" width="33.391" height="189.217"/>
                <rect y="155.826" width="33.391" height="189.217"/>
                <g>
                    <rect x="66.783" y="189.217" style="fill:#FFFFFF;" width="33.391" height="55.652"/>
                    <rect x="66.783" y="278.261" style="fill:#FFFFFF;" width="33.391" height="33.391"/>
                </g>
            </svg>';

        $this->title = $svg . get_string('pluginname', 'block_pomodoro');
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
            'plantimg' => $OUTPUT->image_url('plant_1', 'block_pomodoro')->out(),
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
