import os
import json
import time
from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2
        )
        page = context.new_page()

        # Step 1: Open homepage
        page.goto("http://127.0.0.1:5000/")
        page.wait_for_load_state("networkidle")

        user_session = {
            "id": "R42695",
            "r_id": "R42695",
            "name": "manjari",
            "avatar_url": "",
            "phone": "9876543210",
            "program": "B.Tech Computer Science",
            "admission_year": "2023",
            "academic_year": "3rd Year",
            "token": "dummy_token"
        }
        page.evaluate(f"localStorage.setItem('jnumate_user', '{json.dumps(user_session)}');")
        page.reload()
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        # Step 2: Open dropdown on homepage (light navbar)
        pill = page.locator(".desktop-top-user-pill")
        pill.wait_for(state="visible", timeout=5000)
        pill.click()
        time.sleep(0.5)

        dropdown = page.locator("#desktopProfileDropdown")
        assert dropdown.is_visible(), "Profile dropdown should be visible on homepage!"

        page.screenshot(
            path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_dropdown_light.png",
            clip={"x": 960, "y": 0, "width": 460, "height": 620}
        )
        print("Captured test_dropdown_light.png")

        # Step 3: Test Escape key dismiss
        page.keyboard.press("Escape")
        time.sleep(0.3)
        assert not dropdown.is_visible(), "Dropdown should close on Escape!"
        print("Escape key dismissed successfully!")

        # Step 4: Open dropdown on /events (dark forest green navbar matching reference)
        page.goto("http://127.0.0.1:5000/events")
        page.wait_for_load_state("networkidle")
        time.sleep(1)

        pill_events = page.locator(".desktop-top-user-pill")
        pill_events.click()
        time.sleep(0.5)

        dropdown_events = page.locator("#desktopProfileDropdown")
        assert dropdown_events.is_visible(), "Profile dropdown should be visible on /events!"

        page.screenshot(
            path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_dropdown_dark.png",
            clip={"x": 960, "y": 0, "width": 460, "height": 620}
        )
        print("Captured test_dropdown_dark.png")

        page.screenshot(
            path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/test_dropdown_dark_full.png"
        )
        print("Captured test_dropdown_dark_full.png")

        # Step 5: Test My Profile navigation
        my_profile_link = page.locator(".profile-dropdown-item[href='/profile']")
        my_profile_link.click()
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        assert "/profile" in page.url, "Should navigate to /profile"
        print("My Profile navigation works successfully!")

        browser.close()
        print("All verification steps passed successfully!")

if __name__ == "__main__":
    run_test()
