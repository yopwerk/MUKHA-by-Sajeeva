#!/bin/bash
# Auto-push script with smart commit message generation

cd "$(dirname "$0")" || exit 1

# Check if there are changes
if ! git diff --quiet HEAD; then
    echo "📝 Detecting changes..."
    
    # Get list of changed files
    CHANGED_FILES=$(git diff --name-only HEAD)
    
    # Generate smart commit message based on files
    JS_CHANGES=$(echo "$CHANGED_FILES" | grep -c "\.js$" || true)
    CSS_CHANGES=$(echo "$CHANGED_FILES" | grep -c "\.css$" || true)
    HTML_CHANGES=$(echo "$CHANGED_FILES" | grep -c "\.html$" || true)
    
    MESSAGE="chore: update"
    DETAILS=""
    
    if [ "$HTML_CHANGES" -gt 0 ]; then
        DETAILS="$DETAILS, HTML content"
    fi
    if [ "$CSS_CHANGES" -gt 0 ]; then
        DETAILS="$DETAILS, styles"
    fi
    if [ "$JS_CHANGES" -gt 0 ]; then
        DETAILS="$DETAILS, scripts"
    fi
    
    if [ -n "$DETAILS" ]; then
        MESSAGE="chore: update$(echo "$DETAILS" | sed 's/^,//')"
    fi
    
    echo "📌 Commit message: $MESSAGE"
    echo ""
    echo "Changed files:"
    echo "$CHANGED_FILES" | sed 's/^/  - /'
    echo ""
    
    read -p "✅ Push dengan pesan ini? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "$MESSAGE"
        git push
        echo "✨ Push selesai!"
    else
        echo "❌ Dibatalkan"
    fi
else
    echo "⚠️  Tidak ada perubahan untuk di-push"
fi
