#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== toMD Development Setup ===${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.11+${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

echo -e "${YELLOW}Setting up backend...${NC}"
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}Backend setup complete!${NC}"

cd ../frontend

echo -e "${YELLOW}Setting up frontend...${NC}"

# Install dependencies
npm install

echo -e "${GREEN}Frontend setup complete!${NC}"

cd ..

echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo "To run the application:"
echo ""
echo "  Backend (terminal 1):"
echo "    cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo ""
echo "  Frontend (terminal 2):"
echo "    cd frontend && npm run dev"
echo ""
echo "Or use Docker/Podman:"
echo "    docker-compose up -d"
echo "    podman-compose up -d"
