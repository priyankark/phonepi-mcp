# PhonePi MCP: Turn your phone into a toolbox for AI assistants using Model Context Protocol

A powerful MCP server and companion app that allows you to manage and control your phone remotely using natural language commands via your favorite MCP-supported AI apps such as Cursor and Claude Desktop. This project provides a comprehensive set of tools and APIs to interact with your mobile device programmatically.

## Overview

Phone MCP enables you to:
- Manage contacts and messages
- Handle snippets and notes
- Control phone settings and notifications
- Prepare SMS messages for confirmation on your phone and make calls
- Share content across apps
- Monitor battery status
- Set timers and reminders
- Find your phone with audio alerts

## Security
Security is a high concern. Here are a few aspects taken into account around security:
- You are completely in charge around hosting the MCP server locally. The code is completely open source.
- On the app front, you are in charge of what permissions to give depending on the features you want to use.
- The app and the server are linked over your local network. There's no 3p remote servers involved in linking.
- It is highly recommended you use this app over a secure network. Avoid public networks like airports and restaurants.
- Tailscale is highly recommended for creating a private & secure VPN to connect your phone and desktops

## Getting Started

For detailed documentation, features, and setup instructions, please visit:
[phonepimcp.com](https://phonepimcp.com)

## Support & Issues

If you encounter any bugs or have feature requests, please [open an issue](https://github.com/priyankark/phonepi-mcp/issues) on our GitHub repository.

### Background connections (Android app 1.0.1 and later)

Connect to your desktop server, then enable **Background Service** while PhonePi MCP is open. Android displays a persistent notification while the service keeps the same connection and tool handlers active. The app retries after network changes or server restarts; your phone and desktop must remain reachable over your local network or VPN.

Reopen PhonePi MCP after force-stopping it or restarting the phone. Continuous background connections are Android-only; keep the iOS app open. Camera capture and the SMS composer require the app to be in the foreground. `send_sms` prepares a message in your messaging app, where you confirm sending; a successful composer launch does not confirm delivery.

To report a connection problem, include the app version, Android version, phone model, server version, and whether the failure occurs when enabling the service or after a network change.

## Contributing

We welcome contributions from the community! Here's how you can contribute:

1. **Fork the Repository**
   - Create your own fork of the code
   - Make your changes in a new branch

2. **Code Style**
   - Follow the existing code style and conventions
   - Include comments where necessary
   - Write clear commit messages

3. **Testing**
   - Wait for the maintainer to test your changes

4. **Submit a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Wait for review and address any feedback

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

If you discover any security-related issues, please open an issue instead of using the issue tracker.
