"""
E2E Tests: Landing Page
"""
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class TestLandingPage:

    def test_page_title(self, driver):
        """Page title should contain pancreascan-web."""
        assert "pancreascan-web" in driver.title.lower()

    def test_landing_page_loads(self, driver):
        """Landing page hero content should be visible."""
        wait = WebDriverWait(driver, 15)
        # The landing page should have a heading or a 'Get Started' button
        body_text = driver.find_element(By.TAG_NAME, "body").text
        assert len(body_text) > 0

    def test_get_started_navigates_to_login(self, driver):
        """Clicking Get Started should navigate to the login view."""
        wait = WebDriverWait(driver, 15)
        # Find the Access PancreaScan button on the landing page
        btn = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//*[contains(text(),'Access PancreaScan')]")
            )
        )
        btn.click()
        time.sleep(1)
        # After clicking, an email input should appear
        email_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='email' or @placeholder[contains(.,'email') or contains(.,'Email')]]"))
        )
        assert email_input.is_displayed()
