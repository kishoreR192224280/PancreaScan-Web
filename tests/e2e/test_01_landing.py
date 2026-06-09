"""
TEST MODULE 01 — Landing Page (12 tests)
Covers: page title, brand content, feature badges, CTA button, hero stats.
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import BASE_URL, go_home


class TestLandingPage:

    # ── Setup ──────────────────────────────────────────────────────────────
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        go_home(driver)
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-L01
    def test_page_title_matches_app_name(self):
        """The browser tab title should contain 'pancreascan-web', confirming the correct page has loaded."""
        assert "pancreascan-web" in self.driver.title.lower(), \
            f"Expected page title to contain 'pancreascan-web' but got: '{self.driver.title}'. " \
            "This means either the wrong page loaded or the HTML title tag is incorrect."

    # TC-L02
    def test_page_loads_successfully(self):
        """The landing page must render visible content — confirming the site is online and not showing a blank or error page."""
        body_text = self.body
        assert len(body_text.strip()) > 100, \
            "The page body appears to be nearly empty. The site may be down, or the React app failed to render. " \
            "Check if GitHub Pages deployment is active."

    # TC-L03
    def test_brand_hero_title_pancrea_visible(self):
        """The hero heading should contain 'Pancrea' — the first half of the brand name."""
        assert "Pancrea" in self.body or "pancrea" in self.body.lower(), \
            "Could not find 'Pancrea' text on the landing page. The hero title animation may have failed to render."

    # TC-L04
    def test_brand_hero_title_scan_visible(self):
        """The hero heading should contain 'Scan' — the second highlighted part of the brand name."""
        assert "Scan" in self.body, \
            "Could not find 'Scan' in the hero heading. The glowing 'Scan' word component may not have rendered."

    # TC-L05
    def test_brand_subtitle_text_visible(self):
        """The subtitle 'AI-Powered Early Detection of Pancreatic Anomalies' should appear below the main title."""
        assert "AI-Powered Early Detection" in self.body, \
            "The subtitle text is missing. Expected 'AI-Powered Early Detection of Pancreatic Anomalies' on the landing page."

    # TC-L06
    def test_feature_badge_neural_network(self):
        """Feature badge 'On-Device Neural Network' should be visible to inform users about local AI processing."""
        assert "On-Device Neural Network" in self.body, \
            "The 'On-Device Neural Network' feature badge is missing. Check if feature badges are rendering correctly."

    # TC-L07
    def test_feature_badge_privacy_first(self):
        """Feature badge 'Privacy-First' should be visible, highlighting the app's data security approach."""
        assert "Privacy-First" in self.body, \
            "The 'Privacy-First' feature badge is missing from the landing page."

    # TC-L08
    def test_feature_badge_offline_capable(self):
        """Feature badge 'Offline Capable' must be visible to communicate the app works without internet."""
        assert "Offline Capable" in self.body, \
            "The 'Offline Capable' feature badge is not rendering on the landing page."

    # TC-L09
    def test_feature_badge_pdf_reports(self):
        """Feature badge 'Local PDF Reports' should be visible, showing users can download reports."""
        assert "Local PDF Reports" in self.body, \
            "The 'Local PDF Reports' feature badge is missing from the landing page."

    # TC-L10
    def test_feature_badge_realtime_analysis(self):
        """Feature badge 'Real-Time Analysis' should be visible to convey instant scanning capability."""
        assert "Real-Time Analysis" in self.body, \
            "The 'Real-Time Analysis' feature badge is not visible on the landing page."

    # TC-L11
    def test_access_pancreascan_button_is_clickable(self):
        """The 'Access PancreaScan' call-to-action button must be present and interactable on the landing page."""
        btn = self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(text(),'Access PancreaScan')]")
        ))
        assert btn.is_displayed(), \
            "The 'Access PancreaScan' button exists but is not visible on screen. It may be hidden behind another element."

    # TC-L12
    def test_access_button_navigates_to_login(self):
        """Clicking 'Access PancreaScan' should transition the view to the Login screen."""
        btn = self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(text(),'Access PancreaScan')]")
        ))
        btn.click()
        self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='email']")))
        body_after = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Welcome Back" in body_after or "Log In" in body_after, \
            "After clicking 'Access PancreaScan', the Login page did not appear. " \
            "The button's onClick navigation handler may have an issue."
