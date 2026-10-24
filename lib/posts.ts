export const posts = [
  {
    slug: "switch-docker-compose-workspaces-with-dwork",
    title: "Switch Docker Compose workspaces with dwork.",
    description:
      "Set up two reusable development workspaces, resume existing containers, and open terminals and browser pages in the right order with dwork.",
    category: "Developer tools",
    tags: ["docker", "devtools", "productivity", "opensource"],
    date: "2026-10-24",
    load: () => import("@/content/blog/switch-docker-compose-workspaces-with-dwork.mdx"),
  },
  {
    slug: "small-client-boundaries",
    title: "A little less JavaScript. A better starting point.",
    description:
      "How to place client boundaries around interactions while keeping the rest of a Next.js page on the server.",
    category: "Architecture",
    tags: ["nextjs", "react", "javascript", "webdev"],
    date: "2026-10-03",
    load: () => import("@/content/blog/small-client-boundaries.mdx"),
  },
  {
    slug: "layouts-that-adapt",
    title: "Let the content choose the layout.",
    description:
      "Build responsive card grids with intrinsic sizing, then test the awkward widths between your breakpoints.",
    category: "CSS & layout",
    tags: ["css", "webdev", "responsive", "frontend"],
    date: "2026-10-03",
    load: () => import("@/content/blog/layouts-that-adapt.mdx"),
  },
  {
    slug: "color-with-contrast",
    title: "Quiet colors. Clear interfaces.",
    description:
      "A practical approach to accessible color: measure contrast, preserve hierarchy, and test more than the default state.",
    category: "Accessibility",
    tags: ["a11y", "css", "webdev", "design"],
    date: "2026-10-03",
    load: () => import("@/content/blog/color-with-contrast.mdx"),
  },
  {
    slug: "motion-with-purpose",
    title: "Motion should explain what changed.",
    description:
      "Choose timing and easing deliberately, keep content readable, and offer a useful reduced-motion experience.",
    category: "Interaction",
    tags: ["css", "a11y", "webdev", "animation"],
    date: "2026-10-03",
    load: () => import("@/content/blog/motion-with-purpose.mdx"),
  },
  {
    slug: "budget-for-3d",
    title: "Give your 3D scene a budget.",
    description:
      "Treat pixel density, rendering frequency, and fallbacks as design decisions before adding more visual detail.",
    category: "Interactive 3D",
    tags: ["threejs", "react", "webdev", "performance"],
    date: "2026-10-03",
    load: () => import("@/content/blog/budget-for-3d.mdx"),
  },
] as const;

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function postDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`)
  );
}
