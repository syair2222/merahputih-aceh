
'use server';
/**
 * @fileOverview A financial question & answering AI assistant for the cooperative.
 *
 * - financialChatbotFlow - A function that answers financial questions using available tools.
 * - FinancialQuestionInput - The input type for the financialChatbotFlow.
 * - FinancialAnswerOutput - The return type for the financialChatbotFlow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
import {
  getWeeklyExpenses,
  getMonthlyCashFlowProjection,
  getMonthlyLossAnalysis,
} from '@/services/financial-query-service'; // Placeholder service

// Schemas
export const FinancialQuestionInputSchema = z.object({
  question: z.string().describe('The user\'s financial question about the cooperative.'),
  currentDateOverride?: z.string().optional().describe('Optional: Override current date for testing (YYYY-MM-DD).'),
});
export type FinancialQuestionInput = z.infer<typeof FinancialQuestionInputSchema>;

export const FinancialAnswerOutputSchema = z.object({
  answer: z.string().describe('A clear and concise answer to the user\'s question.'),
  debugInfo: z.string().optional().describe('Debugging information about tool usage or data retrieval.'),
});
export type FinancialAnswerOutput = z.infer<typeof FinancialAnswerOutputSchema>;


// Tools
const getWeeklyExpensesTool = ai.defineTool(
  {
    name: 'getWeeklyExpensesTool',
    description: 'Fetches the total expenses for the current week. Use this if the user asks "Berapa pengeluaran minggu ini?" or similar questions about weekly costs.',
    inputSchema: z.object({
      currentDateString: z.string().describe("Today's date in YYYY-MM-DD format, used to determine the current week."),
    }),
    outputSchema: z.object({
      totalExpenses: z.number(),
      period: z.string().describe("The weekly period for which expenses are reported, e.g., '2023-10-23 to 2023-10-29'."),
      details: z.array(z.string()).optional().describe("Optional details or disclaimers about the data."),
    }),
  },
  async ({ currentDateString }) => {
    return getWeeklyExpenses(new Date(currentDateString));
  }
);

const getMonthlyCashFlowProjectionTool = ai.defineTool(
  {
    name: 'getMonthlyCashFlowProjectionTool',
    description: 'Provides a basic cash flow projection for the next month. Use this for questions like "Bagaimana proyeksi arus kas bulan depan?".',
    inputSchema: z.object({
      currentDateString: z.string().describe("Today's date in YYYY-MM-DD format, used as a reference for 'next month'."),
    }),
    outputSchema: z.object({
      projectionSummary: z.string(),
      period: z.string().describe("The monthly period for the projection, e.g., '2023-11'."),
    }),
  },
  async ({ currentDateString }) => {
    return getMonthlyCashFlowProjection(new Date(currentDateString));
  }
);

const getMonthlyLossAnalysisTool = ai.defineTool(
  {
    name: 'getMonthlyLossAnalysisTool',
    description: 'Analyzes potential causes if a loss occurred in the current or most recent full month. Use for questions like "Apa yang menyebabkan kerugian bulan ini?".',
    inputSchema: z.object({
      currentDateString: z.string().describe("Today's date in YYYY-MM-DD format."),
    }),
    outputSchema: z.object({
      analysis: z.string(),
      period: z.string().describe("The monthly period analyzed, e.g., '2023-10'."),
      isLoss: z.boolean(),
    }),
  },
  async ({ currentDateString }) => {
    return getMonthlyLossAnalysis(new Date(currentDateString));
  }
);


// Prompt
const financialQAPrompt = ai.definePrompt({
  name: 'financialQAPrompt',
  input: { schema: FinancialQuestionInputSchema.extend({ currentDate: z.string() }) },
  output: { schema: FinancialAnswerOutputSchema },
  tools: [
    getWeeklyExpensesTool,
    getMonthlyCashFlowProjectionTool,
    getMonthlyLossAnalysisTool,
  ],
  prompt: `You are Koperasi Merah Putih Sejahtera's specialist financial AI assistant. Your goal is to answer the user's financial questions accurately and concisely using the provided tools.
Today's date is {{currentDate}}.

User's question: "{{question}}"

Analyze the user's question and determine the most appropriate tool to use.
- If the question is about expenses for "this week" or "minggu ini", use 'getWeeklyExpensesTool'.
- If the question is about "cash flow projection for next month" or "proyeksi arus kas bulan depan", use 'getMonthlyCashFlowProjectionTool'.
- If the question is about "causes of loss this month" or "penyebab kerugian bulan ini", use 'getMonthlyLossAnalysisTool'.

If a tool is used, formulate your answer based *primarily* on the tool's output.
If the tool provides a 'period' in its output, mention it in your answer.
If the tool's output contains disclaimers or mentions simulated data, relay that information clearly to the user.

If the question does not clearly map to one of these tools, or if you need more specific information to choose a tool, state that you can currently help with:
- Weekly expense summaries.
- Basic monthly cash flow projections.
- Analysis of causes for monthly losses.
And ask the user to rephrase or specify their question.

Do not invent data or answer outside the scope of the tools.
Provide a helpful and professional response.
`,
});


// Main Flow
const financialQAFlow = ai.defineFlow(
  {
    name: 'financialQAFlow',
    inputSchema: FinancialQuestionInputSchema,
    outputSchema: FinancialAnswerOutputSchema,
  },
  async (input) => {
    const currentDate = input.currentDateOverride ? new Date(input.currentDateOverride) : new Date();
    const currentDateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const { output } = await financialQAPrompt({
      question: input.question,
      currentDate: currentDateString,
    });

    if (!output) {
      return { answer: "Maaf, saya tidak dapat memproses permintaan Anda saat ini." };
    }
    return output;
  }
);

export async function financialChatbotFlow(
  input: FinancialQuestionInput
): Promise<FinancialAnswerOutput> {
  return financialQAFlow(input);
}
