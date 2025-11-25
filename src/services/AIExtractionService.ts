import { ExtractedExpenseData, ConfidenceScores } from '../modules/expenses/types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://montpro.app.n8n.cloud/webhook/expense-management';

export interface AIExtractionRequest {
    files: File[];
    userId: string;
    currency: string;
}

export interface AIExtractionResponse {
    success: boolean;
    data?: ExtractedExpenseData;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    message?: string;
}

/**
 * Extract expense details from uploaded files using AI/OCR
 * @param request - Files and metadata for extraction
 * @returns Extracted expense data with confidence scores
 */
export const extractExpenseFromFiles = async (
    request: AIExtractionRequest
): Promise<AIExtractionResponse> => {
    try {
        const formData = new FormData();
        formData.append('userId', request.userId);
        formData.append('currency', request.currency);

        // Append all files
        request.files.forEach(file => {
            formData.append('files', file);
        });

        // Note: n8n webhook expects POST to the base URL directly
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: {
                    code: errorData.error?.code || 'API_ERROR',
                    message: errorData.error?.message || `Server error: ${response.status}`,
                    details: errorData.error?.details
                }
            };
        }

        const result: AIExtractionResponse = await response.json();
        return result;

    } catch (error) {
        console.error('AI Extraction Error:', error);
        return {
            success: false,
            error: {
                code: 'NETWORK_ERROR',
                message: 'Failed to connect to AI service. Please check your connection and try again.',
                details: error instanceof Error ? error.message : String(error)
            }
        };
    }
};

/**
 * Mock extraction for development/testing
 * Remove this when backend is ready
 */
export const mockExtractExpenseFromFiles = async (
    request: AIExtractionRequest
): Promise<AIExtractionResponse> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock successful extraction
    return {
        success: true,
        data: {
            vendor: 'Amazon Web Services',
            amount: 5000000,
            taxAmount: 550000,
            invoiceDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reference: `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            description: 'Cloud computing services and infrastructure',
            category: 'Software',
            confidence: {
                vendor: 0.95,
                amount: 0.98,
                taxAmount: 0.92,
                invoiceDate: 0.97,
                dueDate: 0.85,
                reference: 0.89,
                description: 0.88,
                category: 0.85
            },
            rawText: 'INVOICE\nAmazon Web Services\nInvoice Date: 2025-11-20\nAmount: Rp 5,000,000\nTax: Rp 550,000',
            processingTime: 2340
        },
        message: 'Successfully extracted expense details'
    };
};
