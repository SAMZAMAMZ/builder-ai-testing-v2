#!/bin/bash
# 🚀 Builder-AI AI-Coordinated Testing Launcher
echo "🤖 BUILDER-AI AI-COORDINATED TESTING LAUNCHER"
echo "=============================================="
echo ""
echo "🎯 This script will execute comprehensive AI-coordinated testing"
echo "📊 Testing includes: System validation, Contract testing, Self-healing, Reports"
echo "⏱️  Estimated duration: 3-4 hours with AI acceleration"
echo ""

# Check if server is running
if ! curl -s http://localhost:54113/health > /dev/null; then
    echo "❌ Builder-AI server not running. Please start it first:"
    echo "   npm run build && npm run start-stable"
    exit 1
fi

echo "✅ Builder-AI server is running"
echo ""

# Ask for confirmation
read -p "🚀 Ready to start AI-coordinated testing? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Testing cancelled"
    exit 1
fi

echo ""
echo "🤖 Starting AI-Coordinated Testing..."
echo "📋 Session ID: builder-ai-test-$(date +%s)"
echo ""

# Start AI-coordinated testing
npm run ai-test

echo ""
echo "🎉 AI-Coordinated Testing Complete!"
echo ""
echo "📊 Check results in:"
echo "   - testing-results/reports/master-report-*.md"
echo "   - testing-results/ai-coordination/final-report.json"
echo ""
