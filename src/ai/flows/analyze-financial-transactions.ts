'use server';
/**
 * @fileOverview An AI tool to analyze financial transactions for potential anomalies.
 *
 * - analyzeFinancialTransactions - A function that analyzes a list of transactions.
 * - AnalyzeTransactionsInput - The input type for the analyzeFinancialTransactions function.
 * - PotentialAnomaly - The type for an identified potential anomaly.
 * - AnalyzeTransactionsOutput - The return type for the analyzeFinancialTransactions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Input Schema ---
const TransactionInputSchema = z.object({
  id: z.string().describe("Unique identifier for the transaction or journal entry."),
  date: z.string().describe("Date of the transaction in YYYY-MM-DD format."),
  description: z.string().describe("Description of the transaction."),
  amount: z.number().describe("Monetary value of the transaction. Positive for income/debit to asset, negative for expense/credit to asset, or use debit/credit fields."),
  accountId: z.string().optional().describe("Account ID related to this transaction or entry."),
  accountName: z.string().optional().describe("Name of the account related."),
  type: z.enum(['debit', 'credit']).optional().describe("Type of the entry if it's a journal line."),
  category: z.string().optional().describe("Category of the transaction if pre-classified."),
});
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

const AnalyzeTransactionsInputSchema = z.object({
  transactions: z.array(TransactionInputSchema).describe("A list of financial transactions to analyze."),
  config: z.object({
    largeTransactionThreshold: z.number().default(10000000).describe("Threshold above which a transaction is considered large."),
    duplicateTimeWindowSeconds: z.number().default(300).describe("Time window in seconds to check for potential duplicates (same description, amount)."),
    suspiciousKeywords: z.array(z.string()).default(["pribadi", "tanpa faktur", "tidak jelas", "pinjaman pribadi diluar koperasi"]).describe("Keywords in description that might indicate a suspicious transaction."),
  }).optional().describe("Configuration for anomaly detection parameters."),
});
export type AnalyzeTransactionsInput = z.infer<typeof AnalyzeTransactionsInputSchema>;


// --- Output Schema ---
const PotentialAnomalySchema = z.object({
  transaction: TransactionInputSchema.describe("The transaction data that is potentially anomalous."),
  anomalyType: z.enum([
    "LargeTransaction", 
    "PotentialDuplicate", 
    "SuspiciousDescription",
    "UnusualAccountActivity", // Placeholder for future
    "OtherAIConcern"
  ]).describe("The type of anomaly detected."),
  reason: z.string().describe("Explanation of why this transaction is flagged as an anomaly."),
  severity: z.enum(["High", "Medium", "Low"]).default("Medium").describe("Severity of the potential anomaly."),
  suggestion: z.string().optional().describe("Suggested action to take regarding this anomaly."),
});
export type PotentialAnomaly = z.infer<typeof PotentialAnomalySchema>;

const AnalyzeTransactionsOutputSchema = z.object({
  analyzedCount: z.number().describe("Number of transactions analyzed."),
  anomaliesFound: z.array(PotentialAnomalySchema).describe("List of potential anomalies found."),
  summary: z.string().describe("A brief summary of the analysis findings."),
});
export type AnalyzeTransactionsOutput = z.infer<typeof AnalyzeTransactionsOutputSchema>;


// --- Main Exported Function ---
export async function analyzeFinancialTransactions(
  input: AnalyzeTransactionsInput
): Promise<AnalyzeTransactionsOutput> {
  return financialAnomalyDetectionFlow(input);
}

// --- Genkit Prompt ---
// For now, we will focus more on rule-based detection in TypeScript.
// The prompt can be enhanced later to ask the LLM to review the rule-based findings
// or to find anomalies that rules might miss.
const anomalyPrompt = ai.definePrompt({
  name: 'financialAnomalyPrompt',
  input: { schema: AnalyzeTransactionsInputSchema },
  output: { schema: AnalyzeTransactionsOutputSchema }, // We'll construct this output mostly from rules.
  prompt: `You are an expert financial auditor AI. Review the provided list of transactions.
Based on your expertise and the following configuration parameters (if provided), identify potential financial anomalies.
The primary analysis will be done by the calling system using rules.
Your role here is to provide a high-level review or catch anything missed by simple rules, especially concerning transaction descriptions or unusual patterns that require human-like interpretation.

Configuration for rule-based system (for your context, not direct execution):
- Large Transaction Threshold: {{{config.largeTransactionThreshold}}}
- Suspicious Keywords: {{#each config.suspiciousKeywords}}{{{this}}}, {{/each}}

Transactions:
{{#each transactions}}
- ID: {{{id}}}, Date: {{{date}}}, Description: "{{{description}}}", Amount: {{{amount}}}, Account: {{{accountId}}} ({{accountName}})
{{/each}}

Based on a quick review, provide a summary. The detailed list of anomalies will be primarily generated by rules in the calling code.
If you spot anything particularly concerning from the descriptions or overall pattern that rules might miss, highlight it in the summary.
The output 'anomaliesFound' array will be populated by the calling code. Just provide the 'analyzedCount' and a 'summary'.
The summary should be brief and confirm you've reviewed the data.
`,
});


// --- Genkit Flow ---
const financialAnomalyDetectionFlow = ai.defineFlow(
  {
    name: 'financialAnomalyDetectionFlow',
    inputSchema: AnalyzeTransactionsInputSchema,
    outputSchema: AnalyzeTransactionsOutputSchema,
  },
  async (input) => {
    const { transactions, config } = input;
    const anomalies: PotentialAnomaly[] = [];

    const effectiveConfig = {
      largeTransactionThreshold: config?.largeTransactionThreshold ?? 10000000,
      duplicateTimeWindowSeconds: config?.duplicateTimeWindowSeconds ?? 300,
      suspiciousKeywords: config?.suspiciousKeywords ?? ["pribadi", "tanpa faktur", "tidak jelas", "pinjaman pribadi diluar koperasi"],
    };

    // 1. Rule: Large Transactions
    transactions.forEach(tx => {
      if (Math.abs(tx.amount) > effectiveConfig.largeTransactionThreshold) {
        anomalies.push({
          transaction: tx,
          anomalyType: "LargeTransaction",
          reason: `Transaction amount Rp ${tx.amount.toLocaleString('id-ID')} exceeds threshold of Rp ${effectiveConfig.largeTransactionThreshold.toLocaleString('id-ID')}.`,
          severity: "Medium",
          suggestion: "Verify the legitimacy and approval of this large transaction.",
        });
      }
    });

    // 2. Rule: Suspicious Keywords in Description
    effectiveConfig.suspiciousKeywords.forEach(keyword => {
      transactions.forEach(tx => {
        if (tx.description.toLowerCase().includes(keyword.toLowerCase())) {
          // Avoid re-adding if already flagged for another keyword (simple check)
          if (!anomalies.some(a => a.transaction.id === tx.id && a.anomalyType === "SuspiciousDescription")) {
            anomalies.push({
              transaction: tx,
              anomalyType: "SuspiciousDescription",
              reason: `Transaction description contains suspicious keyword: "${keyword}".`,
              severity: "High",
              suggestion: "Investigate the nature and validity of this transaction due to its description.",
            });
          }
        }
      });
    });
    
    // 3. Rule: Potential Duplicates
    // This is a simplified check. A more robust check would sort by date and compare neighbors.
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (let i = 0; i < sortedTransactions.length; i++) {
        for (let j = i + 1; j < sortedTransactions.length; j++) {
            const tx1 = sortedTransactions[i];
            const tx2 = sortedTransactions[j];

            const timeDiffSeconds = (new Date(tx2.date).getTime() - new Date(tx1.date).getTime()) / 1000;

            if (timeDiffSeconds > effectiveConfig.duplicateTimeWindowSeconds) {
                // If tx2 is too far in the future from tx1, no need to check further tx2 against tx1
                // (assuming transactions are somewhat ordered or this inner loop will become too inefficient)
                // This break is only valid if the outer loop ensures tx1 is always earlier or same time as tx2.
                // With current sort, this is true.
                break; 
            }

            if (tx1.id !== tx2.id && // Ensure not comparing the same transaction if IDs are truly unique per entry
                tx1.description.toLowerCase() === tx2.description.toLowerCase() &&
                tx1.amount === tx2.amount &&
                (tx1.accountId === tx2.accountId || (!tx1.accountId && !tx2.accountId) ) && // Check account if available
                timeDiffSeconds <= effectiveConfig.duplicateTimeWindowSeconds
            ) {
                 // Check if tx1 or tx2 already part of a duplicate anomaly group to avoid multiple reporting of same group
                const alreadyFlagged = anomalies.some(a => 
                    a.anomalyType === "PotentialDuplicate" && 
                    (a.reason.includes(`ID ${tx1.id}`) || a.reason.includes(`ID ${tx2.id}`))
                );

                if (!alreadyFlagged) {
                    anomalies.push({
                        transaction: tx1, // Or tx2, or a combined object
                        anomalyType: "PotentialDuplicate",
                        reason: `Potential duplicate of transaction ID ${tx2.id} (Description, Amount, Account, and Date are very similar within ${effectiveConfig.duplicateTimeWindowSeconds}s window).`,
                        severity: "Medium",
                        suggestion: "Review transactions ID " + tx1.id + " and " + tx2.id + " to confirm if one is erroneous.",
                    });
                    // To prevent tx2 from being flagged again with tx1 if the outer loop continues.
                    // This is a simple way; more complex grouping might be needed for chains of duplicates.
                     anomalies.push({
                        transaction: tx2,
                        anomalyType: "PotentialDuplicate",
                        reason: `Potential duplicate of transaction ID ${tx1.id}. Marked as part of the same group.`,
                        severity: "Medium",
                        suggestion: "This is part of a duplicate group. Review with " + tx1.id + ".",
                    });
                }
            }
        }
    }


    // Call LLM for a high-level summary (optional, or to find things rules missed)
    // For now, we'll use a very basic call and primarily rely on rules.
    // The prompt is designed to expect the output to be mostly from rules.
    let llmSummary = "Rule-based analysis completed.";
    try {
        const { output } = await anomalyPrompt(input);
        if (output?.summary) {
            llmSummary = output.summary;
        }
    } catch (e) {
        console.warn("LLM part of anomaly detection failed, using rule-based results only:", e);
        llmSummary = "Rule-based analysis completed. LLM review was skipped due to an error.";
    }

    // Remove duplicates from anomalies array based on transaction.id and anomalyType
    const uniqueAnomalies = anomalies.filter((anomaly, index, self) =>
        index === self.findIndex((a) => (
            a.transaction.id === anomaly.transaction.id && a.anomalyType === anomaly.anomalyType
        ))
    );

    return {
      analyzedCount: transactions.length,
      anomaliesFound: uniqueAnomalies,
      summary: `Analyzed ${transactions.length} transactions. Found ${uniqueAnomalies.length} potential anomalies based on defined rules. LLM Summary: ${llmSummary}`,
    };
  }
);
