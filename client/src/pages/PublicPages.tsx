import { useEffect, useRef, useState } from "react";
import { games } from "../content/games";
import { coffeeUrl, Footer, Header, PageShell } from "../components/SiteChrome";
import panzerIvIcon from "../../../game/eastern-front/assets/equipment/icons/panzer-iv.svg?url";
import stugIiiIcon from "../../../game/eastern-front/assets/equipment/icons/stug-iii.svg?url";
import tigerIcon from "../../../game/eastern-front/assets/equipment/icons/tiger-i.svg?url";
import t34Icon from "../../../game/eastern-front/assets/equipment/icons/t34-76.svg?url";
import kv1Icon from "../../../game/eastern-front/assets/equipment/icons/kv-1.svg?url";
import katyushaIcon from "../../../game/eastern-front/assets/equipment/icons/katyusha.svg?url";
import nebelwerferIcon from "../../../game/eastern-front/assets/equipment/icons/nebelwerfer.svg?url";
import wehrmachtGameplay from "../assets/gameplay/eastern-front-wehrmacht.png";
import redArmyGameplay from "../assets/gameplay/eastern-front-red-army.png";
import commandGameplay from "../assets/gameplay/eastern-front-command.png";
import frontlineGameplay from "../assets/gameplay/eastern-front-frontline.png";
import deploymentCloseGameplay from "../assets/gameplay/eastern-front-deployment-close.png";
import lohhausenTownPlan from "../assets/gameplay/lohhausen-town-plan.png";
import lohhausenPlanningSession from "../assets/gameplay/lohhausen-planning-session.png";
import lohhausenSessionRecap from "../assets/gameplay/lohhausen-session-recap.png";
import tanalandProgramme from "../assets/gameplay/tanaland-programme.png";
import tanalandReport from "../assets/gameplay/tanaland-report.png";
import tanalandVerdict from "../assets/gameplay/tanaland-verdict.png";

const equipment = [
  ["Panzer III / IV", "Armoured breakthrough", panzerIvIcon],
  ["StuG III", "Assault guns", stugIiiIcon],
  ["Tiger I", "Heavy armour", tigerIcon],
  ["T-34 / 76", "Soviet armour", t34Icon],
  ["KV-1", "Heavy defence", kv1Icon],
  ["Katyusha", "Rocket artillery", katyushaIcon],
  ["Nebelwerfer 41", "Heavy fire support", nebelwerferIcon],
] as const;

const gameScreens = [
  wehrmachtGameplay,
  redArmyGameplay,
  commandGameplay,
  frontlineGameplay,
  deploymentCloseGameplay,
] as const;

const lohhausenScreens = [lohhausenTownPlan, lohhausenPlanningSession, lohhausenSessionRecap] as const;

const tanalandScreens = [tanalandProgramme, tanalandReport, tanalandVerdict] as const;

function GameScreenshots({ images, gameName, heading }: { images: readonly string[]; gameName: string; heading: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedImage(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("lightbox-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("lightbox-open");
    };
  }, [selectedImage]);

  function move(direction: number) {
    railRef.current?.scrollBy({ left: direction * Math.max(280, railRef.current.clientWidth * 0.72), behavior: "smooth" });
  }
  return <div className="game-screenshots"><div className="section-rule" /><div className="section-heading game-screenshots-heading"><h2>{heading}</h2><div><button type="button" onClick={() => move(-1)} aria-label="Show previous game images">←</button><button type="button" onClick={() => move(1)} aria-label="Show next game images">→</button></div></div><div className="game-screenshots-rail" ref={railRef}>{images.map((image, index) => <figure key={image}><button type="button" className="game-screenshot-trigger" onClick={() => setSelectedImage(image)} aria-label={`Open ${gameName} screenshot ${index + 1}`}><img src={image} alt={`${gameName} screenshot ${index + 1}`} loading="lazy" /></button></figure>)}</div>{selectedImage && <div className="screenshot-lightbox" role="dialog" aria-modal="true" aria-label="Game screenshot" onClick={() => setSelectedImage(null)}><div className="screenshot-lightbox-frame" onClick={(event) => event.stopPropagation()}><button type="button" className="screenshot-lightbox-close" onClick={() => setSelectedImage(null)} aria-label="Close screenshot">×</button><img src={selectedImage} alt={`${gameName} screenshot`} /></div></div>}</div>;
}

export function EasternFrontPage() {
  return (
    <div className="site-shell"><Header /><main className="product-page">
      <section className="product-layout product-hero">
        <div className="game-poster poster-stalingrad product-poster"><span className="poster-number">01</span><span className="poster-title">Eastern<br />Front</span><span className="poster-meta">Eastern Front · 1941—43</span><span className="poster-mark">C</span></div>
        <div className="product-info"><p className="eyebrow">Historical strategy game · Play now</p><h1>Eastern<br />Front</h1><p className="product-lead">A campaign game set on the Eastern Front from June 22, 1941 to August 23, 1943.</p><p className="product-description">Choose the German Reich or the USSR. Select units from the bottom panel, place them in the green zones around your cities, and watch them move toward the front. The campaign plays out across a connected map of cities between Germany and the Soviet Union.</p><div className="product-facts"><div><span>Setting</span><strong>Eastern Front</strong></div><div><span>Period</span><strong>1941—1943</strong></div><div><span>Format</span><strong>Browser game</strong></div></div></div>
      </section>
      <section className="product-section campaign-section"><div><p className="eyebrow">The campaign</p><h2>The Eastern Front, 1941—43.</h2></div><div className="overview-copy"><p>The game begins with Operation Barbarossa. The Wehrmacht starts in Germany and advances through a network of cities toward Moscow, the Volga, and Stalingrad.</p><p>The Soviet side begins with the Red Army across the map. Its campaign is about absorbing the first attack, holding key cities, and reaching the point where the advance can be stopped.</p></div></section>
      <section className="product-section command-section"><div className="section-heading product-section-heading"><h2>Choose your command</h2><p>Two sides. Two campaigns.</p></div><div className="command-grid"><article><p className="eyebrow">The Wehrmacht</p><h3>Drive deep.</h3><p>Start the invasion, move east from Germany, and try to reach the Volga and Moscow before the campaign slows down.</p></article><article><p className="eyebrow">The USSR</p><h3>Trade space for time.</h3><p>Begin under attack, hold the important cities, and keep the Red Army alive until the German advance can be turned back.</p></article></div></section>
      <GameScreenshots images={gameScreens} gameName="Eastern Front" heading="Inside the campaign" />
      <section className="product-section units-section"><div className="section-heading product-section-heading"><h2>On the map</h2><p>Historical equipment</p></div><div className="units-list">{equipment.map(([name, role, image]) => <div key={name}><img src={image} alt="" /><span>{name}</span><small>{role}</small></div>)}</div></section>
      <section className="product-section purchase-section" id="purchase"><div><p className="eyebrow">Browser edition</p><h2>Play Eastern Front.</h2><p className="purchase-note">The game runs directly in your browser. No installation or account is required.</p></div><div className="purchase-actions"><div className="purchase-card"><a className="purchase-launch" href="/play/eastern-front/index.html" target="_blank" rel="noopener noreferrer">Play Eastern Front</a></div><a className="coffee-link" href={coffeeUrl} target="_blank" rel="noreferrer"><span className="coffee-icon" aria-hidden="true">☕</span><span>Buy us a coffee</span></a></div></section>
    </main><Footer /></div>
  );
}

export function EstoniaPage() {
  return (
    <div className="site-shell"><Header /><main className="product-page">
      <section className="product-layout product-hero">
        <div className="game-poster poster-next product-poster"><span className="poster-number">02</span><span className="poster-title">Estonia<br />1992</span><span className="poster-meta">Estonia · 1992—94</span></div>
        <div className="product-info"><p className="eyebrow">Historical strategy game · In development</p><h1>Estonia: A Little Country that Could</h1><p className="product-lead">As Mart Laar, lead Estonia through the reforms that shaped its future.</p><p className="product-description">A browser game set in Estonia after 1991. Balance speed, stability, and public trust as you guide the country through monetary reform, banking discipline, privatisation, and the political cost of change.</p><div className="product-facts"><div><span>Setting</span><strong>Estonia</strong></div><div><span>Period</span><strong>1992—1994</strong></div><div><span>Format</span><strong>Browser game</strong></div></div></div>
      </section>
      <section className="product-section campaign-section"><div><p className="eyebrow">The campaign</p><h2>Estonia after 1991.</h2></div><div className="overview-copy"><p>The game begins in the first years of restored independence. The Soviet inheritance, an empty treasury, and a worthless rouble give way to the kroon, a balanced budget, and the painful work of building institutions.</p><p>Each month opens with the minister’s morning: a briefing, the numbers, the letters, and one decision. Reforms can cause short-term pain before producing long-term improvement.</p></div></section>
      <section className="product-section purchase-section" id="purchase"><div><p className="eyebrow">Browser edition</p><h2>Play Estonia 1992.</h2><p className="purchase-note">The game runs directly in your browser. No installation or account is required. This build is still in development.</p></div><div className="purchase-actions"><div className="purchase-card"><a className="purchase-launch" href="/play/estonia-1992/index.html" target="_blank" rel="noopener noreferrer">Play Estonia 1992</a></div><a className="coffee-link" href={coffeeUrl} target="_blank" rel="noreferrer"><span className="coffee-icon" aria-hidden="true">☕</span><span>Buy us a coffee</span></a></div></section>
    </main><Footer /></div>
  );
}

export function LohhausenPage() {
  return (
    <div className="site-shell"><Header /><main className="product-page">
      <section className="product-layout product-hero">
        <div className="game-poster poster-lohhausen product-poster"><span className="poster-number">03</span><span className="poster-title">Lohhausen<br />1981</span><span className="poster-meta">Lohhausen · 1981—91</span></div>
        <div className="product-info"><p className="eyebrow">Simulation game · Play now</p><h1>Lohhausen<br />1981</h1><p className="product-lead">You are the mayor of a town of 3,700 people whose watch factory pays most of the wages. You hold office for ten years, and nobody can vote you out.</p><p className="product-description">Eight planning sessions, each covering the next fifteen months. Order housing, roads, schooling and repairs, set the taxes and the wages, and then watch what the town does with your decisions.</p><div className="product-facts"><div><span>Setting</span><strong>Lohhausen</strong></div><div><span>Period</span><strong>1981—1991</strong></div><div><span>Format</span><strong>Browser game</strong></div></div></div>
      </section>
      <section className="product-section campaign-section"><div><p className="eyebrow">The campaign</p><h2>Ten years, eight sessions.</h2></div><div className="overview-copy"><p>Lohhausen is a reconstruction of the town microworld of Dörner, Kreuzig, Reither and Stäudel (1983) — the town called Greenvale in the English edition of <em>The Logic of Failure</em>.</p></div></section>
      <GameScreenshots images={lohhausenScreens} gameName="Lohhausen" heading="Inside the term" />
      <section className="product-section purchase-section" id="purchase"><div><p className="eyebrow">Browser edition</p><h2>Play Lohhausen 1981.</h2><p className="purchase-note">The game runs directly in your browser. No installation or account is required.</p></div><div className="purchase-actions"><div className="purchase-card"><a className="purchase-launch" href="/play/lohhausen/index.html" target="_blank" rel="noopener noreferrer">Play Lohhausen</a></div><a className="coffee-link" href={coffeeUrl} target="_blank" rel="noreferrer"><span className="coffee-icon" aria-hidden="true">☕</span><span>Buy us a coffee</span></a></div></section>
    </main><Footer /></div>
  );
}

export function TanalandPage() {
  return (
    <div className="site-shell"><Header /><main className="product-page">
      <section className="product-layout product-hero">
        <div className="game-poster poster-tanaland product-poster"><span className="poster-number">04</span><span className="poster-title">Tanaland</span><span className="poster-meta">Tanaland · Ten years</span></div>
        <div className="product-info"><p className="eyebrow">Simulation game · Play now</p><h1>Tanaland</h1><p className="product-lead">Take charge of a developing country for ten years — the planning exercise from Dietrich Dörner’s <em>The Logic of Failure</em>.</p><p className="product-description">Six planning sessions of twenty months. Choose from nine measures — tsetse control, deep wells, irrigation, fertiliser, pest control, family planning, a health service, herd culling and mechanised farming — and commission surveys when you would rather look than guess.</p><div className="product-facts"><div><span>Setting</span><strong>Tanaland</strong></div><div><span>Period</span><strong>Ten years</strong></div><div><span>Format</span><strong>Browser game</strong></div></div></div>
      </section>
      <GameScreenshots images={tanalandScreens} gameName="Tanaland" heading="Inside the ten years" />
      <section className="product-section purchase-section" id="purchase"><div><p className="eyebrow">Browser edition</p><h2>Play Tanaland.</h2><p className="purchase-note">The game runs directly in your browser. No installation or account is required.</p></div><div className="purchase-actions"><div className="purchase-card"><a className="purchase-launch" href="/play/tanaland/index.html" target="_blank" rel="noopener noreferrer">Play Tanaland</a></div><a className="coffee-link" href={coffeeUrl} target="_blank" rel="noreferrer"><span className="coffee-icon" aria-hidden="true">☕</span><span>Buy us a coffee</span></a></div></section>
    </main><Footer /></div>
  );
}

export function StorePage() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGames = games.filter((game) => game.searchText.includes(normalizedQuery));

  return <div className="store-page"><header className="library-header"><a href="/" className="brand"><img className="brand-mark" src="/logo.png" alt="" aria-hidden="true" /><span>Conatus</span><small>Games</small></a><nav><a className="active" href="/store">Store</a><a href="/games">Games</a></nav></header><main className="store-main"><div className="store-heading"><div><p className="eyebrow">Conatus catalogue</p><h1>Store</h1><p>Browse the games made by Conatus.</p></div><label className="store-search"><span>Search</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games" aria-label="Search games" /></label></div><div className="store-grid">{visibleGames.map((game) => <a className="store-card" href={game.href} key={game.id}><div className={`game-poster ${game.poster}`}><span className="poster-number">{game.id}</span><span className="poster-title">{game.title}</span><span className="poster-meta">{game.meta}</span>{game.poster === "poster-stalingrad" && <span className="poster-mark">C</span>}</div><div className="store-card-info"><div><h2>{game.title}</h2><p>{game.description}</p></div><div className="store-card-price"><strong>{game.price}</strong><span>{game.status}</span></div></div></a>)}</div>{visibleGames.length === 0 && <div className="store-no-results"><p className="eyebrow">No results</p><h2>Nothing matches “{query}”.</h2><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}</main><Footer /></div>;
}

export function GamesPage() {
  return <PageShell eyebrow="The catalogue" title="Games" intro="Browse the games made by Conatus."><div className="basic-games-grid">{games.map((game) => <a className="basic-game-card" href={game.href} key={game.id}><div className={`game-poster ${game.poster}`}><span className="poster-number">{game.id}</span><span className="poster-title">{game.title}</span><span className="poster-meta">{game.meta}</span>{game.poster === "poster-stalingrad" && <span className="poster-mark">C</span>}</div><div><p className="eyebrow">{game.status}</p><h2>{game.title}</h2><p>{game.description}</p></div></a>)}</div></PageShell>;
}

export function AboutPage() {
  return <PageShell eyebrow="About Conatus" title="About us" intro="Conatus is an independent studio making simple, fun games." showBack={false} showEyebrow={false}><div className="basic-copy"><p>We build games around real places and real decisions. Each project starts with research and becomes something you can play right away.</p><p>Our games are easy to pick up, quick to play, and made to be replayed.</p></div></PageShell>;
}

export function ContactPage() {
  return <PageShell eyebrow="Contact" title="Contact us" intro="For general questions, write to us directly." showBack={false} showEyebrow={false}><div className="basic-copy"><p><a className="basic-email" href="mailto:hello@conatus.games">hello@conatus.games</a></p><p>We’ll use this address for general questions, studio enquiries, and anything that does not fit under support.</p></div></PageShell>;
}

export function SupportPage() {
  return <PageShell eyebrow="Help" title="Support" intro="Need help with an account, purchase, or game access?"><div className="basic-copy"><p>Send the details to <a className="basic-email" href="mailto:hello@conatus.games">hello@conatus.games</a> and include the game you are asking about.</p><p>We’ll add a dedicated support system here as the store and accounts become fully operational.</p></div></PageShell>;
}

export function PrivacyPage() {
  return <PageShell eyebrow="Information" title="Privacy policy" intro="A simple overview of how Conatus will handle player information." showBack={false} showEyebrow={false}><div className="basic-copy"><h2>What we collect</h2><p>When accounts and purchases are active, we may collect the information needed to provide access to games, manage accounts, and handle support requests.</p><h2>How we use it</h2><p>We use account and purchase information to provide the service, communicate about access, and keep the store secure. We do not sell personal information.</p><h2>Questions</h2><p>For privacy questions, contact <a className="basic-email" href="mailto:hello@conatus.games">hello@conatus.games</a>.</p></div></PageShell>;
}

export function TermsPage() {
  return <PageShell eyebrow="Information" title="Terms of use" intro="The basic terms for using Conatus games and services." showBack={false} showEyebrow={false}><div className="basic-copy"><h2>Using our games</h2><p>Games purchased from Conatus are for personal use. Please do not copy, resell, or redistribute them.</p><h2>Accounts and purchases</h2><p>You are responsible for keeping your account secure. Purchase and access details will be shown clearly at checkout before a transaction is completed.</p><h2>Questions</h2><p>If you have a question about these terms, contact <a className="basic-email" href="mailto:hello@conatus.games">hello@conatus.games</a>.</p></div></PageShell>;
}

export function NotFoundPage() {
  return <PageShell eyebrow="404" title="Page not found" intro="This page does not exist or has moved." showBack={false}><div className="basic-copy"><p><a className="basic-email" href="/">Return to Conatus</a></p></div></PageShell>;
}

export function HomePage() {
  const railRef = useRef<HTMLDivElement>(null);
  function moveRail(direction: number) {
    railRef.current?.scrollBy({ left: direction * Math.max(320, railRef.current.clientWidth * 0.8), behavior: "smooth" });
  }
  return <div className="site-shell"><Header showAuth /><main id="top"><section className="hero"><div className="hero-intro"><p className="eyebrow">Independent game studio</p><h1>We make simple, fun games.</h1></div></section><section className="featured-section"><div className="section-rule" /><div className="section-heading featured-heading"><h2>Featured games</h2><p>Start here</p></div><a href="/games/eastern-front" className="featured-row"><div className="game-poster poster-stalingrad featured-poster"><span className="poster-number">01</span><span className="poster-title">Eastern<br />Front</span><span className="poster-meta">Eastern Front · 1941—43</span><span className="poster-mark">C</span></div><div className="featured-copy"><h2>Eastern Front</h2><p>Choose the Wehrmacht or the USSR, deploy your forces across the Eastern Front, and survive the campaign from Barbarossa to Stalingrad.</p><span className="featured-link">View game</span></div></a><a href="/games/estonia-1992" className="featured-row featured-row-reverse"><div className="game-poster poster-next featured-poster"><span className="poster-number">02</span><span className="poster-title">Estonia<br />1992</span><span className="poster-meta">Estonia · 1992—94</span></div><div className="featured-copy"><h2>Estonia: A Little Country that Could</h2><p>As Mart Laar, lead Estonia through the reforms that shaped its future as you balance speed, stability, and public trust.</p><span className="featured-link">In development</span></div></a></section><section id="games" className="games-section"><div className="section-rule" /><div className="section-heading"><h2>The games</h2><div className="rail-nav"><button type="button" onClick={() => moveRail(-1)} aria-label="Show previous games">←</button><button type="button" onClick={() => moveRail(1)} aria-label="Show next games">→</button></div></div><div className="games-grid" ref={railRef}>{games.map((game) => <a href={game.href} className="game-entry" key={game.id}><div className={`game-poster ${game.poster}`}><span className="poster-number">{game.id}</span><span className="poster-title">{game.title}</span><span className="poster-meta">{game.meta}</span>{game.poster === "poster-stalingrad" && <span className="poster-mark">C</span>}</div><div className="game-entry-info"><div><h3>{game.title}</h3><p>{game.description}</p></div><span className="game-status">{game.price === "—" ? game.status : `${game.price} · ${game.status}`}</span></div></a>)}</div></section></main><Footer /></div>;
}
