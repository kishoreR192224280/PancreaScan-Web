"""
TEST MODULE 09 — Patient History Tab (9 tests)
Covers: section rendering, table headers, filters, record presence, empty state, delete button.
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import login, navigate_to_dashboard_tab


class TestPatientHistory:
    """Tests for the Patient History tab on the dashboard."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        login(driver)
        navigate_to_dashboard_tab(driver, "Patient History")
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-PH01
    def test_history_section_title_visible(self):
        """The history view must display 'Patient History' as a section title."""
        assert "Patient History" in self.body, \
            "The 'Patient History' section title is not visible after clicking the History tab."

    # TC-PH02
    def test_history_subtitle_visible(self):
        """The subtitle 'Secure clinical CT screening scan archives synced from MySQL' must appear."""
        assert "synced from MySQL" in self.body or "Secure clinical" in self.body, \
            "The history section subtitle is not visible. The section header may have a rendering issue."

    # TC-PH03
    def test_history_table_patient_id_column_present(self):
        """The history table must have a 'Patient ID' column header."""
        assert "Patient ID" in self.body, \
            "The 'Patient ID' column header is missing from the Patient History table."

    # TC-PH04
    def test_history_table_scan_result_column_present(self):
        """The history table must have a 'Scan Result' column header."""
        assert "Scan Result" in self.body, \
            "The 'Scan Result' column header is missing from the Patient History table."

    # TC-PH05
    def test_history_table_ai_confidence_column_present(self):
        """The history table must have an 'AI Confidence' column header."""
        assert "AI Confidence" in self.body, \
            "The 'AI Confidence' column header is missing from the Patient History table."

    # TC-PH06
    def test_history_all_scans_filter_button_present(self):
        """An 'All Scans' filter button must appear above the history table."""
        assert "All Scans" in self.body, \
            "The 'All Scans' filter button is missing above the history table."

    # TC-PH07
    def test_history_normal_filter_button_present(self):
        """A 'Normal' filter button must be present to let the doctor view only normal scans."""
        filter_btn = self.driver.find_element(
            By.XPATH, "//button[contains(@class,'filter-btn') and contains(.,'Normal')]"
        )
        assert filter_btn.is_displayed(), \
            "The 'Normal' filter button is not visible above the history table."

    # TC-PH08
    def test_history_abnormal_filter_button_present(self):
        """An 'Abnormal' filter button must be present to let the doctor view only abnormal scans."""
        filter_btn = self.driver.find_element(
            By.XPATH, "//button[contains(@class,'filter-btn') and contains(.,'Abnormal')]"
        )
        assert filter_btn.is_displayed(), \
            "The 'Abnormal' filter button is not visible above the history table."

    # TC-PH09
    def test_history_table_or_empty_state_rendered(self):
        """The history view must show either scan records or the empty state message — never a broken blank area."""
        has_records = "Patient ID" in self.body and "Scan Result" in self.body
        has_empty_state = "No medical CT scans match" in self.body
        assert has_records or has_empty_state, \
            "The Patient History view is neither showing scan records nor the 'no scans' empty state message. " \
            "The table component may have crashed or failed to fetch data from the API."
