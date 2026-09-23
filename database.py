import os
import sqlite3
import json

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

def seed_initial_events(cursor, p):
    try:
        cursor.execute("SELECT COUNT(*) FROM events")
        row = cursor.fetchone()
        count = row[0] if row else 0
        if count == 0:
            initial_events = [
                (
                    "smart-india-hackathon-2025",
                    "Smart India Hackathon 2025",
                    "Hackathons",
                    "Hackathon",
                    "green",
                    "/static/img/redesign/events/event_sih.png",
                    "15 November 2025",
                    "15",
                    "NOV",
                    "9:00 AM - 6:00 PM (Full Day)",
                    "JNU Main Campus",
                    "Jaipur, Rajasthan",
                    "Open to all JNU students / UG & PG (All Departments)",
                    "Innovate for a better tomorrow. Build solutions for real-world problems.",
                    "Smart India Hackathon (SIH) is a nationwide initiative to provide students a platform to solve some of the pressing problems we face in our daily lives, and thus inculcate a culture of product innovation and a mindset of problem solving.\n\nStudents work in teams to develop innovative solutions for real problems posed by various ministries, industries and organizations. It's an opportunity to learn, collaborate and create an impact beyond the classroom.",
                    json.dumps(["Smart Automation", "Healthcare & Assistive Technology", "Sustainability & Clean Energy", "Education & Skill Development", "Agriculture & Rural Development", "And more"]),
                    "Detailed problem statements and guidelines will be shared soon.",
                    json.dumps([
                        {"date": "01 Oct 2025", "label": "Registrations Open"},
                        {"date": "31 Oct 2025", "label": "Team Formation Deadline"},
                        {"date": "10 Nov 2025", "label": "Final Shortlisting"},
                        {"date": "15 Nov 2025", "label": "Hackathon Event"}
                    ]),
                    json.dumps([
                        {"name": "Ministry of Education", "sub": "Government of India", "logo": "/static/img/jnu_logo.png"},
                        {"name": "Nodal Center", "sub": "Jaipur National University, Jaipur, Rajasthan", "logo": "/static/img/jnu_logo.png"}
                    ]),
                    "/create-team"
                ),
                (
                    "ai-machine-learning-workshop",
                    "AI & Machine Learning Workshop",
                    "Workshops",
                    "Workshop",
                    "blue",
                    "/static/img/redesign/events/event_ai.png",
                    "22 November 2025",
                    "22",
                    "NOV",
                    "10:00 AM - 4:30 PM IST",
                    "Computer Science Block",
                    "CS Advanced Lab 304, Third Floor",
                    "Open to all engineering and tech enthusiasts",
                    "Hands-on session on modern AI tools and applications.",
                    "Master practical machine learning pipelines from dataset preparation to training neural networks, exploring LLM fine-tuning, and deploying transformer models with Python and PyTorch. Bring your laptops. Certificates provided.",
                    json.dumps(["Transformer Models & Hugging Face", "Dataset Wrangling with Pandas", "Fine-tuning Small LLMs", "Edge AI & ONNX Deployment"]),
                    "Prerequisites: Python fundamentals and a laptop with 8GB+ RAM.",
                    json.dumps([
                        {"date": "10 Nov 2025", "label": "Registrations Open"},
                        {"date": "20 Nov 2025", "label": "Seat Allocation"},
                        {"date": "22 Nov 2025", "label": "Hands-on Workshop"}
                    ]),
                    json.dumps([
                        {"name": "Department of Computer Science", "sub": "Jaipur National University", "logo": "/static/img/jnu_logo.png"}
                    ]),
                    "/events"
                ),
                (
                    "future-of-tech-expert-talk",
                    "Future of Tech: Expert Talk",
                    "Seminars",
                    "Seminar",
                    "brown",
                    "/static/img/redesign/events/event_future_tech.png",
                    "28 November 2025",
                    "28",
                    "NOV",
                    "2:00 PM - 5:00 PM IST",
                    "Auditorium, JNU",
                    "Dr. APJ Abdul Kalam Central University Auditorium",
                    "Open to all university students and faculty members",
                    "Insights from industry experts on emerging technologies.",
                    "Distinguished keynote session and interactive fireside chat exploring quantum computing, edge artificial intelligence, hyperscale cloud architecture, and high-growth engineering careers with senior industry leaders.",
                    json.dumps(["Quantum Computing Horizons", "Generative AI Systems", "Distributed Cloud Infrastructure"]),
                    "Entry is free for all students carrying a valid college identity card.",
                    json.dumps([
                        {"date": "15 Nov 2025", "label": "RSVP Opens"},
                        {"date": "27 Nov 2025", "label": "Pass Generation"},
                        {"date": "28 Nov 2025", "label": "Keynote & Fireside Chat"}
                    ]),
                    json.dumps([
                        {"name": "JNU Tech Leaders Forum", "sub": "IEEE Student Chapter", "logo": "/static/img/jnu_logo.png"}
                    ]),
                    "/events"
                ),
                (
                    "jnu-cultural-fest-2025",
                    "JNU Cultural Fest 2025",
                    "Cultural",
                    "Cultural",
                    "purple",
                    "/static/img/redesign/events/event_cultural.png",
                    "05 December 2025",
                    "05",
                    "DEC",
                    "4:00 PM - 10:00 PM IST",
                    "Open Air Ground",
                    "University Amphitheater & Campus Open Air Lawn",
                    "Open to all JNU students, alumni, and faculty",
                    "Music, art, dance and much more. Celebrate the spirit of JNU.",
                    "The university's flagship annual cultural festival bringing together live music bands, theatrical drama, folk and western dance battles, fashion runway, photography exhibitions, and a vibrant night food carnival.",
                    json.dumps(["Battle of the Bands", "Theatrical Street Play (Nukkad Natak)", "Contemporary & Folk Dance", "Runway Fashion Show"]),
                    "Entry passes are mandatory. Pick up your physical pass from the SAC office.",
                    json.dumps([
                        {"date": "20 Nov 2025", "label": "Auditions Begin"},
                        {"date": "30 Nov 2025", "label": "Stage Rehearsals"},
                        {"date": "05 Dec 2025", "label": "Gala Opening Night"}
                    ]),
                    json.dumps([
                        {"name": "JNU Student Activity Council (SAC)", "sub": "Jaipur National University", "logo": "/static/img/jnu_logo.png"}
                    ]),
                    "/events"
                ),
                (
                    "capture-the-flag-ctf",
                    "Capture The Flag (CTF)",
                    "Competitions",
                    "Competition",
                    "red",
                    "/static/img/redesign/events/event_ctf.png",
                    "12 December 2025",
                    "12",
                    "DEC",
                    "11:00 AM - 7:00 PM IST",
                    "Computer Science Block",
                    "Cyber Defense Systems Lab, 2nd Floor",
                    "Solo or Teams of 2-3 students",
                    "Test your cybersecurity skills in this thrilling competition.",
                    "An intensive 8-hour live offensive and defensive cybersecurity jeopardy tournament. Hack through web app vulnerabilities, reverse engineer binaries, crack cryptographic puzzles, and analyze memory forensics. Cash prizes for the top 3 teams!",
                    json.dumps(["Web Exploitation & Injection", "Binary Reverse Engineering", "Cryptography & Ciphers", "Network Packet Forensics"]),
                    "Official rules: strictly target designated tournament VMs only.",
                    json.dumps([
                        {"date": "25 Nov 2025", "label": "Team Registration"},
                        {"date": "08 Dec 2025", "label": "Platform Sandbox Trial"},
                        {"date": "12 Dec 2025", "label": "Live 8-Hour CTF"}
                    ]),
                    json.dumps([
                        {"name": "JNU Cybersecurity Club (SecNet)", "sub": "Jaipur National University", "logo": "/static/img/jnu_logo.png"}
                    ]),
                    "/create-team"
                ),
                (
                    "startup-stories",
                    "Startup Stories",
                    "Talks",
                    "Talk",
                    "teal",
                    "/static/img/redesign/events/event_startup.png",
                    "18 December 2025",
                    "18",
                    "DEC",
                    "3:00 PM - 6:00 PM IST",
                    "Management Block",
                    "Executive Conference Hall 102, School of Management",
                    "Open to all aspiring student founders and creators",
                    "Learn from founders, builders and innovators.",
                    "Candid founder stories from alumni entrepreneurs who scaled venture-backed tech startups. Learn practical lessons on initial customer discovery, prototyping on a student budget, fundraising, and pitch decks.",
                    json.dumps(["Bootstrapping vs Venture Capital", "First 100 Paying Users", "Product-Market Fit in College"]),
                    "Interactive Q&A session follows the presentations.",
                    json.dumps([
                        {"date": "01 Dec 2025", "label": "Registration Open"},
                        {"date": "15 Dec 2025", "label": "Registration Close"},
                        {"date": "18 Dec 2025", "label": "Founder Session & Networking"}
                    ]),
                    json.dumps([
                        {"name": "JNU E-Cell & Incubation Center", "sub": "Jaipur National University", "logo": "/static/img/jnu_logo.png"}
                    ]),
                    "/events"
                )
            ]
            for ev in initial_events:
                cursor.execute(f"""
                    INSERT INTO events (
                        slug, title, category, badge_text, badge_color, cover_image,
                        event_date, event_day, event_month, event_time, venue, venue_detail,
                        audience, summary, about, themes, guidelines_link, important_dates,
                        organizers, registration_link
                    ) VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p})
                """, ev)
    except Exception as e:
        print(f"Notice seeding initial events: {e}")

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

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS team_messages (
                id SERIAL PRIMARY KEY,
                team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                sender_r_id VARCHAR(50) NOT NULL REFERENCES students(r_id),
                sender_name VARCHAR(150),
                sender_avatar TEXT,
                message TEXT NOT NULL,
                reactions TEXT DEFAULT '{}',
                attachment_name TEXT,
                attachment_url TEXT,
                attachment_size TEXT,
                attachment_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_team_messages_team ON team_messages(team_id);")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                slug VARCHAR(150) UNIQUE,
                title VARCHAR(200) NOT NULL,
                category VARCHAR(50) NOT NULL DEFAULT 'Hackathons',
                badge_text VARCHAR(50) DEFAULT 'Hackathon',
                badge_color VARCHAR(30) DEFAULT 'green',
                cover_image TEXT,
                event_date VARCHAR(50) NOT NULL,
                event_day VARCHAR(10),
                event_month VARCHAR(10),
                event_time VARCHAR(100),
                venue VARCHAR(150) NOT NULL,
                venue_detail TEXT,
                audience VARCHAR(200) DEFAULT 'Open to all JNU students / UG & PG (All Departments)',
                summary TEXT,
                about TEXT,
                themes TEXT DEFAULT '[]',
                guidelines_link TEXT,
                important_dates TEXT DEFAULT '[]',
                organizers TEXT DEFAULT '[]',
                registration_link TEXT DEFAULT '/create-team',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);")
        seed_initial_events(cursor, "%s")

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

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS team_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                sender_r_id TEXT NOT NULL,
                sender_name TEXT,
                sender_avatar TEXT,
                message TEXT NOT NULL,
                reactions TEXT DEFAULT '{}',
                attachment_name TEXT,
                attachment_url TEXT,
                attachment_size TEXT,
                attachment_type TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
                FOREIGN KEY (sender_r_id) REFERENCES students (r_id)
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_team_messages_team ON team_messages(team_id);")

        # SQLite Safe Migrations for existing team_messages table
        try:
            cursor.execute("PRAGMA table_info(team_messages);")
            cols = [row[1] for row in cursor.fetchall()]
            if 'reactions' not in cols:
                cursor.execute("ALTER TABLE team_messages ADD COLUMN reactions TEXT DEFAULT '{}';")
            if 'attachment_name' not in cols:
                cursor.execute("ALTER TABLE team_messages ADD COLUMN attachment_name TEXT;")
            if 'attachment_url' not in cols:
                cursor.execute("ALTER TABLE team_messages ADD COLUMN attachment_url TEXT;")
            if 'attachment_size' not in cols:
                cursor.execute("ALTER TABLE team_messages ADD COLUMN attachment_size TEXT;")
            if 'attachment_type' not in cols:
                cursor.execute("ALTER TABLE team_messages ADD COLUMN attachment_type TEXT;")
        except Exception as e:
            print(f"Notice running team_messages migrations: {e}")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('otp_email_enabled', 'true');")
        cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('default_bypass_otp', '123456');")

        # Events Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE,
                title TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Hackathons',
                badge_text TEXT DEFAULT 'Hackathon',
                badge_color TEXT DEFAULT 'green',
                cover_image TEXT,
                event_date TEXT NOT NULL,
                event_day TEXT,
                event_month TEXT,
                event_time TEXT,
                venue TEXT NOT NULL,
                venue_detail TEXT,
                audience TEXT DEFAULT 'Open to all JNU students / UG & PG (All Departments)',
                summary TEXT,
                about TEXT,
                themes TEXT DEFAULT '[]',
                guidelines_link TEXT,
                important_dates TEXT DEFAULT '[]',
                organizers TEXT DEFAULT '[]',
                registration_link TEXT DEFAULT '/create-team',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);")
        seed_initial_events(cursor, "?")

        conn.commit()
        conn.close()
        print("SQLite database initialized successfully!")

def get_system_setting(key, default=None):
    try:
        conn = get_db()
        cursor = conn.cursor()
        p = "%s" if is_postgres() else "?"
        cursor.execute(f"SELECT value FROM system_settings WHERE key = {p}", (key,))
        row = cursor.fetchone()
        conn.close()
        if row:
            if hasattr(row, '__getitem__'):
                return row["value"] if isinstance(row, dict) or hasattr(row, 'keys') else row[0]
            return row[0]
        return default
    except Exception as e:
        print(f"Error fetching system setting {key}: {e}")
        return default

def set_system_setting(key, value):
    try:
        conn = get_db()
        cursor = conn.cursor()
        p = "%s" if is_postgres() else "?"
        val_str = str(value)
        if is_postgres():
            cursor.execute(f"""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ({p}, {p}, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
            """, (key, val_str))
        else:
            cursor.execute(f"""
                INSERT INTO system_settings (key, value, updated_at)
                VALUES ({p}, {p}, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
            """, (key, val_str))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error setting system setting {key}: {e}")
        return False

if __name__ == "__main__":
    init_db()
