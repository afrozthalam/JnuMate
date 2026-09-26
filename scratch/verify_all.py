import os
import sys
import json
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = r"C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3"

def log(msg):
    print(msg, flush=True)

def run_verification():
    log("Starting comprehensive verification with Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        log("--- 1. Testing Unauthenticated /admin Redirect ---")
        page.goto("http://127.0.0.1:5000/admin")
        page.wait_for_timeout(1000)
        log(f"URL after /admin: {page.url}")
        assert "/login" in page.url, f"Expected redirect to /login, got {page.url}"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_admin_direct_redirect.png"))
        log("Saved verify_admin_direct_redirect.png")

        log("--- 2. Setting Up Authenticated Student Session ---")
        student_data = {
            "id": "22BCON300",
            "r_id": "22BCON300",
            "name": "Afroz Alam",
            "email": "afroz@jnu.ac.in",
            "program": "B.Tech CSE (AI & ML) Hons.-Samatrix",
            "gender": "Male",
            "academic_year": "4th Year Student",
            "admission_year": "2023",
            "avatar_url": "/static/img/blank_pfp.jpg"
        }
        page.goto("http://127.0.0.1:5000/")
        page.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(student_data)}');")
        page.goto("http://127.0.0.1:5000/")
        page.wait_for_timeout(1000)
        log("Student session established.")

        log("--- 3. Testing Events Page Logos ---")
        page.goto("http://127.0.0.1:5000/events")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_events_logos.png"))
        log("Saved verify_events_logos.png")

        log("--- 4. Testing Create Team Page Dynamic Dropdown ---")
        page.goto("http://127.0.0.1:5000/create-team")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_create_team_dropdown.png"))
        log("Saved verify_create_team_dropdown.png")

        log("--- 5. Testing Team Detail Layout & Live Chat ---")
        page.goto("http://127.0.0.1:5000/")
        page.wait_for_timeout(1200)
        team_cards = page.locator(".team-card-forest, .team-card")
        log(f"Found {team_cards.count()} team cards on homepage")
        if team_cards.count() > 0:
            team_cards.first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_team_detail_new_layout.png"))
            log("Saved verify_team_detail_new_layout.png")

            chat_input = page.locator("#teamChatInput")
            if chat_input.is_visible():
                chat_input.fill("Hello squad! Live chat test message.")
                page.locator("#teamChatSendBtn").click()
                page.wait_for_timeout(1500)
                page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_team_live_chat_sent.png"))
                log("Saved verify_team_live_chat_sent.png")

            close_btn = page.locator("#btnTeamDetailClose, .team-modal-close-btn")
            if close_btn.is_visible():
                close_btn.first.click()
                page.wait_for_timeout(500)

        log("--- 6. Testing Academic Calendar Page ---")
        page.goto("http://127.0.0.1:5000/academic-calendar")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_academic_calendar_odd.png"))
        log("Saved verify_academic_calendar_odd.png")

        even_tab = page.locator("button:has-text('Even Semester')")
        if even_tab.is_visible():
            even_tab.click()
            page.wait_for_timeout(600)
            page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_academic_calendar_even.png"))
            log("Saved verify_academic_calendar_even.png")

        log("--- 7. Testing Holidays Page ---")
        page.goto("http://127.0.0.1:5000/holidays")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_holidays_page.png"))
        log("Saved verify_holidays_page.png")

        log("--- 8. Testing Resources Page (6 Cards, 3 Columns) ---")
        page.goto("http://127.0.0.1:5000/resources")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_resources_6cards_3cols.png"))
        log("Saved verify_resources_6cards_3cols.png")

        log("--- 9. Testing PYQs Page Layout ---")
        page.goto("http://127.0.0.1:5000/pyqs")
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "verify_pyqs_wide_layout.png"))
        log("Saved verify_pyqs_wide_layout.png")

        browser.close()
        log("--- All verifications completed successfully! ---")

if __name__ == "__main__":
    run_verification()
