import json
import os
from database import init_db, get_db, is_postgres

JSON_PATH = os.path.join(os.path.dirname(__file__), "all_profiles_public.json")

def seed_students():
    print("Initializing database tables...")
    init_db()

    conn = get_db()
    cursor = conn.cursor()

    if not os.path.exists(JSON_PATH):
        print(f"Error: {JSON_PATH} not found.")
        conn.close()
        return

    print("Loading profiles from all_profiles_public.json...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        profiles = json.load(f)

    print(f"Loaded {len(profiles)} profiles. Uploading to {'Supabase PostgreSQL' if is_postgres() else 'Local SQLite'}...")

    records = []
    for item in profiles:
        r_id = item.get("id")
        if not r_id:
            continue

        name = item.get("name") or "Unknown Student"
        personal = item.get("personal_details", {}) or {}
        
        email = personal.get("EmailID") or f"{r_id}@student.edu"
        phone = personal.get("Mobile No") or ""
        gender = personal.get("Gender") or "Not Specified"
        
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

        records.append((
            r_id.strip().upper(),
            name.strip(),
            email.strip(),
            phone.strip(),
            gender_clean,
            avatar_url,
            0
        ))

    if is_postgres():
        p = "%s"
        # Upsert for PostgreSQL
        query = f"""
            INSERT INTO students (r_id, name, email, phone, gender, avatar_url, is_registered)
            VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p})
            ON CONFLICT (r_id) DO NOTHING;
        """
        for r in records:
            cursor.execute(query, r)
    else:
        cursor.executemany("""
            INSERT OR IGNORE INTO students (r_id, name, email, phone, gender, avatar_url, is_registered)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, records)

    conn.commit()
    conn.close()

    print(f"Seeding completed successfully! Imported {len(records)} student profiles into database.")

if __name__ == "__main__":
    seed_students()
