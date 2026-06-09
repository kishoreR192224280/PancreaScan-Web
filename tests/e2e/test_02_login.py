"""
TEST MODULE 02 — Login Page (18 tests)
Covers: form rendering, field behaviour, validation, password toggle, navigation links, successful login.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import BASE_URL, TEST_EMAIL, TEST_PASSWORD, go_home, navigate_to_login


class TestLoginPageElements:
    """Tests that verify every UI element on the Login page is present and correct."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        navigate_to_login(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-LG01
    def test_login_welcome_heading_visible(self):
        """The heading 'Welcome Back, Doctor' should appear on the login screen to greet the user."""
        assert "Welcome Back, Doctor" in self.body, \
            "The 'Welcome Back, Doctor' heading is missing from the login page. " \
            "The login view may not have rendered, or the React state didn't transition from landing correctly."

    # TC-LG02
    def test_login_subtitle_visible(self):
        """The subtitle 'Sign in to your secure clinical portal' should appear under the heading."""
        assert "Sign in to your secure clinical portal" in self.body, \
            "The login page subtitle is missing. This suggests the auth-card component is not rendering fully."

    # TC-LG03
    def test_email_input_field_present(self):
        """An email input field must exist on the login form for the user to enter their credentials."""
        field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        assert field.is_displayed(), \
            "The email input field is not visible. The login form may have failed to mount."

    # TC-LG04
    def test_password_input_field_present(self):
        """A password input field must exist on the login form."""
        field = self.driver.find_element(By.XPATH, "//input[@type='password']")
        assert field.is_displayed(), \
            "The password input field is not visible on the login page."

    # TC-LG05
    def test_remember_me_checkbox_present(self):
        """A 'Remember Me' checkbox must be present so users can stay logged in."""
        checkbox = self.driver.find_element(By.XPATH, "//input[@type='checkbox']")
        assert checkbox is not None, \
            "Could not find a checkbox on the login page. The 'Remember Me' option is missing."

    # TC-LG06
    def test_forgot_password_link_visible(self):
        """'Forgot Password?' link must be visible so users can initiate password recovery."""
        assert "Forgot Password?" in self.body, \
            "The 'Forgot Password?' link text is not visible on the login page."

    # TC-LG07
    def test_create_account_link_visible(self):
        """'Create Account' link must be visible so new users can register."""
        assert "Create Account" in self.body, \
            "The 'Create Account' link is not visible on the login page. New users have no way to register."

    # TC-LG08
    def test_login_button_present(self):
        """The 'Log In' submit button must be visible and enabled."""
        btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Log In')]")
        assert btn.is_displayed(), "The 'Log In' button is not visible on the login page."
        assert btn.is_enabled(), "The 'Log In' button is present but disabled — it should be enabled by default."


class TestLoginFieldBehaviour:
    """Tests that verify correct interactive behaviour of login form fields."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        navigate_to_login(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    # TC-LG09
    def test_email_field_accepts_typed_input(self):
        """Typing an email address into the email field should update its value correctly."""
        field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        field.clear()
        field.send_keys("doctor@hospital.com")
        assert field.get_attribute("value") == "doctor@hospital.com", \
            "Typed 'doctor@hospital.com' into the email field but the field value did not update. " \
            "The onChange handler may be broken."

    # TC-LG10
    def test_password_field_is_masked_by_default(self):
        """The password field must have type='password' so characters are hidden by default."""
        field = self.driver.find_element(By.XPATH, "//input[@type='password']")
        assert field.get_attribute("type") == "password", \
            "The password field is NOT masked. It is currently showing text as plain-text, " \
            "which is a security risk. The input type should be 'password'."

    # TC-LG11
    def test_show_password_toggle_reveals_text(self):
        """Clicking the eye icon (👁️) should change the password field from type='password' to type='text'."""
        pw_field = self.driver.find_element(By.XPATH, "//input[@type='password']")
        pw_field.send_keys("mypassword123")
        # Click the show-password toggle (🕶️ or 👁️)
        toggle = self.driver.find_element(By.CLASS_NAME, "input-eye")
        toggle.click()
        time.sleep(0.5)
        revealed = self.driver.find_element(By.XPATH, "//input[@type='text' and contains(@class,'') or @type='text']")
        assert revealed.get_attribute("value") == "mypassword123", \
            "Clicking the eye icon should reveal the password as plain text, but it didn't change. " \
            "The showPassword state toggle may not be working."

    # TC-LG12
    def test_remember_me_checkbox_is_togglable(self):
        """The 'Remember Me' checkbox should be unchecked by default and become checked when clicked."""
        checkbox = self.driver.find_element(By.XPATH, "//input[@type='checkbox']")
        initial_state = checkbox.is_selected()
        checkbox.click()
        time.sleep(0.3)
        assert checkbox.is_selected() != initial_state, \
            "Clicking the 'Remember Me' checkbox did not change its checked state. The onChange handler may be broken."


class TestLoginValidation:
    """Tests that check the login form's error handling and validation messages."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        navigate_to_login(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    # TC-LG13
    def test_wrong_credentials_shows_error_toast(self):
        """Submitting an incorrect email/password must show a toast error message — not crash or redirect."""
        email_field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        email_field.send_keys("wrong@example.com")
        pw_field = self.driver.find_element(By.XPATH, "//input[@type='password']")
        pw_field.send_keys("wrongpassword")
        self.driver.find_element(By.XPATH, "//button[contains(text(),'Log In')]").click()
        time.sleep(4)
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body.lower() for word in ["invalid", "incorrect", "error", "failed", "not found"]), \
            "After submitting wrong credentials, no error message appeared. " \
            "The user would not know the login failed. The backend response may not be triggering a toast notification."

    # TC-LG14
    def test_forgot_password_link_navigates_to_recovery_page(self):
        """Clicking 'Forgot Password?' must navigate the user to the password recovery screen."""
        forgot_link = self.driver.find_element(By.XPATH, "//*[contains(text(),'Forgot Password?')]")
        forgot_link.click()
        self.wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Check Email')]")
        ))
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Forgot Password" in body or "Check Email" in body, \
            "Clicking 'Forgot Password?' did not navigate to the password recovery page."

    # TC-LG15
    def test_create_account_link_navigates_to_register(self):
        """Clicking 'Create Account' must navigate the user to the registration screen."""
        link = self.driver.find_element(By.XPATH, "//*[contains(text(),'Create Account')]")
        link.click()
        self.wait.until(EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Create Your Account')]")
        ))
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Create Your Account" in body, \
            "Clicking 'Create Account' from the login page did not open the registration form."


class TestLoginSuccess:
    """Tests that verify a successful login flow."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        navigate_to_login(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    # TC-LG16
    def test_valid_credentials_login_reaches_dashboard(self):
        """Entering valid email and password must successfully log in and display the Dashboard."""
        email_field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        email_field.send_keys(TEST_EMAIL)
        pw_field = self.driver.find_element(By.XPATH, "//input[@type='password']")
        pw_field.send_keys(TEST_PASSWORD)
        self.driver.find_element(By.XPATH, "//button[contains(text(),'Log In')]").click()
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "dashboard-layout")))
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Dashboard" in body or "PancreaScan" in body, \
            f"Login with valid credentials ({TEST_EMAIL}) did not reach the Dashboard. " \
            "The backend may have rejected the credentials or the session wasn't stored."

    # TC-LG17
    def test_dashboard_sidebar_visible_after_login(self):
        """After a successful login, the left sidebar with navigation items must appear."""
        email_field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        email_field.send_keys(TEST_EMAIL)
        pw_field = self.driver.find_element(By.XPATH, "//input[@type='password']")
        pw_field.send_keys(TEST_PASSWORD)
        self.driver.find_element(By.XPATH, "//button[contains(text(),'Log In')]").click()
        sidebar = self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "dashboard-sidebar")))
        assert sidebar.is_displayed(), \
            "After login, the sidebar navigation panel is not visible. The dashboard layout may have failed to render."

    # TC-LG18
    def test_dashboard_shows_username_after_login(self):
        """After login, the user's name or 'Dr.' prefix should appear somewhere on the dashboard."""
        email_field = self.driver.find_element(By.XPATH, "//input[@type='email']")
        email_field.send_keys(TEST_EMAIL)
        pw_field = self.driver.find_element(By.XPATH, "//input[@type='password']")
        pw_field.send_keys(TEST_PASSWORD)
        self.driver.find_element(By.XPATH, "//button[contains(text(),'Log In')]").click()
        self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "dashboard-layout")))
        time.sleep(2)
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Dr." in body or "Test Doctor" in body or "testdoctor" in body.lower(), \
            "After login, the user's name ('Dr. Test Doctor') was not found anywhere on the dashboard. " \
            "The user session data may not be flowing into the UI components."
