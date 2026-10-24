import { describe, it, expect, vi } from "vitest";
import { useFormValidation } from "../src/composables/useFormValidation";

describe("useFormValidation", () => {
  const schema = {
    email: {
      initialValue: "",
      rules: [
        (val: string) => (!val ? "Email is required" : null),
        (val: string) => (!val.includes("@") ? "Invalid email format" : null)
      ]
    },
    password: {
      initialValue: "",
      rules: [
        (val: string) => (!val ? "Password required" : null),
        (val: string) => (val.length < 8 ? "Minimum 8 chars" : null)
      ]
    }
  };

  it("initializes in pristine state with values and no errors", () => {
    const form = useFormValidation(schema);

    expect(form.values.email).toBe("");
    expect(form.values.password).toBe("");
    expect(form.errors.email).toBeNull();
    expect(form.isDirty.value).toBe(false);
  });

  it("validates fields dynamically on input", async () => {
    const form = useFormValidation(schema);

    form.setFieldValue("email", "invalid-email");
    await form.validateField("email");

    expect(form.errors.email).toBe("Invalid email format");
    expect(form.isValid.value).toBe(false);
    expect(form.isDirty.value).toBe(true);

    form.setFieldValue("email", "aqib@example.com");
    await form.validateField("email");
    expect(form.errors.email).toBeNull();
  });

  it("validates all fields on handleSubmit and blocks if invalid", async () => {
    const form = useFormValidation(schema);
    const onSubmit = vi.fn();

    const submitHandler = form.handleSubmit(onSubmit);
    await submitHandler();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.errors.email).toBe("Email is required");
    expect(form.errors.password).toBe("Password required");

    // Fix values and submit again
    form.setFieldValue("email", "engineer@oneorigin.us", false);
    form.setFieldValue("password", "SecureSecret123!", false);

    await submitHandler();
    expect(onSubmit).toHaveBeenCalledWith({
      email: "engineer@oneorigin.us",
      password: "SecureSecret123!"
    });
  });

  it("supports asynchronous validators", async () => {
    const asyncSchema = {
      username: {
        initialValue: "",
        rules: [
          async (val: string) => {
            if (val === "taken_user") return "Username already in use";
            return null;
          }
        ]
      }
    };

    const form = useFormValidation(asyncSchema);
    form.setFieldValue("username", "taken_user");
    await form.validateField("username");

    expect(form.errors.username).toBe("Username already in use");
  });
});
