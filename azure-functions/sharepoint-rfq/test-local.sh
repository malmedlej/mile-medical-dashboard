#!/bin/bash

###############################################################################
# Local Azure Function Testing Script
# Test SharePoint RFQ Integration before deployment
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="http://localhost:7071/api/sharepoint-rfq"

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if function is running
check_function_running() {
    if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
        print_error "Azure Function not running on localhost:7071"
        print_info "Start it with: func start"
        exit 1
    fi
    print_success "Azure Function is running"
}

# Test CREATE endpoint
test_create() {
    print_header "Test 1: CREATE RFQ"
    
    RESPONSE=$(curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d '{
            "rfqId": "TEST-'$(date +%s)'",
            "matchedItems": [
                {"catalog_number": "12345", "description": "Test Product 1", "quantity": 10},
                {"catalog_number": "67890", "description": "Test Product 2", "quantity": 5}
            ],
            "notFoundItems": ["NOTFOUND-001", "NOTFOUND-002"],
            "matchedCount": 2,
            "totalCount": 4,
            "notFound": 2,
            "matchRate": 50,
            "notes": "Automated test RFQ"
        }')
    
    if echo "$RESPONSE" | grep -q "success.*true"; then
        print_success "CREATE test passed"
        ITEM_ID=$(echo "$RESPONSE" | grep -o '"itemId":[0-9]*' | cut -d':' -f2)
        print_info "Created item ID: $ITEM_ID"
        echo "$ITEM_ID" > /tmp/last_rfq_id.txt
    else
        print_error "CREATE test failed"
        print_error "Response: $RESPONSE"
        exit 1
    fi
    
    echo ""
}

# Test LIST endpoint
test_list() {
    print_header "Test 2: LIST RFQs"
    
    RESPONSE=$(curl -s "$BASE_URL")
    
    if echo "$RESPONSE" | grep -q "success.*true"; then
        print_success "LIST test passed"
        COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
        print_info "Total RFQs: $COUNT"
    else
        print_error "LIST test failed"
        print_error "Response: $RESPONSE"
        exit 1
    fi
    
    echo ""
}

# Test GET endpoint
test_get() {
    print_header "Test 3: GET Single RFQ"
    
    if [ ! -f /tmp/last_rfq_id.txt ]; then
        print_error "No item ID found. Run CREATE test first."
        return 1
    fi
    
    ITEM_ID=$(cat /tmp/last_rfq_id.txt)
    RESPONSE=$(curl -s "$BASE_URL/$ITEM_ID")
    
    if echo "$RESPONSE" | grep -q "success.*true"; then
        print_success "GET test passed"
        RFQ_ID=$(echo "$RESPONSE" | grep -o '"rfqId":"[^"]*"' | cut -d'"' -f4)
        print_info "Retrieved RFQ: $RFQ_ID"
    else
        print_error "GET test failed"
        print_error "Response: $RESPONSE"
        exit 1
    fi
    
    echo ""
}

# Test UPDATE endpoint
test_update() {
    print_header "Test 4: UPDATE RFQ"
    
    if [ ! -f /tmp/last_rfq_id.txt ]; then
        print_error "No item ID found. Run CREATE test first."
        return 1
    fi
    
    ITEM_ID=$(cat /tmp/last_rfq_id.txt)
    RESPONSE=$(curl -s -X PATCH "$BASE_URL/$ITEM_ID" \
        -H "Content-Type: application/json" \
        -d '{
            "status": "In Progress",
            "notes": "Updated by automated test"
        }')
    
    if echo "$RESPONSE" | grep -q "success.*true"; then
        print_success "UPDATE test passed"
    else
        print_error "UPDATE test failed"
        print_error "Response: $RESPONSE"
        exit 1
    fi
    
    echo ""
}

# Test filtering
test_filter() {
    print_header "Test 5: FILTER RFQs"
    
    RESPONSE=$(curl -s "$BASE_URL?filter=Status eq 'In Progress'")
    
    if echo "$RESPONSE" | grep -q "success.*true"; then
        print_success "FILTER test passed"
        COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | cut -d':' -f2)
        print_info "Filtered results: $COUNT"
    else
        print_error "FILTER test failed"
        print_error "Response: $RESPONSE"
        exit 1
    fi
    
    echo ""
}

# Test pagination
test_pagination() {
    print_header "Test 6: PAGINATION"
    
    RESPONSE=$(curl -s "$BASE_URL?top=5&skip=0")
    
    if echo "$RESPONSE" | grep -q "success.*true"; then
        print_success "PAGINATION test passed"
    else
        print_error "PAGINATION test failed"
        print_error "Response: $RESPONSE"
        exit 1
    fi
    
    echo ""
}

# Test DELETE endpoint (optional)
test_delete() {
    print_header "Test 7: DELETE RFQ (Optional)"
    
    read -p "Delete test RFQ? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Skipping DELETE test"
        return 0
    fi
    
    if [ ! -f /tmp/last_rfq_id.txt ]; then
        print_error "No item ID found. Run CREATE test first."
        return 1
    fi
    
    ITEM_ID=$(cat /tmp/last_rfq_id.txt)
    RESPONSE=$(curl -s -X DELETE "$BASE_URL/$ITEM_ID")
    
    if echo "$RESPONSE" | grep -q "success.*true"; then
        print_success "DELETE test passed"
    else
        print_error "DELETE test failed"
        print_error "Response: $RESPONSE"
        exit 1
    fi
    
    echo ""
}

# Test error handling
test_error_handling() {
    print_header "Test 8: ERROR HANDLING"
    
    # Test missing rfqId
    print_info "Testing missing rfqId..."
    RESPONSE=$(curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d '{"matchedCount": 1}')
    
    if echo "$RESPONSE" | grep -q "error"; then
        print_success "Error handling test passed (missing rfqId)"
    else
        print_error "Error handling test failed"
    fi
    
    # Test invalid ID
    print_info "Testing invalid ID..."
    RESPONSE=$(curl -s "$BASE_URL/99999999")
    
    if echo "$RESPONSE" | grep -q "error"; then
        print_success "Error handling test passed (invalid ID)"
    else
        print_error "Error handling test failed"
    fi
    
    echo ""
}

# Main test flow
main() {
    clear
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║   Local Azure Function Testing                         ║"
    echo "║   SharePoint RFQ Integration                           ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    print_info "Testing function at: $BASE_URL"
    echo ""
    
    check_function_running
    echo ""
    
    # Run tests
    test_create
    test_list
    test_get
    test_update
    test_filter
    test_pagination
    test_error_handling
    test_delete
    
    print_header "Test Summary"
    print_success "All tests completed successfully! 🎉"
    print_info "Your function is ready for deployment to Azure"
    echo ""
    print_info "Next steps:"
    print_info "  1. Run: ./deploy.sh"
    print_info "  2. Or manually: func azure functionapp publish <function-app-name>"
    echo ""
}

# Run main
main
