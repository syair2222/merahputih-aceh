// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview An AI tool to help admins respond to member inquiries and comments on announcements.
 *
 * - generateAdminComment - A function that generates professional and persuasive Indonesian responses.
 * - GenerateAdminCommentInput - The input type for the generateAdminComment function.
 * - GenerateAdminCommentOutput - The return type for the generateAdminComment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAdminCommentInputSchema = z.object({
  announcementText: z
    .string()
    .describe('The text of the announcement the user is commenting on.'),
  userComment: z.string().describe('The comment from the user.'),
});

export type GenerateAdminCommentInput = z.infer<
  typeof GenerateAdminCommentInputSchema
>;

const GenerateAdminCommentOutputSchema = z.object({
  aiResponse: z
    .string()
    .describe(
      'A professional and persuasive response in Indonesian to the user comment, encouraging engagement.'
    ),
});

export type GenerateAdminCommentOutput = z.infer<
  typeof GenerateAdminCommentOutputSchema
>;

export async function generateAdminComment(
  input: GenerateAdminCommentInput
): Promise<GenerateAdminCommentOutput> {
  return generateAdminCommentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdminCommentPrompt',
  input: {schema: GenerateAdminCommentInputSchema},
  output: {schema: GenerateAdminCommentOutputSchema},
  prompt: `Anda adalah asisten yang membantu admin koperasi untuk menanggapi komentar anggota terkait pengumuman. Tanggapi komentar pengguna dengan bahasa Indonesia yang profesional, persuasif, dan membujuk, serta mendorong keterlibatan lebih lanjut.

Pengumuman: {{{announcementText}}}
Komentar Pengguna: {{{userComment}}}

Respon AI:`,
});

const generateAdminCommentFlow = ai.defineFlow(
  {
    name: 'generateAdminCommentFlow',
    inputSchema: GenerateAdminCommentInputSchema,
    outputSchema: GenerateAdminCommentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
