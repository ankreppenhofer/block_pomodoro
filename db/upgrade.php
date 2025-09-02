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

    $dbman = $DB->get_manager(); // Loads database manager.

    // Example: First install of pomodoro_cycles table.
    if ($oldversion < 2025090201) {

        // Define table pomodoro_cycles to be created.
        $table = new xmldb_table('pomodoro_sessions');

        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('course', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('user', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('sessionscount', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');

        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $table->add_key('course', XMLDB_KEY_FOREIGN, ['course'], 'course', ['id']);
        $table->add_key('user', XMLDB_KEY_FOREIGN, ['user'], 'user', ['id']);

        // Optional index if you want uniqueness on (course, user).
        $table->add_index('course-user-index', XMLDB_INDEX_UNIQUE, ['course', 'user']);

        // Conditionally create the table.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        // Plugin savepoint reached.
        upgrade_block_savepoint(true, 2025090201, 'pomodoro');
    }

    if($oldversion < 2025090202) {
        $table = new xmldb_table('pomodoro_sessions');
        $field = new xmldb_field('last_start_time', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);

        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        upgrade_block_savepoint(true, 2025090202, 'pomodoro');

    }

    return true;
}
