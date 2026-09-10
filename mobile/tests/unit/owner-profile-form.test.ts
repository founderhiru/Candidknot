import { describe, expect, it } from "vitest";
import {
  isOwnerProfileFormValid,
  type OwnerProfileFormValues,
  validateOwnerProfileForm,
} from "@/lib/owner-profile-form";

const validValues: OwnerProfileFormValues = {
  name: "Asha Rao",
  city: "Pune",
  bio: "Responsible Labrador owner in Pune, looking for a healthy match.",
};

describe("validateOwnerProfileForm", () => {
  it("accepts a fully valid form", () => {
    expect(isOwnerProfileFormValid(validateOwnerProfileForm(validValues))).toBe(
      true,
    );
  });

  it("requires a non-empty name", () => {
    expect(
      validateOwnerProfileForm({ ...validValues, name: "  " }).name,
    ).toBeDefined();
  });

  it("requires a non-empty city within 120 characters", () => {
    expect(
      validateOwnerProfileForm({ ...validValues, city: "" }).city,
    ).toBeDefined();
    expect(
      validateOwnerProfileForm({ ...validValues, city: "a".repeat(121) }).city,
    ).toBeDefined();
  });

  it("requires a non-empty bio within 1000 characters", () => {
    expect(
      validateOwnerProfileForm({ ...validValues, bio: "" }).bio,
    ).toBeDefined();
    expect(
      validateOwnerProfileForm({ ...validValues, bio: "a".repeat(1001) }).bio,
    ).toBeDefined();
  });
});
