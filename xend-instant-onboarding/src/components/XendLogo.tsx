import xendIcon from "@/assets/xend-icon.png";
import xendLogoLight from "@/assets/xend-logo-light.png";
import xendLogoDark from "@/assets/xend-logo-dark.png";

interface XendLogoProps {
  className?: string;
  variant?: "icon" | "full";
}

const XendLogo = ({ className = "h-5 w-5", variant = "icon" }: XendLogoProps) => {
  if (variant === "full") {
    return (
      <>
        <img src={xendLogoLight} alt="Xend" className={`${className} dark:hidden`} />
        <img src={xendLogoDark} alt="Xend" className={`${className} hidden dark:block`} />
      </>
    );
  }

  return (
    <img src={xendIcon} alt="Xend" className={className} />
  );
};

export default XendLogo;
