"""
TEST MODULE 03 — Register Page (13 tests)
Covers: form rendering, field presence, navigation links, masked inputs, back-to-login.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import navigate_to_login


def navigate_to_register(driver):
    """Helper: go to login page then click 'Create Account' to reach the register form."""
    navigate_to_login(driver)
    wait = WebDriverWait(driver, 15)
    link = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//*[contains(text(),'Create Account')]")
    ))
    link.click()
    wait.until(EC.presence_of_element_located(
        (By.XPATH, "//*[contains(text(),'Create Your Account')]")
    ))


class TestRegisterPageElements:
    """Tests that every UI element on the Register form is present and correct."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        navigate_to_register(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-R01
    def test_register_heading_visible(self):
        """The heading 'Create Your Account' should appear at the top of the registration form."""
        assert "Create Your Account" in self.body, \
            "The 'Create Your Account' heading is missing. The register view may not have loaded correctly."

    # TC-R02
    def test_register_subtitle_visible(self):
        """The subtitle 'Join the PancreaScan Secure Clinical Network' should appear below the heading."""
        assert "Join the PancreaScan Secure Clinical Network" in self.body, \
            "The subtitle text is missing from the registration page."

    # TC-R03
    def test_full_name_field_present(self):
        """A 'Full Name' text input field must exist on the registration form."""
        field = self.driver.find_element(By.XPATH, "//input[@placeholder='Full Name']")
        assert field.is_displayed(), \
            "The 'Full Name' input field is not visible on the registration form."

    # TC-R04
    def test_register_email_field_present(self):
        """An email input field must exist on the registration form."""
        field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        assert field.is_displayed(), \
            "The email input field is missing from the registration form."

    # TC-R05
    def test_register_password_field_present(self):
        """A password input field must exist on the registration form."""
        fields = self.driver.find_elements(By.XPATH, "//input[@type='password']")
        assert len(fields) >= 1, \
            "No password field was found on the registration form."
        assert fields[0].is_displayed(), \
            "The password field exists but is not visible on screen."

    # TC-R06
    def test_confirm_password_field_present(self):
        """A 'Confirm Password' field must exist so the user can verify their chosen password."""
        fields = self.driver.find_elements(By.XPATH, "//input[@type='password']")
        assert len(fields) >= 2, \
            "Only one password field was found. The registration form requires a second 'Confirm Password' field."
        assert fields[1].is_displayed(), \
            "The 'Confirm Password' field exists but is not visible."

    # TC-R07
    def test_create_account_button_present(self):
        """The 'Create Account' submit button must be visible and enabled on the form."""
        btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Create Account')]")
        assert btn.is_displayed(), "The 'Create Account' submit button is not visible."
        assert btn.is_enabled(), "The 'Create Account' button is disabled — it should be enabled so users can submit."

    # TC-R08
    def test_back_to_login_link_present(self):
        """A 'Log In' link must exist at the bottom so existing users can navigate back to the login screen."""
        assert "Log In" in self.body or "Already have an account" in self.body, \
            "The 'Log In' / 'Already have an account?' link is missing from the registration page."


class TestRegisterFieldBehaviour:
    """Tests that verify interactive behaviour of the register form fields."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        navigate_to_register(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    # TC-R09
    def test_full_name_field_accepts_text(self):
        """The Full Name field should accept and display the typed text correctly."""
        field = self.driver.find_element(By.XPATH, "//input[@placeholder='Full Name']")
        field.clear()
        field.send_keys("Dr. Test User")
        assert field.get_attribute("value") == "Dr. Test User", \
            "Typed 'Dr. Test User' into the Full Name field but the value was not stored. The onChange handler may be broken."

    # TC-R10
    def test_register_email_accepts_input(self):
        """The email field on the register form should accept a typed email address."""
        field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        field.clear()
        field.send_keys("newuser@hospital.com")
        assert field.get_attribute("value") == "newuser@hospital.com", \
            "Could not type into the register email field correctly."

    # TC-R11
    def test_register_password_is_masked(self):
        """The password field must use type='password' so the characters are hidden."""
        fields = self.driver.find_elements(By.XPATH, "//input[@type='password']")
        assert fields[0].get_attribute("type") == "password", \
            "The password field on the registration form is not masked (type is not 'password'). This is a security issue."

    # TC-R12
    def test_confirm_password_is_masked(self):
        """The Confirm Password field must also use type='password' for security."""
        fields = self.driver.find_elements(By.XPATH, "//input[@type='password']")
        assert len(fields) >= 2 and fields[1].get_attribute("type") == "password", \
            "The Confirm Password field is not masked. This is a security issue."

    # TC-R13
    def test_back_to_login_link_navigates_to_login(self):
        """Clicking the 'Log In' link on the register page must navigate back to the Login screen."""
        link = self.driver.find_element(By.XPATH, "//*[contains(text(),'Log In') and not(contains(text(),'Create'))]")
        link.click()
        self.wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Welcome Back, Doctor')]")
        ))
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Welcome Back, Doctor" in body, \
            "Clicking 'Log In' on the register page did not navigate back to the Login screen."
