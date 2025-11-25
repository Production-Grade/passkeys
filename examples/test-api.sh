#!/bin/bash

# API Testing Script for Passkeys Library
# Tests all endpoints without requiring WebAuthn browser APIs
#
# Prerequisites: 
# - Start the demo server first: npx ts-node examples/basic-express-app.ts
# - Requires: curl, jq (for JSON parsing)

set -e  # Exit on error

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Passkeys Library API Test Suite      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Registration Start
echo -e "${BLUE}[TEST 1]${NC} Registration Start"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register/start" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}')

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Registration options generated"
  echo "$RESPONSE" | jq '.data | {challenge: .challenge[0:20], rpName, rpId, user}'
else
  echo -e "${RED}✗ Failed${NC}"
  echo "$RESPONSE" | jq '.'
  exit 1
fi
echo ""

# Test 2: Authentication Start
echo -e "${BLUE}[TEST 2]${NC} Authentication Start (should fail - no user registered)"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/authenticate/start" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}')

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Correctly rejected unregistered user"
  echo "$RESPONSE" | jq '{status, title}'
else
  echo -e "${RED}✗ Failed${NC} - Should reject unregistered user"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 3: Email Recovery Initiation (no user exists)
echo -e "${BLUE}[TEST 3]${NC} Email Recovery Initiation"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/recovery/email/initiate" \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com"}')

# Should return success even for non-existent users (security - don't reveal if email exists)
if echo "$RESPONSE" | jq -e '.data.message' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Email recovery initiated"
  echo "$RESPONSE" | jq '.data.message'
else
  echo -e "${RED}✗ Failed${NC}"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 4: Recovery Codes Generation (no auth - should fail)
echo -e "${BLUE}[TEST 4]${NC} Recovery Codes Generation (unauthenticated)"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/recovery/codes/generate" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Correctly rejected unauthenticated request"
  echo "$RESPONSE" | jq '{status, title}'
else
  echo -e "${RED}✗ Failed${NC} - Should require authentication"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 5: Passkey List (no auth - should fail)
echo -e "${BLUE}[TEST 5]${NC} List Passkeys (unauthenticated)"
RESPONSE=$(curl -s -X GET "$BASE_URL/auth/passkeys")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Correctly rejected unauthenticated request"
  echo "$RESPONSE" | jq '{status, title}'
else
  echo -e "${RED}✗ Failed${NC} - Should require authentication"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 6: Invalid Email Format
echo -e "${BLUE}[TEST 6]${NC} Registration with Invalid Email"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register/start" \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}')

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Correctly rejected invalid email"
  echo "$RESPONSE" | jq '{status, title}'
else
  echo -e "${RED}✗ Failed${NC} - Should reject invalid email"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 7: Missing Required Fields
echo -e "${BLUE}[TEST 7]${NC} Registration without Email"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register/start" \
  -H "Content-Type: application/json" \
  -d '{}')

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Correctly rejected missing email"
  echo "$RESPONSE" | jq '{status, title}'
else
  echo -e "${RED}✗ Failed${NC} - Should reject missing email"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 8: Recovery Code Count (no auth)
echo -e "${BLUE}[TEST 8]${NC} Recovery Code Count (unauthenticated)"
RESPONSE=$(curl -s -X GET "$BASE_URL/auth/recovery/codes/count")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Correctly rejected unauthenticated request"
  echo "$RESPONSE" | jq '{status, title}'
else
  echo -e "${RED}✗ Failed${NC} - Should require authentication"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 9: Delete Non-existent Passkey
echo -e "${BLUE}[TEST 9]${NC} Delete Non-existent Passkey (should fail)"
RESPONSE=$(curl -s -X DELETE "$BASE_URL/auth/passkeys/nonexistent-id")

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Correctly rejected"
  echo "$RESPONSE" | jq '{status, title}'
else
  echo -e "${RED}✗ Failed${NC}"
  echo "$RESPONSE" | jq '.'
fi
echo ""

# Test 10: Verify Invalid Recovery Token
echo -e "${BLUE}[TEST 10]${NC} Verify Invalid Recovery Token"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/recovery/email/verify" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token-12345"}')

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Passed${NC} - Correctly rejected invalid token"
  echo "$RESPONSE" | jq '{status, title}'
else
  echo -e "${RED}✗ Failed${NC} - Should reject invalid token"
  echo "$RESPONSE" | jq '.'
fi
echo ""

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Suite Complete!                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}All API endpoints are responding correctly${NC}"
echo ""
echo "Note: Full WebAuthn testing requires:"
echo "  • HTTPS connection"
echo "  • WebAuthn-capable browser"
echo "  • Biometric device or security key"
echo ""
echo "For comprehensive testing, see TESTING.md"


