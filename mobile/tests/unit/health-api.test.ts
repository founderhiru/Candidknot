import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiFetch: apiFetchMock,
}));

const sampleRecord = {
  id: "rec1",
  dogId: "dog1",
  type: "vaccination",
  title: "Rabies vaccination",
  occurredOn: "2026-01-15",
  vetName: "Dr. Sharma",
  notes: null,
  documents: [],
};

describe("listHealthRecords", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("fetches records for a dog, ownership enforced server-side", async () => {
    apiFetchMock.mockResolvedValue({ items: [sampleRecord] });
    const { listHealthRecords } = await import("@/lib/health-api");
    await listHealthRecords("dog1");
    const [path] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/dog-profiles/dog1/health-records");
  });
});

describe("createHealthRecord / updateHealthRecord", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue(sampleRecord);
  });

  it("POSTs the write fields only — never a dogId authority field", async () => {
    const { createHealthRecord } = await import("@/lib/health-api");
    await createHealthRecord("dog1", {
      type: "vaccination",
      title: "Rabies vaccination",
      occurredOn: "2026-01-15",
    });
    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/dog-profiles/dog1/health-records");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body).not.toHaveProperty("dogId");
    expect(body).not.toHaveProperty("id");
  });

  it("PATCHes an existing record by id in the URL, not in the body", async () => {
    const { updateHealthRecord } = await import("@/lib/health-api");
    await updateHealthRecord("dog1", "rec1", {
      type: "other",
      title: "Checkup",
      occurredOn: "2026-02-01",
    });
    const [path, options] = apiFetchMock.mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(path).toBe("/api/dog-profiles/dog1/health-records/rec1");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).not.toHaveProperty("id");
  });
});

describe("deleteHealthRecord", () => {
  it("deletes a record by dog id + record id", async () => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ ok: true });
    const { deleteHealthRecord } = await import("@/lib/health-api");
    await deleteHealthRecord("dog1", "rec1");
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/dog-profiles/dog1/health-records/rec1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("document operations", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("uploads a document as multipart FormData", async () => {
    apiFetchMock.mockResolvedValue(sampleRecord);
    const { uploadHealthDocument } = await import("@/lib/health-api");
    await uploadHealthDocument("dog1", "rec1", {
      uri: "file:///tmp/cert.pdf",
      name: "cert.pdf",
      type: "application/pdf",
    });
    const [path, options] = apiFetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/dog-profiles/dog1/health-records/rec1/documents");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("deletes a document by dog id + record id + document id", async () => {
    apiFetchMock.mockResolvedValue({ ok: true });
    const { deleteHealthDocument } = await import("@/lib/health-api");
    await deleteHealthDocument("dog1", "rec1", "doc1");
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/dog-profiles/dog1/health-records/rec1/documents/doc1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("requests a fresh signed download url", async () => {
    apiFetchMock.mockResolvedValue({
      url: "https://storage.example.com/signed",
      expiresInSeconds: 300,
    });
    const { getDocumentDownloadUrl } = await import("@/lib/health-api");
    const result = await getDocumentDownloadUrl("dog1", "rec1", "doc1");
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/dog-profiles/dog1/health-records/rec1/documents/doc1/download",
      expect.anything(),
    );
    expect(result.url).toBe("https://storage.example.com/signed");
  });
});
