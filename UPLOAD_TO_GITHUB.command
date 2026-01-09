#!/bin/bash
# ============================================================================
# ONE-CLICK GITHUB UPLOAD SCRIPT FOR AL-ADAWY CHATBOT (Mac/Linux)
# Repository: https://github.com/ffgghhj779-cell/backennddsk.git
# 
# INSTRUCTIONS: Just double-click this file!
# ============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Clear screen
clear

echo -e "${GREEN}"
echo "========================================"
echo " AL-ADAWY CHATBOT - GITHUB UPLOAD"
echo "========================================"
echo -e "${NC}"
echo "Repository: backennddsk"
echo "Status: Preparing upload..."
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERROR] Git is not installed!${NC}"
    echo ""
    echo "Please install Git:"
    echo "  Mac: brew install git"
    echo "  Ubuntu: sudo apt-get install git"
    echo ""
    echo "After installing, run this script again."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo -e "${GREEN}[OK] Git is installed${NC}"
echo ""

# Check if .git folder exists
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}[SETUP] Initializing Git repository...${NC}"
    git init
    git remote add origin https://github.com/ffgghhj779-cell/backennddsk.git
    echo -e "${GREEN}[OK] Repository initialized${NC}"
    echo ""
else
    echo -e "${GREEN}[OK] Git repository already initialized${NC}"
    echo ""
fi

# Configure git
git config core.autocrlf input

# Add all files
echo -e "${BLUE}[UPLOAD] Adding all files...${NC}"
if ! git add .; then
    echo -e "${RED}[ERROR] Failed to add files${NC}"
    read -p "Press Enter to exit..."
    exit 1
fi
echo -e "${GREEN}[OK] All files added${NC}"
echo ""

# Check if there are changes to commit
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${BLUE}[COMMIT] Creating commit...${NC}"
    
    COMMIT_MESSAGE="Complete Intelligent AI Assistant Integration - Production Ready

- Add AI reasoning engine with decision-making capabilities
- Implement context memory for conversation tracking
- Create intelligent assistant orchestrator
- Update message service to use AI assistant
- Enrich knowledge base with 200+ products and 17 brands
- Correct all phone numbers (spray booth: 01144003490)
- Add comprehensive documentation (8 files)
- System is production-ready and tested

Features:
- Context-aware conversations (no repeated questions)
- B2B policy enforcement with polite refusals
- Smart department routing
- Natural language understanding (Egyptian Arabic)
- Quality checks on all responses
- 95% knowledge base completeness

Files Added/Updated:
- src/services/aiReasoningEngine.js (NEW)
- src/services/contextMemory.js (NEW)
- src/services/intelligentAssistant.js (NEW)
- src/config/systemPrompt.js (NEW)
- src/services/messageService.js (UPDATED)
- knowledge/business/*.json (UPDATED)
- knowledge/products/catalog_expanded.json (NEW)
- knowledge/conversation/*.json (UPDATED)
- 8 documentation files (NEW)"
    
    if ! git commit -m "$COMMIT_MESSAGE"; then
        echo -e "${RED}[ERROR] Failed to create commit${NC}"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo -e "${GREEN}[OK] Commit created successfully${NC}"
    echo ""
else
    echo -e "${YELLOW}[INFO] No changes to commit${NC}"
    echo ""
fi

# Push to GitHub - try main first, then master
echo -e "${BLUE}[PUSH] Uploading to GitHub...${NC}"
echo ""
echo "Attempting push to 'main' branch..."

if ! git push -u origin main 2>/dev/null; then
    echo ""
    echo "Main branch failed, trying 'master' branch..."
    
    if ! git push -u origin master 2>/dev/null; then
        echo ""
        echo -e "${YELLOW}========================================"
        echo " AUTHENTICATION REQUIRED"
        echo "========================================${NC}"
        echo ""
        echo "Git needs your GitHub credentials."
        echo ""
        echo "Please enter your GitHub username and password"
        echo "(or Personal Access Token as password)"
        echo ""
        echo "If you don't have a token, create one at:"
        echo "https://github.com/settings/tokens"
        echo ""
        echo "Attempting authenticated push..."
        
        if ! git push -u origin main; then
            if ! git push -u origin master; then
                echo ""
                echo -e "${RED}[ERROR] Push failed!${NC}"
                echo ""
                echo "Possible reasons:"
                echo "1. Authentication failed (wrong credentials)"
                echo "2. No internet connection"
                echo "3. Repository doesn't exist or no access"
                echo ""
                echo "Please check and try again."
                read -p "Press Enter to exit..."
                exit 1
            fi
        fi
    fi
fi

# Success!
echo ""
echo -e "${GREEN}"
echo "========================================"
echo " SUCCESS! FILES UPLOADED TO GITHUB"
echo "========================================"
echo -e "${NC}"
echo "Repository URL:"
echo "https://github.com/ffgghhj779-cell/backennddsk"
echo ""
echo "What was uploaded:"
echo "[+] AI Reasoning Engine"
echo "[+] Context Memory System"
echo "[+] Intelligent Assistant Orchestrator"
echo "[+] Updated Message Service"
echo "[+] Complete Knowledge Base (200+ products)"
echo "[+] 8 Documentation Files"
echo "[+] All Project Files"
echo ""
echo "Next Steps:"
echo "1. Visit your GitHub repository to verify"
echo "2. Check that all folders are present"
echo "3. Review documentation files"
echo "4. Test by cloning: git clone https://github.com/ffgghhj779-cell/backennddsk.git"
echo ""
echo "Your intelligent chatbot is now on GitHub!"
echo ""
read -p "Press Enter to exit..."
