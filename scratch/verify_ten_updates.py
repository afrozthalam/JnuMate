import os
import sys
import time
import threading
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from playwright.sync_api import sync_playwright

BASE_URL = "http://127.0.0.1:5000"
ARTIFACTS_DIR = r"C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3"

def start_server_if_needed():
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=1)
        if r.status_code == 200:
            print("Server already running.")
            return
    except Exception:
        pass

    print("Starting Flask server in background thread...")
    from app import app
    threading.Thread(target=lambda: app.run(host="127.0.0.1", port=5000, debug=False, use_reloader=False), daemon=True).start()
    for _ in range(30):
        try:
            r = requests.get(f"{BASE_URL}/", timeout=1)
            if r.status_code == 200:
                print("Server started successfully!")
                return
        except Exception:
            time.sleep(0.3)
    print("Warning: server start check timeout, proceeding anyway...")

def run_tests():
    start_server_if_needed()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        print("\n--- 1. Testing Homepage & Teams Nav Label ---")
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        teams_nav_desktop = page.locator(".desktop-nav-link.active").inner_text()
        print("Desktop active nav label:", teams_nav_desktop)
        assert "Teams" in teams_nav_desktop, f"Expected Teams nav label, got {teams_nav_desktop}"

        print("\n--- 2. Testing Academic Calendar Page (/academic-calendar) ---")
        page.goto(f"{BASE_URL}/academic-calendar", wait_until="networkidle")
        page.wait_for_timeout(500)
        
        # Check description text is absent
        cal_sub = page.locator(".calendar-page-subtitle").count()
        print("Calendar subtitle count (should be 0):", cal_sub)
        assert cal_sub == 0, "Calendar subtitle should be removed"

        # Check session badge is absent
        cal_session = page.locator(".calendar-header-badge").count()
        print("Calendar session badge count (should be 0):", cal_session)
        assert cal_session == 0, "Calendar session badge should be removed"

        # Check search input is absent
        cal_search = page.locator(".calendar-search-box").count()
        print("Calendar search box count (should be 0):", cal_search)
        assert cal_search == 0, "Calendar search box should be removed"

        # Check print button is absent
        cal_print = page.locator(".btn-calendar-print").count()
        print("Calendar print button count (should be 0):", cal_print)
        assert cal_print == 0, "Calendar print button should be removed"

        # Check Technorazz note is absent
        cal_note = page.locator(".calendar-table-footer-notice").count()
        print("Calendar Technorazz footnote count (should be 0):", cal_note)
        assert cal_note == 0, "Calendar footnote should be removed"

        # Check table headers (Remarks should NOT be present)
        th_texts = page.locator(".calendar-data-table thead th").all_inner_texts()
        print("Academic Calendar headers:", th_texts)
        assert not any("Remarks" in th for th in th_texts), "Remarks header should be removed"
        assert len(th_texts) == 5, f"Expected 5 headers, got {len(th_texts)}"

        # Check clean back arrow button
        back_btn = page.locator(".btn-clean-back-arrow").count()
        print("Clean back arrow button count:", back_btn)
        assert back_btn >= 1, "Clean back arrow button should be present"

        # Screenshot Academic Calendar
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_academic_calendar_stripped.png"))

        # Switch to Even Semesters
        page.click("button.cal-tab-btn:has-text('Even Semesters')")
        page.wait_for_timeout(300)
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_academic_calendar_even_stripped.png"))

        print("\n--- 3. Testing JNU Holiday List Page (/holidays) ---")
        page.goto(f"{BASE_URL}/holidays", wait_until="networkidle")
        page.wait_for_timeout(500)

        # Check description text is absent
        hol_sub = page.locator(".calendar-page-subtitle").count()
        print("Holidays subtitle count (should be 0):", hol_sub)
        assert hol_sub == 0, "Holidays subtitle should be removed"

        # Check session badge is absent
        hol_session = page.locator(".calendar-header-badge").count()
        print("Holidays session badge count (should be 0):", hol_session)
        assert hol_session == 0, "Holidays session badge should be removed"

        # Check search input is absent
        hol_search = page.locator(".calendar-search-box").count()
        print("Holidays search box count (should be 0):", hol_search)
        assert hol_search == 0, "Holidays search box should be removed"

        # Check print button is absent
        hol_print = page.locator(".btn-calendar-print").count()
        print("Holidays print button count (should be 0):", hol_print)
        assert hol_print == 0, "Holidays print button should be removed"

        # Check filter pills are absent
        hol_pills = page.locator(".holiday-filter-pills").count()
        print("Holidays filter pills count (should be 0):", hol_pills)
        assert hol_pills == 0, "Holidays filter pills should be removed"

        # Screenshot Holidays
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_holidays_stripped.png"))

        print("\n--- 4. Testing Coming Soon Pages (/syllabus, /notes, /threads) ---")
        # Syllabus
        page.goto(f"{BASE_URL}/syllabus", wait_until="networkidle")
        page.wait_for_timeout(400)
        assert page.locator(".coming-soon-title:has-text('Syllabus Portal')").count() >= 1
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_syllabus_coming_soon.png"))

        # Notes
        page.goto(f"{BASE_URL}/notes", wait_until="networkidle")
        page.wait_for_timeout(400)
        assert page.locator(".coming-soon-title:has-text('Notes & Study Materials')").count() >= 1
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_notes_coming_soon.png"))

        # Threads
        page.goto(f"{BASE_URL}/threads", wait_until="networkidle")
        page.wait_for_timeout(400)
        assert page.locator(".coming-soon-title:has-text('JNU Student Threads')").count() >= 1
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_threads_coming_soon.png"))

        print("\n--- 5. Testing Campus Events Page (/events) ---")
        page.goto(f"{BASE_URL}/events", wait_until="networkidle")
        page.wait_for_timeout(500)
        
        # Check "See All" button is removed
        see_all_count = page.locator(".events-see-all-btn").count()
        print("Events 'See All' button count (should be 0):", see_all_count)
        assert see_all_count == 0, "See All button should be removed from Events page"

        # Check header description is removed
        ev_header_p = page.locator(".events-clean-header p").count()
        print("Events header description count (should be 0):", ev_header_p)
        assert ev_header_p == 0, "Events header description should be removed"

        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_events_cleaned.png"))

        print("\n--- 6. Testing Global Footer ---")
        footer_email = page.locator(".footer-contact-item:has-text('inbox.afrozalam@gmail.com')").count()
        footer_gh = page.locator(".footer-contact-item:has-text('github.com/afrozthalam')").count()
        print("Footer email link count:", footer_email)
        print("Footer github link count:", footer_gh)
        assert footer_email >= 1, "Footer email link missing"
        assert footer_gh >= 1, "Footer GitHub link missing"

        # Mobile View Test
        print("\n--- 7. Testing Mobile View Responsiveness (< 768px) ---")
        mobile_context = browser.new_context(viewport={"width": 375, "height": 812}, is_mobile=True)
        mob_page = mobile_context.new_page()

        mob_page.goto(f"{BASE_URL}/academic-calendar", wait_until="networkidle")
        mob_page.wait_for_timeout(400)
        mob_page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_mobile_academic_calendar.png"))

        mob_page.goto(f"{BASE_URL}/holidays", wait_until="networkidle")
        mob_page.wait_for_timeout(400)
        mob_page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_mobile_holidays.png"))

        mob_page.goto(f"{BASE_URL}/syllabus", wait_until="networkidle")
        mob_page.wait_for_timeout(400)
        mob_page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_mobile_coming_soon.png"))

        print("\n--- 8. Testing Live Chat Dispatch ---")
        post_res = requests.post(f"{BASE_URL}/api/teams/1/messages", json={
            "r_id": "R44456",
            "message": "Automated verification test message for live chat"
        })
        print("Chat post status:", post_res.status_code, post_res.json())
        assert post_res.json().get("success") is True, f"Expected success True, got {post_res.json()}"

        print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")
        browser.close()

if __name__ == "__main__":
    run_tests()
