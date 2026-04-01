# Gitflow Conflict Solver

A visual tool for managing GitHub branch conflicts using a drag-and-drop Gitflow topology. Built with a modern TypeScript monorepo architecture.

## 🏗 Architecture

- **`apps/web`**: Next.js frontend with React Flow for the visual branch graph and Zustand for state management.
- **`apps/api`**: Express.js backend acting as a proxy to the GitHub API, providing graph topology and conflict resolution data.
- **`packages/shared`**: Common TypeScript types, constants, and utility functions used by both apps.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- A GitHub Personal Access Token (for the API)

### Installation

```bash
# Install dependencies from the root
npm install
```

### Environment Setup

Create a `.env` file in `apps/api`:

```env
PORT=4000
GITHUB_TOKEN=your_github_token
FRONTEND_URL=http://localhost:3000
```

### Development

Run all applications in parallel using [Turborepo](https://turbo.build/):

```bash
# Start all apps in dev mode
npm run dev
```

The web app will be available at `http://localhost:3000` and the API at `http://localhost:4000`.

## 🛠 Features

- **Visual Branch Topology**: Automatically generated "swimlane" layout showing relations between `main`, `develop`, `feature`, and `hotfix` branches.
- **Active Conflict Detection**: Integrated with GitHub to detect merge conflicts (409) and provide detailed "hunk" views.
- **Gitflow Compliance**: Automatically infers branch types from naming conventions (e.g., `feature/*`, `hotfix/*`).
- **Real-time API**: Stateless backend with intelligent in-memory state management for active conflict resolution.

## 📦 Tech Stack

- **Frontend**: Next.js, Tailwind CSS, React Flow, Zustand, Octokit
- **Backend**: Express, TypeScript, Zod, Morgan, Helmet
- **Monorepo**: Turborepo, npm Workspaces

---

Developed with ❤️ as a Gitflow visual management solution.
