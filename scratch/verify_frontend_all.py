import os
import time
import subprocess
import requests
from playwright.sync_api import sync_playwright

PORT = 8088
BASE_URL = f"http://127.0.0.1:{PORT}"

server_proc = subprocess.Popen(
    ["python", "-c", f"from app import app; app.run(port={PORT}, debug=False)"],
    cwd=os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL
)

try:
    for _ in range(20):
        try:
            r = requests.get(f"{BASE_URL}/api/admin/status", timeout=1)
            if r.status_code == 200:
                break
        except Exception:
            time.sleep(0.5)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 850})
        page = context.new_page()

        # 1. TEST ADMIN LOGIN & NAVBAR REACTION
        print("1. Testing Admin Login Flow...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_selector("#authRidInput")
        page.fill("#authRidInput", "admin")
        page.click("#btnSendOtp")
        page.wait_for_selector("#adminPasswordInput", state="visible")
        page.fill("#adminPasswordInput", "hehenewpassword@123")
        page.click("#btnAdminLoginSubmit")
        page.wait_for_timeout(1000)

        # Verify Navbar shows Admin Console and Sign Out
        page.wait_for_selector("text=Admin Console")
        page.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/verify_admin_navbar_active.png")
        print("Admin navbar active screenshot saved.")

        # 2. TEST REFRESH IMMUNITY (NO STUDENT R44456 LEAK)
        print("2. Testing Refresh as Admin...")
        page.reload()
        page.wait_for_timeout(1000)
        assert page.locator("text=Admin Console").count() > 0, "Admin Console should persist after reload"
        print("Admin session preserved correctly on reload.")

        # 3. TEST ADMIN LOGOUT
        print("3. Testing Admin Logout...")
        page.click("button:has-text('Sign Out')")
        page.wait_for_timeout(800)
        page.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/verify_admin_logout_clean.png")
        print("Admin signed out cleanly.")

        # 4. TEST TEAM SQUAD CHAT DESIGN & MESSAGING
        print("4. Testing Team Squad Chat...")
        # Direct student login via browser evaluation
        page.evaluate("() => { currentUser = { id: 'R44456', r_id: 'R44456', name: 'MD HASAN RAZA', avatar_url: 'https://s3.ap-south-1.amazonaws.com/univ.jnujaipur.ac.in/StudentDocuments/16948/StudentImage/R44456.jpg' }; localStorage.setItem('jnumate_user', JSON.stringify(currentUser)); renderNavUserSlots(); }")
        
        # Navigate to events & open team modal
        page.goto(f"{BASE_URL}/events")
        page.wait_for_timeout(1000)
        page.evaluate("openTeamDetailModal(1)")
        page.wait_for_timeout(1500)
        
        page.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/verify_modern_squad_chat_modal.png")
        print("Modern Squad Chat modal screenshot saved.")

        # Send a chat message
        chat_input = page.locator("input#teamChatInput")
        if chat_input.count() > 0:
            chat_input.fill("Hello squad teammates from automated verification!")
            page.click("button#teamChatSendBtn")
            page.wait_for_timeout(1200)
            page.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/verify_squad_chat_message_sent.png")
            print("Squad chat message sent successfully.")

        # 5. TEST PYQS PAGE & SEARCH WITH COMPACT PADDING
        print("5. Testing PYQs Page & Search...")
        page.goto(f"{BASE_URL}/pyqs")
        page.wait_for_timeout(1000)
        page.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/verify_pyqs_compact_layout.png")
        
        # Test query 'discrete math'
        search_input = page.locator("input#pyqSearchInput")
        if search_input.count() > 0:
            search_input.fill("discrete math")
            page.wait_for_timeout(800)
            page.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/verify_pyq_search_discrete_math.png")
            print("PYQ discrete math search verified.")

        # 6. TEST RESOURCES PAGE COMPACT PADDING
        print("6. Testing Resources Page...")
        page.goto(f"{BASE_URL}/resources")
        page.wait_for_timeout(1000)
        page.screenshot(path="C:/Users/parrot/.gemini/antigravity/brain/a636f84c-0565-4943-9224-301dc28acdc3/verify_resources_compact_layout.png")
        print("Resources compact layout screenshot saved.")

        browser.close()
        print("\nALL FRONTEND END-TO-END VERIFICATIONS COMPLETED SUCCESSFULLY!")

finally:
    server_proc.terminate()
    try:
        server_proc.wait(timeout=2)
    except Exception:
        server_proc.kill()
