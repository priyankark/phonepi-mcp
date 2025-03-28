#!/usr/bin/env node
import { Command } from 'commander';
import { isServerRunning, startServer, stopServer, getServerStatus } from './server-manager.js';

const program = new Command();

program
  .name('phonepi-mcp')
  .description('PhonePi MCP - CLI tool for phone control')
  .version('1.0.0');

// Helper function to ensure clean server start
async function ensureCleanStart(port: number) {
  // First check if server is running
  const serverRunning = await isServerRunning(port);
  if (serverRunning) {
    // Try to stop the existing server
    console.error(`Found existing server on port ${port}, attempting to stop it...`);
    
    // Make multiple attempts to stop the server
    let stopped = false;
    for (let attempt = 1; attempt <= 3 && !stopped; attempt++) {
      console.error(`Attempt ${attempt} to stop server...`);
      stopped = await stopServer();
      if (!stopped) {
        // Wait a short time before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!stopped) {
      console.error(`Failed to stop existing server after multiple attempts. Please ensure port ${port} is free before starting the server.`);
      process.exit(1);
    }
    console.error('Successfully stopped existing server.');
    
    // Add a small delay to ensure the port is fully released
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

program
  .command('start')
  .description('Start the MCP server if not already running')
  .option('-p, --port <port>', 'Port to run the server on', '11041')
  .option('-b, --background', 'Run the server in the background', false)
  .action(async (options) => {
    // Ensure no other server is running on this port
    await ensureCleanStart(parseInt(options.port));
    
    // If not running in background, use inheritStdio=true to pass through to the MCP server
    if (!options.background) {
      await startServer(parseInt(options.port), false, true);
      // This will only return when the server process exits
      return;
    }
    
    // For background mode, don't inherit stdio
    const serverProcess = await startServer(parseInt(options.port), true, false);
    if (serverProcess) {
      console.error(`Server started successfully on port ${options.port} in background mode`);
    } else {
      console.error('Failed to start server');
    }
  });

program
  .command('stop')
  .description('Stop the running MCP server')
  .action(async () => {
    const success = await stopServer();
    if (success) {
      console.error('Server stopped successfully');
    } else {
      console.error('Failed to stop server or server is not running');
    }
  });

program
  .command('status')
  .description('Check if the MCP server is running')
  .action(async () => {
    const status = await getServerStatus();
    if (status.running) {
      console.error(`Server is running${status.pid ? ` (PID: ${status.pid})` : ''} on port ${status.port || 'unknown'}`);
    } else {
      console.error('Server is not running');
    }
  });

program
  .command('restart')
  .description('Restart the MCP server')
  .option('-p, --port <port>', 'Port to run the server on', '11041')
  .option('-b, --background', 'Run the server in the background', false)
  .action(async (options) => {
    await stopServer();
    
    // Same pattern as start command
    if (!options.background) {
      await startServer(parseInt(options.port), false, true);
      return;
    }
    
    const serverProcess = await startServer(parseInt(options.port), true, false);
    if (serverProcess) {
      console.error(`Server restarted successfully on port ${options.port} in background mode`);
    } else {
      console.error('Failed to restart server');
    }
  });

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, run the server directly with stdio
if (!process.argv.slice(2).length) {
  // First ensure no other server is running
  ensureCleanStart(11041)
    .then(() => {
      // Default to starting the server in foreground mode with proper stdio inheritance
      return startServer(11041, false, true);
    })
    .catch(error => {
      console.error('Failed to start server:', error);
      process.exit(1);
    });
}