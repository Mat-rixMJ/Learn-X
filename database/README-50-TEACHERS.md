# Learn-X Database Setup - 50 Teachers & Students

This directory contains scripts to populate your Learn-X database with comprehensive teacher and student data for testing and development.

## 🎯 What Gets Created

- **50 Teachers** across 15 different subjects (Mathematics, Physics, Chemistry, Biology, etc.)
- **1,200 Students** with realistic names and profiles
- **125+ Classes** with proper subject categorization and enrollment limits
- **3,500+ Enrollments** with students distributed across classes
- **Realistic Data** including:
  - Teachers specialized in different subjects
  - Classes with beginner/intermediate/advanced levels
  - Students enrolled in multiple classes
  - Proper foreign key relationships

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)

**Windows PowerShell:**

```powershell
.\setup-50-teachers.ps1
```

**Windows Command Prompt:**

```batch
setup-50-teachers.bat
```

### Option 2: Manual Setup

1. **Ensure database connection:**

   ```bash
   # Check your backend/.env file has correct PostgreSQL credentials
   ```

2. **Create required tables:**

   ```bash
   node database/create-assignments-tables.js
   ```

3. **Populate with data:**

   ```bash
   node database/seed-basic-50-teachers.js
   ```

4. **Verify data:**
   ```bash
   node database/check-data.js
   ```

## 📊 Database Structure

### Teachers (50 total)

- **Usernames:** `teacher1` to `teacher50`
- **Emails:** `teacher1@learnx.edu` to `teacher50@learnx.edu`
- **Password:** `password123` (all teachers)
- **Subjects:** Distributed across Mathematics, Physics, Chemistry, Biology, Computer Science, English, History, Geography, Economics, Psychology, Art, Music, Physical Education, Business, Statistics

### Students (1,200 total)

- **Usernames:** `student1` to `student1200`
- **Emails:** `student1@learnx.edu` to `student1200@learnx.edu`
- **Password:** `password123` (all students)
- **Enrollments:** Each student enrolled in 2-6 classes on average

### Classes (125+ total)

- **Structure:** Each teacher has 2-3 classes
- **Levels:** Beginner, Intermediate, Advanced courses
- **Enrollment:** 15-50 students per class
- **Subjects:** Matches teacher specializations

## 🔐 Login Credentials

### Teachers

- **Username:** `teacher1`, `teacher2`, ..., `teacher50`
- **Password:** `password123`

### Students

- **Username:** `student1`, `student2`, ..., `student1200`
- **Password:** `password123`

### Admin (existing)

- **Username:** `admin`
- **Password:** `admin123`

## 📁 Script Files

- **`seed-basic-50-teachers.js`** - Main script to create all data
- **`seed-comprehensive-data.js`** - Extended version with analytics, attendance, assignments
- **`check-data.js`** - Verify and display database statistics
- **`setup-50-teachers.bat/ps1`** - Automated setup scripts
- **`additional-tables.sql`** - SQL for additional tables if needed

## 🧹 Clearing Data

The scripts automatically clear existing teacher/student data while preserving the admin user. To manually clear:

```sql
-- Clear in dependency order
DELETE FROM class_enrollments;
DELETE FROM assignments;
DELETE FROM classes;
DELETE FROM users WHERE role IN ('teacher', 'student') AND username != 'admin';
```

## ⚙️ Configuration

Database connection uses environment variables from `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=learnx
DB_USER=postgres
DB_PASSWORD=postgres
```

## 🚀 Starting the Application

After populating the database:

```bash
npm run start:full
```

This starts the complete Learn-X stack with:

- Python AI services
- Node.js backend
- React frontend

## 📈 Sample Data Overview

### Top Teachers by Class Count

- Each teacher specializes in a specific subject
- Teachers have 2-3 classes each (Beginner, Intermediate, Advanced)
- Realistic class sizes and enrollments

### Class Distribution

- **Mathematics:** 7 teachers, 21 classes
- **Physics:** 7 teachers, 21 classes
- **Computer Science:** 7 teachers, 21 classes
- And so on across all 15 subjects

### Enrollment Patterns

- Students distributed realistically across classes
- No student enrolled in conflicting time slots
- Proper teacher-student relationships maintained

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
# Verify credentials in backend/.env
# Ensure database 'learnx' exists
```

### Permission Errors

```bash
# Ensure database user has CREATE/INSERT privileges
# Check foreign key constraints are properly handled
```

### Data Already Exists

```bash
# Scripts automatically clear existing data
# Admin user is preserved
# Run scripts multiple times safely
```

## 💡 Development Tips

1. **Testing:** Use this data to test student/teacher dashboards
2. **Login:** Each role has different dashboard experiences
3. **Classes:** Test live sessions, assignments, enrollments
4. **Analytics:** Rich data for testing progress tracking
5. **Search:** Test class browsing and enrollment features

---

**Ready to use!** Your Learn-X application now has realistic data to test all features across teacher and student user flows.
