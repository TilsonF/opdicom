import { describe, expect, it, vi } from "vitest";
import {
  DicomWebClient,
  DwTag,
  buildWadoRsImageId,
  dwNumber,
  dwString,
  dwValue,
  sortInstanceMetadata,
  trimRoot,
  type DicomJsonDataset,
} from "../src/dicomweb.js";

const instance = (sop: string, number: number): DicomJsonDataset => ({
  [DwTag.SOPInstanceUID]: { vr: "UI", Value: [sop] },
  [DwTag.SeriesInstanceUID]: { vr: "UI", Value: ["1.2.series"] },
  [DwTag.InstanceNumber]: { vr: "IS", Value: [number] },
  [DwTag.Modality]: { vr: "CS", Value: ["CT"] },
});

describe("DICOM JSON accessors", () => {
  it("reads string, number and PersonName values", () => {
    const ds: DicomJsonDataset = {
      "00080060": { vr: "CS", Value: ["MR"] },
      "00200013": { vr: "IS", Value: [7] },
      "00100010": { vr: "PN", Value: [{ Alphabetic: "DOE^JANE" }] },
    };
    expect(dwString(ds, "00080060")).toBe("MR");
    expect(dwNumber(ds, "00200013")).toBe(7);
    expect(dwString(ds, "00100010")).toBe("DOE^JANE");
    expect(dwValue(ds, "99999999")).toBeUndefined();
    expect(dwString(ds, "99999999")).toBeUndefined();
  });
});

describe("trimRoot", () => {
  it("strips trailing slashes", () => {
    expect(trimRoot("https://s/dicom-web/")).toBe("https://s/dicom-web");
    expect(trimRoot("https://s/dicom-web///")).toBe("https://s/dicom-web");
    expect(trimRoot("https://s/dicom-web")).toBe("https://s/dicom-web");
  });
});

describe("buildWadoRsImageId", () => {
  it("builds a wadors frame imageId", () => {
    expect(
      buildWadoRsImageId({
        wadoRsRoot: "https://s/dicom-web/",
        studyInstanceUID: "1.2.study",
        seriesInstanceUID: "1.2.series",
        sopInstanceUID: "1.2.sop",
      }),
    ).toBe(
      "wadors:https://s/dicom-web/studies/1.2.study/series/1.2.series/instances/1.2.sop/frames/1",
    );
  });

  it("honors an explicit frame", () => {
    expect(
      buildWadoRsImageId({
        wadoRsRoot: "https://s",
        studyInstanceUID: "a",
        seriesInstanceUID: "b",
        sopInstanceUID: "c",
        frame: 3,
      }),
    ).toBe("wadors:https://s/studies/a/series/b/instances/c/frames/3");
  });
});

describe("sortInstanceMetadata", () => {
  it("orders by InstanceNumber, missing values last", () => {
    const noNumber: DicomJsonDataset = {
      [DwTag.SOPInstanceUID]: { Value: ["x"] },
    };
    const sorted = sortInstanceMetadata([
      instance("c", 3),
      instance("a", 1),
      noNumber,
      instance("b", 2),
    ]);
    expect(sorted.map((i) => dwNumber(i, DwTag.InstanceNumber))).toEqual([
      1, 2, 3, undefined,
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [instance("b", 2), instance("a", 1)];
    const copy = [...input];
    sortInstanceMetadata(input);
    expect(input).toEqual(copy);
  });
});

describe("DicomWebClient", () => {
  const okJson = (data: unknown): Response =>
    ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => data,
    }) as Response;

  it("requires a wadoRsRoot", () => {
    expect(() => new DicomWebClient({ wadoRsRoot: "" })).toThrow(/wadoRsRoot/);
  });

  it("retrieves series metadata with the right URL and Accept header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson([instance("a", 1)]));
    const client = new DicomWebClient({
      wadoRsRoot: "https://s/dicom-web/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const out = await client.retrieveSeriesMetadata({
      studyInstanceUID: "1.2.study",
      seriesInstanceUID: "1.2.series",
    });
    expect(out).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(
      "https://s/dicom-web/studies/1.2.study/series/1.2.series/metadata",
    );
    expect((init as RequestInit).headers).toMatchObject({
      Accept: "application/dicom+json",
    });
  });

  it("uses a separate qidoRsRoot and encodes query params", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson([]));
    const client = new DicomWebClient({
      wadoRsRoot: "https://s/wado",
      qidoRsRoot: "https://s/qido",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.searchForStudies({ PatientID: "P 1", limit: 10 });
    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://s/qido/studies?PatientID=P+1&limit=10");
  });

  it("merges custom headers", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okJson([]));
    const client = new DicomWebClient({
      wadoRsRoot: "https://s",
      headers: { Authorization: "Bearer t" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.searchForSeries("1.2.study");
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({
      Accept: "application/dicom+json",
      Authorization: "Bearer t",
    });
  });

  it("returns [] on 204 No Content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      json: async () => {
        throw new Error("should not parse");
      },
    } as Response);
    const client = new DicomWebClient({
      wadoRsRoot: "https://s",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(await client.searchForStudies()).toEqual([]);
  });

  it("throws on a non-OK response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({}),
    } as Response);
    const client = new DicomWebClient({
      wadoRsRoot: "https://s",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      client.retrieveSeriesMetadata({
        studyInstanceUID: "a",
        seriesInstanceUID: "b",
      }),
    ).rejects.toThrow(/404/);
  });
});
