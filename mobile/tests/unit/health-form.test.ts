import { describe, expect, it } from "vitest";
import {
  HEALTH_RECORD_TYPE_OPTIONS,
  type HealthRecordFormValues,
  isHealthRecordFormValid,
  labelToType,
  validateHealthRecordForm,
} from "@/lib/health-form";

const validValues: HealthRecordFormValues = {
  type: "Vaccination",
  title: "Rabies vaccination",
  occurredOn: "2026-01-15",
  vetName: "Dr. Sharma",
  notes: "Annual booster.",
};

describe("validateHealthRecordForm", () => {
  it("accepts a fully valid form", () => {
    expect(isHealthRecordFormValid(validateHealthRecordForm(validValues))).toBe(
      true,
    );
  });

  it("accepts optional fields left blank", () => {
    const errors = validateHealthRecordForm({
      ...validValues,
      vetName: "",
      notes: "",
    });
    expect(isHealthRecordFormValid(errors)).toBe(true);
  });

  it("requires a recognized type", () => {
    expect(
      validateHealthRecordForm({ ...validValues, type: "" }).type,
    ).toBeDefined();
    expect(
      validateHealthRecordForm({ ...validValues, type: "Not a type" }).type,
    ).toBeDefined();
  });

  it("requires a non-empty title within 120 characters", () => {
    expect(
      validateHealthRecordForm({ ...validValues, title: " " }).title,
    ).toBeDefined();
    expect(
      validateHealthRecordForm({ ...validValues, title: "a".repeat(121) })
        .title,
    ).toBeDefined();
  });

  it("requires a YYYY-MM-DD date", () => {
    expect(
      validateHealthRecordForm({ ...validValues, occurredOn: "" }).occurredOn,
    ).toBeDefined();
    expect(
      validateHealthRecordForm({ ...validValues, occurredOn: "15/01/2026" })
        .occurredOn,
    ).toBeDefined();
    expect(
      validateHealthRecordForm({ ...validValues, occurredOn: "2026-13-40" })
        .occurredOn,
    ).toBeDefined();
  });

  it("rejects a vet name over 120 characters", () => {
    expect(
      validateHealthRecordForm({ ...validValues, vetName: "a".repeat(121) })
        .vetName,
    ).toBeDefined();
  });

  it("rejects notes over 1000 characters", () => {
    expect(
      validateHealthRecordForm({ ...validValues, notes: "a".repeat(1001) })
        .notes,
    ).toBeDefined();
  });
});

describe("labelToType / HEALTH_RECORD_TYPE_OPTIONS", () => {
  it("has exactly the three types the backend contract recognizes", () => {
    expect(HEALTH_RECORD_TYPE_OPTIONS).toEqual([
      "Vaccination",
      "Vet Visit",
      "Other",
    ]);
  });

  it("round-trips every option label back to its type", () => {
    expect(labelToType("Vaccination")).toBe("vaccination");
    expect(labelToType("Vet Visit")).toBe("vetVisit");
    expect(labelToType("Other")).toBe("other");
  });

  it("returns undefined for an unrecognized label", () => {
    expect(labelToType("Surgery")).toBeUndefined();
  });
});
