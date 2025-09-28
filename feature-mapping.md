# Feature Mapping: Student, Teacher, Admin Interactions

| Feature/Function             | Student       | Teacher           | Admin            | Interaction/Connection                           |
| ---------------------------- | ------------- | ----------------- | ---------------- | ------------------------------------------------ |
| Register/Login               | ✔️            | ✔️                | ✔️               | All roles access system                          |
| Class/Course Creation        |               | ✔️                | ✔️ (approve)     | Teacher creates, admin approves                  |
| Class Enrollment             | ✔️ (enroll)   | ✔️ (approve)      | ✔️ (manage)      | Student requests, teacher/admin manage           |
| Join Live Session            | ✔️            | ✔️ (host)         | (monitor)        | Teacher hosts, students join, admin monitors     |
| Upload/View Materials        | ✔️ (view)     | ✔️ (upload)       | ✔️ (manage)      | Teacher uploads, students view, admin oversees   |
| Chat/Discussion              | ✔️            | ✔️ (moderate)     | ✔️ (monitor)     | All interact, teacher/admin moderate             |
| Polls/Quizzes                | ✔️ (respond)  | ✔️ (create)       | ✔️ (analyze)     | Teacher creates, students respond, admin reviews |
| Assignment Submission/Review | ✔️ (submit)   | ✔️ (review)       | ✔️ (oversee)     | Student submits, teacher reviews, admin audits   |
| Notifications                | ✔️ (receive)  | ✔️ (send/receive) | ✔️ (send/manage) | Teacher/admin send, students receive             |
| AI Notes/Transcripts         | ✔️ (view)     | ✔️ (view)         | ✔️ (manage)      | All access, admin manages                        |
| Attendance/Progress Tracking | ✔️ (view own) | ✔️ (view class)   | ✔️ (all users)   | Teacher/admin track, students view own           |
| User Management              |               |                   | ✔️               | Admin manages all users                          |
| System Settings/Policies     |               |                   | ✔️               | Admin configures                                 |
| Support/Reporting            | ✔️ (request)  | ✔️ (request)      | ✔️ (handle)      | Students/teachers request, admin handles         |

**Legend:**
✔️ = Has access/role
(blank) = No direct access

**Interaction Examples:**

- Student enrolls in class → Teacher approves → Admin can override/manage
- Teacher starts live session → Students join → Admin can monitor
- Teacher sends notification → Students receive → Admin can send system-wide
- Student submits assignment → Teacher reviews → Admin audits if needed
