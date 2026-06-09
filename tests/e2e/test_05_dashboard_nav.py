"""
TEST MODULE 05 — Dashboard Navigation (13 tests)
Covers: sidebar elements, menu items, active states, tab switching, logo visibility.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import login, navigate_to_dashboard_tab


class TestDashboardSidebar:
    """Tests for all sidebar elements visible after login."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        login(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-DN01
    def test_dashboard_layout_present_after_login(self):
        """The main dashboard layout container must be present immediately after a successful login."""
        layout = self.driver.find_element(By.CLASS_NAME, "dashboard-layout")
        assert layout.is_displayed(), \
            "The 'dashboard-layout' element is not visible after login. The dashboard component may have failed to render."

    # TC-DN02
    def test_sidebar_logo_image_visible(self):
        """The PancreaScan logo image must appear in the sidebar header."""
        logo = self.driver.find_element(By.CLASS_NAME, "sidebar-logo")
        assert logo.is_displayed(), \
            "The logo image is not visible in the dashboard sidebar. Check if the image asset loaded correctly."

    # TC-DN03
    def test_sidebar_brand_title_pancreascan_visible(self):
        """'PancreaScan' brand name must appear next to the logo in the sidebar."""
        brand = self.driver.find_element(By.CLASS_NAME, "sidebar-title")
        assert "PancreaScan" in brand.text, \
            f"The sidebar brand title should say 'PancreaScan' but shows: '{brand.text}'."

    # TC-DN04
    def test_dashboard_menu_item_present(self):
        """The '📊 Dashboard' button must be visible in the sidebar navigation menu."""
        assert "Dashboard" in self.body, \
            "The 'Dashboard' menu item is not found in the sidebar. The navigation menu may not have rendered."

    # TC-DN05
    def test_patient_history_menu_item_present(self):
        """The '🩻 Patient History' button must be visible in the sidebar navigation menu."""
        assert "Patient History" in self.body, \
            "The 'Patient History' menu item is missing from the sidebar navigation."

    # TC-DN06
    def test_analytics_menu_item_present(self):
        """The '📈 Analytics' button must be visible in the sidebar navigation menu."""
        assert "Analytics" in self.body, \
            "The 'Analytics' menu item is missing from the sidebar navigation."

    # TC-DN07
    def test_settings_menu_item_present(self):
        """The '⚙️ Settings' button must be visible in the sidebar navigation menu."""
        assert "Settings" in self.body, \
            "The 'Settings' menu item is missing from the sidebar navigation."

    # TC-DN08
    def test_logout_button_in_sidebar_present(self):
        """A '🚪 Log Out' button must be visible at the bottom of the sidebar."""
        assert "Log Out" in self.body, \
            "The 'Log Out' button is not found in the sidebar. Users have no way to end their session from the dashboard."


class TestDashboardTabSwitching:
    """Tests for clicking each sidebar tab and verifying the correct view loads."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        login(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    # TC-DN09
    def test_patient_history_tab_loads_history_view(self):
        """Clicking 'Patient History' must switch the main content area to show the patient scan records."""
        navigate_to_dashboard_tab(self.driver, "Patient History")
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body for word in ["Patient History", "All Scans", "Scan Result", "No medical CT"]), \
            "Clicking 'Patient History' tab did not load the history view. " \
            "The tab button click may not be triggering the setDashboardSubView('history') state update."

    # TC-DN10
    def test_analytics_tab_loads_analytics_view(self):
        """Clicking 'Analytics' must switch the main content to show the Neural Analytics dashboard."""
        navigate_to_dashboard_tab(self.driver, "Analytics")
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body for word in ["Neural Analytics", "CT Scan Ratios", "Normal Scans", "Scan Summary"]), \
            "Clicking 'Analytics' tab did not load the analytics view. " \
            "The setDashboardSubView('analytics') state change may not be triggering."

    # TC-DN11
    def test_settings_tab_loads_settings_view(self):
        """Clicking 'Settings' must switch the main content to show the account and AI model settings."""
        navigate_to_dashboard_tab(self.driver, "Settings")
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body for word in ["Clinical Profile", "Federated AI", "YOLOv8", "Secure Log Out"]), \
            "Clicking 'Settings' tab did not load the settings view. " \
            "The setDashboardSubView('settings') state change may not be working."

    # TC-DN12
    def test_clicking_dashboard_tab_returns_to_overview(self):
        """After switching to another tab, clicking 'Dashboard' must return the main content to the overview."""
        navigate_to_dashboard_tab(self.driver, "Analytics")
        navigate_to_dashboard_tab(self.driver, "Dashboard")
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert any(word in body for word in ["Total Scans", "Select Medical CT Scan", "Normal", "Abnormal"]), \
            "Clicking 'Dashboard' tab after switching away did not return to the overview panel."

    # TC-DN13
    def test_history_table_column_headers_visible(self):
        """The Patient History table must have recognizable column headers (Patient ID, Name, Result, etc.)."""
        navigate_to_dashboard_tab(self.driver, "Patient History")
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert all(col in body for col in ["Patient ID", "Patient Name", "Scan Result"]), \
            "The Patient History table is missing one or more column headers (Patient ID, Patient Name, Scan Result). " \
            "The history table component may have a rendering error."
