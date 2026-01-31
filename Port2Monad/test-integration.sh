#!/bin/bash

# Full Integration Test: Ingestion → Analysis → Planning → Transformation

echo "🔬 MONAD MCP SERVER - FULL INTEGRATION TEST"
echo "=========================================="
echo ""

REPO="https://github.com/dapphub/ds-token"
BASE_URL="http://localhost:8012"

echo "📍 Repository: $REPO"
echo ""

# Test 1: Ingestion
echo "1️⃣  Testing Ingestion (/ingest)..."
INGEST=$(curl -s -X POST $BASE_URL/ingest \
  -H "Content-Type: application/json" \
  -d "{\"repoUrl\": \"$REPO\"}")

INGEST_SUCCESS=$(echo $INGEST | python3 -c "import sys, json; print(json.load(sys.stdin)['success'])" 2>/dev/null)
if [ "$INGEST_SUCCESS" = "True" ]; then
  echo "   ✅ Ingestion: SUCCESS"
  echo $INGEST | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"   Files: {d['stats']['totalFiles']}, Solidity: {d['stats']['solidityFiles']}\")" 2>/dev/null
else
  echo "   ❌ Ingestion: FAILED"
  exit 1
fi
echo ""

# Test 2: Analysis
echo "2️⃣  Testing Analysis (/analyze/solidity)..."
ANALYSIS=$(curl -s -X POST $BASE_URL/analyze/solidity \
  -H "Content-Type: application/json" \
  -d "{\"repoUrl\": \"$REPO\"}")

ANALYSIS_SUCCESS=$(echo $ANALYSIS | python3 -c "import sys, json; print(json.load(sys.stdin)['success'])" 2>/dev/null)
if [ "$ANALYSIS_SUCCESS" = "True" ]; then
  echo "   ✅ Analysis: SUCCESS"
  echo $ANALYSIS | python3 -c "import sys, json; d=json.load(sys.stdin)['result']; print(f\"   Contracts: {d['stats']['totalContracts']}, Functions: {d['stats']['totalFunctions']}\")" 2>/dev/null
else
  echo "   ❌ Analysis: FAILED"
  exit 1
fi
echo ""

# Test 3: Migration Planning
echo "3️⃣  Testing Migration Planning (/plan/migration)..."
PLAN=$(curl -s --max-time 120 -X POST $BASE_URL/plan/migration \
  -H "Content-Type: application/json" \
  -d "{\"repoUrl\": \"$REPO\"}")

PLAN_SUCCESS=$(echo $PLAN | python3 -c "import sys, json; print(json.load(sys.stdin)['success'])" 2>/dev/null)
if [ "$PLAN_SUCCESS" = "True" ]; then
  echo "   ✅ Migration Planning: SUCCESS"
  echo $PLAN | python3 -c "import sys, json; d=json.load(sys.stdin)['plan']; s=d['summary']; print(f\"   Recommendations: {s['totalRecommendations']} (High: {s['highConfidenceCount']}, Medium: {s['mediumConfidenceCount']})\")" 2>/dev/null
else
  echo "   ❌ Migration Planning: FAILED"
  exit 1
fi
echo ""

# Test 4: Transformation
echo "4️⃣  Testing Transformation (/transform)..."
TRANSFORM=$(curl -s --max-time 300 -X POST $BASE_URL/transform \
  -H "Content-Type: application/json" \
  -d "{\"repoUrl\": \"$REPO\"}")

TRANSFORM_SUCCESS=$(echo $TRANSFORM | python3 -c "import sys, json; print(json.load(sys.stdin)['success'])" 2>/dev/null)
if [ "$TRANSFORM_SUCCESS" = "True" ]; then
  echo "   ✅ Transformation: SUCCESS"
  echo $TRANSFORM | python3 -c "import sys, json; r=json.load(sys.stdin)['report']; print(f\"   Files Processed: {r['filesProcessed']}, Modified: {r['filesModified']}, Applied Changes: {r['totalAppliedChanges']}\")" 2>/dev/null
else
  echo "   ❌ Transformation: FAILED"
  exit 1
fi
echo ""

echo "==========================================="
echo "🎉 ALL TESTS PASSED!"
echo ""
echo "📊 SYSTEM READY FOR PRODUCTION"
echo "   ✅ Ingestion working"
echo "   ✅ Analysis working"
echo "   ✅ Migration Planning working"
echo "   ✅ Code Transformation working"
echo ""
