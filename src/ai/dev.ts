
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-cooperative-principles.ts';
import '@/ai/flows/admin-comment-assistance.ts';
import '@/ai/flows/cooperative-assistant-flow.ts';
import '@/ai/flows/analyze-financial-transactions.ts';
import '@/ai/flows/financial-qa-flow.ts'; // Added new QA flow

