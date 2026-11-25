#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Resumes the portfolio-api project by re-deploying all AWS resources.

.DESCRIPTION
    Runs cdk bootstrap (idempotent) and cdk deploy to recreate the stack from
    the current git checkout. If a paused-state file exists, restores the
    previous API Key value so existing clients (Postman, scripts) keep working
    without any configuration changes.

.PARAMETER Env
    Target environment (dev, test, prod). Defaults to "dev".

.EXAMPLE
    ./scripts/resume-stack.ps1
    ./scripts/resume-stack.ps1 -Env dev
#>

[CmdletBinding()]
param(
    [string]$Env = "dev"
)

$ErrorActionPreference = "Stop"

$AwsProfile = "portfolio-api"
$Region = "eu-west-1"
$StackName = "PortfolioApiStack-$Env"
$StateDir = Join-Path (Join-Path $PSScriptRoot "..") ".stack-state"
$StateFile = Join-Path $StateDir "paused-state.$Env.json"

Write-Host ""
Write-Host "=== Resuming portfolio-api ($Env) ===" -ForegroundColor Cyan
Write-Host "Profile: $AwsProfile  |  Region: $Region  |  Stack: $StackName"
Write-Host ""

# 1. Verify AWS credentials work
Write-Host "[1/4] Verifying AWS credentials..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --profile $AwsProfile --output json | ConvertFrom-Json
if (-not $identity.Account) {
    Write-Error "Cannot authenticate with profile '$AwsProfile'. Run 'aws configure --profile $AwsProfile' first."
    exit 1
}
Write-Host "    Account: $($identity.Account)" -ForegroundColor Green

# 2. Bootstrap (idempotent - no-op if already bootstrapped)
Write-Host ""
Write-Host "[2/4] Ensuring CDK bootstrap..." -ForegroundColor Yellow
npx cdk bootstrap --profile $AwsProfile
if ($LASTEXITCODE -ne 0) {
    Write-Error "cdk bootstrap failed."
    exit 1
}

# 3. Deploy stack
Write-Host ""
Write-Host "[3/4] Deploying stack '$StackName'..." -ForegroundColor Yellow
npx cdk deploy $StackName --context env=$Env --profile $AwsProfile --require-approval never
if ($LASTEXITCODE -ne 0) {
    Write-Error "cdk deploy failed."
    exit 1
}

# 4. Restore previous API Key value (if paused-state file exists)
Write-Host ""
if (-not (Test-Path $StateFile)) {
    Write-Host "[4/4] No paused-state file found - fresh deployment with new API key." -ForegroundColor Gray
    Write-Host ""
    Write-Host "    Fetch the new API key value from AWS Console > API Gateway > API Keys > PortfolioApiKey-$Env." -ForegroundColor Yellow
} else {
    Write-Host "[4/4] Restoring previous API key value from '$StateFile'..." -ForegroundColor Yellow
    $state = Get-Content $StateFile -Raw | ConvertFrom-Json

    $outputs = aws cloudformation describe-stacks --stack-name $StackName --profile $AwsProfile --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    $newKeyId = ($outputs | Where-Object { $_.OutputKey -eq "PortfolioApiKeyId" }).OutputValue
    $newUrl = ($outputs | Where-Object { $_.OutputKey -eq "ApiUrl" }).OutputValue

    if (-not $newKeyId) {
        Write-Error "Could not find PortfolioApiKeyId in new stack outputs."
        exit 1
    }

    # AWS does not allow updating the value of an existing API Key - we must
    # delete the auto-generated one, create a new key with the saved value,
    # and re-attach it to the Usage Plan.
    $usagePlanId = aws apigateway get-usage-plans --profile $AwsProfile --region $Region --query "items[?name=='PortfolioApiUsagePlan-$Env'].id" --output text
    if (-not $usagePlanId -or $usagePlanId -eq "None") {
        Write-Error "Could not find Usage Plan 'PortfolioApiUsagePlan-$Env'."
        exit 1
    }

    aws apigateway delete-usage-plan-key --usage-plan-id $usagePlanId --key-id $newKeyId --profile $AwsProfile --region $Region 2>$null | Out-Null
    aws apigateway delete-api-key --api-key $newKeyId --profile $AwsProfile --region $Region | Out-Null

    $restoredKey = aws apigateway create-api-key --name "PortfolioApiKey-$Env" --description "API Key for authorization" --enabled --value $state.apiKeyValue --profile $AwsProfile --region $Region --output json | ConvertFrom-Json
    aws apigateway create-usage-plan-key --usage-plan-id $usagePlanId --key-id $restoredKey.id --key-type "API_KEY" --profile $AwsProfile --region $Region | Out-Null

    Write-Host "    API key value restored - existing clients keep working." -ForegroundColor Green

    if ($state.previousUrl -and $newUrl -and ($state.previousUrl -ne $newUrl)) {
        Write-Host ""
        Write-Host "    URL CHANGED:" -ForegroundColor Yellow
        Write-Host "      previous: $($state.previousUrl)" -ForegroundColor Gray
        Write-Host "      current:  $newUrl" -ForegroundColor Green
        Write-Host "    Update base URL in Postman / scripts / clients." -ForegroundColor Yellow
    }

    Remove-Item $StateFile
}

Write-Host ""
Write-Host "=== Done. Project is live. ===" -ForegroundColor Cyan
Write-Host ""
