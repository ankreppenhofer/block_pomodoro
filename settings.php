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
 * Plugin administration pages are defined here.
 *
 * @package     block_pomodoro
 * @copyright   2025 Alissa Cenga <alissa.cenga@tuwien.ac.at>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {

    $settings = new admin_settingpage('block_pomodoro', new lang_string('pluginname', 'block_pomodoro'));

    $settings->add(new admin_setting_configtext('block_pomodoro/focustime', get_string('focustime', 'block_pomodoro'),
        get_string('focustimedesc', 'block_pomodoro'), '25'));
    $settings->add(new admin_setting_configtext('block_pomodoro/shortbreak', get_string('shortbreak', 'block_pomdoro'),
        get_string('shortbreakdesc', 'block_pomodoro'), '5'));

    $settings->add(new admin_setting_configtext('block_pomodoro/longbreakmin', get_string('longbreakmin', 'block_pomodoro'),
        get_string('longbreakmindesc', 'block_pomodoro')));

    $settings->add(new admin_setting_configtext('block_pomodoro/cyclelength', get_string('cyclelength ', 'block_pomodoro'),
        get_string('cyclelengthdesc', 'block_pomodoro')));

    $ADMIN->add('blocks', $settings);
}
