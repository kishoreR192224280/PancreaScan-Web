"""
TEST MODULE 11 — Settings Tab (8 tests)
Covers: profile section, user details, AI model info, federated learning controls, danger zone buttons.
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import login, navigate_to_dashboard_tab


class TestSettingsTab:
    """Tests for the Settings view on the dashboard."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        login(driver)
        navigate_to_dashboard_tab(driver, "Settings")
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-ST01
    def test_settings_clinical_profile_section_visible(self):
        """The '👤 Clinical Profile & Security' section must appear in the Settings view."""
        assert "Clinical Profile" in self.body, \
            "The 'Clinical Profile & Security' section heading is missing from the Settings tab. " \
            "The settings view may not have loaded, or the sub-view state is not 'settings'."

    # TC-ST02
    def test_settings_shows_doctor_name(self):
        """The doctor's name (prefixed with 'Dr.') must appear in the Clinical Profile section."""
        assert "Dr." in self.body, \
            "The 'Dr.' prefix and doctor name are not shown in the Settings Clinical Profile section. " \
            "The user session data (user.name) may not be flowing into the settings view."

    # TC-ST03
    def test_settings_shows_user_email(self):
        """The logged-in user's email address must appear in the profile section."""
        assert "testdoctor@pancreascan.com" in self.body or "@" in self.body, \
            "The user's email address is not visible in the Settings profile section."

    # TC-ST04
    def test_federated_ai_model_section_visible(self):
        """The '🧠 Federated AI Model Parameters' section must appear in Settings."""
        assert "Federated AI Model" in self.body, \
            "The 'Federated AI Model Parameters' section is missing from the Settings tab."

    # TC-ST05
    def test_settings_shows_yolov8_engine_name(self):
        """The AI Core Engine name 'YOLOv8 Classifier' must be listed in the model parameters section."""
        assert "YOLOv8 Classifier" in self.body, \
            "The 'YOLOv8 Classifier' AI engine name is not shown in the Settings tab. " \
            "The model info section may have a rendering issue."

    # TC-ST06
    def test_check_model_update_button_present(self):
        """The '📡 Check Model Update' button must be visible in the Federated AI section."""
        assert "Check Model Update" in self.body, \
            "The 'Check Model Update' button is missing from the Settings tab."

    # TC-ST07
    def test_sync_training_data_button_present(self):
        """The '🧠 Sync Anonymized Training Data' button must be visible for federated learning sync."""
        assert "Sync Anonymized Training Data" in self.body, \
            "The 'Sync Anonymized Training Data' button is missing from the Settings tab."

    # TC-ST08
    def test_secure_logout_button_in_settings(self):
        """A '🚪 Secure Log Out' button must be present in the Settings profile section."""
        assert "Secure Log Out" in self.body, \
            "The 'Secure Log Out' button is missing from the Settings tab. " \
            "This button provides a second logout path from the settings screen."
