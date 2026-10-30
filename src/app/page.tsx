import { QuoteChat } from "@/components/QuoteChat";

export default function Home() {
  return (
    <>
      <div className="bg-navy-deep text-white">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <h1 className="text-xl font-bold sm:text-2xl">Custom printed labels, priced in about two minutes.</h1>
          <p className="mt-1 text-sm text-white/75">
            Tell us about your product. We'll pick the right material, give you a firm price, check your artwork and
            take your order. No label jargon required.
          </p>
        </div>
      </div>
      <QuoteChat />
    </>
  );
}
