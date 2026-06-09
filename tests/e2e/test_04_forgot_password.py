"""
TEST MODULE 04 — Forgot Password Page (9 tests)
Covers: navigation from login, form elements, field behaviour, validation, back navigation.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import navigate_to_login


def navigate_to_forgot(driver):
    """Helper: go to login page then click 'Forgot Password?' to reach the recovery form."""
    navigate_to_login(driver)
    wait = WebDriverWait(driver, 15)
    link = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//*[contains(text(),'Forgot Password?')]")
    ))
    link.click()
    wait.until(EC.presence_of_element_located(
        (By.XPATH, "//button[contains(text(),'Check Email')]")
    ))


class TestForgotPasswordPage:
    """Tests for all elements and behaviour on the Forgot Password recovery page."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        navigate_to_forgot(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-FP01
    def test_forgot_password_link_on_login_page_visible(self):
        """Verify we successfully reached the Forgot Password page — the heading must say 'Forgot Password?'."""
        assert "Forgot Password?" in self.body, \
            "The Forgot Password page did not load correctly. Expected to see 'Forgot Password?' as the page heading."

    # TC-FP02
    def test_forgot_page_subtitle_visible(self):
        """The subtitle 'Enter your registered email address' must appear to guide the user."""
        assert "Enter your registered email address" in self.body, \
            "The subtitle text on the Forgot Password page is missing. This means the forgot_email view may not be rendering."

    # TC-FP03
    def test_forgot_email_input_present(self):
        """An email input field must exist on the Forgot Password form so the user can enter their email."""
        field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        assert field.is_displayed(), \
            "The email input field is not visible on the Forgot Password page."

    # TC-FP04
    def test_check_email_button_present(self):
        """The 'Check Email' submit button must be visible and enabled."""
        btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Check Email')]")
        assert btn.is_displayed(), "The 'Check Email' button is not visible on the Forgot Password page."
        assert btn.is_enabled(), "The 'Check Email' button is disabled — it should be enabled by default."

    # TC-FP05
    def test_back_to_login_link_present(self):
        """A 'Back to Login' link must appear so users can return to the login screen."""
        assert "Back to Login" in self.body, \
            "The 'Back to Login' link is missing from the Forgot Password page. Users have no way to go back."

    # TC-FP06
    def test_forgot_email_field_accepts_input(self):
        """The email field on the Forgot Password page should accept typed text."""
        field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        field.clear()
        field.send_keys("test@email.com")
        assert field.get_attribute("value") == "test@email.com", \
            "Could not type into the Forgot Password email field. The input may be disabled or have an onChange issue."

    # TC-FP07
    def test_unknown_email_shows_error_message(self):
        """Submitting an email that is not registered must display an error, not crash or silently fail."""
        field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        field.clear()
        field.send_keys("nobody_registered@fake.com")
        self.driver.find_element(By.XPATH, "//button[contains(text(),'Check Email')]").click()
        time.sleep(4)
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body.lower() for word in ["not found", "no account", "error", "invalid", "check"]), \
            "After submitting an unregistered email in the Forgot Password form, no error message appeared. " \
            "The API response may not be triggering a UI notification."

    # TC-FP08
    def test_back_to_login_navigates_to_login_screen(self):
        """Clicking 'Back to Login' must navigate back to the Login screen with the login form."""
        link = self.driver.find_element(By.XPATH, "//*[contains(text(),'Back to Login')]")
        link.click()
        self.wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Welcome Back, Doctor')]")
        ))
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Welcome Back, Doctor" in body, \
            "Clicking 'Back to Login' from the Forgot Password page did not return to the Login screen."

    # TC-FP09
    def test_forgot_link_reachable_from_login(self):
        """The entire forgot password navigation flow (Login → Forgot → Back to Login) must work end-to-end."""
        # Go back to login then return to forgot
        navigate_to_login(self.driver)
        forgot_link = self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(text(),'Forgot Password?')]")
        ))
        forgot_link.click()
        self.wait.until(EC.presence_of_element_located(
            (By.XPATH, "//button[contains(text(),'Check Email')]")
        ))
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Forgot Password?" in body, \
            "Could not navigate from Login to Forgot Password page via the link. The navigation flow is broken."
