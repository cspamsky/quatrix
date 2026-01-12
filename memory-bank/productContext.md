# Product Context

## Why this project exists

Managing game servers, specifically CS2, often involves a steep learning curve with RCON commands and configuration files. This project aims to lower that barrier by providing a centralized, intuitive dashboard.

## Problems it solves

- **Visibility**: Admins can see server health at a glance without being in-game or checking command lines.
- **Efficiency**: Rapidly changing maps or kicking players through a UI is faster than typing long commands.
- **Accessibility**: Allows server management from any web browser.

## How it should work

- The backend connects to one or more CS2 servers using the RCON protocol.
- A WebSocket connection provides real-time updates for telemetry (CPU/RAM/Net) and console output.
- The frontend provides a rich, responsive interface with a focus on "glassmorphism" aesthetics.

## User Experience Goals

- **Instant Feedback**: Console commands should show results immediately.
- **Aesthetic Excellence**: High-end dark mode UI that feels "live" and modern.
- **Security**: Minimalist but secure access to management functions.
