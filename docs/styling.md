# Styling the portfolio

Tailwind CSS v4 handles page layout, spacing, sizing, and responsive variants. Keep complete utility names in source so the compiler can detect them. Prettier's Tailwind plugin sorts class lists using `app/globals.css`.

## Where styles belong

- `app/globals.css`: the shared import entry point.
- `app/styles/theme.css`: colors, type scales, containers, easing, and breakpoints. The existing design changes at `tablet` (701px), `split` (800px), and `desktop` (1000px). These replace Tailwind's default breakpoint names.
- `app/styles/base.css`: document defaults, focus, selection, and reduced motion; Tailwind Preflight handles resets.
- `app/styles/components.css`: repeated typography and small visual treatments in `@layer components`. Utilities can override them, such as `section-intro mt-7`.
- `app/styles/utilities.css`: the responsive `page-width` helper registered with `@utility`.
- `app/styles/effects.css`: interaction states and animation keyframes in the components layer.
- Route/component CSS: home artwork, generated MDX prose, blog motifs, experiments, and the 404 illustration. Separately processed stylesheets use `@reference` when they need theme-aware directives; it does not emit another copy of the shared CSS.

Reuse markup through `ArticleLayout`, `ArticleHeader`, `RelatedLink`, `CapabilityCard`, and the blog's `Experiment` wrapper. Keep small one-off layouts in JSX; avoid components that only hide a class list. Project and blog lists already reuse their markup through data loops.

Use `@theme inline` for the `next/font` aliases. Apply the font utility where the font variable is in scope; a plain root-level alias can resolve before a variable supplied on the body exists. Custom CSS can reference the original `--font-geist-*` variables directly.

Preserve semantic elements, keyboard focus, reduced motion, image fallbacks, and selectors used by visual effects. The remaining precise artwork dimensions and fluid headings belong to the existing design; they are intentional exceptions to the spacing scale.

## Verification

Run `npm run lint` and `npm run build`. Compare rendered pages at mobile and desktop widths, on both sides of changed breakpoints, and with reduced motion. Include keyboard focus and hover states; compilation cannot prove that layout is unchanged.

## Official references

- [Utility classes and managing duplication](https://tailwindcss.com/docs/styling-with-utility-classes)
- [Custom styles and cascade layers](https://tailwindcss.com/docs/adding-custom-styles)
- [Theme variables](https://tailwindcss.com/docs/theme)
- [Functions and directives](https://tailwindcss.com/docs/functions-and-directives)
- [Responsive design](https://tailwindcss.com/docs/responsive-design)
