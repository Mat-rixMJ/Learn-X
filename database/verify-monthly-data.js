const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'learnx',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function verifyMonthlyData() {
  const client = await pool.connect();
  
  try {
    console.log('📊 MONTHLY SIMULATION DATA VERIFICATION');
    console.log('======================================\n');
    
    // Basic counts
    const assignments = await client.query("SELECT COUNT(*) FROM assignments WHERE created_at >= CURRENT_DATE - INTERVAL '35 days'");
    const submissions = await client.query("SELECT COUNT(*) FROM assignment_submissions WHERE submitted_at >= CURRENT_DATE - INTERVAL '35 days'");
    const attendance = await client.query("SELECT COUNT(*) FROM attendance WHERE attendance_date >= CURRENT_DATE - INTERVAL '35 days'");
    const progress = await client.query("SELECT COUNT(*) FROM course_progress");
    const analytics = await client.query("SELECT COUNT(*) FROM student_analytics");
    const grades = await client.query("SELECT COUNT(*) FROM grades");
    
    console.log('📈 DATA VOLUME:');
    console.log(`   📋 Recent Assignments: ${assignments.rows[0].count}`);
    console.log(`   📝 Assignment Submissions: ${submissions.rows[0].count}`);
    console.log(`   📅 Attendance Records: ${attendance.rows[0].count}`);
    console.log(`   📊 Course Progress: ${progress.rows[0].count}`);
    console.log(`   🎯 Student Analytics: ${analytics.rows[0].count}`);
    console.log(`   📊 Grades: ${grades.rows[0].count}`);
    console.log('');
    
    // Assignment types distribution
    const assignmentTypes = await client.query(`
      SELECT assignment_type, COUNT(*) as count, AVG(points_possible) as avg_points
      FROM assignments 
      WHERE created_at >= CURRENT_DATE - INTERVAL '35 days'
      GROUP BY assignment_type
      ORDER BY count DESC
    `);
    
    console.log('📋 ASSIGNMENT TYPES:');
    assignmentTypes.rows.forEach(row => {
      console.log(`   ${row.assignment_type}: ${row.count} assignments (avg: ${Math.round(row.avg_points)} points)`);
    });
    console.log('');
    
    // Grade distribution
    const gradeDistribution = await client.query(`
      SELECT 
        CASE 
          WHEN percentage >= 90 THEN 'A (90-100%)'
          WHEN percentage >= 80 THEN 'B (80-89%)'
          WHEN percentage >= 70 THEN 'C (70-79%)'
          WHEN percentage >= 60 THEN 'D (60-69%)'
          ELSE 'F (0-59%)'
        END as grade_range,
        COUNT(*) as count,
        ROUND(AVG(percentage), 1) as avg_percentage
      FROM grades
      GROUP BY grade_range
      ORDER BY avg_percentage DESC
    `);
    
    console.log('📊 GRADE DISTRIBUTION:');
    gradeDistribution.rows.forEach(row => {
      console.log(`   ${row.grade_range}: ${row.count} grades (avg: ${row.avg_percentage}%)`);
    });
    console.log('');
    
    // Attendance patterns
    const attendanceStats = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
      FROM attendance 
      WHERE attendance_date >= CURRENT_DATE - INTERVAL '35 days'
      GROUP BY status
      ORDER BY count DESC
    `);
    
    console.log('📅 ATTENDANCE PATTERNS:');
    attendanceStats.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} records (${row.percentage}%)`);
    });
    console.log('');
    
    // Student performance analytics
    const performanceStats = await client.query(`
      SELECT 
        CASE 
          WHEN overall_average >= 85 THEN 'Excellent (85+)'
          WHEN overall_average >= 75 THEN 'Good (75-84)'
          WHEN overall_average >= 65 THEN 'Average (65-74)'
          WHEN overall_average >= 50 THEN 'Struggling (50-64)'
          ELSE 'Poor (0-49)'
        END as performance_level,
        COUNT(*) as student_count,
        ROUND(AVG(overall_average), 1) as avg_grade,
        ROUND(AVG(total_study_hours), 1) as avg_study_hours
      FROM student_analytics
      WHERE overall_average > 0
      GROUP BY performance_level
      ORDER BY avg_grade DESC
    `);
    
    console.log('🎯 STUDENT PERFORMANCE LEVELS:');
    performanceStats.rows.forEach(row => {
      console.log(`   ${row.performance_level}: ${row.student_count} students`);
      console.log(`      Average Grade: ${row.avg_grade}%`);
      console.log(`      Average Study Hours: ${row.avg_study_hours}h`);
      console.log('');
    });
    
    // Top performing classes
    const topClasses = await client.query(`
      SELECT 
        c.name, 
        c.subject,
        COUNT(g.id) as assignment_count,
        ROUND(AVG(g.percentage), 1) as class_average,
        COUNT(DISTINCT ce.student_id) as student_count
      FROM classes c
      JOIN assignments a ON c.id = a.class_id
      JOIN grades g ON a.id = g.assignment_id
      JOIN class_enrollments ce ON c.id = ce.class_id
      WHERE a.created_at >= CURRENT_DATE - INTERVAL '35 days'
      GROUP BY c.id, c.name, c.subject
      HAVING COUNT(g.id) > 0
      ORDER BY class_average DESC
      LIMIT 5
    `);
    
    console.log('🏆 TOP 5 PERFORMING CLASSES:');
    topClasses.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.name} (${row.subject})`);
      console.log(`      Class Average: ${row.class_average}%`);
      console.log(`      Students: ${row.student_count} | Assignments: ${row.assignment_count}`);
      console.log('');
    });
    
    // Recent activity summary
    const recentActivity = await client.query(`
      SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as submissions
      FROM assignment_submissions 
      WHERE submitted_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(submitted_at)
      ORDER BY date DESC
      LIMIT 7
    `);
    
    console.log('📈 RECENT SUBMISSION ACTIVITY (Last 7 Days):');
    recentActivity.rows.forEach(row => {
      console.log(`   ${row.date}: ${row.submissions} submissions`);
    });
    console.log('');
    
    // Sample student progress
    const sampleProgress = await client.query(`
      SELECT 
        u.full_name,
        sa.overall_average,
        sa.active_courses,
        sa.total_study_hours,
        sa.current_streak
      FROM student_analytics sa
      JOIN users u ON sa.user_id = u.id
      WHERE sa.overall_average > 0
      ORDER BY sa.overall_average DESC
      LIMIT 5
    `);
    
    console.log('⭐ TOP 5 STUDENT PERFORMERS:');
    sampleProgress.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.full_name}`);
      console.log(`      Average: ${row.overall_average}% | Courses: ${row.active_courses}`);
      console.log(`      Study Hours: ${row.total_study_hours}h | Streak: ${row.current_streak} days`);
      console.log('');
    });
    
    console.log('✅ Monthly simulation data is ready for testing!');
    console.log('🚀 Start the application and test student/teacher dashboards with rich data.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
  }
}

verifyMonthlyData().then(() => process.exit(0));