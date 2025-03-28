import { Anthropic } from "@anthropic-ai/sdk";
import { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PhonePiConfig, MCPTool, MCPToolResult, AIMessage } from "./types.js";
import chalk from "chalk";
import { spawn } from "child_process";

export class PhonePiClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];
  private verbose: boolean;
  private messages: AIMessage[] = [];
  private readonly MAX_MESSAGE_HISTORY = 10;
  private readonly MODEL_VERSION = "claude-3-7-sonnet-20250219";

  constructor(config: PhonePiConfig, verbose = false) {
    if (!config.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is required");
    }

    // Validate API key format (basic check)
    if (!config.anthropicApiKey.startsWith('sk-ant-') && !config.anthropicApiKey.startsWith('sk-')) {
      throw new Error("Invalid Anthropic API key format. API keys should start with 'sk-ant-' or 'sk-'");
    }

    // Remove any whitespace or quotes that might have been accidentally included
    const cleanApiKey = config.anthropicApiKey.trim().replace(/^["']|["']$/g, '');

    this.anthropic = new Anthropic({
      apiKey: cleanApiKey,
    });

    this.mcp = new Client({ name: "phonepi-cli", version: "1.0.0" });
    this.verbose = verbose;
  }

  private log(message: string) {
    if (this.verbose) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }

  async connectToServer(retries = 3): Promise<boolean> {
    // Suppress WebSocket logs before creating connection
    // Redirect the server's stdout and stderr to a file to hide WebSocket logs
    let serverProcess: ReturnType<typeof spawn> | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Cleanup any existing client connections
        await this.cleanup();
        
        this.log(`Connecting to MCP server (attempt ${attempt}/${retries})...`);
        
        if (!this.verbose) {
          // Start server in a separate process and ignore its output
          this.log("Starting server in silent mode...");
          serverProcess = spawn(
            process.platform === 'win32' ? 'npx.cmd' : 'npx', 
            ['phonepi-mcp', 'start'], 
            {
              stdio: 'ignore',
              detached: true
            }
          );
          
          // Give the server a moment to start
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Create transport to connect to the server
        this.transport = new StdioClientTransport({
          command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
          args: ['phonepi-mcp', 'start'],
          env: {
            ...process.env,
            NODE_ENV: 'production',
            PHONEPI_VERBOSE: this.verbose ? 'true' : 'false'
          }
        });

        // Connect with timeout
        const connectPromise = this.mcp.connect(this.transport);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout")), 10000)
        );
        
        await Promise.race([connectPromise, timeoutPromise]);
        
        // Get available tools
        const toolsResult = await this.mcp.listTools();
        this.tools = toolsResult.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description || "",
          input_schema: tool.inputSchema,
        })) as Tool[];

        if (this.tools.length === 0) {
          throw new Error("No tools available from server");
        }

        // We don't need the separate server process anymore
        if (serverProcess) {
          serverProcess.unref();
          serverProcess = null;
        }

        this.log(`Connected to server with ${this.tools.length} tools available`);
        return true;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        
        if (errorMessage.includes("Connection closed") || 
            errorMessage.includes("Cannot find module") || 
            errorMessage.includes("ENOENT") || 
            errorMessage.includes("not found")) {
          console.error(chalk.red("\nError: Could not start phonepi-mcp server"));
          console.error(chalk.yellow("Please ensure it's installed:"));
          console.error(chalk.blue("\nnpm install -g phonepi-mcp"));
          process.exit(1);
        }
        
        console.error(chalk.yellow(`Connection attempt ${attempt}/${retries} failed:`), e);
        
        // On last retry, throw the error
        if (attempt === retries) {
          console.error(chalk.red("Failed to connect to MCP server after all retries"));
          await this.cleanup();
          throw e;
        }
        
        // Progressive backoff between retries
        const retryDelay = Math.min(2000 * attempt, 10000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
    return false;
  }

  private pruneMessageHistory() {
    if (this.messages.length > this.MAX_MESSAGE_HISTORY * 2) {
      // Keep the first message (system context) and last MAX_MESSAGE_HISTORY messages
      this.messages = [
        ...this.messages.slice(0, 1),
        ...this.messages.slice(-this.MAX_MESSAGE_HISTORY)
      ];
    }
  }

  async processQuery(query: string): Promise<string> {
    this.messages.push({ role: "user", content: query });
    this.pruneMessageHistory();

    const messages: MessageParam[] = this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const response = await this.anthropic.messages.create({
        model: this.MODEL_VERSION,
        max_tokens: 1000,
        messages,
        tools: this.tools,
      });

      const finalText: string[] = [];

      for (const content of response.content) {
        if (content.type === "text") {
          finalText.push(content.text);
        } else if (content.type === "tool_use") {
          const toolName = content.name;
          const toolArgs = content.input as Record<string, unknown>;

          this.log(`Executing tool: ${toolName}`);
          try {
            const result = await this.mcp.callTool({
              name: toolName,
              arguments: toolArgs,
            });

            // Add tool call and result to message history
            this.messages.push({
              role: "assistant",
              content: `Tool call: ${toolName}(${JSON.stringify(toolArgs)})`
            });
            
            this.messages.push({
              role: "user",
              content: JSON.stringify(result.content),
            });
            
            this.pruneMessageHistory();

            const followUpResponse = await this.anthropic.messages.create({
              model: this.MODEL_VERSION,
              max_tokens: 1000,
              messages: this.messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
              })),
            });

            if (followUpResponse.content[0].type === "text") {
              finalText.push(followUpResponse.content[0].text);
            }
          } catch (toolError) {
            this.log(`Error executing tool ${toolName}: ${toolError}`);
            finalText.push(`Error executing tool ${toolName}: ${toolError}`);
            
            // Add error to message history
            this.messages.push({
              role: "user",
              content: `Error executing tool ${toolName}: ${toolError}`
            });
            this.pruneMessageHistory();
          }
        }
      }

      const finalResponse = finalText.join("\n");
      this.messages.push({ role: "assistant", content: finalResponse });
      this.pruneMessageHistory();
      return finalResponse;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(chalk.red("Error processing query:"), errorMessage);
      
      // Check for authentication errors
      if (errorMessage.includes("401") || 
          errorMessage.includes("authentication_error") || 
          errorMessage.includes("invalid x-api-key") ||
          errorMessage.includes("unauthorized")) {
        console.error(chalk.red("\nAuthentication error with Anthropic API. Please check your API key:"));
        console.error(chalk.yellow("1. Ensure your API key is valid and active"));
        console.error(chalk.yellow("2. Make sure it starts with 'sk-ant-' or 'sk-'"));
        console.error(chalk.yellow("3. Check for extra spaces or quotes in your key"));
        console.error(chalk.yellow("4. Consider regenerating a new API key at https://console.anthropic.com/"));
        throw new Error("Anthropic API authentication failed");
      }
      
      // Try to reconnect if we lost the server connection
      if (errorMessage.includes("ECONNRESET") || 
          errorMessage.includes("disconnected") ||
          errorMessage.includes("broken pipe")) {
        console.log(chalk.yellow("\nConnection to server lost. Attempting to reconnect..."));
        try {
          await this.connectToServer(1);
          console.log(chalk.green("Reconnected to server. Please try your query again."));
        } catch (reconnectError) {
          console.error(chalk.red("Failed to reconnect: "), reconnectError);
        }
      }
      
      throw e;
    }
  }

  async cleanup() {
    try {
      // Close MCP connection
      if (this.transport) {
        try {
          await this.mcp.close();
        } catch (e) {
          this.log(`Error closing MCP connection: ${e}`);
        }
        this.transport = null;
      }

      // Reset state
      this.tools = [];
      this.messages = [];
    } catch (e) {
      console.error(chalk.red("Error during cleanup:"), e);
      throw e;
    }
  }
} 