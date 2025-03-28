#!/usr/bin/env node
import { spawn, ChildProcess, StdioOptions } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to store the server PID file
const PID_DIR = path.join(os.homedir(), '.phonepi-mcp');
const PID_FILE = path.join(PID_DIR, 'server.pid');
const PORT_FILE = path.join(PID_DIR, 'server.port');

// Ensure the PID directory exists
if (!fs.existsSync(PID_DIR)) {
  fs.mkdirSync(PID_DIR, { recursive: true });
}

/**
 * Force kill any process using the specified port
 */
async function forceKillProcessOnPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    // Command to find and kill process on port (works on both Unix and Windows)
    const cmd = process.platform === 'win32'
      ? `for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}"') do taskkill /F /PID %a`
      : `lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs -r kill -9`;
    
    exec(cmd, (error) => {
      if (error) {
        console.error(`Failed to force kill process on port ${port}:`, error);
        resolve(false);
      } else {
        console.error(`Successfully killed process on port ${port}`);
        resolve(true);
      }
    });
  });
}

/**
 * Check if the server is already running by attempting to connect to the port
 */
export async function isServerRunning(port?: number): Promise<boolean> {
  try {
    // If port is not specified, try to get it from the PORT_FILE
    if (!port && fs.existsSync(PORT_FILE)) {
      port = parseInt(fs.readFileSync(PORT_FILE, 'utf-8').trim());
    }

    // Default to 11041 if port is still not available or invalid
    if (!port || isNaN(port)) {
      port = 11041;
    }

    // Now port is guaranteed to be a number
    const portNumber: number = port;

    return new Promise((resolve) => {
      const testSocket = new net.Socket();
      
      // Set a shorter timeout for faster response
      testSocket.setTimeout(500);
      
      // Handle connection success (server is running)
      testSocket.on('connect', () => {
        testSocket.destroy();
        resolve(true);
      });
      
      // Handle connection errors (server might not be running)
      testSocket.on('error', () => {
        testSocket.destroy();
        resolve(false);
      });
      
      // Handle timeout (server might not be running)
      testSocket.on('timeout', () => {
        testSocket.destroy();
        resolve(false);
      });
      
      // Attempt to connect to the server port
      testSocket.connect(portNumber, 'localhost');
    });
  } catch (error) {
    console.error('Error checking if server is running:', error);
    return false;
  }
}

/**
 * Start the MCP server and store its PID
 */
export async function startServer(port = 11041, background = false, inheritStdio = false): Promise<ChildProcess | null> {
  try {
    // Check if server is already running
    const serverRunning = await isServerRunning(port);
    if (serverRunning) {
      console.error(`MCP server is already running on port ${port}`);
      return null;
    }
    
    console.error(`Starting MCP server on port ${port}...`);
    
    // Get the path to the server script
    const serverScriptPath = path.join(__dirname, 'index.js');
    
    // Ensure the script exists
    if (!fs.existsSync(serverScriptPath)) {
      console.error(`Server script not found at: ${serverScriptPath}`);
      return null;
    }

    // Set stdio option based on mode
    let stdio: StdioOptions;
    if (inheritStdio) {
      // Pass through all stdio for MCP communication
      stdio = 'inherit';
    } else if (background) {
      // Ignore all stdio in background mode
      stdio = ['ignore', 'ignore', 'ignore'];
    } else {
      // Only capture stdout/stderr in foreground mode
      stdio = ['ignore', process.stdout, process.stderr];
    }
    
    // Spawn the server process
    const serverProcess: ChildProcess = spawn('node', [serverScriptPath, '--port', port.toString(), '--stdio'], {
      detached: background, // Only detach if running in background
      stdio,
      env: { ...process.env, PORT: port.toString() }
    });
    
    // Store the server PID
    const pid = serverProcess.pid;
    if (pid) {
      fs.writeFileSync(PID_FILE, pid.toString());
      fs.writeFileSync(PORT_FILE, port.toString());
      
      console.error(`Server started with PID: ${pid} on port ${port}`);
      
      if (background) {
        // Unref the process to allow the parent to exit independently
        serverProcess.unref();
      } else {
        // Handle process exit in foreground mode
        serverProcess.on('exit', (code: number | null) => {
          console.error(`Server process exited with code ${code}`);
          // Clean up PID file when server exits
          if (fs.existsSync(PID_FILE)) {
            fs.unlinkSync(PID_FILE);
          }
          if (fs.existsSync(PORT_FILE)) {
            fs.unlinkSync(PORT_FILE);
          }
        });
      }
      
      return serverProcess;
    } else {
      console.error('Failed to get server PID');
      return null;
    }
  } catch (error) {
    console.error('Error starting server:', error);
    return null;
  }
}

/**
 * Stop the MCP server if it's running with enhanced port cleanup
 */
export async function stopServer(): Promise<boolean> {
  try {
    // Get the port from PORT_FILE
    let port: number | undefined;
    if (fs.existsSync(PORT_FILE)) {
      port = parseInt(fs.readFileSync(PORT_FILE, 'utf-8').trim());
    }

    // Default to 11041 if port is not found
    if (!port) {
      port = 11041;
    }

    // Check if server is running
    const serverRunning = await isServerRunning(port);
    if (!serverRunning) {
      console.log('MCP server is not running');
      
      // Clean up PID and PORT files if they exist but server is not running
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
      if (fs.existsSync(PORT_FILE)) {
        fs.unlinkSync(PORT_FILE);
      }
      
      return true;
    }
    
    let success = false;
    
    // First try graceful shutdown using PID
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
      if (pid) {
        try {
          process.kill(pid);
          success = true;
        } catch (killError) {
          console.error(`Failed to kill server process (PID: ${pid}):`, killError);
        }
      }
    }
    
    // If graceful shutdown failed or no PID file exists, force kill the process on the port
    if (!success) {
      success = await forceKillProcessOnPort(port);
    }
    
    // Clean up PID and PORT files
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    if (fs.existsSync(PORT_FILE)) {
      fs.unlinkSync(PORT_FILE);
    }
    
    // Double check the port is actually free
    const stillRunning = await isServerRunning(port);
    if (stillRunning) {
      console.error(`Failed to free up port ${port} despite attempts`);
      return false;
    }
    
    return success;
  } catch (error) {
    console.error('Error stopping server:', error);
    return false;
  }
}

/**
 * Get server status information
 */
export async function getServerStatus(): Promise<{ running: boolean; pid?: number; port?: number }> {
  try {
    // Get the port from PORT_FILE
    let port: number | undefined;
    if (fs.existsSync(PORT_FILE)) {
      port = parseInt(fs.readFileSync(PORT_FILE, 'utf-8').trim());
    }

    const running = await isServerRunning(port);
    
    // Get PID if available
    let pid: number | undefined;
    if (running && fs.existsSync(PID_FILE)) {
      try {
        pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
      } catch (error) {
        console.error('Error reading PID file:', error);
      }
    }
    
    return { running, pid, port };
  } catch (error) {
    console.error('Error getting server status:', error);
    return { running: false };
  }
} 