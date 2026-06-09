"""
conftest.py — Shared fixtures, helpers, and constants for the PancreaScan E2E Test Suite.
"""
import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ── Constants ──────────────────────────────────────────────────────────────────
BASE_URL      = "https://kishorer192224280.github.io/PancreaScan-Web/"
TEST_EMAIL    = "testdoctor@pancreascan.com"
TEST_PASSWORD = "TestPass@123"
TEST_IMAGE    = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_ct_scan.jpg"))

# ── Session-scoped Driver ──────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def driver():
    """One Chrome browser instance shared across the full test session."""
    options = Options()
    options.add_argument("--window-size=1400,900")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-extensions")

    service = Service(ChromeDriverManager().install())
    drv = webdriver.Chrome(service=service, options=options)
    drv.implicitly_wait(5)
    yield drv
    drv.quit()

# ── Navigation Helpers ─────────────────────────────────────────────────────────

def clear_session(driver):
    """
    Clear localStorage so the React app does NOT auto-login on next page load.
    Must be called while already on the app's origin (after at least one driver.get(BASE_URL)).
    """
    try:
        driver.execute_script("window.localStorage.clear();")
    except Exception:
        pass


def go_home(driver):
    """
    Navigate to the landing page in a clean state.
    - First load establishes the origin so we can access localStorage.
    - We then clear localStorage to remove any stored user session.
    - Second load starts the app fresh, which shows the Landing page (not Dashboard).
    """
    driver.get(BASE_URL)
    clear_session(driver)
    driver.get(BASE_URL)               # reload without the session
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Access PancreaScan')]")
        )
    )


def navigate_to_login(driver):
    """From a clean landing page, click 'Access PancreaScan' to reach the Login screen."""
    go_home(driver)
    wait = WebDriverWait(driver, 15)
    btn = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//*[contains(text(),'Access PancreaScan')]")
    ))
    btn.click()
    wait.until(EC.presence_of_element_located(
        (By.XPATH, "//input[@type='email']")
    ))


def login(driver, email=TEST_EMAIL, password=TEST_PASSWORD):
    """
    Full login flow: clear session → landing → click Access → fill creds → submit → dashboard.
    """
    navigate_to_login(driver)          # already clears localStorage via go_home
    wait = WebDriverWait(driver, 15)

    email_input = wait.until(
        EC.presence_of_element_located((By.XPATH, "//input[@type='email']"))
    )
    email_input.clear()
    email_input.send_keys(email)

    pw_input = driver.find_element(By.XPATH, "//input[@type='password']")
    pw_input.clear()
    pw_input.send_keys(password)

    submit = driver.find_element(By.XPATH, "//button[contains(text(),'Log In')]")
    submit.click()

    # Wait for the dashboard sidebar to confirm a successful login
    wait.until(
        EC.presence_of_element_located((By.CLASS_NAME, "dashboard-layout"))
    )
    time.sleep(1)  # allow React state/API calls to settle


def navigate_to_dashboard_tab(driver, tab_text):
    """
    While on the dashboard, click a sidebar menu button by its visible label.
    tab_text examples: 'Dashboard', 'Patient History', 'Analytics', 'Settings'
    """
    wait = WebDriverWait(driver, 10)
    tab = wait.until(EC.element_to_be_clickable(
        (By.XPATH,
         f"//button[contains(@class,'menu-item') and contains(.,'{tab_text}')]")
    ))
    tab.click()
    time.sleep(1)
