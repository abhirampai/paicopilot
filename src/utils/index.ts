import { window, Range } from "vscode";
import path from "path";
import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GITHUB_TOKEN: any = process.env.GITHUB_TOKEN;
const AZURE_ENDPOINT: string = "https://models.inference.ai.azure.com";

const client: any = new ModelClient(
  AZURE_ENDPOINT,
  new AzureKeyCredential(GITHUB_TOKEN)
);

const getCommentRegex = (language: string) => {
  switch (language.toLowerCase()) {
    case "javascript":
    case "java":
    case "c":
    case "c++":
    case "rust":
    case "go":
      return /\/\/.*|\/\*[\s\S]*?\*\//g;

    case "python":
      return /#.*|'''[\s\S]*?'''|"""[\s\S]*?"""/g;

    case "ruby":
      return /#.*|=begin[\s\S]*?=end/g;

    case "html":
    case "xml":
      return /<!--[\s\S]*?-->/g;

    case "shell":
    case "bash":
      return /#.*|$'(?:\\.|[^'])*'/g;

    case "php":
      return /\/\/.*|\/\*[\s\S]*?\*\/|#.*(?=\r?\n)/g;

    default:
      throw new Error("Unsupported language");
  }
};

const extractCodeFromBlock = (blockString: string) =>
  [...blockString.matchAll(/```(?:[a-z]+)?\n([\s\S]+?)\n```/g)].map(
    (match) => match[1]
  )[0];

export const debounce = (callback: any, wait = 800) => {
  let timeoutId: any = null;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(...args);
    }, wait);
  };
};

export const triggerCodeGeneration = async () => {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const documentText = editor.document.getText();
  const lines = documentText.split("\n");
  const commentRegex = getCommentRegex(document.languageId);

  const commentMatches = documentText.match(commentRegex);

  if (!commentMatches) {
    return;
  }

  for (const match of commentMatches) {
    if (!match.includes("PaiCode")) {
      continue;
    }

    if (!match.split("PaiCode")[1].trim()) {
      continue;
    }

    const newCode = await generateCodeBasedOnTask(
      match.split("PaiCode")[1].trim(),
      documentText,
      document.languageId
    );
    const newLineIndex = lines.indexOf(match);
    editor.edit((editBuilder) => {
      editBuilder.replace(
        new Range(
          document.lineAt(newLineIndex).range.start,
          document.lineAt(newLineIndex).range.end
        ),
        newCode
      );
    });
  }
};

const generateCodeBasedOnTask = async (
  task: string,
  fileContents: string,
  language: string
): Promise<any> => {
  console.log(task);
  const modelName = "Mistral-large";
  const userPrompt = `Generate code based on the comment '''${task}'''. The file contents are '''${fileContents}'''. The language used is ${language}`;
  const response = await client.path("/chat/completions").post({
    body: {
      messages: [
        {
          role: "system",
          content:
            "You are a code suggestion assistant integrated inside of vscode extension. Just provide a sample snippet for the comment thats all for eg if the comment is write a code to add 2 numbers then just give the code to add 2 numbers and print it no need to explain the steps",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: 1000,
      model: modelName,
    },
  });
  if (response.status !== "200") {
    throw response.body.error;
  }

  return extractCodeFromBlock(response.body.choices[0].message.content);
};
