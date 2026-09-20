import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_tests():
    print("Starting Playwright verification for Mobile Team Details, Mobile Team Chat, and Desktop Chat...")
    artifacts_dir = r"C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # TEST 1 & 2: Mobile View (390 x 844) - iPhone 14 / modern phone
        # -------------------------------------------------------------
        print("\n--- TEST 1: Mobile Team Details (Screen 1) ---")
        context_mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
        )
        page_mobile = context_mobile.new_page()

        # Seed local student session as MD Hasan Raza (R44456)
        page_mobile.goto("http://127.0.0.1:5000/")
        page_mobile.evaluate("""() => {
            localStorage.setItem("jnumate_user", JSON.stringify({
                id: "R44456",
                r_id: "R44456",
                name: "MD HASAN RAZA",
                avatar_url: "/static/img/redesign/hasan_raza_avatar.png"
            }));
        }""")

        # Open Team 28
        page_mobile.goto("http://127.0.0.1:5000/team/28")
        page_mobile.wait_for_selector(".team-mobile-view-shell", state="visible", timeout=10000)
        page_mobile.wait_for_selector(".team-mob-hero-card", state="visible", timeout=10000)
        time.sleep(1)

        # Verify Screen 1 elements
        assert page_mobile.is_visible(".team-mob-header-bar"), "Top header bar missing"
        assert page_mobile.is_visible(".team-mob-back-link"), "Back link missing"
        assert page_mobile.is_visible(".team-mob-banner-img"), "Hero circuit banner image missing"
        assert page_mobile.is_visible(".team-mob-banner-share-btn"), "Floating share button missing"
        assert page_mobile.is_visible(".team-mob-track-pill"), "Track pill missing"
        assert page_mobile.is_visible(".team-mob-status-pill"), "Status pill missing"
        assert page_mobile.is_visible(".team-mob-action-grid"), "4 Action cards grid missing"
        assert page_mobile.is_visible(".team-mob-action-card.chat"), "Team Chat action card missing"
        assert page_mobile.is_visible(".team-mob-members-list"), "Members list missing"
        assert page_mobile.is_visible(".team-mob-bottom-nav"), "Mobile bottom nav missing"

        # Capture screenshot for Screen 1
        screen1_path = os.path.join(artifacts_dir, "test_mobile_team_details.png")
        page_mobile.screenshot(path=screen1_path, full_page=False)
        print(f"Captured Screen 1 (Mobile Team Details): {screen1_path}")

        # -------------------------------------------------------------
        # TEST 2: Mobile Team Chat (Screen 2)
        # -------------------------------------------------------------
        print("\n--- TEST 2: Mobile Team Chat (Screen 2) ---")
        # Click on [Team Chat] card
        page_mobile.click(".team-mob-action-card.chat")
        page_mobile.wait_for_selector(".team-mob-chat-header", state="visible", timeout=10000)
        page_mobile.wait_for_selector(".team-mob-chat-composer", state="visible", timeout=10000)
        time.sleep(1.5)

        # Verify Screen 2 elements
        assert page_mobile.is_visible(".team-mob-chat-header"), "Chat header missing"
        assert page_mobile.is_visible(".team-mob-call-btn"), "Call button missing"
        assert page_mobile.is_visible("#mobileTeamChatMessagesList"), "Messages stream missing"
        assert page_mobile.is_visible("#mobileTeamChatInput"), "Chat input missing"
        assert page_mobile.is_visible("#mobileTeamChatSendBtn"), "Send button missing"
        assert page_mobile.is_visible(".team-mob-attach-btn"), "Attachment paperclip button missing"

        # Check for message bubbles and attachment card
        msg_count = page_mobile.locator(".chat-msg-row").count()
        print(f"Found {msg_count} chat messages in stream.")
        assert msg_count >= 5, f"Expected at least 5 messages, got {msg_count}"

        # Test reaction click
        first_rx = page_mobile.locator(".chat-rx-pill").first
        if first_rx.is_visible():
            first_rx.click()
            time.sleep(0.5)
            print("Reaction button clicked successfully.")

        # Test sending a message
        page_mobile.fill("#mobileTeamChatInput", "Great work team! Ready for the presentation.")
        page_mobile.click("#mobileTeamChatSendBtn")
        time.sleep(1.5)

        # Capture screenshot for Screen 2
        screen2_path = os.path.join(artifacts_dir, "test_mobile_team_chat.png")
        page_mobile.screenshot(path=screen2_path, full_page=False)
        print(f"Captured Screen 2 (Mobile Team Chat): {screen2_path}")

        # Test navigating back to details via < Team Chat button
        page_mobile.click(".team-mob-back-link")
        time.sleep(1)
        assert page_mobile.is_visible(".team-mob-hero-card"), "Back button did not return to details view"
        print("Back button to Team Details works smoothly.")

        context_mobile.close()

        # -------------------------------------------------------------
        # TEST 3: Desktop View (1440 x 900)
        # -------------------------------------------------------------
        print("\n--- TEST 3: Desktop View & Desktop Chat ---")
        context_desktop = browser.new_context(viewport={"width": 1440, "height": 900})
        page_desktop = context_desktop.new_page()

        page_desktop.goto("http://127.0.0.1:5000/")
        page_desktop.evaluate("""() => {
            localStorage.setItem("jnumate_user", JSON.stringify({
                id: "R44456",
                r_id: "R44456",
                name: "MD HASAN RAZA",
                avatar_url: "/static/img/redesign/hasan_raza_avatar.png"
            }));
        }""")

        page_desktop.goto("http://127.0.0.1:5000/team/28")
        page_desktop.wait_for_selector(".team-desktop-view-shell", state="visible", timeout=10000)
        page_desktop.wait_for_selector(".team-roster-card", state="visible", timeout=10000)
        time.sleep(1)

        # Switch to Discussion tab
        page_desktop.click('.team-tab-btn[data-tab="discussion"]')
        page_desktop.wait_for_selector(".team-discussion-container", state="visible", timeout=10000)
        page_desktop.wait_for_selector("#teamChatForm", state="visible", timeout=10000)
        time.sleep(1.5)

        # Check desktop messages and send message
        desktop_msg_count = page_desktop.locator("#teamChatMessagesList .chat-msg-row").count()
        print(f"Found {desktop_msg_count} messages in desktop discussion.")
        assert desktop_msg_count >= 5, f"Expected at least 5 messages in desktop discussion, got {desktop_msg_count}"

        page_desktop.fill("#teamChatInput", "Desktop live chat sync confirmed working smoothly!")
        page_desktop.click("#teamChatSendBtn")
        time.sleep(1.5)

        # Capture desktop screenshot
        desktop_path = os.path.join(artifacts_dir, "test_desktop_chat.png")
        page_desktop.screenshot(path=desktop_path, full_page=False)
        print(f"Captured Desktop Chat: {desktop_path}")

        context_desktop.close()
        browser.close()

    print("\nAll verification tests passed with flying colors!")

if __name__ == "__main__":
    run_tests()
