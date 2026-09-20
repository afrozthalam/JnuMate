import sqlite3
import json
import time
from playwright.sync_api import sync_playwright

def setup_db_notifications():
    conn = sqlite3.connect("hackmate.db")
    cursor = conn.cursor()
    # Clean previous test notifications for R44185
    cursor.execute("DELETE FROM notifications WHERE recipient_r_id = 'R44185'")
    
    # Insert 1 unread join request from Hasan Raza (@R44456)
    cursor.execute("""
        INSERT INTO notifications (recipient_r_id, title, message, type, link, is_read, created_at)
        VALUES ('R44185', 'New Join Request', 'MD HASAN RAZA (@R44456) has requested to join your team AgroTech AI.', 'join_request', '/team/1', 0, datetime('now'))
    """)
    # Insert 1 read notification
    cursor.execute("""
        INSERT INTO notifications (recipient_r_id, title, message, type, link, is_read, created_at)
        VALUES ('R44185', 'Team Accepted', 'Your team profile has been successfully verified by organizers.', 'request_accepted', '/team/1', 1, datetime('now', '-2 hours'))
    """)
    conn.commit()
    conn.close()
    print("[DB SETUP] Test notifications inserted for R44185.")

def run_tests():
    setup_db_notifications()
    
    user_data = {
        "id": "R44185",
        "r_id": "R44185",
        "name": "Afroz Alam",
        "email": "afroz@example.com",
        "avatar_url": "/static/img/blank_pfp.jpg",
        "team_id": "1"
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # 1. MOBILE TESTS (Viewport: 390x844)
        # -------------------------------------------------------------
        print("\n--- Running Mobile Tests ---")
        context_mobile = browser.new_context(viewport={"width": 390, "height": 844})
        page_mobile = context_mobile.new_page()

        # Seed localStorage
        page_mobile.goto("http://127.0.0.1:5000/")
        page_mobile.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(user_data)}');")
        page_mobile.reload()
        page_mobile.wait_for_selector("#btnMobileMenuToggle", timeout=6000)

        # A. Verify #mobileDrawerOverlay is completely removed from DOM
        drawer = page_mobile.query_selector("#mobileDrawerOverlay")
        assert drawer is None, "Error: #mobileDrawerOverlay still exists in DOM!"
        print("[PASS] Mobile drawer overlay does not exist in DOM.")

        # B. Verify clicking top profile button leads directly to /profile
        page_mobile.click("#btnMobileMenuToggle")
        page_mobile.wait_for_timeout(1000)
        current_url = page_mobile.url
        print(f"[NAV CHECK] Mobile profile click URL: {current_url}")
        assert "/profile" in current_url, f"Error: Expected URL to contain /profile, got {current_url}"
        print("[PASS] Clicking mobile top profile icon navigates directly to /profile.")

        # Return to home
        page_mobile.goto("http://127.0.0.1:5000/")
        page_mobile.wait_for_selector("#btnMobileNotif", timeout=6000)

        # C. Test Mobile Notification Bell
        page_mobile.click("#btnMobileNotif")
        page_mobile.wait_for_timeout(600)
        
        # Check active overlay
        notif_overlay = page_mobile.query_selector("#notifOverlay.active")
        assert notif_overlay is not None, "Error: #notifOverlay did not get .active class"
        print("[PASS] Mobile notification panel opened with .active.")

        # Check badge and items
        badge = page_mobile.query_selector("#notifTotalBadge")
        badge_text = badge.inner_text() if badge else ""
        print(f"[BADGE CHECK] Mobile notifTotalBadge text: {badge_text}")
        assert "1" in badge_text, f"Expected 1 new, got {badge_text}"

        page_mobile.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_mobile_notif_panel.png")
        print("[PASS] Mobile notification screenshot captured.")

        # Close mobile panel
        page_mobile.click(".notif-close-btn")
        page_mobile.wait_for_timeout(400)
        assert not page_mobile.locator("#notifOverlay").is_visible(), "Error: Notification panel did not close"
        print("[PASS] Mobile notification panel closed smoothly.")
        context_mobile.close()

        # -------------------------------------------------------------
        # 2. DESKTOP TESTS (Viewport: 1440x900)
        # -------------------------------------------------------------
        print("\n--- Running Desktop Tests ---")
        context_desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        page_desktop = context_desktop.new_page()

        page_desktop.goto("http://127.0.0.1:5000/")
        page_desktop.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(user_data)}');")
        page_desktop.reload()
        page_desktop.wait_for_selector("#btnDesktopTopNotif", timeout=6000)

        # A. Open Desktop Notification Dropdown
        page_desktop.click("#btnDesktopTopNotif")
        page_desktop.wait_for_timeout(600)

        desktop_dropdown = page_desktop.query_selector("#desktopNotifDropdown.active")
        assert desktop_dropdown is not None, "Error: #desktopNotifDropdown did not get .active class"
        print("[PASS] Desktop notification dropdown opened with .active.")

        dt_unread = page_desktop.query_selector("#desktopNotifUnreadCount")
        dt_unread_text = dt_unread.inner_text() if dt_unread else ""
        print(f"[BADGE CHECK] Desktop unread text: {dt_unread_text}")
        assert "1" in dt_unread_text, f"Expected 1 new, got {dt_unread_text}"

        page_desktop.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_desktop_notif_dropdown.png")
        print("[PASS] Desktop notification dropdown screenshot captured.")

        # B. Test 'Mark all read'
        page_desktop.click("#desktopNotifDropdown .btn-notif-mark-read")
        page_desktop.wait_for_timeout(800)
        
        # Verify unread pill is hidden after mark all read
        dt_unread_style = page_desktop.eval_on_selector("#desktopNotifUnreadCount", "el => el.style.display")
        print(f"[MARK READ CHECK] Desktop unread badge display: {dt_unread_style}")
        assert dt_unread_style == "none", "Expected desktopNotifUnreadCount to be hidden after mark all read"
        print("[PASS] Mark all read clears unread badge.")

        page_desktop.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_desktop_notif_marked_read.png")
        print("[PASS] Desktop notification marked read screenshot captured.")

        # C. Click Avatar in Top Desktop User Pill to navigate to /profile
        page_desktop.click(".desktop-user-pill-avatar")
        page_desktop.wait_for_timeout(1000)
        desktop_url = page_desktop.url
        print(f"[NAV CHECK] Desktop avatar click URL: {desktop_url}")
        assert "/profile" in desktop_url, f"Error: Expected URL to contain /profile, got {desktop_url}"
        print("[PASS] Clicking desktop top avatar navigates directly to /profile.")

        page_desktop.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_profile_navigation_desktop.png")
        print("[PASS] Desktop profile navigation screenshot captured.")

        # D. Test Empty State (Clear DB and reload)
        conn = sqlite3.connect("hackmate.db")
        conn.cursor().execute("DELETE FROM notifications WHERE recipient_r_id = 'R44185'")
        conn.commit()
        conn.close()

        # Desktop Empty State
        page_desktop.goto("http://127.0.0.1:5000/")
        page_desktop.wait_for_selector("#btnDesktopTopNotif", timeout=6000)
        page_desktop.click("#btnDesktopTopNotif")
        page_desktop.wait_for_timeout(600)
        empty_el_dt = page_desktop.query_selector("#desktopNotifListBody .notif-empty-state")
        assert empty_el_dt is not None, "Error: Desktop empty state not found"
        page_desktop.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_desktop_notif_empty.png")
        print("[PASS] Desktop empty state verified and screenshot captured.")
        context_desktop.close()

        # Mobile Empty State
        context_mobile_empty = browser.new_context(viewport={"width": 390, "height": 844})
        page_mobile_empty = context_mobile_empty.new_page()
        page_mobile_empty.goto("http://127.0.0.1:5000/")
        page_mobile_empty.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(user_data)}');")
        page_mobile_empty.reload()
        page_mobile_empty.wait_for_selector("#btnMobileNotif", timeout=6000)
        page_mobile_empty.click("#btnMobileNotif")
        page_mobile_empty.wait_for_timeout(600)
        empty_el_mb = page_mobile_empty.query_selector("#notifListContainer .notif-empty-state")
        assert empty_el_mb is not None, "Error: Mobile empty state not found"
        page_mobile_empty.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_mobile_notif_empty.png")
        print("[PASS] Mobile empty state verified and screenshot captured.")
        context_mobile_empty.close()

        browser.close()
        print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
