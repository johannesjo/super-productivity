#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const TEST_RESULTS_FILE = path.join(__dirname, '../e2e-playwright/test-results.json');

function summarizeResults() {
  // Check if results file exists
  if (!fs.existsSync(TEST_RESULTS_FILE)) {
    console.log('❌ No test results found. Run tests first with: npm run e2e:playwright');
    return;
  }

  try {
    const results = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));

    const stats = results.stats || {};
    const suites = results.suites || [];

    // Calculate statistics
    const total = stats.expected || 0;
    const passed = (stats.expected || 0) - (stats.unexpected || 0) - (stats.skipped || 0);
    const failed = stats.unexpected || 0;
    const skipped = stats.skipped || 0;
    const duration = stats.duration || 0;

    // Print summary header
    console.log('\n📊 Playwright Test Summary');
    console.log('=========================\n');

    // Print statistics
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s\n`);

    // Print failed tests if any
    if (failed > 0) {
      console.log('Failed Tests:');
      console.log('-------------');

      const failedTests = [];

      // Recursively find failed tests
      function findFailedTests(suites) {
        for (const suite of suites) {
          if (suite.suites) {
            findFailedTests(suite.suites);
          }
          if (suite.specs) {
            for (const spec of suite.specs) {
              if (spec.tests) {
                for (const test of spec.tests) {
                  if (test.status === 'unexpected' || test.status === 'failed') {
                    failedTests.push({
                      file: spec.file || suite.file,
                      title: spec.title || test.title,
                      error: test.results?.[0]?.error?.message || 'Unknown error',
                    });
                  }
                }
              }
            }
          }
        }
      }

      findFailedTests(suites);

      failedTests.forEach((test, index) => {
        console.log(`\n${index + 1}. ${test.file}`);
        console.log(`   ${test.title}`);
        if (test.error) {
          console.log(`   Error: ${test.error.split('\n')[0]}`);
        }
      });
    }

    // Print success message if all passed
    if (failed === 0 && passed > 0) {
      console.log('🎉 All tests passed!');
    }
  } catch (error) {
    console.error('❌ Error reading test results:', error.message);
    console.log('\nMake sure to run tests with: npm run e2e:playwright');
  }
}

// Run the summary
summarizeResults();
