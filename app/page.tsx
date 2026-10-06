import "./styles/home.css";
import Arrow from "@/components/ui/arrow";
import CapabilityCard from "@/components/ui/capability-card";
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

const projectLayouts = [
  "tablet:col-start-6 tablet:col-end-13 tablet:pt-11.25",
  "tablet:col-start-2 tablet:col-end-10 tablet:-ml-4",
  "tablet:col-start-5 tablet:col-end-13",
];

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
        <section
          className="relative page-width grid border-b border-line pt-7.5 pb-12 tablet:min-h-[clamp(390px,48vw,630px)] tablet:items-center tablet:pb-11.25 desktop:min-h-[clamp(500px,48vw,630px)]"
          aria-labelledby="hero-title"
        >
          <div className="hero-copy pointer-events-none relative z-2 tablet:w-[58%] [&_a]:pointer-events-auto">
            <h1 id="hero-title" className="display-heading">
              Clarity.
              <br />
              Depth.
              <br />
              Character.
            </h1>
            <HeadingWater />
            <p className="mt-5.5 text-lead leading-[1.3] tracking-tight text-muted tablet:text-[clamp(18px,2.3vw,24px)]">
              I’m Hayyaun. Frontend development,
              <br /> motion, and interactive 3D.
            </p>
            <div className="mt-6.5 flex items-center gap-7.5 text-ui">
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
          <div className="relative isolate mt-1.25 h-85 tablet:absolute tablet:top-0 tablet:-right-5 tablet:m-0 tablet:h-full tablet:w-[64%] desktop:w-[62%]">
            <div className="hero-prism-surface">
              <Image
                src="/images/prism-preview-v002.webp"
                alt=""
                fill
                sizes="(max-width: 700px) 100vw, 60vw"
                className="prism-fallback object-contain"
                priority
              />
              <Suspense fallback={null}>
                <HeroPrism />
              </Suspense>
            </div>
            <HeroSlogan />
          </div>
        </section>
        <section
          id="work"
          className="page-width grid gap-9.5 border-b border-line py-12 tablet:relative tablet:grid-cols-12 tablet:gap-x-0 tablet:gap-y-10 tablet:pt-16.25 tablet:pb-13.75 desktop:gap-y-12.5"
          aria-labelledby="work-title"
        >
          <div className="tablet:absolute tablet:top-15 tablet:left-0">
            <h2 id="work-title" className="text-section desktop:text-[100px]">
              Selected
              <br />
              work.
            </h2>
            <span className="section-label mt-4 block">01 — 03</span>
          </div>
          {projects.map((project, index) => (
            <article
              className={`project project-${index + 1} relative pl-6.5 tablet:pl-0 ${projectLayouts[index]}`}
              key={project.slug}
            >
              <span
                className={`absolute top-1 left-0 text-small text-muted tablet:-left-9.5 ${index === 0 ? "tablet:top-12.25" : ""}`}
                aria-hidden="true"
              >
                0{index + 1}
              </span>
              <div>
                <ProjectImage
                  href={`/projects/${project.slug}`}
                  src={project.image}
                  previewSrc={project.previewImage}
                  previewVideoSrc={"previewVideo" in project ? project.previewVideo : undefined}
                  alt={project.imageAlt}
                  title={project.title}
                  previewAlt={project.previewAlt}
                  width={project.width}
                  height={project.height}
                  coverPositionY={project.coverPositionY}
                />
                <div className="project-caption mt-2.5 flex justify-between gap-3">
                  <div>
                    <h3 className="text-ui leading-[1.35] font-normal tracking-[-0.04em] tablet:text-body">
                      {project.title}
                    </h3>
                    <p className="mt-1 font-mono text-[9px] tracking-widest text-muted uppercase tablet:text-tiny">
                      {project.category}
                    </p>
                  </div>
                  <Link
                    className="flex min-h-11 items-start gap-2.5 text-meta whitespace-nowrap tablet:text-ui"
                    href={`/projects/${project.slug}`}
                    aria-label={`Read the ${project.title} case study`}
                  >
                    Explore project <Arrow diagonal />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
        <section id="about" className="page-width pt-16.25 tablet:pt-21.25" aria-labelledby="about-title">
          <p className="section-label">About</p>
          <h2 id="about-title" className="mt-3 text-heading">
            Behind the work.
          </h2>
          <p className="section-intro">Frontend development, motion, and interactive 3D.</p>
          <div
            className="capabilities mt-9.5 grid gap-8 tablet:grid-cols-3 tablet:gap-8.75"
            aria-label="Technical capabilities"
          >
            <CapabilityCard title="Interfaces" description="Next.js · WordPress">
              <div className="capability-art" aria-hidden="true">
                <div className="browser-object">
                  <i />
                  <div className="interface-orb" />
                </div>
                <div className="phone-object">
                  <i />
                  <div />
                </div>
              </div>
            </CapabilityCard>
            <CapabilityCard title="Light & dimension" description="Three.js · R3F · GLSL">
              <div className="capability-art" aria-hidden="true">
                <div className="glass-ring" />
                <div className="dimension-orb" />
              </div>
            </CapabilityCard>
            <CapabilityCard title="Motion" description="GSAP · interaction">
              <div className="capability-art motion-art" aria-hidden="true">
                {Array.from({ length: 7 }, (_, i) => (
                  <i key={i} style={{ "--petal-angle": `${i * 25 - 75}deg` } as CSSProperties} />
                ))}
              </div>
            </CapabilityCard>
          </div>
        </section>
        <section
          className="page-width border-b border-line pt-27.5 pb-23.75 desktop:pt-38.75 desktop:pb-30"
          aria-labelledby="experience-title"
        >
          <p className="section-label">Experience</p>
          <h2 id="experience-title" className="mt-3 text-experience">
            Two years as a senior frontend developer.
          </h2>
          <p className="section-intro">Architecture · Performance · Code review · Mentoring</p>
        </section>
        <section id="contact" className="bg-background pt-13.75 tablet:pt-17.5" aria-labelledby="contact-title">
          <div className="page-width flex flex-col gap-8.75 tablet:flex-row tablet:items-center tablet:justify-between">
            <h2 id="contact-title" className="text-contact">
              Have something
              <br />
              in mind?{" "}
              <span className="arrow-circle ml-2.5 size-14 bg-accent-soft align-middle text-foreground">
                <Arrow />
              </span>
            </h2>
            <div className="contact-links self-start text-base tablet:self-center">
              <a className="inline-flex gap-4.5 py-3 underline underline-offset-5" href={`mailto:${site.email}`}>
                Email Hayyaun <Arrow diagonal />
              </a>
              <div className="flex gap-6.25 text-small text-subtle">
                <a className="py-3 underline underline-offset-3" href={site.profiles[0]}>
                  GitHub
                </a>
                <a className="py-3 underline underline-offset-3" href={site.profiles[1]}>
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
          <footer className="page-width flex items-center justify-between gap-5 pt-15 pb-7.5 tablet:pt-22.5 tablet:pb-11.25">
            <Link href="/" className="wordmark">
              Hayyaun
            </Link>
            <p className="text-right text-caption text-subtle">Frontend development &amp; interactive 3D</p>
          </footer>
        </section>
      </main>
    </>
  );
}
