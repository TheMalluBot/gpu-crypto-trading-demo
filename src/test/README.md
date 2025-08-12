# Asset Manager UI Testing Suite

This comprehensive testing suite validates the automated asset manager UI fixes, ensuring robust functionality across all devices and accessibility standards.

## 🧪 Test Coverage

### Playwright Integration Tests

#### 1. AssetManagerPanel Tests (`asset-manager-panel.spec.ts`)
- **Modal Functionality**: Opening, closing, overlay interactions
- **Tab Navigation**: Switching between Overview, Allocations, Profit Management, and Rebalancing tabs
- **Responsive Design**: Mobile (375px), tablet (768px), and desktop (1920px) layouts
- **Chart Rendering**: Pie charts and bar charts in Allocations tab
- **Data Display**: Portfolio health scores, allocation tables, profit zones
- **Accessibility**: ARIA attributes, keyboard navigation, focus management

#### 2. AutomationConfigPanel Tests (`automation-config-panel.spec.ts`) 
- **Form Interactions**: Toggle switches, range sliders, button controls
- **Configuration Tabs**: General, Profit Management, Rebalancing, Risk Controls
- **State Management**: Configuration persistence across tab switches
- **Validation**: Form validation and error handling
- **Save/Cancel**: Configuration persistence and modal dismissal
- **Mobile Adaptations**: Touch-friendly controls and responsive layouts

#### 3. Responsive Design Tests (`responsive-design.spec.ts`)
- **Breakpoint Testing**: Comprehensive testing across all viewport sizes
- **Grid Layouts**: CSS Grid adaptation at different screen sizes
- **Scroll Containers**: Vertical and horizontal scrolling behavior
- **Viewport Transitions**: Smooth adaptation during screen size changes
- **High DPI Support**: Retina display compatibility

#### 4. Touch Interaction Tests (`touch-interactions.spec.ts`)
- **Touch Gestures**: Tap, double-tap, long press, swipe gestures
- **Mobile Navigation**: Touch-based tab switching and scrolling
- **Touch Target Sizes**: Minimum 44px touch targets for accessibility
- **Multi-touch**: Pinch-to-zoom and gesture handling
- **Performance**: 60fps maintenance during touch interactions

#### 5. Z-Index Hierarchy Tests (`z-index-hierarchy.spec.ts`)
- **Modal Layering**: Proper stacking of modals and overlays
- **Dropdown Positioning**: Correct z-index for dropdowns within modals
- **Notification Priority**: Highest z-index for system notifications
- **CSS Class Validation**: Verification of semantic z-index classes
- **Stacking Context**: Prevention of z-index conflicts

#### 6. Accessibility Tests (`accessibility.spec.ts`)
- **WCAG 2.1 AA Compliance**: Full axe-core integration
- **Screen Reader Support**: ARIA labels, roles, and descriptions
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG contrast ratio validation
- **Focus Management**: Focus trapping and visual indicators
- **High Contrast Mode**: Windows high contrast compatibility

#### 7. Keyboard Navigation Tests (`keyboard-navigation.spec.ts`)
- **Tab Order**: Logical tab sequence through all interactive elements
- **Modal Focus Trapping**: Focus containment within modal dialogs
- **Arrow Key Navigation**: Tab list navigation with arrow keys
- **Shortcut Keys**: Escape to close, Enter/Space to activate
- **Slider Controls**: Full keyboard control of range inputs
- **Form Navigation**: Efficient keyboard-only form completion

### Unit Tests

#### 1. AssetManagerPanel Unit Tests (`asset-manager-panel.test.tsx`)
- **Component Rendering**: Proper rendering with various props
- **State Management**: Internal state updates and data flow
- **Event Handling**: Click handlers and user interactions
- **Data Processing**: Allocation calculations and health scoring
- **Chart Integration**: Mocked chart component interactions
- **Error Boundaries**: Graceful handling of missing data

#### 2. AutomationConfigPanel Unit Tests (`automation-config-panel.test.tsx`)
- **Form State**: Configuration state management
- **Input Validation**: Range validation and type checking
- **Component Lifecycle**: Mount, update, and unmount behavior
- **Prop Handling**: Configuration object manipulation
- **Modal Integration**: Proper modal component usage
- **Change Detection**: State change tracking and persistence

## 🏃 Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:comprehensive

# Run only unit tests
npm test

# Run only Playwright tests
npm run test:e2e

# Run specific test suites
npx playwright test src/test/playwright/asset-manager-panel.spec.ts
npx playwright test src/test/playwright/accessibility.spec.ts
```

### Comprehensive Test Runner

```bash
# Run all tests with full reporting
npm run test:comprehensive --report

# Skip optional tests (faster execution)
npm run test:comprehensive --skip-optional

# Stop on first failure
npm run test:comprehensive --fail-fast

# Generate detailed report
npm run test:comprehensive --report
```

### Individual Test Categories

```bash
# Responsiveness testing
npx playwright test src/test/playwright/responsive-design.spec.ts

# Touch interaction testing (mobile/tablet)  
npx playwright test src/test/playwright/touch-interactions.spec.ts

# Accessibility audit
npx playwright test src/test/playwright/accessibility.spec.ts

# Z-index validation
npx playwright test src/test/playwright/z-index-hierarchy.spec.ts

# Keyboard navigation
npx playwright test src/test/playwright/keyboard-navigation.spec.ts
```

## 🎯 Test Objectives

### Modal Functionality Validation
- ✅ Modals open and close correctly
- ✅ Overlay interactions work as expected
- ✅ Multiple modal stacking is handled properly
- ✅ Focus management follows accessibility guidelines

### Responsive Design Verification
- ✅ Mobile layouts adapt correctly (320px - 768px)
- ✅ Tablet layouts utilize available space (768px - 1024px)
- ✅ Desktop layouts maximize usability (1024px+)
- ✅ Grid systems adapt to screen constraints
- ✅ Touch targets meet accessibility standards

### Z-Index Hierarchy Validation
- ✅ Modals appear above all other content (z-index: 1000)
- ✅ Notifications have highest priority (z-index: 1100)
- ✅ Dropdowns stack correctly within modals (z-index: 950)
- ✅ No z-index conflicts or stacking issues

### Accessibility Compliance
- ✅ WCAG 2.1 AA compliance verified with axe-core
- ✅ Screen reader compatibility tested
- ✅ Keyboard navigation covers all interactive elements
- ✅ Color contrast meets accessibility standards
- ✅ Focus indicators are clearly visible

### Touch Interaction Support
- ✅ All interactive elements support touch input
- ✅ Touch targets meet minimum size requirements (44px)
- ✅ Gestures work smoothly on mobile devices
- ✅ No accidental touch activation issues

## 📊 Test Configuration

### Playwright Configuration
- **Browsers**: Chrome, Firefox, Safari/WebKit
- **Devices**: Mobile, tablet, desktop viewports
- **Parallel Execution**: Optimized for CI/CD environments
- **Screenshots**: Automatic on failure
- **Video Recording**: On test failure for debugging

### Vitest Configuration
- **Environment**: jsdom for React component testing
- **Coverage**: v8 provider with 70% threshold
- **Setup**: Comprehensive mock configuration
- **Assertions**: Extended matchers for DOM testing

### Accessibility Configuration
- **axe-core Integration**: Full WCAG 2.1 AA rule set
- **Color Contrast**: 4.5:1 minimum ratio validation
- **Keyboard Testing**: Comprehensive tab order validation
- **Screen Reader**: ARIA attribute validation

## 🐛 Debugging Test Failures

### Common Issues and Solutions

#### Modal Not Opening
```bash
# Check for JavaScript errors
npx playwright test --debug src/test/playwright/asset-manager-panel.spec.ts
```

#### Responsive Layout Issues
```bash
# Generate visual comparison screenshots
npm run test:visual-regression
```

#### Accessibility Violations
```bash
# Run detailed accessibility audit
npx playwright test src/test/playwright/accessibility.spec.ts --reporter=html
```

#### Touch Interaction Failures
```bash
# Test on actual mobile device
npx playwright test --project="mobile-chrome" src/test/playwright/touch-interactions.spec.ts
```

### Test Output Locations
- **Test Results**: `test-results/`
- **Screenshots**: `test-results/screenshots/`
- **Videos**: `test-results/videos/`
- **Coverage Reports**: `coverage/`
- **Accessibility Reports**: `test-results/accessibility/`

## 🚀 CI/CD Integration

### GitHub Actions Example
```yaml
name: Asset Manager UI Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:comprehensive --report
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## 📈 Performance Benchmarks

### Expected Performance Metrics
- **Modal Open Time**: < 500ms
- **Tab Switch Time**: < 200ms
- **Touch Response**: < 100ms
- **Accessibility Scan**: < 5s per page
- **Full Test Suite**: < 10 minutes

### Optimization Targets
- All interactions should feel instantaneous
- No layout shifts during responsive changes
- Smooth 60fps animations on all devices
- Zero accessibility violations
- 100% keyboard navigation coverage

## 🔧 Maintenance

### Adding New Tests
1. Create test files in appropriate directories
2. Follow existing naming conventions
3. Update `test-runner.ts` configuration
4. Document test objectives and coverage

### Updating Test Data
1. Mock data should reflect real-world scenarios
2. Update snapshots when UI changes are intentional
3. Maintain accessibility test standards
4. Keep responsive breakpoints current

### Regular Maintenance Tasks
- [ ] Update browser versions quarterly
- [ ] Review accessibility standards annually
- [ ] Update device viewports as needed
- [ ] Refresh mock data periodically
- [ ] Validate performance benchmarks

This comprehensive testing suite ensures the automated asset manager UI meets the highest standards for functionality, accessibility, and user experience across all devices and interaction methods.