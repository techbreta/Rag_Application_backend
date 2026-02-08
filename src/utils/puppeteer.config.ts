import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Helper function to clean up corrupted Chromium downloads
async function cleanupCorruptedChromium(): Promise<void> {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check common Puppeteer cache directories
    const cacheDir = path.join(require('os').homedir(), '.cache', 'puppeteer');
    const tmpChromium = '/tmp/chromium';
    
    console.log('Checking for corrupted Chromium downloads...');
    
    // Remove /tmp/chromium if it exists and appears corrupted
    if (fs.existsSync(tmpChromium)) {
      const stats = fs.statSync(tmpChromium);
      console.log(`Found /tmp/chromium, size: ${stats.size} bytes`);
      
      if (stats.size < 50000000) { // Less than 50MB is likely corrupted
        console.log('Removing corrupted /tmp/chromium');
        fs.unlinkSync(tmpChromium);
      }
    }
    
    // Check Puppeteer cache directory
    if (fs.existsSync(cacheDir)) {
      console.log(`Puppeteer cache directory: ${cacheDir}`);
      const files = fs.readdirSync(cacheDir);
      console.log(`Cache contents: ${files.join(', ')}`);
    }
  } catch (error) {
    console.log('Chromium cleanup failed:', error instanceof Error ? error.message : String(error));
  }
}

// Helper function to diagnose system
async function diagnoseSystem(): Promise<void> {
  console.log('System Diagnostics:');
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Node version: ${process.version}`);

  const fs = require('fs');

  // Check for Docker
  const isDocker = fs.existsSync('/.dockerenv');
  console.log(`Docker environment: ${isDocker}`);

  // Check available Chrome/Chromium binaries
  const possiblePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/opt/google/chrome/chrome',
  ];

  console.log('Available Chrome/Chromium binaries:');
  for (const path of possiblePaths) {
    const exists = fs.existsSync(path);
    console.log(`  ${path}: ${exists ? '✓' : '✗'}`);
  }

  // Check /tmp directory permissions (where Puppeteer downloads Chrome)
  try {
    const tmpStat = fs.statSync('/tmp');
    console.log(`/tmp directory permissions: ${tmpStat.mode.toString(8)}`);
  } catch (error) {
    console.log('/tmp directory check failed:', error instanceof Error ? error.message : String(error));
  }
}

export async function launchBrowser() {
  // Run diagnostics in non-production environments or when debugging
  if (process.env['NODE_ENV'] !== 'production' || process.env['PUPPETEER_DEBUG'] === 'true') {
    await diagnoseSystem();
  }
  
  // Clean up any corrupted Chromium downloads
  await cleanupCorruptedChromium();

  // Detect different deployment environments
  const isVercel = !!process.env['VERCEL'];
  const isNetlify = !!process.env['NETLIFY'];
  const isKoyeb = !!process.env['KOYEB'];
  const isAWSLambda = !!process.env['AWS_LAMBDA_FUNCTION_NAME'] && !!process.env['AWS_LAMBDA_RUNTIME_API'];
  const isAWSEC2 = !!process.env['AWS_EXECUTION_ENV'] || !!process.env['EC2_INSTANCE_ID'] || !!process.env['AWS_REGION'];
  const isLinux = process.platform === 'linux';
  const isDocker = process.env['DOCKERIZED'] === 'true' || require('fs').existsSync('/.dockerenv');
  
  // Better serverless detection - only if we're truly in a serverless function
  const isTrueServerless = (isVercel || isNetlify || (isAWSLambda && !!process.env['AWS_LAMBDA_RUNTIME_API']));

  console.log(`Environment detection:`, {
    isVercel,
    isNetlify,
    isKoyeb,
    isAWSLambda,
    isAWSEC2,
    isLinux,
    isDocker,
    isTrueServerless,
    platform: process.platform,
    hasLambdaRuntimeAPI: !!process.env['AWS_LAMBDA_RUNTIME_API'],
    hasLambdaFunctionName: !!process.env['AWS_LAMBDA_FUNCTION_NAME'],
  });

  // Use @sparticuz/chromium ONLY for true serverless environments
  if (isTrueServerless) {
    console.log('True serverless environment detected - using @sparticuz/chromium');

    try {
      return await puppeteerCore.launch({
        args: [...chromium.args, '--disable-web-security'],
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } catch (error) {
      console.error('Failed to launch with @sparticuz/chromium:', error);
      throw error;
    }
  }

  // For AWS EC2, Docker, or other Linux environments (including Lambda containers)
  if (isAWSEC2 || isDocker || isLinux || process.env['AWS_LAMBDA_FUNCTION_NAME']) {
    console.log('Linux/Docker/EC2 environment detected - attempting system Chrome');

    const commonArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-ipc-flooding-protection',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // This is important for containerized environments
    ];

    // Try different Chrome/Chromium paths commonly found on Linux systems
    const possiblePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/chrome',
      '/snap/bin/chromium',
    ];

    // First try with system Chrome
    for (const executablePath of possiblePaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(executablePath)) {
          console.log(`Trying Chrome at: ${executablePath}`);
          return await puppeteerCore.launch({
            executablePath,
            args: commonArgs,
            headless: true,
            defaultViewport: { width: 1920, height: 1080 },
          });
        }
      } catch (error) {
        console.log(`Failed to launch with ${executablePath}:`, error instanceof Error ? error.message : String(error));
        continue;
      }
    }

    // Fallback to bundled puppeteer if system Chrome not found
    console.log('System Chrome not found, trying bundled puppeteer');
    try {
      return await puppeteer.launch({
        headless: true,
        args: commonArgs,
        defaultViewport: { width: 1920, height: 1080 },
      });
    } catch (error) {
      console.error('Failed to launch bundled puppeteer:', error);

      // Try @sparticuz/chromium only as a last resort and with better error handling
      console.log('Attempting @sparticuz/chromium as last resort');
      try {
        // First check if chromium is available and not corrupted
        const chromiumPath = await chromium.executablePath();
        console.log(`Chromium path: ${chromiumPath}`);
        
        const fs = require('fs');
        if (fs.existsSync(chromiumPath)) {
          const stats = fs.statSync(chromiumPath);
          console.log(`Chromium file size: ${stats.size} bytes`);
          
          // If file is too small, it's likely corrupted
          if (stats.size < 50000000) { // 50MB minimum
            throw new Error(`Chromium binary appears corrupted (size: ${stats.size} bytes)`);
          }
        }
        
        return await puppeteerCore.launch({
          args: [...chromium.args, '--disable-web-security', '--no-sandbox'],
          defaultViewport: { width: 1920, height: 1080 },
          executablePath: chromiumPath,
          headless: true,
        });
      } catch (chromiumError) {
        console.error('@sparticuz/chromium also failed:', chromiumError instanceof Error ? chromiumError.message : String(chromiumError));
        
        // Final fallback: throw a comprehensive error with solutions
        throw new Error(`
                All browser launch methods failed on Linux environment.

                Solutions to try:

                1. Install Google Chrome on your server:
                  # For Ubuntu/Debian:
                  wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
                  echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
                  sudo apt-get update && sudo apt-get install -y google-chrome-stable

                  # For Amazon Linux/CentOS/RHEL:
                  sudo yum install -y wget
                  wget https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm
                  sudo yum localinstall -y google-chrome-stable_current_x86_64.rpm

                2. Set environment variables:
                  export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
                  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

                3. Alternative: Use Docker with proper Chrome installation

                Last errors:
                - Bundled Puppeteer: ${error instanceof Error ? error.message : String(error)}
                - Sparticuz Chromium: ${chromiumError instanceof Error ? chromiumError.message : String(chromiumError)}
        `);
      }
    }
  }

  // Local development (Windows/Mac)
  console.log('Local development environment - using regular puppeteer');
  return await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    defaultViewport: { width: 1920, height: 1080 },
  });
}

// Enhanced browser launcher with better error handling and retries
export async function launchBrowserWithRetry(maxRetries: number = 3): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Browser launch attempt ${attempt}/${maxRetries}`);
      const browser = await launchBrowser();
      console.log('Browser launched successfully');
      return browser;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Browser launch attempt ${attempt} failed:`, lastError.message);

      if (attempt === maxRetries) {
        console.error('All browser launch attempts failed. Diagnostics:');
        await diagnoseSystem();

        // Provide helpful error message
        const errorMessage = `
                  Failed to launch browser after ${maxRetries} attempts.

                  Common solutions for AWS EC2:
                  1. Install Chrome: 
                    sudo yum update -y && sudo yum install -y google-chrome-stable
                    OR
                    sudo apt-get update && sudo apt-get install -y google-chrome-stable

                  2. Install missing dependencies:
                    sudo yum install -y atk cups-libs gtk3 libXcomposite libXcursor libXdamage libXext libXi libXrandr libXScrnSaver libXtst pango at-spi2-atk libXt xorg-x11-server-Xvfb xorg-x11-xauth dbus-glib dbus-glib-devel nss

                  3. Set environment variable:
                    export PUPPETEER_DEBUG=true

                  4. Run with Docker:
                    Make sure to rebuild your Docker image with the updated Dockerfile

                  Last error: ${lastError.message}
        `;

        throw new Error(errorMessage);
      }

      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
