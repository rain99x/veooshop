import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({
    meta: [
      { title: "About — veoo" },
      { name: "description", content: "About veoo: handcrafted jewelry made in small batches." },
    ],
  }),
});

function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="font-display text-5xl">About veoo</h1>
        <div className="mt-8 space-y-5 text-muted-foreground leading-relaxed">
          <p>
            veoo is a small studio for handmade jewelry. Each piece is made slowly,
            one at a time, with care given to weight, finish, and quiet detail.
          </p>
          <p>
            We don't run flash sales or mass production. When something sells out, it's gone —
            or you can request a similar piece by DM.
          </p>
          <p>
            Orders are placed by sending us a message on Instagram. Add what you love to your cart,
            then copy your order summary and send it to{" "}
            <a className="text-foreground underline" href="https://www.instagram.com/veooshop/" target="_blank" rel="noreferrer">@veooshop</a>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
