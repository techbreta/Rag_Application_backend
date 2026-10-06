import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockRequest = jest.fn<(opts: unknown) => Promise<unknown>>();
const mockUpdateOne = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({ request: mockRequest })),
}));
jest.mock('./indexing.model', () => ({
  __esModule: true,
  INDEX_VERDICTS: ['PASS', 'PARTIAL', 'FAIL', 'NEUTRAL', 'VERDICT_UNSPECIFIED'],
  default: { updateOne: mockUpdateOne },
}));
jest.mock('./seo.service', () => ({ getSitemapUrls: jest.fn() }));
jest.mock('../../config/config', () => ({
  __esModule: true,
  default: {
    clientUrl: 'https://www.ragai.website',
    googleIndexing: { keyFile: 'key.json', searchConsoleSiteUrl: 'sc-domain:ragai.website' },
  },
}));
jest.mock('../logger/logger', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

// eslint-disable-next-line import/first
import { inspectUrl, getIndexingUrls } from './indexStatus.service';

const url = 'https://www.ragai.website/blog/some-post';

describe('index status service', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockUpdateOne.mockReset();
    mockUpdateOne.mockResolvedValue({});
  });

  test('inspectUrl stores the Google index status', async () => {
    mockRequest.mockResolvedValue({
      data: {
        inspectionResult: {
          inspectionResultLink: 'https://search.google.com/search-console/inspect?x',
          indexStatusResult: {
            verdict: 'PASS',
            coverageState: 'Submitted and indexed',
            indexingState: 'INDEXING_ALLOWED',
            pageFetchState: 'SUCCESSFUL',
            lastCrawlTime: '2026-10-01T10:00:00Z',
          },
        },
      },
    });

    const result = await inspectUrl(url);

    expect(result).toEqual({ success: true });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', data: { inspectionUrl: url, siteUrl: 'sc-domain:ragai.website' } })
    );
    const [filter, update] = mockUpdateOne.mock.calls[0] as [unknown, any];
    expect(filter).toEqual({ url });
    expect(update.$set.inspection).toEqual(
      expect.objectContaining({
        verdict: 'PASS',
        coverageState: 'Submitted and indexed',
        lastCrawlTime: new Date('2026-10-01T10:00:00Z'),
        resultLink: 'https://search.google.com/search-console/inspect?x',
      })
    );
    expect(update.$set.inspection.checkedAt).toBeInstanceOf(Date);
  });

  test('inspectUrl keeps the previous status and records the error on failure', async () => {
    mockRequest.mockRejectedValue({ response: { status: 403, data: { error: { message: 'No access' } } } });

    const result = await inspectUrl(url);

    expect(result).toEqual({ success: false, httpStatus: 403, error: 'No access' });
    const [, update] = mockUpdateOne.mock.calls[0] as [unknown, any];
    expect(Object.keys(update.$set).sort()).toEqual(['inspection.checkedAt', 'inspection.error']);
  });

  test('getIndexingUrls rejects unknown filter values', async () => {
    await expect(getIndexingUrls({ submissionStatus: 'bogus' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(getIndexingUrls({ verdict: 'bogus' })).rejects.toMatchObject({ statusCode: 400 });
  });
});
