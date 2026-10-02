import Image from "next/image";
import Link from "next/link";
import HeroPrism from "@/components/three/hero-prism";
import { projects } from "@/lib/projects";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...(process.env.SITE_URL ? { alternates: { canonical: "/" } } : {}),
};

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header page-width">
        <Link href="/" className="wordmark" aria-label="Hayyaun home">Hayyaun</Link>
        <nav aria-label="Main navigation"><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
      </header>
      <main id="main">
        <section className="hero page-width" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Clarity.<br />Depth.<br />Character.</h1>
            <p>I’m Hayyaun. Frontend development,<br className="desktop-break" /> motion, and interactive 3D.</p>
            <div className="hero-actions"><a className="work-action" href="#work"><span className="arrow-circle"><Arrow /></span>View work</a><a className="muted-link" href="#contact">Contact</a></div>
          </div>
          <div className="hero-art">
            <Image src="/images/prism-crystal.webp" alt="" fill sizes="(max-width: 700px) 100vw, 60vw" className="prism-fallback" priority />
            <HeroPrism />
            <span className="hero-note">Ideas<br />into<br />real<br />experiences</span>
          </div>
        </section>
        <section id="work" className="work-section page-width" aria-labelledby="work-title">
          <div className="work-heading"><h2 id="work-title">Selected<br />work.</h2><span className="section-label">01 — 03</span></div>
          {projects.map((project, index) => <article className={`project project-${index + 1}`} key={project.slug}>
            <span className="project-number" aria-hidden="true">0{index + 1}</span>
            <div><Image src={project.image} alt={`${project.title} website preview`} width={project.width} height={project.height} sizes="(max-width: 700px) 90vw, 65vw" className="project-image" />
              <div className="project-caption"><div><h3>{project.title}</h3><p>{project.category}</p></div><a href={project.image} aria-label={`Explore ${project.title} project preview`}>Explore project <Arrow diagonal /></a></div>
            </div>
          </article>)}
        </section>
        <section id="about" className="about-section page-width" aria-labelledby="about-title">
          <p className="section-label">About</p><h2 id="about-title">Behind the work.</h2><p className="section-intro">Frontend development, motion, and interactive 3D.</p>
          <div className="capabilities" aria-label="Technical capabilities">
            <article><div className="capability-art interface-art" aria-hidden="true"><div className="browser-object"><i /><div className="interface-orb" /></div><div className="phone-object"><i /><div /></div></div><h3>Interfaces</h3><p>Next.js · WordPress</p></article>
            <article><div className="capability-art dimension-art" aria-hidden="true"><div className="glass-ring" /><div className="dimension-orb" /></div><h3>Light &amp; dimension</h3><p>Three.js · R3F · GLSL</p></article>
            <article><div className="capability-art motion-art" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 25 - 75}deg)` }} />)}</div><h3>Motion</h3><p>GSAP · interaction</p></article>
          </div>
        </section>
        <section className="experience-section page-width" aria-labelledby="experience-title"><p className="section-label">Experience</p><h2 id="experience-title">Two years as a senior frontend developer.</h2><p className="section-intro">Architecture · Performance · Code review · Mentoring</p></section>
        <section id="contact" className="contact-section" aria-labelledby="contact-title"><div className="page-width contact-inner"><h2 id="contact-title">Have something<br />in mind? <span className="arrow-circle"><Arrow /></span></h2><div className="contact-links"><a href={process.env.CONTACT_EMAIL ? `mailto:${process.env.CONTACT_EMAIL}` : "https://github.com/hayyaun"}>{process.env.CONTACT_EMAIL ? "Email Hayyaun" : "Contact Hayyaun"} <Arrow diagonal /></a><div className="contact-socials"><a href="https://github.com/hayyaun">GitHub</a>{process.env.LINKEDIN_URL && <a href={process.env.LINKEDIN_URL}>LinkedIn</a>}</div></div></div><footer className="page-width site-footer"><Link href="/" className="wordmark">Hayyaun</Link><p>Frontend development &amp; interactive 3D</p></footer></section>
      </main>
    </>
  );
}
