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

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd webpage-video-recorder
npm install

# Record a single video (auto-detects duration)
./record.sh --url "https://example.com/video" --output recordings/my-video.mp4

# Batch record from a URL list
./record.sh --batch recordings/urls.txt --batch-output-dir recordings
```

> **Important:** Always use `./record.sh` instead of `node record.js`. The wrapper script automatically detects your platform — on macOS it runs via Docker (required since Xvfb, PulseAudio, and ffmpeg are Linux-only), and on Linux it runs Node.js directly.

## Prerequisites

- **Docker 20.10+** (required on macOS; recommended on Linux)
- **Node.js 18.0+** (for `npm install` and direct Linux usage)

For direct Linux usage without Docker, you also need:
- Xvfb: `apt-get install xvfb`
- ffmpeg: `apt-get install ffmpeg`
- PulseAudio: `apt-get install pulseaudio pulseaudio-utils`
- Chromium/Chrome browser

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd webpage-video-recorder

# Install Node.js dependencies
npm install

# Make the wrapper script executable (if not already)
chmod +x record.sh
```

The Docker image is built automatically the first time you run `./record.sh` on macOS.

## Usage

### Single Video Recording

```bash
# Auto-detect video duration (recommended)
./record.sh \
  --url "https://example.com/video" \
  --output recordings/recording.mp4

# With manual duration (30 seconds)
./record.sh \
  --url "https://example.com/video" \
  --duration 30 \
  --output recordings/recording.mp4
```

### Batch Recording

Record multiple URLs from a file:

```bash
# Create a URL list file (one URL per line, # for comments)
cat > recordings/urls.txt << 'EOF'
# Project demo videos
https://example.com/video-1
https://example.com/video-2
https://example.com/video-3
EOF

# Record all URLs sequentially
./record.sh --batch recordings/urls.txt --batch-output-dir recordings

# Record in parallel (3 at a time, default)
./record.sh --batch recordings/urls.txt --batch-output-dir recordings --concurrency 3

# Record one at a time
./record.sh --batch recordings/urls.txt --batch-output-dir recordings --concurrency 1
```

Output files are auto-named based on the URL (e.g., `001-example-com-video-1.mp4`).

### Advanced Examples

#### Custom Resolution and Quality

```bash
./record.sh \
  --url "https://example.com/video" \
  --output recordings/recording.mp4 \
  --resolution 1920x1080 \
  --framerate 60 \
  --quality 18 \
  --preset slow
```

#### Click Play Button Before Recording

```bash
./record.sh \
  --url "https://example.com/video" \
  --output recordings/recording.mp4 \
  --click-selector ".play-button" \
  --click-selector ".accept-cookies"
```

#### Custom Video Selector

```bash
./record.sh \
  --url "https://example.com/video" \
  --duration 30 \
  --output recordings/recording.mp4 \
  --video-selector "#player-video"
```

### Direct Docker Usage (Advanced)

If you need to run Docker manually instead of using `record.sh`:

```bash
# Build the image
docker build -t webpage-recorder .

# Run a recording
docker run --rm -v $(pwd)/recordings:/app/recordings webpage-recorder \
  --url "https://example.com/video" \
  --output /app/recordings/recording.mp4
```

## CLI Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--url` | `-u` | string | | URL of the webpage to record |
| `--duration` | `-d` | number | | Recording duration in seconds (optional with auto-detect) |
| `--output` | `-o` | string | | Output file path (required with `--url`) |
| `--batch` | | string | | Path to URL list file for batch recording |
| `--batch-output-dir` | | string | `./recordings` | Output directory for batch recordings |
| `--concurrency` | | number | `3` | Number of parallel recordings (batch mode) |
| `--resolution` | `-r` | string | `1920x1080` | Video resolution (WIDTHxHEIGHT) |
| `--framerate` | `-f` | number | `30` | Video framerate (fps) |
| `--display` | | number | `99` | X display number to use |
| `--video-selector` | `-s` | string | `video` | CSS selector for video element |
| `--click-selector` | `-c` | array | `[]` | CSS selectors to click before recording |
| `--auto-detect-duration` | | boolean | `true` | Auto-detect video duration from DOM |
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
├── record.sh           # Wrapper script (use this! auto-detects platform)
├── record.js           # Main CLI script (Node.js entry point)
├── lib/
│   ├── cleanup.js      # Resource cleanup coordinator
│   ├── display.js      # Xvfb lifecycle management
│   ├── audio.js        # PulseAudio virtual sink management
│   ├── recorder.js     # ffmpeg recording orchestration
│   ├── browser.js      # Puppeteer navigation & video playback
│   └── batch.js        # Batch recording utilities
├── recordings/         # Default output directory
│   └── urls.txt        # URL list for batch recording
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
