# Radar - Local Network Scanner

## Logging Options

Radar supports different logging levels to help with debugging and development:

### Command Logging

Command logging provides detailed information about each Tauri command execution, including:

- When commands are called
- What arguments were passed
- What results were returned

This is useful for debugging frontend-backend interactions.

### Full Application Logging

Full logging enables comprehensive logging throughout the application, including:

- Command logging
- Internal application processes
- Network discovery events
- Service detection and classification

## Running with Different Logging Levels

You can run the application with different logging levels using these npm scripts:

```bash
# Run with no extra logging (normal mode)
npm run tauri:dev

# Run with command logging only
npm run tauri:dev:log_cmd

# Run with full application logging
npm run tauri:dev:log_all
```

## Development Guidelines

- **Avoid Multiple Instances**: Only run one instance of `npm run tauri dev` at a time, as it's designed for auto-compilation on code changes.
- **Use Feature Flags**: Leverage Rust's feature flags for conditional functionality.
- **Log Wisely**: Keep production logs minimal, but provide detailed logs when needed for debugging.

For more detailed information about the logging system, see [COMMAND_LOGGING.md](./COMMAND_LOGGING.md).
