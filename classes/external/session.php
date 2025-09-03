<?php
namespace block_pomodoro\external;

defined('MOODLE_INTERNAL') || die();

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use context_course;
use stdClass;

class session extends external_api {
    public const TIMEOUT = 5 * 60 * 60; // seconds

    public static function increment_session_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID', VALUE_REQUIRED),
            'startts'  => new external_value(PARAM_INT, 'Focus start time (UNIX seconds)', VALUE_REQUIRED),
        ]);
    }

    public static function increment_session(int $courseid, int $startts): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::increment_session_parameters(), [
            'courseid' => $courseid, 'startts' => $startts,
        ]);

        $context = context_course::instance($params['courseid'], MUST_EXIST);
        self::validate_context($context);
        require_login($params['courseid']);

        $record = $DB->get_record('pomodoro_sessions', ['course'=>$params['courseid'], 'user'=>$USER->id]);

        if ($record) {
            $last = (int)($record->last_start_time ?? 0);
            if ($last > 0 && ($params['startts'] - $last) <= self::TIMEOUT) {
                $record->sessionscount = (int)$record->sessionscount + 1;
            } else {
                $record->sessionscount = 1;
            }
            $record->last_start_time = $params['startts'];
            $DB->update_record('pomodoro_sessions', $record);
        } else {
            $record = new stdClass();
            $record->course = $params['courseid'];
            $record->user = $USER->id;
            $record->last_start_time = $params['startts'];
            $record->sessionscount = 1;
            $record->id = $DB->insert_record('pomodoro_sessions', $record);
        }

        return [
            'sessionscount'   => (int)$record->sessionscount,
            'last_start_time' => (int)$record->last_start_time,
        ];
    }

    public static function increment_session_returns(): external_single_structure {
        return new external_single_structure([
            'sessionscount'   => new external_value(PARAM_INT, 'Completed sessions in current 5h window'),
            'last_start_time' => new external_value(PARAM_INT, 'Unix start time (seconds) of last focus'),
        ]);
    }

    /* ---------- NEW: read current status for tomato row ---------- */
    public static function get_status_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID', VALUE_REQUIRED),
        ]);
    }

    public static function get_status(int $courseid): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::get_status_parameters(), ['courseid' => $courseid]);
        $context = context_course::instance($params['courseid'], MUST_EXIST);
        self::validate_context($context);
        require_login($params['courseid']);

        $rec = $DB->get_record('pomodoro_sessions', ['course'=>$params['courseid'], 'user'=>$USER->id]);
        return [
            'sessionscount'   => $rec ? (int)$rec->sessionscount : 0,
            'last_start_time' => $rec ? (int)$rec->last_start_time : 0,
        ];
    }

    public static function get_status_returns(): external_single_structure {
        return new external_single_structure([
            'sessionscount'   => new external_value(PARAM_INT, 'Completed sessions in current 5h window'),
            'last_start_time' => new external_value(PARAM_INT, 'Unix start time (seconds) of last focus'),
        ]);
    }
}
