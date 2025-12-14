from datetime import datetime
from uuid import uuid4
from boto3.dynamodb.conditions import Key

class TodoService:
    def __init__(self, table):
        self.table = table
    
    def create_todo(self, title: str, description: str = ""):
        item = {
            'id': str(uuid4()),
            'title': title,
            'description': description,
            'completed': False,
            'created_at': datetime.utcnow().isoformat()
        }
        self.table.put_item(Item=item)
        return item
    
    def list_todos(self):
        response = self.table.scan()
        return response.get('Items', [])
    
    def get_todo(self, todo_id: str):
        response = self.table.get_item(Key={'id': todo_id})
        return response.get('Item')
    
    def update_todo(self, todo_id: str, completed: bool = None, title: str = None, description: str = None):
        update_expr = []
        expr_values = {}
        
        if completed is not None:
            update_expr.append('completed = :c')
            expr_values[':c'] = completed
        if title:
            update_expr.append('title = :t')
            expr_values[':t'] = title
        if description is not None:
            update_expr.append('description = :d')
            expr_values[':d'] = description
            
        if not update_expr:
            return None
            
        response = self.table.update_item(
            Key={'id': todo_id},
            UpdateExpression='SET ' + ', '.join(update_expr),
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        return response.get('Attributes')
    
    def delete_todo(self, todo_id: str):
        self.table.delete_item(Key={'id': todo_id})
        return True
