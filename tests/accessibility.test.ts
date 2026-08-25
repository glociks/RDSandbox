import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Slider, Switch, CollapsibleSection, Label } from '../components/ui/Shared';

describe('Accessibility Standards (WCAG AA Compliance)', () => {
  it('Slider component renders with proper ARIA role and attributes', () => {
    const { getByRole } = render(
      React.createElement(Slider, {
        value: 42,
        min: 0,
        max: 100,
        step: 1,
        'aria-label': 'Feed Rate Parameter',
      })
    );

    const slider = getByRole('slider');
    expect(slider).toBeDefined();
    expect(slider.getAttribute('aria-valuenow')).toBe('42');
    expect(slider.getAttribute('aria-valuemin')).toBe('0');
    expect(slider.getAttribute('aria-valuemax')).toBe('100');
    expect(slider.getAttribute('aria-label')).toBe('Feed Rate Parameter');
  });

  it('Switch component renders with switch role and aria-checked', () => {
    const { getByRole } = render(
      React.createElement(Switch, {
        checked: true,
        onCheckedChange: () => {},
        'aria-label': 'Enable Laplacian Diffusion',
      })
    );

    const toggle = getByRole('switch');
    expect(toggle).toBeDefined();
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('CollapsibleSection renders with button and aria-expanded', () => {
    const { getByRole } = render(
      React.createElement(CollapsibleSection, {
        title: 'Physics Parameters',
        defaultOpen: true,
      })
    );

    const headerBtn = getByRole('button');
    expect(headerBtn).toBeDefined();
    expect(headerBtn.getAttribute('aria-expanded')).toBe('true');
  });

  it('Label component avoids unassociated label nodes when htmlFor is omitted', () => {
    const { container: withFor } = render(
      React.createElement(Label, {
        htmlFor: 'test-input-id',
        children: 'Field Label'
      })
    );
    expect(withFor.querySelector('label')?.getAttribute('for')).toBe('test-input-id');

    const { container: withoutFor } = render(
      React.createElement(Label, {
        children: 'Section Header'
      })
    );
    expect(withoutFor.querySelector('label')).toBeNull();
    expect(withoutFor.querySelector('span')?.textContent).toBe('Section Header');
  });
});
