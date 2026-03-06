import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// Shared sidebar — reused across all locales
const sharedSidebar = [
    {
        text: "Getting Started",
        items: [
            { text: "What is Seal?", link: "/guide/getting-started" },
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
            { text: "Generated API Docs", link: "/api/generated/README" },
        ],
    },
    {
        text: "Integrations",
        items: [
            { text: "MCP Integration", link: "/integrations/mcp" },
            { text: "Connect to Cursor", link: "/integrations/cursor" },
            { text: "Connect to VS Code", link: "/integrations/vscode" },
        ],
    },
];

export default withMermaid(
    defineConfig({
        title: "Seal",
        description:
            "On-chain smart wallet infrastructure for autonomous AI agents on Solana",

        locales: {
            root: {
                lang: "en-US",
                label: "English",
            },
            es: {
                lang: "es",
                label: "Español",
                link: "/es/",
                title: "Seal",
                description: "Infraestructura de billetera inteligente en cadena para agentes AI autónomos en Solana",
                themeConfig: {
                    nav: [
                        { text: "Guía", link: "/es/guide/getting-started" },
                        { text: "Conceptos", link: "/es/concepts/architecture" },
                        { text: "API", link: "/api/typescript-sdk" },
                    ],
                },
            },
            "zh-CN": {
                lang: "zh-CN",
                label: "中文",
                link: "/zh-CN/",
                title: "Seal",
                description: "为 Solana 上自主 AI 代理打造的链上智能钱包基础设施",
                themeConfig: {
                    nav: [
                        { text: "指南", link: "/zh-CN/guide/getting-started" },
                        { text: "概念", link: "/zh-CN/concepts/architecture" },
                        { text: "API", link: "/api/typescript-sdk" },
                    ],
                },
            },
            "pt-BR": {
                lang: "pt-BR",
                label: "Português",
                link: "/pt-BR/",
                title: "Seal",
                description: "Infraestrutura de carteira inteligente on-chain para agentes AI autônomos na Solana",
                themeConfig: {
                    nav: [
                        { text: "Guia", link: "/pt-BR/guide/getting-started" },
                        { text: "Conceitos", link: "/pt-BR/concepts/architecture" },
                        { text: "API", link: "/api/typescript-sdk" },
                    ],
                },
            },
            ja: {
                lang: "ja",
                label: "日本語",
                link: "/ja/",
                title: "Seal",
                description: "Solana上の自律型AIエージェントのためのオンチェーンスマートウォレットインフラ",
                themeConfig: {
                    nav: [
                        { text: "ガイド", link: "/ja/guide/getting-started" },
                        { text: "コンセプト", link: "/ja/concepts/architecture" },
                        { text: "API", link: "/api/typescript-sdk" },
                    ],
                },
            },
            ru: {
                lang: "ru",
                label: "Русский",
                link: "/ru/",
                title: "Seal",
                description: "Онлайн-инфраструктура умного кошелька для автономных AI-агентов на Solana",
            },
            ko: {
                lang: "ko",
                label: "한국어",
                link: "/ko/",
                title: "Seal",
                description: "Solana의 자율 AI 에이전트를 위한 온체인 스마트 지갑 인프라",
            },
            fr: {
                lang: "fr",
                label: "Français",
                link: "/fr/",
                title: "Seal",
                description: "Infrastructure de portefeuille intelligent on-chain pour les agents IA autonomes sur Solana",
            },
            de: {
                lang: "de",
                label: "Deutsch",
                link: "/de/",
                title: "Seal",
                description: "On-Chain Smart-Wallet-Infrastruktur für autonome KI-Agenten auf Solana",
            },
        },

        head: [
            ["link", { rel: "icon", href: "/favicon.ico" }],
            ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
            ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
            ["link", { href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap", rel: "stylesheet" }],
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
        ignoreDeadLinks: true,

        themeConfig: {
            logo: "/seal-logo.png",
            siteTitle: "Seal",

            nav: [
                { text: "Guide", link: "/guide/getting-started" },
                { text: "Concepts", link: "/concepts/architecture" },
                { text: "API", link: "/api/typescript-sdk" },
                {
                    text: "Resources",
                    items: [
                        {
                            text: "GitHub",
                            link: "https://github.com/immadominion/seal",
                        },
                        {
                            text: "Devnet Explorer",
                            link: "https://explorer.solana.com/address/EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb?cluster=devnet",
                        },
                        {
                            text: "npm Package",
                            link: "https://www.npmjs.com/package/seal-wallet-sdk",
                        },
                    ],
                },
            ],

            sidebar: sharedSidebar,

            socialLinks: [
                {
                    icon: "github",
                    link: "https://github.com/immadominion/seal",
                },
            ],

            search: {
                provider: "local",
            },

            editLink: {
                pattern:
                    "https://github.com/immadominion/seal/edit/main/docs/:path",
                text: "Edit this page on GitHub",
            },

            lastUpdated: {
                text: "Last updated",
            },

            footer: {
                message:
                    'Open-source under <a href="https://github.com/immadominion/seal/blob/main/LICENSE">Apache-2.0</a>',
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
