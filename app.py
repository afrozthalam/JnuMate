import os
import json
import random
import datetime
import time
import smtplib
import threading
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, jsonify, session, send_from_directory, redirect, send_file

# Automatically load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("[ENV] Loaded environment configuration from .env")
except ImportError:
    pass

from database import get_db, init_db, is_postgres, get_system_setting, set_system_setting, sync_student_dual

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

# BREVO & SMTP CONFIGURATION
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp-relay.brevo.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER or "noreply@jnumate.edu")

# BSNL / SMS GATEWAY CONFIGURATION
BSNL_SMS_API_URL = os.environ.get("BSNL_SMS_API_URL", "")
BSNL_SMS_USERNAME = os.environ.get("BSNL_SMS_USERNAME", "")
BSNL_SMS_PASSWORD = os.environ.get("BSNL_SMS_PASSWORD", "")
BSNL_SMS_SENDER_ID = os.environ.get("BSNL_SMS_SENDER_ID", "JNUMAT")
BSNL_SMS_TEMPLATE_ID = os.environ.get("BSNL_SMS_TEMPLATE_ID", "")

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
    
    # Synchronize registered students strictly from database (local SQLite and Supabase Postgres)
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT r_id, name, email, phone, gender, dob, avatar_url, program, semester_year, age, reg_no, state, city, pincode FROM students")
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
            gender_clean = "Female" if "Female" in str(gender) or "F" == str(gender) else ("Male" if "Male" in str(gender) or "M" == str(gender) else "Other")
            avatar_url = r.get("avatar_url")
            prog = r.get("program") or "Jaipur National University"
            sem = r.get("semester_year") or ""
            acad_yr, adm_yr = get_academic_year_by_rid(rid)

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
                "program": prog,
                "semester_year": sem,
                "academic_year": acad_yr,
                "admission_year": adm_yr,
                "age": r.get("age"),
                "reg_no": r.get("reg_no"),
                "state": r.get("state"),
                "city": r.get("city"),
                "pincode": r.get("pincode")
            }
            SEARCHABLE_STUDENTS_LIST.append(student_obj)
            STUDENT_CACHE_BY_RID[rid] = student_obj
        conn.close()
    except Exception as e:
        print(f"Notice syncing DB students into search index: {e}")

    print(f"[SEARCH INDEX BUILT] Active students cached: {len(SEARCHABLE_STUDENTS_LIST)}.")

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
        gender_clean = "Female" if gender and ("Female" in str(gender) or "F" == str(gender)) else "Male"
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

def send_bsnl_phone_otp(phone_number, otp_code):
    """
    Dispatches OTP via BSNL SMS Gateway API.
    Falls back gracefully to logged output if BSNL API credentials are not set.
    """
    clean_phone = re.sub(r"[^0-9]", "", str(phone_number or ""))
    if clean_phone.startswith("91") and len(clean_phone) == 12:
        clean_phone = clean_phone[2:]
    if len(clean_phone) != 10:
        print(f"[BSNL SMS NOTICE] Invalid 10-digit Indian phone number: {phone_number}")
        return False, "Invalid phone number"

    sms_text = f"{otp_code} is your JnuMate verification code. Valid for 15 minutes. - Jaipur National University"

    if BSNL_SMS_API_URL and (BSNL_SMS_USERNAME or os.environ.get("BSNL_SMS_API_KEY")):
        import urllib.request
        import urllib.parse
        try:
            params = {
                "username": BSNL_SMS_USERNAME,
                "password": BSNL_SMS_PASSWORD,
                "senderid": BSNL_SMS_SENDER_ID,
                "templateid": BSNL_SMS_TEMPLATE_ID,
                "phone": clean_phone,
                "message": sms_text,
                "otp": otp_code
            }
            # Remove empty values
            query_str = urllib.parse.urlencode({k: v for k, v in params.items() if v})
            req_url = f"{BSNL_SMS_API_URL}?{query_str}"
            req = urllib.request.Request(req_url, headers={"User-Agent": "JnuMate-OTP-Engine/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                status_code = resp.getcode()
                response_text = resp.read().decode("utf-8", errors="ignore")
                print(f"[BSNL SMS DISPATCH] Success (HTTP {status_code}): Phone={clean_phone} | Code={otp_code} | Resp={response_text[:80]}")
                return True, "SMS sent via BSNL Gateway"
        except Exception as e:
            print(f"[BSNL SMS ERROR] Exception sending to {clean_phone}: {e}")
            return False, str(e)
    else:
        print(f"\n==========================================")
        print(f" [BSNL SMS GATEWAY SIMULATION]")
        print(f" Target Mobile: +91 {clean_phone}")
        print(f" OTP Code:      {otp_code}")
        print(f" Message:       {sms_text}")
        print(f" Status:        DELIVERED (BSNL Service)")
        print(f"==========================================\n")
        return True, "SMS simulated"

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
    return None

@app.route("/")
@app.route("/team/<int:team_id>")
@app.route("/create-team")
@app.route("/profile")
@app.route("/login")
@app.route("/students")
@app.route("/about")
@app.route("/events")
@app.route("/events/<event_id_or_slug>")
@app.route("/event/<event_id_or_slug>")
@app.route("/resources")
@app.route("/pyqs")
@app.route("/academic-calendar")
@app.route("/holidays")
@app.route("/syllabus")
@app.route("/notes")
@app.route("/threads")
@app.route("/course-select")
@app.route("/select-program")
@app.route("/enter-details")
@app.route("/sync-details")
@app.route("/otp")
@app.route("/verify-otp")
def index(team_id=None, event_id_or_slug=None):
    return render_template("index.html")

@app.route("/admin")
def admin_route_entry():
    if not session.get("is_admin"):
        return redirect("/login")
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

        cursor.execute("SELECT COUNT(*) FROM events")
        events_count = cursor.fetchone()[0]

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
        events_count = 0
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
            "total_events": events_count,
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
            SELECT r_id, name, age, gender, reg_no, email, phone, state, city, pincode, program, semester_year, is_registered, created_at
            FROM students
            WHERE is_registered = 1
            ORDER BY rowid DESC
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


@app.route("/api/admin/teams", methods=["GET"])
def admin_get_teams():
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT t.id, t.name, t.description, t.leader_r_id, t.whatsapp_link, t.seat_modes, t.hackathon_type, t.created_at,
                   s.name as leader_name, s.avatar_url as leader_avatar, s.email as leader_email
            FROM teams t
            LEFT JOIN students s ON UPPER(t.leader_r_id) = UPPER(s.r_id)
            ORDER BY t.id DESC
        """)
        team_rows = [dict(r) for r in cursor.fetchall()]

        cursor.execute("SELECT team_id, COUNT(*) as mcount FROM team_members GROUP BY team_id")
        member_counts = {r[0]: r[1] for r in cursor.fetchall()}

        for tm in team_rows:
            mcount = 1 + member_counts.get(tm["id"], 0)
            tm["member_count"] = mcount
            tm["members_count"] = mcount
            tm["team_size"] = tm.get("team_size") or 6
            tm["problem_statement"] = tm.get("description") or ""
            tm["tags"] = tm.get("seat_modes") or ""
            tm["vacancies"] = max(0, tm["team_size"] - mcount)
            tm["created_at"] = str(tm.get("created_at") or "")

        conn.close()
        return jsonify({"success": True, "teams": team_rows, "total": len(team_rows)})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/admin/teams/<int:team_id>", methods=["PUT"])
def admin_update_team(team_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    data = request.json or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or data.get("problem_statement") or "").strip()
    hackathon_type = (data.get("hackathon_type") or "sih").strip().lower()
    whatsapp_link = (data.get("whatsapp_link") or "").strip()
    leader_r_id = (data.get("leader_r_id") or "").strip().upper()

    if not name:
        return jsonify({"success": False, "message": "Team name is required"}), 400

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    try:
        if leader_r_id:
            cursor.execute(f"""
                UPDATE teams
                SET name = {p}, description = {p}, hackathon_type = {p}, whatsapp_link = {p}, leader_r_id = {p}
                WHERE id = {p}
            """, (name, description, hackathon_type, whatsapp_link, leader_r_id, team_id))
        else:
            cursor.execute(f"""
                UPDATE teams
                SET name = {p}, description = {p}, hackathon_type = {p}
                WHERE id = {p}
            """, (name, description, hackathon_type, team_id))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Team updated successfully"})
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/admin/teams/<int:team_id>", methods=["DELETE"])
def admin_delete_team(team_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(f"DELETE FROM team_messages WHERE team_id = {p}", (team_id,))
        cursor.execute(f"DELETE FROM join_requests WHERE team_id = {p}", (team_id,))
        cursor.execute(f"DELETE FROM team_members WHERE team_id = {p}", (team_id,))
        cursor.execute(f"DELETE FROM teams WHERE id = {p}", (team_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Team deleted successfully"})
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/admin/users", methods=["GET"])
def admin_get_users():
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT r_id, name, age, gender, reg_no, email, phone, state, city, pincode, 
                   avatar_url, is_registered, dob, program, semester_year, created_at
            FROM students
            WHERE is_registered = 1
            ORDER BY rowid DESC
        """)
        users = [dict(r) for r in cursor.fetchall()]
        for u in users:
            r_id = u.get("r_id") or ""
            cached = STUDENT_CACHE_BY_RID.get(r_id.upper()) or {}
            u["bio"] = cached.get("bio") or ""
            u["skills"] = cached.get("skills") or ""
            u["created_at"] = str(u.get("created_at") or "")
        conn.close()
        return jsonify({"success": True, "users": users, "total": len(users)})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/admin/users/<r_id>/activity", methods=["GET"])
def admin_get_user_activity(r_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    r_id = r_id.strip().upper()
    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
        profile_row = cursor.fetchone()
        profile = dict(profile_row) if profile_row else {}
        if profile.get("created_at"):
            profile["created_at"] = str(profile["created_at"])

        cursor.execute(f"""
            SELECT id, name, description, hackathon_type, created_at
            FROM teams WHERE UPPER(leader_r_id) = {p} ORDER BY id DESC
        """, (r_id,))
        teams_led = [dict(r) for r in cursor.fetchall()]
        for t in teams_led:
            t["created_at"] = str(t.get("created_at") or "")

        cursor.execute(f"""
            SELECT t.id, t.name, t.hackathon_type, tm.role, tm.joined_at
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE UPPER(tm.student_r_id) = {p}
            ORDER BY tm.id DESC
        """, (r_id,))
        teams_joined = [dict(r) for r in cursor.fetchall()]
        for t in teams_joined:
            t["joined_at"] = str(t.get("joined_at") or "")

        cursor.execute(f"""
            SELECT jr.id, jr.team_id, t.name as team_name, jr.status, jr.message, jr.created_at
            FROM join_requests jr
            JOIN teams t ON jr.team_id = t.id
            WHERE UPPER(jr.student_r_id) = {p}
            ORDER BY jr.id DESC
        """, (r_id,))
        join_requests = [dict(r) for r in cursor.fetchall()]
        for j in join_requests:
            j["created_at"] = str(j.get("created_at") or "")

        cursor.execute(f"""
            SELECT m.id, m.team_id, t.name as team_name, m.message, m.created_at
            FROM team_messages m
            LEFT JOIN teams t ON m.team_id = t.id
            WHERE UPPER(m.sender_r_id) = {p}
            ORDER BY m.id DESC LIMIT 40
        """, (r_id,))
        messages = [dict(r) for r in cursor.fetchall()]
        for m in messages:
            m["created_at"] = str(m.get("created_at") or "")

        cursor.execute(f"""
            SELECT id, title, message, type, is_read, created_at
            FROM notifications WHERE UPPER(recipient_r_id) = {p}
            ORDER BY id DESC LIMIT 20
        """, (r_id,))
        notifications = [dict(r) for r in cursor.fetchall()]
        for n in notifications:
            n["created_at"] = str(n.get("created_at") or "")

        cursor.execute(f"""
            SELECT id, email, used, created_at
            FROM email_otps WHERE UPPER(r_id) = {p}
            ORDER BY id DESC LIMIT 15
        """, (r_id,))
        otps = [dict(r) for r in cursor.fetchall()]
        for o in otps:
            o["created_at"] = str(o.get("created_at") or "")

        conn.close()
        for t in teams_led:
            t["problem_statement"] = t.get("description") or t.get("problem_statement") or ""
        return jsonify({
            "success": True,
            "student": profile,
            "profile": profile,
            "activity": {
                "teams_led": teams_led,
                "teams_joined": teams_joined,
                "join_requests_sent": join_requests,
                "chat_messages": messages,
                "notifications": notifications,
                "otp_log": otps
            },
            "teams_led": teams_led,
            "teams_joined": teams_joined,
            "join_requests": join_requests,
            "messages": messages,
            "notifications": notifications,
            "login_history": otps
        })
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500


# --- EVENTS PUBLIC & ADMIN ENDPOINTS ---

def format_event_row(row):
    d = dict(row)
    for field in ["themes", "important_dates", "organizers"]:
        val = d.get(field)
        if isinstance(val, str):
            try:
                d[field] = json.loads(val)
            except Exception:
                d[field] = []
        elif val is None:
            d[field] = []
    return d

@app.route("/api/events", methods=["GET"])
def get_events():
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()
    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    try:
        query = "SELECT * FROM events WHERE 1=1"
        params = []
        if category and category.lower() != "all events":
            query += f" AND LOWER(category) = LOWER({p})"
            params.append(category)
        if search:
            query += f" AND (LOWER(title) LIKE LOWER({p}) OR LOWER(venue) LIKE LOWER({p}) OR LOWER(summary) LIKE LOWER({p}))"
            params.append(f"%{search}%")
            params.append(f"%{search}%")
            params.append(f"%{search}%")
        query += " ORDER BY id ASC"
        cursor.execute(query, tuple(params))
        events = [format_event_row(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "events": events})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/events/<event_id_or_slug>", methods=["GET"])
def get_event_detail(event_id_or_slug):
    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    try:
        slug_raw = str(event_id_or_slug).strip().lower()
        if slug_raw.isdigit():
            cursor.execute(f"SELECT * FROM events WHERE id = {p}", (int(slug_raw),))
            row = cursor.fetchone()
        else:
            cursor.execute(f"SELECT * FROM events WHERE lower(slug) = {p}", (slug_raw,))
            row = cursor.fetchone()
            if not row and "sih" in slug_raw:
                cursor.execute(f"SELECT * FROM events WHERE slug LIKE {p} OR title LIKE {p}", ("%hackathon%", "%Hackathon%"))
                row = cursor.fetchone()
            elif not row and "ctf" in slug_raw:
                cursor.execute(f"SELECT * FROM events WHERE slug LIKE {p} OR title LIKE {p}", ("%flag%", "%Flag%"))
                row = cursor.fetchone()
            elif not row:
                cursor.execute(f"SELECT * FROM events WHERE slug LIKE {p} OR title LIKE {p}", (f"%{slug_raw}%", f"%{slug_raw}%"))
                row = cursor.fetchone()
        conn.close()
        if not row:
            return jsonify({"success": False, "message": "Event not found"}), 404
        return jsonify({"success": True, "event": format_event_row(row)})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/admin/events", methods=["POST"])
def admin_create_event():
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    data = request.json or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"success": False, "message": "Event title is required"}), 400

    category = (data.get("category") or "Hackathons").strip()
    badge_text = (data.get("badge_text") or category).strip()
    badge_color = (data.get("badge_color") or "green").strip()
    cover_image = (data.get("cover_image") or "/static/img/redesign/events/event_sih.png").strip()
    event_date = (data.get("event_date") or "").strip()
    event_day = (data.get("event_day") or "").strip()
    event_month = (data.get("event_month") or "").strip()
    event_time = (data.get("event_time") or "").strip()
    venue = (data.get("venue") or "JNU Campus").strip()
    venue_detail = (data.get("venue_detail") or venue).strip()
    audience = (data.get("audience") or "Open to all JNU students / UG & PG (All Departments)").strip()
    summary = (data.get("summary") or "").strip()
    about = (data.get("about") or summary).strip()
    guidelines_link = (data.get("guidelines_link") or "").strip()
    registration_link = (data.get("registration_link") or "/create-team").strip()

    slug = (data.get("slug") or "").strip().lower()
    if not slug:
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        if not slug:
            slug = f"event-{int(time.time())}"
        else:
            slug = f"{slug}-{int(time.time()) % 10000}"

    themes = data.get("themes") or []
    if isinstance(themes, list):
        themes_json = json.dumps(themes)
    else:
        themes_json = json.dumps([t.strip() for t in str(themes).split("\n") if t.strip()])

    important_dates = data.get("important_dates") or []
    if not isinstance(important_dates, list):
        important_dates = []
    important_dates_json = json.dumps(important_dates)

    organizers = data.get("organizers") or []
    if not isinstance(organizers, list):
        organizers = []
    organizers_json = json.dumps(organizers)

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            INSERT INTO events (
                slug, title, category, badge_text, badge_color, cover_image,
                event_date, event_day, event_month, event_time, venue, venue_detail,
                audience, summary, about, themes, guidelines_link, important_dates,
                organizers, registration_link
            ) VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p})
        """, (
            slug, title, category, badge_text, badge_color, cover_image,
            event_date, event_day, event_month, event_time, venue, venue_detail,
            audience, summary, about, themes_json, guidelines_link, important_dates_json,
            organizers_json, registration_link
        ))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({"success": True, "message": "Event created successfully", "id": new_id, "slug": slug})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/admin/events/<int:event_id>", methods=["PUT"])
def admin_update_event(event_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    data = request.json or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"success": False, "message": "Event title is required"}), 400

    category = (data.get("category") or "Hackathons").strip()
    badge_text = (data.get("badge_text") or category).strip()
    badge_color = (data.get("badge_color") or "green").strip()
    cover_image = (data.get("cover_image") or "").strip()
    event_date = (data.get("event_date") or "").strip()
    event_day = (data.get("event_day") or "").strip()
    event_month = (data.get("event_month") or "").strip()
    event_time = (data.get("event_time") or "").strip()
    venue = (data.get("venue") or "JNU Campus").strip()
    venue_detail = (data.get("venue_detail") or venue).strip()
    audience = (data.get("audience") or "").strip()
    summary = (data.get("summary") or "").strip()
    about = (data.get("about") or summary).strip()
    guidelines_link = (data.get("guidelines_link") or "").strip()
    registration_link = (data.get("registration_link") or "/create-team").strip()

    themes = data.get("themes") or []
    if isinstance(themes, list):
        themes_json = json.dumps(themes)
    else:
        themes_json = json.dumps([t.strip() for t in str(themes).split("\n") if t.strip()])

    important_dates = data.get("important_dates") or []
    if not isinstance(important_dates, list):
        important_dates = []
    important_dates_json = json.dumps(important_dates)

    organizers = data.get("organizers") or []
    if not isinstance(organizers, list):
        organizers = []
    organizers_json = json.dumps(organizers)

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            UPDATE events SET
                title = {p}, category = {p}, badge_text = {p}, badge_color = {p},
                cover_image = CASE WHEN {p} != '' THEN {p} ELSE cover_image END,
                event_date = {p}, event_day = {p}, event_month = {p}, event_time = {p},
                venue = {p}, venue_detail = {p}, audience = {p}, summary = {p}, about = {p},
                themes = {p}, guidelines_link = {p}, important_dates = {p},
                organizers = {p}, registration_link = {p}
            WHERE id = {p}
        """, (
            title, category, badge_text, badge_color,
            cover_image, cover_image,
            event_date, event_day, event_month, event_time,
            venue, venue_detail, audience, summary, about,
            themes_json, guidelines_link, important_dates_json,
            organizers_json, registration_link,
            event_id
        ))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Event updated successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/admin/events/<int:event_id>", methods=["DELETE"])
def admin_delete_event(event_id):
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(f"DELETE FROM events WHERE id = {p}", (event_id,))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Event deleted successfully"})
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/admin/events/upload", methods=["POST"])
def admin_upload_event_cover():
    if not session.get("is_admin"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file part in the request"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "message": "No file selected"}), 400
    
    from werkzeug.utils import secure_filename
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        return jsonify({"success": False, "message": "Invalid image file type. Allowed: PNG, JPG, WEBP, SVG, GIF"}), 400
    
    upload_folder = os.path.join(app.root_path, "static", "uploads", "events")
    os.makedirs(upload_folder, exist_ok=True)
    filename = f"event_{int(time.time())}_{secure_filename(file.filename)}"
    dest_path = os.path.join(upload_folder, filename)
    file.save(dest_path)
    url = f"/static/uploads/events/{filename}"
    return jsonify({"success": True, "url": url, "filename": filename})


# --- JNU PYQS PUBLIC & LOCAL TOOL ENDPOINTS ---

PYQ_METADATA_PATH = os.path.join(os.path.dirname(__file__), "pdf_metadata.json")

def load_pyq_metadata():
    if os.path.exists(PYQ_METADATA_PATH):
        try:
            with open(PYQ_METADATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
        except Exception as e:
            print(f"Error reading pdf_metadata.json: {e}")
    return []

def save_pyq_metadata(data):
    try:
        with open(PYQ_METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error writing pdf_metadata.json: {e}")
        return False

@app.route("/api/pyqs/schools-map", methods=["GET"])
def api_pyqs_schools_map():
    return jsonify({
        "success": True,
        "schools_map": SCHOOLS_COURSES_MAP,
        "total_schools": len(SCHOOLS_COURSES_MAP)
    })

@app.route("/api/pyqs", methods=["GET"])
def api_get_pyqs():
    items = load_pyq_metadata()
    q = request.args.get("q", "").strip().lower()
    school = request.args.get("school", "").strip()
    branch = request.args.get("branch", "").strip() or request.args.get("course", "").strip()
    sem = request.args.get("sem", "").strip() or request.args.get("semester", "").strip()
    p_type = request.args.get("type", "").strip().lower()
    year = request.args.get("year", "").strip()

    # Tokenize query for smart multi-field matching
    import re
    tokens = [t for t in re.split(r'[\s\-_,.]+', q) if t] if q else []

    filtered = []
    for item in items:
        # 1. School filter
        if school and school.lower() not in ["all schools", "all", ""]:
            item_school = str(item.get("school") or "").strip().lower()
            if school.lower() != item_school:
                continue

        # 2. Branch / Course filter
        if branch and branch.lower() not in ["all branches", "all courses", "all", ""]:
            courses = [str(c).strip().lower() for c in (item.get("courses") or [])]
            if isinstance(item.get("courses"), str):
                courses = [item.get("courses").strip().lower()]
            if branch.lower() not in courses and not any(branch.lower() in c for c in courses):
                continue

        # 3. Semester filter
        if sem and sem.lower() not in ["any sem", "any semester", "all", ""]:
            item_sem = str(item.get("semester") or "").strip().lower()
            clean_filter_sem = sem.lower().replace("semester", "").replace("sem", "").strip()
            clean_item_sem = item_sem.replace("semester", "").replace("sem", "").strip()
            if clean_filter_sem != clean_item_sem:
                continue

        # 4. Exam Type filter (Mid Term vs End Term)
        if p_type and p_type not in ["any type", "all", ""]:
            item_type = str(item.get("type") or "").strip().lower()
            clean_f_type = p_type.replace(" ", "").replace("-", "")
            clean_i_type = item_type.replace(" ", "").replace("-", "")
            if clean_f_type != clean_i_type:
                continue

        # 5. Year filter
        if year and year.lower() not in ["any year", "all", ""]:
            item_year = str(item.get("year") or "").strip()
            if str(year) != item_year:
                continue

        # 6. Smart Multi-Field Tokenized Search (all query words must match anywhere in paper metadata)
        if tokens:
            subj_name = str(item.get("subject_name") or "").lower()
            subj_code = str(item.get("subject_code") or "").lower()
            file_name = str(item.get("file_name") or "").lower().replace("_", " ").replace("-", " ")
            school_txt = str(item.get("school") or "").lower()
            courses_str = " ".join([str(c).lower() for c in (item.get("courses") or [])])
            type_txt = str(item.get("type") or "").lower()
            sem_txt = f"sem {item.get('semester') or ''} semester {item.get('semester') or ''}"
            year_txt = str(item.get("year") or "")
            
            searchable_corpus = f"{subj_name} {subj_code} {file_name} {school_txt} {courses_str} {type_txt} {sem_txt} {year_txt}".lower()
            
            match_all = True
            for tok in tokens:
                if tok in searchable_corpus:
                    continue
                # Common synonym stems
                if tok in ["math", "maths"] and ("mathematical" in searchable_corpus or "mathematics" in searchable_corpus or "math" in searchable_corpus):
                    continue
                if tok == "cse" and ("computer science" in searchable_corpus or "cse" in searchable_corpus):
                    continue
                if tok == "ai" and ("artificial intelligence" in searchable_corpus or "ai" in searchable_corpus):
                    continue
                if tok == "ml" and ("machine learning" in searchable_corpus or "ml" in searchable_corpus):
                    continue
                if tok == "dbms" and ("data base" in searchable_corpus or "database" in searchable_corpus or "dbms" in searchable_corpus):
                    continue
                if tok == "cn" and ("computer network" in searchable_corpus or "cn" in searchable_corpus):
                    continue
                match_all = False
                break
            
            if not match_all:
                continue

        filtered.append(item)

    return jsonify({
        "success": True,
        "pyqs": filtered,
        "total": len(filtered),
        "total_available": len(items)
    })

@app.route("/api/pyqs/download", methods=["GET"])
def api_pyqs_download():
    target_url = request.args.get("url", "").strip()
    custom_name = request.args.get("name", "").strip()

    if not target_url:
        return jsonify({"success": False, "message": "Missing file URL"}), 400

    # Auto convert standard GitHub file URLs to raw content URLs
    if "github.com/" in target_url and "/blob/" in target_url:
        target_url = target_url.replace("github.com/", "raw.githubusercontent.com/").replace("/blob/", "/")

    safe_filename = custom_name or os.path.basename(target_url.split("?")[0]) or "pyq_paper.pdf"
    if not safe_filename.lower().endswith(".pdf"):
        safe_filename += ".pdf"

    # Clean characters for header
    from werkzeug.utils import secure_filename
    clean_name = secure_filename(safe_filename) or "question_paper.pdf"
    if not clean_name.lower().endswith(".pdf"):
        clean_name += ".pdf"

    # Support local paths (e.g. /static/uploads/... or local files)
    if target_url.startswith("/") or target_url.startswith("./") or ":\\" in target_url:
        local_rel = target_url.lstrip("/")
        local_abs = os.path.join(os.path.dirname(__file__), local_rel)
        if os.path.exists(local_abs):
            from flask import send_file
            return send_file(local_abs, as_attachment=True, download_name=clean_name, mimetype="application/pdf")

    import urllib.request
    try:
        req = urllib.request.Request(
            target_url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        )
        response = urllib.request.urlopen(req, timeout=15)
        pdf_bytes = response.read()

        from flask import Response
        return Response(
            pdf_bytes,
            mimetype="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{clean_name}"',
                "Content-Length": str(len(pdf_bytes)),
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=86400"
            }
        )
    except Exception as e:
        # If remote fetch fails or is simulated, return redirect
        from flask import redirect
        return redirect(target_url)

@app.route("/api/local/pyq-metadata/save", methods=["POST"])
def api_local_pyq_metadata_save():
    payload = request.json or {}
    new_item = payload.get("item")
    bulk_items = payload.get("items")

    items = load_pyq_metadata()

    if new_item and isinstance(new_item, dict):
        file_name = new_item.get("file_name", "").strip()
        item_id = new_item.get("id") or f"pyq-{int(time.time())}"
        new_item["id"] = item_id

        # Check if already exists by file_name or id, update if found
        found_idx = -1
        for idx, it in enumerate(items):
            if (file_name and it.get("file_name") == file_name) or (it.get("id") == item_id):
                found_idx = idx
                break

        if found_idx >= 0:
            items[found_idx] = new_item
        else:
            items.append(new_item)

    elif bulk_items and isinstance(bulk_items, list):
        for bi in bulk_items:
            fn = bi.get("file_name", "").strip()
            iid = bi.get("id") or f"pyq-{int(time.time())}"
            bi["id"] = iid
            f_idx = next((i for i, x in enumerate(items) if x.get("file_name") == fn or x.get("id") == iid), -1)
            if f_idx >= 0:
                items[f_idx] = bi
            else:
                items.append(bi)

    ok = save_pyq_metadata(items)
    return jsonify({
        "success": ok,
        "count": len(items),
        "message": "Metadata saved successfully to pdf_metadata.json"
    })

@app.route("/tools/pyq-dashboard")
def local_pyq_dashboard_page():
    tools_dir = os.path.join(app.root_path, "tools")
    return send_from_directory(tools_dir, "pyq_dashboard.html")


# --- AUTH ENDPOINTS ---


@app.route("/api/auth/send-otp", methods=["POST"])
@app.route("/api/auth/request-otp", methods=["POST"])
def auth_send_otp():
    data = request.json or {}
    r_id = (data.get("rid") or data.get("r_id") or "").strip().upper()
    p = get_placeholder()

    if not r_id:
        return jsonify({"success": False, "message": "Please enter your R-ID"}), 400

    if r_id.lower() == "admin":
        return jsonify({
            "success": True,
            "is_admin": True,
            "message": "Administrator account detected. Please enter your password to proceed."
        })

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

# --- AUTH ENDPOINTS ---

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.json or {}
    email = str(data.get("email") or "").strip().lower()
    password = str(data.get("password") or "").strip()
    p = get_placeholder()

    if not email or not password:
        return jsonify({"success": False, "message": "Email/User ID and password are required"}), 400

    # Allow Administrator to authenticate directly via the main Sign In portal
    if email.lower() in [ADMIN_USERNAME.lower(), "admin", "admin@jnumate.edu"] and password == ADMIN_PASSWORD:
        session["is_admin"] = True
        session["user_rid"] = "admin"
        session.permanent = True
        return jsonify({
            "success": True,
            "message": "Administrator authenticated successfully",
            "is_admin": True,
            "user": {
                "id": "admin",
                "r_id": "admin",
                "name": "Administrator",
                "email": "admin@jnumate.edu",
                "role": "admin",
                "is_admin": True,
                "avatar_url": "/static/img/blank_pfp.jpg"
            }
        })

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM students WHERE LOWER(email) = {p}", (email,))
    student = cursor.fetchone()

    if not student:
        conn.close()
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    s_dict = dict(student)
    stored_pw = str(s_dict.get("password") or "")

    # Compare password (supports exact match or fallback)
    if stored_pw and stored_pw != password:
        conn.close()
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    user_rid = s_dict["r_id"]
    try:
        sync_student_dual(s_dict)
    except Exception as e:
        print(f"Notice syncing student on login: {e}")
    cursor.execute(f"""
        SELECT tm.team_id, t.name as team_name 
        FROM team_members tm 
        LEFT JOIN teams t ON tm.team_id = t.id 
        WHERE UPPER(tm.student_r_id) = {p}
    """, (user_rid.upper(),))
    tm_row = cursor.fetchone()
    team_id = tm_row["team_id"] if tm_row else None
    team_name = tm_row["team_name"] if tm_row else None
    conn.close()

    session["user_rid"] = user_rid
    session.permanent = True

    clean_av = s_dict.get("avatar_url") or DEFAULT_AVATAR_PATH

    user_payload = {
        "id": user_rid,
        "name": s_dict.get("name") or "Student",
        "email": s_dict.get("email") or email,
        "phone": s_dict.get("phone") or "",
        "gender": s_dict.get("gender") or "Other",
        "age": s_dict.get("age"),
        "reg_no": s_dict.get("reg_no") or "",
        "state": s_dict.get("state") or "",
        "city": s_dict.get("city") or "",
        "pincode": s_dict.get("pincode") or "",
        "avatar_url": clean_av,
        "team_id": team_id,
        "team_name": team_name
    }

    return jsonify({
        "success": True,
        "message": "Signed in successfully",
        "user": user_payload
    })

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.json or {}
    name = str(data.get("name") or "").strip()
    age_raw = data.get("age")
    try:
        age = int(age_raw) if age_raw is not None and str(age_raw).strip() != "" else None
    except ValueError:
        age = None
    gender = str(data.get("gender") or "Other").strip().capitalize()
    if gender not in ["Male", "Female", "Other"]:
        gender = "Other"
    reg_no = str(data.get("reg_no") or data.get("registration_number") or "").strip()
    email = str(data.get("email") or "").strip().lower()
    phone = str(data.get("phone") or data.get("phone_number") or "").strip()
    state = str(data.get("state") or "").strip()
    city = str(data.get("city") or "").strip()
    pincode = str(data.get("pincode") or "").strip()
    password = str(data.get("password") or "").strip()
    p = get_placeholder()

    if not name or not email or not phone:
        return jsonify({"success": False, "message": "Name, email and phone number are required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT r_id FROM students WHERE LOWER(email) = {p}", (email,))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return jsonify({"success": False, "message": "An account with this email already exists. Please sign in."}), 400

    # Generate internal unique r_id for database relationships
    import uuid
    clean_rid = f"U{uuid.uuid4().hex[:8].upper()}"

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.now() + datetime.timedelta(hours=24)

    cursor.execute(f"""
        INSERT INTO email_otps (r_id, email, otp, expires_at, used)
        VALUES ({p}, {p}, {p}, {p}, 0)
    """, (clean_rid, email, str(otp_code), str(expires_at)))
    conn.commit()
    conn.close()

    # Store registration details temporarily in session until OTP verification completes
    session["pending_reg"] = {
        "r_id": clean_rid,
        "name": name,
        "age": age,
        "gender": gender,
        "reg_no": reg_no,
        "email": email,
        "phone": phone,
        "state": state,
        "city": city,
        "pincode": pincode,
        "password": password
    }

    # Dispatch OTP strictly to Email
    is_email_on = str(get_system_setting("otp_email_enabled", "true")).lower() == "true"
    if is_email_on:
        threading.Thread(target=send_real_email_otp, args=(email, name, otp_code), daemon=True).start()

    print(f"\n==========================================")
    print(f" [REGISTRATION EMAIL OTP ISSUED]")
    print(f" Student: {name}")
    print(f" Email:   {email}")
    print(f" OTP:     {otp_code}")
    print(f"==========================================\n")

    return jsonify({
        "success": True,
        "message": f"Verification code sent to {email}",
        "email": email
    })

@app.route("/api/auth/resend-otp", methods=["POST"])
def auth_resend_otp():
    pending = session.get("pending_reg")
    data = request.json or {}
    email = (data.get("email") or (pending.get("email") if pending else "") or "").strip().lower()
    clean_rid = (pending.get("r_id") if pending else "") or f"U{random.randint(10000, 99999)}"
    name = (pending.get("name") if pending else "Student") or "Student"
    p = get_placeholder()

    if not email:
        return jsonify({"success": False, "message": "Email is required to resend OTP"}), 400

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.now() + datetime.timedelta(hours=24)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"""
        INSERT INTO email_otps (r_id, email, otp, expires_at, used)
        VALUES ({p}, {p}, {p}, {p}, 0)
    """, (clean_rid, email, str(otp_code), str(expires_at)))
    conn.commit()
    conn.close()

    is_email_on = str(get_system_setting("otp_email_enabled", "true")).lower() == "true"
    if is_email_on:
        threading.Thread(target=send_real_email_otp, args=(email, name, otp_code), daemon=True).start()

    print(f"\n[RESEND EMAIL OTP] Dispatched new code {otp_code} to {email}\n")
    return jsonify({
        "success": True,
        "message": f"New verification code sent to {email}"
    })

@app.route("/api/auth/verify-otp", methods=["POST"])
def auth_verify_otp():
    data = request.json or {}
    email = str(data.get("email") or "").strip().lower()
    raw_otp = str(data.get("otp", "")).strip()
    otp_code = "".join(ch for ch in raw_otp if ch.isdigit())
    p = get_placeholder()

    if not otp_code:
        return jsonify({"success": False, "message": "6-digit verification code is required"}), 400

    pending = session.get("pending_reg") or {}
    if not email and pending.get("email"):
        email = pending["email"].strip().lower()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT * FROM email_otps
        WHERE (LOWER(email) = {p} OR UPPER(r_id) = {p}) AND TRIM(otp) = {p}
        ORDER BY id DESC LIMIT 1
    """, (email, (pending.get("r_id") or "").upper(), otp_code))
    matching_otp = cursor.fetchone()

    cursor.execute(f"""
        SELECT * FROM email_otps
        WHERE (LOWER(email) = {p} OR UPPER(r_id) = {p})
        ORDER BY id DESC LIMIT 1
    """, (email, (pending.get("r_id") or "").upper()))
    latest_otp = cursor.fetchone()

    is_valid = False
    matched_id = None
    if matching_otp:
        is_valid = True
        matched_id = matching_otp["id"]
    elif latest_otp and str(latest_otp["otp"]).strip() == otp_code:
        is_valid = True
        matched_id = latest_otp["id"]

    if not is_valid:
        conn.close()
        return jsonify({"success": False, "message": "Incorrect verification code. Please check your email and try again."}), 200

    # Mark OTP used
    if matched_id:
        cursor.execute(f"UPDATE email_otps SET used = 1 WHERE id = {p}", (matched_id,))
    conn.commit()

    # Commit registered student to database
    reg_data = pending or data
    r_id = reg_data.get("r_id")
    if not r_id:
        import uuid
        r_id = f"U{uuid.uuid4().hex[:8].upper()}"

    name = reg_data.get("name") or "Student"
    age = reg_data.get("age")
    gender = reg_data.get("gender") or "Other"
    reg_no = reg_data.get("reg_no") or reg_data.get("registration_number") or ""
    phone = reg_data.get("phone") or ""
    state = reg_data.get("state") or ""
    city = reg_data.get("city") or ""
    pincode = reg_data.get("pincode") or ""
    password = reg_data.get("password") or ""
    avatar_url = DEFAULT_AVATAR_PATH

    cursor.execute(f"SELECT r_id FROM students WHERE LOWER(email) = {p}", (email,))
    existing_user = cursor.fetchone()

    if not existing_user:
        student_dict = {
            "r_id": r_id,
            "name": name,
            "age": age,
            "gender": gender,
            "reg_no": reg_no,
            "email": email,
            "phone": phone,
            "state": state,
            "city": city,
            "pincode": pincode,
            "avatar_url": avatar_url,
            "password": password
        }
        try:
            now_iso = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute(f"""
                INSERT INTO students (
                    r_id, name, age, gender, reg_no, email, phone, state, city, pincode,
                    avatar_url, password, is_registered, created_at
                ) VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, {p}, 1, {p})
            """, (
                r_id, name, age, gender, reg_no, email, phone, state, city, pincode,
                avatar_url, password, now_iso
            ))
            conn.commit()
            student_dict["created_at"] = now_iso
        except Exception as e:
            print(f"Error persisting student: {e}")
            try:
                conn.rollback()
            except Exception:
                pass

        try:
            sync_student_dual(student_dict)
        except Exception as e:
            print(f"Dual sync error: {e}")

    conn.close()
    session.pop("pending_reg", None)

    try:
        build_student_search_index()
    except Exception as e:
        print(f"Notice rebuilding search index on registration: {e}")

    return jsonify({
        "success": True,
        "message": "Account verified and registered successfully. Please sign in.",
        "requires_login": True
    })

@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    user_rid = session.get("user_rid") or request.args.get("r_id", "").strip().upper()
    if not user_rid:
        return jsonify({"authenticated": False})

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (user_rid.upper(),))
    student = cursor.fetchone()

    if not student:
        conn.close()
        return jsonify({"authenticated": False})

    s_dict = dict(student)

    cursor.execute(f"""
        SELECT tm.team_id, t.name as team_name 
        FROM team_members tm 
        LEFT JOIN teams t ON tm.team_id = t.id 
        WHERE UPPER(tm.student_r_id) = {p}
    """, (user_rid.upper(),))
    tm_row = cursor.fetchone()
    team_id = tm_row["team_id"] if tm_row else None
    team_name = tm_row["team_name"] if tm_row else None
    conn.close()

    clean_av = s_dict.get("avatar_url") or DEFAULT_AVATAR_PATH

    return jsonify({
        "authenticated": True,
        "user": {
            "id": s_dict["r_id"],
            "name": s_dict.get("name") or "Student",
            "email": s_dict.get("email") or "",
            "phone": s_dict.get("phone") or "",
            "gender": s_dict.get("gender") or "Other",
            "age": s_dict.get("age"),
            "reg_no": s_dict.get("reg_no") or "",
            "state": s_dict.get("state") or "",
            "city": s_dict.get("city") or "",
            "pincode": s_dict.get("pincode") or "",
            "avatar_url": clean_av,
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
    email = str(data.get("email") or "").strip().lower()

    if not r_id and not email:
        return jsonify({"success": False, "message": "Identifier required"}), 400

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()
    if r_id:
        cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
    else:
        cursor.execute(f"SELECT * FROM students WHERE LOWER(email) = {p}", (email,))
    student = cursor.fetchone()

    if not student:
        conn.close()
        return jsonify({"success": False, "message": "Student record not found"}), 404

    s_dict = dict(student)
    user_rid = s_dict["r_id"]

    cursor.execute(f"""
        SELECT tm.team_id, t.name as team_name 
        FROM team_members tm 
        LEFT JOIN teams t ON tm.team_id = t.id 
        WHERE UPPER(tm.student_r_id) = {p}
    """, (user_rid.upper(),))
    tm_row = cursor.fetchone()
    team_id = tm_row["team_id"] if tm_row else None
    team_name = tm_row["team_name"] if tm_row else None
    conn.close()

    session["user_rid"] = user_rid
    session.permanent = True
    clean_av = s_dict.get("avatar_url") or DEFAULT_AVATAR_PATH

    return jsonify({
        "success": True,
        "authenticated": True,
        "user": {
            "id": s_dict["r_id"],
            "name": s_dict.get("name") or "Student",
            "email": s_dict.get("email") or "",
            "phone": s_dict.get("phone") or "",
            "gender": s_dict.get("gender") or "Other",
            "age": s_dict.get("age"),
            "reg_no": s_dict.get("reg_no") or "",
            "state": s_dict.get("state") or "",
            "city": s_dict.get("city") or "",
            "pincode": s_dict.get("pincode") or "",
            "avatar_url": clean_av,
            "team_id": team_id,
            "team_name": team_name
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
                    ORDER BY id DESC LIMIT 1
                """, (t_id, current_r_id.upper()))
                req = cursor.fetchone()
                if req and req["status"]:
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
        "has_requested": (user_status == "pending"),
        "hackathon_type": (t_hackathon_type or "sih").lower()
    }

@app.route("/api/teams", methods=["GET"])
def get_teams():
    try:
        current_r_id = (
            request.args.get("r_id") or 
            request.headers.get("X-Student-R-ID") or 
            session.get("user_rid") or 
            session.get("student_r_id") or 
            ""
        ).strip().upper()
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
    current_r_id = (
        request.args.get("r_id") or 
        request.headers.get("X-Student-R-ID") or 
        session.get("user_rid") or 
        session.get("student_r_id") or 
        ""
    ).strip().upper()
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
    student_r_id = (
        data.get("student_r_id")
        or data.get("student_id")
        or request.headers.get("X-Student-R-ID")
        or request.args.get("r_id")
        or session.get("user_rid")
        or session.get("student_r_id")
        or ""
    ).strip().upper()
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

    # Check if student is already a member of this team
    cursor.execute(f"SELECT team_id FROM team_members WHERE team_id = {p} AND UPPER(student_r_id) = {p}", (team_id, student_r_id))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "message": "You are already a member of this team"}), 400

    # Check if a pending join request already exists for this team
    cursor.execute(f"""
        SELECT id, status FROM join_requests 
        WHERE team_id = {p} AND UPPER(student_r_id) = {p} 
        ORDER BY id DESC LIMIT 1
    """, (team_id, student_r_id))
    existing_req = cursor.fetchone()
    if existing_req:
        st = (existing_req["status"] if hasattr(existing_req, '__getitem__') else existing_req[1]) or ""
        if st.lower() == 'pending':
            conn.close()
            return jsonify({"success": True, "message": "Join request already sent to team leader!", "already_sent": True})
        elif st.lower() == 'accepted':
            conn.close()
            return jsonify({"success": False, "message": "You are already a member of this team"}), 400

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
        return jsonify({"success": True, "message": "Join request sent to team leader!"})
    except Exception as e:
        conn.close()
        return jsonify({"success": True, "message": "Join request already sent to team leader!", "already_sent": True})

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
        return jsonify({"success": False, "message": "User identifier required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p} OR LOWER(email) = {p}", (r_id, r_id.lower()))
    db_student = cursor.fetchone()

    if not db_student:
        conn.close()
        return jsonify({"success": False, "message": "User not found"}), 404

    s_dict = dict(db_student)
    user_actual_rid = s_dict["r_id"]

    clean_avatar = s_dict.get("avatar_url") or DEFAULT_AVATAR_PATH
    city = s_dict.get("city") or ""
    state = s_dict.get("state") or ""
    pincode = s_dict.get("pincode") or ""
    full_loc = ", ".join([x for x in [city, state, pincode] if x]) or "Jaipur, Rajasthan"

    profile_data = {
        "r_id": user_actual_rid,
        "name": s_dict.get("name") or "Student",
        "email": s_dict.get("email") or "",
        "phone": s_dict.get("phone") or "Not Provided",
        "gender": s_dict.get("gender") or "Not Specified",
        "age": s_dict.get("age"),
        "reg_no": s_dict.get("reg_no") or "N/A",
        "state": state or "Not Provided",
        "city": city or "Not Provided",
        "pincode": pincode or "Not Provided",
        "avatar_url": clean_avatar,
        "program": s_dict.get("program") or "Jaipur National University",
        "address": full_loc,
        "academic_year": get_academic_year_by_rid(user_actual_rid)[0],
        "admission_year": get_academic_year_by_rid(user_actual_rid)[1]
    }

    cursor.execute(f"""
        SELECT t.* FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE UPPER(tm.student_r_id) = {p}
        ORDER BY t.id DESC
    """, (user_actual_rid.upper(),))
    team_rows = cursor.fetchall()
    teams_list = [format_team_data(t, user_actual_rid, conn=conn) for t in team_rows]
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
    r_id = (request.args.get("r_id") or request.args.get("rid") or session.get("user_rid") or "").strip().upper()

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Query all current active members in the squad (captain + confirmed members)
        cursor.execute(f"""
            SELECT UPPER(leader_r_id) FROM teams WHERE id = {p}
            UNION
            SELECT UPPER(student_r_id) FROM team_members WHERE team_id = {p}
        """, (team_id, team_id))
        active_members = {row[0] for row in cursor.fetchall() if row[0]}

        cursor.execute(f"""
            SELECT id, team_id, sender_r_id, sender_name, sender_avatar, message, reactions,
                   attachment_name, attachment_url, attachment_size, attachment_type, created_at
            FROM team_messages
            WHERE team_id = {p}
            ORDER BY id ASC
            LIMIT 200
        """, (team_id,))
        rows = cursor.fetchall()
        messages = []
        for r in rows:
            m = dict(r)
            m["created_at"] = str(m.get("created_at") or "")
            sender = (m.get("sender_r_id") or "").strip().upper()
            m["is_active_member"] = bool(sender and (sender in active_members or not active_members))
            rx = m.get("reactions")
            if rx:
                try:
                    m["reactions"] = json.loads(rx) if isinstance(rx, str) else rx
                except:
                    m["reactions"] = {}
            else:
                m["reactions"] = {}
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
    r_id = (
        data.get("r_id") or 
        data.get("rid") or 
        request.headers.get("X-Student-R-ID") or 
        session.get("user_rid") or 
        session.get("student_r_id") or 
        ""
    ).strip().upper()
    raw_msg = (data.get("message") or "").strip()
    att_name = (data.get("attachment_name") or "").strip()
    att_url = (data.get("attachment_url") or "").strip()
    att_size = (data.get("attachment_size") or "").strip()
    att_type = (data.get("attachment_type") or "").strip()

    if not raw_msg and not att_name:
        return jsonify({"success": False, "message": "Message or attachment cannot be empty."}), 400
    if len(raw_msg) > 1500:
        return jsonify({"success": False, "message": "Message cannot exceed 1,500 characters."}), 400

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Check active members (leader + confirmed members)
        cursor.execute(f"""
            SELECT UPPER(leader_r_id) FROM teams WHERE id = {p}
            UNION
            SELECT UPPER(student_r_id) FROM team_members WHERE team_id = {p}
        """, (team_id, team_id))
        active_members = {row[0] for row in cursor.fetchall() if row[0]}

        if not r_id:
            sess_rid = (session.get("user_rid") or "").strip().upper()
            if sess_rid:
                r_id = sess_rid
            elif active_members:
                r_id = list(active_members)[0]
            else:
                r_id = "R44456"

        # Guarantee student exists in students table to prevent FOREIGN KEY constraint failures
        try:
            cursor.execute(f"SELECT r_id FROM students WHERE UPPER(r_id) = {p}", (r_id,))
            s_row = cursor.fetchone()
            if not s_row:
                s_row = auto_import_student_from_json(r_id, conn, cursor)
            if not s_row:
                if is_postgres():
                    cursor.execute("""
                        INSERT INTO students (r_id, name, email, gender, dob, avatar_url, program, is_registered)
                        VALUES (%s, %s, %s, 'Student', 'N/A', '', 'Jaipur National University', 0)
                        ON CONFLICT (r_id) DO NOTHING
                    """, (r_id, r_id, f"{r_id.lower()}@student.edu"))
                else:
                    cursor.execute("""
                        INSERT OR IGNORE INTO students (r_id, name, email, gender, dob, avatar_url, program, is_registered)
                        VALUES (?, ?, ?, 'Student', 'N/A', '', 'Jaipur National University', 0)
                    """, (r_id, r_id, f"{r_id.lower()}@student.edu"))
                conn.commit()
        except Exception as e:
            try:
                conn.rollback()
            except Exception:
                pass

        # Lookup sender name and avatar
        sender_info = STUDENT_CACHE_BY_RID.get(r_id)
        if not sender_info:
            try:
                cursor.execute(f"SELECT name, avatar_url FROM students WHERE UPPER(r_id) = {p}", (r_id,))
                s_row = cursor.fetchone()
                sender_info = dict(s_row) if s_row else {}
            except Exception:
                sender_info = {}

        sender_name = (sender_info.get("name") or f"Student @{r_id}").strip()
        sender_avatar = sender_info.get("avatar_url") or DEFAULT_AVATAR_PATH
        if not is_valid_student_image(sender_avatar, r_id):
            sender_avatar = DEFAULT_AVATAR_PATH

        new_msg = {}
        try:
            if is_postgres():
                cursor.execute("""
                    INSERT INTO team_messages (team_id, sender_r_id, sender_name, sender_avatar, message, reactions,
                                               attachment_name, attachment_url, attachment_size, attachment_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, team_id, sender_r_id, sender_name, sender_avatar, message, reactions,
                              attachment_name, attachment_url, attachment_size, attachment_type, created_at
                """, (team_id, r_id, sender_name, sender_avatar, raw_msg, '{}', att_name, att_url, att_size, att_type))
                new_row = cursor.fetchone()
                conn.commit()
                new_msg = dict(new_row) if new_row else {}
            else:
                cursor.execute("""
                    INSERT INTO team_messages (team_id, sender_r_id, sender_name, sender_avatar, message, reactions,
                                               attachment_name, attachment_url, attachment_size, attachment_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (team_id, r_id, sender_name, sender_avatar, raw_msg, '{}', att_name, att_url, att_size, att_type))
                conn.commit()
                cursor.execute("""
                    SELECT id, team_id, sender_r_id, sender_name, sender_avatar, message, reactions,
                           attachment_name, attachment_url, attachment_size, attachment_type, created_at
                    FROM team_messages WHERE id = last_insert_rowid()
                """)
                new_row = cursor.fetchone()
                new_msg = dict(new_row) if new_row else {}
        except Exception as insert_err:
            try:
                conn.rollback()
            except Exception:
                pass
            print(f"[RETRYING CORE MSG INSERT] {insert_err}")
            # Fallback without attachment / reactions columns in case older schema exists on live Supabase
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
                cursor.execute("""
                    SELECT id, team_id, sender_r_id, sender_name, sender_avatar, message, created_at
                    FROM team_messages WHERE id = last_insert_rowid()
                """)
                new_row = cursor.fetchone()
                new_msg = dict(new_row) if new_row else {}

        if new_msg:
            new_msg["created_at"] = str(new_msg.get("created_at") or "")
            new_msg["is_active_member"] = True
            new_msg["reactions"] = {}

        conn.close()
        return jsonify({"success": True, "message": new_msg})
    except Exception as e:
        conn.close()
        print(f"Notice posting team message: {e}")
        return jsonify({"success": False, "message": "Failed to post message", "error": str(e)}), 500


@app.route("/api/teams/<int:team_id>/messages/<int:msg_id>/react", methods=["POST"])
def react_team_message(team_id, msg_id):
    data = request.json or {}
    r_id = (data.get("r_id") or data.get("rid") or session.get("user_rid") or "").strip().upper()
    emoji = (data.get("emoji") or "👍").strip()

    p = get_placeholder()
    conn = get_db()
    cursor = conn.cursor()

    try:
        if not r_id:
            cursor.execute(f"SELECT leader_r_id FROM teams WHERE id = {p}", (team_id,))
            l_row = cursor.fetchone()
            if l_row and l_row[0]:
                r_id = l_row[0].strip().upper()
            else:
                r_id = "R44456"

        cursor.execute(f"SELECT reactions FROM team_messages WHERE id = {p} AND team_id = {p}", (msg_id, team_id))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return jsonify({"success": False, "message": "Message not found"}), 404

        raw_rx = row[0]
        try:
            reactions = json.loads(raw_rx) if raw_rx else {}
        except:
            reactions = {}

        current_users = reactions.get(emoji, [])
        if r_id in current_users:
            current_users.remove(r_id)
            if not current_users:
                reactions.pop(emoji, None)
            else:
                reactions[emoji] = current_users
        else:
            current_users.append(r_id)
            reactions[emoji] = current_users

        new_rx_json = json.dumps(reactions)
        cursor.execute(f"UPDATE team_messages SET reactions = {p} WHERE id = {p}", (new_rx_json, msg_id))
        conn.commit()
        conn.close()

        return jsonify({"success": True, "reactions": reactions, "msg_id": msg_id})
    except Exception as e:
        conn.close()
        print(f"Notice reacting to message: {e}")
        return jsonify({"success": False, "message": "Failed to react", "error": str(e)}), 500

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
