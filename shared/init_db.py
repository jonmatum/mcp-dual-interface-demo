import boto3
import os
import time

def init_table():
    dynamodb = boto3.resource(
        'dynamodb',
        endpoint_url=os.getenv('DYNAMODB_ENDPOINT', 'http://localhost:8000'),
        region_name='us-east-1'
    )
    
    # Try to delete existing table
    try:
        table = dynamodb.Table('todos')
        table.delete()
        print("Deleted existing table")
        time.sleep(2)  # Wait for deletion
    except Exception as e:
        print(f"No existing table to delete: {e}")
    
    # Create new table
    try:
        table = dynamodb.create_table(
            TableName='todos',
            KeySchema=[
                {'AttributeName': 'id', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'id', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST'
        )
        table.wait_until_exists()
        print("Table 'todos' created successfully")
    except Exception as e:
        print(f"Error creating table: {e}")

if __name__ == "__main__":
    init_table()
