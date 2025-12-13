# Test New Logistics Endpoints
# PowerShell script to test the 5 new routes

$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkaWQiOiJkaWQ6cmFuZ2thaTphZWI3ODc2MC0yNWFlLTRiMzEtYmM4Ny05OWU2ZWMyYTViYjciLCJzdWIiOiJkaWQ6cmFuZ2thaTphZWI3ODc2MC0yNWFlLTRiMzEtYmM4Ny05OWU2ZWMyYTViYjciLCJ0eXBlIjoia3ljIiwiaWF0IjoxNzY1NTk5ODI1LCJleHAiOjE3NjgxOTE4MjV9.cR03aJnlh_26r_0dWG90v8U59Bvw_deFXAP7GgT_CmU"
$BASE_URL = "http://localhost:3000/api/v1"
$HEADERS = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Testing 5 New Logistics Endpoints" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# First, get a provider ID from the existing providers
Write-Host "Step 0: Getting test provider ID..." -ForegroundColor Yellow
try {
    $providers = Invoke-RestMethod -Uri "$BASE_URL/logistics/providers" -Method Get -Headers $HEADERS
    $PROVIDER_ID = $providers.data[0].id
    Write-Host "✅ Using Provider ID: $PROVIDER_ID`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get provider ID" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Test 1: GET /logistics/providers/:id/quotes
Write-Host "`n--- Test 1: GET /logistics/providers/:id/quotes ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/logistics/providers/$PROVIDER_ID/quotes" -Method Get -Headers $HEADERS
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Quotes found: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "   First quote: $($response.data[0].method) - $($response.data[0].status)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Test 2: GET /logistics/opportunities
Write-Host "`n--- Test 2: GET /logistics/opportunities ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/logistics/opportunities" -Method Get -Headers $HEADERS
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Opportunities found: $($response.data.Count)" -ForegroundColor White
} catch {
    Write-Host "❌ Failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Test 3: GET /logistics/providers/:id/shipments
Write-Host "`n--- Test 3: GET /logistics/providers/:id/shipments ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/logistics/providers/$PROVIDER_ID/shipments" -Method Get -Headers $HEADERS
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Shipments found: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "   First shipment: $($response.data[0].tracking_number) - $($response.data[0].status)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Test 4: POST /logistics/providers/:id/favorite
Write-Host "`n--- Test 4: POST /logistics/providers/:id/favorite ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/logistics/providers/$PROVIDER_ID/favorite" -Method Post -Headers $HEADERS
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor White
} catch {
    Write-Host "❌ Failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Test 5: GET /logistics/favorites
Write-Host "`n--- Test 5: GET /logistics/favorites ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/logistics/favorites" -Method Get -Headers $HEADERS
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   Favorites found: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "   First favorite: $($response.data[0].business_name)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Failed" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan