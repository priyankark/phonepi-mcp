# PhonePi MCP

A MCP server that lets you control your phone from your favorite AI apps!

## Prerequisites
You need to setup the PhonePi MCP app on your phone. Please visit [PhonePi MCP](https://phonepimcp.com) for instructions.

## Installation

Install the package globally:

```bash
npm install -g phonepi-mcp
```

Or run directly with npx:

```bash
npx phonepi-mcp
```

## Setup
Simply add the following MCP config to your AI app:
```
{
  "mcpServers": {
    "phonepi-mcp": {
      "command": "npx",
      "args": [
        "phonepi-mcp",
        "start"
      ]
    }
  }
}
```


## Usage

PhonePi MCP provides a command-line interface to control the MCP server.

### Commands

- `start`: Start the MCP server
- `stop`: Stop the running MCP server
- `status`: Check if the MCP server is running
- `restart`: Restart the MCP server

### Starting the Server

```bash
phonepi-mcp start
```

Options:
- `-p, --port <port>`: Specify the port to run the server on (default: 11041)
- `-b, --background`: Run the server in the background

Example:
```bash
phonepi-mcp start -p 8080 -b
```

### Checking Server Status

```bash
phonepi-mcp status
```

### Stopping the Server

```bash
phonepi-mcp stop
```

### Restarting the Server

```bash
phonepi-mcp restart
```

Options:
- `-p, --port <port>`: Specify the port to run the server on (default: 11041)
- `-b, --background`: Run the server in the background

## Connecting Your Phone

1. Install the PhonePi MCP app on your phone
2. Start the server on your computer using `phonepi-mcp start`
3. In the app, connect to your computer's IP address and port (default 11041)

## Features

- Remote phone control via MCP protocol
- Get battery level
- Send SMS messages
- Make phone calls
- Find your phone by making it beep
- Set timers and alarms
- Copy text to clipboard
- Manage contacts
- Send notifications

## Development

Build the package:

```bash
npm run build
```

Run in development mode:

```bash
npm run dev
```

## License

MIT