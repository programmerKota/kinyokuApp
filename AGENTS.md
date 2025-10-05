# Agent Configuration

This repository contains Japanese text. To prevent mojibake and keep files consistent, follow these rules for every file you create or modify.

## Encoding and Newlines

- Save all files as UTF-8 without BOM.
- Do not insert a BOM in any file (JSON, TS/TSX, JS, MD, YAML, etc.).
- Use LF newlines (`\n`) across all platforms.
- When adding Japanese text, write it as plain characters (not `\uXXXX` escapes).

## Editor/Tooling Hints

- If the editor supports it, set default encoding to `UTF-8` and disable auto-guess.
- Prefer pasting/copying strings directly in UTF-8.
- If a file appears garbled, re-save it explicitly as UTF-8 (no BOM) before further edits.

These rules apply to the entire repository.

