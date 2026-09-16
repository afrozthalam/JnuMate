import os
import json
import random
import datetime
import smtplib
import threading
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, jsonify, session
from database import get_db, init_db, is_postgres, get_system_setting, set_system_setting

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY") or os.environ.get("FLASK_SECRET_KEY") or "jnumate_liquid_permanent_secret_key_2026_prod"
app.permanent_session_lifetime = datetime.timedelta(days=365)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True

# Initialize database
try:
    init_db()
except Exception as e:
    print(f"Database init notice: {e}")

# Load all_profiles_public.json into memory for instant lookup
PROFILES_JSON_PATH = os.path.join(os.path.dirname(__file__), "all_profiles_public.json")
STUDENT_PROFILES_MAP = {}

def load_json_profiles():
    global STUDENT_PROFILES_MAP
    if os.path.exists(PROFILES_JSON_PATH):
        try:
            with open(PROFILES_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    r_id = item.get("id")
                    if r_id:
                        STUDENT_PROFILES_MAP[r_id.strip().upper()] = item
            print(f"[JSON PROFILES LOADED] Successfully cached {len(STUDENT_PROFILES_MAP)} profiles into memory.")
        except Exception as e:
            print(f"[JSON LOAD ERROR] {e}")

load_json_profiles()

# BREVO & SMTP CONFIGURATION
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp-relay.brevo.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER or "noreply@jnumate.edu")

EDUCATION_DB_PATH = os.path.join(os.path.dirname(__file__), "education_details.db")
EDUCATION_DETAILS_MAP = {}

def load_education_details():
    global EDUCATION_DETAILS_MAP
    if os.path.exists(EDUCATION_DB_PATH):
        try:
            import sqlite3
            e_conn = sqlite3.connect(EDUCATION_DB_PATH)
            e_cur = e_conn.cursor()
            e_cur.execute("SELECT r_id, program, semester_year FROM education_details")
            for row in e_cur.fetchall():
                if row[0]:
                    key = str(row[0]).strip().upper()
                    p_val = str(row[1]).strip() if row[1] else None
                    s_val = str(row[2]).strip() if row[2] else None
                    EDUCATION_DETAILS_MAP[key] = (p_val, s_val)
            e_conn.close()
            print(f"[EDUCATION DB LOADED] Cached {len(EDUCATION_DETAILS_MAP)} student education records.")
        except Exception as e:
            print(f"Notice loading education details: {e}")

load_education_details()

# DETERMINISTIC ACADEMIC YEAR INFERENCE FROM R-ID
def get_academic_year_by_rid(student_id):
    if not student_id:
        return "Student", None
    s_id = str(student_id).strip().upper()
    if s_id.startswith("R"):
        try:
            id_num = int(s_id[1:])
            if 0 <= id_num <= 42260:
                return "Passed Out Student", None
            elif 42261 <= id_num <= 50190:
                return "4th Year Student", "2023"
            elif 50191 <= id_num <= 54323:
                return "3rd Year Student", "2024"
            elif 54324 <= id_num <= 59643:
                return "2nd Year Student", "2025"
            elif id_num >= 59644:
                return "1st Year Student", "2026"
        except ValueError:
            pass
    return "Student", None

# PRE-INDEXED FAST STUDENT SEARCH CACHE
SEARCHABLE_STUDENTS_LIST = []
STUDENT_CACHE_BY_RID = {}

DEFAULT_AVATAR_PATH = "/static/img/blank_pfp.jpg"

def is_valid_student_image(img_url, expected_rid=None):
    if not img_url or not isinstance(img_url, str):
        return False
    u = img_url.strip()
    if not u or u.endswith("/") or "demo/avatars" in u or "SIGNATURE" in u or "dicebear" in u:
        return False
    # If the image filename references a specific R-ID, verify it matches
    m = re.search(r'(R\d+)\.(jpg|jpeg|png)', u, re.IGNORECASE)
    if m:
        rid_in_img = m.group(1).upper()
        if expected_rid and rid_in_img != str(expected_rid).strip().upper():
            return False
    return True

def build_student_search_index():
    global SEARCHABLE_STUDENTS_LIST, STUDENT_CACHE_BY_RID
    SEARCHABLE_STUDENTS_LIST = []
    STUDENT_CACHE_BY_RID = {}
    
    for r_id_key, item in STUDENT_PROFILES_MAP.items():
        name = (item.get("name") or "Unknown Student").strip()
        personal = item.get("personal_details", {}) or {}
        email = (personal.get("EmailID") or f"{r_id_key}@student.edu").strip()
        phone = (personal.get("Mobile No") or "").strip()
        gender = personal.get("Gender") or "Other"
        dob = (personal.get("Date of Birth") or "N/A").strip()
        gender_clean = "Female" if "Female" in gender or "F" == gender else ("Male" if "Male" in gender or "M" == gender else "Other")
        image_urls = item.get("image_urls") or []
        first_img = image_urls[0] if image_urls else ""
        if is_valid_student_image(first_img, r_id_key):
            avatar_url = first_img
        else:
            avatar_url = DEFAULT_AVATAR_PATH
        
        prog, sem = EDUCATION_DETAILS_MAP.get(r_id_key, (None, None))
        acad_yr, adm_yr = get_academic_year_by_rid(r_id_key)
        
        name_upper = name.upper()
        clean_name = re.sub(r'^(MR\.|MS\.|MRS\.|DR\.)\s*', '', name_upper).strip()
        name_words = [w for w in re.split(r'[\s\-_,.]+', clean_name) if w]

        student_obj = {
            "r_id": r_id_key,
            "name": name,
            "name_upper": name_upper,
            "clean_name": clean_name,
            "name_words": name_words,
            "email": email,
            "email_upper": email.upper(),
            "phone": phone,
            "gender": gender_clean,
            "dob": dob,
            "avatar_url": avatar_url,
            "program": prog or "Student",
            "semester_year": sem or "",
            "academic_year": acad_yr,
            "admission_year": adm_yr
        }
        SEARCHABLE_STUDENTS_LIST.append(student_obj)
        STUDENT_CACHE_BY_RID[r_id_key] = student_obj

    # Also synchronize any students from database (e.g. manual registrations or updated profiles)
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT r_id, name, email, phone, gender, dob, avatar_url, program, semester_year FROM students")
        db_students = cursor.fetchall()
        for row in db_students:
            r = dict(row)
            rid = str(r.get("r_id") or "").strip().upper()
            if not rid:
                continue
            name = (r.get("name") or "Student").strip()
            email = (r.get("email") or f"{rid}@student.edu").strip()
            phone = (r.get("phone") or "").strip()
            gender = r.get("gender") or "Other"
            dob = (r.get("dob") or "N/A").strip()
            gender_clean = "Female" if "Female" in gender or "F" == gender else ("Male" if "Male" in gender or "M" == gender else "Other")
            avatar_url = r.get("avatar_url")
            prog = r.get("program")
            sem = r.get("semester_year")
            acad_yr, adm_yr = get_academic_year_by_rid(rid)

            if rid in STUDENT_CACHE_BY_RID:
                cached = STUDENT_CACHE_BY_RID[rid]
                if name and (not cached.get("name") or cached.get("name") == "Unknown Student" or cached.get("name") == "Student"):
                    cached["name"] = name
                    cached["name_upper"] = name.upper()
                    clean_name = re.sub(r'^(MR\.|MS\.|MRS\.|DR\.)\s*', '', cached["name_upper"]).strip()
                    cached["clean_name"] = clean_name
                    cached["name_words"] = [w for w in re.split(r'[\s\-_,.]+', clean_name) if w]
                if prog and (not cached.get("program") or cached.get("program") == "Student"):
                    cached["program"] = prog
                if sem and not cached.get("semester_year"):
                    cached["semester_year"] = sem
                if email and not cached.get("email"):
                    cached["email"] = email
                    cached["email_upper"] = email.upper()
                if phone and not cached.get("phone"):
                    cached["phone"] = phone
                if avatar_url and (not cached.get("avatar_url") or cached.get("avatar_url") == DEFAULT_AVATAR_PATH):
                    if is_valid_student_image(avatar_url, rid):
                        cached["avatar_url"] = avatar_url
            else:
                name_upper = name.upper()
                clean_name = re.sub(r'^(MR\.|MS\.|MRS\.|DR\.)\s*', '', name_upper).strip()
                name_words = [w for w in re.split(r'[\s\-_,.]+', clean_name) if w]
                student_obj = {
                    "r_id": rid,
                    "name": name,
                    "name_upper": name_upper,
                    "clean_name": clean_name,
                    "name_words": name_words,
                    "email": email,
                    "email_upper": email.upper(),
                    "phone": phone,
                    "gender": gender_clean,
                    "dob": dob,
                    "avatar_url": avatar_url if is_valid_student_image(avatar_url, rid) else DEFAULT_AVATAR_PATH,
                    "program": prog or "Student",
                    "semester_year": sem or "",
                    "academic_year": acad_yr,
                    "admission_year": adm_yr
                }
                SEARCHABLE_STUDENTS_LIST.append(student_obj)
                STUDENT_CACHE_BY_RID[rid] = student_obj
        conn.close()
    except Exception as e:
        print(f"Notice syncing DB students into search index: {e}")

    print(f"[SEARCH INDEX BUILT] Pre-indexed {len(SEARCHABLE_STUDENTS_LIST)} students for instant sub-millisecond search.")

build_student_search_index()

def add_or_update_student_in_search_index(rid, name, email, program=None, avatar_url=None, gender=None, dob=None):
    global SEARCHABLE_STUDENTS_LIST, STUDENT_CACHE_BY_RID
    clean_rid = str(rid).strip().upper()
    acad_yr, adm_yr = get_academic_year_by_rid(clean_rid)
    if clean_rid in STUDENT_CACHE_BY_RID:
        s = STUDENT_CACHE_BY_RID[clean_rid]
        if name:
            s["name"] = name
            s["name_upper"] = name.upper()
            clean_name = re.sub(r'^(MR\.|MS\.|MRS\.|DR\.)\s*', '', s["name_upper"]).strip()
            s["clean_name"] = clean_name
            s["name_words"] = [w for w in re.split(r'[\s\-_,.]+', clean_name) if w]
        if email:
            s["email"] = email
            s["email_upper"] = email.upper()
        if program:
            s["program"] = program
        if avatar_url:
            s["avatar_url"] = avatar_url
    else:
        name_val = (name or "Student").strip()
        name_upper = name_val.upper()
        clean_name = re.sub(r'^(MR\.|MS\.|MRS\.|DR\.)\s*', '', name_upper).strip()
        name_words = [w for w in re.split(r'[\s\-_,.]+', clean_name) if w]
        email_val = email or f"{clean_rid}@student.edu"
        gender_clean = "Female" if gender and ("Female" in gender or "F" == gender) else "Male"
        s = {
            "r_id": clean_rid,
            "name": name_val,
            "name_upper": name_upper,
            "clean_name": clean_name,
            "name_words": name_words,
            "email": email_val,
            "email_upper": email_val.upper(),
            "phone": "",
            "gender": gender_clean,
            "dob": dob or "N/A",
            "avatar_url": avatar_url,
            "program": program or "Student",
            "semester_year": "",
            "academic_year": acad_yr,
            "admission_year": adm_yr
        }
        SEARCHABLE_STUDENTS_LIST.append(s)
        STUDENT_CACHE_BY_RID[clean_rid] = s

# ZERO-LATENCY IN-MEMORY TEAM MEMBERSHIP CACHE
TEAM_MEMBERSHIP_MAP = {}

def refresh_team_membership_cache():
    global TEAM_MEMBERSHIP_MAP
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT tm.student_r_id, t.name, t.id FROM team_members tm JOIN teams t ON tm.team_id = t.id")
        rows = cursor.fetchall()
        m_map = {}
        for row in rows:
            r_dict = dict(row)
            rid = str(r_dict["student_r_id"]).strip().upper()
            m_map[rid] = {
                "team_name": r_dict["name"],
                "team_id": r_dict["id"]
            }
        TEAM_MEMBERSHIP_MAP = m_map
        conn.close()
    except Exception as e:
        print(f"Notice caching team membership: {e}")

refresh_team_membership_cache()

def get_placeholder():
    return "%s" if is_postgres() else "?"

def get_student_course_details(r_id, cursor=None):
    if not r_id:
        return None, None
    clean_rid = str(r_id).strip().upper()
    p = get_placeholder()
    
    # 1. Check students table first if cursor provided
    if cursor:
        try:
            cursor.execute(f"SELECT program, semester_year FROM students WHERE UPPER(r_id) = {p}", (clean_rid,))
            row = cursor.fetchone()
            if row:
                prog = row["program"] if hasattr(row, '__getitem__') else row[0]
                sem = row["semester_year"] if hasattr(row, '__getitem__') else row[1]
                if prog and str(prog).strip() and str(prog).strip().lower() != "student":
                    return str(prog).strip(), (str(sem).strip() if sem else None)
        except Exception:
            pass

    # 2. In-memory cache lookup from education_details
    if clean_rid in EDUCATION_DETAILS_MAP:
        prog, sem = EDUCATION_DETAILS_MAP[clean_rid]
        if prog and str(prog).strip() and str(prog).strip().lower() != "student":
            return str(prog).strip(), (str(sem).strip() if sem else None)

    # 3. If cursor was not provided, open DB connection to check persistent students table
    if not cursor:
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute(f"SELECT program, semester_year FROM students WHERE UPPER(r_id) = {p}", (clean_rid,))
            row = c.fetchone()
            conn.close()
            if row:
                prog = row["program"] if hasattr(row, '__getitem__') else row[0]
                sem = row["semester_year"] if hasattr(row, '__getitem__') else row[1]
                if prog and str(prog).strip() and str(prog).strip().lower() != "student":
                    return str(prog).strip(), (str(sem).strip() if sem else None)
        except Exception:
            pass

    return None, None

def send_real_email_otp(target_email, r_id, otp_code):
    is_email_on = str(get_system_setting("otp_email_enabled", "true")).lower() == "true"
    if not is_email_on:
        print(f"[BREVO EMAIL BLOCKED] OTP email dispatch is toggled OFF by Admin. No email sent to {target_email}.")
        return False, "Email dispatch disabled by administrator"

    subject = f"{otp_code} is your JnuMate Verification Code"
    
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color: #F8F9FA; color: #202124; font-family: 'Outfit', sans-serif; padding: 40px 20px; margin: 0;">
    <div style="max-width: 420px; margin: 0 auto; background: #FFFFFF; border: 1px solid #DADCE0; border-radius: 20px; padding: 32px; box-shadow: 0 1px 3px rgba(60,64,67,0.15);">
        <div style="font-size: 22px; font-weight: 800; color: #0D321F; margin-bottom: 16px;">
            JnuMate<span style="color:#25D366;">.</span>
        </div>
        <div style="font-size: 14px; color: #5F6368; margin-bottom: 8px;">Verification Code for Student <b>{r_id}</b></div>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #13432C; margin: 20px 0; padding: 16px; background: #E8F5E9; border-radius: 12px; text-align: center;">{otp_code}</div>
        <div style="font-size: 12px; color: #5F6368; line-height: 1.5;">This code will expire in 15 minutes. If you did not request this code, please ignore this email.</div>
    </div>
</body>
</html>"""

    if SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"JnuMate <{SMTP_FROM}>"
            msg["To"] = target_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_FROM, [target_email], msg.as_string())
            
            print(f"[BREVO EMAIL SENT] Successfully dispatched OTP {otp_code} to {target_email}")
            return True, "Email dispatched via Brevo SMTP"
        except Exception as e:
            print(f"[SMTP ERROR] Failed to send email via {SMTP_SERVER}: {e}")
            return False, f"SMTP Error: {str(e)}"
    else:
        print(f"[BREVO CONFIG NOTICE] SMTP_USER & SMTP_PASS not set. Simulated OTP Code: {otp_code} for {target_email}")
        return True, "OTP generated"

def mask_email(email):
    if not email or "@" not in email:
        return "your registered email"
    parts = email.split("@")
    name = parts[0]
    domain = parts[1]
    masked = name[0] + "•••" + (name[-1] if len(name) > 1 else "")
    return f"{masked}@{domain}"

def auto_import_student_from_json(r_id, conn, cursor):
    p = get_placeholder()
    item = STUDENT_PROFILES_MAP.get(r_id.upper())
    if not item:
        return None

    name = (item.get("name") or "Unknown Student").strip()
    personal = item.get("personal_details", {}) or {}
    
    email = (personal.get("EmailID") or f"{r_id}@student.edu").strip()
    phone = (personal.get("Mobile No") or "").strip()
    gender = personal.get("Gender") or "Not Specified"
    dob = (personal.get("Date of Birth") or "N/A").strip()
    
    gender_clean = gender.strip().capitalize() if gender else "Unspecified"
    if "Female" in gender_clean or "F" == gender_clean:
        gender_clean = "Female"
    elif "Male" in gender_clean or "M" == gender_clean:
        gender_clean = "Male"
    else:
        gender_clean = "Other"

    image_urls = item.get("image_urls") or []
    first_img = image_urls[0] if image_urls else ""
    if is_valid_student_image(first_img, r_id):
        avatar_url = first_img
    else:
        avatar_url = DEFAULT_AVATAR_PATH

    prog, sem = EDUCATION_DETAILS_MAP.get(r_id.upper(), (None, None))

    try:
        cursor.execute(f"""
            INSERT INTO students (r_id, name, email, phone, gender, dob, avatar_url, program, semester_year, is_registered)
            VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, 0)
        """, (r_id.upper(), name, email, phone, gender_clean, dob, avatar_url, prog or "Student", sem or ""))
        conn.commit()
    except Exception as e:
        try:
            cursor.execute(f"""
                INSERT INTO students (r_id, name, email, phone, gender, dob, avatar_url, is_registered)
                VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, 0)
            """, (r_id.upper(), name, email, phone, gender_clean, dob, avatar_url))
            conn.commit()
        except Exception:
            pass

    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id.upper(),))
    return cursor.fetchone()

@app.route("/")
@app.route("/team/<int:team_id>")
@app.route("/create-team")
@app.route("/profile")
@app.route("/login")
@app.route("/students")
@app.route("/about")
@app.route("/admin")
def index(team_id=None):
    return render_template("index.html")

# --- ADMIN CREDENTIALS & CONTROL ENDPOINTS ---
ADMIN_USERNAME = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASS", "hehenewpassword@123")

@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.json or {}
    username = (data.get("username") or data.get("user_id") or "").strip()
    password = (data.get("password") or "").strip()
    if username.lower() == ADMIN_USERNAME.lower() and password == ADMIN_PASSWORD:
        session["is_admin"] = True
        session.permanent = True
        return jsonify({"success": True, "message": "Admin authenticated successfully"})
    return jsonify({"success": False, "message": "Invalid admin user ID or password"}), 401

@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("is_admin", None)
    return jsonify({"success": True, "message": "Admin signed out"})

@app.route("/api/admin/status", methods=["GET"])
def admin_status():
    return jsonify({
        "success": True,
        "authenticated": bool(session.get("is_admin"))
    })

@app.route("/api/admin/settings", methods=["GET", "POST"])
def admin_settings():
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    if request.method == "POST":
        data = request.json or {}
        if "otp_email_enabled" in data:
            val = "true" if data["otp_email_enabled"] in [True, "true", "True", 1, "1"] else "false"
            set_system_setting("otp_email_enabled", val)
        if "default_bypass_otp" in data and str(data["default_bypass_otp"]).strip():
            set_system_setting("default_bypass_otp", str(data["default_bypass_otp"]).strip())
        return jsonify({
            "success": True,
            "message": "System settings saved successfully",
            "otp_email_enabled": str(get_system_setting("otp_email_enabled", "true")).lower() == "true",
            "default_bypass_otp": get_system_setting("default_bypass_otp", "123456")
        })

    return jsonify({
        "success": True,
        "otp_email_enabled": str(get_system_setting("otp_email_enabled", "true")).lower() == "true",
        "default_bypass_otp": get_system_setting("default_bypass_otp", "123456")
    })

@app.route("/api/admin/stats", methods=["GET"])
def admin_stats():
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    try:
        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM students WHERE is_registered = 1")
        reg_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM teams")
        teams_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM teams WHERE LOWER(hackathon_type) = 'sih'")
        sih_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM teams WHERE LOWER(hackathon_type) = 'ctf'")
        ctf_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM team_members")
        members_count = cursor.fetchone()[0]

        # Calculate open slots across all teams (Postgres compatible GROUP BY t.id, t.seat_modes)
        cursor.execute("SELECT t.id, t.seat_modes, COUNT(tm.id) as filled FROM teams t LEFT JOIN team_members tm ON t.id = tm.team_id GROUP BY t.id, t.seat_modes")
        team_seat_rows = cursor.fetchall()
        open_slots_count = 0
        for row in team_seat_rows:
            r_dict = dict(row)
            modes_str = r_dict.get("seat_modes") or "request,request,request,request,request"
            modes = [m.strip().lower() for m in modes_str.split(",") if m.strip()]
            filled = r_dict.get("filled", 1)
            total_seats = 1 + len(modes)
            open_seats = max(0, total_seats - filled)
            open_slots_count += open_seats

        cursor.execute("SELECT id, r_id, email, used, created_at FROM email_otps ORDER BY id DESC LIMIT 15")
        otp_rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
    except Exception as e:
        print(f"[ADMIN STATS NOTICE] {e}")
        reg_count = 0
        teams_count = 0
        sih_count = 0
        ctf_count = 0
        members_count = 0
        open_slots_count = 0
        otp_rows = []

    otp_on = str(get_system_setting("otp_email_enabled", "true")).lower() == "true"
    bypass_code = get_system_setting("default_bypass_otp", "123456")

    return jsonify({
        "success": True,
        "stats": {
            "total_students": len(STUDENT_PROFILES_MAP) or 16199,
            "registered_students": reg_count,
            "total_teams": teams_count,
            "sih_teams": sih_count,
            "ctf_teams": ctf_count,
            "total_members": members_count,
            "open_slots": open_slots_count,
            "otp_email_enabled": otp_on,
            "default_bypass_otp": bypass_code
        },
        "recent_activity": otp_rows
    })

@app.route("/api/admin/activity", methods=["GET"])
def admin_activity():
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT r_id, name, email, phone, gender, program, semester_year, is_registered
            FROM students
            WHERE is_registered = 1
            ORDER BY r_id DESC
            LIMIT 100
        """)
        registered_students = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
            SELECT id, r_id, email, otp, used, created_at
            FROM email_otps
            ORDER BY id DESC
            LIMIT 30
        """)
        recent_otps = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
            SELECT id, name, leader_r_id, hackathon_type, created_at
            FROM teams
            ORDER BY id DESC
            LIMIT 30
        """)
        recent_teams = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
            SELECT jr.id, jr.team_id, jr.student_r_id, jr.message, jr.status, jr.created_at, t.name as team_name, s.name as student_name
            FROM join_requests jr
            LEFT JOIN teams t ON jr.team_id = t.id
            LEFT JOIN students s ON UPPER(jr.student_r_id) = UPPER(s.r_id)
            ORDER BY jr.id DESC
            LIMIT 30
        """)
        recent_requests = [dict(r) for r in cursor.fetchall()]
        conn.close()

        return jsonify({
            "success": True,
            "registered_students": registered_students,
            "recent_otps": recent_otps,
            "recent_teams": recent_teams,
            "recent_requests": recent_requests
        })
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500




# --- AUTH ENDPOINTS ---

@app.route("/api/auth/send-otp", methods=["POST"])
@app.route("/api/auth/request-otp", methods=["POST"])
def auth_send_otp():
    data = request.json or {}
    r_id = (data.get("rid") or data.get("r_id") or "").strip().upper()
    p = get_placeholder()

    if not r_id:
        return jsonify({"success": False, "message": "Please enter your R-ID"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
    student = cursor.fetchone()

    if not student:
        student = auto_import_student_from_json(r_id, conn, cursor)

    if not student:
        conn.close()
        return jsonify({
            "success": False,
            "not_found": True,
            "message": "Due to server load we couldn't fetch your data. Enter your details manually to continue."
        }), 200

    student_dict = dict(student)
    email = student_dict.get("email") or f"{r_id}@student.edu"
    name = student_dict.get("name") or "Student"
    dob = student_dict.get("dob") or "N/A"
    gender = student_dict.get("gender") or "Student"
    avatar_url = student_dict.get("avatar_url") or student_dict.get("image_url")

    # Enrich from memory cache if available
    cached = STUDENT_CACHE_BY_RID.get(r_id)
    prog = None
    sem = None
    if cached:
        avatar_url = cached.get("avatar_url") or avatar_url
        prog = cached.get("program")
        sem = cached.get("semester_year")
        if not dob or dob == "N/A":
            dob = cached.get("dob") or dob
        if not name or name == "Student":
            name = cached.get("name") or name

    if not prog:
        p_val, s_val = EDUCATION_DETAILS_MAP.get(r_id, (None, None))
        prog = p_val or student_dict.get("program") or "Student"
        sem = s_val or student_dict.get("semester") or ""

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.now() + datetime.timedelta(hours=24)

    print(f"\n==========================================")
    print(f" [OTP GENERATED] R-ID: {r_id} | Email: {email} | CODE: {otp_code}")
    print(f"==========================================\n")

    # Store OTP with generous 24h validity window
    cursor.execute(f"""
        INSERT INTO email_otps (r_id, email, otp, expires_at, used)
        VALUES ({p}, {p}, {p}, {p}, 0)
    """, (r_id, email, str(otp_code), str(expires_at)))
    conn.commit()
    conn.close()

    acad_yr, adm_yr = get_academic_year_by_rid(r_id)
    json_item = STUDENT_PROFILES_MAP.get(r_id) or {}
    personal_data = json_item.get("personal_details", {}) or {}
    addr_data = json_item.get("address_details", {}) or {}
    
    state_val = addr_data.get("Correspondence State") or addr_data.get("Permanent State") or "Not Provided"
    if not state_val or str(state_val).strip() in ["", "None", "-1", "null"]:
        state_val = "Not Provided"
    else:
        state_val = str(state_val).strip()

    dob_val = personal_data.get("Date of Birth") or dob or "Not Provided"
    if not dob_val or str(dob_val).strip() in ["", "None", "-1", "null"]:
        dob_val = "Not Provided"
    else:
        dob_val = str(dob_val).strip()

    gender_val = personal_data.get("Gender") or gender or "Not Specified"
    if not gender_val or str(gender_val).strip() in ["", "None", "-1", "null"]:
        gender_val = "Not Specified"
    else:
        gender_val = str(gender_val).strip()

    # Check if admin has enabled real email dispatch
    is_email_on = str(get_system_setting("otp_email_enabled", "true")).lower() == "true"
    if is_email_on:
        # Dispatch email asynchronously in background thread so HTTP response is instant (<10ms)
        threading.Thread(target=send_real_email_otp, args=(email, r_id, otp_code), daemon=True).start()
    else:
        print(f"[BREVO EMAIL DISPATCH BYPASSED] OTP emails toggled OFF in Admin. No email sent to {email}.")

    return jsonify({
        "success": True,
        "exists": True,
        "message": f"Verification code sent to {email}",
        "email": email,
        "masked_email": email,  # User explicitly requested DO NOT CENSOR
        "student": {
            "r_id": r_id,
            "name": name,
            "dob": dob_val,
            "gender": gender_val,
            "email": email,
            "jnu_email": email,
            "state": state_val,
            "avatar_url": avatar_url,
            "program": prog or "Student",
            "semester": sem or "",
            "current_year": acad_yr,
            "academic_year": acad_yr,
            "admission_year": adm_yr
        }
    })

@app.route("/api/auth/send-registration-otp", methods=["POST"])
def auth_send_registration_otp():
    data = request.json or {}
    r_id = (data.get("rid") or data.get("r_id") or "").strip().upper()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    program = data.get("program", "").strip()
    gender = (data.get("gender") or "Other").strip().capitalize()
    if gender not in ["Male", "Female", "Other"]:
        gender = "Other"
    p = get_placeholder()

    if not r_id or not name or not email or not program:
        return jsonify({"success": False, "message": "R-ID, Name, Email, and Course are required"}), 400

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.now() + datetime.timedelta(hours=24)

    print(f"\n==========================================")
    print(f" [REGISTRATION OTP] R-ID: {r_id} | Email: {email} | CODE: {otp_code} | Program: {program}")
    print(f"==========================================\n")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"""
        INSERT INTO email_otps (r_id, email, otp, expires_at, used)
        VALUES ({p}, {p}, {p}, {p}, 0)
    """, (r_id, email, str(otp_code), str(expires_at)))
    conn.commit()
    conn.close()

    is_email_on = str(get_system_setting("otp_email_enabled", "true")).lower() == "true"
    if is_email_on:
        threading.Thread(target=send_real_email_otp, args=(email, r_id, otp_code), daemon=True).start()
    else:
        print(f"[BREVO EMAIL DISPATCH BYPASSED] Registration OTP emails toggled OFF in Admin. No email sent to {email}.")

    return jsonify({
        "success": True,
        "message": f"Verification code sent to {email}",
        "email": email,
        "masked_email": email
    })

@app.route("/api/auth/verify-otp", methods=["POST"])
def auth_verify_otp():
    data = request.json or {}
    r_id = (data.get("rid") or data.get("r_id") or "").strip().upper()
    raw_otp = str(data.get("otp", "")).strip()
    otp_code = "".join(ch for ch in raw_otp if ch.isdigit())
    p = get_placeholder()

    if not r_id or not otp_code:
        return jsonify({"success": False, "message": "R-ID and 6-digit verification code are required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
    student = cursor.fetchone()

    if not student:
        student = auto_import_student_from_json(r_id, conn, cursor)

    # If student is still not in DB, establish student record with provided or default data
    if not student:
        name = (data.get("name") or f"Student {r_id}").strip()
        email = (data.get("email") or f"{r_id.lower()}@student.edu").strip()
        program = (data.get("program") or "").strip()
        gender = (data.get("gender") or "Other").strip().capitalize()
        if gender not in ["Male", "Female", "Other"]:
            gender = "Other"
        avatar_url = DEFAULT_AVATAR_PATH
        try:
            cursor.execute(f"""
                INSERT INTO students (r_id, name, email, program, gender, dob, is_registered, avatar_url)
                VALUES ({p}, {p}, {p}, {p}, {p}, 'N/A', 1, {p})
            """, (r_id, name, email, program, gender, avatar_url))
            conn.commit()
            cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
            student = cursor.fetchone()
        except Exception as e:
            print(f"Notice student auto-create: {e}")
    elif data.get("gender"):
        clean_g = str(data.get("gender")).strip().capitalize()
        if clean_g in ["Male", "Female", "Other"]:
            try:
                cursor.execute(f"UPDATE students SET gender = {p} WHERE UPPER(r_id) = {p}", (clean_g, r_id))
                conn.commit()
                cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
                student = cursor.fetchone()
            except Exception:
                pass

    # Robust matching:
    # 1. Match against any OTP issued for this R-ID
    cursor.execute(f"""
        SELECT * FROM email_otps
        WHERE UPPER(r_id) = {p} AND TRIM(otp) = {p}
        ORDER BY id DESC LIMIT 1
    """, (r_id, otp_code))
    matching_otp = cursor.fetchone()

    # 2. Get the latest OTP generated for this R-ID
    cursor.execute(f"""
        SELECT * FROM email_otps
        WHERE UPPER(r_id) = {p}
        ORDER BY id DESC LIMIT 1
    """, (r_id,))
    latest_otp = cursor.fetchone()

    is_email_on = str(get_system_setting("otp_email_enabled", "true")).lower() == "true"
    bypass_otp = str(get_system_setting("default_bypass_otp", "123456")).strip()

    is_valid = False
    matched_id = None

    if matching_otp:
        is_valid = True
        matched_id = matching_otp["id"]
    elif latest_otp and str(latest_otp["otp"]).strip() == otp_code:
        is_valid = True
        matched_id = latest_otp["id"]
    elif not is_email_on and (otp_code == bypass_otp or otp_code == "123456"):
        is_valid = True
        if latest_otp:
            matched_id = latest_otp["id"]

    if not is_valid:
        conn.close()
        return jsonify({"success": False, "message": "Incorrect verification code. Please check and try again."}), 200

    # Mark OTP used and mark student as registered
    if matched_id:
        cursor.execute(f"UPDATE email_otps SET used = 1 WHERE id = {p}", (matched_id,))
    else:
        cursor.execute(f"UPDATE email_otps SET used = 1 WHERE UPPER(r_id) = {p}", (r_id,))

    cursor.execute(f"UPDATE students SET is_registered = 1 WHERE UPPER(r_id) = {p}", (r_id,))
    conn.commit()

    cursor.execute(f"SELECT r_id, name, email, phone, gender, dob, avatar_url, is_registered, program, semester_year FROM students WHERE UPPER(r_id) = {p}", (r_id,))
    db_row = cursor.fetchone()
    updated_student = dict(db_row) if db_row else {}
    prog, sem = get_student_course_details(r_id, cursor)
    if not prog and updated_student.get("program"):
        p_cand = updated_student.get("program")
        if p_cand and str(p_cand).strip().lower() != "student":
            prog = str(p_cand).strip()
    if not sem and updated_student.get("semester_year"):
        sem = updated_student.get("semester_year")

    is_needs_prog = (not bool(prog)) or (str(prog).strip().lower() == "student")

    cursor.execute(f"""
        SELECT tm.team_id, t.name as team_name 
        FROM team_members tm 
        LEFT JOIN teams t ON tm.team_id = t.id 
        WHERE UPPER(tm.student_r_id) = {p}
    """, (r_id,))
    tm_row = cursor.fetchone()
    team_id = tm_row["team_id"] if tm_row else None
    team_name = tm_row["team_name"] if tm_row else None
    conn.close()

    session["user_rid"] = r_id
    session.permanent = True

    student_name = (updated_student.get("name") or f"Student {r_id}").strip()
    raw_av = updated_student.get("avatar_url")
    clean_av = raw_av if is_valid_student_image(raw_av, r_id) else DEFAULT_AVATAR_PATH

    user_payload = {
        "id": r_id,
        "name": student_name,
        "email": updated_student.get("email") or f"{r_id.lower()}@student.edu",
        "gender": updated_student.get("gender") or "Student",
        "dob": updated_student.get("dob") or "N/A",
        "avatar_url": clean_av,
        "program": prog,
        "semester_year": sem,
        "needs_program": is_needs_prog,
        "team_id": team_id,
        "team_name": team_name
    }

    try:
        add_or_update_student_in_search_index(
            r_id,
            student_name,
            user_payload["email"],
            program=prog,
            avatar_url=user_payload["avatar_url"],
            gender=user_payload["gender"],
            dob=user_payload["dob"]
        )
    except Exception as e:
        print(f"Notice updating search index on verify: {e}")

    return jsonify({
        "success": True,
        "message": "Signed in successfully",
        "user": user_payload,
        "needs_program": is_needs_prog,
        "student": updated_student
    })

@app.route("/api/user/update-program", methods=["POST"])
def update_user_program():
    data = request.json or {}
    r_id = (data.get("r_id") or session.get("user_rid") or "").strip().upper()
    program = data.get("program", "").strip()
    semester_year = data.get("semester_year", "").strip()
    p = get_placeholder()

    if not r_id:
        return jsonify({"success": False, "message": "Authentication required"}), 401
    if not program:
        return jsonify({"success": False, "message": "Please select your program"}), 400

    conn = get_db()
    cursor = conn.cursor()
    if semester_year:
        cursor.execute(f"UPDATE students SET program = {p}, semester_year = {p} WHERE UPPER(r_id) = {p}", (program, semester_year, r_id))
    else:
        cursor.execute(f"UPDATE students SET program = {p} WHERE UPPER(r_id) = {p}", (program, r_id))
    conn.commit()
    conn.close()

    EDUCATION_DETAILS_MAP[r_id] = (program, semester_year or "")
    if r_id in STUDENT_CACHE_BY_RID:
        STUDENT_CACHE_BY_RID[r_id]["program"] = program
        if semester_year:
            STUDENT_CACHE_BY_RID[r_id]["semester_year"] = semester_year

    return jsonify({
        "success": True,
        "message": "Program updated successfully",
        "program": program,
        "semester_year": semester_year
    })

@app.route("/api/auth/register", methods=["POST"])
@app.route("/api/auth/register-unlisted", methods=["POST"])
def auth_register():
    data = request.json or {}
    r_id = (data.get("id") or data.get("r_id") or "").strip().upper()
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    gender = data.get("gender", "").strip().capitalize()
    dob = data.get("dob", "").strip() or "N/A"
    program = (data.get("program") or "").strip()
    p = get_placeholder()

    if not r_id or not name or not gender or not email:
        return jsonify({"success": False, "message": "R-ID, Name, Email, and Gender are required"}), 400

    if gender not in ["Male", "Female", "Other"]:
        gender = "Other"

    avatar_url = DEFAULT_AVATAR_PATH

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            INSERT INTO students (r_id, name, email, phone, gender, dob, avatar_url, program, is_registered)
            VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, 1)
        """, (r_id, name, email, phone, gender, dob, avatar_url, program))
        conn.commit()
        conn.close()
    except Exception:
        conn.close()
        return jsonify({"success": False, "message": "R-ID already registered"}), 400

    session["user_rid"] = r_id
    session.permanent = True

    try:
        add_or_update_student_in_search_index(
            r_id,
            name,
            email,
            program=program,
            avatar_url=avatar_url,
            gender=gender,
            dob=dob
        )
    except Exception as e:
        print(f"Notice updating search index on register: {e}")

    user_payload = {
        "id": r_id,
        "name": name,
        "email": email,
        "gender": gender,
        "dob": dob,
        "avatar_url": avatar_url,
        "team_id": None,
        "team_name": None
    }

    return jsonify({
        "success": True,
        "message": "Account created",
        "user": user_payload,
        "student": {
            "r_id": r_id,
            "name": name,
            "email": email,
            "phone": phone,
            "gender": gender,
            "dob": dob,
            "avatar_url": avatar_url,
            "is_registered": 1
        }
    })

@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    user_rid = session.get("user_rid") or request.args.get("r_id", "").strip().upper()
    if not user_rid:
        return jsonify({"authenticated": False})

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (user_rid,))
    student = cursor.fetchone()

    if not student:
        student = auto_import_student_from_json(user_rid, conn, cursor)

    prog, sem = get_student_course_details(user_rid, cursor)
    if not prog and student:
        st_cand = dict(student).get("program")
        if st_cand and str(st_cand).strip().lower() != "student":
            prog = str(st_cand).strip()
    is_needs_prog = (not bool(prog)) or (str(prog).strip().lower() == "student")

    cursor.execute(f"""
        SELECT tm.team_id, t.name as team_name 
        FROM team_members tm 
        LEFT JOIN teams t ON tm.team_id = t.id 
        WHERE UPPER(tm.student_r_id) = {p}
    """, (user_rid,))
    tm_row = cursor.fetchone()
    team_id = tm_row["team_id"] if tm_row else None
    team_name = tm_row["team_name"] if tm_row else None
    conn.close()

    if not student:
        return jsonify({"authenticated": False})

    s_dict = dict(student)
    raw_av = s_dict.get("avatar_url")
    clean_av = raw_av if is_valid_student_image(raw_av, user_rid) else DEFAULT_AVATAR_PATH

    return jsonify({
        "authenticated": True,
        "user": {
            "id": s_dict["r_id"],
            "name": s_dict["name"],
            "email": s_dict["email"],
            "gender": s_dict["gender"],
            "dob": s_dict["dob"],
            "avatar_url": clean_av,
            "program": prog,
            "semester_year": sem,
            "needs_program": is_needs_prog,
            "team_id": team_id,
            "team_name": team_name
        }
    })

@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})

@app.route("/api/auth/restore-session", methods=["POST"])
def auth_restore_session():
    data = request.json or {}
    r_id = (data.get("r_id") or data.get("rid") or "").strip().upper()
    if not r_id:
        return jsonify({"success": False, "message": "R-ID required"}), 400

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
    student = cursor.fetchone()
    if not student:
        student = auto_import_student_from_json(r_id, conn, cursor)
    prog, sem = get_student_course_details(r_id, cursor)
    if not prog and student:
        st_cand = dict(student).get("program")
        if st_cand and str(st_cand).strip().lower() != "student":
            prog = str(st_cand).strip()
    is_needs_prog = (not bool(prog)) or (str(prog).strip().lower() == "student")
    conn.close()

    if not student:
        return jsonify({"success": False, "message": "Student record not found"}), 404

    session["user_rid"] = r_id
    session.permanent = True
    s_dict = dict(student)
    raw_av = s_dict.get("avatar_url")
    clean_av = raw_av if is_valid_student_image(raw_av, r_id) else DEFAULT_AVATAR_PATH
    return jsonify({
        "success": True,
        "authenticated": True,
        "user": {
            "id": s_dict["r_id"],
            "name": s_dict["name"],
            "email": s_dict["email"],
            "gender": s_dict["gender"],
            "dob": s_dict["dob"],
            "avatar_url": clean_av,
            "program": prog,
            "semester_year": sem,
            "needs_program": is_needs_prog
        }
    })

# --- STUDENT SEARCH (WITH DOB, EMAIL, PHOTO & DETAILS) ---

@app.route("/api/students/search", methods=["GET"])
def student_search():
    raw_query = request.args.get("q", "").strip()
    if not raw_query:
        return jsonify({"students": []})

    query = raw_query.upper()
    tokens = [t for t in re.split(r'[\s\-_,.]+', query) if t]
    if not tokens:
        return jsonify({"students": []})

    scored_candidates = []
    alphanumeric_query = re.sub(r'[^A-Z0-9]', '', query)

    for s in SEARCHABLE_STUDENTS_LIST:
        rid = s["r_id"]
        name_upper = s["name_upper"]
        email_upper = s.get("email_upper", "")

        # Fast rejection filter: tokens must match R-ID, name, or email
        if not any(t in rid or t in name_upper or t in email_upper for t in tokens):
            if not alphanumeric_query or alphanumeric_query not in rid:
                continue

        clean_name = s.get("clean_name") or name_upper
        name_words = s.get("name_words") or [clean_name]

        score = 0

        # 1. Exact R-ID match (Highest confidence)
        if rid == query or (alphanumeric_query and rid == alphanumeric_query):
            score += 12000
        # 2. R-ID prefix match
        elif rid.startswith(query) or (alphanumeric_query and rid.startswith(alphanumeric_query)):
            score += 7000 + int((len(query) / max(len(rid), 1)) * 1000)
        # 3. R-ID substring match
        elif query in rid or (alphanumeric_query and alphanumeric_query in rid):
            score += 4000

        # 4. Exact Full Clean Name match
        if clean_name == query or name_upper == query:
            score += 10000
        # 5. Clean Name starts with full query string
        elif clean_name.startswith(query) or name_upper.startswith(query):
            score += 6000
        # 6. Full query as contiguous substring in clean name
        elif query in clean_name or query in name_upper:
            score += 4500

        # 7. Multi-token evaluation across individual name words, R-ID, and email
        matched_token_count = 0
        token_prefix_points = 0

        for t in tokens:
            t_matched = False
            for nw in name_words:
                if nw == t:
                    token_prefix_points += 3000
                    t_matched = True
                    break
                elif nw.startswith(t):
                    token_prefix_points += 2000
                    t_matched = True
                    break
                elif t in nw:
                    token_prefix_points += 1000
                    t_matched = True
                    break
            
            if t_matched or (t in rid) or (t in email_upper):
                matched_token_count += 1

        if matched_token_count == len(tokens):
            score += 5000 + token_prefix_points
        elif matched_token_count > 0:
            score += (matched_token_count * 1200) + token_prefix_points

        if score > 0:
            # Prefer available students slightly so active squad builders see open peers first
            is_in_team = bool(TEAM_MEMBERSHIP_MAP.get(rid))
            if not is_in_team:
                score += 200

            scored_candidates.append((score, s))

    # Sort descending by score, then clean name
    scored_candidates.sort(key=lambda item: (-item[0], item[1].get("clean_name", item[1]["name_upper"])))

    results = []
    seen = set()
    for _, s in scored_candidates:
        if s["r_id"] not in seen:
            seen.add(s["r_id"])
            c_copy = dict(s)
            c_copy.pop("clean_name", None)
            c_copy.pop("name_words", None)
            c_copy.pop("email_upper", None)
            c_copy["rid"] = c_copy.get("r_id", "")
            tm = TEAM_MEMBERSHIP_MAP.get(c_copy["r_id"])
            if tm:
                c_copy["in_team"] = True
                c_copy["team_name"] = tm["team_name"]
                c_copy["team_id"] = tm["team_id"]
            else:
                c_copy["in_team"] = False
                c_copy["team_name"] = None
                c_copy["team_id"] = None
            results.append(c_copy)
            if len(results) >= 40:
                break

    # Fallback for unindexed valid R-IDs (e.g. R44190)
    if not results and (re.match(r'^R\d{3,7}$', alphanumeric_query) or (len(alphanumeric_query) >= 4 and alphanumeric_query.isdigit())):
        std_rid = alphanumeric_query if alphanumeric_query.startswith("R") else f"R{alphanumeric_query}"
        acad_yr, adm_yr = get_academic_year_by_rid(std_rid)
        tm = TEAM_MEMBERSHIP_MAP.get(std_rid)
        results.append({
            "r_id": std_rid,
            "rid": std_rid,
            "name": std_rid,
            "gender": "Student",
            "email": f"{std_rid.lower()}@student.edu",
            "avatar_url": None,
            "program": "Jaipur National University",
            "semester_year": "",
            "academic_year": acad_yr,
            "admission_year": adm_yr,
            "in_team": bool(tm),
            "team_name": tm["team_name"] if tm else None,
            "team_id": tm["team_id"] if tm else None,
            "is_unindexed_fallback": True
        })

    return jsonify({"students": results})

# --- NOTIFICATION ENGINE ---

def create_notification_db(cursor, p, recipient_r_id, title, message, notif_type="info", link=None):
    if not recipient_r_id:
        return
    try:
        cursor.execute(f"""
            INSERT INTO notifications (recipient_r_id, title, message, type, link, is_read)
            VALUES ({p}, {p}, {p}, {p}, {p}, 0)
        """, (str(recipient_r_id).strip().upper(), str(title), str(message), str(notif_type), link))
    except Exception as e:
        print(f"Notice inserting notification: {e}")

# --- TEAM MANAGEMENT & DETAILED PANEL ---

def format_team_data(team_row, current_r_id=None, conn=None):
    if not team_row:
        return None

    t_id = None
    t_name = "Untitled Team"
    t_desc = ""
    t_leader = ""
    t_wa = None
    t_created = ""
    raw_seat_modes = "request,request,request,request,request"

    try:
        if isinstance(team_row, dict) or hasattr(team_row, "keys"):
            row_keys = list(team_row.keys())
            t_id = team_row["id"] if "id" in row_keys else None
            t_name = team_row["name"] if "name" in row_keys else "Untitled Team"
            t_desc = team_row["description"] if "description" in row_keys else ""
            t_leader = team_row["leader_r_id"] if "leader_r_id" in row_keys else ""
            t_wa = team_row["whatsapp_link"] if "whatsapp_link" in row_keys else None
            t_created = str(team_row["created_at"]) if "created_at" in row_keys else ""
            raw_seat_modes = team_row["seat_modes"] if "seat_modes" in row_keys else "request,request,request,request,request"
            t_hackathon_type = team_row["hackathon_type"] if "hackathon_type" in row_keys and team_row["hackathon_type"] else "sih"
        elif isinstance(team_row, (list, tuple)):
            t_id = team_row[0]
            t_name = team_row[1] if len(team_row) > 1 else "Untitled Team"
            t_desc = team_row[2] if len(team_row) > 2 else ""
            t_leader = team_row[3] if len(team_row) > 3 else ""
            t_wa = team_row[4] if len(team_row) > 4 else None
            t_created = str(team_row[5]) if len(team_row) > 5 else ""
            raw_seat_modes = team_row[6] if len(team_row) > 6 else "request,request,request,request,request"
            t_hackathon_type = team_row[7] if len(team_row) > 7 and team_row[7] else "sih"
    except Exception as e:
        print(f"Error parsing team row: {e}")

    if not t_id:
        return None

    should_close = False
    if not conn:
        conn = get_db()
        should_close = True

    cursor = conn.cursor()
    p = get_placeholder()
    members = []
    user_status = "none"
    try:
        # Query team members directly with index lookup (sub-millisecond)
        cursor.execute(f"""
            SELECT role, student_r_id, joined_at
            FROM team_members
            WHERE team_id = {p}
            ORDER BY CASE WHEN role = 'leader' THEN 0 ELSE 1 END ASC, joined_at ASC
        """, (t_id,))
        for r in cursor.fetchall():
            m = dict(r)
            m_rid = (m.get("student_r_id") or "").strip().upper()
            m["r_id"] = m_rid

            # Instant memory cache lookup
            cached_s = STUDENT_CACHE_BY_RID.get(m_rid)
            if cached_s:
                m["name"] = cached_s.get("name") or m_rid
                m["email"] = cached_s.get("email") or f"{m_rid}@student.edu"
                m["gender"] = cached_s.get("gender") or "Student"
                m["dob"] = cached_s.get("dob") or "N/A"
                m["program"] = cached_s.get("program") or "Student"
                m["semester_year"] = cached_s.get("semester_year") or ""
                m["avatar_url"] = cached_s.get("avatar_url")
            else:
                cursor.execute(f"SELECT * FROM students WHERE r_id = {p}", (m_rid,))
                s_row = cursor.fetchone()
                if s_row:
                    s_dict = dict(s_row)
                    m["name"] = s_dict.get("name") or m_rid
                    m["email"] = s_dict.get("email") or f"{m_rid}@student.edu"
                    m["gender"] = s_dict.get("gender") or "Student"
                    m["dob"] = s_dict.get("dob") or "N/A"
                    m["program"] = s_dict.get("program") or "Student"
                    m["semester_year"] = s_dict.get("semester_year") or ""
                    m["avatar_url"] = s_dict.get("avatar_url")
                else:
                    p_val, s_val = EDUCATION_DETAILS_MAP.get(m_rid, ("Student", ""))
                    m["name"] = m_rid
                    m["email"] = f"{m_rid}@student.edu"
                    m["gender"] = "Student"
                    m["dob"] = "N/A"
                    m["program"] = p_val or "Student"
                    m["semester_year"] = s_val or ""
                    m["avatar_url"] = None

            # Sanitize avatar URL to eliminate slow/hanging network requests
            raw_avatar = str(m.get("avatar_url") or "").strip()
            if not raw_avatar or raw_avatar.endswith("/") or "demo/avatars" in raw_avatar or "SIGNATURE" in raw_avatar:
                m["avatar_url"] = None
            else:
                m["avatar_url"] = raw_avatar

            acad_yr, adm_yr = get_academic_year_by_rid(m_rid)
            m["academic_year"] = acad_yr
            m["admission_year"] = adm_yr

            members.append(m)

        if current_r_id:
            for m in members:
                if m["r_id"].upper() == current_r_id.upper():
                    user_status = "leader" if m.get("role") == "leader" else "member"
                    break
            if user_status == "none":
                cursor.execute(f"""
                    SELECT status FROM join_requests
                    WHERE team_id = {p} AND UPPER(student_r_id) = {p}
                """, (t_id, current_r_id.upper()))
                req = cursor.fetchone()
                if req:
                    user_status = req["status"]
    except Exception as e:
        print(f"Error reading team {t_id} members: {e}")
    finally:
        if should_close:
            try:
                conn.close()
            except Exception:
                pass

    member_count = len(members)
    female_count = sum(1 for m in members if m.get("gender") == "Female")
    is_full = member_count >= 6
    has_female = female_count >= 1

    if not raw_seat_modes:
        raw_seat_modes = "request,request,request,request,request"
    seat_modes = [s.strip().lower() for s in str(raw_seat_modes).split(",") if s.strip()]
    while len(seat_modes) < 5:
        seat_modes.append("request")

    return {
        "id": t_id,
        "name": t_name or "Untitled Team",
        "description": t_desc or "Looking for teammates for the upcoming hackathon.",
        "leader_r_id": t_leader,
        "whatsapp_link": t_wa if (user_status in ["leader", "member"]) else None,
        "has_whatsapp": bool(t_wa),
        "seat_modes": seat_modes,
        "created_at": t_created,
        "members": members,
        "member_count": member_count,
        "female_count": female_count,
        "is_full": is_full,
        "has_female": has_female,
        "needs_female": not has_female,
        "user_status": user_status,
        "hackathon_type": (t_hackathon_type or "sih").lower()
    }

@app.route("/api/teams", methods=["GET"])
def get_teams():
    try:
        current_r_id = request.args.get("r_id", "").strip().upper()
        search = request.args.get("search", "").strip()
        filter_type = request.args.get("filter", "all")
        hackathon_type = request.args.get("hackathon_type", "").strip().lower()
        p = get_placeholder()

        conn = get_db()
        cursor = conn.cursor()

        query = "SELECT * FROM teams WHERE 1=1"
        params = []

        if search:
            query += f" AND (name LIKE {p} OR description LIKE {p})"
            params.extend([f"%{search}%", f"%{search}%"])

        if hackathon_type in ["sih", "ctf"]:
            query += f" AND (LOWER(hackathon_type) = {p} OR (hackathon_type IS NULL AND {p} = 'sih'))"
            params.extend([hackathon_type, hackathon_type])

        query += " ORDER BY id DESC"
        cursor.execute(query, params)
        team_rows = cursor.fetchall()

        teams_data = []
        for t in team_rows:
            formatted = format_team_data(t, current_r_id, conn=conn)
            if formatted:
                teams_data.append(formatted)
        conn.close()

        if filter_type == "open":
            teams_data = [t for t in teams_data if not t["is_full"]]

        return jsonify({"teams": teams_data, "success": True})
    except Exception as e:
        print(f"Error in get_teams: {e}")
        return jsonify({"teams": [], "success": False, "error": str(e)}), 200

@app.route("/api/teams/<int:team_id>", methods=["GET"])
def get_team_detail(team_id):
    current_r_id = request.args.get("r_id", "").strip().upper()
    p = get_placeholder()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM teams WHERE id = {p}", (team_id,))
    team_row = cursor.fetchone()
    conn.close()

    if not team_row:
        return jsonify({"success": False, "message": "Team not found"}), 404

    return jsonify({"success": True, "team": format_team_data(team_row, current_r_id)})

@app.route("/api/teams/create", methods=["POST"])
def create_team():
    data = request.json or {}
    leader_r_id = (data.get("leader_r_id") or session.get("user_rid") or "").strip().upper()
    team_name = (data.get("title") or data.get("name") or "").strip()
    description = data.get("description", "").strip()
    whatsapp_link = data.get("whatsapp_link", "").strip()
    hackathon_type = (data.get("hackathon_type") or "sih").strip().lower()
    if hackathon_type not in ["sih", "ctf"]:
        hackathon_type = "sih"
    friend_r_ids = data.get("initial_members") or data.get("friend_r_ids") or data.get("pre_added_members") or []
    p = get_placeholder()

    if not leader_r_id:
        return jsonify({"success": False, "message": "Leader session required to create team"}), 401

    if not team_name:
        return jsonify({"success": False, "message": "Team title is required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT r_id FROM students WHERE UPPER(r_id) = {p}", (leader_r_id,))
    s_leader = cursor.fetchone()
    if not s_leader:
        s_leader = auto_import_student_from_json(leader_r_id, conn, cursor)

    if not s_leader:
        conn.close()
        return jsonify({"success": False, "message": "Leader R-ID not found"}), 404

    cursor.execute(f"""
        SELECT tm.team_id, t.name as team_name 
        FROM team_members tm 
        LEFT JOIN teams t ON tm.team_id = t.id 
        WHERE UPPER(tm.student_r_id) = {p}
    """, (leader_r_id,))
    already_in = cursor.fetchone()
    if already_in:
        t_name = (already_in["team_name"] if (isinstance(already_in, dict) or hasattr(already_in, '__getitem__')) else "another team") or "another team"
        conn.close()
        return jsonify({"success": False, "message": f"You cannot create a team until you leave team '{t_name}'. Each student can only be in one team at a time."}), 400

    clean_rids = []
    for item in friend_r_ids:
        if isinstance(item, dict):
            rid = item.get("r_id") or item.get("id") or ""
        elif isinstance(item, str):
            rid = item
        else:
            rid = str(item)
        rid = rid.strip().upper()
        if rid and rid != leader_r_id:
            clean_rids.append(rid)
    unique_friends = list(dict.fromkeys(clean_rids))
    if len(unique_friends) + 1 > 6:
        conn.close()
        return jsonify({"success": False, "message": "Team size max 6 members"}), 400

    valid_friends = []
    for f_id in unique_friends:
        cursor.execute(f"SELECT r_id FROM students WHERE UPPER(r_id) = {p}", (f_id,))
        s = cursor.fetchone()
        if not s:
            s = auto_import_student_from_json(f_id, conn, cursor)
        if not s and (re.match(r'^R\d{3,7}$', f_id) or f_id.isalnum()):
            try:
                cursor.execute(f"""
                    INSERT INTO students (r_id, name, email, gender, dob, avatar_url, program, is_registered)
                    VALUES ({p}, {p}, {p}, 'Student', 'N/A', '', 'Jaipur National University', 0)
                """, (f_id, f_id, f"{f_id.lower()}@student.edu"))
                conn.commit()
                cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (f_id,))
                s = cursor.fetchone()
            except Exception:
                pass
        if not s:
            continue
        cursor.execute(f"SELECT team_id FROM team_members WHERE UPPER(student_r_id) = {p}", (f_id,))
        if not cursor.fetchone():
            valid_friends.append(s["r_id"])

    if is_postgres():
        cursor.execute(f"""
            INSERT INTO teams (name, description, leader_r_id, whatsapp_link, hackathon_type)
            VALUES ({p}, {p}, {p}, {p}, {p}) RETURNING id
        """, (team_name, description, leader_r_id, whatsapp_link, hackathon_type))
        team_id = cursor.fetchone()["id"]
    else:
        cursor.execute(f"""
            INSERT INTO teams (name, description, leader_r_id, whatsapp_link, hackathon_type)
            VALUES ({p}, {p}, {p}, {p}, {p})
        """, (team_name, description, leader_r_id, whatsapp_link, hackathon_type))
        team_id = cursor.lastrowid

    cursor.execute(f"""
        INSERT INTO team_members (team_id, student_r_id, role)
        VALUES ({p}, {p}, 'leader')
    """, (team_id, leader_r_id))

    for f_id in valid_friends:
        cursor.execute(f"""
            INSERT INTO team_members (team_id, student_r_id, role)
            VALUES ({p}, {p}, 'member')
        """, (team_id, f_id))

    conn.commit()
    refresh_team_membership_cache()

    cursor.execute(f"SELECT * FROM teams WHERE id = {p}", (team_id,))
    t_row = cursor.fetchone()
    team_obj = format_team_data(t_row, leader_r_id)
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Team created with {1 + len(valid_friends)} members",
        "team_id": team_id,
        "team": team_obj
    })

@app.route("/api/teams/<int:team_id>/request", methods=["POST"])
def request_join_team(team_id):
    data = request.json or {}
    student_r_id = (data.get("student_r_id") or data.get("student_id") or session.get("user_rid") or "").strip().upper()
    message = data.get("message", "").strip()
    p = get_placeholder()

    if not student_r_id:
        return jsonify({"success": False, "message": "Sign in with R-ID required to join team"}), 401

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT * FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team:
        conn.close()
        return jsonify({"success": False, "message": "Team not found"}), 404

    cursor.execute(f"SELECT COUNT(*) as cnt FROM team_members WHERE team_id = {p}", (team_id,))
    cnt_row = cursor.fetchone()
    cnt = cnt_row["cnt"] if isinstance(cnt_row, dict) or hasattr(cnt_row, '__getitem__') else cnt_row[0]
    if cnt >= 6:
        conn.close()
        return jsonify({"success": False, "message": "Team is full (6/6)"}), 400

    cursor.execute(f"SELECT team_id FROM team_members WHERE UPPER(student_r_id) = {p}", (student_r_id,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "You are already in a team"}), 400

    try:
        cursor.execute(f"""
            INSERT INTO join_requests (team_id, student_r_id, message, status)
            VALUES ({p}, {p}, {p}, 'pending')
        """, (team_id, student_r_id, message))

        # Notify team leader
        leader_rid = team["leader_r_id"]
        cursor.execute(f"SELECT name FROM students WHERE UPPER(r_id) = {p}", (student_r_id,))
        s_row = cursor.fetchone()
        applicant_name = (s_row["name"] if s_row else student_r_id) or student_r_id
        team_name = team["name"] or "your team"
        create_notification_db(cursor, p, leader_rid, "New Join Request", f"New join request from {applicant_name} (@{student_r_id}) to join {team_name}.", "join_request", f"/team/{team_id}")

        conn.commit()
        conn.close()
    except Exception:
        conn.close()
        return jsonify({"success": False, "message": "Request already sent"}), 400

    return jsonify({"success": True, "message": "Request sent to leader"})

@app.route("/api/teams/<int:team_id>/requests", methods=["GET"])
def get_team_requests(team_id):
    leader_r_id = request.args.get("leader_r_id", "").strip().upper()
    p = get_placeholder()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or team["leader_r_id"].upper() != leader_r_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    cursor.execute(f"""
        SELECT jr.id as request_id, jr.status, jr.message, jr.created_at, jr.student_r_id,
               s.r_id, s.name, s.gender, s.dob, s.avatar_url, s.phone, s.email, s.program, s.semester_year
        FROM join_requests jr
        LEFT JOIN students s ON UPPER(jr.student_r_id) = UPPER(s.r_id)
        WHERE jr.team_id = {p} AND jr.status = 'pending'
        ORDER BY jr.created_at ASC
    """, (team_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        rid = (d.get("student_r_id") or d.get("r_id") or "").strip().upper()
        cached = STUDENT_CACHE_BY_RID.get(rid) or {}
        p_val, s_val = EDUCATION_DETAILS_MAP.get(rid, (None, None))
        acad_yr, adm_yr = get_academic_year_by_rid(rid)
        
        name = d.get("name") or cached.get("name") or rid
        email = d.get("email") or cached.get("email") or f"{rid.lower()}@student.edu"
        gender = d.get("gender") or cached.get("gender") or "Student"
        avatar_url = d.get("avatar_url") or cached.get("avatar_url")
        prog = d.get("program") or cached.get("program") or p_val or "Student"
        sem = d.get("semester_year") or cached.get("semester_year") or s_val or ""
        
        d["r_id"] = rid
        d["name"] = name
        d["email"] = email
        d["gender"] = gender
        d["avatar_url"] = avatar_url
        d["program"] = prog
        d["semester_year"] = sem
        d["academic_year"] = acad_yr
        d["admission_year"] = adm_yr
        results.append(d)

    return jsonify({"requests": results})

@app.route("/api/teams/<int:team_id>/requests/<int:req_id>/action", methods=["POST"])
def handle_join_request(team_id, req_id):
    data = request.json or {}
    leader_r_id = data.get("leader_r_id", "").strip().upper()
    action = data.get("action", "").strip().lower()
    p = get_placeholder()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id, name FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or team["leader_r_id"].upper() != leader_r_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    cursor.execute(f"SELECT * FROM join_requests WHERE id = {p} AND team_id = {p}", (req_id, team_id))
    join_req = cursor.fetchone()
    if not join_req:
        conn.close()
        return jsonify({"success": False, "message": "Request not found"}), 404

    target_rid = str(join_req["student_r_id"]).strip().upper()

    if action == "accept":
        cursor.execute(f"SELECT COUNT(*) as cnt FROM team_members WHERE team_id = {p}", (team_id,))
        cnt_row = cursor.fetchone()
        cnt = cnt_row["cnt"] if isinstance(cnt_row, dict) or hasattr(cnt_row, '__getitem__') else cnt_row[0]
        if cnt >= 6:
            conn.close()
            return jsonify({"success": False, "message": "Team is full (6/6)"}), 400

        cursor.execute(f"""
            SELECT tm.team_id, t.name as team_name 
            FROM team_members tm 
            LEFT JOIN teams t ON tm.team_id = t.id 
            WHERE UPPER(tm.student_r_id) = {p}
        """, (target_rid,))
        existing_membership = cursor.fetchone()
        if existing_membership:
            cursor.execute(f"UPDATE join_requests SET status = 'rejected' WHERE id = {p}", (req_id,))
            conn.commit()
            conn.close()
            t_name = (existing_membership["team_name"] if (isinstance(existing_membership, dict) or hasattr(existing_membership, '__getitem__')) else "another team") or "another team"
            return jsonify({"success": False, "message": f"Cannot add this student because they are already in team '{t_name}'."}), 400

        # Ensure student exists in students table
        cursor.execute(f"SELECT r_id FROM students WHERE UPPER(r_id) = {p}", (target_rid,))
        if not cursor.fetchone():
            auto_import_student_from_json(target_rid, conn, cursor)

        cursor.execute(f"""
            INSERT INTO team_members (team_id, student_r_id, role)
            VALUES ({p}, {p}, 'member')
        """, (team_id, target_rid))

        cursor.execute(f"UPDATE join_requests SET status = 'accepted' WHERE id = {p}", (req_id,))

        # Fetch leader name for professional notification
        cursor.execute(f"SELECT name FROM students WHERE UPPER(r_id) = {p}", (leader_r_id,))
        lead_row = cursor.fetchone()
        leader_name = (lead_row["name"] if lead_row else leader_r_id) or leader_r_id
        team_name = team["name"] if ("name" in team.keys() if hasattr(team, 'keys') else True) else "the team"
        create_notification_db(cursor, p, target_rid, "Join Request Approved", f"Congratulations, your request to join {team_name} has been approved by team leader {leader_name}.", "request_accepted", f"/team/{team_id}")

        conn.commit()
        refresh_team_membership_cache()
        conn.close()
        return jsonify({"success": True, "message": "Member accepted"})

    elif action == "reject":
        cursor.execute(f"UPDATE join_requests SET status = 'rejected' WHERE id = {p}", (req_id,))

        team_name = team["name"] if ("name" in team.keys() if hasattr(team, 'keys') else True) else "the team"
        create_notification_db(cursor, p, target_rid, "Join Request Update", f"Your request to join {team_name} was declined by the team leader.", "request_declined", "/")

        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Request declined"})

    conn.close()
    return jsonify({"success": False, "message": "Invalid action"}), 400

@app.route("/api/teams/<int:team_id>/whatsapp", methods=["PUT"])
def update_whatsapp_link(team_id):
    data = request.json or {}
    leader_r_id = data.get("leader_r_id", "").strip().upper()
    whatsapp_link = data.get("whatsapp_link", "").strip()
    p = get_placeholder()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or team["leader_r_id"].upper() != leader_r_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    cursor.execute(f"UPDATE teams SET whatsapp_link = {p} WHERE id = {p}", (whatsapp_link, team_id))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "WhatsApp link updated"})

@app.route("/api/teams/<int:team_id>/update", methods=["POST", "PUT"])
def update_team_details(team_id):
    data = request.json or {}
    leader_r_id = (data.get("leader_r_id") or session.get("user_rid") or "").strip().upper()
    name = (data.get("name") or data.get("title") or "").strip()
    description = data.get("description", "").strip()
    whatsapp_link = data.get("whatsapp_link", "").strip()
    p = get_placeholder()

    if not leader_r_id:
        return jsonify({"success": False, "message": "Leader authorization required"}), 401

    if not name:
        return jsonify({"success": False, "message": "Team name cannot be empty"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or team["leader_r_id"].upper() != leader_r_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized: Only team leader can update team details"}), 403

    cursor.execute(f"""
        UPDATE teams 
        SET name = {p}, description = {p}, whatsapp_link = {p}
        WHERE id = {p}
    """, (name, description, whatsapp_link, team_id))
    conn.commit()

    cursor.execute(f"SELECT * FROM teams WHERE id = {p}", (team_id,))
    t_row = cursor.fetchone()
    conn.close()

    updated_team = format_team_data(t_row, leader_r_id) if t_row else None
    return jsonify({"success": True, "message": "Team updated successfully", "team": updated_team})

@app.route("/api/my-team", methods=["GET"])
def get_my_team():
    r_id = request.args.get("r_id", "").strip().upper()
    p = get_placeholder()
    if not r_id:
        return jsonify({"team": None})

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT t.* FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE UPPER(tm.student_r_id) = {p}
    """, (r_id,))
    team_row = cursor.fetchone()
    conn.close()

    if not team_row:
        return jsonify({"team": None})

    return jsonify({"team": format_team_data(team_row, r_id)})

@app.route("/api/teams/<int:team_id>/members/add", methods=["POST"])
def add_team_member(team_id):
    data = request.json or {}
    leader_r_id = (data.get("leader_r_id") or session.get("user_rid") or "").strip().upper()
    student_r_id = data.get("student_r_id", "").strip().upper()
    p = get_placeholder()

    if not leader_r_id or not student_r_id:
        return jsonify({"success": False, "message": "Leader R-ID and Student R-ID required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT id, name, leader_r_id FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or team["leader_r_id"].upper() != leader_r_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized: Only team leader can add members"}), 403

    cursor.execute(f"SELECT COUNT(*) as cnt FROM team_members WHERE team_id = {p}", (team_id,))
    cnt_row = cursor.fetchone()
    cnt = cnt_row["cnt"] if isinstance(cnt_row, dict) or hasattr(cnt_row, '__getitem__') else cnt_row[0]
    if cnt >= 6:
        conn.close()
        return jsonify({"success": False, "message": "Team is already full (6/6)"}), 400

    cursor.execute(f"SELECT r_id, name FROM students WHERE UPPER(r_id) = {p}", (student_r_id,))
    s = cursor.fetchone()
    if not s:
        s = auto_import_student_from_json(student_r_id, conn, cursor)
    if not s:
        import re
        if re.match(r"^R\d+$", student_r_id, re.IGNORECASE):
            cursor.execute(f"""
                INSERT INTO students (r_id, name, gender, is_registered)
                VALUES ({p}, {p}, 'Unknown', 0)
            """, (student_r_id, f"Student {student_r_id}"))
            conn.commit()
            s = {"r_id": student_r_id, "name": f"Student {student_r_id}"}
        else:
            conn.close()
            return jsonify({"success": False, "message": "Student R-ID not found in college database"}), 404

    cursor.execute(f"""
        SELECT t.name FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE UPPER(tm.student_r_id) = {p}
    """, (student_r_id,))
    existing_team = cursor.fetchone()
    if existing_team:
        ex_name = existing_team["name"] if isinstance(existing_team, dict) or hasattr(existing_team, '__getitem__') else existing_team[0]
        conn.close()
        return jsonify({"success": False, "message": f"Cannot add this student because they are already in team '{ex_name}'."}), 400

    cursor.execute(f"""
        INSERT INTO team_members (team_id, student_r_id, role)
        VALUES ({p}, {p}, 'member')
    """, (team_id, s["r_id"]))

    cursor.execute(f"UPDATE join_requests SET status = 'accepted' WHERE team_id = {p} AND UPPER(student_r_id) = {p}", (team_id, student_r_id))

    # Notify added student
    team_name = team["name"] if ("name" in team.keys() if hasattr(team, 'keys') else True) else "the team"
    create_notification_db(cursor, p, s["r_id"], "Added to Team", f"You have been directly added to {team_name} by the team leader.", "team_added", f"/team/{team_id}")

    conn.commit()
    refresh_team_membership_cache()

    cursor.execute(f"SELECT * FROM teams WHERE id = {p}", (team_id,))
    updated_team = format_team_data(cursor.fetchone(), leader_r_id)
    conn.close()

    return jsonify({"success": True, "message": "Teammate added successfully", "team": updated_team})

@app.route("/api/teams/<int:team_id>/members/remove", methods=["POST"])
@app.route("/api/teams/<int:team_id>/remove-member", methods=["POST"])
def remove_team_member(team_id):
    data = request.json or {}
    leader_r_id = (data.get("leader_r_id") or session.get("user_rid") or "").strip().upper()
    target_r_id = (data.get("student_id") or data.get("target_r_id") or data.get("student_r_id") or "").strip().upper()
    p = get_placeholder()

    if not leader_r_id or not target_r_id:
        return jsonify({"success": False, "message": "Leader R-ID and Target R-ID required"}), 400

    if leader_r_id == target_r_id:
        return jsonify({"success": False, "message": "Leader cannot remove self. Use disband team."}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or team["leader_r_id"].upper() != leader_r_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    cursor.execute(f"DELETE FROM team_members WHERE team_id = {p} AND UPPER(student_r_id) = {p}", (team_id, target_r_id))
    conn.commit()
    refresh_team_membership_cache()

    cursor.execute(f"SELECT * FROM teams WHERE id = {p}", (team_id,))
    t_row = cursor.fetchone()
    updated_team = format_team_data(t_row, leader_r_id) if t_row else None
    conn.close()

    return jsonify({"success": True, "message": "Member removed from team", "team": updated_team})

@app.route("/api/teams/<int:team_id>/leave", methods=["POST"])
def leave_team(team_id):
    data = request.json or {}
    student_r_id = (data.get("student_r_id") or session.get("user_rid") or "").strip().upper()
    p = get_placeholder()

    if not student_r_id:
        return jsonify({"success": False, "message": "Student R-ID required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT role FROM team_members WHERE team_id = {p} AND UPPER(student_r_id) = {p}", (team_id, student_r_id))
    mem = cursor.fetchone()
    if not mem:
        conn.close()
        return jsonify({"success": False, "message": "You are not in this team"}), 400

    role = mem["role"]
    cursor.execute(f"DELETE FROM team_members WHERE team_id = {p} AND UPPER(student_r_id) = {p}", (team_id, student_r_id))

    if role == "leader":
        cursor.execute(f"SELECT student_r_id FROM team_members WHERE team_id = {p} ORDER BY joined_at ASC LIMIT 1", (team_id,))
        next_mem = cursor.fetchone()
        if next_mem:
            new_leader = next_mem["student_r_id"]
            cursor.execute(f"UPDATE team_members SET role = 'leader' WHERE team_id = {p} AND UPPER(student_r_id) = {p}", (team_id, new_leader.upper()))
            cursor.execute(f"UPDATE teams SET leader_r_id = {p} WHERE id = {p}", (new_leader, team_id))
        else:
            cursor.execute(f"DELETE FROM teams WHERE id = {p}", (team_id,))

    conn.commit()
    refresh_team_membership_cache()
    conn.close()
    return jsonify({"success": True, "message": "Left team successfully"})

@app.route("/api/teams/<int:team_id>", methods=["DELETE"])
@app.route("/api/teams/<int:team_id>/disband", methods=["POST"])
def delete_team(team_id):
    data = request.json or {}
    leader_r_id = (data.get("leader_r_id") or session.get("user_rid") or "").strip().upper()
    p = get_placeholder()

    if not leader_r_id:
        leader_r_id = request.args.get("leader_r_id", "").strip().upper()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or (leader_r_id and team["leader_r_id"].upper() != leader_r_id):
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized: Only team leader can disband team"}), 403

    cursor.execute(f"DELETE FROM teams WHERE id = {p}", (team_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Team disbanded successfully"})

@app.route("/api/user/profile", methods=["GET"])
def get_user_profile():
    r_id = (request.args.get("r_id") or session.get("user_rid") or "").strip().upper()
    p = get_placeholder()

    if not r_id:
        return jsonify({"success": False, "message": "R-ID required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
    db_student = cursor.fetchone()

    if not db_student:
        db_student = auto_import_student_from_json(r_id, conn, cursor)

    student_dict = dict(db_student) if db_student else {}

    json_item = STUDENT_PROFILES_MAP.get(r_id) or {}
    personal = json_item.get("personal_details", {}) or {}
    family = json_item.get("family_details", {}) or {}
    address_data = json_item.get("address_details", {}) or {}

    # Format correspondence address
    c_parts = []
    for k in ["Correspondence Address", "Correspondence City", "Correspondence State", "Correspondence Pincode", "Correspondence Country"]:
        val = address_data.get(k)
        if val and str(val).strip() not in ["", "None", "-1", "null"]:
            c_parts.append(str(val).strip())
    correspondence_addr = ", ".join(c_parts) if c_parts else "Not Provided"

    # Format permanent address
    p_parts = []
    for k in ["Permanent Address", "Permanent City", "Permanent State", "Permanent Pincode", "Permanent Country"]:
        val = address_data.get(k)
        if val and str(val).strip() not in ["", "None", "-1", "null"]:
            p_parts.append(str(val).strip())
    permanent_addr = ", ".join(p_parts) if p_parts else "Not Provided"

    full_address = correspondence_addr if correspondence_addr != "Not Provided" else permanent_addr

    avatar_url = student_dict.get("avatar_url")
    if not is_valid_student_image(avatar_url, r_id):
        image_urls = json_item.get("image_urls") or []
        first_img = image_urls[0] if image_urls else ""
        if is_valid_student_image(first_img, r_id):
            avatar_url = first_img
        else:
            avatar_url = DEFAULT_AVATAR_PATH

    prog, sem = get_student_course_details(r_id, cursor)

    profile_data = {
        "r_id": r_id,
        "name": student_dict.get("name") or json_item.get("name") or "Student",
        "email": student_dict.get("email") or personal.get("EmailID") or f"{r_id}@student.edu",
        "phone": student_dict.get("phone") or personal.get("Mobile No") or "Not Provided",
        "alt_phone": personal.get("Alternate Mobile No") or "Not Provided",
        "gender": student_dict.get("gender") or personal.get("Gender") or "Unspecified",
        "dob": student_dict.get("dob") or personal.get("Date of Birth") or "Not Provided",
        "blood_group": personal.get("Blood Group") or "Not Provided",
        "category": personal.get("Category") or "General",
        "caste": personal.get("Caste") or "Not Provided",
        "religion": personal.get("Religion") or "Not Provided",
        "marital_status": personal.get("Marital Status") or "Single",
        "disabled": personal.get("Disabled") or "No",
        "avatar_url": avatar_url,
        "program": prog or "Not Specified",
        "semester_year": sem or "",
        "needs_program": not bool(prog),
        "father_name": family.get("Father's Name") or "Not Provided",
        "father_phone": family.get("Father's Mobile No") or "Not Provided",
        "father_email": family.get("Father's Email") or "Not Provided",
        "mother_name": family.get("Mother's Name") or "Not Provided",
        "mother_phone": family.get("Mother's Mobile No") or "Not Provided",
        "mother_email": family.get("Mother's Email") or "Not Provided",
        "permanent_address": permanent_addr,
        "correspondence_address": correspondence_addr,
        "address": full_address,
        "academic_year": get_academic_year_by_rid(r_id)[0],
        "admission_year": get_academic_year_by_rid(r_id)[1]
    }

    cursor.execute(f"""
        SELECT t.* FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE UPPER(tm.student_r_id) = {p}
        ORDER BY t.id DESC
    """, (r_id,))
    team_rows = cursor.fetchall()
    teams_list = [format_team_data(t, r_id, conn=conn) for t in team_rows]
    conn.close()

    return jsonify({
        "success": True,
        "profile": profile_data,
        "teams": teams_list
    })

@app.route("/api/teams/<int:team_id>/seat-modes", methods=["PUT"])
def update_team_seat_modes(team_id):
    data = request.json or {}
    leader_r_id = data.get("leader_r_id", "").strip().upper()
    seat_modes = data.get("seat_modes", [])
    p = get_placeholder()

    if isinstance(seat_modes, list):
        seat_modes_str = ",".join([str(s).strip().lower() for s in seat_modes])
    else:
        seat_modes_str = str(seat_modes).strip().lower()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or team["leader_r_id"].upper() != leader_r_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized: Only team leader can update seat modes"}), 403

    cursor.execute(f"UPDATE teams SET seat_modes = {p} WHERE id = {p}", (seat_modes_str, team_id))
    conn.commit()

    cursor.execute(f"SELECT * FROM teams WHERE id = {p}", (team_id,))
    updated_team = format_team_data(cursor.fetchone(), leader_r_id)
    conn.close()

    return jsonify({"success": True, "message": "Seat modes updated successfully", "team": updated_team})

# --- TEAM LIVE SQUAD CHAT (MEMBER-EXCLUSIVE, FAST REST POLLING) ---

@app.route("/api/teams/<int:team_id>/messages", methods=["GET"])
def get_team_messages(team_id):
    r_id = (request.args.get("r_id") or session.get("user_rid") or "").strip().upper()
    if not r_id:
        return jsonify({"success": False, "message": "Authentication required"}), 401

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Strict squad membership validation (captain or confirmed member)
        cursor.execute(f"""
            SELECT 1 FROM teams WHERE id = {p} AND UPPER(leader_r_id) = {p}
            UNION
            SELECT 1 FROM team_members WHERE team_id = {p} AND UPPER(student_r_id) = {p}
        """, (team_id, r_id, team_id, r_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "message": "Access restricted: only squad members can view live chat."}), 403

        cursor.execute(f"""
            SELECT id, team_id, sender_r_id, sender_name, sender_avatar, message, created_at
            FROM team_messages
            WHERE team_id = {p}
            ORDER BY id ASC
            LIMIT 100
        """, (team_id,))
        rows = cursor.fetchall()
        messages = []
        for r in rows:
            m = dict(r)
            m["created_at"] = str(m.get("created_at") or "")
            messages.append(m)

        conn.close()
        return jsonify({"success": True, "messages": messages})
    except Exception as e:
        conn.close()
        print(f"Notice fetching team messages: {e}")
        return jsonify({"success": False, "messages": [], "error": str(e)}), 500


@app.route("/api/teams/<int:team_id>/messages", methods=["POST"])
def post_team_message(team_id):
    data = request.json or {}
    r_id = (data.get("r_id") or session.get("user_rid") or "").strip().upper()
    raw_msg = (data.get("message") or "").strip()

    if not r_id:
        return jsonify({"success": False, "message": "Authentication required"}), 401
    if not raw_msg:
        return jsonify({"success": False, "message": "Message content cannot be empty."}), 400
    if len(raw_msg) > 1000:
        return jsonify({"success": False, "message": "Message cannot exceed 1,000 characters."}), 400

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Strict squad membership validation (captain or confirmed member)
        cursor.execute(f"""
            SELECT 1 FROM teams WHERE id = {p} AND UPPER(leader_r_id) = {p}
            UNION
            SELECT 1 FROM team_members WHERE team_id = {p} AND UPPER(student_r_id) = {p}
        """, (team_id, r_id, team_id, r_id))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"success": False, "message": "Access restricted: only squad members can chat."}), 403

        # Lookup sender name and avatar
        sender_info = STUDENT_CACHE_BY_RID.get(r_id)
        if not sender_info:
            cursor.execute(f"SELECT name, avatar_url FROM students WHERE UPPER(r_id) = {p}", (r_id,))
            s_row = cursor.fetchone()
            sender_info = dict(s_row) if s_row else {}

        sender_name = (sender_info.get("name") or f"Student @{r_id}").strip()
        sender_avatar = sender_info.get("avatar_url") or DEFAULT_AVATAR_PATH
        if not is_valid_student_image(sender_avatar, r_id):
            sender_avatar = DEFAULT_AVATAR_PATH

        if is_postgres():
            cursor.execute("""
                INSERT INTO team_messages (team_id, sender_r_id, sender_name, sender_avatar, message)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, team_id, sender_r_id, sender_name, sender_avatar, message, created_at
            """, (team_id, r_id, sender_name, sender_avatar, raw_msg))
            new_row = cursor.fetchone()
            conn.commit()
            new_msg = dict(new_row) if new_row else {}
        else:
            cursor.execute("""
                INSERT INTO team_messages (team_id, sender_r_id, sender_name, sender_avatar, message)
                VALUES (?, ?, ?, ?, ?)
            """, (team_id, r_id, sender_name, sender_avatar, raw_msg))
            conn.commit()
            cursor.execute("SELECT id, team_id, sender_r_id, sender_name, sender_avatar, message, created_at FROM team_messages WHERE id = last_insert_rowid()")
            new_row = cursor.fetchone()
            new_msg = dict(new_row) if new_row else {}

        if new_msg and new_msg.get("created_at"):
            new_msg["created_at"] = str(new_msg["created_at"])

        conn.close()
        return jsonify({"success": True, "message": new_msg})
    except Exception as e:
        conn.close()
        print(f"Notice posting team message: {e}")
        return jsonify({"success": False, "message": "Failed to post message", "error": str(e)}), 500

# --- NOTIFICATION API ENDPOINTS ---

@app.route("/api/notifications", methods=["GET"])
def get_user_notifications():
    r_id = (request.args.get("r_id") or session.get("user_rid") or "").strip().upper()
    if not r_id:
        return jsonify({"success": True, "notifications": [], "unread_count": 0})

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(f"""
            SELECT id, recipient_r_id, title, message, type, link, is_read, created_at
            FROM notifications
            WHERE UPPER(recipient_r_id) = {p}
            ORDER BY id DESC
            LIMIT 30
        """, (r_id,))
        rows = cursor.fetchall()
        notifs = []
        for r in rows:
            nd = dict(r)
            m_rid = re.search(r'@(R\d+)', nd.get("message", ""), re.IGNORECASE)
            if m_rid:
                s_rid = m_rid.group(1).upper()
                cached_s = STUDENT_CACHE_BY_RID.get(s_rid)
                if not cached_s:
                    cursor.execute(f"SELECT r_id, name, avatar_url FROM students WHERE UPPER(r_id) = {p}", (s_rid,))
                    s_row = cursor.fetchone()
                    cached_s = dict(s_row) if s_row else {}
                nd["sender_rid"] = s_rid
                nd["sender_name"] = cached_s.get("name") or s_rid
                s_av = cached_s.get("avatar_url")
                nd["sender_avatar"] = s_av if (s_av and is_valid_student_image(s_av, s_rid)) else DEFAULT_AVATAR_PATH
            else:
                nd["sender_rid"] = None
                nd["sender_name"] = None
                nd["sender_avatar"] = None
            notifs.append(nd)

        cursor.execute(f"""
            SELECT COUNT(*) as unread
            FROM notifications
            WHERE UPPER(recipient_r_id) = {p} AND (is_read = 0 OR is_read IS NULL)
        """, (r_id,))
        cnt_row = cursor.fetchone()
        unread_count = cnt_row["unread"] if isinstance(cnt_row, dict) or hasattr(cnt_row, '__getitem__') else cnt_row[0]
        conn.close()

        return jsonify({"success": True, "notifications": notifs, "unread_count": unread_count})
    except Exception as e:
        print(f"Notice fetching notifications: {e}")
        conn.close()
        return jsonify({"success": False, "notifications": [], "unread_count": 0, "error": str(e)})

@app.route("/api/notifications/mark-read", methods=["POST"])
def mark_user_notifications_read():
    data = request.json or {}
    r_id = (data.get("r_id") or session.get("user_rid") or "").strip().upper()
    notif_id = data.get("notification_id")
    p = get_placeholder()

    if not r_id:
        return jsonify({"success": False, "message": "Sign in required"}), 401

    conn = get_db()
    cursor = conn.cursor()

    try:
        if notif_id:
            cursor.execute(f"UPDATE notifications SET is_read = 1 WHERE id = {p} AND UPPER(recipient_r_id) = {p}", (notif_id, r_id))
        else:
            cursor.execute(f"UPDATE notifications SET is_read = 1 WHERE UPPER(recipient_r_id) = {p}", (r_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Notifications marked as read"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
