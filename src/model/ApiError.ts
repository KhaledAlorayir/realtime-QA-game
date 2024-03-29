import { ZodError } from "zod";

export class ApiError {
  messages: string[] = [];

  private setSingleError(error: string) {
    this.messages.push(error);
  }

  static parseServerError() {
    const apiError = new ApiError();
    apiError.setSingleError("server error");
    return apiError;
  }

  static parseZodError(errors: ZodError) {
    const apiError = new ApiError();
    apiError.messages = errors.issues.map(
      (issue) => `${issue.path[0]}: ${issue.message}`
    );
    return apiError;
  }

  static parseUnknownError(unknownError: unknown) {
    if (unknownError instanceof ZodError) {
      return this.parseZodError(unknownError);
    }
    const apiError = new ApiError();
    const error = unknownError as any;
    apiError.setSingleError(error?.message ?? "an error has occurred");
    return apiError;
  }
}
