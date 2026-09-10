import { describe, expect, it } from "vitest";
import {
  CITY_OPTIONS,
  type DogFormValues,
  findCityOption,
  isDogFormValid,
  validateDogForm,
} from "@/lib/dog-form";

const validValues: DogFormValues = {
  name: "Bruno",
  breed: "Labrador Retriever",
  city: "Bengaluru",
  sex: "Male",
  ageYears: "3",
  bio: "Friendly and energetic.",
};

describe("validateDogForm", () => {
  it("accepts a fully valid form", () => {
    expect(isDogFormValid(validateDogForm(validValues))).toBe(true);
  });

  it("requires a non-empty name", () => {
    const errors = validateDogForm({ ...validValues, name: "  " });
    expect(errors.name).toBeDefined();
  });

  it("rejects a name over 60 characters", () => {
    const errors = validateDogForm({ ...validValues, name: "a".repeat(61) });
    expect(errors.name).toBeDefined();
  });

  it("requires a recognized city", () => {
    const errors = validateDogForm({ ...validValues, city: "Nowhereville" });
    expect(errors.city).toBeDefined();
  });

  it("requires age to be a non-negative integer no greater than 30", () => {
    expect(
      validateDogForm({ ...validValues, ageYears: "" }).ageYears,
    ).toBeDefined();
    expect(
      validateDogForm({ ...validValues, ageYears: "-1" }).ageYears,
    ).toBeDefined();
    expect(
      validateDogForm({ ...validValues, ageYears: "3.5" }).ageYears,
    ).toBeDefined();
    expect(
      validateDogForm({ ...validValues, ageYears: "31" }).ageYears,
    ).toBeDefined();
    expect(
      validateDogForm({ ...validValues, ageYears: "0" }).ageYears,
    ).toBeUndefined();
    expect(
      validateDogForm({ ...validValues, ageYears: "30" }).ageYears,
    ).toBeUndefined();
  });

  it("requires a non-empty bio within 1000 characters", () => {
    expect(validateDogForm({ ...validValues, bio: " " }).bio).toBeDefined();
    expect(
      validateDogForm({ ...validValues, bio: "a".repeat(1001) }).bio,
    ).toBeDefined();
  });
});

describe("findCityOption", () => {
  it("finds an exact match among the supported cities", () => {
    expect(findCityOption("Mumbai")).toEqual(
      expect.objectContaining({
        name: "Mumbai",
        latitude: 19.076,
        longitude: 72.8777,
      }),
    );
  });

  it("returns undefined for an unsupported city", () => {
    expect(findCityOption("Atlantis")).toBeUndefined();
  });

  it("has exactly the six cities the backend's discovery search recognizes", () => {
    expect(CITY_OPTIONS.map((c) => c.name)).toEqual([
      "Bengaluru",
      "Delhi NCR",
      "Mumbai",
      "Hyderabad",
      "Pune",
      "Chennai",
    ]);
  });
});
