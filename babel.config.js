module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Expo emits a classic browser bundle; Zustand's ESM middleware contains
          // import.meta, which must be lowered before that bundle can be parsed.
          web: { unstable_transformImportMeta: true },
        },
      ],
    ],
  };
};
