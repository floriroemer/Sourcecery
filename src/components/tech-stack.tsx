import Image from "next/image";

const techStack = [
  { name: "Next.js", src: "/logos/Next.js.svg", description: "Framework" },
  { name: "React", src: "/logos/React.svg", description: "UI Library" },
  { name: "TypeScript", src: "/logos/TypeScript.svg", description: "Language" },
  { name: "Tailwind CSS", src: "/logos/Tailwind CSS.svg", description: "Styling" },
  { name: "Clerk", src: "/logos/clerk.svg", description: "Authentication" },
  { name: "Neon", src: "/logos/neon-seeklogo.svg", description: "Postgres Database" },
  { name: "Vercel", src: "/logos/Vercel.svg", description: "Hosting & Blob Storage" },
  { name: "VS Code", src: "/logos/VS Code.svg", description: "Editor" },
  { name: "GitHub Copilot", src: "/logos/githubcopilot.svg", description: "AI Pair Programmer" },
  { name: "z.ai GLM-5.2", src: "/logos/zai.svg", description: "AI Model" },
  { name: "Markdown", src: "/logos/Markdown.svg", description: "Content" },
];

export function TechStack() {
  // Duplicate the array for a seamless marquee loop
  const marqueeItems = [...techStack, ...techStack];

  return (
    <section className="overflow-hidden border-y border-border bg-card py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Built with modern tools & AI
        </h2>
      </div>

      {/* Marquee */}
      <div className="relative mt-10">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-card to-transparent" />

        <div className="flex w-max animate-marquee gap-8 hover:[animation-play-state:paused]">
          {marqueeItems.map((tech, index) => (
            <div
              key={`${tech.name}-${index}`}
              className="group flex shrink-0 items-center gap-3 rounded-xl border border-border bg-background px-6 py-4 transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src={tech.src}
                  alt={`${tech.name} logo`}
                  fill
                  className="object-contain"
                  sizes="32px"
                />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{tech.name}</p>
                <p className="text-xs text-muted-foreground">{tech.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}