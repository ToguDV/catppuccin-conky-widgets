# SystemPanel — Installation Guide

Installation guide for the SystemPanel desktop widget (clock + system monitor for CPU, RAM, swap and disk).

## Requirements

- **Node.js** (tested with v24; any modern version should work) — `start.sh` finds it automatically if you use [nvm](https://github.com/nvm-sh/nvm); otherwise `node` must be in your `PATH`
- **Conky** 1.19+ — install with:
  ```bash
  sudo apt install conky-all
  ```
- Linux with X11 (tested on Linux Mint / Cinnamon). SystemPanel will not work on Wayland-only sessions.

## 1. Install the widget

Clone or copy the `SystemPanel` folder anywhere — all paths inside are relative, so there is nothing to configure:

```bash
git clone <this-repo> ~/.config/conky
# or: cp -r SystemPanel /any/where/you/like
```

Verify the script works:

```bash
cd /path/to/SystemPanel
./stats.js
```

You should see MEM/SWP/ROOT/DATA/CPU lines with bars and percentages. (If a DATA disk is not mounted, that line is simply skipped.)

## 2. Start the widget

```bash
./start.sh          # foreground — useful to see errors
./start.sh -d       # background / daemon
```

### Positioning

The widget sits at `top_right` with `gap_x = 40` and `gap_y = 165`, which places it below the `YearProgressBar` widget. If you use it without YearProgressBar, adjust `gap_y` (e.g. `20`) and `alignment` in `conkyrc`.

## 3. Autostart on login

Linux Mint: **Menu → Preferences → Startup Applications** → Add:

- Name: `Conky System Panel`
- Command: `/path/to/SystemPanel/start.sh -d`

Or create the desktop entry manually:

```bash
mkdir -p ~/.config/autostart
```

`~/.config/autostart/systempanel.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=Conky System Panel
Comment=Clock and system monitor widget
Exec=/path/to/SystemPanel/start.sh -d
X-GNOME-Autostart-enabled=true
```

Reboot to confirm the widget starts automatically.

## 4. Restarting / troubleshooting

Restart **only this widget** (never `killall conky` — it would kill the MusicAnimation visualizer if you use it):

```bash
pkill -f 'SystemPanel/conkyrc'
cd /path/to/SystemPanel && ./start.sh -d
```

Test each metric against system tools:

```bash
./stats.js --mem && free -m
./stats.js --disk / && df -h /
```

If values look wrong, check the widget log: `tail -f /tmp/sp-conky.err`.

## 5. Customization

Everything is configured in `conkyrc`:

- `alignment`, `gap_x`, `gap_y`: position on screen
- `own_window_argb_value`: background opacity (165 default; 255 = opaque)
- `update_interval`: refresh interval in seconds
- Colors (Catppuccin Mocha): `#cba6f7` bars, `#f5c2e7` clock/percentages, `#a6adc8` labels/dates, `#cdd6f4` text, `#313244` separator
- The DATA disk line is shown only when its mount point exists (`${if_mounted /mnt/datos}`); change the path to your own data disk, or delete the line entirely

## 6. Uninstall

```bash
rm ~/.config/autostart/systempanel.desktop
pkill -f 'SystemPanel/conkyrc'
rm -r /path/to/SystemPanel
```
