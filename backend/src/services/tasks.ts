import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "./dynamoClient";

export const addTask = async (task: any) => {
  await docClient.send(new PutCommand({
    TableName: TABLES.TASKS,
    Item: task,
  }));
};

export const getTasks = async () => {
  const result = await docClient.send(new ScanCommand({ TableName: TABLES.TASKS }));
  return result.Items;
};