import { ZodError } from "zod";

export function validatorHook(
  result:
    | {
        success: true;
        data: any;
      }
    | {
        success: false;
        error: ZodError;
      }
) {
  if (!result.success) {
    throw result.error;
  }
}
