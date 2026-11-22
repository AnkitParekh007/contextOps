# ContextOps AI — Cobalt visual identity

## Reference and translation

Direction inspired by [Outcrowd's *Website for SQL virtualization* on Dribbble](https://dribbble.com/shots/26751781-Website-for-SQL-virtualization), which publicly lists the following palette:

| Swatch | Hex | ContextOps use |
| --- | --- | --- |
| Electric blue | `#052FED` | Principal CTA, accent, focused state |
| Royal blue | `#2D53BB` | Secondary accents, deep gradients |
| Cyan | `#69B6CD` | Animated data streams, visual feedback |
| Ice blue | `#B0CDE4` | Secondary text on navy, pale content surfaces |
| Silver mist | `#E3E3EA` | Light section backdrop |
| Blue grey | `#A8B3BB` | Supporting labels and subdued components |
| Charcoal | `#232325` | Heading ink and deep neutral anchors |

We use these colors as a **starting point, not a reproduction** of the reference artwork. ContextOps has its own logo, typography, copy, data visualization, and task-routing diagram. Some tonal extensions are derived for contrast, such as `#12192A`, `#F7F9FD`, and `#94B0FF`.

## Motion language

- Data travels across a four-way decision diagram with animated dashes: input trace → quality gate → candidate / premium / human-review.
- Hero orbit and signal particles imply model evaluation rather than copying artwork from the source.
- One sticky six-step walkthrough already illustrates the software's actual customer workflow.
- Motion is intended to communicate sequence, not claim real operational throughput.
- Intersection reveals, button sweeps, scanning highlights and number transitions use purposeful short durations.
- User preferences for reduced motion suppress continuous animations and entrance effects; all content remains legible.
- Color themes preserve the same hierarchy across light/dark/system settings.

## Guardrails

Marketing site is separate from the authenticated application. No live production routing, fine-tuning, measured customer savings, or regulated-data certification is implied.

## Useful commands

```bash
cd marketing
npm install
npm run build
npm run test:e2e
```

Publishing occurs with GitHub Actions into GitHub Pages at `/contextOps/`.
