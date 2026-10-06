/**
 * Lightweight Zod schema resolver for React Hook Form
 * Conforms to React Hook Form Resolver specification without requiring external packages
 */
export const zodResolver = (schema) => async (data) => {
  try {
    const values = await schema.parseAsync(data);
    return {
      values,
      errors: {},
    };
  } catch (error) {
    if (error && error.issues) {
      const fieldErrors = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.') || 'root';
        if (!fieldErrors[path]) {
          fieldErrors[path] = {
            type: issue.code,
            message: issue.message,
          };
        }
      }
      return {
        values: {},
        errors: fieldErrors,
      };
    }
    return {
      values: {},
      errors: { root: { type: 'validation', message: error.message || 'Validation failed' } },
    };
  }
};
