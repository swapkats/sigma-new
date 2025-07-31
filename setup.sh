#!/bin/bash

echo "🚀 Setting up Sigma AI Chat..."

# Check if Neo4j is installed
if ! command -v neo4j &> /dev/null; then
    echo "📦 Installing Neo4j..."
    
    # Install Neo4j based on platform
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install neo4j
        else
            echo "❌ Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
        echo 'deb https://debian.neo4j.com stable 4.4' | sudo tee -a /etc/apt/sources.list.d/neo4j.list
        sudo apt-get update
        sudo apt-get install neo4j
    else
        echo "❌ Unsupported platform. Please install Neo4j manually: https://neo4j.com/download/"
        exit 1
    fi
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install React dependencies
echo "📦 Installing React dependencies..."
cd src/renderer && npm install && cd ../..

# Configure Neo4j
echo "⚙️ Configuring Neo4j..."
neo4j-admin set-initial-password password

# Start Neo4j
echo "🚀 Starting Neo4j..."
neo4j start

# Create models directory
mkdir -p models

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. The Qwen 2.5 model will be downloaded automatically on first run"
echo "3. Neo4j is running on bolt://localhost:7687 with password 'password'"
echo ""
echo "🎉 Enjoy your local AI chat app!"