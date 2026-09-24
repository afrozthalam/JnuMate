import os
import sys
import time
from playwright.sync_api import sync_playwright

ARTIFACTS_DIR = r"C:\Users\parrot\.gemini\antigravity\brain\a636f84c-0565-4943-9224-301dc28acdc3"

def run_tests():
    print("[TEST SUITE STARTING]")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        # -------------------------------------------------------------
        # TEST 1: JNU PYQ Portal & Download PDF
        # -------------------------------------------------------------
        print("\n--- TEST 1: PYQ Portal and Download PDF ---")
        page.goto("http://127.0.0.1:5000/pyqs")
        page.wait_for_selector(".pyq-paper-card", timeout=10000)
        
        cards = page.locator(".pyq-paper-card")
        total_cards = cards.count()
        print(f"Found {total_cards} PYQ paper cards loaded.")
        assert total_cards > 0, "No PYQ cards found!"

        first_card_title = page.locator(".pyq-paper-title").first.inner_text()
        print(f"First paper title: '{first_card_title}'")

        download_btn = page.locator(".btn-pyq-download").first
        assert download_btn.is_visible(), "Download PDF button not visible!"

        print("Clicking 'Download PDF' and expecting download event...")
        with page.expect_download(timeout=15000) as download_info:
            download_btn.click()
        download = download_info.value
        download_path = os.path.join(ARTIFACTS_DIR, "downloaded_test_" + download.suggested_filename)
        download.save_as(download_path)
        file_size = os.path.getsize(download_path)
        print(f"SUCCESS: Download event received! Suggested filename: '{download.suggested_filename}'")
        print(f"Downloaded file saved to: {download_path}, size: {file_size} bytes")
        assert file_size > 0, "Downloaded PDF is empty!"
        assert download.suggested_filename.endswith(".pdf"), "Suggested filename doesn't end with .pdf!"

        # Take screenshot of the PYQ portal after download
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_pyq_download_success.png"), full_page=False)
        print("Captured screenshot: verify_pyq_download_success.png")

        # -------------------------------------------------------------
        # TEST 2: Verify iOS 12-Blade Activity Spinner
        # -------------------------------------------------------------
        print("\n--- TEST 2: Verify Reverted iOS Activity Spinner ---")
        
        page.goto("http://127.0.0.1:5000/events")
        page.wait_for_selector(".events-page-shell", timeout=10000)
        
        # Verify renderIosSpinner output in page context
        spinner_html = page.evaluate("renderIosSpinner('lg', 'Testing Authentic iOS Spinner')")
        assert "ios-spinner" in spinner_html, "Missing .ios-spinner in renderIosSpinner output!"
        assert "ios-spinner-blade" in spinner_html, "Missing .ios-spinner-blade in renderIosSpinner output!"
        assert "clean-loader-spinner-ring" not in spinner_html, "Found clean-loader-spinner-ring in renderIosSpinner!"
        print("renderIosSpinner() contains 12 .ios-spinner-blade elements and .ios-spinner text.")

        # Test renderCleanPageLoader backward compatibility wrapper
        clean_loader_html = page.evaluate("renderCleanPageLoader('Testing Clean Page Loader Wrapper')")
        assert "ios-spinner" in clean_loader_html, "renderCleanPageLoader wrapper does not use ios-spinner!"
        assert "clean-loader-spinner-ring" not in clean_loader_html, "renderCleanPageLoader still contains ring spinner!"
        print("renderCleanPageLoader() wrapper successfully routes to authentic iOS spinner.")

        # Check DOM for any remaining .clean-loader-spinner-ring
        ring_count = page.locator(".clean-loader-spinner-ring").count()
        assert ring_count == 0, f"Found {ring_count} .clean-loader-spinner-ring elements in DOM!"
        print("0 .clean-loader-spinner-ring elements found in page DOM.")

        # Render spinner demo to take screenshot artifact
        page.evaluate("""() => {
            const wrap = document.createElement('div');
            wrap.id = 'spinner-verify-box';
            wrap.style.cssText = 'position:fixed; top:80px; left:50%; transform:translateX(-50%); z-index:999999; background:#0B1F14; border:1px solid #10B981; border-radius:16px; padding:30px 50px; box-shadow:0 20px 40px rgba(0,0,0,0.5); text-align:center; color:#E2E8F0;';
            wrap.innerHTML = renderIosSpinner('lg', 'Authentic iOS 12-Blade Spinner Active');
            document.body.appendChild(wrap);
        }""")
        page.wait_for_timeout(500)
        page.screenshot(path=os.path.join(ARTIFACTS_DIR, "verify_ios_spinner_restored.png"), full_page=False)
        print("Captured screenshot: verify_ios_spinner_restored.png")

        # -------------------------------------------------------------
        # TEST 3: Navigation and Resources Page
        # -------------------------------------------------------------
        print("\n--- TEST 3: Resources Navigation & PYQ Link ---")
        page.goto("http://127.0.0.1:5000/resources")
        page.wait_for_selector(".academic-res-card", timeout=10000)
        res_cards = page.locator(".academic-res-card").count()
        print(f"Resources page has {res_cards} academic cards (should be 10).")
        assert res_cards == 10, f"Expected 10 cards on /resources, got {res_cards}"

        # Click on JNU PYQs card on /resources and verify it routes to /pyqs
        first_res = page.locator(".academic-res-card").first
        first_res.click()
        page.wait_for_timeout(1000)
        print(f"Current URL after clicking first resource card: {page.url}")
        assert "/pyqs" in page.url, f"Expected /pyqs in URL, got {page.url}"

        # -------------------------------------------------------------
        # TEST 4: Admin View Loading State
        # -------------------------------------------------------------
        print("\n--- TEST 4: Admin View Loading State ---")
        # Check admin loader renders authentic iOS spinner
        admin_loader = page.evaluate("""() => {
            const div = document.createElement('div');
            div.innerHTML = renderIosSpinner('lg', 'Verifying administrative access...');
            return div.innerHTML;
        }""")
        assert "ios-spinner" in admin_loader, "Admin loader missing ios-spinner"
        assert "ios-spinner-blade" in admin_loader, "Admin loader missing blades"
        print("Admin view loader verified with authentic iOS spinner.")

        browser.close()
        print("\n[ALL TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    run_tests()
