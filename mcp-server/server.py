import asyncio
import sys
sys.path.append('/app')

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from shared.db import get_table
from shared.todo_service import TodoService

app = Server("todo-mcp-server")
todo_service = TodoService(get_table())

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="create_todo",
            description="Create a new todo item",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Todo title"},
                    "description": {"type": "string", "description": "Todo description"}
                },
                "required": ["title"]
            }
        ),
        Tool(
            name="list_todos",
            description="List all todo items",
            inputSchema={"type": "object", "properties": {}}
        ),
        Tool(
            name="get_todo",
            description="Get a specific todo item by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "todo_id": {"type": "string", "description": "Todo ID"}
                },
                "required": ["todo_id"]
            }
        ),
        Tool(
            name="update_todo",
            description="Update a todo item (title, description, or completion status)",
            inputSchema={
                "type": "object",
                "properties": {
                    "todo_id": {"type": "string", "description": "Todo ID"},
                    "completed": {"type": "boolean", "description": "Completion status"},
                    "title": {"type": "string", "description": "New title"},
                    "description": {"type": "string", "description": "New description"}
                },
                "required": ["todo_id"]
            }
        ),
        Tool(
            name="delete_todo",
            description="Delete a todo item",
            inputSchema={
                "type": "object",
                "properties": {
                    "todo_id": {"type": "string", "description": "Todo ID"}
                },
                "required": ["todo_id"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "create_todo":
        result = todo_service.create_todo(
            arguments["title"],
            arguments.get("description", "")
        )
        return [TextContent(
            type="text", 
            text=f"✓ Created todo: {result['title']}\nID: {result['id']}"
        )]
    
    elif name == "list_todos":
        todos = todo_service.list_todos()
        if not todos:
            return [TextContent(type="text", text="No todos found.")]
        
        lines = [f"Found {len(todos)} todo(s):\n"]
        for i, todo in enumerate(todos, 1):
            status = "✓" if todo['completed'] else "○"
            lines.append(f"{i}. {status} {todo['title']}")
            if todo.get('description'):
                # Strip markdown for clean display in Kiro
                desc = todo['description'].replace('**', '').replace('*', '').replace('#', '')
                lines.append(f"   {desc[:100]}{'...' if len(desc) > 100 else ''}")
            lines.append(f"   ID: {todo['id']}\n")
        
        return [TextContent(type="text", text="\n".join(lines))]
    
    elif name == "get_todo":
        todo = todo_service.get_todo(arguments["todo_id"])
        if not todo:
            return [TextContent(type="text", text="Todo not found")]
        
        status = "✓ Completed" if todo['completed'] else "○ Pending"
        desc = todo.get('description', 'No description')
        # Strip markdown for Kiro
        desc_clean = desc.replace('**', '').replace('*', '').replace('#', '')
        
        text = f"""Todo: {todo['title']}
Status: {status}
Description: {desc_clean}
Created: {todo['created_at']}
ID: {todo['id']}"""
        
        return [TextContent(type="text", text=text)]
    
    elif name == "update_todo":
        result = todo_service.update_todo(
            arguments["todo_id"],
            arguments.get("completed"),
            arguments.get("title"),
            arguments.get("description")
        )
        if result:
            return [TextContent(type="text", text=f"✓ Updated: {result['title']}")]
        return [TextContent(type="text", text="Todo not found")]
    
    elif name == "delete_todo":
        todo_service.delete_todo(arguments["todo_id"])
        return [TextContent(type="text", text="✓ Todo deleted")]
    
    return [TextContent(type="text", text="Unknown tool")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
