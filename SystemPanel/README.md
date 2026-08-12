# SystemPanel

Desktop widget (Conky) with a large clock and system monitor: CPU, RAM, swap and disk usage bars, in the same Catppuccin Mocha style as `YearProgressBar`.

```
           22:54          ← rosa, size 30
       Sáb 09 Ago 2026     ← gris, size 9
──────────────────────────
CPU  ██████████░░░░░░░░░░  42   ← barra morada, % rosa
MEM  ████████░░░░░░░░░░░░  33
SWP  ░░░░░░░░░░░░░░░░░░░░   2   (si swap=0, la línea no se dibuja)
ROOT ██████████████░░░░░░  71
DATA █████████░░░░░░░░░░░  45
```

## Requirements

- **Node.js** (tested with v24) and **Conky**: `sudo apt install conky-all`
- Linux (tested on Linux Mint / Cinnamon)

## Installation

Copy the `SystemPanel` folder anywhere (all paths are relative). Start the widget from inside the folder:

```bash
cd /path/to/SystemPanel
./start.sh -d
```

(`./start.sh` without `-d` runs in the foreground, useful to see errors.)

**Autostart on login** (`~/.config/autostart/systempanel.desktop`):

```ini
[Desktop Entry]
Type=Application
Name=Conky System Panel
Comment=Clock and system monitor widget
Exec=/path/to/SystemPanel/start.sh -d
X-GNOME-Autostart-enabled=true
```

## Usage (stats.js)

Reads `/proc` and `fs.statfsSync` (no dbus → no flickering). All values in `%`, bar of 20 chars `█░`.

| Flag | Output | Conky usage |
|------|--------|-------------|
| (no flag) | Full demo layout | — |
| `--cpu` / `--mem` / `--swap` | One full line per metric | — |
| `--disk <path>` | Disk line (label ROOT/DATA by path) | — |
| `--cpu-bar` / `--cpu-pct` | Bar only / percentage only | `${execpi 60 ./stats.js --cpu-bar}${color #f5c2e7}${execpi 60 ./stats.js --cpu-pct}` |
| `--mem-bar` / `--mem-pct` | Same, for RAM | idem |
| `--swap-bar` / `--swap-pct` | Same, for swap (empty if 0) | idem |
| `--disk-bar <path>` / `--disk-pct <path>` | Same, for a disk | idem |

Test against system tools:

```bash
node stats.js --mem && free -m
node stats.js --disk / && df -h /
```

## Customizing the widget

The `conkyrc` file controls everything:

- `alignment` and `gap_x` / `gap_y`: screen position (`gap_y = 165` places it below `YearProgressBar`)
- `own_window_argb_value`: background opacity (165 default)
- Colors: Catppuccin Mocha (`#cba6f7` bars, `#f5c2e7` clock/percentages, `#cdd6f4` text, `#a6adc8` labels/dates, `#313244` separator)
- `update_interval`: refresh interval in seconds

Reload **only this widget** (never `killall conky`, it would kill the music visualizer):

```bash
pkill -f 'SystemPanel/conkyrc'
cd /path/to/SystemPanel && ./start.sh -d
```

## Project structure

```
SystemPanel/
├── stats.js  # reads /proc and statfs: percentages and bars
└── conkyrc   # Conky widget configuration
```
