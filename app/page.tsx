import Link from "next/link";
import { ArrowRight, Box, Download, Image as ImageIcon, Sparkles } from "lucide-react";

const features = [
  ["3D preview", "Rotate and inspect your product box in real time.", Box],
  ["Upload artwork", "Drop in a PNG or JPG cover and see it mapped instantly.", ImageIcon],
  ["PNG export", "Download a polished transparent-background mockup.", Download]
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="grid-bg mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
          <Sparkles className="h-4 w-4 text-violet-300" />
          3D mockups for creators
        </div>

        <h1 className="max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">
          Turn your cover art into a{" "}
          <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
            3D box shot.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
          Upload your artwork, customize the box, rotate the camera, and export
          a professional product mockup without Photoshop.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/editor"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-white/90"
          >
            Open the editor
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10"
          >
            View Pro plan
          </Link>
        </div>

        <div className="mt-20 grid w-full max-w-5xl gap-4 md:grid-cols-3">
          {features.map(([title, description, Icon]) => (
            <div key={title} className="glass rounded-2xl p-6 text-left">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
