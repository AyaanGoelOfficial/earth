# Design System

## Visual Theme

Deep space reduced to one quiet frame: a compact kinetic Earth held inside a precise acrylic shell, floating without a stand or atmospheric haze. The crisp stationary shell and independently rotating inner globe borrow the optical logic of self-rotating desk globes while remaining a celestial object.

## Color Palette

- Background: `oklch(0.055 0 0)`
- Surface: `oklch(0.11 0.012 279)`
- Ink: `oklch(0.97 0.006 279)`
- Muted: `oklch(0.71 0.018 279)`
- Primary: `oklch(0.445 0.206 279.1)`
- Accent: `oklch(0.82 0.15 205)`

Color strategy: drenched black environment, with the seed violet reserved for atmospheric falloff and cyan coming only from the rendered planet.

## Typography

Use a quiet, precise neo-grotesk stack led by Onest when available, falling back to platform UI sans-serifs. Display type is light, generously spaced, and never larger than 96px. Technical metadata uses the same family at a compact size rather than introducing a costume-like monospace.

## Layout

The experience occupies one viewport. Restrained copy sits in the left third, the floating globe sits in the right-center, and tiny observational metadata closes the outer edge. On mobile, copy moves to the upper region and the globe settles into the lower half without cropping.

## Components

- Minimal wordmark and live orbital-status readout
- Fixed WebGL space stage with a textured rotating inner sphere, independent cloud film, stationary optical shell rendered with a space-specific Fresnel edge and compact sun glint, subtle equatorial seam, and sparse parallax stars
- Masked headline reveal and precisely staggered first-load sequence
- A compact rotation pause/resume control
- Live but visually subordinate rotation telemetry

## Motion

The inner globe alone rotates slowly inside a stationary outer shell, with inertial drag control and a single coordinated arrival sequence. The shell remains physically stable while the star field responds almost imperceptibly to pointer position. Motion uses exponential easing and never bounces. Reduced-motion mode removes continuous rotation and compresses the reveal while preserving the composition.
