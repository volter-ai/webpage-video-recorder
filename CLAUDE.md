# CLAUDE.md - Webpage Video Recorder

## Project Overview

This is a production-ready Node.js CLI tool for automated webpage video recording with synchronized audio capture. The tool uses Puppeteer, Xvfb (virtual display), ffmpeg (recording), and PulseAudio (audio capture) to record any webpage containing video content.

**Technology Stack:**
- Node.js 18+ with ES Modules
- Puppeteer for browser automation
- Xvfb for headless display rendering
- ffmpeg for video/audio encoding
- PulseAudio for virtual audio sinks
- yargs for CLI argument parsing

## Coding Standards

### 1. Language and Module System

- **Language**: JavaScript (ES Modules)
- **Module Type**: Use `import`/`export` syntax (type: "module" in package.json)
- **File Extension**: `.js` for all JavaScript files
- **No TypeScript**: This project uses plain JavaScript

### 2. Code Style

#### 2.1 General Style

- **Indentation**: 2 spaces (never tabs)
- **Semicolons**: Always use semicolons
- **Quotes**: Single quotes for strings (except when avoiding escapes)
- **Line Length**: Soft limit at 100 characters, hard limit at 120
- **Trailing Commas**: Use in multi-line object/array literals

#### 2.2 Naming Conventions

- **Functions**: camelCase (e.g., `launchBrowser`, `startRecording`)
- **Classes**: PascalCase (e.g., `CleanupManager`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `DEFAULT_DISPLAY`)
- **Variables**: camelCase for all other variables
- **Private fields**: Prefix with underscore (e.g., `this._isCleaningUp`)
- **File names**: kebab-case for new files if multi-word (e.g., `audio-utils.js`)

#### 2.3 Comments and Documentation

```javascript
/**
 * Function description in imperative mood
 * @param {Type} paramName - Parameter description
 * @param {Object} options - Options object
 * @param {string} options.field - Specific option description
 * @returns {Promise<Type>} Return value description
 */
export async function myFunction(paramName, options = {}) {
  // Implementation
}
```

- Use JSDoc comments for all exported functions
- Use inline comments sparingly, only when code intent is unclear
- Keep comments concise and meaningful
- Update comments when changing code

### 3. Architecture Patterns

#### 3.1 Module Organization

The project follows a modular architecture:

```
record.js              # Main CLI entry point - orchestrates workflow
lib/
  cleanup.js           # Resource cleanup coordinator (singleton pattern)
  display.js           # Xvfb lifecycle management
  audio.js             # PulseAudio virtual sink management
  recorder.js          # ffmpeg recording orchestration
  browser.js           # Puppeteer browser automation
```

**Module Responsibilities:**
- Each module has a single, well-defined responsibility
- Modules export pure functions (except cleanup.js which exports a singleton)
- No circular dependencies between modules
- All modules import from cleanup.js for logging utilities

#### 3.2 Cleanup Manager Pattern

The `CleanupManager` class is a singleton that:
- Tracks all spawned processes by name
- Registers signal handlers (SIGINT, SIGTERM)
- Provides `withCleanup()` wrapper for automatic resource cleanup
- Ensures graceful shutdown on errors or interrupts

**Usage Pattern:**
```javascript
await cleanupManager.withCleanup(async (cleanup) => {
  const process = spawn('command', args);
  cleanup.trackProcess('name', process);

  // Do work...

  cleanup.untrackProcess('name'); // When done
});
```

#### 3.3 Error Handling

- **Always use try/catch** for async operations
- **Throw descriptive errors** with context: `throw new Error(\`Failed to X: \${err.message}\`)`
- **Clean up resources** in finally blocks or using `withCleanup()`
- **Log errors with timestamps** using the `log()` utility from cleanup.js
- **Exit with code 1** on fatal errors after cleanup

**Example:**
```javascript
try {
  const result = await someOperation();
  log('Operation successful');
  return result;
} catch (err) {
  throw new Error(`Failed to complete operation: ${err.message}`);
}
```

### 4. Process Management

#### 4.1 Spawning Processes

- Always track spawned processes with `cleanupManager.trackProcess()`
- Use descriptive names for tracked processes
- Untrack processes when they exit successfully
- Never ignore process errors

```javascript
const ffmpegProcess = spawn('ffmpeg', args, { stdio: 'pipe' });
cleanup.trackProcess('ffmpeg', ffmpegProcess);

// Listen for exit
ffmpegProcess.on('exit', (code, signal) => {
  if (code === 0) {
    log('Process completed successfully');
  }
});
```

#### 4.2 Graceful Shutdown

- Send SIGINT first (allows cleanup)
- Wait 5 seconds for graceful exit
- Force kill with SIGKILL if needed
- Always log shutdown status

### 5. Async/Await Patterns

#### 5.1 Promise Handling

- **Prefer async/await** over raw promises
- **Always await** async functions (don't forget!)
- **Use Promise.all()** for parallel operations
- **Handle promise rejections** with try/catch

#### 5.2 Timeout Patterns

```javascript
// Good: Use timeout with Promise.race
const result = await Promise.race([
  operation(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]);

// Good: Built-in timeout options
await page.waitForSelector(selector, { timeout: 30000 });
```

### 6. CLI Argument Parsing

Use yargs with this pattern:

```javascript
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 --flag <value>')
  .option('flag', {
    alias: 'f',
    type: 'string',
    description: 'Flag description',
    demandOption: true,  // For required args
    default: 'value'     // For optional args
  })
  .example('$0 --flag value', 'Example description')
  .help('h')
  .alias('h', 'help')
  .strict()
  .parseSync();
```

**CLI Argument Guidelines:**
- Required args: url, output
- Optional args with sensible defaults: resolution (1920x1080), framerate (30), quality (23)
- Use aliases for common flags: `-u` for url, `-o` for output, `-d` for duration
- Validate arguments early in main function
- Provide helpful examples in usage text

### 7. Logging Standards

Use the `log()` utility from cleanup.js:

```javascript
import { log } from './lib/cleanup.js';

log('Starting operation...');
log(`Processing ${count} items`);
log('='.repeat(70));  // For section separators
```

**Logging Guidelines:**
- Log all major workflow steps with descriptive messages
- Include progress indicators for long operations
- Use separator lines (70 equals signs) for major sections
- Log errors with full context and stack traces
- Include timestamps (handled automatically by log utility)

### 8. Puppeteer Patterns

#### 8.1 Browser Launch

Always launch with these critical flags:
- `headless: false` - Required for Xvfb
- `--no-sandbox` - Required for Docker
- `--autoplay-policy=no-user-gesture-required` - Auto-play videos
- `--display=:${displayNumber}` - Use virtual display

#### 8.2 Page Interactions

```javascript
// Wait for elements before interacting
await page.waitForSelector(selector, { timeout: 30000 });

// Always verify state after interactions
const isPlaying = await page.evaluate((sel) => {
  const video = document.querySelector(sel);
  return video && !video.paused && !video.ended;
}, selector);
```

#### 8.3 Browser Cleanup

- Always close browser in cleanup phase
- Handle browser close errors gracefully
- Don't leave zombie browser processes

### 9. ffmpeg Integration

#### 9.1 Recording Command Structure

```javascript
const ffmpegArgs = [
  '-y',                              // Overwrite output
  '-video_size', `${width}x${height}`,
  '-framerate', framerate.toString(),
  '-f', 'x11grab',
  '-i', `:${displayNumber}`,         // X11 display
  '-f', 'pulse',
  '-i', audioSource,                 // PulseAudio monitor
  '-c:v', 'libx264',                 // H.264 codec
  '-preset', preset,
  '-crf', crf.toString(),
  '-c:a', 'aac',                     // AAC audio
  '-b:a', audioBitrate,
  '-pix_fmt', 'yuv420p',             // Universal compatibility
  '-movflags', '+faststart',         // Web streaming
  outputPath
];
```

#### 9.2 Progress Monitoring

- Parse stderr for frame/time progress (ffmpeg outputs to stderr)
- Log progress periodically (not every frame)
- Detect startup success within 5 seconds

### 10. Testing Practices

When implementing new features:

1. **Test locally first** with simple cases
2. **Test in Docker** to verify containerization works
3. **Test edge cases**: missing elements, timeouts, errors
4. **Test cleanup**: Ctrl+C during recording, process crashes
5. **Verify output**: Check video plays correctly, audio syncs

### 11. Security Considerations

- **Never commit secrets** (.env files in .gitignore)
- **Validate user inputs** (URLs, file paths)
- **Sandbox in Docker** for untrusted URLs
- **Document security flags** (--no-sandbox, --disable-web-security)
- **Warn users** about recording sensitive content

### 12. Performance Guidelines

- **Parallel operations**: Use Promise.all() for independent tasks
- **Process management**: Don't spawn unnecessary processes
- **Memory usage**: Close resources when done (pages, browser)
- **File I/O**: Stream large files, don't load into memory

### 13. Adding New Features

When adding new features:

1. **Update CLI args** in record.js (add option to yargs)
2. **Add module function** if significant logic (in lib/)
3. **Update documentation** (README.md usage section)
4. **Add example** to README.md examples section
5. **Test thoroughly** (local and Docker)
6. **Update IMPLEMENTATION.md** if architectural change

### 14. Common Patterns to Follow

#### 14.1 Configuration Objects

Prefer options objects over positional parameters:

```javascript
// Good
async function startRecording(options) {
  const {
    displayNumber = 99,
    audioSource,
    outputPath,
    resolution = '1920x1080'
  } = options;
}

// Usage
await startRecording({
  displayNumber: 99,
  audioSource: 'monitor',
  outputPath: 'out.mp4'
});
```

#### 14.2 Validation Pattern

```javascript
// Validate early
if (!outputPath) {
  throw new Error('outputPath is required');
}

// Validate format
const match = resolution.match(/(\d+)x(\d+)/);
if (!match) {
  throw new Error(`Invalid resolution: ${resolution}`);
}
```

#### 14.3 Retry Pattern

```javascript
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    await operation();
    log('Operation succeeded');
    return;
  } catch (err) {
    log(`Attempt ${attempt} failed: ${err.message}`);
    if (attempt === maxAttempts) {
      throw new Error(`Failed after ${maxAttempts} attempts`);
    }
    await sleep(1000);  // Wait before retry
  }
}
```

### 15. Dependencies

**Current dependencies:**
- `puppeteer: ^22.0.0` - Browser automation
- `yargs: ^17.7.2` - CLI argument parsing

**Adding new dependencies:**
- Prefer well-maintained packages with active communities
- Check bundle size impact
- Verify license compatibility (MIT preferred)
- Update package.json with exact versions or caret (^)

### 16. Git Commit Standards

- **Format**: `<type>: <description>`
- **Types**: feat, fix, docs, refactor, test, chore
- **Examples**:
  - `feat: add auto-detect duration feature`
  - `fix: handle video element not found error`
  - `docs: update CLI options in README`
  - `refactor: extract audio setup to separate module`

### 17. Docker Considerations

- **Keep image size reasonable** (~1.5GB with Chromium)
- **Use .dockerignore** to exclude unnecessary files
- **Test Docker build** before committing Dockerfile changes
- **Document resource requirements** (CPU, RAM, disk)
- **Provide example docker-compose.yml** for users

### 18. Anti-Patterns to Avoid

❌ **Don't:**
- Leave zombie processes running
- Ignore cleanup on errors
- Use synchronous file operations (readFileSync, etc.)
- Hardcode paths or configuration values
- Forget to await async functions
- Use console.log instead of log() utility
- Create circular dependencies between modules
- Swallow errors without logging

✅ **Do:**
- Track all processes with cleanupManager
- Use async/await for file operations
- Make configuration values CLI arguments or environment variables
- Always await async functions
- Use log() utility for consistent timestamps
- Keep modules independent and focused
- Log and rethrow errors with context

### 19. File Size Management

When dealing with recordings:
- Estimate file sizes before recording (use `estimateFileSize()`)
- Log estimated file size to user
- Consider disk space when choosing quality settings
- Clean up partial recordings on error

### 20. Environment Variables

Current environment variables:
- `DISPLAY` - X display number (e.g., `:99`)
- `PUPPETEER_EXECUTABLE_PATH` - Custom Chrome/Chromium path
- `PULSE_SERVER` - PulseAudio server socket

When adding new environment variables:
- Document in README.md environment variables section
- Provide sensible defaults
- Validate values at startup

## Project-Specific Notes

### Video Duration Handling

The project supports both manual and automatic duration detection:

1. **Manual mode**: User provides `--duration` argument
2. **Auto-detect mode**: Set `--auto-detect-duration` flag, duration extracted from video element's `duration` property

When implementing features related to duration:
- Default to auto-detection when possible
- Fall back to manual duration if auto-detection fails
- Validate that duration is reasonable (> 0, < some max)
- Add buffer time (default 2 seconds) to ensure full capture

### Workflow Sequence

**Critical ordering** (DO NOT change without good reason):
1. Start Xvfb first (browser needs display)
2. Setup PulseAudio second (browser needs audio sink)
3. Start ffmpeg third (must record from start)
4. Launch browser fourth (after recording started)
5. Play video fifth (browser ready)
6. Wait for duration
7. Stop ffmpeg with SIGINT (graceful finalization)
8. Close browser
9. Stop Xvfb
10. Cleanup audio

### Module Coupling

- `record.js` orchestrates and imports from all lib modules
- lib modules are independent except they all import from `cleanup.js` for logging
- No lib module imports from another lib module (except cleanup.js)
- This keeps dependencies clear and avoids circular imports

## Getting Help

When in doubt:
- Check existing code patterns in lib/ modules
- Refer to README.md for user-facing documentation
- Check IMPLEMENTATION.md for architectural decisions
- Look at how similar operations are handled elsewhere

## Summary

This project values:
1. **Reliability**: Proper error handling and resource cleanup
2. **Clarity**: Clear module boundaries and responsibilities
3. **Maintainability**: Consistent code style and documentation
4. **Usability**: Comprehensive CLI options and helpful examples
5. **Production-readiness**: Docker support, logging, security considerations
