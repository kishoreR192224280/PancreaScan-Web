"""
E2E Tests: CT Scan Upload, TFLite Inference, and DB Sync
Requires a valid logged-in session. Uses a test account seeded in the DB.
"""
import time
import os
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "https://kishorer192224280.github.io/PancreaScan-Web/"

# Test credentials
TEST_EMAIL    = "testdoctor@pancreascan.com"
TEST_PASSWORD = "TestPass@123"

def login(driver, email=TEST_EMAIL, password=TEST_PASSWORD):
    """Full login flow helper."""
    wait = WebDriverWait(driver, 15)
    driver.get(BASE_URL)

    # Navigate past landing
    btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(text(),'Access PancreaScan')]")
        )
    )
    btn.click()

    # Fill credentials
    email_input = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//input[@type='email' or @placeholder[contains(.,'email') or contains(.,'Email')]]")
        )
    )
    email_input.clear()
    email_input.send_keys(email)

    pw_input = driver.find_element(By.XPATH, "//input[@type='password']")
    pw_input.clear()
    pw_input.send_keys(password)

    submit = driver.find_element(
        By.XPATH, "//button[@type='submit' or contains(text(),'Log In')]"
    )
    submit.click()
    time.sleep(3)


class TestUploadAnalysis:

    def test_upload_ct_scan_and_run_inference(self, driver):
        """Upload a CT Scan image, fill patient info, run TFLite Inference, and save to DB."""
        login(driver)
        wait = WebDriverWait(driver, 15)

        # 1. Wait for Dashboard to load (Wait for Dashboard Sidebar)
        wait.until(
            EC.presence_of_element_located((By.CLASS_NAME, "dashboard-layout"))
        )

        # 2. Upload image using hidden file input
        file_input = wait.until(
            EC.presence_of_element_located((By.ID, "real-ct-upload"))
        )
        
        # Get absolute path to the test image we created
        test_image_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_ct_scan.jpg"))
        file_input.send_keys(test_image_path)

        # 3. Wait for TFLite Clinical Diagnostic Workbench modal to appear
        modal = wait.until(
            EC.visibility_of_element_located((By.CLASS_NAME, "workspace-modal-content"))
        )

        # 4. Fill in Patient Information
        patient_id = driver.find_element(By.ID, "patient-id")
        patient_id.clear()
        patient_id.send_keys("E2E-TEST-001")

        patient_name = driver.find_element(By.ID, "patient-name")
        patient_name.clear()
        patient_name.send_keys("E2E Automated Test")

        # 5. Click "Run TFLite Inference"
        run_btn = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(text(),'Run TFLite Inference')]")
            )
        )
        run_btn.click()

        # 6. Wait for inference to complete and YOLOv8 Output Label to appear
        # The inference uses setTimeout so we might need to wait up to 5-10 seconds
        label = wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(),'YOLOv8 Output Label')]")
            )
        )
        assert label is not None

        # 7. Sync to Database
        sync_btn = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(text(),'Sync to Database')]")
            )
        )
        sync_btn.click()

        # 8. Wait for ScanReport modal to appear
        # The ScanReport has class "scan-report"
        report_modal = wait.until(
            EC.visibility_of_element_located((By.CLASS_NAME, "scan-report"))
        )
        assert "Diagnostic Report" in report_modal.text

        # 9. Click Share & Download Report
        download_btn = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(text(),'Share & Download Report')]")
            )
        )
        download_btn.click()

        # Give it a second to trigger download (we can't easily assert file download in headless without config, but we test the click)
        time.sleep(2)

        # 10. Return to Dashboard
        return_btn = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(text(),'Return to Dashboard')]")
            )
        )
        return_btn.click()

        # Ensure modal closes
        wait.until(
            EC.invisibility_of_element_located((By.CLASS_NAME, "scan-report"))
        )
        
        # Give DB some time to sync before moving to next test
        time.sleep(1)
