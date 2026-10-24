# Australian Radio in the Digital Age

FIT3179 Data Visualisation 2 · Zhoubin Li · Updated 24 October 2026

**Live page:** https://zhoubin999.github.io/FIT3179_DV2_AUS_Radio/

---

## Domain

Australian radio and how listening is changing as streaming, podcasts and digital (DAB+) radio grow.

## Why

Streaming overtook radio as Australians' most common weekly audio habit in 2025. That headline can suggest radio is
disappearing. The page shows a more precise picture:

- who still listens;
- where and on what devices people listen;
- where digital radio can be received;
- what city audiences choose to hear.

It helps readers see that the change is uneven by age, place and city, not a simple swap from radio to streaming.

## Who

The average Australian, with no background in media or statistics. A jargon buster at the top of the page explains
the terms used: weekly reach, share, points, survey ages, ratings survey, program type, DAB+, transmitter site, kW,
frequency block and relay transmitter.
Charts are introduced with plain-language headings that state the finding.

## What: the data

Every chart reads one merged file, `data/australian_radio_data.csv`, built by `data/build_merged_data.py` from the
original downloads in `data/raw/`. A `dataset` column marks the four kinds of rows:

| Dataset | Source | Used in |
|---|---|---|
| Audience survey | Edison Research, *The Infinite Dial Australia 2026* (national and regional), Commercial Radio & Audio; ACMA, *How we watch and listen to content* (2026, survey of June 2025) | Charts 1–7 |
| DAB+ transmitter | ACMA, *List of transmitters with a licence to broadcast* (extracted 13 July 2026), grouped into transmitter sites | Chart 8 |
| State infrastructure | ACMA radio sites and FM relays by state, joined with ABS *National, state and territory population, March 2026* | Chart 9 |
| Station ratings | GfK metro radio ratings, Surveys 3–6 2026 (Commercial Radio & Audio); program types from `data/raw/station_program_types.csv` | Charts 10–13 |

Notes on how the data were prepared:

- **Separate charts for each survey:** ACMA surveys adults 18+, while Infinite Dial and GfK survey people 10+. Their
  numbers are shown in separate charts and never mixed.
- **Survey 6 transcription:** Survey 6 station shares were copied from the official CRA report. Each "last survey"
  figure in that report was checked against Survey 5, and a sample of Survey 6 figures against Mediaweek's published
  results.
- **Explicit program types:** each station's program type (commercial music, ABC music, commercial talk & news,
  ABC talk & news, sport) comes from an explicit table that records the basis for each one. Listening to stations GfK
  does not rate separately is shown as "Other / unrated stations".

## How: idioms and why they were chosen

The page has five chapters: the big shift, who listens, technology, local stations and takeaways.

| # | Chart | Idiom | Why this idiom / reader task |
|---|---|---|---|
| 1 | Streaming overtook radio | Multi-line chart with replay | Compare five trends over ten years and see when streaming crossed radio. *Play* replays 2017–2026 so the 2025 crossover appears in sequence. The drop-down switches to regional Australia. |
| 2 | Streaming services | Heatmap | Compare five services across three years at once; each cell also shows its change from the year before. |
| 3 | Radio reach by age | Dumbbell chart | Show the gap between Australia overall and regional Australia for each age group; the gap is the message. |
| 4 | Podcasts: listen and watch | Mosaic (Marimekko) | Show four groups that overlap (both, listened only, watched only, neither); the box area equals the share of people. |
| 5 | City vs regional habits | Diverging bar chart | Show which ways of listening lean regional (right) or city (left), with both raw percentages beside each bar. |
| 6 | Where people listen | Radar chart | Compare the profile of listening places for two audiences on a shared scale. |
| 7 | Radio at home | Waffle charts (small multiples) | Make "out of 100 adults" concrete. Radio ownership and DAB+ ownership are separate ACMA questions, so they are separate grids. |
| 8 | DAB+ transmitter sites | Zoomable proportional-symbol map (Vega) | The national view counts sites per state. Clicking a state animates a zoom to every site, sized by licensed power, with a breadcrumb, Back button and side panel. This solves overlapping symbols, such as two towers 0.3 km apart that are fanned out. |
| 9 | Radio infrastructure by state | Choropleth map + linked paired bars | The map shows one of three ratios (drop-down). The paired bars show the two counts behind it as shares of Australia on one linear axis; hover links both views. |
| 10 | City listening mix over time | Alluvial (ribbon) diagram | Follow each program type's share through four surveys; an annotation names the selected city's biggest change. |
| 11 | Listening mix by city | Donut-glyph map | Compare the five capitals' program mix where they are. A survey slider (with *Play*) steps through Surveys 3–6. |
| 12 | Stations in a city | Treemap (Vega) | Part-to-whole within the city: each rated station is sized by share and grouped by program type. Follows the city picker and the Chart 11 survey slider (Surveys 3–6). |
| 13 | Top-five stations | Bump chart | Rank changes across four surveys; a note appears when a city's top five has no talk station. |

Maps: three idioms (proportional symbol, choropleth, donut glyph).

### Interaction and special features

- **Linked charts:** one city picker drives Charts 10–13, and clicking a donut selects that city.
- **Custom-built drill-down map (Chart 8):** an animated zoom from Australia to a state, a breadcrumb, Back
  (also Esc), a keyboard-accessible side panel, and an empty state.
- **Linked map and bars (Chart 9):** hovering one highlights the state in the other.
- **Play buttons:** a year-by-year replay (Chart 1) and a survey slider (Chart 11), using a shared JavaScript helper
  that steps a Vega signal.
- **Responsive layout:** tested at 375 px to 1920 px with no horizontal scrolling.
- **Colour:** one meaning per colour across the page, for example orange for streaming, violet for podcasts, teal for
  regional and dark grey for Australia overall. Key words in the text are coloured to match their marks.

## Files

- `index.html`, `css/style.css`: the page and its styles (both commented with their structure).
- `js/main.js`: embeds every chart, sizes the side-by-side charts, and links the interactive charts.
- `js/chartNN_*.vg.json`: one Vega or Vega-Lite specification per chart. Each component has a short `description`
  note.
- `data/`: the merged CSV, the build script and the original downloads.

## Use of AI

AI tools (Claude, by Anthropic) were used to help write and debug the Vega and Vega-Lite specifications, JavaScript and
CSS, to cross-check figures against the original sources, and to edit the text for grammar and clarity.
