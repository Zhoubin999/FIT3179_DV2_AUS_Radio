# Australian Radio in the Digital Age

FIT3179 Data Visualisation 2 · Zhoubin Li

**Live page:** https://zhoubin999.github.io/FIT3179_DV2_AUS_Radio/

A single-page visual story about how Australians listen to radio now that streaming, podcasts and digital (DAB+)
radio have grown. Streaming overtook radio as the most common weekly audio habit in 2025, but radio has not
disappeared: the page shows who still listens, where and on what devices, where digital radio can be received, and
what city audiences choose to hear. It is written for a general Australian reader, with a jargon buster for the few
technical terms.

The story runs in five chapters:

1. **The big shift:** streaming, podcasts and radio over ten years, and the leading streaming services.
2. **Who listens:** differences by age, between cities and regions, and in how people consume podcasts.
3. **Technology:** where people listen, radios at home, and where radio and DAB+ transmitters are.
4. **Local stations:** the overall listening mix across the five largest cities, then each city's mix and leading stations through a city picker.
5. **Takeaways:** what this means for Australian radio.

## Data

All charts read one merged file, `data/australian_radio_data.csv`, built by `data/build_merged_data.py` from the
original downloads in `data/raw/`:

- Edison Research, *The Infinite Dial Australia 2026* (national and regional), Commercial Radio & Audio
- ACMA, *How we watch and listen to content* (2026)
- ACMA, *List of transmitters with a licence to broadcast* and radio site records
- ABS, *National, state and territory population, March 2026*
- GfK metro radio ratings, Surveys 3–6 2026 (Commercial Radio & Audio)

Full references are listed at the bottom of the page.

## Files

- `index.html`, `css/style.css`: the page and its styles.
- `js/main.js`: embeds the charts and links the interactive ones.
- `js/chartNN_*.vg.json`: one Vega or Vega-Lite specification per chart.
- `data/`: the merged CSV, the build script and the original downloads.

## Use of AI

AI tools Claude and chatGPT were used to help debug and implement some interactivities. Both ChatGPT and Claude cross-check figures against the original sources, and to edit the text for grammar and clarity.
