# YearProgressBar

Console command and desktop widget that show the progress of the current year: progress bar, percentage, elapsed days and remaining days.

## Requirements

- **Node.js** (v12 or newer; tested with v24)
- **Conky** (optional, only for the desktop widget): `sudo apt install conky-all`
- Linux (tested on Linux Mint / Cinnamon) or Windows (console command only)

## Installation

### 1. Console command `yearprogress`

```bash
cd /path/to/YearProgressBar
npm link
```

This makes the `yearprogress` command available globally in any terminal (Linux and Windows with npm). It can also be run without installing:

```bash
node /path/to/YearProgressBar/yearprogress.js
```

### 2. Desktop widget (Conky)

Install Conky:

```bash
sudo apt install conky-all
```

Start the widget (all paths are relative, no configuration needed):

```bash
cd /path/to/YearProgressBar
./start.sh -d
```

(`./start.sh` without `-d` runs in the foreground, useful to see errors.)

**Autostart on login** (Linux Mint: Menu → Preferences → Startup Applications):

- Name: `Conky Year Progress`
- Command: `/path/to/YearProgressBar/start.sh -d`

Or create `~/.config/autostart/conky-yearprogress.desktop` manually:

```ini
[Desktop Entry]
Type=Application
Name=Conky Year Progress
Comment=Year progress widget
Exec=/path/to/YearProgressBar/start.sh -d
X-GNOME-Autostart-enabled=true
```

### 3. Alternative: Cinnamon "Command result" desklet

Use absolute paths in the desklet config (the desklet runs with an empty PATH):

```
/path/to/your/node /path/to/YearProgressBar/yearprogress.js
```

## Usage

Default output (same layout as the widget):

```
YEAR 2026  ·  09/08/2026  DAY 221 / 365
[██████████████████░░░░░░░░░░░░]
    60.5%  ·  144 days left
```

### Flags

| Flag          | Output                  | Conky usage |
|---------------|-------------------------|-------------|
| (no flag)     | Full layout             | —           |
| `--bar`       | Bar only                | `${execpi N ... --bar}` |
| `--percent`   | Percentage (1 decimal)  | `${execpi N ... --percent}%` |
| `--days`      | `day / total`           | `${execpi N ... --days}` |
| `--days-left` | Remaining days          | `${execpi N ... --days-left}` |
| `--fraction`  | Fraction 0–1            | `${execbar} N,M ... --fraction` |

## Customizing the widget

The `conkyrc` file in this directory controls everything. Common settings:

- `alignment` and `gap_x` / `gap_y`: screen position (`top_right`, `bottom_left`...)
- `own_window_argb_value`: background opacity (0 = invisible, 255 = opaque)
- Colors: Catppuccin Mocha palette by default (`#cba6f7` purple, `#f5c2e7` pink, `#cdd6f4` text, `#a6adc8` gray)
- `update_interval`: refresh interval in seconds (the `execpi 300` calls cache for 5 minutes)
- The displayed year is edited as literal text in `conky.text` (`YEAR 2026` line)

Reload after editing:

```bash
pkill -f 'YearProgressBar/conkyrc'
cd /path/to/YearProgressBar && ./start.sh -d
```

## Uninstall

```bash
npm rm -g yearprogress   # remove the global command
rm ~/.config/autostart/conky-yearprogress.desktop  # remove autostart entry
pkill -f 'YearProgressBar/conkyrc'   # close the widget
```

## Project structure

```
YearProgressBar/
├── package.json     # npm command definition (bin)
├── yearprogress.js  # logic: day of year, leap year, bar, flags
└── conkyrc          # Conky widget configuration
```
