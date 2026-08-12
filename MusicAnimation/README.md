# Conky Music Animation

An audio-reactive symmetric wave visualizer rendered on your desktop with **Conky + Cava + Lua + Cairo**. No extra windows — just a smooth wave that reacts to whatever music your system plays, drawn directly on the desktop.

![Demo](https://img.shields.io/badge/stack-Conky%20%2B%20Cava%20%2B%20Lua%20%2B%20Cairo-blue)

## Features

- Smooth symmetric wave (Catmull-Rom splines) mirrored above and below the center line
- Glow effect (3 layered strokes) with rounded caps
- Color gradient by intensity: calm blue → intense pink (configurable)
- Double smoothing (EMA in Lua + Monstercat smoothing in cava) to avoid jitter
- The wave **hides automatically when no music is playing** (`idle_threshold`)
- Live config reload: edit `config` and changes apply without restarting
- Self-contained: the Lua script spawns cava itself — no separate cava process to manage

## Requirements

- Linux with X11 (tested on Linux Mint 22 Cinnamon)
- **conky-all** (or any conky built with Lua + Cairo bindings) — check with `conky -v`: it must list `Cairo` under "Lua bindings"
- **cava** — `sudo apt install cava` (Ubuntu/Debian/Mint), or build from [karlstav/cava](https://github.com/karlstav/cava)
- PulseAudio or PipeWire running (any desktop distro with sound has this)

## Installation

1. **Install dependencies**

   ```bash
   sudo apt install cava conky-all
   ```

2. **Copy the project anywhere you like** — all paths are relative, so it works from any location with no configuration:

   ```bash
   git clone https://github.com/ToguDV/catppuccin-conky-widgets
   # or just copy the folder somewhere, e.g.:
   cp -r music-animation ~/.config/conky/music-animation
   ```

3. **Edit `conkyrc`** to match your screen (this is the only thing you need to change):

   ```lua
   minimum_height = 540,   -- half your screen height
   minimum_width = 956,    -- half your screen width
   xinerama_head = 0,      -- 0 = first monitor, 1 = second, ...
   gap_x = 0,              -- horizontal offset
   gap_y = -40,            -- negative pulls the wave down, positive raises it
   alignment = 'bottom_middle',
   ```

   - `lua_load` is already set to `./visualizer.lua` (relative) — **do not edit it**.
   - If you want the wave full-screen centered, use `alignment = 'middle_middle'`, `minimum_width = <screen width> - 8`, `minimum_height = <screen height>`.

4. **Run it**

   ```bash
   ./start.sh          # foreground (to see errors)
   ./start.sh -d       # background / daemon
   ```

   Play some music — the wave appears and reacts. Stop the music and it fades out.

## Configuration

### `config` (cava + visualizer settings)

This file is parsed live, so edits apply immediately (cava's `live-config` is on).

The `[conky]` section is custom to this visualizer (do NOT quote values):

| Option | Default | Description |
|---|---|---|
| `color` | `#89b4fa` | Wave color when the music is quiet (hex) |
| `color_intense` | `#f5c2e7` | Wave color when the music is loud; interpolated with `color` |
| `opacity` | `0.9` | Global opacity, float 0–1 |
| `amplitude` | `0.65` | Vertical amplitude multiplier. 1 = full window height |
| `idle_threshold` | `0.008` | Average audio level below which the wave hides entirely. `0` = always visible; raise it (e.g. `0.015`) to hide sooner at silence |

Other relevant cava options:

| Option | Default | Description |
|---|---|---|
| `bars` | `128` | Frequency resolution of the wave (more = smoother, more CPU) |
| `framerate` | `60` | Should stay below conky's update rate (~66 Hz) |
| `autosens` / `sensitivity` | `1` / `100` | Auto-clamp the wave so it doesn't hit the edges |
| `noise_reduction` | `90` | 100 = very smooth/slow, 0 = fast/noisy |
| `monstercat` | `1` | Spectral smoothing |

Audio input: `method = pulse` / `source = auto` captures the monitor source of your default sink, i.e. exactly what you hear.

### `conkyrc` (window)

- `update_interval = 0.015` → ~66 fps. Lower it (e.g. `0.01`) for smoother animation at higher CPU cost.
- `own_window_type = 'desktop'` keeps it behind all windows, above the wallpaper.
- The Lua script uses `conky_window.width/height` for all geometry, so any `alignment` works (unlike the original bar-based project).

## Autostart

Create `~/.config/autostart/music-animation.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=Conky Music Animation
Comment=Audio visualizer wave
Exec=/path/to/music-animation/start.sh -d
X-GNOME-Autostart-enabled=true
```

Cava is spawned by the Lua script itself, so conky is the only process you need to launch.

## How it works

1. `visualizer.lua` spawns `cava -p config` as a child process and reads its raw binary FFT output (~128 frequency values per frame) through a Lua coroutine — no FIFO files, no extra daemons.
2. Values are smoothed with an exponential moving average and fed into a Catmull-Rom spline to draw one smooth line above the center and its mirror below.
3. The average level drives both the color interpolation (`color` → `color_intense`) and the idle hiding.
4. Three strokes (wide/transparent → thin/opaque) produce the glow.

## Troubleshooting

| Problem | Fix |
|---|---|
| Nothing appears | Check `conky -v` includes Cairo in the Lua bindings; check you have audio playing; launch with `./start.sh` (without `-d`) from the project folder and read the errors |
| "module 'cairo_xlib' not found" | Not needed: this project only requires the `cairo` module (conky-all ≥ 1.19) |
| Wave doesn't react to music | Make sure audio actually plays through your default sink; check `method = pulse` in `config` |
| Wave crosses the taskbar | Raise the window: increase `gap_y` in `conkyrc` and/or lower `amplitude` in `config` |
| Wave too jittery | Increase `noise_reduction` in `config` (towards 100) |
| CPU too high | Reduce `bars` (e.g. 96) or raise `update_interval` (e.g. `0.02`) |
| Wrong monitor | Change `xinerama_head` in `conkyrc` |

## Credits

Built on top of [Nerwyn/conky-cava-visualizer](https://github.com/Nerwyn/conky-cava-visualizer) (cava spawning + coroutine reading infrastructure, MIT-friendly) with a completely rewritten rendering layer (symmetric wave with splines, glow, and intensity-based coloring).
