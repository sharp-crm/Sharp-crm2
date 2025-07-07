import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./dynamoClient";

export const addTask = async (task: any) => {
  await docClient.send(new PutCommand({
    TableName: "Tasks",
    Item: task,
  }));
};

export const getTasks = async () => {
  const result = await docClient.send(new ScanCommand({ TableName: "Tasks" }));
  return result.Items;
};