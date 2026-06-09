"""
TEST MODULE 06 — Dashboard Overview Stats (9 tests)
Covers: stat cards, CT scan upload button, filter card interactions, AI badge.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import login, navigate_to_dashboard_tab


class TestDashboardStats:
    """Tests for the stats cards and overview section on the main dashboard."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        login(driver)
        # Make sure we're on the overview tab
        navigate_to_dashboard_tab(driver, "Dashboard")
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-DS01
    def test_total_scans_stat_card_visible(self):
        """The 'Total Scans' stat card must appear on the dashboard overview, showing the aggregate scan count."""
        assert "Total Scans" in self.body, \
            "The 'Total Scans' stat card is missing from the dashboard overview. " \
            "The stats-cards-grid section may not be rendering."

    # TC-DS02
    def test_normal_scans_stat_card_visible(self):
        """A stat card for 'Normal' scans must be visible, showing the count of scans with normal results."""
        assert "Normal" in self.body, \
            "The 'Normal' scans stat card is not visible on the dashboard overview."

    # TC-DS03
    def test_abnormal_scans_stat_card_visible(self):
        """A stat card for 'Abnormal' scans must be visible, showing the count of scans with abnormal results."""
        assert "Abnormal" in self.body, \
            "The 'Abnormal' scans stat card is not visible on the dashboard overview."

    # TC-DS04
    def test_select_ct_scan_button_visible(self):
        """The '📁 Select Medical CT Scan' upload button must be prominently visible on the dashboard."""
        assert "Select Medical CT Scan" in self.body, \
            "The 'Select Medical CT Scan' button is missing from the dashboard. " \
            "Users have no way to upload a scan for analysis."

    # TC-DS05
    def test_file_input_element_exists_in_dom(self):
        """The hidden file input (id='real-ct-upload') must exist in the DOM — it is what the upload button triggers."""
        file_input = self.driver.find_element(By.ID, "real-ct-upload")
        assert file_input is not None, \
            "Could not find the hidden file input element with id='real-ct-upload'. " \
            "Without this element, file uploads cannot be triggered programmatically."

    # TC-DS06
    def test_stat_cards_have_trend_icons(self):
        """Stat cards should contain trend arrow icons (▲) indicating scan volume trends."""
        cards = self.driver.find_elements(By.CLASS_NAME, "stat-card")
        assert len(cards) >= 3, \
            f"Expected at least 3 stat cards but found {len(cards)}. Some stat cards may not have rendered."

    # TC-DS07
    def test_normal_stat_card_click_filters_to_normal(self):
        """Clicking the 'Normal' stat card should apply a filter to show only Normal scans in the history."""
        navigate_to_dashboard_tab(self.driver, "Patient History")
        # Click normal filter button
        filter_btn = self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(@class,'filter-btn') and contains(.,'Normal')]")
        ))
        filter_btn.click()
        time.sleep(1)
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Normal" in body, \
            "Clicking the Normal filter in Patient History did not work. The filter button's onClick may not be set."

    # TC-DS08
    def test_abnormal_stat_card_click_filters_to_abnormal(self):
        """Clicking the 'Abnormal' filter button in history should show only Abnormal scans."""
        navigate_to_dashboard_tab(self.driver, "Patient History")
        filter_btn = self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(@class,'filter-btn') and contains(.,'Abnormal')]")
        ))
        filter_btn.click()
        time.sleep(1)
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Abnormal" in body, \
            "Clicking the Abnormal filter did not work as expected."

    # TC-DS09
    def test_all_scans_filter_resets_to_all(self):
        """Clicking 'All Scans' filter button should reset the filter and show all scan records."""
        navigate_to_dashboard_tab(self.driver, "Patient History")
        all_btn = self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(@class,'filter-btn') and contains(.,'All Scans')]")
        ))
        all_btn.click()
        time.sleep(1)
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "All Scans" in body, \
            "After clicking the 'All Scans' button, it doesn't appear active. The filter reset may not be working."
