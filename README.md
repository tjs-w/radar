# Radar

<div align="center">
  <img src="src-tauri/icons/icon.png" width="128" height="128" alt="Radar Logo">
  <h3>Network Service Discovery Menu Bar Application</h3>
  <p>
    <em>Scan your local network for services using mDNS and UPnP protocols</em>
  </p>

[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-24C8DB?style=flat&logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat&logo=react)](https://reactjs.org)
[![Rust](https://img.shields.io/badge/Backend-Rust-000000?style=flat&logo=rust)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)

</div>

---

## 🚀 Features

### 🔍 **Network Discovery**

- **mDNS (Bonjour)**: Discover services advertised via multicast DNS
- **UPnP/SSDP**: Find Universal Plug and Play devices on your network
- **Real-time Scanning**: Continuous background discovery with live updates
- **Service Grouping**: Organize discovered services by host and service type

### 🌐 **Network Information**

- **Public IP Detection**: Show your external IP address and location
- **ASN Information**: Display Autonomous System Number and ISP details
- **Router Discovery**: Automatically detect gateway devices using IGD and STUN
- **DNS Information**: Resolve and display hostname mappings

### 🖥️ **User Interface**

- **Menu Bar Integration**: Runs in system tray for quick access
- **Desktop Notifications**: Alerts when new devices are discovered
- **Radar Visualization**: Animated radar display showing network activity
- **Theme Support**: Light and dark mode with system preference detection
- **Responsive Design**: Clean, organized interface optimized for menu bar usage

### ⚙️ **Developer Features**

- **Extensive Logging**: Configurable debug logging for all components
- **Live Development**: Hot-reload development environment
- **Type Safety**: Full TypeScript coverage with strict type checking
- **Code Quality**: ESLint, Prettier, and Husky pre-commit hooks

---

## 🏗️ Architecture

Radar is built using **Tauri v2**, combining the performance of Rust with the flexibility of React:

- **Frontend**: React 19 + TypeScript + Vite + styled-components
- **Backend**: Rust with Tauri for native system integration
- **Network Stack**: mdns-sd, ssdp-client, rupnp for protocol implementation
- **Build System**: Vite for frontend, Cargo for Rust backend

### 📁 Project Structure

```
radar/
├── src-react/                 # React frontend application
│   ├── components/           # UI components
│   │   ├── common/          # Reusable UI components
│   │   ├── layout/          # Application layout components
│   │   └── network/         # Network-specific components
│   ├── context/             # React context providers
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Backend service abstractions
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── src-tauri/                # Rust backend application
│   ├── src/                 # Rust source code
│   │   ├── commands.rs      # Tauri command handlers
│   │   ├── network_scanner.rs # Network scanning logic
│   │   ├── public_network.rs  # Public IP/ASN detection
│   │   └── router_discovery.rs # Router/gateway discovery
│   ├── icons/               # Application icons
│   └── tauri.conf.json      # Tauri configuration
└── scripts/                  # Development and build scripts
```

---

## 🔧 Development

### 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Rust** 1.70+ ([Install](https://rustup.rs/))
- **Platform-specific requirements**:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **Linux**: WebKit2GTK and related development packages

### ⚡ Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/radar.git
   cd radar
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri:dev
   ```

The application will open in a resizable window for development. The frontend will hot-reload on changes, and the Rust backend will rebuild automatically.

### 🎛️ Development Commands

#### **Primary Development**

```bash
# Standard development mode
npm run tauri:dev

# Development with specific logging
npm run tauri:dev:network     # Network operations
npm run tauri:dev:mdns        # mDNS discovery only
npm run tauri:dev:upnp        # UPnP discovery only
npm run tauri:dev:full_debug  # All debug logging
```

#### **Code Quality**

```bash
# Linting and formatting (runs automatically via Husky)
npm run lint                  # Check code style
npm run lint:fix              # Fix linting issues
npm run format                # Format with Prettier
npm run type-check            # TypeScript validation

# Dependency management
npm run check-deps            # Check for unused dependencies
```

#### **Building**

```bash
# Development build
npm run build                 # Frontend only
npm run tauri:build          # Full application build

# The built application will be in:
# src-tauri/target/release/
```

### 🐛 Debugging

Radar includes comprehensive logging capabilities:

#### **Environment Variables**

```bash
# Log specific commands only
RADAR_LOG_COMMANDS=get_public_network_info npm run tauri:dev:log_cmd

# Log local network commands
RADAR_LOG_COMMANDS=run_network_scan,discover_mdns_streaming npm run tauri:dev:log_cmd
```

#### **Feature Flags**

Enable specific debugging features during development:

- `command_logging`: Log all Tauri command invocations
- `network_logging`: Log network scanning operations
- `log_enable_mod_mdns_sd`: Enable mdns-sd crate logging
- `log_enable_mod_upnp`: Enable UPnP-related logging
- `full_debug`: Enable all logging features

---

## 📦 Building & Distribution

### 🔨 Production Build

```bash
# Create optimized production build
npm run tauri:build
```

This generates:

- **macOS**: `.dmg` installer and `.app` bundle
- **Windows**: `.exe` installer and portable executable
- **Linux**: `.deb`, `.AppImage`, and other package formats

### 📋 Build Configuration

The build process is configured in `src-tauri/tauri.conf.json`:

- **Window settings**: Size, decorations, transparency
- **Bundle configuration**: Icons, identifiers, targets
- **Security permissions**: Capabilities and CSP settings
- **Plugin configuration**: Network, notifications, clipboard access

---

## 🧪 Testing

### 🔍 Frontend Testing

```bash
# Run component tests
npm test

# Run with coverage
npm run test:coverage
```

### ⚙️ Backend Testing

```bash
# Run Rust tests
cd src-tauri
cargo test

# Run with all features
cargo test --all-features

# Run specific test modules
cargo test network_scanner
```

---

## 🤝 Contributing

### 🌟 Development Workflow

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with appropriate tests
4. **Run quality checks**: `npm run lint:fix && npm run type-check`
5. **Commit using conventional commits**: `feat: add amazing feature`
6. **Push and create a Pull Request**

### 📝 Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation updates
- `style`: Code formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### 🔒 Code Quality

All contributions must pass:

- **ESLint** validation
- **TypeScript** type checking
- **Prettier** formatting
- **Unit tests** where applicable
- **Pre-commit hooks** (automatically enforced)

---

## 🚨 Troubleshooting

### Common Issues

#### **Build Failures**

- Ensure Rust is up to date: `rustup update`
- Clear caches: `rm -rf node_modules dist src-tauri/target && npm install`
- Check platform-specific prerequisites

#### **Network Discovery Issues**

- **Permissions**: Ensure network access permissions are granted
- **Firewall**: Check that multicast traffic is allowed
- **Virtual Networks**: Some VPN/VM networks may interfere with discovery

#### **Development Environment**

- **Port conflicts**: Default dev server runs on port 1420
- **Hot reload issues**: Try restarting the dev server
- **Type errors**: Run `npm run type-check` for detailed diagnostics

### 📋 Debug Information

When reporting issues, include:

```bash
# System information
npm --version
rustc --version
tauri --version

# Build with debug info
npm run tauri:dev:full_debug 2>&1 | tee debug.log
```

---

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Tauri](https://tauri.app)**: Cross-platform app framework
- **[mdns-sd](https://crates.io/crates/mdns-sd)**: Pure Rust mDNS implementation
- **[ssdp-client](https://crates.io/crates/ssdp-client)**: SSDP discovery protocol
- **[React](https://reactjs.org)**: Frontend framework
- **[styled-components](https://styled-components.com)**: CSS-in-JS styling

---

<div align="center">
  <p>
    <strong>Built with ❤️ for network discovery and system monitoring</strong>
  </p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#%EF%B8%8F-architecture">Architecture</a> •
    <a href="#-development">Development</a> •
    <a href="#-building--distribution">Building</a> •
    <a href="#-troubleshooting">Troubleshooting</a>
  </p>
</div>
