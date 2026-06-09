"""
TEST MODULE 12 — Logout (5 tests)
Covers: logout button visibility, click behaviour, post-logout page state, session clearing.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import login, go_home, navigate_to_login, navigate_to_dashboard_tab


class TestLogout:
    """Tests that the logout flow works correctly from both sidebar and settings."""

    # TC-LO01
    def test_logout_button_visible_in_sidebar(self, driver):
        """After login, the '🚪 Log Out' button must be visible in the sidebar footer."""
        login(driver)
        body = driver.find_element(By.TAG_NAME, "body").text
        assert "Log Out" in body, \
            "The 'Log Out' button is not visible in the sidebar after login. " \
            "The sidebar-footer section may not be rendering."

    # TC-LO02
    def test_sidebar_logout_click_navigates_to_login(self, driver):
        """Clicking the sidebar 'Log Out' button must redirect to the Login screen."""
        login(driver)
        wait = WebDriverWait(driver, 15)
        logout_btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(@class,'btn-logout') and contains(text(),'Log Out')]")
        ))
        logout_btn.click()
        time.sleep(2)
        body = driver.find_element(By.TAG_NAME, "body").text
        assert "Welcome Back, Doctor" in body or "Log In" in body, \
            "Clicking the sidebar 'Log Out' button did not navigate to the Login page. " \
            "The onClick handler may not be calling setView('login') correctly."

    # TC-LO03
    def test_login_form_is_visible_after_logout(self, driver):
        """After logout, the Login form (email/password inputs) must be visible — not a blank screen."""
        login(driver)
        wait = WebDriverWait(driver, 15)
        logout_btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(@class,'btn-logout') and contains(text(),'Log Out')]")
        ))
        logout_btn.click()
        time.sleep(2)
        email_field = wait.until(EC.visibility_of_element_located((By.XPATH, "//input[@type='email']")))
        assert email_field.is_displayed(), \
            "After logging out, the email input field is not visible. " \
            "The page may be showing a blank/broken state instead of the login form."

    # TC-LO04
    def test_dashboard_not_visible_after_logout(self, driver):
        """After logout, the dashboard-layout element must NOT be present on the page."""
        login(driver)
        wait = WebDriverWait(driver, 15)
        logout_btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(@class,'btn-logout') and contains(text(),'Log Out')]")
        ))
        logout_btn.click()
        time.sleep(2)
        dashboard_elements = driver.find_elements(By.CLASS_NAME, "dashboard-layout")
        assert len(dashboard_elements) == 0, \
            "The dashboard is still visible after logout. The session was not properly cleared, " \
            "meaning an unauthorized user could still see patient data."

    # TC-LO05
    def test_settings_secure_logout_navigates_to_login(self, driver):
        """Clicking '🚪 Secure Log Out' from the Settings tab must also successfully log out and show the login screen."""
        login(driver)
        navigate_to_dashboard_tab(driver, "Settings")
        wait = WebDriverWait(driver, 15)
        secure_logout_btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Secure Log Out')]")
        ))
        secure_logout_btn.click()
        time.sleep(2)
        body = driver.find_element(By.TAG_NAME, "body").text
        assert "Welcome Back, Doctor" in body or "Log In" in body, \
            "Clicking 'Secure Log Out' from the Settings tab did not navigate back to the Login page."
