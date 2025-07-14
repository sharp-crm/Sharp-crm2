#!/bin/bash

# Sharp CRM Fix Script
# This script fixes common issues in the application

echo "🔧 Sharp CRM Fix Script"
echo "======================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    echo "   🔍 Checking port $port..."
    if check_port $port; then
        echo "   ⚠️  Port $port is in use. Finding process..."
        local pid=$(lsof -ti :$port)
        if [ ! -z "$pid" ]; then
            echo "   🔄 Stopping process $pid on port $port..."
            kill $pid 2>/dev/null || sudo kill $pid 2>/dev/null
            sleep 2
            if check_port $port; then
                echo "   ❌ Failed to free port $port. You may need to stop it manually."
                echo "   💡 Run: kill \$(lsof -ti :$port)"
                return 1
            else
                echo "   ✅ Port $port is now free"
            fi
        fi
    else
        echo "   ✅ Port $port is available"
    fi
    return 0
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Fix 1: Install dependencies if needed
echo "1. 🔍 Checking dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "   📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

if [ ! -d "backend/node_modules" ]; then
    echo "   📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

echo "   ✅ Dependencies checked"
echo ""

# Fix 2: Build backend
echo "2. 🏗️  Building backend..."
cd backend
if npm run build; then
    echo "   ✅ Backend build successful"
else
    echo "   ❌ Backend build failed"
    echo "   Check TypeScript errors above"
    cd ..
    exit 1
fi
cd ..
echo ""

# Fix 3: Check environment files
echo "3. 🌍 Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    echo "   📄 Creating backend .env from example..."
    cp backend/.env.example backend/.env
fi

if [ ! -f "frontend/.env" ]; then
    echo "   📄 Creating frontend .env..."
    echo "VITE_API_URL=http://localhost:3000/api" > frontend/.env
fi

# Check if frontend .env has correct API URL
if grep -q "localhost:8080" frontend/.env; then
    echo "   🔧 Fixing API URL in frontend .env..."
    sed -i '' 's/localhost:8080/localhost:3000/g' frontend/.env
fi

echo "   ✅ Environment files configured"
echo ""

# Fix 4: Check and free ports
echo "4. 🔌 Checking ports..."
kill_port 3000  # Backend port
kill_port 5173  # Frontend port
echo ""

# Fix 5: Run linting (optional)
echo "5. 🧹 Running linting fixes..."
cd frontend
echo "   📝 Running ESLint..."
npm run lint 2>/dev/null || echo "   ⚠️  ESLint found issues (check output above)"
cd ..
echo ""

# Fix 6: Check Docker setup
echo "6. 🐳 Checking Docker setup..."
if command_exists docker; then
    echo "   ✅ Docker is installed"
    if command_exists docker-compose; then
        echo "   ✅ Docker Compose is installed"
        echo "   💡 You can run: docker-compose up -d"
    else
        echo "   ⚠️  Docker Compose not found"
        echo "   💡 Install Docker Compose to use containerized setup"
    fi
else
    echo "   ⚠️  Docker not found"
    echo "   💡 Install Docker to use containerized setup"
fi
echo ""

# Summary
echo "🎉 Fix script completed!"
echo ""
echo "📋 Summary of fixes applied:"
echo "   • Dependencies installed"
echo "   • Backend TypeScript build fixed"
echo "   • Environment files configured"
echo "   • API URL corrected (frontend → backend)"
echo ""
echo "🚀 Next steps:"
echo "   1. Start backend: cd backend && npm run dev"
echo "   2. Start frontend: cd frontend && npm run dev"
echo "   3. Or use Docker: docker-compose up -d"
echo ""
echo "🔗 URLs:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend: http://localhost:3000"
echo "   • API Health: http://localhost:3000/health"
