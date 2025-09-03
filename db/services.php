<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'block_pomodoro_increment_session' => [
        'classname'     => '\block_pomodoro\external\session',
        'methodname'    => 'increment_session',
        'description'   => 'Increment after a completed focus session; enforces 5h window using provided start time.',
        'type'          => 'write',
        'ajax'          => true,
        'loginrequired' => true,
    ],
    'block_pomodoro_get_status' => [
        'classname'     => '\block_pomodoro\external\session',
        'methodname'    => 'get_status',
        'description'   => 'Read current sessionscount/last_start_time for this course+user.',
        'type'          => 'read',
        'ajax'          => true,
        'loginrequired' => true,
    ],
];
