require 'cairo'

local script_dir = debug.getinfo(1, 'S').source:match('^@(.*)/[^/]*$') or '.'
local cava_config_file = script_dir .. '/config'

local function load_module(path)
  local chunk, err = loadfile(path)
  if not chunk then error(err) end
  return chunk()
end

local inifile = load_module(script_dir .. '/inifile.lua')
local hex2rgb = load_module(script_dir .. '/hex2rgb.lua')

-- Set on conky load and config read
local cs
local cr

local window_height
local window_width

local n_bars
local bar_max

local bit_format
local byte_format
local byte_size

local color
local color_intense
local rgb
local rgb_intense
local opacity
local amplitude
local idle_threshold

-- Wave state
local smooth = {}
local frame = {}

-- Cava pipe setup
local function read_cava()
  local pipe = io.popen('cava -p ' .. cava_config_file, 'r')
  if pipe == nil then
    print('Cava pipe failed')
    while true do
      for _ = 1, n_bars do coroutine.yield(0) end
    end
  end

  while true do
    local chunk = pipe:read(n_bars * byte_size)
    if chunk == nil then
      for _ = 1, n_bars do coroutine.yield(0) end
    else
      for i = 1, n_bars * byte_size, byte_size do
        local value = string.unpack(byte_format, chunk, i)
        coroutine.yield(value)
      end
    end
  end
end
local co = coroutine.create(read_cava)

local function read_frame()
  for i = 1, n_bars do
    local _, value = coroutine.resume(co)
    frame[i] = (value or 0) / bar_max
  end
end

local function catmull_rom(p0, p1, p2, p3, t)
  local t2 = t * t
  local t3 = t2 * t
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
end

local function lerp_color(t)
  local r = rgb[1] + (rgb_intense[1] - rgb[1]) * t
  local g = rgb[2] + (rgb_intense[2] - rgb[2]) * t
  local b = rgb[3] + (rgb_intense[3] - rgb[3]) * t
  return r, g, b
end

local function build_wave_path(cr, dir, y_center, amp, points)
  local n = #points
  local x0 = 0
  local dx = window_width / (n - 1)
  local sign = dir < 0 and 1 or -1

  cairo_move_to(cr, x0, y_center + sign * points[1] * amp)
  local seg = 6
  for i = 1, n - 1 do
    local p0 = points[i - 1] or points[1]
    local p1 = points[i]
    local p2 = points[i + 1] or points[n]
    local p3 = points[i + 2] or p2
    for j = 1, seg do
      local t = j / seg
      local v = catmull_rom(p0, p1, p2, p3, t)
      local x = x0 + (i - 1 + t) * dx
      cairo_line_to(cr, x, y_center + sign * v * amp)
    end
  end
end

local function draw_wave()
  -- Time smoothing (EMA) for extra continuity between frames
  local sum = 0
  for i = 1, n_bars do
    local v = frame[i] or 0
    smooth[i] = (smooth[i] or v) * 0.45 + v * 0.55
    sum = sum + smooth[i]
  end

  -- Intensity for color interpolation
  local avg = sum / n_bars

  -- Hide the wave when there is no real audio (idle bar off)
  if avg < idle_threshold then
    return
  end

  local t = (avg - 0.02) / 0.22
  if t < 0 then t = 0 elseif t > 1 then t = 1 end
  local r, g, b = lerp_color(t)

  local y_center = window_height / 2
  local amp = (window_height / 2 - 8) * amplitude

  local passes = {
    { width = 10, alpha = 0.10 },
    { width = 5, alpha = 0.28 },
    { width = 2, alpha = 0.95 },
  }

  for _, pass in ipairs(passes) do
    cairo_new_path(cr)
    build_wave_path(cr, 1, y_center, amp, smooth)
    build_wave_path(cr, -1, y_center, amp, smooth)
    cairo_set_source_rgba(cr, r, g, b, opacity * pass.alpha)
    cairo_set_line_width(cr, pass.width)
    cairo_set_line_cap(cr, CAIRO_LINE_CAP_ROUND)
    cairo_set_line_join(cr, CAIRO_LINE_JOIN_ROUND)
    cairo_stroke(cr)
  end
end

local function read_config()
  local config = inifile.parse(cava_config_file)

  -- Number of bars and bit format
  local n_bars_new = tonumber(config['general']['bars'] or 512)
  if n_bars ~= n_bars_new then
    n_bars = n_bars_new
    frame = {}
    smooth = {}
  end

  local bit_format_new = string.gsub(config['output']['bit_format'] or '16bit', '%s+', '')
  if bit_format_new ~= bit_format then
    bit_format = bit_format_new
    if bit_format == '8bit' then
      bar_max = 255
      byte_format = '<B'
      byte_size = 1
    else
      bar_max = 65535
      byte_format = '<H'
      byte_size = 2
    end
  end

  -- Colors and opacity
  local color_new = string.gsub(config['conky']['color'] or '#89b4fa', '%s+', '')
  local color_intense_new = string.gsub(config['conky']['color_intense'] or '#f5c2e7', '%s+', '')
  local opacity_new = tonumber(config['conky']['opacity'] or 1)
  local amplitude_new = tonumber(config['conky']['amplitude'] or 1)
  local idle_threshold_new = tonumber(config['conky']['idle_threshold'] or 0.008)
  if color ~= color_new or color_intense ~= color_intense_new or opacity ~= opacity_new or
    amplitude ~= amplitude_new or idle_threshold ~= idle_threshold_new then
    color = color_new
    color_intense = color_intense_new
    rgb = hex2rgb(color)
    rgb_intense = hex2rgb(color_intense)
    opacity = opacity_new
    amplitude = amplitude_new
    idle_threshold = idle_threshold_new
  end
end

read_config()

-- Setup/teardown
function conky_setup_visualizer()
  -- Conky window width/height is 0 for the first few renders which causes errors
  window_height = conky_window.height
  window_width = conky_window.width
  if (window_height <= 0 or window_width <= 0) then
    return
  end

  -- Cairo setup
  cs = cairo_xlib_surface_create(conky_window.display, conky_window.drawable, conky_window.visual, window_width,
    window_height)
  cr = cairo_create(cs)
end

function conky_shutdown_visualizer()
  cairo_destroy(cr)
  cairo_surface_destroy(cs)
  cr = nil
  cs = nil
end

function conky_preload_visualizer()
  if conky_window == nil then
    return
  end

  -- Conky window width/height is 0 for the first few renders which causes errors
  if conky_window.height ~= window_height or conky_window.width ~= window_width then
    conky_shutdown_visualizer()
    conky_setup_visualizer()
  end
end

-- Main method
function conky_visualizer()
  if (cr ~= nil) then
    read_config()
    read_frame()
    draw_wave()
  end
  return ''
end
