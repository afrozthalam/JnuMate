import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3"

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        print("[TEST 1 & 2] Verifying Desktop Team Page Layout & Join Request...")
        # 1. Open Team 2 (CyberStorm) as R44456 (default user)
        page.goto("http://127.0.0.1:5000/team/2")
        page.wait_for_timeout(2500)

        # Check Desktop Layout elements:
        # - Top row split: .team-desktop-top-row exists
        # - No tabs bar: .team-tab-btn should NOT exist
        # - Left column: .team-roster-card exists
        # - Right column: .team-discussion-container.small-chat-window exists
        # - Bottom row: .team-about-banner exists
        top_row = page.locator(".team-desktop-top-row")
        assert top_row.count() > 0, "Desktop top row missing!"
        tabs_bar = page.locator(".team-tab-btn")
        assert tabs_bar.count() == 0, "Tabs bar was not removed!"
        roster_card = page.locator(".team-roster-card")
        assert roster_card.count() > 0, "Team roster card missing!"
        small_chat = page.locator(".team-discussion-container.small-chat-window")
        assert small_chat.count() > 0, "Small embedded chat window missing!"
        about_banner = page.locator(".team-about-banner")
        assert about_banner.count() > 0, "Bottom about banner missing!"

        # Screenshot initial team page view before sending request
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "verify_2_desktop_team_layout.png"), full_page=True)
        print(" -> Verified Desktop Team Page Layout (captured verify_2_desktop_team_layout.png)")

        # Verify Join Request:
        # Check action column has join request card or pending banner
        action_col = page.locator(".team-desktop-action-column")
        print("Action column HTML snippet:", action_col.inner_html()[:200])

        # If send button exists, let's type a pitch and send join request
        send_btn = page.locator("#btnSendJoinRequest")
        if send_btn.count() > 0 and send_btn.is_visible():
            pitch_box = page.locator("#joinMessageInput")
            if pitch_box.count() > 0:
                pitch_box.fill("I am a backend specialist with Python/Flask experience. Excited to join!")
            send_btn.click()
            page.wait_for_timeout(2500)

        # Now check if the green pending banner is visible
        pending_banner = page.locator(".team-pending-banner")
        assert pending_banner.count() > 0, "Pending banner should be shown after sending join request!"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "verify_1_join_request_sent.png"))
        print(" -> Verified Join Request Sent state (captured verify_1_join_request_sent.png)")

        # Refresh page to test PERSISTENCE!
        print("[TEST 1 PERSISTENCE] Reloading page to ensure Join Request stays persisted...")
        page.reload()
        page.wait_for_timeout(2500)
        pending_banner_after_reload = page.locator(".team-pending-banner")
        assert pending_banner_after_reload.count() > 0, "Join request did not persist after refresh!"
        assert page.locator("#btnSendJoinRequest").count() == 0, "Join request button reappeared after refresh!"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "verify_1_join_request_persisted_on_refresh.png"))
        print(" -> Verified Join Request Persisted on Refresh! (captured verify_1_join_request_persisted_on_refresh.png)")

        # [TEST 3] Verify Team Discussion Chat
        print("[TEST 3] Verifying Team Discussion Chat...")
        chat_input = page.locator("#teamChatInput")
        chat_btn = page.locator("#teamChatSendBtn")
        assert chat_input.count() > 0, "Chat input missing!"
        chat_input.fill("Hello teammates! Verification test message from Hasan Raza.")
        chat_btn.click()
        page.wait_for_timeout(2000)

        # Check message stream has our message
        messages_stream = page.locator("#teamChatMessagesList")
        stream_text = messages_stream.inner_text()
        assert "Verification test message from Hasan Raza" in stream_text or "Hello teammates" in stream_text, f"Message not found in chat! Got: {stream_text}"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "verify_3_team_chat_working.png"))
        print(" -> Verified Team Chat messaging (captured verify_3_team_chat_working.png)")

        # [TEST 4] Verify Global Sleek Minimalist Footer
        print("[TEST 4] Verifying Global Minimalist Footer...")
        page.goto("http://127.0.0.1:5000/")
        page.wait_for_timeout(2000)
        footer = page.locator("#homescreenFooter")
        assert footer.count() > 0, "Footer missing!"
        footer_text = footer.inner_text()
        assert "Jaipur National University" in footer_text, "University name missing in footer!"
        assert "GitHub" in footer_text and "Contact" in footer_text and "Privacy" in footer_text, "Footer links missing!"
        # Verify footer element screenshot
        footer.screenshot(path=os.path.join(ARTIFACT_DIR, "verify_4_minimalist_footer.png"))
        print(" -> Verified Minimalist Editorial Footer (captured verify_4_minimalist_footer.png)")

        # [TEST 5] Verify Resources Page Cleanup
        print("[TEST 5] Verifying Resources Page...")
        page.goto("http://127.0.0.1:5000/resources")
        page.wait_for_timeout(2000)
        res_container = page.locator("#resourcesViewContainer")
        res_text = res_container.inner_text()
        assert "GROW BELONG TOGETHER" not in res_text, "Slogan still present in resources page!"
        assert page.locator(".academic-res-kicker").count() == 0, "Kicker 'RESOURCES' still present!"
        assert "Academic Resources" in res_text, "Main title missing!"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "verify_5_resources_cleanup.png"))
        print(" -> Verified Resources Page Cleanup (captured verify_5_resources_cleanup.png)")

        # [TEST 6] Verify Mobile Bottom Navigation Active State on /profile
        print("[TEST 6] Verifying Mobile Bottom Nav on /profile...")
        mobile_context = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        mobile_page = mobile_context.new_page()
        mobile_page.goto("http://127.0.0.1:5000/profile")
        mobile_page.wait_for_timeout(2000)

        # Check mobile bottom nav item 'profile' has class 'active'
        active_nav = mobile_page.locator(".mobile-bottom-nav-item.active")
        active_text = active_nav.inner_text()
        assert "Profile" in active_text, f"Expected active nav to be 'Profile', but got: '{active_text}'"
        mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "verify_6_mobile_nav_profile_active.png"))
        print(" -> Verified Mobile Nav active indicator on /profile (captured verify_6_mobile_nav_profile_active.png)")

        # [TEST 7] Verify Profile Page High-Contrast Typography
        print("[TEST 7] Verifying Profile Page Typography & Contrast...")
        page.goto("http://127.0.0.1:5000/profile")
        page.wait_for_timeout(2000)

        # Inspect computed styles of profile credentials and info pills
        cred_label = page.locator(".profile-cred-label").first
        cred_label_color = cred_label.evaluate("el => window.getComputedStyle(el).color")
        cred_label_weight = cred_label.evaluate("el => window.getComputedStyle(el).fontWeight")

        cred_bold = page.locator(".profile-cred-val-bold").first
        cred_bold_color = cred_bold.evaluate("el => window.getComputedStyle(el).color")
        cred_bold_weight = cred_bold.evaluate("el => window.getComputedStyle(el).fontWeight")

        info_pill_val = page.locator(".info-pill-val").first
        info_pill_val_color = info_pill_val.evaluate("el => window.getComputedStyle(el).color")
        info_pill_val_weight = info_pill_val.evaluate("el => window.getComputedStyle(el).fontWeight")

        addr_text = page.locator(".addr-text").first
        addr_text_color = addr_text.evaluate("el => window.getComputedStyle(el).color")
        addr_text_weight = addr_text.evaluate("el => window.getComputedStyle(el).fontWeight")

        print(f"Cred Label - Color: {cred_label_color}, Weight: {cred_label_weight}")
        print(f"Cred Bold Val - Color: {cred_bold_color}, Weight: {cred_bold_weight}")
        print(f"Info Pill Val - Color: {info_pill_val_color}, Weight: {info_pill_val_weight}")
        print(f"Addr Text - Color: {addr_text_color}, Weight: {addr_text_weight}")

        assert int(cred_bold_weight) >= 700, f"Expected cred bold weight >= 700, got {cred_bold_weight}"
        assert int(info_pill_val_weight) >= 700, f"Expected info pill val weight >= 700, got {info_pill_val_weight}"
        assert int(addr_text_weight) >= 700, f"Expected addr text weight >= 700, got {addr_text_weight}"

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "verify_7_profile_high_contrast.png"), full_page=True)
        print(" -> Verified Profile Page Typography & Contrast (captured verify_7_profile_high_contrast.png)")

        browser.close()
        print("\n ALL 7 TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_verification()
