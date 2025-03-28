#!/bin/bash

# Exit on error
set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Ensure working directory is clean
if [[ -n $(git status -s) ]]; then
  echo "Working directory is not clean. Please commit or stash changes first."
  exit 1
fi

# Run tests (when we have them)
# npm test

# Build the project
npm run build

# Update permissions for CLI
chmod +x dist/cli.js

# Create a new version tag
git tag -a "v$VERSION" -m "Release v$VERSION"

# Push the tag
git push origin "v$VERSION"

# Publish to npm
npm publish

echo "Released version $VERSION successfully!" 