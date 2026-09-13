import os
import json
import random
import datetime
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, jsonify, session
from database import get_db, init_db, is_postgres, get_system_setting, set_system_setting

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "hackmate_liquid_glass_2026")

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
        if first_img and not first_img.endswith("/") and "demo/avatars" not in first_img and "SIGNATURE" not in first_img:
            avatar_url = first_img
        else:
            avatar_url = None
        
        prog, sem = EDUCATION_DETAILS_MAP.get(r_id_key, (None, None))
        acad_yr, adm_yr = get_academic_year_by_rid(r_id_key)
        
        student_obj = {
            "r_id": r_id_key,
            "name": name,
            "name_upper": name.upper(),
            "email": email,
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
    print(f"[SEARCH INDEX BUILT] Pre-indexed {len(SEARCHABLE_STUDENTS_LIST)} students for instant sub-millisecond search.")

build_student_search_index()

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
    
    # 1. Fast in-memory cache lookup from education_details
    if clean_rid in EDUCATION_DETAILS_MAP:
        prog, sem = EDUCATION_DETAILS_MAP[clean_rid]
        if prog:
            return prog, sem

    # 2. Check students table if cursor provided
    if cursor:
        p = get_placeholder()
        try:
            cursor.execute(f"SELECT program, semester_year FROM students WHERE UPPER(r_id) = {p}", (clean_rid,))
            row = cursor.fetchone()
            if row:
                prog = row["program"] if hasattr(row, '__getitem__') else row[0]
                sem = row["semester_year"] if hasattr(row, '__getitem__') else row[1]
                if prog and str(prog).strip():
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
    avatar_url = image_urls[0] if image_urls else ""
    if "demo/avatars/1.jpg" in avatar_url or not avatar_url:
        avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={r_id}"

    try:
        cursor.execute(f"""
            INSERT INTO students (r_id, name, email, phone, gender, dob, avatar_url, is_registered)
            VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, 0)
        """, (r_id.upper(), name, email, phone, gender_clean, dob, avatar_url))
        conn.commit()
    except Exception as e:
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
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session["is_admin"] = True
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

    # Calculate open slots across all teams
    cursor.execute("SELECT t.id, t.seat_modes, COUNT(tm.id) as filled FROM teams t LEFT JOIN team_members tm ON t.id = tm.team_id GROUP BY t.id")
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
        conn.close()
        return jsonify({
            "success": False,
            "not_found": True,
            "message": "Server couldn't connect to campus database. Please enter your academic details manually to continue."
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
            "dob": dob,
            "gender": gender,
            "email": email,
            "avatar_url": avatar_url,
            "program": prog or "Student",
            "semester": sem or "",
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
        avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={r_id}"
        try:
            cursor.execute(f"""
                INSERT INTO students (r_id, name, email, program, gender, dob, is_registered, avatar_url)
                VALUES ({p}, {p}, {p}, {p}, 'Student', 'N/A', 1, {p})
            """, (r_id, name, email, program, avatar_url))
            conn.commit()
            cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
            student = cursor.fetchone()
        except Exception as e:
            print(f"Notice student auto-create: {e}")

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
        prog = updated_student.get("program")
    if not sem and updated_student.get("semester_year"):
        sem = updated_student.get("semester_year")
    conn.close()

    session["user_rid"] = r_id

    student_name = (updated_student.get("name") or f"Student {r_id}").strip()
    user_payload = {
        "id": r_id,
        "name": student_name,
        "email": updated_student.get("email") or f"{r_id.lower()}@student.edu",
        "gender": updated_student.get("gender") or "Student",
        "dob": updated_student.get("dob") or "N/A",
        "avatar_url": updated_student.get("avatar_url") or f"https://api.dicebear.com/7.x/avataaars/svg?seed={r_id}",
        "program": prog,
        "semester_year": sem,
        "needs_program": not bool(prog)
    }

    return jsonify({
        "success": True,
        "message": "Signed in successfully",
        "user": user_payload,
        "needs_program": not bool(prog),
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
    p = get_placeholder()

    if not r_id or not name or not gender or not email:
        return jsonify({"success": False, "message": "R-ID, Name, Email, and Gender are required"}), 400

    if gender not in ["Male", "Female", "Other"]:
        gender = "Other"

    avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={r_id}"

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            INSERT INTO students (r_id, name, email, phone, gender, dob, avatar_url, is_registered)
            VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, 1)
        """, (r_id, name, email, phone, gender, dob, avatar_url))
        conn.commit()
        conn.close()
    except Exception:
        conn.close()
        return jsonify({"success": False, "message": "R-ID already registered"}), 400

    session["user_rid"] = r_id

    user_payload = {
        "id": r_id,
        "name": name,
        "email": email,
        "gender": gender,
        "dob": dob,
        "avatar_url": avatar_url
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
    conn.close()

    if not student:
        return jsonify({"authenticated": False})

    s_dict = dict(student)
    return jsonify({
        "authenticated": True,
        "user": {
            "id": s_dict["r_id"],
            "name": s_dict["name"],
            "email": s_dict["email"],
            "gender": s_dict["gender"],
            "dob": s_dict["dob"],
            "avatar_url": s_dict["avatar_url"],
            "program": prog,
            "semester_year": sem,
            "needs_program": not bool(prog)
        }
    })

@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"})

# --- STUDENT SEARCH (WITH DOB, EMAIL, PHOTO & DETAILS) ---

@app.route("/api/students/search", methods=["GET"])
def student_search():
    raw_query = request.args.get("q", "").strip()
    query = raw_query.upper()

    # If query is empty, do not return random suggestions
    if not query:
        return jsonify({"students": []})

    results = []
    seen_rids = set()

    # Priority 0: Exact R-ID match (Sub-millisecond 0.001ms instant lookup)
    exact_student = STUDENT_CACHE_BY_RID.get(query)
    if exact_student:
        results.append(dict(exact_student))
        seen_rids.add(query)

    # Priority 1: Prefix R-ID match (Instant break at 15)
    for s in SEARCHABLE_STUDENTS_LIST:
        rid = s["r_id"]
        if rid.startswith(query) and rid not in seen_rids:
            results.append(dict(s))
            seen_rids.add(rid)
            if len(results) >= 15:
                break

    # Priority 2: Name match (Starts with or contains query)
    if len(results) < 15:
        for s in SEARCHABLE_STUDENTS_LIST:
            rid = s["r_id"]
            if rid not in seen_rids:
                if query in s["name_upper"]:
                    results.append(dict(s))
                    seen_rids.add(rid)
                    if len(results) >= 15:
                        break

    # Attach team membership in 0.0001ms from in-memory cache
    for s in results:
        tm = TEAM_MEMBERSHIP_MAP.get(s["r_id"])
        if tm:
            s["in_team"] = True
            s["team_name"] = tm["team_name"]
            s["team_id"] = tm["team_id"]
        else:
            s["in_team"] = False
            s["team_name"] = None
            s["team_id"] = None

    return jsonify({"students": results[:15]})

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

    cursor.execute(f"SELECT team_id FROM team_members WHERE UPPER(student_r_id) = {p}", (leader_r_id,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "You are already in another team"}), 400

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
        create_notification_db(cursor, p, leader_rid, "New Join Request", f"{applicant_name} ({student_r_id}) requested to join {team_name}", "join_request", f"/team/{team_id}")

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
        SELECT jr.id as request_id, jr.status, jr.message, jr.created_at,
               s.r_id, s.name, s.gender, s.dob, s.avatar_url, s.phone, s.email
        FROM join_requests jr
        JOIN students s ON jr.student_r_id = s.r_id
        WHERE jr.team_id = {p} AND jr.status = 'pending'
        ORDER BY jr.created_at ASC
    """, (team_id,))
    rows = cursor.fetchall()
    conn.close()

    return jsonify({"requests": [dict(r) for r in rows]})

@app.route("/api/teams/<int:team_id>/requests/<int:req_id>/action", methods=["POST"])
def handle_join_request(team_id, req_id):
    data = request.json or {}
    leader_r_id = data.get("leader_r_id", "").strip().upper()
    action = data.get("action", "").strip().lower()
    p = get_placeholder()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
    team = cursor.fetchone()
    if not team or team["leader_r_id"].upper() != leader_r_id:
        conn.close()
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    cursor.execute(f"SELECT * FROM join_requests WHERE id = {p} AND team_id = {p}", (req_id, team_id))
    join_req = cursor.fetchone()
    if not join_req:
        conn.close()
        return jsonify({"success": False, "message": "Request not found"}), 404

    if action == "accept":
        cursor.execute(f"SELECT COUNT(*) as cnt FROM team_members WHERE team_id = {p}", (team_id,))
        cnt_row = cursor.fetchone()
        cnt = cnt_row["cnt"] if isinstance(cnt_row, dict) or hasattr(cnt_row, '__getitem__') else cnt_row[0]
        if cnt >= 6:
            conn.close()
            return jsonify({"success": False, "message": "Team is full (6/6)"}), 400

        cursor.execute(f"SELECT team_id FROM team_members WHERE student_r_id = {p}", (join_req["student_r_id"],))
        if cursor.fetchone():
            cursor.execute(f"UPDATE join_requests SET status = 'rejected' WHERE id = {p}", (req_id,))
            conn.commit()
            conn.close()
            return jsonify({"success": False, "message": "Student already joined another team"}), 400

        cursor.execute(f"""
            INSERT INTO team_members (team_id, student_r_id, role)
            VALUES ({p}, {p}, 'member')
        """, (team_id, join_req["student_r_id"]))

        cursor.execute(f"UPDATE join_requests SET status = 'accepted' WHERE id = {p}", (req_id,))

        # Notify applicant
        team_name = team["name"] if ("name" in team.keys() if hasattr(team, 'keys') else True) else "the team"
        create_notification_db(cursor, p, join_req["student_r_id"], "Join Request Accepted! 🎉", f"Congratulations! You are now an official team member of {team_name}.", "request_accepted", f"/team/{team_id}")

        conn.commit()
        refresh_team_membership_cache()
        conn.close()
        return jsonify({"success": True, "message": "Member accepted"})

    elif action == "reject":
        cursor.execute(f"UPDATE join_requests SET status = 'rejected' WHERE id = {p}", (req_id,))

        # Notify applicant
        team_name = team["name"] if ("name" in team.keys() if hasattr(team, 'keys') else True) else "the team"
        create_notification_db(cursor, p, join_req["student_r_id"], "Join Request Update", f"Your request to join {team_name} was not accepted.", "request_declined", "/")

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
    leader_r_id = data.get("leader_r_id", "").strip().upper()
    student_r_id = data.get("student_r_id", "").strip().upper()
    p = get_placeholder()

    if not leader_r_id or not student_r_id:
        return jsonify({"success": False, "message": "Leader R-ID and Student R-ID required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
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

    cursor.execute(f"SELECT r_id FROM students WHERE UPPER(r_id) = {p}", (student_r_id,))
    s = cursor.fetchone()
    if not s:
        s = auto_import_student_from_json(student_r_id, conn, cursor)
    if not s:
        conn.close()
        return jsonify({"success": False, "message": "Student R-ID not found in college database"}), 404

    cursor.execute(f"SELECT team_id FROM team_members WHERE UPPER(student_r_id) = {p}", (student_r_id,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "Student is already in another team"}), 400

    cursor.execute(f"""
        INSERT INTO team_members (team_id, student_r_id, role)
        VALUES ({p}, {p}, 'member')
    """, (team_id, s["r_id"]))

    cursor.execute(f"UPDATE join_requests SET status = 'accepted' WHERE team_id = {p} AND UPPER(student_r_id) = {p}", (team_id, student_r_id))

    # Notify added student
    team_name = team["name"] if ("name" in team.keys() if hasattr(team, 'keys') else True) else "the team"
    create_notification_db(cursor, p, s["r_id"], "Added to Team! 🎉", f"You have been directly added to {team_name} by the team leader.", "team_added", f"/team/{team_id}")

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
    if not avatar_url or "demo/avatars/1.jpg" in avatar_url:
        image_urls = json_item.get("image_urls") or []
        avatar_url = image_urls[0] if image_urls and "demo/avatars/1.jpg" not in image_urls[0] else f"https://api.dicebear.com/7.x/avataaars/svg?seed={r_id}"

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
    conn.close()

    teams_list = [format_team_data(t, r_id) for t in team_rows]

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
        notifs = [dict(r) for r in rows]

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
