#!/usr/bin/env ts-node
/**
 * Comprehensive Test Runner for Asset Manager UI Components
 *
 * This script provides a unified way to run all tests for the automated asset manager
 * UI fixes including Playwright integration tests, unit tests, and accessibility audits.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  command: string;
  description: string;
  required: boolean;
  timeout?: number;
}

const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests',
    command: 'npm run test',
    description: 'Run all unit tests for React components',
    required: true,
    timeout: 60000,
  },
  {
    name: 'Playwright E2E Tests',
    command: 'npx playwright test',
    description: 'Run all end-to-end tests including responsiveness and accessibility',
    required: true,
    timeout: 300000,
  },
  {
    name: 'Asset Manager Panel Tests',
    command: 'npx playwright test src/test/playwright/asset-manager-panel.spec.ts',
    description: 'Test AssetManagerPanel modal functionality and responsiveness',
    required: true,
    timeout: 120000,
  },
  {
    name: 'Automation Config Panel Tests',
    command: 'npx playwright test src/test/playwright/automation-config-panel.spec.ts',
    description: 'Test AutomationConfigPanel modal behavior and form interactions',
    required: true,
    timeout: 120000,
  },
  {
    name: 'Responsive Design Tests',
    command: 'npx playwright test src/test/playwright/responsive-design.spec.ts',
    description: 'Test responsive behavior across mobile, tablet, and desktop breakpoints',
    required: true,
    timeout: 180000,
  },
  {
    name: 'Touch Interaction Tests',
    command: 'npx playwright test src/test/playwright/touch-interactions.spec.ts',
    description: 'Test mobile touch gestures and interactions',
    required: false,
    timeout: 120000,
  },
  {
    name: 'Z-Index Hierarchy Tests',
    command: 'npx playwright test src/test/playwright/z-index-hierarchy.spec.ts',
    description: 'Validate modal layering and stacking contexts',
    required: true,
    timeout: 90000,
  },
  {
    name: 'Accessibility Tests',
    command: 'npx playwright test src/test/playwright/accessibility.spec.ts',
    description: 'Run WCAG compliance and accessibility audits',
    required: true,
    timeout: 180000,
  },
  {
    name: 'Keyboard Navigation Tests',
    command: 'npx playwright test src/test/playwright/keyboard-navigation.spec.ts',
    description: 'Test comprehensive keyboard accessibility',
    required: true,
    timeout: 120000,
  },
];

class TestRunner {
  private results: Array<{
    suite: TestSuite;
    success: boolean;
    duration: number;
    output?: string;
    error?: string;
  }> = [];

  async runSuite(suite: TestSuite): Promise<boolean> {
    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`📋 ${suite.description}`);

    const startTime = Date.now();

    try {
      const output = execSync(suite.command, {
        encoding: 'utf8',
        timeout: suite.timeout || 60000,
        stdio: 'pipe',
      });

      const duration = Date.now() - startTime;

      this.results.push({
        suite,
        success: true,
        duration,
        output: output.toString(),
      });

      console.log(`✅ ${suite.name} completed successfully (${duration}ms)`);
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.results.push({
        suite,
        success: false,
        duration,
        error: error.message,
        output: error.stdout?.toString(),
      });

      console.log(`❌ ${suite.name} failed (${duration}ms)`);

      if (error.stdout) {
        console.log('📤 Output:', error.stdout.toString().slice(-500)); // Last 500 chars
      }

      if (error.stderr) {
        console.log('🚨 Error:', error.stderr.toString().slice(-500)); // Last 500 chars
      }

      return false;
    }
  }

  async runAll(
    options: {
      skipOptional?: boolean;
      failFast?: boolean;
      generateReport?: boolean;
    } = {}
  ): Promise<void> {
    console.log('🚀 Starting comprehensive test suite for Asset Manager UI...\n');

    const suitesToRun = options.skipOptional
      ? testSuites.filter(suite => suite.required)
      : testSuites;

    let allPassed = true;

    for (const suite of suitesToRun) {
      const success = await this.runSuite(suite);

      if (!success) {
        allPassed = false;

        if (options.failFast) {
          console.log('\n💥 Stopping due to test failure (fail-fast mode)');
          break;
        }
      }
    }

    this.printSummary();

    if (options.generateReport) {
      await this.generateReport();
    }

    if (!allPassed) {
      process.exit(1);
    }
  }

  private printSummary(): void {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(50));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`📈 Total Suites: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log('');

    // Detailed results
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      console.log(`${status} ${result.suite.name} (${duration}s)`);

      if (!result.success && result.error) {
        console.log(`   🚨 ${result.error.split('\n')[0]}`);
      }
    });

    console.log('');

    if (failedTests === 0) {
      console.log('🎉 All tests passed! Asset Manager UI is fully validated.');
    } else {
      console.log(`⚠️  ${failedTests} test suite(s) failed. Please review the errors above.`);
    }
  }

  private async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      },
      results: this.results.map(result => ({
        suiteName: result.suite.name,
        description: result.suite.description,
        success: result.success,
        duration: result.duration,
        required: result.suite.required,
        error: result.error,
        hasOutput: Boolean(result.output),
      })),
    };

    const reportPath = path.join(process.cwd(), 'test-results', 'comprehensive-test-report.json');

    try {
      const fs = await import('fs/promises');
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Test report generated: ${reportPath}`);
    } catch (error) {
      console.log('⚠️  Failed to generate test report:', error);
    }
  }

  async checkPrerequisites(): Promise<boolean> {
    console.log('🔍 Checking test prerequisites...\n');

    const checks = [
      {
        name: 'Node.js version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.slice(1).split('.')[0]);
          return major >= 18;
        },
        message: 'Node.js 18+ required',
      },
      {
        name: 'Package dependencies',
        check: () => existsSync(path.join(process.cwd(), 'node_modules')),
        message: 'Run npm install first',
      },
      {
        name: 'Playwright browsers',
        check: () => {
          try {
            execSync('npx playwright --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        },
        message: 'Run npx playwright install first',
      },
      {
        name: 'Test files exist',
        check: () => {
          const testFiles = [
            'src/test/playwright/asset-manager-panel.spec.ts',
            'src/test/playwright/automation-config-panel.spec.ts',
            'src/test/asset-manager-panel.test.tsx',
            'src/test/automation-config-panel.test.tsx',
          ];
          return testFiles.every(file => existsSync(path.join(process.cwd(), file)));
        },
        message: 'Test files are missing',
      },
    ];

    let allPassed = true;

    for (const check of checks) {
      const passed = check.check();
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${check.name}`);

      if (!passed) {
        console.log(`   📝 ${check.message}`);
        allPassed = false;
      }
    }

    console.log('');

    if (!allPassed) {
      console.log('❌ Prerequisites check failed. Please fix the issues above.');
      return false;
    }

    console.log('✅ All prerequisites satisfied.');
    return true;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  const options = {
    skipOptional: args.includes('--skip-optional'),
    failFast: args.includes('--fail-fast'),
    generateReport: args.includes('--report'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Asset Manager UI Test Runner

Usage: npm run test:comprehensive [options]

Options:
  --skip-optional   Skip optional test suites
  --fail-fast      Stop on first test failure
  --report         Generate detailed JSON report
  --help, -h       Show this help message

Test Suites:
${testSuites.map(suite => `  • ${suite.name} ${suite.required ? '(required)' : '(optional)'}\n    ${suite.description}`).join('\n')}
`);
    return;
  }

  const prerequisitesPassed = await runner.checkPrerequisites();
  if (!prerequisitesPassed) {
    process.exit(1);
  }

  await runner.runAll(options);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { TestRunner, testSuites };
