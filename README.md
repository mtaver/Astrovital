# Astrovital

Miva Ad Astra’s NASA Space Apps prototype for astronaut health check-ins, archived ISS radiation replay, and offline medical briefings.

## Run and publish

Serve this directory over HTTP, for example with `python -m http.server 8000`. The app uses plain HTML and JavaScript. For GitHub Pages, choose **Settings → Pages → Deploy from a branch → main → /(root) → Save**. A successful first visit over HTTPS can cache the app for offline use.

## Demo

1. Open **NASA mission replay**, inspect a real reading, and attach it to the briefing.
2. Open **Crew check-in**, load the fatigue scenario, and select **Assess and log**.
3. Open **Crew briefing**, generate and download the briefing.
4. Load the emergency scenario to see symptom priority.

Use training values. The app stores entries in the current browser, and it does not transmit them or connect to medical services. Mission medical teams would need to validate the workflow before operational use.

## Data

`radlab.csv` is an unmodified NASA Open Science Data Repository RadLab export for the ISS DosTel1 dosimeter, 2022-04-01 23:00 through 2022-04-02 01:05 UTC (end exclusive). The plotted field is absorbed radiation dose rate in μGy/h. The archive is environmental context for a different mission than the training scenario.

- [Download the exact API query](https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=DosTel1&timestamp%3E=2022-04-01T23%3A00&timestamp%3C=2022-04-02T01%3A05&absorbed_dose_rate&format=csv)
- [NASA RadLab API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/)
- [NASA HRP hazards](https://www.nasa.gov/hrp/hazards/)
- [NASA HRP risks](https://www.nasa.gov/hrp/risks/)

The app links clinical references and labels the screening rules as demonstration examples.
