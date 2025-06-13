#!/bin/bash

# Script to build and publish the plugin API package

set -e

echo "Building @super-productivity/plugin-api..."
npm run build

echo "Testing the package..."
npm pack --dry-run

echo "Ready to publish!"
echo "To publish to npm, run: npm publish --access public"
echo "To publish a beta version, run: npm publish --tag beta --access public"