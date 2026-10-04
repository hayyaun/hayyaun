import { serializeJsonLd } from "@/lib/json-ld";
import Image from "next/image";
import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import HomeDebug from "@/components/home-debug";
import HeroPrism from "@/components/three/hero-prism";
import HeroSlogan from "@/components/hero-slogan";
import HeadingWater from "@/components/heading-water";
import FrameRateMonitor from "@/components/frame-rate-monitor";
import ProjectImage from "@/components/project-image";
import { projects } from "@/lib/projects";
import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/", types: { "application/rss+xml": "/rss.xml" } },
  openGraph: {
    title: site.title,
    description: site.description,
    url: site.url,
    siteName: site.name,
    locale: "en_US",
    type: "website",
  },
};

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      className="arrow-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16m-6-6 6 6-6 6"} />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Person",
                "@id": `${site.url}/#person`,
                name: site.name,
                url: site.url,
                email: site.email,
                sameAs: site.profiles,
                knowsAbout: [
                  "Frontend development",
                  "Next.js",
                  "WordPress",
                  "Three.js",
                  "Interactive 3D",
                  "Web animation",
                ],
              },
              {
                "@type": "WebSite",
                "@id": `${site.url}/#website`,
                url: site.url,
                name: site.name,
                description: site.description,
                inLanguage: "en",
                author: { "@id": `${site.url}/#person` },
              },
            ],
          }),
        }}
      />

      <Suspense fallback={null}>
        <HomeDebug />
      </Suspense>
      <main id="main">
        <FrameRateMonitor />
        <section className="hero page-width" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">
              Clarity.
              <br />
              Depth.
              <br />
              Character.
            </h1>
            <HeadingWater />
            <p>
              I’m Hayyaun. Frontend development,
              <br className="desktop-break" /> motion, and interactive 3D.
            </p>
            <div className="hero-actions">
              <a className="work-action" href="#work">
                <span className="arrow-circle">
                  <Arrow />
                </span>
                View work
              </a>
              <a className="muted-link" href="#contact">
                Contact
              </a>
            </div>
          </div>
          <div className="hero-art">
            <Image
              src="/images/prism-dark2-cool.webp"
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 60vw"
              className="prism-fallback"
              priority
            />
            <Suspense fallback={null}>
              <HeroPrism />
            </Suspense>
            <HeroSlogan />
          </div>
        </section>
        <section id="work" className="work-section page-width" aria-labelledby="work-title">
          <div className="work-heading">
            <h2 id="work-title">
              Selected
              <br />
              work.
            </h2>
            <span className="section-label">01 — 03</span>
          </div>
          {projects.map((project, index) => (
            <article className={`project project-${index + 1}`} key={project.slug}>
              <span className="project-number" aria-hidden="true">
                0{index + 1}
              </span>
              <div>
                <ProjectImage
                  href={`/projects/${project.slug}`}
                  src={project.image}
                  previewSrc={project.previewImage}
                  alt={project.imageAlt}
                  title={project.title}
                  previewAlt={project.previewAlt}
                  width={project.width}
                  height={project.height}
                  coverPositionY={project.coverPositionY}
                />
                <div className="project-caption">
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.category}</p>
                  </div>
                  <Link href={`/projects/${project.slug}`} aria-label={`Read the ${project.title} case study`}>
                    Explore project <Arrow diagonal />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
        <section id="about" className="about-section page-width" aria-labelledby="about-title">
          <p className="section-label">About</p>
          <h2 id="about-title">Behind the work.</h2>
          <p className="section-intro">Frontend development, motion, and interactive 3D.</p>
          <div className="capabilities" aria-label="Technical capabilities">
            <article>
              <div className="capability-art interface-art" aria-hidden="true">
                <div className="browser-object">
                  <i />
                  <div className="interface-orb" />
                </div>
                <div className="phone-object">
                  <i />
                  <div />
                </div>
              </div>
              <h3>Interfaces</h3>
              <p>Next.js · WordPress</p>
            </article>
            <article>
              <div className="capability-art dimension-art" aria-hidden="true">
                <div className="glass-ring" />
                <div className="dimension-orb" />
              </div>
              <h3>Light &amp; dimension</h3>
              <p>Three.js · R3F · GLSL</p>
            </article>
            <article>
              <div className="capability-art motion-art" aria-hidden="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <i key={i} style={{ "--petal-angle": `${i * 25 - 75}deg` } as CSSProperties} />
                ))}
              </div>
              <h3>Motion</h3>
              <p>GSAP · interaction</p>
            </article>
          </div>
        </section>
        <section className="experience-section page-width" aria-labelledby="experience-title">
          <p className="section-label">Experience</p>
          <h2 id="experience-title">Two years as a senior frontend developer.</h2>
          <p className="section-intro">Architecture · Performance · Code review · Mentoring</p>
        </section>
        <section id="contact" className="contact-section" aria-labelledby="contact-title">
          <div className="page-width contact-inner">
            <h2 id="contact-title">
              Have something
              <br />
              in mind?{" "}
              <span className="arrow-circle">
                <Arrow />
              </span>
            </h2>
            <div className="contact-links">
              <a href={`mailto:${site.email}`}>
                Email Hayyaun <Arrow diagonal />
              </a>
              <div className="contact-socials">
                <a href={site.profiles[0]}>GitHub</a>
                <a href={site.profiles[1]}>LinkedIn</a>
              </div>
            </div>
          </div>
          <footer className="page-width site-footer">
            <Link href="/" className="wordmark">
              Hayyaun
            </Link>
            <p>Frontend development &amp; interactive 3D</p>
          </footer>
        </section>
      </main>
    </>
  );
}
