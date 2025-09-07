# 🔧 PostgreSQL Password Reset Guide

## Current Issue

PostgreSQL is installed and running, but we need to set/reset the postgres user password.

## 🚀 Quick Fix Steps

### Option 1: Reset Password via Command Line (Try this first)

1. **Open Command Prompt as Administrator**

   ```cmd
   # Right-click Start menu → "Windows PowerShell (Admin)" or "Command Prompt (Admin)"
   ```

2. **Navigate to PostgreSQL bin directory**

   ```cmd
   cd "C:\Program Files\PostgreSQL\17\bin"
   ```

3. **Try common passwords first**

   ```cmd
   # Try these passwords one by one:
   set PGPASSWORD=postgres
   psql -U postgres -d postgres -c "SELECT version();"

   set PGPASSWORD=admin
   psql -U postgres -d postgres -c "SELECT version();"

   set PGPASSWORD=password
   psql -U postgres -d postgres -c "SELECT version();"

   set PGPASSWORD=123456
   psql -U postgres -d postgres -c "SELECT version();"
   ```

### Option 2: Reset Password via Service Configuration

1. **Stop PostgreSQL Service** (as Administrator)

   ```cmd
   net stop postgresql-x64-17
   ```

2. **Modify pg_hba.conf temporarily**

   ```cmd
   cd "C:\Program Files\PostgreSQL\17\data"
   copy pg_hba.conf pg_hba.conf.backup
   notepad pg_hba.conf
   ```

3. **Change authentication method to 'trust'**
   Find lines like:

   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   host    all             all             127.0.0.1/32            md5
   host    all             all             ::1/128                 md5
   local   all             postgres                                md5
   ```

   Change `md5` to `trust`:

   ```
   host    all             all             127.0.0.1/32            trust
   host    all             all             ::1/128                 trust
   local   all             postgres                                trust
   ```

4. **Restart PostgreSQL Service**

   ```cmd
   net start postgresql-x64-17
   ```

5. **Connect without password and set new password**

   ```cmd
   cd "C:\Program Files\PostgreSQL\17\bin"
   psql -U postgres -d postgres
   ```

   In PostgreSQL prompt:

   ```sql
   ALTER USER postgres PASSWORD 'password';
   \q
   ```

6. **Restore original authentication**
   ```cmd
   cd "C:\Program Files\PostgreSQL\17\data"
   copy pg_hba.conf.backup pg_hba.conf
   net stop postgresql-x64-17
   net start postgresql-x64-17
   ```

### Option 3: Use Docker PostgreSQL (Alternative)

If the above doesn't work, we can use Docker:

```cmd
# Pull PostgreSQL image (if network allows)
docker pull postgres:13

# Or try a lightweight alternative
docker run --name learnx-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=learnx -p 5433:5432 -d postgres:13

# Connect using port 5433 instead of 5432
```

## 🎯 After Password Reset

Once you have PostgreSQL working with password 'password':

1. **Create the learnx database**

   ```cmd
   set PGPASSWORD=password
   createdb -U postgres learnx
   ```

2. **Run our schema**

   ```cmd
   cd D:\RemoteClassRoom
   psql -U postgres -d learnx -f database\schema.sql
   ```

3. **Test the backend**
   ```cmd
   cd backend
   npm run dev
   ```

## 🔍 Troubleshooting

If you're still having issues:

1. **Check if PostgreSQL is actually running**

   ```cmd
   netstat -an | findstr :5432
   ```

2. **Check PostgreSQL logs**

   ```cmd
   type "C:\Program Files\PostgreSQL\17\data\log\*.log"
   ```

3. **Alternative: Use pgAdmin**
   - Install pgAdmin from winget: `winget install PostgreSQL.pgAdmin`
   - Use GUI to reset password

## 💡 Remember

The password we set in our `.env` file is `password`, so once PostgreSQL is working, make sure both match!

---

**Try Option 1 first (common passwords), then Option 2 if needed!**
