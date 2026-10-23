import type { ReactNode } from "react";

export const coffeeUrl = "https://buymeacoffee.com/conatus";

export function Header(_props: { showAuth?: boolean } = {}) {
  return (
    <header className="site-header">
      <a href="/#top" className="brand" aria-label="Conatus home"><img className="brand-mark" src="/logo.png" alt="" aria-hidden="true" /><span>Conatus</span><small>Games</small></a>
      <div className="header-actions"><a href="/store" className="header-store">Store</a></div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand"><a href="/#top" className="footer-logo">Conatus</a><p>Independent browser games<br />about history and economics.</p></div>
        <div className="footer-column"><p className="footer-heading">Explore</p><a href="/store">Store</a><a href="/games">Games</a><a href="/about">About us</a></div>
        <div className="footer-column"><p className="footer-heading">Contact</p><a href="/contact">Email us</a><a href={coffeeUrl} target="_blank" rel="noreferrer">Buy us a coffee</a></div>
        <div className="footer-column"><p className="footer-heading">Information</p><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a></div>
      </div>
      <div className="footer-bottom"><span>© 2026 Conatus Games</span></div>
    </footer>
  );
}

export function PageShell({ eyebrow, title, intro, children, showBack = true, showEyebrow = true }: { eyebrow: string; title: string; intro: string; children: ReactNode; showBack?: boolean; showEyebrow?: boolean }) {
  return <div className="basic-page"><div className="site-shell"><Header showAuth /></div><main className="basic-main">{showBack && <a className="back-link" href="/#top">← Back to Conatus</a>}<header className="basic-header">{showEyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{intro}</p></header><section className="basic-content">{children}</section></main><Footer /></div>;
}
