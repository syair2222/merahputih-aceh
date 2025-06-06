
'use server';
/**
 * @fileOverview An AI assistant to answer questions about the cooperative.
 *
 * - cooperativeAssistantFlow - A function that provides answers based on cooperative information.
 * - CooperativeAssistantInput - The input type for the cooperativeAssistantFlow function.
 * - CooperativeAssistantOutput - The return type for the cooperativeAssistantFlow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { cooperativeInfo } from '@/lib/site-data';

const CooperativeAssistantInputSchema = z.object({
  query: z.string().describe('The user\'s question about the cooperative.'),
});
export type CooperativeAssistantInput = z.infer<
  typeof CooperativeAssistantInputSchema
>;

const CooperativeAssistantOutputSchema = z.object({
  response: z
    .string()
    .describe('A helpful and informative answer to the user\'s question.'),
});
export type CooperativeAssistantOutput = z.infer<
  typeof CooperativeAssistantOutputSchema
>;

const assistantPrompt = ai.definePrompt({
  name: 'cooperativeAssistantPrompt',
  input: {schema: CooperativeAssistantInputSchema},
  output: {schema: CooperativeAssistantOutputSchema},
  prompt: `Anda adalah asisten AI untuk ${cooperativeInfo.name}. Jawab pertanyaan pengguna dengan ramah, profesional, dan informatif berdasarkan informasi berikut.

Informasi Koperasi:
Nama: ${cooperativeInfo.name}
Lokasi: ${cooperativeInfo.location}
Tahun Pendirian: ${cooperativeInfo.established}
Pengenalan: ${cooperativeInfo.introduction}

Maksud Pendirian:
${cooperativeInfo.purpose.map(p => `- ${p}`).join('\n')}

Tujuan Pendirian:
${cooperativeInfo.objectives.map(o => `- ${o}`).join('\n')}

Nilai-nilai Koperasi:
${cooperativeInfo.values.map(v => `- ${v.name}: ${v.description}`).join('\n')}

Pertanyaan Pengguna: {{{query}}}

Berikan jawaban yang jelas dan ringkas dalam Bahasa Indonesia. Jika pertanyaan di luar konteks koperasi atau informasi yang tidak tersedia di atas, nyatakan bahwa Anda hanya bisa menjawab pertanyaan umum terkait koperasi berdasarkan informasi yang diberikan atau sarankan untuk menghubungi pihak koperasi secara langsung untuk detail lebih lanjut.
Selalu gunakan bahasa yang sopan dan membujuk. Jika pertanyaannya adalah sapaan atau pujian, balas dengan ramah dan tawarkan bantuan.
Contoh arahan awal:
- Untuk mendaftar sebagai anggota, Anda bisa mengunjungi halaman pendaftaran kami.
- Untuk mengetahui tentang layanan simpan pinjam, Anda bisa melihat detailnya di bagian layanan koperasi.
- Koperasi kami bertujuan untuk meningkatkan kesejahteraan anggota dan masyarakat.
`,
});

const internalFlow = ai.defineFlow(
  {
    name: 'internalCooperativeAssistantFlow',
    inputSchema: CooperativeAssistantInputSchema,
    outputSchema: CooperativeAssistantOutputSchema,
  },
  async (input) => {
    const {output} = await assistantPrompt(input);
    return output!;
  }
);

export async function cooperativeAssistantFlow(
  input: CooperativeAssistantInput
): Promise<CooperativeAssistantOutput> {
  return internalFlow(input);
}
