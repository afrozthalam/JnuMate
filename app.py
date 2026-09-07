import os
import json
import random
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, jsonify, session
from database import get_db, init_db, is_postgres

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
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER or "noreply@hackmate.edu")

def get_placeholder():
    return "%s" if is_postgres() else "?"

def send_real_email_otp(target_email, r_id, otp_code):
    subject = f"{otp_code} is your HackMate Verification Code"
    
    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color: #F8F9FA; color: #202124; font-family: 'Google Sans', Roboto, sans-serif; padding: 40px 20px; margin: 0;">
    <div style="max-width: 420px; margin: 0 auto; background: #FFFFFF; border: 1px solid #DADCE0; border-radius: 20px; padding: 32px; box-shadow: 0 1px 3px rgba(60,64,67,0.15);">
        <div style="font-size: 20px; font-weight: 700; margin-bottom: 16px;">
            <span style="color:#1A73E8;">Hack</span><span style="color:#EA4335;">M</span><span style="color:#FBBC04;">a</span><span style="color:#34A853;">t</span><span style="color:#EA4335;">e</span>
        </div>
        <div style="font-size: 14px; color: #5F6368; margin-bottom: 8px;">Verification Code for Student <b>{r_id}</b></div>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1A73E8; margin: 20px 0; padding: 16px; background: #E8F0FE; border-radius: 12px; text-align: center;">{otp_code}</div>
        <div style="font-size: 12px; color: #5F6368; line-height: 1.5;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</div>
    </div>
</body>
</html>"""

    if SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"HackMate <{SMTP_FROM}>"
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
def index():
    return render_template("index.html")

# --- AUTH ENDPOINTS ---

@app.route("/api/auth/send-otp", methods=["POST"])
def auth_send_otp():
    data = request.json or {}
    r_id = data.get("r_id", "").strip().upper()
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
        return jsonify({"success": False, "message": "R-ID not found in college database"}), 404

    student_dict = dict(student)
    email = student_dict.get("email") or f"{r_id}@student.edu"

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.now() + datetime.timedelta(minutes=10)

    cursor.execute(f"UPDATE email_otps SET used = 1 WHERE UPPER(r_id) = {p}", (r_id,))
    
    cursor.execute(f"""
        INSERT INTO email_otps (r_id, email, otp, expires_at)
        VALUES ({p}, {p}, {p}, {p})
    """, (r_id, email, otp_code, expires_at))
    conn.commit()
    conn.close()

    sent_ok, msg = send_real_email_otp(email, r_id, otp_code)

    return jsonify({
        "success": True,
        "message": f"Code sent to {mask_email(email)}",
        "masked_email": mask_email(email)
    })

@app.route("/api/auth/verify-otp", methods=["POST"])
def auth_verify_otp():
    data = request.json or {}
    r_id = data.get("r_id", "").strip().upper()
    otp_code = data.get("otp", "").strip()
    p = get_placeholder()

    if not r_id or not otp_code:
        return jsonify({"success": False, "message": "R-ID and OTP code are required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM students WHERE UPPER(r_id) = {p}", (r_id,))
    student = cursor.fetchone()

    if not student:
        student = auto_import_student_from_json(r_id, conn, cursor)

    if not student:
        conn.close()
        return jsonify({"success": False, "message": "Student not found"}), 404

    cursor.execute(f"""
        SELECT * FROM email_otps
        WHERE UPPER(r_id) = {p} AND otp = {p} AND used = 0 AND expires_at > CURRENT_TIMESTAMP
        ORDER BY id DESC LIMIT 1
    """, (r_id, otp_code))
    otp_record = cursor.fetchone()

    if not otp_record:
        conn.close()
        return jsonify({"success": False, "message": "Invalid or expired verification code"}), 400

    cursor.execute(f"UPDATE email_otps SET used = 1 WHERE id = {p}", (otp_record["id"],))
    cursor.execute(f"UPDATE students SET is_registered = 1 WHERE UPPER(r_id) = {p}", (r_id,))
    conn.commit()

    cursor.execute(f"SELECT r_id, name, email, phone, gender, dob, avatar_url, is_registered FROM students WHERE UPPER(r_id) = {p}", (r_id,))
    updated_student = dict(cursor.fetchone())
    conn.close()

    return jsonify({
        "success": True,
        "message": "Signed in successfully",
        "student": updated_student
    })

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.json or {}
    r_id = data.get("r_id", "").strip().upper()
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

    return jsonify({
        "success": True,
        "message": "Account created",
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

# --- STUDENT SEARCH (WITH DOB, EMAIL, PHOTO & DETAILS) ---

@app.route("/api/students/search", methods=["GET"])
def student_search():
    query = request.args.get("q", "").strip().upper()
    p = get_placeholder()
    if len(query) < 2:
        return jsonify({"students": []})

    results_map = {}

    # First search JSON map in memory
    for r_id_key, item in STUDENT_PROFILES_MAP.items():
        name = item.get("name", "")
        if query in r_id_key or query in name.upper():
            personal = item.get("personal_details", {}) or {}
            email = (personal.get("EmailID") or f"{r_id_key}@student.edu").strip()
            phone = (personal.get("Mobile No") or "").strip()
            gender = personal.get("Gender") or "Other"
            dob = (personal.get("Date of Birth") or "N/A").strip()
            
            gender_clean = "Female" if "Female" in gender or "F" == gender else ("Male" if "Male" in gender or "M" == gender else "Other")
            image_urls = item.get("image_urls") or []
            avatar_url = image_urls[0] if image_urls else f"https://api.dicebear.com/7.x/avataaars/svg?seed={r_id_key}"

            results_map[r_id_key] = {
                "r_id": r_id_key,
                "name": name.strip(),
                "email": email,
                "phone": phone,
                "gender": gender_clean,
                "dob": dob,
                "avatar_url": avatar_url
            }
            if len(results_map) >= 8:
                break

    # Also search DB table
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"""
        SELECT r_id, name, email, phone, gender, dob, avatar_url FROM students
        WHERE UPPER(r_id) LIKE {p} OR UPPER(name) LIKE {p}
        LIMIT 8
    """, (f"%{query}%", f"%{query}%"))
    db_rows = cursor.fetchall()
    conn.close()

    for r in db_rows:
        d = dict(r)
        d_id = d["r_id"].upper()
        if d_id not in results_map:
            results_map[d_id] = d
        else:
            if d.get("dob") and d.get("dob") != "N/A":
                results_map[d_id]["dob"] = d["dob"]

    return jsonify({"students": list(results_map.values())[:8]})

# --- TEAM MANAGEMENT & DETAILED PANEL ---

def format_team_data(team_row, current_r_id=None):
    conn = get_db()
    cursor = conn.cursor()
    p = get_placeholder()

    cursor.execute(f"""
        SELECT tm.role, s.r_id, s.name, s.gender, s.dob, s.avatar_url, s.phone, s.email
        FROM team_members tm
        JOIN students s ON tm.student_r_id = s.r_id
        WHERE tm.team_id = {p}
        ORDER BY tm.role DESC, tm.joined_at ASC
    """, (team_row["id"],))
    members = [dict(r) for r in cursor.fetchall()]

    member_count = len(members)
    female_count = sum(1 for m in members if m["gender"] == "Female")
    is_full = member_count >= 6
    has_female = female_count >= 1

    user_status = "none"
    if current_r_id:
        for m in members:
            if m["r_id"].upper() == current_r_id.upper():
                user_status = "leader" if m["role"] == "leader" else "member"
                break
        if user_status == "none":
            cursor.execute(f"""
                SELECT status FROM join_requests
                WHERE team_id = {p} AND UPPER(student_r_id) = {p}
            """, (team_row["id"], current_r_id.upper()))
            req = cursor.fetchone()
            if req:
                user_status = req["status"]

    conn.close()

    return {
        "id": team_row["id"],
        "name": team_row["name"],
        "description": team_row["description"],
        "leader_r_id": team_row["leader_r_id"],
        "whatsapp_link": team_row["whatsapp_link"] if (user_status in ["leader", "member"]) else None,
        "has_whatsapp": bool(team_row["whatsapp_link"]),
        "created_at": str(team_row["created_at"]),
        "members": members,
        "member_count": member_count,
        "female_count": female_count,
        "is_full": is_full,
        "has_female": has_female,
        "needs_female": not has_female,
        "user_status": user_status
    }

@app.route("/api/teams", methods=["GET"])
def get_teams():
    current_r_id = request.args.get("r_id", "").strip().upper()
    search = request.args.get("search", "").strip()
    filter_type = request.args.get("filter", "all")
    p = get_placeholder()

    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM teams WHERE 1=1"
    params = []

    if search:
        query += f" AND (name LIKE {p} OR description LIKE {p})"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    team_rows = cursor.fetchall()
    conn.close()

    teams_data = [format_team_data(t, current_r_id) for t in team_rows]

    if filter_type == "open":
        teams_data = [t for t in teams_data if not t["is_full"]]

    return jsonify({"teams": teams_data})

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
    leader_r_id = data.get("leader_r_id", "").strip().upper()
    team_name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    whatsapp_link = data.get("whatsapp_link", "").strip()
    friend_r_ids = data.get("friend_r_ids", [])
    p = get_placeholder()

    if not leader_r_id or not team_name:
        return jsonify({"success": False, "message": "Team name required"}), 400

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

    unique_friends = list(set([f.strip().upper() for f in friend_r_ids if f.strip().upper() != leader_r_id]))
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
            INSERT INTO teams (name, description, leader_r_id, whatsapp_link)
            VALUES ({p}, {p}, {p}, {p}) RETURNING id
        """, (team_name, description, leader_r_id, whatsapp_link))
        team_id = cursor.fetchone()["id"]
    else:
        cursor.execute(f"""
            INSERT INTO teams (name, description, leader_r_id, whatsapp_link)
            VALUES ({p}, {p}, {p}, {p})
        """, (team_name, description, leader_r_id, whatsapp_link))
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
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Team created with {1 + len(valid_friends)} members",
        "team_id": team_id
    })

@app.route("/api/teams/<int:team_id>/request", methods=["POST"])
def request_join_team(team_id):
    data = request.json or {}
    student_r_id = data.get("student_r_id", "").strip().upper()
    message = data.get("message", "").strip()
    p = get_placeholder()

    if not student_r_id:
        return jsonify({"success": False, "message": "Student R-ID required"}), 400

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
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Member accepted"})

    elif action == "reject":
        cursor.execute(f"UPDATE join_requests SET status = 'rejected' WHERE id = {p}", (req_id,))
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

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
