# Contributing to Quatrix

First off, thank you for considering contributing to Quatrix! It's people like you that make Quatrix such a great tool for Quatrix.

## Code of Conduct

By participating in this project, you agree to abide by the terms of our Code of Conduct. (In short: be excellent to each other).

## How Can I Contribute?

### Reporting Bugs

- Before creating bug reports, please check the existing issues as you might find out that you don't need to create one.
- When you are creating a bug report, please include as many details as possible (OS, Node version, logs, steps to reproduce).

### Suggesting Enhancements

- Enhancement suggestions are tracked as GitHub issues.
- Explain the behavior you would like to see and why it would be beneficial to most Quatrix users.

### Pull Requests

1.  **Fork the repo** and create your branch from `main`.
2.  **Install dependencies** using `npm run install-all`.
3.  **Make your changes**. If you've added code that should be tested, add tests.
4.  **Ensure the build passes**. Run `npx tsc` in both `client` and `server` folders.
5.  **Write a clear commit message** (Semantic commits are preferred: `feat: ...`, `fix: ...`, `docs: ...`).
6.  **Submit a Pull Request** describing your changes in detail.

## Style Guide

- **TypeScript**: Use strict typing where possible.
- **Frontend**: Follow the existing "glassmorphism" design system using Tailwind CSS.
- **Backend**: Ensure all new API endpoints are protected by the JWT middleware if they manage server resources.

## Need Help?

If you have questions, feel free to open an issue for discussion.

---

_Inspired by Quatrix._
