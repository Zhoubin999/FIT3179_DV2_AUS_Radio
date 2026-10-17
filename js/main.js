// FIT3179 DV2 - Australian Radio in the Digital Age
// Embeds every Vega-Lite chart and keeps the four "local market" charts in sync.

// Shared look for every chart (fonts, colours and text sizes)
var chartConfig = {
  "background": null,
  "font": "DM Sans, Arial, sans-serif",
  "axis": {
    "labelFontSize": 13,
    "titleFontSize": 14,
    "titleFontWeight": 600,
    "labelColor": "#3E5263",
    "titleColor": "#3E5263",
    "domainColor": "#ACB9C3",
    "tickColor": "#ACB9C3",
    "gridColor": "#E8ECEF"
  },
  "legend": {
    "labelFontSize": 13,
    "titleFontSize": 13,
    "labelColor": "#3E5263",
    "titleColor": "#3E5263",
    "labelLimit": 260
  },
  "header": {"labelFontSize": 14, "labelColor": "#1F3545"},
  "view": {"stroke": null}
};

var embedOptions = {"actions": false, "renderer": "svg", "config": chartConfig};


// ---------- Chapter 1: the big shift ----------
vegaEmbed('#c01', "js/chart01_listening_trend.vg.json", embedOptions).catch(console.error);
vegaEmbed('#c02', "js/chart02_streaming_services_heatmap.vg.json", embedOptions).catch(console.error);

// ---------- Chapter 2: who listens ----------
vegaEmbed('#c04', "js/chart04_radio_age_dumbbell.vg.json", embedOptions).catch(console.error);
vegaEmbed('#c03', "js/chart03_podcast_overlap_upset.vg.json", embedOptions).catch(console.error);
vegaEmbed('#c05', "js/chart05_metro_regional_diverging.vg.json", embedOptions).catch(console.error);

// ---------- Chapter 3: new ways to listen, and the transmitters behind radio ----------
vegaEmbed('#c06', "js/chart06_in_car_waterfall.vg.json", embedOptions).catch(console.error);
vegaEmbed('#c07', "js/chart07_spotify_account_mix.vg.json", embedOptions).catch(console.error);
vegaEmbed('#c10', "js/chart10_dab_locations_map.vg.json", embedOptions).catch(console.error);
vegaEmbed('#c11', "js/chart11_fm_retransmission_choropleth.vg.json", embedOptions).catch(console.error);


// ---------- Chapter 4: local markets (four linked charts) ----------
// Each of these specs has a parameter called "SelectedMarket".
// Changing the city here updates that parameter in all four charts at once.
var marketViews = [];
var selectedMarket = "Melbourne";
var cityButtons = document.querySelectorAll('.city-button');
var marketName = document.querySelectorAll('.market-name');

function showMarket(market) {
  selectedMarket = market;

  // update every linked chart
  marketViews.forEach(function (view) {
    view.signal('SelectedMarket', market).runAsync();
  });

  // update the city buttons and any text that names the city
  cityButtons.forEach(function (button) {
    button.classList.toggle('active', button.dataset.market === market);
  });
  marketName.forEach(function (span) {
    span.textContent = market;
  });
}

function embedMarketChart(elementId, specUrl) {
  vegaEmbed(elementId, specUrl, embedOptions).then(function (result) {
    // Access the Vega view instance (https://vega.github.io/vega/docs/api/view/) as result.view
    marketViews.push(result.view);
    result.view.signal('SelectedMarket', selectedMarket).runAsync();

    // clicking a city's mark (bar or circle) selects that city everywhere
    result.view.addEventListener('click', function (event, item) {
      if (item && item.datum && item.datum.market) {
        showMarket(item.datum.market);
      }
    });
  }).catch(console.error);
}

embedMarketChart('#c08', "js/chart08_market_station_distribution.vg.json");
embedMarketChart('#c12', "js/chart12_market_leaders_symbol_map.vg.json");
embedMarketChart('#c13', "js/chart13_market_station_shares.vg.json");
embedMarketChart('#c09', "js/chart09_station_rank_bump.vg.json");

cityButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    showMarket(button.dataset.market);
  });
});
