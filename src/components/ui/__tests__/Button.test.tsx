import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByText('Primary');
    expect(button.className).toContain('bg-blue-600');

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByText('Danger');
    expect(button.className).toContain('bg-red-600');

    rerender(<Button variant="success">Success</Button>);
    button = screen.getByText('Success');
    expect(button.className).toContain('bg-green-600');
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let button = screen.getByText('Small');
    expect(button.className).toContain('text-sm');

    rerender(<Button size="lg">Large</Button>);
    button = screen.getByText('Large');
    expect(button.className).toContain('text-lg');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByText('Click me');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    
    const button = screen.getByText('Loading');
    const spinner = button.querySelector('svg.animate-spin');
    
    expect(spinner).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('prevents click when loading', async () => {
    const handleClick = vi.fn();
    render(<Button isLoading onClick={handleClick}>Loading</Button>);
    
    const button = screen.getByText('Loading');
    await userEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByText('Custom');
    expect(button.className).toContain('custom-class');
  });

  it('forwards additional props', () => {
    render(<Button data-testid="test-button" aria-label="Test">Props</Button>);
    
    const button = screen.getByTestId('test-button');
    expect(button).toHaveAttribute('aria-label', 'Test');
  });

  it('combines disabled and loading states correctly', () => {
    const { rerender } = render(<Button disabled isLoading>Both</Button>);
    
    let button = screen.getByText('Both');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
    
    rerender(<Button disabled>Only Disabled</Button>);
    button = screen.getByText('Only Disabled');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg.animate-spin')).not.toBeInTheDocument();
  });
});