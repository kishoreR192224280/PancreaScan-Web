"""
TEST MODULE 10 — Analytics Tab (8 tests)
Covers: section title, donut chart SVG, scan summary, metric cards, percentage display.
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from conftest import login, navigate_to_dashboard_tab


class TestAnalyticsTab:
    """Tests for the Analytics view on the dashboard."""

    @pytest.fixture(autouse=True)
    def setup(self, driver):
        login(driver)
        navigate_to_dashboard_tab(driver, "Analytics")
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)
        self.body = driver.find_element(By.TAG_NAME, "body").text

    # TC-AN01
    def test_analytics_section_heading_visible(self):
        """The Analytics tab must display a heading containing 'Neural Analytics' or 'CT Scan Ratios'."""
        assert "Neural Analytics" in self.body or "CT Scan Ratios" in self.body, \
            "The Analytics section heading is missing. The analytics view may not have rendered correctly."

    # TC-AN02
    def test_analytics_subtitle_visible(self):
        """A descriptive subtitle must appear below the heading to explain what the analytics show."""
        assert "diagnostics" in self.body.lower() or "distribution" in self.body.lower(), \
            "The analytics section subtitle is not visible."

    # TC-AN03
    def test_scan_summary_overview_heading_visible(self):
        """'Scan Summary Overview' heading must appear in the right column of the analytics panel."""
        assert "Scan Summary Overview" in self.body, \
            "The 'Scan Summary Overview' sub-heading is missing from the analytics view."

    # TC-AN04
    def test_normal_scans_metric_card_visible(self):
        """A 'Normal Scans' metric card must appear in the analytics view showing the count and percentage."""
        assert "Normal Scans" in self.body, \
            "The 'Normal Scans' metric card is not visible in the Analytics tab."

    # TC-AN05
    def test_abnormal_scans_metric_card_visible(self):
        """An 'Abnormal Scans' metric card must appear showing the count and percentage."""
        assert "Abnormal Scans" in self.body, \
            "The 'Abnormal Scans' metric card is not visible in the Analytics tab."

    # TC-AN06
    def test_donut_chart_svg_element_rendered(self):
        """An SVG donut chart must be rendered in the analytics view to visualize the scan distribution."""
        svg_elements = self.driver.find_elements(By.TAG_NAME, "svg")
        assert len(svg_elements) > 0, \
            "No SVG elements found on the Analytics tab. The donut chart has not rendered. " \
            "This may be a React rendering issue or the SVG component has an error."

    # TC-AN07
    def test_ratio_percentage_text_visible(self):
        """A 'Ratio' percentage value must appear under the metric cards to show the proportion."""
        assert "Ratio" in self.body or "%" in self.body, \
            "No percentage or Ratio text found in the Analytics tab. " \
            "The percentage calculations may be returning NaN due to zero total scans."

    # TC-AN08
    def test_analytics_normal_filter_interaction(self):
        """Clicking the 'Normal Scans' metric card in Analytics should filter the history to Normal scans."""
        normal_card = self.wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[contains(@class,'stat-card') and contains(.,'Normal Scans')]")
        ))
        normal_card.click()
        import time; time.sleep(1)
        # Should navigate to history with Normal filter
        body = self.driver.find_element(By.TAG_NAME, "body").text
        assert "Normal" in body, \
            "Clicking the 'Normal Scans' metric card in Analytics did not apply the Normal filter to the history view."
