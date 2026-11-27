import { ArrowRight, ShieldCheck, Smartphone, Truck, Headphones } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HERO_SLIDES } from '../data/defaultProducts';
import type { CategorySlug } from '../types';

interface HeroSliderProps {
  onShopCategory: (cat: CategorySlug) => void;
}

export function HeroSlider({ onShopCategory }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  const currentSlide = HERO_SLIDES[activeIndex];

  const handleCtaClick = () => {
    onShopCategory(currentSlide.ctaCategory);
    const el = document.getElementById('catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className="relative bg-[#07152B] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            {/* Left Editorial Copy */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-5 z-10">
              <p className="text-xs font-semibold tracking-widest uppercase text-[#F3E5AB]">
                {currentSlide.kicker}
              </p>

              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-balance max-w-xl">
                {currentSlide.titlePrefix}{' '}
                <span className="text-[#D4AF37]">{currentSlide.titleHighlight}</span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg">
                {currentSlide.subtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCtaClick}
                  className="gold-bg-gradient text-[#07152B] font-bold px-6 py-3 rounded-lg text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <span>{currentSlide.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#catalog"
                  className="border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-6 py-3 rounded-lg text-xs uppercase tracking-wider transition-colors"
                >
                  Explore All
                </a>
              </div>

              {/* Slide Indicators */}
              <div className="flex items-center gap-2 pt-3">
                {HERO_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`View slide ${idx + 1}`}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === activeIndex
                        ? 'w-9 bg-[#D4AF37]'
                        : 'w-3 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right 16:9 Studio Visual */}
            <div className="lg:col-span-6 flex items-stretch">
              <div className="relative w-full aspect-video lg:aspect-auto lg:min-h-[340px] rounded-xl overflow-hidden bg-[#0B1E3D]">
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.imageAlt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07152B]/90 via-[#07152B]/25 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{currentSlide.captionTitle}</p>
                    <p className="text-xs text-[#F3E5AB] font-mono tabular-nums mt-0.5">
                      {currentSlide.captionPrice}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column Trust Strip */}
      <section className="bg-white border-b border-slate-200/80 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-[#A38038] shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-[#07152B]">Doorstep Delivery</h3>
              <p className="text-xs text-slate-500">Fast dispatch across Ghana</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-[#A38038] shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-[#07152B]">MoMo Checkout</h3>
              <p className="text-xs text-slate-500">MTN, Telecel &amp; Cards</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#A38038] shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-[#07152B]">Verified Quality</h3>
              <p className="text-xs text-slate-500">Inspected durable goods</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Headphones className="w-5 h-5 text-[#A38038] shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-[#07152B]">Direct Support</h3>
              <p className="text-xs text-slate-500">WhatsApp &amp; Phone help</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
