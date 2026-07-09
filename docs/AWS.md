# AWS Infrastructure Setup & Configuration

SplitDude leverages AWS to perform Serverless OCR (Optical Character Recognition) on uploaded receipts. This documentation details the AWS services utilized, IAM permissions required, and Lambda deployment instructions.

## Architecture Overview

```
[Next.js Backend API]
        │
        ▼ (HTTPS POST)
[AWS API Gateway] (Stage: /dev)
        │
        ▼ (Lambda Proxy Integration)
[AWS Lambda] (Python 3.12 Runtime)
        │
        ├──► [Amazon Textract] (analyze_expense API)
        └──► [Amazon S3] (Temporary image/PDF storage)
```

---

## 1. Amazon S3 Bucket

The Lambda function optionally uploads the raw receipt image or PDF to an S3 bucket before passing the reference to Amazon Textract.

* **Bucket Name**: `splitdude-receipts` (or any custom name)
* **Access**: Private (Only accessible by the `splitdude-api` Lambda role)
* **Lifecycle Rules**: Configured to auto-delete objects after 1 day (to ensure privacy and cost savings).

---

## 2. AWS Lambda Function

The receipt processing logic runs on a serverless Python runtime.

* **Function Name**: `splitdude-api`
* **Runtime**: Python 3.12
* **Memory**: 256 MB (Textract processing is serverless, so Lambda acts primarily as a coordinator)
* **Timeout**: 15 seconds (Textract calls typically complete in 3-8 seconds)

### Python Lambda Code (`index.py`)

```python
import json
import base64
import boto3
import os

textract_client = boto3.client('textract', region_name='us-east-1')
s3_client = boto3.client('s3', region_name='us-east-1')

BUCKET_NAME = os.environ.get('RECEIPTS_BUCKET_NAME', 'splitdude-receipts')

def lambda_handler(event, context):
    try:
        # Parse body from API Gateway
        body = json.loads(event.get('body', '{}'))
        file_content_base64 = body.get('fileContent')
        file_name = body.get('fileName')
        content_type = body.get('contentType', 'image/jpeg')

        if not file_content_base64 or not file_name:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': False, 'error': 'Missing fileContent or fileName'})
            }

        # Decode base64
        file_bytes = base64.b64decode(file_content_base64)

        # Upload file to S3
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=file_name,
            Body=file_bytes,
            ContentType=content_type
        )

        # Call Textract AnalyzeExpense
        response = textract_client.analyze_expense(
            Document={
                'S3Object': {
                    'Bucket': BUCKET_NAME,
                    'Name': file_name
                }
            }
        )

        # Extract parsed details
        merchant_name = None
        amount = 0.0
        expense_date = None

        for doc in response.get('ExpenseDocuments', []):
            # 1. Look for Summary Fields
            for field in doc.get('SummaryFields', []):
                field_type = field.get('Type', {}).get('Name', '')
                value = field.get('ValueDetection', {}).get('Text', '')

                if field_type == 'VENDOR_NAME' and not merchant_name:
                    merchant_name = value
                elif field_type == 'TOTAL' and amount == 0.0:
                    try:
                        clean_val = value.replace('$', '').replace(',', '').strip()
                        amount = float(clean_val)
                    except ValueError:
                        pass
                elif field_type == 'TRANSACTION_DATE' and not expense_date:
                    expense_date = value

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'data': {
                    'merchant': merchant_name or "Unknown Merchant",
                    'amount': amount,
                    'date': expense_date,
                    'receiptUrl': f"https://{BUCKET_NAME}.s3.amazonaws.com/{file_name}"
                }
            })
        }

    except Exception as e:
        print(f"Exception: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'success': False, 'error': str(e)})
        }
```

---

## 3. AWS API Gateway

To expose the Lambda function securely to our Next.js backend, we use an **API Gateway (HTTP API)**.

* **API Name**: `splitdude-api-gateway`
* **Route**: `POST /receipts/analyze`
* **Integration**: Lambda Proxy Integration pointing to the `splitdude-api` Lambda function.
* **Stage**: `dev`
* **CORS Configuration**: Enabled to allow connections from Vercel deployment domains.

---

## 4. IAM Permissions (Lambda Execution Role)

The Lambda function's IAM Role must be granted permissions to interact with Textract and S3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::splitdude-receipts/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "textract:AnalyzeExpense"
      ],
      "Resource": "*"
    }
  ]
}
```
