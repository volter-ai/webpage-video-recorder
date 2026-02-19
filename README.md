# Webpage Video Recorder

Automated screen recorder for capturing webpage videos with synchronized audio using Node.js, Puppeteer, Xvfb, ffmpeg, and PulseAudio.

## Features

- Record any webpage with video content
- Capture both video and audio in sync
- Headless operation using Xvfb (X Virtual Framebuffer)
- Configurable resolution, framerate, and quality
- Docker support for easy deployment
- Automatic cleanup of system resources
- Auto-detection of video duration
- Custom click selectors for play buttons
- Production-ready error handling

## Architecture

```
┌─────────────┐
│   Xvfb      │  Virtual display (:99)
│  (Display)  │  Renders browser at specified resolution
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Puppeteer  │  Headful Chrome/Chromium browser
│  (Browser)  │  Navigates to URL and plays video
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ PulseAudio  │  Virtual audio sink
│   (Audio)   │  Captures browser audio output
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   ffmpeg    │  Screen + audio capture
│ (Recorder)  │  Encodes to MP4 with H.264 + AAC
└──────┬──────┘
       │
       ↓
    Output.mp4
```

## Prerequisites

### For Docker (Recommended)

- Docker 20.10+
- Docker Compose 1.29+

### For Local Installation

- Node.js 18.0+
- Xvfb: `apt-get install xvfb`
- ffmpeg: `apt-get install ffmpeg`
- PulseAudio: `apt-get install pulseaudio pulseaudio-utils`
- Chromium/Chrome browser

## Installation

### Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd webpage-video-recorder

# Build the Docker image
docker-compose build

# Or build manually
docker build -t webpage-recorder .
```

### Local Installation

```bash
# Install dependencies
npm install

# Make CLI executable globally (optional)
npm link

# Or run directly with node
node record.js --help
```

## Usage

### Basic Usage

```bash
# Record a 30-second video
node record.js \
  --url "https://example.com/video" \
  --duration 30 \
  --output recording.mp4
```

### Docker Usage

```bash
# Using docker-compose (easiest)
docker-compose run --rm recorder \
  --url "https://example.com/video" \
  --duration 30 \
  --output /app/recordings/recording.mp4

# Using docker directly
docker run --rm -v $(pwd)/recordings:/app/recordings webpage-recorder \
  --url "https://example.com/video" \
  --duration 30 \
  --output /app/recordings/recording.mp4
```

### Advanced Examples

#### Custom Resolution and Quality

```bash
node record.js \
  --url "https://example.com/video" \
  --duration 60 \
  --output recording.mp4 \
  --resolution 1920x1080 \
  --framerate 60 \
  --quality 18 \
  --preset slow
```

#### Click Play Button Before Recording

```bash
node record.js \
  --url "https://example.com/video" \
  --duration 30 \
  --output recording.mp4 \
  --click-selector ".play-button" \
  --click-selector ".accept-cookies"
```

#### Auto-Detect Video Duration

```bash
node record.js \
  --url "https://example.com/video" \
  --duration 0 \
  --output recording.mp4 \
  --auto-detect-duration
```

#### Custom Video Selector

```bash
node record.js \
  --url "https://example.com/video" \
  --duration 30 \
  --output recording.mp4 \
  --video-selector "#player-video"
```

## CLI Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--url` | `-u` | string | required | URL of the webpage to record |
| `--duration` | `-d` | number | required | Recording duration in seconds |
| `--output` | `-o` | string | required | Output file path |
| `--resolution` | `-r` | string | `1920x1080` | Video resolution (WIDTHxHEIGHT) |
| `--framerate` | `-f` | number | `30` | Video framerate (fps) |
| `--display` | | number | `99` | X display number to use |
| `--video-selector` | `-s` | string | `video` | CSS selector for video element |
| `--click-selector` | `-c` | array | `[]` | CSS selectors to click before recording |
| `--auto-detect-duration` | | boolean | `false` | Auto-detect video duration from DOM |
| `--buffer` | `-b` | number | `2` | Extra buffer time after duration (seconds) |
| `--quality` | `-q` | number | `23` | Video quality (CRF: 0-51, lower is better) |
| `--preset` | | string | `fast` | ffmpeg encoding preset |
| `--audio-bitrate` | | string | `128k` | Audio bitrate |
| `--log-console` | | boolean | `false` | Log browser console messages |
| `--log-requests` | | boolean | `false` | Log network requests |

### ffmpeg Presets

- `ultrafast`: Fastest encoding, largest file size
- `superfast`, `veryfast`, `faster`, `fast`: Balanced options
- `medium`: Default ffmpeg preset
- `slow`, `slower`, `veryslow`: Best quality, slowest encoding

### Video Quality (CRF)

- `0-17`: Visually lossless (large files)
- `18-23`: High quality (recommended)
- `24-28`: Medium quality
- `29-51`: Lower quality (smaller files)

## Output

The tool generates MP4 files with the following specifications:

- **Video Codec**: H.264 (libx264)
- **Audio Codec**: AAC
- **Pixel Format**: yuv420p (universal compatibility)
- **Container**: MP4 with faststart flag (web streaming)

## Workflow

The recording process follows these steps:

1. **Start Xvfb** - Creates virtual display at specified resolution
2. **Setup PulseAudio** - Creates virtual audio sink for browser
3. **Start ffmpeg** - Begins screen and audio capture
4. **Launch Browser** - Opens Puppeteer with headed Chrome
5. **Navigate** - Loads the target URL
6. **Play Video** - Finds and plays the video element
7. **Record** - Waits for specified duration
8. **Cleanup** - Stops recording and cleans up resources

## Troubleshooting

### Video Element Not Found

```bash
# Use custom selector
--video-selector "#custom-video-id"

# Wait longer for page load
# (modify timeout in lib/browser.js)
```

### Audio Not Captured

```bash
# Check PulseAudio is running
pulseaudio --check || pulseaudio --start

# Verify virtual sink
pactl list sinks | grep recording_sink
```

### Browser Crashes

```bash
# Increase shared memory (Docker)
docker run --shm-size=2gb ...

# Or disable /dev/shm usage
--disable-dev-shm-usage flag is already included
```

### ffmpeg Errors

```bash
# Check ffmpeg installation
ffmpeg -version

# Verify display is accessible
echo $DISPLAY
xdpyinfo -display :99
```

### Recording Shows Black Screen

- Ensure Xvfb started successfully
- Verify DISPLAY environment variable is set
- Check browser is rendering (not headless mode)

### Audio Out of Sync

- Use consistent framerate (30 or 60 fps)
- Ensure PulseAudio virtual sink is set as default
- Check system is not overloaded during recording

## File Size Estimation

Approximate file sizes for 1 minute of recording:

| Resolution | Framerate | Quality (CRF) | File Size |
|------------|-----------|---------------|-----------|
| 1280x720 | 30 fps | 23 | ~15 MB |
| 1920x1080 | 30 fps | 23 | ~25 MB |
| 1920x1080 | 60 fps | 23 | ~45 MB |
| 2560x1440 | 30 fps | 18 | ~60 MB |

## Development

### Project Structure

```
webpage-video-recorder/
├── lib/
│   ├── cleanup.js      # Resource cleanup coordinator
│   ├── display.js      # Xvfb lifecycle management
│   ├── audio.js        # PulseAudio virtual sink management
│   ├── recorder.js     # ffmpeg recording orchestration
│   └── browser.js      # Puppeteer navigation & video playback
├── record.js           # Main CLI script
├── package.json        # Node.js dependencies
├── Dockerfile          # Docker image definition
└── docker-compose.yml  # Docker Compose configuration
```

### Running Tests

```bash
# Test basic recording
npm run record -- \
  --url "https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
  --duration 10 \
  --output test-recording.mp4
```

### Building Docker Image

```bash
# Build image
docker build -t webpage-recorder .

# Test image
docker run --rm webpage-recorder --help
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DISPLAY` | X display number | `:99` |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chrome/Chromium | Auto-detected |
| `PULSE_SERVER` | PulseAudio server socket | `unix:/tmp/pulseaudio.socket` |

## Performance Considerations

- CPU: 2+ cores recommended
- RAM: 2GB minimum, 4GB recommended
- Disk: ~50MB/minute for 1080p video
- Network: Bandwidth depends on webpage content

## Security Notes

- The tool runs Chromium with `--no-sandbox` flag (required for Docker)
- Disable web security is enabled to allow cross-origin content
- Always run in isolated environment (container) for untrusted URLs
- Recordings may contain sensitive content from webpages

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting section above

## Credits

Built with:
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Puppeteer](https://pptr.dev/) - Browser automation
- [ffmpeg](https://ffmpeg.org/) - Video encoding
- [Xvfb](https://www.x.org/releases/X11R7.6/doc/man/man1/Xvfb.1.xhtml) - Virtual display
- [PulseAudio](https://www.freedesktop.org/wiki/Software/PulseAudio/) - Audio system
- [yargs](https://yargs.js.org/) - CLI argument parsing
