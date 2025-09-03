<?php
defined('MOODLE_INTERNAL') || die();

/**
 * Upgrade code for the Pomodoro block.
 *
 * @param int $oldversion
 * @return bool
 */
function xmldb_block_pomodoro_upgrade($oldversion) {
    global $DB;

    $dbman = $DB->get_manager();

    if ($oldversion < 2025090206) {
        // Ensure table exists and columns are correct.
        $table = new xmldb_table('pomodoro_sessions');

        if (!$dbman->table_exists($table)) {
            $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
            $table->add_field('course', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
            $table->add_field('user', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
            $table->add_field('last_start_time', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
            $table->add_field('sessionscount', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');

            $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
            $table->add_key('course_fk', XMLDB_KEY_FOREIGN, ['course'], 'course', ['id']);
            $table->add_key('user_fk', XMLDB_KEY_FOREIGN, ['user'], 'user', ['id']);
            $table->add_index('course_user_uniq', XMLDB_INDEX_UNIQUE, ['course', 'user']);

            $dbman->create_table($table);
        } else {
            // Fix naming inconsistencies if any.
            $field = new xmldb_field('sessionscount', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
            if (!$dbman->field_exists($table, $field)) {
                // If misnamed 'sessioncount' exists, rename it.
                $oldfield = new xmldb_field('sessioncount');
                if ($dbman->field_exists($table, $oldfield)) {
                    $dbman->rename_field($table, $oldfield, 'sessionscount');
                } else {
                    $dbman->add_field($table, $field);
                }
            }

            $lst = new xmldb_field('last_start_time', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
            if (!$dbman->field_exists($table, $lst)) {
                $dbman->add_field($table, $lst);
            }

            // Ensure unique index on (course, user).
            $idx = new xmldb_index('course_user_uniq', XMLDB_INDEX_UNIQUE, ['course', 'user']);
            if (!$dbman->index_exists($table, $idx)) {
                $dbman->add_index($table, $idx);
            }
        }

        upgrade_block_savepoint(true, 2025090207, 'pomodoro');
    }

    return true;
}
