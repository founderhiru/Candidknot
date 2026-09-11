// Mobile (Health Passport phase) — pure validation, kept free of RN imports
// so it can be unit-tested directly. Mirrors the backend's HealthRecordWrite
// constraints (see health-contracts.ts / src/lib/contracts/health-records.ts)
// so the form fails the same way the API would, before any network request.
import { HEALTH_RECORD_TYPES, type HealthRecordType } from "./health-contracts";

export const HEALTH_RECORD_TYPE_LABELS: Record<HealthRecordType, string> = {
  vaccination: "Vaccination",
  vetVisit: "Vet Visit",
  other: "Other",
};

export const HEALTH_RECORD_TYPE_OPTIONS = HEALTH_RECORD_TYPES.map(
  (type) => HEALTH_RECORD_TYPE_LABELS[type],
);

export function labelToType(label: string): HealthRecordType | undefined {
  return HEALTH_RECORD_TYPES.find(
    (type) => HEALTH_RECORD_TYPE_LABELS[type] === label,
  );
}

const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/;

export interface HealthRecordFormValues {
  type: string; // holds the display label (see HEALTH_RECORD_TYPE_OPTIONS), converted at submit time
  title: string;
  occurredOn: string; // YYYY-MM-DD, as typed
  vetName: string;
  notes: string;
}

export interface HealthRecordFormErrors {
  type?: string;
  title?: string;
  occurredOn?: string;
  vetName?: string;
  notes?: string;
}

export function validateHealthRecordForm(
  values: HealthRecordFormValues,
): HealthRecordFormErrors {
  const errors: HealthRecordFormErrors = {};

  if (!labelToType(values.type)) {
    errors.type = "Choose a record type";
  }

  const title = values.title.trim();
  if (!title) errors.title = "Title is required";
  else if (title.length > 120) errors.title = "Title is too long";

  const occurredOn = values.occurredOn.trim();
  if (!occurredOn) {
    errors.occurredOn = "Date is required";
  } else if (
    !isoDateOnly.test(occurredOn) ||
    Number.isNaN(Date.parse(occurredOn))
  ) {
    errors.occurredOn = "Use YYYY-MM-DD";
  }

  if (values.vetName.trim().length > 120) {
    errors.vetName = "Vet name is too long";
  }

  if (values.notes.trim().length > 1000) {
    errors.notes = "Notes are too long";
  }

  return errors;
}

export function isHealthRecordFormValid(
  errors: HealthRecordFormErrors,
): boolean {
  return Object.keys(errors).length === 0;
}
