import { reactive, computed, ref } from "vue";

export type ValidatorFn<T> = (value: T) => string | null | Promise<string | null>;

export interface FieldConfig<T> {
  initialValue: T;
  rules?: ValidatorFn<T>[];
}

export type FormSchema<TForm extends Record<string, any>> = {
  [K in keyof TForm]: FieldConfig<TForm[K]>;
};

export interface FieldState<T> {
  value: T;
  error: string | null;
  isValidating: boolean;
  isDirty: boolean;
  isTouched: boolean;
}

export function useFormValidation<TForm extends Record<string, any>>(
  schema: FormSchema<TForm>
) {
  type Keys = keyof TForm;

  const formValues = reactive<Record<string, any>>({}) as TForm;
  const fieldErrors = reactive<Record<string, string | null>>({});
  const isValidatingField = reactive<Record<string, boolean>>({});
  const isDirtyField = reactive<Record<string, boolean>>({});
  const isTouchedField = reactive<Record<string, boolean>>({});
  const isSubmitting = ref(false);

  // Initialize form state
  for (const key in schema) {
    formValues[key] = schema[key].initialValue;
    fieldErrors[key] = null;
    isValidatingField[key] = false;
    isDirtyField[key] = false;
    isTouchedField[key] = false;
  }

  const validateField = async (key: Keys): Promise<boolean> => {
    const rules = schema[key].rules;
    if (!rules || rules.length === 0) {
      fieldErrors[key as string] = null;
      return true;
    }

    const val = formValues[key];
    isValidatingField[key as string] = true;

    try {
      for (const rule of rules) {
        const error = await rule(val);
        if (error) {
          fieldErrors[key as string] = error;
          isValidatingField[key as string] = false;
          return false;
        }
      }
      fieldErrors[key as string] = null;
      return true;
    } catch (err: any) {
      fieldErrors[key as string] = err?.message || "Validation failed";
      return false;
    } finally {
      isValidatingField[key as string] = false;
    }
  };

  const setFieldValue = (key: Keys, value: any, shouldValidate = true) => {
    formValues[key] = value;
    isDirtyField[key as string] = true;
    if (shouldValidate) {
      validateField(key);
    }
  };

  const setFieldTouched = (key: Keys, touched = true) => {
    isTouchedField[key as string] = touched;
  };

  const validateAll = async (): Promise<boolean> => {
    const promises = (Object.keys(schema) as Keys[]).map((key) => {
      isTouchedField[key as string] = true;
      return validateField(key);
    });
    const results = await Promise.all(promises);
    return results.every(Boolean);
  };

  const isValid = computed(() => {
    return Object.values(fieldErrors).every((err) => err === null);
  });

  const isDirty = computed(() => {
    return Object.values(isDirtyField).some(Boolean);
  });

  const isValidating = computed(() => {
    return Object.values(isValidatingField).some(Boolean);
  });

  const resetForm = () => {
    for (const key in schema) {
      formValues[key] = schema[key].initialValue;
      fieldErrors[key] = null;
      isValidatingField[key] = false;
      isDirtyField[key] = false;
      isTouchedField[key] = false;
    }
    isSubmitting.value = false;
  };

  const handleSubmit = (onValid: (values: TForm) => Promise<void> | void) => {
    return async (e?: Event) => {
      if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
      }

      isSubmitting.value = true;
      try {
        const passed = await validateAll();
        if (passed) {
          await onValid({ ...formValues });
        }
      } finally {
        isSubmitting.value = false;
      }
    };
  };

  return {
    values: formValues,
    errors: fieldErrors,
    isDirtyField,
    isTouchedField,
    isValidatingField,
    isValid,
    isDirty,
    isValidating,
    isSubmitting,
    validateField,
    validateAll,
    setFieldValue,
    setFieldTouched,
    resetForm,
    handleSubmit
  };
}
