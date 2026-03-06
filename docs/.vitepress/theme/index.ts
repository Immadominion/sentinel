import DefaultTheme from "vitepress/theme";
import "./custom.css";
import McpInstallButtons from "../../components/McpInstallButtons.vue";

export default {
    extends: DefaultTheme,
    enhanceApp({ app }) {
        app.component("McpInstallButtons", McpInstallButtons);
    },
};
