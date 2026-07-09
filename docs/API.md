# Backend API Endpoint Documentation

SplitDude utilizes Next.js API Route Handlers. These endpoints handle CRUD operations for expenses, groups, friendships, notifications, and act as a secure proxy to AWS API Gateway.

---

## 1. Receipt Analyzer Proxy
* **Endpoint**: `POST /api/receipts/analyze`
* **Content-Type**: `multipart/form-data`
* **Request Payload**:
  * `file`: Binary file (PDF or Image of receipt)
* **Response (HTTP 200)**:
  ```json
  {
    "success": true,
    "data": {
      "merchant": "Target Stores",
      "amount": 42.84,
      "date": "2026-07-09",
      "receiptUrl": "https://splitdude-receipts.s3.amazonaws.com/user123-1783594808-receipt.jpg"
    }
  }
  ```

---

## 2. Groups API
* **Endpoint**: `/api/groups`

### Create Group
* **Method**: `POST`
* **Payload**:
  ```json
  {
    "name": "Trip to Paris",
    "description": "Summer getaway",
    "icon": "✈️",
    "members": ["uuid-friend-1", "uuid-friend-2"]
  }
  ```

### Add Member to Group
* **Method**: `PUT`
* **Payload**:
  ```json
  {
    "groupId": "uuid-group-id",
    "userIdToAdd": "uuid-user-id"
  }
  ```

---

## 3. Expenses API
* **Endpoint**: `/api/expenses`

### Add Expense
* **Method**: `POST`
* **Payload**:
  ```json
  {
    "groupId": "uuid-group-id",
    "title": "Dinner at Chez Jack",
    "amount": 90.00,
    "description": "Shared appetizer & main course",
    "paidBy": "uuid-payer-id",
    "splitMode": "equal",
    "receiptUrl": "https://...",
    "splits": [
      { "userId": "uuid-member-1", "amount": 30.00, "shareValue": 1.00 },
      { "userId": "uuid-member-2", "amount": 30.00, "shareValue": 1.00 },
      { "userId": "uuid-member-3", "amount": 30.00, "shareValue": 1.00 }
    ]
  }
  ```

### Delete Expense
* **Method**: `DELETE`
* **Payload**:
  ```json
  {
    "expenseId": "uuid-expense-id",
    "groupId": "uuid-group-id"
  }
  ```

---

## 4. Settlements API
* **Endpoint**: `/api/settlements`

### Record Settlement
* **Method**: `POST`
* **Payload**:
  ```json
  {
    "groupId": "uuid-group-id",
    "payerId": "uuid-debtor-id",
    "payeeId": "uuid-creditor-id",
    "amount": 25.50
  }
  ```

### Delete Settlement Log
* **Method**: `DELETE`
* **Payload**:
  ```json
  {
    "settlementId": "uuid-settlement-id",
    "groupId": "uuid-group-id"
  }
  ```

---

## 5. Friends API
* **Endpoint**: `/api/friends`

### Add Friend (by unique Split ID)
* **Method**: `POST`
* **Payload**:
  ```json
  {
    "friendCode": "SPD7H4K2M"
  }
  ```

### Remove Friend
* **Method**: `DELETE`
* **Payload**:
  ```json
  {
    "friendshipId": "uuid-friendship-id"
  }
  ```
