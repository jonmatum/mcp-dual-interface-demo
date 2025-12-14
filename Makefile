.PHONY: help build up down restart logs clean test init-db mcp-shell start rebuild

help:
	@echo "MCP Test Stack Commands:"
	@echo "  make start     - Clean start (build, up, init-db)"
	@echo "  make rebuild   - Rebuild and restart all services"
	@echo "  make build     - Build all containers"
	@echo "  make up        - Start all services"
	@echo "  make init-db   - Initialize DynamoDB table"
	@echo "  make down      - Stop all services"
	@echo "  make restart   - Restart all services"
	@echo "  make logs      - View logs"
	@echo "  make clean     - Remove containers and volumes"
	@echo "  make test      - Run frontend tests"
	@echo "  make mcp-shell - Connect to MCP server for testing"

start:
	@echo "Starting MCP Test Stack..."
	docker-compose down -v
	docker-compose build
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	docker-compose exec backend python /app/shared/init_db.py
	@echo "✓ Stack ready!"
	@echo "  Frontend:        http://localhost:5173"
	@echo "  Backend API:     http://localhost:8002"
	@echo "  DynamoDB Admin:  http://localhost:8001"

rebuild:
	@echo "Rebuilding services..."
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	docker-compose exec backend python /app/shared/init_db.py
	@echo "✓ Rebuild complete!"
	@echo "  Frontend:        http://localhost:5173"
	@echo "  Backend API:     http://localhost:8002"
	@echo "  DynamoDB Admin:  http://localhost:8001"

build:
	docker-compose build

up:
	docker-compose up -d

init-db:
	docker-compose exec backend python /app/shared/init_db.py

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	rm -rf frontend/node_modules

test:
	docker-compose exec frontend npm run test

mcp-shell:
	docker-compose exec mcp-server python server.py
