# DEX Vite

A modern React application built with Vite, TypeScript, and Tailwind CSS.

## Tech Stack

- React 19 - Component-based user interface library
- TypeScript - Statically typed JavaScript
- Vite - Development server and build tool
- Tailwind CSS v4 - Utility-first CSS framework
- React Router DOM - Client-side routing
- Lucide React - SVG icon library

## Prerequisites

- Node.js 18+
- npm/yarn/pnpm

## Installation

```bash
git clone <repository-url>
cd dex-vite
npm install
```

## Development

```bash
npm run dev
```

Application runs on `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## Scripts

- `dev` - Start development server
- `build` - TypeScript compilation and production build
- `lint` - Run ESLint code analysis
- `preview` - Serve production build locally
- `format` - Format code with Prettier

## Project Structure

```
src/
├── components/     # Reusable React components
├── pages/         # Route-based page components
├── styles/        # Global styles and Tailwind config
└── main.tsx       # Application entry point
```

## Code Quality

The project includes ESLint for code linting and Prettier for code formatting. Run these commands before committing:

```bash
npm run lint
npm run format
```

## Contributing

1. Create feature branch from main
2. Make changes following TypeScript and React best practices
3. Run linting and formatting
4. Submit pull request with descriptive commit messages

## License

Private project - not licensed for public use.