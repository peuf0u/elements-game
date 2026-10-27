# Elements: technology stack research

Research date: **2026-10-27**. Versions and prices below were checked against primary sources on or just before that date. Inputs: [GAME_SPEC.md](../../GAME_SPEC.md) (rules) and [PRODUCT_BRIEF.md](../../PRODUCT_BRIEF.md) (decisions D1–D6).

How to read this document:
- **Facts** carry an inline source link. Where a version or date matters, it is given next to the claim.
- **Assessment** marks my own judgment, which draws on the facts but isn't a sourced claim.
- **UNVERIFIED** marks things I couldn't confirm in a primary source.
- No secondary sources (blogs, forum opinions) are used as evidence. Where a developer forum is cited, it is Apple's own.

---

## 1. TL;DR

**Recommendation:**
1. **Language:** build Elements in **TypeScript end to end**.
2. **App:** use **React Native with Expo**, drawing the board with ordinary views plus Reanimated and Gesture Handler. Add Skia only if a visual effect needs it.
3. **Rules engine:** a separate, pure TypeScript package that the app, a web worker (for the AI opponent) and a future server all import unchanged.

**Why Expo:**
- It gives a genuinely native iPad and iPhone app: native touch, Taptic Engine haptics, and no App Store "repackaged website" risk.
- It ships the same code to Android and to the web.
- It has the strongest AI-assistant tooling of any option, including an official Claude Code plugin and an MCP server.
- It is written in the language AI models know best: TypeScript is the #1 language on GitHub.

**Runner-up:** a **plain TypeScript web app** (React + SVG/DOM) wrapped with **Capacitor** for the stores. It is simpler, gives the best web version, and runs the AI opponent in a Web Worker on every platform. The trade-offs are a WebView feel on iPad and a small Apple guideline 4.2 review risk.

**Third choice:** **Flutter** is a credible alternative if you prefer Dart and Google's tooling. **Godot**, **Unity** and **Compose Multiplatform** fit this game worse, mainly because of their web stories and because the rules can't be shared with a mainstream server.

**For v2 online play:** use Firebase or Supabase. A cloud function validates each move with the same TypeScript engine. Apple Game Center isn't suitable, because it is Apple-only and can't validate moves on a server.

---

## 2. Requirements recap

From [PRODUCT_BRIEF.md](../../PRODUCT_BRIEF.md) and [GAME_SPEC.md](../../GAME_SPEC.md):

- **The game:** 2 players, turn-based, perfect information, chess-like. 9×9 grid, 26 pieces (13 per side), stacking of 2 elements, a setup phase, check and checkmate, and variant toggles (`exactRange`, `hiddenSetup`, …).
- **Graphics:** 2D with light animation: drag and drop, move, stack, capture.
- **v1 (D1):** same-device pass-and-play on iPad and iPhone. No server, no accounts.
- **v2 (D2):** online play between friends, most likely asynchronous (moves over days, with push notifications), maybe live.
- **D3:** the iPad is first-class, not a scaled-up phone app.
- **D4:** iOS and iPadOS first. Web and Android without a rewrite (a hard requirement).
- **D5:** a pure rules engine. State and moves are serializable data and `(state, move) → state`. It must be unit-testable and shareable with a server that validates moves.
- **Builder:** a non-game-developer working mostly through AI coding assistants (Claude Code). Ecosystem maturity, documentation and how well models know the stack all matter.
- **Future AI opponent:** a search bot (minimax/alpha-beta or MCTS), running off the UI thread or on a server.

**One platform change affects every stack.** Apple has deprecated the `UIRequiresFullScreen` opt-out ([TN3192](https://developer.apple.com/tutorials/data/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key.md), revised 2026-10-09):
- When built with the iOS 27 SDK, it "no longer opts your app out of resizing on either platform".
- Apps are expected to support all interface orientations, and a launch screen is required for App Store submission from iOS/iPadOS 27.

So, whatever the stack, **the board layout must adapt to any window size and orientation** (Stage Manager windows, Split View, rotation). That is a design task, not a framework feature.

---

## 3. Options

### 3.1 React Native + Expo (TypeScript)

React Native renders real native UI from React/TypeScript code. Expo is the official toolkit and build service around it.

**Versions (as of 2026-10-27)**
- **Expo SDK 58** came out 2026-10-15 with **React Native 0.88** and React 19.3 ([changelog](https://expo.dev/changelog/sdk-58), [versions](https://docs.expo.dev/versions/latest/)).
- Expo ships an SDK "three times a year", each targeting the latest React Native ([docs](https://docs.expo.dev/versions/latest/)).
- React Native's "New Architecture" is mandatory: "always enabled and cannot be disabled" from SDK 55 ([docs](https://docs.expo.dev/guides/new-architecture/)). The big architecture migration is behind it, so fewer breaking changes should be ahead (assessment).

**Graphics and animation**
- **Reanimated 4.7.1** (2026-10-02, MIT) needs the New Architecture and the separate `react-native-worklets` package ([release](https://github.com/software-mansion/react-native-reanimated/releases/tag/4.7.1), [docs](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/)).
  - On native, animations run on the UI thread.
  - On web, Reanimated is "implemented purely in JavaScript, hence the efficiency of the animations might be lower" ([web support](https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support/)). Assessment: for a few dozen pieces moving one at a time, that is not a practical problem.
- **Gesture Handler 3.4.0** (2026-10-16, MIT) supports iOS, Android and web, and the 3.4 release includes many web fixes ([release](https://github.com/software-mansion/react-native-gesture-handler/releases/tag/v3.4.0), [Expo page](https://docs.expo.dev/versions/latest/sdk/gesture-handler/)). This is what drag-and-drop of pieces would be built on.
- **React Native Skia** is a GPU 2D canvas.
  - **The project has moved.** The old Shopify docs site now says it "has moved to" [wcandillon.github.io/react-native-skia](https://wcandillon.github.io/react-native-skia/) ([old site](https://shopify.github.io/react-native-skia/)). v3 is released from [wcandillon/react-native-skia](https://github.com/wcandillon/react-native-skia/releases/tag/v3.8.0) (3.8.0, 2026-10-24, MIT).
  - Expo SDK 58 still bundles the older `@shopify/react-native-skia` 2.14.0 ([Expo page](https://docs.expo.dev/versions/latest/sdk/skia/)).
  - v3 requires Android API 26+ and Vulkan 1.1 ([install](https://wcandillon.github.io/react-native-skia/docs/getting-started/installation/)).
  - On web, Skia loads CanvasKit as WebAssembly. The file is "2.9MB when gzipped", and all canvases share one WebGL context ([web docs](https://wcandillon.github.io/react-native-skia/docs/getting-started/web/)).
  - Assessment: a 9×9 board with 26 pieces doesn't need Skia. Plain views plus Reanimated keep the web build light. Treat Skia as an optional add-on for effects.

**iPad UX**
- **Haptics:** `expo-haptics` uses the Taptic Engine on iOS and the Vibration API on web ([docs](https://docs.expo.dev/versions/latest/sdk/haptics/)). Safari on iOS doesn't support `navigator.vibrate` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)), so web haptics only work on Android browsers.
- **Tablet and multitasking config:** `ios.supportsTablet` (default false; must be turned on), `ios.requireFullScreen` (default false, which leaves Split View and Slide Over enabled) and `orientation` ([app config](https://docs.expo.dev/versions/latest/config/app/)).
- **Orientation lock:** `expo-screen-orientation` warns that on iOS 27+, `requireFullScreen` no longer prevents resizing and `lockAsync` "may have no effect", so screens should adapt ([docs](https://docs.expo.dev/versions/latest/sdk/screen-orientation/)). This matches Apple's TN3192 above.
- **Apple Pencil:** hover isn't relevant to this game, and I didn't research it for React Native. UNVERIFIED.

**Web and Android**
- **Web:** Expo claims "first-class support" for the web via `react-native-web` and Metro, with static or server output ([web docs](https://docs.expo.dev/workflow/web/)). Plain DOM elements like `<div>` don't render on native, so shared UI must use React Native components (same page).
- **Android:** a native target on equal footing with iOS.

**AI opponent (threads)**
- **Native:** `createWorkletRuntime` creates extra JavaScript runtimes, "possibly on different threads". Its compatibility table lists **native only, not web** ([docs](https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime)).
- **Web:** use a standard browser Web Worker. I found no official Expo doc for setting one up. UNVERIFIED.
- `react-native-threads` hasn't been updated since 2022 (npm), so don't use it.
- Assessment: a bot needs **two small adapters**, a worklet runtime on native and a Web Worker on web, around the same pure engine. Running the bot on a server, or slicing the search into small chunks between frames, avoids this.

**Builds and cost**
- **EAS (Expo's cloud build service)** ([pricing](https://expo.dev/pricing)):
  - **Free:** $0, "up to 15 Android and 15 iOS builds" (period not stated on the page), low priority.
  - **Starter:** $19/month plus usage.
  - **Production:** $199/month plus usage.
- **EAS is optional:** `npx expo run:ios` / `run:android` builds locally with Xcode and Android Studio ([local builds](https://docs.expo.dev/build-reference/local-builds/)).
- React Native, Expo, Reanimated, Gesture Handler, Skia and react-native-web are all **MIT** (npm `license` fields).

**Push notifications (v2):** `expo-notifications` covers iOS and Android, with no web push. Remote push needs a development build rather than Expo Go ([docs](https://docs.expo.dev/versions/latest/sdk/notifications/)). Whether Expo's push service costs anything: UNVERIFIED.

**AI-assistant tooling**
- **llms.txt:** Expo publishes an `llms.txt` docs index, and any docs page can be fetched as `.md` ([llms.txt](https://docs.expo.dev/llms.txt)).
- **Agent guides:** Expo's docs carry guides for Claude Code, Codex and Cursor. The Claude Code guide installs Expo skills and the MCP server through `claude plugin install expo@claude-plugins-official`, and says new `create-expo-app` projects include `AGENTS.md` ([Claude guide](https://docs.expo.dev/agents/claude.md)).
- **MCP server:** Expo runs a hosted MCP server ([docs](https://docs.expo.dev/mcp.md)). Its `search_documentation` tool needs a paid EAS plan.

**Sharing the rules engine:** the engine is plain TypeScript, so a Node, Deno or Cloudflare server runs the identical package. This is the best possible fit for D5 (assessment).

**Risks**
- **Upgrade churn:** three SDK releases a year, each with a new React Native version.
- **Native build tooling:** Xcode and Gradle failures can confuse a non-developer. Expo's managed workflow and EAS reduce, but don't remove, this (assessment).
- **Skia's move:** the move from Shopify to an individual maintainer's repo is a governance change to watch, which is another reason to keep Skia optional.

### 3.2 Flutter (widgets / CustomPainter, or Flame) in Dart

Flutter draws its own UI with its own renderer, in the Dart language.

**Versions (as of 2026-10-27)**
- Stable is **Flutter 3.47.8 with Dart 3.13.7**, released 2026-10-23 ([release manifest](https://storage.googleapis.com/flutter_infra_release/releases/releases_macos.json), [3.47 blog](https://flutter.dev/blog/whats-new-in-flutter-3-47)).
- Stable ships roughly quarterly. The 2026 roadmap commits to at least 4 stable releases a year ([roadmap](https://github.com/flutter/flutter/blob/master/docs/roadmap/Roadmap.md)).

**Graphics**
- **Impeller** is the only renderer on iOS, and the default on Android API 29+. Shaders are precompiled, so animations don't stutter the first time they run ([Impeller](https://docs.flutter.dev/perf/impeller)).
- **Games toolkit:** Flutter's games page says turn-based "board games, card games, puzzles, and strategy games … are well suited for Flutter". It suggests the **Flame** engine for real-time games that need a game loop, collisions or cameras ([toolkit](https://docs.flutter.dev/resources/games-toolkit)). There's a card-game template with drag and drop, but **no board-game template** ([flutter/games](https://github.com/flutter/games)).
- **Flame:** stable is **1.38.2** (2026-08-27, MIT), and 2.0.0 is in dev prereleases ([pub.dev](https://pub.dev/packages/flame)), so a major-version migration is coming.
- Assessment: for Elements, plain widgets or `CustomPainter` with implicit animations are enough. Flame adds concepts this game doesn't need.

**iPad UX**
- **Haptics:** `HapticFeedback` offers light, medium and heavy impact, selection, and success/warning/error ([API](https://api.flutter.dev/flutter/services/HapticFeedback-class.html)).
- **UIScene:** Flutter adopted the UIScene lifecycle by default in 3.41. Apps built with Xcode 27 that don't adopt it crash on launch. Flutter "doesn't fully support multiple scenes yet" ([breaking-change note](https://docs.flutter.dev/release/breaking-changes/uiscenedelegate)).
- **Open iPadOS 26 windowing issues:**
  - Window controls cover the app's back button ([#170461](https://github.com/flutter/flutter/issues/170461)).
  - Setting orientation fails when "requires full screen" is off ([#176260](https://github.com/flutter/flutter/issues/176260)).
- No Flutter guidance on Stage Manager or Split View was found. UNVERIFIED.

**Web**
- **Renderers:** a normal build is JavaScript + CanvasKit. A `--wasm` build uses skwasm and falls back to JavaScript ([renderers](https://docs.flutter.dev/platform-integration/web/renderers)).
- **Wasm requirements:** Chrome 137+, Safari 26.2+ or Firefox 147+. In the current pipeline, Wasm is on by default only for Chromium, so **iPad and iPhone browsers get the JavaScript + CanvasKit build** ([Wasm](https://docs.flutter.dev/platform-integration/web/wasm)).
- **SEO:** Flutter says its web output is "not suitable for static websites with text-rich flow-based content" and doesn't suit search indexing ([FAQ](https://docs.flutter.dev/platform-integration/web/faq)). A separate landing page would be needed.
- **Load size:** the CanvasKit download adds about 1.5 MB, a figure from a legacy docs page ([old page](https://flutter.dev/docs/development/tools/web-renderers)). There is no current official total. UNVERIFIED.

**AI opponent (threads)**
- **Native:** `Isolate.run()` gives real background threads ([isolates](https://dart.dev/language/isolates)).
- **Web:** "Multiple Isolates not supported by Flutter web" (same page), and `compute` on web "will run `callback` on the current eventloop" ([API](https://api.flutter.dev/flutter/foundation/compute.html)), so the UI blocks.
- Web workers are possible but need a separately compiled entrypoint ([concurrency](https://dart.dev/language/concurrency)).

**Server-side Dart (rules sharing)**
- **Cloud Functions for Firebase in Dart** became **experimental** on 2026-05-06, for HTTPS and callable functions only ([Firebase blog](https://firebase.blog/posts/2026/05/dart-functions-exp/), [docs](https://firebase.google.com/docs/functions/start-dart)).
- **shelf** is maintained (1.4.3, 2026-10-16, BSD-3).
- **Dart Frog** last released 1.2.6 on 2025-11-03.
- **Serverpod** 4.0.4 is current, but its core package is **SSPL-1.0** (a restrictive licence), with other packages BSD-3.
- (Sources: pub.dev package pages and the Serverpod GitHub LICENSE, as reported by the research pass.)
- Assessment: sharing a Dart engine with a server is possible but less mainstream than TypeScript.

**AI-assistant tooling**
- Official Dart & Flutter MCP server, with a Claude Code plugin ([MCP](https://docs.flutter.dev/ai/mcp-server)).
- Official agent rules and skills ([AI tools](https://docs.flutter.dev/ai/tools)).
- `docs.flutter.dev/llms.txt` exists but still lists 3.44 as the latest release.

**Licensing and longevity**
- Flutter is BSD-3 and Flame is MIT.
- The 2026 roadmap says non-Google contributors now outnumber Google employees. Material and Cupertino are being split out into separate packages ([roadmap](https://github.com/flutter/flutter/blob/master/docs/roadmap/Roadmap.md)).

### 3.3 Godot 4.x (GDScript or C#)

A free, open-source game engine with a visual editor.

**Versions and licence**
- Latest stable is **4.7.2** (2026-08-18). **4.8-beta1** came out 2026-10-15 ([archive](https://godotengine.org/download/archive/), [4.7.2](https://godotengine.org/article/maintenance-release-godot-4-7-2/), [4.8 beta 1](https://godotengine.org/article/dev-snapshot-godot-4-8-beta-1/)).
- **MIT** licence. Your content isn't covered by the engine licence ([licence](https://godotengine.org/license/)).

**Web export** ([docs, 4.7](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html))
- It uses WebGL 2 with the Compatibility renderer only.
- Single-threaded export has been the default since 4.3. The docs say it "works very well on macOS and iOS too". Threaded export needs special cross-origin headers (COOP/COEP).
- The docs note Safari has WebGL 2 issues and recommend Chromium or Firefox.
- **C# projects can't be exported to the web** ("Projects written in C# using Godot 4 currently cannot be exported to the web").

**Mobile**
- iOS and Android export are supported for GDScript.
- C# on both is "experimental" ([C# docs](https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/index.html)).
- So, given the web requirement, **GDScript is the only real choice**.

**iPad UX**
- **Haptics:** `Input.vibrate_handheld` works on Android, iOS and web ([Input](https://docs.godotengine.org/en/stable/classes/class_input.html)).
- **Multitasking:** no Godot docs or issues found on iPad Split View or Stage Manager. UNVERIFIED.
- Assessment: the UI is engine-drawn, so platform conventions (text input, accessibility, system gestures) are less native than in React Native or Capacitor.

**AI opponent**
- `Thread` and `WorkerThreadPool` work on native ([threads](https://docs.godotengine.org/en/stable/tutorials/performance/using_multiple_threads.html)).
- On the default single-threaded web export, background threads aren't available. Assessment, as the docs page doesn't say: the bot would need the threaded export and its headers, or time-slicing.

**Rules sharing:** GDScript only runs inside Godot. Assessment: a server would have to run Godot headless, or the rules would need a second implementation. That breaks D5's "same engine on the server" in practice.

**AI-assistant tooling**
- There is no official Godot MCP or AI assistant. Only community add-ons exist ([asset library example](https://godotengine.org/asset-library/asset/5050)).
- GDScript is used by 4.0% of developers in the [Stack Overflow 2026 survey](https://survey.stackoverflow.co/2026/technology/data/languages), so there is far less training data than for TypeScript.

### 3.4 Unity 6 (C#)

The most widely used commercial game engine.

**Versions**
- **Unity 6.6** is the current "Supported" release (Sep 2026) ([product updates](https://discussions.unity.com/c/unity-editor/product-update/205)).
- **6.3 LTS** is supported until Dec 2027 ([support](https://unity.com/releases/unity-6/support)).
- **Unity 7 Preview** is due Dec 2026, with release targeted for Q1 2027 ([Unite Seoul recap, 2026-07-21](https://unity.com/blog/unite-seoul-keynote-2026-recap)). That means a major migration soon after starting.

**Pricing** ([pricing](https://unity.com/pricing), [pricing updates](https://unity.com/products/pricing-updates))
- **Personal:** free under $200K revenue or funding in the past 12 months. The splash screen is optional in Unity 6.
- **Pro:** **$2,310 per seat per year** (or $210/month), reflecting a 5% increase on 2026-01-12.
- **Runtime fee:** "As of September 12, 2024, we decided to cancel it."

**Web** ([browser compatibility](https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-browsercompatibility.html), [technical overview](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-technical-overview.html))
- Mobile browsers have been supported since Unity 6.0. iOS Safari 18.2+ is recommended for memory reasons.
- **C# threads aren't supported on Web** ("Managed (C#) threads aren't supported due to the lack of a multithreaded garbage collection feature in WebAssembly"), so a bot would block the UI unless time-sliced.
- Build-size guidance is advice only (compression, Addressables, and so on), with no target numbers ([mobile web optimisation](https://docs.unity.com/en-us/engine/current/manual/platform-specific/webgl/building-distribution/web-optimization-mobile)). Assessment: a Unity web build will be much heavier than a TypeScript web app.

**Rules sharing:** C# targeting .NET Standard 2.1 ([.NET profiles](https://docs.unity.com/en-us/engine/6000.6/manual/programming-environment/overview-of-dot-net-in-unity/dotnet-profile-support)) could be shared with an ASP.NET server. This is an inference, but a plausible one.

**AI-assistant tooling:** Unity AI (an in-editor agent) is in beta. Personal gets a trial, then $10/month. The Unity MCP server and CLI are free ([Unity AI](https://unity.com/features/ai)).

**iPad multitasking and haptics:** not researched in depth. UNVERIFIED.

**Assessment:** Unity is built for 3D and real-time games. For a 2D board game it brings a heavy editor, a heavy web build, a commercial licence and a pending Unity 7 migration, with little benefit in return.

### 3.5 TypeScript web app + Capacitor (stores) and/or a PWA

One web codebase (for example React + SVG/DOM with CSS or Web Animations, or a canvas library) is wrapped in a native shell (Capacitor) for the App Store and Play Store. It can also be installed as a PWA (Progressive Web App: a website that installs to the home screen).

**Versions**
- **Capacitor 8.5.3** (2026-10-07, MIT) supports iOS 15+ and Android 7+ ([releases](https://github.com/ionic-team/capacitor/releases), [support policy](https://capacitorjs.com/docs/main/reference/support-policy)).
- **Haptics:** `@capacitor/haptics` provides native impact, notification and selection haptics ([docs](https://capacitorjs.com/docs/apis/haptics)).
- **Push:** `@capacitor/push-notifications` uses APNs on iOS and FCM on Android, with no web push ([docs](https://capacitorjs.com/docs/apis/push-notifications)).
- **Rendering options:** **PixiJS v8.22.0** (2026-10-01, MIT, [releases](https://github.com/pixijs/pixijs/releases)) or **Phaser v4.2.1** (2026-07-09, MIT; Phaser 4.0 shipped 2026-04-10, [releases](https://github.com/phaserjs/phaser/releases)).
- Assessment: for a 9×9 board, **SVG/DOM is enough** and gives sharp scaling, accessibility and easy styling. Pixi or Phaser are only worth it for particle-heavy effects.

**App Store risk (guideline 4.2)**
- The [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) were last updated October 16, 2026. Guideline **4.2** reads: "Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store."
- **4.2.2** excludes "web clippings, content aggregators, or a collection of links".
- **4.7** covers HTML5 games that are *not embedded in the binary*, so it doesn't apply if all game code ships inside the app.
- Assessment: a self-contained, offline game with native haptics, push and app-like UI isn't a "repackaged website". The risk is low but not zero, because reviewers decide case by case. You can't verify ahead of submission how Apple will review a particular app.

**iPad UX**
- **Haptics:** native through the Capacitor plugin. In a plain PWA there are no iOS haptics, because Safari doesn't support `navigator.vibrate` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)).
- **Touch:** Pointer Events (one API for touch, mouse and pen) are supported in Safari since 13 (MDN browser-compat data, same source family).
- **Apple Pencil hover:** Safari 16.1 added hover states for Apple Pencil hover on the iPad Pro ([WebKit blog](https://webkit.org/blog/13399/webkit-features-in-safari-16-1/)). The exact event model is UNVERIFIED. It isn't important for this game.
- **Multitasking:** a web layout is naturally responsive to window resizing (assessment).
- Assessment: the WebView needs care so it feels native. Disable long-press callouts, text selection and rubber-band scrolling. Animations should use compositor-friendly CSS transforms.

**PWA path**
- **Web push on iOS** works from iOS/iPadOS 16.4, but **only for web apps added to the Home Screen** ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)).
- **EU:** in early 2024 Apple announced changes for the EU, then kept Home Screen web apps ([Apple newsroom](https://www.apple.com/newsroom/2024/01/apple-announces-changes-to-ios-safari-and-the-app-store-in-the-european-union/), [Apple forum quote](https://developer.apple.com/forums/thread/748026)). The current Apple DMA page no longer carries that text. PARTLY UNVERIFIED.
- **Android:** a PWA can be listed on Google Play as a **Trusted Web Activity** using Bubblewrap ([Android docs](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities); [Bubblewrap v1.27.0](https://github.com/GoogleChromeLabs/bubblewrap/releases), Apache-2.0).
- Assessment: a PWA alone doesn't meet "iPad first-class" (no haptics, no App Store presence), but it is a free bonus of this stack.

**AI opponent:** Web Workers are supported in iOS WebViews and Safari (MDN compat data), so **one Web Worker implementation runs the bot on iOS, Android and web**. Avoid `SharedArrayBuffer`: in Capacitor iOS it needs a workaround, because cross-origin isolation headers weren't applied to the `capacitor://` scheme ([issue #6182](https://github.com/ionic-team/capacitor/issues/6182), closed 2023). Whether that still holds is UNVERIFIED. Plain `postMessage` is enough.

**Rules sharing:** the same TypeScript package as in 3.1, so it is ideal for D5.

**AI-assistant friendliness:** this is the most heavily represented stack in training data. JavaScript is used by 62.0% and TypeScript by 43.8% of developers ([SO 2026](https://survey.stackoverflow.co/2026/technology/data/languages)). TypeScript became the #1 language on GitHub in Aug 2025 ([Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)). Capacitor has no official Claude Code plugin or MCP server that I found (UNVERIFIED), but it rarely needs one, because most code is ordinary web code.

### 3.6 Kotlin Multiplatform / Compose Multiplatform

Kotlin code shared across platforms, with JetBrains' Compose UI framework.

**Versions and status**
- **Compose Multiplatform 1.12.2** (2026-10-15, Apache-2.0) ([releases](https://github.com/JetBrains/compose-multiplatform/releases)).
- **iOS:** Stable since 1.8.0 (May 2025) ([JetBrains blog](https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/)).
- **Web:** **Beta** since 1.9.0 (Sep 2025), and still Beta in JetBrains' table ([supported platforms](https://kotlinlang.org/docs/multiplatform/supported-platforms.html)).
- **Drag and drop in mobile browsers** was listed as planned work in the 1.9 notes ([what's new 1.9](https://kotlinlang.org/docs/multiplatform/whats-new-compose-190.html)). That is a core interaction for this game. Whether it has shipped in 1.12: UNVERIFIED.

**Web**
- Kotlin/Wasm is Beta and needs **Safari 18.2+** (WasmGC), with a JavaScript fallback mode ([Wasm config](https://kotlinlang.org/docs/wasm-configuration.html), [overview](https://kotlinlang.org/docs/wasm-overview.html)).

**Rules sharing:** excellent within Kotlin. Ktor 3.6.0 (2026-09-18) runs the same code on a server ([Ktor releases](https://github.com/ktorio/ktor/releases)).

**AI opponent**
- On iOS, Kotlin/Native allows real multithreading ([memory manager](https://kotlinlang.org/docs/native-memory-manager.html)).
- On Wasm, a separate Web Worker would be needed. No official doc found. UNVERIFIED.

**AI-assistant friendliness:** Kotlin is used by 10.8% of developers ([SO 2026](https://survey.stackoverflow.co/2026/technology/data/languages)). JetBrains' AI tooling (Junie, MCP) is official ([Kotlin AI docs](https://kotlinlang.org/docs/ai-for-development.html)). Assessment: Compose Multiplatform for iOS and web is younger than React Native or Flutter, so there are fewer examples for models to draw on.

### 3.7 Other options considered

- **Native SwiftUI/SpriteKit.** The best possible iPad feel, but it fails D4 (web and Android) without a second codebase. Not recommended (assessment, no source needed).
- **Tauri 2.** Stable since 2024-10-02 with iOS and Android. The announcement says the mobile developer experience is still being improved ([Tauri 2.0](https://v2.tauri.app/blog/tauri-20/); v2.12.5, 2026-10-21, [releases](https://github.com/tauri-apps/tauri/releases)). It is architecturally similar to Capacitor (a WebView) but less mature on mobile. It doesn't beat Capacitor here.
- **Defold.** A lightweight engine, v1.14.0 (2026-10-12), that targets iOS, Android and HTML5 in Lua ([releases](https://github.com/defold/defold/releases)). Its rules can't be shared with a mainstream server, and it has a small community. Not recommended.

---

## 4. Comparison table

Ratings are my assessment based on the facts in section 3. ++ strong · + good · ~ workable with effort · – weak.

| Criterion | Expo / React Native | TS web + Capacitor | Flutter | Godot (GDScript) | Unity | Compose Multiplatform |
|---|---|---|---|---|---|---|
| **1. iPad UX** (touch, animation, haptics, multitasking) | ++ native views, UI-thread animation, Taptic haptics | + good with care; WebView feel; native haptics via plugin | ++ smooth (Impeller); some open iPadOS 26 windowing bugs | + fine for games; engine-drawn UI | + fine; heavy | + iOS Stable; younger |
| **2a. Web** | + react-native-web; JS-only animations; skip Skia to stay light | ++ it *is* the web | ~ CanvasKit download; no Wasm on Safari by default; poor SEO | ~ WebGL2 only; Safari caveats | ~ heavy builds; no C# threads | ~ Beta; Safari 18.2+; mobile DnD was planned |
| **2b. Android** | ++ | + (WebView) | ++ | + | + | ++ |
| **3. Store distribution** | ++ no 4.2 risk | + small 4.2 risk if not app-like | ++ | ++ | ++ | ++ |
| **4. Rules engine on server** | ++ same TS package (Node/Deno/Workers) | ++ same TS package | ~ Dart server niche; Dart Cloud Functions experimental | – GDScript only in Godot | + C# / .NET Standard library | ++ Kotlin + Ktor |
| **5. Path to online (Firebase/Supabase etc.)** | ++ first-class JS SDKs | ++ first-class JS SDKs | + FlutterFire; Supabase Dart | ~ HTTP/WebSocket only | + SDKs exist | ~ fewer SDKs |
| **6. AI-assistant friendliness** | ++ TS #1 on GitHub; official Claude plugin + MCP | ++ largest corpus (web/React) | + official MCP + Claude plugin; Dart 4.9% usage | – GDScript 4.0%; no official AI tools | + C# popular; Unity AI paid after trial | ~ Kotlin 10.8%; CMP iOS/web newer |
| **7. Licence / cost** | ++ MIT; EAS optional | ++ MIT | ++ BSD-3 / MIT | ++ MIT | ~ free < $200K; Pro $2,310/seat/yr | ++ Apache-2.0 |
| **8. Maintenance risk** | + 3 SDKs/yr churn; Skia governance change | + low (web standards); plugin upgrades | + quarterly releases; Flame 2.0 coming | + healthy project; C#/web gap | ~ Unity 7 migration imminent | ~ web still Beta |
| **9. AI opponent off-thread** | ~ worklet runtime (native) + Web Worker (web): two adapters | ++ one Web Worker everywhere | ~ isolates native; web blocks unless worker | ~ threads need threaded web export | – no C# threads on web | ~ native threads; worker on Wasm |

Sources for each cell are in section 3.

---

## 5. Multiplayer backend options (v2)

What v2 needs: friends play **asynchronously**, one move every few hours or days. Each move is **validated on a server** with the same rules engine (D5), and the opponent gets a **push notification**. Live play is a bonus.

| Option | What it is | Fit for async turn-based with friends | Key facts |
|---|---|---|---|
| **Firebase** (Firestore + Cloud Functions + FCM) | Google's hosted backend | **Strong.** Store each match as a document with its move list. A callable function in TypeScript validates the move with the shared engine, and FCM pushes to the opponent. | Free tier: 50K reads, 20K writes a day. **Cloud Functions need the Blaze (pay-as-you-go) plan**, with 2M invocations/month free. FCM is free. Auth is free to 50K MAU ([pricing](https://firebase.google.com/pricing)). Functions run Node/TS or Python, with Dart experimental ([docs](https://firebase.google.com/docs/functions)). |
| **Supabase** (Postgres + Edge Functions + Realtime) | Open-source backend built on Postgres | **Strong.** Matches and moves live in SQL tables with row-level security. A TypeScript (Deno) Edge Function validates moves, and Realtime pushes live updates. Mobile push still needs APNs/FCM (or Expo push). | **Free:** 500 MB DB, 50K MAU, 500K function invocations, 200 concurrent realtime connections; **free projects pause after 1 week of inactivity**. **Pro:** from $25/month, never paused ([pricing](https://supabase.com/pricing), [billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [functions](https://supabase.com/docs/guides/functions)). |
| **Cloudflare Durable Objects** | One small stateful server object per match | **Good**, for a developer comfortable with Workers. Each match is a Durable Object running the TypeScript engine. Hibernating WebSockets give cheap live play. Push and auth are up to you. | Free plan available. The paid plan's examples apply a $5/month minimum ([pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)). |
| **Nakama** (Heroic Labs) | Open-source game server: friends, matches, notifications | **Capable but heavy.** It covers "passive" turn-based matches over hours to weeks, but you persist inputs yourself. Native push isn't shown in the notification docs (UNVERIFIED). | v3.41.0 (2026-09-18), Apache-2.0. Server logic in TypeScript, Go or Lua ([docs](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/), [notifications](https://heroiclabs.com/docs/nakama/concepts/notifications/)). Heroic Cloud has **no public price** ([pricing](https://heroiclabs.com/pricing/)). |
| **Colyseus** | Real-time room server | **Better for live play than async.** Reconnection is time-boxed (the docs suggest about 5 minutes for turn-based games), so day-long games need your own persistence. | 0.18.10 (2026-10-22), MIT. Cloud from $15/month ([pricing](https://colyseus.io/pricing/), [reconnection](https://docs.colyseus.io/room/reconnection), [database](https://docs.colyseus.io/database)). |
| **boardgame.io** | JavaScript turn-based game framework with an authoritative server | **Not recommended as a dependency.** Its design (pure moves, server-authoritative) matches D5 and is a good reference, but there has been **no release since v0.50.2 (2022-11-10)**, with occasional commits only ([repo](https://github.com/boardgameio/boardgame.io)). There are no push or friends features. | MIT. |
| **Apple Game Center turn-based** (`GKTurnBasedMatch`) | Apple's built-in turn-based matchmaking | **Not suitable as the main path.** It runs on **Apple platforms only**, so there is no Android or web. Game Center "stores and forwards" client-written match data, so there's nowhere to validate moves on a server (inference from the docs). The data size limit isn't stated in current docs (UNVERIFIED). | Turn timeout up to 90 days ([GKTurnBasedMatch](https://developer.apple.com/documentation/gamekit/gkturnbasedmatch)). The iOS 26 Games app highlights achievements, leaderboards and multiplayer, and supports your own multiplayer system ([Games app](https://developer.apple.com/games-app/)). Could be an optional extra for Apple achievements and leaderboards later. |

**Recommendation for v2 (assessment)**
- **Firebase or Supabase**, with TypeScript server functions that import the same rules package.
- Store each match as `{ variant settings, setup placements, move list }`. The engine can replay that from scratch to check any position, which is exactly what D5 makes cheap.
- **Pick Firebase** if push notifications and zero-maintenance hosting matter most (FCM is built in).
- **Pick Supabase** if you prefer a SQL database and open source. Budget $25/month once real players arrive, because free projects pause.
- Live play can run on either one's realtime features, without a dedicated game server.

---

## 6. Short-list for a non-game-developer

### Option A (recommended): Expo / React Native + TypeScript rules package

**What you get**
- A real iPad and iPhone app that feels native: the system's own touch handling, Taptic haptics, smooth animations that run off the main JavaScript thread, and normal App Store review.
- The same code produces the Android app and a website.
- Claude Code has an official Expo plugin and docs written for agents, and TypeScript is the language AI models know best.

**What it costs you**
- **Two build systems:** iOS (Xcode) and Android (Gradle). Expo hides most of this, and EAS can build in the cloud, but occasional native build errors will need patience.
- **Upgrades:** about three framework upgrades a year.
- **The future AI opponent** needs one adapter for phones (a worklet runtime) and another for the web (a Web Worker), or it can simply run on the server in v2.

**Practical setup**
- A monorepo with `packages/engine` (pure TypeScript and its unit tests, no UI imports) and `apps/mobile` (Expo).
- Later, `apps/server` (Firebase or Supabase functions) imports `packages/engine`.

### Option B: TypeScript web app (React + SVG) + Capacitor for the stores

**What you get**
- The simplest mental model: it's a website, and every AI model has seen millions of them.
- Best-in-class web version.
- One Web Worker runs the AI opponent everywhere.
- The same engine and server story as A.

**What it costs you**
- On iPad it runs inside a WebView. It can feel native with care (haptics plugin, no text-selection callouts, transform-based animation), but this is the option most at risk of feeling "web-like".
- There's a small chance an App Store reviewer flags guideline 4.2. The answer is to make it clearly an app: offline play, haptics, push, no browser-like navigation.

### Option C: Flutter (plain widgets) + Dart

**What you get**
- Very smooth rendering on iPad and Android.
- Strong Google tooling, including an official MCP server and a Claude Code plugin.
- One codebase for all platforms.

**What it costs you**
- **Dart:** a less common language (4.9% vs 43.8% for TypeScript in [SO 2026](https://survey.stackoverflow.co/2026/technology/data/languages)), so fewer examples for AI models.
- **The web version:** a large download, Safari gets the JavaScript build, and a heavy AI search would freeze the web UI unless a separate worker is built.
- **Server reuse of the engine:** relies on experimental Dart Cloud Functions or a self-hosted Dart server.

### What would change the recommendation

- **The web becomes the main channel** (e.g. you want people to play from a shared link without installing): choose **B**.
- **A 1–2 week prototype shows Expo drag-and-drop or animation feels wrong on iPad or web**, or native builds are too painful: choose **B**.
- **A prototype shows the Capacitor WebView feels non-native on iPad**: stay with **A**.
- **You later want rich real-time effects** (particles, shaders, 3D pieces): add Skia to A, or consider Flutter (C). A game engine (Godot) only makes sense if the game turns into something animation-heavy and you accept a weaker web version and a separate server implementation of the rules.
- **Online play stays Apple-only:** Game Center turn-based would become a cheap v2. That contradicts D4, so it is unlikely.

**Suggested next step:** prototype the riskiest interaction (dragging a piece, legal-move highlights, stacking animation, haptic on drop) in **A**. Test it on a real iPad in Stage Manager and in a desktop and an iPad browser before committing. Build the rules engine first and independently, because it's the same under A and B.

---

## 7. Sources

All accessed 2026-10-27 unless noted otherwise.

**Apple**
- App Store Review Guidelines (last updated 2026-10-16): https://developer.apple.com/app-store/review/guidelines/
- TN3192, UIRequiresFullScreen deprecation (rev. 2026-10-09): https://developer.apple.com/tutorials/data/documentation/technotes/tn3192-migrating-your-app-from-the-deprecated-uirequiresfullscreen-key.md
- GKTurnBasedMatch: https://developer.apple.com/documentation/gamekit/gkturnbasedmatch
- GKTurnBasedMatch.matchDataMaximumSize: https://developer.apple.com/documentation/gamekit/gkturnbasedmatch/matchdatamaximumsize
- Games app: https://developer.apple.com/games-app/
- EU changes (2024): https://www.apple.com/newsroom/2024/01/apple-announces-changes-to-ios-safari-and-the-app-store-in-the-european-union/
- Apple developer forum thread quoting the EU Home Screen web apps decision: https://developer.apple.com/forums/thread/748026

**WebKit and MDN**
- Web Push for web apps on iOS/iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Safari 16.1 features (Pencil hover): https://webkit.org/blog/13399/webkit-features-in-safari-16-1/
- MDN `navigator.vibrate`: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate

**React Native / Expo**
- Expo SDK 58 changelog: https://expo.dev/changelog/sdk-58
- Expo versions: https://docs.expo.dev/versions/latest/
- New Architecture: https://docs.expo.dev/guides/new-architecture/
- Expo web: https://docs.expo.dev/workflow/web/
- App config: https://docs.expo.dev/versions/latest/config/app/
- expo-haptics: https://docs.expo.dev/versions/latest/sdk/haptics/
- expo-screen-orientation: https://docs.expo.dev/versions/latest/sdk/screen-orientation/
- expo-notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo pricing: https://expo.dev/pricing
- Local builds: https://docs.expo.dev/build-reference/local-builds/
- Expo llms.txt: https://docs.expo.dev/llms.txt
- Expo MCP: https://docs.expo.dev/mcp.md
- Expo Claude Code guide: https://docs.expo.dev/agents/claude.md
- Expo Skia page: https://docs.expo.dev/versions/latest/sdk/skia/
- Expo Gesture Handler page: https://docs.expo.dev/versions/latest/sdk/gesture-handler/
- Reanimated 4.7.1 release: https://github.com/software-mansion/react-native-reanimated/releases/tag/4.7.1
- Reanimated getting started: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
- Reanimated web support: https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support/
- Worklets createWorkletRuntime: https://docs.swmansion.com/react-native-worklets/docs/threading/createWorkletRuntime
- Gesture Handler 3.4.0 release: https://github.com/software-mansion/react-native-gesture-handler/releases/tag/v3.4.0
- React Native Skia (moved): https://shopify.github.io/react-native-skia/
- React Native Skia docs: https://wcandillon.github.io/react-native-skia/
- React Native Skia installation: https://wcandillon.github.io/react-native-skia/docs/getting-started/installation/
- React Native Skia web: https://wcandillon.github.io/react-native-skia/docs/getting-started/web/
- React Native Skia v3.8.0 release: https://github.com/wcandillon/react-native-skia/releases/tag/v3.8.0

**Flutter / Dart**
- Release manifest: https://storage.googleapis.com/flutter_infra_release/releases/releases_macos.json
- What's new in 3.47: https://flutter.dev/blog/whats-new-in-flutter-3-47
- Roadmap: https://github.com/flutter/flutter/blob/master/docs/roadmap/Roadmap.md
- Impeller: https://docs.flutter.dev/perf/impeller
- Web renderers: https://docs.flutter.dev/platform-integration/web/renderers
- Wasm: https://docs.flutter.dev/platform-integration/web/wasm
- Web FAQ: https://docs.flutter.dev/platform-integration/web/faq
- Legacy web-renderers page (CanvasKit size): https://flutter.dev/docs/development/tools/web-renderers
- Casual Games Toolkit: https://docs.flutter.dev/resources/games-toolkit
- Game templates: https://github.com/flutter/games
- Flame on pub.dev: https://pub.dev/packages/flame
- HapticFeedback: https://api.flutter.dev/flutter/services/HapticFeedback-class.html
- UIScene breaking change: https://docs.flutter.dev/release/breaking-changes/uiscenedelegate
- Issue #170461: https://github.com/flutter/flutter/issues/170461
- Issue #176260: https://github.com/flutter/flutter/issues/176260
- Isolates: https://dart.dev/language/isolates
- Concurrency: https://dart.dev/language/concurrency
- compute: https://api.flutter.dev/flutter/foundation/compute.html
- Dart Cloud Functions blog: https://firebase.blog/posts/2026/05/dart-functions-exp/
- Dart Cloud Functions docs: https://firebase.google.com/docs/functions/start-dart
- Flutter MCP server: https://docs.flutter.dev/ai/mcp-server
- Flutter AI tools: https://docs.flutter.dev/ai/tools

**Godot**
- Download archive: https://godotengine.org/download/archive/
- 4.7.2 release: https://godotengine.org/article/maintenance-release-godot-4-7-2/
- 4.8 beta 1: https://godotengine.org/article/dev-snapshot-godot-4-8-beta-1/
- Exporting for the web: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- C# docs: https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/index.html
- Using multiple threads: https://docs.godotengine.org/en/stable/tutorials/performance/using_multiple_threads.html
- Input class: https://docs.godotengine.org/en/stable/classes/class_input.html
- Licence: https://godotengine.org/license/
- Asset library example: https://godotengine.org/asset-library/asset/5050

**Unity**
- Pricing: https://unity.com/pricing
- Pricing updates (runtime fee): https://unity.com/products/pricing-updates
- Unity 6 support: https://unity.com/releases/unity-6/support
- Unite Seoul 2026 recap: https://unity.com/blog/unite-seoul-keynote-2026-recap
- Product updates forum: https://discussions.unity.com/c/unity-editor/product-update/205
- Web browser compatibility: https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-browsercompatibility.html
- Web technical overview: https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-technical-overview.html
- Mobile web optimisation: https://docs.unity.com/en-us/engine/current/manual/platform-specific/webgl/building-distribution/web-optimization-mobile
- .NET profile support: https://docs.unity.com/en-us/engine/6000.6/manual/programming-environment/overview-of-dot-net-in-unity/dotnet-profile-support
- Unity AI: https://unity.com/features/ai

**Web / Capacitor / PWA**
- Capacitor releases: https://github.com/ionic-team/capacitor/releases
- Capacitor support policy: https://capacitorjs.com/docs/main/reference/support-policy
- Haptics plugin: https://capacitorjs.com/docs/apis/haptics
- Push notifications plugin: https://capacitorjs.com/docs/apis/push-notifications
- Capacitor issue #6182: https://github.com/ionic-team/capacitor/issues/6182
- PixiJS releases: https://github.com/pixijs/pixijs/releases
- Phaser releases: https://github.com/phaserjs/phaser/releases
- Trusted Web Activities: https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities
- Bubblewrap releases: https://github.com/GoogleChromeLabs/bubblewrap/releases

**Kotlin / Compose Multiplatform**
- Compose Multiplatform releases: https://github.com/JetBrains/compose-multiplatform/releases
- iOS stable (1.8.0): https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/
- Web beta (1.9.0): https://blog.jetbrains.com/kotlin/2025/09/compose-multiplatform-1-9-0-compose-for-web-beta/
- Supported platforms: https://kotlinlang.org/docs/multiplatform/supported-platforms.html
- What's new in Compose 1.9.0: https://kotlinlang.org/docs/multiplatform/whats-new-compose-190.html
- Wasm configuration: https://kotlinlang.org/docs/wasm-configuration.html
- Wasm overview: https://kotlinlang.org/docs/wasm-overview.html
- Native memory manager: https://kotlinlang.org/docs/native-memory-manager.html
- Ktor releases: https://github.com/ktorio/ktor/releases
- Kotlin AI for development: https://kotlinlang.org/docs/ai-for-development.html

**Other engines**
- Tauri 2.0 announcement: https://v2.tauri.app/blog/tauri-20/
- Tauri releases: https://github.com/tauri-apps/tauri/releases
- Defold releases: https://github.com/defold/defold/releases

**Backends**
- Firebase pricing: https://firebase.google.com/pricing
- Cloud Functions for Firebase: https://firebase.google.com/docs/functions
- Supabase pricing: https://supabase.com/pricing
- Supabase billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Cloudflare Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Nakama repo: https://github.com/heroiclabs/nakama
- Nakama authoritative multiplayer: https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/
- Nakama notifications: https://heroiclabs.com/docs/nakama/concepts/notifications/
- Heroic Labs pricing: https://heroiclabs.com/pricing/
- Colyseus docs: https://docs.colyseus.io/
- Colyseus pricing: https://colyseus.io/pricing/
- Colyseus reconnection: https://docs.colyseus.io/room/reconnection
- Colyseus database: https://docs.colyseus.io/database
- boardgame.io repo: https://github.com/boardgameio/boardgame.io

**Popularity data**
- Stack Overflow Developer Survey 2026, languages (n=14,099): https://survey.stackoverflow.co/2026/technology/data/languages
- Stack Overflow Developer Survey 2025: https://survey.stackoverflow.co/2025/technology/
- GitHub Octoverse 2025 (2025-10-28; no 2026 edition found yet): https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/
