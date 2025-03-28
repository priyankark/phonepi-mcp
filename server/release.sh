#!/bin/bash

# Exit on error
set -e

# Build the project
echo "Building the project..."
npm run build

# Check if the build was successful
if [ $? -ne 0 ]; then
  echo "Build failed"
  exit 1
fi

# Set executable permission on the CLI files
echo "Setting executable permissions..."
chmod +x dist/cli.js
chmod +x dist/index.js
chmod +x dist/server-manager.js

# Prompt for version bump type
echo "What kind of version update?"
echo "1) Patch (1.0.0 -> 1.0.1)"
echo "2) Minor (1.0.0 -> 1.1.0)"
echo "3) Major (1.0.0 -> 2.0.0)"
echo "4) Skip version bump"
read -p "Enter your choice [1-4]: " versionChoice

# Bump version based on choice
if [ "$versionChoice" == "1" ]; then
  npm version patch
elif [ "$versionChoice" == "2" ]; then
  npm version minor
elif [ "$versionChoice" == "3" ]; then
  npm version major
elif [ "$versionChoice" == "4" ]; then
  echo "Skipping version bump"
else
  echo "Invalid choice, defaulting to patch"
  npm version patch
fi

# Ask to publish
read -p "Do you want to publish to npm? (y/n): " publishChoice

if [ "$publishChoice" == "y" ] || [ "$publishChoice" == "Y" ]; then
  echo "Publishing to npm..."
  npm publish
  echo "Published successfully"
else
  echo "Skipping npm publish"
fi

echo "Release script completed" 