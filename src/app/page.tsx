import {
  FileText,
  Video,
  AudioLines,
  MessagesSquare,
  Sparkles,
  Quote,
  ShieldCheck,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TechStack } from "@/components/tech-stack";
import { HeroCta } from "@/components/hero-cta";
import { BottomCta } from "@/components/bottom-cta";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
        {/* Subtle gradient backdrop */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          aria-hidden
        >
          <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Source-grounded AI research
          </Badge>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Chat with your sources.
            <br />
            <span className="text-brand-600">Grounded in what you upload.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Upload PDFs, documents, videos, and audio. Ask questions, generate
            insights, and create audio overviews — all traceable back to the
            exact passage in your files.
          </p>

          <HeroCta />
        </div>
      </section>

      {/* Supported source types */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: FileText, label: "PDF & Docs" },
            { icon: FileText, label: "Word & PPT" },
            { icon: Video, label: "Video" },
            { icon: AudioLines, label: "Audio" },
            { icon: FileText, label: "Markdown" },
            { icon: FileText, label: "Text" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center"
            >
              <Icon className="h-6 w-6 text-brand-600" />
              <span className="text-xs font-medium text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — Sources to Notebook */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              How it works
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              From scattered sources to a unified notebook
            </h2>
            <p className="mt-4 text-muted-foreground">
              Upload your PDFs, documents, videos, and audio files. Sourcecery
              organizes everything into a single notebook you can chat with —
              every answer grounded in the sources you provided.
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">1</span>
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Upload your sources</strong> — PDFs, Word docs, PowerPoints, videos, audio, Markdown, or plain text.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">2</span>
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Sourcecery processes</strong> — your files are parsed, indexed, and made searchable.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">3</span>
                <span className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Chat & explore</strong> — ask questions, get cited answers, and generate audio overviews.
                </span>
              </li>
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-2xl bg-brand-100/50 blur-xl" aria-hidden />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Sources-to-Notebook.png"
              alt="Sources flowing into a Sourcecery notebook"
              className="relative rounded-xl border border-border shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Everything you need to understand your sources
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Built for researchers, students, and professionals who need reliable,
          traceable insights.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <MessagesSquare className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="font-semibold">Source-grounded chat</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask questions about your uploaded documents. Every answer
                includes citations linking back to the exact passage.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <Quote className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="font-semibold">Citations you can verify</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No more hallucinations. Responses are grounded in your sources
                with inline references you can click and check.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <AudioLines className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="font-semibold">Audio overviews</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Turn your sources into a podcast-style audio summary. Listen on
                the go and absorb key insights effortlessly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="font-semibold">Private by design</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your sources stay yours. The AI only knows what you upload — no
                training on your data, no web-scraped noise.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <FileText className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="font-semibold">Any file format</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                PDFs, Word docs, PowerPoints, videos, audio, Markdown, and plain
                text. Drop it in and start asking.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                <Sparkles className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="font-semibold">Smart summaries</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate study guides, FAQs, timelines, and briefings from your
                sources in seconds.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Tech stack marquee */}
      <TechStack />

      {/* CTA */}
      <section className="mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight">
          Ready to chat with your sources?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Create your first notebook in seconds. No credit card required.
        </p>
        <BottomCta />
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sourcecery. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with Next.js, Clerk, Neon &amp; Vercel Blob.
          </p>
        </div>
      </footer>
    </div>
  );
}
