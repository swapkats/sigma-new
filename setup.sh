#!/bin/bash

echo "🚀 Setting up Sigma AI Chat..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install React dependencies
echo "📦 Installing React dependencies..."
cd src/renderer && npm install && cd ../..

# Create necessary directories
mkdir -p models
mkdir -p data

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. The Qwen 2.5 model will be downloaded automatically on first run"
echo "3. SQLite database will be created automatically in ./data/"
echo ""
echo "🎉 Enjoy your local AI chat app!"