// Phase 2 Week 6 Design System Agent - Button Component Stories
import type { Meta, StoryObj } from '@storybook/react';
import { TrendingUp, TrendingDown, Plus, Settings, Download } from 'lucide-react';
import { Button, ButtonGroup, IconButton, BuyButton, SellButton } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Design System/Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A comprehensive button component with multiple variants, sizes, and states. Supports loading states, icons, and accessibility features.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: [
        'primary',
        'secondary',
        'success',
        'danger',
        'warning',
        'ghost',
        'outline',
        'buy',
        'sell',
      ],
      description: 'Button visual style variant',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Button size',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner and disable interaction',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable button interaction',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Make button full width',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

// Basic button variants
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Success: Story = {
  args: {
    children: 'Success Button',
    variant: 'success',
  },
};

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
};

export const Warning: Story = {
  args: {
    children: 'Warning Button',
    variant: 'warning',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

// Size variations
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Buttons come in four sizes: sm, md (default), lg, and xl.',
      },
    },
  },
};

// Loading states
export const Loading: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button loading>Loading...</Button>
      <Button loading variant="secondary">
        Processing
      </Button>
      <Button loading variant="success">
        Saving
      </Button>
      <Button loading variant="danger">
        Deleting
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Buttons show a loading spinner when in loading state and are automatically disabled.',
      },
    },
  },
};

// Disabled states
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button disabled>Disabled Primary</Button>
      <Button disabled variant="secondary">
        Disabled Secondary
      </Button>
      <Button disabled variant="success">
        Disabled Success
      </Button>
      <Button disabled variant="danger">
        Disabled Danger
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disabled buttons are visually dimmed and cannot be interacted with.',
      },
    },
  },
};

// Icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button leftIcon={<Plus size={16} />}>Add Item</Button>
        <Button rightIcon={<Download size={16} />}>Download</Button>
        <Button leftIcon={<Settings size={16} />} rightIcon={<TrendingUp size={16} />}>
          Configure
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <IconButton icon={<Plus size={16} />} aria-label="Add new item" />
        <IconButton icon={<Settings size={16} />} aria-label="Settings" variant="secondary" />
        <IconButton icon={<Download size={16} />} aria-label="Download" variant="outline" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Buttons can include icons on the left, right, or both. Icon-only buttons use the IconButton component.',
      },
    },
  },
};

// Full width
export const FullWidth: Story = {
  render: () => (
    <div className="w-80">
      <Button fullWidth>Full Width Button</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Buttons can span the full width of their container.',
      },
    },
  },
};

// Button groups
export const ButtonGroups: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Horizontal Group</h3>
        <ButtonGroup>
          <Button variant="outline">First</Button>
          <Button variant="outline">Second</Button>
          <Button variant="outline">Third</Button>
        </ButtonGroup>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Vertical Group</h3>
        <ButtonGroup orientation="vertical">
          <Button variant="ghost">Option A</Button>
          <Button variant="ghost">Option B</Button>
          <Button variant="ghost">Option C</Button>
        </ButtonGroup>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Action Group</h3>
        <ButtonGroup spacing="lg">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Save Changes</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Button groups organize related actions with consistent spacing.',
      },
    },
  },
};

// Trading-specific buttons
export const TradingButtons: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Trading Actions</h3>
        <div className="flex gap-4">
          <BuyButton leftIcon={<TrendingUp size={16} />}>Buy BTCUSDT</BuyButton>
          <SellButton leftIcon={<TrendingDown size={16} />}>Sell BTCUSDT</SellButton>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Loading States</h3>
        <div className="flex gap-4">
          <BuyButton loading>Placing Buy Order...</BuyButton>
          <SellButton loading>Placing Sell Order...</SellButton>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Different Sizes</h3>
        <div className="flex items-center gap-4">
          <BuyButton size="sm">Buy</BuyButton>
          <BuyButton size="md">Buy</BuyButton>
          <BuyButton size="lg">Buy</BuyButton>
          <SellButton size="sm">Sell</SellButton>
          <SellButton size="md">Sell</SellButton>
          <SellButton size="lg">Sell</SellButton>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Specialized trading buttons with hover animations and semantic colors for buy/sell actions.',
      },
    },
  },
};

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="buy">Buy</Button>
      <Button variant="sell">Sell</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants in a grid layout.',
      },
    },
  },
};

// Interactive playground
export const Playground: Story = {
  args: {
    children: 'Playground Button',
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    fullWidth: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive playground to test different button configurations.',
      },
    },
  },
};

// Accessibility demonstration
export const Accessibility: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Focus States</h3>
        <p className="text-sm text-gray-600 mb-4">
          Tab through the buttons to see focus indicators (rings).
        </p>
        <div className="flex gap-4">
          <Button>Focusable Button 1</Button>
          <Button variant="secondary">Focusable Button 2</Button>
          <Button variant="outline">Focusable Button 3</Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Minimum Touch Targets</h3>
        <p className="text-sm text-gray-600 mb-4">
          All buttons meet the 44px minimum touch target size for accessibility.
        </p>
        <div className="flex gap-4">
          <Button size="sm">Small (still 44px min)</Button>
          <IconButton icon={<Plus size={16} />} aria-label="Add item" size="sm" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Screen Reader Support</h3>
        <p className="text-sm text-gray-600 mb-4">
          Buttons include proper ARIA attributes and labels.
        </p>
        <div className="flex gap-4">
          <Button loading aria-describedby="loading-help">
            Processing
          </Button>
          <p id="loading-help" className="sr-only">
            Please wait while we process your request
          </p>
          <IconButton
            icon={<Settings size={16} />}
            aria-label="Open settings menu"
            aria-describedby="settings-help"
          />
          <p id="settings-help" className="sr-only">
            Opens the application settings dialog
          </p>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstration of accessibility features including focus management, touch targets, and screen reader support.',
      },
    },
  },
};
