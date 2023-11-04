import { reactive, computed, ref } from "vue";

export type ValidatorFn<T> = (val: T) => string | null | Promise<string | null>;

export interface FieldConfig<T> {
  initial: T;
  rules?: ValidatorFn<T>[];
}

export function useFormValidation<T extends Record<string, any>>(
  schema: { [K in keyof T]: FieldConfig<T[K]> }
) {
  const values = reactive<any>({});
  const errors = reactive<Record<string, string>>({});
  const touched = reactive<Record<string, boolean>>({});
  const isSubmitting = ref(false);

  for (const key of Object.keys(schema)) {
    values[key] = schema[key].initial;
    errors[key] = "";
    touched[key] = false;
  }

  const validateField = async (key: string) => {
    const rules = schema[key]?.rules || [];
    const val = values[key];
    for (const rule of rules) {
      const res = await rule(val);
      if (res) {
        errors[key] = res;
        return false;
      }
    }
    errors[key] = "";
    return true;
  };

  const validateAll = async (): Promise<boolean> => {
    let valid = true;
    for (const key of Object.keys(schema)) {
      touched[key] = true;
      const ok = await validateField(key);
      if (!ok) valid = false;
    }
    return valid;
  };

  const isValid = computed(() => Object.values(errors).every((e) => !e));

  const reset = () => {
    for (const key of Object.keys(schema)) {
      values[key] = schema[key].initial;
      errors[key] = "";
      touched[key] = false;
    }
    isSubmitting.value = false;
  };

  return {
    values: values as T,
    errors,
    touched,
    isValid,
    isSubmitting,
    validateField,
    validateAll,
    reset
  };
}
