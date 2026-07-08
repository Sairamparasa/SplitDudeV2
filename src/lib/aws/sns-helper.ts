import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

// Initialize the AWS SNS Client
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
})

export interface SnsEventPayload {
  eventType: 'EXPENSE_CREATED' | 'EXPENSE_UPDATED' | 'EXPENSE_DELETED' | 'FRIEND_REQUEST_SENT' | 'FRIEND_REQUEST_ACCEPTED' | 'GROUP_CREATED' | 'USER_ADDED_TO_GROUP' | 'SETTLEMENT_COMPLETED'
  userId: string
  groupId?: string
  expenseId?: string
  message: string
}

/**
 * Publishes an event to the AWS SNS topic asynchronously.
 * This runs in a fire-and-forget/non-blocking manner and catches all errors to prevent app crashes.
 */
export async function publishSnsEvent(payload: SnsEventPayload) {
  const startTime = Date.now()
  const topicArn = process.env.AWS_SNS_TOPIC_ARN

  if (!topicArn) {
    console.warn('AWS_SNS_TOPIC_ARN is not configured. Skipping SNS publish.')
    return
  }

  const snsMessage = {
    eventType: payload.eventType,
    timestamp: new Date().toISOString(),
    userId: payload.userId,
    groupId: payload.groupId || '',
    expenseId: payload.expenseId || '',
    message: payload.message,
  }

  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(snsMessage),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: payload.eventType,
        },
      },
    })

    // Publish to AWS SNS
    const response = await snsClient.send(command)
    const duration = Date.now() - startTime

    // Structured log for CloudWatch ingestion
    console.log(JSON.stringify({
      logType: 'SNS_PUBLISH_SUCCESS',
      eventType: payload.eventType,
      messageId: response.MessageId,
      requestId: response.$metadata.requestId,
      executionTimeMs: duration,
      timestamp: new Date().toISOString(),
    }))
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    // Structured log for failure
    console.error(JSON.stringify({
      logType: 'SNS_PUBLISH_FAILURE',
      eventType: payload.eventType,
      error: error.message || error,
      executionTimeMs: duration,
      timestamp: new Date().toISOString(),
    }))
  }
}
