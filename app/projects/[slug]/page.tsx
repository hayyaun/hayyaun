import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/lib/projects";
import "../../blog/blog.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

function getProject(slug: string) {
  const project = projects.find((project) => project.slug === slug);
  if (!project) notFound();
  return project;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const project = getProject((await params).slug);
  const title = `${project.title} — Case study`;
  const images = [{ url: project.image, width: project.width, height: project.height, alt: project.imageAlt }];
  return {
    title,
    description: project.description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { type: "website", title, description: project.description, url: `/projects/${project.slug}`, images },
    twitter: { card: "summary_large_image", title, description: project.description, images },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = getProject((await params).slug);
  const { default: Content } = await project.load();
  return (
    <main id="main" className="page-width article-main">
      <Link href="/#work" className="back-link">
        ← Selected work
      </Link>
      <article>
        <header className="article-header">
          <p className="blog-eyebrow">{project.category} / Case study</p>
          <h1>{project.title}</h1>
          <p className="article-deck">{project.description}</p>
          <a href={project.liveUrl} className="back-link">
            Visit {project.title} website ↗
          </a>
        </header>
        <Image
          src={project.image}
          alt={project.imageAlt}
          width={project.width}
          height={project.height}
          sizes="(max-width: 940px) calc(100vw - 40px), 900px"
          className="h-auto w-full rounded-lg"
        />
        <div className="article-prose">
          <Content />
        </div>
      </article>
      <nav className="article-next" aria-label="More case studies">
        <p className="blog-eyebrow">More selected work</p>
        {projects
          .filter(({ slug }) => slug !== project.slug)
          .map((other) => (
            <Link key={other.slug} href={`/projects/${other.slug}`}>
              {other.title} <span aria-hidden="true">↗</span>
            </Link>
          ))}
      </nav>
    </main>
  );
}
