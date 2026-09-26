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
            "id": "R15473",
            "r_id": "R15473",
            "name": "Anurag Singh",
            "email": "anurag.singh@jnu.ac.in",
            "program": "B.Tech. (Computer Science Engineering)",
            "gender": "Male",
            "academic_year": "4th Year Student",
            "admission_year": "2023",
            "avatar_url": "/static/img/blank_pfp.jpg"
        }

        page.goto("http://127.0.0.1:5000/")
        page.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(student_data)}');")
        page.goto("http://127.0.0.1:5000/create-team")
        page.wait_for_timeout(1500)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_create_team_dropdown.png"))
        print("Saved verify_create_team_dropdown.png", flush=True)

        browser.close()

if __name__ == "__main__":
    run()
