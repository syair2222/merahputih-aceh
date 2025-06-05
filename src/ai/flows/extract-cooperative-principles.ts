'use server';

/**
 * @fileOverview Extracts and summarizes the cooperative's objectives and principles from its statutes (AD/ART).
 *
 * - extractCooperativePrinciples - A function that handles the extraction and summarization process.
 * - ExtractCooperativePrinciplesInput - The input type for the extractCooperativePrinciples function.
 * - ExtractCooperativePrinciplesOutput - The return type for the extractCooperativePrinciples function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractCooperativePrinciplesInputSchema = z.object({
  statutes: z
    .string()
    .describe('The full text of the cooperative statutes (Anggaran Dasar dan Rumah Tangga - AD/ART).'),
});
export type ExtractCooperativePrinciplesInput = z.infer<
  typeof ExtractCooperativePrinciplesInputSchema
>;

const ExtractCooperativePrinciplesOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the cooperative’s objectives and principles, extracted from the statutes.'
    ),
});
export type ExtractCooperativePrinciplesOutput = z.infer<
  typeof ExtractCooperativePrinciplesOutputSchema
>;

export async function extractCooperativePrinciples(
  input: ExtractCooperativePrinciplesInput
): Promise<ExtractCooperativePrinciplesOutput> {
  return extractCooperativePrinciplesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractCooperativePrinciplesPrompt',
  input: {schema: ExtractCooperativePrinciplesInputSchema},
  output: {schema: ExtractCooperativePrinciplesOutputSchema},
  prompt: `You are an expert in summarizing legal documents, especially cooperative statutes.  Your goal is to provide a concise summary of the cooperative's objectives and principles so that prospective members can quickly understand the cooperative's mission and values.

Statutes (AD/ART):
{{statutes}}`,
});

const extractCooperativePrinciplesFlow = ai.defineFlow(
  {
    name: 'extractCooperativePrinciplesFlow',
    inputSchema: ExtractCooperativePrinciplesInputSchema,
    outputSchema: ExtractCooperativePrinciplesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
