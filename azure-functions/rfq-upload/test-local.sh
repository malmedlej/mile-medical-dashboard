#!/bin/bash

###############################################################################
# RFQ Upload Function - Local Testing Script
###############################################################################

echo "🧪 Testing RFQ Upload Function Locally"
echo "======================================"

# Check if func command is available
if ! command -v func &> /dev/null; then
    echo "❌ Azure Functions Core Tools not found"
    echo "Install with: npm install -g azure-functions-core-tools@4"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "function.json" ]; then
    echo "❌ function.json not found. Please run from rfq-upload directory"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start function
echo "🚀 Starting function locally..."
echo "Endpoint will be: http://localhost:7071/api/rfq/upload"
echo ""
echo "Test with:"
echo "  curl -X POST http://localhost:7071/api/rfq/upload \\"
echo "    -F 'file=@test.xlsx' \\"
echo "    -F 'rfqId=TEST_001'"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd ..
func start
