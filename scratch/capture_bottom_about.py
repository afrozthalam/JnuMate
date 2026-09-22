from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:5000/team/2')
    page.wait_for_timeout(2500)
    page.evaluate("document.getElementById('teamDetailModal').scrollTop = 1200")
    page.wait_for_timeout(1000)
    page.screenshot(path=r'C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3\verify_2_desktop_team_about_bottom.png')
    browser.close()
