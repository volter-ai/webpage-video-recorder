/**
 * Xvfb (X Virtual Framebuffer) lifecycle management
 * Provides virtual display for headless browser recording
 */

import { spawn } from 'child_process';
import { log, sleep } from './cleanup.js';

/**
 * Check if Xvfb is available
 */
export async function checkXvfbAvailable() {
  return new Promise((resolve) => {
    const check = spawn('which', ['Xvfb'], { stdio: 'pipe' });
    check.on('exit', (code) => resolve(code === 0));
  });
}

/**
 * Check if a display is already in use
 */
export async function isDisplayInUse(displayNumber) {
  return new Promise((resolve) => {
    const check = spawn('xdpyinfo', [`-display`, `:${displayNumber}`], {
      stdio: 'pipe',
      env: { ...process.env, DISPLAY: `:${displayNumber}` }
    });
    check.on('exit', (code) => resolve(code === 0));
  });
}

/**
 * Find an available display number
 */
export async function findAvailableDisplay(startDisplay = 99, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const displayNum = startDisplay + i;
    const inUse = await isDisplayInUse(displayNum);

    if (!inUse) {
      log(`Found available display: :${displayNum}`);
      return displayNum;
    }
  }

  throw new Error(`Could not find available display after ${maxAttempts} attempts`);
}

/**
 * Start Xvfb virtual display
 * @param {number} displayNumber - Display number to use (e.g., 99 for :99)
 * @param {string} resolution - Screen resolution (e.g., '1920x1080x24')
 * @param {boolean} autoRetry - If true, automatically find available display on conflict
 * @returns {Promise<{process: ChildProcess, displayNumber: number}>}
 */
export async function startDisplay(displayNumber = 99, resolution = '1920x1080x24', autoRetry = true) {
  log(`Starting Xvfb display :${displayNumber} with resolution ${resolution}`);

  // Check if Xvfb is available
  const xvfbAvailable = await checkXvfbAvailable();
  if (!xvfbAvailable) {
    throw new Error('Xvfb is not installed. Install with: apt-get install xvfb');
  }

  // Check if display is already in use
  const inUse = await isDisplayInUse(displayNumber);
  if (inUse) {
    if (autoRetry) {
      log(`Display :${displayNumber} is in use, finding alternative...`);
      displayNumber = await findAvailableDisplay(displayNumber + 1);
    } else {
      throw new Error(`Display :${displayNumber} is already in use`);
    }
  }

  // Parse resolution
  const [width, height, depth] = resolution.split('x');
  const screenSpec = `${width}x${height}x${depth || '24'}`;

  // Start Xvfb
  const xvfbProcess = spawn('Xvfb', [
    `:${displayNumber}`,
    '-screen', '0', screenSpec,
    '-ac',                    // Disable access control
    '-nolisten', 'tcp',      // Disable TCP connections
    '-dpi', '96',            // Set DPI
    '+extension', 'GLX',     // Enable OpenGL
    '+extension', 'RANDR',   // Enable screen rotation
    '-noreset'               // Don't terminate on last client exit
  ], {
    stdio: 'pipe',
    detached: false
  });

  // Capture stderr for debugging
  let errorOutput = '';
  xvfbProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  // Wait for Xvfb to be ready
  return new Promise((resolve, reject) => {
    let readyCheckInterval;
    let startupTimeout;

    const cleanup = () => {
      if (readyCheckInterval) clearInterval(readyCheckInterval);
      if (startupTimeout) clearTimeout(startupTimeout);
    };

    // Check if Xvfb exits prematurely
    xvfbProcess.on('exit', (code, signal) => {
      cleanup();
      if (code !== 0 && code !== null) {
        const error = new Error(`Xvfb exited with code ${code}\nStderr: ${errorOutput}`);
        reject(error);
      }
    });

    // Timeout after 10 seconds
    startupTimeout = setTimeout(() => {
      cleanup();
      xvfbProcess.kill('SIGTERM');
      reject(new Error(`Xvfb startup timeout after 10 seconds\nStderr: ${errorOutput}`));
    }, 10000);

    // Poll for display availability
    readyCheckInterval = setInterval(async () => {
      const ready = await isDisplayInUse(displayNumber);

      if (ready) {
        cleanup();
        log(`Xvfb display :${displayNumber} is ready`);

        // Set DISPLAY environment variable
        process.env.DISPLAY = `:${displayNumber}`;

        resolve({
          process: xvfbProcess,
          displayNumber,
          resolution: screenSpec
        });
      }
    }, 200);
  });
}

/**
 * Stop Xvfb display
 * @param {Object} displayInfo - Object returned from startDisplay
 */
export async function stopDisplay(displayInfo) {
  if (!displayInfo || !displayInfo.process) {
    log('No display process to stop');
    return;
  }

  log(`Stopping Xvfb display :${displayInfo.displayNumber}`);

  return new Promise((resolve) => {
    const { process: xvfbProcess } = displayInfo;

    if (!xvfbProcess.pid) {
      log('Xvfb process already terminated');
      resolve();
      return;
    }

    // Send SIGTERM for graceful shutdown
    try {
      xvfbProcess.kill('SIGTERM');
    } catch (err) {
      log(`Error killing Xvfb: ${err.message}`);
      resolve();
      return;
    }

    // Wait for process to exit
    const timeout = setTimeout(() => {
      log('Xvfb did not exit gracefully, forcing SIGKILL');
      try {
        xvfbProcess.kill('SIGKILL');
      } catch (err) {
        // Process might already be dead
      }
      resolve();
    }, 5000);

    xvfbProcess.on('exit', () => {
      clearTimeout(timeout);
      log(`Xvfb display :${displayInfo.displayNumber} stopped`);
      resolve();
    });
  });
}

/**
 * Get current display resolution
 */
export async function getDisplayResolution(displayNumber) {
  return new Promise((resolve, reject) => {
    const xdpyinfo = spawn('xdpyinfo', [], {
      stdio: 'pipe',
      env: { ...process.env, DISPLAY: `:${displayNumber}` }
    });

    let output = '';
    xdpyinfo.stdout.on('data', (data) => {
      output += data.toString();
    });

    xdpyinfo.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`xdpyinfo failed with code ${code}`));
        return;
      }

      // Parse dimensions from output
      const match = output.match(/dimensions:\s+(\d+)x(\d+)\s+pixels/);
      if (match) {
        resolve({
          width: parseInt(match[1], 10),
          height: parseInt(match[2], 10)
        });
      } else {
        reject(new Error('Could not parse display resolution'));
      }
    });
  });
}
