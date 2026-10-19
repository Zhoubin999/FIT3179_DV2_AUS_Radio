// FIT3179 DV2 - Australian Radio in the Digital Age
// Embeds every chart (Vega-Lite, plus Vega for the radar, donut map and treemap) and keeps the four "local market" charts in sync.

// Shared look for every chart (fonts, colours and text sizes)
var chartConfig = {
  "background": null,
  "padding": {"left": 12, "top": 6, "right": 12, "bottom": 6},
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


// Side-by-side (faceted or concatenated) charts cannot use "width": "container",
// so these two helpers shrink them to fit their card before drawing.

// Two panels side by side (podcast mosaic, radio waffles): heightRatio keeps their shape,
// legendWidth leaves room for a legend placed to the right of the panels.
function embedTwoPanelChart(elementId, specUrl, heightRatio, maxPanelWidth, legendWidth) {
  fetch(specUrl).then(function (response) { return response.json(); }).then(function (spec) {
    var cardWidth = document.querySelector(elementId).clientWidth;
    // not enough room for a legend on the right: move it under the panels
    if (legendWidth && (cardWidth - 60 - legendWidth) / 2 < 140) {
      var legend = (spec.spec.layer ? spec.spec.layer[0] : spec.spec).encoding.color.legend;
      legend.orient = "bottom";
      legend.direction = "horizontal";
      legendWidth = 0;
    }
    var panelWidth = Math.min(maxPanelWidth || 255, Math.floor((cardWidth - 60 - (legendWidth || 0)) / 2));
    spec.spec.width = panelWidth;
    spec.spec.height = Math.round(panelWidth * heightRatio);
    return vegaEmbed(elementId, spec, embedOptions);
  }).catch(console.error);
}

// Map + bar chart (DAB+ sites): scale every size and the map projection together.
function embedScaledMapChart(elementId, specUrl) {
  fetch(specUrl).then(function (response) { return response.json(); }).then(function (spec) {
    var map = spec.hconcat[0];
    var bars = spec.hconcat[1];
    var fullWidth = map.width + bars.width + 200;
    var factor = Math.min(1, document.querySelector(elementId).clientWidth / fullWidth);
    map.width = Math.round(map.width * factor);
    map.height = Math.round(map.height * factor);
    map.projection.scale = map.projection.scale * factor;
    map.projection.translate = [map.projection.translate[0] * factor, map.projection.translate[1] * factor];
    bars.width = Math.round(bars.width * factor);
    return vegaEmbed(elementId, spec, embedOptions);
  }).catch(console.error);
}

// Radio-at-home waffles: square grids with their numbers beside them. Each grid starts where a
// podcast-mosaic panel starts (same card width and gap), so the two charts line up vertically.
// On narrow cards the four grids stack in one column instead.
function embedWaffleChart(elementId, specUrl) {
  fetch(specUrl).then(function (response) { return response.json(); }).then(function (spec) {
    var cardWidth = document.querySelector(elementId).clientWidth;
    var mosaicPanel = Math.min(255, Math.floor((cardWidth - 60) / 2));   // same formula as the mosaic
    var grid;
    if (mosaicPanel >= 200) {
      grid = mosaicPanel - 85;                         // room for the label beside each grid
      spec.spacing.column = mosaicPanel + 22 - grid;   // 22 = the mosaic's facet spacing
    } else {
      spec.transform.push({
        "calculate": "datum.area + ': ' + (datum.measure == 'Any radio at home' ? 'any radio' : 'DAB+ radio')",
        "as": "panel"
      });
      spec.facet = {"row": {
        "field": "panel", "type": "nominal", "title": null,
        "sort": ["Capital cities: any radio", "Regional areas: any radio", "Capital cities: DAB+ radio", "Regional areas: DAB+ radio"],
        "header": {"labelAngle": 0, "labelOrient": "top", "labelAnchor": "start", "labelAlign": "left",
                   "labelFontWeight": "bold", "labelFontSize": 13, "labelPadding": 6}
      }};
      grid = Math.min(150, cardWidth - 150);
    }
    spec.spec.width = grid;
    spec.spec.height = grid;
    return vegaEmbed(elementId, spec, embedOptions);
  }).catch(console.error);
}

// Chart 9: the finding for each measure (figures from the merged CSV; shares are of the Australian total)
var MEASURE_NOTES = {
  "per100k": "<b>Sites per 100,000 people:</b> the Northern Territory has 32.7 radio transmitter sites for every 100,000 people, " +
    "compared with 2.6 in Victoria. Victoria has 26% of Australia's people but under 12% of its radio sites, while Western " +
    "Australia has 11% of the people and 20% of the sites.",
  "retrans": "<b>FM relays:</b> in Western Australia, 65% of FM transmitters are relays that repeat a station from elsewhere " +
    "for distant towns. WA has 26% of Australia's FM transmitters but 54% of its relays, while Victoria has 10% of the " +
    "transmitters and about 1% of the relays. The ACT has none.",
  "dab": "<b>DAB+ share:</b> the ACT has the highest share of radio sites that broadcast DAB+ (14%). Victoria has 11.5% of " +
    "Australia's radio sites but 21% of its DAB+ sites, while Queensland has 25.5% of the sites but under 14% of the DAB+ sites."
};

function showMeasureNote(measure) {
  document.querySelector('#c09-note').innerHTML = MEASURE_NOTES[measure];
}

// Map + paired bars (state infrastructure): share the card width between the two views.
// On narrow screens the bars move under the map (hconcat -> vconcat).
function embedMapWithBars(elementId, specUrl) {
  fetch(specUrl).then(function (response) { return response.json(); }).then(function (spec) {
    var cardWidth = document.querySelector(elementId).clientWidth;
    var map = spec.hconcat[0];
    var side = spec.hconcat[1];
    var legend = map.layer[0].encoding.color.legend;
    var rightColumn = 380, gap = 24;                    // same columns as Chart 8 (see .zoom-body in style.css)
    if (!window.matchMedia('(max-width: 900px)').matches) {
      // side by side: map column | gap | right column, exactly as in Chart 8 above
      map.width = cardWidth - rightColumn - gap;
      map.height = Math.min(640, Math.round(map.width * 0.78));   // same height rule as Chart 8's map
      side.width = rightColumn - 95;                    // leaves room for state codes and value labels
      side.height = map.height - 40;
      // the colour legend sits inside the map, in the empty sea south of Western Australia
      legend.orient = "none";
      legend.legendX = 0;
      legend.legendY = map.height - 20;
    } else {
      // stacked: map, then the paired bars, then the legend at the bottom
      spec.vconcat = spec.hconcat;
      delete spec.hconcat;
      map.width = cardWidth - 4;                        // full width (less the outline), like Chart 8 when stacked
      // state codes on the right of the bars: labels on the left would push the map right
      side.encoding.y.axis.orient = "right";
      side.width = cardWidth - 165;
      side.height = 360;
      map.height = Math.max(340, Math.min(640, Math.round(map.width * 0.78)));   // Chart 8's height rule
      legend.orient = "bottom";
      // phones: shorter legend and a two-line "Showing" title so nothing is wider than the card
      legend.title = "Darker = higher value";
      legend.gradientLength = Math.min(240, cardWidth - 100);
      map.title.text = {"expr": "Measure_selection == 'per100k' ? ['Showing: radio sites', 'per 100,000 people'] : " +
        "Measure_selection == 'retrans' ? ['Showing: FM relays', '(% of FM transmitters)'] : ['Showing: DAB+ sites', '(% of radio sites)']"};
      map.title.subtitle = ["Hover a state or its bars", "to highlight it in both views"];
      side.title.subtitle = {"expr":
        "['Grey: ' + (Measure_selection == 'per100k' ? 'share of people' : Measure_selection == 'retrans' ? 'share of all FM transmitters' : 'share of all radio sites'), " +
        "'Navy: ' + (Measure_selection == 'per100k' ? 'share of radio sites' : Measure_selection == 'retrans' ? 'share of FM relays' : 'share of DAB+ sites')]"};
    }
    return vegaEmbed(elementId, spec, embedOptions);
  }).then(function (result) {
    // keep the text finding in step with the drop-down
    showMeasureNote(result.view.signal('Measure_selection'));
    result.view.addSignalListener('Measure_selection', function (name, value) { showMeasureNote(value); });
  }).catch(console.error);
}


// Play button: steps one signal through a list of values (e.g. years or surveys) so the chart
// animates frame by frame. The button sits next to the chart's own drop-down or slider.
function addPlayButton(elementId, view, options) {
  var button = document.createElement('button');
  button.type = "button";
  button.className = "play-button";
  button.textContent = options.label;
  var controls = document.querySelector(elementId + ' .vega-bindings') || document.querySelector(elementId);
  controls.appendChild(button);

  var timer = null;
  button.addEventListener('click', function () {
    if (timer) return;                       // already playing
    // runs only when clicked and moves in discrete steps (no sliding motion),
    // so it also plays when the system asks for reduced motion
    var steps = options.steps;
    var index = 0;
    button.disabled = true;
    button.textContent = "Playing\u2026";
    if (options.flag) view.signal(options.flag, true);

    function showStep() {
      view.signal(options.signal, steps[index]).runAsync();
      index += 1;
      if (index < steps.length) {
        timer = setTimeout(showStep, options.delay);
      } else {
        timer = setTimeout(function () {    // hold the last frame briefly, then reset the button
          if (options.flag) view.signal(options.flag, false).runAsync();
          button.disabled = false;
          button.textContent = options.label;
          timer = null;
        }, options.delay);
      }
    }
    showStep();
  });
}


// ---------- Chapter 1: the big shift ----------
vegaEmbed('#c01', "js/chart01_listening_trend.vg.json", embedOptions).then(function (result) {
  // replay the trend year by year (Year_shown filters the data; Replaying shows the big year)
  addPlayButton('#c01', result.view, {
    label: "\u25B6 Play 2017 \u2192 2026", signal: "Year_shown", flag: "Replaying", delay: 650,
    steps: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
  });
}).catch(console.error);
vegaEmbed('#c02', "js/chart02_streaming_services_heatmap.vg.json", embedOptions).catch(console.error);

// ---------- Chapter 2: who listens ----------
vegaEmbed('#c03', "js/chart03_radio_age_dumbbell.vg.json", embedOptions).catch(console.error);
embedTwoPanelChart('#c04', "js/chart04_podcast_mosaic.vg.json", 1.2);
vegaEmbed('#c05', "js/chart05_city_regional_diverging_bar.vg.json", embedOptions).catch(console.error);

// ---------- Chapter 3: how Australians reach radio, and where digital radio can operate ----------
vegaEmbed('#c06', "js/chart06_listening_places_radar.vg.json", embedOptions).catch(console.error);
embedWaffleChart('#c07', "js/chart07_radio_at_home_waffle.vg.json");
// Chart 8 is a zoomable map (see the section below). Set useZoomMap to false to go back
// to the earlier static symbol map.
var useZoomMap = true;
if (!useZoomMap) {
  document.querySelector('.zoom-bar').hidden = true;
  document.querySelector('#c08-panel').hidden = true;
  embedScaledMapChart('#c08', "js/chart08_dab_sites_symbol_map.vg.json");
}
embedMapWithBars('#c09', "js/chart09_state_infrastructure_choropleth.vg.json");


// ---------- Chart 8: DAB+ map that zooms from Australia into one state ----------
// The Vega spec draws the map. This code moves its view signals (centre, size, zoom_t)
// smoothly between Australia and a state, and fills the breadcrumb and side panel.
var STATE_NAMES = {
  "NSW": "New South Wales", "VIC": "Victoria", "QLD": "Queensland", "SA": "South Australia",
  "WA": "Western Australia", "TAS": "Tasmania", "ACT": "Australian Capital Territory", "NT": "Northern Territory"
};
var AUSTRALIA_BOX = [112.9211, -43.6585, 159.2843, -9.2239];   // west, south, east, north: the full extent of the
                                                                  // state boundaries, so this map matches Chart 9's
var zoomView = null;
var zoomSites = [];
var zoomState = "";
var zoomSite = "";
var zoomFrame = null;
var zoomSafety = null;
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mercatorY(lat) {
  return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
}

// a box in degrees -> the four view signals used by the spec
function boxToView(box) {
  return {
    lon: (box[0] + box[2]) / 2,
    y: (mercatorY(box[1]) + mercatorY(box[3])) / 2,
    dx: (box[2] - box[0]) * Math.PI / 180,
    dy: mercatorY(box[3]) - mercatorY(box[1])
  };
}

// the area around every site in a state, with room for labels
function stateBox(state) {
  var sites = sitesIn(state);
  var lons = sites.map(function (s) { return s.longitude; });
  var lats = sites.map(function (s) { return s.latitude; });
  var west = Math.min.apply(null, lons), east = Math.max.apply(null, lons);
  var south = Math.min.apply(null, lats), north = Math.max.apply(null, lats);
  var halfLon = Math.max(east - west, 0.4) * 0.85;
  var halfLat = Math.max(north - south, 0.3) * 0.75;
  var midLon = (west + east) / 2;
  var midLat = (south + north) / 2;
  return [midLon - halfLon, midLat - halfLat, midLon + halfLon, midLat + halfLat];
}

// animate the view signals to a new box (about 0.75 s, eased; instant if reduced motion is on)
function flyTo(box, zoomT) {
  var target = boxToView(box);
  var start = {
    lon: zoomView.signal('view_lon'), y: zoomView.signal('view_y'),
    dx: zoomView.signal('view_dx'), dy: zoomView.signal('view_dy'), t: zoomView.signal('zoom_t')
  };
  var duration = reduceMotion ? 0 : 750;
  var startTime = performance.now();
  cancelAnimationFrame(zoomFrame);
  clearTimeout(zoomSafety);

  function step() {
    var p = duration ? Math.min(1, (performance.now() - startTime) / duration) : 1;
    var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    zoomView
      .signal('view_lon', start.lon + (target.lon - start.lon) * e)
      .signal('view_y', start.y + (target.y - start.y) * e)
      .signal('view_dx', start.dx * Math.pow(target.dx / start.dx, e))
      .signal('view_dy', start.dy * Math.pow(target.dy / start.dy, e))
      .signal('zoom_t', start.t + (zoomT - start.t) * e)
      .runAsync();
    if (p < 1) {
      zoomFrame = requestAnimationFrame(step);
    }
  }
  zoomFrame = requestAnimationFrame(step);
  // if the browser skips frames (e.g. a background tab), still finish on the right view
  zoomSafety = setTimeout(function () {
    cancelAnimationFrame(zoomFrame);
    startTime = -Infinity;
    step();
  }, duration + 100);
}

function showAustralia() {
  zoomState = "";
  zoomSite = "";
  zoomView.signal('selected_state', "").signal('selected_site', "").signal('highlight_site', "");
  flyTo(AUSTRALIA_BOX, 0);
  updateZoomPanel();
}

function showState(state) {
  if (!STATE_NAMES[state]) {
    return;
  }
  zoomSite = "";
  zoomView.signal('selected_site', "");
  if (state !== zoomState) {
    zoomState = state;
    zoomView.signal('selected_state', state);
    if (sitesIn(state).length > 0) {
      flyTo(stateBox(state), 1);
    }
  }
  zoomView.runAsync();
  updateZoomPanel();
}

function showSite(siteName) {
  var site = siteByName(siteName);
  if (!site) {
    return;
  }
  if (site.site_state !== zoomState) {
    showState(site.site_state);
  }
  zoomSite = siteName;
  zoomView.signal('selected_site', siteName).runAsync();
  updateZoomPanel();
}

function sitesIn(state) {
  return zoomSites.filter(function (s) { return s.site_state === state; });
}

function siteByName(siteName) {
  return zoomSites.filter(function (s) { return s.site_name === siteName; })[0];
}

// small helper to build panel elements without innerHTML
function makeElement(tag, className, text) {
  var element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeListButton(className, onSelect) {
  var button = makeElement('button', 'zoom-item' + (className ? ' ' + className : ''));
  button.type = "button";
  button.addEventListener('click', onSelect);
  return button;
}

function updateBreadcrumb() {
  var crumbs = document.querySelector('#c08-breadcrumb');
  crumbs.textContent = "";
  document.querySelector('#c08-back').disabled = (zoomState === "");
  if (zoomState === "") {
    crumbs.appendChild(makeElement('span', 'current', "Australia"));
    return;
  }
  var home = makeElement('button', '', "Australia");
  home.type = "button";
  home.addEventListener('click', showAustralia);
  crumbs.appendChild(home);
  crumbs.appendChild(document.createTextNode(" › "));
  if (!zoomSite) {
    crumbs.appendChild(makeElement('span', 'current', STATE_NAMES[zoomState]));
    return;
  }
  var stateLink = makeElement('button', '', STATE_NAMES[zoomState]);
  stateLink.type = "button";
  stateLink.addEventListener('click', function () { showState(zoomState); });
  crumbs.appendChild(stateLink);
  crumbs.appendChild(document.createTextNode(" › "));
  crumbs.appendChild(makeElement('span', 'current', siteByName(zoomSite).site_place));
}

function updateZoomPanel() {
  var panel = document.querySelector('#c08-panel');
  panel.textContent = "";
  updateBreadcrumb();

  // Australia view: one button per state, most sites first
  if (zoomState === "") {
    panel.appendChild(makeElement('h4', '', "Australia: " + zoomSites.length + " DAB+ transmitter sites"));
    panel.appendChild(makeElement('p', '', "Select a state on the map or in this list to zoom in to its sites."));
    var stateList = makeElement('ul', 'zoom-list');
    Object.keys(STATE_NAMES).map(function (state) {
      return {state: state, sites: sitesIn(state).length};
    }).sort(function (a, b) { return b.sites - a.sites; }).forEach(function (row) {
      var button = makeListButton('', function () { showState(row.state); });
      var name = makeElement('span', '', STATE_NAMES[row.state]);
      name.style.flex = "1";
      var bar = makeElement('span', 'bar');
      bar.style.width = (row.sites / 7 * 100) + "%";
      name.appendChild(bar);
      button.appendChild(name);
      button.appendChild(makeElement('span', 'count', row.sites + (row.sites === 1 ? " site" : " sites")));
      var item = makeElement('li');
      item.appendChild(button);
      stateList.appendChild(item);
    });
    panel.appendChild(stateList);
    return;
  }

  var sites = sitesIn(zoomState);
  var stateName = STATE_NAMES[zoomState];

  // empty state: nothing for this state in the analysed records
  if (sites.length === 0) {
    panel.appendChild(makeElement('h4', '', stateName));
    panel.appendChild(makeElement('p', 'zoom-empty', "No DAB+ transmitter sites are listed for " + stateName +
      " in the July 2026 ACMA records analysed here."));
    return;
  }

  var mainSites = sites.filter(function (s) { return s.site_type === "Main high-power site"; }).length;
  panel.appendChild(makeElement('h4', '', stateName + ": " + sites.length + (sites.length === 1 ? " site" : " sites")));
  panel.appendChild(makeElement('p', '', mainSites + " high-power main, " + (sites.length - mainSites) +
    " low-power infill. Select a site to see its details."));

  if (zoomSite) {
    var site = siteByName(zoomSite);
    var detail = makeElement('div', 'site-detail');
    detail.appendChild(makeElement('strong', '', site.site_place));
    var facts = makeElement('dl');
    [["ACMA site", site.site_name], ["Licensed area", site.geography], ["Power", site.power_kw + " kW"],
     ["Frequency blocks", site.frequency_blocks], ["Site type", site.site_type]].forEach(function (pair) {
      facts.appendChild(makeElement('dt', '', pair[0]));
      facts.appendChild(makeElement('dd', '', pair[1]));
    });
    detail.appendChild(facts);
    panel.appendChild(detail);
  }

  // sites grouped by their DAB+ service region
  var regions = [];
  sites.forEach(function (s) {
    if (regions.indexOf(s.region) < 0) regions.push(s.region);
  });
  regions.forEach(function (region) {
    var regionSites = sites.filter(function (s) { return s.region === region; });
    panel.appendChild(makeElement('h5', '', region + " (" + regionSites.length + ")"));
    var siteList = makeElement('ul', 'zoom-list');
    regionSites.forEach(function (s) {
      var button = makeListButton(s.site_name === zoomSite ? 'selected' : '', function () { showSite(s.site_name); });
      var name = makeElement('span');
      var dot = makeElement('span', 'dot');
      dot.style.background = s.site_type === "Main high-power site" ? "#2F5D8A" : "#8FB3D6";
      name.appendChild(dot);
      name.appendChild(document.createTextNode(s.site_place));
      button.appendChild(name);
      button.appendChild(makeElement('span', 'count', s.power_kw + " kW"));
      // hovering or tabbing to a site outlines it on the map
      ['mouseenter', 'focus'].forEach(function (type) {
        button.addEventListener(type, function () { zoomView.signal('highlight_site', s.site_name).runAsync(); });
      });
      ['mouseleave', 'blur'].forEach(function (type) {
        button.addEventListener(type, function () { zoomView.signal('highlight_site', "").runAsync(); });
      });
      var item = makeElement('li');
      item.appendChild(button);
      siteList.appendChild(item);
    });
    panel.appendChild(siteList);
  });
  panel.appendChild(makeElement('p', '', "Elsewhere in " + stateName +
    ": no DAB+ transmitter sites in the July 2026 ACMA records analysed."));
}

if (useZoomMap) {
  vegaEmbed('#c08', "js/chart08_dab_sites_zoom_map.vg.json", embedOptions).then(function (result) {
    zoomView = result.view;
    zoomSites = zoomView.data('sites').slice();
    updateZoomPanel();

    // clicking a state, a ring or a site zooms in
    zoomView.addEventListener('click', function (event, item) {
      if (!item || !item.datum) return;
      var name = item.mark.name;
      if (name === 'site_dots') showSite(item.datum.site_name);
      else if (name === 'rings' || name === 'ring_labels') showState(item.datum.site_state);
      else if (name === 'state_shapes') showState(item.datum.state);
    });
  }).catch(console.error);

  document.querySelector('#c08-back').addEventListener('click', showAustralia);
  // Escape anywhere in the map card goes back to Australia
  document.querySelector('.zoom-map').addEventListener('keydown', function (event) {
    if (event.key === "Escape" && zoomState) showAustralia();
  });
}


// ---------- Chapter 4: local markets (four linked charts) ----------
// Each of these specs has a parameter (Vega-Lite) or signal (Vega) called "SelectedMarket".
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
  return vegaEmbed(elementId, specUrl, embedOptions).then(function (result) {
    // Access the Vega view instance (https://vega.github.io/vega/docs/api/view/) as result.view
    marketViews.push(result.view);
    result.view.signal('SelectedMarket', selectedMarket).runAsync();

    // clicking a city's mark (bar or circle) selects that city everywhere
    result.view.addEventListener('click', function (event, item) {
      if (item && item.datum && item.datum.market) {
        showMarket(item.datum.market);
      }
    });
    return result.view;
  }).catch(console.error);
}

embedMarketChart('#c10', "js/chart10_program_mix_alluvial.vg.json");
embedMarketChart('#c11', "js/chart11_program_mix_donut_map.vg.json").then(function (view) {
  // step the survey slider from Survey 3 to Survey 6
  // the badge says which survey the donuts show, so it is clear Charts 12-13 stay on their own surveys
  view.addSignalListener('Survey_pick', function (name, value) {
    document.querySelectorAll('.survey-name').forEach(function (span) { span.textContent = value; });
  });
  addPlayButton('#c11', view, {
    label: "\u25B6 Play Surveys 3 \u2192 6", signal: "Survey_pick", delay: 1100,
    steps: [3, 4, 5, 6]
  });
});
embedMarketChart('#c12', "js/chart12_station_treemap.vg.json");
embedMarketChart('#c13', "js/chart13_station_rank_bump.vg.json");

cityButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    showMarket(button.dataset.market);
  });
});
