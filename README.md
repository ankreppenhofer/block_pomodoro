# Pomodoro Timer

## Purpose:

Making Moodle a real study companion instead of just a file repository for lectures and exercise sheets.


## Problem:

Students usually use Moodle to either download lectures or sometimes check grades in a University setting - more or less in a passive way. Moodle doesn’t really support student study habits or help them in any way to keep focus while learning.

Teachers can see submissions on assignments and quizzes, and based on the results of the students can deduce which lectures or topics were more challenging but, in the case when the courses have no topic-specific assignments, it is difficult to pinpoint the difficulties among students.


## Solution:

Creating a course-based Pomodoro Timer integrated into Moodle, which helps transform Moodle from a passive file repository (for students) into an active study companion. Students can start study sessions directly within a course, track their progress, and build better study habits within the platform.
The timer will log the time spent on a specific task/ activity within a course. This way the teachers will gain more insight on how students engage with the course materials. Through this, besides having results from submissions students make, they can identify which materials require more effort (time wise).

## Plugin type:

Block Plugin - Setting the timer widget on the side part of a course page.

## Feature list (for the MVP probably)

### Course-based pomodoro timer
Start/Stop/Reset directly into a course =>  Create and manipulate sessions within a course
We could add a default pomodoro cycle (25/5) but could add the customization functionality to it so that students could personalize cycles.
Log sessions into a DB table
Pomodoro_sessions -> courseid, userid, activityid, duration, timestamp
Used for student dashboard (maybe) -> students could see their accumulated study time within a course
Used for teacher’s analytics table
Student Dashboard
Teacher’s dashboard (we should leave out analytics for the MVP)
Simply display an aggregate of the student’s study time per course


## Extended features (if we want to work on it later on)

### Gamification
Streaks for students based on the sessions created per day on a course
Students with longer sessions within a course could be attributed badges (by the teacher)
### Better analytics for the teacher dashboard
Study modes to be configured or personalized in the study timer.
