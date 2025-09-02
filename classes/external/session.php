<?php

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

class session extends external_api
{

    public static function increment_session_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, "The Course Context ID", VALUE_REQUIRED),
        ]);
    }
    public static function increment_session($courseid) {
        global $USER, $DB;

        $params = self::validate_parameters(self::increment_session_parameters(), [
            'courseid' => $courseid,
        ]);

        $record = $DB->get_record('pomodoro_sessions', [
            'course' => $params['courseid'],
            'user'   => $USER->id,
        ]);

        if ($record) {
            $record->sessioncount++;
            $DB->update_record('pomodoro_sessions', $record);
            $id = $record->id;
        } else {
            $record = new stdClass();
            $record->course = $params['courseid'];
            $record->user = $USER->id;
            $record->sessioncount = 1;
            $id = $DB->insert_record('pomodoro_sessions', $record);
        }

        return [
            'id' => $id,
            'sessioncount' => $record->sessioncount,
        ];
    }


}