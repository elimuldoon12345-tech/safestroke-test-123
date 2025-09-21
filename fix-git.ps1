# PowerShell Git Fix Script
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Git Repository Fix Script (PowerShell)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Function to check git status
function Check-GitStatus {
    Write-Host "Checking Git Status..." -ForegroundColor Yellow
    Write-Host "Current Directory:" -ForegroundColor Green
    Get-Location
    Write-Host ""
    Write-Host "Remote Repository:" -ForegroundColor Green
    git remote -v
    Write-Host ""
    Write-Host "Current Branch:" -ForegroundColor Green
    git branch
    Write-Host ""
    Write-Host "File Status:" -ForegroundColor Green
    git status
}

# Function to quick push
function Quick-Push {
    Write-Host "Quick Push to GitHub..." -ForegroundColor Yellow
    git add .
    $msg = Read-Host "Enter commit message (or press Enter for default)"
    if ([string]::IsNullOrWhiteSpace($msg)) {
        $msg = "Update website files"
    }
    git commit -m $msg
    git push origin main
    Write-Host ""
    Write-Host "Done! Changes pushed to GitHub." -ForegroundColor Green
}

# Function to fix remote
function Fix-Remote {
    Write-Host "Fixing Remote URL..." -ForegroundColor Yellow
    Write-Host "Current remote:" -ForegroundColor Green
    git remote -v
    Write-Host ""
    Write-Host "Removing old remote..." -ForegroundColor Yellow
    git remote remove origin
    Write-Host "Adding correct remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/elimuldoon12345-tech/safestroke-website.git
    Write-Host ""
    Write-Host "New remote:" -ForegroundColor Green
    git remote -v
    Write-Host ""
    Write-Host "Remote URL fixed!" -ForegroundColor Green
}

# Function to reinitialize
function Reinit-Repository {
    Write-Host ""
    Write-Host "WARNING: This will reset your Git history!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    if ($confirm -ne "yes") {
        return
    }
    
    Write-Host ""
    Write-Host "Re-initializing repository..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
    git init
    git remote add origin https://github.com/elimuldoon12345-tech/safestroke-website.git
    git add .
    git commit -m "Reinitialize repository with all current files"
    git branch -M main
    Write-Host ""
    Write-Host "Pushing to GitHub (may need credentials)..." -ForegroundColor Yellow
    git push -u origin main --force
    Write-Host ""
    Write-Host "Repository reinitialized!" -ForegroundColor Green
}

# Main menu
Write-Host "Choose an option:" -ForegroundColor Cyan
Write-Host "1. Check current Git status"
Write-Host "2. Quick commit and push changes"
Write-Host "3. Fix remote URL (if pointing to wrong repo)"
Write-Host "4. Complete re-initialization (WARNING: resets history)"
Write-Host "5. Exit"
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" { Check-GitStatus }
    "2" { Quick-Push }
    "3" { Fix-Remote }
    "4" { Reinit-Repository }
    "5" { Write-Host "Exiting..." -ForegroundColor Yellow }
    default { Write-Host "Invalid choice. Exiting..." -ForegroundColor Red }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
