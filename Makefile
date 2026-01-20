.PHONY: help dev build start stop logs clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development
dev-backend: ## Run backend in development mode
	cd backend && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

dev-frontend: ## Run frontend in development mode
	cd frontend && npm install && npm run dev

# Docker
build: ## Build Docker images
	docker-compose build

start: ## Start the application with Docker
	docker-compose up -d

stop: ## Stop the application
	docker-compose down

logs: ## View logs
	docker-compose logs -f

# Podman
podman-build: ## Build with Podman
	podman-compose build

podman-start: ## Start with Podman
	podman-compose up -d

podman-stop: ## Stop Podman containers
	podman-compose down

podman-logs: ## View Podman logs
	podman-compose logs -f

# Cleanup
clean: ## Remove all containers and volumes
	docker-compose down -v --remove-orphans
	rm -rf backend/__pycache__ backend/.venv
	rm -rf frontend/node_modules frontend/dist

# Production
prod: build start ## Build and start in production mode
	@echo "Application is running at http://localhost"
