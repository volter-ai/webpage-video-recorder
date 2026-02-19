#!/usr/bin/env node

/**
 * Webpage Video Recorder CLI
 * Automated screen recorder for capturing webpage videos with audio
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolve } from 'path';
import { cleanupManager, log, sleep } from './lib/cleanup.js';
import { startDisplay, stopDisplay } from './lib/display.js';
import { setupAudioRecording, cleanupAudioRecording } from './lib/audio.js';
import { startRecording, stopRecording, estimateFileSize } from './lib/recorder.js';
import {
  launchBrowser,
  createPage,
  navigateToUrl,
  findAndPlayVideo,
  closeBrowser
} from './lib/browser.js';

/**
 * Parse CLI arguments
 */
const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 --url <url> --output <file> [--duration <seconds>]')
  .option('url', {
    alias: 'u',
    type: 'string',
    description: 'URL of the webpage to record',
    demandOption: true
  })
  .option('duration', {
    alias: 'd',
    type: 'number',
    description: 'Recording duration in seconds (optional if auto-detection enabled)',
    demandOption: false
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output file path (e.g., recording.mp4)',
    demandOption: true
  })
  .option('resolution', {
    alias: 'r',
    type: 'string',
    description: 'Video resolution (e.g., 1920x1080)',
    default: '1920x1080'
  })
  .option('framerate', {
    alias: 'f',
    type: 'number',
    description: 'Video framerate',
    default: 30
  })
  .option('display', {
    type: 'number',
    description: 'X display number to use',
    default: 99
  })
  .option('video-selector', {
    alias: 's',
    type: 'string',
    description: 'CSS selector for video element',
    default: 'video'
  })
  .option('click-selector', {
    alias: 'c',
    type: 'array',
    description: 'CSS selectors to click before recording (e.g., play button)',
    default: []
  })
  .option('auto-detect-duration', {
    type: 'boolean',
    description: 'Auto-detect video duration from DOM',
    default: true
  })
  .option('buffer', {
    alias: 'b',
    type: 'number',
    description: 'Extra buffer time after duration (seconds)',
    default: 2
  })
  .option('quality', {
    alias: 'q',
    type: 'number',
    description: 'Video quality (CRF: 0-51, lower is better)',
    default: 23
  })
  .option('preset', {
    type: 'string',
    description: 'ffmpeg encoding preset (ultrafast, fast, medium, slow)',
    default: 'fast',
    choices: ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow']
  })
  .option('audio-bitrate', {
    type: 'string',
    description: 'Audio bitrate (e.g., 128k, 192k)',
    default: '128k'
  })
  .option('log-console', {
    type: 'boolean',
    description: 'Log browser console messages',
    default: false
  })
  .option('log-requests', {
    type: 'boolean',
    description: 'Log network requests',
    default: false
  })
  .example('$0 --url "https://example.com/video" --output recording.mp4', 'Auto-detect video duration')
  .example('$0 -u "https://example.com/video" -d 30 -o recording.mp4', 'Record with manual 30-second duration')
  .example('$0 -u "https://example.com" -o out.mp4 -r 1280x720', 'Auto-detect with custom resolution')
  .help('h')
  .alias('h', 'help')
  .version('1.0.0')
  .alias('v', 'version')
  .strict()
  .parseSync();

/**
 * Main recording workflow
 */
async function main() {
  log('='.repeat(70));
  log('Webpage Video Recorder');
  log('='.repeat(70));

  // Validate arguments
  const outputPath = resolve(argv.output);
  const duration = argv.duration;
  const bufferTime = argv.buffer;

  // Validate duration arguments
  if (!argv.duration && !argv['auto-detect-duration']) {
    log('ERROR: Either --duration must be provided or --auto-detect-duration must be enabled');
    process.exit(1);
  }

  if (argv['auto-detect-duration']) {
    log('Auto-detection enabled: video duration will be extracted from DOM');
    if (argv.duration) {
      log(`Manual duration (${argv.duration}s) will be used as fallback if auto-detection fails`);
    }
  } else {
    log(`Manual duration: ${argv.duration}s`);
  }

  log(`URL: ${argv.url}`);
  if (argv.duration) {
    log(`Duration: ${duration}s (+ ${bufferTime}s buffer = ${duration + bufferTime}s total)`);
  } else {
    log(`Duration: Auto-detect from video element (+ ${bufferTime}s buffer)`);
  }
  log(`Output: ${outputPath}`);
  log(`Resolution: ${argv.resolution}`);
  log(`Framerate: ${argv.framerate} fps`);
  log(`Quality (CRF): ${argv.quality}`);
  log(`Preset: ${argv.preset}`);

  // Estimate file size (only if duration is known)
  if (argv.duration) {
    const estimatedSize = estimateFileSize(duration + bufferTime, argv.resolution, argv.framerate, argv.quality);
    log(`Estimated file size: ~${estimatedSize} MB`);
  } else {
    log('File size: Will be determined after auto-detecting video duration');
  }

  log('='.repeat(70));

  // Use cleanup manager for automatic resource cleanup
  await cleanupManager.withCleanup(async (cleanup) => {
    let displayInfo, audioInfo, ffmpegProcess, browser;

    try {
      // Step 1: Start virtual display
      log('\n[1/7] Starting virtual display...');
      displayInfo = await startDisplay(argv.display, argv.resolution + 'x24', true);
      cleanup.trackProcess('xvfb', displayInfo.process);
      log(`Display :${displayInfo.displayNumber} started`);

      // Step 2: Setup audio recording
      log('\n[2/7] Setting up audio environment...');
      audioInfo = await setupAudioRecording('recording_sink');
      log(`Audio sink: ${audioInfo.sinkName}`);
      log(`Audio monitor: ${audioInfo.monitorName}`);

      // Register audio cleanup handler
      cleanup.registerCleanupHandler(async () => {
        await cleanupAudioRecording(audioInfo.sinkName);
      });

      // Step 3: Start ffmpeg recording BEFORE browser
      log('\n[3/7] Starting ffmpeg recording...');
      ffmpegProcess = await startRecording({
        displayNumber: displayInfo.displayNumber,
        audioSource: audioInfo.monitorName,
        outputPath,
        resolution: argv.resolution,
        framerate: argv.framerate,
        crf: argv.quality,
        preset: argv.preset,
        audioBitrate: argv['audio-bitrate']
      });
      cleanup.trackProcess('ffmpeg', ffmpegProcess);
      log('Recording started');

      // Wait a moment to ensure recording is stable
      await sleep(2000);

      // Step 4: Launch browser
      log('\n[4/7] Launching browser...');
      browser = await launchBrowser(displayInfo.displayNumber, {
        width: parseInt(argv.resolution.split('x')[0]),
        height: parseInt(argv.resolution.split('x')[1]),
        pulseServer: audioInfo.pulseServer
      });

      // Step 5: Navigate and setup page
      log('\n[5/7] Navigating to URL...');
      const page = await createPage(browser, {
        width: parseInt(argv.resolution.split('x')[0]),
        height: parseInt(argv.resolution.split('x')[1]),
        logConsole: argv['log-console'],
        logRequests: argv['log-requests']
      });

      await navigateToUrl(page, argv.url, {
        timeout: 60000,
        waitUntil: 'networkidle2'
      });

      // Step 6: Find and play video
      log('\n[6/7] Finding and playing video...');
      const videoMetadata = await findAndPlayVideo(page, {
        videoSelector: argv['video-selector'],
        clickSelectors: argv['click-selector'],
        autoDetectDuration: argv['auto-detect-duration']
      });

      log(`Video found: ${videoMetadata.videoWidth}x${videoMetadata.videoHeight}`);
      log(`Video source: ${videoMetadata.src}`);

      // Auto-detect duration if enabled
      let actualDuration = duration;
      if (argv['auto-detect-duration']) {
        if (videoMetadata.autoDetectedDuration && videoMetadata.autoDetectedDuration > 0) {
          actualDuration = Math.ceil(videoMetadata.autoDetectedDuration);
          log(`✓ Auto-detected video duration: ${actualDuration}s`);
          log(`Recording will capture: ${actualDuration}s (+ ${bufferTime}s buffer)`);
        } else {
          // Auto-detection failed
          if (argv.duration) {
            log('⚠ Auto-detection failed, using fallback manual duration');
            actualDuration = duration;
          } else {
            throw new Error(
              'Failed to auto-detect video duration. ' +
              'The video element may not have duration metadata (e.g., live stream). ' +
              'Please provide a manual duration with --duration <seconds>.'
            );
          }
        }
      }

      log('Video is playing');

      // Step 7: Wait for recording duration
      log('\n[7/7] Recording in progress...');
      const totalTime = actualDuration + bufferTime;

      for (let i = 1; i <= totalTime; i++) {
        await sleep(1000);
        const remaining = totalTime - i;
        if (i % 5 === 0 || remaining <= 5) {
          log(`Recording... ${i}/${totalTime}s elapsed (${remaining}s remaining)`);
        }
      }

      log('Recording duration completed');

      // Stop recording gracefully
      log('\nStopping recording...');
      await stopRecording(ffmpegProcess, 10000);
      cleanup.untrackProcess('ffmpeg');

      // Close browser
      log('Closing browser...');
      await closeBrowser(browser);

      // Stop display
      log('Stopping display...');
      await stopDisplay(displayInfo);
      cleanup.untrackProcess('xvfb');

      // Cleanup audio
      log('Cleaning up audio...');
      await cleanupAudioRecording(audioInfo.sinkName);

      // Success
      log('='.repeat(70));
      log('Recording completed successfully!');
      log(`Output file: ${outputPath}`);
      log('='.repeat(70));

    } catch (error) {
      log('='.repeat(70));
      log(`ERROR: ${error.message}`);
      log('='.repeat(70));

      if (error.stack) {
        log('Stack trace:');
        log(error.stack);
      }

      // Cleanup will happen automatically via withCleanup
      process.exit(1);
    }
  });
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
