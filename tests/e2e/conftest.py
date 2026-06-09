import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

BASE_URL = "http://localhost:5173"

@pytest.fixture(scope="session")
def driver():
    """Shared Chrome WebDriver for the entire test session."""
    options = Options()
    # Comment out headless to watch tests run in a visible browser
    # options.add_argument("--headless=new")
    options.add_argument("--window-size=1400,900")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    service = Service(ChromeDriverManager().install())
    drv = webdriver.Chrome(service=service, options=options)
    drv.implicitly_wait(10)
    yield drv
    drv.quit()

@pytest.fixture(autouse=True)
def go_to_home(driver):
    """Navigate to the landing page before each test."""
    driver.get(BASE_URL)
