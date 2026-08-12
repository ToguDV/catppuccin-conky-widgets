# Conky Widgets

A collection of independent desktop widgets for Linux, powered by [Conky](https://github.com/brndnmtthws/conky). All in the same Catppuccin Mocha style, and all portable: no fixed folder structure, no hardcoded paths, no configuration required to get started.

| Widget | What it does | Extras needed |
|---|---|---|
| [YearProgressBar](YearProgressBar/) | Year progress bar, percentage, days left | Node.js (Conky optional) |
| [SystemPanel](SystemPanel/) | Clock + CPU / RAM / swap / disk bars | Node.js |
| [WeatherPanel](WeatherPanel/) | Current weather + 5-day forecast | Node.js, curl |
| [MusicAnimation](MusicAnimation/) | Audio-reactive wave on the desktop | Cava + sound |

Each widget lives in its own folder and is fully independent. You can use one, two, or all four — they do not conflict.

## Requirements

- **Linux with X11** (tested on Linux Mint / Cinnamon; not Wayland-only sessions)
- **Conky**: `sudo apt install conky-all`
- **Node.js** — any modern version
- **Cava** (only for MusicAnimation): `sudo apt install cava`
- **curl** (only for WeatherPanel)

The easiest way is to install everything at once:

```bash
sudo apt install conky-all nodejs cava curl
```

## Quick start

1. **Download the project:**

   ```bash
   git clone https://github.com/your-user/your-repo ~/conky-widgets
   ```

2. **Start a widget:**

   ```bash
   cd ~/conky-widgets/SystemPanel
   ./start.sh -d
   ```

   That's it. `./start.sh` launches the widget and `-d` runs it in the background. The folder can live anywhere — all paths inside are relative, so there is nothing to configure.

   - Run `./start.sh` **without** `-d` to see errors in the terminal.
   - If you see nothing, make sure the widget isn't hidden behind windows (`own_window_type = 'desktop'` keeps it on the desktop, above the wallpaper).

3. **Repeat step 2 for the other widgets**, changing the folder name (`WeatherPanel`, `YearProgressBar`, `MusicAnimation`). Note: MusicAnimation only shows when music is playing.

## Autostart on login

Widgets stop when you turn off the computer. To have them start automatically when you log in:

1. Open your desktop's **Startup Applications** settings (on Linux Mint: Menu → Preferences → Startup Applications).
2. Add a new entry:
   - Name: `Conky SystemPanel` (or whatever)
   - Command: `/home/YOUR_USER/conky-widgets/SystemPanel/start.sh -d`
3. Do the same for each widget you want.

Each widget's README also shows how to create the autostart entry manually as a `.desktop` file.

## Customizing

Everything is controlled by the `conkyrc` file in each widget folder. The most common things you'll want to change:

- **Position on screen**: `alignment` (e.g. `top_right`, `bottom_left`) and `gap_x` / `gap_y` (distance from the edges)
- **Background opacity**: `own_window_argb_value` (0 = invisible, 255 = opaque)
- **Refresh rate**: `update_interval` (seconds)

Widgets that are designed to stack on the top-right corner already have sensible `gap_y` values; if you use a widget alone, you may want to adjust it. Colors follow the Catppuccin Mocha palette.

Widget-specific settings (like the extra data disk or the weather fallback city) are documented in each widget's own README.

## Troubleshooting

| Problem | What to do |
|---|---|
| Widget doesn't appear | Run `./start.sh` (without `-d`) and read the error printed in the terminal |
| Changes to `conkyrc` do nothing | Restart the widget (see below) |
| I want to close a widget | `pkill -f SystemPanel/conkyrc` (replace `SystemPanel` with the widget's folder name) |
| Restart only one widget | `pkill -f SystemPanel/conkyrc` then `./start.sh -d` again |

**Important**: never use `killall conky` — it closes every widget at once, including the music visualizer.

## Project structure

```
conky-widgets/
├── YearProgressBar/   # console command + desktop widget
├── SystemPanel/       # clock and system monitor
├── WeatherPanel/      # weather and forecast
└── MusicAnimation/    # audio visualizer (Lua + Cava + Cairo)
```

Each widget folder is self-contained: a `start.sh` launcher, a `conkyrc` config, the scripts, and a README with full details.

## License

MIT — see the LICENSE file in each widget folder.
