
'use server';
/**
 * @fileOverview An AI tool to analyze financial transactions for potential anomalies and assess risk.
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
  userId: z.string().optional().describe("Identifier of the user who created or is associated with the transaction."),
});
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

const AnalyzeTransactionsInputSchema = z.object({
  transactions: z.array(TransactionInputSchema).describe("A list of financial transactions to analyze."),
  config: z.object({
    largeTransactionThreshold: z.number().default(10000000).describe("Threshold above which a transaction is considered large."),
    duplicateTimeWindowSeconds: z.number().default(300).describe("Time window in seconds to check for potential duplicates (same description, amount)."),
    suspiciousKeywords: z.array(z.string()).default(["pribadi", "tanpa faktur", "tidak jelas", "pinjaman pribadi diluar koperasi", "uang muka tanpa PO", "biaya representasi tanpa detail"]).describe("Keywords in description that might indicate a suspicious transaction."),
    commonTransactionPatterns: z.record(z.string(), z.string()).optional().describe("Examples of common, legitimate transaction patterns to reduce false positives. E.g., {'Regular Salary Payment': 'Monthly salary for employees'}"),
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
    "UnusualAccountActivity",
    "AIPatternConcern", // New type for AI-specific concerns
    "OtherAIConcern"
  ]).describe("The type of anomaly detected."),
  reason: z.string().describe("Explanation of why this transaction is flagged as an anomaly."),
  severity: z.enum(["High", "Medium", "Low"]).default("Medium").describe("Severity of the potential anomaly based on rules or AI initial assessment."),
  suggestion: z.string().optional().describe("Suggested action to take regarding this anomaly."),
  riskScore: z.number().optional().describe("A numerical risk score (e.g., 1-10) assigned to the transaction, potentially adjusted by AI."),
  aiRiskAssessment: z.string().optional().describe("Qualitative risk assessment provided by AI, explaining its reasoning beyond simple rules."),
});
export type PotentialAnomaly = z.infer<typeof PotentialAnomalySchema>;

const AnalyzeTransactionsOutputSchema = z.object({
  analyzedCount: z.number().describe("Number of transactions analyzed."),
  anomaliesFound: z.array(PotentialAnomalySchema).describe("List of potential anomalies found."),
  summary: z.string().describe("A brief summary of the analysis findings, including an overall risk perspective if discernible."),
  aiOverallAssessment: z.string().optional().describe("AI's overall assessment of the provided transaction batch, highlighting general concerns or confidence levels."),
});
export type AnalyzeTransactionsOutput = z.infer<typeof AnalyzeTransactionsOutputSchema>;


// --- Main Exported Function ---
export async function analyzeFinancialTransactions(
  input: AnalyzeTransactionsInput
): Promise<AnalyzeTransactionsOutput> {
  return financialAnomalyDetectionFlow(input);
}

// --- Genkit Prompt ---
const anomalyPrompt = ai.definePrompt({
  name: 'financialAnomalyPrompt',
  input: { schema: AnalyzeTransactionsInputSchema },
  output: { schema: z.object({ // LLM will primarily provide textual assessment for now
      overallAssessment: z.string().describe("Your overall qualitative assessment of the transaction batch. Note any general patterns of concern or if the batch appears low-risk. Mention if any transactions stand out to you even if they don't break hard rules."),
      specificTransactionAssessments: z.array(z.object({
          transactionId: z.string().describe("The ID of the transaction you are assessing."),
          aiRiskAssessment: z.string().describe("Your specific qualitative risk assessment for this transaction, explaining why it might be risky or unusual beyond basic rules. If it's a rule-based finding being reviewed, elaborate on the risk."),
          suggestedRiskScoreAdjustment: z.enum(["none", "increase", "decrease"]).optional().describe("Suggest if the rule-based severity/risk for this specific transaction should be reconsidered."),
      })).optional().describe("Specific assessments for transactions you find particularly noteworthy, or for those flagged by rules if you have additional insights."),
  })},
  prompt: `You are an expert financial auditor AI. Your task is to analyze a batch of financial transactions for potential anomalies, suspicious patterns, and overall risk.
You will be provided with a list of transactions and some configuration parameters used by a rule-based system.

Rule-based system configuration (for your context):
- Large Transaction Threshold: {{{config.largeTransactionThreshold}}}
- Suspicious Keywords: {{#each config.suspiciousKeywords}}"{{this}}", {{/each}}
- Common Legitimate Patterns (to help reduce false positives from your side):
{{#if config.commonTransactionPatterns}}
  {{#each config.commonTransactionPatterns}}
    - {{@key}}: {{{this}}}
  {{/each}}
{{else}}
  None provided.
{{/if}}

Transactions to Analyze:
{{#each transactions}}
- ID: {{{id}}}, Date: {{{date}}}, Description: "{{{description}}}", Amount: {{{amount}}}, Account: {{{accountId}}} ({{accountName}}), UserID: {{{userId}}}
{{/each}}

Instructions:
1.  **Overall Assessment**: Provide a general qualitative assessment of the entire transaction batch. Are there any overarching themes of concern? Does it seem generally high-risk, low-risk, or mixed?
2.  **Specific Transaction Review**:
    *   Review all transactions, not just those that might be flagged by simple rules.
    *   Identify any transactions that seem unusual, out of place, or warrant further investigation based on their description, amount, account used, or combination of factors, even if they don't match an explicit 'suspicious keyword' or exceed the 'large transaction threshold'.
    *   For transactions you identify as potentially risky or unusual, provide a specific `aiRiskAssessment` explaining your reasoning.
    *   If the rule-based system might flag a transaction (e.g., for being large or containing a keyword), and you have additional insights or agree/disagree with the potential severity, note this in your assessment for that transaction. You can suggest if its risk score should be adjusted.
3.  **Format**: Structure your findings in the 'overallAssessment' and 'specificTransactionAssessments' fields as per the output schema.

Focus on providing insights that a human auditor might find valuable, looking for nuances that simple rules could miss.
Do not simply repeat rule-based findings; add value by explaining *why* something is a concern from a broader perspective or due to subtle patterns.
Be concise but thorough in your explanations.
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
      suspiciousKeywords: config?.suspiciousKeywords ?? ["pribadi", "tanpa faktur", "tidak jelas", "pinjaman pribadi diluar koperasi", "uang muka tanpa PO", "biaya representasi tanpa detail"],
    };

    // 1. Rule: Large Transactions
    transactions.forEach(tx => {
      if (Math.abs(tx.amount) > effectiveConfig.largeTransactionThreshold) {
        anomalies.push({
          transaction: tx,
          anomalyType: "LargeTransaction",
          reason: `Transaction amount Rp ${tx.amount.toLocaleString('id-ID')} exceeds threshold of Rp ${effectiveConfig.largeTransactionThreshold.toLocaleString('id-ID')}.`,
          severity: "Medium", // Base severity, AI might adjust
          suggestion: "Verify the legitimacy and approval of this large transaction.",
        });
      }
    });

    // 2. Rule: Suspicious Keywords in Description
    effectiveConfig.suspiciousKeywords.forEach(keyword => {
      transactions.forEach(tx => {
        if (tx.description.toLowerCase().includes(keyword.toLowerCase())) {
          if (!anomalies.some(a => a.transaction.id === tx.id && a.anomalyType === "SuspiciousDescription")) {
            anomalies.push({
              transaction: tx,
              anomalyType: "SuspiciousDescription",
              reason: `Transaction description contains suspicious keyword: "${keyword}".`,
              severity: "High", // Base severity
              suggestion: "Investigate the nature and validity of this transaction due to its description.",
            });
          }
        }
      });
    });

    // 3. Rule: Potential Duplicates
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (let i = 0; i < sortedTransactions.length; i++) {
        for (let j = i + 1; j < sortedTransactions.length; j++) {
            const tx1 = sortedTransactions[i];
            const tx2 = sortedTransactions[j];
            const timeDiffSeconds = (new Date(tx2.date).getTime() - new Date(tx1.date).getTime()) / 1000;

            if (timeDiffSeconds > effectiveConfig.duplicateTimeWindowSeconds) break;

            if (tx1.id !== tx2.id &&
                tx1.description.toLowerCase() === tx2.description.toLowerCase() &&
                tx1.amount === tx2.amount &&
                (tx1.accountId === tx2.accountId || (!tx1.accountId && !tx2.accountId) ) &&
                timeDiffSeconds <= effectiveConfig.duplicateTimeWindowSeconds
            ) {
                const alreadyFlagged = anomalies.some(a =>
                    a.anomalyType === "PotentialDuplicate" &&
                    (a.reason.includes(`ID ${tx1.id}`) || a.reason.includes(`ID ${tx2.id}`))
                );
                if (!alreadyFlagged) {
                    anomalies.push({
                        transaction: tx1,
                        anomalyType: "PotentialDuplicate",
                        reason: `Potential duplicate of transaction ID ${tx2.id} (Description, Amount, Account, Date similar within ${effectiveConfig.duplicateTimeWindowSeconds}s).`,
                        severity: "Medium",
                        suggestion: `Review transactions ID ${tx1.id} and ${tx2.id} to confirm.`,
                    });
                    anomalies.push({ // Flag the other one too for clarity
                        transaction: tx2,
                        anomalyType: "PotentialDuplicate",
                        reason: `Potential duplicate of transaction ID ${tx1.id}. Marked as part of the same group.`,
                        severity: "Medium",
                        suggestion: `Review transactions ID ${tx1.id} and ${tx2.id} to confirm.`,
                    });
                }
            }
        }
    }

    // Call LLM for deeper analysis and risk assessment
    let llmSummary = "Rule-based analysis completed.";
    let aiOverallAssessmentText = "AI assessment was not performed or returned no specific overall insights.";

    try {
        const { output } = await anomalyPrompt(input);
        if (output) {
            aiOverallAssessmentText = output.overallAssessment || aiOverallAssessmentText;
            llmSummary = `Rule-based analysis done. AI Overall Assessment: ${aiOverallAssessmentText}`;

            output.specificTransactionAssessments?.forEach(aiAssessment => {
                const targetAnomaly = anomalies.find(a => a.transaction.id === aiAssessment.transactionId);
                if (targetAnomaly) {
                    targetAnomaly.aiRiskAssessment = aiAssessment.aiRiskAssessment;
                    // Simple risk score adjustment based on AI suggestion (can be more nuanced)
                    if (aiAssessment.suggestedRiskScoreAdjustment === "increase" && targetAnomaly.severity === "Low") targetAnomaly.severity = "Medium";
                    else if (aiAssessment.suggestedRiskScoreAdjustment === "increase" && targetAnomaly.severity === "Medium") targetAnomaly.severity = "High";
                    else if (aiAssessment.suggestedRiskScoreAdjustment === "decrease" && targetAnomaly.severity === "High") targetAnomaly.severity = "Medium";
                    else if (aiAssessment.suggestedRiskScoreAdjustment === "decrease" && targetAnomaly.severity === "Medium") targetAnomaly.severity = "Low";
                } else {
                    // AI found an anomaly not caught by rules
                    const originalTx = transactions.find(t => t.id === aiAssessment.transactionId);
                    if (originalTx) {
                        anomalies.push({
                            transaction: originalTx,
                            anomalyType: "AIPatternConcern", // Or parse from AI if possible
                            reason: aiAssessment.aiRiskAssessment || "AI identified a pattern of concern.",
                            severity: "Medium", // Default for AI-only findings, could be refined
                            suggestion: "Review this transaction based on AI's assessment.",
                            aiRiskAssessment: aiAssessment.aiRiskAssessment,
                        });
                    }
                }
            });
        }
    } catch (e) {
        console.warn("LLM part of anomaly detection failed, using rule-based results only:", e);
        llmSummary = "Rule-based analysis completed. LLM review encountered an error.";
        aiOverallAssessmentText = "LLM review was skipped due to an error.";
    }

    // Assign base risk scores from severity
    anomalies.forEach(anomaly => {
        if (anomaly.severity === "High") anomaly.riskScore = 9;
        else if (anomaly.severity === "Medium") anomaly.riskScore = 6;
        else if (anomaly.severity === "Low") anomaly.riskScore = 3;
        else anomaly.riskScore = 1; // Default for unexpected
    });

    // Remove duplicates from anomalies array (e.g. same transaction flagged for Large Amount and Suspicious Keyword)
    // This focuses on unique transaction IDs, if a transaction has multiple anomaly *types*, it's usually fine to list them
    // The previous duplicate check was more about not adding the *same* anomaly type twice.
    // For now, if a transaction is large AND has suspicious keyword, it might appear twice, which is acceptable to show multiple flags.
    // A more sophisticated approach might group anomalies by transaction ID.
    const uniqueAnomalies = anomalies.filter((anomaly, index, self) =>
        index === self.findIndex((a) => (
            a.transaction.id === anomaly.transaction.id && a.anomalyType === anomaly.anomalyType // Ensure truly unique anomaly entries
        ))
    );


    return {
      analyzedCount: transactions.length,
      anomaliesFound: uniqueAnomalies,
      summary: `Analyzed ${transactions.length} transactions. Found ${uniqueAnomalies.length} potential anomalies. ${llmSummary}`,
      aiOverallAssessment: aiOverallAssessmentText,
    };
  }
);
    