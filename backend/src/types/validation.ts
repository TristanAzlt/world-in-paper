export type ValidationIssue = {
    path: string;
    message: string;
};

export type FrontValidationResult<T> =
    | {
        success: true;
        data: T;
        errors: null;
    }
    | {
        success: false;
        data: null;
        errors: ValidationIssue[];
    };
