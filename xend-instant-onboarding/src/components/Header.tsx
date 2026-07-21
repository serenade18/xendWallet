import { useNavigate } from "react-router-dom";
import XendLogo from "@/components/XendLogo";
import { Button } from "@/components/ui/button";

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-foreground/95 backdrop-blur-xl rounded-b-[24px] sm:rounded-b-[32px] mx-2 sm:mx-4 mt-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <XendLogo variant="full" className="h-7 brightness-0 invert" />
        </div>
        <nav className="hidden sm:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-background/70 hover:text-background transition-colors">Features</a>
          <a href="#app" className="text-sm font-medium text-background/70 hover:text-background transition-colors">App</a>
        </nav>
        <Button
          size="sm"
          onClick={() => navigate("/auth")}
          className="rounded-full px-6 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Join the Waitlist
        </Button>
      </div>
    </header>
  );
};

export default Header;
