from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
sys.path.append('/app')

from shared.db import get_table
from shared.todo_service import TodoService

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

todo_service = TodoService(get_table())

class TodoCreate(BaseModel):
    title: str
    description: str = ""

class TodoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    completed: bool | None = None

@app.get("/")
def root():
    return {"status": "ok", "service": "mcp-test-backend"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/todos")
def create_todo(todo: TodoCreate):
    return todo_service.create_todo(todo.title, todo.description)

@app.get("/todos")
def list_todos():
    return todo_service.list_todos()

@app.get("/todos/{todo_id}")
def get_todo(todo_id: str):
    todo = todo_service.get_todo(todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo

@app.patch("/todos/{todo_id}")
def update_todo(todo_id: str, todo: TodoUpdate):
    result = todo_service.update_todo(todo_id, todo.completed, todo.title, todo.description)
    if not result:
        raise HTTPException(status_code=404, detail="Todo not found")
    return result

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: str):
    todo_service.delete_todo(todo_id)
    return {"status": "deleted"}
