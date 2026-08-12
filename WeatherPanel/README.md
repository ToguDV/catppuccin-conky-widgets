# WeatherPanel

Desktop widget (Conky) with the current weather and 5-day forecast, in the same Catppuccin Mocha style as `YearProgressBar` and `SystemPanel`.

```
      \   /     Sunny        ← ASCII art de wttr.in (curl)
       .-.      +29(27) °C
    ― (   ) ―   ← 6 km/h
       `-’      10 km
      /   \     0.0 mm
──────────────────────────
Medellín, CO               ← gris
Today  ☁ Cloudy    30°/16° ← texto, temp rosa a la derecha
Tue    ◑ Partly cloudy 31°/17°
Wed    ☁ Cloudy     30°/16°
Thu    ☂ Showers    29°/16°
Fri    ☂ Drizzle    31°/17°
```

## Requirements

- **curl** — for the wttr.in header
- **Node.js** v18+ (tested with v24) — `fetch` is built-in, no dependencies
- **Conky**: `sudo apt install conky-all`
- Internet connection (to fetch the forecast)
- Linux (tested on Linux Mint / Cinnamon)

## Installation

Copy the `WeatherPanel` folder anywhere (all paths are relative). Start the widget from inside the folder:

```bash
cd /path/to/WeatherPanel
./start.sh -d
```

(`./start.sh` without `-d` runs in the foreground, useful to see errors.)

**Autostart on login** (`~/.config/autostart/weatherpanel.desktop`):

```ini
[Desktop Entry]
Type=Application
Name=Conky Weather Panel
Comment=Weather widget
Exec=/path/to/WeatherPanel/start.sh -d
X-GNOME-Autostart-enabled=true
```

## Usage

### Header: wttr.in (curl)

The top of the widget is fetched with `curl` from [wttr.in](https://wttr.in) (free, no API key):

```bash
curl -s --max-time 10 "wttr.in/?0T" | sed 1,2d
```

- `0` → current conditions only (no forecast)
- `T` → plain text, no ANSI colors
- `sed 1,2d` → drops the "Weather report:" title and blank line
- `--max-time 10` → the exec can never hang conky
- `wttr.is` is an equivalent fallback domain (recommended by the wttr.in docs for scripts)

### Forecast: weather.js (Open-Meteo)

The 5-day forecast and location come from **Open-Meteo** (`api.open-meteo.com`) — free, no API key required.

Location resolution, with fallback:
1. IP geolocation via `ip-api.com` (no token)
2. If it fails, fixed city via Open-Meteo Geocoding — `WEATHER_CITY` env var, or edit `FALLBACK_CITY` in `weather.js` (defaults to `Madrid`)

Data is cached in `/tmp/weather.json` for 30 minutes, so the API is hit at most once per 30 min regardless of how many flags conky calls.

| Flag | Output | Conky usage |
|------|--------|-------------|
| `--loc` | `Medellín, CO` | Location line |
| `--day N` | `Today ☁ Cloudy` | Day 0–4: weekday + symbol + condition |
| `--temps N` | `30°/16°` | Max/min for day N (aligned right) |
| `--temp` / `--cond` / `--feels` / `--symtemp` / `--label` | Current weather bits | Not used by the widget anymore (wttr.in took over) |
| (no flag) | Demo layout | — |

Test from the terminal:

```bash
node weather.js --day 0 && node weather.js --temps 0
```

## Customizing the widget

The `conkyrc` file controls everything:

- `alignment` and `gap_x` / `gap_y`: screen position (`gap_y = 400` places it below `SystemPanel`)
- `own_window_argb_value`: background opacity (165 default)
- Colors: Catppuccin Mocha (`#f5c2e7` temperatures, `#cdd6f4` text, `#a6adc8` labels, `#313244` separator)
- `WEATHER_CITY` env var (or `FALLBACK_CITY` in `weather.js`): city used when IP geolocation fails
- Symbols (☀ ◔ ◑ ☁ ☂ ☃ ⚡) are chosen to render in DejaVu Sans Mono; the map is at the top of `weather.js` (WMO codes)
- Header: edit the `curl` line in `conkyrc` (e.g. add `lang=es`, or `m` for metric, or `wttr.is` as fallback domain)

Reload **only this widget** (never `killall conky`, it would kill the music visualizer):

```bash
pkill -f 'WeatherPanel/conkyrc'
cd /path/to/WeatherPanel && ./start.sh -d
```

## Project structure

```
WeatherPanel/
├── weather.js  # location + 5-day forecast via Open-Meteo, cached in /tmp
└── conkyrc     # Conky widget configuration (wttr.in header + forecast)
```

## API credits

- [wttr.in](https://wttr.in) — current weather header via curl (no API key)
- [Open-Meteo](https://open-meteo.com) — forecast + geocoding, free without API key
- [ip-api.com](https://ip-api.com) — IP geolocation, free without API key
