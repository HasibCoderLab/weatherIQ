import nextPluginConfig from "eslint-config-next";

export default [
  ...nextPluginConfig,
  {
    ignores: [".next/**", "node_modules/**", "legacy/**", "out/**", "tests/**"],
  },
];
