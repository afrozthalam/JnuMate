from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGEERROR: {err}"))

        page.goto("http://127.0.0.1:5000/pyqs")
        page.wait_for_timeout(2000)

        html = page.evaluate("document.getElementById('pyqsViewContainer')?.innerHTML")
        print("pyqsViewContainer length:", len(html) if html else "None")
        browser.close()

if __name__ == "__main__":
    run()
