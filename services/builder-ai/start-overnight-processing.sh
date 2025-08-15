#!/bin/bash

# 🌙 Start Overnight Processing Script
# Simple command to begin overnight continuous processing of all 8 contracts

echo "🌙 STARTING OVERNIGHT PROCESSING"
echo "==============================="
echo "📅 Started: $(date)"
echo "📂 Processing 8 contracts sequentially"
echo "📁 Reports will be saved to: ./overnight-reports/"
echo ""

# Create reports directory if it doesn't exist
mkdir -p ./overnight-reports

# Start the overnight processor
echo "🚀 Launching overnight processor..."
node scripts/overnight-continuous-processor.js

echo ""
echo "✅ Overnight processing completed at: $(date)"
echo "📁 Check ./overnight-reports/ for downloadable reports"
echo "📊 Review OVERNIGHT-PROCESSING-SUMMARY-*.md for overall results"
