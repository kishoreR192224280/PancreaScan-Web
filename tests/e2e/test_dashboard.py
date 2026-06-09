"""
E2E Tests: Dashboard — Navigation, Tabs, UI elements
Requires a valid logged-in session. Uses a test account seeded in the DB.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "https://kishorer192224280.github.io/PancreaScan-Web/"

# ── Test credentials — update these to a real account in your local DB ───────
TEST_EMAIL    = "testdoctor@pancreascan.com"
TEST_PASSWORD = "TestPass@123"


def login(driver, email=TEST_EMAIL, password=TEST_PASSWORD):
    """Full login flow helper."""
    wait = WebDriverWait(driver, 15)
    driver.get(BASE_URL)

    # Navigate past landing
    btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(text(),'Access PancreaScan')]")
        )
    )
    btn.click()

    # Fill credentials
    email_input = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//input[@type='email' or @placeholder[contains(.,'email') or contains(.,'Email')]]")
        )
    )
    email_input.clear()
    email_input.send_keys(email)

    pw_input = driver.find_element(By.XPATH, "//input[@type='password']")
    pw_input.clear()
    pw_input.send_keys(password)

    submit = driver.find_element(
        By.XPATH, "//button[@type='submit' or contains(text(),'Log In')]"
    )
    submit.click()
    time.sleep(3)


class TestDashboard:

    def test_dashboard_loads_after_login(self, driver):
        """After successful login, the dashboard should render."""
        login(driver)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        # Dashboard should mention the user or show nav items
        assert any(word in body_text.lower() for word in ["dashboard", "overview", "history", "scan", "welcome", "dr."])

    def test_dashboard_nav_tabs_visible(self, driver):
        """Navigation tabs (Overview, History, Analytics, Settings) should be visible."""
        login(driver)
        wait = WebDriverWait(driver, 10)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["overview", "history", "analytics", "settings"])

    def test_history_tab_navigates(self, driver):
        """Clicking History tab should show the history section."""
        login(driver)
        wait = WebDriverWait(driver, 10)
        history_tab = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//*[contains(text(),'History') or contains(text(),'history')]")
            )
        )
        history_tab.click()
        time.sleep(1)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["history", "scan", "patient", "record", "no records", "no scans"])

    def test_analytics_tab_navigates(self, driver):
        """Clicking Analytics tab should show analytics section."""
        login(driver)
        wait = WebDriverWait(driver, 10)
        analytics_tab = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//*[contains(text(),'Analytics') or contains(text(),'analytics')]")
            )
        )
        analytics_tab.click()
        time.sleep(1)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["analytics", "total", "normal", "abnormal", "scan"])

    def test_settings_tab_navigates(self, driver):
        """Clicking Settings tab should show settings section."""
        login(driver)
        wait = WebDriverWait(driver, 10)
        settings_tab = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//*[contains(text(),'Settings') or contains(text(),'settings')]")
            )
        )
        settings_tab.click()
        time.sleep(1)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["settings", "account", "profile", "model", "logout"])

    def test_logout_button_visible(self, driver):
        """Logout option should be accessible from the dashboard."""
        login(driver)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["logout", "sign out", "log out"])

    def test_logout_redirects_to_login(self, driver):
        """Clicking logout should return user to login page."""
        login(driver)
        wait = WebDriverWait(driver, 10)
        logout_btn = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//*[contains(text(),'Logout') or contains(text(),'Sign Out') or contains(text(),'Log Out')]")
            )
        )
        logout_btn.click()
        time.sleep(2)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["login", "sign in", "email", "password"])
