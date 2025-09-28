const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'remoteclassroom',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function createSampleData() {
  console.log('🎯 Creating Sample Data for Student Dashboard...\n');

  try {
    // First, let's get or create some teachers and students
    console.log('1️⃣ Setting up users...');
    
    // Create sample teacher if doesn't exist
    const teacherResult = await pool.query(`
      INSERT INTO users (username, email, full_name, password_hash, role, profile_completed) 
      VALUES ('teacher1', 'teacher1@example.com', 'Prof. Smith', '$2b$10$dummy', 'teacher', true)
      ON CONFLICT (username) DO UPDATE SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name
      RETURNING id, username
    `);
    const teacherId = teacherResult.rows[0].id;
    console.log(`✅ Teacher created: ${teacherResult.rows[0].username}`);

    // Create sample student if doesn't exist
    const studentResult = await pool.query(`
      INSERT INTO users (username, email, full_name, password_hash, role, profile_completed) 
      VALUES ('student1', 'student1@example.com', 'John Doe', '$2b$10$dummy', 'student', true)
      ON CONFLICT (username) DO UPDATE SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name
      RETURNING id, username
    `);
    const studentId = studentResult.rows[0].id;
    console.log(`✅ Student created: ${studentResult.rows[0].username}`);

    // 2. Create sample classes
    console.log('\n2️⃣ Creating sample classes...');
    
    const classes = [
      {
        name: 'Mathematics - Class 10',
        description: 'Advanced mathematics concepts for Class 10 students',
        subject: 'Mathematics',
        scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        duration_minutes: 60
      },
      {
        name: 'Physics - Wave Motion',
        description: 'Understanding wave properties and mechanics',
        subject: 'Physics',
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        duration_minutes: 90
      },
      {
        name: 'Chemistry - Organic Chemistry',
        description: 'Basic concepts of organic chemistry',
        subject: 'Chemistry',
        scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        duration_minutes: 75
      }
    ];

    const classIds = [];
    for (const classData of classes) {
      const result = await pool.query(`
        INSERT INTO classes (name, description, subject, teacher_id, scheduled_at, duration_minutes, class_code, max_students)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name
      `, [
        classData.name, 
        classData.description, 
        classData.subject, 
        teacherId, 
        classData.scheduled_at, 
        classData.duration_minutes,
        Math.random().toString(36).substring(2, 8).toUpperCase(),
        50
      ]);
      classIds.push(result.rows[0].id);
      console.log(`✅ Class created: ${result.rows[0].name}`);
    }

    // 3. Enroll student in classes
    console.log('\n3️⃣ Enrolling student in classes...');
    
    for (const classId of classIds) {
      await pool.query(`
        INSERT INTO class_enrollments (student_id, class_id, enrolled_at, is_active)
        VALUES ($1, $2, NOW(), true)
        ON CONFLICT (student_id, class_id) DO NOTHING
      `, [studentId, classId]);
    }
    console.log(`✅ Student enrolled in ${classIds.length} classes`);

    // 4. Create recorded lectures
    console.log('\n4️⃣ Creating recorded lectures...');
    
    const lectures = [
      { title: 'Introduction to Quadratic Equations', description: 'Basic concepts of quadratic equations' },
      { title: 'Wave Properties and Characteristics', description: 'Understanding different types of waves' },
      { title: 'Alkanes and Alkenes', description: 'Hydrocarbon structures and properties' },
      { title: 'Trigonometry Basics', description: 'Sin, cos, tan functions' },
      { title: 'Newton\'s Laws of Motion', description: 'Three fundamental laws of physics' }
    ];

    const lectureIds = [];
    for (let i = 0; i < lectures.length; i++) {
      const lecture = lectures[i];
      const classId = classIds[i % classIds.length]; // Distribute among classes
      
      const result = await pool.query(`
        INSERT INTO recorded_lectures (class_id, title, description, video_url, duration_seconds, recorded_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, title
      `, [
        classId,
        lecture.title,
        lecture.description,
        `/videos/lecture_${i + 1}.mp4`,
        Math.floor(Math.random() * 3600) + 1800, // 30-90 minutes
        new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      ]);
      lectureIds.push(result.rows[0].id);
      console.log(`✅ Lecture created: ${result.rows[0].title}`);
    }

    // 5. Create AI notes
    console.log('\n5️⃣ Creating AI notes...');
    
    const notes = [
      'Quadratic Equations Summary: Key formulas and solving methods',
      'Wave Motion Notes: Properties, types, and mathematical representation',
      'Organic Chemistry Basics: Structure and nomenclature of hydrocarbons',
      'Trigonometry Cheat Sheet: Essential formulas and identities',
      'Physics Laws Summary: Newton\'s three laws with examples'
    ];

    for (let i = 0; i < notes.length; i++) {
      const lectureId = lectureIds[i];
      const classId = classIds[i % classIds.length];
      
      await pool.query(`
        INSERT INTO ai_notes (user_id, title, content, class_id, lecture_id, generated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        studentId,
        `AI Notes - ${lectures[i].title}`,
        notes[i],
        classId,
        lectureId,
        new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000)) // Last 5 days
      ]);
      console.log(`✅ AI note created for: ${lectures[i].title}`);
    }

    // 6. Create notifications
    console.log('\n6️⃣ Creating notifications...');
    
    const notifications = [
      {
        title: 'New Class Available',
        message: 'Mathematics - Class 10 has been scheduled for tomorrow',
        type: 'info'
      },
      {
        title: 'Assignment Due',
        message: 'Physics assignment is due in 2 days',
        type: 'warning'
      },
      {
        title: 'Lecture Recording Ready',
        message: 'Chemistry lecture recording is now available',
        type: 'success'
      }
    ];

    for (const notification of notifications) {
      await pool.query(`
        INSERT INTO notifications (user_id, title, message, notification_type, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        studentId,
        notification.title,
        notification.message,
        notification.type,
        Math.random() > 0.5, // Random read/unread status
        new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)) // Last 24 hours
      ]);
      console.log(`✅ Notification created: ${notification.title}`);
    }

    // 7. Create activity log entries
    console.log('\n7️⃣ Creating activity log...');
    
    const activities = [
      {
        type: 'class_joined',
        title: 'Joined Mathematics Live Class',
        description: 'Participated in quadratic equations session'
      },
      {
        type: 'lecture_completed',
        title: 'Completed Physics Lecture',
        description: 'Finished watching wave motion lecture'
      },
      {
        type: 'note_generated',
        title: 'Generated AI Notes for Chemistry',
        description: 'Auto-generated notes for organic chemistry lesson'
      }
    ];

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      await pool.query(`
        INSERT INTO activity_log (user_id, activity_type, activity_title, activity_description, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        studentId,
        activity.type,
        activity.title,
        activity.description,
        new Date(Date.now() - (i + 1) * 2 * 60 * 60 * 1000) // Spread over last 6 hours
      ]);
      console.log(`✅ Activity logged: ${activity.title}`);
    }

    // 8. Create student progress records
    console.log('\n8️⃣ Creating progress records...');
    
    for (let i = 0; i < classIds.length; i++) {
      const classId = classIds[i];
      const assignmentsCompleted = Math.floor(Math.random() * 10) + 1; // 1-10 assignments
      const performanceMetrics = {
        score: Math.floor(Math.random() * 100) + 1,
        participation: Math.floor(Math.random() * 100) + 1,
        attendance_rate: Math.floor(Math.random() * 100) + 60 // 60-100%
      };
      
      await pool.query(`
        INSERT INTO student_progress (student_id, class_id, assignments_completed, last_activity, performance_metrics)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (student_id, class_id) DO UPDATE SET
          assignments_completed = EXCLUDED.assignments_completed,
          last_activity = EXCLUDED.last_activity,
          performance_metrics = EXCLUDED.performance_metrics
      `, [
        studentId,
        classId,
        assignmentsCompleted,
        new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)),
        JSON.stringify(performanceMetrics)
      ]);
      console.log(`✅ Progress record created: ${assignmentsCompleted} assignments for class ${i + 1}`);
    }

    console.log('\n🎉 Sample data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • 1 Teacher and 1 Student created`);
    console.log(`   • ${classIds.length} Classes created`);
    console.log(`   • ${lectureIds.length} Recorded lectures created`);
    console.log(`   • ${notes.length} AI notes created`);
    console.log(`   • ${notifications.length} Notifications created`);
    console.log(`   • ${activities.length} Activity log entries created`);
    console.log(`   • ${classIds.length} Progress records created`);
    
    console.log('\n🔐 Test Credentials:');
    console.log('   Teacher: username="teacher1", password="password123"');
    console.log('   Student: username="student1", password="password123"');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
createSampleData().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});