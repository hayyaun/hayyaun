# AGENTS.md

## Project

This project is a professional web developer portfolio built with:

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Three.js / React Three Fiber where appropriate

The website must demonstrate strong frontend engineering, visual design, performance, accessibility, SEO, and tasteful interactive/3D development.

The portfolio is not a generic developer template.

Every design and engineering decision should reinforce:

1. technical competence
2. clarity
3. performance
4. accessibility
5. discoverability
6. restrained visual polish

---

# 1. Core Engineering Rules

Follow current official Next.js App Router conventions.

Prefer framework-native solutions over custom implementations.

Priority order:

1. Semantic HTML
2. Server Components
3. CSS / Tailwind
4. Client Components where interaction requires them
5. JavaScript animation
6. WebGL / Three.js

Do not introduce client-side JavaScript when HTML or CSS can solve the problem.

Do not add dependencies for trivial functionality.

Keep dependencies minimal and justified.

Use TypeScript strictly. Avoid `any` unless there is a documented technical reason.

The project must pass:

```bash
npm run lint
npm run build
```

before production changes are considered complete.

## Development Server and Dependency Installation

- The developer is responsible for starting and managing the development server. Agents must not run `npm run dev` or start the development server through an equivalent command. When a development server is needed, ask the developer to run it.
- If network issues prevent installing dependencies, continue any work that does not depend on the installation and ask the developer to run `npm install` manually afterwards. Report any checks that remain blocked by missing dependencies.

---

# 2. Next.js Architecture

Use the App Router.

Prefer:

```text
app/
├── layout.tsx
├── page.tsx
├── globals.css
├── robots.ts
├── sitemap.ts
├── manifest.ts
├── opengraph-image.*
├── icon.*
├── projects/
│   └── [slug]/
│       └── page.tsx
├── rss.xml/
│   └── route.ts
└── api/
    └── ...

components/
├── layout/
├── sections/
├── ui/
└── three/

lib/
├── metadata.ts
├── projects.ts
├── constants.ts
└── utils.ts

public/
├── images/
├── projects/
├── models/
└── textures/
```

Adapt the structure when there is a concrete reason. Do not create folders merely to satisfy this example.

---

# 3. Server vs Client Components

Server Components are the default.

Do NOT add `"use client"` automatically.

Use Client Components only when a component genuinely requires:

- event handlers
- React state
- effects
- browser APIs
- WebGL
- client-only libraries
- interactive animation

Keep client boundaries as small and deep in the component tree as practical.

Bad:

```tsx
"use client";

export default function HomePage() {
  // entire website becomes part of client graph
}
```

Better:

```tsx
export default function HomePage() {
  return (
    <>
      <Hero>
        <HeroScene />
      </Hero>

      <Projects />
      <About />
    </>
  );
}
```

where only `HeroScene` is client-side.

Never make static portfolio content depend on JavaScript hydration.

---

# 4. Homepage Structure

The homepage follows the portfolio structure already decided for this project.

Do not casually add additional homepage sections.

Order:

```text
Navigation

Hero
↓
Featured Projects
↓
About
↓
Technical Capabilities
↓
Experience / Credibility
↓
Contact CTA
↓
Footer
```

## Hero

The hero must immediately communicate:

- who the developer is
- what they build
- their strongest specialization/value
- how to see their work
- how to contact them

Primary actions should normally include:

- View Work
- Contact

GitHub and LinkedIn may be secondary actions.

Avoid generic copy such as:

> Passionate developer creating amazing digital experiences.

Prefer specific positioning.

The meaningful hero content MUST be HTML, not canvas content.

---

# 5. 3D Hero Strategy

3D is an enhancement and a demonstration of technical ability.

It is NOT the foundation of the page.

The agreed strategy is:

```text
HTML/CSS hero renders
        ↓
page is immediately readable
        ↓
3D dependencies load asynchronously
        ↓
3D assets load
        ↓
canvas progressively appears
```

The hero headline, navigation, CTA and essential visual structure must work before Three.js loads.

Never block first render on:

- Three.js
- React Three Fiber
- shaders
- models
- textures
- physics engines

Heavy 3D code should be dynamically/lazily loaded where appropriate.

Provide a visually acceptable fallback while the scene loads.

The site must remain usable if:

- WebGL fails
- JavaScript fails
- the device has weak graphics hardware
- the user prefers reduced motion

Respect:

```css
prefers-reduced-motion
```

Do not use 3D merely to show a rotating object.

3D interactions should demonstrate meaningful skill such as:

- shader work
- procedural effects
- thoughtful pointer interaction
- scroll-linked transformations
- lighting
- particles
- optimized models
- controlled post-processing

Performance takes priority over visual complexity.

---

# 6. Featured Projects

There are exactly three primary featured projects.

These projects are the core evidence of engineering ability and should receive substantial visual prominence.

Each project should communicate:

- what the product/project is
- the problem
- the developer's role
- important constraints
- technical decisions
- difficult engineering problems
- solutions
- technologies
- measurable results where available

Prefer:

```text
Problem → Constraints → Decisions → Implementation → Result
```

over:

```text
React
Next.js
Tailwind
PostgreSQL
```

Technology lists support the case study; they are not the case study.

Each project should have a dedicated, indexable URL where sufficient content exists:

```text
/projects/project-slug
```

Project links should use descriptive anchor text.

---

# 7. About

Keep the homepage About section concise.

It should explain:

- specialization
- engineering/design approach
- relevant interests
- what kinds of problems the developer likes solving

Avoid autobiography and filler.

A separate `/about` page is optional and should only exist if there is enough meaningful content to justify it.

---

# 8. Technical Capabilities

Group technologies by capability rather than displaying an uncontrolled wall of logos.

Example:

```text
Frontend
React, Next.js, TypeScript

Backend
Node.js, PostgreSQL

Interactive / 3D
Three.js, React Three Fiber, GLSL

Infrastructure
Docker, CI/CD, Cloud platforms
```

The exact categories must reflect actual skills.

Never claim technologies or abilities that cannot be supported by real experience.

---

# 9. Experience / Credibility

Include this section only when there is meaningful evidence.

Possible content:

- professional roles
- freelance work
- meaningful open-source work
- real usage numbers
- shipped products
- awards
- relevant clients
- measurable outcomes

Do not manufacture credibility with decorative statistics.

If the content is weak, omit the section.

---

# 10. Contact

The final homepage section should contain an obvious call to action.

Provide appropriate methods such as:

- email
- GitHub
- LinkedIn

Do not hide contact information behind unnecessary interactions.

Links must have meaningful accessible labels.

---

# 11. SEO

SEO is a first-class requirement, not an afterthought.

Use Next.js Metadata APIs rather than manually constructing `<head>` markup where Next.js already provides an API.

Every indexable page must have an appropriate:

- title
- meta description
- canonical URL
- Open Graph metadata
- social sharing image where appropriate

Use either:

```tsx
export const metadata: Metadata = {};
```

or:

```tsx
export async function generateMetadata(): Promise<Metadata> {}
```

as appropriate.

Set `metadataBase` at the root level.

Page titles should describe the actual page.

Avoid keyword stuffing.

Descriptions should be written for humans and accurately summarize the page.

Project pages should have unique metadata based on their project.

---

# 12. Canonical URLs

Every canonical/indexable page should resolve to one preferred URL.

Use Next.js metadata alternates/canonical support.

Avoid multiple indexable URLs containing substantially identical content.

Do not canonicalize unrelated pages to the homepage.

---

# 13. Open Graph / Social Metadata

Provide high-quality social previews.

Support:

- Open Graph
- Twitter/X card metadata

Use Next.js metadata and metadata file conventions.

Provide a default site-level OG image and project-specific OG images where useful.

Social images should clearly identify the developer/project without excessive text.

---

# 14. Structured Data

Use JSON-LD when it accurately describes visible content.

Potentially relevant Schema.org entities include:

- `Person`
- `WebSite`
- `CreativeWork`
- `SoftwareApplication`
- `Article` when actual articles exist
- `BreadcrumbList` on suitable nested pages

Do not add schema purely because a type exists.

Structured data must match visible page content.

Never fabricate:

- reviews
- ratings
- employers
- clients
- awards
- project statistics

JSON-LD containing dynamic/untrusted strings must be safely serialized.

---

# 15. Sitemap

Provide:

```text
app/sitemap.ts
```

using Next.js `MetadataRoute.Sitemap`.

Include public canonical pages such as:

- homepage
- project pages
- about page if present
- articles if present

Do not include:

- API endpoints
- preview pages
- duplicate URLs
- private routes
- utility endpoints

Keep `lastModified` truthful.

Do not fake modification dates on every deployment.

---

# 16. Robots

Provide:

```text
app/robots.ts
```

using `MetadataRoute.Robots`.

Production should normally allow crawling of public portfolio content and reference the sitemap.

Do not accidentally block:

- `/`
- project pages
- assets required to render/index the site

Preview/staging deployments should not unintentionally become competing indexed versions of production.

---

# 17. RSS

If the site contains articles, notes, changelogs, writing, or other regularly published content, expose an RSS feed.

Preferred URL:

```text
/rss.xml
```

Implement it with an App Router Route Handler where appropriate.

The feed should include valid:

- title
- link
- description
- publication date
- GUID/permalink
- item title
- item URL

Escape XML content correctly.

Use absolute production URLs.

If the portfolio has no recurring published content, do not create an empty or fake RSS feed merely to check a feature box.

When RSS exists, expose discovery metadata so feed readers can find it.

---

# 18. Semantic HTML

Use HTML according to meaning.

Prefer:

```html
<header>
  <nav>
    <main>
      <section>
        <article>
          <aside>
            <footer></footer>
          </aside>
        </article>
      </section>
    </main>
  </nav>
</header>
```

where semantically appropriate.

Use actual:

```html
<a></a>
```

for navigation and actual:

```html
<button></button>
```

for actions.

Do not turn `<div>` elements into fake buttons.

Maintain a logical heading hierarchy.

Normally each page should have a clear primary `<h1>`.

Do not choose heading levels based on visual size.

---

# 19. Accessibility

Accessibility is mandatory.

All interactive functionality must be keyboard accessible.

Maintain visible focus states.

Images require meaningful `alt` text unless decorative.

Decorative images should use empty alt text when appropriate.

Form fields require labels.

Icon-only controls require accessible names.

Color must not be the only means of communicating information.

Animations must respect reduced-motion preferences.

3D/canvas content must not contain information unavailable elsewhere in semantic HTML.

Do not remove focus outlines unless replaced with an equally visible focus treatment.

Target WCAG 2.2 AA where practical.

---

# 20. Images

Prefer Next.js `<Image>` for normal content images when its optimization behavior is appropriate.

Always avoid layout shifts by defining image dimensions/aspect ratios.

Serve correctly sized assets.

Do not ship a 3000px image to display it at 300px without justification.

Use modern formats when appropriate.

Project imagery should prioritize visual quality while remaining aggressively optimized.

Only preload/prioritize images that genuinely affect the initial viewport.

Do not eagerly load the entire project gallery.

---

# 21. Fonts

Use `next/font`.

Prefer variable fonts where suitable.

Keep font families and weights limited.

Do not fetch Google Fonts directly from the browser when `next/font` can self-host them.

Typography must not cause visible layout shifts.

---

# 22. Performance

Performance is part of the portfolio's credibility.

A developer portfolio that advertises engineering ability but performs poorly is self-defeating.

Monitor Core Web Vitals, especially:

- LCP
- INP
- CLS

Aim for Google's "good" thresholds rather than chasing meaningless synthetic perfection.

Avoid:

- unnecessary hydration
- oversized JS bundles
- excessive animation libraries
- uncompressed 3D models
- huge textures
- excessive post-processing
- unnecessary third-party scripts
- layout shifts
- render-blocking resources

Run Lighthouse as a diagnostic tool, not as the sole definition of quality.

Test production builds, not only development mode.

Use bundle analysis when bundle size becomes suspicious.

---

# 23. Three.js Performance

3D receives stricter performance scrutiny than ordinary UI.

Prefer:

- compressed geometry
- Draco/Meshopt where appropriate
- compressed textures
- KTX2 where appropriate
- sensible texture resolutions
- instancing for repeated geometry
- minimal draw calls
- limited post-processing
- controlled device pixel ratio

Avoid continuous rendering if the scene can render on demand.

Pause/reduce work when the scene is:

- outside the viewport
- hidden
- not changing

Do not assume desktop GPU performance.

Test on actual mobile hardware.

Visual complexity should degrade gracefully.

---

# 24. JavaScript

Prefer modern, readable TypeScript.

Avoid clever abstractions with no demonstrated benefit.

Functions and components should have clear responsibilities.

Do not create utility functions for one trivial expression.

Do not create abstractions solely to reduce line count.

Avoid premature memoization.

Do not use effects for values that can be derived during rendering.

Do not use client-side fetching for content that can naturally be fetched/rendered on the server.

---

# 25. Tailwind CSS

Use Tailwind primarily through utility classes.

Prefer consistent design tokens over arbitrary values.

Good:

```tsx
className = "mx-auto max-w-7xl px-6 lg:px-8";
```

Use arbitrary values only when the design genuinely requires them.

Avoid turning every repeated group of utilities into a custom CSS class.

Extract a React component when repetition represents an actual reusable UI component.

Keep responsive styles mobile-first:

```tsx
className = "text-4xl md:text-6xl lg:text-7xl";
```

Do not write desktop styles first and then fight them with overrides.

Keep class lists readable.

Use a class-merging utility such as `cn()` only when conditional composition actually requires it.

Avoid excessive:

```tsx
!important;
```

and Tailwind's important modifier.

If overriding styles becomes difficult, fix the component/style architecture instead.

---

# 26. Design System

Use a constrained visual system.

Define reusable tokens for:

- colors
- spacing
- typography
- radii
- container widths
- shadows where needed
- animation timing

Avoid arbitrary one-off values throughout the codebase.

Consistency is more valuable than microscopic visual uniqueness.

---

# 27. Responsive Design

Build mobile-first.

The site must be intentionally designed for:

- small mobile
- large mobile
- tablet
- laptop
- large desktop

Do not merely shrink desktop layouts.

Do not assume hover exists.

Interactive elements need appropriate touch targets.

3D experiences should be simplified or replaced when mobile constraints justify it.

---

# 28. Motion

Motion must have a purpose.

Good uses:

- explaining hierarchy
- communicating state
- supporting navigation
- revealing relationships
- reinforcing the 3D experience

Bad uses:

- animating every element because it is possible
- delaying content for dramatic entrances
- scroll hijacking
- long page transitions
- excessive parallax
- cursor-following effects that interfere with normal interaction

Content should not wait for an animation before becoming readable.

---

# 29. Navigation

Use `next/link` for internal navigation.

Use normal links for external destinations.

Do not use programmatic routing when a standard link correctly represents the interaction.

Navigation must remain usable without animation.

Indicate external links appropriately when context requires it.

Do not automatically open every external link in a new tab.

---

# 30. Security

Never expose secrets to Client Components.

Environment variables intended only for the server must remain server-only.

Only use `NEXT_PUBLIC_*` for values intentionally exposed to browsers.

Validate and sanitize untrusted input.

If a contact form exists:

- validate server-side
- rate-limit where appropriate
- prevent spam/abuse
- do not trust client validation
- return useful error states

Consider appropriate security headers and Content Security Policy.

Be particularly careful with CSP configuration when WebGL, analytics or external resources are involved.

---

# 31. Analytics

Analytics must not compromise site performance or privacy unnecessarily.

Only collect metrics that have an actual use.

Useful measurements include:

- project case-study visits
- outbound project links
- contact CTA interactions
- Core Web Vitals

Do not add multiple analytics systems without justification.

Load third-party scripts using appropriate Next.js strategies.

---

# 32. Error and Loading States

Use App Router conventions where useful:

```text
loading.tsx
error.tsx
not-found.tsx
```

Do not create loading screens for content that can render immediately.

Loading UI should preserve layout and avoid CLS.

404 pages should provide useful navigation back into the portfolio.

---

# 33. Project Content

Store project data in a structured and maintainable form.

For three projects, avoid introducing a CMS unless content editing requirements justify one.

A typed local data structure or MDX/content files are usually sufficient.

Project content should support fields such as:

```ts
type Project = {
  slug: string;
  title: string;
  summary: string;
  role: string;
  technologies: string[];
  coverImage: string;
  liveUrl?: string;
  repositoryUrl?: string;
  year: number;
};
```

Extend this according to actual content rather than hypothetical requirements.

---

# 34. Content Quality

Never use placeholder marketing language in production.

Avoid phrases such as:

- innovative solutions
- cutting-edge technologies
- passionate developer
- seamless experiences
- bringing ideas to life

unless the surrounding text gives them concrete meaning.

Prefer evidence.

Instead of:

> I build high-performance applications.

Show:

> Reduced initial client JavaScript from X to Y.

Instead of:

> Used modern technologies.

Explain why a particular architecture was chosen.

---

# 35. Progressive Enhancement

The portfolio should remain understandable before optional enhancements initialize.

Baseline:

```text
HTML content
+
CSS layout
+
working navigation
+
project information
```

Enhancement:

```text
animations
+
3D
+
advanced transitions
+
optional visual effects
```

Never reverse these priorities.

---

# 36. Production Checklist

Before deployment verify:

- production build succeeds
- lint/type checks succeed
- no console errors
- no hydration warnings
- no broken internal links
- no placeholder text
- metadata is correct
- canonical URLs are correct
- OG images work
- favicon/icons work
- sitemap works
- robots.txt works
- RSS works if publishing content
- JSON-LD validates
- 404 works
- project URLs are indexable
- images have appropriate alt text
- keyboard navigation works
- focus states are visible
- reduced motion works
- mobile layout is intentional
- 3D has a fallback
- 3D does not block meaningful content
- Lighthouse has been inspected
- Core Web Vitals have been considered
- large bundles have been investigated
- production URLs replace development URLs
- external links work
- contact method works

---

# 37. Decision Rule for Agents

When implementing a feature, ask in this order:

```text
Does this improve the portfolio?
        ↓
Can semantic HTML solve it?
        ↓
Can CSS/Tailwind solve it?
        ↓
Does it require a Client Component?
        ↓
Does it require another dependency?
        ↓
Does the benefit justify its performance cost?
```

When uncertain, choose the simpler implementation.

Do not sacrifice usability, accessibility, SEO or performance merely to make the portfolio look technically complicated.

The goal is not to demonstrate how much code can be written.

The goal is to demonstrate that the developer knows what code should and should not be written.
