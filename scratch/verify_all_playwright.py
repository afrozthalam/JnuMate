import os
import sys
import time
from playwright.sync_api import sync_playwright

artifact_dir = r"C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3"

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 840})
        page = context.new_page()

        print("\n--- 1. Testing /resources Page (10 Cards) ---")
        page.goto("http://localhost:5000/resources", wait_until="networkidle")
        page.wait_for_selector(".academic-resources-shell")
        time.sleep(1)
        page.screenshot(path=os.path.join(artifact_dir, "verify_resources_cards.png"))
        print("Captured verify_resources_cards.png")

        # Verify clicking JNU PYQs card navigates to /pyqs
        pyq_card = page.locator(".academic-res-card", has_text="JNU PYQs")
        assert pyq_card.count() > 0, "JNU PYQs card should exist on /resources"
        pyq_card.first.click()
        page.wait_for_selector(".jnu-pyqs-page-shell", timeout=5000)
        time.sleep(1)
        assert "/pyqs" in page.url
        page.screenshot(path=os.path.join(artifact_dir, "verify_pyqs_portal.png"))
        print("Captured verify_pyqs_portal.png - Navigated smoothly from /resources to /pyqs!")

        print("\n--- 2. Testing /events Page (No Clunky Hero Banner) ---")
        page.goto("http://localhost:5000/events", wait_until="networkidle")
        page.wait_for_selector(".events-page-shell", timeout=6000)
        time.sleep(1)
        # Check that old hero architectural card is gone
        old_hero = page.locator(".events-hero-architectural-card")
        assert old_hero.count() == 0, "Old clunky hero banner must NOT exist!"
        page.screenshot(path=os.path.join(artifact_dir, "verify_events_clean_header.png"))
        print("Captured verify_events_clean_header.png - Sleek minimal header verified!")

        print("\n--- 3. Testing Seamless Admin Login via /login ---")
        page.goto("http://localhost:5000/login", wait_until="networkidle")
        page.wait_for_selector("#authRidInput")
        page.fill("#authRidInput", "admin")
        page.click("#btnSendOtp")
        page.wait_for_selector("#adminPasswordInput", timeout=5000)
        print("Admin password field dynamically revealed on main login page!")
        page.fill("#adminPasswordInput", "hehenewpassword@123")
        page.click("#btnAdminLoginSubmit")
        page.wait_for_selector(".admin-dashboard-wrap", timeout=8000)
        time.sleep(1)
        assert "/admin" in page.url
        page.screenshot(path=os.path.join(artifact_dir, "verify_admin_overview.png"))
        print("Captured verify_admin_overview.png - Admin authenticated and navigated to /admin!")

        print("\n--- 4. Testing Admin Students & Users Tab and Drill-Down Modal ---")
        page.click(".admin-tab-btn:has-text('Students & Users')")
        page.wait_for_selector("#adminUsersTable", timeout=5000)
        time.sleep(1)
        page.screenshot(path=os.path.join(artifact_dir, "verify_admin_users_tab.png"))
        print("Captured verify_admin_users_tab.png")

        # Click View Activity on R44456 or first user
        act_btn = page.locator(".admin-user-row", has_text="R44456").locator(".btn-admin-row-action")
        if act_btn.count() == 0:
            act_btn = page.locator(".btn-admin-row-action").first
        act_btn.first.click()
        page.wait_for_selector(".admin-activity-modal-inner", timeout=6000)
        time.sleep(1)
        page.screenshot(path=os.path.join(artifact_dir, "verify_admin_user_activity_modal.png"))
        print("Captured verify_admin_user_activity_modal.png - Complete user lifecycle history displayed!")

        # Close modal
        page.click(".admin-modal-close-btn")
        time.sleep(0.5)

        print("\n--- 5. Testing Admin Teams Management Tab and Edit Team Modal ---")
        page.click(".admin-tab-btn:has-text('Teams Management')")
        page.wait_for_selector("#adminTeamsTable", timeout=5000)
        time.sleep(1)
        page.screenshot(path=os.path.join(artifact_dir, "verify_admin_teams_tab.png"))
        print("Captured verify_admin_teams_tab.png")

        # Open Edit Team Modal
        page.locator(".btn-admin-event-edit").first.click()
        page.wait_for_selector("#adminEditTeamForm", timeout=5000)
        time.sleep(1)
        page.screenshot(path=os.path.join(artifact_dir, "verify_admin_edit_team_modal.png"))
        print("Captured verify_admin_edit_team_modal.png")
        page.click(".admin-edit-team-modal-sheet .admin-modal-close-btn")
        time.sleep(0.5)

        print("\n--- 6. Testing Admin Platform Settings Tab ---")
        page.click(".admin-tab-btn:has-text('Platform Settings')")
        page.wait_for_selector(".admin-toggle-panel", timeout=5000)
        time.sleep(1)
        page.screenshot(path=os.path.join(artifact_dir, "verify_admin_settings_tab.png"))
        print("Captured verify_admin_settings_tab.png")

        print("\n--- 7. Testing Team Discussion Chat Window (Desktop) ---")
        page.goto("http://localhost:5000/team/28", wait_until="networkidle")
        page.wait_for_selector(".modern-squad-chat-box", timeout=8000)
        time.sleep(1.5)
        page.screenshot(path=os.path.join(artifact_dir, "verify_modern_team_chat.png"))
        print("Captured verify_modern_team_chat.png")

        browser.close()
        print("\nALL PLAYWRIGHT TESTS AND SCREENSHOT CAPTURES COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    run_verification()
