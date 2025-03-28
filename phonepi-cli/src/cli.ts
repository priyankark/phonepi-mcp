#!/usr/bin/env node

import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import dotenv from "dotenv";
import { PhonePiClient } from "./client.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
);

const program = new Command();

program
  .name("phonepi")
  .description("AI-powered CLI client for PhonePi MCP")
  .version(packageJson.version);

program
  .command("chat")
  .description("Start an interactive chat session with your phone")
  .option("-k, --key <key>", "Anthropic API key (starts with 'sk-ant-' or 'sk-')")
  .option("-v, --verbose", "Enable verbose logging (logs are silent by default)")
  .option("-n, --no-silent", "Disable silent mode (equivalent to verbose)")
  .action(async (options) => {
    try {
      const config = {
        anthropicApiKey: options.key || process.env.ANTHROPIC_API_KEY,
      };

      if (!config.anthropicApiKey) {
        console.error(chalk.red("\n❌ Error: Anthropic API key is required"));
        console.error(chalk.yellow("\nYou can provide it in one of these ways:"));
        console.error(chalk.blue("1. Set ANTHROPIC_API_KEY environment variable:"));
        console.error(chalk.gray("   export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx"));
        console.error(chalk.blue("2. Create a .env file with:"));
        console.error(chalk.gray("   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx"));
        console.error(chalk.blue("3. Pass it as a parameter:"));
        console.error(chalk.gray("   phonepi chat --key sk-ant-xxxxxxxxxxxx"));
        console.error(chalk.yellow("\nGet your API key from: https://console.anthropic.com/"));
        process.exit(1);
      }

      console.log(chalk.cyan("\n📱 PhonePi CLI - Chat Mode"));
      console.log(chalk.gray("----------------------------------------"));
      
      const client = new PhonePiClient(config, options.verbose);
      
      try {
        console.log(chalk.yellow("Starting MCP server..."));
        if (!options.verbose) {
          console.log(chalk.gray("Server logs are filtered. Only errors will be shown. Use --verbose to see all logs."));
        }
        
        await client.connectToServer();
        console.log(chalk.green("🤖 Connected to PhonePi MCP server!"));
        console.log(chalk.green("✅ Ready to chat with your phone"));
        console.log(chalk.yellow("Type 'exit' or press Ctrl+C to quit\n"));
      } catch (e) {
        console.error(chalk.red("\nFailed to start the server. Please ensure:"));
        console.error(chalk.yellow("1. phonepi-mcp is installed globally:"));
        console.error(chalk.blue("   npm install -g phonepi-mcp"));
        console.error(chalk.yellow("2. The server can be launched with:"));
        console.error(chalk.blue("   npx phonepi-mcp start"));
        console.error(chalk.yellow("3. Your phone is connected and accessible"));
        console.error(chalk.yellow("4. Error details:"), e instanceof Error ? e.message : e);
        process.exit(1);
      }

      let exitRequested = false;
      
      // Handle SIGINT (Ctrl+C)
      process.on('SIGINT', async () => {
        console.log(chalk.yellow("\nGracefully shutting down..."));
        exitRequested = true;
        await client.cleanup();
        console.log(chalk.yellow("Goodbye! 👋"));
        process.exit(0);
      });

      while (!exitRequested) {
        const answer = await inquirer.prompt<{ query: string }>({
          type: "input",
          name: "query",
          message: "🗣️ " + chalk.blue("You:"),
        });

        const query = answer.query.trim();
        
        if (query.toLowerCase() === "exit") {
          exitRequested = true;
          break;
        }
        
        if (query === "") {
          continue;
        }

        console.log(chalk.gray("\nThinking...\n"));
        try {
          const response = await client.processQuery(query);
          console.log(chalk.green("🤖 Assistant:"), response, "\n");
        } catch (error) {
          console.error(chalk.red("Error:"), error instanceof Error ? error.message : error);
          console.log(chalk.yellow("You can continue chatting or type 'exit' to quit.\n"));
        }
      }

      await client.cleanup();
      console.log(chalk.yellow("\nGoodbye! 👋"));
    } catch (error) {
      console.error(chalk.red("Error:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command("query <text>")
  .description("Send a single query to your phone")
  .option("-k, --key <key>", "Anthropic API key (starts with 'sk-ant-' or 'sk-')")
  .option("-v, --verbose", "Enable verbose logging (logs are silent by default)")
  .option("-n, --no-silent", "Disable silent mode (equivalent to verbose)")
  .action(async (text, options) => {
    try {
      const config = {
        anthropicApiKey: options.key || process.env.ANTHROPIC_API_KEY,
      };

      if (!config.anthropicApiKey) {
        console.error(chalk.red("\n❌ Error: Anthropic API key is required"));
        console.error(chalk.yellow("\nYou can provide it in one of these ways:"));
        console.error(chalk.blue("1. Set ANTHROPIC_API_KEY environment variable:"));
        console.error(chalk.gray("   export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx"));
        console.error(chalk.blue("2. Create a .env file with:"));
        console.error(chalk.gray("   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx"));
        console.error(chalk.blue("3. Pass it as a parameter:"));
        console.error(chalk.gray("   phonepi query \"your question\" --key sk-ant-xxxxxxxxxxxx"));
        console.error(chalk.yellow("\nGet your API key from: https://console.anthropic.com/"));
        process.exit(1);
      }

      console.log(chalk.cyan("\n📱 PhonePi CLI - Query Mode"));
      console.log(chalk.gray("----------------------------------------"));

      const client = new PhonePiClient(config, options.verbose);
      
      try {
        console.log(chalk.yellow("Starting MCP server..."));
        if (!options.verbose) {
          console.log(chalk.gray("Server logs are filtered. Only errors will be shown. Use --verbose to see all logs."));
        }
        
        await client.connectToServer();
        console.log(chalk.green("Connected to PhonePi MCP server!"));
      } catch (e) {
        console.error(chalk.red("\nFailed to start the server. Please ensure:"));
        console.error(chalk.yellow("1. phonepi-mcp is installed globally:"));
        console.error(chalk.blue("   npm install -g phonepi-mcp"));
        console.error(chalk.yellow("2. The server can be launched with:"));
        console.error(chalk.blue("   npx phonepi-mcp start"));
        console.error(chalk.yellow("3. Your phone is connected and accessible"));
        console.error(chalk.yellow("4. Error details:"), e instanceof Error ? e.message : e);
        process.exit(1);
      }

      try {
        console.log(chalk.gray("\nProcessing query...\n"));
        const response = await client.processQuery(text);
        console.log(chalk.green("🤖 Response:"), response);
      } catch (error) {
        console.error(chalk.red("Error processing query:"), error instanceof Error ? error.message : error);
        process.exit(1);
      } finally {
        await client.cleanup();
      }
    } catch (error) {
      console.error(chalk.red("Error:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse(); 