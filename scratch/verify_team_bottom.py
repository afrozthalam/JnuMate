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
        page.goto("http://127.0.0.1:5000/")
        page.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(student_data)}');")
        page.goto("http://127.0.0.1:5000/team/28")
        page.wait_for_timeout(2000)

        # Scroll #teamDetailModal
        page.evaluate("const el = document.getElementById('teamDetailModal'); if (el) el.scrollTo(0, el.scrollHeight);")
        page.wait_for_timeout(800)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_team_detail_bottom_cards.png"))
        print("Saved verify_team_detail_bottom_cards.png", flush=True)

        browser.close()

if __name__ == "__main__":
    run()
