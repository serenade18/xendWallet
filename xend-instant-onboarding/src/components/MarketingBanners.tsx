import { useState, useEffect } from "react";
import { Globe, Send, CreditCard, TrendingUp } from "lucide-react";

const banners = [
  {
    icon: Globe,
    title: "Send Money to 100+ Countries",
    subtitle: "Send money to 100+ countries instantly with low fees and fast delivery.",
  },
  {
    icon: Send,
    title: "Free Xend to Xend Transfers",
    subtitle: "Free transfers between Xend users — instant, zero fees, worldwide.",
  },
  {
    icon: CreditCard,
    title: "Spend Globally with Xend Card",
    subtitle: "Spend globally with the Xend card — accepted everywhere, no hidden charges.",
  },
  {
    icon: TrendingUp,
    title: "Earn Yield on Your USD",
    subtitle: "Earn yield on your USD balance — put your money to work while you hold.",
  },
];

const MarketingBanners = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = banners[index];
  const Icon = banner.icon;

  return (
    <div className="animate-slide-up">
      <div className="relative w-full rounded-2xl bg-primary p-5 text-left overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-foreground/20 rounded-l-2xl" />
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-primary-foreground leading-tight mb-1">
              {banner.title}
            </h3>
            <p className="text-[13px] text-primary-foreground/70">
              {banner.subtitle}
            </p>
          </div>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary-foreground" : "w-1.5 bg-primary-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketingBanners;
