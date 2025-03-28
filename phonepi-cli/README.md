# PhonePi CLI

AI-powered command-line interface for controlling your phone through PhonePi MCP.

## Features

- 🤖 AI-powered natural language interface
- 📱 Control your phone from the command line
- 💬 Interactive chat mode
- 🔄 Single query mode
- 🎨 Beautiful terminal UI
- 🔒 Secure API key management
- 🚀 Automatic server management

## Installation

```bash
npm install -g phonepi-cli
```

## Prerequisites

1. An Anthropic API key (get one from [Anthropic Console](https://console.anthropic.com))
2. PhonePi app installed and running on your phone

## Configuration

You can configure PhonePi CLI in two ways:

1. Environment variables:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key"
   ```

2. Command-line arguments:
   ```bash
   phonepi chat --key "your-api-key"
   ```

## Usage

### Interactive Chat Mode

Start an interactive chat session with your phone:

```bash
phonepi chat
```

### Single Query Mode

Send a single command to your phone:

```bash
phonepi query "What's my battery level?"
```

### Options

Both commands support the following options:

- `-k, --key <key>`: Anthropic API key
- `-v, --verbose`: Enable verbose logging
- `-h, --help`: Display help information
- `-V, --version`: Display version information

## Examples

1. Check battery level:
   ```bash
   phonepi query "What's my phone's battery level?"
   ```

2. Send a text message:
   ```bash
   phonepi query "Send a text to John saying I'll be late"
   ```

3. Set a timer:
   ```bash
   phonepi query "Set a timer for 5 minutes"
   ```

4. Interactive chat:
   ```bash
   phonepi chat
   ```

## How It Works

1. When you start the CLI, it automatically:
   - Starts the MCP server in the background
   - Connects to your phone
   - Sets up the AI interface

2. You can then:
   - Chat with your phone using natural language
   - Execute commands through AI
   - Get real-time responses

3. When you're done:
   - The CLI cleans up automatically
   - Stops the server
   - Closes all connections

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/phonepi-cli.git
   cd phonepi-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Link for local development:
   ```bash
   npm link
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Security

- Never share your API keys
- Store sensitive information in environment variables
- Review the permissions you grant to the CLI 