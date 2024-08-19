import { describe, it, expect } from "vitest";
import { useFormValidation } from "../src/useFormValidation";

describe("useFormValidation", () => {
  it("should validate required fields correctly", async () => {
    const { values, validateAll, isValid, errors } = useFormValidation({
      email: {
        initial: "",
        rules: [(v) => (v ? null : "Email is required")]
      }
    });

    expect(isValid.value).toBe(true);
    const valid = await validateAll();
    expect(valid).toBe(false);
    expect(errors.email).toBe("Email is required");

    values.email = "test@example.com";
    const validAfter = await validateAll();
    expect(validAfter).toBe(true);
    expect(errors.email).toBe("");
  });
});
