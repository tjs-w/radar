# Radar

Radar is a menu-bar application that scans your local network for services using mDNS and UPnP discovery protocols. It runs in your system tray and provides notifications when new devices are found.

## Features

- **Network Discovery**: Scans for services using mDNS (Bonjour) and UPnP (SSDP)
- **Menu-bar App**: Runs in your system tray for easy access
- **Notifications**: Alerts you when new devices are discovered
- **Compact UI**: Displays discovered services in a clean, organized interface
- **Auto-scanning**: Periodically scans your network for new devices

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Setup

1. Clone the repository
2. Install dependencies:

   ```
   npm install
   ```

3. Run in development mode:

   ```
   npm run tauri dev
   ```

### Building

To build the application for production:

```
npm run tauri build
```

This will create binaries for your current platform in the `src-tauri/target/release` directory.

## License

MIT
