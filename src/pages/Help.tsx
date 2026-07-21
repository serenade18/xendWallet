import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Search, ChevronRight, ChevronLeft, AlertTriangle, MessageCircleQuestion, HelpCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import {
  Drawer, DrawerContent,
} from "@/components/ui/drawer";

type FaqArticle = {
  question: string;
  content: string[];
};

const faqArticles: FaqArticle[] = [
  {
    question: "Which Documents Are Accepted for Identity Verification?",
    content: [
      "We accept the following government-issued documents for identity verification:",
      "• National ID card (front and back)",
      "• International passport (photo page)",
      "• Driver's license (front and back)",
      "• Residence permit",
      "Please ensure your document is valid (not expired), the photo is clear and legible, and all four corners of the document are visible in the image.",
      "Documents in non-Latin scripts may require a certified translation. Processing typically takes 1–3 business days.",
    ],
  },
  {
    question: "In which currency is my balance stored?",
    content: [
      "Your Xend balance is stored in USD (USD Coin), a stablecoin pegged 1:1 to the US Dollar.",
      "This means 1 USD ≈ $1.00 USD at all times. Your balance is held on-chain and fully backed by reserves.",
      "We chose USD because it offers:",
      "• Price stability — no volatile swings like other cryptocurrencies",
      "• Fast transfers — send money globally in seconds",
      "• Low fees — minimal transaction costs compared to traditional banking",
      "• Transparency — reserves are regularly audited by independent firms",
      "You can top up your balance using supported payment methods and withdraw to your bank at any time.",
    ],
  },
  {
    question: "Why Is Identity Verification Necessary?",
    content: [
      "Identity verification (KYC) is required by financial regulations to prevent fraud, money laundering, and terrorist financing.",
      "By verifying your identity, we ensure:",
      "• Your account security — only you can access your funds",
      "• Regulatory compliance — we follow international AML/KYC standards",
      "• Higher transaction limits — verified users enjoy increased sending and withdrawal limits",
      "• Trust — every user on the platform is verified, reducing scam risk",
      "Your personal data is encrypted and stored securely. We never share your information with third parties without your consent.",
    ],
  },
  {
    question: "Getting Started with Xend",
    content: [
      "Welcome to Xend! Here's how to get started in a few simple steps:",
      "1. Create your account — Sign up with your email and verify it.",
      "2. Set up your wallet — Your Xend wallet is created automatically. It's a secure, non-custodial wallet powered by MPC technology.",
      "3. Complete verification — Submit your ID to unlock full features and higher limits.",
      "4. Top up your balance — Add funds using supported payment methods (bank transfer, card, or crypto deposit).",
      "5. Start sending — Send money to anyone using just their email address. Recipients who don't have a Xend account yet will be invited automatically.",
      "Need help? Tap 'Ask a question' below to chat with our AI support agent or reach our team directly.",
    ],
  },
];

const Help = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [helpSearch, setHelpSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<FaqArticle | null>(null);

  const filtered = helpSearch
    ? faqArticles.filter((a) => a.question.toLowerCase().includes(helpSearch.toLowerCase()))
    : faqArticles;

  return (
    <div className="min-h-[100dvh] bg-background pb-20 md:pb-8">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[90vw] max-w-[500px] rounded-full bg-primary/6 blur-[80px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/30">
        <div className="mx-auto max-w-lg flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary/40 transition-colors">
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Help</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-lg px-4 py-5 space-y-4">
        {/* Greeting */}
        <div className="animate-slide-up">
          <h2 className="text-2xl font-bold text-foreground">How can we help?</h2>
          <p className="text-sm text-muted-foreground mt-1">Search or browse frequently asked questions</p>
        </div>

        {/* Search */}
        <div className="relative animate-slide-up">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help"
            value={helpSearch}
            onChange={(e) => setHelpSearch(e.target.value)}
            className="pl-9 rounded-xl bg-card border-border/40"
          />
        </div>

        {/* FAQ List */}
        <div className="rounded-xl border border-border/40 bg-card/60 divide-y divide-border/30 overflow-hidden animate-slide-up">
          {filtered.length > 0 ? filtered.map((article, i) => (
            <button
              key={i}
              className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-foreground hover:bg-secondary/30 transition-colors text-left"
              onClick={() => setSelectedArticle(article)}
            >
              <span>{article.question}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          )) : (
            <p className="px-4 py-3.5 text-sm text-muted-foreground">No results found</p>
          )}
        </div>

        {/* Create a ticket */}
        <button
          className="w-full rounded-xl border border-border/40 bg-card/60 px-4 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors animate-slide-up"
          onClick={() => {}}
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Create a ticket</p>
            <p className="text-xs text-muted-foreground">Report an issue or request support</p>
          </div>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </button>

        {/* Ask a question */}
        <button
          className="w-full rounded-xl border border-border/40 bg-card/60 px-4 py-3.5 flex items-center justify-between hover:bg-secondary/30 transition-colors animate-slide-up"
          onClick={() => {}}
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Ask a question</p>
            <p className="text-xs text-muted-foreground">AI Agent and team can help</p>
          </div>
          <MessageCircleQuestion className="h-4 w-4 text-primary" />
        </button>
      </main>

      {/* Article Drawer */}
      <Drawer open={!!selectedArticle} onOpenChange={(open) => { if (!open) setSelectedArticle(null); }}>
        <DrawerContent className="max-w-lg mx-auto max-h-[85dvh]">
          {selectedArticle && (
            <div className="px-5 pb-8 pt-2 overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-5">
                <h3 className="text-lg font-bold text-foreground leading-snug">{selectedArticle.question}</h3>
                <button onClick={() => setSelectedArticle(null)} className="shrink-0 mt-0.5 h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary/40 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-3">
                {selectedArticle.content.map((paragraph, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <BottomNav />
    </div>
  );
};

export default Help;
