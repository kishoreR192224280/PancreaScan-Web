"""
TEST MODULE 08 — Scan Report & PDF (8 tests)
Covers: full upload→inference→sync→report flow, report sections, PDF download button, return to dashboard.
"""
import os
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import login, navigate_to_dashboard_tab, TEST_IMAGE


def run_full_analysis_and_sync(driver):
    """Helper: login → upload → fill patient info → run inference → sync → returns after report opens."""
    wait = WebDriverWait(driver, 60)
    login(driver)
    navigate_to_dashboard_tab(driver, "Dashboard")

    file_input = wait.until(EC.presence_of_element_located((By.ID, "real-ct-upload")))
    file_input.send_keys(TEST_IMAGE)

    wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "workspace-modal-content")))
    time.sleep(1)

    driver.find_element(By.ID, "patient-id").send_keys("REPORT-TEST-001")
    driver.find_element(By.ID, "patient-name").send_keys("Report Test Patient")

    run_btn = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(text(),'Run TFLite Inference')]")
    ))
    run_btn.click()

    sync_btn = wait.until(EC.element_to_be_clickable(
        (By.XPATH, "//button[contains(text(),'Sync to Database')]")
    ))
    sync_btn.click()


class TestScanReport:
    """Tests for the Diagnostic Report that appears after syncing a scan to the database."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        run_full_analysis_and_sync(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-SR01
    def test_diagnostic_report_opens_after_sync(self):
        """After clicking 'Sync to Database', the Diagnostic Report modal must open automatically."""
        report = self.driver.find_element(By.CLASS_NAME, "scan-report")
        assert report.is_displayed(), \
            "The Diagnostic Report did not open after clicking 'Sync to Database'. " \
            "The handleSaveRealScanToDatabase function may not be calling setActiveReportScan()."

    # TC-SR02
    def test_report_heading_visible(self):
        """The report must have a 'Diagnostic Report' heading to identify its purpose."""
        assert "Diagnostic Report" in self.body, \
            "The 'Diagnostic Report' heading is not visible in the report modal."

    # TC-SR03
    def test_report_patient_information_section_visible(self):
        """The report must have a 'Patient Information' section showing who the scan belongs to."""
        assert "Patient Information" in self.body, \
            "The 'Patient Information' section is missing from the Diagnostic Report."

    # TC-SR04
    def test_report_shows_patient_id(self):
        """The report must display the patient ID that was entered before the scan ('REPORT-TEST-001')."""
        assert "REPORT-TEST-001" in self.body, \
            "The Patient ID 'REPORT-TEST-001' is not showing in the Diagnostic Report. " \
            "The patientId prop may not be passing correctly to the ScanReport component."

    # TC-SR05
    def test_report_shows_patient_name(self):
        """The report must display the patient name that was entered ('Report Test Patient')."""
        assert "Report Test Patient" in self.body, \
            "The Patient Name 'Report Test Patient' is not shown in the Diagnostic Report."

    # TC-SR06
    def test_report_analysis_results_section_visible(self):
        """The report must have an 'Analysis Results' section showing the AI prediction output."""
        assert "Analysis Results" in self.body, \
            "The 'Analysis Results' section is missing from the Diagnostic Report."

    # TC-SR07
    def test_report_download_button_present(self):
        """A 'Share & Download Report' button must exist in the report so the doctor can save a PDF."""
        btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Share') and contains(text(),'Download')]")
        assert btn.is_displayed(), \
            "The 'Share & Download Report' button is not visible in the Diagnostic Report. " \
            "Doctors have no way to save or share the report."

    # TC-SR08
    def test_return_to_dashboard_button_closes_report(self):
        """Clicking 'Return to Dashboard' must close the report and return to the main dashboard view."""
        return_btn = self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(text(),'Return to Dashboard')]")
        ))
        return_btn.click()
        self.wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, "scan-report")))
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Diagnostic Report" not in body, \
            "Clicking 'Return to Dashboard' did not close the Diagnostic Report modal."
