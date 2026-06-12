import { Link } from "@tanstack/react-router";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display text-2xl block text-center mb-10">
          veoo<span className="text-gold">.</span>
        </Link>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-soft">
          <h1 className="font-display text-2xl mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>}
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
