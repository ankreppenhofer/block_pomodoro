<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * External service definitions for tiny_opencast.
 *
 * @package     block_pomodoro
 * @copyright   2023 Gregor Eichelberger <gregor.eichelberger@tuwien.ac.at>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

$functions = [
    'block_pomodoro_save_session' => [
        'classname' => 'block_pomodoro\external\session',
        'methodname' => 'increment_session',
        'description' => 'Save Pomodoro Sessions',
        'type' => 'write',
        'ajax' => true,
        'loginrequired' => true,
    ],

];
