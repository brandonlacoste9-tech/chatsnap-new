# ChatSnap UI/UX sharpen checklist

**Goal:** Make the app feel intentional and sharp without a full redesign.  
**Date:** 2026-07-14

## Design tokens (done in CSS)
- [x] 4pt spacing scale (`--space-1` … `--space-8`)
- [x] Type scale (`--text-xs` … `--text-2xl`)
- [x] Radius tokens (sm / md / pill)
- [x] Stronger border + elevated-2 surface
- [x] Min tap target 44px (`--tap-min`)
- [x] Nav height token (`--nav-h`)

## Components
- [x] Buttons: padding, hover glow, focus rings
- [x] Fields: focus ring with accent glow
- [x] Chips: 44px height, active glow
- [x] List rows: min-height, hover state
- [x] Avatars: 44px, cleaner border
- [x] Bottom nav: blur bar, active accent, camera halo
- [x] Banner: accent-aware tint

## Accessibility
- [x] `:focus-visible` rings on interactive controls
- [x] Prefer visible keyboard focus without mouse outlines

## Product polish already shipped
- [x] Colour palette + edge lighting (More menu)
- [x] Dual captions, onboarding, landing
- [x] Swipe to erase inbox/sent

## Figma companion
- File: https://www.figma.com/design/P12YoEHhH0NOXYd6FmGZsJ/ChatSnap-UI-Kit
- [x] Design kit page (tokens + colors + spacing + type + buttons/chips/list/field)
- [ ] Key screens: Landing, Auth, Camera, Inbox, More (blocked by Figma Starter MCP rate limit — upgrade or continue tomorrow)
- Live capture via generate_figma_design also rate-limited on Starter

## Next (optional)
- [x] Empty states (inbox / sent / friends / chats)
- [x] Skeleton loaders for inbox/chats
- [x] Camera chrome hierarchy + shutter glow
- [x] Motion: fade-up lists, empty enter, more sheet shadow
- [ ] Dark/light (if ever needed — currently dark-first)
- [ ] Skeleton for friends discover list
