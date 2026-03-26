#!/bin/bash
# Quick Start Script for Hotel Management Microservices

echo "🏗 Hotel Management Docker Setup"
echo "=================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your API keys:"
    echo ""
    echo "cat > .env <<EOF"
    echo "SERPAPI_KEY=your_serpapi_key"
    echo "SUPABASE_URL=https://your-project.supabase.co"
    echo "SUPABASE_KEY=your_supabase_anon_key"
    echo "EOF"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check environment variables
SERPAPI_KEY=$(grep SERPAPI_KEY .env | cut -d'=' -f2)
SUPABASE_URL=$(grep SUPABASE_URL .env | cut -d'=' -f2)
SUPABASE_KEY=$(grep SUPABASE_KEY .env | cut -d'=' -f2)

# Mask sensitive information for display
MASKED_KEY="************"
MASKED_URL="************"

echo "🔑 Environment Configuration:"
echo "   SERPAPI_KEY: $MASKED_KEY"
echo "   SUPABASE_URL: $MASKED_URL"
echo "   SUPABASE_KEY: $MASKED_KEY"
echo ""

# Check if Docker is running
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not running!"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed!"
    echo "Please install docker-compose first"
    exit 1
fi

echo "✅ docker-compose is available"
echo ""

echo "🚀 Starting services..."
echo ""

# Build and start services
docker-compose up --build

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
echo "===================="

services=("hotel-search-wrapper" "saved-hotels" "hotel-management")
for service in "${services[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "$service"; then
        echo "✅ $service - Running"
    else
        echo "❌ $service - Not running"
    fi
done

echo ""
echo "🔍 Service Health Checks:"
echo "==========================="

# Health check function
check_health() {
    local service=$1
    local port=$2
    local name=$3

    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ $name - Healthy (http://localhost:$port/health)"
    else
        echo "❌ $name - Unhealthy (http://localhost:$port/health)"
    fi
}

check_health "hotel-search-wrapper" "5001" "Hotel Search Wrapper"
check_health "saved-hotels" "5002" "Saved Hotels"
check_health "hotel-management" "5000" "Hotel Management"

echo ""
echo "🌐 Access URLs:"
echo "==================="
echo "🔍 Hotel Search Wrapper:  http://localhost:5001/health"
echo "🏠 Saved Hotels:         http://localhost:5002/health"
echo "🎯 Hotel Management:       http://localhost:5000/health"
echo ""
echo "🎉 All services are running!"
echo ""
echo "💡 Useful commands:"
echo "   docker-compose ps              - View service status"
echo "   docker-compose logs -f [service] - View service logs"
echo "   docker-compose down             - Stop all services"
echo "   docker-compose restart [service] - Restart specific service"
echo ""
echo "📚 Documentation:"
echo "   DOCKER_SETUP_GUIDE.md - Complete Docker setup guide"
echo "   DOCKER_SERVICES_OVERVIEW.md - Service architecture documentation"
