import { QuoteChat } from "@/components/QuoteChat";

const FEATURES = [
  { icon: "/brand/Fast-150.png", title: "Priced in minutes", text: "A firm price before you finish your coffee, day or night." },
  { icon: "/brand/Responsive-150.png", title: "No jargon", text: "Tell us about your product. We pick the right stock, glue and finish." },
  { icon: "/brand/Friendly-Staff-150B.png", title: "Real people", text: "Anything unusual goes straight to our team, never a guess." },
  { icon: "/brand/Maple-Leaf-150.png", title: "Proudly Canadian", text: "Printed in Winnipeg, shipped Canada-wide." },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-8 lg:pt-12 grid gap-8 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-x-14 lg:gap-y-10 items-start">
      <section className="relative">
        <h1 className="display relative z-10 text-[clamp(46px,6.6vw,84px)]">
          <span className="block text-lime">Custom Labels.</span>
          <span className="block text-cream">Priced in minutes.</span>
        </h1>
        <p className="mt-6 max-w-[34ch] text-[18px] text-cream/90">
          Describe what you sell in your own words. We'll recommend the right label, give you a firm price, check your
          artwork and take your order, all right here.
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/Roll-600.png"
          alt=""
          className="roll pointer-events-none select-none hidden lg:block absolute right-[-24px] top-[-34px] w-[190px] z-0 opacity-95 drop-shadow-[0_25px_35px_rgba(0,0,0,.45)]"
        />

      </section>

      <section className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-6">
        <QuoteChat />
      </section>

      <section className="lg:col-start-1 lg:row-start-2">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-7 max-w-xl">
          {FEATURES.map((f) => (
            <li key={f.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.icon} alt="" className="h-12 w-12" />
              <h3 className="mt-3 text-[20px] text-lime">{f.title}</h3>
              <p className="mt-1 text-[14.5px] text-cream/85">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
