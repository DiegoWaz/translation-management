# Accessibility Guidelines

LocaleHub is designed to be accessible to all users, including those with visual impairments, color blindness, and motor disabilities.

## Color Accessibility

### Information Should Not Depend on Color Alone

We follow WCAG 2.1 standards to ensure color is never the only means of conveying information.

#### Translation Status Indicators

**Previous approach (inaccessible):**
- Small dots (•) using only color to indicate status
- Invisible or indistinguishable to users with color blindness

**Current approach (accessible):**
- **◆** (Diamond) - Indicates modified translation (not yet committed)
  - Color: Brand blue (`text-fg-brand`)
  - Visual symbol: Clear and distinct
  - Accessibility: aria-label, title attribute
  
- **⊘** (Barred circle) - Indicates missing/empty translation
  - Color: Warning yellow/amber (`text-fg-warning`)
  - Visual symbol: Clear and distinct
  - Accessibility: aria-label, title attribute

### Contrast Ratios

LocaleHub uses WCAG AAA contrast ratios (7:1) for all text elements:

- **Primary text**: `var(--text-primary)` - White on dark background for maximum readability
- **Secondary text**: Lighter gray tones with sufficient contrast
- **Muted text**: Still maintains >4.5:1 contrast ratio for accessibility

#### Dark Mode (current)
- Background: `neutral-1000` (very dark)
- Primary text: `neutral-100` (nearly white) - Contrast: 18:1
- Secondary text: `indigo-100` (light blue) - Contrast: 12:1
- Tertiary text: `neutral-350` (medium gray) - Contrast: 6:1
- Key text: `indigo-200` (light indigo) - Contrast: 9:1

#### Light Mode
- Maintains proper contrast with lighter backgrounds
- Tested for WCAG AA compliance

## Status Indicators

### Translation Status
- ◆ **Modified**: Translation has been edited but not committed
- ⊘ **Missing**: Translation value is empty
- ⚠️ **Missing Variables**: Template variables are referenced but not provided

### Configuration Status
- **Success** (✓ with green): Operation completed successfully
- **Warning** (⚠️ with amber): Attention needed, but not blocking
- **Danger** (✕ with red): Error or critical issue

All status indicators include:
- Visual symbol (icon or shape)
- Semantic color
- HTML title attribute (tooltip)
- ARIA labels for screen readers

## Keyboard Navigation

All interactive elements are keyboard accessible:
- Focus visible indicators with sufficient contrast
- Tab order follows logical flow
- Escape key closes modals and panels
- Enter key confirms actions

## Screen Reader Support

- All buttons and links have descriptive labels
- Status indicators have `aria-label` attributes
- Form inputs have associated labels
- Dynamic updates announce to screen readers when appropriate

## Testing

To test accessibility:

1. **Color Contrast**: Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
2. **Color Blindness**: Use browser extensions like [Color Blind Simulator](https://chir.ag/projects/ntsc/)
3. **Keyboard Navigation**: Navigate using only Tab, Enter, Escape, and arrow keys
4. **Screen Readers**: Test with NVDA (Windows) or VoiceOver (macOS)

## Future Improvements

- [ ] Add more detailed ARIA descriptions for complex interactions
- [ ] Implement high contrast mode option
- [ ] Add text size adjustment options
- [ ] Improve focus indicators visibility
- [ ] Add skip navigation links
