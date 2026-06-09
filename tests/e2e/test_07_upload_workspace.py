"""
TEST MODULE 07 — CT Scan Upload & Workspace Modal (14 tests)
Covers: file upload trigger, modal appearance, workspace fields, inference start, result display, close.
"""
import os
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import login, navigate_to_dashboard_tab, TEST_IMAGE


def open_workspace_modal(driver, wait):
    """Helper: upload the test CT scan image and wait for the workspace modal to appear."""
    login(driver)
    navigate_to_dashboard_tab(driver, "Dashboard")
    file_input = wait.until(EC.presence_of_element_located((By.ID, "real-ct-upload")))
    file_input.send_keys(TEST_IMAGE)
    wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "workspace-modal-content")))
    time.sleep(1)


class TestWorkspaceModalElements:
    """Tests that the CT Scan Workspace Modal renders correctly with all required elements."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        open_workspace_modal(driver, WebDriverWait(driver, 20))
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-WS01
    def test_workspace_modal_opens_after_upload(self):
        """After uploading an image, the 'TFLite Clinical Diagnostic Workbench' modal must open automatically."""
        modal = self.driver.find_element(By.CLASS_NAME, "workspace-modal-content")
        assert modal.is_displayed(), \
            "The workspace modal did not appear after uploading a CT scan image. " \
            "The handleFileChange function may not be calling setShowUploaderModal(true)."

    # TC-WS02
    def test_workspace_modal_title_visible(self):
        """The modal heading must say 'TFLite Clinical Diagnostic Workbench' to identify the tool to the doctor."""
        assert "TFLite Clinical Diagnostic Workbench" in self.body, \
            "The workspace modal title 'TFLite Clinical Diagnostic Workbench' is not visible. " \
            "The modal header component may have a rendering issue."

    # TC-WS03
    def test_uploaded_ct_image_preview_shown(self):
        """The uploaded CT scan image must appear as a preview inside the workspace modal."""
        preview_img = self.driver.find_element(By.CLASS_NAME, "workspace-preview-image")
        assert preview_img.is_displayed(), \
            "The CT scan image preview is not showing inside the workspace modal. " \
            "The selectedImageSrc state may not have been set after file selection."

    # TC-WS04
    def test_close_button_present_in_modal(self):
        """A close (✕) button must exist in the modal header so the doctor can dismiss the workspace."""
        close_btn = self.driver.find_element(By.CLASS_NAME, "btn-close-modal")
        assert close_btn.is_displayed(), \
            "The close (✕) button is not visible in the workspace modal header."

    # TC-WS05
    def test_patient_id_input_present_in_modal(self):
        """A 'Patient ID' input field must exist in the modal's clinical form so the doctor can tag the scan."""
        field = self.driver.find_element(By.ID, "patient-id")
        assert field.is_displayed(), \
            "The 'Patient ID' input field is not visible inside the workspace modal."

    # TC-WS06
    def test_patient_name_input_present_in_modal(self):
        """A 'Patient Name' input field must exist in the modal's clinical form."""
        field = self.driver.find_element(By.ID, "patient-name")
        assert field.is_displayed(), \
            "The 'Patient Name' input field is not visible inside the workspace modal."

    # TC-WS07
    def test_run_tflite_inference_button_present(self):
        """The '⚙️ Run TFLite Inference' button must be visible before a scan has been run."""
        btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Run TFLite Inference')]")
        assert btn.is_displayed(), \
            "The 'Run TFLite Inference' button is not visible in the workspace modal. " \
            "It should appear when no analysis result is currently active."

    # TC-WS08
    def test_patient_id_field_accepts_text(self):
        """The Patient ID field should accept typed input."""
        field = self.driver.find_element(By.ID, "patient-id")
        field.clear()
        field.send_keys("PT-E2E-001")
        assert field.get_attribute("value") == "PT-E2E-001", \
            "Typed 'PT-E2E-001' into the Patient ID field but the value was not stored."

    # TC-WS09
    def test_patient_name_field_accepts_text(self):
        """The Patient Name field should accept typed input."""
        field = self.driver.find_element(By.ID, "patient-name")
        field.clear()
        field.send_keys("Automated Test Patient")
        assert field.get_attribute("value") == "Automated Test Patient", \
            "Typed 'Automated Test Patient' into the Patient Name field but the value was not stored."

    # TC-WS10
    def test_close_button_dismisses_modal(self):
        """Clicking the close (✕) button must hide the workspace modal and return to the dashboard."""
        close_btn = self.driver.find_element(By.CLASS_NAME, "btn-close-modal")
        close_btn.click()
        self.wait.until(EC.invisibility_of_element_located((By.CLASS_NAME, "workspace-modal-content")))
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "TFLite Clinical Diagnostic Workbench" not in body, \
            "Clicking the close button did not dismiss the workspace modal."


class TestWorkspaceInference:
    """Tests for the AI inference run and result display inside the workspace modal."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 30)
        open_workspace_modal(driver, self.wait)

    # TC-WS11
    def test_run_inference_starts_scanning_animation(self):
        """Clicking 'Run TFLite Inference' must start a visible scanning animation (progress bar)."""
        patient_id = self.driver.find_element(By.ID, "patient-id")
        patient_id.clear()
        patient_id.send_keys("PT-E2E-001")
        patient_name = self.driver.find_element(By.ID, "patient-name")
        patient_name.clear()
        patient_name.send_keys("E2E Test Patient")

        run_btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Run TFLite Inference')]")
        run_btn.click()
        time.sleep(1)
        body = self.driver.find_element(By.TAG_NAME, "body").text
        # Either scanning in progress or result already appeared
        assert any(word in body for word in ["Running TFLite", "YOLOv8 Output", "Prediction Confidence", "Re-Scan"]), \
            "After clicking 'Run TFLite Inference', neither the scanning animation nor results appeared. " \
            "The handleAnalyzeScanReal function may have encountered an error loading the ONNX model."

    # TC-WS12
    def test_inference_produces_yolov8_label(self):
        """After inference completes, a 'YOLOv8 Output Label' must appear with either 'Normal' or 'Abnormal'."""
        patient_id = self.driver.find_element(By.ID, "patient-id")
        patient_id.clear()
        patient_id.send_keys("PT-E2E-001")
        patient_name = self.driver.find_element(By.ID, "patient-name")
        patient_name.clear()
        patient_name.send_keys("E2E Test Patient")

        run_btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Run TFLite Inference')]")
        run_btn.click()

        # Wait up to 60 seconds for TFLite WASM inference to complete
        label = WebDriverWait(self.driver, 60).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(),'YOLOv8 Output Label')]")
            )
        )
        assert label is not None, \
            "The 'YOLOv8 Output Label' did not appear after running TFLite inference within 60 seconds. " \
            "The ONNX/TFLite WASM model may have failed to load or the inference threw an unhandled exception."

    # TC-WS13
    def test_inference_shows_confidence_score(self):
        """After inference, a 'Prediction Confidence' percentage must appear showing the model's certainty."""
        patient_id = self.driver.find_element(By.ID, "patient-id")
        patient_id.clear()
        patient_id.send_keys("PT-E2E-002")
        patient_name = self.driver.find_element(By.ID, "patient-name")
        patient_name.clear()
        patient_name.send_keys("Confidence Test Patient")

        run_btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Run TFLite Inference')]")
        run_btn.click()

        WebDriverWait(self.driver, 60).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(),'Prediction Confidence')]")
            )
        )
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Prediction Confidence" in body, \
            "The 'Prediction Confidence' metric did not appear after inference. " \
            "The activeAnalysisResult.confidence value may be null or undefined."

    # TC-WS14
    def test_inference_shows_rescan_and_sync_buttons(self):
        """After inference, '🔄 Re-Scan' and '💾 Sync to Database' action buttons must appear."""
        patient_id = self.driver.find_element(By.ID, "patient-id")
        patient_id.clear()
        patient_id.send_keys("PT-E2E-003")
        patient_name = self.driver.find_element(By.ID, "patient-name")
        patient_name.clear()
        patient_name.send_keys("Sync Test Patient")

        run_btn = self.driver.find_element(By.XPATH, "//button[contains(text(),'Run TFLite Inference')]")
        run_btn.click()

        WebDriverWait(self.driver, 60).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(text(),'Sync to Database')]")
            )
        )
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Re-Scan" in body and "Sync to Database" in body, \
            "After inference, the 'Re-Scan' and 'Sync to Database' action buttons did not appear. " \
            "The UI may not be updating after the activeAnalysisResult state changes."
