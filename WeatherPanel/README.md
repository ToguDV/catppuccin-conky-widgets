# WeatherPanel

Desktop widget (Conky) with the current weather and 5-day forecast, in the same Catppuccin Mocha style as `YearProgressBar` and `SystemPanel`.

```
    .--.     ☂ Drizzle
 .-(    ).   22° (26°)
(___.__)__)  <- 1 km/h NW
  ' ' ' ' '  95%
  ' ' ' ' '  0.2 mm
──────────────────────────
Medellín, CO
Today ☂ Showers       29°/19°
Tue   ☂ Drizzle       25°/18°
Wed   ☂ Showers       29°/18°
Thu   ☂ Showers       27°/17°
Fri   ☂ Light showers 26°/17°
```

## Requirements

- **Node.js** v18+ (built-in `fetch`, no dependencies)
- **Conky**: `sudo apt install conky-all`
- Internet connection (to fetch the weather)
- Linux with X11 (tested on Linux Mint / Cinnamon)

No `curl` and no API key are needed.

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

## How it works

Everything comes from **Open-Meteo** (`api.open-meteo.com`), free and without an API key. A single command renders the whole panel:

```bash
node weather.js --render
```

That process prints exactly 12 lines, always:

1. Five lines of current conditions, with fixed-width ASCII art (5 rows) and the condition, temperature, wind, humidity and precipitation.
2. A separator.
3. The location.
4. Five forecast rows with the condition and the max/min temperature right-aligned.

Because every line stays under ~30 characters, and `conkyrc` sets both `minimum_width = 260` and `maximum_width = 260`, the window never changes size when the weather changes.

Location resolution, with fallback:

1. IP geolocation via `ip-api.com` (no token)
2. If it fails, fixed city via Open-Meteo Geocoding — `WEATHER_CITY` env var, or edit `FALLBACK_CITY` in `weather.js` (defaults to `Madrid`)

If both location services fail but a previous location is cached, the cached coordinates are reused so the forecast can still refresh.

Data is cached in `/tmp/weather.json`. The cache is reused for up to 14 minutes, while `conkyrc` refreshes every 15 minutes, so each scheduled refresh fetches fresh data. The write is atomic so the widget never reads a half-written file. Requests time out after 8 seconds so a slow service cannot hang the refresh.

### Offline behavior

- If there is a cached file, the last data is shown with a single discreet `· offline` next to the location.
- If there is no valid cache, the panel shows a 12-line placeholder with `--` values.
- The word `offline` is never repeated and the script always exits successfully.

## Usage

```bash
node weather.js --render
```

The flag is optional; `node weather.js` does the same. The command is meant for Conky, but it is also useful to check the layout in a terminal.

## Customizing the widget

The `conkyrc` file controls everything:

- `alignment` and `gap_x` / `gap_y`: screen position (`gap_y = 400` places it below `SystemPanel`)
- `own_window_argb_value`: background opacity (165 default)
- Colors: Catppuccin Mocha (`#f5c2e7` temperatures, `#cdd6f4` text, `#a6adc8` labels, `#313244` separator, `#6c7086` offline marker)
- `WEATHER_CITY` env var (or `FALLBACK_CITY` in `weather.js`): city used when IP geolocation fails
- Symbols (☀ ◔ ◑ ☁ ☂ ☃ ⚡) are chosen to render in DejaVu Sans Mono; the map is at the top of `weather.js` (WMO codes)
- ASCII art: the `ART` map in `weather.js`, one fixed 5-row set per condition family
- Refresh: `execpi 900` (15 minutes) in `conkyrc`; `CACHE_TTL` is 14 minutes on purpose, so the cache expires just before each render. If you change the interval, adjust both
- Force a refresh after changing the city: `rm -f /tmp/weather.json` and restart the widget

Reload **only this widget** (never `killall conky`, it would kill the music visualizer):

```bash
pkill -f '^conky -c .*/WeatherPanel/conkyrc'
cd /path/to/WeatherPanel && ./start.sh -d
```

## Project structure

```
WeatherPanel/
├── weather.js  # location + current weather + 5-day forecast via Open-Meteo
├── conkyrc     # Conky widget configuration (fixed 260px width)
└── start.sh    # launcher (adds nvm's node to PATH, retries on login)
```

## API credits

- [Open-Meteo](https://open-meteo.com) — current weather, forecast and geocoding, free without API key
- [ip-api.com](https://ip-api.com) — IP geolocation, free without API key
