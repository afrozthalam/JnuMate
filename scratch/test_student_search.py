import os
import json
import time
from playwright.sync_api import sync_playwright

ARTIFACTS_DIR = r"C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3"

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # -------------------------------------------------------------
        # 1. DESKTOP TESTS (1440x900)
        # -------------------------------------------------------------
        context_desktop = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2
        )
        page_d = context_desktop.new_page()
        page_d.goto("http://127.0.0.1:5000/")
        page_d.wait_for_load_state("networkidle")

        user_session = {
            "id": "R42695",
            "r_id": "R42695",
            "name": "Manjari Sharma",
            "avatar_url": "",
            "phone": "9876543210",
            "program": "B.Tech Computer Science",
            "admission_year": "2023",
            "academic_year": "3rd Year",
            "token": "dummy_token"
        }
        page_d.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(user_session)}');")
        
        page_d.goto("http://127.0.0.1:5000/create-team")
        page_d.wait_for_load_state("networkidle")
        time.sleep(1)

        # Open Assign Teammate (Seat 2)
        page_d.evaluate("openSlotStudentSearchModal(0);")
        page_d.wait_for_selector("#studentSearchModalOverlay.active", timeout=5000)
        time.sleep(0.5)

        # Screenshot 1: Desktop Empty Directory State
        page_d.screenshot(path=os.path.join(ARTIFACTS_DIR, "test_search_empty_desktop_full.png"))
        modal_box = page_d.locator(".student-search-modal-sheet").bounding_box()
        if modal_box:
            # Add padding around modal
            clip_box = {
                "x": max(0, modal_box["x"] - 20),
                "y": max(0, modal_box["y"] - 20),
                "width": modal_box["width"] + 40,
                "height": modal_box["height"] + 40
            }
            page_d.screenshot(path=os.path.join(ARTIFACTS_DIR, "test_search_empty_desktop.png"), clip=clip_box)
        print("Captured desktop empty state!")

        # Search for "md hasan"
        search_input = page_d.locator("#slotStudentSearchInput")
        search_input.fill("md hasan")
        page_d.wait_for_selector(".student-search-card-rich", timeout=6000)
        time.sleep(0.6)

        # Screenshot 2: Desktop Search Results State
        page_d.screenshot(path=os.path.join(ARTIFACTS_DIR, "test_search_results_desktop_full.png"))
        modal_box_res = page_d.locator(".student-search-modal-sheet").bounding_box()
        if modal_box_res:
            clip_box_res = {
                "x": max(0, modal_box_res["x"] - 20),
                "y": max(0, modal_box_res["y"] - 20),
                "width": modal_box_res["width"] + 40,
                "height": modal_box_res["height"] + 40
            }
            page_d.screenshot(path=os.path.join(ARTIFACTS_DIR, "test_search_results_desktop.png"), clip=clip_box_res)
        print("Captured desktop results state!")

        # Test clear button
        clear_btn = page_d.locator("#slotStudentSearchClearBtn")
        assert clear_btn.is_visible(), "Clear button should be visible when input has text"
        clear_btn.click()
        time.sleep(0.3)
        assert page_d.locator(".search-directory-title").is_visible(), "Empty state should return on clear"
        print("Clear button verified!")

        # Close modal
        close_btn = page_d.locator(".student-search-close-btn")
        close_btn.click()
        time.sleep(0.3)
        assert not page_d.locator("#studentSearchModalOverlay").is_visible(), "Modal should close"
        print("Desktop close verified!")

        context_desktop.close()

        # -------------------------------------------------------------
        # 2. MOBILE TESTS (390x844 - iPhone 14)
        # -------------------------------------------------------------
        context_mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True
        )
        page_m = context_mobile.new_page()
        page_m.goto("http://127.0.0.1:5000/")
        page_m.wait_for_load_state("networkidle")
        page_m.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(user_session)}');")
        
        page_m.goto("http://127.0.0.1:5000/create-team")
        page_m.wait_for_load_state("networkidle")
        time.sleep(1)

        # Open mobile search
        page_m.evaluate("openSlotStudentSearchModal(0);")
        page_m.wait_for_selector("#studentSearchModalOverlay.active", timeout=5000)
        time.sleep(0.5)

        # Screenshot 3: Mobile Bottom Sheet Empty State
        page_m.screenshot(path=os.path.join(ARTIFACTS_DIR, "test_search_empty_mobile.png"))
        print("Captured mobile empty state!")

        # Search for "md hasan"
        input_m = page_m.locator("#slotStudentSearchInput")
        input_m.fill("md hasan")
        page_m.wait_for_selector(".student-search-card-rich", timeout=6000)
        time.sleep(0.6)

        # Screenshot 4: Mobile Bottom Sheet Results State
        page_m.screenshot(path=os.path.join(ARTIFACTS_DIR, "test_search_results_mobile.png"))
        print("Captured mobile results state!")

        # Test Add Teammate click
        add_btn = page_m.locator(".btn-add-teammate-forest").first
        add_btn.click()
        time.sleep(0.5)
        # Verify modal closes after assigning teammate
        assert not page_m.locator("#studentSearchModalOverlay").is_visible(), "Modal should close after adding teammate"
        print("Teammate addition verified!")

        context_mobile.close()
        browser.close()
        print("All automated verification tests passed successfully!")

if __name__ == "__main__":
    run_tests()
