module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // 本番では console.* を抑止（warn/error は許可）
      process.env.NODE_ENV === "production"
        ? ["transform-remove-console", { exclude: ["error", "warn"] }]
        : null,
      [
        "module-resolver",
        {
          root: ["./"],
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
          alias: {
            "@app": "./src/app",
            "@core": "./src/core",
            "@features": "./src/features",
            "@shared": "./src/shared",
            "@project-types": "./src/types",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ].filter(Boolean),
  };
};
