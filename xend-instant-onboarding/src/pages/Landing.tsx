import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

// Assets
import heroImage from "@/assets/xend-hero.png";
import cardOverviewImage from "@/assets/xend-card-overview.png";
import topupImage from "@/assets/xend-topup.png";
import appleWalletImage from "@/assets/xend-apple-wallet.png";
import cardFlatImage from "@/assets/xend-card-flat.png";
import payGoogle from "@/assets/pay-google.png";
import payApple from "@/assets/pay-apple.png";
import paySamsung from "@/assets/pay-samsung.png";
import cryptoUsdc from "@/assets/crypto-usdc.png";
import cryptoUsdt from "@/assets/crypto-usdt.png";
import cryptoBtc from "@/assets/crypto-btc.png";
import iconCashback from "@/assets/icon-cashback.png";
import iconBank from "@/assets/icon-bank.png";
import iconTransfer from "@/assets/icon-transfer.png";
import iconAi from "@/assets/icon-ai.png";
import iconGlobe from "@/assets/icon-globe.png";
import iconVisa from "@/assets/icon-visa.png";
import flagsBanner from "@/assets/flags-banner.png";
import aiPreview from "@/assets/ai-preview.png";
import rewardsPreview from "@/assets/rewards-preview.png";
import footerCard1 from "@/assets/footer-card-1.png";
import footerCard2 from "@/assets/footer-card-2.png";

// ── FAQ Data ──
const faqs = [
  {
    q: "What is Xend?",
    a: "Xend is an all-in-one financial app that lets you top up with crypto or bank transfers, store your funds securely, and spend globally using a Visa card. You can manage subscriptions, shop online or in-store, and track all your transactions in real time — all from the Xend app.",
  },
  {
    q: "Are there any fees for registration or getting the card?",
    a: "Creating a Xend account is completely free. A small one-time fee of $5 USD may apply when issuing your virtual Visa card.",
  },
  {
    q: "Are there any fees for using the card or account?",
    a: "Xend keeps fees transparent and minimal. Some services such as currency conversion, withdrawals, or certain transfers may include small processing fees.",
  },
  {
    q: "How do I get the card?",
    a: "Simply download the Xend app, create your account, and complete a quick identity verification (KYC), which usually takes just a few minutes. Once verified, you can instantly issue your virtual Visa card inside the app.",
  },
  {
    q: "How can I fund my account?",
    a: "You can fund your Xend account using crypto deposits (USDT or USDC via supported networks) or bank transfers (ACH / Wire for US accounts). Funds are credited once the transfer is confirmed.",
  },
  {
    q: "How do I withdraw my funds?",
    a: "You can withdraw your funds directly from the Xend app by sending crypto to an external wallet. Additional withdrawal options, including bank withdrawals, will be available soon.",
  },
  {
    q: "How do I contact customer support?",
    a: "You can contact our support team directly through the in-app chat inside the Xend app, or visit our Help Center for answers to common questions.",
  },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/20 last:border-0" onClick={() => setOpen(!open)}>
      <button className="flex w-full items-center justify-between py-5 text-left">
        <span className="text-base font-semibold text-foreground">{q}</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 ml-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-60 pb-5" : "max-h-0"}`}>
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
};

// ── Animations CSS (inline keyframes via style tag) ──
const animationStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-12px); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-60px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(60px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .anim-float { animation: float 4s ease-in-out infinite; }
  .anim-fade-up { animation: fadeInUp 0.8s ease-out both; }
  .anim-fade-up-d1 { animation: fadeInUp 0.8s ease-out 0.15s both; }
  .anim-fade-up-d2 { animation: fadeInUp 0.8s ease-out 0.3s both; }
  .anim-fade-up-d3 { animation: fadeInUp 0.8s ease-out 0.45s both; }
  .anim-scale-in { animation: scaleIn 0.8s ease-out 0.2s both; }
  .anim-slide-left { animation: slideInLeft 0.8s ease-out both; }
  .anim-slide-right { animation: slideInRight 0.8s ease-out both; }
  .marquee-track { animation: marquee 20s linear infinite; }
`;

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background overflow-x-hidden">
      <style>{animationStyles}</style>
      <Header />

      {/* ════════════ HERO ════════════ */}
      <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-12 sm:pt-28 lg:pt-36">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="max-w-xl anim-fade-up">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-foreground tracking-tight leading-[1.08]">
              A powerful virtual card inside the Xend App
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-md">
              Top up with crypto. Spend anywhere.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="mt-8 h-14 px-10 text-base font-bold rounded-full"
            >
              Join the Waitlist
            </Button>
          </div>
          <div className="relative flex items-center justify-center lg:justify-end anim-scale-in">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] rounded-full bg-primary/15 blur-[100px] pointer-events-none" />
            <img
              src={heroImage}
              alt="Xend App showing card overview and Apple Wallet"
              className="relative z-10 w-[320px] sm:w-[400px] lg:w-[480px] drop-shadow-2xl anim-float"
            />
          </div>
        </div>

        {/* Payment method icons row */}
        <div className="flex items-center justify-center gap-6 mt-16 anim-fade-up-d2">
          {[payGoogle, payApple, paySamsung].map((img, i) => (
            <img key={i} src={img} alt="Payment method" className="h-10 sm:h-12 opacity-80 hover:opacity-100 transition-opacity" />
          ))}
        </div>
      </section>

      {/* ════════════ GET YOUR CARD ════════════ */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-[80px] pointer-events-none" />
              <img src={cardOverviewImage} alt="Xend Card Overview" className="relative z-10 w-[280px] sm:w-[340px] drop-shadow-2xl anim-float" />
            </div>
          </div>
          <div className="order-1 lg:order-2 anim-fade-up">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              Get your Card <span className="text-primary">Today</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">
              Issue a virtual or metal Visa card in minutes and start spending worldwide.
            </p>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="mt-6 rounded-full px-6 font-semibold border-border/60">
              Get Your Card <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Card flat display */}
        <div className="mt-16 flex justify-center anim-fade-up-d1">
          <img src={cardFlatImage} alt="Xend Visa Card" className="w-full max-w-xl rounded-2xl" />
        </div>
      </section>

      {/* ════════════ FREE CRYPTO & FIAT TOP-UP ════════════ */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="anim-fade-up">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              Free Crypto & <span className="text-primary">Fiat Top-Up</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">
              Easy top up, fast processing. 0% commission.
            </p>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="mt-6 rounded-full px-6 font-semibold border-border/60">
              Top-Up & Spend <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-[80px] pointer-events-none" />
              <img src={topupImage} alt="Top up interface" className="relative z-10 w-[280px] sm:w-[340px] drop-shadow-2xl anim-float" />
            </div>
          </div>
        </div>

        {/* Crypto icons */}
        <div className="flex items-center justify-center gap-6 mt-12 anim-fade-up-d1">
          {[cryptoUsdc, cryptoUsdt, cryptoBtc].map((img, i) => (
            <img key={i} src={img} alt="Cryptocurrency" className="h-10 sm:h-12 opacity-80 hover:opacity-100 transition-opacity" />
          ))}
        </div>
      </section>

      {/* ════════════ SPEND WITH FULL CONTROL ════════════ */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="anim-fade-up">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              Spend with <span className="text-primary">Full Control</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md">
              Shop online, in stores or abroad and track every transaction in real time.
            </p>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")} className="mt-6 rounded-full px-6 font-semibold border-border/60">
              Get the App <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-[80px] pointer-events-none" />
              <img src={appleWalletImage} alt="Apple Wallet with Xend card" className="relative z-10 w-[280px] sm:w-[340px] drop-shadow-2xl anim-float" />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FEATURE BENTO GRID ════════════ */}
      <section id="app" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Cashback */}
          <div className="rounded-3xl border border-border/40 bg-card/80 p-8 hover:border-primary/30 transition-all anim-fade-up">
            <img src={iconCashback} alt="" className="h-10 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Cashback and Rewards</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Earn $5 for every friend you invite and receive 25% cashback in Xend Points whenever they spend.
            </p>
            <img src={rewardsPreview} alt="Rewards" className="w-full rounded-2xl" />
          </div>

          {/* Virtual Bank Account */}
          <div className="rounded-3xl border border-border/40 bg-card/80 p-8 hover:border-primary/30 transition-all anim-fade-up-d1">
            <img src={iconBank} alt="" className="h-10 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Virtual Bank Account</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Receive international transfers, service payments, and payouts directly to your Xend balance.
            </p>
          </div>

          {/* Money Transfer */}
          <div className="rounded-3xl border border-border/40 bg-card/80 p-8 hover:border-primary/30 transition-all anim-fade-up-d2">
            <img src={iconTransfer} alt="" className="h-10 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Money Transfer</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Send money instantly to friends, transfer crypto to external wallets, or send funds to bank accounts — fast, secure, and simple.
            </p>
          </div>

          {/* AI Assistance */}
          <div className="rounded-3xl border border-border/40 bg-card/80 p-8 hover:border-primary/30 transition-all anim-fade-up-d3">
            <img src={iconAi} alt="" className="h-10 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">AI Assistance</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Xend AI helps you manage your finances with smart insights, automated actions, and instant support inside the app.
            </p>
            <img src={aiPreview} alt="AI Preview" className="w-full max-w-[200px] rounded-2xl mx-auto" />
          </div>

          {/* 150 countries — full width */}
          <div className="md:col-span-2 rounded-3xl border border-border/40 bg-card/80 p-8 hover:border-primary/30 transition-all anim-fade-up">
            <img src={iconGlobe} alt="" className="h-10 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Use your card in over 150 countries. Easy KYC.</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Verify your identity in minutes with our fast and secure KYC process, available in most major regions.
            </p>
            <img src={flagsBanner} alt="Supported countries" className="w-full max-w-2xl mx-auto" />
          </div>

          {/* Visa Signature — full width */}
          <div className="md:col-span-2 rounded-3xl border border-border/40 bg-card/80 p-8 hover:border-primary/30 transition-all anim-fade-up">
            <img src={iconVisa} alt="" className="h-10 mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Visa Signature® benefits</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              As a Visa partner, Xend provides only Visa Signature® cards. Enjoy premium benefits like airport lounge access, travel accident insurance, and emergency medical & dental coverage.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════ FAQ ════════════ */}
      <section className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight text-center mb-4">
          FAQs
        </h2>
        <p className="text-center text-muted-foreground text-base mb-12">Most common questions.</p>
        <div className="rounded-3xl border border-border/40 bg-card/80 backdrop-blur-sm p-6 sm:p-8">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ════════════ CTA / DOWNLOAD ════════════ */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28 text-center">
        <div className="relative rounded-3xl bg-foreground p-12 sm:p-16 overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/15 blur-[100px] pointer-events-none" />

          {/* Floating cards */}
          <div className="relative z-10 flex justify-center gap-4 mb-8">
            <img src={footerCard1} alt="" className="h-28 sm:h-36 rounded-xl anim-float" style={{ animationDelay: "0s" }} />
            <img src={footerCard2} alt="" className="h-28 sm:h-36 rounded-xl anim-float" style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-background tracking-tight">
              Download Our App Now
            </h2>
            <p className="mt-4 text-base sm:text-lg text-background/60 max-w-lg mx-auto">
              Get the Xend app today and take full control of your money with seamless payments, global spending, and powerful financial tools.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button size="lg" onClick={() => navigate("/auth")} className="h-14 px-10 text-base font-bold rounded-full">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="border-t border-border/20 py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Xend. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#app" className="text-xs text-muted-foreground hover:text-foreground transition-colors">App</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
