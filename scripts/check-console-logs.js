#!/usr/bin/env node

/**
 * This script checks for console.log statements in all JS/TS files
 * in the src directory. It's meant to be run as part of the pre-push hook.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '..', 'src-react');

// ANSI color codes
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

try {
  // Use grep to find console.log statements
  const result = execSync(`grep -r "console\\.log" --include="*.{js,jsx,ts,tsx}" ${srcDir}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'ignore'],
  });

  if (result) {
    const lines = result.split('\n').filter(Boolean);

    if (lines.length > 0) {
      console.error(`${RED}Error: Found ${lines.length} console.log statements:${RESET}`);
      lines.forEach(line => {
        console.error(`${YELLOW}${line}${RESET}`);
      });
      console.error(
        `\n${YELLOW}Please remove console.log statements or replace with console.warn/error.${RESET}`
      );

      // Exit with error code but don't block the commit/push
      // This is just a warning
      process.exit(0);
    }
  }

  console.log(`${GREEN}No console.log statements found.${RESET}`);
  process.exit(0);
} catch (error) {
  if (error.status === 1) {
    // grep returns 1 when no matches are found, which is what we want
    console.log(`${GREEN}No console.log statements found.${RESET}`);
    process.exit(0);
  }

  // Any other error is unexpected
  console.error(`${RED}Error checking for console.log statements:${RESET}`, error.message);
  process.exit(1);
}