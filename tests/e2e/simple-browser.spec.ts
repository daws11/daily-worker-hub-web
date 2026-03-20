import { test } from "@playwright/test";
import { chromium } from "playwright";

test.describe("Simple Browser Launch Test", () => {
  test("should launch chromium and take screenshot", async ({ page }) => {
    console.log("Launching chromium...");

    try {
      await page.goto("http://localhost:3000");

      const title = await page.title();
      console.log("Page title:", title);

      const url = page.url();
      console.log("Page URL:", url);

      await page.screenshot({
        path: "test-results/simple-browser-launch.png",
      });

      console.log("✓ Screenshot saved");
    } catch (error) {
      console.error("Test failed:", error);
      throw error;
    }
  });
});
