import boto3
import os

def get_dynamodb():
    return boto3.resource(
        'dynamodb',
        endpoint_url=os.getenv('DYNAMODB_ENDPOINT', 'http://localhost:8000'),
        region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
    )

def get_table(table_name='todos'):
    dynamodb = get_dynamodb()
    return dynamodb.Table(table_name)
