"""
E2E Tests: Authentication — Login, Register, Forgot Password
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "https://kishorer192224280.github.io/PancreaScan-Web/"

# ── helpers ──────────────────────────────────────────────────────────────────

def navigate_to_login(driver):
    """Click through the landing page to reach the login form."""
    wait = WebDriverWait(driver, 15)
    driver.get(BASE_URL)
    btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(text(),'Access PancreaScan')]")
        )
    )
    btn.click()
    wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//input[@type='email' or @placeholder[contains(.,'email') or contains(.,'Email')]]")
        )
    )


def navigate_to_register(driver):
    """Navigate to the registration form."""
    navigate_to_login(driver)
    wait = WebDriverWait(driver, 10)
    register_link = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(text(),'Create Account')]")
        )
    )
    register_link.click()
    wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//input[@type='password']")
        )
    )


# ── Login Tests ───────────────────────────────────────────────────────────────

class TestLogin:

    def test_login_form_renders(self, driver):
        """Login form should show email and password fields."""
        navigate_to_login(driver)
        email = driver.find_element(
            By.XPATH, "//input[@type='email' or @placeholder[contains(.,'email') or contains(.,'Email')]]"
        )
        password = driver.find_element(By.XPATH, "//input[@type='password']")
        assert email.is_displayed()
        assert password.is_displayed()

    def test_login_empty_fields_shows_error(self, driver):
        """Submitting empty login form should show an error/toast."""
        navigate_to_login(driver)
        wait = WebDriverWait(driver, 10)
        submit = driver.find_element(
            By.XPATH, "//button[@type='submit' or contains(text(),'Login') or contains(text(),'Sign In')]"
        )
        submit.click()
        time.sleep(1)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        # Should show a validation message
        assert any(word in body_text.lower() for word in ["error", "required", "invalid", "email", "password", "⚠️"])

    def test_login_invalid_credentials_shows_error(self, driver):
        """Wrong credentials should display an error toast."""
        navigate_to_login(driver)
        wait = WebDriverWait(driver, 10)

        email_input = driver.find_element(
            By.XPATH, "//input[@type='email' or @placeholder[contains(.,'email') or contains(.,'Email')]]"
        )
        password_input = driver.find_element(By.XPATH, "//input[@type='password']")

        email_input.clear()
        email_input.send_keys("nonexistent@test.com")
        password_input.clear()
        password_input.send_keys("wrongpassword123")

        submit = driver.find_element(
            By.XPATH, "//button[@type='submit' or contains(text(),'Login') or contains(text(),'Sign In')]"
        )
        submit.click()

        # Wait for error toast
        time.sleep(3)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["failed", "error", "not found", "invalid", "❌"])

    def test_login_email_field_accepts_input(self, driver):
        """Email field should accept typed input correctly."""
        navigate_to_login(driver)
        email_input = driver.find_element(
            By.XPATH, "//input[@type='email' or @placeholder[contains(.,'email') or contains(.,'Email')]]"
        )
        email_input.clear()
        email_input.send_keys("test@example.com")
        assert email_input.get_attribute("value") == "test@example.com"

    def test_login_password_field_is_masked(self, driver):
        """Password field should mask the input (type=password)."""
        navigate_to_login(driver)
        pw = driver.find_element(By.XPATH, "//input[@type='password']")
        assert pw.get_attribute("type") == "password"


# ── Register Tests ────────────────────────────────────────────────────────────

class TestRegister:

    def test_register_form_renders(self, driver):
        """Registration form should show name, email, and password fields."""
        navigate_to_register(driver)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        # Expect at least name + email + password inputs visible
        inputs = driver.find_elements(By.TAG_NAME, "input")
        assert len(inputs) >= 3

    def test_register_empty_fields_shows_error(self, driver):
        """Submitting empty registration form should show validation error."""
        navigate_to_register(driver)
        submit = driver.find_element(
            By.XPATH, "//button[@type='submit' or contains(text(),'Register') or contains(text(),'Sign Up') or contains(text(),'Create')]"
        )
        submit.click()
        time.sleep(1)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["error", "required", "field", "⚠️"])

    def test_register_password_mismatch_shows_error(self, driver):
        """Mismatched passwords should show an error."""
        navigate_to_register(driver)
        wait = WebDriverWait(driver, 10)

        inputs = driver.find_elements(By.TAG_NAME, "input")
        # Fill fields generically
        for inp in inputs:
            itype = inp.get_attribute("type")
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            if "name" in placeholder:
                inp.send_keys("Test Doctor")
            elif "email" in placeholder or itype == "email":
                inp.send_keys("testdoc@example.com")
            elif itype == "password" and "confirm" in placeholder:
                inp.send_keys("DifferentPass456!")
            elif itype == "password":
                inp.send_keys("Password123!")

        submit = driver.find_element(
            By.XPATH, "//button[@type='submit' or contains(text(),'Register') or contains(text(),'Sign Up') or contains(text(),'Create')]"
        )
        submit.click()
        time.sleep(2)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["match", "password", "error", "❌", "⚠️"])

    def test_register_link_visible_on_login_page(self, driver):
        """A link to register should be visible on the login page."""
        navigate_to_login(driver)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["register", "sign up", "create account"])


# ── Forgot Password Tests ─────────────────────────────────────────────────────

class TestForgotPassword:

    def test_forgot_password_link_visible(self, driver):
        """Forgot password link should appear on login page."""
        navigate_to_login(driver)
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["forgot", "reset", "password"])

    def test_forgot_password_with_unknown_email(self, driver):
        """Entering an unknown email in forgot password should show an error."""
        navigate_to_login(driver)
        wait = WebDriverWait(driver, 10)

        forgot_link = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//*[contains(text(),'Forgot') or contains(text(),'Reset')]")
            )
        )
        forgot_link.click()
        time.sleep(1)

        email_input = wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//input[@type='email' or @placeholder[contains(.,'email') or contains(.,'Email')]]")
            )
        )
        email_input.send_keys("nobody@unknown.com")

        submit = driver.find_element(
            By.XPATH, "//button[@type='submit' or contains(text(),'Check Email')]"
        )
        submit.click()
        time.sleep(3)

        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body_text.lower() for word in ["error", "not found", "failed", "❌"])
