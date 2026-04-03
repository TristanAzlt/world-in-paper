import { type ZodType } from 'zod';
import type { FrontValidationResult } from '../types/validation';

export function verifyZod<TOutput>(
    schema: ZodType<TOutput>,
    frontData: unknown
): FrontValidationResult<TOutput> {
    const parsed = schema.safeParse(frontData);

    if (parsed.success) {
        return {
            success: true,
            data: parsed.data,
            errors: null
        };
    }

    return {
        success: false,
        data: null,
        errors: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message
        }))
    };
}
