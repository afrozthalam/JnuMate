import os
import sqlite3

# Supabase PostgreSQL or local SQLite fallback
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL")

def get_sqlite_path():
    base_path = os.path.join(os.path.dirname(__file__), "hackmate.db")
    # On Vercel serverless / AWS Lambda, root directory is strictly read-only.
    # We copy hackmate.db to temp storage so SQLite operations can read and write.
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        import tempfile
        import shutil
        tmp_dir = "/tmp" if os.path.exists("/tmp") else tempfile.gettempdir()
        tmp_path = os.path.join(tmp_dir, "hackmate.db")
        if not os.path.exists(tmp_path) and os.path.exists(base_path):
            try:
                shutil.copy2(base_path, tmp_path)
            except Exception as e:
                print(f"Notice copying hackmate.db to tmp: {e}")
        if os.path.exists(tmp_path):
            return tmp_path
    return base_path

def is_postgres():
    return bool(DATABASE_URL and DATABASE_URL.startswith("postgres"))

def get_db():
    if is_postgres():
        import psycopg2
        import psycopg2.extras
        
        db_url = DATABASE_URL
        if "sslmode=" not in db_url:
            separator = "&" if "?" in db_url else "?"
            db_url = f"{db_url}{separator}sslmode=require"

        conn = psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
        return conn
    else:
        conn = sqlite3.connect(get_sqlite_path())
        conn.row_factory = sqlite3.Row
        return conn

def init_db():
    if is_postgres():
        import psycopg2
        
        db_url = DATABASE_URL
        if "sslmode=" not in db_url:
            separator = "&" if "?" in db_url else "?"
            db_url = f"{db_url}{separator}sslmode=require"

        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        # Postgres Schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                r_id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(150),
                phone VARCHAR(50),
                gender VARCHAR(20) NOT NULL,
                dob VARCHAR(50),
                avatar_url TEXT,
                password TEXT,
                program VARCHAR(150),
                semester_year VARCHAR(50),
                is_registered INT DEFAULT 0
            );
        """)

        # Migration checks for existing Postgres DB
        try:
            cursor.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS dob VARCHAR(50);")
            cursor.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS program VARCHAR(150);")
            cursor.execute("ALTER TABLE students ADD COLUMN IF NOT EXISTS semester_year VARCHAR(50);")
            conn.commit()
        except Exception as e:
            print(f"Postgres students migration note: {e}")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS email_otps (
                id SERIAL PRIMARY KEY,
                r_id VARCHAR(50) NOT NULL,
                email VARCHAR(150) NOT NULL,
                otp VARCHAR(10) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS teams (
                id SERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description TEXT,
                leader_r_id VARCHAR(50) NOT NULL,
                whatsapp_link TEXT,
                seat_modes VARCHAR(100) DEFAULT 'request,request,request,request,request',
                hackathon_type VARCHAR(50) DEFAULT 'sih',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Migration check for seat_modes and hackathon_type column in existing Postgres DB
        try:
            cursor.execute("ALTER TABLE teams ADD COLUMN IF NOT EXISTS seat_modes VARCHAR(100) DEFAULT 'request,request,request,request,request';")
            cursor.execute("ALTER TABLE teams ADD COLUMN IF NOT EXISTS hackathon_type VARCHAR(50) DEFAULT 'sih';")
            conn.commit()
        except Exception as e:
            print(f"Postgres teams migration note: {e}")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS team_members (
                id SERIAL PRIMARY KEY,
                team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                student_r_id VARCHAR(50) NOT NULL REFERENCES students(r_id),
                role VARCHAR(20) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(team_id, student_r_id)
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS join_requests (
                id SERIAL PRIMARY KEY,
                team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                student_r_id VARCHAR(50) NOT NULL REFERENCES students(r_id),
                status VARCHAR(20) DEFAULT 'pending',
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(team_id, student_r_id)
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                recipient_r_id VARCHAR(50) NOT NULL,
                title VARCHAR(150) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                link TEXT,
                is_read INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        conn.commit()
        conn.close()
        print("PostgreSQL tables initialized successfully!")

    else:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = ON;")

        # SQLite Schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS students (
                r_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                gender TEXT NOT NULL,
                dob TEXT,
                avatar_url TEXT,
                password TEXT,
                is_registered INTEGER DEFAULT 0
            );
        """)

        # Migration check for dob, program, and semester_year columns in existing SQLite DB
        cursor.execute("PRAGMA table_info(students);")
        cols = [c[1] for c in cursor.fetchall()]
        if "dob" not in cols:
            try:
                cursor.execute("ALTER TABLE students ADD COLUMN dob TEXT;")
            except Exception:
                pass
        if "program" not in cols:
            try:
                cursor.execute("ALTER TABLE students ADD COLUMN program TEXT;")
            except Exception:
                pass
        if "semester_year" not in cols:
            try:
                cursor.execute("ALTER TABLE students ADD COLUMN semester_year TEXT;")
            except Exception:
                pass

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS email_otps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                r_id TEXT NOT NULL,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                leader_r_id TEXT NOT NULL,
                whatsapp_link TEXT,
                seat_modes TEXT DEFAULT 'request,request,request,request,request',
                hackathon_type TEXT DEFAULT 'sih',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (leader_r_id) REFERENCES students (r_id)
            );
        """)

        # Migration check for seat_modes and hackathon_type column in existing SQLite DB
        cursor.execute("PRAGMA table_info(teams);")
        team_cols = [c[1] for c in cursor.fetchall()]
        if "seat_modes" not in team_cols:
            try:
                cursor.execute("ALTER TABLE teams ADD COLUMN seat_modes TEXT DEFAULT 'request,request,request,request,request';")
            except Exception:
                pass
        if "hackathon_type" not in team_cols:
            try:
                cursor.execute("ALTER TABLE teams ADD COLUMN hackathon_type TEXT DEFAULT 'sih';")
            except Exception:
                pass

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS team_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                student_r_id TEXT NOT NULL,
                role TEXT DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(team_id, student_r_id),
                FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
                FOREIGN KEY (student_r_id) REFERENCES students (r_id)
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS join_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                student_r_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(team_id, student_r_id),
                FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
                FOREIGN KEY (student_r_id) REFERENCES students (r_id)
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipient_r_id TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                link TEXT,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        conn.commit()
        conn.close()
        print("SQLite database initialized successfully!")

if __name__ == "__main__":
    init_db()
