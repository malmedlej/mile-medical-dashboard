#!/bin/bash
###############################################################################
# Update Frontend Azure Function URL
# Run this after successful Azure deployment
###############################################################################

FUNCTION_APP_NAME="mile-medical-sharepoint-func"
PRODUCTION_URL="https://${FUNCTION_APP_NAME}.azurewebsites.net/api/sharepoint-rfq"
FRONTEND_FILE="tie/js/sharepoint-client.js"

echo "🔧 Updating Frontend Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Function App: $FUNCTION_APP_NAME"
echo "Production URL: $PRODUCTION_URL"
echo "Frontend File: $FRONTEND_FILE"
echo ""

# Check if file exists
if [ ! -f "$FRONTEND_FILE" ]; then
    echo "❌ Error: $FRONTEND_FILE not found"
    echo "   Make sure you're running this from the repository root"
    exit 1
fi

# Backup original file
cp "$FRONTEND_FILE" "${FRONTEND_FILE}.backup"
echo "✅ Backup created: ${FRONTEND_FILE}.backup"

# Update the URL
if grep -q "localhost:7071" "$FRONTEND_FILE"; then
    # Replace localhost URL with production URL
    sed -i.tmp "s|http://localhost:7071/api/sharepoint-rfq|${PRODUCTION_URL}|g" "$FRONTEND_FILE"
    rm "${FRONTEND_FILE}.tmp" 2>/dev/null
    echo "✅ Updated Azure Function URL to production"
else
    echo "⚠️  localhost URL not found in file"
    echo "   Please manually update the azureFunctionUrl in $FRONTEND_FILE"
    exit 1
fi

# Show the change
echo ""
echo "📝 Updated Configuration:"
grep -A 1 "azureFunctionUrl" "$FRONTEND_FILE" | head -2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Frontend URL Updated Successfully!"
echo ""
echo "Next Steps:"
echo "1. Review the changes: git diff $FRONTEND_FILE"
echo "2. Test locally if possible"
echo "3. Commit changes: git add $FRONTEND_FILE"
echo "4. Commit: git commit -m 'Update Azure Function URL to production'"
echo "5. Push: git push origin main"
echo "6. Deploy frontend (if not auto-deployed)"
echo ""
echo "To restore original:"
echo "  cp ${FRONTEND_FILE}.backup $FRONTEND_FILE"
