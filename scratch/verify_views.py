import os
import json
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = r"C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        student_data = {
            "id": "R44456",
            "r_id": "R44456",
            "name": "MD HASAN RAZA",
            "email": "ritcruiter@gmail.com",
            "program": "B.Tech (Computer Science Engineering)",
            "gender": "Male",
            "academic_year": "4th Year Student",
            "admission_year": "2023",
            "avatar_url": "https://s3.ap-south-1.amazonaws.com/univ.jnujaipur.ac.in/StudentDocuments/16948/StudentImage/R44456.jpg"
        }

        # 1. Login session
        page.goto("http://127.0.0.1:5000/")
        page.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(student_data)}');")
        page.goto("http://127.0.0.1:5000/create-team")
        page.wait_for_timeout(1500)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_create_team_dropdown.png"))
        print("Saved verify_create_team_dropdown.png", flush=True)

        # 2. Events Page
        page.goto("http://127.0.0.1:5000/events")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_events_logos.png"))
        print("Saved verify_events_logos.png", flush=True)

        # 3. Academic Calendar
        page.goto("http://127.0.0.1:5000/academic-calendar")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_academic_calendar_odd.png"))
        print("Saved verify_academic_calendar_odd.png", flush=True)

        # 4. Holidays Page
        page.goto("http://127.0.0.1:5000/holidays")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_holidays_page.png"))
        print("Saved verify_holidays_page.png", flush=True)

        # 5. Resources Page
        page.goto("http://127.0.0.1:5000/resources")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_resources_6cards_3cols.png"))
        print("Saved verify_resources_6cards_3cols.png", flush=True)

        # 6. PYQs Page
        page.goto("http://127.0.0.1:5000/pyqs")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_pyqs_wide_layout.png"))
        print("Saved verify_pyqs_wide_layout.png", flush=True)

        browser.close()

if __name__ == "__main__":
    run()
