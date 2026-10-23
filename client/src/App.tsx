import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from "react";

const EasternFrontPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.EasternFrontPage })));
const StorePage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.StorePage })));
const GamesPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.GamesPage })));
const AboutPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.ContactPage })));
const SupportPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.SupportPage })));
const PrivacyPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.TermsPage })));
const HomePage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.HomePage })));
const NotFoundPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.NotFoundPage })));

function RouteView() {
  const pathname = window.location.pathname;

  if (pathname === "/store") return <StorePage />;
  if (pathname === "/games") return <GamesPage />;
  if (pathname === "/about") return <AboutPage />;
  if (pathname === "/contact") return <ContactPage />;
  if (pathname === "/support") return <SupportPage />;
  if (pathname === "/privacy") return <PrivacyPage />;
  if (pathname === "/terms") return <TermsPage />;
  if (pathname === "/games/eastern-front" || pathname === "/games/operation-stalingrad") return <EasternFrontPage />;
  if (pathname === "/") return <HomePage />;
  return <NotFoundPage />;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Keep the fallback local to the app; production error reporting can be added later.
  }

  render() {
    return this.state.hasError ? <div className="session-loading"><div><p>Something went wrong.</p><a href="/">Return to Conatus</a></div></div> : this.props.children;
  }
}

function App() {
  return <AppErrorBoundary><Suspense fallback={<div className="session-loading">Loading…</div>}><RouteView /></Suspense></AppErrorBoundary>;
}

export default App;
