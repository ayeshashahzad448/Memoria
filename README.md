# Memoria

[![Built with Bilt](https://img.shields.io/endpoint?url=https%3A%2F%2Fapp.bilt.me%2Fapi%2Fbadge)](https://bilt.me)

> Your memories, kept luminous among the stars.

**Memoria** is a multi-media journaling app that turns the moments of your life into a living cosmos. Every memory becomes a twinkling star, drifting in a rendered 3D void. Write the story, attach photos and voice notes, tag the people who were there — and watch it ignite into the sky. Over the years your memories cluster into constellations, and your personal universe slowly fills with light.

---

## ✦ The idea

Most journals are lists. Memoria is a *sky*.

- A short note becomes a small, faint star. A long, photo-rich, voice-laden memory ignites into a bright giant. The weight of what you lived is reflected in how brightly it burns.
- Pan, pinch and orbit through your own universe. Tap any star to relive the moment.
- Group related memories into **constellations** — a trip, a friendship, a chapter of your life — and watch the lines draw between them.
- Share a sky. Create a **shared cosmos** with family or friends so memories you all hold can live in one place.

## ✦ Core features

- **Stars from memories** — title, story, date, location, up to 3 photos and 4 voice notes, plus people tagging. Star size and brightness are derived from the richness of the memory.
- **A real 3D cosmos** — a WebGL/native scene (react-three-fiber + three) with orbit-drag, pinch-zoom, gentle twinkle, drifting dust, a faint Milky Way haze, and ambient shooting stars. Toggle between an immersive **3D** view and a flat **2D** map.
- **Star ignition** — saving a memory plays a protostar → contraction → ignition flash → true-color sequence while its "stellar stats" (temperature, mass, spectral class, luminosity) count up.
- **Constellations** — forge groups manually by tapping stars in order, or accept suggested groupings (shared place, shared people, same month). Lines fade in on focus and replay a glowing draw animation when viewed.
- **Recall** — an "on this day" surface that weaves together anniversaries and random highlights from across your years.
- **Shared cosmos** — collaborative full-screen spaces you create and invite people into; memories saved there live in that shared sky.
- **Search & focus** — find a memory by title, location, people or group, then dive: the camera performs a cinematic deep-zoom onto the star and opens it in a floating detail panel.
- **Profile & storage** — an editable identity (name, bio, avatar photo or color), a friends list, and a luminous storage meter with a freemium capacity tier.

## ✦ Design

- **Dark-only, glassmorphic UI** built on HeroUI Native + Uniwind.
- **"Midnight Aurora" palette** — a Deep Cosmos `#0B0C10` void, Stellar Cyan accent, Electric Rose, Warm Amber and Deep Violet emotion colors.
- **Typography** — Orbitron for the wordmark, Space Grotesk for display, Inter for UI, and Lora for the memory story body.
- A first-run coachmark and a post-first-star tab walkthrough gently teach the cosmos.

## ✦ Tech

This project is built with:

- React Native + Expo (Expo Router for navigation)
- TypeScript
- react-three-fiber + three + expo-gl (the 3D cosmos), with react-native-skia for ignition/preview effects
- Zustand + AsyncStorage (local-first state, mock accounts)
- HeroUI Native + Uniwind (design system & theming)
- Google Places (location search), expo-image-picker, expo-audio

All generated and orchestrated by Bilt from natural-language instructions.

---

## Project info

**Preview URL**: https://app.bilt.me/project/156683ab-3e17-439f-8ed0-8c9382b5d29a/preview

**Project ID**: `156683ab-3e17-439f-8ed0-8c9382b5d29a`

## How can I edit this app?

**Use Bilt**

Visit your [Bilt Project](https://app.bilt.me/agent/156683ab-3e17-439f-8ed0-8c9382b5d29a) and describe what you want to change, add, or fix in natural language. Changes are instant — just send a message and your app updates.

**Use your preferred IDE**

Export the source from Bilt and work locally. You only need Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).

```sh
# Step 1: Export and clone your Bilt project.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm install

# Step 4: Start the Expo development server.
npx expo start
```

Scan the QR code with Expo Go on your phone to see Memoria running locally.

**Edit a file directly in GitHub**

Navigate to the file, click the pencil (Edit) icon, make your changes, and commit.

**Use GitHub Codespaces**

From the repo's "Code" button, open the "Codespaces" tab and launch a new Codespace. Edit, commit, and push from there.

## How can I test this project?

**Option 1: Instant Preview (Recommended)**

Open the preview URL in your browser: `https://app.bilt.me/project/156683ab-3e17-439f-8ed0-8c9382b5d29a/preview`

Scan the QR code with Expo Go ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) on your phone.

**Option 2: Run Locally**

```sh
npm install
npx expo start
```

Then scan the QR code with Expo Go.

> Tip: there's a built-in demo profile (Alex Rivera — 38 memories across several years and 8 constellations) so the cosmos looks full when you explore.

## How can I deploy this project?

Go to your [Bilt Project](https://app.bilt.me/agent/156683ab-3e17-439f-8ed0-8c9382b5d29a), then **Settings → App Store**.

### Deploy with Bilt

Send a message to your Bilt project: "Deploy this app to production". Bilt handles the build and provides download links or submission-ready builds.

## How can I make changes to my app?

**Via Bilt (Easiest)**

Visit your [Bilt Project](https://app.bilt.me/agent/156683ab-3e17-439f-8ed0-8c9382b5d29a) and describe what you want, for example:

- "Add a new emotion color for memories"
- "Make the constellation lines brighter"
- "Add a yearly recap screen"
- "Let me filter the cosmos by year"

**Via Code**

Export the source, make changes in your IDE, and test locally with `npx expo start`.

## Can I use this with the MCP protocol?

Yes! Bilt is available as a remote MCP server at `https://mcp.bilt.me/mcp`.

Connect any MCP-compatible AI agent (Claude Desktop, OpenClaw, etc.) to programmatically build and modify mobile apps.

**Example MCP integration:**

```json
{
  "mcpServers": {
    "bilt": {
      "transport": {
        "type": "sse",
        "url": "https://mcp.bilt.me/mcp/sse",
        "headers": {
          "Authorization": "Bearer YOUR_API_KEY"
        }
      }
    }
  }
}
```

Read more:

- [Bilt MCP Documentation](https://bilt.me/docs)
- [MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.buildingapplications%2Fmcp/versions/latest)

## Need help?

- 📚 [Bilt Documentation](https://bilt.me/docs)
- 💬 [Discord Community](https://discord.gg/3FqNgmSYdZ)
- 🐦 [Twitter Updates](https://twitter.com/biltmeanapp)
- 📧 Email: support@bilt.me

---

<div align="center">

**Memoria — built with [Bilt](https://bilt.me). No code required.** ✦

[Try Bilt](https://bilt.me) • [View Docs](https://bilt.me/docs) • [Docs MCP Server](https://bilt.me/docs/mcp)

</div>
