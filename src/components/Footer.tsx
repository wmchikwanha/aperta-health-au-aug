interface FooterProps {
  portfolioUrl?: string;
}

export const Footer = ({ portfolioUrl }: FooterProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-4 px-6 border-t border-border">
      <div className="container mx-auto flex justify-start">
        <div className="text-left space-y-0.5">
          <div className="flex items-center justify-start gap-1.5">
            <span className="text-muted-foreground/50 text-[10px]">©</span>
            <span className="text-muted-foreground/50 text-[10px]">{currentYear}</span>
            {portfolioUrl ? (
              <a 
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/70 hover:text-muted-foreground text-xs font-semibold tracking-wide transition-colors"
              >
                StratedgeAI
              </a>
            ) : (
              <span className="text-muted-foreground/70 text-xs font-semibold tracking-wide">
                StratedgeAI
              </span>
            )}
          </div>
          <p className="text-muted-foreground/45 text-[10px] font-normal">
            Developed by Walt C
          </p>
        </div>
      </div>
    </footer>
  );
};
