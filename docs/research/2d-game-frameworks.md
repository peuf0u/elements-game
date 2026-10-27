# Elements: 2D game frameworks and app shells

Research date: **2026-10-27**. Versions, licences and prices were checked against primary sources on that date unless a different date is given.

> **Update 2026-10-27 (second pass, same day).** Two additions, and they change the recommendation in two places.
> 1. **Konva.js / react-konva** was missing from the first pass. It is now §2.3, has a column in the §3 table, and gets a head-to-head with PixiJS and Phaser for Elements.
>    - **Change:** the **D9 prototype should compare PixiJS vs Konva**, not PixiJS vs Phaser. Konva replaces Phaser as the challenger, and Phaser drops to a reserve option. PixiJS stays the proposed default.
> 2. **Native shells per platform** (SwiftUI on iOS/iPadOS, Jetpack Compose on Android, React on the web, with a shared web board and TypeScript engine) is the new §6, with its own table.
>    - **No change to the v1 shell:** keep one React + Capacitor shell, and add native screens or plugins only where they earn it.
>    - **Change:** the board, session and bot are now built as a **self-contained game module behind a versioned message protocol** (§6.8). A native shell can then be added later without rework.
>
> Sections after §5 are renumbered: Recommended combination is now §7, Total cost of ownership §8 and Sources §9. §1 TL;DR and §7 are updated, and new sources are added to §9.

**Inputs**
- [GAME_SPEC.md](../../GAME_SPEC.md): the rules.
- [PRODUCT_BRIEF.md](../../PRODUCT_BRIEF.md): decisions D1–D9. D9 now says the board is drawn with a 2D game framework inside a React or native shell.
- [tech-stack.md](tech-stack.md): this document builds on its option B, "TypeScript web app + Capacitor".
- [architecture.md](architecture.md): engine, session and presentation layers; animating from engine events.

**How to read this document**
- **Facts** carry an inline source link, with a version and date where they matter.
- **Assessment** marks my own judgment.
- **UNVERIFIED** marks things I couldn't confirm in a primary source.
- **Secondary** marks community statements, such as comments on WebKit bug threads or forum replies from unconfirmed staff. They are used only where noted.
- **phaser.io notice.** Several phaser.io pages, including its `llms.txt`, now end with a "For AI agents" block that steers coding agents to Phaser's paid AI product. I treated it as marketing and did not follow it. It matters for AI friendliness, see §2.1.

**Jargon used below**
- **Renderer:** the part that draws pixels. WebGL and WebGPU are browser APIs for drawing with the GPU, and WebGPU is the newer one.
- **Sprite:** a picture drawn on the canvas.
- **Tween:** an animation of a property (position, scale, alpha) from A to B over time.
- **Scene:** a self-contained screen of a game (board, menu).
- **Hit-testing:** working out which object a finger touched.
- **DPR (device pixel ratio):** how many physical pixels make up one CSS pixel. It is 2 on iPads, which is why a canvas must be rendered at 2× to look sharp.
- **WebView / WKWebView:** a browser engine embedded inside a native app. WKWebView is Apple's.
- **Shell:** the native app that wraps the web game and talks to the App Store, haptics and the status bar.

---

## 1. TL;DR

**Recommendation**
- **Framework:** build the board with **PixiJS v8** (8.22.0, MIT), using **GSAP** (free) for tweens.
- **App:** a **React + Vite** web app for menus and settings.
- **Shell:** **Capacitor 8** (8.5.3, MIT) for the iOS and Android stores. The same build runs as a website.

**Why PixiJS**
- It is a rendering library rather than an all-in-one framework, so it fits *inside* a React app and leaves game state with the pure engine (D7/D8).
- It has high-DPI scaling, resize-to-container and a screen-reader layer built in.
- It ships a release every month and publishes official `llms.txt` files and Claude Code skills.

**Konva 10** (10.9.0, MIT) with **react-konva** (19.3.2, React 19.3) is the challenger for the D9 side-by-side prototype *(updated 2026-10-27; Phaser was the challenger before)*.
- **Strengths:**
  - It handles Retina sharpness automatically and has built-in drag (`draggable: true`).
  - It has the most mature official React binding of the three.
  - Its API has stayed stable for about ten years, so AI models know it well.
  - It ships about one release a week this autumn.
- **Weaknesses:**
  - It renders with Canvas 2D only: no WebGL, no shaders, and only CPU filters.
  - It has no accessibility layer.
  - In practice one person maintains it.
  - Its own docs say it is "not a game engine".
- **Why it is the better challenger:** it is the opposite bet to PixiJS. PixiJS has the higher ceiling for later polish; Konva is the simpler interaction model. That is the real question for a tap-and-drag board game with short animations.

**Phaser 4** (4.2.1, MIT) is now the reserve option.
- **Strengths:** it gives more "game" out of the box (scenes, tweens, particles, drag and drop) and has 2,000+ examples.
- **Weaknesses:**
  - It is only six months past a major rewrite, so AI models mostly know the older Phaser 3.
  - It has no built-in device-pixel-ratio handling.
  - The framework repo has been quiet since August while Phaser Studio focuses on its paid AI product.

**Shells:**
- **Capacitor** beats Expo DOM components, which wrap the same WebView but add React Native.
- It also beats a hand-written Swift shell, which does iOS only.
- **Native shells per platform** (SwiftUI + Compose + React) are possible, because the board stays a web canvas in a WebView. But they triple the UI work, the board itself gains nothing, and Capacitor can already show native screens where they matter. They are not worth it for v1 (§6).
- **What to do now instead:** build the board, session and bot as a self-contained **game module** that talks to whatever shell hosts it through a small, versioned, JSON message protocol (§6.8). The React shell uses that protocol in-process from day one, so a SwiftUI or Compose shell can later host the same module in a WebView without rework.

**Can I use it, and what does it cost?** Yes. Every recommended piece is free for commercial use (MIT, plus GSAP's no-charge licence). The only unavoidable costs are **Apple's $99/year** and **Google Play's $25 one-time** developer fees. Phaser Editor ($12/month), TexturePacker ($49.99) and Spine ($69+) are optional, and Elements doesn't need them.

---

## 2. Frameworks

### 2.1 Phaser 4

Phaser is a full 2D *game framework*. It covers rendering, scenes, input, tweens, particles, physics, audio, cameras and asset loading. It is built by Phaser Studio Inc.

**Versions and cadence**
- **Latest release:** **v4.2.1, released 2026-07-09**, which is npm `latest` ([release](https://github.com/phaserjs/phaser/releases/tag/v4.2.1), [npm](https://registry.npmjs.org/phaser)).
- **4.0.0** shipped **2026-04-10** after seven release candidates. The first RC came out 2025-04-01 ([v4.0.0](https://github.com/phaserjs/phaser/releases/tag/v4.0.0)).
- **Minor releases after 4.0:** 4.1.0 (2026-04-30), 4.2.0 (2026-06-19), 4.2.1 (2026-07-09) ([releases](https://github.com/phaserjs/phaser/releases)).
- **v4.3** is in progress, but the last commit on master was **2026-08-21** ([commits](https://github.com/phaserjs/phaser/commits/master)). So there has been no framework activity for about two months.
- **Phaser 3:** the last release is **v3.90.0, 2025-05-23** ([release](https://github.com/phaserjs/phaser/releases/tag/v3.90.0)). I found no formal statement on long-term support for the 3.x framework (UNVERIFIED).

**Licence and company**
- The framework is **MIT**, "Copyright (c) 2026 Richard Davey, Phaser Studio Inc." ([LICENSE](https://github.com/phaserjs/phaser/blob/master/LICENSE.md)).
- Phaser Studio was formed in October 2023 with funding from Open Core Ventures ([about](https://phaser.io/about)). OCV reports a $2M investment ([OCV, 2023-12](https://opencoreventures.com/blog/2023-12-phaser-studio-launched/)).
- Funding links: GitHub Sponsors and Patreon for photonstorm, plus a donate page ([FUNDING.yml](https://github.com/phaserjs/phaser/blob/master/.github/FUNDING.yml)).

**Commercial products (none needed for Elements)**
- **Phaser Editor v5** (released April 2026) is a visual desktop editor for Phaser 4. It has an MCP server and skills files for coding assistants ([editor](https://phaser.io/editor), [v5 news](https://phaser.io/news/2026/04/phaser-editor-v5-release)).
  - **$12/month**, or Enterprise "Custom".
  - **No free tier or trial**; the page suggests a one-month licence instead.
  - Games keep working after the licence lapses ([pricing](https://phaser.io/editor/pricing)).
- **Phaser AE ("Agentic Edition")** is now the main commercial product: an AI game builder in the browser, plus a CLI (`@phaser-ae/cli` 0.7.5, published 2026-10-26) ([AE](https://phaser.io/agent), [CLI](https://phaser.io/cli)).
  - **Pricing:** Pro is $20/month for 8,000 credits. Credit packs cost $10 for 3,500 credits up to $250 for 110,000 ([pricing](https://phaser.io/pricing)).
  - **Different engine and licence:** AE builds on a *separate* "kernel" engine (v3.0.0-2, WebGPU with WebGL2 fallback). It uses the **PolyForm Shield 1.0.0** licence, not MIT ([kernel](https://phaser.io/kernel), [licence](https://phaser.io/polyform-shield-license.md)).
  - **Assessment:** don't confuse it with open-source Phaser 4, and don't use it for Elements. It is a different engine, its licence isn't open source, and it is credit-metered.
- **Not found** as products in the phaser.io sitemap: "Phaser Launcher", "Phaser Nexus", "Phaser Beam". "Beam" appears only as an examples name in the v4 changelog (UNVERIFIED that they don't exist).

**Templates and React**
- **Official templates:** `template-react-ts` (React 19, Vite 6, TypeScript ~5.7), `template-vite-ts` and a Next.js template ([template-react-ts](https://github.com/phaserjs/template-react-ts)).
- **CLI:** `npm create @phaserjs/game@latest` ([create-game](https://github.com/phaserjs/create-game)).
- **Templates lag behind:** they pin **Phaser 4.0.0**, not 4.2.1, and their GitHub descriptions still say "Phaser 3".
- **How React and Phaser talk in the template:**
  - A shared `EventBus` (a Phaser EventEmitter) carries messages in both directions.
  - A `PhaserGame` React component creates the game in `useLayoutEffect`, destroys it on unmount, and exposes `{ game, scene }` through a ref.
  - Scenes emit `current-scene-ready` when they start (same repo, `src/game/EventBus.ts`, `src/PhaserGame.tsx`).

**TypeScript:** type definitions are bundled (`types/phaser.d.ts`) ([npm](https://registry.npmjs.org/phaser), [README](https://github.com/phaserjs/phaser#readme)).

**Fit for a turn-based board game**
- **Input:** one unified Pointer for mouse and touch. There are 2 pointers by default, up to 10 with `addPointer` ([input skill](https://github.com/phaserjs/phaser/blob/master/skills/input-keyboard-mouse-touch/SKILL.md)).
- **Drag and drop:** built in, through `setDraggable`, the `dragstart`/`drag`/`dragend`/`drop` events and drop zones (same source).
- **Tweens, particles, layers:**
  - Tweens and particles are built in.
  - In 4.1.0 `Layer` became a true game object that filters work on ([v4.1.0](https://github.com/phaserjs/phaser/releases/tag/v4.1.0)).
  - 4.2.1 fixed tweens with `startDelay` getting stuck ([v4.2.1](https://github.com/phaserjs/phaser/releases/tag/v4.2.1)).
- **Resizing:** the Scale Manager offers `RESIZE`, `FIT`, `ENVELOP`, `EXPAND` and other modes ([SCALE_MODE_CONST](https://github.com/phaserjs/phaser/blob/master/src/scale/const/SCALE_MODE_CONST.js)). 4.2.1 fixed "ScaleManager not resizing to parent container" (#7213, same release).
- **High-DPI (a real weak spot):**
  - The game config has **no `resolution` option**. It was removed in Phaser 3 and v4 has only `zoom`, `autoRound`, `antialias` and the pixel-art flags ([Config.js](https://github.com/phaserjs/phaser/blob/master/src/core/Config.js)).
  - Phaser's own scale skill says zoom "affects CSS display size but not the canvas resolution" ([scale skill](https://github.com/phaserjs/phaser/blob/master/skills/scale-and-responsive/SKILL.md)).
  - Sharp text is set per object with `text.setResolution(window.devicePixelRatio)` ([text skill](https://github.com/phaserjs/phaser/blob/master/skills/text-and-bitmaptext/SKILL.md)).
  - I found no built-in handling of device pixel ratio for the whole canvas (UNVERIFIED that there is none).
  - Assessment: on a Retina iPad you size the canvas at CSS size × DPR yourself and scale it down. AI assistants often get this wrong.
- **Renderer:**
  - v4 rebuilt the WebGL renderer ("Render Nodes").
  - The **Canvas renderer is deprecated** and v4's advanced features don't work on it.
  - **There is no WebGPU in Phaser 4**; only the separate AE kernel has it ([migration guide](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md), [kernel](https://phaser.io/kernel)).
  - Assessment: WebGL 2 is fine for this game on iPad (see §4.6).
- **Accessibility:** no official screen-reader layer found (UNVERIFIED). The closest is `DOMElement`, which overlays HTML on the canvas. In v4 it throws if it has no parent container (migration guide §21). Assessment: screen-reader support would be a separate React/DOM layer (see §7).

**AI-assistant friendliness**
- **Good**
  - **2,061 runnable examples** for Phaser 4.1.0 ([examples](https://phaser.io/oss/examples)).
  - **`llms.txt`** files are live at [phaser.io/llms.txt](https://phaser.io/llms.txt), with `llms-full.txt` and `llms-examples.txt` beside it, and any phaser.io page can be read as `.md`.
  - A **docs MCP server** at `https://phaser.io/oss/docs/mcp` (tools `search_phaser_docs`, `read_phaser_doc`, `list_phaser_docs`).
  - **28 subsystem skills**, including `v3-to-v4-migration`, in the repo ([skills](https://github.com/phaserjs/phaser/tree/master/skills)).
- **Risks**
  - **v3→v4 breaking changes** that models trained on years of Phaser 3 code will trip over ([migration guide](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md)):
    - FX and masks became Filters, and `BitmapMask` is gone.
    - The tint system was reworked.
    - `Geom.Point` became `Vector2`.
    - `roundPixels` now defaults to false.
    - Mesh and Plane were removed.
  - **Some v4 docs are stale.** The masks page still describes masks v4 removed ([masks doc](https://phaser.io/oss/docs/phaser/concepts/display/masks.md)), and the Text JSDoc points to the removed config `resolution`.
  - The "For AI agents" upsell on phaser.io pages will appear whenever Claude Code fetches the docs.
  - `docs.phaser.io/llms.txt` returns 404, because the docs moved to phaser.io/oss/docs.

**Project health**
- **40,572 stars** and 176 open issues and PRs; last push 2026-08-21 ([repo](https://github.com/phaserjs/phaser)).
- Most commits are by Richard Davey (photonstorm), about 15.3k.
- **Assessment:** a healthy, long-lived project, but company attention in 2026 has shifted to Phaser AE.

### 2.2 PixiJS v8

PixiJS is a fast 2D *rendering library*. It gives a scene graph (containers, sprites, graphics, text), input events, asset loading and filters. It deliberately leaves out game rules, physics and a tween engine.

**Versions and cadence**
- **Latest release:** **8.22.0, released 2026-10-01** ([releases](https://github.com/pixijs/pixijs/releases), [npm](https://registry.npmjs.org/pixi.js)). The `dev` branch had a commit today, 2026-10-27.
- **About one minor release a month:**
  - 8.15.0 (2026-01-05)
  - 8.16.0 (02-03)
  - 8.17.0 (03-09)
  - 8.18.0 (04-14)
  - 8.19.0 (06-04)
  - 8.20.0 (08-20)
  - 8.21.0 (09-17)
  - 8.22.0 (10-01)
- **v9:** no announcement, milestone or roadmap found (UNVERIFIED).
- **v7:** last release 7.4.3 (2025-03-06), with no formal end-of-life statement found (UNVERIFIED).

**Licence:** **MIT** ([LICENSE](https://github.com/pixijs/pixijs/blob/dev/LICENSE)). There is no commercial edition or editor, so nothing to buy.

**Renderers**
- `autoDetectRenderer` tries **WebGL first**, then WebGPU, then Canvas. **WebGPU is opt-in** with `preference: 'webgpu'` ([autoDetectRenderer.ts @ v8.22.0](https://github.com/pixijs/pixijs/blob/v8.22.0/src/rendering/renderers/autoDetectRenderer.ts)).
- The renderers guide calls WebGPU "Experimental" and recommends WebGL "for production" ([renderers guide](https://pixijs.com/8.x/guides/components/renderers.md)).
- Since 8.18.0, `preference` accepts an array, which limits the fallback chain to those renderers ([v8.18.0](https://github.com/pixijs/pixijs/releases/tag/v8.18.0)).
- **A Canvas renderer returned** in 8.16.0 as an experimental feature ([v8.16.0](https://github.com/pixijs/pixijs/releases/tag/v8.16.0)). The guide still says "coming soon", so the guides lag the release notes.
- Recent WebGPU work includes device-loss recovery (8.21.0) and a Safari shader-language fallback (8.20.0) (release notes).

**React integration**
- **`@pixi/react` 8.0.5** (2025-12-01) requires **React 19+** and pixi.js ^8.2.6 ([npm](https://registry.npmjs.org/@pixi/react), [ecosystem guide](https://pixijs.com/8.x/guides/getting-started/ecosystem.md)).
  - You register components with `extend({ Container, Sprite, … })`.
  - `useApplication()` and `useTick()` are available as hooks ([README](https://github.com/pixijs/pixi-react/blob/main/README.md)).
  - The repo was last pushed 2026-01-16, so it moves more slowly than core.
- **Assessment:** for Elements, a plain imperative Pixi `BoardView` class, mounted by a small React component through a ref, is simpler than `@pixi/react`. Animations are driven by engine events through a queue (architecture §6), not by React re-renders. `@pixi/react` stays an option for static HUD pieces.

**Add-ons**
- **Official**
  - **`@pixi/ui` 2.4.1** (2026-10-01): buttons, sliders, lists, scroll boxes, checkboxes ([repo](https://github.com/pixijs/ui)).
  - **`@pixi/layout` 3.2.1** (2026-06-12): flexbox layout built on Yoga ([repo](https://github.com/pixijs/layout)).
  - Assessment: with a React shell you mostly won't need either; menus are React DOM.
- **No official tween library.** The docs ship eight **GSAP** examples ([examples dir](https://github.com/pixijs/pixijs.com/tree/main/docs/examples)). `@pixi/animate` is v7-only and has moved to the community org.
- **Particles:**
  - The built-in v8 `ParticleContainer` uses lightweight `Particle` objects ([v8 migration](https://pixijs.com/8.x/guides/migrations/v8.md)).
  - The old `@pixi/particle-emitter` is community-maintained, and its npm peer dependency is still `<8.0.0` ([repo](https://github.com/pixijs-userland/particle-emitter)), so whether it works with v8 is UNVERIFIED.
  - Assessment: a capture "burst" is a few dozen particles tweened by GSAP, so neither is needed.
- **Other:**
  - `pixi-filters` 6.1.5 (v8)
  - `@assetpack/core` 1.7.0 (asset pipeline, MIT)
  - `create-pixi.js` 1.4.0 (`npm create pixi.js`, [docs](https://pixijs.io/create-pixi/))
  - `@pixi/sound` 6.0.1 (stale since 2024)
  - [open-games](https://github.com/pixijs/open-games) example games
  - Source: npm registry.

**Fit for a turn-based board game**
- **Input:**
  - A DOM-like event model. `eventMode: 'static'` makes an object hit-testable.
  - `hitArea` overrides the touchable region, which is useful for making small pieces easier to tap ([events guide](https://pixijs.com/8.x/guides/components/events.md)).
  - There is an official drag example ([dragging](https://pixijs.com/8.x/examples/events/dragging)).
  - Drag and drop is about 30 lines of your own code, not a built-in system (assessment).
- **High-DPI:** set the Application options `resolution: devicePixelRatio` and `autoDensity: true` ([application guide](https://pixijs.com/8.x/guides/components/application.md)).
- **Resizing:** `resizeTo: element` uses the default ResizePlugin, throttled to animation frames ([resize plugin](https://pixijs.com/8.x/guides/components/application/resize-plugin.md)). Assessment: this suits Stage Manager and Split View, where the container resizes freely (see TN3192 in §4).
- **Layering:** containers and `zIndex`.
- **Accessibility:** **built in, opt-in.**
  - `import 'pixi.js/accessibility'` installs an AccessibilitySystem. It places invisible DOM elements over objects marked `accessible`, for screen readers and Tab navigation.
  - Per-object properties include `accessibleTitle`, `accessibleHint` and `tabIndex` ([accessibility guide](https://pixijs.com/8.x/guides/components/accessibility.md)).
  - 8.22.0 fixed a regression so Tab activates the layer again ([v8.22.0](https://github.com/pixijs/pixijs/releases/tag/v8.22.0)).

**AI-assistant friendliness**
- **Official LLM docs:** [`/llms.txt`](https://pixijs.com/llms.txt), `/llms-medium.txt` (~252 KB) and `/llms-full.txt` (~990 KB) ([llms hub](https://pixijs.com/llms)).
- **Official agent skills:** [pixijs/pixijs-skills](https://github.com/pixijs/pixijs-skills), created 2026-04-01, with 25+ skills including the v8 migration, events, accessibility and performance.
  - Claude Code: `/plugin marketplace add pixijs/pixijs-skills`.
  - Since 8.19.0 the skills also ship inside `node_modules/pixi.js/skills/` ([June 2026 blog](https://github.com/pixijs/pixijs.com/blob/main/blog/2026-06-12-pixi-june-update.mdx)).
  - No MCP server (`pixijs.com/mcp` returns 404).
- **v7→v8 breaking changes that confuse models** ([migration guide](https://pixijs.com/8.x/guides/migrations/v8.md)):
  - Initialisation is async: `await app.init()`.
  - One `pixi.js` package replaces the `@pixi/*` packages.
  - Graphics are shape first, then `.fill()`, and `beginFill`/`drawRect` are removed.
  - `app.view` became `app.canvas`.
  - Assessment: v8.0.0 shipped 2024-03-05 ([npm](https://registry.npmjs.org/pixi.js)), about 2.5 years ago, so models have seen much more v8 code than Phaser 4 code. The bundled skills make the remaining v7 slips easy to correct.
- **Examples:** 105 official examples ([examples.json](https://github.com/pixijs/pixijs.com/blob/main/src/data/examples.json)), far fewer than Phaser's 2,061.

**Project health**
- **48,553 stars**, 304 open issues and 105 open PRs; last commit 2026-10-27 ([repo](https://github.com/pixijs/pixijs)).
- Core maintainers include Mat Groves (GoodBoyDigital) and Zyie, with about 20 other contributors in the last three months.
- Over 500K npm downloads a week (June 2026 blog).
- **Funding:**
  - GitHub Sponsors and Open Collective ([FUNDING.yml](https://github.com/pixijs/pixijs/blob/dev/.github/FUNDING.yml), [Open Collective](https://opencollective.com/pixijs)).
  - Playco is listed as a $2,500/month platinum sponsor ([sponsors data](https://github.com/pixijs/pixijs.com/blob/main/src/data/manualSponsors.json), file dated 2025-09-02).

### 2.3 Konva 10 and react-konva *(added 2026-10-27)*

Konva is a 2D **Canvas** scene-graph library. Its tree is Stage → Layer → Group → Shape, and it adds events, drag and drop, tweens, filters, caching and serialization. It was forked from KineticJS (started 2012) in 2015 by Anton Lavrenov ([about](https://konvajs.org/docs/about.html)). Its home ground is design editors, annotation tools, diagrams and seat maps rather than games ([Why Konva?](https://konvajs.org/docs/guides/why-konva.html)).

**Versions and cadence**
- **Latest release:** **konva 10.9.0, published 2026-10-15**, which is npm `latest`. The changelog entry is dated 2026-10-14 ([npm](https://registry.npmjs.org/konva), [CHANGELOG](https://github.com/konvajs/konva/blob/master/CHANGELOG.md), [releases](https://github.com/konvajs/konva/releases)).
- **Cadence:**
  - 17 npm releases so far in 2026.
  - Six minor releases (10.4.0 to 10.9.0) between 2026-09-07 and 2026-10-15.
  - Last commit 2026-10-23 (npm time data, [commits](https://github.com/konvajs/konva/commits/master)).
- **Release history:**
  - **v10.0.0** was published 2025-09-05.
  - The last 9.x was 9.3.22 (2025-07-08), and 9.0.0 was 2023-04-14 (npm).
- **v10's breaking changes are about packaging, not the drawing API** (CHANGELOG):
  - The package is ES modules only, so CommonJS code needs `require('konva').default`.
  - Node.js rendering is now opt-in through `import 'konva/canvas-backend'`.
- **Assessment:** the core API (`Stage`/`Layer`/shapes, `draggable`, `node.to()`) has kept its shape for about ten years. The risk of an AI model using an old, wrong API is low, much lower than with Phaser 3→4.

**Licence and cost**
- **MIT.** The licence reads "Original work Copyright (C) 2011 - 2013 by Eric Rowell (KineticJS) / Modified work Copyright (C) 2014 - present by Anton Lavrenov (Konva)" ([LICENSE](https://github.com/konvajs/konva/blob/master/LICENSE)).
  - GitHub's licence detector shows "NOASSERTION" because of that two-line header. npm declares `MIT`.
- The FAQ says there are "no paid tiers or premium features" ([FAQ](https://konvajs.org/docs/faq.html)).
- **The commercial side is Polotno**, a design-editor SDK "by the Konva maintainers" which "sponsors ongoing development" (FAQ).
  - The docs and `llms.txt` include Polotno pointers. I treated them as marketing, like the phaser.io notice.
  - Elements doesn't need Polotno.

**Maintainers, funding, health**
- **Repo:** 14,905 stars and 2 open issues and PRs; last push 2026-10-23. The source is TypeScript ([repo](https://github.com/konvajs/konva)).
- **Bus factor about 1:**
  - About 214 of the roughly 228 commits since 2026-07-27 are by Anton Lavrenov, under two spellings of his name. The rest come from about eight one-off contributors (GitHub commits API).
  - All-time commits: lavrton 2,490 and ericdrowell (the KineticJS author) 1,082. The next contributor has 68 ([contributors](https://github.com/konvajs/konva/graphs/contributors)).
- **Funding:**
  - GitHub Sponsors (lavrton), Patreon and Open Collective `konva` ([FUNDING.yml](https://github.com/konvajs/konva/blob/master/.github/FUNDING.yml)).
  - Polotno sponsors development (FAQ).
- **Usage:**
  - npm's "last-week" endpoint returned stale data, for the window 2026-06-25 to 07-01. In that window konva had 1.98M weekly downloads and react-konva 1.61M, against 0.78M for pixi.js and 0.20M for phaser ([npm downloads API](https://api.npmjs.org/downloads/point/last-week/konva)).
  - Konva's own comparison page claims 10.1M monthly downloads against PixiJS's 3.8M, last reviewed August 2026 ([best canvas library](https://konvajs.org/docs/guides/best-canvas-library.html)). This is vendor-published.
  - Assessment: the downloads mostly come from editors and dashboards, not games.
- **Assessment:** very healthy and fast-moving, with an unusually precise changelog. But it is in practice one person, backed by a company whose business is design editors, not games.

**Rendering**
- **Canvas 2D only.** There is no WebGL or WebGPU renderer and no shaders. Konva's own docs say: "Not a game engine — Konva uses Canvas 2D, not WebGL. For 2D games with thousands of animated sprites at 60fps, use PixiJS. Konva can handle simple games, but it's optimized for interactive applications, not game loops." ([Why Konva?](https://konvajs.org/docs/guides/why-konva.html)).
- **Each Layer is its own `<canvas>`.** It has a scene canvas at the device pixel ratio plus a hit-detection canvas at ratio 1 ([about](https://konvajs.org/docs/about.html)).
  - Konva's numbers: about 41 MB per layer for a 1920×1080 Retina stage, with a warning above five layers.
  - **Mobile Safari has a hard canvas-memory ceiling**, "reported as 256 MB on some devices and 384 MB on others". Past it, "the canvas goes blank rather than degrading" ([performance tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)).
  - Assessment: a 13" iPad at 2× full screen is about 2752×2064 device pixels. So use 2–3 layers: a static board, the pieces, and an "active" layer for the dragged or animating piece.
- **Redraws:** since Konva 8 they are automatic and batched (FAQ). A change redraws the whole layer it sits on (assessment from the layer model). This is why moving pieces belong on a small separate layer.
- **High-DPI is automatic.** Konva's docs say "`Konva.pixelRatio` defaults to `window.devicePixelRatio` … You give Konva sizes in CSS pixels and it sizes the bitmap for you."
  - The docs explicitly warn against the manual "multiply by devicePixelRatio" pattern that AI assistants tend to write: "DO NOT do this in Konva" ([blurry canvas](https://konvajs.org/docs/posts/Canvas_Blurry.html)).
  - Cached nodes keep the pixel ratio they were cached at (same page).
- **Performance for this game:** I found no primary-source iPad numbers.
  - Konva's demos render [10,000 shapes](https://konvajs.org/docs/sandbox/10000_Shapes_with_Tooltip.html) and [20,000 nodes](https://konvajs.org/docs/sandbox/20000_Nodes.html).
  - Konva concedes that its Bunnymark port "is slower than the original PixiJS version" ([Jumping Bunnies](https://konvajs.org/docs/sandbox/Jumping_Bunnies.html)).
  - Whether WebKit draws Canvas 2D on the GPU inside WKWebView on iPad is not documented on webkit.org (UNVERIFIED).
  - Assessment: about 100 nodes, with one to three tweening at a time, is far below where Canvas 2D struggles. The risks are per-frame `shadowBlur`, CPU filters during animation, and redrawing a full-screen layer at DPR 2 every frame. Measure these in D9.
  - WKWebView's 60 fps cap and Low Power Mode's 30 fps cap (§4.6) apply equally to Konva and Pixi.

**Input**
- **Built-in drag:**
  - Set `draggable: true` on a node. There are also drag bounds through `dragBoundFunc` ([drag and drop](https://konvajs.org/docs/drag_and_drop/Drag_and_Drop.html), [drag bounds](https://konvajs.org/docs/drag_and_drop/Simple_Drag_Bounds.html)).
  - `Konva.dragDistance` defaults to 3 px, so a small wobble counts as a tap ([testing guide](https://konvajs.org/docs/react/Testing.html), [tap vs click](https://konvajs.org/docs/events/Mobile_Tap_And_Click.html)).
- **Drop targets are your own code.** The docs say "Konva does not support drop events. But you can write your own drop events detections" ([drop events](https://konvajs.org/docs/drag_and_drop/Drop_Events.html)).
  - Hit detection is paused during a drag unless you set `Konva.hitOnDragEnabled = true` (performance tips).
  - Assessment: this doesn't matter for Elements. The target square is computed from coordinates on a 9×9 grid.
  - The FAQ's "drop events" claim is looser than the tutorial.
- **Touch and pointer:**
  - Events include `tap`, `dbltap`, touch events and pointer events ([mobile events](https://konvajs.org/docs/events/Mobile_Events.html), [pointer events](https://konvajs.org/docs/events/Pointer_Events.html)).
  - There are multi-touch pinch and rotate demos ([gestures](https://konvajs.org/docs/sandbox/Gestures.html), [pinch zoom](https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html)).
  - 10.6.0 fixed multi-finger drag, so `stopDrag()` now ends only its own gesture (CHANGELOG).
- **Hit detection:** pixel-accurate through the hit canvas. `hitFunc` or `hitStrokeWidth` enlarge a tap target ([custom hit region](https://konvajs.org/docs/events/Custom_Hit_Region.html)).
- **Keyboard:** "There are no built-in keyboard events like `keydown` or `keyup` in Konva" ([keyboard events](https://konvajs.org/docs/events/Keyboard_Events.html)). You listen on the DOM container instead.

**Animation**
- **Built in:** `Konva.Tween` and `node.to()` with "30+ easing functions" and `onFinish`, and `Konva.Animation` for per-frame logic ([about](https://konvajs.org/docs/about.html), [tween controls](https://konvajs.org/docs/tweens/All_Controls.html), [animation](https://konvajs.org/docs/animations/Create_an_Animation.html)).
- **No timeline object.** Sequences are chained through `onFinish` callbacks ([complex tweening](https://konvajs.org/docs/tweens/Complex_Tweening.html)).
- **GSAP:**
  - I found no official Konva + GSAP guide.
  - GSAP animates properties of "generic objects" ([gsap.to()](https://gsap.com/docs/v3/GSAP/gsap.to().md)). Konva attributes are getter/setter *methods*, so the documented-safe pattern is to tween a plain object and copy values onto nodes in `onUpdate`. Whether GSAP calls Konva's methods directly is UNVERIFIED in GSAP's docs.
- **Assessment:** use GSAP timelines for the event queue (Water path, capture, combine), exactly as with Pixi. The animation code then ports between the two prototypes almost unchanged.

**Resizing (Stage Manager, Split View, TN3192)**
- There is no "resize to container" option. The documented pattern is a `ResizeObserver` on the container, a fixed virtual scene size and `stage.scale()` ([responsive canvas](https://konvajs.org/docs/posts/responsive-canvas.html)).
- **Assessment:** about 15 lines. It handles TN3192's discrete scene resizes. Each resize reallocates the layer canvases, which is fine for occasional window changes.

**Accessibility**
- **Nothing built in.** Konva's own editor demo says "Canvas is a single element. Assistive technology sees no objects … Everything a user can do with the pointer needs an equivalent in HTML" ([Canvas Editor demo](https://konvajs.org/docs/sandbox/Canvas_Editor.html)).
- **Assessment:** the same as Phaser: a React ARIA grid mirrors the board (architecture §6). This is where PixiJS's built-in accessibility layer gives it an edge.

**React integration**
- **`react-konva` 19.3.2** (2026-10-15, MIT) needs `react` and `react-dom` `^19.3.0` and `konva` `^7 … ^10` ([npm](https://registry.npmjs.org/react-konva)).
  - React's current `latest` is 19.3.1 (2026-10-14) ([npm](https://registry.npmjs.org/react)).
  - The README says: "React Konva 19.3 requires React and React DOM `^19.3.0`. For React 19.2, install the latest React Konva 19.2 release." The react-konva major version follows React's major version ([README](https://github.com/konvajs/react-konva), [React guide](https://konvajs.org/docs/react/index.html)).
- **Features:**
  - Components inside `Stage` inherit React context.
  - Konva 10.5 added `Stage.eventBatchFunc()`, so "React state updates from native input commit before the event finishes" (README, CHANGELOG 10.5.0).
  - There is an official guide to testing react-konva ([testing](https://konvajs.org/docs/react/Testing.html)).
  - It does not support React Native (README).
- **Assessment:**
  - react-konva is the most mature React canvas binding of the three. It comes from the same maintainer and is released in lockstep with Konva.
  - For Elements the advice is the same as for Pixi: animations are driven by an event queue (architecture §6). So an imperative `BoardView` class that owns Konva nodes is still the better shape.
  - react-konva can draw the static parts (board, zones, coordinates).

**TypeScript:** the source is TypeScript and the types are bundled (`lib/index.d.ts`, npm). Since 10.4.0 the published declarations keep JSDoc, so hover documentation works. 10.6.0 made the types stricter; for example, `getPointerPosition()` can now be `null` (CHANGELOG).

**AI-assistant friendliness**
- **LLM docs:** [`/llms.txt`](https://konvajs.org/llms.txt) (5.7 KB) and `/llms-full.txt` (about 1.4 MB).
- **MCP:** a docs MCP server run by the third party CrawlChat (`npx crawl-chat-mcp --id=…`) ([AI tools](https://konvajs.org/docs/ai_tools.html)).
- **No official agent skills** found (UNVERIFIED).
- **Examples:** about 69 sandbox demos with runnable code, counted in `llms-full.txt` (the docs say "60+"). Each tutorial has React, Vue, Svelte and Angular variants.
- **Caveat:** vendor comparison pages are marketing. For example, the canvas-library comparison lists PixiJS's framework bindings as "community only", but `@pixi/react` is official (§2.2) ([best canvas library](https://konvajs.org/docs/guides/best-canvas-library.html)).
- **Assessment: very AI-friendly.**
  - The API is small, stable and object-oriented, with years of examples in training data.
  - Two classic AI mistakes are designed out: Retina handling is automatic, and drag is a flag.

**Limits for later polish**
- **Filters:** Blur, Brightness, Contrast, Emboss, Enhance, Grayscale, HSL, HSV, Invert, Kaleidoscope, Mask, Noise, Pixelate, RGB, Sepia, Solarize, Threshold, plus custom ones.
  - Filters work on CPU `ImageData` and need `cache()` first: "To apply filter to an `Konva.Image`, we have to cache it first" ([filters](https://konvajs.org/docs/filters/Blur.html)).
  - CSS filter strings are also supported (CHANGELOG 10.4.0, 10.6.0).
- **Blend modes:** `globalCompositeOperation` per node. Since 10.7.0, "isolated" groups apply opacity and blend mode to a whole group ([isolated groups](https://konvajs.org/docs/groups_and_layers/Isolated_Groups.html)).
- **Caching and shadows:** `cache()` turns a node into a bitmap ([shape caching](https://konvajs.org/docs/performance/Shape_Caching.html)). Shadows are built in but cost an extra pass ([optimize strokes](https://konvajs.org/docs/performance/Optimize_Strokes.html)).
- **Missing:** a particle system, shaders, GPU filters (displacement, bloom), and meshes.
- **Assessment:**
  - Enough for v1 polish: a glow from `shadowBlur`, a capture burst of about 30 tweened circles, colour flashes, pre-rendered sprite sheets.
  - Not enough for shader-grade effects such as water ripples or bloom, which Pixi has through filters and `pixi-filters`.
  - Adding a WebGL layer to Konva later would in practice mean a second board implementation. The `BoardView` interface (§7) keeps that contained.

**Head-to-head for Elements (assessment)**

| For *this* game | **PixiJS 8** | **Konva 10** | **Phaser 4** |
|---|---|---|---|
| Renderer | WebGL (WebGPU opt-in, Canvas experimental) | Canvas 2D only | WebGL (Canvas deprecated) |
| Crisp on Retina iPad | ++ `resolution` + `autoDensity` | ++ automatic, warns against double scaling | ~ manual |
| Tap, drag, legal-square highlights | + events + `hitArea`; drag is ~30 lines | ++ `draggable: true`; drop target is grid maths | ++ draggable + drop zones |
| Short animations (slide, stack, capture) | ++ with GSAP | + Tween; GSAP for timelines | ++ built-in tweens and timelines |
| Polish ceiling (particles, glow, shaders) | ++ GPU filters, particles, blend modes | ~ CPU filters, shadows, composite ops; no shaders | ++ filters, particles |
| iOS memory | one WebGL canvas | two canvases per layer; Safari cap | one WebGL canvas |
| Accessibility | + built-in DOM layer | – DIY HTML mirror | – DIY |
| React | + `@pixi/react` 8 or imperative | ++ `react-konva` 19.3, lockstep releases | + template + EventBus |
| AI-assistant fit | ++ llms.txt + official skills; v7/v8 slips | ++ stable API, llms.txt, third-party MCP | + skills + MCP, but v3/v4 confusion |
| Project health | ++ team, monthly releases | + very active, about one maintainer | ~ quiet since August |
| Keeps engine separate | ++ | ++ (no game-state model) | + (scenes invite state) |

**Which pair should the D9 prototype compare? (assessment)**
- **PixiJS vs Konva.** These two embody the real trade-off for Elements:
  - Konva: the simplest interaction model, the best React fit and the fewest AI mistakes, with a lower ceiling for polish.
  - PixiJS: GPU rendering, a built-in accessibility layer and a high ceiling for polish, with slightly more code for drag.
  - Both are libraries, so both slot into the same `BoardView` and GSAP queue. Comparing them is cheap and fair.
- **Drop Phaser from D9.** Its distinctive strengths (scenes, physics, a game loop, particles) mostly target games that Elements isn't. Its weaknesses (manual DPR, v4 version confusion, a quiet repo) hit exactly the "built by a designer with Claude Code, excellent on iPad" criteria. Keep it as a reserve if both libraries disappoint on "game feel".
- **All three** only if the slice turns out very cheap to build with Claude Code. Comparing on device (iPad Stage Manager, iPhone, Android, browser) is the expensive part, and a third candidate adds 50% to it for little expected information.

### 2.4 Excalibur.js (brief)

- **Latest:** **0.32.0** (2025-12-23), **still pre-1.0**. A 0.33 alpha was published 2026-10-24 ([npm](https://registry.npmjs.org/excalibur), [releases](https://github.com/excaliburjs/Excalibur/releases)).
- **Licence:** **BSD-2-Clause**, free ([repo](https://github.com/excaliburjs/Excalibur)).
- **TypeScript-first:** "built from the ground up for TypeScript" ([site](https://excaliburjs.com/)).
- **Activity:** 2,360 stars, last push 2026-10-25. It is mostly two maintainers (eonarheim, kamranayub).
- **Input:** unified pointer events with drag, no gesture recognizer ([pointers](https://excaliburjs.com/docs/pointers)).
- **Gaps:** no accessibility layer documented (UNVERIFIED), and no `llms.txt` (404).
- **Assessment:** pleasant API, but pre-1.0, a small community and few examples for AI models. Not recommended.

### 2.5 KAPLAY, the successor to Kaboom (brief)

- **Kaboom** was archived by Replit on 2024-11-12, and its README points to KAPLAY ([kaboom](https://github.com/replit/kaboom)).
- **KAPLAY versions:**
  - Stable is **3001.0.19 (2025-06-15)**.
  - Development is on **4000.0.0-alpha** (alpha.27.1, 2026-05-12) ([npm](https://registry.npmjs.org/kaplay), [releases](https://github.com/kaplayjs/kaplay/releases)).
- **Licence:** MIT. Funded through Open Collective ([site](https://kaplayjs.com/)).
- **Activity:** 1,817 stars, last push 2026-10-22. No `llms.txt` or MCP.
- **Assessment:** designed for quick arcade games. The stable line hasn't had a release in 16 months, and v4000 is still alpha. Not recommended.

### 2.6 Cocos Creator / COCOS 4 (brief)

- **Cocos Creator 3.8.8** (2025-12-16) is the latest 3.x release. The engine is MIT and the editor a free download, and I found no revenue-share terms ([releases](https://github.com/cocos/cocos-engine/releases), [Creator](https://www.cocos.com/en/creator)).
- **Scripting and platforms:** scripted in TypeScript. Targets web, iOS, Android and mini-game platforms, using Metal/Vulkan natively and WebGL on the web (cocos-engine README).
- **COCOS 4:**
  - Repo: [cocos/cocos4](https://github.com/cocos/cocos4), MIT. Latest release **4.0.0-alpha.35** (2026-10-13), with a `4.0.0-beta.0` tag cut 2026-10-19.
  - The engine and editor are being separated, and a MIT CLI with an MCP server is being added ([cocos-cli](https://github.com/cocos/cocos-cli)).
  - A press release says SUD acquired COCOS in Nov 2025 and made v4 fully MIT and "AI Native" ([press release, 2026-01-05](https://technode.global/prnasia/cocos-4-is-here-fully-open-source/)). Pricing of the new PinK IDE: UNVERIFIED.
- **Assessment:**
  - Cocos is editor-first and wants to own the whole app, so it fits a React shell poorly.
  - It is in the middle of a major transition, and English learning material is thinner.
  - Not recommended for Elements.

### 2.7 Others worth knowing in 2026 (brief)

- **melonJS 20.11.0** (2026-10-27, MIT): renders with WebGPU, then WebGL2, then Canvas ([site](https://melonjs.org/)). It is a small community (6.4k stars).
- **LittleJS 1.28.0** (2026-10-20, MIT): a tiny, size-optimised engine ([repo](https://github.com/KilledByAPixel/LittleJS)).
- **PlayCanvas:**
  - Engine v2.23.3 (2026-10-15, MIT) ([repo](https://github.com/playcanvas/engine)), mainly 3D.
  - Cloud editor plans: Free $0, Personal $15/month, Organization $50/seat/month ([plans](https://playcanvas.com/plans)).
  - Has an `llms.txt` ([llms.txt](https://developer.playcanvas.com/llms.txt)).
- **Rive** (animated vector graphics with state machines):
  - Runtimes are MIT; web runtime `@rive-app/canvas` 2.47.1 (2026-10-24).
  - Editor: Free (exports carry a Rive splash), or $9 and $32 per seat per month ([pricing](https://rive.app/pricing)).
  - Assessment: worth considering for animated menu elements or a Wizard idle animation, alongside any renderer.

### 2.8 Three.js and Babylon.js, if a 3D mode comes later

- **three.js r186 (0.186.1, 2026-09-24, MIT)** ([releases](https://github.com/mrdoob/three.js/releases)).
  - `WebGPURenderer` from `three/webgpu` uses the TSL shader language, which works with both WebGPU and WebGL backends.
  - The docs still call `WebGLRenderer` the mature default ([llms.txt](https://threejs.org/docs/llms.txt)).
  - React bindings: **react-three-fiber 9.8.2** (2026-10-14, MIT) ([npm](https://registry.npmjs.org/@react-three/fiber)).
- **Babylon.js 9.32.1 (2026-10-27, Apache-2.0)**. 9.0 shipped 2026-03-26 with a WebGPU-centric feature set ([npm](https://registry.npmjs.org/@babylonjs/core), [Windows dev blog](https://blogs.windows.com/windowsdeveloper/?p=57710)). Has an `llms.txt` ([llms.txt](https://doc.babylonjs.com/llms.txt)).
- **Assessment:**
  - Neither is the right choice for the v1 2D board: you'd pay for camera, lighting and 3D-asset complexity you don't need.
  - Both are relevant if a **3D board mode** is wanted later. Because the board is a view of plain engine state behind a `BoardView` interface (§7), a 3D board can be a *second* implementation (three.js with react-three-fiber is the most AI-familiar) without touching the engine, the session or the React menus.
  - Choosing Pixi or Phaser now doesn't block that.

---

## 3. Framework comparison table

++ strong · + good · ~ workable with effort · – weak. The ratings are my assessment, based on the facts in §2.

| Criterion | **PixiJS 8** | **Konva 10** | **Phaser 4** | Excalibur 0.32 | KAPLAY 3001 | Cocos 3.8 / 4 α |
|---|---|---|---|---|---|---|
| Licence / cost | ++ MIT, nothing to buy | ++ MIT, no paid tier (maintainers sell Polotno, not needed) | ++ MIT. Editor $12/mo optional; AE is a separate paid product | ++ BSD-2 | ++ MIT | ++ MIT, free editor |
| Latest release | 8.22.0 (2026-10-01) | 10.9.0 (2026-10-15) | 4.2.1 (2026-07-09) | 0.32.0 (2025-12-23) | 3001.0.19 (2025-06-15) | 3.8.8 (2025-12-16); 4.0 alpha |
| Renderer | WebGL default; WebGPU opt-in; Canvas experimental | Canvas 2D only | WebGL (Canvas deprecated) | not assessed | not assessed | Metal/Vulkan native, WebGL web |
| Cadence | ++ monthly; commit today | ++ ~weekly this autumn; commit 2026-10-23 | + 1–2 months after 4.0; quiet since Aug | + active, still 0.x | ~ stable line stalled; v4000 alpha | ~ in transition |
| Game features out of the box | ~ rendering + input; tweens via GSAP | ~ shapes, drag, tweens, CPU filters; no particles; not a game engine (own docs) | ++ scenes, tweens, particles, drag & drop, audio | + scenes, actors, tweens | + components | ++ full editor engine |
| Polish ceiling (particles, filters, shaders) | ++ GPU filters, `pixi-filters`, particles, blend modes | ~ CPU filters (need `cache()`), shadows, composite ops; no shaders | ++ filters, particles | not assessed | not assessed | not assessed |
| Touch / drag | + events + `hitArea`; drag is your code | ++ `draggable: true`, multi-touch, `hitFunc`; drop targets DIY | ++ built-in draggable + drop zones | + pointers + drag | + | + |
| High-DPI iPad | ++ `resolution` + `autoDensity` | ++ automatic (`Konva.pixelRatio` = DPR) | ~ no global DPR setting; manual | + | + | + |
| Resize (Stage Manager) | ++ `resizeTo` element | + ResizeObserver + `stage.scale()` (documented pattern) | + Scale Manager RESIZE (fixed in 4.2.1) | + | + | + |
| Accessibility | + built-in DOM overlay | – none; HTML mirror recommended | – none found | – none found | – | – |
| Fits inside React | ++ library; `@pixi/react` or imperative | ++ `react-konva` 19.3 (React ^19.3), lockstep releases | + official React template + EventBus | + | ~ | – wants to own the app |
| Keeps engine separate | ++ no game-state model to fight | ++ no game-state model | + scenes hold state unless disciplined | + | ~ | ~ |
| AI docs | ++ llms.txt (3 sizes) + official skills | + llms.txt + llms-full; third-party (CrawlChat) MCP; no skills found | ++ llms.txt + docs MCP + skills; upsell blocks on pages | – none | – none | ~ CLI MCP (alpha) |
| Version confusion risk | + v8 is 2.5 years old | ++ API shape stable ~10 years; v10 changes packaging only | – v4 is 6 months old; v3 dominates training data | ~ | ~ | – v3→v4 rewrite |
| Examples | + 105 official + open-games | + ~69 sandbox demos, per-framework variants | ++ 2,061 | ~ | ~ | + |
| Health | ++ 48.5k★, monthly, sponsored | + 14.9k★, very active, bus factor ≈ 1, Polotno-sponsored | + 40.6k★, company-backed, focus shifted to AE | ~ 2.4k★ | ~ 1.8k★ | ~ ownership change |

---

## 4. Shells

### 4.1 Capacitor (Ionic)

Capacitor wraps a web app in a native iOS and Android project, using WKWebView on iOS. Plugins expose native features to JavaScript.

**Versions and requirements**
- **8.5.3** (2026-10-07) is stable. **9.0.0-alpha.8** is on `next` ([npm](https://registry.npmjs.org/@capacitor/core), [releases](https://github.com/ionic-team/capacitor/releases)).
- iOS 15+ with Xcode 26+ ([iOS docs](https://capacitorjs.com/docs/ios)).
- Android 7+ (API 24), target SDK 36 ([Android docs](https://capacitorjs.com/docs/android), [8.0 update guide](https://capacitorjs.com/docs/updating/8-0)).
- Node 22+ ([environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)).

**Licence and cost**
- **MIT**, free.
- Ionic stopped selling **all commercial products** on 2025-02-11, including Appflow cloud builds, Identity Vault and Portals. Ionic wrote: "we have discontinued new customer sales for all Ionic commercial products and services". Appflow users keep access through **2027-12-31**, and "Ionic Framework and Capacitor, will remain free and open source" ([Ionic blog](https://ionic.io/blog/important-announcement-the-future-of-ionics-commercial-products)).
- `ionic.io/pricing` now redirects to the home page.
- **So there is no paid tier to buy.** Builds happen locally in Xcode and Android Studio, or in any CI.

**Plugins Elements would use** (all MIT, v8)
- **[`@capacitor/haptics`](https://capacitorjs.com/docs/apis/haptics)** 8.0.2: impact, notification and selection feedback, backed by UIKit's feedback generators.
- **[`@capacitor/status-bar`](https://capacitorjs.com/docs/apis/status-bar)** 8.0.4. Its `setOverlaysWebView` is "Not available on Android 15+", where edge-to-edge is enforced.
- **[SystemBars](https://capacitorjs.com/docs/apis/system-bars)** (in core since 8.0) handles edge-to-edge safe areas.
  - It works around Android WebViews before 140, where CSS `env(safe-area-inset-*)` is broken. It needs `viewport-fit=cover`.
  - Capacitor 9 will default to native inset handling.
  - On iOS, `env(safe-area-inset-*)` works "out of the box" ([community safe-area README](https://github.com/capacitor-community/safe-area)).
- **[`@capacitor/screen-orientation`](https://capacitorjs.com/docs/apis/screen-orientation)** 8.0.2 and **`@capacitor/splash-screen`** 8.0.2.

**iPad resizing (important)**
- Capacitor's Screen Orientation page still says an iPad's orientation "cannot be locked" unless you set `UIRequiresFullScreen` ([docs](https://capacitorjs.com/docs/apis/screen-orientation)).
- That advice is **outdated** under Apple's TN3192: from the iOS 27 SDK, the key "no longer opts your app out of resizing" ([TN3192](https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key)).
- Capacitor 8.5+ uses the UIScene lifecycle ([8.5 update](https://capacitorjs.com/docs/updating/8-5)).
- **Assessment:** design the board for any window size from day one. Pixi's `resizeTo` and Phaser's RESIZE mode both work on the canvas's container.

**Store builds**
- Commands: `npx cap add ios|android`, `npx cap sync`, `npx cap open ios|android`.
- `npx cap build` "will build the native project to create a signed AAB, APK or IPA file". It has App Store and AAB options ([CLI build](https://capacitorjs.com/docs/cli/commands/build)).
- A Mac with Xcode is needed for iOS.

**WKWebView settings that matter for a game** ([config](https://capacitorjs.com/docs/config)):
- `ios.scrollEnabled: false`
- `ios.zoomEnabled` (default false)
- `ios.allowsLinkPreview: false`
- `ios.contentInset`
- `ios.backgroundColor`
- `ios.webContentsDebuggingEnabled`, so Safari Web Inspector works on device builds

**AI tooling**
- No official `llms.txt` (404) or MCP found.
- Third parties publish MCPs, for example [Capawesome](https://capawesome.io/docs/ai/mcp/capacitor/), which states it is not affiliated with Ionic.
- Assessment: this matters little, because 95% of the code is ordinary web code.

### 4.2 Expo / React Native hosting the game

There are two ways to put a web canvas game inside an Expo app:
1. **`react-native-webview`** 14.0.1 (2026-06-20, MIT) ([npm](https://registry.npmjs.org/react-native-webview)): load the bundled game HTML and message it with `postMessage`.
2. **Expo DOM components:** mark a React component file with `'use dom'`, and on native Expo renders it inside a WebView ([DOM components guide](https://docs.expo.dev/guides/dom-components/)).
   - The WebView is `@expo/dom-webview` by default from SDK 56. Expo SDK 58 is current (`expo` 58.0.19, 2026-10-23, [npm](https://registry.npmjs.org/expo)).
   - Props must be serializable. Callbacks into native ("native actions") must be async functions.
   - Listed limitations: no `children`, "cannot add native views", SPA only.

**What Expo's own docs say**
- DOM components exist to enable "incremental migration for an entire website to a universal app by moving on a per-component basis".
- They "only support standard JavaScript, which is slower to parse and start up than optimized Hermes bytecode".
- "The web also has very good WebGL support, with the caveat that devices in low-power mode will often throttle web frame rates".
- "We recommend using truly native views whenever possible." ([guide](https://docs.expo.dev/guides/dom-components/))

**Trade-offs vs Capacitor** (assessment)
- **Plus:** menus, settings and navigation can be *truly native* React Native screens. Expo has the best AI tooling (official Claude Code plugin, MCP, `llms.txt`; see [tech-stack §3.1](tech-stack.md)).
- **Minus:**
  - The game board is still a WebView, so board performance is the same as Capacitor.
  - You add a second UI world (React Native) and an async bridge between the board and the shell.
  - You get two build systems and Expo's three SDK upgrades a year.
  - The web build of the menus goes through react-native-web, while the board is plain web.
  - For a board that *is* the app, this is more moving parts than Capacitor for little gain.
- **When it would win:** if the D9 prototype shows that native-feeling menus, sheets and navigation matter more than a single simple codebase.

### 4.3 A native Swift shell around WKWebView

**What it gives**
- Full control of the iOS side.
- JavaScript calls `window.webkit.messageHandlers.<name>.postMessage(...)` and Swift receives it in a `WKScriptMessageHandler`. `WKScriptMessageHandlerWithReply` allows replies ([WKScriptMessageHandler](https://developer.apple.com/documentation/webkit/wkscriptmessagehandler), [WithReply](https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply)).
- `isInspectable` (iOS 16.4+) enables Safari Web Inspector ([docs](https://developer.apple.com/documentation/webkit/wkwebview/isinspectable)).
- WWDC25 added a SwiftUI `WebView`/`WebPage` API ([WebKit blog](https://webkit.org/blog/16993/)).
- You could later add native extras such as Game Center or widgets.

**Effort (assessment)**
- A few hundred lines of Swift: the web view, the asset scheme, haptics, safe areas and the message bridge. That is essentially rebuilding what Capacitor already provides.
- **Android needs a separate Kotlin shell**, and both must be maintained.
- Choose this only if Capacitor proves limiting, which is unlikely for this game.
- *Added 2026-10-27:* §6 covers native shells on every platform (SwiftUI, Compose, React web) in depth: asset loading, bridges, where the engine runs, and the cost.

### 4.4 PWA only

**What works on iOS in 2026**
- **Opens as an app:** from Safari 26, "every website added to the Home Screen opens as a web app" by default ([WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/), 2025-09-15).
- **Web Push and badging** work for Home Screen web apps since iOS/iPadOS 16.4, with permission following a user gesture ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)).
- **Storage:**
  - Home Screen apps have their own 7-day-of-use counter for the storage-eviction rule ([WebKit, 2020](https://webkit.org/blog/10218/)).
  - From Safari 17 they get the same quota as in the browser (up to 60% of disk per origin), and `persist()` can be granted ([WebKit, 2023](https://webkit.org/blog/14403/)).
  - Assessment: saved games in IndexedDB are reasonably safe, but not guaranteed.
- **Screen Wake Lock:** shipped in 16.4 ([WebKit](https://webkit.org/blog/13966/)) and was fixed for Home Screen apps in 18.4 ([WebKit](https://webkit.org/blog/16574/)).

**What doesn't**
- **No haptics:** WebKit's position on the Vibration API is "oppose" ([standards position](https://github.com/WebKit/standards-positions/issues/267)).
- **No element fullscreen on iPhone:** bug 206854 is still open ([bug](https://bugs.webkit.org/show_bug.cgi?id=206854)). It works on iPad.
- **No App Store presence.**

**Assessment:** a free bonus of the web stack, good for sharing a link and for playtesting. It is not enough on its own for "iPad first-class" (D3).

### 4.5 App Store Review Guidelines for a web-tech game in a native shell

Source: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), "Last Updated: October 16, 2026". The quotes below are verbatim.

- **4.2 Minimum Functionality:** "Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or "app-like," it doesn't belong on the App Store. If your App doesn't provide some sort of lasting entertainment value or adequate utility, it may not be accepted."
- **4.2.2:** "Other than catalogs, apps shouldn't primarily be marketing materials, advertisements, web clippings, content aggregators, or a collection of links."
- **4.2.3 (ii):** "If your app needs to download additional resources in order to function on initial launch, disclose the size of the download and prompt users before doing so."
- **4.2.6:** "Apps created from a commercialized template or app generation service will be rejected unless they are submitted directly by the provider of the app's content." Assessment: this targets white-label services. A game you build and submit yourself, even with AI assistants, is "submitted directly by the provider".
- **4.7:** "Mini apps, mini games, streaming games, chatbots, plug-ins, and game emulators. Apps may offer certain software that is not embedded in the binary, specifically HTML5 and JavaScript mini apps and mini games, streaming games, chatbots, and plug-ins. … You are responsible for all such software offered in your app, including ensuring that such software complies with these Guidelines and all applicable laws."
- **4.7.2:** "Your app may not extend or expose native platform APIs or technologies to the software without prior permission from Apple."
- **2.5.2:** "Apps should be self-contained in their bundles, and may not read or write data outside the designated container area, nor may they download, install, or execute code which introduces or changes features or functionality of the app, including other apps."

**What this means for Elements (assessment)**
- **4.7 doesn't apply.** It covers HTML5 games that are *not embedded in the binary*, such as a host app serving third-party mini games. Elements ships all its game code inside the app bundle, so 4.7 and its 4.7.2 limit on exposing native APIs don't apply.
- **2.5.2 rules out downloading game code later.** Don't change the rules or features by fetching JavaScript after review. Ship updates through the App Store.
  - A Capacitor "live update" service would be the risky pattern here.
  - Rule changes delivered as *data* (variant configs) are a grey area. Keep feature changes in app updates.
- **4.2 is the one to design for:**
  - Bundle everything so it works offline.
  - Use native haptics.
  - Have no browser chrome or external links as navigation.
  - Make the iPad layout proper.
  - Later, add push for online turns.
  - With those, a self-contained game is not a "repackaged website". The risk is low but never zero, because review is case by case.

### 4.6 WebGL and WebGPU inside WKWebView on iPad: performance notes

- **WebGL 2** has been in WebKit since Safari 15 and "now runs on top of Metal" ([WebKit, Safari 15](https://webkit.org/blog/11989/new-webkit-features-in-safari-15/)).
- **WebGPU:**
  - Shipping in Safari 26.0 on iOS and iPadOS, and WebKit says it "supersedes WebGL … preferred for new sites" ([WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)).
  - Apple's WWDC25 session 236 says WebGPU is supported wherever Metal is, including iPhone and iPad ([WWDC25 236](https://developer.apple.com/videos/play/wwdc2025/236/)).
  - Whether it is on by default in **WKWebView** (not just Safari) isn't stated on webkit.org. A forum reply says it is enabled there from iOS 26 (secondary, affiliation unconfirmed, [forum](https://developer.apple.com/forums/thread/770862)), so this is UNVERIFIED.
  - Assessment: irrelevant to the decision. PixiJS uses WebGL by default and Phaser 4 is WebGL-only, and a 9×9 board is far below WebGL's limits.
- **Frame rate:**
  - WKWebView animation runs at about **60 fps even on 120 Hz ProMotion iPads**. WebKit bug 294338, "Allow WKWebView to Support 120Hz Refresh Rate on ProMotion Devices", is still open and unassigned ([bug 294338](https://bugs.webkit.org/show_bug.cgi?id=294338), last change 2026-09-17).
  - Commenters there say no public API exists (secondary).
  - Assessment: 60 fps is fine for a board game. Don't use private-API plugins to unlock 120 Hz, because that risks App Review.
- **Low Power Mode** caps `requestAnimationFrame` at 30 fps, and WebKit says "This is intentional" ([bug 215745](https://bugs.webkit.org/show_bug.cgi?id=215745), 2020). Expo's DOM-components guide warns about the same thing.
  - Assessment: animations should be time-based (GSAP and Phaser tweens are), so they take the same time at 30 fps, just less smoothly.
- **JIT:** that WKWebView runs JavaScript with the full JIT compiler is widely stated but I found no Apple primary source (UNVERIFIED). Assessment: an AI bot in a Web Worker should be benchmarked on a real iPad in the prototype.
- **Resizing:** TN3192 says that from the iOS/iPadOS 27 SDK "the system resizes your app's scene discretely". It notes `isInteractivelyResizing` is "helpful for games", and `prefersInterfaceOrientationLocked` is not guaranteed ([TN3192](https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key)). Inside a WebView this shows up as ordinary container resize events.

---

## 5. Shell comparison table

The ratings are my assessment, based on the facts in §4.

| Criterion | **Capacitor 8** | Expo + DOM component / WebView | Swift WKWebView shell | PWA only |
|---|---|---|---|---|
| Licence / cost | ++ MIT; no paid Ionic tier exists now | ++ MIT; EAS cloud builds optional ($0 / $19 / $199 per month, [tech-stack §3.1](tech-stack.md)) | ++ free (your time) | ++ free |
| iOS + Android + web from one codebase | ++ | + (board web; menus RN + react-native-web) | – iOS only | + web only; Android TWA possible |
| Board performance | same WKWebView | same WKWebView, plus a bridge | same WKWebView | Safari; same engine |
| Native feel of menus | ~ web UI, made app-like with care | ++ native screens | ++ if written in SwiftUI | ~ |
| Haptics | ++ plugin | ++ expo-haptics | ++ | – none on iOS |
| Safe areas / status bar | + CSS `env()` + SystemBars | ++ | ++ | + CSS `env()` |
| Store builds | + Xcode / Android Studio, `npx cap build` | + EAS or local | + Xcode; Android separate | – no stores (Play via TWA) |
| Complexity for a non-developer | + one web project plus two thin native folders | ~ two UI worlds plus a bridge | – Swift + Kotlin | ++ simplest |
| AI tooling | + web code; no official MCP | ++ official Claude plugin, MCP, llms.txt | + | ++ |
| App Store 4.2 risk | low with offline, haptics, iPad layout | lowest (native menus) | low | n/a |

---

## 6. Native shells per platform *(added 2026-10-27)*

**The question:** React is only the shell. So could the shell be native on each platform: SwiftUI on iPad and iPhone, Jetpack Compose on Android, and a React shell for the web? The board (a web canvas) and the TypeScript engine would stay shared.

**Short answer:** yes, it is technically clean. The board runs in a WebView inside each native app, and the shell talks to it through a message bridge. But it multiplies UI work by three for gains that matter little to a board game in v1. Capacitor can already add native screens where they pay off. The cheap insurance is to build the game module behind a message protocol now (§6.8).

### 6.1 The hosting pattern: a native app embedding the web board

**iOS and iPadOS (WKWebView, or SwiftUI `WebView`)**
- **SwiftUI view:** since iOS/iPadOS 26 there is a SwiftUI `WebView`, driven by an `Observable` `WebPage` ([WebView](https://developer.apple.com/documentation/webkit/webview-swift.struct), [WebPage](https://developer.apple.com/documentation/webkit/webpage)).
  - `WebPage` has `callJavaScript(_:arguments:in:contentWorld:)`.
  - Its `Configuration` has `urlSchemeHandlers` and a `userContentController` (same pages, [URLSchemeHandler](https://developer.apple.com/documentation/webkit/urlschemehandler)).
  - "You can only bind a WebPage to a single WebView at a time" (WebView page).
  - On iOS 15–18, wrap `WKWebView` in `UIViewRepresentable` (assessment).
- **Loading bundled assets offline**, two options:
  1. **`loadFileURL(_:allowingReadAccessTo:)`** (iOS 9+) loads a local file and grants read access to a directory ([docs](https://developer.apple.com/documentation/webkit/wkwebview/loadfileurl(_:allowingreadaccessto:))).
     - Assessment: pages served from `file://` have an opaque origin. Then ES modules, `fetch()` of local JSON and Web Workers are fragile, and Vite builds use all three.
  2. **A custom scheme with `WKURLSchemeHandler`** (iOS 11+): "A protocol for loading resources with URL schemes that WebKit doesn't handle". It is registered with `setURLSchemeHandler(_:forURLScheme:)` ([WKURLSchemeHandler](https://developer.apple.com/documentation/webkit/wkurlschemehandler), [setURLSchemeHandler](https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/seturlschemehandler(_:forurlscheme:))).
     - Apple's advice: "include the name of your app or company in any custom scheme names". Calling it twice for one scheme is "a programmer error".
     - **This is what Capacitor does:** `server.iosScheme` defaults to `capacitor` and "Can't be set to schemes that the WKWebView already handles, such as http or https" ([Capacitor config](https://capacitorjs.com/docs/config)).
     - Assessment: use a scheme such as `elements://app/`. It gives the bundle a stable origin, so modules, workers and IndexedDB behave as on the web.
- **JS → native:**
  - The page calls `window.webkit.messageHandlers.<name>.postMessage(...)`, and Swift receives it in a `WKScriptMessageHandler`.
  - With `addScriptMessageHandler(_:contentWorld:name:)` (iOS 14+), the handler "returns a reply to your JavaScript code", so JavaScript gets a Promise ([docs](https://developer.apple.com/documentation/webkit/wkusercontentcontroller/addscriptmessagehandler(_:contentworld:name:)), [WithReply](https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply)).
- **Native → JS:**
  - `evaluateJavaScript(_:completionHandler:)` runs a string, and its completion handler "always runs on the app's main thread" ([docs](https://developer.apple.com/documentation/webkit/wkwebview/evaluatejavascript(_:completionhandler:))).
  - `callAsyncJavaScript(_:arguments:in:in:completionHandler:)` (iOS 14+) passes **arguments** separately from the function body and awaits returned promises ([docs](https://developer.apple.com/documentation/webkit/wkwebview/callasyncjavascript(_:arguments:in:in:completionhandler:))).
  - Assessment: prefer `callAsyncJavaScript` with arguments over building JS strings. It avoids injection and escaping bugs.
- **Security notes:**
  - `WKContentWorld` separates the bridge's own scripts from page scripts ([docs](https://developer.apple.com/documentation/webkit/wkcontentworld)).
  - `WKScriptMessage.frameInfo` tells you which frame sent a message, so the handler can reject anything not from your own origin and main frame ([docs](https://developer.apple.com/documentation/webkit/wkscriptmessage/frameinfo)).
  - `limitsNavigationsToAppBoundDomains` restricts navigation to the app's domains ([docs](https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/limitsnavigationstoappbounddomains)).
  - `isInspectable` (iOS 16.4+) enables Safari Web Inspector in debug builds (§4.3).
  - App Review: guideline 4.7.2 limits exposing native APIs to software *not embedded in the binary*. Elements' bundle is embedded, so this doesn't apply (§4.5).

**Android (WebView, wrapped in Compose)**
- **Compose has no WebView composable.** The official guide wraps `android.webkit.WebView` in `AndroidView`. It warns that WebView "has complex state lifecycles" separate from Compose's, and that nested scrolling is hard ([wrap WebView in Compose](https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/wrap-webview-in-compose)).
- **Loading bundled assets offline: `WebViewAssetLoader`** (androidx.webkit 1.18.0) is "a flexible and performant way to load in-app content". It supports "Loading content with an HTTP(S) URL for compatibility with the same-origin policy" ([load local content](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content), updated 2026-10-23; [Maven](https://dl.google.com/android/maven2/androidx/webkit/webkit/maven-metadata.xml)).
  - The example serves `https://appassets.androidplatform.net/assets/index.html`.
  - `file://` URLs "are considered to be opaque origins", and Google recommends setting `setAllowFileAccessFromFileURLs` and `setAllowUniversalAccessFromFileURLs` "explicitly … to false on all API levels".
  - Capacitor uses `https` as its Android scheme by default (`server.androidScheme`, [config](https://capacitorjs.com/docs/config)).
- **JS ↔ native, three APIs:**
  1. **`addJavascriptInterface`** injects a Java/Kotlin object. It goes into *every* frame, and "the app also cannot verify the origin of the calling frame" ([native-bridge risks](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges), updated 2026-10-23). Avoid it.
  2. **`WebViewCompat.addWebMessageListener`** injects a JS object only into frames whose origin matches `allowedOriginRules`.
     - The page calls `obj.postMessage(String | ArrayBuffer)`, and native code replies through a `JavaScriptReplyProxy`.
     - Feature-check it with `WebViewFeature.WEB_MESSAGE_LISTENER`.
     - The Javadoc warns that "this is a powerful API … The HTTPS scheme is strongly recommended" and that a `*` wildcard injects into all frames ([WebViewCompat source Javadoc](https://github.com/androidx/androidx/blob/androidx-main/webkit/webkit/src/main/java/androidx/webkit/WebViewCompat.java), [reference](https://developer.android.com/reference/androidx/webkit/WebViewCompat)).
     - Assessment: this is the right default for Elements, with the origin rule set to the asset-loader origin.
  3. **`postWebMessage` / `WebMessagePort`** (MessageChannel). Google: "only allow messages from trusted domains by avoiding the use of `*` as the target origin" (native-bridge risks page).
- **Native → JS without a prior message:** `evaluateJavascript` (assessment: same string-escaping caveat as on iOS). Otherwise reply on the port set up when the page posts `ready`.

**Bridge maintenance (assessment)**
- Each shell needs four things:
  - a scheme or asset loader;
  - a message handler with an origin check;
  - JSON encode and decode for every message type;
  - lifecycle hooks (pause or resume, memory warnings, WebView process termination).
- That is a few hundred lines per platform, plus contract tests that run the same message script against each shell. Every new message type is a three-place change (web, Swift, Kotlin) unless the protocol stays small and generic.

### 6.2 Where the engine and the game session run

| | **A. Inside the WebView, with the board** | **B. Native JS engine, separate from the WebView** (iOS JavaScriptCore `JSContext`; Android `JavaScriptSandbox`, QuickJS or J2V8) | C. Re-implement the engine in Swift/Kotlin |
|---|---|---|---|
| What runs where | Engine, session, board and bot worker all in one web bundle; the shell sends commands and receives summaries | Engine and session in a native-hosted JS VM; the board in the WebView becomes a pure view fed over the bridge | Engine native; the board still web |
| Source of truth | One (the WebView) | The native VM, with the board mirroring it | Native, with the web board mirroring it |
| Per-tap latency | In-process | Every select → legal-move highlight → drop crosses two async hops (WebView ↔ native ↔ VM) | One async hop |
| Bot performance | Web Worker in WKWebView or Chrome WebView | iOS `JSContext` in an app process is widely reported to run **without JIT** (Secondary, e.g. [Skip docs](https://skip.dev/docs/modules/skip-script/); no Apple statement found, UNVERIFIED). Android's sandbox runs out of process | Native speed |
| Fit with D7 (TypeScript everywhere) | ++ | + same TS, more glue | – violates D7; two engines to keep in sync |
| Web shell | Identical | Web must run engine in-page anyway, so two code paths | Two engines |
| Verdict | **Recommended** | Only if the native shell must know game state without a WebView (widgets, notification actions), and even then a saved-game JSON is enough | No |

**Facts on option B**
- **JavaScriptCore** lets apps "evaluate JavaScript programs from within Swift, Objective-C, and C-based apps". `JSContext` is "a JavaScript execution environment" (iOS 7+) ([JavaScriptCore](https://developer.apple.com/documentation/javascriptcore), [JSContext](https://developer.apple.com/documentation/javascriptcore/jscontext)). It has no DOM and no Web Workers (assessment).
- **Jetpack JavaScriptEngine (`androidx.javascriptengine`)**, stable **1.1.1 (2026-09-23)** ([release notes](https://developer.android.com/jetpack/androidx/releases/javascriptengine), [Maven](https://dl.google.com/android/maven2/androidx/javascriptengine/javascriptengine/maven-metadata.xml)) ([guide](https://developer.android.com/develop/ui/views/layout/webapps/jsengine), updated 2026-10-23):
  - It evaluates JS "without creating a WebView instance", and all JS runs "in a separate sandboxed process".
  - "Supported on API 26 and above if the WebView implementation supports it", so you check `isSupported()` and per-feature flags.
  - Only one sandbox per app is allowed.
  - "The response is always returned as a String". Large inputs go through `provideNamedData`.
- **QuickJS-ng** v0.17.0 (2026-09-18, MIT) is active ([repo](https://github.com/quickjs-ng/quickjs)). Its Kotlin wrapper `quickjs-kt` 1.0.15 is community-maintained ([repo](https://github.com/dokar3/quickjs-kt)).
- **J2V8**'s last Maven release is 6.3.4, and its last commit was 2025-11-13 ([repo](https://github.com/eclipsesource/J2V8), [Maven](https://repo1.maven.org/maven2/com/eclipsesource/j2v8/j2v8/maven-metadata.xml)).

**State-sync implications of B (assessment)**
- **Two copies of the state.** The board mirrors the session and needs a version number on every message, plus a "full snapshot" resync after any missed or reordered message.
- **The interaction state machine is split** (architecture §4). Selection lives in the board, legality in the VM. Every highlight becomes a round trip, and the input lock during animations must be coordinated across processes.
- **The bot runs in the same native VM** and needs its own threading on iOS, because `JSContext` has no workers.
- **The web shell can't use this path at all**, so you maintain two session hosts.
- With A, none of this exists: the shell only sees coarse messages (`gameOver`, `save`, `haptic`). Persistence can still live natively, because the game module hands the shell its action log (D8) to store.

### 6.3 Capacitor as the middle path

- **Native code inside a Capacitor app is the documented norm.** "With Capacitor, you are encouraged to write Swift or Objective-C code to implement the native features your app needs". Local plugins (a `CAPPlugin` subclass registered with `registerPluginInstance`) need no npm package ([iOS custom code](https://capacitorjs.com/docs/ios/custom-code), v8).
- **Custom bridge view controller:** "Since Capacitor 3.0, you can subclass `CAPBridgeViewController` within your application" ([custom ViewController](https://capacitorjs.com/docs/ios/viewcontroller)).
- **Native screens over the web view:**
  - iOS: "You can present native screens over the app by using Capacitor's `UIViewController`" ([iOS plugin guide](https://capacitorjs.com/docs/plugins/ios)).
  - Android: Intents and `startActivityForResult` with an `@ActivityCallback` "present a Native Screen over the Capacitor screen" ([Android plugin guide](https://capacitorjs.com/docs/plugins/android)).
  - Assessment: so a SwiftUI settings sheet or a Compose rules screen can be presented from a plugin call, while the board stays in Capacitor's WebView.
- **Embedding a web view inside an otherwise native app (Ionic Portals) is not an option.** Its licence requires "a valid and active Separate Commercial Agreement" with Ionic ([Portals iOS licence/README](https://github.com/ionic-team/ionic-portals-ios), latest 0.14.1, 2026-07-24). Ionic stopped selling commercial products in 2025 (§4.1).
- **Native features Elements might want, reachable from Capacitor:**
  - Haptics, status bar and push are official plugins (`@capacitor/push-notifications` 8.1.3, 2026-10-02, [npm](https://registry.npmjs.org/@capacitor/push-notifications)).
  - I found no official Game Center plugin on npm (UNVERIFIED that none exists), so turn-based Game Center ([GKTurnBasedMatch](https://developer.apple.com/documentation/gamekit/gkturnbasedmatch), [GameKit](https://developer.apple.com/documentation/gamekit)) would be a local Swift plugin.
  - Widgets are separate WidgetKit extension targets in the Xcode project. Assessment: they work the same whether the main app is Capacitor or SwiftUI.
- **Assessment: this middle path keeps one UI codebase (React) and one board module.** Native UI is added screen by screen where it clearly beats web UI, for example Game Center sheets, a native share sheet, or later the iPadOS menu bar (`UIMainMenuSystem`, iOS/iPadOS 26+, [docs](https://developer.apple.com/documentation/uikit/uimainmenusystem)).

### 6.4 Three shells vs one: gains and costs

**What native shells give (facts and assessment)**
- **Native navigation, sheets, settings and controls.** You get platform look and feel for free and accessibility by default for menus. The board is still a web canvas, so its accessibility is unchanged (§2, architecture §6).
- **iPad multitasking:** SwiftUI scenes resize natively under TN3192 (§4.6). The WebView inside simply sees container resizes, as it does in Capacitor. Little difference for the board.
- **Pointer and keyboard:** native shells get the iPad menu bar and keyboard shortcuts through UIKit or SwiftUI. In a web shell they need either web key handling (Konva has no keyboard events, §2.3) or a native plugin.
- **Game Center, notifications, widgets:** first-class in Swift and Kotlin. From Capacitor they need plugins (§6.3).

**What they cost (assessment)**
- **Three UI codebases** (SwiftUI, Compose, React) for menus, settings, new-game and variant screens, the handover screen, the move list and onboarding. Every UI change is made three times and tested three times.
- **Two bridges**, plus the in-process web adapter, kept in sync with the protocol.
- **Three build and release pipelines and three test matrices.** Bugs at the shell–WebView seam (lifecycle, safe areas, keyboard focus, WebView process crashes) show up per platform.
- **For a designer working with Claude Code:**
  - *Tooling is good now.* Xcode 26.3 (February 2026) integrates the Claude Agent SDK. Agents can capture Xcode Previews to "verify their work visually", and Xcode exposes its capabilities over MCP ([Apple Newsroom, 2026-02](https://www.apple.com/newsroom/2026/02/xcode-26-point-3-unlocks-the-power-of-agentic-coding/), [Anthropic](https://www.anthropic.com/news/apple-xcode-claude-agent-sdk)).
  - Xcode 27 (June 2026) lets agents interact "with the simulator in the new Device Hub", write and run tests, and connect over the Agent Client Protocol ([Apple Newsroom, 2026-06-08](https://www.apple.com/newsroom/2026/06/apple-aids-app-development-with-new-intelligence-frameworks-and-advanced-tools/)).
  - On Android, the Android CLI 1.0 (2026-05-19) works with agents "like Anthropic's Claude Code". It includes `android studio render-compose-preview`, which returns an image path and the UI hierarchy ([Android Developers Blog](https://android-developers.googleblog.com/2026/05/android-cli-stable-1-0-agent-development.html)). Android Studio is adding "bring your own agent" in preview ([blog, 2026-09](https://android-developers.googleblog.com/2026/09/build-your-way-use-any-ai-agent-in-android-studio.html)).
  - Assessment: so a verification loop through simulators, emulators and previews exists on both platforms. But the designer would review UI in three toolchains, and the cross-boundary bugs (bridge, lifecycle) are exactly what agents verify worst, because they need a running device and both sides of the seam.
- **Overall:** for a game whose value is the board, native shells roughly double or triple the non-board work for menus that most players see for seconds.

### 6.5 Compose Multiplatform as "one native shell" (brief)

- JetBrains declared **Compose Multiplatform for iOS stable in 1.8.0 (May 2025)** ([JetBrains blog](https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/)). The current stable is **1.12.2 (2026-10-15)**, with 1.13.0-beta01 out 2026-10-23 ([releases](https://github.com/JetBrains/compose-multiplatform/releases)).
- **Assessment:**
  - It turns three shells into two (Compose for iOS and Android, React for web), but they are still separate.
  - The WebView would be hosted through platform interop on each side (UIKit `WKWebView`, Android `WebView`).
  - Compose's iOS UI is drawn by Compose, not by SwiftUI or UIKit. So the "native feel" argument is weaker than for SwiftUI.
  - It adds Kotlin as a fourth language next to TypeScript, Swift and the web stack.
  - Not attractive for Elements.

### 6.6 Real-world examples (primary sources)

- **Lichess, a web board in Capacitor, later replaced by a native rewrite.**
  - The old official app, `lichobile`, "is a web application that accesses the native SDK, thanks to Ionic capacitor". It was written in TypeScript with mithril.js, and Stockfish ran through a Capacitor plugin. The repo is now archived with an end-of-life notice ([lichobile README](https://github.com/lichess-org/lichobile)).
  - Its replacement is a full **Flutter (Dart)** app with a Flutter chessboard package ([lichess-org/mobile](https://github.com/lichess-org/mobile), [flutter-chessground](https://github.com/lichess-org/flutter-chessground)).
  - Lichess's blog explains the rewrite ([the new mobile app](https://lichess.org/@/Lichess/blog/the-new-mobile-app/KXlgb3X2)). The page blocked automated fetching, so I have only search-result snippets of it: they cite near-native performance and replacing deprecated technology (UNVERIFIED).
  - Assessment: the lesson is that when Lichess went native, it rewrote the *board* natively too. It did not keep a web board inside native shells.
- **Hotwire Native (37signals)** is the clearest production example of a native shell around web content with a message bridge. "Bridge Components" pair a web controller with a Swift or Kotlin counterpart, for native buttons, menus and sheets driven by the web page ([Bridge components](https://native.hotwired.dev/overview/bridge-components), [iOS repo](https://github.com/hotwired/hotwire-native-ios), [Android repo](https://github.com/hotwired/hotwire-native-android); MIT). It's used for Basecamp and HEY (site branding). It isn't a game, but it shows the "small generic bridge, web owns the content" design that §6.8 recommends.
- **No primary-source engineering write-up found** of a native SwiftUI/Compose shell hosting a *web game board* (UNVERIFIED that none exists). I found nothing for the NYT Games app's architecture, for example.

### 6.7 Comparison table

++ strong · + good · ~ workable with effort · – weak. The ratings are my assessment, based on the facts in §6.1–6.6.

| Criterion | **One React + Capacitor shell** | **Capacitor + selected native screens/plugins** | **SwiftUI + Compose + React web shells** (board in WebView) | Compose Multiplatform + React web |
|---|---|---|---|---|
| UI codebases | ++ 1 | + 1, plus a few native screens | – 3 | ~ 2 (+ Kotlin) |
| Board, engine and bot shared | ++ | ++ | ++ (option A, §6.2) | ++ |
| Board performance | same WebView | same WebView | same WebView | same WebView |
| Native feel of menus | ~ web UI made app-like | + where it matters | ++ | + (Compose-drawn on iOS) |
| Menu accessibility | + web ARIA | + | ++ native | + |
| iPad resize, pointer, keyboard, menu bar | + resize; ~ menu bar via plugin | + | ++ | + |
| Game Center, push, widgets | ~ plugins (Game Center is DIY) | + local Swift plugins | ++ | + |
| Bridge to maintain | ++ Capacitor's | + Capacitor's + a few calls | – two custom bridges + protocol tests | – two |
| Test and release matrix | + | + | – 3× | ~ 2× |
| AI-assistant loop | ++ web tooling + browser | + | ~ good per platform, weak across the seam | ~ |
| Time to v1 for a designer + Claude Code | ++ | + | – | ~ |

### 6.8 Recommendation, and how to design the board module now

**When to choose which (assessment)**
- **One React + Capacitor shell (v1 default).** Choose it when the board is the product, the menus are few, and one person ships iOS, Android and web. That is Elements v1.
- **Capacitor + selected native screens (v1.x / v2).** Add native code when a specific native surface clearly wins: Game Center turn-based play, a native settings sheet, the iPad menu bar, a share sheet. This is cheap, incremental and reversible.
- **Full native shells.** Choose them only if all three hold:
  1. iOS becomes the premium focus, with substantial native surfaces (Game Center, widgets, Live Activities, deep system settings).
  2. The D9 prototype shows web menus failing the iPad quality bar even after polish.
  3. There is budget for three UI codebases.
  - Even then, start with iOS only and keep Android and web on Capacitor/React.
- **Not recommended:**
  - Running the engine in JavaScriptCore or `JavaScriptSandbox` separate from the board (§6.2 B).
  - Compose Multiplatform for this project.

**Design the game module now so a native shell can be added later without rework**

1. **One self-contained web entry.** Make `apps/game` (a Vite entry, `game.html`) contain the board (`BoardView`), the `GameSession`, the animation queue and the bot worker. It must run with no React and no Capacitor imports. The React app embeds it like any host would.
2. **A small, versioned, JSON message protocol** is the only way in or out. Everything in it is plain serializable data (D5), so the same messages work in-process, over `WKScriptMessageHandler`, over `addWebMessageListener`, and later over a socket for tests.

   ```ts
   // packages/game-protocol — v1
   type HostToGame =
     | { v: 1; type: 'init'; settings: Settings; locale: string; safeArea: Insets }
     | { v: 1; type: 'newGame'; variant: VariantConfig; players: PlayerSpec[] }
     | { v: 1; type: 'loadGame'; record: GameRecord }          // action log + rules version (D8)
     | { v: 1; type: 'command'; command: 'undo' | 'resign' | 'pause' | 'resume' }
     | { v: 1; type: 'settings'; settings: Settings }           // reduceMotion, sound, haptics, theme
   type GameToHost =
     | { v: 1; type: 'ready' }
     | { v: 1; type: 'status'; status: StatusSummary }          // turn, check, move number
     | { v: 1; type: 'event'; event: GameEvent }                // architecture §6 events: sound, a11y announcements
     | { v: 1; type: 'haptic'; style: 'selection' | 'impact' | 'success' | 'warning' }
     | { v: 1; type: 'save'; record: GameRecord }               // the host owns persistence
     | { v: 1; type: 'gameOver'; result: Result }
     | { v: 1; type: 'error'; code: string; message: string }
   interface HostPort {
     post(msg: GameToHost): void
     onMessage(cb: (msg: HostToGame) => void): () => void
   }
   export function mountGame(el: HTMLElement, host: HostPort): () => void   // returns unmount
   ```
3. **The host owns platform concerns:**
   - Haptics, storage, sharing, navigation, safe-area values and system settings (Reduce Motion) all cross the port as messages.
   - The game module never calls `@capacitor/*` directly. The React shell's adapter turns `haptic` messages into `@capacitor/haptics` calls today, and a Swift adapter turns them into `UIImpactFeedbackGenerator` calls later.
4. **Use the port in-process from day one.** The React shell talks to the game module only through `createLocalPort()`, a pair of in-memory queues with structured cloning so nothing leaks by reference. Then the protocol is real, tested and complete before any native shell exists.
5. **Keep the protocol coarse.** Legal moves, highlights, drag and animations never cross it; they stay inside the module (§6.2 A). The protocol only grows when the *shell* needs something new, which keeps a future Swift or Kotlin adapter to a few hundred lines.
6. **Test at the seam.** Drive the module through the port in Playwright (send `newGame`, simulate taps, assert `save` and `gameOver`). A future native shell reuses the same message scripts as contract tests.
7. **Plan for native hosting:**
   - Assets resolve relative to the entry, and a single origin serves everything.
   - That origin works under `capacitor://localhost`, a custom `elements://` scheme (`WKURLSchemeHandler`) or `https://appassets.androidplatform.net` (`WebViewAssetLoader`).
   - There are no absolute `/` paths and no `file://` assumptions.
   - The module tolerates being paused or killed: it re-emits `ready`, and the host replays `loadGame`.

**Estimated cost now (assessment):** about a day of extra structure in the prototype phase. It also makes the D9 Pixi-vs-Konva comparison cleaner, because both boards sit behind the same `mountGame` and port.

---

## 7. Recommended combination for Elements

**Stack:** React + Vite (TypeScript) for menus and settings. The board is a PixiJS 8 + GSAP canvas, or Konva 10 + GSAP if Konva wins D9. Add the pure `packages/engine` and the AI bot in a Web Worker, and wrap everything with Capacitor 8 for iOS and Android. The same build is the website and PWA.

*Updated 2026-10-27:* the board, session, animation queue and bot are packaged as one **game module** (`mountGame(el, hostPort)`). It talks to its host only through the versioned message protocol in §6.8. The React shell is the first host and uses an in-process port. A SwiftUI or Compose shell could host the same module in a WebView later.

```
┌──────────────── Capacitor 8 native shell (iOS: WKWebView · Android: WebView) ────────────────┐
│ plugins: haptics · status bar / SystemBars · splash · (v2) push · (later) local Swift/Kotlin │
│ ┌──────────────────────────── React app shell (Vite, TypeScript) ──────────────────────────┐ │
│ │  menus · settings · new-game/variants · handover screen · move list · a11y text board    │ │
│ │  host adapter: haptic → @capacitor/haptics · save → storage · settings → module          │ │
│ │        ▲ GameToHost (ready, status, event, haptic, save, gameOver)                       │ │
│ │        │ HostPort (in-process today; WKScriptMessageHandler / addWebMessageListener      │ │
│ │        ▼ HostToGame (init, newGame, loadGame, command, settings)   in a native shell)    │ │
│ │ ┌──────────────────────── game module: mountGame(el, hostPort) ────────────────────────┐ │ │
│ │ │  GameSession (plain TS) ── apply(action) ──► packages/engine (pure TS)               │ │ │
│ │ │     │  ▲ state + events                         ▲ same package                       │ │ │
│ │ │     ▼  │ intents (tap e5, drag e5→e7)           │                                    │ │ │
│ │ │  BoardView (PixiJS 8 or Konva 10, + GSAP)       │                                    │ │ │
│ │ │     render(viewModel) · play(events) · onIntent(cb)                                  │ │ │
│ │ │  Bot player ── postMessage(state) ──► Web Worker: packages/ai ──► engine             │ │ │
│ │ └──────────────────────────────────────────────────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                          v2: server function imports the same packages/engine
```

**How the pieces fit (assessment, following architecture.md §1, §5, §6 and §8)**
- **The engine knows nothing about rendering.** The session calls `apply(state, action)` and gets `{ state, events }` back.
- **The board is a dumb view behind a small interface:** `render(viewModel)`, `play(events): Promise<void>` and `onIntent(callback)`.
  - The game module mounts it once and passes state in. React never re-renders the board.
  - The board reports *intents*, never moves it has validated itself.
  - Legal-move highlights and the Water path come from the engine.
- **Animations come from engine events through a queue,** not from React re-renders. GSAP timelines play `moved` (along `path`), `captured` (particle burst), `combined` and `check`.
  - Haptics fire on the same events. The module posts `haptic` messages, and the shell's adapter calls `@capacitor/haptics` (§6.8).
  - Reduce Motion shortens the timelines.
- **Accessibility:** turn on Pixi's AccessibilitySystem for square labels, and/or render an off-screen ARIA grid in React from the same state (architecture §6). The React layer works with any framework. With Konva it is the only option (§2.3).
- **AI bot:** one Web Worker everywhere (iOS WebView, Android WebView, browser). It receives the serialized state and returns an action.
- **v2 online:** a Remote player adapter plus a server function importing the same engine ([tech-stack §5](tech-stack.md)). The board code doesn't change.
- **Konva variant:** the same `BoardView` interface, implemented as a class that owns a `Konva.Stage` with 2–3 layers, using the same GSAP queue. Only the board folder differs, which is what makes the D9 comparison fair. A Phaser variant (scene + EventBus) remains possible as a reserve.

**What the D9 side-by-side prototype should compare** *(updated 2026-10-27: Konva replaces Phaser)*

Build one board slice twice behind the same `BoardView` interface and the same `mountGame` port: **PixiJS 8 + GSAP** and **Konva 10 + GSAP**. Put both in the same React + Capacitor shell. Optionally drop the winner into an Expo DOM component to test the Expo shell too. Bring Phaser 4 in only if both disappoint on feel.

**The slice:**
- The 9×9 board with zones.
- About 8 pieces, including a Water piece next to an Earth piece.
- Tap-to-select plus drag, with legal-move highlights from the engine.
- A Water bend animation along its path.
- A capture with a particle burst.
- A combine (stack) animation.
- A haptic tick on drop, sent as a `haptic` message through the port.
- A handover screen in React.
- One "polish" effect that reaches past basics, such as a glow or blur pulse on the checked Wizard. This tests Konva's CPU filters against Pixi's GPU filters.

**Compare on a real iPad (Stage Manager and Split View), an iPhone, desktop Chrome/Safari and one Android phone:**
1. **Crispness:** piece edges and text at DPR 2 and 3 across window sizes. Both should pass; check Konva's cached nodes after a resize.
2. **Resizing:** dragging a Stage Manager window edge and rotating. Does the board re-layout without blur, jumps or a stretched canvas? Pixi uses `resizeTo`; Konva uses ResizeObserver + `stage.scale()`.
3. **Feel:** touch latency, drag smoothness, and frame pacing at 60 fps and in Low Power Mode (30 fps). Watch Konva during the capture burst and the glow effect on a 13" iPad.
4. **Memory:** Web Inspector's canvas memory with Konva's 2–3 layers at full-screen iPad size, against the Safari ceiling (§2.3).
5. **Startup and size:** cold start time and the JS bundle size of each build. I have no sourced numbers, so measure them.
6. **Accessibility:** can VoiceOver reach and announce squares and pieces? Use Pixi's layer against the React ARIA grid for Konva.
7. **AI-assistant productivity:**
   - Time for Claude Code to build the slice.
   - How many wrong-version API mistakes it makes (Pixi 7 vs 8; Konva CommonJS vs ESM, manual DPR scaling).
   - How easy it is to change an animation by prompt alone.
   - Install the official PixiJS skills and point Claude at Konva's `llms-full.txt` for a fair test.
8. **Code shape:** lines of code in the board folder, and whether any game state leaked into the view.
9. **Bot in a worker:** a dummy 1-second search doesn't stutter animations on iPad.

**Decision rule (assessment)**
- Pick **Konva** if it matches Pixi on feel and memory on the iPad, *and* its code is clearly simpler or Claude makes clearly fewer mistakes with it, *and* the polish effect looks acceptable.
- Otherwise pick **Pixi**. It is the safer long-term ceiling for polish and has built-in accessibility.
- Pick **Expo** as the shell only if native menus turn out to matter more than one simple codebase. Consider native screens through Capacitor first (§6.3).

---

## 8. Total cost of ownership

**Free (MIT or similar):**
- PixiJS
- Phaser
- GSAP (no-charge licence)
- React and Vite
- Capacitor and its official plugins
- Excalibur and KAPLAY, if ever used
- three.js and react-three-fiber (MIT); Babylon.js (Apache-2.0)

| Item | v1 (pass-and-play) | v2 (online) | Notes / source |
|---|---|---|---|
| **Apple Developer Program** | **$99/year** | $99/year | "annual fee is 99 USD". Fee waivers are only for nonprofits, schools and government, "Not … an individual, sole proprietor" ([enrollment](https://developer.apple.com/support/enrollment/), [waivers](https://developer.apple.com/help/account/membership/fee-waivers)) |
| **Google Play Console** | **$25 once** | — | "US$25 one-time registration fee" ([Play help](https://support.google.com/googleplay/android-developer/answer/6112435)). New personal accounts must run a closed test with at least **12 testers for 14 days** before production ([Play help](https://support.google.com/googleplay/android-developer/answer/14151465)) |
| Framework (Pixi or Phaser) + GSAP | $0 | $0 | MIT ([Pixi](https://github.com/pixijs/pixijs/blob/dev/LICENSE), [Phaser](https://github.com/phaserjs/phaser/blob/master/LICENSE.md)). GSAP is "100% free for all users" under its no-charge Standard License, which bars only building no-code visual animation tools that compete with Webflow ([pricing](https://gsap.com/pricing/), [licence](https://gsap.com/standard-license)). Not OSI open source. |
| Capacitor + plugins | $0 | $0 | MIT; Ionic sells no paid tier now ([Ionic blog](https://ionic.io/blog/important-announcement-the-future-of-ionics-commercial-products)) |
| Builds | $0 locally | $0 locally | Needs a Mac with Xcode. Cloud CI is optional (e.g. GitHub Actions macOS minutes; pricing not researched, UNVERIFIED) |
| Phaser Editor | optional, $12/month | — | Not needed; code-first with Claude Code ([pricing](https://phaser.io/editor/pricing)) |
| Phaser AE credits | don't use | — | $20/month Pro; separate PolyForm-licensed engine ([pricing](https://phaser.io/pricing)) |
| TexturePacker (sprite atlases) | optional, $49.99 once | — | One-time per user with 1 year of updates; 50% indie discount; the free "Essential" mode is non-commercial ([store](https://www.codeandweb.com/store/texturepacker-single), [comparison](https://www.codeandweb.com/texturepacker/licenses-comparison)). **Not needed:** free alternatives are AssetPack (MIT) and free-tex-packer-core (MIT), and with about 13 distinct piece images individual PNG/SVG files are fine (assessment). |
| Spine (skeletal animation) | not needed | — | Essential $69, Professional $379 (sale prices on the store page). The runtime licence requires each user of the runtimes to own a Spine Editor licence ([store](https://esotericsoftware.com/spine-purchase), [runtime licence](https://github.com/EsotericSoftware/spine-runtimes/blob/master/LICENSE)). Pyramids and a Wizard don't need bone rigs; use GSAP or Rive. |
| Rive (optional animated UI) | $0 (Free plan, splash on exports) or $9/seat/month | — | Runtimes MIT ([pricing](https://rive.app/pricing)) |
| Backend (Firebase / Supabase) | — | $0 to start; Supabase Pro $25/month once live | See [tech-stack §5](tech-stack.md) |
| Store commission | only if you charge | — | Apple Small Business Program 15% up to $1M proceeds ([Apple](https://developer.apple.com/app-store/small-business-program/)). Google Play 15% on the first $1M, with new fee structures in some regions from mid-2026 ([Play fees](https://support.google.com/googleplay/android-developer/answer/112622)); exact current rates UNVERIFIED |

- **Minimum cash cost for v1 on both stores:** about **$124 in year one** ($99 + $25), then **$99/year**.
- **v2:** add backend hosting, likely $0–25/month at friends-and-family scale.
- Everything else is optional.

---

## 9. Sources

All accessed 2026-10-27 unless noted otherwise.

**Phaser**
- Releases: https://github.com/phaserjs/phaser/releases (v4.2.1, v4.1.0, v4.0.0, v3.90.0)
- npm: https://registry.npmjs.org/phaser
- LICENSE: https://github.com/phaserjs/phaser/blob/master/LICENSE.md
- Commits: https://github.com/phaserjs/phaser/commits/master
- Repo: https://github.com/phaserjs/phaser
- FUNDING.yml: https://github.com/phaserjs/phaser/blob/master/.github/FUNDING.yml
- v4 migration guide: https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md
- Skills: https://github.com/phaserjs/phaser/tree/master/skills (input, scale-and-responsive, text-and-bitmaptext)
- Config.js: https://github.com/phaserjs/phaser/blob/master/src/core/Config.js
- SCALE_MODE_CONST.js: https://github.com/phaserjs/phaser/blob/master/src/scale/const/SCALE_MODE_CONST.js
- About: https://phaser.io/about
- Phaser Editor: https://phaser.io/editor and https://phaser.io/editor/pricing
- Phaser Editor v5 news: https://phaser.io/news/2026/04/phaser-editor-v5-release
- Phaser AE: https://phaser.io/agent, https://phaser.io/cli, https://phaser.io/pricing, https://phaser.io/kernel
- PolyForm Shield licence: https://phaser.io/polyform-shield-license.md
- llms.txt: https://phaser.io/llms.txt
- Docs MCP: https://phaser.io/oss/docs/mcp
- Examples: https://phaser.io/oss/examples
- Masks doc: https://phaser.io/oss/docs/phaser/concepts/display/masks.md
- React template: https://github.com/phaserjs/template-react-ts
- create-game: https://github.com/phaserjs/create-game
- Open Core Ventures (2023-12): https://opencoreventures.com/blog/2023-12-phaser-studio-launched/

**PixiJS**
- Releases: https://github.com/pixijs/pixijs/releases (v8.16.0, v8.18.0, v8.22.0)
- npm: https://registry.npmjs.org/pixi.js
- LICENSE: https://github.com/pixijs/pixijs/blob/dev/LICENSE
- Repo: https://github.com/pixijs/pixijs
- FUNDING.yml: https://github.com/pixijs/pixijs/blob/dev/.github/FUNDING.yml
- autoDetectRenderer.ts @ v8.22.0: https://github.com/pixijs/pixijs/blob/v8.22.0/src/rendering/renderers/autoDetectRenderer.ts
- Guides:
  - Renderers: https://pixijs.com/8.x/guides/components/renderers.md
  - Application: https://pixijs.com/8.x/guides/components/application.md
  - Resize plugin: https://pixijs.com/8.x/guides/components/application/resize-plugin.md
  - Events: https://pixijs.com/8.x/guides/components/events.md
  - Accessibility: https://pixijs.com/8.x/guides/components/accessibility.md
  - v8 migration: https://pixijs.com/8.x/guides/migrations/v8.md
  - Ecosystem: https://pixijs.com/8.x/guides/getting-started/ecosystem.md
- Drag example: https://pixijs.com/8.x/examples/events/dragging
- LLM docs: https://pixijs.com/llms, https://pixijs.com/llms.txt
- Skills: https://github.com/pixijs/pixijs-skills
- June 2026 blog: https://github.com/pixijs/pixijs.com/blob/main/blog/2026-06-12-pixi-june-update.mdx
- Examples:
  - examples.json: https://github.com/pixijs/pixijs.com/blob/main/src/data/examples.json
  - Examples dir: https://github.com/pixijs/pixijs.com/tree/main/docs/examples
  - open-games: https://github.com/pixijs/open-games
- Sponsors:
  - Sponsors data: https://github.com/pixijs/pixijs.com/blob/main/src/data/manualSponsors.json
  - Open Collective: https://opencollective.com/pixijs
- React and add-ons:
  - @pixi/react: https://registry.npmjs.org/@pixi/react
  - pixi-react README: https://github.com/pixijs/pixi-react/blob/main/README.md
  - @pixi/ui: https://github.com/pixijs/ui
  - @pixi/layout: https://github.com/pixijs/layout
  - particle-emitter: https://github.com/pixijs-userland/particle-emitter
  - create-pixi: https://pixijs.io/create-pixi/
  - AssetPack: https://github.com/pixijs/assetpack
- spine-pixi-v8: https://registry.npmjs.org/@esotericsoftware/spine-pixi-v8

**Konva** *(added 2026-10-27)*
- npm:
  - konva: https://registry.npmjs.org/konva
  - react-konva: https://registry.npmjs.org/react-konva
  - react: https://registry.npmjs.org/react
- npm downloads API (stale window 2026-06-25 to 07-01): https://api.npmjs.org/downloads/point/last-week/konva
- GitHub:
  - Repo: https://github.com/konvajs/konva
  - Releases: https://github.com/konvajs/konva/releases
  - Commits: https://github.com/konvajs/konva/commits/master
  - Contributors: https://github.com/konvajs/konva/graphs/contributors
  - CHANGELOG (10.0.0 to 10.9.0): https://github.com/konvajs/konva/blob/master/CHANGELOG.md
  - LICENSE: https://github.com/konvajs/konva/blob/master/LICENSE
  - FUNDING.yml: https://github.com/konvajs/konva/blob/master/.github/FUNDING.yml
  - react-konva: https://github.com/konvajs/react-konva
- LLM docs and AI tools:
  - llms.txt: https://konvajs.org/llms.txt (and /llms-full.txt)
  - AI tools / MCP: https://konvajs.org/docs/ai_tools.html
- About and positioning:
  - About: https://konvajs.org/docs/about.html
  - FAQ: https://konvajs.org/docs/faq.html
  - Why Konva: https://konvajs.org/docs/guides/why-konva.html
  - Best canvas library (vendor comparison): https://konvajs.org/docs/guides/best-canvas-library.html
- Rendering and performance:
  - Performance tips: https://konvajs.org/docs/performance/All_Performance_Tips.html
  - Blurry canvas / pixelRatio: https://konvajs.org/docs/posts/Canvas_Blurry.html
  - Responsive canvas: https://konvajs.org/docs/posts/responsive-canvas.html
  - Shape caching: https://konvajs.org/docs/performance/Shape_Caching.html
  - Optimize strokes: https://konvajs.org/docs/performance/Optimize_Strokes.html
  - Demos: https://konvajs.org/docs/sandbox/10000_Shapes_with_Tooltip.html, https://konvajs.org/docs/sandbox/20000_Nodes.html, https://konvajs.org/docs/sandbox/Jumping_Bunnies.html
- Input:
  - Drag and drop: https://konvajs.org/docs/drag_and_drop/Drag_and_Drop.html
  - Drag bounds: https://konvajs.org/docs/drag_and_drop/Simple_Drag_Bounds.html
  - Drop events: https://konvajs.org/docs/drag_and_drop/Drop_Events.html
  - Mobile events: https://konvajs.org/docs/events/Mobile_Events.html
  - Pointer events: https://konvajs.org/docs/events/Pointer_Events.html
  - Tap vs click: https://konvajs.org/docs/events/Mobile_Tap_And_Click.html
  - Custom hit region: https://konvajs.org/docs/events/Custom_Hit_Region.html
  - Keyboard events: https://konvajs.org/docs/events/Keyboard_Events.html
  - Gestures: https://konvajs.org/docs/sandbox/Gestures.html
  - Pinch zoom: https://konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html
- Animation:
  - Animation: https://konvajs.org/docs/animations/Create_an_Animation.html
  - Tween controls: https://konvajs.org/docs/tweens/All_Controls.html
  - Complex tweening: https://konvajs.org/docs/tweens/Complex_Tweening.html
- Effects:
  - Filters: https://konvajs.org/docs/filters/Blur.html
  - Isolated groups and blend modes: https://konvajs.org/docs/groups_and_layers/Isolated_Groups.html
- Accessibility (Canvas Editor demo): https://konvajs.org/docs/sandbox/Canvas_Editor.html
- React:
  - React guide: https://konvajs.org/docs/react/index.html
  - Testing guide: https://konvajs.org/docs/react/Testing.html
- GSAP gsap.to() (generic objects): https://gsap.com/docs/v3/GSAP/gsap.to().md

**Other frameworks**
- Excalibur:
  - npm: https://registry.npmjs.org/excalibur
  - Releases: https://github.com/excaliburjs/Excalibur/releases
  - Repo: https://github.com/excaliburjs/Excalibur
  - Site: https://excaliburjs.com/
  - Pointers: https://excaliburjs.com/docs/pointers
- KAPLAY:
  - npm: https://registry.npmjs.org/kaplay
  - Releases: https://github.com/kaplayjs/kaplay/releases
  - Site: https://kaplayjs.com/
  - Kaboom (archived): https://github.com/replit/kaboom
- Cocos:
  - cocos-engine releases: https://github.com/cocos/cocos-engine/releases
  - Creator: https://www.cocos.com/en/creator
  - COCOS 4: https://github.com/cocos/cocos4
  - cocos-cli: https://github.com/cocos/cocos-cli
  - Press release (2026-01-05): https://technode.global/prnasia/cocos-4-is-here-fully-open-source/
  - English docs: https://docs.cocos.com/creator/3.8/manual/en/
- melonJS: https://melonjs.org/
- LittleJS: https://github.com/KilledByAPixel/LittleJS
- PlayCanvas:
  - Engine: https://github.com/playcanvas/engine
  - Plans: https://playcanvas.com/plans
  - llms.txt: https://developer.playcanvas.com/llms.txt
- three.js:
  - Releases: https://github.com/mrdoob/three.js/releases
  - llms.txt: https://threejs.org/docs/llms.txt
- Babylon.js:
  - npm: https://registry.npmjs.org/@babylonjs/core
  - Babylon 9 on the Windows dev blog: https://blogs.windows.com/windowsdeveloper/?p=57710
  - llms.txt: https://doc.babylonjs.com/llms.txt
- react-three-fiber: https://registry.npmjs.org/@react-three/fiber

**Asset and animation tools**
- TexturePacker:
  - Store: https://www.codeandweb.com/store/texturepacker-single
  - Licence comparison: https://www.codeandweb.com/texturepacker/licenses-comparison
  - Online tool: https://www.codeandweb.com/tp-online
- Spine:
  - Purchase: https://esotericsoftware.com/spine-purchase
  - Runtimes licence: https://github.com/EsotericSoftware/spine-runtimes/blob/master/LICENSE
  - spine-pixi: https://esotericsoftware.com/spine-pixi
- free-tex-packer: https://github.com/odrick/free-tex-packer
- Rive pricing: https://rive.app/pricing
- GSAP:
  - Pricing: https://gsap.com/pricing/
  - Standard licence: https://gsap.com/standard-license
  - llms.txt: https://gsap.com/llms.txt

**Capacitor / Ionic**
- npm: https://registry.npmjs.org/@capacitor/core
- Releases: https://github.com/ionic-team/capacitor/releases
- Platform docs:
  - iOS: https://capacitorjs.com/docs/ios
  - Android: https://capacitorjs.com/docs/android
  - Environment setup: https://capacitorjs.com/docs/getting-started/environment-setup
- Update guides:
  - 8.0: https://capacitorjs.com/docs/updating/8-0
  - 8.5: https://capacitorjs.com/docs/updating/8-5
- Config: https://capacitorjs.com/docs/config
- CLI build: https://capacitorjs.com/docs/cli/commands/build
- APIs:
  - Haptics: https://capacitorjs.com/docs/apis/haptics
  - Status Bar: https://capacitorjs.com/docs/apis/status-bar
  - SystemBars: https://capacitorjs.com/docs/apis/system-bars
  - Screen Orientation: https://capacitorjs.com/docs/apis/screen-orientation
- Community safe-area: https://github.com/capacitor-community/safe-area
- Capawesome MCP (third party): https://capawesome.io/docs/ai/mcp/capacitor/
- Ionic commercial products announcement (2025-02-11): https://ionic.io/blog/important-announcement-the-future-of-ionics-commercial-products

**Expo / React Native**
- DOM components: https://docs.expo.dev/guides/dom-components/
- expo (npm): https://registry.npmjs.org/expo
- react-native-webview (npm): https://registry.npmjs.org/react-native-webview

**Apple**
- App Store Review Guidelines (last updated 2026-10-16): https://developer.apple.com/app-store/review/guidelines/
- TN3192: https://developer.apple.com/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key
- WebKit APIs:
  - WKWebView: https://developer.apple.com/documentation/webkit/wkwebview
  - WKScriptMessageHandler: https://developer.apple.com/documentation/webkit/wkscriptmessagehandler
  - WKScriptMessageHandlerWithReply: https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply
  - isInspectable: https://developer.apple.com/documentation/webkit/wkwebview/isinspectable
- WWDC25 session 236 (WebGPU): https://developer.apple.com/videos/play/wwdc2025/236/
- Developer forum thread on WebGPU in WKWebView (secondary): https://developer.apple.com/forums/thread/770862
- Developer Program:
  - Enrollment: https://developer.apple.com/support/enrollment/
  - Fee waivers: https://developer.apple.com/help/account/membership/fee-waivers
  - Small Business Program: https://developer.apple.com/app-store/small-business-program/

**WebKit**
- Safari 26.0 features (WebGPU, Open as Web App): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- Safari 15 features (WebGL 2 on Metal): https://webkit.org/blog/11989/new-webkit-features-in-safari-15/
- WWDC25 / SwiftUI WebView: https://webkit.org/blog/16993/
- Web Push for web apps on iOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Storage policies:
  - Tracking prevention, 7-day cap (2020): https://webkit.org/blog/10218/
  - Storage policy update (2023): https://webkit.org/blog/14403/
- Screen Wake Lock:
  - Safari 16.4: https://webkit.org/blog/13966/
  - Safari 18.4: https://webkit.org/blog/16574/
- Vibration API standards position: https://github.com/WebKit/standards-positions/issues/267
- Bugs:
  - 206854 (Fullscreen API on iOS): https://bugs.webkit.org/show_bug.cgi?id=206854
  - 294338 (WKWebView 120 Hz; comments are secondary): https://bugs.webkit.org/show_bug.cgi?id=294338
  - 215745 (Low Power Mode 30 fps): https://bugs.webkit.org/show_bug.cgi?id=215745

**Native shells per platform** *(added 2026-10-27)*
- Apple WebKit and SwiftUI:
  - SwiftUI WebView (iOS 26+): https://developer.apple.com/documentation/webkit/webview-swift.struct
  - WebPage: https://developer.apple.com/documentation/webkit/webpage
  - URLSchemeHandler (SwiftUI): https://developer.apple.com/documentation/webkit/urlschemehandler
  - WKURLSchemeHandler: https://developer.apple.com/documentation/webkit/wkurlschemehandler
  - setURLSchemeHandler: https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/seturlschemehandler(_:forurlscheme:)
  - loadFileURL: https://developer.apple.com/documentation/webkit/wkwebview/loadfileurl(_:allowingreadaccessto:)
  - addScriptMessageHandler with reply: https://developer.apple.com/documentation/webkit/wkusercontentcontroller/addscriptmessagehandler(_:contentworld:name:)
  - evaluateJavaScript: https://developer.apple.com/documentation/webkit/wkwebview/evaluatejavascript(_:completionhandler:)
  - callAsyncJavaScript: https://developer.apple.com/documentation/webkit/wkwebview/callasyncjavascript(_:arguments:in:in:completionhandler:)
  - WKContentWorld: https://developer.apple.com/documentation/webkit/wkcontentworld
  - WKScriptMessage.frameInfo: https://developer.apple.com/documentation/webkit/wkscriptmessage/frameinfo
  - limitsNavigationsToAppBoundDomains: https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/limitsnavigationstoappbounddomains
- Apple other frameworks:
  - JavaScriptCore: https://developer.apple.com/documentation/javascriptcore
  - JSContext: https://developer.apple.com/documentation/javascriptcore/jscontext
  - GameKit: https://developer.apple.com/documentation/gamekit
  - GKTurnBasedMatch: https://developer.apple.com/documentation/gamekit/gkturnbasedmatch
  - UIMainMenuSystem: https://developer.apple.com/documentation/uikit/uimainmenusystem
- Apple and Anthropic on agentic coding:
  - Xcode 26.3 (2026-02): https://www.apple.com/newsroom/2026/02/xcode-26-point-3-unlocks-the-power-of-agentic-coding/
  - Anthropic on the Xcode integration: https://www.anthropic.com/news/apple-xcode-claude-agent-sdk
  - Xcode 27 (2026-06-08): https://www.apple.com/newsroom/2026/06/apple-aids-app-development-with-new-intelligence-frameworks-and-advanced-tools/
- Android WebView and Compose:
  - Load in-app content (WebViewAssetLoader): https://developer.android.com/develop/ui/views/layout/webapps/load-local-content
  - Native-bridge risks: https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges
  - WebViewCompat reference: https://developer.android.com/reference/androidx/webkit/WebViewCompat
  - WebViewCompat source Javadoc: https://github.com/androidx/androidx/blob/androidx-main/webkit/webkit/src/main/java/androidx/webkit/WebViewCompat.java
  - androidx.webkit (Maven): https://dl.google.com/android/maven2/androidx/webkit/webkit/maven-metadata.xml
  - Wrap WebView in Compose: https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/wrap-webview-in-compose
- Android JavaScript engines:
  - JavaScriptEngine release notes: https://developer.android.com/jetpack/androidx/releases/javascriptengine
  - JavaScriptEngine guide: https://developer.android.com/develop/ui/views/layout/webapps/jsengine
  - JavaScriptEngine (Maven): https://dl.google.com/android/maven2/androidx/javascriptengine/javascriptengine/maven-metadata.xml
- Android agent tooling:
  - Android CLI 1.0 (2026-05-19): https://android-developers.googleblog.com/2026/05/android-cli-stable-1-0-agent-development.html
  - Bring your own agent (2026-09-24): https://android-developers.googleblog.com/2026/09/build-your-way-use-any-ai-agent-in-android-studio.html
- Other JS engines:
  - QuickJS-ng: https://github.com/quickjs-ng/quickjs
  - quickjs-kt: https://github.com/dokar3/quickjs-kt
  - J2V8: https://github.com/eclipsesource/J2V8
  - J2V8 (Maven): https://repo1.maven.org/maven2/com/eclipsesource/j2v8/j2v8/maven-metadata.xml
  - Skip docs on JIT (secondary): https://skip.dev/docs/modules/skip-script/
- Capacitor native code:
  - iOS custom code: https://capacitorjs.com/docs/ios/custom-code
  - Custom ViewController: https://capacitorjs.com/docs/ios/viewcontroller
  - iOS plugin guide: https://capacitorjs.com/docs/plugins/ios
  - Android plugin guide: https://capacitorjs.com/docs/plugins/android
  - @capacitor/push-notifications: https://registry.npmjs.org/@capacitor/push-notifications
- Ionic Portals (commercial licence): https://github.com/ionic-team/ionic-portals-ios
- Compose Multiplatform:
  - 1.8.0, iOS stable: https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/
  - Releases: https://github.com/JetBrains/compose-multiplatform/releases
- Examples:
  - lichobile (archived Capacitor app): https://github.com/lichess-org/lichobile
  - Lichess mobile (Flutter): https://github.com/lichess-org/mobile
  - flutter-chessground: https://github.com/lichess-org/flutter-chessground
  - Lichess blog, "The new mobile app" (blocked automated fetch): https://lichess.org/@/Lichess/blog/the-new-mobile-app/KXlgb3X2
  - Hotwire Native bridge components: https://native.hotwired.dev/overview/bridge-components
  - Hotwire Native repos: https://github.com/hotwired/hotwire-native-ios, https://github.com/hotwired/hotwire-native-android

**Google Play**
- Registration fee: https://support.google.com/googleplay/android-developer/answer/6112435
- Testing requirement for new personal accounts: https://support.google.com/googleplay/android-developer/answer/14151465
- Service fees: https://support.google.com/googleplay/android-developer/answer/112622
