import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { planService } from "../services/api";

/* ── Icons ── */
const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">

    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/* ─────────────────────────────────────────────
   DESIGN DIRECTION:
   Nature · Forest · Earth — Clean & Minimal
   Palette: deep moss, warm linen, clay, bark
   Fonts: DM Serif Display (headings) + DM Sans (body)
   Mood: organic calm, grounded confidence, open air
───────────────────────────────────────────── */
const STYLES = ``; // reserved

const DARK_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  /* ── THEME TOGGLE BUTTON ── */
  .cf-theme-btn {
    width: 34px; height: 34px; padding: 0;
    border: 1px solid var(--border2); border-radius: 50%;
    background: var(--surface2); color: var(--muted);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .2s; flex-shrink: 0;
  }
  .cf-theme-btn:hover { background: var(--accent-soft); color: var(--accent); border-color: var(--accent-light); }
  .cf-theme-btn svg { width: 15px; height: 15px; }

  .cf-root {
    --bg:           #f8fafc;
    --bg2:          #f1f5f9;
    --surface:      #ffffff;
    --surface2:     #f8fafc;
    --border:       rgba(14,165,233,0.15);
    --border2:      rgba(14,165,233,0.25);
    --text:         #0f172a;
    --text2:        #334155;
    --muted:        #64748b;
    --accent:       #0284c7;
    --accent-mid:   #0ea5e9;
    --accent-light: #7dd3fc;
    --accent-soft:  rgba(2,132,199,0.08);
    --accent-glow:  rgba(2,132,199,0.18);
    --clay:         #ef4444;
    --clay-soft:    rgba(239,68,68,0.10);
    --sand:         #e2e8f0;
    --bark:         #475569;
    --green-vivid:  #10b981;
    --green-soft:   rgba(16,185,129,0.10);
    --serif:        'DM Serif Display', Georgia, serif;
    --sans:         'DM Sans', system-ui, sans-serif;
    --r:            12px;
    --r-lg:         18px;
    --r-xl:         28px;
    font-family: var(--sans);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    position: relative;
  }
  .cf-root *, .cf-root *::before, .cf-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .cf-root::before {
    content: '';
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 200px;
  }

  .cf-bg-glow {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse 70% 60% at 10% 5%,  rgba(2,132,199,0.06) 0%, transparent 65%),
      radial-gradient(ellipse 50% 40% at 90% 90%, rgba(16,185,129,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 40% 30% at 50% 50%, rgba(125,211,252,0.08) 0%, transparent 70%);
  }

  /* NAV */
  .cf-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    padding: 0 56px; height: 68px;
    display: flex; align-items: center; justify-content: space-between;
    backdrop-filter: blur(16px);
    background: rgba(247,244,239,0.88);
    border-bottom: 1px solid var(--border);
  }
  .cf-logo {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--serif); font-size: 20px; font-weight: 400;
    color: var(--text); text-decoration: none;
  }
  .cf-logo-icon {
    width: 32px; height: 32px; background: var(--accent);
    border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .cf-logo-dot { color: var(--clay); }
  .cf-nav-links { display: flex; align-items: center; gap: 36px; }
  .cf-nav-links a {
    font-size: 13px; font-weight: 500;
    color: var(--muted); text-decoration: none; transition: color .2s; position: relative;
  }
  .cf-nav-links a::after {
    content: ''; position: absolute; bottom: -3px; left: 0; right: 0;
    height: 1px; background: var(--accent); transform: scaleX(0);
    transition: transform .25s; transform-origin: left;
  }
  .cf-nav-links a:hover { color: var(--accent); }
  .cf-nav-links a:hover::after { transform: scaleX(1); }
  .cf-nav-actions { display: flex; align-items: center; gap: 10px; }

  /* BUTTONS */
  .cf-btn-ghost {
    padding: 8px 18px; border: 1px solid var(--border2); border-radius: 100px;
    font-family: var(--sans); font-size: 13px; font-weight: 500; color: var(--text2);
    background: transparent; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; gap: 6px; transition: all .2s;
  }
  .cf-btn-ghost:hover { background: var(--accent-soft); border-color: var(--accent-light); color: var(--accent); }
  .cf-btn-primary {
    padding: 9px 20px; border-radius: 100px; font-family: var(--sans);
    font-size: 13px; font-weight: 600; color: #fff; background: var(--accent);
    border: none; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; gap: 6px; transition: all .2s;
  }
  .cf-btn-primary:hover { background: var(--green-vivid); transform: translateY(-1px); box-shadow: 0 4px 16px var(--accent-glow); }
  .cf-btn-primary-lg {
    padding: 14px 28px; border-radius: 100px; font-family: var(--sans);
    font-size: 15px; font-weight: 600; color: #fff; background: var(--accent);
    border: none; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; gap: 8px; transition: all .25s;
    box-shadow: 0 2px 20px var(--accent-glow);
  }
  .cf-btn-primary-lg:hover { background: var(--green-vivid); transform: translateY(-2px); box-shadow: 0 6px 28px var(--accent-glow); }
  .cf-btn-secondary-lg {
    padding: 14px 28px; border-radius: 100px; font-family: var(--sans);
    font-size: 15px; font-weight: 500; color: var(--text2); background: transparent;
    border: 1px solid var(--border2); cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; gap: 8px; transition: all .25s;
  }
  .cf-btn-secondary-lg:hover { border-color: var(--accent-light); color: var(--accent); background: var(--accent-soft); }

  /* HERO */
  .cf-hero {
    position: relative; z-index: 1;
    padding: 140px 56px 80px; max-width: 1200px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center;
  }
  .cf-hero-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--green-soft); border: 1px solid var(--accent-light);
    border-radius: 100px; padding: 5px 14px 5px 8px;
    font-size: 11px; font-weight: 600; letter-spacing: .08em;
    text-transform: uppercase; color: var(--accent); margin-bottom: 28px;
  }
  .cf-pulse {
    width: 7px; height: 7px; border-radius: 50%; background: var(--accent-mid);
    animation: cfPulse 2.5s infinite;
  }
  @keyframes cfPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.4; transform:scale(.8); }
  }
  .cf-h1 {
    font-family: var(--serif);
    font-size: clamp(42px, 5vw, 66px); font-weight: 400; line-height: 1.08;
    letter-spacing: -.5px; margin-bottom: 22px; color: var(--text);
  }
  .cf-h1 em { font-style: italic; color: var(--accent); }
  .cf-hero-desc {
    font-size: 16px; line-height: 1.75; color: var(--muted);
    margin-bottom: 20px; font-weight: 400; max-width: 440px;
  }
  .cf-hero-saas-pill {
    display: inline-flex; align-items: center; gap: 20px;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 100px; padding: 8px 18px; margin-bottom: 32px;
    font-size: 12px; font-weight: 600; color: var(--muted);
    letter-spacing: .03em;
  }
  .cf-hero-saas-pill span { display: flex; align-items: center; gap: 5px; }
  .cf-hero-saas-pill span svg { width: 12px; height: 12px; color: var(--accent); }
  .cf-hero-saas-sep { width: 1px; height: 12px; background: var(--border2); }
  .cf-hero-actions { display: flex; align-items: center; gap: 14px; margin-bottom: 48px; flex-wrap: wrap; }
  .cf-social-proof { display: flex; align-items: center; gap: 14px; }
  .cf-avatars { display: flex; }
  .cf-av {
    width: 30px; height: 30px; border-radius: 50%;
    border: 2px solid var(--bg); background: var(--accent-light);
    margin-left: -7px; display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; overflow: hidden; color: var(--accent);
  }
  .cf-av:first-child { margin-left: 0; }
  .cf-sp-text { font-size: 13px; color: var(--muted); font-weight: 400; }
  .cf-sp-text strong { color: var(--text2); font-weight: 600; }

  /* HERO CARD */
  .cf-hero-visual { position: relative; }
  .cf-hero-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-xl); padding: 28px; position: relative; overflow: hidden;
    box-shadow: 0 4px 32px rgba(58,94,58,0.08), 0 1px 4px rgba(0,0,0,0.04);
  }
  .cf-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
  .cf-card-title { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .06em; text-transform: uppercase; }
  .cf-live-badge {
    background: var(--green-soft); color: var(--green-vivid);
    font-size: 10px; font-weight: 700; letter-spacing: .06em;
    padding: 3px 10px; border-radius: 100px; text-transform: uppercase;
    border: 1px solid var(--accent-light);
  }
  .cf-stat-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 22px; }
  .cf-stat-box {
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r); padding: 14px;
  }
  .cf-stat-val { font-family: var(--serif); font-size: 26px; font-weight: 400; color: var(--text); line-height: 1; margin-bottom: 4px; }
  .cf-stat-lbl { font-size: 10px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
  .cf-stat-trend { font-size: 11px; font-weight: 600; color: var(--accent); margin-top: 4px; }
  .cf-chart-row { display: flex; align-items: flex-end; gap: 5px; height: 64px; margin-bottom: 18px; }
  .cf-bar {
    flex: 1; border-radius: 3px 3px 0 0; background: var(--accent-light);
    animation: cfGrow .8s ease forwards;
  }
  .cf-bar.active { background: var(--accent); }
  @keyframes cfGrow { from { transform: scaleY(0); transform-origin: bottom; } to { transform: scaleY(1); } }
  .cf-appt-list { display: flex; flex-direction: column; gap: 8px; }
  .cf-appt-item {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px;
  }
  .cf-appt-av {
    width: 34px; height: 34px; border-radius: 50%;
    background: var(--accent-soft); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; flex-shrink: 0;
  }
  .cf-appt-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .cf-appt-time { font-size: 11px; color: var(--muted); margin-top: 1px; }
  .cf-status {
    font-size: 10px; font-weight: 600; letter-spacing: .06em;
    padding: 3px 9px; border-radius: 100px; text-transform: uppercase; white-space: nowrap;
  }
  .cf-status-confirmed { background: var(--green-soft); color: var(--green-vivid); border: 1px solid var(--accent-light); }
  .cf-status-pending   { background: var(--clay-soft); color: var(--clay); border: 1px solid rgba(176,98,42,0.2); }
  .cf-float-stat {
    position: absolute; bottom: -18px; left: -22px;
    background: var(--surface); border: 1px solid var(--border2); border-radius: var(--r-lg);
    padding: 12px 16px; display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 28px rgba(2,132,199,0.12);
    animation: cfFloat 4s ease-in-out infinite;
  }
  @keyframes cfFloat {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-5px); }
  }
  .cf-float-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--green-soft); color: var(--green-vivid);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .cf-float-val { font-family: var(--serif); font-size: 19px; font-weight: 400; color: var(--text); line-height: 1; }
  .cf-float-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .07em; margin-top: 2px; }

  /* TRUST BAR */
  .cf-trust-bar {
    position: relative; z-index: 1;
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
    padding: 18px 56px; background: var(--bg2);
    display: flex; align-items: center; justify-content: center; gap: 52px;
  }
  .cf-trust-item { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .cf-trust-item svg { width: 14px; height: 14px; color: var(--accent); flex-shrink: 0; }

  /* PROBLEM SECTION */
  .cf-problem-section {
    position: relative; z-index: 1;
    padding: 96px 56px; max-width: 1200px; margin: 0 auto;
  }
  .cf-problem-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: start; margin-top: 48px;
  }
  .cf-pain-list { display: flex; flex-direction: column; gap: 12px; }
  .cf-pain-item {
    display: flex; align-items: flex-start; gap: 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 16px 18px;
    transition: border-color .2s, box-shadow .2s;
  }
  .cf-pain-item:hover { border-color: var(--border2); box-shadow: 0 2px 16px rgba(2,132,199,0.06); }
  .cf-pain-icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: var(--clay-soft); color: var(--clay);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px;
  }
  .cf-pain-text { font-size: 14px; color: var(--text2); line-height: 1.5; font-weight: 400; }
  .cf-problem-quote {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-xl); padding: 36px; position: sticky; top: 90px;
  }
  .cf-quote-mark { font-family: var(--serif); font-size: 72px; color: var(--accent-light); line-height: .8; margin-bottom: 16px; }
  .cf-quote-text { font-family: var(--serif); font-size: 22px; line-height: 1.45; color: var(--text); font-style: italic; margin-bottom: 20px; }
  .cf-quote-attr { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }

  /* WHO SECTION */
  .cf-who-section {
    position: relative; z-index: 1;
    padding: 0 56px 96px; max-width: 1200px; margin: 0 auto;
  }
  .cf-who-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 40px; }
  .cf-who-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 22px 20px;
    transition: all .25s;
  }
  .cf-who-card:hover { transform: translateY(-3px); border-color: var(--accent-light); box-shadow: 0 8px 24px rgba(2,132,199,0.08); }
  .cf-who-check {
    width: 20px; height: 20px; border-radius: 50%;
    background: var(--green-soft); color: var(--green-vivid);
    border: 1px solid var(--accent-light);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-bottom: 12px;
  }
  .cf-who-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .cf-who-desc { font-size: 12px; color: var(--muted); line-height: 1.55; }

  /* SECTION */
  .cf-section { position: relative; z-index: 1; padding: 96px 56px; max-width: 1200px; margin: 0 auto; }
  .cf-section-label { font-size: 10px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; color: var(--clay); margin-bottom: 14px; }
  .cf-section-title {
    font-family: var(--serif);
    font-size: clamp(30px, 3.5vw, 48px); font-weight: 400; letter-spacing: -.3px;
    line-height: 1.12; color: var(--text); margin-bottom: 14px;
  }
  .cf-section-title em { font-style: italic; color: var(--accent); }
  .cf-section-sub { font-size: 16px; color: var(--muted); max-width: 480px; line-height: 1.7; font-weight: 400; }

  /* FEATURES */
  .cf-features-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
  .cf-features-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1px; background: var(--border); border: 1px solid var(--border);
    border-radius: var(--r-lg); overflow: hidden; margin-top: 56px;
  }
  .cf-feature-card { background: var(--surface); padding: 32px 28px; transition: background .25s; cursor: default; }
  .cf-feature-card:hover { background: var(--surface2); }
  .cf-feature-icon {
    width: 42px; height: 42px; border-radius: 10px;
    background: var(--accent-soft); border: 1px solid var(--accent-light);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 18px; transition: transform .25s;
  }
  .cf-feature-card:hover .cf-feature-icon { transform: translateY(-2px); }
  .cf-feature-icon svg { width: 18px; height: 18px; color: var(--accent); }
  .cf-feature-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
  .cf-feature-desc { font-size: 13px; color: var(--muted); line-height: 1.65; font-weight: 400; }

  /* SAAS SECTION */
  .cf-saas-section {
    position: relative; z-index: 1;
    padding: 0 56px 96px; max-width: 1200px; margin: 0 auto;
  }
  .cf-saas-os-banner {
    background: var(--accent); border-radius: var(--r-xl);
    padding: 28px 36px; margin-bottom: 40px;
    display: flex; align-items: center; justify-content: space-between; gap: 24px;
  }
  .cf-saas-os-text { font-family: var(--serif); font-size: 22px; color: #fff; font-style: italic; line-height: 1.3; }
  .cf-saas-os-sub { font-size: 13px; color: rgba(255,255,255,.65); margin-top: 4px; }
  .cf-saas-os-badge {
    background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.25);
    color: #fff; border-radius: var(--r-lg); padding: 12px 20px;
    font-size: 11px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
  }
  .cf-compare-table {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-xl); overflow: hidden;
  }
  .cf-compare-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    border-bottom: 1px solid var(--border);
  }
  .cf-compare-row:last-child { border-bottom: none; }
  .cf-compare-cell {
    padding: 16px 24px; font-size: 13px; color: var(--muted);
    display: flex; align-items: center; gap: 8px;
    border-right: 1px solid var(--border);
  }
  .cf-compare-cell:last-child { border-right: none; }
  .cf-compare-cell.header {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
    background: var(--surface2); color: var(--text2);
  }
  .cf-compare-cell.header.accent { background: var(--accent); color: rgba(255,255,255,.9); }
  .cf-compare-cell.good { color: var(--green-vivid); font-weight: 500; }
  .cf-compare-cell.bad { color: var(--clay); }
  .cf-compare-dot-good { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
  .cf-compare-dot-bad  { width: 6px; height: 6px; border-radius: 50%; background: var(--clay); flex-shrink: 0; }

  /* PRICING */
  .cf-pricing-section { position: relative; z-index: 1; padding: 96px 56px; max-width: 1200px; margin: 0 auto; }
  .cf-pricing-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 16px; }
  .cf-pricing-reassure {
    display: flex; align-items: center; gap: 20px; margin-bottom: 40px;
    font-size: 13px; color: var(--muted); font-weight: 500;
  }
  .cf-pricing-reassure span { display: flex; align-items: center; gap: 6px; }
  .cf-pricing-reassure svg { width: 13px; height: 13px; color: var(--accent); }
  .cf-pricing-reassure-sep { width: 3px; height: 3px; border-radius: 50%; background: var(--border2); }
  .cf-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: stretch; }
  .cf-plan-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-xl); padding: 32px 28px;
    display: flex; flex-direction: column; transition: all .25s; position: relative; overflow: hidden;
  }
  .cf-plan-card:hover { transform: translateY(-3px); border-color: var(--accent-light); box-shadow: 0 8px 28px rgba(2,132,199,0.08); }
  .cf-plan-card.featured {
    background: var(--accent); border-color: var(--accent);
    transform: scale(1.025); box-shadow: 0 8px 40px var(--accent-glow);
  }
  .cf-plan-card.featured:hover { transform: scale(1.025) translateY(-3px); }
  .cf-plan-badge {
    position: absolute; top: 22px; right: 22px;
    background: rgba(255,255,255,.18); color: #fff;
    font-size: 9px; font-weight: 700; letter-spacing: .1em;
    padding: 3px 10px; border-radius: 100px; text-transform: uppercase;
    border: 1px solid rgba(255,255,255,.25);
  }
  .cf-plan-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin-bottom: 18px; }
  .cf-plan-card.featured .cf-plan-name { color: rgba(255,255,255,.65); }
  .cf-plan-price { font-family: var(--serif); font-size: 46px; font-weight: 400; letter-spacing: -1px; color: var(--text); line-height: 1; margin-bottom: 5px; }
  .cf-plan-card.featured .cf-plan-price { color: #fff; }
  .cf-plan-period { font-size: 12px; color: var(--muted); font-weight: 400; margin-bottom: 8px; }
  .cf-plan-card.featured .cf-plan-period { color: rgba(255,255,255,.55); }
  .cf-plan-roi { font-size: 11px; font-weight: 600; color: var(--accent-light); margin-bottom: 20px; }
  .cf-plan-card:not(.featured) .cf-plan-roi { color: var(--clay); }
  .cf-plan-divider { height: 1px; background: var(--border); margin-bottom: 20px; }
  .cf-plan-card.featured .cf-plan-divider { background: rgba(255,255,255,.18); }
  .cf-plan-features { flex: 1; display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
  .cf-plan-feature { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: var(--muted); font-weight: 400; line-height: 1.45; }
  .cf-plan-card.featured .cf-plan-feature { color: rgba(255,255,255,.8); }
  .cf-check {
    width: 17px; height: 17px; border-radius: 50%;
    background: var(--green-soft); color: var(--green-vivid);
    border: 1px solid var(--accent-light);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .cf-plan-card.featured .cf-check { background: rgba(255,255,255,.2); color: #fff; border-color: rgba(255,255,255,.3); }
  .cf-plan-btn {
    width: 100%; padding: 13px; border-radius: 100px;
    font-family: var(--sans); font-size: 13px; font-weight: 600; letter-spacing: .03em;
    cursor: pointer; transition: all .2s; border: 1px solid var(--border2);
    background: transparent; color: var(--text2);
  }
  .cf-plan-btn:hover { background: var(--accent-soft); border-color: var(--accent-light); color: var(--accent); }
  .cf-plan-card.featured .cf-plan-btn { background: #fff; color: var(--accent); border: none; box-shadow: 0 2px 16px rgba(0,0,0,.12); font-weight: 700; }
  .cf-plan-card.featured .cf-plan-btn:hover { background: #f2f8f0; }

  /* ERROR / EMPTY */
  .cf-plans-error { grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 56px; gap: 12px; text-align: center; }
  .cf-plans-error-icon { width: 44px; height: 44px; border-radius: 50%; background: var(--clay-soft); color: var(--clay); display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .cf-plans-error-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .cf-plans-error-sub { font-size: 13px; color: var(--muted); }
  .cf-plans-retry-btn { margin-top: 6px; padding: 9px 22px; border-radius: 100px; font-family: var(--sans); font-size: 13px; font-weight: 600; color: var(--accent); background: var(--accent-soft); border: 1px solid var(--accent-light); cursor: pointer; transition: all .2s; }
  .cf-plans-retry-btn:hover { background: rgba(2,132,199,.14); }
  .cf-plans-static-notice { grid-column: 1/-1; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 8px 16px; margin-bottom: 8px; background: var(--clay-soft); border: 1px solid rgba(239,68,68,.2); border-radius: 100px; font-size: 11px; color: var(--clay); font-weight: 600; width: fit-content; margin-left: auto; margin-right: auto; }

  /* TRUST SECTION */
  .cf-trust-section {
    position: relative; z-index: 1;
    padding: 0 56px 96px; max-width: 1200px; margin: 0 auto;
  }
  .cf-trust-manifesto {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-xl); padding: 36px 40px; margin-bottom: 28px;
    display: flex; align-items: flex-start; gap: 20px;
  }
  .cf-trust-manifesto-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: var(--accent-soft); color: var(--accent);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .cf-trust-manifesto-icon svg { width: 20px; height: 20px; }
  .cf-trust-manifesto-text { font-family: var(--serif); font-size: 20px; color: var(--text); line-height: 1.5; font-style: italic; }
  .cf-trust-manifesto-sub { font-size: 13px; color: var(--muted); margin-top: 6px; }
  .cf-trust-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .cf-trust-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 24px;
    transition: all .25s;
  }
  .cf-trust-card:hover { border-color: var(--accent-light); box-shadow: 0 4px 20px rgba(2,132,199,0.07); }
  .cf-trust-card-icon {
    width: 36px; height: 36px; border-radius: 9px;
    background: var(--accent-soft); border: 1px solid var(--accent-light);
    display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
  }
  .cf-trust-card-icon svg { width: 16px; height: 16px; color: var(--accent); }
  .cf-trust-card-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .cf-trust-card-desc { font-size: 12px; color: var(--muted); line-height: 1.6; }

  /* CTA */
  .cf-cta-wrap { position: relative; z-index: 1; padding: 96px 56px; max-width: 1200px; margin: 0 auto; }
  .cf-cta-box { background: var(--accent); border-radius: 32px; padding: 72px 80px; text-align: center; position: relative; overflow: hidden; }
  .cf-cta-box::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,.06) 0%, transparent 60%); }
  .cf-cta-h2 { font-family: var(--serif); font-size: clamp(30px, 3.5vw, 50px); font-weight: 400; letter-spacing: -.3px; margin-bottom: 14px; color: #fff; position: relative; z-index: 1; line-height: 1.12; }
  .cf-cta-h2 em { font-style: italic; color: var(--accent-light); }
  .cf-cta-p { font-size: 16px; color: rgba(255,255,255,.72); margin-bottom: 36px; position: relative; z-index: 1; font-weight: 400; line-height: 1.65; }
  .cf-cta-actions { display: flex; align-items: center; justify-content: center; gap: 14px; position: relative; z-index: 1; flex-wrap: wrap; margin-bottom: 20px; }
  .cf-cta-micro { font-size: 12px; color: rgba(255,255,255,.45); position: relative; z-index: 1; }
  .cf-cta-btn-primary { padding: 14px 28px; border-radius: 100px; font-family: var(--sans); font-size: 15px; font-weight: 600; color: var(--accent); background: #fff; border: none; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: all .25s; box-shadow: 0 2px 16px rgba(0,0,0,.14); }
  .cf-cta-btn-primary:hover { background: #f2f8f0; transform: translateY(-2px); }
  .cf-cta-btn-outline { padding: 14px 28px; border-radius: 100px; font-family: var(--sans); font-size: 15px; font-weight: 500; color: rgba(255,255,255,.85); background: transparent; border: 1px solid rgba(255,255,255,.35); cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: all .25s; }
  .cf-cta-btn-outline:hover { border-color: rgba(255,255,255,.6); color: #fff; background: rgba(255,255,255,.08); }

  /* FOOTER */
  .cf-footer { position: relative; z-index: 1; border-top: 1px solid var(--border); padding: 32px 56px; display: flex; align-items: center; justify-content: space-between; background: var(--bg2); }
  .cf-footer-copy { font-size: 12px; color: var(--muted); font-weight: 400; }
  .cf-footer-links { display: flex; gap: 28px; }
  .cf-footer-links a { font-size: 12px; font-weight: 500; color: var(--muted); text-decoration: none; transition: color .2s; }
  .cf-footer-links a:hover { color: var(--accent); }

  /* LOADER */
  .cf-loader { grid-column: 1/-1; display: flex; align-items: center; justify-content: center; padding: 80px; }
  @keyframes cfSpin { to { transform: rotate(360deg); } }
  .cf-spinner { width: 36px; height: 36px; border: 2px solid var(--accent-light); border-top-color: var(--accent); border-radius: 50%; animation: cfSpin .9s linear infinite; }

  /* RESPONSIVE */
  @media (max-width: 1024px) {
    .cf-hero { grid-template-columns: 1fr; padding-top: 120px; text-align: center; }
    .cf-hero-desc { margin: 0 auto 20px; }
    .cf-hero-saas-pill { justify-content: center; }
    .cf-hero-actions { justify-content: center; }
    .cf-social-proof { justify-content: center; }
    .cf-float-stat { left: 0; right: 0; margin: 0 auto; width: fit-content; bottom: -30px; }
    .cf-features-grid { grid-template-columns: repeat(2, 1fr); }
    .cf-pricing-grid { grid-template-columns: repeat(2, 1fr); }
    .cf-problem-grid { grid-template-columns: 1fr; }
    .cf-who-grid { grid-template-columns: repeat(2, 1fr); }
    .cf-trust-grid { grid-template-columns: repeat(2, 1fr); }
    .cf-compare-table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .cf-compare-row { min-width: 600px; }
  }

  @media (max-width: 768px) {
    .cf-nav { 
      padding: 0 16px; 
      height: 64px;
      justify-content: space-between;
    }
    .cf-nav-links { display: none; }
    .cf-nav-actions { gap: 8px; }
    .cf-hero { 
      padding: 100px 20px 60px; 
      gap: 32px; 
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .cf-h1 { 
      font-size: 38px; 
      line-height: 1.15;
      margin-bottom: 20px;
    }
    .cf-hero-desc {
       margin: 0 auto 32px;
       font-size: 15px;
       max-width: 100%;
    }
    .cf-hero-actions { 
      flex-direction: column; 
      width: 100%;
      gap: 12px;
    }
    .cf-btn-primary-lg, .cf-btn-secondary-lg {
       width: 100%;
       justify-content: center;
    }
    .cf-stat-row { 
      grid-template-columns: 1fr;
      width: 100%;
    }
    .cf-features-header { 
      flex-direction: column; 
      align-items: center;
      text-align: center;
    }
    .cf-features-grid { grid-template-columns: 1fr; margin-top: 32px; gap: 16px; border: none; background: transparent; }
    .cf-feature-card { border: 1px solid var(--border); border-radius: var(--r-lg); text-align: center; }
    .cf-feature-icon { margin: 0 auto 18px; }
    
    .cf-logo { font-size: 17px; }
    .cf-nav-actions { gap: 6px; }
    .cf-btn-primary { padding: 8px 12px; font-size: 11px; border-radius: 8px; }
    .cf-btn-ghost { padding: 8px 10px; font-size: 11px; }
    .cf-theme-btn { width: 32px; height: 32px; }

    .cf-section, .cf-pricing-section, .cf-cta-wrap,
    .cf-problem-section, .cf-who-section, .cf-saas-section, .cf-trust-section { padding: 64px 20px; text-align: center; }
    
    .cf-hero { padding: 100px 20px 48px; grid-template-columns: 1fr; text-align: center; gap: 48px; }
    .cf-h1 { font-size: 36px; line-height: 1.15; }
    .cf-hero-desc { margin: 0 auto 20px; max-width: 100%; }
    .cf-hero-saas-pill { flex-direction: column; gap: 12px; padding: 16px; border-radius: 20px; width: 100%; }
    .cf-hero-saas-sep { display: none; }
    .cf-hero-actions { flex-direction: column; gap: 12px; width: 100%; }
    .cf-btn-primary-lg, .cf-btn-secondary-lg { width: 100%; justify-content: center; padding: 16px; font-size: 14px; }
    .cf-social-proof { flex-direction: column; gap: 10px; align-items: center; }
    
    .cf-hero-card { padding: 20px; }
    .cf-stat-row { grid-template-columns: 1fr; }
    .cf-float-stat { left: 0; right: 0; margin: 0 auto; width: fit-content; bottom: -10px; }

    .cf-problem-grid { grid-template-columns: 1fr; gap: 32px; }
    .cf-problem-quote { position: static; padding: 28px; }

    .cf-features-header { flex-direction: column; text-align: center; align-items: center; }
    .cf-features-grid { grid-template-columns: 1fr; }
    .cf-feature-card { padding: 24px; }

    .cf-pricing-header { flex-direction: column; text-align: center; align-items: center; }
    .cf-pricing-grid { grid-template-columns: 1fr; gap: 24px; }
    .cf-plan-card.featured { transform: none; }
    .cf-plan-card.featured:hover { transform: translateY(-3px); }

    .cf-who-grid { grid-template-columns: 1fr; }

    .cf-trust-bar { flex-wrap: wrap; justify-content: center; gap: 16px; padding: 32px 20px; }
    .cf-trust-item { font-size: 10px; }
    .cf-trust-grid { grid-template-columns: 1fr; }
    .cf-trust-manifesto { flex-direction: column; padding: 24px; text-align: center; }
    .cf-trust-manifesto-icon { margin-bottom: 12px; }
    
    .cf-saas-os-banner { flex-direction: column; text-align: center; padding: 24px; }
    .cf-compare-row { grid-template-columns: 1fr; margin-bottom: 24px; border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; min-width: unset; }
    .cf-compare-cell.header { display: none; }
    .cf-compare-cell { border-right: none; border-bottom: 1px solid var(--border); justify-content: center; }
    
    .cf-cta-box { padding: 60px 20px; }
    .cf-cta-h2 { font-size: 28px; line-height: 1.25; }
    .cf-cta-actions { flex-direction: column; width: 100%; }
    .cf-cta-btn-primary, .cf-cta-btn-outline { width: 100%; justify-content: center; }

    .cf-footer { flex-direction: column; align-items: center; gap: 32px; padding: 40px 20px; text-align: center; }
    .cf-footer-links { justify-content: center; }
  }

  /* ── DARK OVERRIDE ── */
  .cf-root.dark {
    --bg:           #0b1120;
    --bg2:          #0f172a;
    --surface:      #131d30;
    --surface2:     #1e2d45;
    --border:       rgba(125,211,252,0.10);
    --border2:      rgba(125,211,252,0.18);
    --text:         #f0f9ff;
    --text2:        #bae6fd;
    --muted:        #7dd3fc;
    --accent:       #38bdf8;
    --accent-mid:   #0ea5e9;
    --accent-light: #0284c7;
    --accent-soft:  rgba(56,189,248,0.10);
    --accent-glow:  rgba(56,189,248,0.22);
    --clay:         #f87171;
    --clay-soft:    rgba(248,113,113,0.12);
    --green-vivid:  #34d399;
    --green-soft:   rgba(52,211,153,0.12);
  }
  .cf-root.dark .cf-nav {
    background: rgba(11,17,32,0.92);
    border-bottom-color: rgba(125,211,252,0.10);
  }
  .cf-root.dark .cf-hero-card {
    box-shadow: 0 4px 40px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3);
  }
  .cf-root.dark .cf-trust-bar {
    background: var(--bg2);
  }
  .cf-root.dark .cf-footer {
    background: var(--bg2);
  }
  .cf-root.dark .cf-cta-box {
    background: linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%);
  }
  .cf-root.dark .cf-saas-os-banner {
    background: linear-gradient(135deg, #0c4a6e 0%, #075985 100%);
  }
  .cf-root.dark .cf-compare-cell.header.accent {
    background: #075985;
  }
  .cf-root.dark .cf-plan-card.featured {
    background: linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%);
  }
`;

/* ─────────────────────────────────────────────
   STYLE INJECTION — ref-counted for StrictMode
───────────────────────────────────────────── */
const STYLE_ID = "cf-styles";
const DARK_STYLE_ID = "cf-dark-styles";
let styleRefCount = 0;
function injectStyles() {
  styleRefCount++;
  if (!document.getElementById(STYLE_ID)) {
    const tag = document.createElement("style");
    tag.id = STYLE_ID; tag.textContent = STYLES;
    document.head.appendChild(tag);
  }
  if (!document.getElementById(DARK_STYLE_ID)) {
    const dark = document.createElement("style");
    dark.id = DARK_STYLE_ID; dark.textContent = DARK_STYLES;
    document.head.appendChild(dark);
  }
}
function removeStyles() {
  styleRefCount--;
  if (styleRefCount <= 0) {
    styleRefCount = 0;
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(DARK_STYLE_ID)?.remove();
  }
}

/* ─────────────────────────────────────────────
   FEATURES DATA — benefits-first copy
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>),
    en: { title: "No more missed or double bookings", desc: "Smart scheduling with conflict detection and automatic SMS & WhatsApp reminders that cut no-shows by 60%." },
    ar: { title: "لا مزيد من التعارضات أو الحجوزات الفائتة", desc: "جدولة ذكية مع كشف تلقائي للتعارضات وتنبيهات SMS وواتساب تقلل الغياب 60%." },
  },
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 7H4a2 2 0 00-2 2v6c0 1.1.9 2 2 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>),
    en: { title: "See exactly how your clinic is performing — every day", desc: "Track revenue, expenses, and trends with real-time reports. Export to PDF or CSV in one click." },
    ar: { title: "اعرف أداء عيادتك بدقة كل يوم", desc: "تتبع الإيرادات والمصروفات والاتجاهات بتقارير فورية. تصدير PDF أو CSV بنقرة واحدة." },
  },
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
    en: { title: "Patient data stays protected — always", desc: "End-to-end encryption, role-based access, and full audit logs. Your patients' records are not a product." },
    ar: { title: "بيانات مرضاك محمية دائماً", desc: "تشفير شامل وصلاحيات مخصصة وسجلات تدقيق كاملة. سجلات مرضاك ليست بضاعة." },
  },
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>),
    en: { title: "Run your entire team without the confusion", desc: "Add doctors, set individual permissions, and keep each schedule separate — one system for everyone." },
    ar: { title: "أدر فريقك كله بلا فوضى", desc: "أضف الأطباء، خصص الصلاحيات، وأبقِ كل جدول منفصلاً — نظام واحد للجميع." },
  },
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>),
    en: { title: "Manage your clinic from any device, anywhere", desc: "Fully responsive across phone, tablet, and desktop. Your clinic follows you — not the other way around." },
    ar: { title: "أدر عيادتك من أي جهاز في أي مكان", desc: "تصميم متجاوب كامل على الهاتف واللوحي والكمبيوتر. عيادتك تتبعك — لا العكس." },
  },
  {
    icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg>),
    en: { title: "Your brand, your domain — not ours", desc: "White-label your workspace with your clinic's name, colors, and a custom domain URL." },
    ar: { title: "علامتك التجارية، رابطك أنت", desc: "ضع اسم عيادتك وألوانك ورابطك المخصص على المنصة بالكامل." },
  },
];

/* ─────────────────────────────────────────────
   STATIC PLANS
───────────────────────────────────────────── */
const STATIC_PLANS = [
  {
    id: "starter", name: "Starter", nameAr: "المبتدئ",
    price: "Free", period: "Forever — up to 50 appts/mo", periodAr: "مجاناً — حتى 50 موعد/شهر",
    roi: null, roiAr: null,
    features: ["1 doctor profile", "Appointment calendar", "Patient records (50)", "Email reminders"],
    featuresAr: ["ملف طبيب واحد", "تقويم المواعيد", "سجلات المرضى (50)", "تذكيرات البريد"],
    featured: false,
  },
  {
    id: "pro", name: "Pro", nameAr: "برو",
    price: "799", period: "EGP / month — unlimited", periodAr: "جنيه / شهر — غير محدود",
    roi: "Most clinics recover this in less than 7 days.",
    roiAr: "معظم العيادات تسترد التكلفة في أقل من 7 أيام.",
    features: ["Up to 10 doctors", "Unlimited appointments", "Full patient records", "SMS & WhatsApp reminders", "Financial analytics", "Custom domain"],
    featuresAr: ["حتى 10 أطباء", "مواعيد غير محدودة", "سجلات مرضى كاملة", "تنبيهات SMS وواتساب", "تقارير مالية", "رابط مخصص"],
    featured: true,
  },
  {
    id: "enterprise", name: "Enterprise", nameAr: "المؤسسات",
    price: "Custom", period: "Tailored for large networks", periodAr: "مخصص للشبكات الكبيرة",
    roi: null, roiAr: null,
    features: ["Unlimited doctors & staff", "Multi-branch management", "Dedicated account manager", "SLA guarantee + priority support", "Custom integrations & API", "On-site onboarding"],
    featuresAr: ["أطباء وموظفون غير محدودون", "إدارة متعددة الفروع", "مدير حساب مخصص", "ضمان SLA + دعم أولوية", "تكاملات مخصصة وAPI", "تهيئة في الموقع"],
    featured: false,
  },
];

/* ─────────────────────────────────────────────
   PAIN POINTS
───────────────────────────────────────────── */
const PAINS = {
  en: [
    "Double-booked appointments discovered at the front desk",
    "No-shows with zero warning and no follow-up system",
    "Revenue tracked in a notebook — or not tracked at all",
    "Patient records scattered across files, phones, and memory",
    "Hiring a new doctor means setting everything up from scratch",
    "You close the clinic, but the admin work follows you home",
  ],
  ar: [
    "تعارض في المواعيد يُكتشف عند الاستقبال",
    "غياب المرضى بلا إشعار ولا متابعة",
    "إيرادات مسجّلة في دفتر — أو غير مسجّلة على الإطلاق",
    "ملفات مرضى مبعثرة بين الأوراق والهواتف والذاكرة",
    "إضافة طبيب جديد تعني إعداد كل شيء من الصفر",
    "تغلق العيادة لكن العمل الإداري يصاحبك للبيت",
  ],
};

/* ─────────────────────────────────────────────
   WHO IS THIS FOR
───────────────────────────────────────────── */
const WHO = {
  en: [
    { title: "Solo doctors", desc: "Stay organized from day one — schedules, records, and billing in one place." },
    { title: "Growing clinics", desc: "Add more doctors and patients without adding more chaos." },
    { title: "Multi-branch operations", desc: "Manage multiple locations from a single dashboard." },
    { title: "Teams tired of spreadsheets", desc: "Replace WhatsApp threads and Excel files with a real system." },
  ],
  ar: [
    { title: "الأطباء المنفردون", desc: "ابقَ منظماً من اليوم الأول — جداول وسجلات وفواتير في مكان واحد." },
    { title: "العيادات النامية", desc: "أضف أطباء ومرضى أكثر دون مزيد من الفوضى." },
    { title: "الشبكات متعددة الفروع", desc: "أدر مواقع متعددة من لوحة تحكم واحدة." },
    { title: "الفرق التعبة من الجداول", desc: "استبدل مجموعات الواتساب وملفات Excel بنظام حقيقي." },
  ],
};

/* ─────────────────────────────────────────────
   COMPARE DATA
───────────────────────────────────────────── */
const COMPARE = {
  en: {
    headers: ["Old clinic software", "Royal Clinic"],
    rows: [
      ["Installed on one computer", "Works on any device, anywhere"],
      ["Pay again for every update", "Updates ship automatically, included"],
      ["Data on a local hard drive", "Encrypted cloud storage, backed up daily"],
      ["One user, one machine", "Your whole team, one system"],
      ["Setup takes days", "Running in under 5 minutes"],
      ["Call IT when it breaks", "Support that actually responds"],
    ],
  },
  ar: {
    headers: ["برامج العيادات التقليدية", "Royal Clinic"],
    rows: [
      ["مثبّت على جهاز واحد", "يعمل على أي جهاز في أي مكان"],
      ["تدفع مجدداً مقابل كل تحديث", "تحديثات تلقائية مضمّنة في الاشتراك"],
      ["البيانات على هارد ديسك محلي", "تخزين سحابي مشفّر مع نسخ احتياطي يومي"],
      ["مستخدم واحد، جهاز واحد", "فريقك كله، نظام واحد"],
      ["الإعداد يستغرق أياماً", "يعمل في أقل من 5 دقائق"],
      ["اتصل بالدعم الفني لما يعطل", "دعم يستجيب فعلاً"],
    ],
  },
};

/* ─────────────────────────────────────────────
   LOGO
───────────────────────────────────────────── */
const LogoIcon = ({ size = 32 }) => (
  <div className="cf-logo-icon" style={{ width: size, height: size, borderRadius: size * 0.25 }}>
    <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="white">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 3a1 1 0 011 1v5h3a1 1 0 010 2h-4a1 1 0 01-1-1V6a1 1 0 011-1z" />
    </svg>
  </div>
);

/* ─────────────────────────────────────────────
   PLAN CARD
───────────────────────────────────────────── */
const PlanCard = ({ plan, index, isAr }) => {
  const isFeatured = plan.featured ?? index === 1;
  const limits = [
    { label: isAr ? "الدكاترة" : "Doctors", value: plan.maxDoctors },
    { label: isAr ? "المرضى" : "Patients", value: plan.maxPatients },
    { label: isAr ? "الحجوزات" : "Bookings", value: plan.maxBookings },
  ];
  const validLimits = limits.filter(item => item.value !== undefined);

  const fallbackFeatures = isAr
    ? plan.featuresAr ?? plan.planFeatures?.map((f) => f.nameAr || f.name) ?? []
    : plan.features ?? plan.planFeatures?.map((f) => f.name) ?? [];

  const roi = isAr ? plan.roiAr : plan.roi;

  return (
    <div className={`cf-plan-card${isFeatured ? " featured" : ""}`}>
      {isFeatured && <div className="cf-plan-badge">{isAr ? "الأكثر طلباً" : "Most popular"}</div>}
      <div className="cf-plan-name">{isAr ? plan.nameAr ?? plan.name : plan.name}</div>
      <div className="cf-plan-price">{plan.price}</div>
      <div className="cf-plan-period">
        {isAr ? plan.periodAr ?? `${plan.durationDays} يوم` : plan.period ?? `EGP / ${plan.durationDays} Days`}
      </div>
      {roi && <div className="cf-plan-roi">{roi}</div>}
      <div className="cf-plan-divider" />
      <div className="cf-plan-features">
        {validLimits.length > 0 && validLimits.map((item) => (
          <div key={item.label} className="cf-plan-feature">
            <span className="cf-check"><CheckIcon /></span>
            <span>{item.label}: {item.value == null ? (isAr ? "غير محدود" : "Unlimited") : item.value}</span>
          </div>
        ))}
        {fallbackFeatures.map((feat, fi) => (
          <div key={`feat-${fi}`} className="cf-plan-feature">
            <span className="cf-check"><CheckIcon /></span>{feat}
          </div>
        ))}
      </div>
      <Link to={`/register-clinic?plan=${plan.id}`} className="cf-plan-btn" style={{ textDecoration: "none", display: "block", textAlign: "center" }}>
        {plan.id === "enterprise"
          ? isAr ? "تواصل معنا" : "Contact sales"
          : isFeatured
            ? isAr ? "ابدأ تجربة 30 يوم" : "Start 30-day trial"
            : isAr ? "ابدأ مجاناً" : "Get started free"}
      </Link>
    </div>
  );
};

/* ─────────────────────────────────────────────
   PRICING SECTION
───────────────────────────────────────────── */
const PricingSection = ({ isAr }) => {
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchPlans = () => {
    setLoading(true); setError(null); setUsingFallback(false);
    planService.getAll({ isActive: true })
      .then((res) => {
        const data = res.data;
        if (!data || data.length === 0) { setPlans(STATIC_PLANS); setUsingFallback(true); }
        else { setPlans(data); }
      })
      .catch((err) => {
        console.error("[PricingSection] Failed to load plans:", err);
        setError(err); setPlans(STATIC_PLANS); setUsingFallback(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlans(); }, []);

  return (
    <div id="pricing" className="cf-pricing-section">
      <div className="cf-section-label">{isAr ? "أسعار شفافة" : "Transparent pricing"}</div>
      <div className="cf-pricing-header">
        <h2 className="cf-section-title">
          {isAr ? <>ادفع مقابل ما تستخدمه.<br /><em>توقف متى تريد.</em></> : <>Pay for what you use.<br /><em>Stop when you want.</em></>}
        </h2>
        <p className="cf-section-sub">
          {isAr ? "بدون رسوم إعداد. بدون عقود سنوية. ابدأ صغيراً وتوسّع عندما تكون جاهزاً." : "No setup fees. No annual contracts. Start small and scale when you're ready."}
        </p>
      </div>
      <div className="cf-pricing-reassure">
        {[
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: isAr ? "بدون بطاقة ائتمان" : "No credit card required" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>, label: isAr ? "إلغاء في أي وقت" : "Cancel anytime" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, label: isAr ? "إعداد في 5 دقائق" : "Setup in 5 minutes" },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <div className="cf-pricing-reassure-sep" />}
            <span>{item.icon}{item.label}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="cf-pricing-grid">
        {loading ? (
          <div className="cf-loader"><div className="cf-spinner" /></div>
        ) : error ? (
          <>
            <div className="cf-plans-error">
              <div className="cf-plans-error-icon">⚠</div>
              <div className="cf-plans-error-title">{isAr ? "تعذّر تحميل الخطط" : "Couldn't load plans"}</div>
              <div className="cf-plans-error-sub">{isAr ? "يتم عرض الخطط الافتراضية." : "Showing default plans below."}</div>
              <button className="cf-plans-retry-btn" onClick={fetchPlans}>{isAr ? "إعادة المحاولة" : "Retry"}</button>
            </div>
            {STATIC_PLANS.map((plan, i) => <PlanCard key={plan.id} plan={plan} index={i} isAr={isAr} />)}
          </>
        ) : (
          <>
            {usingFallback && (
              <div className="cf-plans-static-notice">ℹ {isAr ? "يتم عرض الخطط الافتراضية" : "Showing default plans"}</div>
            )}
            {plans.map((plan, i) => <PlanCard key={plan.id} plan={plan} index={i} isAr={isAr} />)}
          </>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
);

const LandingPage = () => {
  const { user } = useAuth();
  const { t, lang, toggleLang, isRtl } = useLanguage();
  const isAr = lang === "ar";
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("cf-theme") === "dark"; } catch { return false; }
  });

  const toggleDark = () => setDark(d => {
    const next = !d;
    try { localStorage.setItem("cf-theme", next ? "dark" : "light"); } catch { }
    return next;
  });

  useEffect(() => { injectStyles(); return () => removeStyles(); }, []);
  const handleComingSoon = (e) => e.preventDefault();

  const compare = isAr ? COMPARE.ar : COMPARE.en;

  return (
    <div className={`cf-root${dark ? " dark" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      <div className="cf-bg-glow" />

      {/* NAV */}
      <nav className="cf-nav">
        <Link to="/" className="cf-logo"><LogoIcon />Royal<span className="cf-logo-dot">Clinic</span></Link>
        <div className="cf-nav-links">
          <a href="#problem">{isAr ? "المشكلة" : "Problem"}</a>
          <a href="#features">{isAr ? "المميزات" : "Features"}</a>
          <a href="#pricing">{isAr ? "الأسعار" : "Pricing"}</a>
          <a href="#docs" onClick={handleComingSoon}>{isAr ? "التوثيق" : "Docs"}</a>
        </div>
        <div className="cf-nav-actions">
          <button className="cf-theme-btn" onClick={toggleDark} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="cf-btn-ghost" onClick={toggleLang}>{lang.toUpperCase()}</button>
          {user ? (
            <Link to="/dashboard" className="cf-btn-primary">{t("dashboard")} <ArrowRight /></Link>
          ) : (
            <>
              <Link to="/login" className="cf-btn-ghost">{isAr ? "دخول" : "Log in"}</Link>
              <Link to="/register-clinic" className="cf-btn-primary">{isAr ? "ابدأ مجاناً" : "Start free"} <ArrowRight /></Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div className="cf-hero">
        <div>
          <div className="cf-hero-badge">
            <span className="cf-pulse" />
            {isAr ? "بيتا مفتوح — مجاني 30 يوماً" : "Public beta — Free for 30 days"}
          </div>
          <h1 className="cf-h1">
            {isAr
              ? (<>كل ما تعمل عليه عيادتك —<br /><em>في مكان واحد.</em></>)
              : (<>Run your entire clinic —<br /><em>without the chaos.</em></>)}
          </h1>
          <p className="cf-hero-desc">
            {isAr
              ? "المواعيد، المرضى، الفواتير، وإدارة الفريق — كلها في نظام واحد مبني للعيادات الحديثة. بلا جداول بيانات. بلا حجوزات فائتة. بلا تخمين."
              : "Appointments, patients, billing, and team management — all in one system built for modern clinics. No spreadsheets. No missed bookings. No guesswork."}
          </p>
          {/* SaaS DNA pill */}
          <div className="cf-hero-saas-pill">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              {isAr ? "لا تثبيت" : "No installation"}
            </span>
            <div className="cf-hero-saas-sep" />
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {isAr ? "جاهز في 5 دقائق" : "Setup in 5 minutes"}
            </span>
            <div className="cf-hero-saas-sep" />
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg>
              {isAr ? "يعمل من أي مكان" : "Works from anywhere"}
            </span>
          </div>
          <div className="cf-hero-actions">
            <Link to="/register-clinic" className="cf-btn-primary-lg">
              {isAr ? "ابدأ مجاناً — بدون بطاقة" : "Start free — no card needed"} <ArrowRight size={15} />
            </Link>
            <a href="#features" className="cf-btn-secondary-lg">
              {isAr ? "اكتشف كيف يعمل" : "See how it works"}
            </a>
          </div>
          <div className="cf-social-proof">
            <div className="cf-avatars">
              {[
                { initials: "AH", bg: "#c8dbb8", color: "#3a5e3a" },
                { initials: "SM", bg: "#d4c5a9", color: "#5c4a32" },
                { initials: "KR", bg: "#dbbba0", color: "#b0622a" },
                { initials: "YM", bg: "#c8d8c0", color: "#2d6a2d" },
              ].map((av) => (
                <div key={av.initials} className="cf-av" style={{ background: av.bg, color: av.color }}>{av.initials}</div>
              ))}
            </div>
            <span className="cf-sp-text">
              <strong>{isAr ? "+500 عيادة" : "500+ clinics"}</strong>{" "}
              {isAr ? "تعمل بذكاء مع Royal Clinic" : "already running smarter with Royal Clinic"}
            </span>
          </div>
        </div>

        {/* Hero card */}
        <div className="cf-hero-visual">
          <div className="cf-hero-card">
            <div className="cf-card-header">
              <span className="cf-card-title">{isAr ? "نظرة اليوم" : "Today's Overview"}</span>
              <span className="cf-live-badge">{isAr ? "مباشر" : "Live"}</span>
            </div>
            <div className="cf-stat-row">
              {[
                { val: "48", lbl: isAr ? "موعد" : "Appointments", trend: "↑ 12%" },
                { val: "31", lbl: isAr ? "مؤكد" : "Confirmed", trend: "↑ 8%" },
                { val: "7.2k", lbl: isAr ? "جنيه" : "Revenue EGP", trend: "↑ 24%", clay: true },
              ].map((s) => (
                <div key={s.lbl} className="cf-stat-box">
                  <div className="cf-stat-val" style={s.clay ? { color: "var(--clay)" } : {}}>{s.val}</div>
                  <div className="cf-stat-lbl">{s.lbl}</div>
                  <div className="cf-stat-trend">{s.trend}</div>
                </div>
              ))}
            </div>
            <div className="cf-chart-row">
              {[40, 65, 50, 80, 90, 70, 55].map((h, i) => (
                <div key={i} className={`cf-bar${i === 4 ? " active" : ""}`} style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
            <div className="cf-appt-list">
              {[
                { av: "MH", name: isAr ? "محمد حسن" : "Mohamed Hassan", time: isAr ? "١٠:٠٠ ص — قلبية" : "10:00 AM — Cardiology", status: "confirmed", statusLabel: isAr ? "مؤكد" : "Confirmed" },
                { av: "SN", name: isAr ? "سارة نور" : "Sara Nour", time: isAr ? "١٠:٣٠ ص — جلدية" : "10:30 AM — Dermatology", status: "pending", statusLabel: isAr ? "انتظار" : "Pending", avColor: "#b0622a", avBg: "rgba(176,98,42,.1)" },
              ].map((a) => (
                <div key={a.av} className="cf-appt-item">
                  <div className="cf-appt-av" style={a.avColor ? { background: a.avBg, color: a.avColor } : {}}>{a.av}</div>
                  <div style={{ flex: 1 }}>
                    <div className="cf-appt-name">{a.name}</div>
                    <div className="cf-appt-time">{a.time}</div>
                  </div>
                  <span className={`cf-status cf-status-${a.status}`}>{a.statusLabel}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="cf-float-stat">
            <div className="cf-float-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="cf-float-val">+1,200</div>
              <div className="cf-float-lbl">{isAr ? "حجز اليوم" : "Bookings today"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div className="cf-trust-bar">
        {[
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, label: isAr ? "متوافق HIPAA" : "HIPAA Compliant" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>, label: isAr ? "تشفير 256-bit" : "256-bit Encryption" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>, label: isAr ? "99.9% وقت تشغيل" : "99.9% Uptime SLA" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>, label: isAr ? "+500 عيادة سعيدة" : "500+ Happy Clinics" },
        ].map((item) => (
          <div key={item.label} className="cf-trust-item">{item.icon}{item.label}</div>
        ))}
      </div>

      {/* PROBLEM SECTION */}
      <section id="problem" className="cf-problem-section">
        <div className="cf-section-label">{isAr ? "المشكلة الحقيقية" : "The real problem"}</div>
        <h2 className="cf-section-title">
          {isAr
            ? <>لم تفتح عيادتك لإدارة <em>الفوضى.</em></>
            : <>You didn't open a clinic to manage<br /><em>the chaos.</em></>}
        </h2>
        <p className="cf-section-sub" style={{ marginBottom: 0 }}>
          {isAr
            ? "معظم العيادات تعتمد على أوراق وجداول بيانات وأدوات منفصلة. يعمل — حتى يتوقف عن العمل."
            : "Most clinics still run on paper, WhatsApp threads, and disconnected tools cobbled together. It works — until it doesn't."}
        </p>
        <div className="cf-problem-grid">
          <div className="cf-pain-list">
            {(isAr ? PAINS.ar : PAINS.en).map((pain, i) => (
              <div key={i} className="cf-pain-item">
                <div className="cf-pain-icon">✕</div>
                <div className="cf-pain-text">{pain}</div>
              </div>
            ))}
          </div>
          <div className="cf-problem-quote">
            <div className="cf-quote-mark">"</div>
            <div className="cf-quote-text">
              {isAr
                ? "كنت أقضي ساعتين يومياً في تنظيم المواعيد وملاحقة المرضى. الآن يحدث كل ذلك تلقائياً."
                : "I was spending two hours a day managing appointments and chasing patients. Now it all happens automatically."}
            </div>
            <div className="cf-quote-attr">
              {isAr ? "د. أحمد سعيد — عيادة القاهرة" : "Dr. Ahmed Saeed — Cairo Family Clinic"}
            </div>
          </div>
        </div>
      </section>

      {/* WHO SECTION */}
      <section className="cf-who-section">
        <div className="cf-section-label">{isAr ? "لمن صُمّم" : "Built for clinics ready to grow"}</div>
        <h2 className="cf-section-title">
          {isAr ? <>مبني للعيادات <em>المستعدة للنمو.</em></> : <>Built for clinics<br /><em>ready to grow.</em></>}
        </h2>
        <div className="cf-who-grid">
          {(isAr ? WHO.ar : WHO.en).map((item, i) => (
            <div key={i} className="cf-who-card">
              <div className="cf-who-check"><CheckIcon /></div>
              <div className="cf-who-title">{item.title}</div>
              <div className="cf-who-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="cf-section">
        <div className="cf-section-label">{isAr ? "كل ما تحتاجه" : "Everything you need"}</div>
        <div className="cf-features-header">
          <div>
            <h2 className="cf-section-title">
              {isAr ? <>نظام واحد يستبدل <em>كل شيء آخر.</em></> : <>One system that<br />replaces <em>everything else.</em></>}
            </h2>
          </div>
          <p className="cf-section-sub">
            {isAr
              ? "جداولك، مرضاك، إيراداتك، وفريقك — متزامنة في الوقت الفعلي، في متناول يدك من أي مكان."
              : "Your schedule, patients, revenue, and team — synced in real time, accessible from anywhere."}
          </p>
        </div>
        <div className="cf-features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="cf-feature-card">
              <div className="cf-feature-icon">{f.icon}</div>
              <div className="cf-feature-title">{isAr ? f.ar.title : f.en.title}</div>
              <div className="cf-feature-desc">{isAr ? f.ar.desc : f.en.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SAAS SECTION */}
      <section className="cf-saas-section">
        <div className="cf-section-label">{isAr ? "لماذا SaaS أفضل" : "Why SaaS wins"}</div>
        <h2 className="cf-section-title" style={{ marginBottom: 32 }}>
          {isAr
            ? <>انسَ التثبيت. انسَ الصيانة.<br /><em>انسَ تحديثات الإصدارات.</em></>
            : <>Forget installation. Forget maintenance.<br /><em>Forget version updates.</em></>}
        </h2>
        <div className="cf-saas-os-banner">
          <div>
            <div className="cf-saas-os-text">
              {isAr
                ? "Royal Clinic ليس مجرد برنامج — إنه نظام تشغيل عيادتك."
                : "Royal Clinic isn't just software — it's your clinic's operating system."}
            </div>
            <div className="cf-saas-os-sub">
              {isAr
                ? "بنية سحابية أصيلة تتحسن تلقائياً، وتعمل على أي جهاز، ولا تحتجز بياناتك أبداً."
                : "Cloud-native infrastructure that improves automatically, works on any device, and never holds your data hostage."}
            </div>
          </div>
          <div className="cf-saas-os-badge">
            {isAr ? "سحابي 100%" : "Cloud Native"}
          </div>
        </div>
        <div className="cf-compare-table">
          <div className="cf-compare-row">
            <div className="cf-compare-cell header" style={{ color: "var(--muted)" }}>&nbsp;</div>
            <div className="cf-compare-cell header">{compare.headers[0]}</div>
            <div className="cf-compare-cell header accent">{compare.headers[1]}</div>
          </div>
          {compare.rows.map(([bad, good], i) => (
            <div key={i} className="cf-compare-row">
              <div className="cf-compare-cell" style={{ fontWeight: 500, color: "var(--text2)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>
                {["Device", "Updates", "Storage", "Team", "Setup", "Support"][i]}
              </div>
              <div className="cf-compare-cell bad"><div className="cf-compare-dot-bad" />{bad}</div>
              <div className="cf-compare-cell good"><div className="cf-compare-dot-good" />{good}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <div id="pricing"><PricingSection isAr={isAr} /></div>

      {/* TRUST SECTION */}
      <section className="cf-trust-section">
        <div className="cf-section-label">{isAr ? "الأمان والموثوقية" : "Security & reliability"}</div>
        <div className="cf-trust-manifesto">
          <div className="cf-trust-manifesto-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div className="cf-trust-manifesto-text">
              {isAr
                ? "بنينا Royal Clinic بقاعدة واحدة: بياناتك ملكك — دائماً."
                : "We built Royal Clinic with one rule: your data is yours — always."}
            </div>
            <div className="cf-trust-manifesto-sub">
              {isAr
                ? "لا نبيع سجلات مرضاك. لا نستخدمها إعلانياً. لا استثناءات."
                : "We don't sell your patient records. We don't use them for advertising. No exceptions."}
            </div>
          </div>
        </div>
        <div className="cf-trust-grid">
          {[
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
              title: isAr ? "تشفير 256-bit" : "256-bit Encryption",
              desc: isAr ? "كل بيانات مرضاك — أثناء النقل وعند التخزين — مشفّرة بنفس المعيار الذي تستخدمه البنوك." : "Every piece of patient data — in transit and at rest — encrypted to the same standard used by banks.",
            },
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
              title: isAr ? "صلاحيات مخصصة" : "Role-Based Access",
              desc: isAr ? "الاستقبال يرى الجداول. الطبيب يرى الملفات. المالك يرى كل شيء. كل شيء في مكانه الصحيح." : "Receptionists see schedules. Doctors see records. Owners see everything. Sensitive data stays where it belongs.",
            },
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
              title: isAr ? "ضمان 99.9% وقت تشغيل" : "99.9% Uptime Guarantee",
              desc: isAr ? "Royal Clinic مبني على بنية تحتية لا تتوقف عندما يكون يومك مزدحماً." : "Royal Clinic is built on infrastructure that doesn't go down when your day gets busy. We guarantee it.",
            },
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 12V8a4 4 0 018 0v4M2 12h20v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8z" /></svg>,
              title: isAr ? "نسخ احتياطي يومي" : "Daily Backups",
              desc: isAr ? "بياناتك تُنسخ احتياطياً كل 24 ساعة. حتى في أسوأ السيناريوهات، لا يضيع شيء." : "Your data is automatically backed up every 24 hours. Even in the worst-case scenario, nothing is lost.",
            },
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
              title: isAr ? "لا بيع للبيانات أبداً" : "No Third-Party Data Selling",
              desc: isAr ? "لا نستفيد مالياً من سجلات مرضاك. أبداً. بياناتك ملك عيادتك وحدها." : "We don't monetize your patient records. Ever. Your data belongs to your clinic, full stop.",
            },
            {
              icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
              title: isAr ? "سجلات تدقيق كاملة" : "Full Audit Logs",
              desc: isAr ? "كل إجراء في النظام مسجّل. من فعل ماذا، ومتى. شفافية كاملة على كل مستوى." : "Every action in the system is logged. Who did what, and when. Complete transparency at every level.",
            },
          ].map((card, i) => (
            <div key={i} className="cf-trust-card">
              <div className="cf-trust-card-icon">{card.icon}</div>
              <div className="cf-trust-card-title">{card.title}</div>
              <div className="cf-trust-card-desc">{card.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="cf-cta-wrap">
        <div className="cf-cta-box">
          <h2 className="cf-cta-h2">
            {isAr
              ? <>عيادتك تعمل بالفعل.<br />دعنا نجعلها تعمل <em>بشكل أفضل.</em></>
              : <>Your clinic is already running.<br />Let's make it run <em>better.</em></>}
          </h2>
          <p className="cf-cta-p">
            {isAr
              ? "انضم لأكثر من 500 عيادة تعمل بذكاء مع Royal Clinic. الإعداد يستغرق أقل من 5 دقائق. بلا بطاقة ائتمان."
              : "Join 500+ practices already running smarter with Royal Clinic. Setup takes less than 5 minutes. No credit card."}
          </p>
          <div className="cf-cta-actions">
            <Link to="/register-clinic" className="cf-cta-btn-primary">
              {isAr ? "ابدأ مجاناً — أقل من 5 دقائق" : "Start free — it takes less than 5 minutes"} <ArrowRight size={15} />
            </Link>
            <a href="#demo" onClick={handleComingSoon} className="cf-cta-btn-outline">
              {isAr ? "احجز عرضاً تجريبياً" : "Book a demo"}
            </a>
          </div>
          <div className="cf-cta-micro">
            {isAr
              ? "خطة مجانية متاحة · إلغاء Pro في أي وقت · بدون رسوم خفية"
              : "Free plan available · Cancel Pro anytime · No hidden fees"}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="cf-footer">
        <Link to="/" className="cf-logo" style={{ fontSize: 17 }}><LogoIcon size={26} />Royal<span className="cf-logo-dot">Clinic</span></Link>
        <div className="cf-footer-links">
          <a href="#privacy" onClick={handleComingSoon}>{isAr ? "الخصوصية" : "Privacy"}</a>
          <a href="#terms" onClick={handleComingSoon}>{isAr ? "الشروط" : "Terms"}</a>
          <a href="#contact" onClick={handleComingSoon}>{isAr ? "تواصل" : "Contact"}</a>
        </div>
        <div className="cf-footer-copy">© 2026 Royal Clinic. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default LandingPage;