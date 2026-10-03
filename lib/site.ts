export const site = {
  url: "https://hayyaun.ir",
  name: "Hayyaun",
  title: "Hayyaun — Frontend developer, motion & interactive 3D",
  description: "Hayyaun’s portfolio: frontend development with Next.js and WordPress, thoughtful motion, and interactive 3D. Explore selected websites and get in touch.",
  email: "hayyaun@outlook.com",
  profiles: ["https://github.com/hayyaun", "https://www.linkedin.com/in/hayyaun/"],
} as const;
export const isPreview = process.env.VERCEL_ENV === "preview";
