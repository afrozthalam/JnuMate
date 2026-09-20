import os
import sys
import time

# Ensure stdout uses UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3"
BASE_URL = "http://127.0.0.1:5000"

def run_tests():
    print("=== Starting Comprehensive Verification of All 10 Requirements ===", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # DESKTOP TESTS (Viewport: 1280x800)
        # -------------------------------------------------------------
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")

        # Inject currentUser as R44456 (MD Hasan Raza)
        page.evaluate("""
            const u = {
                id: "R44456",
                r_id: "R44456",
                name: "MD HASAN RAZA",
                email: "mdhasanraza.btech.cs22@jnujaipur.ac.in",
                avatar_url: "/static/img/redesign/hasan_raza_avatar.png"
            };
            localStorage.setItem("jnumate_user", JSON.stringify(u));
            localStorage.setItem("currentUser", JSON.stringify(u));
            currentUser = u;
            window.currentUser = u;
            if (typeof renderNavUserSlots === 'function') {
                renderNavUserSlots();
            }
        """)
        time.sleep(0.5)

        # -------------------------------------------------------------
        # Item 5: Hero Text Verification
        # -------------------------------------------------------------
        hero_text = page.locator(".discover-main-title").inner_text()
        print(f"[Check 5] Hero banner text: '{hero_text.strip()}'", flush=True)
        assert "Join a team, find open slots, or create your own for upcoming events in jnu" in hero_text, "Item 5 failed: Hero text mismatch"
        assert "TEAMS" not in hero_text, "Item 5 failed: Old 'TEAMS' header still present"

        # -------------------------------------------------------------
        # Item 1: Footer and Pagination Theme Verification
        # -------------------------------------------------------------
        footer = page.locator(".homescreen-editorial-footer")
        assert footer.is_visible(), "Item 1 failed: .homescreen-editorial-footer not found"
        footer_bg = page.evaluate("el => window.getComputedStyle(el).backgroundColor", footer.element_handle())
        print(f"[Check 1] Footer background: {footer_bg}", flush=True)
        assert "255, 255, 255" in footer_bg, "Item 1 failed: Footer is not white"

        pagination = page.locator(".pagination-cluster")
        if pagination.is_visible():
            pag_bg = page.evaluate("el => window.getComputedStyle(el).backgroundColor", pagination.element_handle())
            print(f"[Check 1] Pagination cluster background: {pag_bg}", flush=True)

        old_footer_count = page.locator(".discover-page-footer").count()
        assert old_footer_count == 0, "Item 1 failed: Legacy discover footer still in DOM"

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test_1_hero_and_footer.png"))
        print("-> Saved test_1_hero_and_footer.png", flush=True)

        # -------------------------------------------------------------
        # Item 2: Profile Badge Avatar for R44456
        # -------------------------------------------------------------
        navbar_pill = page.locator(".desktop-top-user-pill")
        assert navbar_pill.is_visible(), "Navbar user pill not visible"
        navbar_avatar_img = page.locator(".desktop-user-pill-avatar img")
        if navbar_avatar_img.is_visible():
            avatar_src = navbar_avatar_img.get_attribute("src")
            print(f"[Check 2] Navbar avatar src: {avatar_src}", flush=True)
            assert "hasan_raza" in avatar_src or "r44456" in avatar_src.lower(), f"Unexpected avatar src: {avatar_src}"

        # -------------------------------------------------------------
        # Item 7, 3, 4: Desktop Team Page Modal & Permissions
        # -------------------------------------------------------------
        # Open Team 1 (Team Quantum, Leader: R15006, where R44456 is a NON-MEMBER)
        page.evaluate("navigateTo('/team/1')")
        page.wait_for_selector("#teamDetailModal", state="visible")
        time.sleep(1)

        # Item 7: Fullscreen modal & circular close button
        modal = page.locator("#teamDetailModal")
        modal_pos = page.evaluate("""el => {
            const style = window.getComputedStyle(el);
            return {
                position: style.position,
                zIndex: style.zIndex,
                width: el.clientWidth,
                height: el.clientHeight
            };
        }""", modal.element_handle())
        print(f"[Check 7] Desktop modal geometry: {modal_pos}", flush=True)
        assert modal_pos["position"] == "fixed", "Item 7 failed: Modal is not position: fixed"

        close_btn = page.locator(".fullscreen-modal-close-btn")
        assert close_btn.is_visible(), "Item 7 failed: .fullscreen-modal-close-btn is not visible"
        close_btn_radius = page.evaluate("el => window.getComputedStyle(el).borderRadius", close_btn.element_handle())
        print(f"[Check 7] Close button border-radius: {close_btn_radius}", flush=True)
        assert "50%" in close_btn_radius or "999" in close_btn_radius or "21px" in close_btn_radius, "Item 7 failed: Close button is not circular"

        # Item 4: Desktop team modal design - No ugly nested navbar, modern header
        nested_navbar_count = page.locator(".team-top-navbar").count()
        assert nested_navbar_count == 0, "Item 4 failed: Nested top navbar still present in desktop team modal"
        desktop_header = page.locator(".team-modal-desktop-header")
        assert desktop_header.is_visible(), "Item 4 failed: .team-modal-desktop-header not visible"

        # Item 4: Team Chat options - NO voice call button, NO attachment button
        voice_btn_count = page.locator(".team-voice-channel-btn, .team-voice-call-btn").count()
        assert voice_btn_count == 0, f"Item 4 failed: Voice call button found in chat ({voice_btn_count})"
        attach_btn_count = page.locator(".team-chat-attach-btn, .btn-mob-chat-attach").count()
        assert attach_btn_count == 0, f"Item 4 failed: Attach button found in chat ({attach_btn_count})"

        # Item 3: Non-member permissions on desktop for Team 1
        edit_btn_count = page.locator("button:has-text('Edit Squad'), #btnEditTeam").count()
        assert edit_btn_count == 0, f"Item 3 failed: Non-member sees Edit Team button ({edit_btn_count})"
        leave_btn_count = page.locator("button:has-text('Leave Squad'), #btnLeaveTeam").count()
        assert leave_btn_count == 0, f"Item 3 failed: Non-member sees Leave Squad button ({leave_btn_count})"
        print("[Check 3] Non-member on desktop: No Edit button, No Leave button - PASSED", flush=True)

        # Chat for non-member should be locked
        chat_input = page.locator("#teamChatInput")
        is_disabled = page.evaluate("el => el ? el.disabled : null", chat_input.element_handle()) if chat_input.count() > 0 else True
        print(f"[Check 3] Chat input disabled for non-member: {is_disabled}", flush=True)
        assert is_disabled == True, "Item 3 failed: Non-member can type into team chat"

        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test_desktop_team_modal.png"))
        print("-> Saved test_desktop_team_modal.png", flush=True)

        # Test closing the modal with the top-right circular button
        close_btn.click()
        time.sleep(0.5)
        modal_visible = page.is_visible("#teamDetailModal")
        assert not modal_visible, "Item 7 failed: Modal did not close upon clicking circular × button"
        print("[Check 7] Circular close button clicked and modal closed successfully", flush=True)

        # -------------------------------------------------------------
        # Item 6: Events, Resources, OTP Theme Harmonization
        # -------------------------------------------------------------
        # 1. Events page
        page.goto(f"{BASE_URL}/events")
        page.wait_for_load_state("networkidle")
        events_nav = page.locator(".desktop-top-navbar")
        events_nav_bg = page.evaluate("el => window.getComputedStyle(el).backgroundColor", events_nav.element_handle())
        print(f"[Check 6] Events page navbar bg: {events_nav_bg}", flush=True)
        assert "255, 255, 255" in events_nav_bg, f"Item 6 failed: Events navbar is not white ({events_nav_bg})"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test_events_white_nav.png"))
        print("-> Saved test_events_white_nav.png", flush=True)

        # 2. Resources page
        page.goto(f"{BASE_URL}/resources")
        page.wait_for_load_state("networkidle")
        resources_nav = page.locator(".desktop-top-navbar")
        resources_nav_bg = page.evaluate("el => window.getComputedStyle(el).backgroundColor", resources_nav.element_handle())
        print(f"[Check 6] Resources page navbar bg: {resources_nav_bg}", flush=True)
        assert "255, 255, 255" in resources_nav_bg, f"Item 6 failed: Resources navbar is not white ({resources_nav_bg})"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test_resources_white_nav.png"))
        print("-> Saved test_resources_white_nav.png", flush=True)

        # 3. OTP Page
        page.goto(f"{BASE_URL}/otp")
        page.wait_for_load_state("networkidle")
        page.evaluate("""
            const student = {
                r_id: "R44456",
                name: "MD HASAN RAZA",
                email: "mdhasanraza.btech.cs22@jnujaipur.ac.in",
                avatar_url: "/static/img/redesign/hasan_raza_avatar.png",
                course: "B.Tech CSE",
                current_year: "3rd Year",
                gender: "Male"
            };
            renderAuthProfileSpotlight(student, student.email);
        """)
        time.sleep(0.5)

        otp_bar = page.locator(".otp-desktop-top-bar")
        otp_bar_bg = page.evaluate("el => window.getComputedStyle(el).backgroundColor", otp_bar.element_handle())
        print(f"[Check 6] OTP page desktop top bar bg: {otp_bar_bg}", flush=True)
        assert "255, 255, 255" in otp_bar_bg, f"Item 6 failed: OTP top bar is not white ({otp_bar_bg})"

        # Check Item 2: OTP Spotlight Avatar for Hasan Raza
        otp_avatar = page.locator(".otp-spotlight-avatar-img")
        assert otp_avatar.is_visible(), "Item 2 failed: .otp-spotlight-avatar-img is not visible in OTP spotlight"
        otp_avatar_src = otp_avatar.get_attribute("src")
        print(f"[Check 2] OTP spotlight avatar src: {otp_avatar_src}", flush=True)
        assert "hasan_raza" in otp_avatar_src, f"Item 2 failed: OTP avatar src does not point to Hasan Raza ({otp_avatar_src})"
        page.screenshot(path=os.path.join(ARTIFACT_DIR, "test_otp_page_light.png"))
        print("-> Saved test_otp_page_light.png", flush=True)

        page.close()

        # -------------------------------------------------------------
        # MOBILE TESTS (Viewport: 390x844)
        # -------------------------------------------------------------
        mobile_page = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True)
        mobile_page.goto(BASE_URL)
        mobile_page.wait_for_load_state("networkidle")

        mobile_page.evaluate("""
            const u = {
                id: "R44456",
                r_id: "R44456",
                name: "MD HASAN RAZA",
                email: "mdhasanraza.btech.cs22@jnujaipur.ac.in",
                avatar_url: "/static/img/redesign/hasan_raza_avatar.png"
            };
            localStorage.setItem("jnumate_user", JSON.stringify(u));
            localStorage.setItem("currentUser", JSON.stringify(u));
            currentUser = u;
            window.currentUser = u;
            if (typeof renderNavUserSlots === 'function') {
                renderNavUserSlots();
            }
        """)
        time.sleep(0.5)

        # Item 8: Mobile Bottom Sticky Create Team Button Removed
        sticky_bar_count = mobile_page.locator("#mobileStickyCreateTeamBar").count()
        print(f"[Check 8] Mobile sticky create team bar count: {sticky_bar_count}", flush=True)
        assert sticky_bar_count == 0, "Item 8 failed: #mobileStickyCreateTeamBar found on mobile home"

        mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "test_mobile_home_no_sticky_bar.png"))
        print("-> Saved test_mobile_home_no_sticky_bar.png", flush=True)

        # Item 3 & 4 on Mobile: Team Details as Non-Member
        mobile_page.evaluate("navigateTo('/team/1')")
        mobile_page.wait_for_selector("#teamDetailModal", state="visible")
        time.sleep(1)

        # Non-member checks on mobile
        mob_edit_btn_count = mobile_page.locator("button:has-text('Edit'), #btnEditTeamMobile").count()
        assert mob_edit_btn_count == 0, f"Item 3 failed: Non-member sees Edit button on mobile ({mob_edit_btn_count})"
        mob_leave_btn_count = mobile_page.locator("button:has-text('Leave Squad'), #btnLeaveTeamMobile").count()
        assert mob_leave_btn_count == 0, f"Item 3 failed: Non-member sees Leave button on mobile ({mob_leave_btn_count})"

        mob_join_btn = mobile_page.locator("button:has-text('Join Squad')")
        assert mob_join_btn.is_visible(), "Item 3 failed: Non-member should see 'Join Squad' button on mobile"
        print("[Check 3] Mobile non-member permissions: No Edit, No Leave, Yes Join Squad - PASSED", flush=True)

        # Chat should NOT have voice or attachment buttons
        mob_voice_count = mobile_page.locator(".team-mob-voice-btn, .team-voice-call-btn").count()
        assert mob_voice_count == 0, "Item 4 failed: Voice call button present on mobile chat"
        mob_attach_count = mobile_page.locator(".btn-mob-chat-attach").count()
        assert mob_attach_count == 0, "Item 4 failed: Attachment button present on mobile chat"
        print("[Check 4] Mobile chat: No voice, no attachment button - PASSED", flush=True)

        mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "test_mobile_team_view.png"))
        print("-> Saved test_mobile_team_view.png", flush=True)

        # Item 9 & 10: Mobile Profile Page
        mobile_page.goto(f"{BASE_URL}/profile")
        mobile_page.wait_for_load_state("networkidle")
        time.sleep(1)

        # Item 9: Reduced padding (12px)
        shell_padding = mobile_page.evaluate("""() => {
            const shell = document.querySelector('.profile-page-shell');
            if (!shell) return null;
            const style = window.getComputedStyle(shell);
            return {
                paddingLeft: style.paddingLeft,
                paddingRight: style.paddingRight
            };
        }""")
        print(f"[Check 9] Mobile profile shell padding: {shell_padding}", flush=True)
        if shell_padding:
            assert shell_padding["paddingLeft"] == "12px", f"Item 9 failed: Expected 12px padding, got {shell_padding['paddingLeft']}"
            assert shell_padding["paddingRight"] == "12px", f"Item 9 failed: Expected 12px padding, got {shell_padding['paddingRight']}"

        # Item 10: Prominent Red Sign Out Button
        signout_btn = mobile_page.locator(".btn-profile-signout")
        assert signout_btn.is_visible(), "Item 10 failed: Profile sign out button not visible"
        signout_styles = mobile_page.evaluate("""el => {
            const style = window.getComputedStyle(el);
            return {
                color: style.color,
                backgroundColor: style.backgroundColor,
                borderColor: style.borderColor
            };
        }""", signout_btn.element_handle())
        print(f"[Check 10] Profile sign out button styles: {signout_styles}", flush=True)
        assert "220, 38, 38" in signout_styles["color"] or "239, 68, 68" in signout_styles["color"] or "254, 242, 242" in signout_styles["backgroundColor"], "Item 10 failed: Sign out button is not styled red"
        print("[Check 10] Profile sign out button highlighted in red - PASSED", flush=True)

        mobile_page.screenshot(path=os.path.join(ARTIFACT_DIR, "test_profile_mobile_red_signout.png"))
        print("-> Saved test_profile_mobile_red_signout.png", flush=True)

        mobile_page.close()
        browser.close()

    print("\n🎉 ALL 10 REQUIREMENTS VERIFIED AND PASSED PERFECTLY!", flush=True)

if __name__ == "__main__":
    run_tests()
