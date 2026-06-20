# Fonts

The Memoria wordmark uses **Orbitron** (loaded via `@expo-google-fonts/orbitron`)
as a freely-available, Mokoto-like geometric sci-fi display face. No local file
is required — it loads on native and web automatically.

## Using the real Mokoto instead

If you have a Mokoto license, drop the file here as:

```
assets/fonts/Mokoto.ttf
```

Then in `lib/fonts.ts`:

- set `MOKOTO_FAMILY = 'Mokoto'`
- add `Mokoto: require('@/assets/fonts/Mokoto.ttf')` to `getMokotoFontMap()`
- point `injectMokotoWebFont()` at the bundled asset URL

The wordmark will then render in Mokoto across the splash and auth screens.
