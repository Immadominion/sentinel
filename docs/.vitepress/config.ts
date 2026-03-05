import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(
    defineConfig({
        title: "Sentinel",
        description:
            "On-chain smart wallet infrastructure for autonomous AI agents on Solana",
        head: [
            ["link", { rel: "icon", href: "/favicon.ico" }],
            [
                "meta",
                {
                    name: "og:description",
                    content:
                        "On-chain policy enforcement for autonomous agents on Solana. Session keys, spending limits, guardian recovery.",
                },
            ],
            ["meta", { name: "og:image", content: "/banner.png" }],
            ["meta", { name: "twitter:card", content: "summary_large_image" }],
        ],

        cleanUrls: true,

        themeConfig: {
            logo: "/sentinel-logo.png",
            siteTitle: "Sentinel",

            nav: [
                { text: "Guide", link: "/guide/getting-started" },
                { text: "Concepts", link: "/concepts/architecture" },
                { text: "API", link: "/api/typescript-sdk" },
                {
                    text: "Resources",
                    items: [
                        {
                            text: "GitHub",
                            link: "https://github.com/immadominion/sentinel",
                        },
                        {
                            text: "Devnet Explorer",
                            link: "https://explorer.solana.com/address/EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb?cluster=devnet",
                        },
                        {
                            text: "npm Package",
                            link: "https://www.npmjs.com/package/@sentinel/sdk",
                        },
                    ],
                },
            ],

            sidebar: [
                {
                    text: "Getting Started",
                    items: [
                        { text: "What is Sentinel?", link: "/guide/getting-started" },
                        { text: "Installation", link: "/guide/installation" },
                        { text: "Quick Start", link: "/guide/quick-start" },
                    ],
                },
                {
                    text: "Core Concepts",
                    items: [
                        { text: "Architecture", link: "/concepts/architecture" },
                        { text: "Account Model", link: "/concepts/account-model" },
                        { text: "Security Model", link: "/concepts/security-model" },
                        { text: "Session Keys", link: "/concepts/session-keys" },
                    ],
                },
                {
                    text: "SDK Reference",
                    items: [
                        { text: "TypeScript SDK", link: "/api/typescript-sdk" },
                        { text: "Instructions", link: "/api/instructions" },
                        { text: "PDA Derivation", link: "/api/pda-derivation" },
                        { text: "Constants & Sizes", link: "/api/constants" },
                        {
                            text: "Generated API Docs",
                            link: "/api/generated/README",
                        },
                    ],
                },
                {
                    text: "Integrations",
                    items: [{ text: "MCP Integration", link: "/integrations/mcp" }],
                },
            ],

            socialLinks: [
                {
                    icon: "github",
                    link: "https://github.com/immadominion/sentinel",
                },
            ],

            search: {
                provider: "local",
            },

            editLink: {
                pattern:
                    "https://github.com/immadominion/sentinel/edit/main/docs/:path",
                text: "Edit this page on GitHub",
            },

            lastUpdated: {
                text: "Last updated",
            },

            footer: {
                message:
                    'Open-source under <a href="https://github.com/immadominion/sentinel/blob/main/LICENSE">Apache-2.0</a>',
                copyright:
                    'Built on <a href="https://solana.com">Solana</a> with <a href="https://github.com/anza-xyz/pinocchio">Pinocchio</a>',
            },
        },

        mermaid: {
            theme: "dark",
        },

        lastUpdated: true,
    })
);
