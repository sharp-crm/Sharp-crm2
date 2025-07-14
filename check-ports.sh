#!/bin/bash

# Port Checker Script for Sharp CRM
echo "🔍 Sharp CRM Port Checker"
echo "========================"

# Function to check port status
check_port_status() {
    local port=$1
    local service=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port)
        local process_name=$(ps -p $pid -o comm= 2>/dev/null)
        echo "❌ Port $port ($service): IN USE by PID $pid ($process_name)"
        
        # Show how to kill it
        echo "   💡 To free this port, run: kill $pid"
        return 1
    else
        echo "✅ Port $port ($service): AVAILABLE"
        return 0
    fi
}

# Check required ports
echo ""
echo "📋 Checking required ports..."
echo ""

check_port_status 3000 "Backend API"
check_port_status 5173 "Frontend Dev Server"
check_port_status 8000 "DynamoDB Local (optional)"

echo ""

# Summary
all_free=true
if ! lsof -i :3000 >/dev/null 2>&1 && ! lsof -i :5173 >/dev/null 2>&1; then
    echo "🎉 All required ports are free! You can start the application."
    echo ""
    echo "🚀 To start:"
    echo "   Backend:  cd backend && npm run dev"
    echo "   Frontend: cd frontend && npm run dev"
else
    echo "⚠️  Some ports are in use. Free them before starting the application."
    echo ""
    echo "🔧 Quick fix:"
    echo "   Run: ./fix.sh (includes automatic port cleanup)"
fi

echo ""
echo "🔗 Expected URLs when running:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend:  http://localhost:3000"
echo "   • Health:   http://localhost:3000/health"
