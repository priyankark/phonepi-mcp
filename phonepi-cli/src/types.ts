import { Tool } from "@anthropic-ai/sdk/resources/messages/messages.mjs";

export interface PhonePiConfig {
  anthropicApiKey?: string;
}

export interface MCPToolResult {
  success: boolean;
  content: unknown;
  error?: string;
}

export interface PhonePiOptions {
  config?: PhonePiConfig;
  verbose?: boolean;
}

export type MCPTool = Tool;

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
} 