.PHONY: setup dev-backend dev-frontend lint test check format

setup:
	cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt
	cd frontend && npm install

dev-backend:
	cd backend && . .venv/bin/activate && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

format:
	cd backend && . .venv/bin/activate && ruff format . && ruff check --fix .

lint:
	cd backend && . .venv/bin/activate && ruff check . && ruff format --check .
	cd frontend && npm run lint && npm run typecheck

test:
	cd backend && . .venv/bin/activate && pytest

# Same checks CI runs. Run this before every push.
check: lint test
	cd frontend && npm run build
