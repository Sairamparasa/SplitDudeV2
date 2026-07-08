import { TextractClient, AnalyzeExpenseCommand } from "@aws-sdk/client-textract";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const textractClient = new TextractClient({ region: process.env.AWS_REGION || "us-east-1" });

export const handler = async (event) => {
  console.log("Starting receipt processing event:", JSON.stringify(event, null, 2));

  try {
    let body = event;
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    }

    const { fileContent, fileName, contentType } = body;

    if (!fileContent) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "fileContent is required" }),
      };
    }

    const bucketName = process.env.AWS_S3_BUCKET || "splitdude-receipts-2026-sairamparasa";
    const cleanedFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
    const cleanedContentType = contentType || "image/jpeg";

    // Decode base64
    const buffer = Buffer.from(fileContent, "base64");

    // 1. Upload to S3
    console.log(`Uploading ${cleanedFileName} to S3 bucket ${bucketName}...`);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: cleanedFileName,
        Body: buffer,
        ContentType: cleanedContentType,
      })
    );
    console.log("Upload complete.");

    // 2. Call Textract AnalyzeExpense
    console.log(`Calling Textract AnalyzeExpense on ${cleanedFileName}...`);
    const textractResponse = await textractClient.send(
      new AnalyzeExpenseCommand({
        Document: {
          S3Object: {
            Bucket: bucketName,
            Name: cleanedFileName,
          },
        },
      })
    );
    console.log("Textract AnalyzeExpense response received.");

    // 3. Parse fields
    let merchant = "";
    let amount = 0;
    let date = "";

    if (textractResponse.ExpenseDocuments && textractResponse.ExpenseDocuments.length > 0) {
      const doc = textractResponse.ExpenseDocuments[0];
      const summaryFields = doc.SummaryFields || [];

      console.log(`Extracted ${summaryFields.length} summary fields from document.`);

      for (const field of summaryFields) {
        const typeCode = field.Type?.Code;
        const textValue = field.ValueDetection?.Text;

        if (typeCode === "VENDOR_NAME" && textValue && !merchant) {
          merchant = textValue;
        } else if (typeCode === "TOTAL" && textValue && !amount) {
          // Clean up amount formatting e.g., "$12.34" or "12,34" -> 12.34
          const sanitizedText = textValue.replace(/[^0-9.]/g, "");
          const parsedVal = parseFloat(sanitizedText);
          if (!isNaN(parsedVal)) {
            amount = parsedVal;
          }
        } else if (typeCode === "DATE" && textValue && !date) {
          date = textValue;
        }
      }
    }

    console.log("Extracted fields:", { merchant, amount, date });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        data: {
          merchant: merchant || "Unknown Merchant",
          amount: amount || 0,
          date: date ? new Date(date).toISOString() : new Date().toISOString(),
          s3Url: `https://${bucketName}.s3.amazonaws.com/${cleanedFileName}`,
        },
      }),
    };
  } catch (error) {
    console.error("Receipt processing failed:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: false,
        error: error.message || "Internal receipt processing error",
      }),
    };
  }
};
