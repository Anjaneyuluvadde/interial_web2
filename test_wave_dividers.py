import sys
import time
import threading
import http.server
import socketserver
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

PORT = 8998

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

def start_server():
    handler = http.server.SimpleHTTPRequestHandler
    httpd = ThreadingServer(("", PORT), handler)
    httpd.serve_forever()

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(1.5)

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1440,900")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

driver = webdriver.Chrome(options=chrome_options)

try:
    print(f"Connecting to http://localhost:{PORT}/ ...")
    driver.get(f"http://localhost:{PORT}/")
    time.sleep(3.5)

    # 1. Check Console Logs
    logs = driver.get_log("browser")
    severe_errors = [l for l in logs if l['level'] == 'SEVERE']
    print(f"Console severe errors: {len(severe_errors)}")
    for err in severe_errors:
        print("  Error:", err['message'])
    assert len(severe_errors) == 0, f"Severe console errors detected: {severe_errors}"

    # 2. Check Wave Dividers
    wave_top = driver.find_element(By.CSS_SELECTOR, ".wave-top")
    wave_bottom = driver.find_element(By.CSS_SELECTOR, ".wave-bottom")
    assert wave_top.is_displayed(), "wave-top is not displayed"
    assert wave_bottom.is_displayed(), "wave-bottom is not displayed"
    print("✓ Both .wave-top and .wave-bottom are rendered and visible")

    top_svg = wave_top.find_element(By.TAG_NAME, "svg")
    bottom_svg = wave_bottom.find_element(By.TAG_NAME, "svg")
    print(f"✓ Top wave SVG dimensions: {top_svg.size}")
    print(f"✓ Bottom wave SVG dimensions: {bottom_svg.size}")
    assert top_svg.size['width'] > 0 and top_svg.size['height'] > 0

    # 3. Check Animated Wave Paths
    top_glow = wave_top.find_element(By.CSS_SELECTOR, ".wave-anim-1")
    anim_prop = top_glow.value_of_css_property("animation")
    print(f"✓ Top wave layer animation: {anim_prop}")
    assert "wave-float" in anim_prop, "Wave animation not active"

    # 4. Check Beams & Notches
    beam_top = driver.find_element(By.CSS_SELECTOR, ".beam-top")
    notch_top = driver.find_element(By.CSS_SELECTOR, ".notch-top")
    assert beam_top.is_displayed()
    assert "ARCHITECTURAL DOSSIER" in notch_top.text
    print("✓ Embedded beam and architectural notch verified")

    # 5. Scroll Interaction Check
    driver.execute_script("document.getElementById('why-choose-us').scrollIntoView({behavior: 'instant'});")
    time.sleep(1.5)
    driver.execute_script("window.scrollBy(0, 600);")
    time.sleep(1.0)

    track = driver.find_element(By.ID, "album-track")
    transform_val = track.value_of_css_property("transform")
    print(f"✓ Track transform during scroll: {transform_val}")
    assert "matrix" in transform_val, "Track transform not triggered"

    # 6. Check Mobile Layout (< 768px)
    print("\nTesting mobile layout at 375px...")
    driver.set_window_size(375, 812)
    time.sleep(1.5)

    m_top_svg = driver.find_element(By.CSS_SELECTOR, ".wave-top svg")
    m_top_h = m_top_svg.size['height']
    print(f"✓ Mobile wave height: {m_top_h}px")
    assert m_top_h > 0

    # Final error check
    final_logs = driver.get_log("browser")
    final_errors = [l for l in final_logs if l['level'] == 'SEVERE']
    assert len(final_errors) == 0, f"Severe errors encountered during test: {final_errors}"

    print("\nALL WAVE DIVIDER TESTS PASSED SUCCESSFULLY! 🎉")

finally:
    driver.quit()
