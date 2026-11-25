#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Pauses the portfolio-api project by tearing down all AWS resources.

.DESCRIPTION
    Saves the API Key value to a local state file, then destroys the application
    stack, empties the CDK assets bucket, and removes the CDK bootstrap. After
    this script finishes, monthly AWS cost for this project should be $0.00.
    Resume with resume-stack.ps1 — it reads the saved state and re-creates the
    API Key with the SAME value, so existing clients keep working.

.PARAMETER Env
    Target environment (dev, test, prod). Defaults to "dev".

.PARAMETER KeepBootstrap
    Skip removing the CDK bootstrap stack. Default behavior is to remove it,
    since no other CDK project uses this account/region.

.EXAMPLE
    ./scripts/pause-stack.ps1
    ./scripts/pause-stack.ps1 -Env dev -KeepBootstrap
#>

[CmdletBinding()]
param(
    [string]$Env = "dev",
    [switch]$KeepBootstrap
)

$ErrorActionPreference = "Stop"

$AwsProfile = "portfolio-api"
$Region = "eu-west-1"
$StackName = "PortfolioApiStack-$Env"
$StateDir = Join-Path (Join-Path $PSScriptRoot "..") ".stack-state"
$StateFile = Join-Path $StateDir "paused-state.$Env.json"

Write-Host ""
Write-Host "=== Pausing portfolio-api ($Env) ===" -ForegroundColor Cyan
Write-Host "Profile: $AwsProfile  |  Region: $Region  |  Stack: $StackName"
Write-Host ""

# 1. Verify AWS credentials work
Write-Host "[1/5] Verifying AWS credentials..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --profile $AwsProfile --output json | ConvertFrom-Json
if (-not $identity.Account) {
    Write-Error "Cannot authenticate with profile '$AwsProfile'. Run 'aws configure --profile $AwsProfile' first."
    exit 1
}
$accountId = $identity.Account
Write-Host "    Account: $accountId" -ForegroundColor Green

# 2. Save state (API key value) before destroying the stack
Write-Host ""
Write-Host "[2/5] Saving stack state to '$StateFile'..." -ForegroundColor Yellow
aws cloudformation describe-stacks --stack-name $StackName --profile $AwsProfile --region $Region 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    Stack does not exist - nothing to save, skipping pause." -ForegroundColor Gray
    exit 0
}

$outputs = aws cloudformation describe-stacks --stack-name $StackName --profile $AwsProfile --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
$keyId = ($outputs | Where-Object { $_.OutputKey -eq "PortfolioApiKeyId" }).OutputValue
$apiUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiUrl" }).OutputValue

if (-not $keyId) {
    Write-Error "Could not find PortfolioApiKeyId in stack outputs."
    exit 1
}

$apiKeyValue = aws apigateway get-api-key --api-key $keyId --include-value --profile $AwsProfile --region $Region --query "value" --output text
if (-not $apiKeyValue -or $apiKeyValue -eq "None") {
    Write-Error "Could not retrieve API key value for keyId '$keyId'."
    exit 1
}

if (-not (Test-Path $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir | Out-Null
}

$state = [ordered]@{
    env         = $Env
    pausedAt    = (Get-Date -Format "o")
    accountId   = $accountId
    region      = $Region
    apiKeyValue = $apiKeyValue
    previousUrl = $apiUrl
}
$state | ConvertTo-Json | Out-File -FilePath $StateFile -Encoding utf8
Write-Host "    Saved API key value (length: $($apiKeyValue.Length)) and previous URL." -ForegroundColor Green

# 3. Destroy application stack
Write-Host ""
Write-Host "[3/5] Destroying stack '$StackName'..." -ForegroundColor Yellow
npx cdk destroy $StackName --context env=$Env --profile $AwsProfile --force
if ($LASTEXITCODE -ne 0) {
    Write-Error "cdk destroy failed."
    exit 1
}
Write-Host "    Stack destroyed." -ForegroundColor Green

# 4. Empty CDK assets bucket
Write-Host ""
Write-Host "[4/5] Emptying CDK assets bucket..." -ForegroundColor Yellow
$assetsBucket = "cdk-hnb659fds-assets-$accountId-$Region"
aws s3api head-bucket --bucket $assetsBucket --profile $AwsProfile 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    aws s3 rm "s3://$assetsBucket" --recursive --profile $AwsProfile | Out-Null
    Write-Host "    Bucket '$assetsBucket' emptied." -ForegroundColor Green
} else {
    Write-Host "    Bucket '$assetsBucket' not found - skipping." -ForegroundColor Gray
}

# 5. Remove CDK bootstrap stack (unless -KeepBootstrap was passed)
Write-Host ""
if ($KeepBootstrap) {
    Write-Host "[5/5] Skipping CDK bootstrap removal (-KeepBootstrap was set)." -ForegroundColor Gray
} else {
    Write-Host "[5/5] Removing CDK bootstrap (CDKToolkit)..." -ForegroundColor Yellow
    aws cloudformation delete-stack --stack-name CDKToolkit --profile $AwsProfile --region $Region
    aws cloudformation wait stack-delete-complete --stack-name CDKToolkit --profile $AwsProfile --region $Region
    Write-Host "    Bootstrap removed." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Done. Project is paused. ===" -ForegroundColor Cyan
Write-Host "State saved at: $StateFile" -ForegroundColor Cyan
Write-Host "Resume with: npm run stack:resume" -ForegroundColor Cyan
Write-Host ""
